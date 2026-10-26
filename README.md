# asad.atterkhan

Source for [asad.atterkhan.com](https://asad.atterkhan.com): a pixel-art room homepage, a Lab
(articles), Workbench (projects), Experience, Achievements, About and a private shift calendar,
with an owner-only admin for writing and editing content.

| Path | What it is |
| --- | --- |
| [`site/`](site/) | Vue 3 + Vite + Tailwind 4 site, prerendered to static HTML; only interactive islands hydrate |
| [`api/`](api/) | Go owner API (Cloud Run) and the exporter that turns published Firestore content into a build snapshot |
| [`art/`](art/) | Pixel-art sources and the scripts that export sprites, room layers and outfits into `site/public/` |
| [`docs/`](docs/) | Architecture, development, API reference, deployment, CI/CD |
| `.github/` | CI, deploy and preview workflows, and the one-time Firebase/GitHub setup script |

Hosting, Auth, Firestore and Storage run on Firebase (`asad-atterkhan`); the API runs on Cloud Run.
Read [docs/architecture.md](docs/architecture.md) first.

## Quick start

Needs Node 24, Go (version in `api/go.mod`), Java 21 and the Firebase CLI for the emulators.

```sh
make install   # npm ci for the site
make check     # gofmt, go vet and tests for the API; typecheck and unit tests for the site
```

Run the API and the site in two terminals:

```sh
cd api && APP_ENV=development go run ./cmd/server   # :8081
cd site && npm run dev                              # :4190
```

Everything else (emulator tests, browser tests, content from Firestore, admin sign-in) is in
[docs/development.md](docs/development.md).

## History

The original Vue site and the Next.js prototype this replaced are preserved on the
`archive/legacy` branch (tag `legacy-final`).
