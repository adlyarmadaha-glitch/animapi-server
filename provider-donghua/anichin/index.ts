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
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://anichin.cafe/' },
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
      $("a[href*='/seri/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const match = href.match(/\/seri\/([^/]+)\/?/);
          if (match && match[1] && !slugs.includes(match[1])) slugs.push(match[1]);
        }
      });
      const animes = (await Promise.all(
        slugs.slice(0, 10).map(slug => this.limit(() => this.detail(slug)).catch(() => undefined))
      )).filter((a): a is Anime => a !== undefined);
      return { animes, hasNext: $(".pagination .next").length > 0 };
    } catch { return { animes: [], hasNext: false }; }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`donghua-${slug}`);
    if (cached) return cached;
    try {
      const res = await this.api.get(`${this.baseUrl}/seri/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const title = $("h1.entry-title").text().trim() || slug.replace(/-/g, ' ');
      const posterUrl = $(".thumb img, .poster img").attr("src") || "";
      const synopsis = $(".entry-content p").first().text().trim() || "";
      const episodes: Episode[] = [];
      $("a[href*='/episode/']").each((_, el) => {
        const $a = $(el);
        const name = $a.text().trim();
        const href = $a.attr("href") || "";
        const epSlug = href.replace(/\/$/, "").split("/").pop() || "";
        if (name && epSlug) episodes.push({ name, slug: epSlug, source: this.name });
      });
      const data: Anime = { slug, title, posterUrl, synopsis, rating: 0, genres: [], episodes, batches: [], status: "UNKNOWN", type: "DONGHUA", studios: [], producers: [], characterTypes: [], source: this.name };
      this.cache.set(`donghua-${slug}`, data);
      return data;
    } catch { return undefined; }
  }

  async genres(): Promise<Genre[]> { return []; }

  async streams(slug: string): Promise<Stream[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams: Stream[] = [];
      $(".mirrorstream ul li a, iframe").each((_, el) => {
        const url = $(el).attr("src") || $(el).attr("href") || "";
        if (url && url.startsWith("http")) streams.push({ name: $(el).text().trim() || "Stream", url, source: this.name });
      });
      return streams;
    } catch { return []; }
  }
}
