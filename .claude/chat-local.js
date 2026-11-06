// Local test server: makes sure server.js uses server/data/swadhyay.sqlite and NOT the production Turso database.
// (On Windows, `process.env.X = ''` DELETES the variable, so blanking it up front does not work: server.js then
// loads server/.env and fills the Turso values back in.  Instead, let .env load and remove the Turso keys right after.)
const env = require('../server/lib/env');
const realLoad = env.loadEnv;
env.loadEnv = function () {
  realLoad.apply(this, arguments);
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
};
process.env.PORT = process.env.PORT || '5174';
require('../server/server.js');
if (process.env.TURSO_DATABASE_URL) throw new Error('chat-local.js: the production database is still configured');
