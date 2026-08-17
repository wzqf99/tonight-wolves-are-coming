export enum TileType {
  GRASS = 'grass',
  WALL = 'wall',
  TOWER = 'tower',
  SPAWN = 'spawn',
  TARGET = 'target',
}

export type TowerId = 'arrow' | 'cannon' | 'ice' | 'poison';

export type EnemyId = 'normal' | 'fast' | 'giant' | 'armored' | 'breaker';

export type DamageType = 'physical' | 'poison';

export type TargetStrategy = 'nearest' | 'first' | 'strongest' | 'weakest';

export type GamePhase = 'ready' | 'playing' | 'paused' | 'game-over' | 'victory';

export type BuildSelection =
  | { kind: 'wall' }
  | { kind: 'tower'; towerId: TowerId };

export interface GridPosition {
  x: number;
  y: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  wallHp?: number;
  maxWallHp?: number;
  towerId?: string;
}

export type TowerEffectConfig =
  | { id: 'slow'; multiplier: number; duration: number }
  | { id: 'poison'; damagePerSecond: number; duration: number }
  | { id: 'freeze'; duration: number };

export interface TowerSpecialConfig {
  doubleShotChance?: number;
  freezeChance?: number;
  poisonSpreadRadius?: number;
}

export interface TowerUpgradeConfig {
  level: number;
  cost: number;
  damage?: number;
  range?: number;
  attackSpeed?: number;
  projectileSpeed?: number;
  aoeRadius?: number;
  effects?: TowerEffectConfig[];
  special?: TowerSpecialConfig;
}

export interface TowerConfig {
  id: TowerId;
  name: string;
  shortName: string;
  cost: number;
  damage: number;
  range: number;
  attackSpeed: number;
  projectileSpeed: number;
  attackType: 'single' | 'aoe';
  aoeRadius?: number;
  effects?: TowerEffectConfig[];
  special?: TowerSpecialConfig;
  color: number;
  projectileColor: number;
  upgradeLevels: TowerUpgradeConfig[];
}

export interface TowerStats {
  damage: number;
  range: number;
  attackSpeed: number;
  projectileSpeed: number;
  attackType: 'single' | 'aoe';
  aoeRadius: number;
  effects: TowerEffectConfig[];
  special: TowerSpecialConfig;
}

export type EnemyAbility = 'break-walls';

export interface EnemyConfig {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  armor?: number;
  abilities?: EnemyAbility[];
  wallDamage?: number;
  color: number;
  radius: number;
}

export interface WaveSpawnGroup {
  enemyId: EnemyId;
  count: number;
  interval: number;
  delay?: number;
  elite?: boolean;
}

export interface WaveConfig {
  wave: number;
  groups: WaveSpawnGroup[];
}

export interface TowerPanelData {
  id: string;
  towerId: TowerId;
  name: string;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  attackSpeed: number;
  effects: TowerEffectConfig[];
  targetStrategy: TargetStrategy;
  nextUpgradeCost: number | null;
  totalInvested: number;
  sellValue: number;
  position: GridPosition;
}

export interface StatusEffectSnapshot {
  id: 'slow' | 'poison' | 'freeze';
  remaining: number;
  label: string;
}

export interface GameCommand {
  type:
    | 'start'
    | 'restart'
    | 'toggle-pause'
    | 'upgrade-tower'
    | 'sell-tower'
    | 'set-target-strategy';
  towerId?: string;
  strategy?: TargetStrategy;
}

export type PlacementReason =
  | 'not-playing'
  | 'insufficient-gold'
  | 'outside-map'
  | 'occupied'
  | 'spawn-or-target'
  | 'no-path';

export interface PlacementResult {
  allowed: boolean;
  reason?: PlacementReason;
  cost: number;
}
