import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  console.log('[MAIL][OTP] Before send', { to });
  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}`,
    });
    console.log('[MAIL][OTP] After success', info);
  } catch (err) {
    console.error('[MAIL][OTP] Error:', err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function sendCertificateEmail(email: string, pdfPath: string) {
  console.log('[MAIL][CERT] Before send', { email, pdfPath });
  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Warranty Certificate',
      text: 'Attached is your certificate',
      attachments: [
        {
          filename: 'certificate.pdf',
          path: pdfPath,
        },
      ],
    });
    console.log('[MAIL][CERT] After success', info);
  } catch (err) {
    console.error('[MAIL][CERT] Error:', err instanceof Error ? err.message : err);
    throw err;
  }
}
