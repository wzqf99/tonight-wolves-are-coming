import { ECONOMY_CONFIG } from '../config/economy';
import { TOWER_CONFIGS } from '../config/towers';
import { GameMap } from '../map/GameMap';
import { TileType, type BuildSelection, type GridPosition, type PlacementReason, type PlacementResult } from '../types';
import { Pathfinding } from './Pathfinding';

export class PlacementSystem {
  public constructor(private readonly map: GameMap, private readonly pathfinding: Pathfinding) {}

  public getCost(selection: BuildSelection): number {
    return selection.kind === 'wall' ? ECONOMY_CONFIG.wallCost : TOWER_CONFIGS[selection.towerId].cost;
  }

  public validate(selection: BuildSelection, position: GridPosition | null, gold: number, isPlaying: boolean): PlacementResult {
    const cost = this.getCost(selection);
    if (!isPlaying) {
      return { allowed: false, reason: 'not-playing', cost };
    }
    if (gold < cost) {
      return { allowed: false, reason: 'insufficient-gold', cost };
    }
    if (!position || !this.map.isInside(position)) {
      return { allowed: false, reason: 'outside-map', cost };
    }

    const tile = this.map.getTile(position);
    if (!tile || !this.map.isEmptyBuildTile(position)) {
      return {
        allowed: false,
        reason: tile?.type === TileType.SPAWN || tile?.type === TileType.TARGET ? 'spawn-or-target' : 'occupied',
        cost,
      };
    }

    const type = selection.kind === 'wall' ? TileType.WALL : TileType.TOWER;
    const hasPath = this.map.testPlacement(position, type, () => {
      return this.pathfinding.findPath(this.map, this.map.getSpawn(), this.map.getTarget()) !== null;
    }, ECONOMY_CONFIG.wallMaxHp);
    return hasPath ? { allowed: true, cost } : { allowed: false, reason: 'no-path', cost };
  }

  public getReasonText(reason?: PlacementReason): string {
    switch (reason) {
      case 'insufficient-gold':
        return '金币不足';
      case 'outside-map':
        return '超出地图';
      case 'occupied':
        return '格子已被占用';
      case 'spawn-or-target':
        return '不能占据出生点或羊圈';
      case 'no-path':
        return '放置后会封死路线';
      case 'not-playing':
        return '请先开始防守';
      default:
        return '这里不能放置';
    }
  }
}
