import Phaser from 'phaser';
import { ECONOMY_CONFIG } from '../config/economy';
import { createEnemyConfig } from '../config/enemies';
import { WAVE_CONFIGS } from '../config/waves';
import { GameMap } from '../map/GameMap';
import { tileKey } from '../map/Tile';
import { Enemy } from '../entities/Enemy';
import type { ProjectileHit } from '../entities/Projectile';
import { Sheep } from '../entities/Sheep';
import { Tower } from '../entities/Tower';
import { Wall } from '../entities/Wall';
import { gameStore } from '../../stores/gameStore';
import {
  TileType,
  type BuildSelection,
  type GameCommand,
  type GridPosition,
  type TargetStrategy,
  type WaveSpawnGroup,
  type WorldPosition,
} from '../types';
import { CombatSystem } from '../systems/CombatSystem';
import { Pathfinding } from '../systems/Pathfinding';
import { PlacementSystem } from '../systems/PlacementSystem';
import { WaveSystem } from '../systems/WaveSystem';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILE_SIZE = 40;
const MAP_ORIGIN: WorldPosition = { x: 80, y: 20 };

export class GameScene extends Phaser.Scene {
  private readonly towers = new Map<string, Tower>();
  private readonly enemies = new Map<string, Enemy>();
  private readonly walls = new Map<string, Wall>();
  private map!: GameMap;
  private pathfinding!: Pathfinding;
  private placementSystem!: PlacementSystem;
  private waveSystem!: WaveSystem;
  private combatSystem!: CombatSystem;
  private sheep!: Sheep;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private unsubscribeCommands?: () => void;
  private nextEnemyId = 1;
  private nextTowerId = 1;

  public constructor() {
    super('GameScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0d1b16');
    this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
    this.pathfinding = new Pathfinding();
    this.placementSystem = new PlacementSystem(this.map, this.pathfinding);
    this.waveSystem = new WaveSystem(WAVE_CONFIGS, ECONOMY_CONFIG.interWaveDelay);
    this.combatSystem = new CombatSystem(this, {
      onProjectileHit: (hit) => this.handleProjectileHit(hit),
    });
    this.previewGraphics = this.add.graphics().setDepth(5);
    this.unsubscribeCommands = gameStore.subscribe((command) => this.handleCommand(command));

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    this.events.once('shutdown', () => this.shutdownScene());

    this.resetSession();
  }

  public update(_time: number, delta: number): void {
    if (gameStore.state.phase !== 'playing') {
      return;
    }

    const deltaSeconds = Math.min(delta / 1000, 0.05);
    this.waveSystem.update(
      deltaSeconds,
      this.getActiveEnemyCount(),
      (group) => this.spawnEnemy(group),
      (wave) => {
        gameStore.setWave(wave);
        gameStore.notify(`第 ${wave} 波开始`);
      },
      () => this.handleVictory(),
    );

    for (const enemy of this.enemies.values()) {
      if (!enemy.isTargetable) {
        continue;
      }

      for (const tick of enemy.updateEffects(deltaSeconds)) {
        this.damageEnemy(enemy, tick.amount, 'poison', 0xb96de0);
      }
      if (!enemy.isTargetable) {
        continue;
      }

      const nextTile = enemy.getNextTile();
      const nextTileData = nextTile ? this.map.getTile(nextTile) : undefined;
      if (enemy.canBreakWalls && nextTile && nextTileData?.type === TileType.WALL) {
        if (enemy.tryWallAttack(deltaSeconds)) {
          this.damageWall(nextTile, enemy.wallDamage);
        }
        continue;
      }

      if (enemy.updateMovement(deltaSeconds, (position) => this.map.gridToWorld(position, MAP_ORIGIN, TILE_SIZE)) === 'reached-target') {
        this.enemyReachedSheep(enemy);
      }
    }

    this.combatSystem.update(deltaSeconds, [...this.towers.values()], [...this.enemies.values()]);
    this.syncUiState();
  }

