const express = require('express');
const donorController = require('../controllers/donor.controller');
const { validateBody, validateQuery } = require('../validators/validate');
const { donorUpdateSchema, availabilitySchema, nearbyQuerySchema, donorListQuerySchema } = require('../validators/schemas');
const { requireAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// --- Static paths must precede the /:id param route ---
router.get('/nearby', validateQuery(nearbyQuerySchema), donorController.nearby);
router.get('/cities', donorController.cities);
router.get('/stats', donorController.stats);
router.get('/', validateQuery(donorListQuerySchema), donorController.list);

router.get('/:id', donorController.getOne);
router.get('/:id/contact', requireAuth, donorController.contact);
router.get('/:id/compatibility', donorController.compatibility);
router.patch('/:id', requireAuth, writeLimiter, validateBody(donorUpdateSchema), donorController.update);
router.patch('/:id/availability', requireAuth, writeLimiter, validateBody(availabilitySchema), donorController.updateAvailability);

module.exports = router;
