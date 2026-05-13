import logger from '../lib/logger.js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Normalised error shape sent to every client:
 *   { success: false, error: { code, message, details? } }
 *
 * In production, stack traces and raw error messages are NEVER exposed.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Determine HTTP status
  const status = err.status ?? err.statusCode ?? 500;

  // Semantic error code (callers can set err.code)
  const code = err.code ?? (status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR');

  // Safe message — never expose internals to the client in production
  const clientMessage = (isProd && status >= 500)
    ? 'Ha ocurrido un error en el servidor. Intenta de nuevo.'
    : (err.message ?? 'Error desconocido');

  // Validation details (e.g. from zod)
  const details = err.details ?? undefined;

  // Log: 5xx = error level, 4xx = warn level
  const logFn = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  logFn(`${req.method} ${req.path} → ${status}`, {
    code,
    message: err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });

  return res.status(status).json({
    success: false,
    error: {
      code,
      message: clientMessage,
      ...(details ? { details } : {}),
    },
  });
};

/** 404 handler — mount BEFORE errorHandler, AFTER all routes */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta no encontrada: ${req.method} ${req.path}`,
    },
  });
};

/**
 * Helper to create structured operational errors.
 * Usage: throw createError(400, 'VALIDATION_ERROR', 'Título requerido', details)
 */
export const createError = (status, code, message, details) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
};
