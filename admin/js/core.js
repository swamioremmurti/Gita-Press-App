/* Admin panel core: safe HTML templates, API calls, router, layout, dialogs. Every other file registers pages on window.Admin. */
(function () {
  'use strict';
  var A = window.Admin = { pages: {}, user: null, counts: {} };

  /* ------------------------------------------------------------ safe html templates */
  function Safe(s) { this.s = s; }
  Safe.prototype.toString = function () { return this.s; };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function render(v) {
    if (v == null || v === false) return '';
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(render).join('');
    return esc(v);
  }
  /* html`<b>${userText}</b>` escapes every interpolation unless it is itself html`...` (or raw()). */
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += render(arguments[i]) + strings[i];
    return new Safe(out);
  }
  A.html = html; A.esc = esc; A.raw = function (s) { return new Safe(String(s)); }; A.Safe = Safe;
  A.q = function (sel, root) { return (root || document).querySelector(sel); };
  A.qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------ formatting */
  A.fmt = {
    date: function (ms) {
      if (!ms) return '—';
      return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    day: function (ms) { return ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; },
    ago: function (ms) {
      if (!ms) return 'never';
      var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (s < 60) return 'just now';
      var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
      var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
      var d = Math.round(h / 24); if (d < 30) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
      var mo = Math.round(d / 30); if (mo < 12) return mo + ' month' + (mo === 1 ? '' : 's') + ' ago';
      return Math.round(mo / 12) + ' y ago';
    },
    bytes: function (n) {
      n = Number(n) || 0;
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
      return (n / 1048576).toFixed(1) + ' MB';
    },
    num: function (n) { return Number(n || 0).toLocaleString('en-IN'); }
  };
  A.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); }; };
  A.qs = function (obj) {
    var p = new URLSearchParams();
    Object.keys(obj).forEach(function (k) { if (obj[k] !== '' && obj[k] != null && obj[k] !== false) p.set(k, obj[k]); });
    var s = p.toString();
    return s ? '?' + s : '';
  };
  A.bookUrl = function (b) { return b.slug ? '/book/' + encodeURIComponent(b.slug) : '/library'; };
  A.coverSrc = function (path) {
    if (!path) return '';
    return /^(https?:)?\/\//.test(path) || path.charAt(0) === '/' ? path : '/' + path.split('/').map(encodeURIComponent).join('/');
  };
  A.coverEl = function (b) {
    var src = A.coverSrc(b.cover);
    var ini = (b.title || '?').trim().charAt(0) || '?';
    return src ? html`<img class="cover" src="${src}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cover',textContent:this.dataset.i}))" data-i="${ini}">`
      : html`<span class="cover hi">${ini}</span>`;
  };

  /* ------------------------------------------------------------ api */
  function apiCall(method, path, body, opts) {
    var init = { method: method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    return fetch(path, init).then(function (res) {
      if (opts && opts.raw) return res;
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { error: 'The server sent an unexpected reply (HTTP ' + res.status + ')' }; }
        if (res.status === 401 || (res.status === 403 && /admin/i.test(data.error || ''))) { A.showLogin(res.status === 403 ? 'This account is not an admin.' : ''); }
        if (!res.ok) { var err = new Error(data.error || ('Request failed (HTTP ' + res.status + ')')); err.status = res.status; err.data = data; throw err; }
        return data;
      });
    });
  }
  A.get = function (p) { return apiCall('GET', p); };
  A.post = function (p, b) { return apiCall('POST', p, b === undefined ? {} : b); };
  A.put = function (p, b) { return apiCall('PUT', p, b); };
  A.patch = function (p, b) { return apiCall('PATCH', p, b); };
  A.del = function (p, b) { return apiCall('DELETE', p, b); };
  A.fail = function (err) { A.toast(err && err.message ? err.message : String(err), 'bad'); };

  /* ------------------------------------------------------------ toast + dialogs */
  A.toast = function (msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    A.q('#toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, kind === 'bad' ? 6500 : 3200);
  };

  A.modal = function (opts) {
    var layer = A.q('#layer');
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || '') + '">' +
      '<div class="modal-h"><h2>' + esc(opts.title || '') + '</h2><button class="icon-btn" type="button" data-x aria-label="Close">×</button></div>' +
      '<div class="modal-b"></div>' + (opts.footer && opts.footer.length ? '<div class="modal-f"></div>' : '') + '</div>';
    layer.appendChild(ov);
    var body = A.q('.modal-b', ov);
    var ctl = { el: ov, body: body, closed: false };
    ctl.setBody = function (b) { if (b instanceof Node) { body.innerHTML = ''; body.appendChild(b); } else body.innerHTML = render(b); };
    ctl.close = function (result) {
      if (ctl.closed) return;
      ctl.closed = true; ov.remove(); document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose(result);
    };
    function onKey(e) {
      if (e.key === 'Escape' && layer.lastElementChild === ov) { e.stopPropagation(); if (!opts.sticky) ctl.close(); }
    }
    document.addEventListener('keydown', onKey, true);
    ctl.setBody(opts.body || '');
    A.q('[data-x]', ov).onclick = function () { ctl.close(); };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !opts.sticky) ctl.close(); });
    var foot = A.q('.modal-f', ov);
    (opts.footer || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ' + (b.kind || '');
      btn.textContent = b.label;
      btn.onclick = function () {
        var r = b.onClick ? b.onClick(ctl, btn) : undefined;
        if (r && typeof r.then === 'function') {
          btn.disabled = true;
          r.then(function (v) { btn.disabled = false; if (v !== false) ctl.close(true); }, function (e) { btn.disabled = false; A.fail(e); });
        } else if (r !== false) ctl.close(b.result === undefined ? true : b.result);
      };
      foot.appendChild(btn);
      if (b.focus) setTimeout(function () { btn.focus(); }, 30);
    });
    var first = A.q('input:not([type=hidden]), textarea, select', body);
    if (first && opts.autofocus !== false) setTimeout(function () { first.focus(); }, 30);
    return ctl;
  };

  A.confirm = function (o) {
    return new Promise(function (resolve) {
      var done = false;
      A.modal({
        title: o.title || 'Are you sure?', size: 'narrow', body: html`<p>${o.message || ''}</p>${o.detail ? html`<p class="muted small" style="margin-top:8px">${o.detail}</p>` : ''}`,
        footer: [
          { label: o.cancel || 'Cancel', kind: '', result: false, onClick: function () { done = true; resolve(false); } },
          { label: o.ok || 'Confirm', kind: o.danger ? 'danger solid' : 'primary', focus: true, onClick: function () { done = true; resolve(true); } }
        ],
        onClose: function () { if (!done) resolve(false); }
      });
    });
  };

  A.prompt = function (o) {
    return new Promise(function (resolve) {
      var done = false;
      var ctl = A.modal({
        title: o.title, size: 'narrow',
        body: html`<div class="field"><label>${o.label || ''}</label>${o.multiline ? html`<textarea id="pv" rows="4">${o.value || ''}</textarea>` : html`<input type="text" id="pv" value="${o.value || ''}" placeholder="${o.placeholder || ''}">`}${o.hint ? html`<span class="hint">${o.hint}</span>` : ''}</div>`,
        footer: [
          { label: 'Cancel', result: false, onClick: function () { done = true; resolve(null); } },
          { label: o.ok || 'OK', kind: 'primary', onClick: function (c) { done = true; resolve(A.q('#pv', c.body).value); } }
        ],
        onClose: function () { if (!done) resolve(null); }
      });
      var inp = A.q('#pv', ctl.body);
      if (inp && !o.multiline) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { done = true; resolve(inp.value); ctl.close(); } });
    });
  };

  /* ------------------------------------------------------------ delegation + small components */
  A.on = function (root, type, selector, fn) {
    root.addEventListener(type, function (e) {
      var t = e.target.closest ? e.target.closest(selector) : null;
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  };
  A.pager = function (p) {
    var pages = Math.max(1, Math.ceil(p.total / p.size));
    if (p.total <= p.size) return html`<div class="pager"><span>${A.fmt.num(p.total)} ${p.noun || 'items'}</span></div>`;
    var from = (p.page - 1) * p.size + 1, to = Math.min(p.total, p.page * p.size);
    return html`<div class="pager"><span>${from}–${to} of ${A.fmt.num(p.total)} ${p.noun || 'items'}</span>
      <span class="row" style="gap:6px"><button class="btn sm" data-page="${p.page - 1}" ${p.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <span>Page ${p.page} / ${pages}</span>
      <button class="btn sm" data-page="${p.page + 1}" ${p.page >= pages ? 'disabled' : ''}>Next ›</button></span></div>`;
  };
  A.switchEl = function (checked, attrs) {
    return html`<label class="switch" ${A.raw(attrs || '')}><input type="checkbox" ${checked ? 'checked' : ''}><i></i></label>`;
  };
  A.empty = function (title, text) { return html`<div class="empty"><b>${title}</b>${text || ''}</div>`; };
  A.loading = function (text) { return html`<div class="loading"><span class="spinner"></span><div style="margin-top:10px">${text || 'Loading…'}</div></div>`; };
  A.copy = function (text) {
    var done = function () { A.toast('Copied', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { A.toast('Could not copy', 'bad'); });
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { A.toast('Could not copy', 'bad'); } t.remove(); }
  };
  A.readFile = function (file, as) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read the file')); };
      if (as === 'text') r.readAsText(file); else r.readAsDataURL(file);
    });
  };

  /* ------------------------------------------------------------ layout + router */
  var NAV = [
    ['Overview'],
    ['/', '▦', 'Dashboard'],
    ['Library'],
    ['/books', '📚', 'Books'],
    ['/categories', '🗂', 'Categories & tags'],
    ['/audio', '🎵', 'Audio library'],
    ['/media', '🖼', 'Media'],
    ['Learning'],
    ['/lms', '🎓', 'Gita course'],
    ['Community'],
    ['/users', '👥', 'Users'],
    ['/comments', '💬', 'Comments', 'comments'],
    ['System'],
    ['/css', '🎨', 'CSS editor'],
    ['/settings', '⚙', 'Site settings'],
    ['/log', '🕘', 'Activity log']
  ];
  var routes = [];
  A.route = function (path, fn, opts) { routes.push({ path: path, fn: fn, opts: opts || {} }); };

  function renderNav(active) {
    A.q('#nav').innerHTML = NAV.map(function (n) {
      if (n.length === 1) return '<div class="nav-group">' + esc(n[0]) + '</div>';
      var on = n[0] === '/' ? active === '/' : (active === n[0] || active.indexOf(n[0] + '/') === 0);
      var count = n[3] && A.counts[n[3]] ? '<span class="count">' + A.counts[n[3]] + '</span>' : '';
      return '<a class="nav-link' + (on ? ' active' : '') + '" href="#' + n[0] + '"><span class="ic">' + n[1] + '</span><span>' + esc(n[2]) + '</span>' + count + '</a>';
    }).join('');
  }

  A.setPage = function (title, sub, actions) {
    A.q('#pageTitle').textContent = title;
    A.q('#pageSub').textContent = sub || '';
    A.q('#pageActions').innerHTML = render(actions || '');
    document.title = title + ' · Kalyan Admin';
  };
  /* A fresh #view element per page, so listeners from the previous page cannot fire on the new one. */
  A.freshView = function (full) {
    var old = A.q('#view');
    var v = old.cloneNode(false);
    v.className = 'view' + (full ? ' full' : '');
    v.innerHTML = '';
    old.parentNode.replaceChild(v, old);
    return v;
  };

  A.parseHash = function () {
    var h = location.hash.replace(/^#/, '') || '/';
    var i = h.indexOf('?');
    return { path: (i < 0 ? h : h.slice(0, i)).replace(/\/+$/, '') || '/', query: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) };
  };
  A.go = function (hash) { if (location.hash === hash) dispatch(); else location.hash = hash; };
  A.guard = null;     // set by a page with unsaved work: returns true when leaving is fine
  var lastHash = null, dispatching = false;

  function dispatch() {
    if (!A.user) return;
    if (A.guard && lastHash !== null && lastHash !== location.hash && !A.guard()) {
      dispatching = true; location.hash = lastHash; dispatching = false; return;
    }
    A.guard = null; A.onLeave && A.onLeave(); A.onLeave = null;
    lastHash = location.hash;
    var loc = A.parseHash();
    var route = routes.find(function (r) { return r.path === loc.path; });
    document.body.classList.remove('menu-open');
    if (!route) { A.setPage('Page not found', ''); A.freshView().innerHTML = render(A.empty('There is nothing here', html`<p><a href="#/">Back to the dashboard</a></p>`)); renderNav(''); return; }
    renderNav(loc.path);
    A.setPage('Loading…', '');
    var view = A.freshView(route.opts.full);
    view.innerHTML = render(A.loading());
    window.scrollTo(0, 0);
    Promise.resolve().then(function () { return route.fn(loc.query, view, loc); }).catch(function (err) {
      if (err && err.status === 401) return;
      view.innerHTML = render(html`<div class="notice bad">${err && err.message ? err.message : 'Something went wrong.'}</div>`);
    });
  }
  A.refresh = dispatch;

  /* ------------------------------------------------------------ login + boot */
  A.showLogin = function (message) {
    A.user = null;
    document.body.classList.remove('menu-open');
    A.q('#app').hidden = true;
    var layer = A.q('#layer');
    layer.innerHTML = render(html`<div class="login-wrap"><form class="card login-card" id="loginForm">
      <div class="brand-mark">ॐ</div><h1 style="font-size:21px">Kalyan admin</h1>
      <p class="muted" style="margin:4px 0 18px">Sign in with an administrator account.</p>
      ${message ? html`<div class="notice bad" style="margin-bottom:12px">${message}</div>` : ''}
      <div class="field"><label for="le">Email</label><input type="text" id="le" autocomplete="username" required></div>
      <div class="field"><label for="lp">Password</label><input type="password" id="lp" autocomplete="current-password" required></div>
      <div class="notice bad" id="lerr" hidden style="margin-bottom:12px"></div>
      <button class="btn primary" style="width:100%" type="submit">Sign in</button>
      <p class="hint" style="margin-top:14px"><a href="/">← Back to the site</a></p>
    </form></div>`);
    var form = A.q('#loginForm');
    A.q('#le').focus();
    form.onsubmit = function (e) {
      e.preventDefault();
      var btn = A.q('button', form); btn.disabled = true;
      fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: A.q('#le').value, password: A.q('#lp').value }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (r) {
          btn.disabled = false;
          if (!r.ok) { var el = A.q('#lerr'); el.hidden = false; el.textContent = r.d.error || 'Sign in failed'; return; }
          if (r.d.user.role !== 'admin') { var e2 = A.q('#lerr'); e2.hidden = false; e2.textContent = 'This account is not an administrator.'; fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); return; }
          layer.innerHTML = ''; A.enter(r.d.user);
        }).catch(function () { btn.disabled = false; var el = A.q('#lerr'); el.hidden = false; el.textContent = 'Could not reach the server.'; });
    };
  };

  A.enter = function (user) {
    A.user = user;
    A.q('#layer').innerHTML = '';
    A.q('#app').hidden = false;
    A.q('#whoami').innerHTML = '<b>' + esc(user.name) + '</b>' + esc(user.email) +
      ' · <a href="#" id="signOut">Sign out</a>';
    A.q('#signOut').onclick = function (e) {
      e.preventDefault();
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).then(function () { A.showLogin(''); });
    };
    A.get('/api/admin/comments?status=hidden&size=5').then(function (d) { A.counts.comments = d.total || 0; renderNav(A.parseHash().path); }).catch(function () {});
    dispatch();
  };

  A.start = function () {
    var theme = null;
    try { theme = localStorage.getItem('kalyan_admin_theme'); } catch (e) {}
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    A.q('#themeBtn').onclick = function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('kalyan_admin_theme', next); } catch (e) {}
    };
    A.q('#menuBtn').onclick = function () { document.body.classList.toggle('menu-open'); };
    A.q('#scrim').onclick = function () { document.body.classList.remove('menu-open'); };
    /* A hashchange to the address already on screen is the echo of "stay on this page" (the unsaved-changes prompt put the
       address back): re-rendering then would throw the unsaved work away. */
    window.addEventListener('hashchange', function () { if (!dispatching && location.hash !== lastHash) dispatch(); });
    window.addEventListener('beforeunload', function (e) { if (A.guard && !A.guard(true)) { e.preventDefault(); e.returnValue = ''; } });
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.user) A.showLogin('');
      else if (d.user.role !== 'admin') A.showLogin('You are signed in as ' + d.user.email + ', which is not an administrator account.');
      else A.enter(d.user);
    }).catch(function () { A.showLogin('Could not reach the server.'); });
  };
})();
