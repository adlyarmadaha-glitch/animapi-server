import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { Cache } from "../cache.js";
import type {
  Anime, Genre, ProviderOptions, SearchOptions, SearchResult, Stream
} from "./index.types.js";

export abstract class Provider {
  protected cache: Cache;
  protected api = axios;
  protected cheerio = cheerio;
  protected limit = pLimit(3);
  protected baseUrl: string;
  public readonly name: string;
  public options: ProviderOptions;

  constructor(name: string, options: ProviderOptions = {}) {
    this.name = name;
    this.baseUrl = options.baseUrl || "";
    this.options = { cache: true, ...options };
    this.cache = new Cache(undefined, 3600);
  }

  abstract search(options?: SearchOptions): Promise<SearchResult>;
  abstract detail(slug: string): Promise<Anime | undefined>;
  abstract genres(): Promise<Genre[]>;
  abstract streams(slug: string): Promise<Stream[]>;
}
