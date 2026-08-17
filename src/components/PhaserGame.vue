<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Phaser from 'phaser';
import { GameScene } from '../game/scenes/GameScene';

const gameContainer = ref<HTMLDivElement | null>(null);
let game: Phaser.Game | undefined;

onMounted(() => {
  if (!gameContainer.value) {
    return;
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameContainer.value,
    width: 960,
    height: 640,
    backgroundColor: '#10201c',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 640,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
});

onUnmounted(() => {
  game?.destroy(true);
  game = undefined;
});
</script>

<template>
  <div ref="gameContainer" class="phaser-host"></div>
</template>
