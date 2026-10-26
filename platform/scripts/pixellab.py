"""Minimal PixelLab API v2 client. Reads PIXELLAB_API_TOKEN from platform/.env.local (gitignored);
the token is never printed. Used by scripts/make_characters.py."""
import base64, json, os, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.pixellab.ai/v2"

def _token():
    t = os.environ.get("PIXELLAB_API_TOKEN")
    if not t:
        for line in (ROOT / ".env.local").read_text().splitlines():
            if line.startswith("PIXELLAB_API_TOKEN="):
                t = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not t or t == "paste-your-token-here":
        raise SystemExit("PIXELLAB_API_TOKEN is not set in platform/.env.local")
    return t

def call(method, path, body=None, timeout=180):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            ctype = r.headers.get("Content-Type", "")
            return json.loads(raw) if "json" in ctype else raw
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> {e.code}: {e.read()[:600].decode(errors='replace')}")

def wait(job_id, every=4, limit=900):
    t0 = time.time()
    while time.time() - t0 < limit:
        j = call("GET", f"/background-jobs/{job_id}")
        s = j.get("status")
        if s in ("completed", "succeeded", "done", "finished"):
            return j
        if s in ("failed", "error", "cancelled"):
            raise SystemExit(f"job {job_id} {s}: {json.dumps(j)[:600]}")
        time.sleep(every)
    raise SystemExit(f"job {job_id} timed out")

def b64png(path):
    return base64.b64encode(Path(path).read_bytes()).decode()
