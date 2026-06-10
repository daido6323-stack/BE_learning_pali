const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const unitRoutes = require('./src/routes/unitRoutes');
const lessonRoutes = require('./src/routes/lessonRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const dictionaryRoutes = require('./src/routes/dictionaryRoutes');
const progressRoutes = require('./src/routes/progressRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow Vercel deployment + local dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://api.uydev.io.vn',
  // Vercel preview/production URLs — add your deployed domain below:
  // 'https://palipath.vercel.app',
  /\.vercel\.app$/,      // all *.vercel.app previews
];

app.use(cors({
  origin: (origin, callback) => {
    // allow no-origin requests (curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer Config for PDF/Asset upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên file PDF hoặc ảnh!'), false);
    }
  }
});

// Admin Authentication Middleware (Security Hardening)
const adminAuthMiddleware = (req, res, next) => {
  // Allow all GET requests for public users
  if (req.method === 'GET') {
    return next();
  }
  
  // Allow progress routes for students to submit progress
  if (req.path.startsWith('/api/progress')) {
    return next();
  }

  // Exclude verification endpoint
  if (req.path === '/api/admin/verify') {
    return next();
  }

  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || 'admin123';

  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
  }
  next();
};

app.use(adminAuthMiddleware);

// Mount modular routes
app.use('/api/units', unitRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/progress', progressRoutes);

// PDF/Image upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file nào được tải lên.' });
    }

    // Build absolute URL — uses PUBLIC_URL env or falls back to request origin
    const baseUrl = process.env.PUBLIC_URL ||
      `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const docInfo = {
      name: req.file.originalname,
      url: fileUrl,
      uploadedAt: new Date().toISOString()
    };

    const docsPath = path.join(uploadsDir, 'documents.json');
    let docs = [];
    if (fs.existsSync(docsPath)) {
      docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    }
    docs.push(docInfo);
    fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf8');

    res.json({
      message: 'Tải lên thành công!',
      filename: req.file.filename,
      url: fileUrl,
      documents: docs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all uploaded documents
app.get('/api/documents', (req, res) => {
  try {
    const docsPath = path.join(uploadsDir, 'documents.json');
    let docs = [];
    if (fs.existsSync(docsPath)) {
      docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    }
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a document
app.delete('/api/documents', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    const docsPath = path.join(uploadsDir, 'documents.json');
    let docs = [];
    if (fs.existsSync(docsPath)) {
      docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    }
    
    // Safely extract the filename from the URL to prevent directory traversal
    const filename = path.basename(url);
    const filepath = path.resolve(uploadsDir, filename);

    // Hardened path validation: ensure it remains within the uploads folder
    if (filepath.startsWith(uploadsDir) && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    docs = docs.filter(d => d.url !== url);
    fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), 'utf8');
    res.json({ message: 'Đã xóa tài liệu!', documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Verification Endpoint (Security Hardening)
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  const expectedKey = process.env.ADMIN_KEY || 'admin123';

  if (password === expectedKey) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Mật khẩu Admin không chính xác!' });
  }
});

// Server boot
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
