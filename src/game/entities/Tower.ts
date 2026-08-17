import Phaser from 'phaser';
import { TOWER_CONFIGS } from '../config/towers';
import { selectTarget } from '../systems/TargetingSystem';
import type {
  GridPosition,
  TargetStrategy,
  TowerConfig,
  TowerEffectConfig,
  TowerPanelData,
  TowerSpecialConfig,
  TowerStats,
  TowerUpgradeConfig,
  TowerId,
  WorldPosition,
} from '../types';
import type { Enemy } from './Enemy';
import type { TowerAttackSpec } from './Projectile';

export class Tower {
  private readonly container: Phaser.GameObjects.Container;
  private readonly visual: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private level = 1;
  private cooldown = 0;
  private selected = false;
  private targetStrategy: TargetStrategy = 'first';
  private totalInvested: number;

  public constructor(
    scene: Phaser.Scene,
    public readonly id: string,
    public readonly towerId: TowerId,
    public readonly position: GridPosition,
    private readonly world: WorldPosition,
    private readonly config: TowerConfig = TOWER_CONFIGS[towerId],
  ) {
    this.totalInvested = config.cost;
    this.container = scene.add.container(world.x, world.y).setDepth(8);
    this.visual = scene.add.graphics();
    this.label = scene.add.text(0, 0, config.shortName, {
      color: '#10201c',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([this.visual, this.label]);
    this.redraw();
  }

  public get currentLevel(): number {
    return this.level;
  }

  public get isSelected(): boolean {
    return this.selected;
  }

  public getWorldPosition(): WorldPosition {
    return this.world;
  }

  public getStats(): TowerStats {
    const stats: TowerStats = {
      damage: this.config.damage,
      range: this.config.range,
      attackSpeed: this.config.attackSpeed,
      projectileSpeed: this.config.projectileSpeed,
      attackType: this.config.attackType,
      aoeRadius: this.config.aoeRadius ?? 0,
      effects: this.cloneEffects(this.config.effects ?? []),
      special: { ...(this.config.special ?? {}) },
    };

    for (const upgrade of this.config.upgradeLevels) {
      if (upgrade.level > this.level) {
        break;
      }
      this.applyUpgradeStats(stats, upgrade);
    }
    return stats;
  }

  public getNextUpgrade(): TowerUpgradeConfig | undefined {
    return this.config.upgradeLevels.find((upgrade) => upgrade.level === this.level + 1);
  }

  public getPanelData(sellRate: number): TowerPanelData {
    const stats = this.getStats();
    const nextUpgrade = this.getNextUpgrade();
    return {
      id: this.id,
      towerId: this.towerId,
      name: this.config.name,
      level: this.level,
      maxLevel: this.config.upgradeLevels.length + 1,
      damage: stats.damage,
      range: stats.range,
      attackSpeed: stats.attackSpeed,
      effects: this.cloneEffects(stats.effects),
      targetStrategy: this.targetStrategy,
      nextUpgradeCost: nextUpgrade?.cost ?? null,
      totalInvested: this.totalInvested,
      sellValue: Math.floor(this.totalInvested * sellRate),
      position: { ...this.position },
    };
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    this.redraw();
  }

  public setTargetStrategy(strategy: TargetStrategy): void {
    this.targetStrategy = strategy;
  }

  public upgrade(): boolean {
    const next = this.getNextUpgrade();
    if (!next) {
      return false;
    }
    this.level = next.level;
    this.totalInvested += next.cost;
    this.redraw();
    return true;
  }

  public update(
    deltaSeconds: number,
    enemies: Enemy[],
    onAttack: (spec: TowerAttackSpec) => void,
  ): void {
    this.cooldown -= deltaSeconds;
    if (this.cooldown > 0) {
      return;
    }

    const stats = this.getStats();
    const target = selectTarget(this.world, enemies, this.targetStrategy, stats.range);
    if (!target) {
      return;
    }

    this.cooldown = 1 / stats.attackSpeed;
    const createSpec = (): TowerAttackSpec => ({
      towerId: this.id,
      target,
      source: { ...this.world },
      damage: stats.damage,
      damageType: stats.effects.some((effect) => effect.id === 'poison') ? 'physical' : 'physical',
      speed: stats.projectileSpeed,
      color: this.config.projectileColor,
      attackType: stats.attackType,
      aoeRadius: stats.aoeRadius,
      effects: this.cloneEffects(stats.effects),
      special: { ...stats.special },
    });
    onAttack(createSpec());
    if (stats.special.doubleShotChance && Math.random() < stats.special.doubleShotChance) {
      onAttack(createSpec());
    }
    this.playAttackFeedback();
  }

  public destroy(): void {
    this.container.destroy(true);
  }

  private applyUpgradeStats(stats: TowerStats, upgrade: TowerUpgradeConfig): void {
    if (upgrade.damage !== undefined) stats.damage = upgrade.damage;
    if (upgrade.range !== undefined) stats.range = upgrade.range;
    if (upgrade.attackSpeed !== undefined) stats.attackSpeed = upgrade.attackSpeed;
    if (upgrade.projectileSpeed !== undefined) stats.projectileSpeed = upgrade.projectileSpeed;
    if (upgrade.aoeRadius !== undefined) stats.aoeRadius = upgrade.aoeRadius;
    if (upgrade.effects !== undefined) stats.effects = this.cloneEffects(upgrade.effects);
    if (upgrade.special !== undefined) stats.special = { ...stats.special, ...upgrade.special };
  }

  private cloneEffects(effects: TowerEffectConfig[]): TowerEffectConfig[] {
    return effects.map((effect) => ({ ...effect }));
  }

  private redraw(): void {
    this.visual.clear();
    if (this.selected) {
      this.visual.lineStyle(3, 0xf4f1e8, 0.95);
      this.visual.strokeCircle(0, 0, 21);
    }
    this.visual.fillStyle(this.config.color, 1);
    this.visual.fillRoundedRect(-16, -16, 32, 32, 6);
    this.visual.lineStyle(2, 0x10201c, 0.9);
    this.visual.strokeRoundedRect(-16, -16, 32, 32, 6);
  }

  private playAttackFeedback(): void {
    this.container.scene.tweens.add({
      targets: this.container,
      scale: 1.18,
      duration: 70,
      yoyo: true,
    });
  }
}
