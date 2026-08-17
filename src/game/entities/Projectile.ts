import Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { TowerEffectConfig, TowerSpecialConfig, DamageType, WorldPosition } from '../types';

export interface TowerAttackSpec {
  towerId: string;
  target: Enemy;
  source: WorldPosition;
  damage: number;
  damageType: DamageType;
  speed: number;
  color: number;
  attackType: 'single' | 'aoe';
  aoeRadius: number;
  effects: TowerEffectConfig[];
  special: TowerSpecialConfig;
}

export interface ProjectileHit extends TowerAttackSpec {
  impactPoint: WorldPosition;
}

export class Projectile {
  private readonly container: Phaser.GameObjects.Container;
  private active = true;

  public constructor(scene: Phaser.Scene, private readonly spec: TowerAttackSpec) {
    this.container = scene.add.container(spec.source.x, spec.source.y).setDepth(16);
    const radius = spec.attackType === 'aoe' ? 7 : 4;
    const core = scene.add.circle(0, 0, radius, spec.color);
    const highlight = scene.add.circle(-1, -1, Math.max(1.5, radius / 3), 0xffffff, 0.75);
    this.container.add([core, highlight]);
  }

  public get isActive(): boolean {
    return this.active;
  }

  public update(deltaSeconds: number): ProjectileHit | null {
    if (!this.active) {
      return null;
    }
    if (!this.spec.target.isTargetable) {
      this.destroy();
      return null;
    }

    const target = this.spec.target.getWorldPosition();
    const dx = target.x - this.container.x;
    const dy = target.y - this.container.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const step = this.spec.speed * deltaSeconds;
    if (distance <= step + 6) {
      this.container.setPosition(target.x, target.y);
      this.destroy();
      return { ...this.spec, impactPoint: target };
    }

    this.container.x += (dx / distance) * step;
    this.container.y += (dy / distance) * step;
    return null;
  }

  public destroy(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.container.destroy(true);
  }
}
