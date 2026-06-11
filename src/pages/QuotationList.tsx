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

  const filteredQuotations = quotations.filter(q => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      q.customerName?.toLowerCase().includes(query) ||
      q.quotationNumber?.toLowerCase().includes(query)
    );
  });

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
    const text = `*SACHIN GHONGADE PHOTO & FILMS*\n\nHello ${q.customerName},\n\nWe hope you are doing well.\n\nThis is a friendly follow-up regarding the quotation we shared with you earlier. We would be happy to know your thoughts and assist you with any questions or customization requirements.\n\nIf you would like to proceed with the booking, kindly let us know so that we can reserve your date and make the necessary arrangements.\n\nWe look forward to being a part of your special moments.\n\n*SACHIN GHONGADE PHOTO & FILMS*\n9422427981 / 9130053081\n\nInstagram (Weddings):\nhttps://www.instagram.com/sachin_ghongade_sg\n\nInstagram (Studio):\nhttps://www.instagram.com/kids_photography_by_sg\n\nFacebook:\nhttps://www.facebook.com/share/1EAF4dykDT/\n\nStudio Location:\nhttps://maps.app.goo.gl/sbvtioZwMiE5G7Pz5\n\nEnriching Your Moments Through Creative Photography And Cinematic Storytelling.`;
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
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
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
