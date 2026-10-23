/* Media library: uploads stored in the database, linked files, and a read-only browser of the files shipped with the site.
   The same component is the Media page and the picker used by the book form (cover) and the chapter editor (images). */
(function () {
  'use strict';
  var A = window.Admin, html = A.html, esc = A.esc;
  var MAX = 3 * 1024 * 1024;
  var KIND_ICON = { image: '🖼', audio: '🎵', video: '🎬', document: '📄', other: '📎', folder: '📁' };
  var ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/mp4,audio/ogg,audio/wav,application/pdf';

  function uploadOne(file, folder) {
    if (file.size > MAX) return Promise.reject(new Error(file.name + ' is ' + A.fmt.bytes(file.size) + '. The limit is 3 MB; host larger files elsewhere and add them as a link.'));
    return A.readFile(file).then(function (data) {
      return A.post('/api/admin/media', { name: file.name, mime: file.type, data: data, folder: folder || '' });
    });
  }
  A.uploadFiles = function (files, folder) {
    var list = Array.prototype.slice.call(files), ok = [], chain = Promise.resolve();
    list.forEach(function (f) {
      chain = chain.then(function () { return uploadOne(f, folder).then(function (r) { ok.push(r.item); }, function (e) { A.fail(e); }); });
    });
    return chain.then(function () { if (ok.length) A.toast(ok.length + ' file' + (ok.length === 1 ? '' : 's') + ' uploaded', 'ok'); return ok; });
  };

  function thumb(it) {
    if (it.kind === 'image') return html`<div class="media-thumb"><img src="${it.url}" alt="${it.alt || it.name}" loading="lazy"></div>`;
    return html`<div class="media-thumb">${KIND_ICON[it.kind] || KIND_ICON.other}</div>`;
  }

  function addLinkDialog(done) {
    A.modal({
      title: 'Add a file by link', body: html`<p class="muted small" style="margin-bottom:12px">Use this for large audio or video hosted on a CDN, or any file that already has an address.</p>
        <div class="field"><label>Address</label><input type="url" id="lu" placeholder="https://…"></div>
        <div class="grid2"><div class="field"><label>Name</label><input type="text" id="ln"></div>
        <div class="field"><label>Type</label><select id="lk"><option value="audio">Audio</option><option value="image">Image</option><option value="video">Video</option><option value="document">Document</option><option value="other">Other</option></select></div></div>`,
      footer: [{ label: 'Cancel' }, { label: 'Add', kind: 'primary', onClick: function (c) {
        return A.post('/api/admin/media/link', { url: A.q('#lu', c.body).value, name: A.q('#ln', c.body).value, kind: A.q('#lk', c.body).value }).then(function () { A.toast('Link added', 'ok'); done(); });
      } }]
    });
  }

  function detailDialog(it, refresh) {
    var preview = it.kind === 'image' ? html`<img src="${it.url}" alt="" style="max-width:100%;max-height:280px;display:block;margin:0 auto;border-radius:8px;background:var(--surface-2)">`
      : it.kind === 'audio' ? html`<audio controls src="${it.url}" style="width:100%"></audio>`
      : it.kind === 'video' ? html`<video controls src="${it.url}" style="width:100%;max-height:280px"></video>` : html`<div class="media-thumb" style="aspect-ratio:auto;padding:30px">${KIND_ICON[it.kind] || '📎'}</div>`;
    var ctl = A.modal({
      title: it.name, size: 'wide',
      body: html`<div class="grid2"><div>${preview}<p class="small muted" style="margin-top:10px">${it.external ? 'Linked file' : A.fmt.bytes(it.size) + ' · ' + it.mime} · added ${A.fmt.date(it.createdAt)}</p></div>
        <div><div class="field"><label>File name</label><input type="text" id="mn" value="${it.name}"></div>
        <div class="field"><label>Description (alt text)</label><input type="text" id="ma" value="${it.alt}" placeholder="What the picture shows"></div>
        <div class="field"><label>Folder</label><input type="text" id="mf" value="${it.folder}" placeholder="optional, e.g. covers"></div>
        <div class="field"><label>Address</label><div class="row" style="flex-wrap:nowrap"><input type="text" readonly value="${it.url}" id="mu"><button class="btn sm" type="button" id="mc">Copy</button></div>
        <span class="hint">Paste this wherever a picture or audio address is needed.</span></div></div></div>`,
      footer: [
        { label: 'Delete', kind: 'danger', onClick: function () {
          return A.confirm({ title: 'Delete this file?', message: 'Anything that points to it will show a broken file.', ok: 'Delete', danger: true }).then(function (yes) {
            if (!yes) return false;
            return A.del('/api/admin/media/' + it.id).then(function () { A.toast('Deleted', 'ok'); refresh(); });
          });
        } },
        { label: 'Close', result: false },
        { label: 'Save', kind: 'primary', onClick: function (c) {
          return A.patch('/api/admin/media/' + it.id, { name: A.q('#mn', c.body).value, alt: A.q('#ma', c.body).value, folder: A.q('#mf', c.body).value }).then(function () { A.toast('Saved', 'ok'); refresh(); });
        } }
      ]
    });
    A.q('#mc', ctl.body).onclick = function () { A.copy(location.origin + it.url.replace(/^(?=\/)/, '')); };
  }

  /* The library grid. opts.pick(item) turns it into a picker; opts.kind limits the file type. */
  function library(root, opts) {
    var st = { page: 1, q: '', kind: opts.kind || '', folder: '' };
    root.innerHTML = render0();
    function render0() {
      return '<div class="toolbar"><input type="search" class="search" id="mq" placeholder="Search files…">' +
        (opts.kind ? '' : '<select id="mk"><option value="">All types</option><option value="image">Images</option><option value="audio">Audio</option><option value="video">Video</option><option value="document">Documents</option><option value="other">Other</option></select>') +
        '<select id="mf" hidden><option value="">All folders</option></select>' +
        '<span class="right row"><button class="btn" type="button" id="mlink">Add link</button><label class="btn primary" style="cursor:pointer">Upload<input type="file" id="mup" multiple accept="' + ACCEPT + '" hidden></label></span></div>' +
        '<div class="dropzone" id="mdrop">Drop files here to upload · PNG, JPEG, WebP, GIF, MP3, M4A, OGG, WAV, PDF · up to 3 MB each</div><div id="mgrid"></div>';
    }
    var grid = A.q('#mgrid', root);
    function load() {
      grid.innerHTML = A.raw('<div class="loading"><span class="spinner"></span></div>').s;
      A.get('/api/admin/media' + A.qs({ q: st.q, kind: st.kind, folder: st.folder, page: st.page, size: 48 })).then(function (d) {
        var fs = A.q('#mf', root);
        if (d.folders.length) { fs.hidden = false; fs.innerHTML = '<option value="">All folders</option>' + d.folders.map(function (f) { return '<option' + (f === st.folder ? ' selected' : '') + ' value="' + esc(f) + '">' + esc(f) + '</option>'; }).join(''); }
        if (!d.items.length) { grid.innerHTML = A.html`${A.empty('No files yet', html`<p>Upload pictures or audio, or add a link.</p>`)}`.s; return; }
        grid.innerHTML = A.html`<div class="media-grid">${d.items.map(function (it) {
          return html`<button type="button" class="media-card" data-id="${it.id}">${thumb(it)}<div class="media-meta"><b title="${it.name}">${it.name}</b><span class="muted">${it.external ? 'Link' : A.fmt.bytes(it.size)} · ${it.kind}</span></div></button>`;
        })}</div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'files' })}<p class="small muted">Library total: ${A.fmt.bytes(d.bytes)}</p>`.s;
        grid._items = d.items;
      }).catch(function (e) { grid.innerHTML = A.html`<div class="notice bad">${e.message}</div>`.s; });
    }
    A.on(grid, 'click', '.media-card', function (e, t) {
      var it = grid._items.find(function (x) { return String(x.id) === t.getAttribute('data-id'); });
      if (!it) return;
      if (opts.pick) opts.pick(it); else detailDialog(it, load);
    });
    A.on(grid, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    A.q('#mq', root).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    var mk = A.q('#mk', root); if (mk) mk.onchange = function () { st.kind = mk.value; st.page = 1; load(); };
    A.q('#mf', root).onchange = function (e) { st.folder = e.target.value; st.page = 1; load(); };
    A.q('#mlink', root).onclick = function () { addLinkDialog(load); };
    A.q('#mup', root).onchange = function (e) { A.uploadFiles(e.target.files, st.folder).then(function (items) { e.target.value = ''; load(); if (opts.pick && items.length === 1) opts.pick(items[0]); }); };
    var dz = A.q('#mdrop', root);
    ['dragenter', 'dragover'].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { A.uploadFiles(e.dataTransfer.files, st.folder).then(function () { load(); }); });
    load();
  }

  /* Files shipped with the site (assets/...): read-only. */
  function siteFiles(root, opts) {
    var dir = 'assets';
    function load() {
      root.innerHTML = A.loading().s;
      A.get('/api/admin/media/site' + A.qs({ dir: dir })).then(function (d) {
        var crumbs = d.dir.split('/');
        var up = crumbs.length > 1 && d.roots.indexOf(d.dir) === -1 ? crumbs.slice(0, -1).join('/') : '';
        var head = html`<div class="toolbar"><span class="mono">/${d.dir}</span>${up ? html`<button class="btn sm" data-dir="${up}">‹ Up</button>` : ''}
          ${d.roots.map(function (r) { return html`<button class="btn sm ${r === d.dir ? 'primary' : ''}" data-dir="${r}">${r.split('/').pop()}</button>`; })}
          <input type="search" class="search right" id="sq" placeholder="Filter this folder…"></div>`;
        if (!d.available) { root.innerHTML = html`${head}<div class="notice warn">${d.note}</div>`.s; wire(); return; }
        var imagesOnly = opts.kind === 'image';
        var entries = d.entries.filter(function (e) { return e.kind === 'folder' || !opts.kind || e.kind === opts.kind || (!imagesOnly && opts.kind === 'other'); });
        root.innerHTML = html`${head}<div class="media-grid" id="sgrid">${entries.map(function (e, i) {
          if (e.kind === 'folder') return html`<button type="button" class="media-card" data-dir="${d.dir + '/' + e.name}" data-n="${e.name}"><div class="media-thumb">📁</div><div class="media-meta"><b>${e.name}</b><span class="muted">Folder</span></div></button>`;
          return html`<button type="button" class="media-card" data-i="${i}" data-n="${e.name}">${e.kind === 'image' ? html`<div class="media-thumb"><img src="${e.url}" loading="lazy" alt=""></div>` : html`<div class="media-thumb">${KIND_ICON[e.kind] || '📎'}</div>`}<div class="media-meta"><b title="${e.name}">${e.name}</b><span class="muted">${A.fmt.bytes(e.size)}</span></div></button>`;
        })}</div>`.s;
        root._entries = entries;
        wire();
      }).catch(function (e) { root.innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
    }
    function wire() {
      A.qa('[data-dir]', root).forEach(function (b) { b.onclick = function () { dir = b.getAttribute('data-dir'); load(); }; });
      A.qa('.media-card[data-i]', root).forEach(function (b) {
        b.onclick = function () {
          var e = root._entries[Number(b.getAttribute('data-i'))];
          var item = { id: 0, name: e.name, kind: e.kind, url: e.url, alt: '', external: true };
          if (opts.pick) opts.pick(item); else A.copy(location.origin + e.url);
        };
      });
      var sq = A.q('#sq', root);
      if (sq) sq.oninput = function () {
        var t = sq.value.toLowerCase();
        A.qa('.media-card', root).forEach(function (c) { c.hidden = !!t && c.getAttribute('data-n').toLowerCase().indexOf(t) === -1; });
      };
    }
    load();
  }

  /* Picker dialog: resolves to { url, name, alt } or null. */
  A.pickMedia = function (o) {
    o = o || {};
    return new Promise(function (resolve) {
      var done = false;
      var ctl = A.modal({
        title: o.title || 'Choose a file', size: 'xl', body: html`<div class="tabs"><button class="tab active" data-t="lib">Library</button><button class="tab" data-t="site">Site files</button></div><div id="pbody"></div>`,
        onClose: function () { if (!done) resolve(null); }
      });
      var body = A.q('#pbody', ctl.body);
      function pick(it) { done = true; resolve({ url: it.url, name: it.name, alt: it.alt || '' }); ctl.close(); }
      function show(t) {
        A.qa('.tab', ctl.body).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-t') === t); });
        if (t === 'lib') library(body, { pick: pick, kind: o.kind }); else siteFiles(body, { pick: pick, kind: o.kind });
      }
      A.qa('.tab', ctl.body).forEach(function (b) { b.onclick = function () { show(b.getAttribute('data-t')); }; });
      show('lib');
    });
  };

  A.route('/media', function (q, view) {
    A.setPage('Media', 'Pictures, audio and documents used by the site');
    var tab = q.get('tab') === 'site' ? 'site' : 'lib';
    view.innerHTML = html`<div class="tabs"><a class="tab ${tab === 'lib' ? 'active' : ''}" href="#/media">Library</a><a class="tab ${tab === 'site' ? 'active' : ''}" href="#/media?tab=site">Site files</a></div>
      ${tab === 'site' ? html`<div class="notice info" style="margin-bottom:12px">These are the files that ship with the site (covers, audio, background images). They are read-only here; click a file to copy its address. Replace them by changing the files in the project.</div>` : ''}
      <div id="mroot"></div>`.s;
    var root = A.q('#mroot', view);
    if (tab === 'site') siteFiles(root, {}); else library(root, {});
  });
})();
