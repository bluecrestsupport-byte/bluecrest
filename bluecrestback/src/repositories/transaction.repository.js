const db = require('../database/db');

async function createTransaction(data) {
    const insertSql = db.USE_POSTGRES
        ? `
        INSERT INTO transactions (
            user_id,
            reference,
            type,
            category,
            amount,
            currency,
            status,
            description,
            created_by,
            transaction_date,
            account_id,
            performed_by,
            origin_name,
            origin_bank,
            origin_account_number
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
        `
        : `
        INSERT INTO transactions (
            user_id,
            reference,
            type,
            category,
            amount,
            currency,
            status,
            description,
            created_by,
            transaction_date,
            account_id,
            performed_by,
            origin_name,
            origin_bank,
            origin_account_number
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const result = await db.query(
        insertSql,
        [
            data.user_id,
            data.reference,
            data.type,
            data.category,
            data.amount,
            data.currency || 'USD',
            data.status || 'COMPLETED',
            data.description || '',
            data.created_by || null,
            data.transaction_date || null,
            data.account_id || null,
            data.performed_by || data.created_by || data.user_id,
            data.origin_name || null,
            data.origin_bank || null,
            data.origin_account_number || null
        ]
    );

    if (db.USE_POSTGRES) {
        return result[0];
    }

    return getTransactionByReference(data.reference);
}

async function getTransactions() {

    return await db.query(`
        SELECT *
        FROM transactions
        ORDER BY id DESC
        LIMIT 500
    `);
}

async function getUserTransactions(
    userId
) {

    return await db.query(
        `
        SELECT t.*, account.account_kind,
               CASE WHEN account.account_kind = 'JOINT' THEN performer.first_name END AS performed_by_first_name,
               CASE WHEN account.account_kind = 'JOINT' THEN performer.last_name END AS performed_by_last_name
        FROM transactions t
        LEFT JOIN users performer ON performer.id = COALESCE(t.performed_by, t.created_by, t.user_id)
        LEFT JOIN accounts account ON account.id = t.account_id
        WHERE t.user_id = ? OR t.account_id IN (
            SELECT account_id FROM account_owners WHERE user_id = ? AND status = 'ACCEPTED'
        )
        ORDER BY t.id DESC
        LIMIT 500
        `,
        [userId, userId]
    );
}

async function updateTransactionStatus(
    reference,
    status
) {
    await db.query(
        `
        UPDATE transactions
        SET status = ?
        WHERE reference = ?
        `,
        [status, reference]
    );

    return getTransactionByReference(reference);
}

async function getTransactionByReference(reference) {
    const transactions = await db.query(
        `
        SELECT *
        FROM transactions
        WHERE reference = ?
        `,
        [reference]
    );

    return transactions[0];
}

module.exports = {
    createTransaction,
    getTransactions,
    getUserTransactions,
    updateTransactionStatus,
    getTransactionByReference
};
