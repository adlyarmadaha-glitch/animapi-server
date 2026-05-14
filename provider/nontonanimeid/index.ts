import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../index.types.js";
import axios from "axios";

export class NontonAnimeID extends Provider {
  constructor(options?: ProviderOptions) {
    super("nontonanimeid", {
      baseUrl: "https://154.26.137.28",
      cache: true,
      ...options,
    });
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://154.26.137.28/',
      },
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    return { animes: [], hasNext: false };
  }

  async detail(slug: string): Promise<Anime | undefined> {
    return undefined;
  }

  async genres(): Promise<Genre[]> {
    return [];
  }

  async streams(slug: string): Promise<Stream[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams: Stream[] = [];

      // 🔥 HANYA ambil server "Lokal" dan "MP4" (abaikan Mixdrop, Acefile, dll)
      $(".mirrorstream ul li a, .downloads a, .server-list a").each((_, el) => {
        const $el = $(el);
        const name = $el.text().trim() || $el.attr("title") || "";
        const url = $el.attr("href") || $el.attr("src") || "";

        // Filter: hanya ambil yang mengandung "lokal" atau "mp4" (case-insensitive)
        const lowerName = name.toLowerCase();
        if (url && (lowerName.includes("lokal") || lowerName.includes("mp4"))) {
          streams.push({ name, url, source: this.name });
        }
      });

      // Fallback: jika tidak ketemu server lokal/mp4, kosongkan saja
      return streams;
    } catch {
      return [];
    }
  }
}
