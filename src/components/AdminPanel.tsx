console.log('ADMIN PANEL LOADED');
import React, { useState, useEffect } from 'react';
import {
  Users,
  Send,
  Landmark,
  UserCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Lock,
  Unlock,
  PlusCircle,
  Check,
  X,
  CreditCard,
  Calendar,
  Edit,
  Trash2,
  Eye,
  FileText,
  KeyRound,
  Copy
  ,BellRing
} from 'lucide-react';
import { cn } from '../lib/utils';
import AdminCommunications from './AdminCommunications';
import AdminSecurity from './AdminSecurity';
import AdminSupportInbox from './AdminSupportInbox';

interface AdminPanelProps {
  currentUser: any;
  formatUserCurrency?: (amount: number) => string;
}

const ADMIN_COUNTRY_CURRENCY_LIST = [
  { country: "United States of America", currency: "USD" },
  { country: "United Kingdom", currency: "GBP" },
  { country: "Canada", currency: "CAD" },
  { country: "United Arab Emirates", currency: "AED" },
  { country: "European Union Countries", currency: "EUR" },
  { country: "Australia", currency: "AUD" },
  { country: "Nigeria", currency: "NGN" },
  { country: "Singapore", currency: "SGD" },
  { country: "South Africa", currency: "ZAR" },
  { country: "Switzerland", currency: "CHF" },
  { country: "India", currency: "INR" },
  { country: "Japan", currency: "JPY" }
];

type AdminTxnType = 'CREDIT' | 'DEBIT';
type AdminTab = 'users' | 'transfers' | 'loans' | 'cards' | 'deposits' | 'support' | 'security' | 'create-txn' | 'communications';

interface AdminStats {
  total_users: number;
  total_balance: number;
  funded_financing: number;
  total_funded: number;
  pending_transfers: number;
}

interface BatchTransactionRow {
  id: string;
  user_id: string;
  type: AdminTxnType;
  amount: string;
  description: string;
  transaction_date: string;
}

const currentLocalDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const normalizeDateTimeInput = (value: unknown) => {
  const normalized = String(value || '').trim().replace(' ', 'T');
  if (!normalized) return currentLocalDateTime();
  return normalized.length === 10 ? `${normalized}T00:00` : normalized.slice(0, 16);
};

const createBatchTransactionRow = (): BatchTransactionRow => ({
  id: crypto.randomUUID(),
  user_id: '',
  type: 'CREDIT',
  amount: '',
  description: '',
  transaction_date: currentLocalDateTime()
});

const unwrapApiData = (payload: any) => payload?.data || payload || [];
const parseDepositEvidence = (value: string | null | undefined) => {
  try {
    const evidence = JSON.parse(value || '[]');
    return Array.isArray(evidence) ? evidence : [];
  } catch {
    return [];
  }
};

