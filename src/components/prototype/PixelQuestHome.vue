<script setup>
/* THROWAWAY UI PROTOTYPE — chosen homepage direction: a dark-blue, full-palette pixel RPG. */
import projects from '@/data/projectsData.json'
import work from '@/data/workExpData.json'
import pixelAvatar from '@/assets/img/PixMeAlone.gif'

const featuredProjects = projects.filter((project) => project.featured).slice(0, 2)
const currentRole = work.find((job) => job.isCurrent)
</script>

<template>
  <section class="pixel-quest-home">
    <div class="home-grid">
      <aside class="player-sheet">
        <div class="sheet-heading"><span>PLAYER CARD</span><b>LVL X</b></div>
        <div class="avatar-quest">
          <img :src="pixelAvatar" alt="Pixel art portrait of Asad" />
          <div class="player-cat" aria-label="Animated pixel cat companion">
            <div class="pixel-cat" aria-hidden="true"><i class="cat-ear left"></i><i class="cat-ear right"></i><i class="cat-head"></i><i class="cat-eye left"></i><i class="cat-eye right"></i><i class="cat-nose"></i><i class="cat-body"></i><i class="cat-tail"></i><i class="cat-paw left"></i><i class="cat-paw right"></i></div>
            <span>NUKO</span>
          </div>
        </div>
        <h1>ASAD<br><span>ATTERKHAN</span></h1>
        <p>Security engineer by day. Builder, tinkerer and lifelong learner at every other available hour.</p>
        <ul>
          <li><span>CLASS</span><b>SECURITY / TECH</b></li>
          <li><span>BASE</span><b>MAURITIUS</b></li>
          <li><span>XP</span><b>2023 — NOW</b></li>
        </ul>
        <a class="start-button" href="mailto:contact@asad.atterkhan.com">START A CONVERSATION</a>
      </aside>

      <div class="quest-content">
        <section class="quest-intro">
          <p class="eyebrow">OPEN WORLD PORTFOLIO</p>
          <h2>Make the complex<br><em>feel navigable.</em></h2>
          <p>I explore the overlap between resilient systems, thoughtful support, and digital things people enjoy using.</p>
          <div class="now-playing"><span>NOW PLAYING</span><b>{{ currentRole?.title }}</b><i>@ {{ currentRole?.company }}</i></div>
        </section>

        <section class="quest-list" aria-label="Featured quests">
          <div class="quest-list-heading"><span>ACTIVE QUESTS</span><small>SELECT ONE TO EXPLORE</small></div>
          <article v-for="(project, index) in featuredProjects" :key="project.id" class="quest-item">
            <div class="quest-number">0{{ index + 1 }}</div>
            <div><p>{{ project.categories.join(' / ') }}</p><h3>{{ project.title }}</h3><span>{{ project.description }}</span></div>
            <router-link :to="`/project/${project.id}`" :aria-label="`Open ${project.title}`">→</router-link>
          </article>
          <article class="quest-item collaboration"><div class="quest-number">03</div><div><p>OPEN CHANNEL</p><h3>Work together</h3><span>A smart security workflow, an odd idea, a useful site.</span></div><a href="mailto:contact@asad.atterkhan.com" aria-label="Start a conversation">→</a></article>
        </section>
        <footer class="quest-links"><router-link to="/resume">VIEW FULL PROFILE ↗</router-link><a href="https://github.com/amatterkhan" target="_blank" rel="noopener" aria-label="GitHub"><font-awesome-icon :icon="['fab', 'github']" /></a><a href="https://linkedin.com/in/amatterkhan" target="_blank" rel="noopener" aria-label="LinkedIn"><font-awesome-icon :icon="['fab', 'linkedin']" /></a></footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500&display=swap');
