import express from "express";
import cors from "cors";
import { Otakudesu } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const otakudesu = new Otakudesu();

// UI TAMPILAN
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anime REST API</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f0f1a; color: #fff; font-family: 'Segoe UI', sans-serif; }
.hero { background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); padding: 60px 20px; text-align: center; }
.hero h1 { font-size: 2.5em; color: #e94560; margin-bottom: 10px; }
.hero p { color: #aaa; font-size: 1.1em; margin-bottom: 20px; }
.badge { display: inline-block; background: #e94560; color: #fff; padding: 5px 15px; border-radius: 20px; font-size: 0.85em; margin: 5px; }
.container { max-width: 900px; margin: 40px auto; padding: 0 20px; }
.section-title { font-size: 1.4em; color: #e94560; margin: 30px 0 15px; border-left: 4px solid #e94560; padding-left: 12px; }
.endpoint { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 18px; margin-bottom: 12px; }
.endpoint:hover { border-color: #e94560; transition: 0.3s; }
.method { display: inline-block; background: #00b4d8; color: #fff; padding: 3px 10px; border-radius: 5px; font-size: 0.8em; font-weight: bold; margin-right: 10px; }
.path { color: #90e0ef; font-family: monospace; font-size: 1em; }
.desc { color: #aaa; font-size: 0.9em; margin-top: 8px; }
.example { color: #666; font-size: 0.85em; margin-top: 5px; font-family: monospace; }
.base-url { background: #1a1a2e; border: 1px solid #e94560; border-radius: 10px; padding: 15px; text-align: center; margin: 20px 0; font-family: monospace; color: #e94560; font-size: 1.1em; }
footer { text-align: center; padding: 30px; color: #666; font-size: 0.9em; }
</style>
</head>
<body>
<div class="hero">
  <h1>🎌 Anime REST API</h1>
  <p>REST API Anime Streaming Indonesia — Mandiri & Gratis</p>
  <span class="badge">Otakudesu</span>
  <span class="badge">Free</span>
  <span class="badge">No Auth</span>
</div>
<div class="container">
  <div class="base-url">Base URL: ${req.protocol}://${req.get('host')}</div>

  <div class="section-title">📺 Halaman Utama</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/home</span>
    <div class="desc">Mendapatkan data dari halaman utama (ongoing + complete)</div>
  </div>

  <div class="section-title">📅 Jadwal</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/schedule</span>
    <div class="desc">Mendapatkan jadwal rilis anime per hari</div>
  </div>

  <div class="section-title">🔥 Anime Ongoing & Complete</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/ongoing-anime</span>
    <div class="desc">Mendapatkan daftar anime yang sedang tayang</div>
    <div class="example">Query opsional: ?page=1</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/complete-anime</span>
    <div class="desc">Mendapatkan daftar anime yang sudah tamat</div>
    <div class="example">Query opsional: ?page=1</div>
  </div>

  <div class="section-title">🔍 Pencarian</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/search/:keyword</span>
    <div class="desc">Melakukan pencarian anime berdasarkan kata kunci</div>
    <div class="example">Contoh: /anime/search/naruto</div>
  </div>

  <div class="section-title">📋 Detail Anime & Episode</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/anime/:slug</span>
    <div class="desc">Mendapatkan detail lengkap sebuah anime</div>
    <div class="example">Contoh: /anime/anime/jjk-s3-sub-indo</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/episode/:slug</span>
    <div class="desc">Mendapatkan detail dan link streaming untuk sebuah episode</div>
    <div class="example">Contoh: /anime/episode/jts-ksn-s3-episode-1-sub-indo</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/server/:serverId</span>
    <div class="desc">Mengambil URL embed streaming berdasarkan server ID</div>
  </div>

  <div class="section-title">🎭 Genre</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/genre</span>
    <div class="desc">Mendapatkan daftar semua genre yang tersedia</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/genre/:slug</span>
    <div class="desc">Mendapatkan daftar anime berdasarkan genre tertentu</div>
    <div class="example">Contoh: /anime/genre/action?page=1</div>
  </div>

  <div class="section-title">📦 Lainnya</div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/batch/:slug</span>
    <div class="desc">Mendapatkan link download batch untuk sebuah anime</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/anime/unlimited</span>
    <div class="desc">Mendapatkan data semua anime</div>
  </div>
</div>
<footer>Made with ❤️ | Anime REST API</footer>
</body>
</html>`);
});

// ENDPOINTS
app.get("/anime/home", async (req, res) => {
  try {
    const [ongoing, complete] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" } } as any),
      otakudesu.search({ filter: { status: "Completed" } } as any),
    ]);
    res.json({ status:"success", data:{ ongoing, complete } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/ongoing-anime", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    res.json(await otakudesu.search({ filter: { status: "Ongoing" }, page } as any));
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/complete-anime", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    res.json(await otakudesu.search({ filter: { status: "Completed" }, page } as any));
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/search/:keyword", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.params.keyword } })); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/anime/:slug", async (req, res) => {
  try { res.json(await otakudesu.detail(req.params.slug)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/episode/:slug", async (req, res) => {
  try { res.json(await otakudesu.streams(req.params.slug)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre", async (req, res) => {
  try { res.json(await otakudesu.genres()); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre/:slug", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    res.json(await otakudesu.search({ filter: { genres: [req.params.slug] }, page } as any));
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/schedule", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { status: "Ongoing" } } as any)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/batch/:slug", async (req, res) => {
  try { res.json(await otakudesu.detail(req.params.slug)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/unlimited", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: "" } })); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/server/:serverId", async (req, res) => {
  res.json({ status:"success", data:{ serverId: req.params.serverId, message: "Use embed URL from episode endpoint directly" } });
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
