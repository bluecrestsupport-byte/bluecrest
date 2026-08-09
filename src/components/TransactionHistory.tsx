import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bitcoin, CheckCircle2, Clock3, CreditCard, Download, ExternalLink, FileDown, FileText, LifeBuoy, ShieldCheck, WalletCards } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { cn } from '../lib/utils';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const receiptShell = (title: string, rows: Array<[string, unknown]>) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>body{font-family:Arial;color:#0f172a;padding:48px;max-width:720px;margin:auto}.brand{color:#003399}table{width:100%;border-collapse:collapse;margin-top:32px}td{padding:14px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:36%}h1{margin-bottom:4px}.footer{margin-top:40px;color:#64748b;font-size:12px}@media print{body{padding:20px}}</style></head>
  <body><h1 class="brand">Blue Crest Premium Banking</h1><h2>Transaction receipt</h2><table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table>
  <p class="footer">This electronic receipt reflects the transaction record held by Blue Crest Premium Banking.</p></body></html>`;

export default function TransactionHistory({ transactions, formatCurrency, onContactSupport, openClearanceTransferId = '' }: { transactions: any[]; formatCurrency: (amount: number) => string; onContactSupport?: () => void; openClearanceTransferId?: string }) {
  const [selectedClearance, setSelectedClearance] = useState<any | null>(null);
  const openedClearanceRequest = useRef('');
  useEffect(() => {
    if (!openClearanceTransferId || openedClearanceRequest.current === openClearanceTransferId) return;
    const match = transactions.find(transaction => String(transaction.transferId) === String(openClearanceTransferId));
    if (match) {
      openedClearanceRequest.current = openClearanceTransferId;
      setSelectedClearance(match);
    }
  }, [openClearanceTransferId, transactions]);
  const buildReceipt = async (transaction: any) => {
    const transferId = String(transaction.reference || '').match(/^TXN-TRF-(\d+)-/)?.[1];
    let receiptNumber = transaction.reference || transaction.id;
    let rows: Array<[string, unknown]>;

    if (transferId) {
      const receipt = await apiRequest<any>(`/api/v1/transfers/${transferId}/receipt`);
      if (receipt.status !== 'COMPLETED') throw new Error('Receipts are available after a transfer is completed');
      receiptNumber = receipt.receipt_number;
      rows = [
        ['Reference', receipt.receipt_number],
        ['Date and time', new Date(receipt.created_at).toLocaleString()],
        ['Amount', `${receipt.currency} ${Number(receipt.amount).toFixed(2)}`],
        ['Recipient', receipt.recipient_name],
        ['Destination', `${receipt.recipient_bank || 'Blue Crest'} · ${receipt.recipient_account_number}`],
        ['Payment method', receipt.transfer_type],
        ['Status', receipt.status]
      ];
    } else {
      const source = [transaction.originName, transaction.originBank].filter(Boolean).join(' — ');
      rows = [
        ['Reference', receiptNumber],
        ['Date and time', `${transaction.date} ${transaction.time}`],
        ['Transaction type', String(transaction.type).toUpperCase()],
        ['Amount', formatCurrency(transaction.amount)],
        ...(source ? [['From', source] as [string, unknown]] : []),
        ...(transaction.originAccountNumber ? [['Originating account', transaction.originAccountNumber] as [string, unknown]] : []),
        ['Description', transaction.name],
        ['Status', transaction.status]
      ];
    }

    return { receiptNumber, html: receiptShell(receiptNumber, rows) };
  };

  const downloadReceipt = async (transaction: any) => {
    const { receiptNumber, html } = await buildReceipt(transaction);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${receiptNumber}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPdfReceipt = async (transaction: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Please allow pop-ups to create a PDF receipt');

    try {
      printWindow.document.write('<p style="font-family:Arial;padding:32px">Preparing your PDF receipt…</p>');
      const { html } = await buildReceipt(transaction);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 300);
    } catch (error) {
      printWindow.close();
      throw error;
    }
  };

  if (selectedClearance) {
    return <ClearanceFeeDetails
      transaction={selectedClearance}
      formatCurrency={formatCurrency}
      onBack={() => setSelectedClearance(null)}
      onContactSupport={onContactSupport}
    />;
  }

  return <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-6 md:rounded-[2.5rem] md:p-10">
    <div className="mb-6 px-1 md:mb-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#003399]">Payments</p>
      <h2 className="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">Transaction history</h2>
      <p className="mt-1 text-[11px] font-medium text-slate-400">Credits in green, debits in red.</p>
    </div>

    <div className="space-y-3">
      {transactions.length === 0 && <div className="py-16 text-center text-slate-400"><FileText className="mx-auto mb-3 h-9 w-9" /><p className="text-sm font-semibold">No transactions yet.</p></div>}
      {transactions.map(transaction => {
        const isCredit = String(transaction.type).toLowerCase() === 'credit';
        const isCompleted = String(transaction.status).toLowerCase() === 'completed';
        const awaitingClearance = ['AWAITING_PAYMENT', 'AWAITING_CONFIRMATION'].includes(transaction.clearanceStatus);
        const DirectionIcon = isCredit ? ArrowDownLeft : ArrowUpRight;

        return <article
          key={transaction.id}
          onClick={awaitingClearance ? () => setSelectedClearance(transaction) : undefined}
          onKeyDown={awaitingClearance ? event => { if (event.key === 'Enter' || event.key === ' ') setSelectedClearance(transaction); } : undefined}
          role={awaitingClearance ? 'button' : undefined}
          tabIndex={awaitingClearance ? 0 : undefined}
          className={cn('rounded-2xl border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] transition-all md:flex md:items-center md:gap-4', awaitingClearance ? 'cursor-pointer border-amber-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-200' : 'border-slate-100 hover:border-slate-200')}
        >
          <div className="flex min-w-0 items-start gap-3 md:flex-1 md:items-center">
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
              <DirectionIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3 md:block">
                <p className="truncate text-sm font-bold text-slate-800">{transaction.name}</p>
                <p className={cn('shrink-0 text-sm font-extrabold md:hidden', isCredit ? 'text-emerald-600' : 'text-rose-600')}>{isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}</p>
              </div>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400 md:text-[10px]">{transaction.date} · {transaction.time} <span className="hidden sm:inline">· {transaction.id}</span></p>
              {transaction.originName && <p className="mt-1 truncate text-[10px] font-semibold text-[#003399]">From {transaction.originName}{transaction.originBank ? ` · ${transaction.originBank}` : ''}{transaction.originAccountNumber ? ` · ${transaction.originAccountNumber}` : ''}</p>}
              {transaction.performedBy && <p className="mt-1 text-[10px] font-semibold text-[#003399]">Joint account activity by {transaction.performedBy}</p>}
              {awaitingClearance && <p className="mt-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700"><Clock3 className="h-3.5 w-3.5" /> {transaction.clearanceStatus === 'AWAITING_CONFIRMATION' ? 'Receipt awaiting confirmation' : 'Clearance fee required · View steps'}</p>}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 md:mt-0 md:block md:border-0 md:pt-0 md:text-right">
              <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider md:block md:bg-transparent md:p-0', isCompleted ? 'bg-emerald-50 text-emerald-700 md:text-slate-400' : 'bg-amber-50 text-amber-700 md:text-amber-700')}>{transaction.clearanceStatus === 'AWAITING_CONFIRMATION' ? 'Awaiting confirmation' : awaitingClearance ? 'Pending · Awaiting transfer fee' : transaction.status}</span>
            <p className={cn('hidden font-extrabold md:mt-1 md:block', isCredit ? 'text-emerald-600' : 'text-rose-600')}>{isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}</p>
          </div>

          {isCompleted && <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex md:shrink-0">
            <button onClick={() => downloadReceipt(transaction).catch(error => alert(error.message))} className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-[#003399] transition-colors hover:bg-blue-100" title="Download receipt">
              <Download className="h-4 w-4" /><span>Download</span>
            </button>
            <button onClick={() => openPdfReceipt(transaction).catch(error => alert(error.message))} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-slate-800" title="Save receipt as PDF">
              <FileDown className="h-4 w-4" /><span>PDF</span>
            </button>
          </div>}
        </article>;
      })}
    </div>
  </div>;
}

function ClearanceFeeDetails({ transaction, formatCurrency, onBack, onContactSupport }: {
  transaction: any;
  formatCurrency: (amount: number) => string;
  onBack: () => void;
  onContactSupport?: () => void;
}) {
  const fee = Number(transaction.clearanceFeeAmount || 0);
  const [screen, setScreen] = useState<'summary' | 'methods' | 'exodus'>(transaction.clearanceReceipt ? 'exodus' : 'summary');
  const [receipt, setReceipt] = useState(transaction.clearanceReceipt || '');
  const [submitted, setSubmitted] = useState(Boolean(transaction.clearanceReceipt));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      await apiRequest(`/api/v1/transfers/${transaction.transferId}/clearance-receipt`, {
        method: 'POST',
        body: JSON.stringify({ receipt })
      });
      setSubmitted(true);
    } catch (submitError: any) {
      setError(submitError.message || 'Could not submit the receipt for confirmation.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm md:rounded-[2.5rem]">
    <div className="bg-gradient-to-br from-slate-950 via-[#071b45] to-[#003399] px-5 py-7 text-white sm:px-8 md:px-10 md:py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-blue-100 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to transactions</button>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ShieldCheck className="h-7 w-7 text-blue-100" /></div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-300">{submitted ? 'Awaiting receipt confirmation' : 'Pending · Awaiting transfer fee'}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Fees to be cleared</h2>
          <p className="mt-2 max-w-lg text-xs leading-5 text-blue-100/75">This transfer is pending. Complete the clearance process before it can be reviewed for final approval.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur-sm">
          <p className="text-[9px] font-bold uppercase tracking-widest text-blue-100/60">Clearance amount</p>
          <p className="mt-1 text-3xl font-extrabold text-white">{formatCurrency(fee)}</p>
        </div>
      </div>
    </div>

    <div className="space-y-7 p-5 sm:p-8 md:p-10">
      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-xs sm:grid-cols-2">
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pending transfer</p><p className="mt-1 font-extrabold text-slate-800">{formatCurrency(transaction.amount)}</p></div>
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Recipient</p><p className="mt-1 truncate font-extrabold text-slate-800">{transaction.recipientName || transaction.name}</p></div>
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Reference</p><p className="mt-1 font-mono font-bold text-slate-700">{transaction.reference || transaction.id}</p></div>
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Status</p><p className="mt-1 font-extrabold text-amber-700">{submitted ? 'Awaiting confirmation' : 'Pending · Awaiting transfer fee'}</p></div>
      </div>

      {screen === 'summary' && <section className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-sm font-extrabold text-[#003399]">Why am I seeing this?</p><p className="mt-2 text-xs leading-5 text-slate-600">This transfer requires its assigned clearance fee before it can be reviewed and approved.</p></div>
        <button onClick={() => setScreen('methods')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003399] px-5 py-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-900/10 transition-colors hover:bg-blue-800">Clear clearance fee <ArrowRight className="h-4 w-4" /></button>
      </section>}

      {screen === 'methods' && <section>
        <button onClick={() => setScreen('summary')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Fee summary</button>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003399]">Choose a payment method</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900">Clear your transfer fee</h3>
        <div className="mt-5 space-y-3">
          <div aria-disabled="true" className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-400">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white"><CreditCard className="h-5 w-5" /></div>
            <div><p className="text-sm font-extrabold line-through">Pay with debit card</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">Temporarily unavailable</p></div>
            <div className="pointer-events-none absolute left-5 right-5 top-1/2 h-px -rotate-3 bg-rose-400/70" />
          </div>
          <button onClick={() => setScreen('exodus')} className="flex w-full items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#003399] text-white"><Bitcoin className="h-5 w-5" /></div>
            <div className="flex-1"><p className="text-sm font-extrabold text-slate-900">Pay with Bitcoin</p><p className="mt-1 text-xs font-semibold text-[#003399]">Continue with Exodus wallet</p></div><ArrowRight className="h-5 w-5 text-[#003399]" />
          </button>
        </div>
      </section>}

      {screen === 'exodus' && <section>
        <button onClick={() => setScreen('methods')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Payment methods</button>
        <div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111936] text-white"><WalletCards className="h-7 w-7" /></div><h3 className="mt-4 text-xl font-extrabold text-slate-900">Pay with Exodus</h3><p className="mt-1 text-xs text-slate-500">Buy and send Bitcoin with a self-custody wallet where purchasing is supported in your region.</p></div>
        <div className="mt-6 space-y-3">
          {[
            ['Download or open Exodus', <span>Install Exodus only from the <a href="https://www.exodus.com/download/" target="_blank" rel="noreferrer" className="font-bold text-[#003399] underline">official Exodus website <ExternalLink className="inline h-3 w-3" /></a>, then create or open your wallet.</span>],
            ['Buy the required Bitcoin', <span>Use the Buy feature if it is available in your country. Purchase enough BTC to cover the clearance amount and any displayed network fee.</span>],
            ['Send to the verified address', <span>Request the official Bitcoin payment address through your authenticated Blue Crest support conversation, then verify it carefully before sending.</span>],
            ['Submit your transaction receipt', <span>After sending, copy the Bitcoin transaction ID or receipt reference and paste it below for confirmation.</span>]
          ].map(([title, description], index) => <div key={String(title)} className="flex gap-4 rounded-2xl border border-slate-100 p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-[#003399]">{index + 1}</div><div><p className="text-sm font-extrabold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>)}
        </div>

        {submitted ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-extrabold text-emerald-800">Receipt submitted</p><p className="mt-1 text-xs leading-5 text-emerald-700">Your transaction receipt is awaiting admin confirmation. The transfer remains pending until it is reviewed.</p><p className="mt-3 break-all rounded-lg bg-white/70 p-2 font-mono text-[10px] text-emerald-800">{receipt}</p></div></div></div> : <form onSubmit={submitReceipt} className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Bitcoin transaction ID or receipt reference</label>
          <textarea value={receipt} onChange={event => setReceipt(event.target.value.slice(0, 240))} required minLength={6} placeholder="Paste your transaction ID or receipt reference here" className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none focus:border-blue-300" />
          {error && <p className="rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-600">{error}</p>}
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#003399] px-4 py-3.5 text-xs font-extrabold uppercase tracking-wide text-white disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit receipt for confirmation'} <ArrowRight className="h-4 w-4" /></button>
        </form>}
      </section>}

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-xs font-extrabold text-emerald-800">What happens next?</p><p className="mt-1 text-xs leading-5 text-emerald-700">Once clearance is confirmed and the transfer is approved, its status will change from pending to completed.</p></div></div>
      </div>

      <button onClick={onContactSupport} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"><LifeBuoy className="h-4 w-4" /> Contact Blue Crest support</button>
      <p className="text-center text-[10px] font-semibold leading-4 text-slate-400">For your security, use only the support channel inside your authenticated Blue Crest account.</p>
    </div>
  </div>;
}
