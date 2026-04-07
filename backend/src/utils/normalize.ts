export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeSerial(serial: string) {
  return serial.trim().toUpperCase().replace(/[\s-]+/g, '');
}

