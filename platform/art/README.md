# Asad and Storm — sprite source and export

The approved input is `../../Asad and Storm Pixel Sprite Board.png`. It is a flattened 1448×1086 RGB illustration, not a transparent or aligned 48px sheet. No appearance was regenerated or redesigned.

The export uses selected master poses from the top of the board. Native-size crop coordinates and the source SHA-256 are recorded in `../public/sprites/manifest.json`. A reproducible background flood removes the near-uniform navy outside the drawings, while retaining enclosed dark clothing. Tiny detached noise is removed. The portraits are centered on 128×128 logical canvases, anchored at (64,120), without stretching. This resolution retains the approved face and tabby details that a 48px conversion would lose.

The common palette has at most 128 opaque colors, including retained green eye colors. It is derived once for the set; each frame uses the same palette with no dithering. PNG alpha is genuine binary transparency, not a checkerboard. Inspection previews show alpha against navy and checker backgrounds.

## V1 states

| State | Frames | Timing | Edit |
| --- | --- | --- | --- |
| Asad idle | 2 identical | static | Laptop pose preserved; no idle bob |
| Asad typing | 2 | 1300 + 160 ms | 17 finger pixels change |
| Storm idle | 2 | 4400 + 140 ms | Local eyelid edit, body/markings fixed |
| Storm sleeping | 2 | 2400 + 2400 ms | Small interior coat movement; stable silhouette |
| Asad coffee | 2 identical | static | Approved mug pose, no invented animation |
| Storm standing | 2 identical | static | Approved four-paw pose with raised fluffy tail |
| Storm Sit | 2 identical | static | Distinct approved Sit-row pose with full chest and curled tail |

All runtime sheets are 256×128 RGBA PNG. Still fallbacks are 128×128; `together.png` is a transparent paired illustration. The tiny presentation animations use `steps(1,end)` with deliberate long holds rather than continuous bouncing.

`source/` contains editable individual PNG masters, individual frame exports, and palette JSON. `previews/` contains enlarged inspection renders and optional animated GIFs; these are not runtime assets. There is no native layered Aseprite source because the supplied original was flattened. The PNG sources and export script are the editable source of truth for this version.

Re-export with Python 3, Pillow, and NumPy:

```sh
python3 scripts/export_sprites.py
```

Run from any directory; paths resolve from the script. Keep the approved board at its original repository-root path. Normal exports read the editable master PNGs and saved palette first. Edit those masters to extend the art without losing your changes. `python3 scripts/export_sprites.py --reextract` deliberately resets masters/palette from the approved board, so use it only when redoing extraction. The exact palette mapping is idempotent: two successive exports from the current masters were verified byte-identical. When changing extraction, inspect hair, beard, laptop outline, chest, paws, eyes, tail and every alpha edge at 1× and integer scaling. When adding a frame, keep unchanged regions identical. Do not extract different full drawings for adjacent frames; that causes face/body flicker.

`AsadSprite` accepts `animation="idle" | "typing" | "coffee"`; `StormSprite` accepts `animation="idle" | "sleeping" | "standing" | "sit"`. Both accept `size={64 | 128 | 256 | 384}`, `paused`, and optional `description`. Unlabeled sprites are decorative. Paired scenes have one accessible description. CSS freezes frame zero for reduced motion. An IntersectionObserver and visibility handler pause offscreen/hidden-tab animation. With JS disabled, the initial frame remains visible and static.

The browser workshop at `/sprite-review/index.html` uses the actual exported sheets, with transparency, pause and static-fallback controls. The larger illustrated rooms and the full reference board are never loaded by the website.

Paired scenes render Asad at 256 px and Storm at 128 px on desktop; mobile uses 128 px and 64 px. Their ground anchors align. The shared logical canvas does not imply equal real-world character sizes. The exported together.png follows the same 2:1 display-scale relationship.

Home pairs typing Asad with the dedicated Storm Sit pose; About pairs coffee Asad with sitting/blinking Storm. The new static poses are extracted independently from approved board crop coordinates recorded in the manifest. They reuse the saved shared palette; existing master frames are preserved. The combined PNG uses the Home pairing.

The `storm-sit` source crop is the first character in the board’s separate Sit row, not the Idle row. It is deliberately a static two-cell sheet, retaining the same palette, alpha and ground anchor. No full-character variations were combined into a flickering animation.
