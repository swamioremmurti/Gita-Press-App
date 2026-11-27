#!/usr/bin/env node
/* run_local.js -- try "बोलकर जाँचें" with the Sanskrit recogniser on this computer. Starts both
     the speech service   http://127.0.0.1:7861          (asr-service/, model from asr-service/model/)
     the website          http://localhost:5180/gita     (server/server.js, with the LOCAL database)
   and stops both on Ctrl+C. One-time setup, from the project folder (Windows):
     py -m venv %USERPROFILE%\.kalyan-asr-venv
     %USERPROFILE%\.kalyan-asr-venv\Scripts\python -m pip install -r asr-service\requirements.txt
     py tools\asr\fetch_community_onnx.py
   Another Python can be named with ASR_PYTHON.                                                          */
"use strict";
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const APP = path.resolve(__dirname, "..", "..");
const ASR = path.join(APP, "asr-service");
const PYTHON = process.env.ASR_PYTHON || path.join(os.homedir(), ".kalyan-asr-venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const SITE_PORT = "5180", ASR_PORT = "7861";
const secret = crypto.randomBytes(24).toString("hex");            // made afresh each run, never written anywhere

if (!fs.existsSync(PYTHON)) { console.error("No Python at " + PYTHON + " -- see the setup lines at the top of this file."); process.exit(1); }
if (!fs.existsSync(path.join(ASR, "model", "config.json"))) { console.error("No model in asr-service/model -- run tools/asr/fetch_community_onnx.py first."); process.exit(1); }

const children = [
  spawn(PYTHON, ["-X", "utf8", "-m", "uvicorn", "app:app", "--port", ASR_PORT], {
    cwd: ASR, stdio: "inherit",
    env: Object.assign({}, process.env, { SYNC_LOAD: "1", MODEL_DIR: path.join(ASR, "model"), ASR_SHARED_SECRET: secret, ALLOWED_ORIGINS: "http://localhost:" + SITE_PORT }),
  }),
  spawn(process.execPath, ["server/server.js"], {
    cwd: APP, stdio: "inherit",
    // The two TURSO_ names are PRESENT but empty on purpose: server/.env only fills in names that are absent, so this keeps
    // the test on the local SQLite file and away from the production database. (PowerShell cannot set an empty variable.)
    env: Object.assign({}, process.env, { PORT: SITE_PORT, TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", ASR_URL: "http://127.0.0.1:" + ASR_PORT, ASR_SHARED_SECRET: secret }),
  }),
];

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  process.exit(code);
}
children.forEach((c) => c.on("exit", (code) => stop(code || 0)));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
console.log("Open http://localhost:" + SITE_PORT + "/gita   (Ctrl+C stops both)");
