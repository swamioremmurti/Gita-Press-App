/* Push notifications: write a message and send it to everyone who has the Android app (Firebase Cloud Messaging).
   Phones are subscribed to the topic "all" by the app; debug builds also join "test", so a message can be tried on a few
   phones first. "Check only" asks Google to validate the message without delivering it to anyone. */
(function () {
  'use strict';
  var A = window.Admin, html = A.html;

  var LINKS = [['', 'Just open the app'], ['/', 'Home'], ['/library', 'Library'], ['/gita', 'Gita course'], ['/audio', 'Audio'], ['/panchang', 'Panchang'], ['__other', 'Another page…']];
  var STATUS = { sent: ['Sent', 'ok'], checked: ['Checked only', 'info'], failed: ['Failed', 'bad'] };

  A.route('/push', function (q, view) {
    A.setPage('Push notifications', 'Send a message to everyone who has the Android app');
    return A.get('/api/admin/push').then(function (st) {
      var L = st.limits, aud = st.audiences;
      var setup = st.configured
        ? html`<p><span class="badge ok">Connected</span></p>
            <p class="small muted" style="margin-top:8px">Firebase project <b>${st.projectId}</b><br>Sending as <b>${st.serviceAccount}</b></p>`
        : html`<p><span class="badge warn">Not set up yet</span></p>
            <p class="small muted" style="margin:8px 0">${st.problem}.</p>
            <ol class="small" style="padding-left:18px;line-height:1.6">
              <li>Open the <b>Firebase console</b> &gt; Project settings &gt; <b>Service accounts</b> and press <b>Generate new private key</b>.</li>
              <li>Open the downloaded file in a text editor and copy <b>all</b> of its text.</li>
              <li>Add it as an environment variable named <code>FIREBASE_SERVICE_ACCOUNT</code> (Vercel &gt; Settings &gt; Environment Variables; on a local server in <code>server/.env</code>).</li>
              <li>Redeploy (or restart the server), then reload this page.</li>
            </ol>
            <p class="small muted" style="margin-top:8px">Keep that file private: anyone who has it can send messages as you. Do not put it in the code or share it.</p>`;
      var rows = st.history.length
        ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>When</th><th>To</th><th>Message</th><th>Result</th></tr></thead><tbody>
            ${st.history.map(function (h) {
              var s = STATUS[h.status] || [h.status, ''];
              return html`<tr><td class="nowrap" title="${A.fmt.date(h.at)}">${A.fmt.ago(h.at)}<div class="small muted">${h.by || ''}</div></td>
                <td class="nowrap">${aud[h.audience] || h.audience}</td>
                <td><b>${h.title}</b><div class="small muted">${h.body}</div>${h.url ? html`<div class="small muted">→ ${h.url}</div>` : ''}</td>
                <td><span class="badge ${s[1]}">${s[0]}</span>${h.status === 'failed' ? html`<div class="small muted">${h.detail}</div>` : ''}</td></tr>`;
            })}</tbody></table></div>`
        : A.empty('Nothing sent yet', 'Messages you send are listed here.');

      view.innerHTML = html`<div class="cols">
        <div class="stack">
          <div class="card"><div class="card-h"><h2>New message</h2></div><div class="card-b">
            <div class="field"><label for="paud">Send to</label>
              <select id="paud" style="width:100%">${Object.keys(aud).map(function (k) { return html`<option value="${k}">${aud[k]}${k === 'test' ? ' (phones with the test build)' : ''}</option>`; })}</select></div>
            <div class="field"><label for="ptitle">Title <span class="muted small" id="ptc"></span></label>
              <input type="text" id="ptitle" maxlength="${L.title}" class="hi" placeholder="e.g. आज का पंचांग"></div>
            <div class="field"><label for="pbody">Message <span class="muted small" id="pbc"></span></label>
              <textarea id="pbody" rows="3" maxlength="${L.body}" class="hi" placeholder="One or two short lines"></textarea></div>
            <div class="grid2"><div class="field"><label for="plink">When tapped, open</label>
                <select id="plink" style="width:100%">${LINKS.map(function (l) { return html`<option value="${l[0]}">${l[1]}</option>`; })}</select></div>
              <div class="field" id="pother" hidden><label for="pcustom">Page of this site</label><input type="text" id="pcustom" maxlength="${L.url}" placeholder="/read/bhakti-rahasy/17"></div></div>
            <div class="row" style="margin:6px 0 14px"><label class="switch"><input type="checkbox" id="pcheck"><i></i></label><span><b>Check only</b> <span class="small muted">&ndash; Google validates the message, nobody receives it</span></span></div>
            <button class="btn primary" id="psend" type="button" ${st.configured ? '' : 'disabled'}>Send message</button>
            ${st.configured ? '' : html`<span class="small muted" style="margin-left:10px">Finish the set-up first</span>`}
          </div></div>
          <div class="card"><div class="card-h"><h2>Recently sent</h2></div><div class="card-b">${rows}</div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h2>Preview</h2></div><div class="card-b">
            <div id="pprev" style="border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--surface-2)"></div>
            <p class="small muted" style="margin-top:8px">How it looks in the phone's notification shade. Long text is cut off in the collapsed view and shown in full when the notification is opened.</p>
          </div></div>
          <div class="card"><div class="card-h"><h2>Connection</h2></div><div class="card-b">${setup}</div></div>
        </div></div>`.s;

      function val(id) { return A.q('#' + id, view).value; }
      function link() { var l = val('plink'); return l === '__other' ? val('pcustom').trim() : l; }
      function counters() {
        A.q('#ptc', view).textContent = val('ptitle').length + '/' + L.title;
        A.q('#pbc', view).textContent = val('pbody').length + '/' + L.body;
      }
      function preview() {
        var t = val('ptitle').trim(), b = val('pbody').trim();
        A.q('#pprev', view).innerHTML = html`<div style="display:flex;gap:10px;align-items:flex-start">
          <span style="width:22px;height:22px;border-radius:50%;background:#a51512;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:0 0 auto">🔔</span>
          <div style="min-width:0"><div class="small muted">Kalyan Seva · now</div>
            <div style="font-weight:600;margin-top:2px">${t || 'Title'}</div>
            <div class="small" style="margin-top:2px;white-space:pre-wrap;color:var(--muted)">${b || 'Your message appears here'}</div></div></div>`.s;
        counters();
      }
      ['ptitle', 'pbody'].forEach(function (id) { A.q('#' + id, view).oninput = preview; });
      A.q('#plink', view).onchange = function () { A.q('#pother', view).hidden = val('plink') !== '__other'; };
      preview();

      A.q('#psend', view).onclick = function () {
        var payload = { audience: val('paud'), title: val('ptitle').trim(), body: val('pbody').trim(), url: link(), validateOnly: A.q('#pcheck', view).checked };
        if (!payload.title || !payload.body) { A.toast('Write a title and a message first', 'bad'); return; }
        var who = aud[payload.audience] || payload.audience;
        var ask = payload.validateOnly
          ? A.confirm({ title: 'Check this message?', message: 'Google will validate it. Nobody will receive it.', ok: 'Check' })
          : A.confirm({ title: 'Send to ' + who.toLowerCase() + '?', message: '“' + payload.title + '” will appear on ' + (payload.audience === 'all' ? 'every phone that has the app' : 'the test phones') + ' within moments. A sent message cannot be recalled.', ok: 'Send now' });
        ask.then(function (yes) {
          if (!yes) return;
          var btn = A.q('#psend', view); btn.disabled = true; btn.textContent = 'Sending…';
          A.post('/api/admin/push/send', payload).then(function (r) {
            A.toast(r.checked ? 'Checked: Google accepts this message.' : 'Sent to ' + who.toLowerCase() + '.', 'ok');
            if (!r.checked) { A.q('#ptitle', view).value = ''; A.q('#pbody', view).value = ''; }
            return A.get('/api/admin/push');
          }).then(function () { location.hash = '#/push?t=' + Date.now(); }).catch(function (e) { A.fail(e); btn.disabled = false; btn.textContent = 'Send message'; });
        });
      };
    });
  });
})();
