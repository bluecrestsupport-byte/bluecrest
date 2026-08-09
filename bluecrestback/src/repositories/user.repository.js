const db = require('../database/db');

async function createUser(userData) {

    const normalizedEmail = String(userData.email || '').trim().toLowerCase();

    await db.query(
        `
        INSERT INTO users (
            account_number,

            first_name,
            last_name,
            username,

            email,
            phone,
            password,
            login_code_hash,

            email_verified,

            gender,
            date_of_birth,

            country,
            state,
            zip_code,

            marital_status,

            occupation,
            address,

            government_id_number,

            profile_image,

            preferred_currency,
            account_type,

            balance,

            transfer_pin,
            transfer_flow,
            status,

            role
        )
        VALUES (
           ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
        `,
        [
            userData.account_number,

            userData.first_name,
            userData.last_name,
            userData.username,

            normalizedEmail,
            userData.phone,

            userData.password,

            userData.login_code_hash,

            userData.email_verified,

            userData.gender,
            userData.date_of_birth,

            userData.country,
            userData.state,
            userData.zip_code,

            userData.marital_status,

            userData.occupation,
            userData.address,

            userData.government_id_number,

            userData.profile_image,

            userData.preferred_currency,

            userData.account_type,

            userData.balance,

            userData.transfer_pin,

            userData.transfer_flow || 'PENDING',

            userData.status,

            userData.role
        ]
    );

    return findUserByEmail(
        normalizedEmail
    );
}

async function findUserByEmail(email) {

    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
        return undefined;
    }

    let users = await db.query(
        `
        SELECT * FROM users
        WHERE email = ?
        `,
        [normalizedEmail]
    );

    if (!users[0]) {
        // Compatibility for accounts created before email normalization was
        // enforced. New records still use the indexed exact-match path above.
        users = await db.query(
            `
            SELECT * FROM users
            WHERE LOWER(TRIM(email)) = ?
            ORDER BY id ASC
            LIMIT 1
            `,
            [normalizedEmail]
        );
    }

    return users[0];
}

async function findUserById(id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) return null;

    const users = await db.query(
        `
        SELECT * FROM users
        WHERE id = ?
        `,
        [parsedId]
    );

    return users[0];
}

async function getAllUsers() {

    return await db.query(
        `
        SELECT
            id,
            account_number,
            first_name,
            last_name,
            username,
            email,
            phone,
            email_verified,
            gender,
            date_of_birth,
            country,
            state,
            zip_code,
            marital_status,
            occupation,
            address,
            government_id_number,
            kyc_status,
            preferred_currency,
            account_type,
            balance,
            savings_balance,
            transfer_pin,
            transfer_flow,
            transfer_hold_message,
            clearance_fee_amount,
            two_factor_enabled,
            status,
            role,
            created_at,
            force_password_change,
            password_changed_at,
            CASE
                WHEN id_front_image IS NOT NULL AND id_front_image != '' THEN 1
                ELSE 0
            END AS id_front_image_present,
            CASE
                WHEN id_back_image IS NOT NULL AND id_back_image != '' THEN 1
                ELSE 0
            END AS id_back_image_present,
            CASE
                WHEN profile_image IS NOT NULL AND profile_image != '' THEN 1
                ELSE 0
            END AS profile_image_present
        FROM users
        ORDER BY id DESC
        `
    );
}

async function getUserKyc(userId) {
    const parsedId = parseInt(userId, 10);
    if (isNaN(parsedId)) return null;

    const users = await db.query(
        `
        SELECT
            id,
            first_name,
            last_name,
            email,
            government_id_number,
            kyc_status,
            id_front_image,
            id_back_image
        FROM users
        WHERE id = ?
        `,
        [parsedId]
    );

    return users[0];
}

async function updateUserBalance(
    userId,
    balance
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET balance = ?
        WHERE id = ?
        `,
        [balance, parsedId]
    );

    const users = await db.query(
        `
        SELECT *
        FROM users
        WHERE id = ?
        `,
        [parsedId]
    );

    return users[0];
}

async function incrementBalance(
    userId,
    amount
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET balance = balance + ?
        WHERE id = ?
        `,
        [amount, parsedId]
    );

    return await findUserById(
        parsedId
    );
}



