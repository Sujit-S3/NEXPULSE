import express, { type Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { requestId } from './middleware/requestId.js';
import { morganMiddleware } from './middleware/morgan.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRoutes } from './routes/index.js';
import { config } from './config/env.js';
import { apiGatewayIngress } from './modules/developer/usageService.js';
import { recordRequestMetrics, renderMetrics } from './operations/metrics.js';
import { getRuntimeReadiness } from './operations/readiness.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  // Client (Vercel) and server (Render) are deployed on different sites by design;
  // access control is enforced by the explicit CORS origin allowlist below, not CORP.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    const request = req as Request;
    if (request.originalUrl.startsWith('/api/v1/billing/webhook')) {
      request.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookie.secret));
app.use(requestId);
app.use(recordRequestMetrics);
app.use(morganMiddleware);
if (config.operations.metricsEnabled) {
  app.get('/api/v1/metrics', apiLimiter, (_req, res) => {
    res
      .status(200)
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(renderMetrics(getRuntimeReadiness()));
  });
}
app.use('/api/v1', apiGatewayIngress);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/health', apiLimiter);
app.use('/api/v1/ready', apiLimiter);

if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}
app.use('/api', apiRoutes);
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }

  const clientUrl = config.app.clientUrl.replace(/\/$/, '');
  const clientPath = req.originalUrl === '/' ? '' : req.originalUrl;
  res.redirect(307, `${clientUrl}${clientPath}`);
});
app.use(notFound);
app.use(errorHandler);

export { app };
