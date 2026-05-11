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
exports.Animasu = void 0;
const date_converter_1 = require("../../utils/date-converter.js");
const __1 = require("../index.js");
class Animasu extends __1.Provider {
    constructor(options) {
        super("animasu", Object.assign({ baseUrl: "https://v1.animasu.top", cache: true }, options));
    }
    search(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { keyword, page = 1, sort, genres, seasons, characters, status, type, day, alphabet, } = (options === null || options === void 0 ? void 0 : options.filter) || {};
            let data;
            if (alphabet) {
                const { slugs, hasNext } = yield this.findByAlphabet(alphabet);
                const animes = (yield Promise.all(slugs.map((slug) => this.limit(() => __awaiter(this, void 0, void 0, function* () { return yield this.detail(slug); }))))).filter((anime) => anime !== undefined);
                data = {
                    hasNext,
                    animes,
                };
            }
            else if (day) {
                const slugs = yield this.findByDay(day);
                const animes = (yield Promise.all(slugs.map((slug) => this.limit(() => __awaiter(this, void 0, void 0, function* () { return yield this.detail(slug); }))))).filter((anime) => anime !== undefined);
                data = {
                    hasNext: false,
                    animes,
                };
            }
            else {
                const url = type
                    ? `${this.baseUrl}/anime-movie`
                    : keyword
                        ? `${this.baseUrl}/page/${page}/`
                        : `${this.baseUrl}/pencarian/`;
                const res = yield this.api.get(url, {
                    params: {
                        s: keyword,
                        halaman: page,
                        urutan: sort,
                        "genre[]": genres,
                        "season[]": seasons,
                        "karakter[]": characters,
                        status: status,
                        tipe: type,
                    },
                });
                const $ = this.cheerio.load(res.data);
                const elements = $(".bs").toArray();
                const animes = (yield Promise.all(elements.map((el) => this.limit(() => __awaiter(this, void 0, void 0, function* () {
                    const link = $(el).find("a").attr("href");
                    const slug = (link === null || link === void 0 ? void 0 : link.split("/")[4].trim()) || "";
                    return yield this.detail(slug);
                }))))).filter((anime) => anime !== undefined);
                const hasNext = $(".hpage .r").length > 0 || $(".pagination .next").length > 0;
                data = {
                    animes: animes,
                    hasNext,
                };
            }
            return data;
        });
    }
    detail(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const a = this.cache.get(`detail-${this.name}-${slug}`);
            if (a && this.options.cache) {
                return a;
            }
            const res = yield this.api.get(`${this.baseUrl}/anime/${slug}/`);
            const $ = this.cheerio.load(res.data);
            const infox = $(".infox");
            const title = infox.find("h1[itemprop='headline']").text().trim();
            const synonym = infox.find(".alter").text().trim();
            const synopsis = $(".sinopsis p").text().trim();
            let image = $(".bigcontent .thumb img").attr("src") || "";
            if (!image.includes("http")) {
                image = `https:${image}`;
            }
            const rating = $(".rating strong").text().trim() || "N/A";
            const trailer = ((_a = $(".trailer iframe").attr("src")) === null || _a === void 0 ? void 0 : _a.trim()) || "";
            const genres = [];
            infox
                .find(".spe span")
                .first()
                .find("a")
                .each((_, el) => {
                const genreUrl = $(el).attr("href");
                const genreName = $(el).text().trim();
                const genreSlug = (genreUrl === null || genreUrl === void 0 ? void 0 : genreUrl.split("/")[4]) || "";
                genres.push({
                    name: genreName,
                    slug: genreSlug,
                    source: this.name,
                });
            });
            let status = "UPCOMING";
            infox.find(".spe span").each((_, el) => {
                var _a;
                const text = $(el).text().trim();
                if (text.toLowerCase().startsWith("status:")) {
                    const value = (_a = text.split(":")[1]) === null || _a === void 0 ? void 0 : _a.trim();
                    status = value.includes("🔥")
                        ? "ONGOING"
                        : value.toLowerCase().includes("selesai")
                            ? "FINISHED"
                            : "UPCOMING";
                }
            });
            const aired = (_b = infox
                .find(".spe span.split")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("rilis:"))
                .text()
                .split(":")[1]) === null || _b === void 0 ? void 0 : _b.trim();
            const type = (_c = infox
                .find(".spe span")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("jenis:"))
                .text()
                .split(":")[1]) === null || _c === void 0 ? void 0 : _c.trim();
            const duration = (_d = infox
                .find(".spe span")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("durasi:"))
                .text()
                .split(":")[1]) === null || _d === void 0 ? void 0 : _d.trim();
            const author = infox
                .find(".spe span")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("pengarang:"))
                .find("a")
                .text()
                .trim();
            const studio = infox
                .find(".spe span")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("studio:"))
                .find("a")
                .text()
                .trim();
            const season = infox
                .find(".spe span")
                .filter((_, el) => $(el).text().toLowerCase().startsWith("musim:"))
                .find("a")
                .text()
                .trim();
            const episodes = [];
            $("#daftarepisode li").each((index, el) => {
                const a = $(el).find(".lchx a");
                const episode = a.text().trim();
                const url = a.attr("href") || "";
                const slug = url.split("/")[3] || "";
                episodes.push({
                    name: episode,
                    slug,
                    source: this.name,
                });
            });
            const batches = [];
            $(".soraddlx .soraurlx").each((index, el) => {
                const resolution = $(el).find("strong").text().trim();
                $(el)
                    .find("a")
                    .each((_index, _el) => {
                    const url = $(_el).attr("href") || "";
                    const name = $(_el).text().trim();
                    batches.push({
                        name,
                        resolution,
                        url,
                        source: this.name,
                    });
                });
            });
            const characterTypes = [];
            try {
                $("#tikar_shw a").each((index, el) => {
                    const href = $(el).attr("href") || "";
                    const name = $(el).text().trim();
                    const slug = href.split("/")[4] || "";
                    characterTypes.push({
                        name,
                        slug,
                        source: this.name,
                    });
                });
            }
            catch (er) { }
            const data = {
                slug,
                title,
                synonym,
                synopsis,
                posterUrl: image,
                rating: Number(rating.split(" ")[1]) || 0,
                author,
                genres,
                characterTypes,
                status: status,
                aired: (0, date_converter_1.parseDate)(aired),
                type: type || "Unknown",
                duration,
                studios: studio ? [studio] : [],
                season: season || "Unknown",
                trailerUrl: trailer,
                producers: [],
                episodes,
                batches,
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
            const res = yield this.api.get(`${this.baseUrl}/kumpulan-genre-anime-lengkap/`);
            const $ = this.cheerio.load(res.data);
            const genres = [];
            $(".genrepage a").each((_, el) => {
                const name = $(el).text().trim();
                const url = $(el).attr("href") || "";
                const slug = url.split("/")[4] || "";
                genres.push({
                    name,
                    slug,
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
            const streams = [];
            const res = yield this.api.get(`${this.baseUrl}/${slug}/`);
            const $ = this.cheerio.load(res.data);
            $(".mirror option").each((_, el) => {
                var _a, _b;
                const value = (_a = $(el).attr("value")) === null || _a === void 0 ? void 0 : _a.trim();
                if (value) {
                    const name = $(el).text().trim();
                    const $$ = this.cheerio.load(`<div>${atob(value)}</div>`);
                    streams.push({
                        name,
                        url: ((_b = $$("iframe").attr("src")) === null || _b === void 0 ? void 0 : _b.trim()) || "",
                        source: this.name,
                    });
                }
            });
            if (this.options.cache) {
                this.cache.set(`streams-${this.name}-${slug}`, streams);
            }
            return streams;
        });
    }
    findByDay(_day) {
        return __awaiter(this, void 0, void 0, function* () {
            const day = _day || "random";
            const res = yield this.api.get(`${this.baseUrl}/jadwal/`);
            const $ = this.cheerio.load(res.data);
            const slugs = [];
            $(".bixbox").each((_, el) => {
                const $$ = $(el);
                const $day = ($$.find(".releases h3 span").text().trim() || "")
                    .toLowerCase()
                    .replace("update acak", "random")
                    .replace("'", "");
                if ($day == day) {
                    $(el)
                        .find(".bs")
                        .each((_, _el) => {
                        const $$$ = $(_el);
                        const link = $$$.find("a").attr("href");
                        const slug = (link === null || link === void 0 ? void 0 : link.split("/")[4].trim()) || "";
                        slugs.push(slug);
                    });
                }
            });
            return slugs;
        });
    }
    findByAlphabet(alphabet_1) {
        return __awaiter(this, arguments, void 0, function* (alphabet, page = 1) {
            const res = yield this.api.get(`${this.baseUrl}/daftar-anime/page/${page}/`, {
                params: {
                    show: alphabet.toUpperCase(),
                },
            });
            const $ = this.cheerio.load(res.data);
            const hasNext = $(".hpage .r").length > 0 || $(".pagination .next").length > 0;
            const slugs = [];
            $(".bx").each((index, el) => {
                const $$ = $(el);
                let slug = $$.find(".inx h2 a").attr("href") || "";
                slug = slug.substring(0, slug.lastIndexOf("/")).split("/").pop() || "";
                slugs.push(slug);
            });
            return {
                slugs,
                hasNext,
            };
        });
    }
}
exports.Animasu = Animasu;
