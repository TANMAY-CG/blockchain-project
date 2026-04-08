import { Router } from 'express';
import { RegisterWarrantySchema } from '../schemas/warranty';
import { Warranty } from '../models/Warranty';
import { sendWarrantyToSeal } from '../services/sealClient';
import { randomInt } from 'crypto';
import { z } from 'zod';

export const warrantiesRouter = Router();

const RenewWarrantySchema = z.object({
  warrantyId: z.string().min(1),
  renewalTermYears: z.union([z.literal(1), z.literal(2)]),
  renewalScope: z.string().min(1),
  notes: z.string().optional(),
  forceExtend: z.boolean().optional(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSerial(serial: string) {
  return serial.trim().toUpperCase().replace(/[\s-]+/g, '');
}

function toIsoDateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseIsoDateUTC(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDaysISO(isoDate: string, days: number) {
  const d = parseIsoDateUTC(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDateUTC(d);
}

function addYearsISO(startIsoDate: string, years: number) {
  const d = parseIsoDateUTC(startIsoDate);
  const y = d.getUTCFullYear() + years;
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const candidate = new Date(Date.UTC(y, m, day));
  if (candidate.getUTCMonth() !== m) {
    return toIsoDateUTC(new Date(Date.UTC(y, m + 1, 0)));
  }
  return toIsoDateUTC(candidate);
}

async function generateUniqueId(prefix: string, field: 'warrantyId' | 'warrantyRootId') {
  for (let attempt = 0; attempt < 20; attempt++) {
    const n = randomInt(10_000_000, 100_000_000); // 8 digits
    const id = `${prefix}-${n}`;
    const exists = await Warranty.exists({ [field]: id });
    if (!exists) return id;
  }
  throw new Error(`Unable to generate unique ${field}`);
}

async function generateUniqueWarrantyId() {
  return generateUniqueId('WARID', 'warrantyId');
}

async function generateUniqueWarrantyRootId() {
  return generateUniqueId('WROOT', 'warrantyRootId');
}

async function getLatestVersionByRoot(warrantyRootId: string) {
  return Warranty.findOne({ warrantyRootId }).sort({ versionNo: -1, createdAt: -1 }).lean();
}

async function findByWarrantyIdentifier(inputId: string) {
  const id = inputId.trim().toUpperCase();
  const byRoot = await getLatestVersionByRoot(id);
  if (byRoot) return byRoot;
  return Warranty.findOne({ warrantyId: id }).lean();
}

// Admin: search warranty records by email
warrantiesRouter.get('/admin/search', async (req, res) => {
  const emailRaw = String(req.query.email ?? '');
  const email = normalizeEmail(emailRaw);
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  const rows = await Warranty.find({ normalizedEmail: email })
    .sort({ createdAt: -1 })
    .select({
      warrantyId: 1,
      warrantyRootId: 1,
      versionNo: 1,
      eventType: 1,
      previousWarrantyId: 1,
      normalizedEmail: 1,
      normalizedSerialNumber: 1,
      customer: 1,
      product: 1,
      purchase: 1,
      warranty: 1,
      createdAt: 1,
    })
    .lean();

  return res.json({ items: rows });
});

// Admin: fetch one warranty entry (by Warranty ID)
warrantiesRouter.get('/admin/entry/:warrantyId', async (req, res) => {
  const warrantyId = String(req.params.warrantyId ?? '').trim().toUpperCase();
  if (!warrantyId) {
    return res.status(400).json({ message: 'Warranty ID is required' });
  }
  const doc = await Warranty.findOne({ warrantyId }).lean();
  if (!doc) {
    return res.status(404).json({ message: 'Warranty not found' });
  }
  return res.json(doc);
});

// Register warranty
warrantiesRouter.post('/', async (req, res) => {
  const parsed = RegisterWarrantySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const normalizedEmail = normalizeEmail(parsed.data.customer.email);
  const normalizedSerialNumber = normalizeSerial(parsed.data.product.serialNumber);

  const latestForPair = await Warranty.findOne({
    normalizedEmail,
    normalizedSerialNumber,
  })
    .sort({ versionNo: -1, createdAt: -1 })
    .lean();

  const warrantyRootId = latestForPair?.warrantyRootId ?? (await generateUniqueWarrantyRootId());
  const latestByRoot = await getLatestVersionByRoot(warrantyRootId);
  const versionNo = (latestByRoot?.versionNo ?? 0) + 1;

  const warranty = new Warranty({
    ...parsed.data,
    warrantyRootId,
    versionNo,
    eventType: 'REGISTER',
    previousWarrantyId: latestByRoot?.warrantyId,
    normalizedEmail,
    normalizedSerialNumber,
  });
  warranty.warrantyId = await generateUniqueWarrantyId();
  await warranty.save();

  console.log('Sending warranty to Sealed:', {
    warrantyId: warranty.warrantyId,
    warrantyRootId: warranty.warrantyRootId,
  });
  await sendWarrantyToSeal({
    eventType: 'REGISTER',
    warrantyRootId: warranty.warrantyRootId,
    warrantyId: warranty.warrantyId,
    versionNo: warranty.versionNo,
    customer: warranty.customer,
    product: warranty.product,
    purchase: warranty.purchase,
    warranty: warranty.warranty,
  });

  return res.status(201).json({
    id: warranty.warrantyId,
    warrantyRootId: warranty.warrantyRootId,
    versionNo: warranty.versionNo,
  });
});

// Lookup warranty by warrantyRootId (preferred) or warrantyId (legacy)
warrantiesRouter.get('/:warrantyId', async (req, res) => {
  const warrantyId = String(req.params.warrantyId || '').trim().toUpperCase();
  if (!warrantyId) {
    return res.status(400).json({ message: 'Warranty ID is required' });
  }

  const existing = await findByWarrantyIdentifier(warrantyId);
  if (!existing) {
    return res.status(404).json({ message: 'Warranty not found' });
  }

  return res.json(existing);
});

// Renew warranty with active-check on email + serialNumber
warrantiesRouter.post('/renew', async (req, res) => {
  const parsed = RenewWarrantySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const { warrantyId, renewalTermYears, renewalScope, notes, forceExtend } = parsed.data;
  const source = await findByWarrantyIdentifier(warrantyId);
  if (!source) {
    return res.status(404).json({ message: 'Warranty not found' });
  }

  const sourceEmail = source.normalizedEmail || normalizeEmail(source.customer.email);
  const sourceSerial = source.normalizedSerialNumber || normalizeSerial(source.product.serialNumber);
  const todayISO = toIsoDateUTC(new Date());

  const candidates = await Warranty.find({
    normalizedEmail: sourceEmail,
    normalizedSerialNumber: sourceSerial,
    'warranty.endDate': { $gte: todayISO },
  }).lean();

  const active = candidates
    .filter((w) => normalizeEmail(w.customer.email) === sourceEmail)
    .filter((w) => normalizeSerial(w.product.serialNumber) === sourceSerial)
    .sort((a, b) => b.warranty.endDate.localeCompare(a.warranty.endDate))[0];

  if (active && !forceExtend) {
    return res.status(409).json({
      message: 'Active warranty already exists for this email + serial number.',
      needsConfirmation: true,
      activeWarranty: {
        warrantyId: active.warrantyId,
        email: sourceEmail,
        serialNumber: sourceSerial,
        startDate: active.warranty.startDate,
        endDate: active.warranty.endDate,
      },
    });
  }

  const renewalStartDate = active ? addDaysISO(active.warranty.endDate, 1) : todayISO;
  const renewalEndDate = addYearsISO(renewalStartDate, renewalTermYears);
  const latestByRoot = await getLatestVersionByRoot(source.warrantyRootId);
  const versionNo = (latestByRoot?.versionNo ?? 0) + 1;

  const newWarranty = new Warranty({
    warrantyRootId: source.warrantyRootId,
    versionNo,
    eventType: 'RENEW',
    previousWarrantyId: latestByRoot?.warrantyId,
    normalizedEmail: sourceEmail,
    normalizedSerialNumber: sourceSerial,
    customer: source.customer,
    product: source.product,
    purchase: source.purchase,
    warranty: {
      purchaseDate: renewalStartDate,
      startDate: renewalStartDate,
      endDate: renewalEndDate,
      planType: 'EXTENDED',
      notes: `${renewalScope}${notes?.trim() ? ` | ${notes.trim()}` : ''}`,
    },
  });
  newWarranty.warrantyId = await generateUniqueWarrantyId();
  await newWarranty.save();

  console.log('Sending warranty to Sealed:', {
    warrantyId: newWarranty.warrantyId,
    warrantyRootId: newWarranty.warrantyRootId,
  });
  await sendWarrantyToSeal({
    eventType: 'RENEW',
    warrantyRootId: newWarranty.warrantyRootId,
    warrantyId: newWarranty.warrantyId,
    versionNo: newWarranty.versionNo,
    customer: newWarranty.customer,
    product: newWarranty.product,
    purchase: newWarranty.purchase as any,
    warranty: {
      purchaseDate: newWarranty.warranty.purchaseDate,
      startDate: newWarranty.warranty.startDate,
      endDate: newWarranty.warranty.endDate,
      planType: newWarranty.warranty.planType,
      notes: newWarranty.warranty.notes,
    },
  });

  return res.status(201).json({
    id: newWarranty.warrantyId,
    warrantyRootId: newWarranty.warrantyRootId,
    versionNo: newWarranty.versionNo,
    startDate: renewalStartDate,
    endDate: renewalEndDate,
  });
});

