// The "coming soon" page shown to everyone who has not entered the access password yet.
// Self-contained (inline CSS/JS); it only loads files under /assets/gate/, /fonts/ and the logo,
// which server/lib/gate.js lets through. No password or secret is in here.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/><circle cx="12" cy="15.2" r="1.1" class="f"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5 2-1.5 5-1.9 8.5-1.5V5C17 4.6 14 5 12 6.5Z"/><path d="M12 6.5v13"/></svg>',
  audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.6"/><rect x="16.5" y="14" width="4" height="6" rx="1.6"/></svg>',
  ask: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.7a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.8-1.1 1.6"/><circle cx="12" cy="16.6" r=".9" class="f"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2.2"/><path d="M4 10h16M8.5 3.8v3.4M15.5 3.8v3.4"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 16.5h.01M12 16.5h.01" stroke-linecap="round" stroke-width="2"/></svg>',
  sadhak: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.2" r="2.4"/><path d="M12 9.5v4.2M7.5 13.7c1.5 1.2 3 1.7 4.5 1.7s3-.5 4.5-1.7M4 19c2.2-1.7 5-2.5 8-2.5s5.8.8 8 2.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19.8S4 15 4 9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 8 1.4c0 5.6-8 10.4-8 10.4Z"/></svg>'
};

const FEATURES = [
  ['book', 'हजारों ग्रंथ', 'आध्यात्मिक ग्रंथ'],
  ['audio', 'श्रवण', 'पाठ और ऑडियो'],
  ['ask', 'प्रश्न', 'आपके जिज्ञासाओं के उत्तर'],
  ['cal', 'आज का पंचांग', 'तिथि, मुहूर्त, पर्व'],
  ['sadhak', 'अध्ययन', 'दैनिक साधना मार्गदर्शन'],
  ['heart', 'आपका साथ', 'हर आयु, हर साधक के लिए']
];

