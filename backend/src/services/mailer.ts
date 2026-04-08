import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logProblem } from './problemsLogger';

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // IMPORTANT (SSL)
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

export async function sendOtpEmail(to: string, otp: string) {
  const transporter = getTransporter();
  if (!transporter) {
    await logProblem({
      where: 'mailer:sendOtpEmail',
      how: 'SMTP config missing',
      severity: 'Medium',
      error: `OTP email skipped for ${to}; SMTP not configured`,
    });
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Your Sealed OTP (valid 5 minutes)',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
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
  const transporter = getTransporter();
  if (!transporter) {
    await logProblem({
      where: 'mailer:sendCertificateEmail',
      how: 'SMTP config missing',
      severity: 'Medium',
      error: `Certificate email skipped for ${params.to}`,
    });
    return;
  }

  const text = [
    `Hello ${params.customerName},`,
    '',
    'Your warranty event has been sealed.',
    `Warranty ID: ${params.warrantyId}`,
    `Warranty Root ID: ${params.warrantyRootId}`,
    `Payload Hash: ${params.payloadHash}`,
    `Transaction Hash: ${params.txHash ?? 'pending'}`,
    '',
    'Your authenticity certificate is attached.',
  ].join('\n');

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: 'Your Sealed Warranty Certificate',
    text,
    attachments: params.certificatePath
      ? [{ filename: `certificate-${params.warrantyId}.pdf`, path: params.certificatePath }]
      : [],
  });
}
