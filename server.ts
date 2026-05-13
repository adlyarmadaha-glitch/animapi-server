import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Cache
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

// Provider instances
let Otakudesu: any, Animasu: any, AnimeIndo: any, Samehadaku: any, Anoboy: any, Jikan: any, AniSkip: any, Oploverz: any;
const providers: any[] = [];
const streamProviders: any[] = [];

async function loadProviders() {
  try {
    ({ Otakudesu } = await import('./provider/otakudesu/index.js'));
    const otakudesu = new Otakudesu();
    providers.push(otakudesu); streamProviders.push(otakudesu);
    console.log('✅ Otakudesu loaded');
  } catch(e) { console.warn('⚠️ Otakudesu failed:', (e as Error).message); }

  try {
    ({ Animasu } = await import('./provider/animasu/index.js'));
    const animasu = new Animasu();
    providers.push(animasu); streamProviders.splice(0, 0, animasu);
    console.log('✅ Animasu loaded');
  } catch(e) { console.warn('⚠️ Animasu failed:', (e as Error).message); }

  try {
    ({ AnimeIndo } = await import('./provider/anime-indo/index.js'));
    const animeindo = new AnimeIndo();
    providers.push(animeindo); streamProviders.push(animeindo);
    console.log('✅ AnimeIndo loaded');
  } catch(e) { console.warn('⚠️ AnimeIndo failed:', (e as Error).message); }

  try {
    ({ Samehadaku } = await import('./provider/samehadaku/index.js'));
    const samehadaku = new Samehadaku();
    providers.push(samehadaku); streamProviders.push(samehadaku);
    console.log('✅ Samehadaku loaded');
  } catch(e) { console.warn('⚠️ Samehadaku failed:', (e as Error).message); }

  try {
    ({ Anoboy } = await import('./provider/anoboy/index.js'));
    const anoboy = new Anoboy();
    providers.push(anoboy); streamProviders.push(anoboy);
    console.log('✅ Anoboy loaded');
  } catch(e) { console.warn('⚠️ Anoboy failed:', (e as Error).message); }

  try {
    ({ Jikan } = await import('./provider/jikan/index.js'));
    providers.push(new Jikan());
    console.log('✅ Jikan loaded');
  } catch(e) { console.warn('⚠️ Jikan failed:', (e as Error).message); }

  try {
    ({ AniSkip } = await import('./provider/aniskip/index.js'));
    providers.push(new AniSkip());
    console.log('✅ AniSkip loaded');
  } catch(e) { console.warn('⚠️ AniSkip failed:', (e as Error).message); }

  try {
    ({ Oploverz } = await import('./provider/oploverz/index.js'));
    const oploverz = new Oploverz();
    providers.push(oploverz); streamProviders.push(oploverz);
    console.log('✅ Oploverz loaded');
  } catch(e) { console.warn('⚠️ Oploverz failed:', (e as Error).message); }

  console.log(`🚀 ${providers.length} providers ready`);
}

const fetchWithTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

// Genre standardization
const VALID_GENRES = new Set([
  'action','adventure','comedy','drama','fantasy','horror','mystery','romance','sci-fi',
  'slice of life','sports','supernatural','thriller','mecha','music','historical','military',
  'school','seinen','shounen','shoujo','josei','isekai','psychological','ecchi','harem',
  'magic','martial arts','super power','vampire','samurai','police','game','space','demons',
  'parody','gore','kids','yaoi','yuri','shounen ai','shoujo ai','gender bender','harem',
  'reverse harem','reincarnation','time travel','survival','post-apocalyptic','cyberpunk',
  'steampunk','idol','performing arts','gourmet','work life','adult cast','iyashikei',
  'love polygon','romantic subtext','girls love','boys love','organized crime','suspense',
  'award winning','mythology','pets','crossdressing','ensemble cast','family','found family',
  'dragon','zombie','ghost','monster','alien','robot','donghua','petualangan','aksi','komedi',
  'fantasi','romansa','sejarah','psikologis','sihir','sekolahan','misteri','olahraga',
  'supranatural','drama','horor','mecha','musik','militer','polisi','samurai','game',
  'luar angkasa','iblis','vampir','zombie','hantu','monster','alien','robot','crossdressing',
  'idola','gourmet','pekerjaan','mitologi','reinkarnasi','waktu','survival',
  'pasca-apokaliptik','cyberpunk','steampunk','anak-anak','dewasa'
]);

