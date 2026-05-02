const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const Database   = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 10000; // Single declaration

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// ── Root Route (Homepage Fix) ──────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index_enhanced.html')); 
});

// ── Configuration ──────────────────────────────────────────────
const SCHOOL_EMAIL = 'jaf89575@gmail.com';
const SMTP_CONFIG  = {
  service: 'gmail',
  auth: {
    user: 'jaf89575@gmail.com',
    pass: 'jhxd iwnu ggqs wnnm'
  }
};

// ── SQLite Database ────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'tabora_boys.db');
const db      = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    jina1            TEXT,
    jina2            TEXT,
    jina3            TEXT,
    full_name        TEXT NOT NULL,
    admission_no     TEXT,
    tarehe           TEXT,
    mwezi            TEXT,
    mwaka            TEXT,
    wilaya_kuzaliwa  TEXT,
    uraia            TEXT,
    dini             TEXT,
    shule_iliyotoka  TEXT,
    mkoa             TEXT,
    wilaya_makazi    TEXT,
    tarafa           TEXT,
    kata             TEXT,
    kijiji           TEXT,
    nambari_nyumba   TEXT,
    mwenyekiti_jina  TEXT,
    mwenyekiti_simu  TEXT,
    mtendaji_jina    TEXT,
    baba_njina       TEXT,
    baba_simu        TEXT,
    mama_njina       TEXT,
    mama_simu        TEXT,
    mlezi_jina       TEXT,
    mlezi_simu       TEXT,
    ndugu_jina       TEXT,
    ndugu_simu       TEXT,
    mzazi_jina       TEXT,
    uhusiano         TEXT,
    mzazi_simu_kuu   TEXT,
    mzazi_anwani     TEXT,
    mzazi_email      TEXT,
    damu             TEXT,
    bima             TEXT,
    bima_aina        TEXT,
    magonjwa         TEXT,
    cheeti_status    TEXT,
    fomu_d           TEXT,
    registration_date TEXT,
    email_sent        INTEGER NOT NULL DEFAULT 0,
    email_message_id  TEXT,
    pdf_filename      TEXT,
    raw_json          TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_full_name ON students(full_name);
  CREATE INDEX IF NOT EXISTS idx_created   ON students(created_at);
  CREATE INDEX IF NOT EXISTS idx_admission ON students(admission_no);
`);

const insertStudent = db.prepare(`
  INSERT INTO students (
    jina1, jina2, jina3, full_name,
    admission_no, tarehe, mwezi, mwaka,
    wilaya_kuzaliwa, uraia, dini, shule_iliyotoka,
    mkoa, wilaya_makazi, tarafa, kata, kijiji, nambari_nyumba,
    mwenyekiti_jina, mwenyekiti_simu, mtendaji_jina,
    baba_njina, baba_simu, mama_njina, mama_simu,
    mlezi_jina, mlezi_simu, ndugu_jina, ndugu_simu,
    mzazi_jina, uhusiano, mzazi_simu_kuu, mzazi_anwani, mzazi_email,
    damu, bima, bima_aina, magonjwa, cheeti_status, fomu_d,
    registration_date, email_sent, email_message_id, pdf_filename, raw_json
  ) VALUES (
    @jina1, @jina2, @jina3, @full_name,
    @admission_no, @tarehe, @mwezi, @mwaka,
    @wilaya_kuzaliwa, @uraia, @dini, @shule_iliyotoka,
    @mkoa, @wilaya_makazi, @tarafa, @kata, @kijiji, @nambari_nyumba,
    @mwenyekiti_jina, @mwenyekiti_simu, @mtendaji_jina,
    @baba_njina, @baba_simu, @mama_njina, @mama_simu,
    @mlezi_jina, @mlezi_simu, @ndugu_jina, @ndugu_simu,
    @mzazi_jina, @uhusiano, @mzazi_simu_kuu, @mzazi_anwani, @mzazi_email,
    @damu, @bima, @bima_aina, @magonjwa, @cheeti_status, @fomu_d,
    @registration_date, 0, NULL, @pdf_filename, @raw_json
  )
