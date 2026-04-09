import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logProblem } from './problemsLogger';

let resendSingleton: Resend | null = null;

function getResend(): Resend | null {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendSingleton) resendSingleton = new Resend(key);
  return resendSingleton;
}

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  console.log('[OTP][BREVO] Sending to:', to);

  const info = await transporter.sendMail({
    from: process.env.BREVO_USER,
    to,
    subject: 'Your OTP Code',
    html: `<h2>Your OTP is: ${otp}</h2>`,
  });

  console.log('[OTP][BREVO] Sent:', info);
}

export async function sendCertificateEmail(params: {
  to: string;
  customerName: string;
  warrantyId: string;
  warrantyRootId: string;
  payloadHash: string;
  txHash?: string;
  certificatePath?: string;
}) {
  const resend = getResend();
  if (!resend) {
    await logProblem({
      where: 'mailer:sendCertificateEmail',
      how: 'Resend API key missing',
      severity: 'Medium',
      error: `Certificate email skipped for ${params.to}`,
    });
    return;
  }

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: params.to,
    subject: 'Your Sealed Warranty Certificate',
    html: `<p>Your warranty has been sealed.</p>`,
    ...(params.certificatePath
      ? {
          attachments: [
            {
              filename: 'certificate.pdf',
              path: params.certificatePath,
            },
          ],
        }
      : {}),
  });
}
