import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toLocaleString("sv-SE");
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });

  next();
};
