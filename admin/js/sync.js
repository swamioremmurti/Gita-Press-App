/* Copy between sites: save the edits of this site into a file, or load such a file and copy the chosen parts in.
   The browser carries the data, so nothing needs the other site's password. Copies add and update; nothing is ever deleted. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var API = '/api/admin/sync';

  var AREAS = [
    ['books', 'Book text', 'Chapters of books edited or created in the panel'],
    ['settings', 'Book settings', 'On/off, featured, title and people, categories and tags of each book'],
    ['categories', 'Categories', 'The category list: names, order, hidden'],
    ['site', 'Site', 'Audio library changes, custom CSS, site notice, Gita corrections'],
    ['media', 'Media', 'Uploaded pictures and files (books and the audio library point to them by number)']
  ];
  var TABS = [['export', 'Save to a file'], ['import', 'Copy in from a file']];

  A.route('/sync', function (q, view) {
    var tab = q.get('tab') === 'import' ? 'import' : 'export';
    A.setPage('Copy between sites', 'Move edits between the live site and a local copy');
    A.q('#pageActions').innerHTML = '';
    view.innerHTML = html`<div class="tabs">${TABS.map(function (t) { return html`<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/sync${t[0] === 'export' ? '' : '?tab=import'}">${t[1]}</a>`; })}</div><div id="sbody"></div>`.s;
    var body = A.q('#sbody', view);
    return (tab === 'export' ? exportTab : importTab)(body);
  });

  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-'); }
  function save(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function sizeOf(n) { return A.fmt.bytes(n); }
  function when(ms) { return ms ? new Date(ms).toLocaleString() : '—'; }

  /* Fetches the given manifest items from this site and returns a Blob in the exchange format (one JSON per line). */
  function buildFile(items, here, progress) {
    var parts = [JSON.stringify({ t: 'head', format: 'kalyan-sync', v: 1, from: location.host, database: here.database, at: Date.now() }) + '\n'];
    var done = 0;
    function tick() { progress(done, items.length); }
    function one(it) {
      var meta = { t: 'item', id: it.id, area: it.area, label: it.label, fp: it.fp, updated: it.updated, info: it.info };
      if (it.id.indexOf('book:') === 0) {
        parts.push(JSON.stringify(Object.assign({}, meta, { t: 'book' })) + '\n');
        var page = function (after) {
          return A.get(API + '/item' + A.qs({ id: it.id, after: after })).then(function (d) {
            parts.push(JSON.stringify({ t: 'pages', id: it.id, doc: d.doc, chapters: d.chapters }) + '\n');
            return d.next === null || d.next === undefined ? null : page(d.next);
          });
        };
        return page(-1);
      }
      return A.get(API + '/item' + A.qs({ id: it.id })).then(function (d) { parts.push(JSON.stringify(Object.assign({}, meta, { data: d })) + '\n'); });
    }
    var chain = Promise.resolve();
    items.forEach(function (it) { chain = chain.then(function () { return one(it); }).then(function () { done++; tick(); }); });
    return chain.then(function () { return new Blob(parts, { type: 'application/x-ndjson' }); });
  }

  /* ------------------------------------------------------------ export */
  function exportTab(body) {
    body.innerHTML = A.loading().s;
    return A.get(API + '/manifest').then(function (m) {
      var items = m.items, on = {};
      items.forEach(function (i) { on[i.id] = true; });
      var filter = '';
      function draw() {
        var f = filter.toLowerCase();
        var n = items.filter(function (i) { return on[i.id]; }).length;
        body.innerHTML = html`<div class="notice info" style="margin-bottom:12px">This site is <b>${m.here.database}</b> (${m.here.origin}). Choose what to save; the file can then be opened on the other site under <b>Copy in from a file</b>. Pictures, audio and books keep their own numbers, so copy Media together with the books that use it.</div>
          <div class="toolbar"><input type="search" class="search" id="sq" placeholder="Filter by name…" value="${filter}"><button class="btn sm" id="all" type="button">Select all</button><button class="btn sm" id="none" type="button">Select none</button>
            <span class="right row" style="gap:8px"><b>${n} of ${items.length} selected</b><button class="btn primary" id="go" type="button" ${n ? '' : 'disabled'}>Save file</button></span></div>
          <div id="prog"></div>
          ${AREAS.map(function (a) {
            var list = items.filter(function (i) { return i.area === a[0] && (!f || i.label.toLowerCase().indexOf(f) !== -1); });
            var all = items.filter(function (i) { return i.area === a[0]; });
            if (!all.length) return '';
            var sel = all.filter(function (i) { return on[i.id]; }).length;
            return html`<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>${a[1]} <span class="faint">(${sel}/${all.length})</span></h3><span class="muted">${a[2]}</span>
              <span class="right"><button class="btn sm ghost" data-area="${a[0]}" data-v="1" type="button">All</button><button class="btn sm ghost" data-area="${a[0]}" data-v="0" type="button">None</button></span></div>
              <div class="table-wrap" style="border:0;box-shadow:none"><table class="tbl"><tbody>${list.map(function (i) {
                return html`<tr><td style="width:30px"><input type="checkbox" data-id="${i.id}" ${on[i.id] ? 'checked' : ''} aria-label="Select ${i.label}"></td><td class="hi">${i.label}</td><td class="muted">${i.info}</td><td class="muted nowrap">${i.updated ? when(i.updated) : ''}</td></tr>`;
              })}</tbody></table></div></div>`;
          })}`.s;
        wire();
      }
      function wire() {
        var sq = A.q('#sq', body);
        sq.oninput = A.debounce(function (e) { filter = e.target.value.trim(); draw(); var s = A.q('#sq', body); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 200);
        A.q('#all', body).onclick = function () { items.forEach(function (i) { on[i.id] = true; }); draw(); };
        A.q('#none', body).onclick = function () { on = {}; draw(); };
        A.q('#go', body).onclick = function () {
          var chosen = items.filter(function (i) { return on[i.id]; });
          var btn = this; btn.disabled = true;
          buildFile(chosen, m.here, function (d, t) { A.q('#prog', body).innerHTML = '<p class="muted">Reading ' + d + ' of ' + t + '…</p><progress max="' + t + '" value="' + d + '" style="width:100%"></progress>'; })
            .then(function (blob) {
              save(blob, 'kalyan-sync-' + (m.here.database === 'Live database' ? 'live' : 'local') + '-' + stamp() + '.jsonl');
              A.q('#prog', body).innerHTML = '<div class="notice ok">Saved ' + chosen.length + ' item(s), ' + sizeOf(blob.size) + '. Open the other site’s admin, go to <b>Copy between sites → Copy in from a file</b> and choose this file.</div>';
              btn.disabled = false;
            }).catch(function (e) { A.q('#prog', body).innerHTML = ''; btn.disabled = false; A.fail(e); });
        };
      }
      A.on(body, 'click', '[data-area]', function (e, t) { items.forEach(function (i) { if (i.area === t.getAttribute('data-area')) on[i.id] = t.getAttribute('data-v') === '1'; }); draw(); });
      A.on(body, 'change', '[data-id]', function (e, t) { on[t.getAttribute('data-id')] = t.checked; draw(); });
      draw();
    }).catch(function (e) { body.innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
  }

  /* ------------------------------------------------------------ import */
  function parseFile(text) {
    var head = null, recs = {}, order = [];
    text.split('\n').forEach(function (ln, n) {
      if (!ln.trim()) return;
      var o;
      try { o = JSON.parse(ln); } catch (e) { throw new Error('This is not a Kalyan sync file (line ' + (n + 1) + ' is damaged).'); }
      if (o.t === 'head') { head = o; return; }
      if (o.t === 'item' || o.t === 'book') { recs[o.id] = Object.assign({ pages: [] }, o); order.push(o.id); return; }
      if (o.t === 'pages' && recs[o.id]) recs[o.id].pages.push(o);
    });
    if (!head || head.format !== 'kalyan-sync') throw new Error('This is not a Kalyan sync file.');
    return { head: head, recs: order.map(function (id) { return recs[id]; }) };
  }

  function importTab(body) {
    var pkg = null, plan = {}, pick = {}, here = null;
    body.innerHTML = html`<div class="notice info" style="margin-bottom:12px">Choose a file saved from the other site (<b>Save to a file</b> there). You will see what is new or different before anything is copied. Nothing is deleted on this site; copied items replace this site’s version of the same item.</div>
      <div class="card"><div class="field"><label for="sfile">Sync file</label><input type="file" id="sfile" accept=".jsonl,.json,.txt"></div></div><div id="splan"></div>`.s;
    var out = A.q('#splan', body);
    A.on(out, 'change', '[data-i]', function (e, t) { pick[pkg.recs[Number(t.getAttribute('data-i'))].id] = t.checked; draw(); });

    A.q('#sfile', body).onchange = function (e) {
      var f = e.target.files[0];
      if (!f) return;
      out.innerHTML = A.loading('Reading the file…').s;
      f.text().then(function (text) {
        pkg = parseFile(text);
        return A.get(API + '/manifest').then(function (m) { here = m.here; });
      }).then(function () {
        return A.post(API + '/plan', { items: pkg.recs.map(function (r) { return { id: r.id, fp: r.fp }; }) });
      }).then(function (p) {
        plan = {}; pick = {};
        p.items.forEach(function (i) { plan[i.id] = i; });
        pkg.recs.forEach(function (r) {
          var pl = plan[r.id];
          r.status = pl.status; r.hereUpdated = pl.hereUpdated; r.hereInfo = pl.hereInfo;
          r.hereNewer = pl.status === 'differs' && pl.hereUpdated && r.updated && pl.hereUpdated > r.updated;
          pick[r.id] = r.status === 'new' || (r.status === 'differs' && !r.hereNewer);
        });
        draw();
      }).catch(function (err) { out.innerHTML = html`<div class="notice bad">${err.message}</div>`.s; });
    };

    function draw() {
      var recs = pkg.recs, n = recs.filter(function (r) { return pick[r.id]; }).length;
      var cnt = { new: 0, differs: 0, same: 0 };
      recs.forEach(function (r) { cnt[r.status]++; });
      out.innerHTML = html`<div class="notice ${here.database === pkg.head.database ? 'warn' : 'info'}" style="margin:12px 0">File from <b>${pkg.head.from}</b> (${pkg.head.database}), saved ${when(pkg.head.at)}. Copying into <b>${here.origin}</b> (${here.database}).
          ${here.database === pkg.head.database ? html`<br>Both sides are the same kind of database. Check that you opened the right site.` : ''}</div>
        <div class="toolbar"><span><b>${cnt.new}</b> new · <b>${cnt.differs}</b> different · <b>${cnt.same}</b> already the same</span>
          <button class="btn sm" id="selnew" type="button">Select new + different</button><button class="btn sm" id="selnone" type="button">Select none</button>
          <span class="right row" style="gap:10px"><label class="check small"><input type="checkbox" id="bk" checked> Save a backup of what gets replaced first</label>
          <button class="btn primary" id="apply" type="button" ${n ? '' : 'disabled'}>Copy ${n} item${n === 1 ? '' : 's'}</button></span></div>
        <div id="sprog"></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>Item</th><th>Kind</th><th>In the file</th><th>On this site</th><th>Status</th></tr></thead><tbody>
        ${recs.map(function (r, i) {
          var kind = (AREAS.find(function (a) { return a[0] === r.area; }) || [0, r.area])[1];
          return html`<tr class="${r.status === 'same' ? 'faint' : ''}"><td><input type="checkbox" data-i="${i}" ${pick[r.id] ? 'checked' : ''} ${r.status === 'same' ? 'disabled' : ''} aria-label="Copy ${r.label}"></td>
            <td class="hi">${r.label}<div class="t-sub">${r.info}</div></td><td>${kind}</td><td class="muted nowrap">${r.updated ? when(r.updated) : '—'}</td><td class="muted nowrap">${r.status === 'new' ? 'not there' : r.hereUpdated ? when(r.hereUpdated) : r.hereInfo}</td>
            <td>${r.status === 'new' ? html`<span class="badge info">New</span>` : r.status === 'same' ? html`<span class="badge">Same</span>` : r.hereNewer ? html`<span class="badge warn">Newer on this site</span>` : html`<span class="badge ok">Different</span>`}</td></tr>`;
        })}</tbody></table></div>
        <p class="hint" style="margin-top:8px">“Newer on this site” items are not selected: copying them would replace more recent work with older work.</p>`.s;
      A.q('#selnew', out).onclick = function () { recs.forEach(function (r) { pick[r.id] = r.status !== 'same'; }); draw(); };
      A.q('#selnone', out).onclick = function () { pick = {}; draw(); };
      A.q('#apply', out).onclick = run;
    }

    function run() {
      var chosen = pkg.recs.filter(function (r) { return pick[r.id]; });
      var wantBackup = A.q('#bk', out).checked;
      var btn = A.q('#apply', out);
      A.confirm({ title: 'Copy ' + chosen.length + ' item' + (chosen.length === 1 ? '' : 's') + ' into this site?', message: 'This replaces this site’s version of each chosen item' + (wantBackup ? '. A backup file of the replaced items is saved first.' : ', and no backup is saved.'), ok: 'Copy now' }).then(function (yes) {
        if (!yes) return;
        btn.disabled = true;
        var prog = A.q('#sprog', out), log = [];
        function show(msg, d) { prog.innerHTML = '<p class="muted">' + msg + '</p><progress max="' + chosen.length + '" value="' + d + '" style="width:100%"></progress>' + (log.length ? '<ul class="plain">' + log.join('') + '</ul>' : ''); }
        var replaced = chosen.filter(function (r) { return r.status === 'differs'; }).map(function (r) { return { id: r.id, area: r.area, label: r.label, fp: '', updated: 0, info: '' }; });
        var pre = wantBackup && replaced.length
          ? A.get(API + '/manifest').then(function (m) {
              var mine = {}; m.items.forEach(function (i) { mine[i.id] = i; });
              var list = replaced.map(function (r) { return mine[r.id]; }).filter(Boolean);
              return buildFile(list, m.here, function (d, t) { show('Backing up ' + d + ' of ' + t + ' items that will be replaced…', 0); }).then(function (blob) { save(blob, 'kalyan-sync-BACKUP-before-copy-' + stamp() + '.jsonl'); });
            })
          : Promise.resolve();
        var done = 0, bad = 0;
        pre.then(function () {
          var chain = Promise.resolve();
          chosen.forEach(function (r) {
            chain = chain.then(function () {
              show('Copying ' + r.label + '…', done);
              return applyOne(r).then(function () { log.push('<li>✓ ' + A.esc(r.label) + '</li>'); }, function (e) { bad++; log.push('<li class="bad">✗ ' + A.esc(r.label) + ' — ' + A.esc(e.message) + '</li>'); }).then(function () { done++; });
            });
          });
          return chain;
        }).then(function () {
          show(bad ? 'Finished with ' + bad + ' problem(s). The items marked ✗ were not changed.' : 'Done. ' + done + ' item(s) copied. Visitors see the changes within about a minute.', done);
          btn.disabled = false;
          A.toast(bad ? 'Copied with problems' : 'Copied', bad ? 'bad' : 'ok');
        }).catch(function (e) { btn.disabled = false; A.fail(e); });
      });
    }

    function applyOne(r) {
      var from = pkg.head.from;
      if (r.id.indexOf('book:') === 0) {
        var pages = r.pages, count = pages.reduce(function (n, p) { return n + p.chapters.length; }, 0);
        var doc = pages[0] && pages[0].doc;
        if (!doc) return Promise.reject(new Error('The file has no text for this book'));
        var chain = A.post(API + '/apply', { id: r.id, step: 'begin' });
        pages.forEach(function (p) { chain = chain.then(function () { return A.post(API + '/apply', { id: r.id, step: 'pages', chapters: p.chapters }); }); });
        return chain.then(function () { return A.post(API + '/apply', { id: r.id, step: 'commit', doc: doc, count: count, from: from }); });
      }
      return A.post(API + '/apply', { id: r.id, data: r.data, from: from });
    }
  }
})();
