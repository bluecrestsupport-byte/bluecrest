const crypto = require('crypto');

const db = require('../database/db');
const transactionRepository = require('../repositories/transaction.repository');
const userRepository = require('../repositories/user.repository');
const notificationRepository = require('../repositories/notification.repository');

function generateReference(prefix = 'TXN') {
    return `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

function normalizeAmount(amount) {
    const parsed = Number(amount);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Amount must be greater than zero');
    }

    return parsed;
}

function formatMoney(amount, currency = 'USD') {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: String(currency || 'USD').toUpperCase()
        }).format(Number(amount));
    } catch (_error) {
        return `${currency || 'USD'} ${Number(amount).toFixed(2)}`;
    }
}

function formatTransactionDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return String(value || 'today');
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    }).format(date);
}

function buildReversalTransactionData(entry) {
    const originalType = String(entry.type || '').toUpperCase();
    const reversalType = originalType === 'CREDIT' ? 'DEBIT' : 'CREDIT';
    const baseDescription = String(entry.description || (originalType === 'CREDIT' ? 'Account Deposit' : 'Account Debit')).trim();

    return {
        user_id: entry.user_id,
        account_id: entry.account_id || null,
        reference: entry.reference ? `RVL-${String(entry.reference).replace(/^RVL-/, '')}` : generateReference('RVL'),
        type: reversalType,
        category: 'reversal',
        amount: Number(entry.amount),
        currency: entry.currency || 'USD',
        status: 'COMPLETED',
        description: `Reversal of ${baseDescription}`,
        created_by: entry.created_by || null,
        performed_by: entry.performed_by || entry.created_by || null,
        transaction_date: entry.transaction_date || null,
        origin_name: entry.origin_name || null,
        origin_bank: entry.origin_bank || null,
        origin_account_number: entry.origin_account_number || null
    };
}

async function createAccountActivityNotification({ userId, accountKind, entry, actorId }) {
    const credited = entry.type === 'CREDIT';
    const accountLabel = accountKind === 'JOINT' ? 'joint account' : 'account';
    const verb = credited ? 'credited' : 'debited';
    const amount = formatMoney(entry.amount, entry.currency);
    const date = formatTransactionDate(entry.transaction_date || entry.created_at);
    const description = String(entry.description || (credited ? 'Account Deposit' : 'Account Debit')).trim();
    const accountEnding = String(entry.origin_account_number || '').slice(-4);
    const source = [entry.origin_name, entry.origin_bank].filter(Boolean).join(' — ');
    const sourceDetails = source
        ? ` From: ${source}${accountEnding ? `, account ending ${accountEnding}` : ''}.`
        : '';
    return notificationRepository.createNotification({
        user_id: userId,
        title: accountKind === 'JOINT'
            ? `Joint account ${verb}`
            : `Account ${verb}`,
        message: `Your ${accountLabel} was ${verb} with ${amount} on ${date}.${sourceDetails} Description: ${description}.`,
        type: credited ? 'SUCCESS' : 'INFO',
        action_link: accountKind === 'JOINT' ? '/joint-accounts' : '/history',
        created_by: actorId || null
    });
}

async function applyBalanceMovement(entry) {
    const user = await userRepository.findUserById(entry.user_id);

    if (!user) {
        throw new Error('User not found');
    }

    const delta = entry.type === 'CREDIT'
        ? entry.amount
        : -entry.amount;

    if (entry.account_id) {
        const account = (await db.query(`SELECT * FROM accounts WHERE id = ?`, [entry.account_id]))[0];
        if (account?.account_kind === 'JOINT') {
            const owner = (await db.query(`SELECT id FROM account_owners WHERE account_id = ? AND user_id = ? AND status = 'ACCEPTED'`, [account.id, entry.user_id]))[0];
            if (!owner) throw new Error('Joint account access denied');
            if (entry.type === 'DEBIT' && Number(account.balance) < entry.amount) throw new Error('Insufficient available balance');
            await db.query(`UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [delta, account.id]);
            return (await db.query(`SELECT * FROM accounts WHERE id = ?`, [account.id]))[0];
        }
    }

    if (entry.type === 'DEBIT' && Number(user.balance) < entry.amount) {
        throw new Error('Insufficient available balance');
    }

    const updatedUser = await userRepository.incrementBalance(entry.user_id, delta);
    await db.query(`
        UPDATE accounts
        SET balance = (SELECT balance FROM users WHERE id = ?), updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
            SELECT ao.account_id FROM account_owners ao
            JOIN accounts a ON a.id = ao.account_id
            WHERE ao.user_id = ? AND ao.role = 'PRIMARY_OWNER'
              AND ao.status = 'ACCEPTED' AND a.account_kind = 'PRIMARY'
        )
    `, [entry.user_id, entry.user_id]);
    return updatedUser;
}

