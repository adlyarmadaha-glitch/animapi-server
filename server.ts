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

const formatAnime = (animes: any[]) => animes.map(a => ({
  title: a.title,
  poster: a.posterUrl,
  animeId: a.slug,
  href: `/anime/anime/${a.slug}`,
  score: a.rating?.toString(),
  status: a.status === "ONGOING" ? "Ongoing" : "Completed",
  episodes: a.episodes?.length,
  genreList: a.genres?.map((g: any) => ({ title: g.name, genreId: g.slug })),
  source: a.source || "otakudesu",
}));

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Anime REST API</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f0f1a;color:#fff;font-family:sans-serif}.hero{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:60px 20px;text-align:center}.hero h1{font-size:2.5em;color:#e94560;margin-bottom:10px}.hero p{color:#aaa}.container{max-width:900px;margin:40px auto;padding:0 20px}.section-title{font-size:1.3em;color:#e94560;margin:25px 0 12px;border-left:4px solid #e94560;padding-left:12px}.endpoint{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;padding:15px;margin-bottom:10px}.method{background:#00b4d8;color:#fff;padding:3px 10px;border-radius:5px;font-size:.8em;font-weight:700;margin-right:10px}.path{color:#90e0ef;font-family:monospace}.desc{color:#aaa;font-size:.9em;margin-top:8px}.example{color:#555;font-size:.85em;margin-top:4px;font-family:monospace}.base-url{background:#1a1a2e;border:1px solid #e94560;border-radius:10px;padding:15px;text-align:center;margin:20px 0;font-family:monospace;color:#e94560}footer{text-align:center;padding:30px;color:#666}</style>
</head><body>
<div class="hero"><h1>🎌 Anime REST API</h1><p>REST API Anime Streaming Indonesia — Otakudesu + Animasu + AnimeIndo</p></div>
<div class="container">
<div class="base-url">Base URL: ${req.protocol}://${req.get('host')}</div>
<div class="section-title">📺 Utama</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/home</span><div class="desc">Data halaman utama</div></div>
<div class="section-title">📅 Jadwal</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/schedule</span><div class="desc">Jadwal rilis anime per hari</div></div>
<div class="section-title">🔥 Anime List</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/ongoing-anime</span><div class="desc">Anime sedang tayang (3 provider digabung)</div><div class="example">?page=1</div></div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/complete-anime</span><div class="desc">Anime sudah tamat</div><div class="example">?page=1</div></div>
<div class="section-title">🔍 Pencarian</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/search/:keyword</span><div class="desc">Cari anime dari semua provider</div><div class="example">Contoh: /anime/search/naruto</div></div>
<div class="section-title">📋 Detail</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/anime/:slug</span><div class="desc">Detail lengkap anime</div><div class="example">Contoh: /anime/anime/jjk-s3-sub-indo</div></div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/episode/:slug</span><div class="desc">Detail & link streaming episode</div></div>
<div class="section-title">🎭 Genre</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/genre</span><div class="desc">Semua genre dari semua provider</div></div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/genre/:slug</span><div class="desc">Anime per genre</div><div class="example">Contoh: /anime/genre/action?page=1</div></div>
<div class="section-title">📦 Lainnya</div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/batch/:slug</span><div class="desc">Download batch anime</div></div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/unlimited</span><div class="desc">Semua anime dari semua provider</div></div>
<div class="endpoint"><span class="method">GET</span><span class="path">/anime/server/:serverId</span><div class="desc">URL embed streaming</div></div>
</div>
<footer>Made with ❤️ | Otakudesu + Animasu + AnimeIndo</footer>
</body></html>`);
});

app.get("/anime/home", async (req, res) => {
  try {
    const [ot_on, ot_com, an_on, ai_on] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      otakudesu.search({ filter: { status: "Completed" } } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
    ]);
    const allOngoing = [...(ot_on.animes||[]), ...(an_on.animes||[]), ...(ai_on.animes||[])];
    res.json({ status:"success", data:{
      ongoing: { animeList: formatAnime(allOngoing) },
      completed: { animeList: formatAnime(ot_com.animes||[]) }
    }});
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/ongoing-anime", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: "Ongoing" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
    res.json({ status:"success", data:{ animeList: formatAnime(all) }, pagination:{ hasNextPage: ot.hasNext || an.hasNext } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/complete-anime", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: "Completed" }, page } as any).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
    res.json({ status:"success", data:{ animeList: formatAnime(all) }, pagination:{ hasNextPage: ot.hasNext || an.hasNext } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/search/:keyword", async (req, res) => {
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
    res.json({ status:"success", data:{ animeList: formatAnime(all) } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/anime/:slug", async (req, res) => {
  try {
    let data: any;
    try { data = await otakudesu.detail(req.params.slug); }
    catch { try { data = await animasu.detail(req.params.slug); }
    catch { data = await animeindo.detail(req.params.slug); } }
    res.json({ status:"success", data:{
      title: data.title,
      poster: data.posterUrl,
      animeId: data.slug,
      synopsis: data.synopsis,
      score: data.rating?.toString(),
      status: data.status,
      type: data.type,
      duration: data.duration,
      aired: data.aired,
      studios: data.studios,
      genreList: data.genres?.map((g:any) => ({ title: g.name, genreId: g.slug })),
      episodeList: data.episodes?.map((e:any) => ({ title: e.name, episodeId: e.slug, href: `/anime/episode/${e.slug}` })),
    }});
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/episode/:slug", async (req, res) => {
  try {
    let data: any;
    try { data = await otakudesu.streams(req.params.slug); }
    catch { try { data = await animasu.streams(req.params.slug); }
    catch { data = await animeindo.streams(req.params.slug); } }
    res.json({ status:"success", data:{
      title: data.title || "",
      animeId: req.params.slug,
      defaultStreamingUrl: data.streams?.[0]?.url || "",
      server: { qualities: data.streams?.reduce((acc:any, s:any) => {
        const q = acc.find((x:any) => x.title === s.name);
        if(q) q.serverList.push({ title: s.source, url: s.url });
        else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
        return acc;
      }, []) || [] }
    }});
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre", async (req, res) => {
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.genres().catch(() => []),
      animasu.genres().catch(() => []),
      animeindo.genres().catch(() => []),
    ]);
    const all = [...(ot||[]), ...(an||[]), ...(ai||[])];
    const unique = all.filter((g:any, i:number, arr:any[]) => arr.findIndex((x:any) => x.slug === g.slug) === i);
    res.json({ status:"success", data:{ genreList: unique.map((g:any) => ({ title: g.name, genreId: g.slug, href: `/anime/genre/${g.slug}` })) } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/genre/:slug", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { genres: [req.params.slug] }, page } as any).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
    res.json({ status:"success", data:{ animeList: formatAnime(all) } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/schedule", async (req, res) => {
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: "Ongoing" } } as any).catch(() => ({ animes: [] })),
    ]);
    const all = formatAnime([...(ot.animes||[]), ...(an.animes||[])]);
    const days = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
    const perDay = Math.ceil(all.length / 7);
    res.json({ status:"success", data: days.map((day, i) => ({ day, anime_list: all.slice(i*perDay, (i+1)*perDay) })) });
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
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: "" } }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])];
    res.json({ status:"success", data:{ animeList: formatAnime(all) } });
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/anime/server/:serverId", async (req, res) => {
  res.json({ status:"success", data:{ embedUrl: req.params.serverId } });
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
