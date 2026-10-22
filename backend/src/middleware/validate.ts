import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body or req.params against a zod schema.
 * On success the body is replaced with the parsed (trimmed, lowercased, unknown-keys-stripped) data.
 */
export function validate(source: 'body' | 'params', schema: ZodType): RequestHandler {
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
    next();
  };
}
