/* CSS editor. The admin writes a custom stylesheet that is laid AFTER the site's own (swadhyay.css) or the books' own (master.css),
   so it can override any rule and is undone by clearing it. Tools beside the editor:
     Preview   the real site (or sample book text) with the unsaved CSS applied live, desktop / tablet / phone, light / dark
     Colours   the site's colour variables as colour pickers (written into a managed block of the stylesheet)
     Original  the original stylesheet's rules, searchable, one click to copy a rule in as an override
   Every save keeps the previous text (30 versions). */
(function () {
  'use strict';
  var A = window.Admin, html = A.html, esc = A.esc;
  var API = '/api/admin/css';
  var TARGETS = {
    site: { label: 'App (swadhyay.css)', file: '/swadhyay.css', what: 'every page of the app: layout, colours, menus, cards' },
    books: { label: 'Book text (master.css)', file: '/master.css', what: 'the text of the books in the reader: headings, shloks, paragraphs' }
  };
  var SAMPLE_BOOK = '<p class="cover-Shri-Hari">॥ ॐ श्रीपरमात्मने नमः ॥</p><p class="cover-Book-Name">नमूना ग्रंथ</p><p class="Heading">अध्याय १</p><p class="Sub-Heading">उप-शीर्षक</p>' +
    '<p class="Shlok">धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।</p><p class="Shlok">मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥</p><p class="Numbers">॥१॥</p>' +
    '<p class="Normal">यह साधारण गद्य का अनुच्छेद है। इसमें पाठक को कई पंक्तियों का सामान्य पाठ दिखाई देता है, ताकि अक्षरों के आकार, रंग और पंक्ति-अंतर का प्रभाव देखा जा सके।</p>' +
    '<p class="TXT-Bold">यह मोटे अक्षरों वाला अनुच्छेद है।</p><p class="TXT-Right">— दाहिने संरेखित पंक्ति</p><p class="Separator">॥ * ॥</p><p class="Footnotes">१. यह पादटिप्पणी का नमूना है।</p>';
  var SITE_PAGES = [['/', 'Home'], ['/library', 'Library'], ['/audio', 'Audio'], ['/gita', 'Gita course'], ['/authors', 'Authors'], ['/panchang', 'Panchang'], ['/help', 'Help'], ['/login', 'Sign in']];

  var cache = {};     // original stylesheet text per target
  function original(target) {
    if (!cache[target]) cache[target] = fetch(TARGETS[target].file, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('Could not read ' + TARGETS[target].file); return r.text(); });
    return cache[target];
  }

  /* ---- managed colour blocks inside the stylesheet ---- */
  function blockRe(key) { return new RegExp('/\\* kalyan:' + key + ':start \\*/[\\s\\S]*?/\\* kalyan:' + key + ':end \\*/\\n?'); }
  function getBlock(text, key) { var m = text.match(blockRe(key)); return m ? m[0] : ''; }
  function parseVars(block) { var out = {}, re = /(--[\w-]+)\s*:\s*([^;]+);/g, m; while ((m = re.exec(block))) out[m[1]] = m[2].trim(); return out; }
  function setBlock(text, key, selector, vars) {
    var names = Object.keys(vars), re = blockRe(key);
    text = text.replace(re, '');
    if (!names.length) return text.replace(/^\n+/, '');
    var block = '/* kalyan:' + key + ':start */\n' + selector + ' {\n' + names.map(function (n) { return '  ' + n + ': ' + vars[n] + ';'; }).join('\n') + '\n}\n/* kalyan:' + key + ':end */\n';
    return block + (text.replace(/^\n+/, '') ? '\n' + text.replace(/^\n+/, '') : '');
  }
  function rootVars(css, dark) {
    var re = dark ? /:root\[data-theme="dark"\]\s*\{([^}]*)\}/ : /(?:^|\n):root\s*\{([^}]*)\}/;
    var m = css.match(re); return m ? parseVars(m[1] + ';') : {};
  }
  function isColor(v) { return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v.trim()); }
  function toHex(v) {
    v = v.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(function (c) { return c + c; }).join('').toLowerCase();
    var m = v.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
    if (m) return '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + Math.min(255, +n).toString(16)).slice(-2); }).join('');
    return null;
  }

  /* ---- original rules ---- */
  function formatRule(rule, indent) {
    indent = indent || '';
    if (rule.type === 1) {
      var lines = [];
      for (var i = 0; i < rule.style.length; i++) {
        var n = rule.style[i], pr = rule.style.getPropertyPriority(n);
        lines.push(indent + '  ' + n + ': ' + rule.style.getPropertyValue(n) + (pr ? ' !' + pr : '') + ';');
      }
      return indent + rule.selectorText + ' {\n' + lines.join('\n') + '\n' + indent + '}';
    }
    if (rule.type === 4 || rule.type === 12) {
      var inner = Array.prototype.map.call(rule.cssRules, function (r) { return formatRule(r, indent + '  '); }).join('\n');
      return indent + '@' + (rule.type === 4 ? 'media ' + rule.conditionText : 'supports ' + rule.conditionText) + ' {\n' + inner + '\n' + indent + '}';
    }
    return indent + rule.cssText;
  }

  A.route('/css', function (q, view) {
    var target = q.get('t') === 'books' ? 'books' : 'site';
    A.setPage('CSS editor', 'Your own styles, applied after the site’s: ' + TARGETS[target].what);
    return Promise.all([A.get(API), original(target).catch(function () { return ''; })]).then(function (res) {
      var saved = res[0].targets[target], origText = res[1];
      var st = { saved: saved.css, updatedAt: saved.updatedAt, tool: 'preview', device: 'desktop', dark: false, page: '/', book: '' };
      Page(view, target, st, origText);
    });
  });

  function Page(view, target, st, origText) {
    var T = TARGETS[target];
    A.q('#pageActions').innerHTML = html`<button class="btn" id="chist" type="button">History</button><button class="btn" id="cdl" type="button">Download</button>
      <label class="btn" style="cursor:pointer">Import .css<input type="file" id="cimp" accept=".css,text/css" hidden></label><button class="btn primary" id="csave" type="button" title="Ctrl+S">Save and publish</button>`.s;
    view.innerHTML = html`<div class="tabs">${Object.keys(TARGETS).map(function (k) { return html`<a class="tab ${k === target ? 'active' : ''}" href="#/css${k === 'site' ? '' : '?t=' + k}">${TARGETS[k].label}</a>`; })}</div>
      <div class="css-grid">
        <div class="card css-ed"><div class="card-h"><h2>Your CSS</h2><span class="muted small" id="cstat"></span><span class="right row" style="gap:6px"><button class="btn sm" id="cdiscard" type="button">Discard changes</button><button class="btn sm danger" id="cclear" type="button">Clear all</button></span></div>
          <div class="codewrap"><div class="gutter" id="gut" aria-hidden="true"></div><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Custom CSS"></textarea></div>
          <div class="card-b small muted" id="chint">Rules you write here win over the originals. Tab indents · Ctrl+S saves · Ctrl+/ comments a line. Nothing reaches visitors until you press <b>Save and publish</b>.</div></div>
        <div class="card css-tools"><div class="tabs" style="margin:0;padding:0 8px">
          <button class="tab ${st.tool === 'preview' ? 'active' : ''}" data-tool="preview">Preview</button>${target === 'site' ? html`<button class="tab" data-tool="colours">Colours</button>` : ''}<button class="tab" data-tool="original">Original rules</button></div>
          <div id="tool" class="css-tool-body"></div></div>
      </div>`.s;
    var code = A.q('#code', view), gut = A.q('#gut', view), tool = A.q('#tool', view);
    code.value = st.saved;

    /* ---------- editor ---------- */
    function lines() { return code.value.split('\n').length; }
    function gutter() { var n = lines(), s = ''; for (var i = 1; i <= n; i++) s += i + '\n'; gut.textContent = s; gut.scrollTop = code.scrollTop; }
    code.addEventListener('scroll', function () { gut.scrollTop = code.scrollTop; });
    function isDirty() { return code.value !== st.saved; }
    function check() {
      var el = A.q('#cstat', view), text = code.value, msg = '', ok = true;
      var depth = 0, i = 0, q = '';
      while (i < text.length) {
        var c = text[i], n = text[i + 1];
        if (q) { if (c === '\\') i++; else if (c === q) q = ''; }
        else if (c === '/' && n === '*') { var e = text.indexOf('*/', i + 2); if (e < 0) { ok = false; msg = 'A comment is never closed'; break; } i = e + 1; }
        else if (c === '"' || c === "'") q = c;
        else if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth < 0) { ok = false; msg = 'Extra } on line ' + (text.slice(0, i).split('\n').length); break; } }
        i++;
      }
      if (ok && depth > 0) { ok = false; msg = depth + ' unclosed {'; }
      var rules = 0;
      if (ok && window.CSSStyleSheet && CSSStyleSheet.prototype.replaceSync) { try { var sh = new CSSStyleSheet(); sh.replaceSync(text); rules = sh.cssRules.length; } catch (x) { ok = false; msg = 'The browser could not read this CSS'; } }
      el.innerHTML = ok ? '<span style="color:var(--ok)">✓ valid</span> · ' + rules + ' rule' + (rules === 1 ? '' : 's') + ' · ' + A.fmt.bytes(new Blob([text]).size) + (isDirty() ? ' · <span class="dirty">unsaved</span>' : (st.updatedAt ? ' · saved ' + A.fmt.ago(st.updatedAt) : ''))
        : '<span style="color:var(--bad)">✗ ' + esc(msg) + '</span>';
      A.q('#csave', document).disabled = !isDirty() || !ok;
      A.q('#cdiscard', view).disabled = !isDirty();
      return ok;
    }
    var live = A.debounce(function () { pushLive(); }, 250);
    function changed() { gutter(); check(); live(); updateColours(); }
    code.addEventListener('input', changed);
    code.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = code.selectionStart, en = code.selectionEnd, v = code.value;
        if (s !== en && v.slice(s, en).indexOf('\n') !== -1) {
          var ls = v.lastIndexOf('\n', s - 1) + 1, block = v.slice(ls, en), out = e.shiftKey ? block.replace(/^( {1,2}|\t)/gm, '') : block.replace(/^/gm, '  ');
          code.value = v.slice(0, ls) + out + v.slice(en); code.selectionStart = ls; code.selectionEnd = ls + out.length;
        } else if (e.shiftKey) {
          var ls2 = v.lastIndexOf('\n', s - 1) + 1; if (v.slice(ls2, ls2 + 2) === '  ') { code.value = v.slice(0, ls2) + v.slice(ls2 + 2); code.selectionStart = code.selectionEnd = Math.max(ls2, s - 2); }
        } else { document.execCommand('insertText', false, '  '); }
        changed(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        var s2 = code.selectionStart, e2 = code.selectionEnd, v2 = code.value, a = v2.lastIndexOf('\n', s2 - 1) + 1, b = v2.indexOf('\n', e2); if (b < 0) b = v2.length;
        var seg = v2.slice(a, b), all = seg.split('\n').every(function (l) { return /^\s*\/\*.*\*\/\s*$/.test(l) || !l.trim(); });
        var nseg = seg.split('\n').map(function (l) { return all ? l.replace(/^(\s*)\/\*\s?(.*?)\s?\*\/\s*$/, '$1$2') : (l.trim() ? l.replace(/^(\s*)(.*)$/, '$1/* $2 */') : l); }).join('\n');
        code.value = v2.slice(0, a) + nseg + v2.slice(b); code.selectionStart = a; code.selectionEnd = a + nseg.length; changed();
      }
    });
    function append(text) {
      var v = code.value.replace(/\s+$/, '');
      code.value = (v ? v + '\n\n' : '') + text + '\n';
      code.focus(); code.scrollTop = code.scrollHeight; code.selectionStart = code.selectionEnd = code.value.length; changed();
    }

    /* ---------- save, discard, history ---------- */
    function save() {
      if (!isDirty()) return Promise.resolve();
      if (!check()) { A.toast('Fix the problem shown above the editor first', 'bad'); return Promise.resolve(); }
      var btn = A.q('#csave', document); btn.disabled = true;
      return A.put(API + '/' + target, { css: code.value }).then(function (r) {
        st.saved = code.value; st.updatedAt = r.updatedAt || Date.now(); check();
        A.toast('Published. Visitors see it within about a minute.', 'ok');
      }).catch(function (e) { btn.disabled = false; A.fail(e); });
    }
    A.q('#csave', document).onclick = save;
    document.addEventListener('keydown', docKey);
    function docKey(e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && A.q('#code')) { e.preventDefault(); save(); } }
    A.onLeave = function () { document.removeEventListener('keydown', docKey); };
    A.guard = function (silent) { return !isDirty() || (silent ? false : confirm('You have CSS changes that are not saved. Leave without saving?')); };
    A.q('#cdiscard', view).onclick = function () { A.confirm({ title: 'Discard unsaved changes?', message: 'The editor goes back to the last published CSS.', ok: 'Discard', danger: true }).then(function (y) { if (y) { code.value = st.saved; changed(); } }); };
    A.q('#cclear', view).onclick = function () {
      A.confirm({ title: 'Clear all your CSS?', message: 'The editor is emptied. Press Save and publish to remove your styles from the site; the earlier text stays in History.', ok: 'Clear', danger: true }).then(function (y) { if (y) { code.value = ''; changed(); } });
    };
    A.q('#cdl', document).onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code.value], { type: 'text/css' })); a.download = 'kalyan-' + target + '-custom.css'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    A.q('#cimp', document).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      A.readFile(f, 'text').then(function (t) {
        function put() { code.value = t; changed(); A.toast('Imported. Review it, then save.', 'ok'); }
        if (code.value.trim()) A.confirm({ title: 'Replace the editor text?', message: 'The imported file replaces what is in the editor (not yet saved).', ok: 'Replace' }).then(function (y) { if (y) put(); }); else put();
      }); e.target.value = '';
    };
    A.q('#chist', document).onclick = function () {
      A.get(API + '/' + target + '/versions').then(function (d) {
        var ctl = A.modal({
          title: 'History: ' + T.label, size: 'wide',
          body: d.versions.length ? html`<p class="muted small" style="margin-bottom:10px">Each time you publish, the CSS that was live before is kept (the latest 30).</p><div class="cols even"><div style="max-height:380px;overflow:auto">${d.versions.map(function (v) { return html`<div class="hit" data-v="${v.savedAt}"><b>${A.fmt.date(v.savedAt)}</b> <span class="muted small">by ${v.by || '—'}</span><div class="small muted">${A.fmt.bytes(v.size)}${v.note ? ' · ' + v.note : ''}</div></div>`; })}</div><div id="vp" class="muted">Select a version to see it.</div></div>` : A.empty('No earlier versions', 'They appear after the second time you publish.'),
          footer: [{ label: 'Close' }]
        });
        A.on(ctl.body, 'click', '[data-v]', function (e, t) {
          A.qa('[data-v]', ctl.body).forEach(function (n) { n.style.background = ''; }); t.style.background = 'var(--accent-soft)';
          A.get(API + '/' + target + '/versions/' + t.getAttribute('data-v')).then(function (v) {
            A.q('#vp', ctl.body).innerHTML = '<pre class="mono" style="max-height:320px;overflow:auto;background:var(--surface-2);padding:10px;border-radius:8px;white-space:pre-wrap">' + esc(v.css) + '</pre><div style="margin-top:10px"><button class="btn primary" id="vload" type="button">Load into the editor</button><span class="hint"> (not published until you save)</span></div>';
            A.q('#vload', ctl.body).onclick = function () { code.value = v.css; ctl.close(); changed(); A.toast('Loaded. Press Save and publish to make it live.', 'ok'); };
          }).catch(A.fail);
        });
      }).catch(A.fail);
    };

    /* ---------- preview ---------- */
    var frame = null;
    function pushLive() {
      if (!frame || st.tool !== 'preview') return;
      var doc; try { doc = frame.contentDocument; } catch (e) { return; }
      if (!doc || !doc.head) return;
      var css = code.value;
      if (target === 'site') {
        var savedEl = doc.getElementById('kalyan-custom-css'); if (savedEl) savedEl.textContent = '';   // the page's own copy of the published CSS: the editor's text replaces it
        var el = doc.getElementById('kalyan-live-css');
        if (el) el.parentNode.removeChild(el);
        el = doc.createElement('style'); el.id = 'kalyan-live-css'; el.textContent = css; doc.head.appendChild(el);   // always last, so it wins
      } else {
        var el2 = doc.getElementById('kalyan-live-css');
        if (!el2) { el2 = doc.createElement('style'); el2.id = 'kalyan-live-css'; doc.head.appendChild(el2); }
        el2.textContent = css;
      }
    }
    function bookFrameDoc(bodyHtml) {
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><base href="/"><link rel="stylesheet" href="/master.css"><style>body{max-width:900px;margin:0 auto;padding:1rem}</style></head><body>' + bodyHtml + '</body></html>';
    }
    function showPreview() {
      var width = { desktop: '100%', tablet: '768px', phone: '390px' }[st.device];
      tool.innerHTML = html`<div class="css-pv-bar">
        ${target === 'site' ? html`<select id="pvpage" aria-label="Page to preview">${SITE_PAGES.map(function (p) { return html`<option value="${p[0]}" ${p[0] === st.page ? 'selected' : ''}>${p[1]}</option>`; })}</select>`
          : html`<select id="pvsrc" aria-label="Text to preview"><option value="">Sample text</option></select>`}
        <span class="row" style="gap:4px">${[['desktop', '🖥'], ['tablet', '▭'], ['phone', '📱']].map(function (d) { return html`<button class="btn sm tool ${st.device === d[0] ? 'on' : ''}" data-dev="${d[0]}" title="${d[0]}">${d[1]}</button>`; })}</span>
        ${target === 'site' ? html`<label class="check small"><input type="checkbox" id="pvdark" ${st.dark ? 'checked' : ''}> Dark</label>` : ''}</div>
        <div class="css-pv-wrap"><iframe id="pvframe" title="Preview" style="width:${width}"></iframe></div>
        <p class="hint" style="padding:6px 10px">${target === 'site' ? 'This is the real site; your unsaved CSS is applied on top as you type. Links inside the preview work.' : 'Your unsaved CSS is applied to sample text, or to the first paragraphs of a real book.'}</p>`.s;
      frame = A.q('#pvframe', tool);
      if (target === 'site') {
        frame.onload = function () {
          var apply = function () { try { frame.contentDocument.documentElement.setAttribute('data-theme', st.dark ? 'dark' : 'light'); } catch (e) {} pushLive(); };
          apply(); setTimeout(apply, 1800); setTimeout(apply, 4000);   // the app lays its own copy of the published CSS in after its data arrives
        };
        frame.src = st.page;
        A.q('#pvpage', tool).onchange = function (e) { st.page = e.target.value; frame.src = st.page; };
        A.q('#pvdark', tool).onchange = function (e) { st.dark = e.target.checked; try { frame.contentDocument.documentElement.setAttribute('data-theme', st.dark ? 'dark' : 'light'); } catch (x) {} };
      } else {
        frame.srcdoc = bookFrameDoc(SAMPLE_BOOK);
        frame.onload = pushLive;
        A.get('/api/admin/books?size=60&sort=size').then(function (d) {
          var small = d.books.filter(function (b) { return b.sizeKB < 600 && !b.created; }).slice(0, 25);
          A.q('#pvsrc', tool).insertAdjacentHTML('beforeend', small.map(function (b) { return '<option value="' + esc(b.file) + '">' + esc(b.title) + '</option>'; }).join(''));
        }).catch(function () {});
        A.q('#pvsrc', tool).onchange = function (e) {
          var file = e.target.value;
          if (!file) { frame.srcdoc = bookFrameDoc(SAMPLE_BOOK); return; }
          fetch('/Gita Press Books/Gita Press Books/' + file.split('/').map(encodeURIComponent).join('/')).then(function (r) { return r.text(); }).then(function (t) {
            var m = t.match(/<body[^>]*>([\s\S]*)<\/body>/i), body = (m ? m[1] : t).split(/<hr[^>]*page-break[^>]*>/i).slice(0, 3).join('<hr>');
            frame.srcdoc = bookFrameDoc(body.slice(0, 60000));
          }).catch(function () { A.toast('Could not load that book', 'bad'); });
        };
      }
      A.qa('[data-dev]', tool).forEach(function (b) { b.onclick = function () { st.device = b.getAttribute('data-dev'); frame.style.width = { desktop: '100%', tablet: '768px', phone: '390px' }[st.device]; A.qa('[data-dev]', tool).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    }

    /* ---------- colours (app only) ---------- */
    var colourState = null;
    function updateColours() { if (st.tool === 'colours' && colourState && !colourState.busy) showColours(true); }
    function showColours(keepScroll) {
      var light = rootVars(origText, false), dark = rootVars(origText, true);
      var curL = parseVars(getBlock(code.value, 'theme-light')), curD = parseVars(getBlock(code.value, 'theme-dark'));
      var scroll = keepScroll ? tool.scrollTop : 0;
      function rows(orig, cur, key) {
        return Object.keys(orig).filter(function (n) { return isColor(orig[n]) || /^--(radius|shadow)/.test(n); }).map(function (n) {
          var val = cur[n] !== undefined ? cur[n] : orig[n], hex = isColor(val) ? toHex(val) : null, changedVar = cur[n] !== undefined && cur[n] !== orig[n];
          return html`<div class="css-var"><label title="${n}">${n.replace(/^--/, '')}</label>
            ${hex ? html`<input type="color" value="${hex}" data-k="${key}" data-n="${n}" aria-label="${n}">` : html`<span></span>`}
            <input type="text" value="${val}" data-k="${key}" data-n="${n}" class="mono" aria-label="${n} value">
            <button class="btn sm ghost" data-reset="${key}|${n}" ${changedVar ? '' : 'disabled'} title="Back to the original">↺</button></div>`;
        });
      }
      tool.innerHTML = html`<div style="padding:12px"><p class="hint" style="margin-bottom:10px">Change a colour and it is written into a managed block at the top of your CSS (shown in the editor). Preview shows it live. Only colours you change are written.</p>
        <h3 style="margin:8px 0">Light theme</h3>${rows(light, curL, 'theme-light')}<h3 style="margin:16px 0 8px">Dark theme</h3>${rows(dark, curD, 'theme-dark')}</div>`.s;
      tool.scrollTop = scroll;
      colourState = { light: light, dark: dark };
      function write(key, name, value) {
        var orig = key === 'theme-light' ? light : dark, cur = parseVars(getBlock(code.value, key));
        if (value === '' || value === orig[name]) delete cur[name]; else cur[name] = value;
        code.value = setBlock(code.value, key, key === 'theme-light' ? ':root' : ':root[data-theme="dark"]', cur);
        gutter(); check(); live();
      }
      A.qa('input[data-n]', tool).forEach(function (inp) {
        inp.oninput = function () {
          var v = inp.value.trim();
          if (inp.type === 'color') { write(inp.getAttribute('data-k'), inp.getAttribute('data-n'), v); var t = A.q('input[type=text][data-n="' + inp.getAttribute('data-n') + '"][data-k="' + inp.getAttribute('data-k') + '"]', tool); if (t) t.value = v; }
          else if (v) { write(inp.getAttribute('data-k'), inp.getAttribute('data-n'), v); var hx = toHex(v), c = A.q('input[type=color][data-n="' + inp.getAttribute('data-n') + '"][data-k="' + inp.getAttribute('data-k') + '"]', tool); if (hx && c) c.value = hx; }
        };
        inp.onchange = function () { colourState.busy = false; showColours(true); };
        inp.onfocus = function () { colourState.busy = true; };
      });
      A.qa('[data-reset]', tool).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-reset').split('|'); write(p[0], p[1], ''); showColours(true); }; });
    }

    /* ---------- original rules ---------- */
    function showOriginal() {
      tool.innerHTML = html`<div style="padding:12px"><input type="search" id="oq" placeholder="Search selectors or properties, e.g. .Shlok, color, sidebar…" style="margin-bottom:8px"><p class="hint" id="ocount" style="margin-bottom:8px"></p><div id="olist"></div></div>`.s;
      if (!(window.CSSStyleSheet && CSSStyleSheet.prototype.replaceSync)) { A.q('#olist', tool).innerHTML = '<div class="notice warn">This browser cannot read stylesheets here. Use a recent Chrome, Edge or Firefox.</div>'; return; }
      if (!origText) { A.q('#olist', tool).innerHTML = '<div class="notice warn">The original stylesheet could not be loaded.</div>'; return; }
      var sheet = new CSSStyleSheet(); sheet.replaceSync(origText);
      var rules = Array.prototype.slice.call(sheet.cssRules).filter(function (r) { return r.type === 1 || r.type === 4; });
      var texts = rules.map(function (r) { return r.type === 1 ? formatRule(r) : formatRule(r); });
      function draw(term) {
        term = term.trim().toLowerCase();
        var hits = [];
        for (var i = 0; i < rules.length && hits.length < 60; i++) if (!term || texts[i].toLowerCase().indexOf(term) !== -1) hits.push(i);
        A.q('#ocount', tool).textContent = term ? hits.length + (hits.length === 60 ? '+' : '') + ' matching rules' : rules.length + ' rules in ' + T.file.slice(1) + '. Showing the first 60; search to narrow.';
        A.q('#olist', tool).innerHTML = hits.map(function (i) { return '<div class="css-rule"><pre class="mono">' + esc(texts[i].length > 700 ? texts[i].slice(0, 700) + '\n…' : texts[i]) + '</pre><button class="btn sm" data-add="' + i + '">Copy into my CSS</button></div>'; }).join('') || '<div class="empty small">No rule matches</div>';
      }
      draw('');
      A.q('#oq', tool).oninput = A.debounce(function (e) { draw(e.target.value); }, 200);
      A.on(tool, 'click', '[data-add]', function (e, t) { append(texts[Number(t.getAttribute('data-add'))]); A.toast('Added at the end of your CSS. Change the values and watch the preview.', 'ok'); });
    }

    function setTool(name) {
      st.tool = name; frame = null; colourState = null;
      A.qa('[data-tool]', view).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tool') === name); });
      if (name === 'preview') showPreview(); else if (name === 'colours') showColours(); else showOriginal();
    }
    A.qa('[data-tool]', view).forEach(function (b) { b.onclick = function () { setTool(b.getAttribute('data-tool')); }; });
    gutter(); check(); setTool('preview');
  }
})();
