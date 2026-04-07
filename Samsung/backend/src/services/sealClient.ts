import axios from 'axios';
import { createHmac } from 'crypto';
import { env } from '../config/env';
import type { WarrantyDoc } from '../models/Warranty';

export async function sendWarrantyToSeal(payload: {
  eventType: 'REGISTER' | 'RENEW';
  warrantyRootId: string;
  warrantyId: string;
  versionNo: number;
  customer: WarrantyDoc['customer'];
  product: WarrantyDoc['product'];
  purchase?: WarrantyDoc['purchase'];
  warranty: WarrantyDoc['warranty'];
}) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', env.SEALED_WEBHOOK_SECRET).update(body).digest('hex');
  try {
    await axios.post(env.SEAL_API_URL, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'x-snovia-signature': signature,
      },
    });
  } catch {
    // ignore
  }
}

