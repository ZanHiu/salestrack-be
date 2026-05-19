import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import authRouter from './routes/auth.route';
import customerRouter from './routes/customer.route';
import productRouter from './routes/product.route';
import salesEntryRouter from './routes/salesEntry.route';
import reportRouter from './routes/report.route';
import { requireAuth } from './middlewares/requireAuth';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
const corsOriginEnv = process.env.CORS_ORIGIN;
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.NODE_ENV === 'development'
      ? /^http:\/\/localhost:\d+$/
      : corsOriginEnv?.split(',') || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/customers', requireAuth, customerRouter);
app.use('/api/products', requireAuth, productRouter);
app.use('/api/sales-entries', requireAuth, salesEntryRouter);
app.use('/api/reports', requireAuth, reportRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

app.use(errorHandler);

async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✓ Server running at http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
