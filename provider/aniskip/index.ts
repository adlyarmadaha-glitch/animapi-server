import { Provider } from "../index.js";

export class AniSkip extends Provider {
  constructor() {
    super("aniskip", { baseUrl: "https://api.aniskip.com", cache: true });
  }

  // Provider abstract methods (tidak digunakan)
  async search() { return { animes: [], hasNext: false }; }
  async detail() { return undefined; }
  async genres() { return []; }
  async streams() { return []; }

  /**
   * Mengambil timestamp skip dari AniSkip API
   * @param malId MyAnimeList ID
   * @param episode Nomor episode (1-based)
   */
  async getTimestamps(malId: number, episode: number) {
    const cacheKey = `aniskip-${malId}-${episode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.api.get(
        `${this.baseUrl}/v2/skip-times/${malId}/${episode}?types=opening&types=ending&episodeLength=0`
      );
      const data = res.data;
      if (data.statusCode === 200 && data.results) {
        this.cache.set(cacheKey, data.results);
        return data.results;
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}
