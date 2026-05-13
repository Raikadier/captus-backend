import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware.
 * Usage: router.post('/path', validate(MySchema), handler)
 *
 * On failure → 400 with structured error details compatible with errorHandler.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (result.success) {
    req.body = result.data; // replace with coerced / stripped data
    return next();
  }

  const details = result.error.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));

  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      details,
    },
  });
};
