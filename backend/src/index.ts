import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { SESSION_COOKIE_NAME, config, cookieOptions } from './config';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import uploadsRouter from './routes/sign-upload';

async function main() {
  await mongoose.connect(config.mongoUri);

  const app = express();

  // Render terminates TLS in front of the app; without this, `secure` cookies are never set.
  if (config.isProd) app.set('trust proxy', 1);

  // Middleware to parse JSON
  app.use(express.json());

  // Sessions are stored in MongoDB (the default MemoryStore leaks memory and loses
  // every session on each restart/deploy).
  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false, // no cookie is issued until we actually put something in the session
      store: MongoStore.create({
        mongoUrl: config.mongoUri,
        ttl: config.sessionMaxAgeMs / 1000,
      }),
      cookie: { ...cookieOptions, maxAge: config.sessionMaxAgeMs },
    }),
  );

  // Basic Route
  app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello, TypeScript + Express!' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', uploadsRouter);

  // Express 5 forwards rejected promises from async handlers here.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500;

    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : 'Bad request' });
  });

  // Start Server
  app.listen(config.port, () => {
    console.log(`Server is running at http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
