"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimeIndo = void 0;
const __1 = require("../index.js");
const utils_1 = require("../../utils/index.js");
class AnimeIndo extends __1.Provider {
    constructor(options) {
        super("anime-indo", Object.assign({ baseUrl: "https://anime-indo.lol", cache: true }, options));
    }
    search(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { keyword, type, genres, alphabet, page = 1 } = (options === null || options === void 0 ? void 0 : options.filter) || {};
            const slugs = [];
            const genre = genres === null || genres === void 0 ? void 0 : genres[0];
            const res = yield this.api.get(alphabet
                ? `${this.baseUrl}/anime-list/`
                : genre
                    ? `${this.baseUrl}/genres/${genre}/`
                    : type == "Movie"
                        ? `${this.baseUrl}/movie/page/${page}/`
                        : keyword
                            ? `${this.baseUrl}/search/${keyword}/`
                            : this.baseUrl);
            const $ = this.cheerio.load(res.data);
            let hasNext = $("a").filter((_, el) => {
                return $(el).text().replace(/\s+/g, "").trim() === "»";
            }).length >= 1;
            if (alphabet) {
                const preSlugs = [];
                $("#content-wrap .menu .anime-list a").each((_, el) => {
                    var _a;
                    const $a = $(el);
                    if ($a.text().toLowerCase().startsWith(alphabet.toLowerCase())) {
                        const slug = (_a = $(el)
                            .attr("href")) === null || _a === void 0 ? void 0 : _a.trim().split("/anime/")[1].replace("/", "").trim();
                        if (slug) {
                            preSlugs.push(slug);
                        }
                    }
                });
                const r = (0, utils_1.hasNextPageAndGet)(preSlugs, page, 10);
                hasNext = r.hasNext;
                slugs.push(...r.data);
            }
            else {
                const els = keyword || type || genre
                    ? $("#content-wrap .menu table tr a")
                    : $("#content-wrap .ngiri .menu a");
                els.each((_, el) => {
                    var _a, _b;
                    const slug = keyword || type || genre
                        ? (_a = $(el)
                            .attr("href")) === null || _a === void 0 ? void 0 : _a.trim().split("/anime/")[1].replace("/", "").trim()
                        : (_b = $(el)
                            .attr("href")) === null || _b === void 0 ? void 0 : _b.trim().split("-episode-")[0].replace("/", "").trim();
                    if (slug) {
                        slugs.push(slug);
                    }
                });
            }
            const animes = (yield Promise.all(slugs.map((slug) => this.limit(() => __awaiter(this, void 0, void 0, function* () { return yield this.detail(slug); }))))).filter((anime) => anime !== undefined);
            return { animes, hasNext };
        });
    }
    detail(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const a = this.cache.get(`detail-${this.name}-${slug}`);
            if (a && this.options.cache) {
                return a;
            }
            const res = yield this.api.get(`${this.baseUrl}/anime/${slug}/`);
            const $ = this.cheerio.load(res.data);
            const title = $("#content-wrap .ngirix .title").first().text().trim();
            let img = (_a = $("#content-wrap .ngirix .menu .detail img").attr("src")) === null || _a === void 0 ? void 0 : _a.trim();
            if (!(img === null || img === void 0 ? void 0 : img.includes("http"))) {
                img = `${this.baseUrl}/${img}`;
            }
            const synopsis = $("#content-wrap .ngirix .menu .detail p").text().trim();
            const genres = [];
            $("#content-wrap .ngirix .menu .detail li a").each((_, el) => {
                var _a;
                const $a = $(el);
                const slug = (_a = $a
                    .attr("href")) === null || _a === void 0 ? void 0 : _a.trim().split("/genres/")[1].replace("/", "");
                const name = $a.text().trim();
                genres.push({
                    slug: slug || "",
                    name,
                    source: this.name,
                });
            });
            const episodes = [];
            $("#content-wrap .ngirix .menu .ep a").each((_, el) => {
                var _a;
                const $a = $(el);
                episodes.push({
                    name: $a.text(),
                    slug: ((_a = $a.attr("href")) === null || _a === void 0 ? void 0 : _a.replace("/", "").replace("/", "")) || "",
                    source: this.name,
                });
            });
            const data = {
                slug,
                title,
                synopsis,
                posterUrl: img,
                status: "UNKNOWN",
                genres,
                episodes,
                studios: [],
                batches: [],
                producers: [],
                characterTypes: [],
                source: this.name,
            };
            if (this.options.cache)
                this.cache.set(`detail-${this.name}-${slug}`, data);
            return data;
        });
    }
    genres() {
        return __awaiter(this, void 0, void 0, function* () {
            const a = this.cache.get(`genres-${this.name}`);
            if (a && this.options.cache) {
                return a;
            }
            const res = yield this.api.get(`${this.baseUrl}/list-genre/`);
            const $ = this.cheerio.load(res.data);
            const genres = [];
            $(".list-genre a").each((_, el) => {
                var _a;
                const $a = $(el);
                const slug = (_a = $a
                    .attr("href")) === null || _a === void 0 ? void 0 : _a.split("/genres/")[1].replace("/", "").trim();
                genres.push({
                    name: $a.text().trim(),
                    slug: slug || "",
                    source: this.name,
                });
            });
            if (this.options.cache)
                this.cache.set(`genres-${this.name}`, genres);
            return genres;
        });
    }
    streams(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            const a = this.cache.get(`streams-${this.name}-${slug}`);
            if (a && this.options.cache)
                return a;
            const res = yield this.api.get(`${this.baseUrl}/${slug}/`);
            const $ = this.cheerio.load(res.data);
            const streams = [];
            $("#content-wrap .menu .servers a").each((_, el) => {
                var _a;
                const $a = $(el);
                let embedUrl = (_a = $a.attr("data-video")) === null || _a === void 0 ? void 0 : _a.trim();
                if (!(embedUrl === null || embedUrl === void 0 ? void 0 : embedUrl.includes("http"))) {
                    embedUrl = `${this.baseUrl}${embedUrl}`;
                }
                streams.push({
                    name: $a.text(),
                    url: embedUrl,
                    source: this.name,
                });
            });
            if (this.options.cache) {
                this.cache.set(`streams-${this.name}-${slug}`, streams);
            }
            return streams;
        });
    }
}
exports.AnimeIndo = AnimeIndo;
