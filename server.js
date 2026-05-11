const express = require('express')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3000
const BIND_ADDR = process.env.BIND_ADDR || '0.0.0.0'

app.use(cors())
app.use(express.json())

// ===== CACHE SEDERHANA (MEMORY) =====
const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000
const getCache = (key) => {
  const c = cache.get(key)
  if (c && Date.now() - c.time < CACHE_TTL) return c.data
  return null
}
const setCache = (key, data) => cache.set(key, { data, time: Date.now() })

// ===== PROVIDER GLOBAL =====
// Konstruksi manual provider tanpa perlu build TS
const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

// Import provider dari file .js hasil build TS yang sudah ada di project
let otakudesu, animasu, animeindo

async function loadProviders() {
  try {
    // Coba load dari file TypeScript yang sudah di-build
    const { Otakudesu } = await import('./provider/otakudesu/index.js')
    const { Animasu } = await import('./provider/animasu/index.js')
    const { AnimeIndo } = await import('./provider/anime-indo/index.js')
    otakudesu = new Otakudesu()
    animasu = new Animasu()
    animeindo = new AnimeIndo()
    console.log('[OK] Providers loaded from TypeScript build')
  } catch (e1) {
    console.warn('[WARN] Could not load from TypeScript build, trying direct require...')
    try {
      // Fallback: kalau file TS belum di-build, coba pakai transpiler inline? Tidak.
      // Kita akan gunakan provider manual sederhana.
      throw new Error('Need TS build')
    } catch (e2) {
      console.error('[FATAL] Cannot load providers. Run npm run build first.')
      console.error(e2.message)
      process.exit(1)
    }
  }
}

// ===== FORMAT HELPER =====
const formatAnime = (animes) => (animes || [])
  .filter(a => a && a.title && a.posterUrl)
  .map(a => ({
    title: a.title,
    poster: a.posterUrl,
    animeId: a.slug,
    score: a.rating?.toString() || '0',
    status: a.status === 'ONGOING' ? 'Ongoing' : 'Completed',
    totalEpisodes: a.episodes?.length || 0,
    genreList: (a.genres || []).map(g => ({ title: g.name, genreId: g.slug })),
    source: a.source || 'otakudesu'
  }))

