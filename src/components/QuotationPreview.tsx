import { type Quotation } from '@/firebase/firestore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { storage } from '@/firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

interface Props {
  quotation: Quotation;
  onClose: () => void;
  autoPrint?: boolean;
  isNew?: boolean;
}

export default function QuotationPreview({ quotation, onClose, autoPrint = false, isNew = false }: Props) {
  const handlePrint = () => window.print();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  useEffect(() => {
    if (isNew && quotation.customerPhone) {
      let active = true;
      const delayTimer = setTimeout(async () => {
        if (!active) return;
        setIsSending(true);
        const toastId = toast.loading('Generating quotation PDF & sending WhatsApp...');

        try {
          // ── Step 1: Generate PDF blob via html2pdf ────────────────────────
          const html2pdf = (window as any).html2pdf;
          if (!html2pdf) throw new Error('html2pdf library not loaded. Please refresh.');

          const element = document.getElementById('quotation-print-area');
          if (!element) throw new Error('Quotation preview element not found in DOM.');

          // Inject font style so html2canvas picks up Devanagari font
          const fontStyle = document.createElement('style');
          fontStyle.textContent = `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@700;900&display=swap');`;
          element.prepend(fontStyle);

          // Wait for font to fully load before capturing
          try {
            await document.fonts.load("900 14px 'Noto Serif Devanagari'");
            await document.fonts.ready;
          } catch (e) {
            console.warn('Font preload warning:', e);
          }

          const filename = `Quotation_${quotation.quotationNumber.replace(/\s+/g, '_')}.pdf`;
          const storagePath = `quotations/${quotation.quotationNumber.replace(/\s+/g, '_')}.pdf`;

          const blob: Blob = await html2pdf().set({
            margin: 10,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          }).from(element).outputPdf('blob');
          fontStyle.remove();

          console.log('✅ Quotation PDF generated. Size:', blob.size, 'bytes');

          // ── Step 2: Upload to Firebase Storage ───────────────────────────
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
          console.log('✅ Firebase upload successful:', snapshot.ref.fullPath);

          // ── Step 3: Get download URL ─────────────────────────────────────
          const downloadUrl = await getDownloadURL(snapshot.ref);
          console.log('✅ Firebase Download URL:', downloadUrl);

          // ── Step 4: Format phone number ──────────────────────────────────
          let phone = quotation.customerPhone.replace(/\D/g, '');
          if (phone.startsWith('0')) phone = phone.substring(1);
          const finalPhone = phone.length === 10 ? '91' + phone : phone;

          // ── Step 5: Build quotation-specific webhook URL ─────────────────
          // Webhook: quotation,customerName — no amount/date for this template
          const safeCustomerName = quotation.customerName.replace(/,/g, ' ');
          const webhookUrl =
            `https://webhook.whatapi.in/webhook/6a3266186f1a8bf9dd7641b2` +
            `?number=${finalPhone}` +
            `&message=quotation,${encodeURIComponent(safeCustomerName)}` +
            `&medialink=${encodeURIComponent(downloadUrl)}`;

          console.log('=== Quotation Webhook Debug ===');
          console.log('Quotation Number:', quotation.quotationNumber);
          console.log('Customer Name:', quotation.customerName);
          console.log('Customer Phone (formatted):', finalPhone);
          console.log('Firebase Download URL:', downloadUrl);
          console.log('Final Webhook URL:', webhookUrl);

          // ── Step 6: Send webhook request ─────────────────────────────────
          const response = await fetch(webhookUrl);
          const responseText = await response.text();
          console.log('Webhook Response Status:', response.status);
          console.log('Webhook Response Body:', responseText);
          console.log('==============================');

          if (active) {
            toast.success('Quotation generated and WhatsApp sent successfully.', { id: toastId, duration: 5000 });
          }
        } catch (err: any) {
          console.error('❌ Quotation PDF/webhook error:', err);
          if (active) {
            toast.error(`Failed: ${err.message || String(err)}`, { id: toastId, duration: 8000 });
          }
        } finally {
          if (active) setIsSending(false);
        }
      }, 1000);

      return () => {
        active = false;
        clearTimeout(delayTimer);
      };
    }
  }, [isNew, quotation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-card-foreground">Quotation Preview</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-indigo-500/10 text-indigo-600">
              Estimate
            </span>
            {isSending && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Sending PDF...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Quotation Body (Screen View for html2pdf) */}
        <div id="quotation-print-area" className="pt-3 px-6 pb-6 space-y-4 no-print bg-white text-black">
          {renderContent()}
        </div>
      </div>

      {/* Print Portal (for native window.print()) */}
      {createPortal(
        <div className="print-only pt-3 px-6 pb-6 space-y-4 bg-white text-black">
          {renderContent()}
        </div>,
        document.body
      )}
    </div>
  );

  function renderContent() {
    return (
      <>
        {/* Company Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col items-start" style={{ gap: '6px' }}>
              {/* Logo + Studio Text Row */}
              <div className="flex items-start" style={{ gap: '0px' }}>
                <img
                  src="/logo.png"
                  alt="Sachin Ghongade Photo & Films"
                  style={{
                    height: '180px',
                    width: 'auto',
                    objectFit: 'contain',
                    maxWidth: '500px',
                    marginTop: '-10px',
                    marginLeft: '-15px'
                  }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg text-card-foreground uppercase tracking-wide">{quotation.quotationNumber}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(quotation.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1.5 uppercase tracking-wider bg-indigo-500/10 text-indigo-600">
                PROPOSAL ESTIMATE
              </span>
            </div>
          </div>

          {/* Centered Address & Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center', textAlign: 'center', marginTop: '6px', borderBottom: '1.5px solid #000000', paddingBottom: '10px' }}>
            <p style={{ fontSize: '13px', color: '#000000', margin: 0, fontWeight: '700', width: '100%', textAlign: 'center' }}>
              स्टेट बँक जवळ, SVC बँकेच्या खाली, विश्रामबाग गणपती मंदिराशेजारी, सांगली ४१६ ४१५
            </p>
            <p style={{ fontSize: '13px', color: '#000000', margin: 0, fontWeight: '600', width: '100%', textAlign: 'center' }}>
              📞 <strong>Office:</strong> 9130053081 &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Mobile:</strong> 9422427981 &nbsp;&nbsp;|&nbsp;&nbsp; ⏰ <strong>वेळ:</strong> सकाळी 9.30 ते रात्री 8.30
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 rounded-lg p-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estimate To</p>
              <p className="font-medium text-lg text-card-foreground">{quotation.customerName}</p>
              {quotation.customerPhone && <p className="text-sm text-muted-foreground mt-1">{quotation.customerPhone}</p>}
              {quotation.customerEmail && <p className="text-sm text-muted-foreground">{quotation.customerEmail}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generated By</p>
              <p className="font-bold text-lg text-card-foreground">{quotation.createdBy || 'System'}</p>
            </div>
          </div>

          {quotation.description && (
            <div className="px-1 border-l-2 border-indigo-500/20 bg-indigo-500/5 py-2 flex flex-col items-center text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">CATEGORY</p>
              <p className="text-sm text-card-foreground whitespace-pre-wrap">{quotation.description}</p>
            </div>
          )}

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Item / Service</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Est. Rate</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2 text-card-foreground">
                    <div className="font-semibold">{item.name}</div>
                    {item.description && (
                      <div className="text-[10px] text-muted-foreground whitespace-pre-wrap mt-0.5 font-normal leading-normal">{item.description}</div>
                    )}
                  </td>
                  <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(item.price)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{fmt(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Payments */}
          <div className="flex justify-end pt-4 border-t border-border">
            <div className="space-y-1.5 text-sm w-full max-w-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums font-medium text-foreground">{fmt(quotation.subtotal)}</span></div>
              {quotation.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums text-success">-{fmt(quotation.discount)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Taxable Amount</span><span className="tabular-nums">{fmt(quotation.taxableAmount)}</span></div>
              {quotation.gstEnabled && <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span className="tabular-nums">{fmt(quotation.gstAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-indigo-600 pt-2 border-t border-border">
                <span>Estimated Total</span><span className="tabular-nums">{fmt(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>          {/* Terms & Conditions for Print */}
          <div className="pt-4 mt-4 border-t border-border break-inside-avoid">
            <h4 className="font-bold text-card-foreground mb-2 text-[10px] uppercase tracking-widest text-center sm:text-left">अटी व शर्ती · Terms & Conditions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[9px] sm:text-[10px] leading-tight">
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">1. Booking will be confirmed only after receiving the advance payment. Advance payments are non-refundable in case of cancellation.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">बुकिंग फक्त आगाऊ रक्कम प्राप्त झाल्यानंतरच निश्चित मानली जाईल. रद्द केल्यास आगाऊ रक्कम परत मिळणार नाही.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">2. The remaining balance must be cleared on or before the event date. Final photos, videos, albums, and other deliverables will be handed over only after full payment has been received.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">उर्वरित रक्कम कार्यक्रमाच्या दिवशी किंवा त्यापूर्वी भरावी लागेल. संपूर्ण पेमेंट मिळाल्यानंतरच अंतिम फोटो, व्हिडिओ, अल्बम व इतर साहित्य दिले जाईल.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">3. Event dates may be rescheduled subject to availability. The client is responsible for obtaining venue permissions and ensuring cooperation from family members, guests, and event organizers during the shoot.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">उपलब्धतेनुसार कार्यक्रमाची तारीख बदलता येईल. आवश्यक परवानग्या घेणे तसेच शूटदरम्यान कुटुंबीय, पाहुणे व आयोजकांचे सहकार्य सुनिश्चित करणे ही ग्राहकाची जबाबदारी राहील.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">4. Delivery timelines may vary depending on the project scope, season, editing requirements, weather conditions, venue restrictions, traffic, power failures, or other circumstances beyond the studio's control.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">प्रोजेक्टचा प्रकार, सीझन, एडिटिंगची आवश्यकता, हवामान, स्थळावरील निर्बंध, वाहतूक, वीजपुरवठा खंडित होणे किंवा स्टुडिओच्या नियंत्रणाबाहेरील परिस्थितींमुळे डिलिव्हरी वेळेत बदल होऊ शकतो.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">5. Raw photos, raw videos, and unedited files are not included unless specifically mentioned in the package. Photo selection, video editing, album designing, and highlight film creation will be carried out at the studio's discretion.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">पॅकेजमध्ये स्पष्टपणे नमूद केले नसल्यास Raw Photos, Raw Videos व Unedited Files दिल्या जाणार नाहीत. फोटो निवड, व्हिडिओ एडिटिंग, अल्बम डिझाईन व हायलाइट फिल्मची अंतिम निवड स्टुडिओच्या निर्णयानुसार केली जाईल.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">6. Additional services, extra hours, extra locations, albums, prints, editing requests, or any work outside the package will be charged separately.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">पॅकेजबाहेरील अतिरिक्त सेवा, अतिरिक्त तास, लोकेशन्स, अल्बम, प्रिंट्स, एडिटिंग किंवा इतर कामांसाठी स्वतंत्र शुल्क आकारले जाईल.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">7. Clients are advised to maintain a backup of all delivered photos and videos. The studio is not responsible for storing project data permanently.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">डिलिव्हरीनंतर ग्राहकांनी फोटो व व्हिडिओंचा बॅकअप ठेवावा. प्रोजेक्ट डेटा कायमस्वरूपी जतन करण्याची जबाबदारी स्टुडिओची राहणार नाही.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">8. Minor variations in photo prints, album prints, colors, lamination, finishing, and other print-related processes may occur due to technical, chemical, environmental, or production factors and shall not be considered defects.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">तांत्रिक, रासायनिक, पर्यावरणीय किंवा उत्पादन प्रक्रियेतील कारणांमुळे फोटो प्रिंट्स, अल्बम प्रिंट्स, रंग, लॅमिनेशन किंवा फिनिशिंगमध्ये किरकोळ फरक आढळू शकतो. ते दोष मानले जाणार नाहीत.</p>
              </div>
              <div className="space-y-1 bg-muted/5 dark:bg-muted/15 rounded-md p-2 border border-border/20">
                <p className="font-bold text-card-foreground">9. The studio shall not be responsible for any loss, damage, or delay caused by natural disasters, fire, flood, theft, equipment failure, hard disk failure, memory card corruption, software issues, data loss, power failures, or any circumstances beyond its control. Clients are requested to collect their completed photos, videos, albums, and other deliverables within 30 days of notification. After this period, the studio will not be responsible for their storage or safety.</p>
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">नैसर्गिक आपत्ती, आग, पूर, चोरी, उपकरण बिघाड, hard disk बिघाड, मेमरी कार्ड करप्शन, सॉफ्टवेअर समस्या, डेटा लॉस, वीजपुरवठा खंडित होणे किंवा स्टुडिओच्या नियंत्रणाबाहेरील कोणत्याही कारणामुळे होणाऱ्या नुकसान, विलंब किंवा हानीसाठी स्टुडिओ जबाबदार राहणार नाही. तयार झालेल्या फोटो, व्हिडिओ, अल्बम किंवा इतर साहित्याची सूचना दिल्यानंतर 30 दिवसांच्या आत ग्राहकांनी ते घेऊन जावे. त्यानंतर त्यांच्या साठवणुकीची किंवा सुरक्षिततेची जबाबदारी स्टुडिओची राहणार नाही.</p>
              </div>
            </div>

            <div className="mt-3 text-center space-y-1 text-[8px] sm:text-[9px] text-muted-foreground border-t border-dashed border-border/50 pt-2 break-inside-avoid">
              <p className="font-medium text-foreground">By confirming the booking and making the advance payment, the client acknowledges and agrees to all the above Terms & Conditions.</p>
              <p className="italic">बुकिंग निश्चित करून आगाऊ रक्कम भरल्यास ग्राहक वरील सर्व अटी व शर्ती मान्य करतो.</p>
              <p className="font-bold text-primary tracking-wider uppercase mt-1">Sachin Ghongade Photo & Films</p>
              <p className="text-[7.5px] sm:text-[8px] italic opacity-85">Enriching Your Moments Through Creative Photography And Cinematic Storytelling.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-center flex justify-between items-end">
              <div className="text-[9px] text-muted-foreground text-left">
                <p className="font-bold text-foreground">Customer Signature</p>
                <p className="mt-4 border-t border-border w-24 pt-0.5">Acceptance Signature</p>
              </div>
              <div className="text-[9px] text-muted-foreground text-right">
                <p className="font-bold text-foreground">Sachin Ghongade Photo &amp; Films</p>
                <p className="mt-4 border-t border-border w-24 pt-0.5 inline-block">Authorized Representative</p>
              </div>
            </div>
          </div>
      </>
    );
  }
}
