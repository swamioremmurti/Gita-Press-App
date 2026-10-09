/* Audio catalogue for the home-page audio panel and the /audio page.

   To add a track, append an object to SWADHYAY_AUDIO_RAW:
     id        unique, URL-safe (used for favourites and resume position -- never reuse or rename)
     title     shown in the list and the player
     artist    speaker / singer / reader (optional)
     category  one of the keys below: bhajan | satsang | pravachan | katha | audiobook
     src       path or full URL of the audio file (mp3/m4a/ogg). Relative paths are served by the site.
     duration  length in seconds (optional -- the real length is read from the file once it loads)
     desc      one-line description (optional)
   Large files are better hosted outside the repo (any URL that serves audio with CORS-free
   range requests works); only the "src" changes. */

var SWADHYAY_AUDIO_CATEGORIES = [
  { key: "bhajan",    hi: "भजन",       en: "Bhajan",      icon: "🪔", g: ["#d9822b", "#8a1f0f"] },
  { key: "satsang",   hi: "सत्संग",    en: "Satsang",     icon: "🙏", g: ["#2b7ccf", "#17407a"] },
  { key: "pravachan", hi: "प्रवचन",    en: "Pravachan",   icon: "🎙️", g: ["#8a52c4", "#3f1d6b"] },
  { key: "katha",     hi: "कथा",       en: "Katha",       icon: "📖", g: ["#3b9a62", "#15502f"] },
  { key: "audiobook", hi: "ऑडियो बुक", en: "Audio Books", icon: "🎧", g: ["#c9a227", "#7a5a00"] }
];

var SWADHYAY_AUDIO_RAW = [
  { id: "bhajan-ek-tattva-do-tanu", title: "एक तत्त्व दो तनु", artist: "स्वाध्याय संग्रह", category: "bhajan",
    src: "assets/audio/ek-tattva-do-tanu.mp3", duration: 160 },
  { id: "bhajan-palane-rang-khelat", title: "पालनैं रँग खेलत", artist: "स्वाध्याय संग्रह", category: "bhajan",
    src: "assets/audio/palane-rang-khelat.mp3", duration: 167 },
  { id: "bhajan-radha-charan-suchi-sukhkand", title: "राधा चरन सुचि सुखकंद", artist: "स्वाध्याय संग्रह", category: "bhajan",
    src: "assets/audio/radha-charan-suchi-sukhkand.mp3", duration: 160 }
];
