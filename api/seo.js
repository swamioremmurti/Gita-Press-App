// Vercel function for the pages crawlers and link-preview bots need as real HTML:
// /book/:slug, /author/:slug, /authors, /library, /panchang, /help, /feedback, /chat and
// /sitemap.xml (see the rewrites in vercel.json). All the logic lives in server/lib/seo.js,
// which server/server.js also uses locally. Like api/router.js this reads the original
// path from req.url, which Vercel keeps unchanged after a rewrite.
const seo = require('../server/lib/seo');

module.exports = (req, res) => seo.handle(req, res);
