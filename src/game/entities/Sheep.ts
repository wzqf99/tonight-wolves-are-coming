import Phaser from 'phaser';
import type { WorldPosition } from '../types';

export class Sheep {
  private readonly container: Phaser.GameObjects.Container;
  private hp: number;

  public constructor(scene: Phaser.Scene, position: WorldPosition, maxHp: number) {
    this.hp = maxHp;
    this.container = scene.add.container(position.x, position.y).setDepth(7);

    const body = scene.add.ellipse(0, 2, 42, 30, 0xf4f1e8);
    const head = scene.add.circle(18, -4, 11, 0xd6e0d5);
    const eye = scene.add.circle(21, -7, 2, 0x1d2923);
    const legOne = scene.add.rectangle(-11, 16, 5, 11, 0x46584c);
    const legTwo = scene.add.rectangle(10, 16, 5, 11, 0x46584c);
    this.container.add([body, head, eye, legOne, legTwo]);
  }

  public get currentHp(): number {
    return this.hp;
  }

  public get isAlive(): boolean {
    return this.hp > 0;
  }

  public damage(amount: number): number {
    this.hp = Math.max(0, this.hp - amount);
    this.container.setAlpha(0.5);
    this.container.scene.tweens.add({ targets: this.container, alpha: 1, duration: 180 });
    return this.hp;
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
