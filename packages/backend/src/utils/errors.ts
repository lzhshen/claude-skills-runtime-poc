/**
 * Error handling utilities and exception classes.
 */

import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Base application error.
 */
export class AppError extends Error {
  code: string;
  statusCode: ContentfulStatusCode;
  details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: ContentfulStatusCode = 400,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Convert error to dictionary for API response.
   */
  toDict(): { error: Record<string, unknown> } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...this.details,
      },
    };
  }
}

/**
 * Resource not found error.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, resourceId: string) {
    super('NOT_FOUND', `${resource} not found`, 404, {
      resource,
      id: resourceId,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error.
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, 400, field ? { field } : {});
    this.name = 'ValidationError';
  }
}

/**
 * File size exceeds limit error.
 */
export class FileTooLargeError extends AppError {
  constructor(maxSizeMb: number) {
    super('FILE_TOO_LARGE', `File size exceeds ${maxSizeMb}MB limit`, 413);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Invalid request error.
 */
export class InvalidRequestError extends AppError {
  constructor(message: string) {
    super('INVALID_REQUEST', message, 400);
    this.name = 'InvalidRequestError';
  }
}

/**
 * Invalid skill package error.
 */
export class InvalidSkillError extends AppError {
  constructor(message: string = 'Skill package validation failed, cannot execute') {
    super('INVALID_SKILL', message, 400);
    this.name = 'InvalidSkillError';
  }
}

/**
 * Cannot edit binary file error.
 */
export class BinaryFileError extends AppError {
  constructor() {
    super('BINARY_FILE', 'Cannot edit binary file', 400);
    this.name = 'BinaryFileError';
  }
}

/**
 * OpenCode server unavailable error.
 */
export class OpencodeUnavailableError extends AppError {
  constructor(message: string = 'Cannot connect to OpenCode server') {
    super('OPENCODE_UNAVAILABLE', message, 503);
    this.name = 'OpencodeUnavailableError';
  }
}

/**
 * Execution already completed error.
 */
export class AlreadyCompletedError extends AppError {
  constructor() {
    super('ALREADY_COMPLETED', 'Execution already completed, cannot cancel', 400);
    this.name = 'AlreadyCompletedError';
  }
}

/**
 * Execution timeout error.
 */
export class ExecutionTimeoutError extends AppError {
  constructor(timeoutSeconds: number) {
    super('TIMEOUT', `Execution timeout (${Math.floor(timeoutSeconds / 60)} minutes)`, 408);
    this.name = 'ExecutionTimeoutError';
  }
}

/**
 * Helper to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an API response format.
 */
export function errorToResponse(error: unknown): { error: Record<string, unknown> } {
  if (isAppError(error)) {
    return error.toDict();
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  };
}

/**
 * Get HTTP status code from an error.
 */
export function getErrorStatusCode(error: unknown): ContentfulStatusCode {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
