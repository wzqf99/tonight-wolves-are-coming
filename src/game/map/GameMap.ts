import Phaser from 'phaser';
import { TileType, type GridPosition, type Tile, type WorldPosition } from '../types';
import { tileKey } from './Tile';

export class GameMap {
  public readonly width: number;
  public readonly height: number;
  private readonly tiles = new Map<string, Tile>();
  private groundGraphics?: Phaser.GameObjects.Graphics;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.reset();
  }

  public reset(): void {
    this.tiles.clear();
    const spawnY = Math.floor(this.height / 2);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const type = x === 0 && y === spawnY ? TileType.SPAWN : x === this.width - 1 && y === spawnY ? TileType.TARGET : TileType.GRASS;
        this.tiles.set(tileKey(x, y), {
          x,
          y,
          type,
          walkable: true,
        });
      }
    }
    this.groundGraphics?.clear();
  }

  public getTile(position: GridPosition): Tile | undefined {
    return this.tiles.get(tileKey(position.x, position.y));
  }

  public getTileAt(x: number, y: number): Tile | undefined {
    return this.tiles.get(tileKey(x, y));
  }

  public getSpawn(): GridPosition {
    return { x: 0, y: Math.floor(this.height / 2) };
  }

  public getTarget(): GridPosition {
    return { x: this.width - 1, y: Math.floor(this.height / 2) };
  }

  public isInside(position: GridPosition): boolean {
    return position.x >= 0 && position.x < this.width && position.y >= 0 && position.y < this.height;
  }

  public isWalkable(position: GridPosition, allowWalls = false): boolean {
    const tile = this.getTile(position);
    if (!tile) {
      return false;
    }
    if (tile.type === TileType.WALL) {
      return allowWalls;
    }
    return tile.type !== TileType.TOWER;
  }

  public isEmptyBuildTile(position: GridPosition): boolean {
    const tile = this.getTile(position);
    return tile?.type === TileType.GRASS;
  }

  public applyBuilding(position: GridPosition, type: TileType, towerId?: string, maxWallHp?: number): void {
    const tile = this.getTile(position);
    if (!tile) {
      return;
    }
    tile.type = type;
    tile.walkable = type !== TileType.TOWER;
    tile.towerId = towerId;
    if (type === TileType.WALL) {
      tile.maxWallHp = maxWallHp;
      tile.wallHp = maxWallHp;
    } else {
      delete tile.wallHp;
      delete tile.maxWallHp;
    }
  }

  public removeBuilding(position: GridPosition): void {
    const tile = this.getTile(position);
    if (!tile || tile.type === TileType.SPAWN || tile.type === TileType.TARGET) {
      return;
    }
    tile.type = TileType.GRASS;
    tile.walkable = true;
    delete tile.towerId;
    delete tile.wallHp;
    delete tile.maxWallHp;
  }

  public damageWall(position: GridPosition, damage: number): boolean {
    const tile = this.getTile(position);
    if (!tile || tile.type !== TileType.WALL || tile.wallHp === undefined) {
      return false;
    }
    tile.wallHp = Math.max(0, tile.wallHp - damage);
    if (tile.wallHp === 0) {
      this.removeBuilding(position);
      return true;
    }
    return false;
  }

  public testPlacement(position: GridPosition, type: TileType, pathfinder: (allowWalls: boolean) => boolean, maxWallHp?: number): boolean {
    const tile = this.getTile(position);
    if (!tile || !this.isEmptyBuildTile(position)) {
      return false;
    }
    this.applyBuilding(position, type, undefined, maxWallHp);
    const valid = pathfinder(false);
    this.removeBuilding(position);
    return valid;
  }

  public worldToGrid(world: WorldPosition, origin: WorldPosition, tileSize: number): GridPosition | null {
    const position = {
      x: Math.floor((world.x - origin.x) / tileSize),
      y: Math.floor((world.y - origin.y) / tileSize),
    };
    return this.isInside(position) ? position : null;
  }

  public gridToWorld(position: GridPosition, origin: WorldPosition, tileSize: number): WorldPosition {
    return {
      x: origin.x + position.x * tileSize + tileSize / 2,
      y: origin.y + position.y * tileSize + tileSize / 2,
    };
  }

  public drawGround(scene: Phaser.Scene, origin: WorldPosition, tileSize: number): void {
    if (!this.groundGraphics) {
      this.groundGraphics = scene.add.graphics().setDepth(0);
    }
    this.groundGraphics.clear();

    for (const tile of this.tiles.values()) {
      const x = origin.x + tile.x * tileSize;
      const y = origin.y + tile.y * tileSize;
      const color = this.getTileColor(tile.type);
      this.groundGraphics.fillStyle(color, 1);
      this.groundGraphics.fillRect(x, y, tileSize, tileSize);
      this.groundGraphics.lineStyle(1, 0x28493b, 0.7);
      this.groundGraphics.strokeRect(x, y, tileSize, tileSize);
      if (tile.type === TileType.SPAWN || tile.type === TileType.TARGET) {
        this.groundGraphics.lineStyle(2, tile.type === TileType.SPAWN ? 0xf2c94c : 0xf4f1e8, 0.9);
        this.groundGraphics.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
      }
    }
  }

  public destroy(): void {
    this.groundGraphics?.destroy();
    this.groundGraphics = undefined;
  }

  private getTileColor(type: TileType): number {
    switch (type) {
      case TileType.WALL:
        return 0x604536;
      case TileType.TOWER:
        return 0x263c33;
      case TileType.SPAWN:
        return 0x3d452c;
      case TileType.TARGET:
        return 0x344936;
      default:
        return 0x19372c;
    }
  }
}
