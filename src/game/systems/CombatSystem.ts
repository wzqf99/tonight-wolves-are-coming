import Phaser from 'phaser';
import type { GridPosition, WorldPosition } from '../types';
import type { Enemy } from '../entities/Enemy';
import { Projectile, type ProjectileHit } from '../entities/Projectile';
import type { Tower } from '../entities/Tower';

export interface CombatCallbacks {
  onProjectileHit: (hit: ProjectileHit) => void;
}

export class CombatSystem {
  private readonly projectiles: Projectile[] = [];

  public constructor(private readonly scene: Phaser.Scene, private readonly callbacks: CombatCallbacks) {}

  public update(deltaSeconds: number, towers: Tower[], enemies: Enemy[]): void {
    const activeEnemies = enemies.filter((enemy) => enemy.isTargetable);
    for (const tower of towers) {
      tower.update(deltaSeconds, activeEnemies, (spec) => {
        this.projectiles.push(new Projectile(this.scene, spec));
      });
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      const hit = projectile.update(deltaSeconds);
      if (hit) {
        this.callbacks.onProjectileHit(hit);
      }
      if (!projectile.isActive) {
        this.projectiles.splice(index, 1);
      }
    }
  }

  public clear(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles.length = 0;
  }

  public get projectileCount(): number {
    return this.projectiles.length;
  }
}