const GENRE_MAP: Record<string, string> = {
  'scifi':'sci-fi','science fiction':'sci-fi','slice of life':'slice of life','slice-of-life':'slice of life',
  'super power':'super power','superpower':'super power','super-power':'super power',
  'super natural':'supernatural','supranatural':'supernatural','martial arts':'martial arts',
  'martial-arts':'martial arts','demon':'demons','demons':'demons','iblis':'demons',
  'vampire':'vampire','vampir':'vampire','zombie':'zombie','zombi':'zombie','ghost':'ghost',
  'hantu':'ghost','magic':'magic','sihir':'magic','performing arts':'performing arts',
  'girls love':'girls love','yuri':'girls love','boys love':'boys love','yaoi':'boys love',
  'shounen ai':'boys love','shoujo ai':'girls love','gourmet':'gourmet','kuliner':'gourmet',
  'food':'gourmet','organized crime':'organized crime','mafia':'organized crime','yakuza':'organized crime',
  'adult cast':'adult cast','dewasa':'adult cast','iyashikei':'iyashikei','healing':'iyashikei',
  'idol':'idol','idola':'idol','donghua':'donghua','china':'donghua','mitologi':'mythology',
  'mythology':'mythology','reinkarnasi':'reincarnation','reincarnation':'reincarnation',
  'waktu':'time travel','time travel':'time travel','survival':'survival',
  'pasca-apokaliptik':'post-apocalyptic','post-apocalyptic':'post-apocalyptic',
  'post apocalyptic':'post-apocalyptic','cyberpunk':'cyberpunk','steampunk':'steampunk',
  'aksi':'action','petualangan':'adventure','komedi':'comedy','fantasi':'fantasy',
  'romansa':'romance','sejarah':'historical','psikologis':'psychological',
  'sekolahan':'school','misteri':'mystery','olahraga':'sports','musik':'music',
  'militer':'military','polisi':'police','samurai':'samurai','game':'game',
  'luar angkasa':'space','otaku culture':'otaku culture','ecchi':'ecchi','harem':'harem',
  'isekai':'isekai','shounen':'shounen','shoujo':'shoujo','seinen':'seinen','josei':'josei',
  'mecha':'mecha'
};

function cleanGenre(g: string): string {
  const cleaned = g.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
  if (GENRE_MAP[cleaned]) return GENRE_MAP[cleaned];
  if (VALID_GENRES.has(cleaned)) return cleaned;
  for (const valid of VALID_GENRES) {
    if (cleaned.includes(valid) || valid.includes(cleaned)) return valid;
  }
  return cleaned;
}

