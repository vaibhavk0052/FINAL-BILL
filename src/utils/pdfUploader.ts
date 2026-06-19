import { storage } from '@/firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UploadPdfAndSendParams {
  elementId: string;
  filename: string;
  storagePath: string;   // e.g. "invoices/JUN_001.pdf"
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: string | number;
  remainingAmount: string | number;
  invoiceDate: string;
}

export async function uploadPdfAndSendWebhook({
  elementId,
  filename,
  storagePath,
  customerPhone,
  customerName,
  invoiceNumber,
  totalAmount,
  remainingAmount,
  invoiceDate,
}: UploadPdfAndSendParams): Promise<{ downloadUrl: string }> {

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
    throw new Error('Customer phone number is missing or invalid. Cannot send WhatsApp notification.');
  }
  if (!invoiceNumber) {
    throw new Error('Invoice number is missing. Cannot proceed with PDF upload.');
  }

  // ── Debug: initial data ──────────────────────────────────────────────────────
  console.group('=== WhatsApp Webhook Debug ===');
  console.log('Invoice Number:', invoiceNumber);
  console.log('Customer Name:', customerName);
  console.log('Customer Phone (raw):', customerPhone);
  console.log('Total Amount:', totalAmount);
  console.log('Remaining Amount:', remainingAmount);
  console.log('Invoice Date:', invoiceDate);

  // ── Step 1 — Generate PDF blob ───────────────────────────────────────────────
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    throw new Error('html2pdf library is not loaded. Please refresh the page and try again.');
  }

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Invoice preview element "${elementId}" not found in the DOM.`);
  }

  // ── Inject font style into element so html2canvas picks it up ───────────────
  const fontStyle = document.createElement('style');
  fontStyle.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@700;900&display=swap');
  `;
  element.prepend(fontStyle);

  // ── Wait for Devanagari font to fully load ───────────────────────────────────
  try {
    await document.fonts.load("900 14px 'Noto Serif Devanagari'");
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font preload warning:', e);
  }

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  let blob: Blob;
  try {
    blob = await html2pdf().set(opt).from(element).outputPdf('blob');
    // Clean up injected style
    fontStyle.remove();
    console.log('✅ PDF generated successfully. Size:', blob.size, 'bytes');
  } catch (err: any) {
    fontStyle.remove();
    console.error('❌ PDF generation failed:', err);
    console.groupEnd();
    throw new Error(`PDF generation failed: ${err?.message || err}`);
  }

  // ── Step 2 — Upload to Firebase Storage ─────────────────────────────────────
  const storageRef = ref(storage, storagePath);
  let downloadUrl: string;

  try {
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'application/pdf',
    });
    console.log('✅ Firebase upload successful. Path:', snapshot.ref.fullPath);

    // Step 3 — Get public download URL
    downloadUrl = await getDownloadURL(snapshot.ref);
    console.log('✅ Firebase Download URL:', downloadUrl);
  } catch (err: any) {
    console.error('❌ Firebase upload/download URL failed:', err);
    console.groupEnd();
    throw new Error(`Firebase Storage upload failed: ${err?.message || err}`);
  }

  if (!downloadUrl) {
    console.groupEnd();
    throw new Error('Download URL is empty or invalid after upload.');
  }

  // ── Step 4 — Format phone number ────────────────────────────────────────────
  let phone = customerPhone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = phone.substring(1);
  const finalPhone = phone.length === 10 ? '91' + phone : phone;
  console.log('Customer Phone (formatted):', finalPhone);

  // ── Step 5 — Build webhook URL ───────────────────────────────────────────────
  // Each dynamic variable is individually encoded; the complete Firebase URL
  // is encoded once via encodeURIComponent — no double-encoding.
  const webhookBase = 'https://webhook.whatapi.in/webhook/6a3373cb6f1a8bf9dd76f302';

  const safeCustomerName  = String(customerName).replace(/,/g, ' ');
  const safeInvoiceNumber = String(invoiceNumber);
  const safeTotalAmount   = String(totalAmount);
  const safeRemainingAmount = String(remainingAmount);
  const safeInvoiceDate   = String(invoiceDate);

  const messageParam =
    `invoicebill,${encodeURIComponent(safeCustomerName)},${encodeURIComponent(safeInvoiceNumber)},${encodeURIComponent(safeTotalAmount)},${encodeURIComponent(safeRemainingAmount)},${encodeURIComponent(safeInvoiceDate)}`;

  const webhookUrl =
    `${webhookBase}` +
    `?number=${finalPhone}` +
    `&message=${messageParam}` +
    `&medialink=${encodeURIComponent(downloadUrl)}`;

  console.log('Final Webhook URL:', webhookUrl);

  // ── Step 6 — Send webhook request ────────────────────────────────────────────
  try {
    const response = await fetch(webhookUrl);
    const responseText = await response.text();
    console.log('Webhook Response Status:', response.status);
    console.log('Webhook Response Body:', responseText);

    if (!response.ok) {
      console.warn('⚠️ Webhook responded with non-OK status:', response.status);
    } else {
      console.log('✅ WhatsApp webhook sent successfully!');
    }
  } catch (err: any) {
    console.error('❌ WhatsApp webhook request failed:', err);
    console.groupEnd();
    throw new Error(`WhatsApp webhook failed: ${err?.message || err}`);
  }

  console.groupEnd();
  return { downloadUrl };
}
