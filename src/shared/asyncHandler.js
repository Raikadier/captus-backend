/**
 * src/shared/asyncHandler.js
 *
 * Thin wrapper that ensures every controller handler emits a consistent
 * { success, message?, data? } JSON response regardless of whether the
 * service throws an error or returns raw data / an OperationResult.
 *
 * Usage:
 *   import { ctrl } from '../shared/asyncHandler.js';
 *
 *   // In a controller constructor:
 *   this.create = ctrl(async (req) => {
 *     return this.service.create(req.body, req.user.id);
 *   }, { ok: 201 });
 *
 * Rules applied in order:
 *   1. If the fn already sent the response → do nothing (headersSent guard).
 *   2. If the fn returned an OperationResult ({ success: boolean }) → pass through.
 *   3. If the fn returned null/undefined → { success: true } with ok status.
 *   4. Otherwise → { success: true, data: result } with ok status.
 *   5. On thrown error → { success: false, message: err.message } with fail status.
 *
 * @param {function(req, res): Promise<any>} fn
 * @param {{ ok?: number, fail?: number }} [opts]
 * @returns {function(req, res): Promise<void>}
 */
export function ctrl(fn, { ok = 200, fail = 400 } = {}) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);

      // Already handled inside fn (streaming, redirects, etc.)
      if (res.headersSent) return;

      // Already an OperationResult — pass through, pick status from success flag
      if (result !== null && result !== undefined && typeof result.success === 'boolean') {
        return res.status(result.success ? ok : fail).json(result);
      }

      // Void / null return — simple success acknowledgement
      if (result == null) {
        return res.status(ok).json({ success: true });
      }

      // Raw data — wrap it
      res.status(ok).json({ success: true, data: result });
    } catch (err) {
      if (!res.headersSent) {
        console.error('[ctrl]', req.method, req.path, err.message);
        res.status(fail).json({ success: false, message: err.message });
      }
    }
  };
}
