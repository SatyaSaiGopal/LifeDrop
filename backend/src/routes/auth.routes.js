const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateBody } = require('../validators/validate');
const { registerSchema, loginSchema } = require('../validators/schemas');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
