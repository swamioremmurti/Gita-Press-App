#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
converter_server.py -- a tiny local web UI around book_converter.py, so you
don't have to remember CLI flags to import a book or set its cover.

Usage:
    python converter_server.py [--port 8787]

Then open http://localhost:8787 in a browser. The book/html source path on
the "Convert" tab is still read directly off disk by this server (same as
typing it on the CLI). The cover image on the "Cover" tab, however, is a
real browser file picker: the chosen file is read client-side as a blob and
POSTed to the server as base64, which decodes it to a temp file before
handing it to the same cmd_set_cover() the CLI uses -- no server-path typing
needed for covers.

This is a thin wrapper: all the real conversion logic stays in
book_converter.py (single source of truth). The server just builds the same
argument objects the CLI builds from form data, calls the same cmd_convert /
cmd_set_cover / list_docx_styles functions, and streams back whatever they
would have printed to the terminal.
"""
import base64
import contextlib
import io
import json
import shutil
import sys
import tempfile
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, str(Path(__file__).resolve().parent))
import book_converter as bc  # noqa: E402

UI_HTML = Path(__file__).resolve().parent / "converter_ui.html"


def run_captured(fn, args):
    """Call a book_converter cmd_* function, capturing its stdout and turning
    sys.exit(...) / exceptions into an error result instead of killing the
    server process."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            fn(args)
        return True, buf.getvalue(), None
    except SystemExit as e:
        return False, buf.getvalue(), (str(e.code) if e.code else "failed")
    except Exception as e:  # noqa: BLE001 -- surface anything to the UI rather than 500
        return False, buf.getvalue(), f"{type(e).__name__}: {e}"


def build_convert_args(d: dict) -> SimpleNamespace:
    return SimpleNamespace(
        source=Path(d["source"]),
        title=(d.get("title") or "").strip() or None,
        author=(d.get("author") or "").strip() or None,
        category=(d.get("category") or "").strip() or None,
        translator=d.get("translator", "") or "",
        subtitle=d.get("subtitle", "") or "",
        publisher=d.get("publisher") or "gitapress",
        out_dir=Path(d.get("out_dir") or bc.BOOKS_DIR),
        out_name=(d.get("out_name") or "").strip() or None,
        data_js=Path(d.get("data_js") or bc.DATA_JS),
        app_js=Path(d.get("app_js") or bc.APP_JS),
        no_register=bool(d.get("no_register", False)),
        dry_run=bool(d.get("dry_run", True)),
        list_styles=False,
        chapter_heading_styles=d.get("chapter_heading_styles") or "Heading 1,Heading 2",
        sub_heading_styles=d.get("sub_heading_styles") or "Heading 3,Heading 4",
        quote_styles=d.get("quote_styles") or "Quote",
        shlok_style=d.get("shlok_style") or "Shlok",
        marker_class=d.get("marker_class") or "z-fs:24 z-fw:700 z-txt:grey0",
        strip_between=[tuple(x) for x in d.get("strip_between", []) if len(x) == 2 and x[0] and x[1]],
        reorder_numeric=bool(d.get("reorder_numeric", False)),
        footnote_min_chars=int(d.get("footnote_min_chars") or 200),
    )


def materialize_uploaded_image(d: dict):
    """If the request carries image_data (a data: URL or bare base64 string,
    from a browser <input type=file>) instead of a server-side image path,
    decode it to a temp file and return (image_path, temp_dir_to_clean_up).
    Otherwise fall back to the typed-path field for CLI-parity / scripting."""
    image_data = d.get("image_data")
    if not image_data:
        if not d.get("image"):
            raise ValueError("image or image_data is required")
        return Path(d["image"]), None
    name = d.get("image_name") or "cover.png"
    ext = Path(name).suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise ValueError(f"unsupported image type {ext}; use .png, .jpg/.jpeg or .webp")
    if image_data.strip().startswith("data:") and "," in image_data:
        image_data = image_data.split(",", 1)[1]
    try:
        raw = base64.b64decode(image_data, validate=True)
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"could not decode uploaded image: {e}")
    tmp_dir = Path(tempfile.mkdtemp(prefix="book_cover_upload_"))
    tmp_path = tmp_dir / ("upload" + ext)
    tmp_path.write_bytes(raw)
    return tmp_path, tmp_dir


