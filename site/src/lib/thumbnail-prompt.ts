// The prompt header for Lab thumbnails (Gemini, Claude, ChatGPT…). The admin's "Copy prompt"
// button fills SUBJECT from the article; docs/lab-thumbnails.md explains how to use it.

export const PROMPT_HEADER = `Create a pixel-art thumbnail for a post on my personal tech journal, "The Lab".

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
- No real people, no real company logos or brand mascots.`;

/** Scene ideas by category id, then by section id; the owner can rename them, so all are optional. */
const SCENES: Record<string, string> = {
  hackthebox:
    "A small hacker's desk at night: a chunky retro monitor shows a glowing mint-green wireframe cube; inside the cube, a tiny scene hints at the machine's theme.",
  "htb-certifications":
    "An exam desk at night: a pixel medal or badge on a ribbon beside stacked notes, a mug and a terminal, all lit by a desk lamp.",
  tryhackme:
    "A cosy room with a door left ajar and soft cyan light spilling out; on the floor, a puzzle box, a key and a small glowing terminal.",
  ctf: "A small pixel flag planted on top of a server rack or terminal, as if a summit was just reached, with sparks of code drifting around it.",
  writeups: "A detective-style desk at night: a magnifying glass over a glowing terminal, pinned notes and string.",
  tooling: "A workbench seen from the front: one clear tool or gadget in the middle, with small cables, screws and a glowing screen around it.",
  notes: "An open notebook on a desk at night, with a small pixel illustration of the topic rising out of the page like a hologram.",
};

export type PromptInput = {
  title: string;
  description: string;
  tags: string[];
  section?: { id: string; name: string };
  category?: { id: string; name: string };
};

/** The full prompt for one article: the header, then a SUBJECT block built from its details. */
export function thumbnailPrompt(a: PromptInput) {
  const shelf = [a.section?.name, a.category?.name].filter(Boolean).join(" / ");
  const scene =
    (a.category && SCENES[a.category.id]) ||
    (a.section && SCENES[a.section.id]) ||
    "A single object on a desk at night that stands for the topic, lit by a desk lamp.";
  return `${PROMPT_HEADER}

SUBJECT
- Post: "${a.title}". ${a.description}
${shelf ? `- Shelf: ${shelf}.\n` : ""}${a.tags.length ? `- Keywords: ${a.tags.join(", ")}.\n` : ""}- Scene idea: ${scene}
- Turn the topic into a visual metaphor; do not write the title or any words in the image.`;
}
