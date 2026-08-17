import type { EnemyConfig, EnemyId } from '../types';

export const ENEMY_CONFIGS: Record<EnemyId, EnemyConfig> = {
  normal: {
    id: 'normal',
    name: '普通狼',
    hp: 100,
    speed: 55,
    damage: 10,
    reward: 10,
    color: 0x95a5a6,
    radius: 14,
  },
  fast: {
    id: 'fast',
    name: '快速狼',
    hp: 65,
    speed: 100,
    damage: 7,
    reward: 12,
    color: 0xf2c94c,
    radius: 11,
  },
  giant: {
    id: 'giant',
    name: '巨狼',
    hp: 400,
    speed: 35,
    damage: 25,
    reward: 30,
    color: 0xeb5757,
    radius: 19,
  },
  armored: {
    id: 'armored',
    name: '装甲狼',
    hp: 220,
    speed: 45,
    damage: 14,
    reward: 24,
    armor: 8,
    color: 0x7f8c8d,
    radius: 16,
  },
  breaker: {
    id: 'breaker',
    name: '拆墙狼',
    hp: 160,
    speed: 50,
    damage: 16,
    reward: 26,
    abilities: ['break-walls'],
    wallDamage: 22,
    color: 0xf2994a,
    radius: 15,
  },
};

export function createEnemyConfig(enemyId: EnemyId, elite = false): EnemyConfig {
  const base = ENEMY_CONFIGS[enemyId];
  if (!elite) {
    return { ...base, abilities: base.abilities ? [...base.abilities] : undefined };
  }

  return {
    ...base,
    name: `精英${base.name}`,
    hp: Math.round(base.hp * 2.2),
    speed: Math.round(base.speed * 0.85),
    damage: Math.round(base.damage * 1.5),
    reward: Math.round(base.reward * 2),
    radius: base.radius + 3,
    abilities: base.abilities ? [...base.abilities] : undefined,
  };
}

export const ENEMY_LIST = Object.values(ENEMY_CONFIGS);
