// ============================================
// My ID — File Upload Middleware
// ============================================
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    cb(null, name);
  }
});

// Allowed file types
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const docExts = ['.pdf'];
const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const docMimes = ['application/pdf'];

function fileFilter(allowedExts, allowedMimes) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedExts.includes(ext) && allowedMimes.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Formatos aceptados: ${allowedExts.join(', ')}`));
    }
  };
}

// Image upload (photos + GIFs) — 5MB for GIFs, 2MB for static images
const uploadImage = multer({
  storage,
  fileFilter: fileFilter(imageExts, imageMimes),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB (GIF support)
}).single('foto');

// File upload (documents) — 5MB
const uploadFile = multer({
  storage,
  fileFilter: fileFilter([...imageExts, ...docExts], [...imageMimes, ...docMimes]),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('archivo');

module.exports = { uploadImage, uploadFile };
