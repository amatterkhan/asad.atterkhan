<script setup>
import TerminalOutput from '@/components/TerminalOutput.vue'
import TerminalCommands from '@/components/TerminalCommands.vue'
import PixelQuestHome from '@/components/prototype/PixelQuestHome.vue'

const isDev = import.meta.env.DEV
</script>

<template>
    <!-- PROTOTYPE: Pixel Quest is the selected local development direction. -->
    <PixelQuestHome v-if="isDev" />
    <div v-else class="terminal-home w-full h-full flex flex-col">
        <!-- Terminal Output -->
        <TerminalOutput />
        
        <!-- Terminal Commands -->
        <TerminalCommands />
    </div>
</template>

<style scoped>
.terminal-home {
    font-family: 'JetBrains Mono', 'Share Tech Mono', 'Courier New', monospace;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    width: 100%;
    height: 100%;
}

.terminal-output {
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-family: 'JetBrains Mono', monospace;
    line-height: 1.6;
    width: 100%;
}

.terminal-command-btn {
    font-family: 'JetBrains Mono', monospace;
    text-decoration: none;
    transition: all 0.2s ease;
}

.terminal-command-btn:hover {
    box-shadow: 0 0 10px currentColor;
}

.terminal-cursor {
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .terminal-commands {
        padding: 1rem;
    }
    
    .terminal-command-btn {
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem;
    }
}

@media (max-width: 480px) {
    .terminal-output {
        font-size: 0.75rem;
        padding: 0.75rem;
    }
    
    .terminal-commands {
        padding: 0.75rem;
    }
    
    .terminal-command-btn {
        font-size: 0.75rem;
        padding: 0.375rem 0.5rem;
    }
}
</style>
