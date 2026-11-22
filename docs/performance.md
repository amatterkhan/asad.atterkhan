# Performance

Two things keep the site fast without anyone watching it: size budgets that fail the build, and
Lighthouse numbers recorded here so a regression has something to be compared with.

## Size budgets

`npm run budget` (`site/scripts/check-budget.ts`) runs in CI after every build and fails when a
budget is exceeded. Raise a number only in the commit that adds the weight, and say why.

| Budget | Limit | 22 November 2026 |
| --- | --- | --- |
| Stylesheet, gzip | 22 KB | 18.2 KB |
| `/` JavaScript, gzip | 48 KB | 41.5 KB |
| `/lab` JavaScript, gzip | 42 KB | 36.6 KB |
| `/about` JavaScript, gzip | 8 KB | 3.9 KB |
| All JavaScript, raw | 330 KB | 290.0 KB |

## Lighthouse

Recorded 22 November 2026 (Stage 5, before the npm updates in #61, which added 0.4 KB gzip to `/`) with Lighthouse 12.8.2 and headless Chromium against the
production build served locally (`npm run build && npm run preview`), two runs each, which agreed
to within 0.1 s. Scores are performance / accessibility / best practices.

| Page | Mobile (simulated 4G, slow CPU) | Desktop |
| --- | --- | --- |
| `/` | 95 / 100 / 100 · FCP 2.3 s · LCP 2.4 s · CLS 0.001 · TBT 30 ms | 100 / 100 / 100 · LCP 0.8 s · CLS 0.001 |
| `/lab` | 91 / 100 / 100 · FCP 2.3 s · LCP 3.2 s · CLS 0.001 · TBT 0 ms | 100 / 100 / 100 · LCP 0.7 s · CLS 0.001 |
| `/lab/lab-000` | 99 / 100 / 100 · FCP 1.5 s · LCP 1.8 s · CLS 0 · TBT 0 ms | 100 / 100 / 100 · LCP 0.4 s · CLS 0.005 |

Read these as a floor, not as production numbers:

- The local preview server does not compress responses; Firebase Hosting does. Lighthouse
  counted about 136 KB of avoidable transfer on `/lab` for that reason alone.
- SEO scored 66 everywhere only because a local build is `noindex` (`INDEX_SITE` unset).
- On `/lab` the largest paint is the search box placeholder, drawn once the search island has
  loaded, which is why its mobile LCP trails the other two.

To measure production, run PageSpeed Insights on the three URLs, or from a machine with Chrome:
`npx lighthouse@12.8.2 https://asad.atterkhan.com/lab --only-categories=performance,accessibility,best-practices,seo`.
