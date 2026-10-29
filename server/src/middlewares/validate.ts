import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body, req.params or req.query against a zod schema.
 *
 * - body: replaced with the parsed (trimmed, lowercased, unknown-keys-stripped) data.
 * - query: Express 5 makes req.query read-only, so the parsed data is put on res.locals.query.
 * - params: validated only; read them from req.params as before.
 */
export function validate(source: 'body' | 'params' | 'query', schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (source === 'body') req.body = result.data;
    if (source === 'query') res.locals.query = result.data;
    next();
  };
}
