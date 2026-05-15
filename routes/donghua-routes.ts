import express from 'express';
import { AnichinDonghua } from '../provider-donghua/anichin/index.js';

const router = express.Router();
const donghuaProvider = new AnichinDonghua();

// Cache sederhana
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

function createResponse(data: any, pagination: any = null) {
  return {
    status: "success",
    creator: "AnimAPI - Donghua",
    source: "anichin-donghua",
    data,
    pagination,
  };
}

// ==================== ENDPOINTS DONGHUA ====================

// Home donghua (ongoing + latest)
router.get('/home', async (req, res) => {
  const key = 'donghua-home';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { keyword: "" } });
    const all = result.animes.map((a: any) => ({
      title: a.title,
      poster: a.posterUrl,
      animeId: a.slug,
      href: `/donghua/anime/${a.slug}`,
      status: a.status,
      type: a.type || "DONGHUA",
      episodes: a.episodes?.length || 0,
      genreList: (a.genres || []).map((g: any) => g.name),
      source: a.source,
    }));

    const response = createResponse({ animeList: all });
    setCache(key, response);
    res.json(response);
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Search donghua
router.get('/search/:keyword', async (req, res) => {
  const key = `donghua-search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({
      filter: { keyword: req.params.keyword }
    });
    
    const all = result.animes.map((a: any) => ({
      title: a.title,
      poster: a.posterUrl,
      animeId: a.slug,
      href: `/donghua/anime/${a.slug}`,
      status: a.status,
      type: a.type || "DONGHUA",
      episodes: a.episodes?.length || 0,
      genreList: (a.genres || []).map((g: any) => g.name),
      source: a.source,
    }));

    const response = createResponse({ animeList: all });
    setCache(key, response);
    res.json(response);
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Detail donghua
router.get('/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `donghua-detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const detail = await donghuaProvider.detail(slug);
    if (!detail?.title) {
      return res.status(404).json({ status: "error", message: "Donghua tidak ditemukan" });
    }

    const response = createResponse({
      title: detail.title,
      poster: detail.posterUrl,
      animeId: detail.slug,
      synopsis: detail.synopsis,
      status: detail.status,
      type: detail.type || "DONGHUA",
      genres: (detail.genres || []).map((g: any) => g.name),
      episodeList: (detail.episodes || []).map((e: any) => ({
        title: e.name,
        episodeId: e.slug,
        href: `/donghua/episode/${e.slug}`,
      })),
    });
    setCache(key, response);
    res.json(response);
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Episode donghua (streaming URL)
router.get('/episode/:slug', async (req, res) => {
  const slug = req.params.slug;

  try {
    const streams = await donghuaProvider.streams(slug);
    if (!streams.length) {
      return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
    }

    res.json(createResponse({
      animeId: slug,
      defaultStreamingUrl: streams[0]?.url || '',
      server: {
        qualities: [{
          title: "HD",
          serverList: streams.map((s: any) => ({
            title: s.name,
            url: s.url,
            source: s.source,
          })),
        }],
      },
    }));
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Genre donghua
router.get('/genre', async (req, res) => {
  const key = 'donghua-genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const genres = await donghuaProvider.genres();
    const response = createResponse({
      genreList: genres.map((g: any) => ({
        title: g.name,
        genreId: g.slug,
        href: `/donghua/genre/${g.slug}`,
      })),
    });
    setCache(key, response);
    res.json(response);
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

export default router;
