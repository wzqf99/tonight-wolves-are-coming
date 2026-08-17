import type { StatusEffectSnapshot, TowerEffectConfig } from '../types';

export interface StatusDamageTick {
  id: 'poison';
  amount: number;
}

type ActiveEffect = {
  id: 'slow' | 'poison' | 'freeze';
  remaining: number;
  label: string;
  multiplier?: number;
  damagePerSecond?: number;
  tickTimer?: number;
};

export class StatusEffectSystem {
  private readonly effects = new Map<ActiveEffect['id'], ActiveEffect>();

  public apply(effect: TowerEffectConfig): void {
    const existing = this.effects.get(effect.id);
    if (effect.id === 'slow') {
      this.effects.set(effect.id, {
        id: effect.id,
        remaining: effect.duration,
        label: `减速 ${Math.round((1 - effect.multiplier) * 100)}%`,
        multiplier: effect.multiplier,
        tickTimer: existing?.tickTimer,
      });
      return;
    }
    if (effect.id === 'poison') {
      this.effects.set(effect.id, {
        id: effect.id,
        remaining: effect.duration,
        label: '中毒',
        damagePerSecond: effect.damagePerSecond,
        tickTimer: existing ? 0 : 1,
      });
      return;
    }
    this.effects.set(effect.id, {
      id: effect.id,
      remaining: effect.duration,
      label: '冻结',
      tickTimer: existing?.tickTimer,
    });
  }

  public update(deltaSeconds: number): StatusDamageTick[] {
    const damageTicks: StatusDamageTick[] = [];
    for (const [id, effect] of this.effects) {
      effect.remaining -= deltaSeconds;
      if (id === 'poison' && effect.damagePerSecond !== undefined) {
        effect.tickTimer = (effect.tickTimer ?? 1) - deltaSeconds;
        while (effect.tickTimer <= 0 && effect.remaining > 0) {
          damageTicks.push({ id, amount: effect.damagePerSecond });
          effect.tickTimer += 1;
        }
      }
      if (effect.remaining <= 0) {
        this.effects.delete(id);
      }
    }
    return damageTicks;
  }

  public getSpeedMultiplier(): number {
    const freeze = this.effects.get('freeze');
    if (freeze) {
      return 0;
    }
    const slow = this.effects.get('slow');
    return slow?.multiplier ?? 1;
  }

  public getSnapshots(): StatusEffectSnapshot[] {
    return [...this.effects.values()].map((effect) => ({
      id: effect.id,
      remaining: effect.remaining,
      label: effect.label,
    }));
  }

  public clear(): void {
    this.effects.clear();
  }
}
