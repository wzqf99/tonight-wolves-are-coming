import Phaser from 'phaser';
import type { GridPosition, WorldPosition } from '../types';

export class Wall {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private hp: number;

  public constructor(
    scene: Phaser.Scene,
    public readonly position: GridPosition,
    private readonly origin: WorldPosition,
    private readonly tileSize: number,
    maxHp: number,
  ) {
    this.hp = maxHp;
    this.graphics = scene.add.graphics().setDepth(4);
    this.draw();
  }

  public get currentHp(): number {
    return this.hp;
  }

  public damage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.draw();
    return this.hp === 0;
  }

  public destroy(): void {
    this.graphics.destroy();
  }

  private draw(): void {
    const x = this.origin.x + this.position.x * this.tileSize;
    const y = this.origin.y + this.position.y * this.tileSize;
    const barWidth = this.tileSize - 10;
    const hpRatio = this.hp / 100;

    this.graphics.clear();
    this.graphics.fillStyle(0x6d4c3d, 1);
    this.graphics.fillRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
    this.graphics.lineStyle(2, 0xc38b67, 0.9);
    this.graphics.strokeRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
    this.graphics.lineStyle(2, 0x2d211d, 0.9);
    this.graphics.lineBetween(x + 9, y + 9, x + this.tileSize - 9, y + this.tileSize - 9);
    this.graphics.lineBetween(x + this.tileSize - 9, y + 9, x + 9, y + this.tileSize - 9);
    this.graphics.fillStyle(0x241b18, 1);
    this.graphics.fillRect(x + 5, y + this.tileSize - 7, barWidth, 3);
    this.graphics.fillStyle(hpRatio > 0.35 ? 0x72d38d : 0xeb5757, 1);
    this.graphics.fillRect(x + 5, y + this.tileSize - 7, barWidth * hpRatio, 3);
  }
}
