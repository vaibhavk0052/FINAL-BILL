import { useState, Fragment } from 'react';
import { useQuotations } from '@/contexts/QuotationContext';
import { cn } from '@/lib/utils';
import { Trash2, Eye, Printer, Pencil, Globe, X, Search, Phone, FileSpreadsheet, Sparkles, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuotationPreview from '@/components/QuotationPreview';
import { type Quotation } from '@/firebase/firestore';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function QuotationList() {
  const { quotations, deleteQuotation, updateQuotation } = useQuotations();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'done' | 'all'>('all');

  const filteredQuotations = quotations
    .filter(q => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        q.customerName?.toLowerCase().includes(query) ||
        q.quotationNumber?.toLowerCase().includes(query) ||
        q.customerPhone?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayedQuotations = filteredQuotations.filter(q => {
    if (activeTab === 'pending') return (q.status || 'pending') === 'pending';
    if (activeTab === 'done') return q.status === 'done';
    return true;
  });

  const handleToggleStatus = async (q: Quotation) => {
    const nextStatus = q.status === 'done' ? 'pending' : 'done';
    await updateQuotation({
      ...q,
      status: nextStatus
    });
    toast.success(nextStatus === 'done' ? 'Quotation marked as Deal Done!' : 'Quotation marked as Pending.');
  };

  const handleDelete = async (id: string, num: string) => {
    if (confirm(`Are you sure you want to delete quotation ${num}?`)) {
      await deleteQuotation(id);
    }
  };

  const sendWhatsApp = (q: Quotation) => {
    const text = ` SACHIN GHONGADE PHOTO & FILMS

Hello ${q.customerName},

We hope you are doing well. 

This is a friendly follow-up regarding the quotation we shared with you earlier. We would be happy to know your thoughts and assist you with any questions or customization requirements.

If you would like to proceed with the booking, kindly let us know so that we can reserve your date and make the necessary arrangements.

We look forward to being a part of your special moments. 

 SACHIN GHONGADE PHOTO & FILMS
 9422427981 / 9130053081

 Instagram (Weddings):
https://www.instagram.com/sachin_ghongade_sg

 Instagram (Studio):
https://www.instagram.com/kids_photography_by_sg

YouTube:
https://youtube.com/@sachin_ghongade_photo_films?si=csa1LU48owFu-6V-

Facebook:
https://www.facebook.com/share/1EAF4dykDT/

 Studio Location:
https://maps.app.goo.gl/sbvtioZwMiE5G7Pz5

 Enriching Your Moments Through Creative Photography And Cinematic Storytelling.`;
    const phone = q.customerPhone ? q.customerPhone.replace(/\D/g, '') : '';
    const finalPhone = phone.length === 10 ? '91' + phone : phone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quotations & Estimates</h1>
          <p className="text-sm text-muted-foreground mt-1">{quotations.length} total estimates in history</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer or quote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-border/30 bg-muted/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Create New Estimate Button */}
          <button
            onClick={() => navigate('/create-quotation')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/10 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Create Estimate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted/60 dark:bg-muted/10 w-fit rounded-xl border border-border/30 animate-fade-up">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            activeTab === 'all'
              ? "bg-card text-foreground shadow-sm border border-border/30 font-black"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All
          <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 text-[10px] font-black border border-indigo-500/20">
            {quotations.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            activeTab === 'pending'
              ? "bg-card text-foreground shadow-sm border border-border/30 font-black"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Pending
          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20">
            {quotations.filter(q => (q.status || 'pending') === 'pending').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('done')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
            activeTab === 'done'
              ? "bg-card text-foreground shadow-sm border border-border/30 font-black"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Deal Done
          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/20">
            {quotations.filter(q => q.status === 'done').length}
          </span>
        </button>
      </div>

      {/* Main Quotations Table */}
      <div className="bg-card rounded-2xl border border-border/30 shadow-card overflow-hidden animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-wider">Quotation #</th>
                <th className="text-left px-5 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-wider">Date & Time</th>
                <th className="text-left px-5 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-wider">Customer</th>
                <th className="text-left px-5 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-wider">Generated By</th>
                <th className="text-center px-5 py-4 font-black text-muted-foreground uppercase text-[10px] tracking-wider">Estimated Amt</th>
              </tr>
            </thead>
            <tbody>
              {displayedQuotations.map((q) => (
                <Fragment key={q.id}>
                  {/* Data row */}
                  <tr className="border-b border-border/10 hover:bg-muted/5 transition-all group">
                    <td className="px-5 py-5 font-black text-foreground">{q.quotationNumber}</td>
                    <td className="px-5 py-5 text-xs font-bold text-muted-foreground">
                      <div>{new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] font-medium opacity-70 mt-0.5">
                        {new Date(q.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="font-bold text-foreground text-sm">{q.customerName}</div>
                      {q.customerPhone && <div className="text-xs text-muted-foreground mt-0.5">{q.customerPhone}</div>}
                    </td>
                    <td className="px-5 py-5">
                      <div className="font-bold text-foreground">{q.createdBy || 'System'}</div>
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{q.createdByRole || 'Staff'}</div>
                    </td>
                    <td className="px-5 py-5 text-center font-black text-base text-indigo-600 tabular-nums">
                      {fmt(q.totalAmount)}
                    </td>
                  </tr>

                  {/* Actions row — spans full width below data */}
                  <tr className="border-b border-border/30 bg-muted/5 hover:bg-muted/10 transition-colors last:border-0">
                    <td colSpan={5} className="px-5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">


                        <button
                          onClick={() => handleToggleStatus(q)}
                          title={q.status === 'done' ? 'Revert to Pending' : 'Mark as Deal Done'}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none text-[10px]",
                            q.status === 'done'
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                              : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                          )}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>{q.status === 'done' ? 'Deal Done' : 'Final'}</span>
                        </button>

                        <button
                          onClick={() => sendWhatsApp(q)}
                          title="Share Estimate on WhatsApp"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25d366] font-bold transition-all border border-[#25d366]/30 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none text-[10px]"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span>WhatsApp</span>
                        </button>

                        <div className="w-px h-5 bg-border mx-1" />

                        <button
                          onClick={() => setPreviewQuotation(q)}
                          title="View Details"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold transition-all border border-violet-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none text-[10px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => navigate(`/edit-quotation/${q.id}`)}
                          title="Edit Estimate"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none text-[10px]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDelete(q.id, q.quotationNumber)}
                          title="Delete Estimate"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-all border border-rose-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none text-[10px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
              {displayedQuotations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground italic font-semibold">
                    No quotations or estimate proposals found in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewQuotation && (
        <QuotationPreview
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
        />
      )}
    </div>
  );
}
