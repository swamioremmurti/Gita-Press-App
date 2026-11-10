/* Stotras: the list behind the /stotras page and the stotra viewer, and a structured editor (verses, word-by-word meaning,
   translation). Saving rebuilds the stotra's library book from the form, so the stotra shows up in both places at once. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var API = '/api/admin/stotras';

  function catLabel(cats, key) {
    var c = cats.filter(function (x) { return x.key === key; })[0];
    return c ? html`<span>${c.icon} ${c.en}</span>${c.hidden ? html` <span class="badge warn">hidden</span>` : ''}` : html`<span class="badge warn">${key || 'no category'}</span>`;
  }

  /* ------------------------------------------------------------ the list */
  A.route('/stotras', function (q, view) {
    A.setPage('Stotras', 'Listed on the /stotras page by category; every stotra is also a book in the library',
      html`<button class="btn" id="stcats" type="button">Categories</button> <a class="btn primary" href="#/stotras/edit">+ New stotra</a>`);
    var st = { q: '', cat: q.get('cat') || '' }, data = { stotras: [], categories: [] };

    function rows() {
      var t = st.q.trim().toLowerCase();
      return data.stotras.filter(function (s) { return (!st.cat || s.category === st.cat) && (!t || (s.title + ' ' + s.author).toLowerCase().indexOf(t) >= 0); });
    }
    function draw() {
      var list = rows();
      A.q('#stbody', view).innerHTML = (list.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Category</th><th>Author</th><th>On site</th><th></th></tr></thead><tbody>
        ${list.map(function (s) {
          return html`<tr><td><a href="#/stotras/edit?file=${encodeURIComponent(s.file)}"><b class="hi">${s.title}</b></a>${s.created ? html` <span class="badge" title="Made in this panel">new</span>` : ''}<div class="mono faint">${s.slug}</div></td>
            <td class="nowrap">${catLabel(data.categories, s.category)}</td><td class="hi">${s.author}</td>
            <td>${A.switchEl(s.enabled, 'data-on="' + A.esc(s.file) + '" title="Show this stotra on the site"')}</td>
            <td><div class="acts"><a class="btn sm" href="#/stotras/edit?file=${encodeURIComponent(s.file)}">Edit</a>
              <a class="btn sm" href="/stotra/${encodeURIComponent(s.slug)}" target="_blank" rel="noopener">View ↗</a>
              <a class="btn sm" href="#/editor?file=${encodeURIComponent(s.file)}" title="Edit the book text page by page">Pages</a></div></td></tr>`;
        })}</tbody></table></div>` : A.empty('No stotras here', data.stotras.length ? 'Try another category or search.' : 'Add the first one with “New stotra”.')).s;
    }

    view.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="stq" placeholder="Search title or author…"><select id="stc"></select>
      <span class="muted small" id="stn"></span></div><div id="stbody"></div>
      <p class="hint" style="margin-top:12px">A stotra is a library book. Switching it off here hides it from both the /stotras page and the library. Covers, tags and deleting are on the Books page.</p>`.s;

    function fillCats() {
      A.q('#stc', view).innerHTML = html`<option value="">All categories</option>${data.categories.map(function (c) { return html`<option value="${c.key}" ${c.key === st.cat ? 'selected' : ''}>${c.icon} ${c.en}</option>`; })}`.s;
      A.q('#stn', view).textContent = data.stotras.length + ' stotra' + (data.stotras.length === 1 ? '' : 's');
    }
    function load() { return A.get(API).then(function (d) { data = d; fillCats(); draw(); }); }

    A.q('#stq', view).addEventListener('input', A.debounce(function (e) { st.q = e.target.value; draw(); }, 150));
    A.q('#stc', view).addEventListener('change', function (e) { st.cat = e.target.value; draw(); });
    A.on(view, 'change', '[data-on] input', function (e, input) {
      var file = input.closest('[data-on]').getAttribute('data-on');
      A.patch('/api/admin/books/' + encodeURIComponent(file), { enabled: input.checked }).then(function () {
        data.stotras.forEach(function (s) { if (s.file === file) s.enabled = input.checked; });
        A.toast(input.checked ? 'Stotra shown' : 'Stotra hidden', 'ok');
      }).catch(function (err) { input.checked = !input.checked; A.fail(err); });
    });
    A.q('#stcats').onclick = function () { categoriesDialog(data.categories).then(function (changed) { if (changed) load(); }); };
    return load();
  });

  /* ------------------------------------------------------------ the categories dialog */
  function categoriesDialog(current) {
    return new Promise(function (resolve) {
      var list = current.map(function (c) { return { key: c.key, en: c.en, hi: c.hi, icon: c.icon, hidden: !!c.hidden, old: true }; });
      var saved = false;
      var ctl = A.modal({
        title: 'Stotra categories', size: 'wide', sticky: true,
        body: html`<p class="hint" style="margin-bottom:10px">The order here is the order on the /stotras page. A category’s key is fixed once saved (stotras are linked through it); you can still rename it. A hidden category’s stotras move under “other”.</p><div id="catrows"></div>
          <div style="margin-top:10px"><button class="btn" id="catadd" type="button">+ Add category</button> <button class="btn ghost" id="catreset" type="button" title="Go back to the built-in list">Reset to built-in list</button></div>`,
        footer: [{ label: 'Cancel' }, { label: 'Save categories', kind: 'primary', onClick: function (m) {
          readRows(m.body);
          return A.put('/api/admin/stotra-categories', { categories: list.map(function (c) { return { key: c.key, en: c.en, hi: c.hi, icon: c.icon, hidden: c.hidden }; }) })
            .then(function () { saved = true; A.toast('Categories saved', 'ok'); });
        } }],
        onClose: function () { resolve(saved); }
      });
      var box = A.q('#catrows', ctl.body);
      function readRows(root) {
        A.qa('[data-row]', root).forEach(function (tr) {
          var c = list[Number(tr.getAttribute('data-row'))];
          if (!c) return;
          c.icon = A.q('[data-f="icon"]', tr).value; c.en = A.q('[data-f="en"]', tr).value; c.hi = A.q('[data-f="hi"]', tr).value;
          c.hidden = A.q('[data-f="hidden"]', tr).checked;
          if (!c.old) c.key = A.q('[data-f="key"]', tr).value.trim().toLowerCase();
        });
      }
      function draw() {
        box.innerHTML = html`<div class="table-wrap" style="max-height:52vh;overflow:auto"><table class="tbl"><thead><tr><th></th><th>Icon</th><th>English</th><th>Hindi</th><th>Key</th><th>Hidden</th><th></th></tr></thead><tbody>
          ${list.map(function (c, i) {
            return html`<tr data-row="${i}"><td class="nowrap"><button class="btn sm ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm ghost" data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></td>
              <td><input type="text" data-f="icon" value="${c.icon}" style="width:56px"></td>
              <td><input type="text" data-f="en" value="${c.en}"></td><td><input type="text" class="hi" data-f="hi" value="${c.hi}"></td>
              <td>${c.old ? html`<span class="mono faint">${c.key}</span><input type="hidden" data-f="key" value="${c.key}">` : html`<input type="text" class="mono" data-f="key" value="${c.key}" placeholder="e.g. durga" style="width:110px">`}</td>
              <td><input type="checkbox" data-f="hidden" ${c.hidden ? 'checked' : ''}></td>
              <td>${c.old ? '' : html`<button class="btn sm danger" data-del="${i}">✕</button>`}</td></tr>`;
          })}</tbody></table></div>`.s;
      }
      draw();
      A.on(ctl.body, 'click', '[data-up]', function (e, t) { readRows(ctl.body); var i = Number(t.getAttribute('data-up')); list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); });
      A.on(ctl.body, 'click', '[data-down]', function (e, t) { readRows(ctl.body); var i = Number(t.getAttribute('data-down')); list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); });
      A.on(ctl.body, 'click', '[data-del]', function (e, t) { readRows(ctl.body); list.splice(Number(t.getAttribute('data-del')), 1); draw(); });
      A.q('#catadd', ctl.body).onclick = function () { readRows(ctl.body); list.push({ key: '', en: '', hi: '', icon: '📿', hidden: false, old: false }); draw(); };
      A.q('#catreset', ctl.body).onclick = function () {
        A.get('/api/admin/stotra-categories').then(function (d) { list = d.defaults.map(function (c) { return { key: c.key, en: c.en, hi: c.hi, icon: c.icon, hidden: false, old: true }; }); draw(); });
      };
    });
  }

  /* ------------------------------------------------------------ the editor */
  A.route('/stotras/edit', function (q, view) {
    var file = q.get('file');
    A.setPage(file ? 'Edit stotra' : 'New stotra', file ? file : 'Creates a library book and lists it on the /stotras page');
    var req = [A.get('/api/admin/stotra-categories')];
    if (file) req.push(A.get(API + '/' + encodeURIComponent(file)));
    return Promise.all(req).then(function (r) { Editor(view, r[0].categories, file, r[1]); });
  });

  function Editor(view, cats, file, loaded) {
    var base = loaded ? loaded.stotra : { title: '', invocation: '॥ श्री ॥', subtitle: '', author: '', publisher: 'कल्याण सेवा ट्रस्ट', category: cats[0] ? cats[0].key : '', intro: [], verses: [], closing: '' };
    var st = {
      title: base.title, audio: base.audio || '', invocation: base.invocation || '', subtitle: base.subtitle || '', author: base.author || '', publisher: base.publisher || '', category: base.category || '',
      closing: base.closing || '',
      intro: (base.intro || []).map(function (s) { return { title: s.title || '', text: s.text || '' }; }),
      verses: (base.verses || []).map(function (v) { return { label: v.label || '', lines: (v.lines || []).join('\n'), pad: (v.pad || []).map(function (p) { return p[0] + ' = ' + p[1]; }).join('\n'), bhav: v.bhav || '' }; })
    };
    if (!st.verses.length) st.verses.push({ label: '', lines: '', pad: '', bhav: '' });
    var dirty = false;
    function touch() { if (!dirty) { dirty = true; A.guard = function () { return window.confirm('You have unsaved changes on this stotra. Leave without saving?'); }; } }

    function draw() {
      view.innerHTML = html`<div class="card"><div class="card-b">
        <div class="grid2">
          <div class="field"><label for="f-title">Title</label><input type="text" id="f-title" class="hi" data-f="title" value="${st.title}" placeholder="श्री गुर्वष्टकम्"></div>
          <div class="field"><label for="f-cat">Category</label><select id="f-cat" data-f="category">${cats.map(function (c) { return html`<option value="${c.key}" ${c.key === st.category ? 'selected' : ''}>${c.icon} ${c.en}${c.hidden ? ' (hidden)' : ''}</option>`; })}</select></div>
          <div class="field"><label for="f-author">Author (composer)</label><input type="text" id="f-author" class="hi" data-f="author" value="${st.author}" placeholder="जगद्गुरु आदि शंकराचार्य"><span class="hint">Use an existing author name to link to their page.</span></div>
          <div class="field"><label for="f-pub">Publisher</label><input type="text" id="f-pub" class="hi" data-f="publisher" value="${st.publisher}"></div>
          <div class="field"><label for="f-inv">Opening line</label><input type="text" id="f-inv" class="hi" data-f="invocation" value="${st.invocation}"><span class="hint">Shown above the title, e.g. ॥ श्री ॥</span></div>
          <div class="field"><label for="f-sub">Subtitle</label><input type="text" id="f-sub" class="hi" data-f="subtitle" value="${st.subtitle}" placeholder="आदिशंकराचार्यविरचितम् — सपदच्छेद-शब्दार्थ-व्याख्यासहितम्"></div>
        </div></div></div>

        <div class="card" style="margin-top:14px"><div class="card-h"><h2>Audio recording</h2><span class="right muted small">Optional — plays in a bar at the bottom of the stotra page</span></div><div class="card-b">
          <div class="field"><label for="f-audio">Audio file</label><input type="text" id="f-audio" data-f="audio" value="${st.audio}" placeholder="Choose a file, or paste an https:// address">
            <div class="row" style="margin-top:8px"><button class="btn sm" id="apick" type="button">Choose or upload…</button><button class="btn sm" id="aprev" type="button">▶ Test</button><button class="btn sm ghost" id="aclear" type="button">Remove</button></div>
            <span class="hint">Files up to 3 MB can be uploaded. For longer recordings host the file elsewhere and paste its https:// address.</span></div>
        </div></div>

        <div class="card" style="margin-top:14px"><div class="card-h"><h2>Introduction</h2><span class="right muted small">Optional — shown before the first verse, in the meaning view</span></div><div class="card-b">
          ${st.intro.map(function (s, i) {
            return html`<div class="field" style="border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:10px">
              <div class="row"><input type="text" class="hi grow" data-i="${i}" data-if="title" value="${s.title}" placeholder="Heading, e.g. भूमिका"><button class="btn sm danger" data-idel="${i}" type="button">Remove</button></div>
              <textarea class="hi" rows="4" data-i="${i}" data-if="text" placeholder="Paragraphs, one per line">${s.text}</textarea></div>`;
          })}
          <button class="btn" id="addintro" type="button">+ Add an introduction section</button>
        </div></div>

        <div id="verses" style="margin-top:14px">${st.verses.map(verseCard)}</div>
        <div style="margin:10px 0 16px"><button class="btn" id="addverse" type="button">+ Add a verse</button></div>

        <div class="card"><div class="card-b"><div class="field"><label for="f-closing">Closing line</label>
          <textarea id="f-closing" class="hi" rows="2" data-f="closing" placeholder="॥ इति … सम्पूर्णम् ॥">${st.closing}</textarea><span class="hint">Shown after the last verse. One line per row.</span></div></div></div>

        <div class="row" style="margin-top:16px;gap:10px"><button class="btn primary" id="save" type="button">${file ? 'Save changes' : 'Create stotra'}</button>
          <a class="btn" href="#/stotras">Back to the list</a>
          ${loaded ? html`<a class="btn" href="/stotra/${encodeURIComponent(loaded.book.slug)}" target="_blank" rel="noopener">View on the site ↗</a>` : ''}
          <span class="muted small" id="savemsg"></span></div>`.s;
    }

    function verseCard(v, i) {
      return html`<div class="card" style="margin-bottom:12px" data-vcard="${i}"><div class="card-h"><h2>Verse ${i + 1}</h2>
        <span class="right"><button class="btn sm ghost" data-vup="${i}" ${i === 0 ? 'disabled' : ''} type="button" aria-label="Move up">↑</button><button class="btn sm ghost" data-vdown="${i}" ${i === st.verses.length - 1 ? 'disabled' : ''} type="button" aria-label="Move down">↓</button>
        <button class="btn sm danger" data-vdel="${i}" type="button">Delete</button></span></div>
        <div class="card-b">
          <div class="field"><label>Heading <span class="faint">(optional)</span></label><input type="text" class="hi" data-v="${i}" data-vf="label" value="${v.label}" placeholder="Usually empty. A name for this verse, e.g. फलश्रुति"></div>
          <div class="field"><label>Sanskrit text <span class="faint">(one line of the verse per row)</span></label><textarea class="hi" rows="3" data-v="${i}" data-vf="lines" placeholder="First half ।&#10;Second half ॥ १ ॥">${v.lines}</textarea></div>
          <div class="field"><label>Word-by-word meaning <span class="faint">(one per row: <span class="mono">word = meaning</span>)</span></label><textarea class="hi" rows="6" data-v="${i}" data-vf="pad" placeholder="शरीरम् = शरीर&#10;सुरूपम् = सुंदर">${v.pad}</textarea></div>
          <div class="field"><label>Meaning of the verse (bhavartha)</label><textarea class="hi" rows="4" data-v="${i}" data-vf="bhav">${v.bhav}</textarea></div>
        </div></div>`;
    }

    draw();
    view.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-f')) { st[t.getAttribute('data-f')] = t.value; touch(); }
      else if (t.hasAttribute('data-vf')) { st.verses[Number(t.getAttribute('data-v'))][t.getAttribute('data-vf')] = t.value; touch(); }
      else if (t.hasAttribute('data-if')) { st.intro[Number(t.getAttribute('data-i'))][t.getAttribute('data-if')] = t.value; touch(); }
    });
    view.addEventListener('change', function (e) { if (e.target.hasAttribute('data-f')) { st[e.target.getAttribute('data-f')] = e.target.value; touch(); } });
    var preview = null;
    A.onLeave = function () { if (preview) { preview.pause(); preview = null; } };
    A.on(view, 'click', '#apick', function () {
      A.pickMedia({ kind: 'audio', title: 'Choose an audio file' }).then(function (m) {
        if (!m) return;
        st.audio = m.url; A.q('#f-audio', view).value = m.url; touch();
      });
    });
    A.on(view, 'click', '#aclear', function () { st.audio = ''; A.q('#f-audio', view).value = ''; touch(); });
    A.on(view, 'click', '#aprev', function (e, btn) {
      if (preview) { preview.pause(); preview = null; btn.textContent = '▶ Test'; return; }
      var v = st.audio.trim(); if (!v) return;
      preview = new Audio(/^(https?:)?\/\//.test(v) || v.charAt(0) === '/' ? v : '/' + v);
      preview.onended = function () { preview = null; btn.textContent = '▶ Test'; };
      preview.onerror = function () { preview = null; btn.textContent = '▶ Test'; A.toast('This file could not be played', 'bad'); };
      preview.play().then(function () { btn.textContent = '❚❚ Stop'; }).catch(function () { preview = null; });
    });
    A.on(view, 'click', '#addintro', function () { st.intro.push({ title: '', text: '' }); touch(); draw(); });
    A.on(view, 'click', '[data-idel]', function (e, t) { st.intro.splice(Number(t.getAttribute('data-idel')), 1); touch(); draw(); });
    A.on(view, 'click', '#addverse', function () { st.verses.push({ label: '', lines: '', pad: '', bhav: '' }); touch(); draw(); window.scrollTo(0, document.body.scrollHeight); });
    A.on(view, 'click', '[data-vup]', function (e, t) { var i = Number(t.getAttribute('data-vup')); st.verses.splice(i - 1, 0, st.verses.splice(i, 1)[0]); touch(); draw(); });
    A.on(view, 'click', '[data-vdown]', function (e, t) { var i = Number(t.getAttribute('data-vdown')); st.verses.splice(i + 1, 0, st.verses.splice(i, 1)[0]); touch(); draw(); });
    A.on(view, 'click', '[data-vdel]', function (e, t) {
      var i = Number(t.getAttribute('data-vdel'));
      if (st.verses.length === 1) return A.toast('A stotra needs at least one verse', 'bad');
      A.confirm({ title: 'Delete verse ' + (i + 1) + '?', message: 'It is removed from the stotra when you save.', ok: 'Delete verse', danger: true }).then(function (yes) { if (yes) { st.verses.splice(i, 1); touch(); draw(); } });
    });
    A.on(view, 'click', '#save', function (e, btn) {
      var body = {
        title: st.title, audio: st.audio, category: st.category, author: st.author, publisher: st.publisher, invocation: st.invocation, subtitle: st.subtitle, closing: st.closing,
        intro: st.intro, verses: st.verses.map(function (v) { return { label: v.label, lines: v.lines.split('\n'), pad: v.pad, bhav: v.bhav }; })
      };
      btn.disabled = true;
      (file ? A.put(API + '/' + encodeURIComponent(file), body) : A.post(API, body)).then(function (r) {
        dirty = false; A.guard = null;
        A.toast(file ? 'Stotra saved' : 'Stotra created', 'ok');
        if (!file) A.go('#/stotras/edit?file=' + encodeURIComponent(r.file)); else { btn.disabled = false; A.q('#savemsg', view).textContent = 'Saved ' + new Date().toLocaleTimeString(); }
      }).catch(function (err) { btn.disabled = false; A.fail(err); });
    });
  }
})();
