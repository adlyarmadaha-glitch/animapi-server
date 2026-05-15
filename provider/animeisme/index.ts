import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../index.types.js";

export class Animeisme extends Provider {
  constructor(options?: ProviderOptions) {
    super("animeisme", { baseUrl: "https://animeisme.com", cache: true, ...options });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    try {
      const res = await this.api.get(`${this.baseUrl}/page/${page}/`, { params: { s: keyword } });
      const $ = this.cheerio.load(res.data);
      const slugs = [];
      $(".animepost a, .listupd .bs a, article a[href*='/anime/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const slug = href.split("/anime/")[1]?.replace("/", "").trim();
          if (slug) slugs.push(slug);
        }
      });
      const animes = (await Promise.all(slugs.map(slug => this.limit(() => this.detail(slug))))).filter(a => a !== undefined);
      return { animes, hasNext: $(".pagination .next, .hpage .r").length > 0 };
    } catch { return { animes: [], hasNext: false }; }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    try {
      const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const title = $("h1.entry-title").text().trim();
      const posterUrl = $(".thumb img").attr("src") || "";
      const episodes = [];
      $(".eplister li a").each((_, el) => {
        const $a = $(el);
        const name = $a.text().trim();
        const href = $a.attr("href") || "";
        const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
        episodes.push({ name, slug: epSlug, source: this.name });
      });
      return { slug, title, posterUrl, episodes, genres: [], batches: [], status: "UNKNOWN", type: "TV", studios: [], producers: [], characterTypes: [], source: this.name, rating: 0, synopsis: "" };
    } catch { return undefined; }
  }

  async genres(): Promise<Genre[]> { return []; }
  async streams(slug: string): Promise<Stream[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams = [];
      $(".mirrorstream ul li a, .downloads a, iframe").each((_, el) => {
        const url = $(el).attr("src") || $(el).attr("href") || "";
        if (url.startsWith("http")) streams.push({ name: $(el).text().trim() || "Stream", url, source: this.name });
      });
      return streams;
    } catch { return []; }
  }
}
