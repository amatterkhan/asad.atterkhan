"""Paints Asad's facial hair onto the PixelLab reference images (art/pixellab/asad-ref-*.png ->
asad-ref-*-goatee.png): a short dark goatee under the lower lip and no moustache.
Coordinates are per reference."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1] / "art/pixellab"
GOATEE, GOATEE_HI, MOUSTACHE = (38, 24, 22, 255), (70, 44, 34, 255), (168, 98, 66, 255)
# per reference: moustache row (x0, x1, y), goatee rows [(x0, x1, y), ...], highlight pixels
SPEC = {
    "stand": {"moustache": [], "goatee": [(68, 70, 46), (68, 70, 47), (68, 69, 48), (69, 69, 49)], "hi": [(67, 47), (71, 46)]},
    "typing": {"moustache": [], "goatee": [(67, 70, 77), (66, 69, 78)], "hi": [(66, 77), (71, 77)]},
    "drink": {"moustache": [], "goatee": [(75, 77, 62), (75, 76, 63)], "hi": [(74, 62), (78, 62)]},
}
for name, s in SPEC.items():
    im = Image.open(ROOT / f"asad-ref-{name}.png").convert("RGBA")
    px = im.load()
    for x0, x1, y in s["moustache"]:
        for x in range(x0, x1 + 1): px[x, y] = MOUSTACHE
    for x0, x1, y in s["goatee"]:
        for x in range(x0, x1 + 1): px[x, y] = GOATEE
    for x, y in s["hi"]: px[x, y] = GOATEE_HI
    im.save(ROOT / f"asad-ref-{name}-goatee.png")
    print("painted", name)
