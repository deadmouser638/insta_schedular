export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (msg?: string) => new AppError(404, msg ?? 'Not found');
export const unauthorized = (msg?: string) => new AppError(401, msg ?? 'Unauthorized');
export const forbidden = (msg?: string) => new AppError(403, msg ?? 'Forbidden');
export const badRequest = (msg: string) => new AppError(400, msg);
