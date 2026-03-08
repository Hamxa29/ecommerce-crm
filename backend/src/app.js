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

const app = express();

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

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
