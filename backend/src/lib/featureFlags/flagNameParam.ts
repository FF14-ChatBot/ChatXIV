/** Allowed flag names for URL params (matches admin API). */
export const FLAG_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const FLAG_NAME_VALIDATION_MESSAGE =
  'Flag name must be lowercase alphanumeric with hyphens, dots, or underscores';
