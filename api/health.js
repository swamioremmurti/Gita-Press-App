// Vercel serverless entry for the health-check endpoint. See api/[...path].js's
// header comment for why this is split out from the chat/db-backed API.
const chat = require('../server/lib/chat');

module.exports = (req, res) => {
  chat.handleHealth(req, res);
};
