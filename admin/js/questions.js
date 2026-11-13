/* Chat questions: what visitors asked that the books could not answer (to review and work out), and the answer cache. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var STATUS = { new: 'New', working: 'Working on it', done: 'Done' };
  var TONE = { new: 'warn', working: 'info', done: 'ok' };

  A.route('/questions', function (q, view) {
    A.setPage('Chat questions', 'Questions the chat answered with “information not available”, so you can review them and add what is missing. Repeated questions are answered from a cache.');
    var st = { status: q.get('status') || 'new', q: '', page: 1 }, rows = [];
    view.innerHTML = html`<div id="qstats"></div>
      <div class="toolbar"><input type="search" class="search" id="qq" placeholder="Search questions or notes…">
      <select id="qs"><option value="">All</option><option value="new">New</option><option value="working">Working on it</option><option value="done">Done</option></select></div>
      <div id="qtable"></div><div id="qcache"></div>`.s;
    A.q('#qs', view).value = st.status;

    function stats(d) {
      A.counts.questions = d.counts.new || 0;
      A.q('#qstats', view).innerHTML = html`<div class="stats">
        <div class="stat"><div class="n">${A.fmt.num(d.counts.new)}</div><div class="l">New</div><div class="s">not looked at yet</div></div>
        <div class="stat"><div class="n">${A.fmt.num(d.counts.working)}</div><div class="l">Working on it</div><div class="s">being fixed</div></div>
        <div class="stat"><div class="n">${A.fmt.num(d.counts.done)}</div><div class="l">Done</div><div class="s">answered now</div></div>
        <div class="stat"><div class="n">${A.fmt.num(d.cache.entries)}</div><div class="l">Cached answers</div><div class="s">reused ${A.fmt.num(d.cache.hits)} times</div></div></div>`.s;
    }

    function cache(d) {
      var top = d.cache.top.filter(function (c) { return c.hits > 0; });
      A.q('#qcache', view).innerHTML = html`<div class="card" style="margin-top:16px"><div class="card-h"><h2>Answer cache</h2>
        <span class="right"><button class="btn sm danger" id="clearCache" ${d.cache.entries ? '' : 'disabled'}>Clear all cached answers</button></span></div>
        <div class="card-b"><p class="small muted">The first time a question is asked it goes to the AI; the finished answer is kept and shown to everyone who asks the same question again (for 30 days, and only until the books or the answer rules change). Follow-up questions are never cached. If a cached answer is wrong, delete it here so the next person gets a fresh one.</p></div>
        ${top.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Most reused questions</th><th class="num">Reused</th><th>Last reused</th><th></th></tr></thead><tbody>
          ${top.map(function (c) { return html`<tr><td class="hi" style="max-width:520px">${c.question}</td><td class="num">${A.fmt.num(c.hits)}</td><td class="nowrap">${c.lastHit ? A.fmt.ago(c.lastHit) : '—'}</td><td class="acts"><button class="btn sm danger" data-delc="${c.key}">Delete</button></td></tr>`; })}
        </tbody></table></div>` : ''}</div>`.s;
    }

    function load() {
      return A.get('/api/admin/questions' + A.qs({ status: st.status, q: st.q, page: st.page, size: 30 })).then(function (d) {
        rows = d.questions; stats(d); cache(d);
        A.q('#qtable', view).innerHTML = rows.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Question</th><th class="num">Asked</th><th>Last asked</th><th>Status</th><th>Note</th><th></th></tr></thead><tbody>
          ${rows.map(function (r, i) {
            return html`<tr><td class="hi" style="max-width:360px"><b>${r.question}</b>${r.books.length ? html`<div class="t-sub">Searched: ${r.books.join(', ')}</div>` : ''}</td>
              <td class="num">${A.fmt.num(r.times)}</td><td class="nowrap" title="${A.fmt.date(r.last)}">${A.fmt.ago(r.last)}</td>
              <td><select data-st="${i}" class="badge ${TONE[r.status]}">${Object.keys(STATUS).map(function (k) { return html`<option value="${k}" ${r.status === k ? 'selected' : ''}>${STATUS[k]}</option>`; })}</select></td>
              <td style="max-width:220px" class="small">${r.note || html`<span class="muted">—</span>`}</td>
              <td class="acts"><button class="btn sm" data-view="${i}">Answer</button><button class="btn sm" data-note="${i}">Note</button><button class="btn sm danger" data-del="${i}">Delete</button></td></tr>`;
          })}</tbody></table></div>${A.pager({ total: d.total, page: d.page, size: d.size, noun: 'questions' })}`.s
          : A.empty(st.status === 'new' ? 'No new questions' : 'No questions here', 'When the chat cannot find an answer in the books, the question appears here.').s;
      });
    }

    A.q('#qq', view).oninput = A.debounce(function (e) { st.q = e.target.value.trim(); st.page = 1; load(); }, 250);
    A.q('#qs', view).onchange = function (e) { st.status = e.target.value; st.page = 1; load(); };
    A.on(view, 'click', '[data-page]', function (e, t) { st.page = Number(t.getAttribute('data-page')); load(); });
    A.on(view, 'change', '[data-st]', function (e, t) {
      var r = rows[Number(t.getAttribute('data-st'))];
      A.patch('/api/admin/questions/' + r.id, { status: t.value }).then(function () { A.toast('Saved', 'ok'); load(); }).catch(A.fail);
    });
    A.on(view, 'click', '[data-view]', function (e, t) {
      var r = rows[Number(t.getAttribute('data-view'))];
      A.modal({ title: 'What the chat answered', size: 'wide', body: html`<p><b>${r.question}</b></p><div style="white-space:pre-wrap;margin-top:10px">${r.answer}</div>${r.books.length ? html`<p class="muted small" style="margin-top:10px">Books searched: ${r.books.join(', ')}</p>` : ''}`, footer: [{ label: 'Close', kind: 'primary' }] });
    });
    A.on(view, 'click', '[data-note]', function (e, t) {
      var r = rows[Number(t.getAttribute('data-note'))];
      A.prompt({ title: 'Note', label: 'What is missing, or what needs to be done?', value: r.note, multiline: true, ok: 'Save' }).then(function (v) {
        if (v !== null) A.patch('/api/admin/questions/' + r.id, { note: v }).then(load).catch(A.fail);
      });
    });
    A.on(view, 'click', '[data-del]', function (e, t) {
      var r = rows[Number(t.getAttribute('data-del'))];
      A.confirm({ title: 'Delete this question?', message: 'It is removed from the list. If someone asks it again it will be listed again.', ok: 'Delete', danger: true }).then(function (yes) { if (yes) A.del('/api/admin/questions/' + r.id).then(load).catch(A.fail); });
    });
    A.on(view, 'click', '[data-delc]', function (e, t) {
      A.del('/api/admin/questions/cache/' + t.getAttribute('data-delc')).then(function () { A.toast('Cached answer deleted', 'ok'); load(); }).catch(A.fail);
    });
    A.on(view, 'click', '#clearCache', function () {
      A.confirm({ title: 'Clear all cached answers?', message: 'Every question is sent to the AI again the next time it is asked (this costs tokens). Use this after fixing the books or changing the answer rules.', ok: 'Clear cache', danger: true })
        .then(function (yes) { if (yes) A.post('/api/admin/questions/cache/clear', {}).then(function (d) { A.toast(d.removed + ' cached answers removed', 'ok'); load(); }).catch(A.fail); });
    });
    return load();
  });
})();
