import type { GridPosition } from '../types';
import { tileKey } from '../map/Tile';
import { GameMap } from '../map/GameMap';

export class Pathfinding {
  public findPath(map: GameMap, start: GridPosition, target: GridPosition, allowWalls = false): GridPosition[] | null {
    if (!map.isInside(start) || !map.isInside(target) || !map.isWalkable(start, allowWalls) || !map.isWalkable(target, allowWalls)) {
      return null;
    }

    const startKey = tileKey(start.x, start.y);
    const targetKey = tileKey(target.x, target.y);
    const open: GridPosition[] = [{ ...start }];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startKey, 0]]);
    const fScore = new Map<string, number>([[startKey, this.heuristic(start, target)]]);

    while (open.length > 0) {
      let bestIndex = 0;
      for (let index = 1; index < open.length; index += 1) {
        const currentScore = fScore.get(tileKey(open[index].x, open[index].y)) ?? Number.POSITIVE_INFINITY;
        const bestScore = fScore.get(tileKey(open[bestIndex].x, open[bestIndex].y)) ?? Number.POSITIVE_INFINITY;
        if (currentScore < bestScore) {
          bestIndex = index;
        }
      }

      const current = open.splice(bestIndex, 1)[0];
      const currentKey = tileKey(current.x, current.y);
      if (currentKey === targetKey) {
        return this.reconstructPath(cameFrom, currentKey);
      }

      for (const neighbor of this.getNeighbors(current)) {
        if (!map.isWalkable(neighbor, allowWalls)) {
          continue;
        }

        const neighborKey = tileKey(neighbor.x, neighbor.y);
        const tentativeScore = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1;
        if (tentativeScore >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
          continue;
        }

        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeScore);
        fScore.set(neighborKey, tentativeScore + this.heuristic(neighbor, target));
        if (!open.some((position) => tileKey(position.x, position.y) === neighborKey)) {
          open.push({ ...neighbor });
        }
      }
    }

    return null;
  }

  private reconstructPath(cameFrom: Map<string, string>, currentKey: string): GridPosition[] {
    const path: GridPosition[] = [this.parseKey(currentKey)];
    let key = currentKey;
    while (cameFrom.has(key)) {
      key = cameFrom.get(key) as string;
      path.unshift(this.parseKey(key));
    }
    return path;
  }

  private getNeighbors(position: GridPosition): GridPosition[] {
    return [
      { x: position.x + 1, y: position.y },
      { x: position.x - 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x, y: position.y - 1 },
    ];
  }

  private heuristic(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private parseKey(key: string): GridPosition {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}
