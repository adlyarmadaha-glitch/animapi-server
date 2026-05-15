import { Provider } from "../../provider/index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../../provider/index.types.js";
import axios from "axios";

export class AnichinDonghua extends Provider {
  constructor(options?: ProviderOptions) {
    super("anichin-donghua", {
      baseUrl: "https://anichin.rest",
      cache: true,
      ...options,
    });
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://anichin.rest/',
      },
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    try {
      const res = await this.api.get(`${this.baseUrl}/page/${page}/`, {
        params: { s: keyword },
      });
      const $ = this.cheerio.load(res.data);
      const slugs: string[] = [];
      
      // Cari semua link donghua
      $(".listupd .bs a, .animepost a, article a[href*='/anime/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const slug = href.split("/anime/")[1]?.replace("/", "").trim();
          if (slug) slugs.push(slug);
        }
      });

      const animes = (await Promise.all(
        slugs.map(slug => this.limit(() => this.detail(slug)))
      )).filter((a): a is Anime => a !== undefined);

      const hasNext = $(".pagination .next, .hpage .r").length > 0;
      return { animes, hasNext };
    } catch {
      return { animes: [], hasNext: false };
    }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`donghua-detail-${slug}`);
    if (cached && this.options.cache) return cached;

    try {
      const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`);
      const $ = this.cheerio.load(res.data);

      const title = $("h1.entry-title").text().trim();
      const posterUrl = $(".thumb img").attr("src") || "";
      const synopsis = $(".sinopc p, .entry-content p").first().text().trim();

      // Genre
      const genres: Genre[] = [];
      $(".genxed a, .genre-info a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
        genres.push({ name, slug: gSlug, source: this.name });
      });

      // Episode
      const episodes: Episode[] = [];
      $(".eplister li a").each((_, el) => {
        const $a = $(el);
        const name = $a.text().trim();
        const href = $a.attr("href") || "";
        const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
        episodes.push({ name, slug: epSlug, source: this.name });
      });

      const data: Anime = {
        slug,
        title,
        posterUrl,
        synopsis,
        rating: 0,
        genres,
        episodes,
        batches: [],
        status: "UNKNOWN",
        type: "DONGHUA",
        studios: [],
        producers: [],
        characterTypes: [],
        source: this.name,
      };

      if (this.options.cache) this.cache.set(`donghua-detail-${slug}`, data);
      return data;
    } catch {
      return undefined;
    }
  }

  async genres(): Promise<Genre[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/genres/`);
      const $ = this.cheerio.load(res.data);
      const genres: Genre[] = [];
      $(".genrelist a, .taxonomy-description a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const slug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
        genres.push({ name, slug, source: this.name });
      });
      return genres;
    } catch {
      return [];
    }
  }

  async streams(slug: string): Promise<Stream[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams: Stream[] = [];

      // 🔥 PRIORITAS: cari server ok.ru
      $(".mirrorstream ul li a, .downloads a, iframe").each((_, el) => {
        const url = $(el).attr("src") || $(el).attr("href") || "";
        const name = $(el).text().trim() || "Stream";
        
        if (url && url.startsWith("http")) {
          // Tandai server ok.ru dengan label khusus
          if (url.includes("ok.ru")) {
            streams.push({ name: `OK.ru - ${name}`, url, source: this.name });
          } else {
            streams.push({ name, url, source: this.name });
          }
        }
      });

      return streams;
    } catch {
      return [];
    }
  }
}