async function updateUser(
    userId,
    data
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET
            first_name = ?,
            last_name = ?,
            username = ?,
            email = ?,
            phone = ?,
            gender = ?,
            date_of_birth = ?,
            country = ?,
            state = ?,
            zip_code = ?,
            marital_status = ?,
            occupation = ?,
            address = ?,
            government_id_number = ?,
            preferred_currency = ?,
            preferred_language = ?,
            balance = ?,
            savings_balance = ?,
            status = ?,
            profile_image = ?,
            two_factor_enabled = ?
        WHERE id = ?
        `,
        [
            data.first_name,
            data.last_name,
            data.username,
            data.email,
            data.phone,
            data.gender,
            data.date_of_birth,
            data.country,
            data.state,
            data.zip_code,
            data.marital_status,
            data.occupation,
            data.address,
            data.government_id_number,
            data.preferred_currency,
            data.preferred_language,
            data.balance,
            data.savings_balance,
            data.status,
            data.profile_image !== undefined ? data.profile_image : null,
            data.two_factor_enabled !== undefined ? (data.two_factor_enabled ? 1 : 0) : 0,
            parsedId
        ]
    );

    const users = await db.query(
        `
        SELECT *
        FROM users
        WHERE id = ?
        `,
        [parsedId]
    );

    return users[0];
}

async function updateUserPassword(
    userId,
    hashedPassword,
    forcePasswordChange = false
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET password = ?, force_password_change = ?, password_changed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [hashedPassword, forcePasswordChange ? 1 : 0, parsedId]
    );
}

async function setForcePasswordChange(userId, value) {
    await db.query(
        `UPDATE users SET force_password_change = ? WHERE id = ?`,
        [value ? 1 : 0, parseInt(userId, 10)]
    );
    return findUserById(userId);
}

async function updateTransferPin(
    userId,
    hashedPin
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET transfer_pin = ?
        WHERE id = ?
        `,
        [
            hashedPin,
            parsedId
        ]
    );

    const users =
        await db.query(
            `
            SELECT *
            FROM users
            WHERE id = ?
            `,
            [parsedId]
        );

    return users[0];
}

async function submitKyc(
    userId,
    data
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET
            government_id_number = ?,
            id_front_image = ?,
            id_back_image = ?,
            kyc_status = 'PENDING'
        WHERE id = ?
        `,
        [
            data.government_id_number,
            data.id_front_image,
            data.id_back_image,
            parsedId
        ]
    );

    return await findUserById(
        parsedId
    );
}

async function updateKycStatus(
    userId,
    status
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET
            kyc_status = ?
        WHERE id = ?
        `,
        [
            status,
            parsedId
        ]
    );

    return await findUserById(
        parsedId
    );
}



async function findUserByAccountNumber(
    accountNumber
) {

    const users =
        await db.query(
            `
            SELECT *
            FROM users
            WHERE account_number = ?
            `,
            [accountNumber]
        );

    return users[0];
}

async function updateTransferFlow(
    userId,
    transferFlow
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET transfer_flow = ?
        WHERE id = ?
        `,
        [
            transferFlow,
            parsedId
        ]
    );

    const users =
        await db.query(
            `
            SELECT *
            FROM users
            WHERE id = ?
            `,
            [parsedId]
        );

    return users[0];
}

async function updateTransferHoldMessage(userId, message) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `UPDATE users SET transfer_hold_message = ? WHERE id = ?`,
        [message || null, parsedId]
    );

    const users = await db.query(
        `SELECT * FROM users WHERE id = ?`,
        [parsedId]
    );

    return users[0];
}

async function updateClearanceFeeAmount(userId, amount) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `UPDATE users SET clearance_fee_amount = ? WHERE id = ?`,
        [amount, parsedId]
    );
    return findUserById(parsedId);
}

async function updateUserRole(
    userId,
    role
) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `
        UPDATE users
        SET role = ?
        WHERE id = ?
        `,
        [role, parsedId]
    );

    const users = await db.query(
        `
        SELECT *
        FROM users
        WHERE id = ?
        `,
        [parsedId]
    );

    return users[0];
}



async function deleteUser(userId) {
    const parsedId = parseInt(userId, 10);
    await db.query(
        `DELETE FROM users WHERE id = ?`,
        [parsedId]
    );
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    getUserKyc,
    getAllUsers,
    updateUserBalance,
    updateUser,
    updateTransferPin,
    updateUserPassword,
    setForcePasswordChange,
    findUserByAccountNumber,
    updateTransferFlow,
    updateTransferHoldMessage,
    updateClearanceFeeAmount,
    incrementBalance,
    submitKyc,
    updateKycStatus,
    deleteUser
};
