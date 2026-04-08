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
  console.log('Sealed API URL:', process.env.SEAL_API_URL);
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', env.SEALED_WEBHOOK_SECRET).update(body).digest('hex');
  try {
    const response = await axios.post(env.SEAL_API_URL, payload, {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        'x-snovia-signature': signature,
      },
    });
    console.log('Sealed response:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Sealed error:', error.response?.data || error.message);
    } else {
      console.error('Sealed error:', error instanceof Error ? error.message : error);
    }
  }
}

