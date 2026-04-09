import { BrevoClient } from '@getbrevo/brevo';

const apiInstance = new BrevoClient({
  apiKey: process.env.BREVO_PASS ?? '',
});

const SENDER_EMAIL = process.env.BREVO_USER;

// ================= OTP EMAIL =================
export async function sendOtpEmail(to: string, otp: string) {
  console.log('[OTP][BREVO API] Sending to:', to);

  const email = {
    sender: { email: SENDER_EMAIL },
    to: [{ email: to }],
    subject: 'Your OTP Code',
    htmlContent: `<h2>Your OTP is: ${otp}</h2>`,
  };

  const res = await apiInstance.transactionalEmails.sendTransacEmail(email);
  console.log('[OTP][BREVO API] Sent:', res);
}

// ================= CERTIFICATE EMAIL =================
export async function sendCertificateEmail(
  to: string,
  pdfBuffer: Buffer,
  filename: string
) {
  console.log('[CERT][BREVO API] Sending to:', to);

  const email = {
    sender: { email: SENDER_EMAIL },
    to: [{ email: to }],
    subject: 'Your Warranty Certificate',
    htmlContent: `<p>Your warranty certificate is attached.</p>`,
    attachment: [
      {
        content: pdfBuffer.toString('base64'),
        name: filename,
      },
    ],
  };

  const res = await apiInstance.transactionalEmails.sendTransacEmail(email);
  console.log('[CERT][BREVO API] Sent:', res);
}
