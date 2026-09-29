// Extracts page-aware, heading-aware text chunks from a Gita Press book HTML file.
const MIN_CHUNK = 500;
const MAX_CHUNK = 1400;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractParagraphs(sectionHtml) {
  const paras = [];
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(sectionHtml))) {
    const cls = (/class="([^"]*)"/.exec(m[1]) || [, ''])[1];
    const text = stripTags(m[2]);
    if (text) paras.push({ cls, text });
  }
  return paras;
}

function packParagraphs(paras, page) {
  // Greedy-pack paragraph texts into ~MAX_CHUNK sized pieces, tracking heading context.
  const pieces = [];
  let buf = [];
  let bufLen = 0;
  let heading = '';

  function flush() {
    if (buf.length) {
      pieces.push({ text: buf.join('\n'), heading, page });
      buf = [];
      bufLen = 0;
    }
  }

  for (const p of paras) {
    const isHeading = /\bHeading\b/.test(p.cls) && !/Sub-Heading/.test(p.cls);
    const isSubHeading = /Sub-Heading/.test(p.cls);
    if (isHeading) {
      flush();
      heading = p.text;
      continue;
    }
    if (isSubHeading) {
      heading = heading ? heading + ' — ' + p.text : p.text;
      continue;
    }
    if (bufLen + p.text.length > MAX_CHUNK && bufLen >= MIN_CHUNK) flush();
    buf.push(p.text);
    bufLen += p.text.length + 1;
  }
  flush();
  return pieces;
}

function extractChunks(html, bookLabel) {
  const cleaned = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');

  const sectionRe = /<section\b[^>]*class="[^"]*epub-page[^"]*"[^>]*data-page="(\d+)"[^>]*>([\s\S]*?)<\/section>/gi;
  const sections = [];
  let m;
  while ((m = sectionRe.exec(cleaned))) sections.push({ page: parseInt(m[1], 10), html: m[2] });

  let rawPieces = [];
  if (sections.length) {
    for (const s of sections) {
      const paras = extractParagraphs(s.html);
      rawPieces.push(...packParagraphs(paras, s.page));
    }
  } else {
    const paras = extractParagraphs(cleaned);
    rawPieces.push(...packParagraphs(paras, null));
  }

  // Merge undersized adjacent pieces forward so chunks stay in the MIN..MAX sweet spot.
  const merged = [];
  let cur = null;
  for (const piece of rawPieces) {
    if (!piece.text) continue;
    if (!cur) { cur = { text: piece.text, heading: piece.heading, pageStart: piece.page, pageEnd: piece.page }; continue; }
    if (cur.text.length < MIN_CHUNK && cur.text.length + piece.text.length <= MAX_CHUNK * 1.3) {
      cur.text += '\n' + piece.text;
      cur.pageEnd = piece.page;
      if (piece.heading) cur.heading = cur.heading ? cur.heading : piece.heading;
    } else {
      merged.push(cur);
      cur = { text: piece.text, heading: piece.heading, pageStart: piece.page, pageEnd: piece.page };
    }
  }
  if (cur) merged.push(cur);

  return merged.map((c, i) => ({
    idx: i,
    text: c.text,
    heading: c.heading || '',
    pageStart: c.pageStart,
    pageEnd: c.pageEnd,
    book: bookLabel
  }));
}

module.exports = { extractChunks, stripTags };
