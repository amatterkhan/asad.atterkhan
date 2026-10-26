# ASAD.EXE home illustration review

**Status:** Rejected design exploration; retain for history only. These generated images and palette-reduced exports are not approved production art. Animation layers are planned, not produced.  
**Scope:** Artwork-first review only. The wider frontend and Firebase implementation remains paused.

## Review files

- [Homepage art review](./home-art-review.html) — switch between desktop and mobile compositions.
- Desktop source: `public/art/home/source/home-desktop-source.png` (1536 × 1024).
- Desktop logical export: `public/art/home/export/home-desktop-logical.png` (768 × 512, indexed palette).
- Desktop display export: `public/art/home/export/home-desktop@2x.png` (1536 × 1024, nearest-neighbor 2×).
- Mobile source: `public/art/home/source/home-mobile-source.png` (1024 × 1536).
- Mobile logical export: `public/art/home/export/home-mobile-logical.png` (512 × 768, indexed palette).
- Mobile display export: `public/art/home/export/home-mobile@2x.png` (1024 × 1536, nearest-neighbor 2×).

## Artwork preparation

The two source illustrations are original generated art directed from the user's attached Lab mockup. They use no copied game assets. The desktop scene establishes the wide room and large city window; the mobile scene is a separately generated tighter vertical viewpoint, not a crop of the desktop image.

For each export, the source was resized with a high-quality reduction filter to its logical pixel dimensions, quantized to 64 colors without dithering, then enlarged by an exact 2× using nearest-neighbor. The lossless PNG logical-size export is the editable pixel-grid baseline; the `@2x` output is intended for browser display with `image-rendering: pixelated` when displayed at a matching scale. The source PNG is preserved for future pixel-level touch-up. Inspect pixel scale at the target device density before choosing a different display size.

The image-generation tool delivers flattened scenes. They are useful as a still art direction review, but animation requires manual cleanup: rebuild the pixels behind moving objects, separate sprites, and align every frame to the logical grid. The plan below is not a claim that those sprite layers already exist.

## Animation layer plan after still approval

| Layer | Treatment | Motion plan | Preparation required |
|---|---|---|---|
| Room, shelves, window frame, city, desk and static props | Static base artwork | None | Keep as the optimized still background. |
| Monitor glass and screen glow | Transparent pixel overlay aligned to each screen | Slow 2–3 frame brightness cycle, with no whole-image filter pulse | Redraw screen regions as a clean overlay; preserve monitor frame and code/interface marks in base or overlay consistently. |
| Terminal cursor | Tiny transparent pixel sprite | Blink on a gentle fixed cadence with CSS `steps()` | Add the cursor to a screen layer at a precise logical-pixel anchor. |
| Stars outside the window | Sparse transparent sprite sheet | Occasional one-pixel twinkles; rare short shooting-star sequence | Separate stars from city/window pixels; do not animate all stars together. |
| Desk lamp pool | Pixel mask/sprite overlay | Very subtle 2–3 frame illumination change | Repaint affected desktop/books pixels into clean static background; draw the light pool as hard-edged pixel clusters, not a CSS gradient. |
| Cat idle | Cat sprite plus reconstructed cushion/desk beneath it | Two-frame breathing loop; occasional blink | Redraw cushion and desk where the cat currently occludes them; create aligned transparent cat frames. |
| Cat stretch | Cat state sprite sheet | Rare 4–6 frame stretch, then settle back to sleep | Draw full body/limb poses and clean background under the moving silhouette; state can be triggered occasionally or by an accessible click/tap. |

Implementation can remain TypeScript + static images + CSS sprite sheets (`steps()` timing) and a small component state machine. A runtime rendering library or Firebase feature is not needed. Keep the still image as the fallback, load animation only when in view, pause when offscreen, and honor `prefers-reduced-motion`. Cat interaction must not obscure content or be required for navigation.

## Review decisions needed

Before converting this still into animation-ready layered artwork, review:

1. Whether the room, palette, density, and cat placement match the desired world.
2. Whether the desktop composition gives enough priority to the introduction and artwork.
3. Whether the separate mobile view preserves the mood while keeping the introduction readable.
4. Whether the 64-color grid export is crisp at the shown scale or should use larger/smaller logical pixels.

