import { AsadSprite, StormSprite } from "@/components/Sprites";
import { RoomVignette, At } from "@/components/RoomVignette";
import { site } from "@/lib/site";
export const metadata = { title: "About", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <>
      <p className="eyebrow">A bit about me</p>
      <h1>About</h1>
      <RoomVignette corner="about">
        <At x={66} y={78}>
          <div className="asad">
            <AsadSprite animation="coffee" size={128} />
          </div>
        </At>
        <At x={156} y={146}>
          <div className="storm">
            <StormSprite animation="sleeping" size={64} />
          </div>
        </At>
      </RoomVignette>
      <div className="about-grid">
        <div className="prose">
          <p>
            I&apos;m Asad. I work in security operations, and I like knowing
            how the whole stack fits together: the software, the
            infrastructure, the cloud underneath it, and all the ways it can
            go wrong.
          </p>
          <p>
            Most of my side projects start with a small question: how does this
            work, why did it break, could it be simpler? Usually that ends in a
            script, a tool, or a long evening of reading.
          </p>
          <p>
            The Lab is where I keep what I learn. The name is a nod to{" "}
            <em>Steins;Gate</em>, one of my favourite anime: a small, messy lab
            where curious people try things just to see what happens.
          </p>
          <p>
            And this is Storm, a fluffy tabby-and-white cat with a firm claim
            on any warm spot near my desk.
          </p>
          <p>
            If you&apos;d like to talk about something I&apos;ve built or
            written, <a href={`mailto:${site.email}`}>say hello</a>.
          </p>
        </div>
      </div>
    </>
  );
}
