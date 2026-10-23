/* Categories (the library's shelves) and tags. Changes show on the site without a redeploy. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;

  A.route('/categories', function (q, view) {
    A.setPage('Categories & tags', 'Shelves of the library: names, order, visibility', html`<button class="btn primary" id="addcat" type="button">+ Add category</button>`);
    var cats = [], tags = [];

    function draw() {
      view.innerHTML = html`<div class="cols collapse-lg">
        <div class="card"><div class="card-h"><h2>Categories</h2><span class="right muted small">Drag rows or use the arrows to set the order shown on the site</span></div>
        <div class="table-wrap" style="border:0;box-shadow:none;border-radius:0"><table class="tbl" id="cattable"><thead><tr><th></th><th>Name</th><th>Hindi name</th><th>Books</th><th>Shown</th><th></th></tr></thead><tbody>
        ${cats.map(function (c, i) {
          return html`<tr draggable="true" data-i="${i}"><td class="nowrap"><span class="faint" style="cursor:grab" title="Drag">⋮⋮</span> <button class="btn sm ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm ghost" data-down="${i}" ${i === cats.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></td>
            <td class="nowrap"><span style="font-size:18px">${c.icon}</span> <b>${c.en}</b>${c.hidden ? html` <span class="badge warn">Hidden</span>` : ''}${c.edited ? '' : html` <span class="badge" title="Using the name built into the site">built-in</span>`}<div class="mono faint">${c.key}</div></td>
            <td class="hi">${c.hi}</td><td><a href="#/books?cat=${encodeURIComponent(c.key)}">${c.books}</a></td>
            <td>${A.switchEl(!c.hidden, 'data-show="' + i + '" title="Show this shelf in the library tabs"')}</td>
            <td><div class="acts"><button class="btn sm" data-edit="${i}">Edit</button><button class="btn sm danger" data-del="${i}">Delete</button></div></td></tr>`;
        })}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h2>Tags</h2><span class="right muted small">${tags.length}</span></div><div class="card-b">
          <p class="hint" style="margin-bottom:10px">Tags are added to books in the book form. Renaming a tag to the name of another tag merges them.</p>
          ${tags.length ? tags.map(function (t, i) { return html`<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="grow">${t.label}</span><span class="muted small">${t.books} book${t.books === 1 ? '' : 's'}</span><button class="btn sm" data-trename="${i}">Rename</button><button class="btn sm danger" data-tdel="${i}">Delete</button></div>`; }) : A.empty('No tags yet', 'Add tags in the book form.')}
        </div></div></div>`.s;
    }

    function load() {
      return Promise.all([A.categories(true), A.get('/api/admin/tags')]).then(function (r) { cats = r[0]; tags = r[1].tags; draw(); });
    }
    function saveOrder() {
      return A.post('/api/admin/categories/reorder', { keys: cats.map(function (c) { return c.key; }) }).then(function () { A.invalidateCategories(); draw(); }).catch(function (e) { A.fail(e); load(); });
    }

    function catForm(c) {
      var isNew = !c;
      c = c || { key: '', en: '', hi: '', icon: '📖' };
      var ctl = A.modal({
        title: isNew ? 'Add a category' : 'Edit ' + c.en, size: 'narrow',
        body: html`<div class="field"><label for="cen">Name (English)</label><input type="text" id="cen" value="${c.en}"></div>
          <div class="field"><label for="chi">Name (Hindi)</label><input type="text" id="chi" class="hi" value="${c.hi}"></div>
          <div class="field"><label for="cic">Icon</label><input type="text" id="cic" value="${c.icon}" style="max-width:100px"><span class="hint">One emoji or a short symbol.</span></div>
          ${isNew ? '' : html`<p class="hint">Key: <span class="mono">${c.key}</span> (fixed; books are linked through it)</p>`}`,
        footer: [{ label: 'Cancel' }, { label: isNew ? 'Add' : 'Save', kind: 'primary', onClick: function (m) {
          var body = { en: A.q('#cen', m.body).value, hi: A.q('#chi', m.body).value, icon: A.q('#cic', m.body).value };
          var req = isNew ? A.post('/api/admin/categories', body) : A.patch('/api/admin/categories/' + encodeURIComponent(c.key), body);
          return req.then(function () { A.invalidateCategories(); A.toast('Saved', 'ok'); return load(); });
        } }]
      });
      return ctl;
    }
    A.q('#addcat').onclick = function () { catForm(null); };

    A.on(view, 'click', '[data-edit]', function (e, t) { catForm(cats[Number(t.getAttribute('data-edit'))]); });
    A.on(view, 'click', '[data-up]', function (e, t) { var i = Number(t.getAttribute('data-up')); cats.splice(i - 1, 0, cats.splice(i, 1)[0]); saveOrder(); });
    A.on(view, 'click', '[data-down]', function (e, t) { var i = Number(t.getAttribute('data-down')); cats.splice(i + 1, 0, cats.splice(i, 1)[0]); saveOrder(); });
    A.on(view, 'change', '[data-show] input', function (e, input) {
      var c = cats[Number(input.closest('[data-show]').getAttribute('data-show'))];
      A.patch('/api/admin/categories/' + encodeURIComponent(c.key), { hidden: !input.checked }).then(function () { c.hidden = !input.checked; A.invalidateCategories(); draw(); A.toast(input.checked ? 'Shelf shown' : 'Shelf hidden (its books stay under “All”)', 'ok'); })
        .catch(function (err) { input.checked = !input.checked; A.fail(err); });
    });
    A.on(view, 'click', '[data-del]', function (e, t) {
      var c = cats[Number(t.getAttribute('data-del'))];
      var others = cats.filter(function (x) { return x.key !== c.key; });
      var ctl = A.modal({
        title: 'Delete “' + c.en + '”', size: 'narrow',
        body: html`${c.books ? html`<p>${c.books} book${c.books === 1 ? ' is' : 's are'} on this shelf. Move ${c.books === 1 ? 'it' : 'them'} to:</p><div class="field" style="margin-top:8px"><select id="mv" style="width:100%">${others.map(function (o) { return html`<option value="${o.key}">${o.en}</option>`; })}</select></div>` : html`<p>No books are on this shelf.</p>`}`,
        footer: [{ label: 'Cancel' }, { label: 'Delete category', kind: 'danger solid', onClick: function (m) {
          var mv = A.q('#mv', m.body);
          return A.del('/api/admin/categories/' + encodeURIComponent(c.key), { moveTo: mv ? mv.value : '' }).then(function () { A.invalidateCategories(); A.toast('Category deleted', 'ok'); return load(); });
        } }]
      });
      return ctl;
    });
    A.on(view, 'click', '[data-trename]', function (e, t) {
      var tag = tags[Number(t.getAttribute('data-trename'))];
      A.prompt({ title: 'Rename tag', label: 'Tag', value: tag.label }).then(function (v) {
        if (v && v.trim() && v.trim() !== tag.label) A.patch('/api/admin/tags/' + tag.id, { label: v.trim() }).then(function () { A.toast('Tag renamed', 'ok'); load(); }).catch(A.fail);
      });
    });
    A.on(view, 'click', '[data-tdel]', function (e, t) {
      var tag = tags[Number(t.getAttribute('data-tdel'))];
      A.confirm({ title: 'Delete tag “' + tag.label + '”?', message: 'It is removed from ' + tag.books + ' book' + (tag.books === 1 ? '' : 's') + '.', ok: 'Delete tag', danger: true }).then(function (yes) {
        if (yes) A.del('/api/admin/tags/' + tag.id).then(function () { A.toast('Tag deleted', 'ok'); load(); }).catch(A.fail);
      });
    });

    // drag to reorder
    var dragI = null;
    view.addEventListener('dragstart', function (e) { var tr = e.target.closest('tr[data-i]'); if (tr) { dragI = Number(tr.getAttribute('data-i')); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (x) {} } });
    view.addEventListener('dragover', function (e) { if (dragI !== null && e.target.closest('tr[data-i]')) e.preventDefault(); });
    view.addEventListener('drop', function (e) {
      var tr = e.target.closest('tr[data-i]'); if (!tr || dragI === null) return;
      e.preventDefault();
      var to = Number(tr.getAttribute('data-i'));
      if (to !== dragI) { cats.splice(to, 0, cats.splice(dragI, 1)[0]); saveOrder(); }
      dragI = null;
    });
    return load();
  });
})();
