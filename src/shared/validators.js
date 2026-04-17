/**
 * Shared validation utilities for backend services.
 * Returns a string with the error message, or null if valid.
 */

/**
 * Validates that a required string field is not empty.
 * @param {*} value
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {string|null}
 */
export const validateRequired = (value, fieldName) => {
  if (!value || String(value).trim() === '') {
    return `El campo "${fieldName}" es requerido.`;
  }
  return null;
};

/**
 * Validates that a date is not in the past (compares by day, ignoring time).
 * @param {string|Date} date
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {string|null}
 */
export const validateFutureDate = (date, fieldName = 'fecha límite') => {
  if (!date) return null;
  const target = new Date(date + (typeof date === 'string' && !date.includes('T') ? 'T00:00:00' : ''));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (target < today) {
    return `El campo "${fieldName}" no puede ser una fecha anterior a hoy.`;
  }
  return null;
};
