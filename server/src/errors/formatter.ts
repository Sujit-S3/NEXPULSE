import { AppError } from './AppError.js';
import { ValidationError } from './ValidationError.js';

interface FormattedError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

export function formatError(error: AppError): {
  success: false;
  error: FormattedError;
} {
  const formatted: FormattedError = {
    code: error.code,
    message: error.message,
  };

  if (error instanceof ValidationError) {
    formatted.errors = error.errors;
  }

  return { success: false, error: formatted };
}
