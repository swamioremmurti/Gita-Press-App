# RAG data generator

Standalone (Node >= 18, no npm install) tool that turns the library's book HTML files into
retrieval-ready chunks for AI question answering. No API calls, no keys.

## Commands

```bash
node rag_gen.js build                       # all books, incremental (unchanged books are skipped)
node rag_gen.js build --files "नयी पुस्तक.html"   # just one/some books
node rag_gen.js build --force               # rebuild everything
node rag_gen.js validate                    # quality report
node rag_gen.js inspect "अच्छे बनो.html"     # preview one book's chunks
node rag_gen.js search "कर्मयोग क्या है" -k 5 # keyword (BM25) sanity check
node rag_gen.js export --format csv         # Excel/pandas view  (output/rag_chunks.csv, ~800 MB)
node rag_gen.js export --format embed       # {id,text} lines ready for an embedding model
```

Options: `--books DIR --out DIR --catalog swadhyay-data.js --target 900 --max 1500 --min 350 --overlap 120 --include-toc`.

**Adding a future book:** put the HTML in `Gita Press Books/Gita Press Books/` (same format as today),
optionally register it in `swadhyay-data.js` (author/category), then run `node rag_gen.js build`.
Only new/changed books are processed. Deleted books are removed from the output.
Books not in the catalogue still work; author comes from the cover page.

## Output (`output/`)

| file | what |
|---|---|
| `rag_chunks.jsonl` | every chunk, one JSON per line (the main file) |
| `chunks/<book>.jsonl` | the same, per book (what the incremental build maintains) |
| `books.json` | one row per book: title, author, category, chunk count |
| `state.json` | build bookkeeping (source hashes) |

Chunk fields: `id`, `book_file`, `book_title`, `author`, `tikakar`, `translator`, `publisher`, `category`,
`chapter`, `section`, `anchor` (heading id in the HTML), `page_start`, `page_end`, `chunk_index`, `chunk_count`,
`kind` (`prose` | `verse` | `mixed`), `text`, `notes` (footnotes of those pages), `context`
(`title | chapter › section`), `citation` (ready to show: `book, chapter, पृष्ठ N`), `has_overlap`, `chars`,
`approx_tokens`, `text_hash`.

**Embedding input** = `context + "\n" + text + footnotes` (use `export --format embed`, or `embedText(chunk)` from `rag_gen.js`).

## Sanskrit shlokas

Verses stay together with the translation/commentary printed beside them in the same chunk, so retrieval
returns both. At answer time the LLM can translate and explain the Sanskrit itself; suggested prompt:
"Answer in Hindi from the passages only. Quote the shloka, give its meaning, and cite the `citation`.
If a shloka has no translation in the passage, translate it yourself and say so."
Use a multilingual embedding model (Voyage `voyage-3.5`/`voyage-multilingual-2`, OpenAI `text-embedding-3-large`, `bge-m3`).

## Notes

- Table of contents sections are skipped unless `--include-toc`.
- Chunking never crosses a main heading; ~900 chars target, 1500 max, ~120 chars sentence overlap between neighbours.
- Whole library: ~616 books, ~248K chunks, ~258M chars (~99M tokens) -- budget embedding cost accordingly,
  or embed priority books first with `--files`.
- Vedic accent marks in the Veda books use private-use characters; `validate` lists them (expected).