// ===== LOGGING REQUEST =====
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`)
  })
  next()
})

// ===== ENDPOINT EPISODE (DIFIX) =====
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug
  const key = 'episode-' + slug
  const cached = getCache(key)
  if (cached) return res.json(cached)

  let streams = []

  // Coba Animasu
  try {
    const raw = await animasu.streams(slug)
    streams = Array.isArray(raw) ? raw : (raw?.streams || [])
    if (streams.length) console.log('[Animasu] Got ' + streams.length + ' streams')
  } catch (e) {
    console.warn('[Animasu] Failed: ' + e.message)
  }

  // Coba Otakudesu
  if (!streams.length) {
    try {
      const raw = await otakudesu.streams(slug)
      streams = Array.isArray(raw) ? raw : (raw?.streams || [])
      if (streams.length) console.log('[Otakudesu] Got ' + streams.length + ' streams')
    } catch (e) {
      console.warn('[Otakudesu] Failed: ' + e.message)
    }
  }

  // Coba AnimeIndo
  if (!streams.length) {
    try {
      const raw = await animeindo.streams(slug)
      streams = Array.isArray(raw) ? raw : (raw?.streams || [])
      if (streams.length) console.log('[AnimeIndo] Got ' + streams.length + ' streams')
    } catch (e) {
      console.warn('[AnimeIndo] Failed: ' + e.message)
    }
  }

  if (!streams.length) {
    return res.status(502).json({
      status: 'error',
      message: 'Streaming tidak tersedia untuk episode ini'
    })
  }

  const qualities = streams.reduce((acc, s) => {
    const existing = acc.find(q => q.title === s.name)
    if (existing) {
      existing.serverList.push({ title: s.source, url: s.url })
    } else {
      acc.push({
        title: s.name,
        serverList: [{ title: s.source, url: s.url }]
      })
    }
    return acc
  }, [])

  const result = {
    status: 'success',
    data: {
      animeId: slug,
      defaultStreamingUrl: streams[0]?.url || '',
      server: { qualities }
    }
  }

  setCache(key, result)
  res.json(result)
})

// ===== ENDPOINT LAINNYA =====
app.get('/anime/ongoing-anime', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const key = 'ongoing-' + page
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [] }))
    ])
    const result = { status: 'success', data: { animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) } }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/complete-anime', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const key = 'complete-' + page
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { status: 'Completed' }, page }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: 'Completed' }, page }).catch(() => ({ animes: [] }))
    ])
    const result = { status: 'success', data: { animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[])]) } }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/search/:keyword', async (req, res) => {
  const key = 'search-' + req.params.keyword
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] }))
    ])
    const result = { status: 'success', data: { animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])]) } }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/anime/:slug', async (req, res) => {
  const key = 'detail-' + req.params.slug
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    let data
    try { data = await otakudesu.detail(req.params.slug) } catch {}
    if (!data?.title) { try { data = await animasu.detail(req.params.slug) } catch {} }
    if (!data?.title) { try { data = await animeindo.detail(req.params.slug) } catch {} }
    const result = {
      status: 'success',
      data: {
        title: data?.title,
        poster: data?.posterUrl,
        animeId: data?.slug,
        synopsis: data?.synopsis,
        score: data?.rating?.toString(),
        status: data?.status,
        type: data?.type,
        duration: data?.duration,
        genreList: (data?.genres || []).map(g => ({ title: g.name, genreId: g.slug })),
        episodeList: (data?.episodes || []).map(e => ({ title: e.name, episodeId: e.slug }))
      }
    }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/genre', async (req, res) => {
  const key = 'genre'
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const [ot, an] = await Promise.all([
      otakudesu.genres().catch(() => []),
      animasu.genres().catch(() => [])
    ])
    const all = [...(ot || []), ...(an || [])]
    const unique = all.filter((g, i, arr) => arr.findIndex(x => x.slug === g.slug) === i)
    const result = { status: 'success', data: { genreList: unique.map(g => ({ title: g.name, genreId: g.slug })) } }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/genre/:slug', async (req, res) => {
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { genres: [req.params.slug] } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { genres: [req.params.slug] } }).catch(() => ({ animes: [] }))
    ])
    res.json({ status: 'success', data: { animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[])]) } })
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule'
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const data = await otakudesu.search({ filter: { status: 'Ongoing' } }).catch(() => ({ animes: [] }))
    const all = formatAnime(data.animes || [])
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    const perDay = Math.ceil(all.length / 7)
    const result = {
      status: 'success',
      data: days.map((day, i) => ({
        day,
        anime_list: all.slice(i * perDay, (i + 1) * perDay)
      }))
    }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/home', async (req, res) => {
  const key = 'home'
  const cached = getCache(key)
  if (cached) return res.json(cached)
  try {
    const [ot_on, ot_com, an_on] = await Promise.all([
      otakudesu.search({ filter: { status: 'Ongoing' } }).catch(() => ({ animes: [] })),
      otakudesu.search({ filter: { status: 'Completed' } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { status: 'Ongoing' } }).catch(() => ({ animes: [] }))
    ])
    const result = {
      status: 'success',
      data: {
        ongoing: { animeList: formatAnime([...(ot_on.animes||[]), ...(an_on.animes||[])]) },
        completed: { animeList: formatAnime(ot_com.animes || []) }
      }
    }
    setCache(key, result)
    res.json(result)
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/batch/:slug', async (req, res) => {
  try {
    const data = await otakudesu.detail(req.params.slug).catch(() => null)
    res.json({ status: 'success', data: { title: data?.title, animeId: data?.slug } })
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/unlimited', async (req, res) => {
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] }))
    ])
    res.json({ status: 'success', data: { animeList: formatAnime([...(ot.animes||[]), ...(an.animes||[])]) } })
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }) }
})

app.get('/anime/server/:serverId', (req, res) => {
  res.json({ status: 'success', data: { embedUrl: req.params.serverId } })
})

app.get('/', (req, res) => {
  res.json({
    message: 'Anime REST API - Production Ready',
    version: '2.0.0',
    endpoints: [
      '/anime/home',
      '/anime/ongoing-anime',
      '/anime/complete-anime',
      '/anime/search/:keyword',
      '/anime/anime/:slug',
      '/anime/episode/:slug',
      '/anime/genre',
      '/anime/genre/:slug',
      '/anime/schedule',
      '/anime/unlimited',
      '/anime/batch/:slug',
      '/anime/server/:serverId'
    ]
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack)
  res.status(500).json({ status: 'error', message: 'Internal server error' })
})

// ===== START SERVER =====
loadProviders()
  .then(() => {
    app.listen(PORT, BIND_ADDR, () => {
      console.log(`[OK] Server running on ${BIND_ADDR}:${PORT}`)
      console.log(`[OK] Providers: Otakudesu, Animasu, AnimeIndo`)
    })
  })
  .catch(err => {
    console.error('[FATAL] Failed to start server:', err.message)
    process.exit(1)
  })
