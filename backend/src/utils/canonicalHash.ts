import { createHash } from 'crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) out[key] = canonicalize(obj[key]);
    return out;
  }
  if (typeof value === 'string') return value.trim();
  return value;
}

export function hashPayloadCanonical(payload: unknown) {
  const canonical = canonicalize(payload);
  const json = JSON.stringify(canonical);
  const hash = createHash('sha256').update(json).digest('hex');
  return { canonical, json, hash };
}

