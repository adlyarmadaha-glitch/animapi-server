"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ACTION_GET_EMBED_CODE = exports.ACTION_GET_NONCE_CODE = void 0;
exports.getNonceCode = getNonceCode;
exports.getEmbedUrl = getEmbedUrl;
const cheerio = __importStar(require("cheerio"));
/**
 * ? INI CODE ACTION AJAX WORDPRESS BUAT NGAMBIL 'nonce' BUAT REQUEST ke 'https://otakudesu.best/wp-admin/admin-ajax.php'
 * ? MAAFKAN SAYA ATMIN OTAKUDESU MWHEHEEH
 */
exports.ACTION_GET_NONCE_CODE = "aa1208d27f29ca340c92c66d1926f13f";
/**
 * ? SETELAH AMBIL NONCE CODE TADI SEKARANG AMBIL STREAM EMBED URL PAKAI NONCE CODE TADI
 * ? SEKALI LAGI MAAFKAN SAYA ATMIN OTAKUDESU MWHEHEHE
 */
exports.ACTION_GET_EMBED_CODE = "2a3505c93b0035d3f455df82bf976b84";
function getNonceCode(api, baseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.post(`${baseUrl}/wp-admin/admin-ajax.php`, new URLSearchParams({
            action: exports.ACTION_GET_NONCE_CODE,
        }).toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (res.status !== 200) {
            return undefined;
        }
        return res.data.data;
    });
}
function getEmbedUrl(api, baseUrl, nonce, id, i, q) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield api.post(`${baseUrl}/wp-admin/admin-ajax.php`, new URLSearchParams({
            action: exports.ACTION_GET_EMBED_CODE,
            nonce,
            id,
            i,
            q,
        }).toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000, // 15 detik
        });
        if (res.status !== 200) {
            return undefined;
        }
        const iframe = atob(res.data.data);
        const $ = cheerio.load(iframe);
        return $("iframe").attr("src");
    });
}
