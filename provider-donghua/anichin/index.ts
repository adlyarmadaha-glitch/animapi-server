import { Provider } from "../../provider/index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../../provider/index.types.js";
import axios from "axios";

export class AnichinDonghua extends Provider {
  constructor(options?: ProviderOptions) {
    super("anichin-donghua", {
      baseUrl: "https://anichin.co",
      cache: true,
      ...options,
    });
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://anichin.co/',
      },
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    try {
      const url = keyword
        ? `${this.baseUrl}/?s=${encodeURIComponent(keyword)}&page=${page}`
        : `${this.baseUrl}/donghua/page/${page}/`;
      const res = await this.api.get(url);
      const $ = this.cheerio.load(res.data);
      const slugs: string[] = [];
      
      $(".listupd .bs a, .animepost a, article a[href*='/donghua/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const parts = href.replace(/\/$/, "").split("/");
          const slug = parts[parts.length - 1] || "";
          if (slug && !slugs.includes(slug)) slugs.push(slug);
        }
      });

      const animes = (await Promise.all(
        slugs.slice(0, 10).map(slug => this.limit(() => this.detail(slug)).catch(() => undefined))
      )).filter((a): a is Anime => a !== undefined);

      return { animes, hasNext: $(".pagination .next").length > 0 };
    } catch {
      return { animes: [], hasNext: false };
    }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`donghua-${slug}`);
    if (cached) return cached;

    try {
      const res = await this.api.get(`${this.baseUrl}/donghua/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const title = $("h1.entry-title").text().trim();
      const posterUrl = $(".thumb img, .anime-thumb img").attr("src") || "";
      const synopsis = $(".sinopc p, .entry-content p").first().text().trim();

      // Genre
      const genres: Genre[] = [];
      $(".genxed a, .genre-info a, .genres a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const gSlug = href.split("/").filter(Boolean).pop() || name.toLowerCase();
        if (name) genres.push({ name, slug: gSlug, source: this.name });
      });

      // Episode (dari berbagai kemungkinan selector)
      const episodes: Episode[] = [];
      $(".eplister li a, .episodelist li a, .bxcl ul li a").each((_, el) => {
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
      const res = await this.api.get(`${this.baseUrl}/donghua/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams: Stream[] = [];
      
      // Cari server streaming (termasuk ok.ru)
      $(".mirrorstream ul li a, .player-embed iframe, .downloads a").each((_, el) => {
        const url = $(el).attr("src") || $(el).attr("href") || "";
        const name = $(el).text().trim() || $(el).attr("title") || "Stream";
        if (url && url.startsWith("http")) {
          const label = url.includes("ok.ru") ? `OK.ru - ${name}` : name;
          streams.push({ name: label, url, source: this.name });
        }
      });

      return streams;
    } catch { return []; }
  }
}