`);

const updateEmailStatus = db.prepare(
  `UPDATE students SET email_sent = 1, email_message_id = ? WHERE id = ?`
);

console.log('✅ SQLite database ready:', DB_PATH);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, 'reg-' + Date.now() + '.pdf')
});
const upload = multer({ storage });

// ── Email ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport(SMTP_CONFIG);
transporter.verify((err) => {
  if (err) console.error('❌ Email error:', err.message);
  else     console.log('✅ Email server ready');
});

function buildEmailHTML(d, fullName, submissionDate) {
  const dob = [d.tarehe, d.mwezi, d.mwaka].filter(Boolean).join('/');
  const row = (l, v) => `<tr>
    <td style="padding:8px 14px;font-weight:600;color:#555;background:#f7f9fc;width:38%;border-bottom:1px solid #eef2f7;">${l}</td>
    <td style="padding:8px 14px;color:#1a1a2e;border-bottom:1px solid #eef2f7;">${v||'—'}</td></tr>`;
  const sec = (icon, title, rows) => `<div style="margin-bottom:20px;">
    <div style="background:#1a365d;color:white;padding:8px 14px;font-size:13px;font-weight:700;border-radius:6px 6px 0 0;">${icon} ${title}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #dde3ed;border-top:none;">${rows}</table></div>`;
  return `<!DOCTYPE html><html lang="sw"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:650px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
<div style="background:linear-gradient(135deg,#0d1f3c,#1a365d);padding:28px 32px;">
  <div style="color:white;font-size:17px;font-weight:800;">🏫 SHULE YA SEKONDARI TABORA WAVULANA</div>
  <div style="color:#f0c84a;font-size:11px;margin-top:3px;font-weight:600;">Usajili Mpya — Kidato cha Kwanza 2026</div>
</div>
<div style="height:4px;background:linear-gradient(90deg,#c8962a,#f0c84a,#c8962a);"></div>
<div style="padding:16px 28px;background:#e8f5e9;border-left:4px solid #2d6a4f;">
  <div style="font-weight:700;color:#1b5e20;">✅ Mwanafunzi Mpya — ${submissionDate}</div>
</div>
<div style="padding:24px 28px;">
  ${sec('👤','TAARIFA ZA KIBINAFSI',
    row('Jina Kamili',`<strong style="color:#1a365d;">${fullName}</strong>`)+
    row('Tarehe ya Kuzaliwa',dob)+row('Wilaya ya Kuzaliwa',d.wilayaKuzaliwa)+
    row('Uraia',d.uraia)+row('Dini',d.dini)+row('Shule Iliyotoka',d.shuleIliyotoka)+
    row('Namba Usajili',`<strong style="color:#2b5fa5;">${d.admissionNo||'—'}</strong>`)+
    row('Mkoa/Wilaya',[d.mkoa,d.wilayaMakazi].filter(Boolean).join(' / '))+
    row('Kata/Kijiji',[d.kata,d.kijiji].filter(Boolean).join(' / ')))}
  ${sec('👨‍👩‍👦','FAMILIA',
    row('Baba',d.babaNjina)+row('Simu ya Baba',d.babaSimu)+
    row('Mama',d.mamaNjina)+row('Simu ya Mama',d.mamaSimu)+
    row('Mlezi',[d.mleziJina,d.mleziSimu].filter(Boolean).join(' — '))+
    row('Ndugu',[d.nduguJina,d.nduguSimu].filter(Boolean).join(' — ')))}
  ${sec('🤝','MZAZI/MLEZI MKUU',
    row('Jina',`<strong>${d.mzaziJina}</strong>`)+row('Uhusiano',d.uhusiano)+
    row('Simu Kuu',`<strong style="color:#2b5fa5;">${d.mzaziSimuKuu}</strong>`)+
    row('Barua Pepe',d.mzaziEmail||'Haitolewa')+row('Anwani',d.mzaziAnwani))}
  ${sec('🏥','AFYA',
    row('Kundi la Damu',`<strong style="color:#c0392b;">${d.damu}</strong>`)+
    row('Bima',d.bima)+row('Aina ya Bima',d.bimaAina)+row('Magonjwa',d.magonjwa||'Hakuna'))}
</div>
<div style="background:#f7f9fc;padding:16px 28px;text-align:center;font-size:11px;color:#888;">
  <strong style="color:#1a365d;">Shule ya Sekondari Tabora Wavulana</strong><br>
  S.L.P 374, Tabora · Simu: 0755 297 005 · <span style="color:#c8962a;">jaf89575@gmail.com</span>
</div></div></body></html>`;
}

