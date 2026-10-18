// Vercel Routing Middleware: the pre-launch password gate (see server/lib/gate.js).
// It runs before every request -- including static files and /api/* -- and does nothing at all
// unless the SITE_PASSWORD environment variable is set in the Vercel project.
// To open the site at launch: delete SITE_PASSWORD in Vercel -> Settings -> Environment Variables
// and redeploy (this file can then be deleted too).
import { next } from '@vercel/functions';
import gate from './server/lib/gate.js';

export default async function middleware(request) {
  const response = await gate.handle(request, process.env);
  return response || next();
}
