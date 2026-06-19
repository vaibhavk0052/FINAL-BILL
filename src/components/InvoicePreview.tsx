import { type Invoice } from '@/contexts/InvoiceContext';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadPdfAndSendWebhook } from '@/utils/pdfUploader';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

interface Props {
  invoice: Invoice;
  onClose: () => void;
  autoPrint?: boolean;
  isNew?: boolean;
}

export default function InvoicePreview({ invoice, onClose, autoPrint = false, isNew = false }: Props) {
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
    if (isNew && invoice.customerPhone) {
      let active = true;
      const delayTimer = setTimeout(async () => {
        if (!active) return;
        setIsSending(true);
        const toastId = toast.loading('Generating PDF & sending WhatsApp invoice...');

        try {
          const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-IN');
          const storagePath = `invoices/${invoice.invoiceNumber.replace(/\s+/g, '_')}.pdf`;
          const filename = `Invoice_${invoice.invoiceNumber.replace(/\s+/g, '_')}.pdf`;

          await uploadPdfAndSendWebhook({
            elementId: 'invoice-print-area',
            filename,
            storagePath,
            customerPhone: invoice.customerPhone,
            customerName: invoice.customerName,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            remainingAmount: invoice.remainingAmount || 0,
            invoiceDate,
          });

          if (active) {
            toast.success('Invoice generated and WhatsApp invoice sent successfully.', { id: toastId, duration: 5000 });
          }
        } catch (err: any) {
          console.error('Error during PDF upload / WhatsApp webhook:', err);
          if (active) {
            toast.error(`Failed: ${err.message || String(err)}`, { id: toastId, duration: 8000 });
          }
        } finally {
          if (active) {
            setIsSending(false);
          }
        }
      }, 1000);

      return () => {
        active = false;
        clearTimeout(delayTimer);
      };
    }
  }, [isNew, invoice]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-card-foreground">Invoice Preview</h2>
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider',
              invoice.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}>
              {invoice.paymentStatus}
            </span>
            {isSending && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Sending PDF...
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={handlePrint} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Body (Screen View for html2pdf) */}
        <div id="invoice-print-area" className="pt-3 px-6 pb-6 space-y-4 no-print bg-white text-black">
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
              {invoice.isImp && (
                <div className="mb-1">
                  <span className="inline-block text-[8px] font-black uppercase tracking-widest text-amber-600 border border-amber-500/25 px-1.5 py-0.5 rounded bg-amber-500/5 select-none leading-none">
                    IMP
                  </span>
                </div>
              )}
              <p className="font-black text-lg text-card-foreground uppercase tracking-wide">{invoice.invoiceNumber}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1.5 uppercase tracking-wider',
                invoice.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}>
                {invoice.paymentStatus}
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-medium text-lg text-card-foreground">{invoice.customerName}</p>
              {invoice.customerPhone && <p className="text-sm text-muted-foreground mt-1">{invoice.customerPhone}</p>}
              {invoice.customerEmail && <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed By</p>
              <p className="font-bold text-lg text-card-foreground">{invoice.createdBy || 'System'}</p>
            </div>
          </div>

          {(invoice.description || invoice.category) && (
            <div className="flex flex-col sm:flex-row gap-4">
              {invoice.category && (
                <div className="flex-1 px-4 border-l-4 border-primary/40 bg-primary/5 py-3 rounded-r-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Bill Category</p>
                  <p className="text-sm font-black text-card-foreground">{invoice.category}</p>
                </div>
              )}
              {invoice.description && (
                <div className="flex-[2] px-4 border-l-4 border-primary/40 bg-primary/5 py-3 rounded-r-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-card-foreground whitespace-pre-wrap font-medium">{invoice.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Item</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Price</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Details</p>
              {invoice.paymentHistory && invoice.paymentHistory.length > 0 ? (
                <div className="space-y-1">
                  {invoice.paymentHistory.map((ph, idx) => (
                    <div key={idx} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">{new Date(ph.date).toLocaleDateString()}</span>
                        <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm", ph.method === 'cash' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600")}>{ph.method}</span>
                        {ph.note && <span className="text-[10px] text-muted-foreground hidden sm:inline-block">- {ph.note}</span>}
                      </div>
                      <span className="font-medium text-foreground">{fmt(ph.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 mt-2 border-t border-dotted border-border font-bold">
                    <span className="text-foreground">Total Paid</span>
                    <span className="text-foreground">{fmt((invoice.cashAmount || 0) + (invoice.onlineAmount || 0))}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Payment</span>
                    <span className="font-medium text-foreground">{fmt(invoice.cashAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Online Payment</span>
                    <span className="font-medium text-foreground">{fmt(invoice.onlineAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-semibold text-primary">Advance Payment</span>
                    <span className="font-bold text-primary">{fmt(invoice.advanceAmount || 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm pt-2 mt-2 border-t border-dotted border-border">
                <span className="font-bold text-destructive">Remaining Balance</span>
                <span className="font-bold text-destructive">{fmt(invoice.remainingAmount || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums font-medium text-foreground">{fmt(invoice.subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums text-success">-{fmt(invoice.discount)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Taxable Amount</span><span className="tabular-nums">{fmt(invoice.taxableAmount)}</span></div>
              {invoice.gstEnabled && <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span className="tabular-nums">{fmt(invoice.gstAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-border">
                <span>Total Amount</span><span className="tabular-nums">{fmt(invoice.totalAmount)}</span>
              </div>
              {invoice.remainingAmount > 0 && (
                <div className="flex justify-between font-bold text-lg text-destructive pt-1">
                  <span>Remaining</span><span className="tabular-nums">{fmt(invoice.remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions for Print */}
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
                <p className="text-muted-foreground text-[8px] sm:text-[8.5px] italic">तांत्रिक, रासायनिक, पर्यावरणीय किंवा उत्पादन प्रक्रियेतील कारणांमुळे फोटो प्रिंट्स, अल्बम प्रिंट्स, रंग, लॅमिनेशन किंवा फिनिशिंगमध्ये किरкоळ फरक आढळू शकतो. ते दोष मानले जाणार नाहीत.</p>
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
                <p className="mt-4 border-t border-border w-24 pt-0.5">Authorized Signatory</p>
              </div>
              <div className="text-[9px] text-muted-foreground text-right">
                <p className="font-bold text-foreground">Sachin Ghongade Photo &amp; Films</p>
                <p className="mt-4 border-t border-border w-24 pt-0.5 inline-block">Authorized Signatory</p>
              </div>
            </div>
          </div>
      </>
    );
  }
}
