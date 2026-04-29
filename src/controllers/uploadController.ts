import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const uploadImage = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Convert buffer to base64
  const base64Image = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;
  
  res.json({ url: dataUri });
};