export default function AdminPanel({ currentUser, formatUserCurrency }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminTab>(() => new URLSearchParams(window.location.search).has('support') ? 'support' : 'users');
  const [users, setUsers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_balance: 0,
    funded_financing: 0,
    total_funded: 0,
    pending_transfers: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');

  // Custom states for forms
  const [targetUserId, setTargetUserId] = useState('');
  const [txnType, setTxnType] = useState('CREDIT');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDesc, setTxnDesc] = useState('');
  const [txnDate, setTxnDate] = useState(currentLocalDateTime());
  const [txnOriginName, setTxnOriginName] = useState('');
  const [txnOriginBank, setTxnOriginBank] = useState('');
  const [txnOriginAccount, setTxnOriginAccount] = useState('');
  const [recoveryTransferUserId, setRecoveryTransferUserId] = useState('');
  const [recoveryTransferType, setRecoveryTransferType] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [recoveryTransferStatus, setRecoveryTransferStatus] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [recoveryTransferAmount, setRecoveryTransferAmount] = useState('');
  const [recoveryTransferDate, setRecoveryTransferDate] = useState(currentLocalDateTime());
  const [recoveryRecipientName, setRecoveryRecipientName] = useState('');
  const [recoveryRecipientBank, setRecoveryRecipientBank] = useState('');
  const [recoveryRecipientAccount, setRecoveryRecipientAccount] = useState('');
  const [recoveryTransferDescription, setRecoveryTransferDescription] = useState('');
  const [batchTransactions, setBatchTransactions] = useState<BatchTransactionRow[]>([
    createBatchTransactionRow(),
    createBatchTransactionRow()
  ]);
  const [batchJsonInput, setBatchJsonInput] = useState('');

  // Add User State
  const [showAddUser, setShowAddUser] = useState(false);
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addCountry, setAddCountry] = useState('United States of America');
  const [addCurrency, setAddCurrency] = useState('USD');
  const [addDob, setAddDob] = useState('');
  const [addAccountNumber, setAddAccountNumber] = useState('');
  const [addAccountType, setAddAccountType] = useState('CHECKING');
  const [addGender, setAddGender] = useState('');
  const [addState, setAddState] = useState('');
  const [addZipCode, setAddZipCode] = useState('');
  const [addMaritalStatus, setAddMaritalStatus] = useState('');
  const [addOccupation, setAddOccupation] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addGovernmentId, setAddGovernmentId] = useState('');
  const [addCreatedAt, setAddCreatedAt] = useState('');

  // Editing Row State
  const [editingUserId, setEditingUserId] = useState<number | string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editSavingsBalance, setEditSavingsBalance] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editTransferPin, setEditTransferPin] = useState('');

  // Password reset modal state
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [resetTemporaryPassword, setResetTemporaryPassword] = useState('');
  const [resetForceChange, setResetForceChange] = useState(true);
  const [resetPasswordResult, setResetPasswordResult] = useState('');

  // KYC inspection modal state
  const [inspectKycUser, setInspectKycUser] = useState<any | null>(null);
  const [inspectDeposit, setInspectDeposit] = useState<any | null>(null);

  // Per-user transaction inspection state
  const [transactionUser, setTransactionUser] = useState<any | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('ALL');
  const [isLoadingUserTransactions, setIsLoadingUserTransactions] = useState(false);
  const [userTransactionsError, setUserTransactionsError] = useState('');
  const [reversingTransactionReference, setReversingTransactionReference] = useState<string | null>(null);
  const [failingTransactionReference, setFailingTransactionReference] = useState<string | null>(null);

  const formatCurrency = formatUserCurrency || ((amt: number) => `$${amt.toLocaleString()}`);
  const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

  const requestAdminData = async (path: string) => {
    const res = await fetch(path, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `Failed to fetch ${path}`);
    return unwrapApiData(data);
  };

  const fetchStats = async () => {
    const data = await requestAdminData('/api/v1/admin/stats');
    setStats({
      total_users: Number(data.total_users || 0),
      total_balance: Number(data.total_balance || 0),
      funded_financing: Number(data.funded_financing || 0),
      total_funded: Number(data.total_funded || 0),
      pending_transfers: Number(data.pending_transfers || 0)
    });
  };

  const fetchSection = async (tab: AdminTab) => {
    if (tab === 'users' || tab === 'security' || tab === 'create-txn' || tab === 'communications') {
      const data = await requestAdminData('/api/v1/users');
      setUsers(Array.isArray(data) ? data : []);
    } else if (tab === 'transfers') {
      const data = await requestAdminData('/api/v1/transfers');
      setTransfers(Array.isArray(data) ? data : []);
    } else if (tab === 'loans') {
      const data = await requestAdminData('/api/v1/loans');
      setLoans(Array.isArray(data) ? data : []);
    } else if (tab === 'cards') {
      const data = await requestAdminData('/api/v1/cards');
      setCards(Array.isArray(data) ? data : []);
    } else if (tab === 'deposits') {
      const data = await requestAdminData('/api/v1/admin/deposits');
      setDeposits(Array.isArray(data) ? data : []);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setResponseMsg('');
    try {
      await Promise.all([fetchStats(), fetchSection(activeSubTab)]);
    } catch (e) {
      console.error(e);
      setResponseMsg(e instanceof Error ? e.message : 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const handleInspectDeposit = async (deposit: any) => {
    setInspectDeposit({ ...deposit, isLoadingEvidence: true });
    try {
      const detail = await requestAdminData(`/api/v1/admin/deposits/${deposit.id}`);
      setInspectDeposit({ ...detail, isLoadingEvidence: false });
    } catch (error) {
      setInspectDeposit({
        ...deposit,
        isLoadingEvidence: false,
        evidenceError: error instanceof Error ? error.message : 'Failed to load deposit evidence.'
      });
    }
  };

  const reviewDeposit = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/v1/admin/deposits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Could not review deposit');
      setDeposits(items => items.map(item => item.id === id ? { ...item, status } : item));
      setResponseMsg(`Deposit ${status.toLowerCase()}.`);
    } catch (error: any) { setResponseMsg(error.message); }
  };

  const handleViewUserTransactions = async (user: any) => {
    setTransactionUser(user);
    setUserTransactions([]);
    setTransactionStatusFilter('ALL');
    setUserTransactionsError('');
    setIsLoadingUserTransactions(true);

    try {
      const res = await fetch(`/api/v1/transactions/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message || payload.error || 'Failed to fetch user transactions.');
      }

      setUserTransactions(Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []));
    } catch (error) {
      setUserTransactionsError(error instanceof Error ? error.message : 'Failed to fetch user transactions.');
    } finally {
      setIsLoadingUserTransactions(false);
    }
  };

  const handleReverseTransaction = async (transaction: any) => {
    if (!transaction?.reference) return;
    if (!window.confirm(`Reverse transaction ${transaction.reference}? This will create an opposite ledger entry and adjust the member's balance.`)) return;
    setReversingTransactionReference(transaction.reference);
    setResponseMsg('');

    try {
      const res = await fetch(`/api/v1/transactions/${encodeURIComponent(transaction.reference)}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message || payload.error || 'Failed to reverse transaction.');
      }

      setResponseMsg('Transaction reversed and the member was notified.');
      if (transactionUser) {
        await handleViewUserTransactions(transactionUser);
      }
    } catch (error) {
      setResponseMsg(error instanceof Error ? error.message : 'Failed to reverse transaction.');
    } finally {
      setReversingTransactionReference(null);
    }
  };

  const handleMarkTransactionFailed = async (transaction: any) => {
    if (!transaction?.reference) return;
    if (!window.confirm(`Mark transaction ${transaction.reference} as failed? This will undo its balance movement.`)) return;
    setFailingTransactionReference(transaction.reference);
    setResponseMsg('');

    try {
      const res = await fetch(`/api/v1/transactions/${encodeURIComponent(transaction.reference)}/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message || payload.error || 'Failed to update transaction.');
      }

      setResponseMsg('Transaction marked as failed.');
      if (transactionUser) {
        await handleViewUserTransactions(transactionUser);
      }
    } catch (error) {
      setResponseMsg(error instanceof Error ? error.message : 'Failed to update transaction.');
    } finally {
      setFailingTransactionReference(null);
    }
  };

  const handleInspectKyc = async (user: any) => {
    setInspectKycUser({ ...user, isLoadingKyc: true });

    try {
      const res = await fetch(`/api/v1/users/${user.id}/kyc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message || payload.error || 'Failed to fetch KYC documents.');
      }

      setInspectKycUser({
        ...user,
        ...unwrapApiData(payload),
        isLoadingKyc: false
      });
    } catch (error) {
      setInspectKycUser({
        ...user,
        isLoadingKyc: false,
        kycError: error instanceof Error ? error.message : 'Failed to fetch KYC documents.'
      });
    }
  };

  // Update user KYC status
  const handleUpdateKyc = async (userId: string | number, newKyc: string) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/users/kyc/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newKyc }) // backend expects body.status
      });
      if (res.ok) {
        setResponseMsg('KYC status updated successfully!');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to update KYC.');
      }
    } catch (e) {
      setResponseMsg('Server connection offline.');
    }
  };
  // Update user transfer flow status (PENDING, COMPLETED, RESTRICTED)
  const handleUpdateTransferFlow = async (userId: string | number, newFlow: string) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transfer_flow: newFlow })
      });
      if (res.ok) {
        setResponseMsg('Transfer restriction flow updated successfully!');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to update transfer flow.');
      }
    } catch (e) {
      setResponseMsg('Server connection offline.');
    }
  };
  const handleCreateManualTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMsg('');
    if (!targetUserId || !txnAmount || !txnOriginName.trim() || !txnOriginBank.trim() || !txnOriginAccount.trim()) {
      setResponseMsg('Please fill all fields.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: targetUserId,
          type: txnType,
          amount: Number(txnAmount),
          status: 'COMPLETED',
          description: txnDesc || (txnType === 'CREDIT' ? 'Account Deposit' : 'Account Debit'),
          transaction_date: txnDate,
          origin_name: txnOriginName.trim(),
          origin_bank: txnOriginBank.trim(),
          origin_account_number: txnOriginAccount.trim()
        })
      });

      if (res.ok) {
        setResponseMsg(`Transaction recorded successfully in ledger!`);
        setTxnAmount('');
        setTxnDesc('');
        setTxnOriginName('');
        setTxnOriginBank('');
        setTxnOriginAccount('');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to issue transaction.');
      }
    } catch (e) {
      console.error(e);
      setResponseMsg('Server error.');
    }
  };

  const handleRecoverTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMsg('');
    try {
      const res = await fetch('/api/v1/admin/transfers/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_id: recoveryTransferUserId,
          transfer_type: recoveryTransferType,
          status: recoveryTransferStatus,
          amount: Number(recoveryTransferAmount),
          transaction_date: recoveryTransferDate,
          recipient_name: recoveryRecipientName,
          recipient_bank: recoveryRecipientBank,
          recipient_account_number: recoveryRecipientAccount,
          description: recoveryTransferDescription || 'Bank Transfer'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Could not recover transfer.');

      setResponseMsg(
        recoveryTransferStatus === 'PENDING'
          ? 'Pending transfer recovered. Its amount is now reserved from the customer balance.'
          : 'Completed transfer recovered without a duplicate debit.'
      );
      setRecoveryTransferAmount('');
      setRecoveryRecipientName('');
      setRecoveryRecipientBank('');
      setRecoveryRecipientAccount('');
      setRecoveryTransferDescription('');
      setRecoveryTransferDate(currentLocalDateTime());
      fetchData();
    } catch (error: any) {
      setResponseMsg(error.message || 'Could not recover transfer.');
    }
  };

  const handleUpdateBatchTransaction = (
    rowId: string,
    field: keyof Omit<BatchTransactionRow, 'id'>,
    value: string
  ) => {
    setBatchTransactions((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? { ...row, [field]: field === 'type' ? value as AdminTxnType : value }
          : row
      )
    );
  };

  const handleAddBatchTransaction = () => {
    setBatchTransactions((rows) => [...rows, createBatchTransactionRow()]);
  };

  const handleRemoveBatchTransaction = (rowId: string) => {
    setBatchTransactions((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)
    );
  };

  const resolveJsonUserId = (entry: any) => {
    if (entry.user_id || entry.userId) {
      return String(entry.user_id || entry.userId);
    }

    const email = String(entry.email || '').trim().toLowerCase();
    const accountNumber = String(entry.account_number || entry.accountNumber || '').trim();

    const matchedUser = users.find((user) => {
      const userEmail = String(user.email || '').trim().toLowerCase();
      const userAccount = String(user.account_number || user.accountNumber || '').trim();
      return (email && userEmail === email) || (accountNumber && userAccount === accountNumber);
    });

    return matchedUser ? String(matchedUser.id) : '';
  };

  const handleLoadBatchJson = () => {
    setResponseMsg('');

    try {
      const parsed = JSON.parse(batchJsonInput);
      const entries = Array.isArray(parsed) ? parsed : parsed.transactions;

      if (!Array.isArray(entries) || entries.length === 0) {
        setResponseMsg('Paste a JSON array or an object with a transactions array.');
        return;
      }

      const rows = entries.map((entry: any) => {
        const type = String(entry.type || 'CREDIT').trim().toUpperCase();
        const transactionDate = normalizeDateTimeInput(
          entry.transaction_date || entry.transactionDate || entry.timestamp || entry.date
        );

        return {
          id: crypto.randomUUID(),
          user_id: resolveJsonUserId(entry),
          type: type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
          amount: entry.amount !== undefined && entry.amount !== null ? String(entry.amount) : '',
          description: String(entry.description || entry.note || ''),
          transaction_date: transactionDate
        } as BatchTransactionRow;
      });

      const invalidRow = rows.find((row) => !row.user_id || !row.amount || Number(row.amount) <= 0 || !row.transaction_date);

      if (invalidRow) {
        setResponseMsg('JSON rows need a valid user, amount, and date.');
        return;
      }

      setBatchTransactions(rows);
      setResponseMsg(`${rows.length} JSON transactions loaded into the batch ledger.`);
    } catch (e) {
      setResponseMsg('Invalid JSON format.');
    }
  };

  const handleCreateBatchTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMsg('');

    const incompleteRow = batchTransactions.find(
      (row) => !row.user_id || !row.amount || Number(row.amount) <= 0 || !row.transaction_date
    );

    if (incompleteRow) {
      setResponseMsg('Complete every batch row with a member, amount, and date.');
      return;
    }

    try {
      const res = await fetch('/api/v1/transactions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactions: batchTransactions.map((row) => ({
            user_id: row.user_id,
            type: row.type,
            amount: Number(row.amount),
            status: 'COMPLETED',
            description: row.description || (row.type === 'CREDIT' ? 'Account Deposit' : 'Account Debit'),
            transaction_date: row.transaction_date
          }))
        })
      });

      if (res.ok) {
        setResponseMsg(`${batchTransactions.length} batch transactions recorded successfully!`);
        setBatchTransactions([createBatchTransactionRow(), createBatchTransactionRow()]);
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to issue batch transactions.');
      }
    } catch (e) {
      console.error(e);
      setResponseMsg('Server error.');
    }
  };
  // Register New User
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMsg('');
    try {
      const res = await fetch('/api/v1/admin/users/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: addFirstName,
          last_name: addLastName,
          username: addUsername,
          email: addEmail,
          phone: addPhone,
          password: addPassword,
          country: addCountry,
          preferred_currency: addCurrency,
          date_of_birth: addDob,
          account_number: addAccountNumber,
          account_type: addAccountType,
          gender: addGender,
          state: addState,
          zip_code: addZipCode,
          marital_status: addMaritalStatus,
          occupation: addOccupation,
          address: addAddress,
          government_id_number: addGovernmentId,
          created_at: addCreatedAt,
          force_password_change: true,
          transfer_pin: null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResponseMsg(`Recovered '${addFirstName} ${addLastName}'. Their first login will confirm the email address.`);
        setShowAddUser(false);
        setAddFirstName('');
        setAddLastName('');
        setAddUsername('');
        setAddEmail('');
        setAddPhone('');
        setAddPassword('');
        setAddDob('');
        setAddAccountNumber('');
        setAddAccountType('CHECKING');
        setAddGender('');
        setAddState('');
        setAddZipCode('');
        setAddMaritalStatus('');
        setAddOccupation('');
        setAddAddress('');
        setAddGovernmentId('');
        setAddCreatedAt('');
        fetchData();
      } else {
        setResponseMsg(data.error?.message || data.error || 'Failed to register member.');
      }
    } catch (e) {
      setResponseMsg('Server connection offline.');
    }
  };

  // Start Editing User Row
  const handleStartEdit = (u: any) => {
    setEditingUserId(u.id);
    setEditFirstName(u.first_name || u.firstName || '');
    setEditLastName(u.last_name || u.lastName || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditCurrency(u.preferred_currency || u.preferredCurrency || 'USD');
    setEditBalance(u.balance?.toString() || '0');
    setEditSavingsBalance((u.savings_balance ?? u.savingsBalance ?? 0).toString());
    setEditDob(u.date_of_birth || u.dateOfBirth || '');
    setEditTransferPin('');
  };

  // Save Edit Row
  const handleSaveEdit = async (userId: string | number) => {
    setResponseMsg('');
    try {
      const payload: any = {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        phone: editPhone,
        preferred_currency: editCurrency,
        balance: Number(editBalance),
        savings_balance: Number(editSavingsBalance),
        date_of_birth: editDob
      };

      // If admin specified a custom Transfer PIN, send it
      if (editTransferPin !== '') {
        payload.transfer_pin = editTransferPin;
      }

      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResponseMsg('Member profile updated successfully!');
        setEditingUserId(null);
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to update user.');
      }
    } catch (e) {
      setResponseMsg('Server error.');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string | number) => {
    if (!window.confirm('Are you sure you want to delete this user permanently? This action is irreversible.')) {
      return;
    }
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setResponseMsg('User deleted successfully.');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to delete user.');
      }
    } catch (e) {
      setResponseMsg('Server error.');
    }
  };

  // Update loan status
  const handleUpdateLoanStatus = async (loanId: string | number, status: string) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/loans/${loanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setResponseMsg(`Loan status set to ${status}!`);
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to update loan.');
      }
    } catch (e) {
      setResponseMsg('Server connection offline.');
    }
  };

  // Assign origination fee (uses disbursement_fee)
  const handleAssignLoanFee = async (loanId: string | number, fee: number) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/loans/${loanId}/fee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ disbursement_fee: fee }) // backend expects disbursement_fee
      });
      if (res.ok) {
        setResponseMsg('Loan escrow origination fee assigned!');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed assigning fee.');
      }
    } catch (e) {
      setResponseMsg('Server error.');
    }
  };

  // Confirm escrow origination fee directly
  const handleConfirmLoanFee = async (loanId: string | number) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/loans/${loanId}/confirm-fee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setResponseMsg('Escrow origination fee marked as PAID successfully!');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed confirming fee.');
      }
    } catch (e) {
      setResponseMsg('Server error.');
    }
  };

  // Disburse Loan capital
  const handleDisburseLoan = async (loanId: string | number) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/loans/${loanId}/disburse`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setResponseMsg('Loan disbursed successfully!');
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed to disburse loan.');
      }
    } catch (e) {
      setResponseMsg('Connection failed.');
    }
  };

  const handleCardAction = async (
    cardId: string | number,
    action: 'approve' | 'reject' | 'confirm-payment' | 'release'
  ) => {
    setResponseMsg('');
    try {
      const response = await fetch(`/api/v1/cards/${cardId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Card action failed');
      setResponseMsg(
        action === 'approve' ? 'Card application approved and fee assigned.' :
        action === 'confirm-payment' ? 'Card payment confirmed.' :
        action === 'release' ? 'Debit card generated and released.' :
        'Card application rejected.'
      );
      fetchData();
    } catch (requestError: any) {
      setResponseMsg(requestError.message || 'Card action failed.');
    }
  };

  const handleOpenPasswordReset = (user: any) => {
    setResetPasswordUser(user);
    setResetTemporaryPassword('');
    setResetForceChange(true);
    setResetPasswordResult('');
    setResponseMsg('');
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setResponseMsg('');
    setResetPasswordResult('');

    try {
      const res = await fetch(`/api/v1/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          temporary_password: resetTemporaryPassword || undefined,
          force_change: resetForceChange
        })
      });
      const data = await res.json();
      if (res.ok) {
        const result = data.data || data;
        setResetPasswordResult(result.temporary_password);
        setResponseMsg('Temporary password created successfully.');
        fetchData();
      } else {
        setResponseMsg(data.error?.message || data.error || 'Failed to reset password.');
      }
    } catch (e) {
      setResponseMsg('Server error.');
    }
  };

  // Update transfer status
  const handleUpdateTransferStatus = async (transferId: string | number, status: string) => {
    setResponseMsg('');
    try {
      const res = await fetch(`/api/v1/transfers/${transferId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setResponseMsg(`Transfer updated to ${status}!`);
        fetchData();
      } else {
        const err = await res.json();
        setResponseMsg(err.error?.message || err.error || 'Failed updating status.');
      }
    } catch (e) {
      setResponseMsg('Connection error.');
    }
  };

  // Computations for Admin Statistics Cards
  const totalUsers = stats.total_users;
  const totalBalances = stats.total_balance;
  const totalFundedLoans = stats.funded_financing;
  const pendingAuditsCount = stats.pending_transfers;
  const totalFunded = stats.total_funded;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in font-sans">

      {/* Header Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl border border-white/5">
        <div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider rounded-full uppercase">Admin Backoffice Access</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3">Core Banking Control Center</h2>
          <p className="text-slate-400 text-xs mt-1">Manage global balances, KYC review requests, loan audits, and secure transaction lockouts.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Reload System Logs
        </button>
      </div>

      {/* STATISTICS CARDS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003399] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Members</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalUsers}</p>
          </div>
        </div>

        {/* Total Wallet Assets */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deposits</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatCurrency(totalBalances)}</p>
          </div>
        </div>

        {/* Disbursed Financing */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Funded Financing</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatCurrency(totalFundedLoans)}</p>
          </div>
        </div>

        {/* Total Funded Amount */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Funded</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatCurrency(totalFunded)}</p>
          </div>
        </div>

        {/* Pending Transfer Audits */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Audits</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{pendingAuditsCount}</p>
          </div>
        </div>
      </div>

      {responseMsg && (
        <div className="p-4 bg-slate-50 border border-slate-200 text-[#003399] font-bold text-xs rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          {responseMsg}
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
        {[
          { id: 'users', label: 'User Ledger', icon: Users },
          { id: 'transfers', label: 'Transfers & Wires', icon: Send },
          { id: 'loans', label: 'Capital Financing', icon: Landmark },
          { id: 'cards', label: 'Card Applications', icon: CreditCard },
          { id: 'deposits', label: 'Deposit Reviews', icon: DollarSign },
          { id: 'support', label: 'Support Inbox', icon: BellRing },
          { id: 'security', label: 'Insurance Codes', icon: Lock },
          { id: 'create-txn', label: 'Issue Transaction', icon: PlusCircle },
          { id: 'communications', label: 'Communications & Payouts', icon: Send }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as AdminTab)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all",
              activeSubTab === tab.id
                ? "bg-[#003399] text-white shadow-lg shadow-blue-900/10"
                : "text-slate-500 hover:bg-slate-55/40"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-PAGES RENDERING */}
      {activeSubTab === 'communications' && (
        <AdminCommunications users={users} />
      )}

      {activeSubTab === 'support' && <AdminSupportInbox />}

      {activeSubTab === 'security' && (
        <AdminSecurity users={users} />
      )}

      {activeSubTab === 'deposits' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900">Deposit verification</h3>
            <p className="text-xs text-slate-400 mt-1">Open each request and cross-check all gift card or Bitcoin evidence before approval.</p>
          </div>
          {deposits.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-slate-400">No deposit requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 text-[9px] uppercase tracking-widest text-slate-400">
                  <tr><th className="p-4">User</th><th className="p-4">Method</th><th className="p-4">Amount</th><th className="p-4">Evidence</th><th className="p-4">Status</th><th className="p-4">Review</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deposits.map(deposit => {
                    return (
                      <tr key={deposit.id}>
                        <td className="p-4"><p className="text-xs font-bold text-slate-800">{deposit.first_name} {deposit.last_name}</p><p className="text-[10px] text-slate-400">{deposit.email}</p></td>
                        <td className="p-4"><p className="text-xs font-bold">{deposit.method === 'GIFTCARD' ? 'Gift Card' : 'Bitcoin'}</p><p className="text-[10px] text-slate-400 max-w-48 break-all">{deposit.card_name || deposit.bitcoin_address}</p><p className="text-[9px] font-bold text-[#003399] mt-1">To: {deposit.target_account_kind === 'JOINT' ? `Joint •••• ${String(deposit.target_account_number || '').slice(-4)}` : 'Personal account'}</p></td>
                        <td className="p-4 text-sm font-extrabold">{formatCurrency(Number(deposit.amount))}</td>
                        <td className="p-4"><span className="text-[10px] font-bold text-[#003399]">Load on inspection</span></td>
                        <td className="p-4"><span className={cn('text-[9px] font-bold px-2.5 py-1 rounded-full', deposit.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : deposit.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}>{deposit.status}</span></td>
                        <td className="p-4"><button onClick={() => handleInspectDeposit(deposit)} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1.5"><Eye className="w-3 h-3" />Inspect</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Collapse/Expand Add User Form */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="w-full px-6 py-4 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-all font-bold text-sm text-slate-800"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#003399]" />
                Recover Lost Customer Account
              </span>
              <span className="text-xs text-[#003399]">{showAddUser ? 'Collapse Form' : 'Expand Form'}</span>
            </button>

            {showAddUser && (
              <form onSubmit={handleRegisterUser} className="p-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
                  Reconstruct verified customer records here. The opening balance remains zero until historical ledger entries are imported. On first sign-in, the customer creates a private login code, confirms the emailed six-digit code, and changes this temporary password.
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">First Name</label>
                  <input
                    type="text"
                    value={addFirstName}
                    onChange={e => setAddFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Last Name</label>
                  <input
                    type="text"
                    value={addLastName}
                    onChange={e => setAddLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Username</label>
                  <input
                    type="text"
                    value={addUsername}
                    onChange={e => setAddUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Email Address</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Phone Number</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Temporary Password</label>
                  <input
                    type="password"
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Country</label>
                  <select
                    value={addCountry}
                    onChange={e => {
                      const selected = e.target.value;
                      setAddCountry(selected);
                      const found = ADMIN_COUNTRY_CURRENCY_LIST.find(c => c.country === selected);
                      if (found) setAddCurrency(found.currency);
                    }}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none"
                  >
                    {ADMIN_COUNTRY_CURRENCY_LIST.map(c => (
                      <option key={c.country} value={c.country}>{c.country}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Preferred Currency</label>
                  <input
                    type="text"
                    value={addCurrency}
                    readOnly
                    className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Date of Birth</label>
                  <input
                    type="date"
                    value={addDob}
                    onChange={e => setAddDob(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Original Account Number</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={addAccountNumber} onChange={e => setAddAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Optional — 10 digits" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Account Type</label>
                  <select value={addAccountType} onChange={e => setAddAccountType(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" required>
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="FIXED_DEPOSIT">Fixed Deposit</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Original Account Opened</label>
                  <input type="datetime-local" value={addCreatedAt} onChange={e => setAddCreatedAt(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none text-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Gender</label>
                  <select value={addGender} onChange={e => setAddGender(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none">
                    <option value="">Select</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">State / Province</label>
                  <input type="text" value={addState} onChange={e => setAddState(e.target.value)} placeholder="State or province" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">ZIP / Postal Code</label>
                  <input type="text" value={addZipCode} onChange={e => setAddZipCode(e.target.value)} placeholder="ZIP or postal code" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Marital Status</label>
                  <select value={addMaritalStatus} onChange={e => setAddMaritalStatus(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none">
                    <option value="">Select</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Occupation</label>
                  <input type="text" value={addOccupation} onChange={e => setAddOccupation(e.target.value)} placeholder="Occupation" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Government ID / SSN</label>
                  <input type="text" value={addGovernmentId} onChange={e => setAddGovernmentId(e.target.value)} placeholder="Optional identity reference" autoComplete="off" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none" />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Residential Address</label>
                  <textarea value={addAddress} onChange={e => setAddAddress(e.target.value)} placeholder="Full residential address" className="w-full min-h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none resize-y" required />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-2">
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[#003399] hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-[0.98]"
                  >
                    Recover Customer Account
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* User List Table */}
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-50">
            <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#003399]" />
              Registered Members Ledger
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-4">
                    <th className="pb-3">Account Number</th>
                    <th className="pb-3">Name / Email</th>
                    <th className="pb-3">KYC Status</th>
                    <th className="pb-3">Restriction Flow</th>
                    <th className="pb-3">Account Balances</th>
                    <th className="pb-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => {
                    const isEditing = editingUserId === u.id;
                    const hasKycSubmitted = Boolean(
                      u.government_id_number ||
                      u.id_front_image_present ||
                      u.id_back_image_present ||
                      u.id_front_image ||
                      u.id_back_image
                    );
                    return (
                      <tr key={u.id} className="hover:bg-slate-55/10 transition-colors">
                        <td className="py-4 font-mono text-xs font-bold text-slate-500">#{u.account_number || u.accountNumber}</td>
                        <td className="py-4">
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-2 max-w-sm">
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={e => setEditFirstName(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                                placeholder="First Name"
                              />
                              <input
                                type="text"
                                value={editLastName}
                                onChange={e => setEditLastName(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                                placeholder="Last Name"
                              />
                              <input
                                type="email"
                                value={editEmail}
                                onChange={e => setEditEmail(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs col-span-2"
                                placeholder="Email"
                              />
                              <input
                                type="text"
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                                placeholder="Phone"
                              />
                              <input
                                type="date"
                                value={editDob}
                                onChange={e => setEditDob(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                                placeholder="DOB"
                              />
                              <input
                                type="text"
                                value={editTransferPin}
                                onChange={e => setEditTransferPin(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs col-span-2 font-mono"
                                placeholder="New 4-digit Transfer PIN (optional)"
                                maxLength={4}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm">{u.first_name || u.firstName} {u.last_name || u.lastName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{u.email}</span>
                              <div className="flex gap-2 items-center mt-1">
                                {u.date_of_birth && (
                                  <span className="text-[9px] text-slate-400 font-medium">DOB: {u.date_of_birth}</span>
                                )}
                                <span className={cn(
                                  "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                                  (u.transfer_pin_set || u.transfer_pin) ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                )}>
                                  {(u.transfer_pin_set || u.transfer_pin) ? "PIN Set" : "No PIN"}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <select
                              value={u.kyc_status || u.kycStatus || 'NOT_SUBMITTED'}
                              onChange={(e) => handleUpdateKyc(u.id, e.target.value)}
                              className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                            >
                              <option value="NOT_SUBMITTED">Not Submitted</option>
                              <option value="PENDING">Pending</option>
                              <option value="VERIFIED">Verified</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                            {hasKycSubmitted && (
                              <button
                                onClick={() => handleInspectKyc(u)}
                                className="text-[9px] text-[#003399] font-bold flex items-center gap-1 hover:underline"
                              >
                                <Eye className="w-3 h-3" /> Inspect Uploads
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <select
                            value={u.transfer_flow || u.transferFlow || 'PENDING'}
                            onChange={(e) => handleUpdateTransferFlow(u.id, e.target.value)}
                            className={cn(
                              "text-[10px] font-bold border rounded-lg p-1.5 focus:outline-none",
                              (u.transfer_flow === 'RESTRICTED' || u.transferFlow === 'RESTRICTED')
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : (u.transfer_flow === 'COMPLETED' || u.transferFlow === 'COMPLETED')
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : "bg-amber-50 text-amber-600 border-amber-200"
                            )}
                          >
                            <option value="PENDING">PENDING (Audit Required)</option>
                            <option value="COMPLETED">COMPLETED (Auto-Approve)</option>
                            <option value="AUTHORIZATION_HOLD">INSURANCE HOLD (Code Needed)</option>
                            <option value="AUTHORIZATION_REQUIRED">INSURANCE REQUIRED (Code Assigned)</option>
                            <option value="RESTRICTED">RESTRICTED (Blocked)</option>
                          </select>
                        </td>
                        <td className="py-4">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                value={editBalance}
                                onChange={e => setEditBalance(e.target.value)}
                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                                placeholder="Checking"
                                title="Checking balance"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editSavingsBalance}
                                onChange={e => setEditSavingsBalance(e.target.value)}
                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                                placeholder="Savings"
                                title="Savings balance"
                              />
                              <select
                                value={editCurrency}
                                onChange={e => setEditCurrency(e.target.value)}
                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px]"
                              >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CAD">CAD ($)</option>
                                <option value="AED">AED (د.إ)</option>
                                <option value="AUD">AUD ($)</option>
                                <option value="NGN">NGN (₦)</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="font-extrabold text-slate-800">Checking: {formatCurrency(Number(u.balance || 0))}</span>
                              <span className="font-bold text-slate-500">Savings: {formatCurrency(Number(u.savings_balance ?? u.savingsBalance ?? 0))}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleSaveEdit(u.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-2.5 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end items-center">
                              <button
                                onClick={() => handleViewUserTransactions(u)}
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="View User Transactions"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStartEdit(u)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit Profile Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenPasswordReset(u)}
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                title="Reset Login Password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete User Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'transfers' && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-50">
          <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
            <Send className="w-5 h-5 text-[#003399]" />
            Transaction Ledger & Audits
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-4">
                  <th className="pb-3">Txn ID</th>
                  <th className="pb-3">Sender Email</th>
                  <th className="pb-3">Recipient Account</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-55/10 transition-colors">
                    <td className="py-4 font-mono text-xs text-slate-400">#TXN-{t.id}</td>
                    <td className="py-4">
                      <span className="font-bold text-slate-700 text-xs">{t.sender_email || 'System'}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-slate-800">{t.recipient_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{t.recipient_bank} ({t.recipient_account_number})</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-extrabold text-slate-850">{formatCurrency(t.amount)}</span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-slate-50 rounded text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.description || 'Transfer'}</span>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-widest",
                        t.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : t.status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {t.status === 'PENDING' && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleUpdateTransferStatus(t.id, 'COMPLETED')}
                            className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                            title="Approve & Release Transfer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateTransferStatus(t.id, 'DECLINED')}
                            className="p-1 bg-rose-500 text-white rounded hover:bg-rose-600"
                            title="Decline & Void Transfer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateTransferStatus(t.id, 'RESTRICTED')}
                            className="p-1 bg-slate-800 text-white rounded hover:bg-slate-900"
                            title="Restrict Transfer & Notify Customer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'cards' && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-50">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#003399]" />
                Debit card applications
              </h3>
              <p className="mt-1 text-xs text-slate-400">Approve, confirm the arranged payment, then release the generated card.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#003399]">
              {cards.length} requests
            </span>
          </div>

          {cards.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-100 py-16 text-center text-xs font-semibold text-slate-400">
              No debit card applications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="pb-3">Applicant</th>
                    <th className="pb-3">Delivery</th>
                    <th className="pb-3">Fee / Payment</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cards.map(card => (
                    <tr key={card.id}>
                      <td className="py-4">
                        <p className="text-xs font-bold text-slate-800">{card.first_name} {card.last_name}</p>
                        <p className="text-[10px] text-slate-400">{card.email}</p>
                        <p className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#003399]">
                          {card.card_type} · Up to ${Number(card.purchase_limit_max || 0).toLocaleString()}
                        </p>
                        {card.card_number && (
                          <p className="mt-1 font-mono text-[10px] text-[#003399]">
                            •••• {String(card.card_number).slice(-4)} · {card.expiry_date}
                          </p>
                        )}
                      </td>
                      <td className="py-4 max-w-[240px] text-xs font-medium text-slate-500">{card.delivery_address}</td>
                      <td className="py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0
                          }).format(Number(card.issuance_fee || 0))}
                        </p>
                        <span className={cn(
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                          card.payment_status === 'PAID' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {card.payment_status}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest",
                          card.status === 'RELEASED' ? "bg-emerald-50 text-emerald-600" :
                          card.status === 'REJECTED' ? "bg-rose-50 text-rose-600" :
                          card.status === 'PAYMENT_CONFIRMED' ? "bg-teal-50 text-teal-600" :
                          card.status === 'REFERENCE_SUBMITTED' ? "bg-amber-50 text-amber-700" :
                          "bg-blue-50 text-[#003399]"
                        )}>
                          {card.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {card.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleCardAction(card.id, 'approve')}
                              className="rounded-lg bg-[#003399] px-3 py-1.5 text-[10px] font-bold text-white"
                            >
                              Approve
                            </button>
                            <button onClick={() => handleCardAction(card.id, 'reject')} className="rounded-lg bg-rose-500 px-3 py-1.5 text-[10px] font-bold text-white">Reject</button>
                          </div>
                        )}
                        {card.status === 'AWAITING_PAYMENT' && (
                          <span className="text-[10px] font-bold text-amber-600">Waiting for Txn Reference</span>
                        )}
                        {card.status === 'REFERENCE_SUBMITTED' && (
                          <div className="flex flex-col items-end gap-2">
                            {card.txn_reference_image && (
                              <a
                                href={card.txn_reference_image}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={card.txn_reference_image}
                                  alt="Submitted transaction reference"
                                  className="h-16 w-24 rounded-lg border border-slate-200 object-cover"
                                />
                              </a>
                            )}
                            <button
                              onClick={() => handleCardAction(card.id, 'confirm-payment')}
                              className="rounded-xl bg-teal-600 px-3 py-2 text-[10px] font-bold text-white"
                            >
                              Verify & Final Approve
                            </button>
                          </div>
                        )}
                        {card.status === 'PAYMENT_CONFIRMED' && (
                          <button onClick={() => handleCardAction(card.id, 'release')} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">
                            Release & Generate Card
                          </button>
                        )}
                        {card.status === 'RELEASED' && (
                          <span className="text-[10px] font-bold text-emerald-600">Released</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'loans' && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-50">
          <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#003399]" />
            Financing application portfolio
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-4">
                  <th className="pb-3">Loan ID</th>
                  <th className="pb-3">Applicant Name</th>
                  <th className="pb-3">Capital Requested</th>
                  <th className="pb-3">Escrow Fee Billing</th>
                  <th className="pb-3">State</th>
                  <th className="pb-3 text-right">Loan Clearance Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loans.map((l) => {
                  const applicant = users.find(u => u.id === l.user_id);
                  const applicantName = applicant ? `${applicant.first_name} ${applicant.last_name}` : `User #${l.user_id}`;
                  const applicantEmail = applicant ? applicant.email : '';
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-mono text-xs text-slate-400">#LOAN-{l.id}</td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-xs">{applicantName}</span>
                          <span className="text-[9px] text-slate-400">{applicantEmail}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-slate-800">{formatCurrency(l.requested_amount)}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block">{l.repayment_months} Mo repayment</span>
                      </td>
                      <td className="py-4">
                        {l.status === 'APPROVED' ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = Number((e.currentTarget.elements.namedItem('fee') as HTMLInputElement).value);
                              if (!isNaN(val)) handleAssignLoanFee(l.id, val);
                            }}
                            className="flex gap-1"
                          >
                            <input
                              type="number"
                              name="fee"
                              placeholder="Origination Fee"
                              className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                            <button type="submit" className="px-2 py-1 bg-[#003399] text-white rounded-lg text-[10px] font-bold">Assign</button>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-bold text-slate-800">
                              {l.disbursement_fee !== null && l.disbursement_fee !== 0 ? formatCurrency(l.disbursement_fee) : 'No Fee Assigned'}
                            </span>
                            {l.status === 'AWAITING_DISBURSEMENT_FEE' && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
                                Pending Payment
                              </span>
                            )}
                            {l.fee_status === 'PAID' && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                                Escrow Paid
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-widest",
                          l.status === 'DISBURSED' ? "bg-emerald-50 text-emerald-600" : l.status === 'PENDING' ? "bg-amber-50 text-amber-600" : l.status === 'REJECTED' ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {l.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleUpdateLoanStatus(l.id, 'APPROVED')}
                                className="px-3 py-1.5 bg-[#003399] text-white rounded-xl text-[10px] font-bold hover:bg-blue-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateLoanStatus(l.id, 'REJECTED')}
                                className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-[10px] font-bold hover:bg-rose-600"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {l.status === 'AWAITING_DISBURSEMENT_FEE' && (
                            <button
                              onClick={() => handleConfirmLoanFee(l.id)}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-[10px] font-bold hover:bg-teal-700 animate-pulse flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Confirm Fee Payment
                            </button>
                          )}
                          {l.status === 'READY_FOR_DISBURSEMENT' && (
                            <button
                              onClick={() => handleDisburseLoan(l.id)}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700"
                            >
                              Disburse Capital
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'create-txn' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6 items-start">
          <div className="xl:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-amber-100">
            <div className="mb-5">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" /> Recover Historical Transfer
              </h3>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Use this for a customer’s outgoing transfer—not the ordinary credit/debit form. A pending transfer immediately reserves its amount; approval keeps that deduction, while decline or rejection returns it.
              </p>
            </div>
            <form onSubmit={handleRecoverTransfer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Customer</label>
                <select value={recoveryTransferUserId} onChange={e => setRecoveryTransferUserId(e.target.value)} className="field-control" required>
                  <option value="">Choose customer</option>
                  {users.map(user => <option key={user.id} value={user.id}>{user.first_name} {user.last_name} (#{user.account_number})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Transfer Type</label>
                <select value={recoveryTransferType} onChange={e => setRecoveryTransferType(e.target.value as 'INTERNAL' | 'EXTERNAL')} className="field-control">
                  <option value="EXTERNAL">External bank transfer</option>
                  <option value="INTERNAL">Blue Crest internal transfer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current Status</label>
                <select value={recoveryTransferStatus} onChange={e => setRecoveryTransferStatus(e.target.value as 'PENDING' | 'COMPLETED')} className="field-control">
                  <option value="PENDING">Pending — reserve funds</option>
                  <option value="COMPLETED">Completed — final debit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Amount</label>
                <input type="number" min="0.01" step="0.01" value={recoveryTransferAmount} onChange={e => setRecoveryTransferAmount(e.target.value)} className="field-control" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Original Date & Time</label>
                <input type="datetime-local" value={recoveryTransferDate} onChange={e => setRecoveryTransferDate(e.target.value)} className="field-control" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recipient Name</label>
                <input type="text" value={recoveryRecipientName} onChange={e => setRecoveryRecipientName(e.target.value)} disabled={recoveryTransferType === 'INTERNAL'} className="field-control disabled:bg-slate-100" required={recoveryTransferType === 'EXTERNAL'} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recipient Bank</label>
                <input type="text" value={recoveryRecipientBank} onChange={e => setRecoveryRecipientBank(e.target.value)} disabled={recoveryTransferType === 'INTERNAL'} className="field-control disabled:bg-slate-100" required={recoveryTransferType === 'EXTERNAL'} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recipient Account Number</label>
                <input type="text" value={recoveryRecipientAccount} onChange={e => setRecoveryRecipientAccount(e.target.value)} className="field-control" required />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description</label>
                <input type="text" value={recoveryTransferDescription} onChange={e => setRecoveryTransferDescription(e.target.value)} placeholder="Bank Transfer" className="field-control" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Recover Transfer
                </button>
              </div>
            </form>
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50">
            <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#003399]" />
              Issue Single Transaction
            </h3>

            <form onSubmit={handleCreateManualTxn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Member Account</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none"
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.firstName} {u.last_name || u.lastName} (#{u.account_number || u.accountNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Transaction Type</label>
                  <select
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none"
                  >
                    <option value="CREDIT">Direct Credit</option>
                    <option value="DEBIT">Direct Debit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Amount</label>
                  <input
                    type="number"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Original Transaction Date & Time</label>
                  <input
                    type="datetime-local"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none text-slate-800"
                  required
                />
              </div>

              <fieldset className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-widest text-[#003399]">From / originating account</legend>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sender or organization name</label>
                  <input type="text" value={txnOriginName} onChange={(e) => setTxnOriginName(e.target.value)} className="field-control" required />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Originating bank</label>
                    <input type="text" value={txnOriginBank} onChange={(e) => setTxnOriginBank(e.target.value)} className="field-control" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Originating account number</label>
                    <input type="text" value={txnOriginAccount} onChange={(e) => setTxnOriginAccount(e.target.value)} className="field-control" required />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description / Note</label>
                <input
                  type="text"
                  value={txnDesc}
                  onChange={(e) => setTxnDesc(e.target.value)}
                  placeholder="e.g. System adjustment credit"
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-[#003399] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
              >
                Issue Transaction Ledger
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#003399]" />
                Batch Transaction Ledger
              </h3>
              <button
                type="button"
                onClick={handleAddBatchTransaction}
                className="h-10 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Add Row
              </button>
            </div>

            <form onSubmit={handleCreateBatchTransactions} className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JSON Batch Import</label>
                  <button
                    type="button"
                    onClick={handleLoadBatchJson}
                    className="h-9 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Load JSON
                  </button>
                </div>
                <textarea
                  value={batchJsonInput}
                  onChange={(e) => setBatchJsonInput(e.target.value)}
                  placeholder='[{"email":"customer@example.com","type":"CREDIT","amount":5000,"transaction_date":"2024-05-15T09:30","description":"Account Deposit"}]'
                  className="w-full min-h-28 resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[760px] space-y-3">
                  <div className="grid grid-cols-[1.45fr_0.85fr_0.8fr_0.95fr_1.2fr_44px] gap-2 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Member</span>
                    <span>Type</span>
                    <span>Amount</span>
                    <span>Date</span>
                    <span>Description</span>
                    <span></span>
                  </div>

                  {batchTransactions.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.45fr_0.85fr_0.8fr_0.95fr_1.2fr_44px] gap-2 items-center"
                    >
                      <select
                        value={row.user_id}
                        onChange={(e) => handleUpdateBatchTransaction(row.id, 'user_id', e.target.value)}
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-semibold focus:outline-none"
                        required
                      >
                        <option value="">Choose Member</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.first_name || u.firstName} {u.last_name || u.lastName} (#{u.account_number || u.accountNumber})
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.type}
                        onChange={(e) => handleUpdateBatchTransaction(row.id, 'type', e.target.value)}
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-semibold focus:outline-none"
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </select>

                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleUpdateBatchTransaction(row.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-semibold focus:outline-none"
                        required
                      />

                      <input
                        type="datetime-local"
                        value={row.transaction_date}
                        onChange={(e) => handleUpdateBatchTransaction(row.id, 'transaction_date', e.target.value)}
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-semibold focus:outline-none text-slate-800"
                        required
                      />

                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleUpdateBatchTransaction(row.id, 'description', e.target.value)}
                        placeholder="Batch adjustment note"
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-semibold focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveBatchTransaction(row.id)}
                        disabled={batchTransactions.length === 1}
                        className="h-12 w-11 rounded-xl bg-rose-50 text-rose-500 disabled:bg-slate-50 disabled:text-slate-300 flex items-center justify-center transition-all"
                        title="Remove batch row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-[#003399] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
              >
                Submit {batchTransactions.length} Batch Transactions
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER TRANSACTION LEDGER MODAL */}
      {transactionUser && (() => {
        const filteredTransactions = transactionStatusFilter === 'ALL'
          ? userTransactions
          : userTransactions.filter((transaction) =>
            String(transaction.status || '').toUpperCase() === transactionStatusFilter
          );
        const totalCredits = userTransactions
          .filter((transaction) => String(transaction.type).toUpperCase() === 'CREDIT')
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        const totalDebits = userTransactions
          .filter((transaction) => String(transaction.type).toUpperCase() === 'DEBIT')
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="px-6 md:px-8 py-6 bg-slate-900 text-white flex justify-between items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Member Transaction Ledger</p>
                  <h4 className="text-lg font-extrabold mt-0.5">
                    {transactionUser.first_name || transactionUser.firstName} {transactionUser.last_name || transactionUser.lastName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    #{transactionUser.account_number || transactionUser.accountNumber} · {transactionUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setTransactionUser(null)}
                  className="w-10 h-10 shrink-0 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                  title="Close transaction ledger"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Transactions</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-1">{userTransactions.length}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Total Credits</p>
                    <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatCurrency(totalCredits)}</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-rose-600">Total Debits</p>
                    <p className="text-xl font-extrabold text-rose-700 mt-1">{formatCurrency(totalDebits)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'DECLINED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setTransactionStatusFilter(status)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                          transactionStatusFilter === status
                            ? "bg-[#003399] text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleViewUserTransactions(transactionUser)}
                    disabled={isLoadingUserTransactions}
                    className="px-3 py-2 rounded-xl bg-blue-50 text-[#003399] text-[10px] font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingUserTransactions && "animate-spin")} />
                    Refresh
                  </button>
                </div>

                {isLoadingUserTransactions ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#003399]" />
                    <p className="text-xs font-bold">Loading transaction history…</p>
                  </div>
                ) : userTransactionsError ? (
                  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold">
                    {userTransactionsError}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <FileText className="w-7 h-7 mb-3" />
                    <p className="text-sm font-bold">No {transactionStatusFilter === 'ALL' ? '' : transactionStatusFilter.toLowerCase()} transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left min-w-[760px]">
                      <thead className="bg-slate-50">
                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Date / Reference</th>
                          <th className="p-4">Description</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map((transaction) => {
                          const type = String(transaction.type || '').toUpperCase();
                          const status = String(transaction.status || 'PENDING').toUpperCase();
                          const dateValue = transaction.transaction_date || transaction.created_at;
                          return (
                            <tr key={transaction.id || transaction.reference} className="hover:bg-slate-50/70">
                              <td className="p-4">
                                <p className="text-xs font-bold text-slate-700">
                                  {dateValue ? new Date(dateValue).toLocaleDateString() : 'No date'}
                                </p>
                                <p className="text-[9px] font-mono text-slate-400 mt-1">{transaction.reference || `#${transaction.id}`}</p>
                              </td>
                              <td className="p-4">
                                <p className="text-xs font-bold text-slate-700">{transaction.description || 'Transaction'}</p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">{transaction.category || 'General'}</p>
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "text-[9px] font-bold px-2 py-1 rounded-full",
                                  type === 'CREDIT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>{type || 'DEBIT'}</span>
                              </td>
                              <td className={cn("p-4 text-sm font-extrabold", type === 'CREDIT' ? "text-emerald-600" : "text-slate-800")}>
                                {type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(transaction.amount || 0))}
                                <span className="block text-[9px] font-bold text-slate-400 mt-1">{transaction.currency || ''}</span>
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                                  status === 'COMPLETED'
                                    ? "bg-emerald-50 text-emerald-600"
                                    : status === 'PENDING'
                                      ? "bg-amber-50 text-amber-600"
                                      : status === 'REVERSED'
                                        ? "bg-violet-50 text-violet-600"
                                        : "bg-rose-50 text-rose-600"
                                )}>{status}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkTransactionFailed(transaction)}
                                    disabled={status !== 'COMPLETED' || failingTransactionReference === transaction.reference || reversingTransactionReference === transaction.reference}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {failingTransactionReference === transaction.reference ? 'Updating…' : 'Mark failed'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReverseTransaction(transaction)}
                                    disabled={status !== 'COMPLETED' || reversingTransactionReference === transaction.reference || failingTransactionReference === transaction.reference}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    {reversingTransactionReference === transaction.reference ? 'Reversing…' : 'Reverse'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Password Recovery</p>
                <h4 className="text-lg font-extrabold mt-0.5">
                  {resetPasswordUser.first_name || resetPasswordUser.firstName} {resetPasswordUser.last_name || resetPasswordUser.lastName}
                </h4>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetUserPassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Temporary Password</label>
                <input
                  type="text"
                  value={resetTemporaryPassword}
                  onChange={(e) => setResetTemporaryPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-semibold focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetForceChange}
                  onChange={(e) => setResetForceChange(e.target.checked)}
                  className="w-4 h-4 accent-[#003399]"
                />
                <span className="text-xs font-bold text-slate-600">Require password change at next login</span>
              </label>

              {resetPasswordResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white rounded-lg border border-emerald-100 text-sm font-bold text-slate-800 break-all">
                      {resetPasswordResult}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(resetPasswordResult)}
                      className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700"
                      title="Copy temporary password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 bg-[#003399] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                Reset User Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT EVIDENCE INSPECTION MODAL */}
      {inspectDeposit && (() => {
        const evidence = parseDepositEvidence(inspectDeposit.images_json);
        const methodName = inspectDeposit.method === 'GIFTCARD' ? 'Gift Card' : 'Bitcoin';
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Deposit Verification Dossier</p>
                  <h4 className="text-lg font-extrabold mt-0.5">{methodName} · {formatCurrency(Number(inspectDeposit.amount))}</h4>
                </div>
                <button onClick={() => setInspectDeposit(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid sm:grid-cols-2 gap-4">
                  <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Submitted by</span><span className="text-sm font-extrabold text-slate-800 mt-1 block">{inspectDeposit.first_name} {inspectDeposit.last_name}</span><span className="text-[10px] text-slate-500">{inspectDeposit.email} · {inspectDeposit.account_number}</span></div>
                  <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Deposit destination</span><span className="text-sm font-extrabold text-slate-800 mt-1 block">{inspectDeposit.target_account_kind === 'JOINT' ? `Joint account •••• ${String(inspectDeposit.target_account_number || '').slice(-4)}` : 'Personal account'}</span></div>
                  <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{inspectDeposit.method === 'GIFTCARD' ? 'Gift card type' : 'Receiving address'}</span><span className="text-xs font-bold text-slate-700 mt-1 block break-all">{inspectDeposit.card_name || inspectDeposit.bitcoin_address}</span></div>
                  <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current status</span><span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full mt-1 inline-block', inspectDeposit.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : inspectDeposit.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>{inspectDeposit.status}</span></div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submitted evidence</span><span className="text-[10px] font-bold text-slate-500">{evidence.length} image{evidence.length === 1 ? '' : 's'}</span></div>
                  {inspectDeposit.isLoadingEvidence ? (
                    <div className="h-40 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#003399]" />
                      <span className="text-xs font-bold">Loading evidence only when requested…</span>
                    </div>
                  ) : inspectDeposit.evidenceError ? (
                    <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold">{inspectDeposit.evidenceError}</div>
                  ) : evidence.length ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {evidence.map((image, index) => (
                        <a key={index} href={image.data} target="_blank" rel="noreferrer" className="group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img src={image.data} alt={image.name || `Deposit evidence ${index + 1}`} className="w-full h-56 object-contain group-hover:scale-[1.01] transition-transform" />
                          <div className="px-4 py-3 bg-white flex items-center justify-between"><span className="text-[10px] font-bold text-slate-600 truncate">{image.name || `Evidence ${index + 1}`}</span><span className="text-[9px] font-bold text-[#003399]">Open full size</span></div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="h-28 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 text-xs font-medium">No evidence uploaded</div>
                  )}
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                {inspectDeposit.status === 'PENDING' && !inspectDeposit.isLoadingEvidence && !inspectDeposit.evidenceError ? (
                  <>
                    <button onClick={async () => { await reviewDeposit(inspectDeposit.id, 'REJECTED'); setInspectDeposit(null); }} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold">Reject deposit</button>
                    <button onClick={async () => { await reviewDeposit(inspectDeposit.id, 'APPROVED'); setInspectDeposit(null); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">Confirm & credit account</button>
                  </>
                ) : (
                  <button onClick={() => setInspectDeposit(null)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">Close review</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* KYC DOCUMENTS INSPECTION MODAL */}
      {inspectKycUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">KYC Verification Dossier</p>
                <h4 className="text-lg font-extrabold mt-0.5">{inspectKycUser.first_name} {inspectKycUser.last_name}</h4>
              </div>
              <button
                onClick={() => setInspectKycUser(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              {inspectKycUser.isLoadingKyc ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[#003399]" />
                  <p className="text-xs font-bold">Loading KYC documents...</p>
                </div>
              ) : inspectKycUser.kycError ? (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold">
                  {inspectKycUser.kycError}
                </div>
              ) : (
                <>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Government ID Number</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-1 block font-mono">
                    {inspectKycUser.government_id_number || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current Verification Status</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded mt-1.5 inline-block uppercase",
                    inspectKycUser.kyc_status === 'VERIFIED' ? "bg-emerald-50 text-emerald-600" : inspectKycUser.kyc_status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {inspectKycUser.kyc_status || 'NOT SUBMITTED'}
                  </span>
                </div>
              </div>

              {/* ID Front Image */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Government ID - Front Image</span>
                {inspectKycUser.id_front_image ? (
                  <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-64 shadow-inner">
                    <img
                      src={inspectKycUser.id_front_image}
                      alt="ID Front"
                      className="object-contain max-h-64 w-full"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    No Front Image Uploaded
                  </div>
                )}
              </div>

              {/* ID Back Image */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Government ID - Back Image</span>
                {inspectKycUser.id_back_image ? (
                  <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-64 shadow-inner">
                    <img
                      src={inspectKycUser.id_back_image}
                      alt="ID Back"
                      className="object-contain max-h-64 w-full"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    No Back Image Uploaded
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => {
                  handleUpdateKyc(inspectKycUser.id, 'REJECTED');
                  setInspectKycUser(null);
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Reject & Deny KYC
              </button>
              <button
                onClick={() => {
                  handleUpdateKyc(inspectKycUser.id, 'VERIFIED');
                  setInspectKycUser(null);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Verify & Approve KYC
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
