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
exports.Otakudesu = void 0;
const date_converter_1 = require("../../utils/date-converter.js");
const __1 = require("../index.js");
const helper_1 = require("./helper.js");
class Otakudesu extends __1.Provider {
    constructor(options) {
        super("otakudesu", Object.assign({ baseUrl: "https://otakudesu.best", cache: true }, options));
    }
    search(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { keyword, alphabet, day, status, genres, page } = (options === null || options === void 0 ? void 0 : options.filter) || {};
            let hasNext = false;
            let slugs = [];
            if (genres) {
                const r = yield this.searchByGenre(genres[0], page);
                hasNext = r.hasNext;
                slugs = r.slugs;
            }
            else if (day) {
                slugs = yield this.searchByDay(day);
            }
            else if (alphabet) {
                slugs = yield this.searchByAlphabet(alphabet);
            }
            else if (keyword) {
                const res = yield this.api.get(`${this.baseUrl}`, {
                    params: {
                        s: keyword,
                        post_type: "anime",
                    },
                });
                const $ = this.cheerio.load(res.data);
                $("#venkonten .venutama ul li h2 a").each((_, el) => {
                    var _a;
                    slugs.push(((_a = $(el).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/anime/")[1].replace("/", "").trim()) || "");
                });
            }
            else {
                const r = yield this.searchByStatus(status, page);
                hasNext = r.hasNext;
                slugs = r.slugs;
            }
            return {
                hasNext,
                animes: (yield Promise.all(slugs.map((slug) => this.limit(() => __awaiter(this, void 0, void 0, function* () {
                    return yield this.detail(slug);
                }))))).filter((anime) => anime !== undefined),
            };
        });
    }
    detail(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const a = this.cache.get(`detail-${this.name}-${slug}`);
            if (a && this.options.cache) {
                return a;
            }
            const res = yield this.api.get(`${this.baseUrl}/anime/${slug}/`);
            const $ = this.cheerio.load(res.data);
            const image = (_a = $(".fotoanime img").attr("src")) === null || _a === void 0 ? void 0 : _a.trim();
            const synopsis = $(".sinopc p")
                .toArray()
                .map((p) => $(p).text().trim())
                .join("\n\n");
            let title;
            let titleJapan;
            let score;
            let producers = [];
            let type;
            let status = "UNKNOWN";
            let duration;
            let aired;
            let studios = [];
            let genres = [];
            let episodes = [];
            let batches = [];
            $(".infozin .infozingle p").each((_, el) => {
                const $$ = $(el);
                const [key, value] = $$.text().split(":");
                if (key.toLowerCase().trim() === "genre") {
                    $$.find("a").each((_, a) => {
                        var _a;
                        const $a = $(a);
                        const slug = ((_a = $a
                            .attr("href")) === null || _a === void 0 ? void 0 : _a.trim().split("/genres/")[1].replace("/", "").trim()) || "";
                        genres.push({
                            name: $a.text(),
                            slug,
                            source: this.name,
                        });
                    });
                }
                switch (key.trim().toLowerCase()) {
                    case "judul":
                        title = value.trim();
                        break;
                    case "japanese":
                        titleJapan = value.trim();
                        break;
                    case "skor":
                        score = Number(value.trim()) || 0;
                        break;
                    case "produser":
                        producers = value
                            .trim()
                            .split(",")
                            .map((s) => s.trim());
                        break;
                    case "tipe":
                        type = value.trim();
                        break;
                    case "status":
                        const v = value.trim().toLowerCase();
                        status =
                            v === "completed"
                                ? "FINISHED"
                                : v === "ongoing"
                                    ? "ONGOING"
                                    : "UNKNOWN";
                        break;
                    case "durasi":
                        duration = value.trim();
                        break;
                    case "tanggal rilis":
                        aired = (0, date_converter_1.parseDate)(value.trim()) || undefined;
                        break;
                    case "studio":
                        studios = value
                            .trim()
                            .split(",")
                            .map((s) => s.trim());
                        break;
                }
            });
            for (const el of $(".episodelist ul li span a").toArray()) {
                const $a = $(el);
                const href = ((_b = $a.attr("href")) === null || _b === void 0 ? void 0 : _b.trim()) || "";
                if (href.includes("/episode/")) {
                    episodes.push({
                        name: $a.text(),
                        slug: href.split("/episode/")[1].replace("/", "") || "",
                        source: this.name,
                    });
                }
                else if (href.includes("/batch/")) {
                    const slug = href.split("/batch/")[1].replace("/", "") || "";
                    batches = yield this.batches(slug);
                }
            }
            const data = {
                slug,
                title: title || "",
                titleAlt: titleJapan,
                synopsis,
                posterUrl: image || "",
                type,
                rating: score,
                duration,
                aired,
                status,
                studios,
                genres,
                producers,
                episodes,
                characterTypes: [],
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
            const res = yield this.api.get(`${this.baseUrl}/genre-list/`);
            const $ = this.cheerio.load(res.data);
            const genres = [];
            $(".genres a").each((_, el) => {
                var _a;
                const $a = $(el);
                genres.push({
                    name: $a.text().trim(),
                    slug: ((_a = $a
                        .attr("href")) === null || _a === void 0 ? void 0 : _a.trim().split("/genres/")[1].replace("/", "").trim()) || "",
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
            const nonce = yield (0, helper_1.getNonceCode)(this.api, this.baseUrl);
            const res = yield this.api.get(`${this.baseUrl}/episode/${slug}/`);
            const $ = this.cheerio.load(res.data);
            const streams = yield Promise.all($(".mirrorstream ul li a")
                .toArray()
                .map((el) => this.limit(() => __awaiter(this, void 0, void 0, function* () {
                const $a = $(el);
                const content = JSON.parse(atob($a.attr("data-content") || ""));
                const url = yield (0, helper_1.getEmbedUrl)(this.api, this.baseUrl, nonce, content.id, content.i, content.q);
                return {
                    name: content.q,
                    url,
                    source: this.name,
                };
            }))));
            if (this.options.cache) {
                this.cache.set(`streams-${this.name}-${slug}`, streams);
            }
            return streams;
        });
    }
    batches(batchSlug) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.api.get(`${this.baseUrl}/batch/${batchSlug}/`);
            const $ = this.cheerio.load(res.data);
            const urlGroups = $(".download2 .batchlink ul li")
                .toString()
                .split("</li>")
                .filter((item) => item.trim() !== "")
                .map((item) => `${item}<li>`);
            const batches = [];
            urlGroups.forEach((urlGroup) => {
                const $ = this.cheerio.load(urlGroup);
                const providers = $("a")
                    .toString()
                    .split("</a>")
                    .filter((item) => item.trim() !== "")
                    .map((item) => `${item}</a>`);
                const resolution = $("li strong")
                    .text()
                    .replace(/([A-z][A-z][0-9] )/, "");
                const file_size = $("li i").text();
                providers.forEach((provider) => {
                    const $ = this.cheerio.load(provider);
                    batches.push({
                        name: $("a").text(),
                        url: $("a").attr("href") || "",
                        resolution,
                        file_size,
                        source: this.name,
                    });
                });
            });
            return batches;
        });
    }
    searchByDay(day) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.api.get(`${this.baseUrl}/jadwal-rilis/`);
            if (res.status !== 200) {
                return [];
            }
            const $ = this.cheerio.load(res.data);
            const slugs = [];
            $(".kgjdwl321 .kglist321").each((_, el) => {
                const $$ = $(el);
                const _day = $$.find("h2").first().text().trim().toLowerCase();
                if (_day == day) {
                    $$.find("ul li a").each((_, el) => {
                        var _a;
                        slugs.push(((_a = $(el).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/anime/")[1].replace("/", "").trim()) ||
                            "");
                    });
                }
            });
            return slugs;
        });
    }
    searchByAlphabet(alphabet) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.api.get(`${this.baseUrl}/anime-list/`);
            if (res.status !== 200) {
                return [];
            }
            const $ = this.cheerio.load(res.data);
            const slugs = [];
            const section = $(`.bariskelom .barispenz a[name="${alphabet.toUpperCase()}"]`);
            section
                .closest(".bariskelom")
                .find(".bariskelom ul li a")
                .each((_, el) => {
                var _a;
                slugs.push(((_a = $(el).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/anime/")[1].replace("/", "").trim()) || "");
            });
            return slugs;
        });
    }
    searchByGenre(genre_1) {
        return __awaiter(this, arguments, void 0, function* (genre, page = 1) {
            const res = yield this.api.get(`${this.baseUrl}/genres/${genre}/page/${page}/`);
            if (res.status !== 200) {
                return {
                    hasNext: false,
                    slugs: [],
                };
            }
            const $ = this.cheerio.load(res.data);
            const hasNext = $(".next ").length > 0;
            const slugs = [];
            $(".venser .col-anime-title a").each((_, el) => {
                var _a;
                const $a = $(el);
                slugs.push(((_a = $a.attr("href")) === null || _a === void 0 ? void 0 : _a.split("/anime/")[1].replace("/", "").trim()) || "");
            });
            return {
                slugs,
                hasNext,
            };
        });
    }
    searchByStatus() {
        return __awaiter(this, arguments, void 0, function* (status = "FINISHED", page = 1) {
            const res = yield this.api.get(status === "FINISHED"
                ? `${this.baseUrl}/complete-anime/page/${page}/`
                : `${this.baseUrl}/ongoing-anime/page/${page}/`);
            if (res.status !== 200) {
                return {
                    hasNext: false,
                    slugs: [],
                };
            }
            const $ = this.cheerio.load(res.data);
            const hasNext = $(".next ").length > 0;
            const slugs = [];
            $(".venutama .venz ul li a").each((_, el) => {
                var _a;
                const $a = $(el);
                slugs.push(((_a = $a.attr("href")) === null || _a === void 0 ? void 0 : _a.split("/anime/")[1].replace("/", "").trim()) || "");
            });
            return {
                slugs,
                hasNext,
            };
        });
    }
}
exports.Otakudesu = Otakudesu;
