<script setup>
/* THROWAWAY LOCAL PROTOTYPE SHELL — shared Pixel Quest treatment for every existing page. */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const nav = [
  { name: 'home', path: '/', label: 'HOME' },
  { name: 'resume', path: '/resume', label: 'PROFILE' },
  { name: 'projects', path: '/projects', label: 'QUESTS' },
  { name: 'blog', path: '/blog', label: 'NOTES' }
]
const currentLabel = computed(() => nav.find((item) => item.name === route.name)?.label || 'EXPLORE')
const cursor = ref({ x: -40, y: -40, visible: false })

function starStyle(index) {
  return {
    left: `${((index * 37) % 92) + 3}%`,
    top: `${((index * 53) % 84) + 5}%`,
    '--drift-x': `${((index * 19) % 96) - 48}px`,
    '--drift-y': `${((index * 29) % 72) - 36}px`,
    animationDelay: `${(index % 7) * -0.85}s`,
    animationDuration: `${7 + (index % 6) * 1.7}s`
  }
}

function trackCursor(event) {
  cursor.value = { x: event.clientX, y: event.clientY, visible: true }
}

onMounted(() => window.addEventListener('pointermove', trackCursor))
onBeforeUnmount(() => window.removeEventListener('pointermove', trackCursor))
</script>

<template>
  <div class="pixel-quest-layout">
    <div class="world-pixels" aria-hidden="true"><i v-for="dot in 32" :key="dot" :style="starStyle(dot)"></i></div>
    <div class="pixel-cursor" :class="{ visible: cursor.visible }" :style="{ left: `${cursor.x}px`, top: `${cursor.y}px` }" aria-hidden="true"><i></i><b></b></div>
    <header class="quest-site-header">
      <router-link to="/" class="quest-logo">ASAD’S <span>QUEST LOG</span></router-link>
      <nav aria-label="Primary navigation">
        <router-link v-for="item in nav" :key="item.name" :to="item.path" :class="{ active: route.name === item.name }">{{ item.label }}</router-link>
      </nav>
    </header>

    <main class="quest-site-content">
      <div v-if="route.name !== 'home'" class="page-hud"><span>MAP / {{ currentLabel }}</span><b>PLAYER 01</b></div>
      <router-view />
    </main>

    <footer class="quest-site-footer"><span>© {{ new Date().getFullYear() }} ASAD</span><div><a href="https://github.com/amatterkhan" target="_blank" rel="noopener" aria-label="GitHub"><font-awesome-icon :icon="['fab', 'github']" /></a><a href="https://linkedin.com/in/amatterkhan" target="_blank" rel="noopener" aria-label="LinkedIn"><font-awesome-icon :icon="['fab', 'linkedin']" /></a></div></footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500&display=swap');
