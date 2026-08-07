const {
    requireAdmin
} = require('../middleware/admin.middleware');

const {
    requireAuth
} = require('../middleware/auth.middleware');

const userController =
    require('../controllers/user.controller');

async function userRoutes(req, res, body) {

    // ADMIN-ONLY LOST ACCOUNT RECONSTRUCTION
    if (req.method === 'POST' && req.url === '/api/v1/admin/users/recover') {
        const adminAuthorized = await requireAdmin(req, res);
        if (!adminAuthorized) return true;
        return userController.recoverUser(req, res, body);
    }

    // REGISTER
    if (
        req.method === 'POST' &&
        req.url === '/api/v1/users/register'
    ) {
        return userController.register(
            req,
            res,
            body
        );
    }

    // LOOKUP USER BY ACCOUNT NUMBER
    if (
        req.method === 'GET' &&
        req.url.startsWith('/api/v1/users/lookup')
    ) {
        const authenticated = await requireAuth(req, res);
        if (!authenticated) {
            return true;
        }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const accountNumber = urlObj.searchParams.get('account_number');

        return userController.lookupUser(
            req,
            res,
            accountNumber
        );
    }

    // GET USERS
    if (
        req.method === 'GET' &&
        req.url === '/api/v1/users'
    ) {

        const authenticated =
            await requireAdmin(req, res);

        if (!authenticated) {
            return true;
        }

        return userController.getUsers(
            req,
            res
        );
    }

    // CREATE / UPDATE TRANSFER PIN
    if (
        req.method === 'POST' &&
        req.url === '/api/v1/users/transfer-pin'
    ) {

        const authenticated =
            await requireAuth(req, res);

        if (!authenticated) {
            return true;
        }

        return userController.setTransferPin(
            req,
            res,
            body
        );
    }



    //kyc Update status

    if (
        req.method === 'GET' &&
        /^\/api\/v1\/users\/\d+\/kyc$/.test(req.url)
    ) {
        const adminAuthorized =
            await requireAdmin(req, res);

        if (!adminAuthorized) {
            return true;
        }

        const userId = req.url.split('/')[4];

        return userController.getUserKyc(
            req,
            res,
            userId
        );
    }


    if (
        req.method === 'POST' &&
        req.url === '/api/v1/users/kyc'
    ) {

        const authenticated =
            await requireAuth(req, res);

        if (!authenticated) {
            return true;
        }

        return userController
            .submitKyc(
                req,
                res,
                body
            );
    }


    if (
        req.method === 'PATCH' &&
        req.url.startsWith(
            '/api/v1/users/kyc/'
        )
    ) {

        const adminAuthorized =
            await requireAdmin(
                req,
                res
            );

        if (!adminAuthorized) {
            return true;
        }

        const userId =
            req.url.split('/').pop();

        return userController
            .updateKycStatus(
                req,
                res,
                body,
                userId
            );
    }




    // UPDATE BALANCE
    if (
        req.method === 'PATCH' &&
        req.url.startsWith('/api/v1/users/')
    ) {

        const adminAuthorized =
            await requireAdmin(req, res);

        if (!adminAuthorized) {
            return true;
        }

        const userId = req.url.split('/').pop();

        return userController.updateBalance(
            req,
            res,
            body,
            userId
        );
    }

    // UPDATE LOGGED-IN USER PROFILE (Self-care)
    if (
        req.method === 'PUT' &&
        req.url === '/api/v1/profile'
    ) {
        const authenticated = await requireAuth(req, res);
        if (!authenticated) {
            return true;
        }
        return userController.updateUserProfile(
            req,
            res,
            body,
            req.user.id
        );
    }

    // UPDATE USER PROFILE
    if (
        req.method === 'PUT' &&
        req.url.startsWith('/api/v1/users/')
    ) {
        const adminAuthorized = await requireAdmin(req, res);
        if (!adminAuthorized) {
            return true;
        }
        const userId = req.url.split('/').pop();
        return userController.updateUserProfile(
            req,
            res,
            body,
            userId
        );
    }

    // DELETE USER
    if (
        req.method === 'DELETE' &&
        req.url.startsWith('/api/v1/users/')
    ) {
        const adminAuthorized = await requireAdmin(req, res);
        if (!adminAuthorized) {
            return true;
        }
        const userId = req.url.split('/').pop();
        return userController.deleteUser(
            req,
            res,
            userId
        );
    }

    return false;
}

module.exports = userRoutes;
