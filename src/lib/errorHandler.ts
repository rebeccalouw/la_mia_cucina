import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';

/**
 * Last middleware in the chain. Without it, an upload rejection reached Express's default
 * handler and came back as an HTML stack trace, which the client then failed to parse as JSON.
 */
export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'That image is too large. The limit is 2 MB.' });
    }
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }

  // Thrown by the fileFilter in uploadRoutes.
  if (typeof err?.message === 'string' && err.message.startsWith('Only images are allowed')) {
    return res.status(415).json({ error: err.message });
  }

  const status = Number(err?.status) || 500;

  console.error('Unhandled error:', err);

  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: err?.stack })
  });
}