  private handleCommand(command: GameCommand): void {
    switch (command.type) {
      case 'start':
        if (gameStore.state.phase === 'ready') {
          this.startSession();
        }
        break;
      case 'restart':
        this.startSession();
        break;
      case 'toggle-pause':
        if (gameStore.state.phase === 'playing') {
          gameStore.setPhase('paused');
          gameStore.notify('游戏已暂停');
        } else if (gameStore.state.phase === 'paused') {
          gameStore.setPhase('playing');
          gameStore.notify('继续防守');
        }
        break;
      case 'upgrade-tower':
        if (command.towerId) {
          this.upgradeTower(command.towerId);
        }
        break;
      case 'sell-tower':
        if (command.towerId) {
          this.sellTower(command.towerId);
        }
        break;
      case 'set-target-strategy':
        if (command.towerId && command.strategy) {
          this.setTowerStrategy(command.towerId, command.strategy);
        }
        break;
    }
  }

  private startSession(): void {
    this.resetSession();
    this.waveSystem.start();
    gameStore.setPhase('playing');
    gameStore.setWave(1);
    gameStore.notify('布置防线，狼群即将到来');
  }

  private resetSession(): void {
    for (const tower of this.towers.values()) {
      tower.destroy();
    }
    for (const wall of this.walls.values()) {
      wall.destroy();
    }
    for (const enemy of this.enemies.values()) {
      enemy.destroy();
    }
    this.towers.clear();
    this.walls.clear();
    this.enemies.clear();
    this.combatSystem.clear();
    this.waveSystem.stop();
    this.map.reset();
    this.map.drawGround(this, MAP_ORIGIN, TILE_SIZE);
    this.sheep?.destroy();
    this.sheep = new Sheep(this, this.map.gridToWorld(this.map.getTarget(), MAP_ORIGIN, TILE_SIZE), ECONOMY_CONFIG.sheepMaxHp);
    this.nextEnemyId = 1;
    this.nextTowerId = 1;
    this.clearSelectionVisuals();
    this.previewGraphics.clear();
    gameStore.reset();
    gameStore.setGold(ECONOMY_CONFIG.initialGold);
    gameStore.setSheepHp(ECONOMY_CONFIG.sheepMaxHp, ECONOMY_CONFIG.sheepMaxHp);
    gameStore.setAliveEnemies(0);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const selection = gameStore.state.selectedBuild;
    this.previewGraphics.clear();
    if (!selection || gameStore.state.phase !== 'playing') {
      return;
    }
    this.clearSelectionVisuals();
    const position = this.getGridPosition(pointer);
    const result = this.placementSystem.validate(selection, position, gameStore.state.gold, true);
    if (!position || !this.map.isInside(position)) {
      return;
    }
    const x = MAP_ORIGIN.x + position.x * TILE_SIZE;
    const y = MAP_ORIGIN.y + position.y * TILE_SIZE;
    this.previewGraphics.fillStyle(result.allowed ? 0x72d38d : 0xeb5757, 0.32);
    this.previewGraphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    this.previewGraphics.lineStyle(2, result.allowed ? 0x9af0ae : 0xff8b8b, 0.95);
    this.previewGraphics.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (gameStore.state.phase !== 'playing') {
      return;
    }
    const position = this.getGridPosition(pointer);
    if (!position) {
      return;
    }
    const tile = this.map.getTile(position);
    if (tile?.type === TileType.TOWER && tile.towerId) {
      this.selectTower(tile.towerId);
      return;
    }

    const selection = gameStore.state.selectedBuild;
    if (!selection) {
      this.clearTowerSelection();
      return;
    }
    this.placeBuilding(selection, position);
  }

  private placeBuilding(selection: BuildSelection, position: GridPosition): void {
    const result = this.placementSystem.validate(selection, position, gameStore.state.gold, true);
    if (!result.allowed) {
      gameStore.notify(this.placementSystem.getReasonText(result.reason));
      return;
    }

    gameStore.setGold(gameStore.state.gold - result.cost);
    if (selection.kind === 'wall') {
      this.map.applyBuilding(position, TileType.WALL, undefined, ECONOMY_CONFIG.wallMaxHp);
      this.walls.set(tileKey(position.x, position.y), new Wall(this, position, MAP_ORIGIN, TILE_SIZE, ECONOMY_CONFIG.wallMaxHp));
      gameStore.notify('墙已建造');
    } else {
      const towerId = `tower-${this.nextTowerId++}`;
      this.map.applyBuilding(position, TileType.TOWER, towerId);
      const tower = new Tower(
        this,
        towerId,
        selection.towerId,
        position,
        this.map.gridToWorld(position, MAP_ORIGIN, TILE_SIZE),
      );
      this.towers.set(towerId, tower);
      gameStore.notify(`${tower.getPanelData(ECONOMY_CONFIG.sellRate).name} 已建造`);
    }
    this.map.drawGround(this, MAP_ORIGIN, TILE_SIZE);
    this.repathAllEnemies();
    this.previewGraphics.clear();
  }