@font-face { font-family:'Departure Mono';src:url('../../assets/fonts/DepartureMono-Regular.woff2') format('woff2');font-style:normal;font-weight:400;font-display:swap; }
.pixel-quest-layout { --color-primary:#54e6b2;--color-primary-hover:#85f2c9;--color-accent:#58c7e8;--color-warning:#e2c269;--color-error:#ef7e99;--color-bg-primary:#081622;--color-bg-secondary:#102838;--color-bg-tertiary:#153d4d;--color-bg-quaternary:#1d5360;--color-text-primary:#daf8f1;--color-text-secondary:#ffffff;--color-text-tertiary:#bddbd7;--color-text-quaternary:#7da8a5;--color-text-cyan:#58c7e8;--color-text-yellow:#e2c269;--color-text-muted:#7da8a5;--color-text-content:#c5e4e0;--color-text-highlight:#54e6b2;--color-text-subtle:#a2d8d2;--color-text-accent:#85f2c9;--color-border-primary:#2c8491;--color-border-secondary:#58c7e8;--color-border-muted:rgba(44,132,145,.48); position:relative;min-height:100vh;overflow:hidden;background:#081622;color:#daf8f1;font-family:'Departure Mono','Courier New',monospace; }
.pixel-quest-layout:before { content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.22;background:linear-gradient(90deg,rgba(44,132,145,.18) 50%,transparent 50%),linear-gradient(rgba(84,230,178,.1) 50%,transparent 50%);background-size:4px 4px; }
.world-pixels { position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none; }.quest-site-header,.quest-site-content,.quest-site-footer,.quest-contact,.cat-companion { position:relative;z-index:1; }.world-pixels i { position:absolute;width:4px;height:4px;background:#70dfff;box-shadow:4px 0 #70dfff,0 4px #70dfff,4px 4px #70dfff;animation-name:pixel-drift;animation-timing-function:steps(12,end);animation-iteration-count:infinite; }.world-pixels i:nth-child(3n){background:#ff6498;box-shadow:4px 0 #ff6498,0 4px #ff6498,4px 4px #ff6498}.world-pixels i:nth-child(4n){background:#ffdb6e;box-shadow:4px 0 #ffdb6e,0 4px #ffdb6e,4px 4px #ffdb6e}@keyframes pixel-drift{0%{opacity:.15;transform:translate3d(0,0,0)}22%{opacity:.95}60%{opacity:.6}100%{opacity:.1;transform:translate3d(var(--drift-x),var(--drift-y),0)}}
.pixel-cursor { position:fixed;z-index:10;left:0;top:0;width:27px;height:27px;pointer-events:none;opacity:0;transform:translate3d(-1px,-1px,0);transition:opacity .1s steps(1,end); }.pixel-cursor.visible { opacity:1; }.pixel-cursor i { position:absolute;left:0;top:0;width:3px;height:3px;background:#daf8f1;filter:drop-shadow(2px 2px 0 #081622);box-shadow:0 3px #daf8f1,3px 3px #daf8f1,0 6px #daf8f1,3px 6px #daf8f1,6px 6px #daf8f1,0 9px #daf8f1,3px 9px #daf8f1,6px 9px #daf8f1,9px 9px #daf8f1,0 12px #daf8f1,3px 12px #daf8f1,6px 12px #daf8f1,9px 12px #daf8f1,12px 12px #daf8f1,0 15px #daf8f1,3px 15px #daf8f1,6px 15px #daf8f1,9px 15px #daf8f1,0 18px #daf8f1,3px 18px #daf8f1,6px 18px #daf8f1,0 21px #daf8f1,3px 21px #daf8f1; }.pixel-cursor b { display:none; }@media (pointer:fine){.pixel-quest-layout,.pixel-quest-layout *{cursor:none!important}}
.quest-site-header { width:min(1120px,calc(100% - 36px));min-height:57px;margin:24px auto 0;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;gap:20px;border:4px solid #daf8f1;background:#102838;box-shadow:4px 4px 0 #2c8491,8px 8px 0 #081622;font-size:8px; }.quest-logo { color:#daf8f1;text-decoration:none;font-size:11px;white-space:nowrap; }.quest-logo span { color:#e2c269; }.quest-site-header nav { display:flex;gap:5px; }.quest-site-header nav a { padding:8px 9px;color:#bddbd7;text-decoration:none; }.quest-site-header nav a:hover,.quest-site-header nav a.active { color:#081622;background:#54e6b2; }
.quest-site-content { width:min(1120px,calc(100% - 36px));margin:34px auto 86px; }.page-hud { display:flex;justify-content:space-between;margin-bottom:17px;padding:11px 13px;border:3px solid #2c8491;background:#102838;color:#58c7e8;font-size:8px; }.page-hud b { color:#e2c269; }
.quest-contact { position:fixed;right:24px;bottom:25px;z-index:3;padding:14px 15px;border:3px solid #daf8f1;background:#ef7e99;color:#081622;box-shadow:4px 4px 0 #081622;font-size:8px;text-decoration:none; }.quest-contact:hover { transform:translate(2px,2px);box-shadow:2px 2px 0 #081622; }.quest-contact b { font-size:15px; }.cat-companion { position:fixed;z-index:2;right:22px;bottom:82px;display:flex;align-items:end;gap:5px;animation:cat-bob 2.6s steps(2,end) infinite; }.pixel-cat { position:relative;width:62px;height:52px;filter:drop-shadow(3px 3px 0 #081622); }.pixel-cat i { position:absolute;display:block; }.cat-ear { top:2px;width:13px;height:13px;background:#54e6b2; }.cat-ear.left { left:9px; }.cat-ear.right { right:9px; }.cat-head { top:10px;left:7px;width:48px;height:27px;background:#54e6b2;box-shadow:0 5px #54e6b2; }.cat-eye { top:20px;width:5px;height:5px;background:#081622;z-index:1;animation:cat-blink 3.2s steps(2,end) infinite; }.cat-eye.left { left:19px; }.cat-eye.right { right:19px; }.cat-nose { top:27px;left:29px;width:5px;height:4px;background:#ef7e99;z-index:1; }.cat-body { top:37px;left:18px;width:26px;height:10px;background:#58c7e8; }.cat-tail { top:34px;right:1px;width:12px;height:8px;background:#58c7e8;transform-origin:left bottom;animation:tail-swish 1.1s steps(2,end) infinite; }.cat-paw { top:45px;width:8px;height:5px;background:#daf8f1; }.cat-paw.left { left:19px; }.cat-paw.right { right:19px; }.cat-companion span { padding:5px;background:#e2c269;color:#081622;font-size:6px;box-shadow:2px 2px 0 #081622; }@keyframes cat-bob { 50% { transform:translateY(-6px) } }@keyframes tail-swish { 50% { transform:translateX(5px) } }@keyframes cat-blink { 96% { transform:scaleY(1) } 98% { transform:scaleY(.15) } }
.quest-site-footer { display:flex;align-items:center;justify-content:space-between;gap:15px;width:min(1120px,calc(100% - 36px));margin:0 auto;padding:16px 0 34px;border-top:3px solid #1d5360;color:#7da8a5;font-size:8px; }.quest-site-footer div { display:flex;gap:14px; }.quest-site-footer a { color:#58c7e8;text-decoration:none;font-size:16px; }.quest-site-footer a:hover { color:#54e6b2; }
:deep(.terminal-page) { font-family:'Departure Mono','Courier New',monospace; font-size:18px;font-weight:400;line-height:1.45;-webkit-font-smoothing:antialiased;background:transparent!important;color:var(--color-text-primary); }.pixel-quest-layout :deep(.terminal-page > *) { padding-left:0!important;padding-right:0!important; }.pixel-quest-layout :deep(.project-card),.pixel-quest-layout :deep(li.rounded-lg),.pixel-quest-layout :deep(.resume-section) { border-radius:0!important;border-width:3px!important;border-color:var(--color-border-primary)!important;background:var(--color-bg-secondary)!important;box-shadow:4px 4px 0 var(--color-bg-primary); }.pixel-quest-layout :deep(.rounded-lg),.pixel-quest-layout :deep(.rounded-md),.pixel-quest-layout :deep(.rounded-2xl),.pixel-quest-layout :deep(input),.pixel-quest-layout :deep(select),.pixel-quest-layout :deep(button),.pixel-quest-layout :deep(details) { border-radius:0!important; }.pixel-quest-layout :deep(input),.pixel-quest-layout :deep(select),.pixel-quest-layout :deep(button),.pixel-quest-layout :deep(details) { font-family:'Departure Mono','Courier New',monospace!important; }.pixel-quest-layout :deep(h2),.pixel-quest-layout :deep(h3) { font-family:'Pixelify Sans','Courier New',monospace!important;font-weight:400;letter-spacing:0; }.pixel-quest-layout :deep(.terminal-page h4) { font-weight:400;font-size:24px; }.pixel-quest-layout :deep(.terminal-page .role-title) { font-weight:400;font-size:20px; }.pixel-quest-layout :deep(.terminal-page .text-sm) { font-size:17px;line-height:1.45; }.pixel-quest-layout :deep(.terminal-page .text-xs) { font-size:15px;line-height:1.4; }.pixel-quest-layout :deep(.sticky) { background:var(--color-bg-primary)!important; }
@media (max-width:760px){.quest-site-header { margin-top:12px;min-height:48px;padding:10px; }.quest-logo{font-size:8px}.quest-site-header nav{gap:0}.quest-site-header nav a{padding:8px 6px;font-size:7px}.quest-site-content{margin-top:25px}.page-hud{font-size:7px}.quest-site-footer{flex-direction:column;gap:10px}}
</style>
