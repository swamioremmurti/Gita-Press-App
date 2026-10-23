/* Audio library: tracks (add, edit, switch on/off, reorder, preview) and audio categories. Same ideas as Books. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var API = '/api/admin/audio';

  function dur(sec) {
    sec = Math.round(Number(sec) || 0);
    if (!sec) return '—';
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
  }
  function srcUrl(src) { return !src ? '' : /^(https?:)?\/\//.test(src) || src.charAt(0) === '/' ? src : '/' + src; }
  function readDuration(src) {
    return new Promise(function (resolve) {
      var a = new Audio();
      var done = function (v) { a.src = ''; resolve(v); };
      a.preload = 'metadata';
      a.onloadedmetadata = function () { done(isFinite(a.duration) ? Math.round(a.duration) : 0); };
      a.onerror = function () { done(0); };
      setTimeout(function () { done(0); }, 8000);
      a.src = srcUrl(src);
    });
  }

  var TABS = [['tracks', 'Tracks'], ['categories', 'Categories']];
  var player = null;           // the one preview <audio>, shared so only one track plays at a time
  A.route('/audio', function (q, view) {
    var tab = q.get('tab') === 'categories' ? 'categories' : 'tracks';
    A.setPage('Audio library', 'Bhajans, satsang, pravachan, katha and audio books on the /audio page');
    view.innerHTML = html`<div class="tabs">${TABS.map(function (t) { return html`<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/audio${t[0] === 'tracks' ? '' : '?tab=' + t[0]}">${t[1]}</a>`; })}</div><div id="abody"></div>`.s;
    A.onLeave = function () { if (player) { player.pause(); player = null; } };
    return (tab === 'tracks' ? tracks : categories)(A.q('#abody', view), q);
  });

  /* ------------------------------------------------------------ tracks */
  function tracks(body, q) {
    var st = { q: '', cat: q.get('cat') || '', status: '' }, rows = [], cats = [], selected = {}, playing = null;
    A.q('#pageActions').innerHTML = html`<button class="btn primary" id="addtrack" type="button">+ Add track</button>`.s;
    body.innerHTML = html`<div class="toolbar"><input type="search" class="search" id="tq" placeholder="Search title, artist…"><select id="tc"></select>
      <select id="ts"><option value="">Any status</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="created">Added here</option></select></div><div id="tbulk"></div><div id="ttable"></div>`.s;

    function bulkBar() {
      var n = Object.keys(selected).length;
      A.q('#tbulk', body).innerHTML = n ? html`<div class="bulkbar"><b>${n} selected</b><button class="btn sm" data-bulk="enable">Enable</button><button class="btn sm" data-bulk="disable">Disable</button>
        <button class="btn sm" data-bulk="setCategory">Move to category…</button><button class="btn sm danger" data-bulk="delete">Delete added tracks</button><button class="btn sm ghost right" data-bulk="clear">Clear</button></div>`.s : '';
    }
    function catLabel(key) { var c = cats.find(function (x) { return x.key === key; }); return c ? c.icon + ' ' + c.en : key; }
    function draw() {
      A.q('#ttable', body).innerHTML = rows.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th style="width:30px"></th><th></th><th>Track</th><th>Artist</th><th>Category</th><th>Length</th><th>Live</th><th></th></tr></thead><tbody>
        ${rows.map(function (t, i) {
          return html`<tr draggable="true" data-i="${i}" class="${selected[t.id] ? 'sel' : ''}"><td><input type="checkbox" data-sel="${i}" ${selected[t.id] ? 'checked' : ''} aria-label="Select ${t.title}"></td>
            <td class="nowrap"><span class="faint" style="cursor:grab" title="Drag to reorder">⋮⋮</span> <button class="btn sm" data-play="${i}" title="Play a preview" aria-label="Play ${t.title}">${playing === t.id ? '❚❚' : '▶'}</button></td>
            <td><div class="t-title hi">${t.title}${t.created ? html` <span class="badge info">Added here</span>` : ''}${t.overridden ? html` <span class="badge warn">Edited</span>` : ''}</div><div class="t-sub">${t.desc || t.src}</div></td>
            <td class="hi">${t.artist || html`<span class="faint">—</span>`}</td><td><span class="chip">${catLabel(t.category)}</span></td><td class="nowrap muted">${dur(t.duration)}</td>
            <td>${A.switchEl(t.enabled, 'data-live="' + i + '" title="Show or hide this track on the site"')}</td>
            <td><div class="acts"><button class="btn sm" data-edit="${i}">Edit</button>${t.created ? html`<button class="btn sm danger" data-del="${i}">Delete</button>` : ''}</div></td></tr>`;
        })}</tbody></table></div><p class="hint" style="margin-top:8px">Drag rows to change the playing order. Tracks play in this order within their category.</p>`.s
        : A.empty('No tracks match', 'Try clearing a filter, or add a track.').s;
      bulkBar();
    }
    function load() {
      return A.get(API + A.qs({ q: st.q, cat: st.cat, status: st.status })).then(function (d) {
        rows = d.tracks; cats = d.categories;
        var sel = A.q('#tc', body);
        sel.innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return '<option value="' + A.esc(c.key) + '"' + (c.key === st.cat ? ' selected' : '') + '>' + A.esc(c.icon + ' ' + c.en) + '</option>'; }).join('');
        draw();
      }).catch(function (e) { A.q('#ttable', body).innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
    }
    A.q('#tq', body).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); load(); }, 250);
    A.q('#tc', body).onchange = function (e) { st.cat = e.target.value; load(); };
    A.q('#ts', body).onchange = function (e) { st.status = e.target.value; load(); };

    A.on(body, 'click', '[data-play]', function (e, t) {
      var tr = rows[Number(t.getAttribute('data-play'))];
      if (playing === tr.id && player) { player.pause(); playing = null; draw(); return; }
      if (player) player.pause();
      player = new Audio(srcUrl(tr.src));
      player.onended = function () { playing = null; draw(); };
      player.onerror = function () { playing = null; draw(); A.toast('This file could not be played. Check the source address.', 'bad'); };
      playing = tr.id; draw();
      player.play().catch(function () { playing = null; draw(); });
    });
    A.on(body, 'change', '[data-sel]', function (e, t) { var tr = rows[Number(t.getAttribute('data-sel'))]; if (t.checked) selected[tr.id] = 1; else delete selected[tr.id]; t.closest('tr').classList.toggle('sel', t.checked); bulkBar(); });
    A.on(body, 'change', '[data-live] input', function (e, input) {
      var tr = rows[Number(input.closest('[data-live]').getAttribute('data-live'))];
      A.patch(API + '/' + encodeURIComponent(tr.id), { enabled: input.checked }).then(function () { tr.enabled = input.checked; A.toast(tr.title + (input.checked ? ' is live' : ' is hidden from the site'), 'ok'); })
        .catch(function (err) { input.checked = !input.checked; A.fail(err); });
    });
    A.on(body, 'click', '[data-edit]', function (e, t) { trackForm(rows[Number(t.getAttribute('data-edit'))], cats, load); });
    A.on(body, 'click', '[data-del]', function (e, t) {
      var tr = rows[Number(t.getAttribute('data-del'))];
      A.confirm({ title: 'Delete “' + tr.title + '”?', message: 'The track is removed from the library. The audio file itself stays in Media.', ok: 'Delete track', danger: true }).then(function (yes) {
        if (yes) A.del(API + '/' + encodeURIComponent(tr.id)).then(function () { A.toast('Track deleted', 'ok'); load(); }).catch(A.fail);
      });
    });
    A.on(body, 'click', '[data-bulk]', function (e, t) {
      var action = t.getAttribute('data-bulk');
      if (action === 'clear') { selected = {}; draw(); return; }
      var ids = Object.keys(selected);
      function run(extra) { return A.post(API + '/bulk', Object.assign({ ids: ids, action: action }, extra || {})).then(function (r) { A.toast(r.changed + ' track(s) updated', 'ok'); selected = {}; load(); }); }
      if (action === 'setCategory') {
        A.modal({ title: 'Move ' + ids.length + ' tracks', size: 'narrow', body: html`<div class="field"><label>Category</label><select id="bk" style="width:100%">${cats.map(function (c) { return html`<option value="${c.key}">${c.icon} ${c.en}</option>`; })}</select></div>`,
          footer: [{ label: 'Cancel' }, { label: 'Move', kind: 'primary', onClick: function (m) { return run({ category: A.q('#bk', m.body).value }); } }] });
      } else if (action === 'delete') {
        A.confirm({ title: 'Delete the added tracks among these?', message: 'Built-in tracks cannot be deleted and are skipped. Disable them instead.', ok: 'Delete', danger: true }).then(function (yes) { if (yes) run(); });
      } else run();
    });
    A.q('#addtrack').onclick = function () { trackForm(null, cats, load); };

    var dragI = null;
    body.addEventListener('dragstart', function (e) { var tr = e.target.closest('tr[data-i]'); if (tr) { dragI = Number(tr.getAttribute('data-i')); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (x) {} } });
    body.addEventListener('dragover', function (e) { if (dragI !== null && e.target.closest('tr[data-i]')) e.preventDefault(); });
    body.addEventListener('drop', function (e) {
      var tr = e.target.closest('tr[data-i]'); if (!tr || dragI === null) return;
      e.preventDefault();
      var to = Number(tr.getAttribute('data-i'));
      if (to !== dragI) {
        rows.splice(to, 0, rows.splice(dragI, 1)[0]); draw();
        A.post(API + '/reorder', { ids: rows.map(function (r) { return r.id; }) }).then(function () { A.toast('Order saved', 'ok'); }).catch(function (err) { A.fail(err); load(); });
      }
      dragI = null;
    });
    return load();
  }

  function trackForm(t, cats, done) {
    var isNew = !t;
    t = t || { title: '', artist: '', category: cats[0] ? cats[0].key : '', src: '', duration: 0, desc: '' };
    var ctl = A.modal({
      title: isNew ? 'Add a track' : 'Edit track', size: 'wide', sticky: false,
      body: html`<div class="grid2"><div>
          <div class="field"><label for="atitle">Title</label><input type="text" id="atitle" class="hi" value="${t.title}">${!isNew && t.baseTitle !== t.title ? html`<span class="hint">Original: ${t.baseTitle}</span>` : ''}</div>
          <div class="field"><label for="aartist">Artist / speaker</label><input type="text" id="aartist" class="hi" value="${t.artist}"></div>
          <div class="field"><label for="acat">Category</label><select id="acat" style="width:100%">${cats.map(function (c) { return html`<option value="${c.key}" ${c.key === t.category ? 'selected' : ''}>${c.icon} ${c.en}</option>`; })}</select></div>
          <div class="field"><label for="adesc">Description</label><textarea id="adesc" rows="2" class="hi">${t.desc}</textarea></div>
        </div><div>
          <div class="field"><label for="asrc">Audio file</label><input type="text" id="asrc" value="${t.src}" placeholder="Choose a file, or paste an https:// address">
            <div class="row" style="margin-top:8px"><button class="btn sm" id="apick" type="button">Choose or upload…</button><button class="btn sm" id="aprev" type="button">▶ Test</button></div>
            <span class="hint">Files up to 3 MB can be uploaded. For longer recordings host the file elsewhere and paste its https:// address, or add it in Media as a link.</span></div>
          <div class="field"><label for="adur">Length (seconds)</label><div class="row" style="flex-wrap:nowrap"><input type="number" id="adur" min="0" value="${t.duration || ''}" style="max-width:140px"><span class="hint" id="adurh">Read automatically from the file.</span></div></div>
        </div></div>`,
      footer: [{ label: 'Cancel' }, { label: isNew ? 'Add track' : 'Save', kind: 'primary', onClick: function (m) {
        var b = { title: A.q('#atitle', m.body).value, artist: A.q('#aartist', m.body).value, category: A.q('#acat', m.body).value, desc: A.q('#adesc', m.body).value, src: A.q('#asrc', m.body).value, duration: A.q('#adur', m.body).value };
        return (isNew ? A.post(API, b) : A.patch(API + '/' + encodeURIComponent(t.id), b)).then(function () { A.toast(isNew ? 'Track added' : 'Saved', 'ok'); done(); });
      } }]
    });
    var src = A.q('#asrc', ctl.body), preview = null;
    function detect() {
      var v = src.value.trim();
      if (!v) return;
      A.q('#adurh', ctl.body).textContent = 'Reading the file…';
      readDuration(v).then(function (s) {
        if (s) { A.q('#adur', ctl.body).value = s; A.q('#adurh', ctl.body).textContent = 'Read from the file: ' + dur(s); }
        else A.q('#adurh', ctl.body).textContent = 'Could not read the length. You can type it in seconds.';
      });
    }
    src.onchange = detect;
    A.q('#apick', ctl.body).onclick = function () {
      A.pickMedia({ kind: 'audio', title: 'Choose an audio file' }).then(function (m) {
        if (!m) return;
        src.value = m.url;
        var title = A.q('#atitle', ctl.body);
        if (!title.value.trim()) title.value = m.name.replace(/\.[a-z0-9]+$/i, '');
        detect();
      });
    };
    A.q('#aprev', ctl.body).onclick = function () {
      if (preview) { preview.pause(); preview = null; this.textContent = '▶ Test'; return; }
      if (!src.value.trim()) return;
      var btn = this;
      preview = new Audio(srcUrl(src.value.trim()));
      preview.onended = function () { preview = null; btn.textContent = '▶ Test'; };
      preview.onerror = function () { preview = null; btn.textContent = '▶ Test'; A.toast('This file could not be played', 'bad'); };
      preview.play().then(function () { btn.textContent = '❚❚ Stop'; }).catch(function () { preview = null; });
    };
    var prevClose = ctl.close;
    ctl.close = function (r) { if (preview) { preview.pause(); preview = null; } prevClose(r); };
  }

  /* ------------------------------------------------------------ categories */
  function categories(body) {
    var cats = [];
    A.q('#pageActions').innerHTML = html`<button class="btn primary" id="addcat" type="button">+ Add category</button>`.s;
    function draw() {
      body.innerHTML = html`<div class="card"><div class="table-wrap" style="border:0;box-shadow:none"><table class="tbl"><thead><tr><th></th><th>Category</th><th>Hindi name</th><th>Colours</th><th>Tracks</th><th>Shown</th><th></th></tr></thead><tbody>
        ${cats.map(function (c, i) {
          return html`<tr><td class="nowrap"><button class="btn sm ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm ghost" data-down="${i}" ${i === cats.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></td>
            <td class="nowrap"><span style="font-size:18px">${c.icon}</span> <b>${c.en}</b>${c.hidden ? html` <span class="badge warn">Hidden</span>` : ''}<div class="mono faint">${c.key}</div></td><td class="hi">${c.hi}</td>
            <td><span style="display:inline-block;width:46px;height:18px;border-radius:5px;background:linear-gradient(90deg,${c.g[0]},${c.g[1]})"></span></td>
            <td><a href="#/audio?cat=${encodeURIComponent(c.key)}">${c.tracks}</a></td>
            <td>${A.switchEl(!c.hidden, 'data-show="' + i + '"')}</td>
            <td><div class="acts"><button class="btn sm" data-edit="${i}">Edit</button><button class="btn sm danger" data-del="${i}">Delete</button></div></td></tr>`;
        })}</tbody></table></div></div>`.s;
    }
    function load() { return A.get('/api/admin/audio-categories').then(function (d) { cats = d.categories; draw(); }); }
    function save(order) { return A.post('/api/admin/audio-categories/reorder', { keys: cats.map(function (c) { return c.key; }) }).then(draw).catch(function (e) { A.fail(e); load(); }); }
    function form(c) {
      var isNew = !c;
      c = c || { key: '', en: '', hi: '', icon: '🎵', g: ['#d9822b', '#8a1f0f'] };
      A.modal({
        title: isNew ? 'Add an audio category' : 'Edit ' + c.en, size: 'narrow',
        body: html`<div class="field"><label for="cen">Name (English)</label><input type="text" id="cen" value="${c.en}"></div>
          <div class="field"><label for="chi">Name (Hindi)</label><input type="text" id="chi" class="hi" value="${c.hi}"></div>
          <div class="grid2"><div class="field"><label for="cic">Icon</label><input type="text" id="cic" value="${c.icon}"></div>
          <div class="field"><label>Colours</label><div class="row" style="flex-wrap:nowrap"><input type="color" id="cg1" value="${c.g[0]}" style="padding:2px;height:36px"><input type="color" id="cg2" value="${c.g[1]}" style="padding:2px;height:36px"></div></div></div>
          ${isNew ? '' : html`<p class="hint">Key: <span class="mono">${c.key}</span> (fixed)</p>`}`,
        footer: [{ label: 'Cancel' }, { label: isNew ? 'Add' : 'Save', kind: 'primary', onClick: function (m) {
          var b = { en: A.q('#cen', m.body).value, hi: A.q('#chi', m.body).value, icon: A.q('#cic', m.body).value, g: [A.q('#cg1', m.body).value, A.q('#cg2', m.body).value] };
          return (isNew ? A.post('/api/admin/audio-categories', b) : A.patch('/api/admin/audio-categories/' + encodeURIComponent(c.key), b)).then(function () { A.toast('Saved', 'ok'); return load(); });
        } }]
      });
    }
    A.q('#addcat').onclick = function () { form(null); };
    A.on(body, 'click', '[data-edit]', function (e, t) { form(cats[Number(t.getAttribute('data-edit'))]); });
    A.on(body, 'click', '[data-up]', function (e, t) { var i = Number(t.getAttribute('data-up')); cats.splice(i - 1, 0, cats.splice(i, 1)[0]); save(); });
    A.on(body, 'click', '[data-down]', function (e, t) { var i = Number(t.getAttribute('data-down')); cats.splice(i + 1, 0, cats.splice(i, 1)[0]); save(); });
    A.on(body, 'change', '[data-show] input', function (e, input) {
      var c = cats[Number(input.closest('[data-show]').getAttribute('data-show'))];
      A.patch('/api/admin/audio-categories/' + encodeURIComponent(c.key), { hidden: !input.checked }).then(function () { c.hidden = !input.checked; draw(); A.toast(input.checked ? 'Category shown' : 'Category hidden on the site', 'ok'); }).catch(function (err) { input.checked = !input.checked; A.fail(err); });
    });
    A.on(body, 'click', '[data-del]', function (e, t) {
      var c = cats[Number(t.getAttribute('data-del'))], others = cats.filter(function (x) { return x.key !== c.key; });
      A.modal({
        title: 'Delete “' + c.en + '”', size: 'narrow',
        body: html`${c.tracks ? html`<p>${c.tracks} track${c.tracks === 1 ? ' is' : 's are'} in this category. Move ${c.tracks === 1 ? 'it' : 'them'} to:</p><div class="field" style="margin-top:8px"><select id="mv" style="width:100%">${others.map(function (o) { return html`<option value="${o.key}">${o.icon} ${o.en}</option>`; })}</select></div>` : html`<p>No tracks are in this category.</p>`}`,
        footer: [{ label: 'Cancel' }, { label: 'Delete category', kind: 'danger solid', onClick: function (m) {
          var mv = A.q('#mv', m.body);
          return A.del('/api/admin/audio-categories/' + encodeURIComponent(c.key), { moveTo: mv ? mv.value : '' }).then(function () { A.toast('Category deleted', 'ok'); return load(); });
        } }]
      });
    });
    return load();
  }
})();
