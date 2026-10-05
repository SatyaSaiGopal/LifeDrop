const express = require('express');
const requestController = require('../controllers/request.controller');
const { validateBody, validateQuery } = require('../validators/validate');
const { createRequestSchema, updateRequestSchema, requestListQuerySchema, respondSchema } = require('../validators/schemas');
const { requireAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', requireAuth, writeLimiter, validateBody(createRequestSchema), requestController.create);
router.get('/', validateQuery(requestListQuerySchema), requestController.list);
router.get('/:id', requestController.getOne);
router.get('/:id/matches', requireAuth, requestController.matches);
router.patch('/:id', requireAuth, writeLimiter, validateBody(updateRequestSchema), requestController.update);
router.post('/:id/respond', requireAuth, writeLimiter, validateBody(respondSchema), requestController.respond);
router.post('/:id/accept', requireAuth, writeLimiter, requestController.accept);
router.post('/:id/decline', requireAuth, writeLimiter, requestController.decline);
router.post('/:id/cancel', requireAuth, writeLimiter, requestController.cancel);
router.post('/:id/fulfill', requireAuth, writeLimiter, requestController.fulfill);

module.exports = router;
