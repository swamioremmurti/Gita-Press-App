/* AI usage: how many tokens the site's AI chat has consumed (answers + embedding each question). */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;
  var KIND = { chat: 'Chat answers', embedding: 'Question search (embeddings)' };

  var rate = 88;
  function money(usd) { var r = usd * rate; return '₹' + (r < 0.1 ? r.toFixed(3) : r.toFixed(2)); }

  function stat(label, t, sub) {
    return html`<div class="stat"><div class="n">${A.fmt.num(t.total)}</div><div class="l">${label} · ≈ ${money(t.usd)}</div><div class="s">${sub}</div></div>`;
  }

  A.route('/usage', function (q, view) {
    A.setPage('AI usage', 'Tokens consumed by the Q&A chat. Counted from the AI provider’s own usage figures; days are in India time.');
    return A.get('/api/admin/usage').then(function (d) {
      var t = d.totals;
      rate = d.usdInr || rate;
      var sub = function (x) { return A.fmt.num(x.calls) + ' calls · ' + A.fmt.num(x.input) + ' in / ' + A.fmt.num(x.output) + ' out'; };
      var monthTotal = d.daily.reduce(function (s, x) { return s + x.n; }, 0);
      view.innerHTML = t.all.calls ? html`
        <div class="stats">${stat('Today', t.today, sub(t.today))}${stat('Last 7 days', t.week, sub(t.week))}${stat('Last 30 days', t.month, sub(t.month))}${stat('All time', t.all, sub(t.all))}</div>
        <div class="cols">
          <div class="stack">
            <div class="card"><div class="card-h"><h2>Tokens per day, last 30 days</h2><span class="right muted small">${A.fmt.num(monthTotal)} total</span></div><div class="card-b">${A.barChart(d.daily, 'Tokens per day, last 30 days')}</div></div>
            <div class="card"><div class="card-h"><h2>Latest calls</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>When</th><th>What</th><th>Model</th><th class="num">In</th><th class="num">Out</th><th class="num">Cost</th></tr></thead><tbody>
              ${d.recent.map(function (r) {
                return html`<tr><td class="nowrap" title="${A.fmt.date(r.at)}">${A.fmt.ago(r.at)}</td><td>${KIND[r.kind] || r.kind}</td><td class="muted">${r.model}</td><td class="num">${A.fmt.num(r.input)}</td><td class="num">${A.fmt.num(r.output)}</td><td class="num nowrap">${money(r.usd)}</td></tr>`;
              })}</tbody></table></div></div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-h"><h2>By model</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>What</th><th>Model</th><th class="num">Calls</th><th class="num">Tokens</th><th class="num">Cost</th></tr></thead><tbody>
              ${d.byModel.map(function (r) {
                return html`<tr><td>${KIND[r.kind] || r.kind}</td><td class="muted">${r.model}</td><td class="num">${A.fmt.num(r.calls)}</td><td class="num">${A.fmt.num(r.total)}</td><td class="num nowrap">${money(r.usd)}</td></tr>`;
              })}</tbody></table></div></div>
            <div class="card"><div class="card-b"><p class="small muted">Costs are estimates: tokens multiplied by the Vercel AI Gateway’s per-token price for each model, plus 30% (×1.3) to cover other costs, shown in rupees at ₹${rate} per dollar (change it with USD_INR in the server settings). Only calls made by the site are counted, from the day this page was added. The one-off embedding of the books and any other use of your AI Gateway key appear in the Vercel dashboard under AI Gateway.</p></div></div>
          </div>
        </div>`.s
        : A.empty('No AI calls recorded yet', 'Ask a question on the Q&A page; each answer’s token use is recorded here.').s;
    });
  });
})();