  private selectTower(towerId: string): void {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return;
    }
    this.towers.forEach((item) => item.setSelected(item.id === towerId));
    gameStore.selectTower(tower.getPanelData(ECONOMY_CONFIG.sellRate));
  }

  private clearTowerSelection(): void {
    this.clearSelectionVisuals();
    gameStore.selectTower(null);
  }

  private clearSelectionVisuals(): void {
    this.towers.forEach((tower) => tower.setSelected(false));
  }

  private upgradeTower(towerId: string): void {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return;
    }
    const next = tower.getNextUpgrade();
    if (!next) {
      gameStore.notify('这座塔已达到最高等级');
      return;
    }
    if (gameStore.state.gold < next.cost) {
      gameStore.notify('金币不足');
      return;
    }
    gameStore.setGold(gameStore.state.gold - next.cost);
    tower.upgrade();
    gameStore.selectTower(tower.getPanelData(ECONOMY_CONFIG.sellRate));
    gameStore.notify(`${tower.getPanelData(ECONOMY_CONFIG.sellRate).name} 升至 Lv${tower.currentLevel}`);
  }

  private sellTower(towerId: string): void {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return;
    }
    const refund = tower.getPanelData(ECONOMY_CONFIG.sellRate).sellValue;
    this.map.removeBuilding(tower.position);
    tower.destroy();
    this.towers.delete(towerId);
    gameStore.addGold(refund);
    gameStore.selectTower(null);
    this.map.drawGround(this, MAP_ORIGIN, TILE_SIZE);
    this.repathAllEnemies();
    gameStore.notify(`已出售，返还 ${refund} 金币`);
  }

  private setTowerStrategy(towerId: string, strategy: TargetStrategy): void {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return;
    }
    tower.setTargetStrategy(strategy);
    gameStore.selectTower(tower.getPanelData(ECONOMY_CONFIG.sellRate));
  }

  private spawnEnemy(group: WaveSpawnGroup): void {
    const config = createEnemyConfig(group.enemyId, group.elite);
    const spawn = this.map.getSpawn();
    const path = this.pathfinding.findPath(this.map, spawn, this.map.getTarget(), config.abilities?.includes('break-walls') ?? false);
    if (!path) {
      gameStore.notify('路线暂时无法生成');
      return;
    }
    const enemy = new Enemy(
      this,
      `enemy-${this.nextEnemyId++}`,
      config,
      spawn,
      path,
      (position) => this.map.gridToWorld(position, MAP_ORIGIN, TILE_SIZE),
    );
    this.enemies.set(enemy.id, enemy);
  }

  private repathAllEnemies(): void {
    for (const enemy of this.enemies.values()) {
      if (!enemy.isTargetable) {
        continue;
      }
      const position = this.map.worldToGrid(enemy.getWorldPosition(), MAP_ORIGIN, TILE_SIZE) ?? this.map.getSpawn();
      const path = this.pathfinding.findPath(
        this.map,
        position,
        this.map.getTarget(),
        enemy.canBreakWalls,
      );
      if (path) {
        enemy.setPath(path);
      }
    }
  }

  private handleProjectileHit(hit: ProjectileHit): void {
    if (!hit.target.isTargetable) {
      return;
    }
    this.damageEnemy(hit.target, hit.damage, hit.damageType, hit.color);
    for (const effect of hit.effects) {
      hit.target.applyEffect(effect);
    }

    if (hit.special.freezeChance && Math.random() < hit.special.freezeChance) {
      hit.target.applyEffect({ id: 'freeze', duration: 0.7 });
    }

    if (hit.attackType === 'aoe') {
      for (const enemy of this.enemies.values()) {
        if (enemy === hit.target || !enemy.isTargetable) {
          continue;
        }
        const position = enemy.getWorldPosition();
        const distance = Math.hypot(position.x - hit.impactPoint.x, position.y - hit.impactPoint.y);
        if (distance <= hit.aoeRadius) {
          this.damageEnemy(enemy, Math.round(hit.damage * 0.55), 'physical', hit.color);
        }
      }
    }

    if (hit.special.poisonSpreadRadius) {
      for (const enemy of this.enemies.values()) {
        if (enemy === hit.target || !enemy.isTargetable) {
          continue;
        }
        const position = enemy.getWorldPosition();
        if (Math.hypot(position.x - hit.impactPoint.x, position.y - hit.impactPoint.y) <= hit.special.poisonSpreadRadius) {
          hit.effects.filter((effect) => effect.id === 'poison').forEach((effect) => enemy.applyEffect(effect));
        }
      }
    }
    this.showImpact(hit.impactPoint, hit.color, hit.attackType === 'aoe' ? hit.aoeRadius : 18);
  }

  private damageEnemy(enemy: Enemy, amount: number, type: 'physical' | 'poison', color: number): void {
    const actualDamage = enemy.takeDamage(amount, type);
    if (actualDamage <= 0) {
      return;
    }
    this.showDamageNumber(enemy.getWorldPosition(), actualDamage, color);
    if (!enemy.isTargetable) {
      this.enemyKilled(enemy);
    }
  }

  private enemyKilled(enemy: Enemy): void {
    if (enemy.isDying) {
      return;
    }
    gameStore.addGold(enemy.reward);
    this.showImpact(enemy.getWorldPosition(), 0xf4f1e8, 24);
    enemy.beginDeath(() => {
      enemy.destroy();
      this.enemies.delete(enemy.id);
      this.syncUiState();
    });
  }

  private enemyReachedSheep(enemy: Enemy): void {
    if (!enemy.isTargetable) {
      return;
    }
    const hp = this.sheep.damage(enemy.damage);
    enemy.beginDeath(() => {
      enemy.destroy();
      this.enemies.delete(enemy.id);
      this.syncUiState();
    });
    gameStore.notify(`${enemy.config.name} 撞击羊圈 -${enemy.damage}`);
    if (hp <= 0) {
      this.handleGameOver();
    }
  }

  private damageWall(position: GridPosition, amount: number): void {
    const wall = this.walls.get(tileKey(position.x, position.y));
    if (!wall) {
      return;
    }
    const destroyed = wall.damage(amount);
    this.showDamageNumber(this.map.gridToWorld(position, MAP_ORIGIN, TILE_SIZE), amount, 0xf2994a);
    this.map.damageWall(position, amount);
    if (destroyed) {
      wall.destroy();
      this.walls.delete(tileKey(position.x, position.y));
      this.map.drawGround(this, MAP_ORIGIN, TILE_SIZE);
      this.repathAllEnemies();
      gameStore.notify('拆墙狼摧毁了一面墙');
    }
  }

  private handleVictory(): void {
    if (gameStore.state.phase !== 'playing') {
      return;
    }
    this.previewGraphics.clear();
    this.clearTowerSelection();
    this.combatSystem.clear();
    gameStore.setPhase('victory');
    gameStore.notify('全部波次完成');
  }

  private handleGameOver(): void {
    if (gameStore.state.phase === 'game-over') {
      return;
    }
    this.waveSystem.stop();
    this.previewGraphics.clear();
    this.clearTowerSelection();
    this.combatSystem.clear();
    gameStore.setPhase('game-over');
    gameStore.notify('羊圈失守');
  }

  private getGridPosition(pointer: Phaser.Input.Pointer): GridPosition | null {
    return this.map.worldToGrid({ x: pointer.worldX, y: pointer.worldY }, MAP_ORIGIN, TILE_SIZE);
  }

  private getActiveEnemyCount(): number {
    return [...this.enemies.values()].filter((enemy) => enemy.isTargetable).length;
  }

  private syncUiState(): void {
    gameStore.setSheepHp(this.sheep.currentHp, ECONOMY_CONFIG.sheepMaxHp);
    gameStore.setAliveEnemies(this.getActiveEnemyCount());
  }

  private showDamageNumber(position: WorldPosition, amount: number, color: number): void {
    const text = this.add.text(position.x, position.y - 16, `-${Math.round(amount)}`, {
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#10201c',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(24);
    this.tweens.add({
      targets: text,
      y: position.y - 42,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private showImpact(position: WorldPosition, color: number, radius: number): void {
    const ring = this.add.circle(position.x, position.y, Math.max(5, radius * 0.25), color, 0.22).setDepth(22);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.destroy(),
    });
  }

  private shutdownScene(): void {
    this.unsubscribeCommands?.();
    this.unsubscribeCommands = undefined;
    this.combatSystem?.clear();
    this.map?.destroy();
  }
}