function cleanTitle(title: string): string {
  return title
    .replace(/subtitle indonesia/gi, '')
    .replace(/sub indo/gi, '')
    .replace(/season \d+/gi, '')
    .replace(/part \d+/gi, '')
    .replace(/episode \d+/gi, '')
    .replace(/batch/gi, '')
    .replace(/bd/gi, '')
    .replace(/\b(serial|tv|movie|ova|ona|special|live action|series)\b/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// MAL ID database
const malIdDB: Record<string, number> = {
  "one piece": 21, "naruto": 20, "naruto shippuden": 1735, "boruto": 34566,
  "bleach": 269, "dragon ball": 813, "attack on titan": 16498, "demon slayer": 38000,
  "jujutsu kaisen": 40748, "my hero academia": 31964, "black clover": 34572,
  "sword art online": 11757, "tokyo ghoul": 22319, "one punch man": 30276,
  "hunter x hunter": 11061, "fullmetal alchemist": 5114, "death note": 1535,
  "fairy tail": 6702, "gintama": 918, "re zero": 31240, "konosuba": 30831,
  "steins gate": 9253, "code geass": 1575, "gurren lagann": 2001, "cowboy bebop": 1,
  "samurai champloo": 205, "trigun": 6, "neon genesis evangelion": 30, "monster": 19,
  "mushishi": 457, "violet evergarden": 33352, "mob psycho 100": 32182, "haikyuu": 20583,
  "kuroko no basket": 11771, "yuri on ice": 32995, "food wars": 28171, "your lie in april": 23273,
  "anohana": 9989, "clannad": 2167, "angel beats": 6547, "toradora": 4224,
  "bunny girl senpai": 35247, "erased": 31043, "psycho pass": 13601, "made in abyss": 34599,
  "the promised neverland": 37779, "dr stone": 38691, "fire force": 38671, "spy x family": 50265,
  "chainsaw man": 44511, "solo leveling": 52299, "frieren": 52991, "oshi no ko": 52034,
  "bocchi the rock": 50311, "lycoris recoil": 50060, "summertime render": 50594,
  "ranking of kings": 40834, "odd taxi": 46102, "vivy": 49826, "tokyo revengers": 42203,
  "kaguya sama": 35203, "komi can't communicate": 48926, "dress up darling": 48736,
  "call of the night": 49320, "dan da dan": 54724, "kaiju no 8": 52505, "wind breaker": 56425,
  "blue lock": 49596, "kingdom": 120, "vinland saga": 37521, "berserk": 33, "vagabond": 656
};

// Dedup & format
const seenSlugs = new Set<string>();
const resetSeenSlugs = () => seenSlugs.clear();

function cleanText(t: string): string {
  return t?.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

const formatAnimeList = (anime: any) => {
  const title = cleanText(anime.title);
  const slug = cleanText(anime.slug || anime.animeId || '');
  if (!slug || !title) return null;
  if (seenSlugs.has(slug)) return null;
  seenSlugs.add(slug);
  return {
    title,
    poster: anime.posterUrl,
    animeId: slug,
    href: `/anime/anime/${slug}`,
    status: anime.status,
    type: anime.type || null,
    score: anime.rating?.toString() || null,
    episodes: anime.episodes?.length || null,
    synopsis: anime.synopsis?.substring(0, 150) || null,
    genreList: [...new Set(
      (anime.genres || []).map((g: any) => cleanGenre(typeof g === 'string' ? g : g.name))
        .filter((g: string) => g && g.trim() !== '' && VALID_GENRES.has(g))
    )],
    source: anime.source,
  };
};

// ==================== ENDPOINTS ====================

app.get('/anime/home', async (req, res) => {
  resetSeenSlugs();
  const key = 'home';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    let ongoing: any[] = [], completed: any[] = [];
    if (ot) {
      const [on, com] = await Promise.allSettled([
        fetchWithTimeout(ot.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(ot.search({ filter: { status: 'Completed' } }))
      ]);
      ongoing = (on.status === 'fulfilled' ? on.value.animes || [] : []).slice(0, 12).map(formatAnimeList).filter(Boolean).filter(Boolean);
      completed = (com.status === 'fulfilled' ? com.value.animes || [] : []).slice(0, 10).map(formatAnimeList).filter(Boolean).filter(Boolean);
    }
    const result = createResponse({ ongoing: { animeList: ongoing }, completed: { animeList: completed } });
    setCache(key, result);
    res.json(result);
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

const listEndpoint = (status: string) => async (req: express.Request, res: express.Response) => {
  resetSeenSlugs();
  const page = parseInt(req.query.page as string) || 1;
  const key = `${status}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { status }, page })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean).filter(Boolean);
  const hasNext = results.some((r: any) => r.status === 'fulfilled' && r.value?.hasNext);
  const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
  setCache(key, result);
  res.json(result);
};

app.get('/anime/ongoing-anime', listEndpoint('Ongoing'));
app.get('/anime/complete-anime', listEndpoint('Completed'));

app.get('/anime/search/:keyword', async (req, res) => {
  resetSeenSlugs();
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { keyword: req.params.keyword } })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean).filter(Boolean);
  setCache(key, createResponse({ animeList: all }));
  res.json(createResponse({ animeList: all }));
});

app.get('/anime/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  let data: any;
  for (const p of providers.filter((pp: any) => pp.detail)) {
    try { data = await fetchWithTimeout(p.detail(slug)); if (data?.title) break; } catch {}
  }
  if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
  const detail = {
    title: data.title,
    poster: data.posterUrl,
    animeId: data.slug,
    synopsis: data.synopsis,
    score: data.rating?.toString() || null,
    status: data.status,
    type: data.type,
    studios: data.studios || [],
    genres: (data.genres || []).map((g: any) => cleanGenre(typeof g === 'string' ? g : g.name)).filter((g: string) => VALID_GENRES.has(g)),
    episodeList: (data.episodes || []).map((e: any) => ({ title: e.name, episodeId: e.slug, href: `/anime/episode/${e.slug}` })),
  };
  const result = createResponse(detail);
  setCache(key, result);
  res.json(result);
});

app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const results = await Promise.allSettled(
    streamProviders.map((p: any) => fetchWithTimeout(p.streams(slug)).catch(() => undefined))
  );
  const allStreams: any[] = [];
  results.forEach((r: any, idx: number) => {
    if (r.status === 'fulfilled') {
      const raw = r.value;
      const streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      streams.forEach((s: any) => allStreams.push({ ...s, provider: s.source || streamProviders[idx].name }));
    }
  });
  if (!allStreams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
  const qualities = Array.from(
    allStreams.reduce((map: any, s: any) => {
      const qual = s.name || 'Unknown';
      if (!map.has(qual)) map.set(qual, []);
      map.get(qual)!.push({ title: s.provider, url: s.url });
      return map;
    }, new Map<string, any[]>())
  ).map(([title, serverList]: any) => ({ title, serverList }));
  res.json(createResponse({
    animeId: slug,
    defaultStreamingUrl: allStreams[0]?.url || '',
    server: { qualities },
  }));
});

// ==================== SKIP INTRO ====================
app.get('/anime/skip/:slug', async (req, res) => {
  const slug = req.params.slug;
  const episode = parseInt(req.query.episode as string) || 1;
  let animeTitle = '', cleanName = '';
  for (const p of providers.filter((pp: any) => pp.detail && pp.name !== 'jikan' && pp.name !== 'aniskip')) {
    try {
      const detail = await fetchWithTimeout(p.detail(slug));
      if (detail?.title) {
        animeTitle = detail.title;
        cleanName = cleanTitle(detail.title).toLowerCase();
        break;
      }
    } catch {}
  }
  if (!animeTitle) return res.status(404).json({ status: 'error', message: 'Anime tidak ditemukan' });

  let malId: number | null = malIdDB[cleanName] || null;
  if (!malId) {
    for (const [key, val] of Object.entries(malIdDB)) {
      if (cleanName.includes(key) || key.includes(cleanName)) { malId = val; break; }
    }
  }
  if (!malId) {
    try {
      const axios = (await import('axios')).default;
      const res = await axios.get('https://api.jikan.moe/v4/anime', { params: { q: cleanName, type: 'tv', limit: 1 }, timeout: 5000 });
      if (res.data?.data?.length > 0) malId = res.data.data[0].mal_id;
    } catch {}
  }
  if (!malId) return res.status(404).json({ status: 'error', message: 'MAL ID tidak ditemukan', searched: cleanName });

  const aniskip = providers.find((p: any) => p.name === 'aniskip');
  if (!aniskip) return res.status(502).json({ status: 'error', message: 'AniSkip tidak tersedia' });
  try {
    const timestamps = await aniskip.getTimestamps(malId, episode);
    res.json(createResponse({
      mal_id: malId, episode, title: animeTitle,
      skip_times: (timestamps || []).map((t: any) => ({
        type: t.skipType || 'unknown',
        start: t.interval?.startTime || 0,
        end: t.interval?.endTime || 0,
      })),
    }));
  } catch(e: any) { res.status(502).json({ status: 'error', message: 'Gagal ambil timestamp' }); }
});

// Genre list
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const genreProvs = providers.filter((p: any) => p.genres && p.name !== 'jikan');
  const results = await Promise.allSettled(genreProvs.map((p: any) => p.genres().catch(() => [])));
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value || []);
  const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.slug === g.slug) === i);
  const result = createResponse({
    genreList: unique.map((g: any) => ({
      title: cleanGenre(g.name),
      genreId: cleanGenre(g.slug),
      href: `/anime/genre/${cleanGenre(g.slug)}`,
    }))
  });
  setCache(key, result);
  res.json(result);
});

// Anime by genre
app.get('/anime/genre/:slug', async (req, res) => {
  resetSeenSlugs();
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { genres: [req.params.slug] }, page })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean).filter(Boolean);
  res.json(createResponse({ animeList: all }, { currentPage: page }));
});

// Schedule
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    if (!ot) throw new Error('Otakudesu not available');
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const schedule = await Promise.all(days.map(async (day: string) => {
      try {
        const slugs: string[] = await ot.searchByDay(day);
        const animes = await Promise.all(slugs.map((s: string) => ot.detail(s).catch(() => null)));
        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          anime_list: animes.filter(Boolean).map((a: any) => ({ title: a.title, slug: a.slug, poster: a.posterUrl })),
        };
      } catch { return { day, anime_list: [] }; }
    }));
    setCache(key, createResponse({ schedule }));
    res.json(createResponse({ schedule }));
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Batch
app.get('/anime/batch/:slug', async (req, res) => {
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    let data = ot ? await ot.detail(req.params.slug).catch(() => null) : null;
    if (!data?.title) {
      const an = streamProviders.find((p: any) => p.name === 'animasu');
      if (an) data = await an.detail(req.params.slug).catch(() => null);
    }
    res.json(createResponse({ title: data?.title, animeId: data?.slug || req.params.slug, batches: data?.batches || [] }));
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Server embed
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

// Unlimited
app.get('/anime/unlimited', async (req, res) => {
  resetSeenSlugs();
  try {
    const results = await Promise.allSettled(
      providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { keyword: '' } })).catch(() => undefined))
    );
    const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean).filter(Boolean);
    res.json(createResponse({ animeList: all }));
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Root
app.get('/', (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  res.json({
    status: "success",
    creator: "Animapi",
    message: "Anime REST API - Production Ready",
    version: "3.0.0",
    base_url: baseUrl,
    endpoints: {
      home: '/anime/home',
      ongoing: '/anime/ongoing-anime?page=1',
      completed: '/anime/complete-anime?page=1',
      search: '/anime/search/:keyword',
      detail: '/anime/anime/:slug',
      episode: '/anime/episode/:slug',
      genre_list: '/anime/genre',
      genre_anime: '/anime/genre/:slug',
      schedule: '/anime/schedule',
      skip_intro: '/anime/skip/:slug?episode=1',
      batch: '/anime/batch/:slug',
      server: '/anime/server/:serverId',
      unlimited: '/anime/unlimited'
    },
    providers: ['otakudesu', 'animasu', 'animeindo', 'samehadaku', 'anoboy', 'oploverz', 'jikan'],
    features: ['multi-provider', 'skip-intro', 'schedule', 'download-batch']
  });
});

loadProviders().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
}).catch((err: Error) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
