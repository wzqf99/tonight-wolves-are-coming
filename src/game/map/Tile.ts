import { TileType } from '../types';

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isFixedTile(type: TileType): boolean {
  return type === TileType.SPAWN || type === TileType.TARGET;
}
