<script setup lang="ts">
import GameUI from './components/GameUI.vue';
import PhaserGame from './components/PhaserGame.vue';
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">SINGLE PLAYER / PHASE 02</p>
        <h1>今晚狼来了</h1>
      </div>
      <div class="runtime-status" aria-label="Phaser runtime status">
        <span class="status-dot" aria-hidden="true"></span>
        PHASER READY
      </div>
    </header>

    <GameUI>
      <PhaserGame />
    </GameUI>
  </main>
</template>
