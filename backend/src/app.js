import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes       from './modules/auth/auth.routes.js';
import usersRoutes      from './modules/users/users.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import productsRoutes   from './modules/products/products.routes.js';
import ordersRoutes     from './modules/orders/orders.routes.js';
import agentsRoutes     from './modules/agents/agents.routes.js';
import whatsappRoutes   from './modules/whatsapp/whatsapp.routes.js';
import formsRoutes      from './modules/forms/forms.routes.js';
import settingsRoutes   from './modules/settings/settings.routes.js';

const app = express();

// Trust nginx reverse proxy (needed for rate-limiter + real IPs behind EasyPanel)
app.set('trust proxy', 1);

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',               authRoutes);
app.use('/api/users',              usersRoutes);
app.use('/api/product-categories', categoriesRoutes);
app.use('/api/products',           productsRoutes);
app.use('/api/orders',             ordersRoutes);
app.use('/api/agents',             agentsRoutes);
app.use('/api/whatsapp',           whatsappRoutes);
app.use('/api/forms',              formsRoutes);
app.use('/api/settings',           settingsRoutes);

// Health check — update BUILD to verify deploys are live
const BUILD = '2026-03-09-v3';
app.get('/health', (_req, res) => res.json({ ok: true, build: BUILD, ts: new Date().toISOString() }));

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
