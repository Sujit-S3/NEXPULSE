import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

type ValidationTarget = 'body' | 'query' | 'params';

function validateTarget(schema: ZodType, target: ValidationTarget) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req[target] = schema.parse(req[target]) as typeof req[typeof target];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(issue.message);
        }
        next(new ValidationError(errors));
        return;
      }
      next(error);
    }
  };
}

export function validate(schema: ZodType) {
  return validateTarget(schema, 'body');
}

export function validateQuery(schema: ZodType) {
  return validateTarget(schema, 'query');
}

export function validateParams(schema: ZodType) {
  return validateTarget(schema, 'params');
}
