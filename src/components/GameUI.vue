<script setup lang="ts">
import { computed } from 'vue';
import { ECONOMY_CONFIG } from '../game/config/economy';
import { TOWER_LIST } from '../game/config/towers';
import { gameStore } from '../stores/gameStore';
import type { TargetStrategy, TowerEffectConfig } from '../game/types';

const state = gameStore.state;
const strategies: Array<{ id: TargetStrategy; label: string }> = [
  { id: 'first', label: '最前' },
  { id: 'nearest', label: '最近' },
  { id: 'strongest', label: '最强' },
  { id: 'weakest', label: '最弱' },
];

const isPlaying = computed(() => state.phase === 'playing' || state.phase === 'paused');
const sheepRatio = computed(() => `${Math.max(0, Math.round((state.sheepHp / Math.max(1, state.sheepMaxHp)) * 100))}%`);
const selectedBuildKey = computed(() => {
  if (!state.selectedBuild) {
    return '';
  }
  return state.selectedBuild.kind === 'wall' ? 'wall' : state.selectedBuild.towerId;
});

function selectTower(towerId: (typeof TOWER_LIST)[number]['id']): void {
  gameStore.selectBuild({ kind: 'tower', towerId });
}

function selectWall(): void {
  gameStore.selectBuild({ kind: 'wall' });
}

function clearBuildSelection(): void {
  gameStore.selectBuild(null);
}

function effectLabel(effect: TowerEffectConfig): string {
  if (effect.id === 'slow') {
    return `减速 ${Math.round((1 - effect.multiplier) * 100)}% / ${effect.duration}s`;
  }
  if (effect.id === 'poison') {
    return `中毒 ${effect.damagePerSecond}/秒 / ${effect.duration}s`;
  }
  return `冻结 ${effect.duration}s`;
}

function strategyLabel(strategy: TargetStrategy): string {
  return strategies.find((item) => item.id === strategy)?.label ?? '最前';
}
</script>

