const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/env');
const routes = require('./routes');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimit');

function createApp() {
  const app = express();

  // Behind a proxy/load balancer, trust the first hop so rate limiting and
  // secure-cookie detection see the real client IP and protocol.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers ---
  app.use(
    helmet({
      // Profile photos are served cross-origin from the API in development.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: config.isProduction ? undefined : false,
    })
  );

  // --- CORS: only the configured web client, with credentials for the cookie ---
  const allowedOrigins = config.clientUrl.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests (no Origin header) and the
        // configured client origins.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // --- Body & cookie parsing (bounded so oversized payloads are rejected) ---
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  // --- NoSQL injection hardening: strip $-prefixed / dotted keys ---
  app.use(mongoSanitize());

  app.use(compression());
  if (!config.isTest) {
    app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  }

  // --- Static profile photos ---
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d', index: false }));

  app.use(globalLimiter);

  // Resolve the caller (if any) before routes so public endpoints can still
  // personalise (e.g. mark a donor card as "you").
  app.use(attachUser);

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
