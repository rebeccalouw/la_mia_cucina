import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage } from '../controllers/uploadController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Reduced to 2MB to keep DB size reasonable
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
  }
});

router.post('/', isAuthenticated, upload.single('image'), uploadImage);

export default router;
