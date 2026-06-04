export const GAME_CONFIG = {
  player: {
    baseSpeed: 250,
    maxHp: 100,
    size: 44,
    bodyRadius: 20,
    bodyOffset: 4,
  },
  enemy: {
    normal: {
      emoji: '💩',
      size: '32px',
      bodyRadius: 12,
      bodyOffset: 4,
      hp: 1,
      speed: 100,
      scoreValue: 10,
      damage: 20,
    },
    boss: {
      emoji: '👹',
      size: '64px',
      bodyRadius: 24,
      bodyOffset: 8,
      hp: 5,
      speed: 60,
      scoreValue: 100,
      damage: 40,
    },
    bossScoreInterval: 200,
  },
  bullet: {
    emoji: '🍆',
    size: '28px',
    bodyRadius: 10,
    bodyOffset: 4,
    speed: 250,
  },
  weapons: {
    autoGun: {
      attackDelay: 1700,
    }
  },
  difficulty: {
    scorePerLevel: 100,
    spawnDelayBase: 1500,
    spawnDelayMin: 400,
    spawnDelayDecreasePerLevel: 150,
    speedIncreasePerLevel: 10,
  }
};
