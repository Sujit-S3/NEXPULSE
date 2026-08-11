import { Router } from 'express';
import { v1Routes } from './v1/index.js';
import { openApiDocument } from '../modules/developer/openapi.js';

const router = Router();

router.get('/openapi.json', (_req, res) => res.status(200).json(openApiDocument()));
router.use('/v1', v1Routes);

export { router as apiRoutes };
