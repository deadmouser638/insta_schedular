import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'
import { authMiddleware } from '../middleware/auth'
import { uploadToCloudinary } from '../lib/cloudinary'

export const uploadsRouter = Router()
uploadsRouter.use(authMiddleware)

// ── Ensure upload directory exists ────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// ── Multer configuration ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${uuid()}${ext}`)
  },
})

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (videos can be large)
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only image (JPEG, PNG, WebP, GIF) and video (MP4, MOV, AVI, WebM) files are allowed'))
    }
  },
})

// ──────────────────────────────────────────────────────────────────
// POST /api/uploads/image
// Upload a single image or video file and return its public URL
// ──────────────────────────────────────────────────────────────────
uploadsRouter.post(
  '/image',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file
      if (!file) {
        res.status(400).json({ error: 'No file provided' })
        return
      }

      // Upload the local file to Cloudinary
      const publicUrl = await uploadToCloudinary(file.path)

      // Clean up the local file since it's securely stored in the cloud
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }

      console.log(`📷 File uploaded via Cloudinary: ${file.originalname} → ${publicUrl} (${(file.size / 1024).toFixed(1)} KB)`)

      res.json({
        url: publicUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      })
    } catch (err) {
      next(err)
    }
  }
)

// ──────────────────────────────────────────────────────────────────
// POST /api/uploads/images
// Upload multiple files (for carousels) — max 10
// ──────────────────────────────────────────────────────────────────
uploadsRouter.post(
  '/images',
  upload.array('images', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided' })
        return
      }

      const results = []

      // Upload each file to Cloudinary sequentially
      for (const file of files) {
        const publicUrl = await uploadToCloudinary(file.path)
        
        // Clean up locally
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }

        results.push({
          url: publicUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        })
      }

      console.log(`📷 ${files.length} file(s) uploaded via Cloudinary`)

      res.json(results)
    } catch (err) {
      next(err)
    }
  }
)

// ── Error handler for multer errors ───────────────────────────────
uploadsRouter.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large. Maximum size is 100MB.' })
      return
    }
    res.status(400).json({ error: err.message })
    return
  }
  if (err?.message) {
    res.status(400).json({ error: err.message })
    return
  }
  next(err)
})
