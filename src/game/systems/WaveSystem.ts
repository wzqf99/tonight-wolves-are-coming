import type { WaveConfig, WaveSpawnGroup } from '../types';

export type WaveSpawnCallback = (group: WaveSpawnGroup) => void;

export class WaveSystem {
  private current = 0;
  private groupIndex = 0;
  private spawnedInGroup = 0;
  private timer = 0;
  private intermission = false;
  private stopped = true;

  public constructor(private readonly configs: WaveConfig[], private readonly interWaveDelay: number) {}

  public get currentWave(): number {
    return this.current;
  }

  public start(): void {
    this.stopped = false;
    this.current = 1;
    this.startCurrentWave();
  }

  public stop(): void {
    this.stopped = true;
    this.intermission = false;
  }

  public update(
    deltaSeconds: number,
    activeEnemyCount: number,
    spawn: WaveSpawnCallback,
    onWaveStart: (wave: number) => void,
    onVictory: () => void,
  ): void {
    if (this.stopped || this.current === 0) {
      return;
    }

    if (this.intermission) {
      if (activeEnemyCount > 0) {
        return;
      }
      this.timer -= deltaSeconds;
      if (this.timer <= 0) {
        this.current += 1;
        this.startCurrentWave();
        onWaveStart(this.current);
      }
      return;
    }

    const config = this.configs[this.current - 1];
    if (!config) {
      return;
    }
    const group = config.groups[this.groupIndex];
    if (!group) {
      if (activeEnemyCount > 0) {
        return;
      }
      if (this.current >= this.configs.length) {
        this.stopped = true;
        onVictory();
      } else {
        this.intermission = true;
        this.timer = this.interWaveDelay;
      }
      return;
    }

    this.timer -= deltaSeconds;
    if (this.timer > 0) {
      return;
    }

    spawn(group);
    this.spawnedInGroup += 1;
    this.timer = group.interval;
    if (this.spawnedInGroup >= group.count) {
      this.groupIndex += 1;
      this.spawnedInGroup = 0;
      const nextGroup = config.groups[this.groupIndex];
      this.timer = nextGroup?.delay ?? 0;
    }
  }

  private startCurrentWave(): void {
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.intermission = false;
    this.timer = this.configs[this.current - 1]?.groups[0]?.delay ?? 0;
  }
}