.pixel-quest-home { --night:#081622;--panel:#102838;--violet:#2c8491;--mint:#54e6b2;--cyan:#58c7e8;--pink:#65d6be;--gold:#e2c269;--paper:#daf8f1; font-family:'Departure Mono','Courier New',monospace;font-weight:400;color:var(--paper); }.home-grid { display:grid;grid-template-columns:295px 1fr;gap:29px; }.player-sheet,.quest-intro,.quest-item { background:var(--panel); }.player-sheet { align-self:start;padding:10px;border:4px solid var(--paper);box-shadow:4px 4px 0 var(--violet),8px 8px 0 var(--night); }.sheet-heading,.quest-list-heading { display:flex;justify-content:space-between;align-items:center;min-height:30px;padding:0 7px;background:var(--mint);color:var(--night);font-size:9px;line-height:1.5; }.avatar-quest { position:relative;display:grid;place-items:center;height:188px;margin-top:10px;border:4px solid var(--violet);background-color:var(--cyan);background-image:linear-gradient(45deg,transparent 46%,rgba(8,22,34,.16) 47% 53%,transparent 54%);background-size:10px 10px; }.avatar-quest img { width:138px;image-rendering:pixelated; }.player-cat { position:absolute;right:9px;bottom:8px;display:flex;align-items:end;gap:4px; }.pixel-cat { position:relative;width:47px;height:39px;filter:drop-shadow(2px 2px 0 var(--night));animation:cat-bob 2.6s steps(2,end) infinite; }.pixel-cat i { position:absolute;display:block; }.cat-ear { top:1px;width:10px;height:10px;background:var(--mint); }.cat-ear.left { left:7px; }.cat-ear.right { right:7px; }.cat-head { top:8px;left:5px;width:37px;height:21px;background:var(--mint);box-shadow:0 4px var(--mint); }.cat-eye { top:16px;width:4px;height:4px;background:var(--night);z-index:1;animation:cat-blink 3.2s steps(2,end) infinite; }.cat-eye.left { left:15px; }.cat-eye.right { right:15px; }.cat-nose { top:22px;left:22px;width:4px;height:3px;background:var(--gold);z-index:1; }.cat-body { top:30px;left:14px;width:20px;height:7px;background:var(--cyan); }.cat-tail { top:28px;right:1px;width:10px;height:6px;background:var(--cyan);transform-origin:left bottom;animation:tail-swish 1.1s steps(2,end) infinite; }.cat-paw { top:36px;width:6px;height:4px;background:var(--paper); }.cat-paw.left { left:15px; }.cat-paw.right { right:15px; }.player-cat span { padding:4px;background:var(--gold);color:var(--night);font-size:6px;box-shadow:2px 2px 0 var(--night); }@keyframes cat-bob { 50% { transform:translateY(-4px) } }@keyframes tail-swish { 50% { transform:translateX(4px) } }@keyframes cat-blink { 96% { transform:scaleY(1) } 98% { transform:scaleY(.15) } }.player-sheet h1 { font-family:'Pixelify Sans','Courier New',monospace;margin:9px 4px 13px;font-size:23px;line-height:1.15;font-weight:400;letter-spacing:0;color:var(--gold);text-shadow:2px 2px 0 var(--night); }.player-sheet h1 span { color:var(--pink); }.player-sheet>p { margin:0 4px;font-size:11px;line-height:1.45; }.player-sheet ul { margin:18px 4px 20px;padding:0;list-style:none;border:3px solid var(--violet);background:var(--night); }.player-sheet li { display:flex;justify-content:space-between;padding:10px 8px;border-top:1px solid var(--violet);font-size:9px;line-height:1.4; }.player-sheet li:first-child { border-top:0; }.player-sheet li span { color:var(--mint); }.start-button { display:flex;align-items:center;justify-content:center;min-height:45px;padding:9px 7px;border:3px solid var(--paper);box-shadow:3px 3px 0 var(--violet);background:var(--gold);color:var(--night);font-size:9px;line-height:1.35;text-decoration:none; }.start-button:hover { transform:translate(2px,2px);box-shadow:1px 1px 0 var(--violet); }.quest-content { padding:8px 0; }.quest-intro { max-width:650px;padding:19px;border:4px solid var(--paper);box-shadow:4px 4px 0 var(--violet); }.eyebrow { margin:0;color:var(--mint);font-size:9px;line-height:1.5; }.quest-intro h2 { font-family:'Pixelify Sans','Courier New',monospace;margin:22px 0 19px;font-size:clamp(28px,3.7vw,50px);font-weight:400;line-height:1.15;letter-spacing:0;text-shadow:3px 3px 0 var(--violet); }.quest-intro h2 em { color:var(--pink);font-style:normal; }.quest-intro>p:not(.eyebrow) { max-width:540px;margin:0;font-size:12px;line-height:1.5; }.now-playing { display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:20px;padding:11px;border:3px solid var(--violet);background:var(--night);font-size:9px;line-height:1.45; }.now-playing span { color:var(--cyan); }.now-playing b { color:var(--gold);text-align:right; }.now-playing i { grid-column:1/-1;color:var(--paper);font-style:normal; }.quest-list { margin-top:32px; }.quest-list-heading { margin-bottom:10px;border:3px solid var(--paper);background:var(--violet);color:var(--paper); }.quest-list-heading small { font-size:8px; }.quest-item { position:relative;display:grid;grid-template-columns:52px 1fr 34px;gap:13px;align-items:center;margin-top:10px;padding:16px 13px;border:4px solid var(--violet);box-shadow:4px 4px 0 var(--night); }.quest-item:before { content:"";position:absolute;inset:4px;pointer-events:none;border:1px dashed var(--quest-stitch,rgba(218,248,241,.24)); }.quest-number,.quest-item div:nth-child(2),.quest-item>a { position:relative;z-index:1; }.quest-number { display:grid;place-items:center;width:36px;height:36px;border:3px solid var(--gold);background:var(--night);color:var(--gold);font-size:9px; }.quest-item p { margin:0;color:var(--mint);font-size:9px;line-height:1.4; }.quest-item h3 { margin:9px 0;font-size:14px;font-weight:500;line-height:1.25;letter-spacing:0; }.quest-item span { display:block;font-size:10px;line-height:1.45; }.quest-item>a { display:grid;place-items:center;width:29px;height:29px;border:3px solid var(--paper);background:var(--cyan);color:var(--night);font-size:16px;text-decoration:none; }.quest-item>a:hover { background:var(--mint); }.collaboration { border-color:var(--cyan);background:var(--collaboration-bg,#0c3140); }.quest-links { display:flex;align-items:center;justify-content:flex-end;gap:18px;margin-top:28px;padding:13px;border-top:3px solid var(--violet);font-size:9px;line-height:1.45; }.quest-links a { color:var(--cyan);text-decoration:none; }.quest-links a[aria-label] { display:grid;place-items:center;width:24px;height:24px;border:2px solid var(--cyan);font-size:13px; }.quest-links a:hover { color:var(--gold);border-color:var(--gold); }
@media(max-width:760px){.home-grid{grid-template-columns:1fr;gap:35px}.player-sheet{max-width:none}.quest-intro h2{font-size:29px}.quest-item{grid-template-columns:44px 1fr 29px;padding:13px 10px}.quest-item h3{font-size:9px}.quest-links{flex-wrap:wrap;justify-content:flex-start;gap:13px}.now-playing{grid-template-columns:1fr}.now-playing b{text-align:left}}
</style>
