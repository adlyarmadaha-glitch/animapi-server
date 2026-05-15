import { Provider } from "../../provider/index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../../provider/index.types.js";
import axios from "axios";

export class AnichinDonghua extends Provider {
  constructor(options?: ProviderOptions) {
    super("anichin-donghua", {
      baseUrl: "https://anichin.cafe",
      cache: true,
      ...options,
    });
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://anichin.cafe/',
      },
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    try {
      const url = keyword
        ? `${this.baseUrl}/?s=${encodeURIComponent(keyword)}&page=${page}`
        : `${this.baseUrl}/page/${page}/`;
      const res = await this.api.get(url);
      const $ = this.cheerio.load(res.data);
      const slugs: string[] = [];
      
      // Cari link seri: /seri/nama-seri/
      $("a[href*='/seri/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const match = href.match(/\/seri\/([^/]+)\/?/);
          if (match && match[1] && !slugs.includes(match[1])) {
            slugs.push(match[1]);
          }
        }
      });

      const animes = (await Promise.all(
        slugs.slice(0, 10).map(slug => this.limit(() => this.detail(slug)).catch(() => undefined))
      )).filter((a): a is Anime => a !== undefined);

      return { animes, hasNext: $(".pagination .next").length > 0 };
    } catch (e) {
      console.error('[Donghua] Search error:', e);
      return { animes: [], hasNext: false };
    }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`donghua-${slug}`);
    if (cached) return cached;

    try {
      const res = await this.api.get(`${this.baseUrl}/seri/${slug}/`);
      const $ = this.cheerio.load(res.data);
      
      // Judul dari h1 atau dari struktur spesifik anichin.cafe
      const title = $("h1.entry-title").text().trim() || $(".data h1").text().trim() || slug.replace(/-/g, ' ');
      const posterUrl = $(".thumb img, .poster img, img.attachment-").attr("src") || "";
      const synopsis = $(".sinopc p, .entry-content p, .synopsis p").first().text().trim() || "";

      // Genre
      const genres: Genre[] = [];
      $(".genxed a, .genre-info a, .genres a, a[href*='/genre/']").each((_, el) => {
        const name = $(el).text().trim();
        if (name) genres.push({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), source: this.name });
      });

      // Episodes (dari berbagai kemungkinan selector)
      const episodes: Episode[] = [];
      $(".eplister li a, .episodelist li a, .bxcl ul li a, a[href*='/episode/']").each((_, el) => {
        const $a = $(el);
        const name = $a.text().trim();
        const href = $a.attr("href") || "";
        const epSlug = href.replace(/\/$/, "").split("/").pop() || "";
        if (name && epSlug) episodes.push({ name, slug: epSlug, source: this.name });
      });

      const data: Anime = {
        slug, title, posterUrl, synopsis, rating: 0,
        genres, episodes, batches: [],
        status: "UNKNOWN", type: "DONGHUA",
        studios: [], producers: [], characterTypes: [],
        source: this.name,
      };

      this.cache.set(`donghua-${slug}`, data);
      return data;
    } catch { return undefined; }
  }

  async genres(): Promise<Genre[]> { return []; }

  async streams(slug: string): Promise<Stream[]> {
    try {
      // Coba beberapa kemungkinan URL episode
      const urls = [
        `${this.baseUrl}/episode/${slug}/`,
        `${this.baseUrl}/seri/${slug}/`,
        `${this.baseUrl}/?p=${slug}`,
      ];
      
      for (const url of urls) {
        try {
          const res = await this.api.get(url);
          const $ = this.cheerio.load(res.data);
          const streams: Stream[] = [];
          
          $(".mirrorstream ul li a, iframe, video source, .player-embed iframe").each((_, el) => {
            const src = $(el).attr("src") || $(el).attr("href") || "";
            const name = $(el).text().trim() || $(el).attr("title") || "Stream";
            if (src && src.startsWith("http")) {
              streams.push({ name, url: src, source: this.name });
            }
          });

          if (streams.length > 0) return streams;
        } catch {}
      }
      return [];
    } catch { return []; }
  }
}
