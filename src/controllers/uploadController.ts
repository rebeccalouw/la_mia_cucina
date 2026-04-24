import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const uploadImage = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // The file is saved by multer. We return the URL/path.
  // We'll serve the /uploads directory statically.
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ url: filePath });
};
