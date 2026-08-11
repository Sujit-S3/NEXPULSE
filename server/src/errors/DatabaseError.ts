import { AppError } from './AppError.js';

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', code = 'DATABASE_ERROR') {
    super(message, 500, code, false);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
