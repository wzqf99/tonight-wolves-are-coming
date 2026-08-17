import type { WaveConfig } from '../types';

export const WAVE_CONFIGS: WaveConfig[] = [
  { wave: 1, groups: [{ enemyId: 'normal', count: 5, interval: 0.8 }] },
  {
    wave: 2,
    groups: [
      { enemyId: 'normal', count: 4, interval: 0.8 },
      { enemyId: 'fast', count: 3, interval: 0.7, delay: 1.5 },
    ],
  },
  {
    wave: 3,
    groups: [
      { enemyId: 'normal', count: 5, interval: 0.7 },
      { enemyId: 'fast', count: 5, interval: 0.55, delay: 1 },
    ],
  },
  {
    wave: 4,
    groups: [
      { enemyId: 'normal', count: 6, interval: 0.65 },
      { enemyId: 'giant', count: 1, interval: 1, delay: 2 },
    ],
  },
  {
    wave: 5,
    groups: [
      { enemyId: 'normal', count: 6, interval: 0.6 },
      { enemyId: 'fast', count: 4, interval: 0.55, delay: 1 },
      { enemyId: 'giant', count: 1, interval: 1, delay: 1.5 },
    ],
  },
  {
    wave: 6,
    groups: [
      { enemyId: 'armored', count: 4, interval: 0.9 },
      { enemyId: 'normal', count: 6, interval: 0.6, delay: 1 },
    ],
  },
  {
    wave: 7,
    groups: [
      { enemyId: 'fast', count: 10, interval: 0.42 },
      { enemyId: 'normal', count: 4, interval: 0.6, delay: 1 },
    ],
  },
  {
    wave: 8,
    groups: [
      { enemyId: 'breaker', count: 3, interval: 0.9 },
      { enemyId: 'normal', count: 6, interval: 0.6, delay: 1.5 },
    ],
  },
  {
    wave: 9,
    groups: [
      { enemyId: 'normal', count: 8, interval: 0.5 },
      { enemyId: 'fast', count: 6, interval: 0.45, delay: 1 },
      { enemyId: 'armored', count: 3, interval: 0.8, delay: 1 },
      { enemyId: 'breaker', count: 2, interval: 0.8, delay: 1 },
    ],
  },
  {
    wave: 10,
    groups: [
      { enemyId: 'normal', count: 12, interval: 0.42 },
      { enemyId: 'fast', count: 8, interval: 0.38, delay: 1 },
      { enemyId: 'armored', count: 4, interval: 0.7, delay: 1 },
      { enemyId: 'breaker', count: 3, interval: 0.7, delay: 1 },
      { enemyId: 'giant', count: 1, interval: 1, delay: 2, elite: true },
    ],
  },
];
