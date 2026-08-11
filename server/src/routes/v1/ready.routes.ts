import { Router } from 'express';
import { getRuntimeReadiness } from '../../operations/readiness.js';
import { apiResponse } from '../../utils/apiResponse.js';

const router = Router();

router.get('/', (_req, res) => {
  const readiness = getRuntimeReadiness();
  res.status(readiness.ready ? 200 : 503).json(apiResponse(readiness));
});

export { router as readyRoutes };
