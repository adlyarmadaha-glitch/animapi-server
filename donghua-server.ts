import express from 'express';
import cors from 'cors';
import { AnichinDonghua } from './provider-donghua/anichin/index.js';

const app = express();
const PORT = process.env.DONGHUA_PORT || 3002;

app.use(cors());
app.use(express.json());

const donghua = new AnichinDonghua();

app.get('/home/:page?', async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  try {
    const result = await donghua.search({ filter: { page } });
    res.json({ status: 'success', data: { animeList: result.animes } });
  } catch(e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.get('/search/:keyword/:page?', async (req, res) => {
  const { keyword } = req.params;
  const page = parseInt(req.params.page) || 1;
  try {
    const result = await donghua.search({ filter: { keyword, page } });
    res.json({ status: 'success', data: { animeList: result.animes } });
  } catch(e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.get('/detail/:slug', async (req, res) => {
  try {
    const detail = await donghua.detail(req.params.slug);
    if (!detail) return res.status(404).json({ status: 'error', message: 'Not found' });
    res.json({ status: 'success', data: detail });
  } catch(e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.get('/episode/:slug', async (req, res) => {
  try {
    const streams = await donghua.streams(req.params.slug);
    res.json({ status: 'success', data: { streams } });
  } catch(e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 Donghua server on port ${PORT}`));