module.exports = function gatePage({ error, next } = {}) {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>कल्याण | Kalyan — जल्द ही आपके लिए</title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<style>
@font-face { font-family: 'Tiro Devanagari Sanskrit'; src: url('/fonts/TiroDevanagariSanskrit-Regular.woff2') format('woff2'); font-display: swap; }
:root { --maroon: #8a1a14; --deep: #5a1810; --gold: #d9a441; --cream: #fbf3e4; --ink: #4a3326; }
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', system-ui, sans-serif; color: var(--ink);
  background: #f2c98c url('/assets/gate/bg.webp') center top / cover no-repeat fixed;
  display: flex; flex-direction: column; min-height: 100vh;
}
.hero { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3.2rem 1.2rem 2.2rem; }
.logo {
  width: min(300px, 62vw); aspect-ratio: 356.16 / 142.38; background: var(--maroon);
  -webkit-mask: url('/assets/logo-mark.svg') no-repeat center / contain; mask: url('/assets/logo-mark.svg') no-repeat center / contain;
}
.tagline { margin: .8rem 0 0; font-family: 'Tiro Devanagari Sanskrit', serif; color: var(--maroon); font-size: clamp(1.1rem, 2.4vw, 1.55rem); letter-spacing: .01em; }
.orn { display: flex; align-items: center; gap: .6rem; margin: .7rem 0 1rem; color: var(--gold); }
.orn::before, .orn::after { content: ""; width: 74px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold)); }
.orn::after { transform: scaleX(-1); }
.orn i { width: 7px; height: 7px; transform: rotate(45deg); background: var(--gold); }
h1 { margin: 0; font-family: 'Tiro Devanagari Sanskrit', serif; font-weight: 700; color: var(--deep); font-size: clamp(2.1rem, 5.2vw, 3.5rem); line-height: 1.2; text-shadow: 0 2px 14px rgba(255, 236, 200, .85); }
.lead { max-width: 40rem; margin: .9rem 0 1.8rem; font-size: clamp(.95rem, 1.7vw, 1.12rem); line-height: 1.75; color: #3d2a1e; text-shadow: 0 1px 10px rgba(255, 240, 210, .9); }
.card {
  width: min(520px, 100%); text-align: left; background: rgba(255, 250, 240, .93); border: 1.5px solid #ecc98a; border-radius: 26px;
  padding: 1.5rem 1.6rem 1.7rem; box-shadow: 0 18px 50px rgba(120, 50, 10, .22);
}
.card-top { display: flex; gap: 1.1rem; align-items: center; margin-bottom: 1.2rem; }
.lockc { flex: none; width: 74px; height: 74px; border-radius: 50%; background: #f7e4c2; display: grid; place-items: center; color: var(--maroon); }
.lockc svg { width: 34px; height: 34px; }
svg { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
svg .f { fill: currentColor; stroke: none; }
.card h2 { margin: 0 0 .25rem; font-family: 'Tiro Devanagari Sanskrit', serif; font-size: 1.55rem; color: var(--maroon); }
.card p { margin: 0; font-size: .95rem; line-height: 1.6; color: #5b463a; }
.field { position: relative; display: flex; align-items: center; background: #fff; border: 1.5px solid #e6d5bd; border-radius: 12px; }
.field:focus-within { border-color: var(--maroon); box-shadow: 0 0 0 3px rgba(165, 21, 18, .14); }
.field > svg { width: 20px; height: 20px; margin-left: .95rem; color: #8b7a6a; flex: none; }
.field input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit; font-size: 1rem; padding: .95rem .8rem; color: var(--ink); outline: none; }
.field button { border: 0; background: none; cursor: pointer; padding: .6rem .9rem; color: #8b7a6a; display: grid; place-items: center; }
.field button svg { width: 21px; height: 21px; }
.err { margin: .7rem 0 0; color: #b3261e; font-size: .92rem; font-weight: 600; }
.go {
  margin-top: .95rem; width: 100%; border: 0; cursor: pointer; font: inherit; font-weight: 700; font-size: 1.05rem; letter-spacing: .02em; color: #fff;
  padding: .95rem 1rem; border-radius: 12px; background: linear-gradient(180deg, #a01c15, #7c140f); box-shadow: 0 8px 18px rgba(124, 20, 15, .32);
}
.go:hover { filter: brightness(1.08); }
.go:disabled { opacity: .7; cursor: default; }
.strip { background: var(--cream); border-top: 1px solid #ecd9b5; padding: 1.4rem 1rem 1.6rem; }
.strip ul { list-style: none; margin: 0 auto; padding: 0; max-width: 1180px; display: grid; grid-template-columns: repeat(6, 1fr); }
.strip li { text-align: center; padding: .2rem .8rem; border-left: 1px solid #e4d3b6; }
.strip li:first-child { border-left: 0; }
.strip .ic { width: 54px; height: 54px; margin: 0 auto .55rem; border-radius: 50%; background: #f7e7ca; color: var(--maroon); display: grid; place-items: center; }
.strip .ic svg { width: 26px; height: 26px; }
.strip b { display: block; color: var(--maroon); font-size: 1rem; }
.strip small { display: block; margin-top: .15rem; color: #6c5a4c; font-size: .86rem; line-height: 1.45; }
@media (max-width: 900px) {
  body { background-image: url('/assets/gate/bg-m.webp'); background-attachment: scroll; }
  .strip ul { grid-template-columns: repeat(3, 1fr); row-gap: 1.3rem; }
  .strip li:nth-child(3n+1) { border-left: 0; }
}
@media (max-width: 700px) { .lead br { display: none; } }
@media (max-width: 520px) {
  .hero { padding-top: 2.2rem; }
  .card { padding: 1.2rem 1.1rem 1.4rem; }
  .lockc { width: 58px; height: 58px; } .lockc svg { width: 28px; height: 28px; }
  .card h2 { font-size: 1.3rem; }
  .strip ul { grid-template-columns: repeat(2, 1fr); }
  .strip li:nth-child(3n+1) { border-left: 1px solid #e4d3b6; } .strip li:nth-child(2n+1) { border-left: 0; }
}
</style>
</head>
<body>
<main class="hero">
  <div class="logo" role="img" aria-label="कल्याण सेवा ट्रस्ट"></div>
  <p class="tagline">सनातन ज्ञान, सदैव आपके साथ</p>
  <div class="orn" aria-hidden="true"><i></i></div>
  <h1>जल्द ही आपके लिए</h1>
  <p class="lead">भारत की अमूल्य आध्यात्मिक ग्रंथ-संपदा को आधुनिक रूप में<br>अध्ययन, मनन और जीवन में उपयोग के लिए एक समर्पित डिजिटल पुस्तकालय।</p>
  <form class="card" method="post" action="/__gate" autocomplete="off">
    <div class="card-top">
      <span class="lockc">${ICON.lock}</span>
      <div><h2>सीमित प्रवेश</h2><p>यह वेबसाइट अभी विकासाधीन है।<br>कृपया प्रवेश के लिए पासवर्ड दर्ज करें।</p></div>
    </div>
    <input type="hidden" name="next" value="${esc(next || '/')}">
    <label class="field">${ICON.lock}<input type="password" name="password" id="pw" placeholder="पासवर्ड दर्ज करें…" required autofocus aria-label="पासवर्ड"><button type="button" id="eye" aria-label="पासवर्ड दिखाएँ">${ICON.eye}</button></label>
    ${error ? '<p class="err" role="alert">' + esc(error) + '</p>' : ''}
    <button class="go" type="submit">प्रवेश करें &nbsp;›</button>
  </form>
</main>
<section class="strip" aria-label="कल्याण में">
  <ul>${FEATURES.map((f) => '<li><span class="ic">' + ICON[f[0]] + '</span><b>' + f[1] + '</b><small>' + f[2] + '</small></li>').join('')}</ul>
</section>
<script>
(function () {
  var pw = document.getElementById('pw'), eye = document.getElementById('eye'), form = document.querySelector('form');
  eye.addEventListener('click', function () { pw.type = pw.type === 'password' ? 'text' : 'password'; pw.focus(); });
  form.addEventListener('submit', function () { form.querySelector('.go').disabled = true; });
})();
</script>
</body>
</html>`;
};
