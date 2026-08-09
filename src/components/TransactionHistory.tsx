import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, Clock3, Download, FileDown, FileText, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { cn } from '../lib/utils';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const receiptShell = (title: string, rows: Array<[string, unknown]>) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>body{font-family:Arial;color:#0f172a;padding:48px;max-width:720px;margin:auto}.brand{color:#003399}table{width:100%;border-collapse:collapse;margin-top:32px}td{padding:14px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:36%}h1{margin-bottom:4px}.footer{margin-top:40px;color:#64748b;font-size:12px}@media print{body{padding:20px}}</style></head>
  <body><h1 class="brand">Blue Crest Premium Banking</h1><h2>Transaction receipt</h2><table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table>
  <p class="footer">This electronic receipt reflects the transaction record held by Blue Crest Premium Banking.</p></body></html>`;

export default function TransactionHistory({ transactions, formatCurrency, onContactSupport }: { transactions: any[]; formatCurrency: (amount: number) => string; onContactSupport?: () => void }) {
  const [selectedClearance, setSelectedClearance] = useState<any | null>(null);
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
        const awaitingClearance = transaction.clearanceStatus === 'AWAITING_PAYMENT';
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
              {awaitingClearance && <p className="mt-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Clearance fee required · View steps</p>}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 md:mt-0 md:block md:border-0 md:pt-0 md:text-right">
              <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider md:block md:bg-transparent md:p-0', isCompleted ? 'bg-emerald-50 text-emerald-700 md:text-slate-400' : 'bg-amber-50 text-amber-700 md:text-amber-700')}>{awaitingClearance ? 'Awaiting clearance fee' : transaction.status}</span>
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
  const steps = [
    ['Review the clearance fee', 'Confirm the fee and pending transfer details shown on this page.'],
    ['Contact Blue Crest Support', 'Use the official support channel in your account to request verified clearance instructions.'],
    ['Complete verification', 'Follow only the instructions provided inside your authenticated support conversation.'],
    ['Await transaction approval', 'After the fee is confirmed, the transaction status will be updated by the bank.']
  ];

  return <div className="mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm md:rounded-[2.5rem]">
    <div className="bg-gradient-to-br from-slate-950 via-[#071b45] to-[#003399] px-5 py-7 text-white sm:px-8 md:px-10 md:py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-blue-100 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to transactions</button>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ShieldCheck className="h-7 w-7 text-blue-100" /></div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-300">Awaiting clearance fee</p>
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
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Status</p><p className="mt-1 font-extrabold text-amber-700">Awaiting clearance fee</p></div>
      </div>

      <section>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#003399]">How to clear this transaction</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900">Follow these steps</h3>
        <div className="mt-5 space-y-3">
          {steps.map(([title, description], index) => <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-[#003399]">{index + 1}</div>
            <div><p className="text-sm font-extrabold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
          </div>)}
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-xs font-extrabold text-emerald-800">What happens next?</p><p className="mt-1 text-xs leading-5 text-emerald-700">Once clearance is confirmed and the transfer is approved, its status will change from pending to completed.</p></div></div>
      </div>

      <button onClick={onContactSupport} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003399] px-5 py-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-900/10 transition-colors hover:bg-blue-800">
        <LifeBuoy className="h-4 w-4" /> Contact support to continue <ArrowRight className="h-4 w-4" />
      </button>
      <p className="text-center text-[10px] font-semibold leading-4 text-slate-400">For your security, use only the support channel inside your authenticated Blue Crest account.</p>
    </div>
  </div>;
}