def build_cover_args(d: dict, image_path: Path) -> SimpleNamespace:
    return SimpleNamespace(
        book_file=d["book_file"],
        image=image_path,
        slug=(d.get("slug") or "").strip() or None,
        covers_dir=Path(d.get("covers_dir") or bc.COVERS_DIR),
        app_js=Path(d.get("app_js") or bc.APP_JS),
        force=bool(d.get("force", False)),
        dry_run=bool(d.get("dry_run", True)),
    )


class Handler(BaseHTTPRequestHandler):
    server_version = "BookConverterUI/1.0"

    def log_message(self, fmt, *a):  # quieter console
        sys.stderr.write("[converter-ui] " + (fmt % a) + "\n")

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, text, status=200):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            self._send_html(UI_HTML.read_text(encoding="utf-8"))
        elif path == "/api/meta":
            self._send_json({
                "categories": [c for c in bc.KNOWN_CATEGORIES if c != "all"],
                "defaults": {
                    "out_dir": str(bc.BOOKS_DIR),
                    "data_js": str(bc.DATA_JS),
                    "app_js": str(bc.APP_JS),
                    "covers_dir": str(bc.COVERS_DIR),
                },
            })
        elif path == "/api/list-styles":
            qs = parse_qs(urlparse(self.path).query)
            src = (qs.get("path") or [""])[0]
            if not src:
                self._send_json({"ok": False, "error": "path is required"}, 400)
                return
            p = Path(src)
            if not p.exists():
                self._send_json({"ok": False, "error": f"not found: {p}"})
                return
            if p.suffix.lower() != ".docx":
                self._send_json({"ok": False, "error": "--list-styles only applies to .docx sources"})
                return
            ok, out, err = run_captured(lambda a: bc.list_docx_styles(a), p)
            self._send_json({"ok": ok, "log": out, "error": err})
        else:
            self._send_json({"ok": False, "error": "not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self._read_json()
        except Exception as e:  # noqa: BLE001
            self._send_json({"ok": False, "error": f"bad JSON body: {e}"}, 400)
            return

        if path == "/api/convert":
            src = Path(data.get("source", ""))
            if not data.get("source"):
                self._send_json({"ok": False, "error": "source path is required"}, 400)
                return
            if not src.exists():
                self._send_json({"ok": False, "error": f"source not found: {src}"})
                return
            args = build_convert_args(data)
            ok, out, err = run_captured(bc.cmd_convert, args)
            self._send_json({"ok": ok, "log": out, "error": err})

        elif path == "/api/cover":
            if not data.get("book_file") or not (data.get("image") or data.get("image_data")):
                self._send_json({"ok": False, "error": "book_file and an image (file or path) are required"}, 400)
                return
            tmp_dir = None
            try:
                image_path, tmp_dir = materialize_uploaded_image(data)
            except ValueError as e:
                self._send_json({"ok": False, "error": str(e)})
                return
            try:
                args = build_cover_args(data, image_path)
                ok, out, err = run_captured(bc.cmd_set_cover, args)
                self._send_json({"ok": ok, "log": out, "error": err})
            finally:
                if tmp_dir is not None:
                    shutil.rmtree(tmp_dir, ignore_errors=True)

        else:
            self._send_json({"ok": False, "error": "not found"}, 404)


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--no-browser", action="store_true", help="don't auto-open a browser tab")
    args = ap.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://localhost:{args.port}"
    print(f"Book Converter UI running at {url}  (Ctrl+C to stop)")
    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
