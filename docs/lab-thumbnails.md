# Lab thumbnails

Every Lab article can have a small 16:9 pixel-art thumbnail. It shows on the Lab cards, in
"Nearby in The Lab" and at the top of the article.

## Making one

1. In `/admin` → **Writing**, open the article and choose its **Section** and **Category** first.
2. Press **Copy AI prompt**. It copies the prompt header below with a `SUBJECT` block filled in
   from the article's title, description, shelf and tags, plus a scene idea for that category.
3. Paste it into Gemini, Claude or ChatGPT. Ask again until one image looks right. Add a line
   to the subject when you want something specific ("the box is themed around a haunted library").
4. Back in the admin, **Upload image** and pick the file. The browser centre-crops it to 16:9,
   resizes it to 640×360 and compresses it to WebP (JPEG where the browser cannot encode WebP),
   usually 20–60 KB. Tick
   **Crisp pixels** first if the smoothed version looks blurry.
5. **Save draft**, then **Publish** (or **Publish changes**). The thumbnail goes live with the rebuild.

Phones show thumbnails 112 px wide and desktops about 300 px, so one bold subject in the
middle works better than a detailed scene. Uploads are named by their SHA-256 and served from
`/lab-media/` with a one-year cache.

## The prompt header

This is the fixed part, the same for every post, so the thumbnails look like one set. It lives
in `site/src/lib/thumbnail-prompt.ts`; change it there and the admin button follows.

```text
Create a pixel-art thumbnail for a post on my personal tech journal, "The Lab".

STYLE (keep identical across every thumbnail)
- Hand-placed 16-bit pixel art, like a cosy indie game: crisp hard-edged square pixels, a visible pixel grid, no anti-aliasing, no blur, no smooth gradients (shade with dithering), no photorealism, no 3D-render look.
- Low-resolution feel: drawn as if at 320x180 pixels and scaled up with nearest-neighbour.
- Limited palette of about 16 colours: deep night navy background (#12141d, #1b1e2b), warm cream highlights (#e4ddd0), mint-green accent (#9ed6b4), soft cyan (#7cc0d4), muted sand and brass (#c9b08a). One warm lamp-light glow is welcome.
- Mood: a late-night desk in a small room. Calm, curious, a little playful.

COMPOSITION
- Landscape 16:9 (1920x1080 or 1280x720).
- One clear central subject that still reads when the image is shown 112 to 320 pixels wide. Keep everything important inside the middle 70%: the edges may be cropped.
- Simple, low-detail background behind the subject; strong silhouette and contrast.
- NO text, letters, numbers, logos, watermarks, signatures, UI, borders or frames.
- No real people, no real company logos or brand mascots.
```

Then add the subject:

```text
SUBJECT
- Post: "<title>". <one-line description>
- Shelf: <Section> / <Category>.
- Keywords: <tags>.
- Scene idea: <see below>
- Turn the topic into a visual metaphor; do not write the title or any words in the image.
```

## Scene ideas by shelf

| Shelf | Scene idea |
| --- | --- |
| Hack The Box | A small hacker's desk at night: a chunky retro monitor shows a glowing mint-green wireframe cube; inside the cube, a tiny scene hints at the machine's theme. |
| HTB Certifications | An exam desk at night: a pixel medal or badge on a ribbon beside stacked notes, a mug and a terminal, all lit by a desk lamp. |
| TryHackMe | A cosy room with a door left ajar and soft cyan light spilling out; on the floor, a puzzle box, a key and a small glowing terminal. |
| CTF | A small pixel flag planted on top of a server rack or terminal, as if a summit was just reached, with sparks of code drifting around it. |
| Writeups (other) | A detective-style desk at night: a magnifying glass over a glowing terminal, pinned notes and string. |
| Tooling | A workbench seen from the front: one clear tool or gadget in the middle, with small cables, screws and a glowing screen around it. |
| Notes and anything else | An open notebook on a desk at night, with a small pixel illustration of the topic rising out of the page like a hologram. |

Scene ideas are keyed by category id, then section id. A new section or category added in the
admin falls back to "a single object on a desk at night that stands for the topic"; add its own
line to `SCENES` in `thumbnail-prompt.ts` when it deserves one.

## Tips

- Image models often slip text in anyway; the template says "no text" twice for that reason.
  Regenerate rather than editing letters out.
- AI "pixel art" is rarely on a true pixel grid. Smoothed scaling (the default) hides that;
  **Crisp pixels** looks sharper only when the image really is blocky.
- Without a thumbnail, cards show the section's icon on a dotted panel, so a post can go out first
  and get its image later.

## From Git

With `CONTENT_SOURCE=git`, put the image in `site/content/thumbnails/` (already 640×360, under
512 KiB) and name it in the article's frontmatter: `thumbnail: my-note.webp`.
