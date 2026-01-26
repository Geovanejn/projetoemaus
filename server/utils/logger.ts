import type { Response } from 'express';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  
  log: (...args: unknown[]) => {
    console.log(...args);
  }
};

// Standardized error handling helper
export function handleApiError(
  res: Response,
  error: unknown,
  context: string,
  defaultMessage: string = "Erro interno do servidor"
): void {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  const statusCode = getErrorStatusCode(error);
  
  logger.error(`[${context}]`, error);
  
  // In production, don't expose internal error details (except for AppError which has controlled messages)
  const isAppError = error instanceof AppError;
  const responseMessage = isDevelopment || isAppError ? errorMessage : defaultMessage;
  
  res.status(statusCode).json({ message: responseMessage });
}

// Get appropriate status code based on error type
function getErrorStatusCode(error: unknown): number {
  // First check for AppError with explicit status code
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('not found') || message.includes('nao encontrad')) return 404;
    if (message.includes('unauthorized') || message.includes('nao autenticado')) return 401;
    if (message.includes('forbidden') || message.includes('sem permissao')) return 403;
    if (message.includes('invalid') || message.includes('invalido')) return 400;
    if (message.includes('already exists') || message.includes('ja existe')) return 409;
  }
  return 500;
}

// Known error class for controlled errors
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export default logger;