<template>
  <div class="game-ui">
    <header class="game-hud">
      <div class="hud-stat sheep-stat">
        <div class="stat-heading">
          <span>羊圈</span>
          <strong>{{ state.sheepHp }}/{{ state.sheepMaxHp }}</strong>
        </div>
        <div class="meter"><span :style="{ width: sheepRatio }"></span></div>
      </div>
      <div class="hud-stat">
        <span class="stat-label">金币</span>
        <strong class="gold-value">{{ state.gold }}</strong>
      </div>
      <div class="hud-stat">
        <span class="stat-label">波次</span>
        <strong>{{ state.wave }}/{{ state.totalWaves }}</strong>
      </div>
      <div class="hud-stat enemy-stat">
        <span class="stat-label">场上敌人</span>
        <strong>{{ state.aliveEnemies }}</strong>
      </div>
      <button
        class="pause-button"
        type="button"
        :disabled="!isPlaying"
        :aria-label="state.phase === 'paused' ? '继续游戏' : '暂停游戏'"
        @click="gameStore.togglePause"
      >
        {{ state.phase === 'paused' ? '继续' : '暂停' }}
      </button>
    </header>

    <section class="stage-frame" aria-label="Phaser 游戏区域">
      <slot />

      <div v-if="state.phase === 'ready'" class="game-overlay">
        <div class="overlay-content">
          <p class="overlay-kicker">PHASE 02 / DEFENSE PROTOCOL</p>
          <h2>布置防线</h2>
          <p>选择建筑，改变狼群的路线。</p>
          <button class="primary-button" type="button" @click="gameStore.start">开始防守</button>
        </div>
      </div>

      <div v-else-if="state.phase === 'paused'" class="game-overlay compact-overlay">
        <div class="overlay-content">
          <p class="overlay-kicker">SIMULATION PAUSED</p>
          <h2>游戏已暂停</h2>
          <button class="primary-button" type="button" @click="gameStore.togglePause">继续防守</button>
        </div>
      </div>

      <div v-else-if="state.phase === 'game-over' || state.phase === 'victory'" class="game-overlay">
        <div class="overlay-content">
          <p class="overlay-kicker">{{ state.phase === 'victory' ? 'DEFENSE COMPLETE' : 'DEFENSE FAILED' }}</p>
          <h2>{{ state.phase === 'victory' ? '羊村守住了' : '羊圈失守' }}</h2>
          <p>{{ state.phase === 'victory' ? '十波狼群已全部击退。' : '重新布置防线，再试一次。' }}</p>
          <button class="primary-button" type="button" @click="gameStore.restart">重新开始</button>
        </div>
      </div>

      <aside v-if="state.selectedTower" class="tower-inspector" aria-label="防御塔信息">
        <div class="inspector-heading">
          <div>
            <p class="inspector-kicker">TOWER INSPECTOR</p>
            <h3>{{ state.selectedTower.name }} <span>Lv{{ state.selectedTower.level }}</span></h3>
          </div>
          <button class="icon-button" type="button" title="关闭信息面板" aria-label="关闭信息面板" @click="gameStore.selectTower(null)">×</button>
        </div>
        <dl class="tower-stats">
          <div><dt>伤害</dt><dd>{{ state.selectedTower.damage }}</dd></div>
          <div><dt>范围</dt><dd>{{ state.selectedTower.range }}</dd></div>
          <div><dt>攻速</dt><dd>{{ state.selectedTower.attackSpeed.toFixed(1) }}</dd></div>
        </dl>
        <div v-if="state.selectedTower.effects.length" class="effect-list">
          <span v-for="effect in state.selectedTower.effects" :key="effect.id">{{ effectLabel(effect) }}</span>
        </div>
        <div class="strategy-block">
          <span class="field-label">攻击目标</span>
          <div class="strategy-buttons">
            <button
              v-for="strategy in strategies"
              :key="strategy.id"
              class="strategy-button"
              :class="{ active: state.selectedTower.targetStrategy === strategy.id }"
              type="button"
              @click="gameStore.setTargetStrategy(state.selectedTower.id, strategy.id)"
            >
              {{ strategy.label }}
            </button>
          </div>
          <span class="current-strategy">当前：{{ strategyLabel(state.selectedTower.targetStrategy) }}</span>
        </div>
        <div class="inspector-actions">
          <button
            class="upgrade-button"
            type="button"
            :disabled="state.selectedTower.nextUpgradeCost === null || state.gold < (state.selectedTower.nextUpgradeCost ?? 0)"
            @click="gameStore.upgradeTower(state.selectedTower.id)"
          >
            <span>{{ state.selectedTower.nextUpgradeCost === null ? '已达最高等级' : `升级至 Lv${state.selectedTower.level + 1}` }}</span>
            <small v-if="state.selectedTower.nextUpgradeCost !== null">{{ state.selectedTower.nextUpgradeCost }} G</small>
          </button>
          <button class="sell-button" type="button" @click="gameStore.sellTower(state.selectedTower.id)">
            出售 <small>+{{ state.selectedTower.sellValue }} G</small>
          </button>
        </div>
      </aside>
    </section>

    <footer class="build-toolbar">
      <div class="toolbar-heading">
        <span class="section-label">BUILD MENU</span>
        <button v-if="state.selectedBuild" class="clear-build" type="button" @click="clearBuildSelection">取消选择</button>
      </div>
      <div class="build-buttons">
        <button
          v-for="tower in TOWER_LIST"
          :key="tower.id"
          class="build-button"
          :class="{ active: selectedBuildKey === tower.id }"
          type="button"
          :disabled="state.phase !== 'playing' || state.gold < tower.cost"
          :title="`${tower.name}：${tower.cost} 金币`"
          @click="selectTower(tower.id)"
        >
          <span class="build-swatch" :style="{ backgroundColor: `#${tower.color.toString(16).padStart(6, '0')}` }"></span>
          <span class="build-copy"><strong>{{ tower.name }}</strong><small>{{ tower.cost }} G</small></span>
        </button>
        <button
          class="build-button wall-button"
          :class="{ active: selectedBuildKey === 'wall' }"
          type="button"
          :disabled="state.phase !== 'playing' || state.gold < ECONOMY_CONFIG.wallCost"
          :title="`墙：${ECONOMY_CONFIG.wallCost} 金币`"
          @click="selectWall"
        >
          <span class="build-swatch wall-swatch"></span>
          <span class="build-copy"><strong>墙</strong><small>{{ ECONOMY_CONFIG.wallCost }} G</small></span>
        </button>
      </div>
    </footer>

    <div v-if="state.notification" class="notification" role="status">{{ state.notification }}</div>
  </div>
</template>
