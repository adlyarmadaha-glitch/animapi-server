const axios = require('axios');
const cheerio = require('cheerio');
const pLimit = require('p-limit');
const { Cache } = require('../cache');

class Provider {
  constructor(name, options = {}) {
    this.name = name;
    this.baseUrl = options.baseUrl || '';
    this.options = options;
    this.cache = new Cache();
    this.api = axios;
    this.cheerio = cheerio;
    this.limit = pLimit(3);
  }
  async search(options) { throw new Error('Not implemented'); }
  async detail(slug) { throw new Error('Not implemented'); }
  async genres() { throw new Error('Not implemented'); }
  async streams(slug) { throw new Error('Not implemented'); }
}
module.exports = { Provider };
