import { Request, Response, Router } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { IngestWarrantyEventSchema } from '../schemas/events';
import { WarrantyVersion } from '../models/WarrantyVersion';
import { normalizeEmail, normalizeSerial } from '../utils/normalize';
import { hashPayloadCanonical } from '../utils/canonicalHash';
import { anchorOnChain } from '../services/blockchain';
import { logProblem } from '../services/problemsLogger';
import { generateWarrantyCertificate } from '../services/certificate';
import { sendCertificateEmail } from '../services/mailer';
import { env } from '../config/env';

export const eventsRouter = Router();

function verifySignature(rawBody: string, signature: string | undefined) {
  if (!signature) return false;
  const digest = createHmac('sha256', env.SEALED_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const expected = Buffer.from(digest, 'utf8');
  const supplied = Buffer.from(signature, 'utf8');
  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(expected, supplied);
}

eventsRouter.post('/warranty', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body ?? {});
  const signature = String(req.headers['x-snovia-signature'] ?? '');
  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const parsed = IngestWarrantyEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const payload = parsed.data;
  const normalizedEmail = normalizeEmail(payload.customer.email);
  const normalizedSerialNumber = normalizeSerial(payload.product.serialNumber);

  const existing = await WarrantyVersion.findOne({ warrantyId: payload.warrantyId }).lean();
  if (existing) {
    return res.status(200).json({ ok: true, duplicate: true, warrantyId: existing.warrantyId });
  }

  const latest = await WarrantyVersion.findOne({ warrantyRootId: payload.warrantyRootId })
    .sort({ versionNo: -1, createdAt: -1 })
    .lean();

  const { canonical, hash } = hashPayloadCanonical(payload);

  let txHash: string | undefined;
  let onChainStatus: 'PENDING' | 'ANCHORED' | 'FAILED' = 'PENDING';
  try {
    console.log("ANCHOR START", payload.warrantyId, new Date().toISOString());
    const anchor = await anchorOnChain({
      warrantyRootId: payload.warrantyRootId,
      versionNo: payload.versionNo,
      eventType: payload.eventType,
      startDate: payload.warranty.startDate,
      endDate: payload.warranty.endDate,
      payloadHash: hash,
      previousVersionHash: latest?.payloadHash,
    });
    txHash = anchor.txHash;
    onChainStatus = anchor.status;
  } catch (error) {
    onChainStatus = 'FAILED';
    await logProblem({
      where: 'events:warranty',
      how: 'Failed anchoring payload on chain',
      severity: 'High',
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }

  const doc = await WarrantyVersion.create({
    warrantyRootId: payload.warrantyRootId,
    warrantyId: payload.warrantyId,
    versionNo: payload.versionNo,
    eventType: payload.eventType,
    normalizedEmail,
    normalizedSerialNumber,
    startDate: payload.warranty.startDate,
    endDate: payload.warranty.endDate,
    payloadSnapshot: canonical as Record<string, unknown>,
    payloadHash: hash,
    previousVersionHash: latest?.payloadHash,
    onChainTxHash: txHash,
    onChainStatus,
  });
  console.log("AFTER DB CREATE", payload.warrantyId, new Date().toISOString());

  try {
    console.log("BEFORE CERTIFICATE GENERATION", payload.warrantyId, new Date().toISOString());
    const certPath = await generateWarrantyCertificate({
      customerName: payload.customer.name,
      email: payload.customer.email,
      warrantyId: payload.warrantyId,
      warrantyRootId: payload.warrantyRootId,
      versionNo: payload.versionNo,
      payloadHash: hash,
      txHash,
    });
    console.log("AFTER CERTIFICATE GENERATION", payload.warrantyId, certPath, new Date().toISOString());
    doc.certificatePath = certPath;
    await doc.save();

    console.log("BEFORE EMAIL SEND", payload.warrantyId, new Date().toISOString());
    await sendCertificateEmail({
      to: payload.customer.email,
      customerName: payload.customer.name,
      warrantyId: payload.warrantyId,
      warrantyRootId: payload.warrantyRootId,
      payloadHash: hash,
      txHash,
      certificatePath: certPath,
    });
    console.log("AFTER EMAIL SEND", payload.warrantyId, new Date().toISOString());
  } catch (error) {
    await logProblem({
      where: 'events:warranty',
      how: 'Failed certificate generation/email dispatch',
      severity: 'Medium',
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }

  console.log("BEFORE FINAL 201", payload.warrantyId, new Date().toISOString());
  const flushBody = JSON.stringify({ ok: true });
  res.setHeader('Connection', 'close');
  res.setHeader('Content-Length', Buffer.byteLength(flushBody));
  res.status(201).end(flushBody);
});

