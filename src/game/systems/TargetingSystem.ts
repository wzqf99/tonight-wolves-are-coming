import type { Enemy } from '../entities/Enemy';
import type { TargetStrategy, WorldPosition } from '../types';

export function selectTarget(
  source: WorldPosition,
  enemies: Enemy[],
  strategy: TargetStrategy,
  range: number,
): Enemy | null {
  const rangeSquared = range * range;
  const candidates = enemies.filter((enemy) => {
    if (!enemy.isTargetable) {
      return false;
    }
    const position = enemy.getWorldPosition();
    const dx = position.x - source.x;
    const dy = position.y - source.y;
    return dx * dx + dy * dy <= rangeSquared;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) => {
    if (strategy === 'first' && candidate.getPathProgress() !== best.getPathProgress()) {
      return candidate.getPathProgress() > best.getPathProgress() ? candidate : best;
    }
    if (strategy === 'strongest' && candidate.currentHp !== best.currentHp) {
      return candidate.currentHp > best.currentHp ? candidate : best;
    }
    if (strategy === 'weakest' && candidate.currentHp !== best.currentHp) {
      return candidate.currentHp < best.currentHp ? candidate : best;
    }
    const bestPosition = best.getWorldPosition();
    const candidatePosition = candidate.getWorldPosition();
    const bestDistance = Math.hypot(bestPosition.x - source.x, bestPosition.y - source.y);
    const candidateDistance = Math.hypot(candidatePosition.x - source.x, candidatePosition.y - source.y);
    return candidateDistance < bestDistance ? candidate : best;
  });
}
