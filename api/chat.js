// Vercel serverless entry for the RAG chat endpoint. Thin wrapper around
// server/lib/chat.js -- see api/[...path].js's header comment for why this
// split exists (shared logic between local dev's server/server.js and Vercel).
require('../server/lib/env').loadEnv();
const chat = require('../server/lib/chat');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
  await chat.handleChat(req, res);
};
