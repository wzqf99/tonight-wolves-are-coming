# 今晚狼来了

一个基于 Vue 3、TypeScript、Vite 和 Phaser 3 的单机 2D Web 塔防游戏。

## 当前版本

Phase 2：塔防策略系统。

当前包含：

- 4 种防御塔：箭塔、炮塔、冰塔、毒塔
- 5 种敌人：普通狼、快速狼、巨狼、装甲狼、拆墙狼
- 20 × 15 网格地图和四方向 A* 寻路
- 墙体耐久、拆墙和路径重新计算
- Slow、Poison、Armor 效果
- 防御塔升级、出售和目标选择策略
- 组合式 10 波敌人配置
- 金币、羊圈生命值、暂停、Game Over 和 Victory 状态

## 技术栈

- Vue 3
- TypeScript
- Vite
- Phaser 3

项目暂不包含后端、账号系统、数据库、联网和多人功能。

## 启动项目

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 目录结构

```text
src/
├── components/
│   ├── GameUI.vue
│   └── PhaserGame.vue
├── game/
│   ├── config/
│   ├── entities/
│   ├── map/
│   ├── scenes/
│   └── systems/
├── stores/
│   └── gameStore.ts
├── App.vue
└── main.ts
```

Vue 负责 HUD、建造栏和状态面板；Phaser 负责地图、实体、寻路、战斗、波次和动画。

## AI 信息

- AI 工具：Codex
- 模型：5.6 luna
