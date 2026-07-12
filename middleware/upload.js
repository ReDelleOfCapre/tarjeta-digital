const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Extensiones y MIME types permitidos
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DOC_EXTENSIONS = ['.pdf'];
const DOC_MIMETYPES = ['application/pdf'];

const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...DOC_EXTENSIONS];
const ALL_MIMETYPES = [...IMAGE_MIMETYPES, ...DOC_MIMETYPES];

/**
 * Almacenamiento en disco con nombre único: timestamp-randomhex.ext
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${randomHex}${ext}`;
    cb(null, filename);
  }
});

/**
 * Filtro de archivos para imágenes solamente
 */
function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext) && IMAGE_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no válido. Formatos permitidos: JPG, PNG, GIF, WebP.'), false);
  }
}

/**
 * Filtro de archivos para imágenes y documentos
 */
function allFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALL_EXTENSIONS.includes(ext) && ALL_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no válido. Formatos permitidos: JPG, PNG, GIF, WebP, PDF.'), false);
  }
}

/**
 * Instancia multer para subir imágenes (máx 2MB)
 */
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('foto');

/**
 * Instancia multer para subir archivos (máx 5MB)
 */
const uploadFile = multer({
  storage,
  fileFilter: allFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('archivo');

module.exports = { uploadImage, uploadFile };
