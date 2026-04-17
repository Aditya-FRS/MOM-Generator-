require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mom-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// ── MOM Auth Routes ───────────────────────────────────────

// POST /api/mom/login
app.post('/api/mom/login', (req, res) => {
  const { username, password } = req.body;
  const momUser = process.env.MOM_USERNAME;
  const momPass = process.env.MOM_PASSWORD;

  if (!momUser || !momPass) {
    return res.status(500).json({ error: 'MOM credentials not configured on server. Set MOM_USERNAME and MOM_PASSWORD env vars.' });
  }

  if (username === momUser && password === momPass) {
    req.session.momAuth = true;
    req.session.momUser = username;
    return res.json({ ok: true, username });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// GET /api/mom/check-auth
app.get('/api/mom/check-auth', (req, res) => {
  if (req.session.momAuth) {
    return res.json({ authenticated: true, username: req.session.momUser });
  }
  res.json({ authenticated: false });
});

// POST /api/mom/logout
app.post('/api/mom/logout', (req, res) => {
  req.session.momAuth = false;
  req.session.momUser = null;
  res.json({ ok: true });
});

// ── Translation Proxy ────────────────────────────────────
// Uses MyMemory free API — no key required (up to 5000 words/day)
app.post('/api/translate', async (req, res) => {
  const { text, from } = req.body;
  if (!text || !text.trim()) return res.json({ translated: '' });

  try {
    const sourceLang = from || 'te';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceLang}|en`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return res.json({ translated: data.responseData.translatedText });
    }
    // fallback: return original
    res.json({ translated: text, error: 'Translation service returned no result' });
  } catch (e) {
    console.error('Translation error:', e.message);
    res.json({ translated: text, error: e.message });
  }
});

// ── Pages ─────────────────────────────────────────────────

// Serve MOM Recorder at root /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mom-recorder.html'));
});

// Also accessible at /mom
app.get('/mom', (req, res) => {
  res.sendFile(path.join(__dirname, 'mom-recorder.html'));
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Voice MOM Generator running on http://localhost:${PORT}`);
  console.log(`MOM_USERNAME: ${process.env.MOM_USERNAME ? '✓ set' : '✗ NOT SET'}`);
  console.log(`MOM_PASSWORD: ${process.env.MOM_PASSWORD ? '✓ set' : '✗ NOT SET'}`);
});
