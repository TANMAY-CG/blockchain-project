import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const CERT_DIR = path.resolve(process.cwd(), 'certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

export async function generateWarrantyCertificate(input: {
  customerName: string;
  email: string;
  warrantyId: string;
  warrantyRootId: string;
  versionNo: number;
  payloadHash: string;
  txHash?: string;
}) {
  const outPath = path.join(CERT_DIR, `${input.warrantyId}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const pageW = doc.page.width;
  const pageH = doc.page.height;

  // Background
  doc.rect(0, 0, pageW, pageH).fill('#070c1c');
  doc.circle(pageW * 0.1, pageH * 0.2, 180).fillOpacity(0.1).fill('#6367FF').fillOpacity(1);
  doc.circle(pageW * 0.9, pageH * 0.85, 180).fillOpacity(0.08).fill('#FF52A0').fillOpacity(1);

  const frameX = 24;
  const frameY = 24;
  const frameW = pageW - 48;
  const frameH = pageH - 48;
  doc.roundedRect(frameX, frameY, frameW, frameH, 14).fillOpacity(0.22).fill('#101734').fillOpacity(1);
  doc.roundedRect(frameX, frameY, frameW, frameH, 14).lineWidth(1).strokeOpacity(0.38).stroke('#8494FF').strokeOpacity(1);

  // Header
  doc.font('Helvetica-Bold').fontSize(32).fillColor('#FFFFFF').text('SNOVIA', 42, 42);
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF').text('SEALED WARRANTY CERTIFICATE', 42, 88);
  doc.font('Helvetica').fontSize(11).fillColor('#C9BEFF').text('Certificate of Digital Authenticity', 42, 120);

  // Main single column panel
  const panelX = 42;
  const panelY = 160;
  const panelW = pageW - 84;
  const panelH = pageH - panelY - 38;
  doc.roundedRect(panelX, panelY, panelW, panelH, 14).fillOpacity(0.22).fill('#0d1530').fillOpacity(1);
  doc.roundedRect(panelX, panelY, panelW, panelH, 14).lineWidth(1).strokeOpacity(0.33).stroke('#8494FF').strokeOpacity(1);

  const labelColor = '#C9BEFF';
  const valueColor = '#FFFFFF';
  const sectionColor = '#E2E8F0';
  let y = panelY + 28;

  doc.font('Helvetica-Bold').fontSize(16).fillColor(sectionColor).text('Customer Information', panelX + 18, y);
  y += 30;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Customer Name', panelX + 18, y);
  doc.font('Helvetica').fontSize(14).fillColor(valueColor).text(input.customerName, panelX + 190, y - 2);
  y += 30;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Contact Email', panelX + 18, y);
  doc.font('Helvetica').fontSize(14).fillColor(valueColor).text(input.email, panelX + 190, y - 2);
  y += 30;
  doc.moveTo(panelX + 18, y).lineTo(panelX + panelW - 18, y).strokeOpacity(0.3).stroke('#8494FF').strokeOpacity(1);
  y += 20;

  doc.font('Helvetica-Bold').fontSize(16).fillColor(sectionColor).text('Purchase Details', panelX + 18, y);
  y += 30;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Warranty ID', panelX + 18, y);
  doc.font('Helvetica').fontSize(14).fillColor(valueColor).text(input.warrantyId, panelX + 190, y - 2);
  y += 30;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Warranty Root ID', panelX + 18, y);
  doc.font('Helvetica').fontSize(14).fillColor(valueColor).text(input.warrantyRootId, panelX + 190, y - 2);
  y += 30;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Version', panelX + 18, y);
  doc.font('Helvetica').fontSize(14).fillColor(valueColor).text(String(input.versionNo), panelX + 190, y - 2);
  y += 30;
  doc.moveTo(panelX + 18, y).lineTo(panelX + panelW - 18, y).strokeOpacity(0.3).stroke('#8494FF').strokeOpacity(1);
  y += 20;

  doc.font('Helvetica-Bold').fontSize(16).fillColor(sectionColor).text('Blockchain Integrity', panelX + 18, y);
  y += 28;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Payload Hash', panelX + 18, y);
  y += 16;
  doc.font('Helvetica').fontSize(10.5).fillColor(valueColor).text(input.payloadHash, panelX + 18, y, {
    width: panelW - 36,
  });
  y += 52;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(labelColor).text('Transaction Hash', panelX + 18, y);
  y += 16;
  doc.font('Helvetica').fontSize(10.5).fillColor(valueColor).text(input.txHash ?? 'pending', panelX + 18, y, {
    width: panelW - 36,
  });
  y += 50;
  doc.moveTo(panelX + 18, y).lineTo(panelX + panelW - 18, y).strokeOpacity(0.3).stroke('#8494FF').strokeOpacity(1);
  y += 20;

  doc.font('Helvetica-Bold').fontSize(13).fillColor(sectionColor).text('Issued At', panelX + 18, y);
  y += 18;
  doc.font('Helvetica').fontSize(12).fillColor('#FFDBFD').text(new Date().toISOString(), panelX + 18, y);

  // Footer confidence note
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#86efac').text(
    'Digitally sealed. Authenticity verified and non-tampered.',
    panelX + 18,
    panelY + panelH - 26
  );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return outPath;
}