async function postEntry(data) {
    return await db.withTransaction(async () => {
        const amount = normalizeAmount(data.amount);
        const reference = data.reference || generateReference();
        const status = data.status || 'COMPLETED';
        const reservesBalance = status === 'PENDING' && data.reserve_balance === true;

        if (data.type !== 'CREDIT' && data.type !== 'DEBIT') {
            throw new Error('Invalid transaction type');
        }

        const existing = await transactionRepository.getTransactionByReference(reference);

        if (existing) {
            const balanceApplied = Number(existing.balance_applied || 0) === 1;
            if (existing.status === 'COMPLETED' && balanceApplied) {
                return existing;
            }

            if (status === 'COMPLETED') {
                if (existing.type !== data.type || Number(existing.amount) !== amount) {
                    throw new Error('Ledger reference conflict');
                }

                if (!balanceApplied) {
                    await applyBalanceMovement({ ...existing, amount });
                }

                return await transactionRepository.updateTransactionState(
                    reference,
                    'COMPLETED',
                    true
                );
            }

            if (reservesBalance && !balanceApplied) {
                await applyBalanceMovement({ ...existing, amount });
                return transactionRepository.updateTransactionState(reference, 'PENDING', true);
            }

            if (existing.status !== status) {
                return await transactionRepository.updateTransactionStatus(
                    reference,
                    status
                );
            }

            return existing;
        }

        const balanceApplied = status === 'COMPLETED' || reservesBalance;
        if (balanceApplied) {
            await applyBalanceMovement({
                user_id: data.user_id,
                type: data.type,
                amount,
                account_id: data.account_id || null
            });
        }

        const ownerAccount = data.account_id ? { account_id: data.account_id } : (await db.query(`
            SELECT ao.account_id FROM account_owners ao
            JOIN accounts a ON a.id = ao.account_id
            WHERE ao.user_id = ? AND ao.role = 'PRIMARY_OWNER' AND ao.status = 'ACCEPTED'
              AND a.account_kind = 'PRIMARY'
            ORDER BY ao.id ASC LIMIT 1
        `, [data.user_id]))[0];

        const created = await transactionRepository.createTransaction({
            user_id: data.user_id,
            reference,
            type: data.type,
            category: data.category || (data.type === 'CREDIT' ? 'deposit' : 'account_debit'),
            amount,
            currency: data.currency,
            status,
            description: data.description || (data.type === 'CREDIT' ? 'Account Deposit' : 'Account Debit'),
            created_by: data.created_by,
            transaction_date: data.transaction_date || null,
            account_id: ownerAccount?.account_id || null,
            performed_by: data.performed_by || data.created_by || data.user_id
            ,origin_name: data.origin_name || null
            ,origin_bank: data.origin_bank || null
            ,origin_account_number: data.origin_account_number || null
            ,balance_applied: balanceApplied
        });

        if (status === 'COMPLETED') {
            const account = ownerAccount?.account_id
                ? (await db.query(`SELECT account_kind FROM accounts WHERE id = ?`, [ownerAccount.account_id]))[0]
                : null;
            const accountKind = account?.account_kind === 'JOINT' ? 'JOINT' : 'PRIMARY';
            if (ownerAccount?.account_id && accountKind !== 'JOINT') {
                await db.query(`UPDATE accounts SET balance = (SELECT balance FROM users WHERE id = ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [data.user_id, ownerAccount.account_id]);
            }
            const performerId = data.performed_by || data.created_by || data.user_id;
            if (accountKind === 'JOINT') {
                const owners = await db.query(`
                    SELECT ao.user_id FROM account_owners ao
                    WHERE ao.account_id = ? AND ao.status = 'ACCEPTED' AND ao.user_id != ?
                `, [ownerAccount.account_id, performerId]);
                for (const owner of owners) {
                    await createAccountActivityNotification({
                        userId: owner.user_id,
                        accountKind: 'JOINT',
                        entry: created,
                        actorId: performerId
                    });
                }
            } else if (Number(performerId) !== Number(data.user_id)) {
                await createAccountActivityNotification({
                    userId: data.user_id,
                    accountKind: 'PRIMARY',
                    entry: created,
                    actorId: performerId
                });
            }
        }

        return created;
    });
}

async function markEntryStatus(reference, status) {
    return await db.withTransaction(async () => {
        const existing = await transactionRepository.getTransactionByReference(reference);
        const normalizedStatus = String(status || '').toUpperCase();

        if (!existing) {
            return null;
        }

        const balanceApplied = Number(existing.balance_applied || 0) === 1;
        const existingStatus = String(existing.status || '').toUpperCase();
        if (existingStatus === normalizedStatus || existingStatus === 'REVERSED') {
            return existing;
        }

        if (normalizedStatus === 'COMPLETED' && !balanceApplied) {
            await applyBalanceMovement(existing);
            return transactionRepository.updateTransactionState(reference, normalizedStatus, true);
        }

        if (balanceApplied && ['FAILED', 'DECLINED', 'REJECTED'].includes(normalizedStatus)) {
            await applyBalanceMovement({
                ...existing,
                type: existing.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
                amount: Number(existing.amount)
            });
            return transactionRepository.updateTransactionState(reference, normalizedStatus, false);
        }

        return await transactionRepository.updateTransactionStatus(reference, normalizedStatus);
    });
}

async function reverseEntry(originalEntry, actorId) {
    if (!originalEntry) {
        throw new Error('Transaction not found');
    }

    const status = String(originalEntry.status || '').toUpperCase();
    if (status !== 'COMPLETED') {
        throw new Error('Only completed transactions can be reversed');
    }

    const reversal = await db.withTransaction(async () => {
        const reversalData = buildReversalTransactionData({
            ...originalEntry,
            created_by: actorId || originalEntry.created_by || null,
            performed_by: actorId || originalEntry.performed_by || null
        });

        const created = await postEntry(reversalData);
        await transactionRepository.updateTransactionStatus(originalEntry.reference, 'REVERSED');
        return created;
    });

    const user = await userRepository.findUserById(originalEntry.user_id);
    if (user) {
        await notificationRepository.createNotification({
            user_id: originalEntry.user_id,
            title: 'Transaction reversed',
            message: `Your transaction of ${formatMoney(originalEntry.amount, originalEntry.currency)} has been reversed. Please contact your bank if you need further assistance.`,
            type: 'WARNING',
            action_link: '/history',
            created_by: actorId || null
        });
    }

    return {
        original: {
            ...originalEntry,
            status: 'REVERSED'
        },
        reversal
    };
}

async function reverseEntryByReference(reference, actorId) {
    const originalEntry = await transactionRepository.getTransactionByReference(reference);
    if (!originalEntry) return null;
    if (String(originalEntry.status || '').toUpperCase() === 'REVERSED') return originalEntry;
    return reverseEntry(originalEntry, actorId);
}

async function adjustBalanceTo(userId, targetBalance, metadata = {}) {
    return await db.withTransaction(async () => {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const target = Number(targetBalance);

        if (!Number.isFinite(target) || target < 0) {
            throw new Error('Balance must be a non-negative number');
        }

        const current = Number(user.balance || 0);
        const delta = target - current;

        if (delta === 0) {
            return {
                user,
                transaction: null
            };
        }

        const type = delta > 0 ? 'CREDIT' : 'DEBIT';
        const amount = Math.abs(delta);

        const transaction = await postEntry({
            user_id: user.id,
            reference: metadata.reference || generateReference('ADJ'),
            type,
            category: metadata.category || 'balance_adjustment',
            amount,
            currency: user.preferred_currency,
            status: 'COMPLETED',
            description: metadata.description || `Balance adjusted to ${target}`,
            created_by: metadata.created_by
        });

        return {
            user: await userRepository.findUserById(user.id),
            transaction
        };
    });
}

module.exports = {
    postEntry,
    markEntryStatus,
    reverseEntry,
    reverseEntryByReference,
    adjustBalanceTo,
    generateReference,
    buildReversalTransactionData
};
