const {
    requireAdmin
} = require('../middleware/admin.middleware');

const transferController =
    require('../controllers/transfer.controller');

const {
    requireAuth
} = require('../middleware/auth.middleware');

async function transferRoutes(req, res, body) {

    if (req.method === 'POST' && req.url === '/api/v1/admin/transfers/recover') {
        const adminAuthorized = await requireAdmin(req, res);
        if (!adminAuthorized) return true;
        return transferController.recover(req, res, body);
    }

    if (
        req.method === 'POST' &&
        req.url === '/api/v1/transfers'
    ) {

        const authenticated =
            await requireAuth(req, res);

        if (!authenticated) {
            return true;
        }

        return transferController
            .create(req, res, body);
    }

    if (
        req.method === 'GET' &&
        req.url === '/api/v1/transfers'
    ) {

        const authenticated =
            await requireAuth(req, res);

        if (!authenticated) {
            return true;
        }

        return transferController
            .getAll(req, res);
    }

    if (
        req.method === 'GET' &&
        req.url.includes('/receipt')
    ) {

        const authenticated =
            await requireAuth(req, res);

        if (!authenticated) {
            return true;
        }

        const transferId =
            req.url
                .split('/')
                .slice(-2)[0];

        return transferController
            .receipt(
                req,
                res,
                transferId
            );
    }


    if (
        req.method === 'PATCH' &&
        req.url.startsWith('/api/v1/transfers/')
    ) {

        const adminAuthorized =
            await requireAdmin(req, res);

        if (!adminAuthorized) {
            return true;
        }

        const transferId =
            req.url.split('/').pop();

        return transferController
            .updateStatus(
                req,
                res,
                body,
                transferId
            );
    }

    return false;
}

module.exports = transferRoutes;
