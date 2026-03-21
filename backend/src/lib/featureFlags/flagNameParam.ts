/** Allowed flag names for URL params (matches admin API). */
export const FLAG_NAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

export const FLAG_NAME_VALIDATION_MESSAGE =
  'Flag name must start and end with a letter or digit; hyphens, dots, and underscores are allowed in between';
