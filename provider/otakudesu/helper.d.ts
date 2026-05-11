import { AxiosStatic } from "axios";
/**
 * ? INI CODE ACTION AJAX WORDPRESS BUAT NGAMBIL 'nonce' BUAT REQUEST ke 'https://otakudesu.best/wp-admin/admin-ajax.php'
 * ? MAAFKAN SAYA ATMIN OTAKUDESU MWHEHEEH
 */
export declare const ACTION_GET_NONCE_CODE = "aa1208d27f29ca340c92c66d1926f13f";
/**
 * ? SETELAH AMBIL NONCE CODE TADI SEKARANG AMBIL STREAM EMBED URL PAKAI NONCE CODE TADI
 * ? SEKALI LAGI MAAFKAN SAYA ATMIN OTAKUDESU MWHEHEHE
 */
export declare const ACTION_GET_EMBED_CODE = "2a3505c93b0035d3f455df82bf976b84";
export declare function getNonceCode(api: AxiosStatic, baseUrl: string): Promise<any>;
export declare function getEmbedUrl(api: AxiosStatic, baseUrl: string, nonce: string, id: string, i: string, q: string): Promise<string | undefined>;
