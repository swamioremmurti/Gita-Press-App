/* Where the big static files live.

   Leave both values empty and everything is served from the site itself, exactly as before.
   After uploading with tools/cdn/upload.mjs, paste the base URLs it prints:

     books  folder holding the book .html files and their image/ folder
            e.g. "https://<store>.public.blob.vercel-storage.com/books/"
     media  folder that mirrors the site's audio/ and video/ folders
            e.g. "https://<store>.public.blob.vercel-storage.com/media/"

   The value must end with "/" (it is added if missing) and the host must send
   "Access-Control-Allow-Origin: *" -- the reader downloads each book with fetch(). */
window.SWADHYAY_CDN = {
  books: "",
  media: ""
};

/* swadhyayMedia("assets/audio/x.mp3") -> the CDN copy when `media` is set, else the site's own file */
window.swadhyayMedia = function (path) {
  var base = (window.SWADHYAY_CDN && window.SWADHYAY_CDN.media) || "";
  if (!base || /^(https?:)?\/\//i.test(path)) return path;
  if (base.slice(-1) !== "/") base += "/";
  return base + String(path).replace(/^\/?(assets\/)?/, "");
};
