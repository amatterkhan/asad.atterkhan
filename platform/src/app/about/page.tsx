import { SpriteScene } from "@/components/Sprites";
import { site } from "@/lib/site";
export const metadata = { title: "About", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <>
      <p className="eyebrow">A bit about me</p>
      <h1>About</h1>
      <div className="about-grid">
        <div className="prose">
          <p>
            I&apos;m Asad, a security analyst and engineer. My work spans
            security operations and hands-on engineering, and I&apos;m
            interested in the connections between software, infrastructure,
            cloud, and security.
          </p>
          <p>
            I enjoy building tools, experimenting, and automating tasks. Often,
            a small question is enough to send me down a rabbit hole: how does
            this work, why did it break, and could it be simpler?
          </p>
          <p>
            The Lab is my place to keep what I learn along the way. The name is
            a small nod to <em>Steins;Gate</em>, one of my favourite anime.
          </p>
          <p>
            And this is Storm: a fluffy tabby-and-white companion with a very
            good claim on any nearby resting spot.
          </p>
          <p>
            If you&apos;d like to talk about something I&apos;ve built or
            written, <a href={`mailto:${site.email}`}>say hello</a>.
          </p>
        </div>
        <div>
          <SpriteScene large />
          <p className="sprite-caption">
            Asad & Storm. Good company for a long experiment.
          </p>
        </div>
      </div>
    </>
  );
}
