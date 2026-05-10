app.get("/anime/episode/:slug", async (req, res) => {
  const key = `episode-${req.params.slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let streams: any[] = [];
    try {
      const raw = await animasu.streams(req.params.slug);
      streams = Array.isArray(raw) ? raw : (raw.streams || []);
    } catch {
      try {
        const raw = await otakudesu.streams(req.params.slug);
        streams = Array.isArray(raw) ? raw : (raw.streams || []);
      } catch {
        try {
          const raw = await animeindo.streams(req.params.slug);
          streams = Array.isArray(raw) ? raw : (raw.streams || []);
        } catch {}
      }
    }
    const result = { status:"success", data:{
      title: "", animeId: req.params.slug,
      defaultStreamingUrl: streams[0]?.url || "",
      server: { qualities: streams.reduce((acc:any, s:any) => {
        const q = acc.find((x:any) => x.title === s.name);
        if(q) q.serverList.push({ title: s.source, url: s.url });
        else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
        return acc;
      }, []) }
    }};
    setCache(key, result);
    res.json(result);
  } catch(e:any){ res.status(500).json({ error: e.message }); }
});
