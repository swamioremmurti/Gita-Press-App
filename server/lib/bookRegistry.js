// Node port of tools/book_converter.py's text-editing functions (register_in_data_js,
// register_non_gita_press) plus a couple of siblings it doesn't need (title-override
// upsert, data.js field edits) so the admin API can add/edit books without shelling out
// to Python. Both tools edit the exact same two files (swadhyay-data.js, swadhyay-app.js)
// -- keep this in sync with book_converter.py if that file's format ever changes.
const fs = require('fs');

function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------------------------------------------------------- SWADHYAY_BOOKS_RAW (array) -

function readRawBooks(dataJsPath) {
  const text = fs.readFileSync(dataJsPath, 'utf8');
  const markerIdx = text.indexOf('SWADHYAY_BOOKS_RAW');
  const startIdx = text.indexOf('[', markerIdx);
  const endIdx = text.lastIndexOf(']');
  if (markerIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error('Could not locate SWADHYAY_BOOKS_RAW array in ' + dataJsPath);
  }
  return JSON.parse(text.slice(startIdx, endIdx + 1));
}

/** `people` is { author, tikakar, translator, publisher } -- plain strings, several names in
 *  one field separated by "; ". Every entry carries all four keys (empty string = not stated)
 *  so updateDataJsField can always patch them later. */
function registerInDataJs(dataJsPath, filename, category, people, sizeKB) {
  const text = fs.readFileSync(dataJsPath, 'utf8');
  if (text.includes(`"file":  "${filename}"`) || text.includes(`"file": "${filename}"`)) {
    return { registered: false, reason: 'already registered' };
  }
  const p = people || {};
  const entry = '    {\n' +
    `        "file":  ${JSON.stringify(filename)},\n` +
    `        "category":  ${JSON.stringify(category)},\n` +
    `        "author":  ${JSON.stringify(p.author || '')},\n` +
    `        "tikakar":  ${JSON.stringify(p.tikakar || '')},\n` +
    `        "translator":  ${JSON.stringify(p.translator || '')},\n` +
    `        "publisher":  ${JSON.stringify(p.publisher || '')},\n` +
    `        "sizeKB":  ${sizeKB}\n` +
    '    }';
  const idx = text.lastIndexOf(']');
  if (idx === -1) throw new Error("Could not find the closing ']' of SWADHYAY_BOOKS_RAW");
  let prefix = text.slice(0, idx).replace(/\s+$/, '');
  if (prefix.endsWith('}')) prefix += ',';
  const newText = prefix + '\n' + entry + '\n]' + text.slice(idx + 1);
  fs.writeFileSync(dataJsPath, newText, 'utf8');
  return { registered: true };
}

/** Patch one scalar field (author or sizeKB) on an existing SWADHYAY_BOOKS_RAW entry. */
function updateDataJsField(dataJsPath, filename, field, value) {
  const text = fs.readFileSync(dataJsPath, 'utf8');
  const markerA = `"file":  "${filename}"`;
  const markerB = `"file": "${filename}"`;
  let fileIdx = text.indexOf(markerA);
  if (fileIdx === -1) fileIdx = text.indexOf(markerB);
  if (fileIdx === -1) return { updated: false, reason: 'not found' };
  const blockStart = text.lastIndexOf('{', fileIdx);
  const blockEnd = text.indexOf('}', fileIdx);
  if (blockStart === -1 || blockEnd === -1) return { updated: false, reason: 'malformed entry' };
  const block = text.slice(blockStart, blockEnd + 1);
  const fieldRe = new RegExp('("' + esc(field) + '"\\s*:\\s*)(?:"(?:[^"\\\\]|\\\\.)*"|[0-9.]+)');
  if (!fieldRe.test(block)) return { updated: false, reason: 'field not present' };
  const valueSrc = typeof value === 'number' ? String(value) : JSON.stringify(String(value));
  const newBlock = block.replace(fieldRe, '$1' + valueSrc);
  const newText = text.slice(0, blockStart) + newBlock + text.slice(blockEnd + 1);
  fs.writeFileSync(dataJsPath, newText, 'utf8');
  return { updated: true };
}

// --------------------------------------- simple "var NAME = { "key": value, ... };" dicts -
// Covers NON_GITA_PRESS_BOOKS ("key": true) and TITLE_OVERRIDES ("key": "value") in
// swadhyay-app.js -- both are flat, single-line-per-entry object literals closing on
// their own "  };" line.

function findObjectLiteralBounds(text, varName) {
  const marker = `var ${varName} = {`;
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) throw new Error(`Could not find ${varName} in file`);
  const braceOpen = startIdx + marker.length - 1;
  const closeMarker = '\n  };';
  const bodyEnd = text.indexOf(closeMarker, braceOpen);
  if (bodyEnd === -1) throw new Error(`Could not find closing '};' for ${varName}`);
  return { braceOpen, bodyEnd };
}

function upsertEntry(filePath, varName, key, valueSrc) {
  const text = fs.readFileSync(filePath, 'utf8');
  const { braceOpen, bodyEnd } = findObjectLiteralBounds(text, varName);
  const body = text.slice(braceOpen + 1, bodyEnd);
  const keyJson = JSON.stringify(key);
  const keyRe = new RegExp('(\\n\\s*)' + esc(keyJson) + '(\\s*:\\s*)(?:"(?:[^"\\\\]|\\\\.)*"|true|false|[0-9.]+)');
  let newBody;
  if (keyRe.test(body)) {
    newBody = body.replace(keyRe, (m, pre, colon) => `${pre}${keyJson}${colon}${valueSrc}`);
  } else {
    const trimmed = body.replace(/\s+$/, '');
    const needsComma = trimmed.trim().length > 0 && !trimmed.trim().endsWith(',');
    newBody = (needsComma ? trimmed + ',' : trimmed) + `\n    ${keyJson}: ${valueSrc}\n  `;
  }
  const newText = text.slice(0, braceOpen + 1) + newBody + text.slice(bodyEnd);
  fs.writeFileSync(filePath, newText, 'utf8');
}

function removeEntry(filePath, varName, key) {
  const text = fs.readFileSync(filePath, 'utf8');
  const { braceOpen, bodyEnd } = findObjectLiteralBounds(text, varName);
  const body = text.slice(braceOpen + 1, bodyEnd);
  const keyJson = JSON.stringify(key);
  const keyRe = new RegExp('\\n\\s*' + esc(keyJson) + '\\s*:\\s*(?:"(?:[^"\\\\]|\\\\.)*"|true|false|[0-9.]+),?');
  const newBody = body.replace(keyRe, '');
  const newText = text.slice(0, braceOpen + 1) + newBody + text.slice(bodyEnd);
  fs.writeFileSync(filePath, newText, 'utf8');
}

function setTitleOverride(appJsPath, filename, title) {
  if (title) upsertEntry(appJsPath, 'TITLE_OVERRIDES', filename, JSON.stringify(title));
  else removeEntry(appJsPath, 'TITLE_OVERRIDES', filename);
}

function setNonGitaPress(appJsPath, filename, flag) {
  const text = fs.readFileSync(appJsPath, 'utf8');
  const already = text.includes(`"${filename}": true`);
  if (flag && !already) upsertEntry(appJsPath, 'NON_GITA_PRESS_BOOKS', filename, 'true');
  else if (!flag && already) removeEntry(appJsPath, 'NON_GITA_PRESS_BOOKS', filename);
}

module.exports = {
  readRawBooks, registerInDataJs, updateDataJsField,
  upsertEntry, removeEntry, setTitleOverride, setNonGitaPress
};
