import axios, { AxiosStatic } from "axios";
import { Cache } from "../cache";
import * as cheerio from "cheerio";
import pLimit, { LimitFunction } from "p-limit";
import { Anime, Genre, ProviderOptions, SearchOptions, SearchResult, Stream } from "./index.types";

export abstract class Provider {
  protected cache: Cache;
  protected api: AxiosStatic;
  protected cheerio: typeof cheerio;
  protected limit: LimitFunction;
  protected baseUrl: string;

  constructor(public readonly name: string, public options: ProviderOptions) {
    this.baseUrl = options?.baseUrl || "";
    this.cache = new Cache();  // cache internal sederhana
    this.api = axios;
    this.cheerio = cheerio;
    this.limit = pLimit(3);
  }

  abstract search(options?: SearchOptions): Promise<SearchResult>;
  abstract detail(slug: string): Promise<Anime | undefined>;
  abstract genres(): Promise<Genre[]>;
  abstract streams(slug: string): Promise<Stream[]>;
}
