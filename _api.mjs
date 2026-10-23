import fs from 'fs';
const cookie = fs.readFileSync(process.env.TEMP + '/cookie.txt', 'utf8').trim();
export async function call(method, path, body) {
  const r = await fetch('http://localhost:5199' + path, { method, headers: { Cookie: cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch (e) { d = t; }
  return { status: r.status, d };
}
