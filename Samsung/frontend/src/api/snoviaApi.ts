import axios from 'axios';

const baseURL = import.meta.env.VITE_SNOVIA_API_BASE ?? 'http://localhost:4001';

export type Product = {
  productId: string;
  model: string;
  serialNumber: string;
  imei: string;
};

export type WarrantyRecord = {
  warrantyRootId: string;
  versionNo: number;
  eventType: 'REGISTER' | 'RENEW';
  previousWarrantyId?: string;
  warrantyId: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  product: {
    productId?: string;
    model: string;
    serialNumber: string;
    imei: string;
  };
  purchase?: {
    storeLocation?: string;
    proofOfPurchase?: {
      fileName: string;
      url: string;
      mimeType: string;
      size: number;
    };
  };
  warranty: {
    purchaseDate: string;
    startDate: string;
    endDate: string;
    planType: 'STANDARD' | 'EXTENDED';
    notes?: string;
  };
};

export type RegisterWarrantyPayload = {
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  product: {
    productId?: string;
    model: string;
    serialNumber: string;
    imei: string;
  };
  purchase?: {
    storeLocation?: string;
    proofOfPurchase?: {
      fileName: string;
      url: string;
      mimeType: string;
      size: number;
    };
  };
  warranty: {
    purchaseDate: string;
    startDate: string;
    endDate: string;
    planType: 'STANDARD' | 'EXTENDED';
    notes?: string;
  };
};

export type RenewWarrantyPayload = {
  warrantyId: string;
  renewalTermYears: 1 | 2;
  renewalScope: string;
  notes?: string;
  forceExtend?: boolean;
};

export type RenewWarrantyResponse = {
  id: string;
  warrantyRootId: string;
  versionNo: number;
  startDate: string;
  endDate: string;
};

const client = axios.create({ baseURL });

export async function fetchProductById(productId: string) {
  const res = await client.get<Product>(`/api/products/${encodeURIComponent(productId)}`);
  return res.data;
}

export async function registerWarranty(payload: RegisterWarrantyPayload) {
  const res = await client.post<{ id: string; warrantyRootId: string; versionNo: number }>(`/api/warranties`, payload);
  return res.data;
}

export async function fetchWarrantyById(warrantyId: string) {
  const res = await client.get<WarrantyRecord>(`/api/warranties/${encodeURIComponent(warrantyId)}`);
  return res.data;
}

export async function renewWarranty(payload: RenewWarrantyPayload) {
  const res = await client.post<RenewWarrantyResponse>(`/api/warranties/renew`, payload);
  return res.data;
}

export async function adminSearchWarrantiesByEmail(email: string) {
  const res = await client.get<{ items: WarrantyRecord[] }>(`/api/warranties/admin/search`, {
    params: { email },
  });
  return res.data.items;
}

export async function adminFetchWarrantyEntryById(warrantyId: string) {
  const res = await client.get<WarrantyRecord>(`/api/warranties/admin/entry/${encodeURIComponent(warrantyId)}`);
  return res.data;
}

export type ProofUploadResponse = {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
};

export async function uploadProofOfPurchase(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await client.post<ProofUploadResponse>(`/api/uploads/proof`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

