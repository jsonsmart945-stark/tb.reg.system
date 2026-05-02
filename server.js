const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const Database   = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 10000;

// ── 1. Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// This line allows the browser to access your HTML/CSS/JS files
app.use(express.static(path.join(__dirname)));

// ── 2. Root Route (Fixes "Cannot GET /") ───────────────────────
app.get('/', (req, res) => {
  // Change 'index.html' below if your main file has a different name
  res.sendFile(path.join(__dirname, 'index_enhanced.html')); 
});

// ── 3. Configuration ───────────────────────────────────────────
const SCHOOL_EMAIL = 'jaf89575@gmail.com';
const SMTP_CONFIG  = {
  service: 'gmail',
  auth: {
    user: 'jaf89575@gmail.com',
    pass: 'jhxd iwnu ggqs wnnm'
  }
};

// ── 4. SQLite Database ─────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'tabora_boys.db');
const db      = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    full_name        TEXT NOT NULL,
    admission_no     TEXT,
    registration_date TEXT,
    email_sent        INTEGER NOT NULL DEFAULT 0,
    raw_json          TEXT
  );
`);

const insertStudent = db.prepare(`
  INSERT INTO students (full_name, admission_no, registration_date, raw_json)
  VALUES (@full_name, @admission_no, @registration_date, @raw_json)
`);

// ── 5. Email & Upload Setup ────────────────────────────────────
const transporter = nodemailer.createTransport(SMTP_CONFIG);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, 'reg-' + Date.now() + '.pdf')
  })
});

// ── 6. API Routes ──────────────────────────────────────────────
app.post('/api/register', upload.single('pdf'), async (req, res) => {
  try {
    const d = JSON.parse(req.body.studentData);
    const fullName = [d.jina1, d.jina2, d.jina3].filter(Boolean).join(' ') || 'Unknown';
    
    const result = insertStudent.run({
      full_name: fullName,
      admission_no: d.admissionNo || null,
      registration_date: new Date().toISOString(),
      raw_json: JSON.stringify(d)
    });

    // Send Confirmation Email
    await transporter.sendMail({
      from: `"Tabora Boys Registration" <${SMTP_CONFIG.auth.user}>`,
      to: SCHOOL_EMAIL,
      subject: `Usajili Mpya: ${fullName}`,
      html: `<p>Mwanafunzi mpya amesajiliwa: <b>${fullName}</b></p>`
    });

    res.json({ success: true, studentId: result.lastInsertRowid });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 7. Server Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});