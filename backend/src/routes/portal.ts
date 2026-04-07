import { Router } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import fs from 'fs';
import { OtpRequestSchema, OtpVerifySchema } from '../schemas/portal';
import { OtpToken } from '../models/OtpToken';
import { PortalSession } from '../models/PortalSession';
import { normalizeEmail } from '../utils/normalize';
import { sendOtpEmail } from '../services/mailer';
import { WarrantyVersion } from '../models/WarrantyVersion';
import { hashPayloadCanonical } from '../utils/canonicalHash';
import { fetchOnChainVersionMeta } from '../services/blockchain';
import { generateWarrantyCertificate } from '../services/certificate';
import { consumeRateLimit } from '../utils/rateLimit';

export const portalRouter = Router();

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex');
}

function makeOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

portalRouter.post('/otp/request', async (req, res) => {
  const parsed = OtpRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid email' });

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const ip = req.ip || 'unknown';
  const emailLimit = consumeRateLimit(`otp_req_email:${normalizedEmail}`, 5, 15 * 60 * 1000);
  const ipLimit = consumeRateLimit(`otp_req_ip:${ip}`, 20, 15 * 60 * 1000);
  if (!emailLimit.ok || !ipLimit.ok) {
    return res.status(429).json({ message: 'Too many OTP requests. Please try again later.' });
  }

  const otp = makeOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OtpToken.findOneAndUpdate(
    { normalizedEmail },
    { normalizedEmail, otpHash: hashOtp(otp), expiresAt, attempts: 0 },
    { upsert: true }
  );
  await sendOtpEmail(parsed.data.email, otp);
  return res.json({ ok: true });
});

portalRouter.post('/otp/verify', async (req, res) => {
  const parsed = OtpVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body' });
  const normalizedEmail = normalizeEmail(parsed.data.email);
  const ip = req.ip || 'unknown';
  const verifyLimit = consumeRateLimit(`otp_verify:${normalizedEmail}:${ip}`, 10, 15 * 60 * 1000);
  if (!verifyLimit.ok) return res.status(429).json({ message: 'Too many attempts. Try later.' });

  const row = await OtpToken.findOne({ normalizedEmail });
  if (!row) return res.status(400).json({ message: 'OTP not requested' });
  if (row.expiresAt.getTime() < Date.now()) return res.status(400).json({ message: 'OTP expired' });
  if (row.attempts >= 5) return res.status(429).json({ message: 'Too many OTP attempts. Request a new OTP.' });

  const expected = Buffer.from(row.otpHash, 'utf8');
  const supplied = Buffer.from(hashOtp(parsed.data.otp), 'utf8');
  const isMatch = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!isMatch) {
    row.attempts += 1;
    await row.save();
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const token = randomBytes(24).toString('hex');
  const sessionExp = new Date(Date.now() + 15 * 60 * 1000);
  await PortalSession.create({ token, normalizedEmail, expiresAt: sessionExp });
  await OtpToken.deleteOne({ normalizedEmail });
  return res.json({ ok: true, token, expiresAt: sessionExp.toISOString() });
});

async function getSession(req: { headers: Record<string, string | string[] | undefined> }) {
  const auth = String(req.headers.authorization ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) return null;
  const session = await PortalSession.findOne({ token }).lean();
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  return session;
}

portalRouter.get('/warranties', async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });
  const items = await WarrantyVersion.find({ normalizedEmail: session.normalizedEmail })
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ items });
});

portalRouter.get('/warranties/:warrantyId/verify', async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });
  const warrantyId = String(req.params.warrantyId || '').trim();
  const item = await WarrantyVersion.findOne({
    warrantyId,
    normalizedEmail: session.normalizedEmail,
  }).lean();
  if (!item) return res.status(404).json({ message: 'Not found' });
  return res.json({
    warrantyId: item.warrantyId,
    warrantyRootId: item.warrantyRootId,
    versionNo: item.versionNo,
    payloadHash: item.payloadHash,
    txHash: item.onChainTxHash ?? null,
    status: item.onChainStatus === 'ANCHORED' ? 'VERIFIED' : 'PENDING',
  });
});

portalRouter.get('/warranties/:warrantyId/validate', async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const warrantyId = String(req.params.warrantyId || '').trim();
  const item = await WarrantyVersion.findOne({
    warrantyId,
    normalizedEmail: session.normalizedEmail,
  }).lean();
  if (!item) return res.status(404).json({ message: 'Not found' });

  const recomputed = hashPayloadCanonical(item.payloadSnapshot).hash;
  let onChain: Awaited<ReturnType<typeof fetchOnChainVersionMeta>> = null;
  let onChainHash = '';
  let chainLookupError: string | null = null;

  try {
    onChain = await fetchOnChainVersionMeta({
      warrantyRootId: item.warrantyRootId,
      versionNo: item.versionNo,
    });
    onChainHash = onChain?.payloadHash?.replace(/^0x/, '').toLowerCase() ?? '';
  } catch (error) {
    chainLookupError = error instanceof Error ? error.message : String(error);
  }

  const dbHash = item.payloadHash.toLowerCase();
  const match = Boolean(onChain?.exists) && onChainHash === dbHash && recomputed === dbHash;

  return res.json({
    warrantyId: item.warrantyId,
    warrantyRootId: item.warrantyRootId,
    versionNo: item.versionNo,
    dbHash,
    recomputedHash: recomputed,
    onChainHash: onChainHash || null,
    chainRecordExists: Boolean(onChain?.exists),
    txHash: item.onChainTxHash ?? null,
    verification: match ? 'AUTHENTIC_UNTAMPERED' : 'MISMATCH_OR_UNVERIFIED',
    chainLookupError,
  });
});

portalRouter.get('/warranties/:warrantyId/certificate', async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const warrantyId = String(req.params.warrantyId || '').trim();
  const item = await WarrantyVersion.findOne({
    warrantyId,
    normalizedEmail: session.normalizedEmail,
  });
  if (!item) return res.status(404).json({ message: 'Not found' });

  const snap = item.payloadSnapshot as Record<string, unknown>;
  const customer = (snap.customer ?? {}) as Record<string, unknown>;
  const customerName = String(customer.name ?? 'Customer');
  const customerEmail = String(customer.email ?? session.normalizedEmail);

  // Regenerate on each download so latest template/style is always served.
  const newPath = await generateWarrantyCertificate({
    customerName,
    email: customerEmail,
    warrantyId: item.warrantyId,
    warrantyRootId: item.warrantyRootId,
    versionNo: item.versionNo,
    payloadHash: item.payloadHash,
    txHash: item.onChainTxHash,
  });
  item.certificatePath = newPath;
  await item.save();

  return res.download(item.certificatePath, `certificate-${item.warrantyId}.pdf`);
});