// ── Routes ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM students').get();
  res.json({ status: 'ok', total_registrations: total });
});

app.post('/api/test-email', async (req, res) => {
  try {
    const info = await transporter.sendMail({
      from: `"Tabora Boys System" <${SMTP_CONFIG.auth.user}>`,
      to: SCHOOL_EMAIL, subject: 'Test Email', html: '<p>Mfumo unafanya kazi!</p>'
    });
    res.json({ success: true, messageId: info.messageId });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/register', upload.single('pdf'), async (req, res) => {
  const pdfPath = req.file ? req.file.path : null;
  let studentId = null;
  try {
    const d = JSON.parse(req.body.studentData);
    const fullName = [d.jina1, d.jina2, d.jina3].filter(Boolean).join(' ') || 'Haijajazwa';
    const submissionDate = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' });

    const result = insertStudent.run({
      jina1: d.jina1||null, jina2: d.jina2||null, jina3: d.jina3||null,
      full_name: fullName,
      admission_no: d.admissionNo||null,
      tarehe: d.tarehe||null, mwezi: d.mwezi||null, mwaka: d.mwaka||null,
      wilaya_kuzaliwa: d.wilayaKuzaliwa||null,
      uraia: d.uraia||null, dini: d.dini||null,
      shule_iliyotoka: d.shuleIliyotoka||null,
      mkoa: d.mkoa||null, wilaya_makazi: d.wilayaMakazi||null,
      tarafa: d.tarafa||null, kata: d.kata||null,
      kijiji: d.kijiji||null, nambari_nyumba: d.nambariNyumba||null,
      mwenyekiti_jina: d.mwenyekitiJina||null, mwenyekiti_simu: d.mwenyekitiSimu||null,
      mtendaji_jina: d.mtendajiJina||null,
      baba_njina: d.babaNjina||null, baba_simu: d.babaSimu||null,
      mama_njina: d.mamaNjina||null, mama_simu: d.mamaSimu||null,
      mlezi_jina: d.mleziJina||null, mlezi_simu: d.mleziSimu||null,
      ndugu_jina: d.nduguJina||null, ndugu_simu: d.nduguSimu||null,
      mzazi_jina: d.mzaziJina||null, uhusiano: d.uhusiano||null,
      mzazi_simu_kuu: d.mzaziSimuKuu||null,
      mzazi_anwani: d.mzaziAnwani||null, mzazi_email: d.mzaziEmail||null,
      damu: d.damu||null, bima: d.bima||null, bima_aina: d.bimaAina||null,
      magonjwa: d.magonjwa||null, cheeti_status: d.cheetiStatus||null,
      fomu_d: d.fomuD||null,
      registration_date: submissionDate,
      pdf_filename: req.file ? path.basename(req.file.path) : null,
      raw_json: JSON.stringify(d)
    });

    studentId = result.lastInsertRowid;

    const attachments = [];
    if (pdfPath && fs.existsSync(pdfPath)) {
      attachments.push({ filename: `TaboraBoys_${fullName.replace(/\s+/g,'_')}_2026.pdf`, path: pdfPath });
    }

    const info = await transporter.sendMail({
      from: `"Tabora Boys Registration" <${SMTP_CONFIG.auth.user}>`,
      to: SCHOOL_EMAIL,
      subject: `🎓 Usajili Mpya: ${fullName} | ${submissionDate}`,
      html: buildEmailHTML(d, fullName, submissionDate),
      attachments
    });

    updateEmailStatus.run(info.messageId, studentId);
    if (pdfPath) setTimeout(() => fs.unlink(pdfPath, ()=>{}), 10_000);

    res.json({ success: true, message: 'Usajili umefanikiwa!', studentId, emailSent: true });

  } catch(err) {
    res.status(500).json({ success: false, error: err.message, studentId });
  }
});

// ── Server Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Tabora Boys Secondary School — Registration Server          ║
║  Port     : ${PORT}                                            ║
║  Database : tabora_boys.db (SQLite3)                         ║
╚══════════════════════════════════════════════════════════════╝`);
});