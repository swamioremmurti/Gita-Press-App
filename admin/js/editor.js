/* Chapter editor: pick a book, then edit it chapter by chapter.
   - Chapters are the pieces between <hr class="page-break"> lines, exactly as the reader cuts them.
   - The visual editor is an iframe that loads the book's own stylesheet, so paragraphs look the way readers see them.
   - Every save keeps the previous text (History); deleted chapters can be recovered (Trash). */
(function () {
  'use strict';
  var A = window.Admin, html = A.html, esc = A.esc;
  var API = '/api/admin';
  var COMMON_STYLES = ['Heading', 'Sub-Heading', 'TXT', 'TXT-Bold', 'TXT-Right', 'Shlok', 'Shlok-Right', 'Numbers', 'Separator', 'Footnotes', 'cover-Book-Name', 'cover-Shri-Hari', 'cover-Publisher-Note', 'Image'];
  var BASE = '/Gita%20Press%20Books/Gita%20Press%20Books/';

  /* ------------------------------------------------------------ picker (no book chosen yet) */
  function bookPicker(view) {
    A.setPage('Chapter editor', 'Choose a book to edit');
    view.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="pq" placeholder="Search for a book…" autofocus></div><div id="plist"></div>`.s;
    var list = A.q('#plist', view);
    function load(text) {
      A.get(API + '/books' + A.qs({ q: text, size: 30 })).then(function (d) {
        list.innerHTML = d.books.length ? html`<div class="table-wrap"><table class="tbl"><tbody>${d.books.map(function (b) {
          return html`<tr><td style="width:44px">${A.coverEl(b)}</td><td><div class="t-title hi">${b.title}</div><div class="t-sub hi">${b.file}</div></td>
            <td class="muted">${b.doc && b.doc.updatedAt ? 'Edited ' + A.fmt.ago(b.doc.updatedAt) : ''}</td><td class="acts"><a class="btn sm primary" href="#/editor?file=${encodeURIComponent(b.file)}">Edit chapters</a></td></tr>`;
        })}</tbody></table></div>${d.total > d.books.length ? html`<p class="muted small" style="margin-top:8px">Showing ${d.books.length} of ${d.total}. Type to narrow the list.</p>` : ''}`.s : A.empty('No books found').s;
      }).catch(function (e) { list.innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
    }
    A.q('#pq', view).oninput = A.debounce(function (e) { load(e.target.value.trim()); }, 250);
    load('');
  }

  /* ------------------------------------------------------------ the editor */
  A.route('/editor', function (q, view) {
    var file = q.get('file');
    if (!file) return bookPicker(view);
    A.setPage('Chapter editor', file);
    view.innerHTML = html`<div class="loading"><span class="spinner"></span><div style="margin-top:10px">Opening the book…<br><span class="small">The first time a book is opened here it is copied into the database, which can take a few seconds for a large book.</span></div></div>`.s;
    return Promise.all([A.get(API + '/books/' + encodeURIComponent(file)), A.get(API + '/books/' + encodeURIComponent(file) + '/chapters')]).then(function (res) {
      Editor(view, res[0].book, res[1], q.get('ch'));
    });
  }, { full: true });

  function Editor(view, book, data, wantedId) {
    var st = {
      file: book.file, book: book, chapters: data.chapters, origin: data.origin, modified: data.modified,
      cur: null,            // { id, title, saved (html as stored), head }
      mode: 'visual', labels: false, touched: false, baseV: '', baseT: '', styles: [], filter: '', saving: false
    };
    var frame = null, fdoc = null, ta = null;

    A.setPage(book.title, 'Chapter editor · ' + data.chapters.length + ' chapters', html`<a class="btn" href="#/books/edit?file=${encodeURIComponent(book.file)}">Book details</a>`);
    view.innerHTML = html`<div class="ed">
      <aside class="ed-side">
        <div class="ed-side-h"><input type="search" id="cfilter" placeholder="Filter chapters…" style="flex:1 1 100%"><button class="btn sm primary" id="cadd" type="button">+ Add chapter</button>
          <span class="muted small" id="ccount" style="align-self:center"></span></div>
        <div class="ed-list" id="clist" role="listbox" aria-label="Chapters"></div>
      </aside>
      <section class="ed-main">
        <div class="ed-bar" id="docbar">
          <button class="btn primary sm" id="bsave" type="button" title="Ctrl+S">Save</button>
          <button class="btn sm" id="brevert" type="button" title="Throw away unsaved changes">Discard changes</button>
          <span class="sep"></span>
          <button class="btn sm" id="bhist" type="button">History</button>
          <button class="btn sm" id="bfind" type="button">Find &amp; replace</button>
          <button class="btn sm" id="btrash" type="button">Trash</button>
          <span class="sep"></span>
          <button class="btn sm" id="bup" type="button" title="Move this chapter up">↑</button><button class="btn sm" id="bdown" type="button" title="Move this chapter down">↓</button>
          <button class="btn sm" id="bsplit" type="button" title="Start a new chapter at the paragraph where the cursor is">Split here</button>
          <button class="btn sm" id="bmerge" type="button" title="Join the next chapter onto the end of this one">Merge next</button>
          <button class="btn sm danger" id="bdelch" type="button">Delete</button>
          <span class="right row" style="gap:6px"><span class="tabs" style="margin:0;border:0"><button class="tab active" id="mvis" type="button">Visual</button><button class="tab" id="mhtml" type="button">HTML</button></span>
          <button class="btn sm" id="bmore" type="button">More ▾</button></span>
        </div>
        <div class="ed-bar" id="fmtbar">
          <select id="fstyle" title="Paragraph style" class="hi"></select>
          <button class="btn sm tool" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="btn sm tool" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="btn sm tool" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
          <button class="btn sm tool" data-cmd="removeFormat" title="Clear text formatting">T<sub>x</sub></button>
          <span class="sep"></span>
          <button class="btn sm tool" data-cmd="undo" title="Undo">↶</button><button class="btn sm tool" data-cmd="redo" title="Redo">↷</button>
          <span class="sep"></span>
          <button class="btn sm" id="fimg" type="button">Image</button><button class="btn sm" id="flink" type="button">Link</button>
          <span class="sep"></span>
          <button class="btn sm" id="fpup" type="button" title="Move paragraph up">¶↑</button><button class="btn sm" id="fpdown" type="button" title="Move paragraph down">¶↓</button>
          <button class="btn sm" id="fpadd" type="button" title="Add a paragraph below">¶+</button><button class="btn sm" id="fpdel" type="button" title="Delete paragraph">¶×</button>
          <label class="check small right"><input type="checkbox" id="flabels"> Show style names</label>
        </div>
        <div id="draftbar" hidden></div>
        <div class="ed-body" id="edbody"></div>
        <div class="ed-foot"><span id="fstat"></span><span class="right">Ctrl+S saves · changes are kept as History</span></div>
      </section></div>`.s;

    var clist = A.q('#clist', view), edbody = A.q('#edbody', view);

    /* ---------- chapter list ---------- */
    function renderList() {
      var f = st.filter.toLowerCase();
      var items = st.chapters.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return !f || x.c.title.toLowerCase().indexOf(f) !== -1 || String(x.i + 1) === f; });
      clist.innerHTML = items.length ? items.map(function (x) {
        return '<div class="ch-item' + (st.cur && st.cur.id === x.c.id ? ' active' : '') + '" role="option" draggable="true" data-id="' + x.c.id + '">' +
          '<span class="grab" title="Drag to reorder">⋮⋮</span><span class="no">' + (x.i + 1) + '</span><span class="tt" title="' + esc(x.c.title) + '">' + esc(x.c.title) + '</span>' +
          (x.c.edited ? '<span class="dot" title="Edited here"></span>' : '') + '</div>';
      }).join('') : '<div class="empty small">No chapter matches</div>';
      A.q('#ccount', view).textContent = st.chapters.length + ' chapters';
    }
    function curIndex() { return st.cur ? st.chapters.findIndex(function (c) { return c.id === st.cur.id; }) : -1; }
    function refreshList() {
      return A.get(API + '/books/' + encodeURIComponent(st.file) + '/chapters').then(function (d) { st.chapters = d.chapters; st.modified = d.modified; renderList(); });
    }

    var dragId = null;
    clist.addEventListener('dragstart', function (e) { var t = e.target.closest('.ch-item'); if (t) { dragId = Number(t.getAttribute('data-id')); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(dragId)); } catch (x) {} } });
    clist.addEventListener('dragover', function (e) {
      var t = e.target.closest('.ch-item'); if (!t || dragId === null) return;
      e.preventDefault(); A.qa('.ch-item.drop', clist).forEach(function (n) { n.classList.remove('drop'); }); t.classList.add('drop');
    });
    clist.addEventListener('dragleave', function (e) { var t = e.target.closest('.ch-item'); if (t) t.classList.remove('drop'); });
    clist.addEventListener('drop', function (e) {
      var t = e.target.closest('.ch-item'); if (!t || dragId === null) return;
      e.preventDefault();
      var toId = Number(t.getAttribute('data-id')), ids = st.chapters.map(function (c) { return c.id; });
      var from = ids.indexOf(dragId), to = ids.indexOf(toId);
      dragId = null;
      if (from < 0 || to < 0 || from === to) { renderList(); return; }
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      A.post(API + '/books/' + encodeURIComponent(st.file) + '/reorder', { ids: ids }).then(refreshList).catch(function (err) { A.fail(err); renderList(); });
    });
    clist.addEventListener('click', function (e) {
      var t = e.target.closest('.ch-item');
      if (t) selectChapter(Number(t.getAttribute('data-id')));
    });
    A.q('#cfilter', view).oninput = function (e) { st.filter = e.target.value.trim(); renderList(); };

    /* ---------- the editing surface ---------- */
    function normalize(h) {
      return String(h).replace(/ (?=\s|<)/g, '&nbsp;').replace(/<\/(p|div|h[1-6]|ul|ol|table|blockquote|figure)>[ \t]*(?=<)/gi, '$&\n').replace(/\s+$/, '').replace(/^\s+/, '');
    }
    function frameSource(head, body) {
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><base href="' + BASE + '">' + head +
        '<style>html{background:#fff}body{min-height:92vh;outline:0;caret-color:#a51512}p:hover{outline:1px dashed rgba(165,21,18,.35);outline-offset:2px}' +
        'body.show-labels p::before{content:attr(class);display:block;font:600 10px/1.2 system-ui,sans-serif;color:#a51512;opacity:.75;margin-bottom:2px;text-align:left}' +
        'img{max-width:100%;height:auto}</style></head><body contenteditable="true" spellcheck="false">' + body + '</body></html>';
    }
    function ensureSurface() {
      if (frame) return Promise.resolve();
      edbody.innerHTML = '';
      frame = document.createElement('iframe'); frame.title = 'Chapter text'; frame.setAttribute('sandbox', 'allow-same-origin');
      ta = document.createElement('textarea'); ta.spellcheck = false; ta.hidden = true; ta.setAttribute('aria-label', 'Chapter HTML');
      edbody.appendChild(frame); edbody.appendChild(ta);
      ta.addEventListener('input', onEdit);
      return Promise.resolve();
    }
    function loadFrame(bodyHtml) {
      return new Promise(function (resolve) {
        frame.onload = function () {
          fdoc = frame.contentDocument;
          try { fdoc.execCommand('defaultParagraphSeparator', false, 'p'); fdoc.execCommand('styleWithCSS', false, false); } catch (e) {}
          fdoc.body.classList.toggle('show-labels', st.labels);
          fdoc.addEventListener('input', onEdit);
          fdoc.addEventListener('keyup', syncStyle); fdoc.addEventListener('mouseup', syncStyle);
          fdoc.addEventListener('keydown', onKey);
          fdoc.addEventListener('paste', onPaste);
          fdoc.addEventListener('dragover', function (e) { e.preventDefault(); });
          fdoc.addEventListener('drop', function (e) { e.preventDefault(); });
          frame.onload = null;
          resolve();
        };
        frame.srcdoc = frameSource(st.cur.head, bodyHtml);
      });
    }
    function serialize() { return fdoc ? normalize(fdoc.body.innerHTML) : ''; }
    function getHtml() { return st.mode === 'html' ? ta.value.trim() : serialize(); }
    function isDirty() {
      if (!st.cur) return false;
      if (st.touched) return true;
      return st.mode === 'html' ? ta.value !== st.baseT : serialize() !== st.baseV;
    }
    function setBaselines() {
      st.touched = false;
      st.baseV = serialize();
      st.baseT = ta.value;
    }
    function updateStatus() {
      var dirty = isDirty(), h = getHtml();
      var paras = (h.match(/<p[\s>]/gi) || []).length;
      A.q('#fstat', view).innerHTML = (st.cur ? 'Chapter ' + (curIndex() + 1) + ' of ' + st.chapters.length + ' · ' + paras + ' paragraphs · ' + A.fmt.bytes(new Blob([h]).size) : '') +
        (dirty ? ' · <span class="dirty">Unsaved changes</span>' : (st.savedAt ? ' · Saved ' + st.savedAt : ''));
      A.q('#bsave', view).disabled = !dirty || st.saving;
      A.q('#brevert', view).disabled = !dirty;
    }
    var draftTimer = null;
    function onEdit() {
      updateStatus();
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        if (!st.cur) return;
        var key = 'kalyan_admin_draft_' + st.cur.id;
        try { if (isDirty()) localStorage.setItem(key, JSON.stringify({ html: getHtml(), at: Date.now() })); else localStorage.removeItem(key); } catch (e) {}
      }, 1500);
    }
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    }
    function onPaste(e) {
      e.preventDefault();
      var text = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r/g, '');
      text.split('\n').forEach(function (ln, i) {
        if (i > 0) fdoc.execCommand('insertParagraph');
        if (ln) fdoc.execCommand('insertText', false, ln);
      });
      onEdit();
    }
    document.addEventListener('keydown', docKey);
    function docKey(e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && A.q('#bsave')) { e.preventDefault(); save(); } }
    var prevLeave = A.onLeave;
    A.onLeave = function () {
      document.removeEventListener('keydown', docKey);
      clearTimeout(draftTimer);
      if (prevLeave) prevLeave();
    };
    A.guard = function (silent) {
      if (!isDirty()) return true;
      return silent ? false : confirm('This chapter has unsaved changes. Leave without saving?');
    };

    /* ---------- paragraphs + styles ---------- */
    function blocks() {
      if (!fdoc) return [];
      var s = fdoc.getSelection();
      var kids = Array.prototype.slice.call(fdoc.body.children);
      if (!s || !s.rangeCount) return [];
      var r = s.getRangeAt(0);
      if (r.collapsed) {
        var n = r.startContainer.nodeType === 3 ? r.startContainer.parentNode : r.startContainer;
        while (n && n.parentNode !== fdoc.body) n = n.parentNode;
        return n && n !== fdoc.body ? [n] : [];
      }
      return kids.filter(function (k) { try { return r.intersectsNode(k); } catch (e) { return false; } });
    }
    function styleOptions() {
      var seen = {}, out = [];
      st.styles.forEach(function (s) { if (!seen[s.cls]) { seen[s.cls] = 1; out.push([s.cls, s.cls + ' (' + s.n + ')']); } });
      COMMON_STYLES.forEach(function (c) { if (!seen[c]) { seen[c] = 1; out.push([c, c]); } });
      return out;
    }
    function buildStyleSelect(extra) {
      var sel = A.q('#fstyle', view);
      var opts = styleOptions();
      if (extra && !opts.some(function (o) { return o[0] === extra; })) opts.unshift([extra, extra]);
      sel.innerHTML = '<option value="">(no style)</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '<option value="__other">Other…</option>';
    }
    function syncStyle() {
      var b = blocks()[0], sel = A.q('#fstyle', view);
      if (!b) return;
      var cls = (b.getAttribute('class') || '').trim();
      if (cls && !Array.prototype.some.call(sel.options, function (o) { return o.value === cls; })) buildStyleSelect(cls);
      sel.value = cls;
      A.qa('[data-cmd]', view).forEach(function (btn) {
        var c = btn.getAttribute('data-cmd');
        if (c === 'bold' || c === 'italic' || c === 'underline') { try { btn.classList.toggle('on', fdoc.queryCommandState(c)); } catch (e) {} }
      });
    }
    A.q('#fstyle', view).onchange = function (e) {
      var v = e.target.value;
      if (v === '__other') {
        A.prompt({ title: 'Paragraph style', label: 'CSS class name', hint: 'Use a class that exists in the book’s stylesheet.' }).then(function (name) {
          if (name && /^[A-Za-z0-9_\- ]+$/.test(name.trim())) applyStyle(name.trim()); else syncStyle();
        });
        return;
      }
      applyStyle(v);
    };
    function applyStyle(cls) {
      var bs = blocks();
      if (!bs.length) { A.toast('Click inside a paragraph first', 'bad'); return; }
      bs.forEach(function (b) { if (cls) b.setAttribute('class', cls); else b.removeAttribute('class'); });
      buildStyleSelect(cls); A.q('#fstyle', view).value = cls || '';
      onEdit();
    }
    A.qa('[data-cmd]', view).forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.onclick = function () { if (!fdoc || st.mode !== 'visual') return; fdoc.body.focus(); fdoc.execCommand(btn.getAttribute('data-cmd')); onEdit(); syncStyle(); };
    });
    A.q('#flabels', view).onchange = function (e) { st.labels = e.target.checked; if (fdoc) fdoc.body.classList.toggle('show-labels', st.labels); };
    function withBlock(fn) {
      var b = blocks()[0];
      if (!b) { A.toast('Click inside a paragraph first', 'bad'); return; }
      fn(b); onEdit(); syncStyle();
    }
    function caretTo(el) {
      var r = fdoc.createRange(); r.selectNodeContents(el); r.collapse(true);
      var s = fdoc.getSelection(); s.removeAllRanges(); s.addRange(r); el.scrollIntoView({ block: 'nearest' });
    }
    A.q('#fpup', view).onclick = function () { withBlock(function (b) { if (b.previousElementSibling) { b.parentNode.insertBefore(b, b.previousElementSibling); caretTo(b); } }); };
    A.q('#fpdown', view).onclick = function () { withBlock(function (b) { if (b.nextElementSibling) { b.parentNode.insertBefore(b.nextElementSibling, b); caretTo(b); } }); };
    A.q('#fpadd', view).onclick = function () {
      withBlock(function (b) {
        var p = fdoc.createElement('p'); var c = b.getAttribute('class'); if (c) p.setAttribute('class', c); p.innerHTML = '<br>';
        b.parentNode.insertBefore(p, b.nextSibling); caretTo(p);
      });
    };
    A.q('#fpdel', view).onclick = function () {
      withBlock(function (b) { var n = b.nextElementSibling || b.previousElementSibling; b.remove(); if (n) caretTo(n); });
    };
    A.q('#fimg', view).onclick = function () {
      if (st.mode !== 'visual') { A.toast('Switch to Visual to insert an image', 'bad'); return; }
      var b = blocks()[0];
      A.pickMedia({ kind: 'image', title: 'Insert an image' }).then(function (m) {
        if (!m) return;
        var p = fdoc.createElement('p'); p.setAttribute('class', 'Image');
        var img = fdoc.createElement('img'); img.setAttribute('src', m.url); img.setAttribute('alt', m.alt || ''); p.appendChild(img);
        if (b) b.parentNode.insertBefore(p, b.nextSibling); else fdoc.body.appendChild(p);
        onEdit();
      });
    };
    A.q('#flink', view).onclick = function () {
      if (st.mode !== 'visual') return;
      var s = fdoc.getSelection();
      if (!s || s.isCollapsed) { A.toast('Select the words to link first', 'bad'); return; }
      A.prompt({ title: 'Add a link', label: 'Address', placeholder: 'https://…' }).then(function (url) {
        if (url && /^(https?:\/\/|\/|mailto:)/i.test(url.trim())) { fdoc.execCommand('createLink', false, url.trim()); onEdit(); } else if (url) A.toast('The address must start with https:// or /', 'bad');
      });
    };

    /* ---------- modes ---------- */
    function setMode(mode) {
      if (mode === st.mode || !st.cur) return;
      if (mode === 'html') {
        var h = serialize();
        if (serialize() !== st.baseV) st.touched = true;
        ta.value = h; if (!st.baseT) st.baseT = h;
        frame.hidden = true; ta.hidden = false; A.q('#fmtbar', view).hidden = true;
        st.mode = 'html';
        // baseline of the text view = what visual mode showed when the chapter was loaded
        st.baseT = normalize(st.baseVHtml || h);
      } else {
        var edited = ta.value !== st.baseT;
        if (edited) st.touched = true;
        st.mode = 'visual';
        frame.hidden = false; ta.hidden = true; A.q('#fmtbar', view).hidden = false;
        var keep = st.baseV;
        loadFrame(ta.value).then(function () { st.baseV = keep; syncStyle(); updateStatus(); });
      }
      A.q('#mvis', view).classList.toggle('active', st.mode === 'visual');
      A.q('#mhtml', view).classList.toggle('active', st.mode === 'html');
      updateStatus();
    }
    A.q('#mvis', view).onclick = function () { setMode('visual'); };
    A.q('#mhtml', view).onclick = function () { setMode('html'); };

    /* ---------- loading + switching chapters ---------- */
    function openChapter(id) {
      return A.get(API + '/chapters/' + id).then(function (d) {
        return ensureSurface().then(function () {
          st.cur = { id: id, title: d.chapter.title, saved: d.chapter.html, head: d.head || '' };
          st.mode = 'visual'; st.savedAt = '';
          frame.hidden = false; ta.hidden = true; A.q('#fmtbar', view).hidden = false;
          A.q('#mvis', view).classList.add('active'); A.q('#mhtml', view).classList.remove('active');
          ta.value = d.chapter.html;
          return loadFrame(d.chapter.html);
        });
      }).then(function () {
        st.baseV = serialize(); st.baseVHtml = st.baseV; st.baseT = ta.value; st.touched = false;
        buildStyleSelect(); syncStyle();
        history.replaceState(null, '', '#/editor?file=' + encodeURIComponent(st.file) + '&ch=' + id);
        renderList(); updateStatus();
        var active = A.q('.ch-item.active', clist); if (active) active.scrollIntoView({ block: 'nearest' });
        offerDraft();
      });
    }
    function offerDraft() {
      var bar = A.q('#draftbar', view); bar.hidden = true;
      var raw = null;
      try { raw = localStorage.getItem('kalyan_admin_draft_' + st.cur.id); } catch (e) {}
      if (!raw) return;
      var d; try { d = JSON.parse(raw); } catch (e) { return; }
      if (!d || !d.html || normalize(d.html) === normalize(st.cur.saved)) { try { localStorage.removeItem('kalyan_admin_draft_' + st.cur.id); } catch (e) {} return; }
      bar.hidden = false;
      bar.innerHTML = html`<div class="notice warn preview-notice row">An unsaved draft from ${A.fmt.date(d.at)} was found for this chapter.<span class="right row" style="gap:6px"><button class="btn sm" id="dbrestore" type="button">Restore draft</button><button class="btn sm ghost" id="dbdrop" type="button">Discard</button></span></div>`.s;
      A.q('#dbrestore', bar).onclick = function () {
        bar.hidden = true;
        ta.value = d.html;
        loadFrame(d.html).then(function () { st.touched = true; updateStatus(); });
      };
      A.q('#dbdrop', bar).onclick = function () { bar.hidden = true; try { localStorage.removeItem('kalyan_admin_draft_' + st.cur.id); } catch (e) {} };
    }
    function selectChapter(id) {
      if (st.cur && st.cur.id === id) return Promise.resolve();
      if (!isDirty()) return openChapter(id).catch(A.fail);
      return new Promise(function (resolve) {
        A.modal({
          title: 'Unsaved changes', size: 'narrow', body: html`<p>This chapter has changes that are not saved yet.</p>`,
          footer: [
            { label: 'Stay here', result: false, onClick: function () { resolve(); } },
            { label: 'Discard and switch', kind: 'danger', onClick: function () { return openChapter(id).then(resolve, function (e) { A.fail(e); resolve(); }); } },
            { label: 'Save and switch', kind: 'primary', onClick: function () { return save().then(function (ok) { if (!ok) return false; return openChapter(id).then(resolve); }); } }
          ],
          onClose: function () { resolve(); }
        });
      });
    }

    /* ---------- save, discard ---------- */
    function save() {
      if (!st.cur || st.saving) return Promise.resolve(false);
      var h = getHtml();
      if (!h) { A.toast('A chapter cannot be empty', 'bad'); return Promise.resolve(false); }
      st.saving = true; updateStatus();
      return A.put(API + '/chapters/' + st.cur.id, { html: h }).then(function (r) {
        st.saving = false;
        try { localStorage.removeItem('kalyan_admin_draft_' + st.cur.id); } catch (e) {}
        st.savedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        var c = st.chapters.find(function (x) { return x.id === st.cur.id; });
        if (c) { c.title = r.title; c.size = r.size; if (r.changed) c.edited = true; }
        st.modified = st.modified || r.changed;
        A.toast(r.changed ? 'Saved' : 'No changes to save', r.changed ? 'ok' : '');
        return openChapter(st.cur.id).then(function () { st.savedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); updateStatus(); return true; });
      }).catch(function (e) { st.saving = false; updateStatus(); A.fail(e); return false; });
    }
    A.q('#bsave', view).onclick = save;
    A.q('#brevert', view).onclick = function () {
      A.confirm({ title: 'Discard unsaved changes?', message: 'This chapter goes back to its last saved text.', ok: 'Discard', danger: true }).then(function (yes) {
        if (yes) { try { localStorage.removeItem('kalyan_admin_draft_' + st.cur.id); } catch (e) {} openChapter(st.cur.id).catch(A.fail); }
      });
    };

    /* ---------- chapter operations ---------- */
    function needSaved(then) {
      if (!isDirty()) return then();
      A.toast('Save this chapter first', 'bad');
    }
    A.q('#cadd', view).onclick = function () {
      needSaved(function () {
        A.post(API + '/books/' + encodeURIComponent(st.file) + '/chapters', { afterId: st.cur ? st.cur.id : undefined }).then(function (r) {
          return refreshList().then(function () { return openChapter(r.id); });
        }).catch(A.fail);
      });
    };
    function moveChapter(delta) {
      needSaved(function () {
        var ids = st.chapters.map(function (c) { return c.id; }), i = curIndex(), j = i + delta;
        if (j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]);
        A.post(API + '/books/' + encodeURIComponent(st.file) + '/reorder', { ids: ids }).then(function () { return refreshList(); }).then(updateStatus).catch(A.fail);
      });
    }
    A.q('#bup', view).onclick = function () { moveChapter(-1); };
    A.q('#bdown', view).onclick = function () { moveChapter(1); };
    A.q('#bdelch', view).onclick = function () {
      var i = curIndex();
      A.confirm({ title: 'Delete this chapter?', message: '“' + st.cur.title + '” will be removed. You can bring it back from Trash.', ok: 'Delete chapter', danger: true }).then(function (yes) {
        if (!yes) return;
        var next = st.chapters[i + 1] || st.chapters[i - 1];
        st.touched = false; st.baseV = serialize(); st.baseT = ta.value;      // the deleted chapter's edits are not worth guarding
        A.del(API + '/chapters/' + st.cur.id).then(function () {
          A.toast('Chapter deleted', 'ok');
          st.cur = null;
          return refreshList().then(function () { return next ? openChapter(next.id) : null; });
        }).catch(A.fail);
      });
    };
    A.q('#bsplit', view).onclick = function () {
      if (st.mode !== 'visual') { A.toast('Switch to Visual mode to split at the cursor', 'bad'); return; }
      var b = blocks()[0];
      if (!b) { A.toast('Click in the paragraph where the new chapter should start', 'bad'); return; }
      var kids = Array.prototype.slice.call(fdoc.body.children), at = kids.indexOf(b);
      if (at <= 0) { A.toast('Place the cursor below the first paragraph', 'bad'); return; }
      var before = normalize(kids.slice(0, at).map(function (k) { return k.outerHTML; }).join('\n'));
      var after = normalize(kids.slice(at).map(function (k) { return k.outerHTML; }).join('\n'));
      A.confirm({ title: 'Split this chapter?', message: 'The new chapter starts at the paragraph you clicked (' + (kids.length - at) + ' paragraphs move to it).', ok: 'Split' }).then(function (yes) {
        if (!yes) return;
        var id = st.cur.id;
        A.put(API + '/chapters/' + id, { html: before, note: 'before split' }).then(function () {
          return A.post(API + '/books/' + encodeURIComponent(st.file) + '/chapters', { afterId: id, html: after });
        }).then(function (r) { return refreshList().then(function () { return openChapter(r.id); }); }).then(function () { A.toast('Chapter split', 'ok'); }).catch(A.fail);
      });
    };
    A.q('#bmerge', view).onclick = function () {
      needSaved(function () {
        var i = curIndex(), next = st.chapters[i + 1];
        if (!next) { A.toast('This is the last chapter', 'bad'); return; }
        A.confirm({ title: 'Merge with the next chapter?', message: '“' + next.title + '” will be joined onto the end of this chapter.', ok: 'Merge' }).then(function (yes) {
          if (!yes) return;
          var curId = st.cur.id;
          A.get(API + '/chapters/' + next.id).then(function (d) {
            return A.put(API + '/chapters/' + curId, { html: st.cur.saved + '\n' + d.chapter.html, note: 'before merge' }).then(function () { return A.del(API + '/chapters/' + next.id); });
          }).then(refreshList).then(function () { return openChapter(curId); }).then(function () { A.toast('Chapters merged', 'ok'); }).catch(A.fail);
        });
      });
    };

    /* ---------- history ---------- */
    A.q('#bhist', view).onclick = function () {
      if (!st.cur) return;
      var id = st.cur.id;
      A.get(API + '/chapters/' + id + '/versions').then(function (d) {
        var ctl = A.modal({
          title: 'History of “' + st.cur.title + '”', size: 'wide',
          body: d.versions.length ? html`<p class="muted small" style="margin-bottom:10px">Each time you save, the text before the change is kept (the latest 25).</p>
            <div class="cols even"><div id="vlist">${d.versions.map(function (v) { return html`<div class="hit" data-v="${v.id}"><b>${A.fmt.date(v.createdAt)}</b> <span class="badge">${v.note || 'saved version'}</span><div class="small muted">${A.fmt.bytes(v.size)}</div></div>`; })}</div>
            <div><div id="vprev" class="muted">Select a version to preview it.</div></div></div>` : A.empty('No earlier versions', 'They appear after the first save.'),
          footer: [{ label: 'Close' }]
        });
        var chosen = null;
        A.on(ctl.body, 'click', '[data-v]', function (e, t) {
          A.qa('[data-v]', ctl.body).forEach(function (n) { n.style.background = ''; }); t.style.background = 'var(--accent-soft)';
          A.get(API + '/versions/' + t.getAttribute('data-v')).then(function (r) {
            chosen = r.version;
            A.q('#vprev', ctl.body).innerHTML = '<iframe class="diffbox" sandbox="allow-same-origin" srcdoc="' + esc(frameSource(st.cur.head, r.version.html).replace('contenteditable="true"', '')) + '"></iframe><div style="margin-top:10px"><button class="btn primary" id="vrestore" type="button">Restore this version</button></div>';
            A.q('#vrestore', ctl.body).onclick = function () {
              needSaved(function () {
                A.post(API + '/chapters/' + id + '/restore', { versionId: chosen.id }).then(function () { A.toast('Version restored', 'ok'); ctl.close(); return openChapter(id); }).catch(A.fail);
              });
            };
          }).catch(A.fail);
        });
      }).catch(A.fail);
    };

    /* ---------- find & replace across the book ---------- */
    A.q('#bfind', view).onclick = function () {
      needSaved(function () {
        var ctl = A.modal({
          title: 'Find & replace in this book', size: 'wide',
          body: html`<div class="grid2"><div class="field"><label for="rf">Find</label><input type="text" id="rf" class="hi"></div><div class="field"><label for="rr">Replace with</label><input type="text" id="rr" class="hi"></div></div>
            <div class="row" style="margin-bottom:12px"><label class="check"><input type="checkbox" id="rcase"> Match case</label><label class="check"><input type="checkbox" id="rre"> Regular expression</label>
            <button class="btn" id="rgo" type="button">Find matches</button></div>
            <p class="hint" style="margin:-4px 0 10px">Only the words readers see are changed, never the formatting tags. Every change is kept in History.</p><div id="rres"></div>`,
          footer: [{ label: 'Close' }, { label: 'Replace all', kind: 'primary', onClick: function (c) { return doReplace(c, true); } }]
        });
        function opts(apply) {
          return { find: A.q('#rf', ctl.body).value, replace: A.q('#rr', ctl.body).value, caseSensitive: A.q('#rcase', ctl.body).checked, regex: A.q('#rre', ctl.body).checked, apply: apply };
        }
        function show(r, applied) {
          A.q('#rres', ctl.body).innerHTML = r.total ? html`<div class="notice ${applied ? '' : 'info'}"><b>${r.total}</b> match${r.total === 1 ? '' : 'es'} in <b>${r.chapters}</b> chapter${r.chapters === 1 ? '' : 's'}${applied ? ' — replaced.' : '.'}</div>
            <div style="max-height:260px;overflow:auto;margin-top:8px;border:1px solid var(--line);border-radius:8px">${r.hits.map(function (h) { return html`<div class="hit" data-open="${h.id}"><b class="hi">${h.pos + 1}. ${h.title}</b> <span class="badge">${h.count}</span><div class="small muted hi">…${h.sample}…</div></div>`; })}</div>`.s : html`<div class="notice">No matches.</div>`.s;
        }
        A.on(ctl.body, 'click', '[data-open]', function (e, t) { ctl.close(); selectChapter(Number(t.getAttribute('data-open'))); });
        A.q('#rgo', ctl.body).onclick = function () {
          if (!A.q('#rf', ctl.body).value) return;
          A.post(API + '/books/' + encodeURIComponent(st.file) + '/replace', opts(false)).then(function (r) { show(r, false); }).catch(A.fail);
        };
        A.q('#rf', ctl.body).addEventListener('keydown', function (e) { if (e.key === 'Enter') A.q('#rgo', ctl.body).click(); });
        function doReplace(c) {
          var o = opts(true);
          if (!o.find) { A.toast('Enter the text to find', 'bad'); return false; }
          return A.post(API + '/books/' + encodeURIComponent(st.file) + '/replace', Object.assign({}, o, { apply: false })).then(function (pre) {
            if (!pre.total) { show(pre, false); return false; }
            return A.confirm({ title: 'Replace ' + pre.total + ' match' + (pre.total === 1 ? '' : 'es') + '?', message: 'In ' + pre.chapters + ' chapter' + (pre.chapters === 1 ? '' : 's') + '. You can undo each chapter from its History.', ok: 'Replace all', danger: true }).then(function (yes) {
              if (!yes) return false;
              return A.post(API + '/books/' + encodeURIComponent(st.file) + '/replace', o).then(function (r) {
                A.toast(r.total + ' replaced', 'ok');
                return refreshList().then(function () { return openChapter(st.cur.id); }).then(function () { return true; });
              });
            });
          });
        }
      });
    };

    /* ---------- trash ---------- */
    A.q('#btrash', view).onclick = function () {
      A.get(API + '/books/' + encodeURIComponent(st.file) + '/trash').then(function (d) {
        var ctl = A.modal({
          title: 'Deleted chapters', body: d.items.length ? html`<p class="muted small" style="margin-bottom:10px">Recovered chapters are added at the end of the book; move them where they belong.</p>${d.items.map(function (it) {
            return html`<div class="hit row" style="cursor:default"><div class="grow hi"><b>${it.title}</b><div class="small muted">Deleted ${A.fmt.date(it.deletedAt)}</div></div><button class="btn sm primary" data-rec="${it.versionId}">Recover</button></div>`;
          })}` : A.empty('Trash is empty', 'Deleted chapters can be recovered from here.'), footer: [{ label: 'Close' }]
        });
        A.on(ctl.body, 'click', '[data-rec]', function (e, t) {
          A.post(API + '/books/' + encodeURIComponent(st.file) + '/trash/restore', { versionId: Number(t.getAttribute('data-rec')) }).then(function (r) {
            A.toast('Chapter recovered', 'ok'); ctl.close(); return refreshList().then(function () { return selectChapter(r.id); });
          }).catch(A.fail);
        });
      }).catch(A.fail);
    };

    /* ---------- more menu ---------- */
    A.q('#bmore', view).onclick = function () {
      var ctl = A.modal({
        title: 'Book actions', size: 'narrow',
        body: html`<div class="stack">
          <div><a class="btn" style="width:100%" href="${API}/books/${encodeURIComponent(st.file)}/export" download>Download the whole book as HTML</a><p class="hint" style="margin-top:4px">The current text of every chapter, as one file.</p></div>
          ${book.slug && book.enabled ? html`<div><a class="btn" style="width:100%" target="_blank" rel="noopener" href="/read/${encodeURIComponent(book.slug)}/${Math.max(0, curIndex())}">Open this book in the reader ↗</a><p class="hint" style="margin-top:4px">The reader shows saved text. Chapter numbers there can differ slightly because the reader also splits at headings.</p></div>` : ''}
          ${st.origin === 'imported' && st.modified ? html`<div><button class="btn danger" style="width:100%" id="brevertbook" type="button">Revert the whole book to the original file</button><p class="hint" style="margin-top:4px">Throws away every change and the History made here.</p></div>` : ''}
        </div>`,
        footer: [{ label: 'Close' }]
      });
      var rb = A.q('#brevertbook', ctl.body);
      if (rb) rb.onclick = function () {
        A.confirm({ title: 'Revert “' + book.title + '”?', message: 'All edits, added chapters and History made in the panel are deleted. The site goes back to the original book file.', ok: 'Revert book', danger: true }).then(function (yes) {
          if (!yes) return;
          st.touched = false; st.baseV = serialize(); st.baseT = ta.value;
          A.post(API + '/books/' + encodeURIComponent(st.file) + '/revert').then(function () { ctl.close(); A.toast('Book reverted', 'ok'); A.go('#/editor?file=' + encodeURIComponent(st.file)); A.refresh(); }).catch(A.fail);
        });
      };
    };

    /* ---------- start ---------- */
    renderList();
    var first = wantedId && st.chapters.some(function (c) { return String(c.id) === wantedId; }) ? Number(wantedId) : (st.chapters[0] && st.chapters[0].id);
    if (first) openChapter(first).catch(A.fail);
    // the paragraph styles this book uses (read in the background; the menu works without it)
    A.get(API + '/books/' + encodeURIComponent(st.file) + '/styles').then(function (d) { st.styles = d.styles; if (st.cur) { buildStyleSelect(); syncStyle(); } }).catch(function () {});
  }
})();
