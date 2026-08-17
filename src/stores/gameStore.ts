import { reactive } from 'vue';
import type {
  BuildSelection,
  GameCommand,
  GamePhase,
  TargetStrategy,
  TowerPanelData,
} from '../game/types';

export interface GameUiState {
  phase: GamePhase;
  gold: number;
  wave: number;
  totalWaves: number;
  sheepHp: number;
  sheepMaxHp: number;
  aliveEnemies: number;
  selectedBuild: BuildSelection | null;
  selectedTower: TowerPanelData | null;
  notification: string;
}

const initialState: GameUiState = {
  phase: 'ready',
  gold: 0,
  wave: 0,
  totalWaves: 10,
  sheepHp: 0,
  sheepMaxHp: 100,
  aliveEnemies: 0,
  selectedBuild: null,
  selectedTower: null,
  notification: '',
};

export const gameUiState = reactive<GameUiState>({ ...initialState });

const commandQueue: GameCommand[] = [];
const commandListeners = new Set<(command: GameCommand) => void>();
let notificationTimer: ReturnType<typeof setTimeout> | undefined;

function dispatch(command: GameCommand): void {
  if (commandListeners.size === 0) {
    commandQueue.push(command);
    return;
  }

  commandListeners.forEach((listener) => listener(command));
}

function subscribe(listener: (command: GameCommand) => void): () => void {
  commandListeners.add(listener);
  while (commandQueue.length > 0) {
    const command = commandQueue.shift();
    if (command) {
      listener(command);
    }
  }
  return () => commandListeners.delete(listener);
}

function setNotification(message: string): void {
  gameUiState.notification = message;
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }
  notificationTimer = setTimeout(() => {
    gameUiState.notification = '';
  }, 2200);
}

export const gameStore = {
  state: gameUiState,
  subscribe,
  dispatch,
  reset(): void {
    Object.assign(gameUiState, initialState);
  },
  setPhase(phase: GamePhase): void {
    gameUiState.phase = phase;
  },
  setGold(gold: number): void {
    gameUiState.gold = Math.max(0, Math.floor(gold));
  },
  addGold(amount: number): void {
    gameUiState.gold = Math.max(0, Math.floor(gameUiState.gold + amount));
  },
  setWave(wave: number): void {
    gameUiState.wave = wave;
  },
  setSheepHp(hp: number, maxHp = gameUiState.sheepMaxHp): void {
    gameUiState.sheepMaxHp = maxHp;
    gameUiState.sheepHp = Math.max(0, Math.min(maxHp, Math.ceil(hp)));
  },
  setAliveEnemies(count: number): void {
    gameUiState.aliveEnemies = Math.max(0, count);
  },
  selectBuild(selection: BuildSelection | null): void {
    gameUiState.selectedBuild = selection;
    if (selection) {
      gameUiState.selectedTower = null;
    }
  },
  selectTower(tower: TowerPanelData | null): void {
    gameUiState.selectedTower = tower;
    if (tower) {
      gameUiState.selectedBuild = null;
    }
  },
  notify: setNotification,
  start(): void {
    dispatch({ type: 'start' });
  },
  restart(): void {
    dispatch({ type: 'restart' });
  },
  togglePause(): void {
    dispatch({ type: 'toggle-pause' });
  },
  upgradeTower(towerId: string): void {
    dispatch({ type: 'upgrade-tower', towerId });
  },
  sellTower(towerId: string): void {
    dispatch({ type: 'sell-tower', towerId });
  },
  setTargetStrategy(towerId: string, strategy: TargetStrategy): void {
    dispatch({ type: 'set-target-strategy', towerId, strategy });
  },
};
