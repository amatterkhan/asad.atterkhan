"""Generate one PixelLab animation for a character and download its frames.
usage: python3 scripts/pl_animate.py <character> <name> <direction> <frames> <start.png|-> "<action>" """
import sys, json, subprocess, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent)); import pixellab as P
who, name, direction, n, start, action = sys.argv[1:7]
ROOT = P.ROOT
cid = json.loads((ROOT / f"art/pixellab/{who}.json").read_text())["character_id"]
body = {"character_id": cid, "animation_name": name, "action_description": action, "mode": "v3",
        "frame_count": int(n), "directions": [direction], "keep_first_frame": False}
if start != "-":
    body["custom_start_frame"] = {"type": "base64", "base64": P.b64png(ROOT / start), "format": "png"}
r = P.call("POST", "/characters/animations", body)
used = 0
for jid in r["background_job_ids"]:
    j = P.wait(jid, every=6, limit=1200)
    used += (j.get("usage") or {}).get("generations", 0)
c = P.call("GET", f"/characters/{cid}")
anim = next(a for a in c["animations"] if a.get("animation_group_id") == r["animation_group_id"] or a.get("name") == name)
out = ROOT / f"art/pixellab/{who}/{name}"; out.mkdir(parents=True, exist_ok=True)
frames = None
for k in ("frames", "frame_urls", "directions"):
    if k in anim: frames = anim[k]; break
(out / "anim.json").write_text(json.dumps(anim, indent=2))
urls = []
def collect(x):
    if isinstance(x, str) and x.startswith("http"): urls.append(x)
    elif isinstance(x, dict): [collect(v) for v in x.values()]
    elif isinstance(x, list): [collect(v) for v in x]
collect(anim)
for i, u in enumerate(urls):
    subprocess.run(["curl", "-sfL", "-A", "Mozilla/5.0", "-o", str(out / f"{i:02d}.png"), u], check=True)
print(json.dumps({"name": name, "frames": len(urls), "generations_used": used, "balance": P.call("GET", "/balance")["subscription"]["generations"]}))
