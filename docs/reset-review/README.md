# Local design review — 25 October 2026

This isolated study supersedes the old direction for review only. It does not modify either application version. Do not put these files in the production public directory.

Open `index.html` for the desktop/mobile board, or serve this folder locally:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory /Volumes/Vault/Workspace/Projects/asad.atterkhan/docs/reset-review
```

Visit http://127.0.0.1:4174/. The review has Home, The Lab, and Article controls. Each shows a desktop viewport scaled to fit and an actual 390 px mobile viewport. Open a responsive page to view it at browser width. Individual HTML pages also open from disk; clipboard copying may require localhost.

- `proposal.md`: audit, direction, reuse, architecture, authoring/privacy, costs, migration and rollback.
- `verification.md`: observed behavior and outstanding checks.
- `screenshots/`: captures of this local concept.
- `style.css`, `interactions.js`, HTML pages: independent review source; no build step.
- `assets/`: existing Departure Mono font and license.

Projects are drawn from existing records. New writing is explicitly illustrative. Experience/About/Projects are supporting navigation destinations, not complete additional design deliverables. No new character likenesses or animations are included. Nothing is deployed or connected to Firebase.
