with open('server.ts', 'r') as f:
    content = f.read()

old = '''    let data: any;
    try { data = await animasu.streams(req.params.slug); }
    catch { try { data = await otakudesu.streams(req.params.slug); }
    catch { data = await animeindo.streams(req.params.slug); } }
    const result = { status:"success", data:{
      title: data.title || "", animeId: req.params.slug,
      defaultStreamingUrl: data.streams?.[0]?.url || "",
      server: { qualities: data.streams?.reduce((acc:any, s:any) => {
        const q = acc.find((x:any) => x.title === s.name);
        if(q) q.serverList.push({ title: s.source, url: s.url });
        else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
        return acc;
      }, []) || [] }
    }};'''

new = '''    let data: any;
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
    }};'''

content = content.replace(old, new)
with open('server.ts', 'w') as f:
    f.write(content)
print("Done!" if old in open('server.ts').read() == False else "Fixed!")
