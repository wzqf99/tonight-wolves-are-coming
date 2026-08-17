import Phaser from 'phaser';
import { StatusEffectSystem, type StatusDamageTick } from '../systems/StatusEffectSystem';
import type {
  DamageType,
  EnemyConfig,
  GridPosition,
  TowerEffectConfig,
  WorldPosition,
} from '../types';

export type EnemyMovementResult = 'moving' | 'reached-target';

export class Enemy {
  private readonly container: Phaser.GameObjects.Container;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly statusLabel: Phaser.GameObjects.Text;
  private readonly statusEffects = new StatusEffectSystem();
  private path: GridPosition[];
  private pathIndex = 0;
  private hp: number;
  private wallAttackTimer = 0;
  private dying = false;
  private destroyed = false;

  public constructor(
    scene: Phaser.Scene,
    public readonly id: string,
    public readonly config: EnemyConfig,
    spawn: GridPosition,
    path: GridPosition[],
    worldFromGrid: (position: GridPosition) => WorldPosition,
  ) {
    const world = worldFromGrid(spawn);
    this.hp = config.hp;
    this.path = path.length > 0 ? path : [spawn];
    this.container = scene.add.container(world.x, world.y).setDepth(10);
    const body = scene.add.circle(0, 0, config.radius, config.color);
    const earOne = scene.add.triangle(-config.radius * 0.5, -config.radius * 0.55, 0, -12, 8, 6, -8, 6, config.color);
    const earTwo = scene.add.triangle(config.radius * 0.5, -config.radius * 0.55, 0, -12, 8, 6, -8, 6, config.color);
    const eyeOne = scene.add.circle(-5, -3, 2, 0x1c2521);
    const eyeTwo = scene.add.circle(5, -3, 2, 0x1c2521);
    const nose = scene.add.circle(0, 5, 3, 0x26352c);
    this.hpBar = scene.add.graphics();
    this.statusLabel = scene.add.text(0, -config.radius - 15, '', {
      color: '#e8f5e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([body, earOne, earTwo, eyeOne, eyeTwo, nose, this.hpBar, this.statusLabel]);
    this.drawHpBar();
  }

  public get currentHp(): number {
    return this.hp;
  }

  public get maxHp(): number {
    return this.config.hp;
  }

  public get reward(): number {
    return this.config.reward;
  }

  public get damage(): number {
    return this.config.damage;
  }

  public get isTargetable(): boolean {
    return !this.dying && !this.destroyed && this.hp > 0;
  }

  public get isDying(): boolean {
    return this.dying;
  }

  public get canBreakWalls(): boolean {
    return this.config.abilities?.includes('break-walls') ?? false;
  }

  public get wallDamage(): number {
    return this.config.wallDamage ?? this.config.damage;
  }

  public getWorldPosition(): WorldPosition {
    return { x: this.container.x, y: this.container.y };
  }

  public getNextTile(): GridPosition | undefined {
    return this.path[this.pathIndex + 1];
  }

  public getPathProgress(): number {
    if (this.path.length <= 1) {
      return 1;
    }
    return Math.min(1, this.pathIndex / (this.path.length - 1));
  }

  public setPath(path: GridPosition[]): void {
    if (path.length === 0) {
      return;
    }
    this.path = path;
    this.pathIndex = 0;
  }

  public updateEffects(deltaSeconds: number): StatusDamageTick[] {
    const ticks = this.statusEffects.update(deltaSeconds);
    this.statusLabel.setText(this.statusEffects.getSnapshots().map((effect) => effect.id === 'slow' ? 'S' : effect.id === 'poison' ? 'P' : 'F').join(' '));
    return ticks;
  }

  public applyEffect(effect: TowerEffectConfig): void {
    this.statusEffects.apply(effect);
    this.statusLabel.setText(this.statusEffects.getSnapshots().map((item) => item.id === 'slow' ? 'S' : item.id === 'poison' ? 'P' : 'F').join(' '));
  }

  public updateMovement(deltaSeconds: number, worldFromGrid: (position: GridPosition) => WorldPosition): EnemyMovementResult {
    if (!this.isTargetable) {
      return 'moving';
    }
    const speed = this.config.speed * this.statusEffects.getSpeedMultiplier();
    let distanceToTravel = speed * deltaSeconds;

    while (distanceToTravel > 0 && this.pathIndex < this.path.length - 1) {
      const destination = worldFromGrid(this.path[this.pathIndex + 1]);
      const dx = destination.x - this.container.x;
      const dy = destination.y - this.container.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.5) {
        this.container.setPosition(destination.x, destination.y);
        this.pathIndex += 1;
        continue;
      }
      if (distanceToTravel < distance) {
        this.container.x += (dx / distance) * distanceToTravel;
        this.container.y += (dy / distance) * distanceToTravel;
        distanceToTravel = 0;
      } else {
        this.container.setPosition(destination.x, destination.y);
        this.pathIndex += 1;
        distanceToTravel -= distance;
      }
    }

    return this.pathIndex >= this.path.length - 1 ? 'reached-target' : 'moving';
  }

  public tryWallAttack(deltaSeconds: number): boolean {
    this.wallAttackTimer -= deltaSeconds;
    if (this.wallAttackTimer > 0) {
      return false;
    }
    this.wallAttackTimer = 0.85;
    return true;
  }

  public takeDamage(amount: number, type: DamageType): number {
    if (!this.isTargetable) {
      return 0;
    }
    const armor = type === 'physical' ? this.config.armor ?? 0 : 0;
    const actualDamage = Math.max(1, amount - armor);
    this.hp = Math.max(0, this.hp - actualDamage);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0.35,
      duration: 70,
      yoyo: true,
    });
    this.drawHpBar();
    return actualDamage;
  }

  public beginDeath(onComplete: () => void): void {
    if (this.dying || this.destroyed) {
      return;
    }
    this.dying = true;
    this.statusEffects.clear();
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.35,
      angle: 18,
      duration: 260,
      onComplete,
    });
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.container.destroy(true);
  }

  private drawHpBar(): void {
    const width = Math.max(24, this.config.radius * 2.2);
    const ratio = this.hp / this.config.hp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x1b211d, 1);
    this.hpBar.fillRect(-width / 2, -this.config.radius - 8, width, 4);
    this.hpBar.fillStyle(ratio > 0.35 ? 0x72d38d : 0xeb5757, 1);
    this.hpBar.fillRect(-width / 2, -this.config.radius - 8, width * ratio, 4);
  }
}
