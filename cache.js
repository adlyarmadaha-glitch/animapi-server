"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class Cache {
    constructor(dbFilePath, ttl = 60 * 60) {
        const dbPath = path_1.default.resolve(dbFilePath || ".animapi/cache/animes.db");
        const cacheDir = path_1.default.dirname(dbPath);
        this.ttl = ttl;
        if (!fs_1.default.existsSync(cacheDir))
            fs_1.default.mkdirSync(cacheDir, { recursive: true });
        this.db = new better_sqlite3_1.default(dbPath);
        // Buat tabel cache kalau belum ada
        this.db
            .prepare(`
      CREATE TABLE IF NOT EXISTS anime_cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        lastUpdated INTEGER
      )
    `)
            .run();
    }
    /**
     * Ambil cache
     * @param key Key cache
     * @param maxAgeSec TTL dalam detik (default 1 hari)
     * @returns Parsed JSON data atau null jika expired/tidak ada
     */
    get(key) {
        const row = this.db
            .prepare("SELECT * FROM anime_cache WHERE key = ?")
            .get(key);
        if (!row)
            return null;
        const now = Date.now();
        if ((now - row.lastUpdated) / 1000 > this.ttl) {
            // ? hapus dari db
            this.db.prepare("DELETE FROM anime_cache WHERE key = ?").run(key);
            return null;
        }
        return JSON.parse(row.value);
    }
    /**
     * Set cache
     * @param key Key cache
     * @param data Data apapun yang bisa di-JSON stringify
     */
    set(key, data) {
        const now = Date.now();
        const value = JSON.stringify(data);
        this.db
            .prepare(`
      INSERT OR REPLACE INTO anime_cache (key, value, lastUpdated)
      VALUES (?, ?, ?)
    `)
            .run(key, value, now);
    }
}
exports.Cache = Cache;
