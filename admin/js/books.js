/* Books: list with filters + bulk actions, the edit form, and creating a book. The text itself is edited in the chapter editor (editor.js). */
(function () {
  'use strict';
  var A = window.Admin, html = A.html, esc = A.esc;

  var catCache = null;
  A.categories = function (fresh) {
    if (catCache && !fresh) return Promise.resolve(catCache);
    return A.get('/api/admin/categories').then(function (d) { catCache = d.categories; return catCache; });
  };
  A.invalidateCategories = function () { catCache = null; };
  function catName(cats, key) { var c = cats.find(function (x) { return x.key === key; }); return c ? c.en : key; }

  /* ------------------------------------------------------------ list */
  A.route('/books', function (q, view) {
    A.setPage('Books', 'Everything in the library: switch books on and off, edit details, open the chapter editor',
      html`<a class="btn primary" href="#/books/new">+ Add book</a>`);
    var st = { q: q.get('q') || '', cat: q.get('cat') || '', pub: q.get('pub') || '', author: q.get('author') || '', live: q.get('live') || '', sz: q.get('sz') || '', status: q.get('status') || '', sort: q.get('sort') || 'title', page: Number(q.get('page')) || 1 };
    var selected = {}, rows = [];
    return A.categories().then(function (cats) {
      view.innerHTML = html`
        <div class="toolbar">
          <input type="search" class="search" id="bq" placeholder="Search title, file or author…" value="${st.q}">
          <select id="bc"><option value="">All categories</option>${cats.map(function (c) { return html`<option value="${c.key}" ${c.key === st.cat ? 'selected' : ''}>${c.en}</option>`; })}</select>
          <select id="bp" title="Publisher"><option value="">All publishers</option></select>
          <input type="search" id="ba" list="authorList" placeholder="Author…" value="${st.author === '__none' ? '' : st.author}" style="width:170px" title="Type part of a name, or pick one">
          <datalist id="authorList"></datalist>
          <select id="bz" title="Size">${[['', 'Any size'], ['s1', 'Under 100 KB'], ['s2', '100–500 KB'], ['s3', '500 KB – 1 MB'], ['s4', '1–5 MB'], ['s5', 'Over 5 MB']].map(function (o) { return html`<option value="${o[0]}" ${o[0] === st.sz ? 'selected' : ''}>${o[1]}</option>`; })}</select>
          <select id="bl" title="Live on the site">${[['', 'Live: any'], ['on', 'Live: on'], ['off', 'Live: off']].map(function (o) { return html`<option value="${o[0]}" ${o[0] === st.live ? 'selected' : ''}>${o[1]}</option>`; })}</select>
          <select id="bs">${[['', 'Any status'], ['enabled', 'Enabled'], ['disabled', 'Disabled'], ['featured', 'Featured'], ['edited', 'Text edited here'], ['created', 'Created here'], ['nocover', 'No cover']].map(function (o) { return html`<option value="${o[0]}" ${o[0] === st.status ? 'selected' : ''}>${o[1]}</option>`; })}</select>
          <button class="btn sm ghost" id="bclear" type="button" hidden>Clear filters</button>
          <select id="bo">${[['title', 'Sort: title'], ['size', 'Sort: size'], ['updated', 'Sort: recently edited']].map(function (o) { return html`<option value="${o[0]}" ${o[0] === st.sort ? 'selected' : ''}>${o[1]}</option>`; })}</select>
        </div>
        <div id="bulk"></div><div id="btable"></div>`.s;

      function push() {
        history.replaceState(null, '', '#/books' + A.qs({ q: st.q, cat: st.cat, pub: st.pub, author: st.author, sz: st.sz, live: st.live, status: st.status, sort: st.sort === 'title' ? '' : st.sort, page: st.page > 1 ? st.page : '' }));
      }
      function bulkBar() {
        var n = Object.keys(selected).length;
        A.q('#bulk', view).innerHTML = n ? html`<div class="bulkbar"><b>${n} selected</b>
          <button class="btn sm" data-bulk="enable">Enable</button><button class="btn sm" data-bulk="disable">Disable</button>
          <button class="btn sm" data-bulk="feature">Feature</button><button class="btn sm" data-bulk="unfeature">Unfeature</button>
          <button class="btn sm" data-bulk="addCategory">Add to category…</button><button class="btn sm" data-bulk="removeCategory">Remove from category…</button>
          <button class="btn sm ghost right" data-bulk="clear">Clear selection</button></div>`.s : '';
      }
      function fillPublishers(d) {
        var sel = A.q('#bp', view);
        if (!d.publishers) { sel.hidden = true; return; }            // a server that has not been restarted since the filter was added sends no list
        sel.hidden = false;
        var key = d.publishers.length + ':' + d.noPublisher;
        if (sel.getAttribute('data-key') === key) return;          // same list as before
        sel.setAttribute('data-key', key);
        sel.innerHTML = html`<option value="">All publishers</option>
          ${d.publishers.map(function (p) { return html`<option value="${p.name}" ${p.name === st.pub ? 'selected' : ''}>${p.name} (${p.count})</option>`; })}
          ${d.noPublisher ? html`<option value="__none" ${st.pub === '__none' ? 'selected' : ''}>No publisher (${d.noPublisher})</option>` : ''}`.s;
        sel.value = st.pub;
      }
      function fillAuthors(d) {
        var dl = A.q('#authorList', view);
        if (!d.authors || dl.getAttribute('data-n') === String(d.authors.length)) return;
        dl.setAttribute('data-n', String(d.authors.length));
        dl.innerHTML = d.authors.map(function (a) { return html`<option value="${a.name}">${a.count} book${a.count === 1 ? '' : 's'}</option>`.s; }).join('');
      }
      function anyFilter() { return !!(st.q || st.cat || st.pub || st.author || st.sz || st.live || st.status); }
      function showClear() { A.q('#bclear', view).hidden = !anyFilter(); }
      function load() {
        push();
        A.q('#btable', view).innerHTML = A.loading().s;
        return A.get('/api/admin/books' + A.qs({ q: st.q, cat: st.cat, pub: st.pub, author: st.author, sz: st.sz, live: st.live, status: st.status, sort: st.sort, page: st.page, size: 50 })).then(function (d) {
          rows = d.books;
          fillPublishers(d);
          fillAuthors(d);
          showClear();
          var allSel = rows.length && rows.every(function (b) { return selected[b.file]; });
          A.q('#btable', view).innerHTML = rows.length ? html`
            <div class="table-wrap"><table class="tbl"><thead><tr>
              <th style="width:34px"><input type="checkbox" id="selAll" ${allSel ? 'checked' : ''} aria-label="Select all on this page"></th><th>Book</th><th>Author</th><th>Publisher</th><th>Categories</th><th>Size</th><th>Live</th><th></th></tr></thead><tbody>
              ${rows.map(function (b, i) {
                return html`<tr class="${selected[b.file] ? 'sel' : ''}"><td><input type="checkbox" data-sel="${i}" ${selected[b.file] ? 'checked' : ''} aria-label="Select ${b.title}"></td>
                  <td><div class="row" style="flex-wrap:nowrap;gap:10px">${A.coverEl(b)}<div style="min-width:0"><div class="t-title hi">${b.title}
                    ${b.featured ? html` <span class="badge accent">Featured</span>` : ''}${b.created ? html` <span class="badge info">Created here</span>` : ''}${b.doc && b.doc.updatedAt ? html` <span class="badge warn" title="The text of this book was edited in the panel">Text edited</span>` : ''}</div>
                    <div class="t-sub hi">${b.file}</div></div></div></td>
                  <td class="hi" style="max-width:200px">${b.author || html`<span class="faint">—</span>`}</td>
                  <td class="hi muted" style="max-width:150px">${b.publisher || html`<span class="faint">—</span>`}</td>
                  <td>${b.categories.map(function (k) { return html`<span class="chip">${catName(cats, k)}</span>`; })}</td>
                  <td class="nowrap muted">${A.fmt.bytes(b.sizeKB * 1024)}</td>
                  <td>${A.switchEl(b.enabled, 'data-live="' + i + '" title="Show or hide this book on the site"')}</td>
                  <td><div class="acts"><a class="btn sm" href="#/books/edit?file=${encodeURIComponent(b.file)}">Edit</a>
                    <a class="btn sm" href="#/editor?file=${encodeURIComponent(b.file)}">Chapters</a>
                    ${b.slug && b.enabled ? html`<a class="btn sm ghost" href="${A.bookUrl(b)}" target="_blank" rel="noopener" title="Open on the site">↗</a>` : ''}</div></td></tr>`;
              })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'books' })}`.s
            : A.empty('No books match', html`<p>Try clearing a filter.</p>`).s;
          bulkBar();
        }).catch(function (e) { A.q('#btable', view).innerHTML = html`<div class="notice bad">${e.message}</div>`.s; });
      }

      A.q('#bq', view).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
      ['bc:cat', 'bp:pub', 'bz:sz', 'bl:live', 'bs:status', 'bo:sort'].forEach(function (p) {
        var id = p.split(':')[0], key = p.split(':')[1];
        A.q('#' + id, view).onchange = function (e) { st[key] = e.target.value; st.page = 1; load(); };
      });
      A.q('#ba', view).oninput = A.debounce(function (e) { st.author = e.target.value.trim(); st.page = 1; load(); }, 250);
      A.q('#bclear', view).onclick = function () {
        st.q = st.cat = st.pub = st.author = st.sz = st.live = st.status = ''; st.page = 1;
        ['bq', 'ba'].forEach(function (id) { A.q('#' + id, view).value = ''; });
        ['bc', 'bp', 'bz', 'bl', 'bs'].forEach(function (id) { A.q('#' + id, view).value = ''; });
        load();
      };
      A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
      A.on(view, 'change', '#selAll', function (e, t) { rows.forEach(function (b) { if (t.checked) selected[b.file] = 1; else delete selected[b.file]; }); load(); });
      A.on(view, 'change', '[data-sel]', function (e, t) {
        var b = rows[Number(t.getAttribute('data-sel'))];
        if (t.checked) selected[b.file] = 1; else delete selected[b.file];
        t.closest('tr').classList.toggle('sel', t.checked); bulkBar();
      });
      A.on(view, 'change', '[data-live] input', function (e, input) {
        var b = rows[Number(input.closest('[data-live]').getAttribute('data-live'))];
        A.patch('/api/admin/books/' + encodeURIComponent(b.file), { enabled: input.checked }).then(function () {
          b.enabled = input.checked; A.toast((b.title) + (input.checked ? ' is now live' : ' is hidden from the site'), 'ok');
        }).catch(function (err) { input.checked = !input.checked; A.fail(err); });
      });
      A.on(view, 'click', '[data-bulk]', function (e, t) {
        var action = t.getAttribute('data-bulk');
        if (action === 'clear') { selected = {}; load(); return; }
        var files = Object.keys(selected);
        function run(extra) {
          return A.post('/api/admin/books/bulk', Object.assign({ files: files, action: action }, extra || {})).then(function (r) {
            A.toast(r.changed + ' book' + (r.changed === 1 ? '' : 's') + ' updated', 'ok'); selected = {}; load();
          });
        }
        if (action === 'addCategory' || action === 'removeCategory') {
          var ctl = A.modal({
            title: action === 'addCategory' ? 'Add ' + files.length + ' books to a category' : 'Remove ' + files.length + ' books from a category', size: 'narrow',
            body: html`<div class="field"><label>Category</label><select id="bk" style="width:100%">${cats.map(function (c) { return html`<option value="${c.key}">${c.en}</option>`; })}</select></div>${action === 'removeCategory' ? html`<p class="hint">A book always keeps at least one category.</p>` : ''}`,
            footer: [{ label: 'Cancel' }, { label: 'Apply', kind: 'primary', onClick: function (c) { return run({ category: A.q('#bk', c.body).value }); } }]
          });
          return ctl;
        }
        if (action === 'disable') {
          A.confirm({ title: 'Hide ' + files.length + ' books?', message: 'They disappear from the library, search and their pages until you enable them again.', ok: 'Hide books', danger: true }).then(function (yes) { if (yes) run(); });
        } else run();
      });
      return load();
    });
  });

  /* ------------------------------------------------------------ form pieces */
  function peopleField(id, label, value, placeholder) {
    return html`<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" class="hi" value="${value}" placeholder="${placeholder || ''}"><span class="hint">Several names: separate with a semicolon ( ; )</span></div>`;
  }
  function categoryChips(cats, selected) {
    return html`<div id="bcats">${cats.map(function (c) {
      return html`<label class="chip chip-pick"><input type="checkbox" value="${c.key}" ${selected.indexOf(c.key) !== -1 ? 'checked' : ''}> ${c.icon} ${c.en}</label>`;
    })}</div>`;
  }
  function checkedValues(root, sel) { return A.qa(sel + ' input:checked', root).map(function (i) { return i.value; }); }
  function tagsInput(tags) {
    return html`<div class="field"><label for="btags">Tags</label><input type="text" id="btags" value="${(tags || []).join(', ')}" placeholder="separate with commas"><span class="hint">Tags help readers find the book. They are shown on the book page.</span></div>`;
  }
  function coverField(cover) {
    return html`<div class="field"><label>Cover image</label><div class="row top">
      <div id="bcoverprev" style="width:90px;flex:none">${cover ? html`<img src="${A.coverSrc(cover)}" alt="" style="width:90px;aspect-ratio:3/4;object-fit:cover;border-radius:6px;border:1px solid var(--line)">` : html`<div class="cover" style="width:90px;height:120px">No cover</div>`}</div>
      <div class="grow"><input type="text" id="bcover" value="${cover || ''}" placeholder="/assets/covers/… or an uploaded file's address">
      <div class="row" style="margin-top:8px"><button class="btn sm" type="button" id="bpick">Choose from media…</button><button class="btn sm ghost" type="button" id="bclear">Remove</button></div></div></div></div>`;
  }
  function wireCover(root) {
    function show() {
      var v = A.q('#bcover', root).value.trim();
      A.q('#bcoverprev', root).innerHTML = v ? html`<img src="${A.coverSrc(v)}" alt="" style="width:90px;aspect-ratio:3/4;object-fit:cover;border-radius:6px;border:1px solid var(--line)">`.s : html`<div class="cover" style="width:90px;height:120px">No cover</div>`.s;
    }
    A.q('#bpick', root).onclick = function () { A.pickMedia({ kind: 'image', title: 'Choose a cover image' }).then(function (m) { if (m) { A.q('#bcover', root).value = m.url; show(); } }); };
    A.q('#bclear', root).onclick = function () { A.q('#bcover', root).value = ''; show(); };
    A.q('#bcover', root).onchange = show;
  }

  /* ------------------------------------------------------------ edit */
  A.route('/books/edit', function (q, view) {
    var file = q.get('file') || '';
    return Promise.all([A.get('/api/admin/books/' + encodeURIComponent(file)), A.categories()]).then(function (res) {
      var b = res[0].book, cats = res[1];
      A.setPage(b.title, b.file, html`<a class="btn" href="#/editor?file=${encodeURIComponent(b.file)}">Edit chapters</a>${b.slug && b.enabled ? html`<a class="btn" href="${A.bookUrl(b)}" target="_blank" rel="noopener">View on site ↗</a>` : ''}`);
      var orig = { title: b.title, author: b.author, tikakar: b.tikakar, translator: b.translator, publisher: b.publisher, cover: b.cover, description: b.description };
      view.innerHTML = html`<form id="bform" class="cols" autocomplete="off">
        <div class="stack">
          <div class="card"><div class="card-h"><h2>Details</h2></div><div class="card-b">
            <div class="field"><label for="btitle">Title</label><input type="text" id="btitle" class="hi" value="${b.title}" required>
              <span class="hint">${b.created ? 'The web address of a created book follows its title when the page loads.' : 'Changing the title does not change the book’s web address.'}${b.baseTitle && b.baseTitle !== b.title ? ' Original: ' + b.baseTitle : ''}</span></div>
            <div class="field"><label for="bdesc">Description</label><textarea id="bdesc" rows="3" class="hi" placeholder="A short introduction shown on the book page. Leave empty to use the automatic one.">${b.description}</textarea></div>
          </div></div>
          <div class="card"><div class="card-h"><h2>People & publisher</h2></div><div class="card-b">
            <div class="grid2">${peopleField('bauthor', 'Author', b.author)}${peopleField('btikakar', 'Commentator (tikakar)', b.tikakar)}</div>
            <div class="grid2">${peopleField('btrans', 'Translator', b.translator)}${peopleField('bpub', 'Publisher', b.publisher)}</div>
          </div></div>
          <div class="card"><div class="card-h"><h2>Shelves</h2></div><div class="card-b">
            <div class="label" style="margin-bottom:8px">Categories <span class="hint">(the first one is the main shelf)</span></div>${categoryChips(cats, b.categories)}
            <div style="margin-top:14px">${tagsInput(b.tags)}</div>
          </div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h2>Visibility</h2></div><div class="card-b stack">
            <div class="row"><label class="switch"><input type="checkbox" id="benabled" ${b.enabled ? 'checked' : ''}><i></i></label><div><b>Live on the site</b><div class="hint">Off hides the book everywhere: library, search, its page.</div></div></div>
            <div class="row"><label class="switch"><input type="checkbox" id="bfeatured" ${b.featured ? 'checked' : ''}><i></i></label><div><b>Featured</b><div class="hint">Marks the book for highlighting.</div></div></div>
          </div></div>
          <div class="card"><div class="card-h"><h2>Cover</h2></div><div class="card-b">${coverField(b.cover)}</div></div>
          <div class="card"><div class="card-h"><h2>Text</h2></div><div class="card-b stack">
            <p class="small muted">${b.doc && b.doc.updatedAt ? 'The text of this book has been edited here (' + b.doc.chapters + ' chapters, last change ' + A.fmt.ago(b.doc.updatedAt) + ').' : 'The text still comes from the original book file.'}</p>
            <a class="btn" href="#/editor?file=${encodeURIComponent(b.file)}">Open chapter editor</a>
          </div></div>
          ${b.created ? html`<div class="card"><div class="card-h"><h2>Danger zone</h2></div><div class="card-b"><button class="btn danger" type="button" id="bdelete">Delete this book</button><p class="hint" style="margin-top:6px">Removes the book, its chapters, reading progress and comments. This cannot be undone.</p></div></div>` : ''}
        </div>
        </form>
        <div class="sticky-actions"><button class="btn primary" type="submit" form="bform" id="bsave">Save changes</button><a class="btn" href="#/books">Back to books</a><span class="muted small" id="bmsg" style="align-self:center"></span></div>`.s;
      wireCover(view);
      A.q('#bform', view).onsubmit = function (e) {
        e.preventDefault();
        var cur = {
          title: A.q('#btitle', view).value.trim(), author: A.q('#bauthor', view).value, tikakar: A.q('#btikakar', view).value, translator: A.q('#btrans', view).value,
          publisher: A.q('#bpub', view).value, cover: A.q('#bcover', view).value.trim(), description: A.q('#bdesc', view).value.trim()
        };
        var overrides = {};
        Object.keys(cur).forEach(function (k) { if (cur[k] !== orig[k]) overrides[k] = cur[k]; });
        var categories = checkedValues(view, '#bcats');
        if (!categories.length) { A.toast('Choose at least one category', 'bad'); return; }
        var btn = A.q('#bsave', view); btn.disabled = true;
        A.patch('/api/admin/books/' + encodeURIComponent(file), {
          enabled: A.q('#benabled', view).checked, featured: A.q('#bfeatured', view).checked, overrides: overrides, categories: categories,
          tags: A.q('#btags', view).value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
        }).then(function (r) {
          btn.disabled = false; A.toast('Saved', 'ok');
          Object.keys(overrides).forEach(function (k) { orig[k] = overrides[k]; });
          A.setPage(r.book.title, r.book.file);
        }).catch(function (err) { btn.disabled = false; A.fail(err); });
      };
      var del = A.q('#bdelete', view);
      if (del) del.onclick = function () {
        A.confirm({ title: 'Delete “' + b.title + '”?', message: 'The book, all its chapters, reading progress and comments will be removed for good.', ok: 'Delete book', danger: true }).then(function (yes) {
          if (yes) A.del('/api/admin/books/' + encodeURIComponent(file)).then(function () { A.toast('Book deleted', 'ok'); A.go('#/books'); }).catch(A.fail);
        });
      };
    });
  });

  /* ------------------------------------------------------------ create */
  A.route('/books/new', function (q, view) {
    A.setPage('Add a book', 'Start a new book from scratch, or import one that is already formatted as HTML');
    return A.categories().then(function (cats) {
      view.innerHTML = html`<form id="nform" class="cols" autocomplete="off"><div class="stack">
        <div class="card"><div class="card-h"><h2>Start from</h2></div><div class="card-b">
          <label class="check" style="margin-bottom:10px"><input type="radio" name="mode" value="blank" checked> <span><b>A blank book</b> — a title page and one chapter, then write in the chapter editor</span></label>
          <label class="check"><input type="radio" name="mode" value="html"> <span><b>An HTML file</b> — a book already converted to the library’s format (page breaks between chapters)</span></label>
          <div class="field" id="nfilebox" style="margin-top:12px" hidden><label for="nfile">Book file</label><input type="file" id="nfile" accept=".html,.htm,text/html"><span class="hint">Chapters are the pieces between <span class="mono">&lt;hr class="page-break"&gt;</span> lines.</span></div>
        </div></div>
        <div class="card"><div class="card-h"><h2>Details</h2></div><div class="card-b">
          <div class="field"><label for="ntitle">Title</label><input type="text" id="ntitle" class="hi" required></div>
          <div class="grid2">${peopleField('nauthor', 'Author', '')}${peopleField('ntikakar', 'Commentator (tikakar)', '')}</div>
          <div class="grid2">${peopleField('ntrans', 'Translator', '')}${peopleField('npub', 'Publisher', '')}</div>
        </div></div></div>
        <div class="stack"><div class="card"><div class="card-h"><h2>Shelves</h2></div><div class="card-b">
          <div class="label" style="margin-bottom:8px">Categories</div>${categoryChips(cats, [])}<div style="margin-top:14px">${tagsInput([])}</div></div></div>
          <div class="card"><div class="card-b row"><label class="switch"><input type="checkbox" id="nenabled" checked><i></i></label><div><b>Live on the site</b><div class="hint">Turn off to prepare the book privately first.</div></div></div></div>
        </div></form>
        <div class="sticky-actions"><button class="btn primary" type="submit" form="nform" id="nsave">Create book</button><a class="btn" href="#/books">Cancel</a></div>`.s;
      A.qa('input[name=mode]', view).forEach(function (r) { r.onchange = function () { A.q('#nfilebox', view).hidden = A.q('input[name=mode]:checked', view).value !== 'html'; }; });
      A.q('#nform', view).onsubmit = function (e) {
        e.preventDefault();
        var mode = A.q('input[name=mode]:checked', view).value;
        var categories = checkedValues(view, '#bcats');
        if (!categories.length) { A.toast('Choose at least one category', 'bad'); return; }
        var f = A.q('#nfile', view).files[0];
        if (mode === 'html' && !f) { A.toast('Choose the HTML file', 'bad'); return; }
        var btn = A.q('#nsave', view); btn.disabled = true;
        (mode === 'html' ? A.readFile(f, 'text') : Promise.resolve('')).then(function (text) {
          return A.post('/api/admin/books', {
            mode: mode, html: text, title: A.q('#ntitle', view).value, categories: categories, enabled: A.q('#nenabled', view).checked,
            author: A.q('#nauthor', view).value, tikakar: A.q('#ntikakar', view).value, translator: A.q('#ntrans', view).value, publisher: A.q('#npub', view).value,
            tags: A.q('#btags', view).value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
          });
        }).then(function (r) {
          A.toast('Book created', 'ok'); A.go('#/editor?file=' + encodeURIComponent(r.book.file));
        }).catch(function (err) { btn.disabled = false; A.fail(err); });
      };
    });
  });
})();
