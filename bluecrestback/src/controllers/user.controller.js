const activityService =
    require('../services/activity.service');

const {
    validateRegisterInput
} = require('../validation/user.validation');

const userService =
    require('../services/user.service');
const userRepository = require('../repositories/user.repository');
const authService = require('../services/auth.service');
const db = require('../database/db');

const {
    successResponse,
    errorResponse
} = require('../utils/response');

async function register(req, res, body) {

    try {

        const validation =
            validateRegisterInput(body);

        if (!validation.valid) {

            return errorResponse(
                res,
                validation.errors.join(', '),
                400
            );
        }

        const normalizedEmail = String(body.email || '').trim().toLowerCase();
        const pendingUser = await userRepository.findUserByEmail(normalizedEmail);
        if (pendingUser?.status === 'PENDING_EMAIL') {
            const verification = await authService.createRegistrationEmailVerification(pendingUser.id);
            delete pendingUser.password;
            delete pendingUser.login_code_hash;
            delete pendingUser.transfer_pin;
            pendingUser.registration_email_challenge_token = verification.challenge_token;
            pendingUser.masked_email = verification.masked_email;
            pendingUser.email_verification_expires_at = verification.expires_at;
            if (verification.development_code) pendingUser.development_code = verification.development_code;
            return successResponse(res, pendingUser, 'Email confirmation restarted');
        }

        const user = await userService.registerUser(body);

        await db.query(`UPDATE users SET status = 'PENDING_EMAIL' WHERE id = ?`, [user.id]);
        user.status = 'PENDING_EMAIL';
        const verification = await authService.createRegistrationEmailVerification(user.id);
        user.registration_email_challenge_token = verification.challenge_token;
        user.masked_email = verification.masked_email;
        user.email_verification_expires_at = verification.expires_at;
        if (verification.development_code) user.development_code = verification.development_code;

        await activityService.logActivity({
            user_id: user.id,
            type: 'USER_REGISTERED',
            description:
                `${user.first_name} ${user.last_name} registered`
        });

        return successResponse(
            res,
            user,
            'User registered successfully',
            201
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message,
            400
        );
    }
}

async function getUsers(req, res) {

    try {

        const users =
            await userService.fetchUsers();

        return successResponse(
            res,
            users,
            'Users fetched successfully'
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );
    }
}

async function recoverUser(req, res, body) {
    try {
        const validation = validateRegisterInput(body);
        if (!validation.valid) {
            return errorResponse(res, validation.errors.join(', '), 400);
        }

        const requiredRecoveryFields = [
            ['address', 'Address'],
            ['country', 'Country'],
            ['state', 'State'],
            ['zip_code', 'ZIP/postal code'],
            ['date_of_birth', 'Date of birth']
        ];
        const missing = requiredRecoveryFields
            .filter(([field]) => !String(body[field] || '').trim())
            .map(([, label]) => label);
        if (missing.length) {
            return errorResponse(res, `${missing.join(', ')} required for account recovery`, 400);
        }

        const user = await userService.registerRecoveredUser(body, req.user.id);
        await activityService.logActivity({
            user_id: user.id,
            type: 'USER_ACCOUNT_RECOVERED',
            description: `Customer account reconstructed by administrator ${req.user.id}; email confirmation required on first login`
        });

        return successResponse(
            res,
            user,
            'Customer account recovered. Email ownership will be confirmed during first login.',
            201
        );
    } catch (error) {
        return errorResponse(res, error.message, 400);
    }
}

async function getUserKyc(req, res, userId) {
    try {
        const user = await userService.fetchUserKyc(userId);

        return successResponse(
            res,
            user,
            'User KYC documents fetched successfully'
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message,
            error.message === 'User not found' ? 404 : 500
        );
    }
}

async function updateBalance(
    req,
    res,
    body,
    userId
) {

    try {

        const updatedUser =
            await userService
                .changeUserBalance(
                    userId,
                    body.balance
                );

        await activityService.logActivity({
            user_id: userId,
            type: 'BALANCE_UPDATED',
            description:
                `Balance updated to ${body.balance}`
        });

        return successResponse(
            res,
            updatedUser,
            'Balance updated successfully'
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );
    }
}

async function setTransferPin(
    req,
    res,
    body
) {

    try {

        const user =
            await userService
                .setTransferPin(
                    req.user.id,
                    body.pin
                );

        await activityService
            .logActivity({
                user_id: req.user.id,
                type: 'TRANSFER_PIN_SET',
                description:
                    'Transfer PIN created'
            });

        return successResponse(
            res,
            user,
            'Transfer PIN set successfully'
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message,
            400
        );
    }
}

async function submitKyc(
    req,
    res,
    body
) {

    try {

        const user =
            await userService
                .submitKyc(
                    req.user.id,
                    body
                );

        return successResponse(
            res,
            user,
            'KYC submitted successfully'
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message,
            500
        );
    }
}

async function updateKycStatus(
    req,
    res,
    body,
    userId
) {

    try {

        const user =
            await userService
                .updateKycStatus(
                    userId,
                    body.status
                );

        return successResponse(
            res,
            user,
            'KYC status updated successfully'
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message,
            500
        );
    }
}

async function updateUserProfile(req, res, body, userId) {
    try {
        const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'Admin');
        if (!isAdmin) {
            delete body.balance;
            delete body.savings_balance;
            delete body.role;
            delete body.status;
            delete body.transfer_flow;
            delete body.transfer_hold_message;
            delete body.transfer_pin;
        }
        const user = await userService.updateUser(userId, body);
        return successResponse(res, user, 'User profile updated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
}

async function deleteUser(req, res, userId) {
    try {
        await userService.deleteUser(userId);
        return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
}

async function lookupUser(req, res, accountNumber) {
    try {
        if (!accountNumber) {
            return errorResponse(res, 'Account number query parameter is required', 400);
        }
        const user = await userService.lookupUserByAccountNumber(accountNumber);
        if (!user) {
            return errorResponse(res, 'Recipient account not found', 404);
        }
        return successResponse(res, user, 'Recipient account found');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
}

module.exports = {
    register,
    recoverUser,
    getUsers,
    getUserKyc,
    updateBalance,
    setTransferPin,
    submitKyc,
    updateKycStatus,
    updateUserProfile,
    deleteUser,
    lookupUser
};
