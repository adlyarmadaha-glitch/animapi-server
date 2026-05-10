import re
with open('server.ts', 'r') as f:
    content = f.read()
old = '''try { data = await otakudesu.streams(req.params.slug); }
    catch { try { data = await animasu.streams(req.params.slug); }
    catch { data = await animeindo.streams(req.params.slug); } }'''
new = '''try { data = await animasu.streams(req.params.slug); }
    catch { try { data = await otakudesu.streams(req.params.slug); }
    catch { data = await animeindo.streams(req.params.slug); } }'''
content = content.replace(old, new)
with open('server.ts', 'w') as f:
    f.write(content)
print("Done!")
