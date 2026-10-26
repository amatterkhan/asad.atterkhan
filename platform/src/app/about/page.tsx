import { getActiveOutfit, getSiteCopy, renderArticle } from "@/lib/content";
import { AsadSprite, StormSprite } from "@/components/Sprites";
import { RoomVignette, At } from "@/components/RoomVignette";
export const metadata = { title: "About", alternates: { canonical: "/about" } };
export default async function About() {
  const about = await renderArticle((await getSiteCopy()).aboutBody);
  const outfit = await getActiveOutfit();
  return (
    <>
      <p className="eyebrow">A bit about me</p>
      <h1>About</h1>
      <RoomVignette corner="about">
        <At x={66} y={78}>
          <div className="asad">
            <AsadSprite animation="coffee" outfit={outfit} size={128} />
          </div>
        </At>
        <At x={156} y={146}>
          <div className="storm">
            <StormSprite animation="sleeping" size={64} />
          </div>
        </At>
      </RoomVignette>
      <div className="about-grid">
        <div className="prose" dangerouslySetInnerHTML={{ __html: about.html }} />
      </div>
    </>
  );
}
