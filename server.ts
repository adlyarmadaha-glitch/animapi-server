import express from "express";
import cors from "cors";
import { Otakudesu, Animasu, AnimeIndo } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const otakudesu = new Otakudesu();
const animasu = new Animasu();
const animeindo = new AnimeIndo();

// CACHE SYSTEM
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

const formatAnime = (animes: any[]) => animes
  .filter((a: any) => a && a.title && a.posterUrl)
  .map((a: any) => ({
    title: a.title,
    poster: a.posterUrl,
    animeId: a.slug,
    href: `/anime/anime/${a.slug}`,
    score: a.rating?.toString() || "0",
    status: a.status === "ONGOING" ? "Ongoing" : "Completed",
    totalEpisodes: a.episodes?.length || 0,
    genreList: a.genres?.map((g: any) => ({ title: g.name, genreId: g.slug })) || [],
    source: a.source || "otakudesu",
  }));

const fetchAll = async (fn: (p: any) => Promise<any>, opts: any) => {
  const [ot, an, ai] = await Promise.all([
    fn(otakudesu).catch(() => ({ animes: [] })),
    fn(animasu).catch(() => ({ animes: [] })),
    fn(animeindo).catch(() => ({ animes: [] })),
  ]);
  return [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
};

// UI
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anime REST API</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a15;color:#e0e0e0;font-family:'Segoe UI',sans-serif;min-height:100vh}
.hero{background:linear-gradient(135deg,#0d0d2b 0%,#1a0533 50%,#0d1a33 100%);padding:70px 20px;text-align:center;border-bottom:1px solid #2a2a4a}
.hero h1{font-size:2.8em;background:linear-gradient(90deg,#e94560,#a855f7,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
.hero p{color:#888;font-size:1.1em;margin-bottom:20px}
.badges{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.badge{padding:5px 16px;border-radius:20px;font-size:.8em;font-weight:600}
.badge.green{background:#0f2d1a;color:#22c55e;border:1px solid #22c55e}
.badge.blue{background:#0f1e2d;color:#3b82f6;border:1px solid #3b82f6}
.badge.purple{background:#1a0d2d;color:#a855f7;border:1px solid #a855f7}
.container{max-width:860px;margin:40px auto;padding:0 20px}
.base-url{background:#0d0d2b;border:1px solid #e94560;border-radius:12px;padding:16px;text-align:center;margin-bottom:30px;font-family:monospace;color:#e94560;font-size:1em;word-break:break-all}
.providers{display:flex;gap:10px;margin-bottom:30px;flex-wrap:wrap}
.provider{flex:1;min-width:150px;background:#0d0d2b;border:1px solid #2a2a4a;border-radius:12px;padding:14px;text-align:center}
.provider h3{color:#a855f7;font-size:.95em;margin-bottom:4px}
.provider p{color:#555;font-size:.8em}
.section{margin-bottom:30px}
.section-title{font-size:1em;color:#a855f7;margin-bottom:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700}
.endpoint{background:#0d0d2b;border:1px solid #1a1a3a;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;transition:.2s}
.endpoint:hover{border-color:#e94560;transform:translateX(4px)}
.method{background:#e94560;color:#fff;padding:4px 10px;border-radius:6px;font-size:.75em;font-weight:700;white-space:nowrap;margin-top:2px}
.info .path{color:#60a5fa;font-family:monospace;font-size:.95em}
.info .desc{color:#666;font-size:.82em;margin-top:4px}
.info .example{color:#444;font-size:.78em;margin-top:3px;font-family:monospace}
footer{text-align:center;padding:40px 20px;color:#333;border-top:1px solid #1a1a2e;margin-top:40px}
footer span{color:#e94560}
</style>
</head>
<body>
<div class="hero">
  <h1>🎌 Anime REST API</h1>
  <p>REST API Streaming Anime Indonesia — Gratis & Mandiri</p>
  <div class="badges">
    <span class="badge green">✓ No Auth Required</span>
    <span class="badge blue">✓ 3 Providers</span>
    <span class="badge purple">✓ Cached Response</span>
  </div>
</div>
<div class="container">
  <div class="base-url">🔗 ${req.protocol}://${req.get('host')}</div>
  <div class="providers">
    <div class="provider"><h3>Otakudesu</h3><p>Provider Utama</p></div>
    <div class="provider"><h3>Animasu</h3><p>Provider Kedua</p></div>
    <div class="provider"><h3>AnimeIndo</h3><p>Provider Ketiga</p></div>
  </div>
  <div class="section">
    <div class="section-title">📺 Halaman Utama</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/home</div><div class="desc">Data halaman utama — ongoing & completed dari semua provider</div></div></div>
  </div>
  <div class="section">
    <div class="section-title">📅 Jadwal</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/schedule</div><div class="desc">Jadwal rilis anime per hari dalam seminggu</div></div></div>
  </div>
  <div class="section">
    <div class="section-title">🔥 Daftar Anime</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/ongoing-anime</div><div class="desc">Anime yang sedang tayang dari semua provider</div><div class="example">?page=1</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/complete-anime</div><div class="desc">Anime yang sudah tamat dari semua provider</div><div class="example">?page=1</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/unlimited</div><div class="desc">Semua anime dari semua provider</div></div></div>
  </div>
  <div class="section">
    <div class="section-title">🔍 Pencarian</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/search/:keyword</div><div class="desc">Cari anime dari semua provider sekaligus</div><div class="example">Contoh: /anime/search/naruto</div></div></div>
  </div>
  <div class="section">
    <div class="section-title">📋 Detail Anime & Episode</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/anime/:slug</div><div class="desc">Detail lengkap sebuah anime</div><div class="example">Contoh: /anime/anime/jjk-s3-sub-indo</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/episode/:slug</div><div class="desc">Link streaming & download per episode</div><div class="example">Contoh: /anime/episode/jts-ksn-s3-episode-1-sub-indo</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/server/:serverId</div><div class="desc">URL embed streaming dari server ID</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/batch/:slug</div><div class="desc">Link download batch untuk sebuah anime</div></div></div>
  </div>
  <div class="section">
    <div class="section-title">🎭 Genre</div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/genre</div><div class="desc">Daftar semua genre dari semua provider</div></div></div>
    <div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">/anime/genre/:slug</div><div class="desc">Daftar anime berdasarkan genre tertentu</div><div class="example">Contoh: /anime/genre/action?page=1</div></div></div>
  </div>
</div>
<footer>Made with <span>❤️</span> | Anime REST API — Otakudesu + Animasu + AnimeIndo</footer>
</body>
</html>`);
});

app.get("/anime/home", async (req, res) => {
  const cached = getCache("home");
  if (cached) return res.json(cached);
  try {
    const [ot_on, ot_com, an_on, ai_on] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      otakudesu.search({ filter: { status: "Completed" } } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
    ]);
    const result = { status:"success", data:{
      ongoing: { animeList: formatAnime([...(ot_on.animes||[]), ...(an_on.animes||[]), ...(ai_on.animes||[])]) },
      completed: { animeList: formatAnime(ot_com.animes||[]) }
    }};
    setCache("home", result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/ongoing-anime", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const cached = getCache(`ongoing-${page}`);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const result = { status:"success", data:{ animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) }, pagination:{ hasNextPage: ot.hasNext || an.hasNext } };
    setCache(`ongoing-${page}`, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/complete-anime", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const cached = getCache(`complete-${page}`);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const result = { status:"success", data:{ animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) }, pagination:{ hasNextPage: ot.hasNext || an.hasNext } };
    setCache(`complete-${page}`, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/search/:keyword", async (req, res) => {
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
    ]);
    const result = { status:"success", data:{ animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) } };
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/anime/:slug", async (req, res) => {
  const key = `detail-${req.params.slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let data: any;
    try { data = await otakudesu.detail(req.params.slug); }
    catch { try { data = await animasu.detail(req.params.slug); }
    catch { data = await animeindo.detail(req.params.slug); } }
    const result = { status:"success", data:{
      title: data.title, poster: data.posterUrl, animeId: data.slug,
      synopsis: data.synopsis, score: data.rating?.toString(),
      status: data.status, type: data.type, duration: data.duration,
      aired: data.aired, studios: data.studios,
      genreList: data.genres?.map((g:any) => ({ title: g.name, genreId: g.slug })),
      episodeList: data.episodes?.map((e:any) => ({ title: e.name, episodeId: e.slug, href: `/anime/episode/${e.slug}` })),
    }};
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/episode/:slug", async (req, res) => {
  const slug = req.params.slug;
  const key = `episode-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const tryStreams = async (source: string, fetcher: (slug: string) => Promise<any>) => {
    try {
      const raw = await fetcher(slug);
      console.log(`[${source}] raw:`, JSON.stringify(raw).substring(0,200));
      const streams = Array.isArray(raw) ? raw : raw?.streams || [];
      if (streams.length) return streams;
    } catch (err: any) {
      console.error(`[${source}] ERROR:`, err.message, err.status || err.code);
    }
    return [];
  };
  let streams: any[] = [];
  const qualities = streams.reduce((acc: any[], s: any) => { const existing = acc.find(q => q.title === s.name); if (existing) existing.serverList.push({ title: s.source, url: s.url }); else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] }); return acc; }, []);
  const result = { status: 'success', data: { animeId: slug, defaultStreamingUrl: streams[0]?.url || '', server: { qualities } } };
  setCache(key, result);
  res.json(result);
}); else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] }); return acc; }, []) } } };
    setCache(key, result);
    res.json(result);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
}); else acc.push({title:s.name,serverList:[{title:s.source,url:s.url}]}); return acc; },[]) }}};
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({error:e.message}); }
});
        else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
        return acc;
      }, []) }
    }};
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre", async (req, res) => {
  const cached = getCache("genre");
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.genres().catch(() => []),
      animasu.genres().catch(() => []),
      animeindo.genres().catch(() => []),
    ]);
    const all = [...(ot||[]), ...(an||[]), ...(ai||[])];
    const unique = all.filter((g:any, i:number, arr:any[]) => arr.findIndex((x:any) => x.slug === g.slug) === i);
    const result = { status:"success", data:{ genreList: unique.map((g:any) => ({ title: g.name, genreId: g.slug, href: `/anime/genre/${g.slug}` })) } };
    setCache("genre", result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre/:slug", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
    ]);
    const result = { status:"success", data:{ animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) } };
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/schedule", async (req, res) => {
  const cached = getCache("schedule");
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
    ]);
    const all = formatAnime([...(ot.animes||[]), ...(an.animes||[])]);
    const days = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
    const perDay = Math.ceil(all.length / 7);
    const result = { status:"success", data: days.map((day, i) => ({ day, anime_list: all.slice(i*perDay, (i+1)*perDay) })) };
    setCache("schedule", result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/batch/:slug", async (req, res) => {
  try {
    let data: any;
    try { data = await otakudesu.detail(req.params.slug); }
    catch { data = await animasu.detail(req.params.slug); }
    res.json({ status:"success", data:{ title: data.title, animeId: data.slug } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/unlimited", async (req, res) => {
  const cached = getCache("unlimited");
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
    ]);
    const result = { status:"success", data:{ animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) } };
    setCache("unlimited", result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/server/:serverId", async (req, res) => {
  res.json({ status:"success", data:{ embedUrl: req.params.serverId } });
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
// redeploy Sun May 10 03:00:54 PM UTC 2026
