import Phaser from 'phaser';
import { GAME_CONFIG } from '../game/config/gameConfig';
import { Player } from '../game/entities/Player';
import { Enemy } from '../game/entities/Enemy';
import { Bullet } from '../game/entities/Bullet';
import { getSpawnDistance, getViewport } from '../game/layout';
import { SoundEffects } from '../game/soundEffects';
import backgroundImage from '../assets/bg.png';

type Direction = 'up' | 'down' | 'left' | 'right';

export class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Phaser.Types.Input.Keyboard.CursorKeys & {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;

  private nextAttackTime = 0;
  private attackDelay = GAME_CONFIG.weapons.autoGun.attackDelay;
  private baseEnemySpeed = GAME_CONFIG.enemy.normal.speed;
  private spawnDelay = GAME_CONFIG.difficulty.spawnDelayBase;
  private spawnTimerEvent?: Phaser.Time.TimerEvent;

  private score = 0;
  private currentLevel = 1;
  private isGameOver = false;
  private isPaused = false;
  private virtualControls: Record<Direction, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  private sounds = new SoundEffects();

  private readonly handleGlobalPauseKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'KeyP') {
      event.preventDefault();
      this.togglePause();
    }

    if (event.code === 'KeyM') {
      event.preventDefault();
      this.toggleMute();
    }
  };

  private readonly handleRestartRequest = () => {
    if (!this.isGameOver) {
      return;
    }

    this.events.emit('game-restart');
    this.resetVirtualControls();

    // Restart on the next tick so we don't rebuild the scene inside the input callback.
    this.time.delayedCall(0, () => {
      this.scene.restart();
    });
  };

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('game-background', backgroundImage);
  }

  create() {
    this.resetSceneState();

    const viewport = getViewport(this);
    this.background = this.add.tileSprite(0, 0, viewport.width, viewport.height, 'game-background')
      .setOrigin(0)
      .setDepth(-1000);

    // Launch the UI/HUD Scene Overlay
    this.scene.launch('HudScene');

    this.player = new Player(this, viewport.centerX, viewport.centerY);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as Phaser.Types.Input.Keyboard.CursorKeys & {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
    };

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();

    this.startSpawnTimer();
    this.setupCollisions();
    this.syncViewport();
    this.player.drawHpBar(this.isGameOver);

    this.input.once('pointerdown', () => this.sounds.unlock());
    this.input.keyboard?.once('keydown', () => this.sounds.unlock());
    window.addEventListener('keydown', this.handleGlobalPauseKeyDown);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(time: number) {
    if (this.isGameOver || this.isPaused) {
      return;
    }

    const viewport = getViewport(this);

    this.player.updateMovement(this.cursors, this.wasd, this.virtualControls);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Enemy;
      enemy.chase(this.player);
    });

    if (time > this.nextAttackTime) {
      this.shootAtClosestEnemy();
      this.nextAttackTime = time + this.attackDelay;
    }

    this.bullets.getChildren().forEach((bulletObject) => {
      const bullet = bulletObject as Bullet;

      if (
        bullet.x < 0 ||
        bullet.x > viewport.width ||
        bullet.y < 0 ||
        bullet.y > viewport.height
      ) {
        bullet.destroy();
      }
    });

    this.player.drawHpBar(this.isGameOver);
  }

  public setVirtualControlState(direction: Direction, pressed: boolean) {
    this.virtualControls[direction] = pressed;
  }

  public togglePause() {
    if (this.isGameOver) {
      return;
    }

    if (this.scene.isPaused()) {
      this.resumeGame();
      return;
    }

    this.pauseGame();
  }

  public toggleMute() {
    return this.sounds.toggleMute();
  }

  public isMuted() {
    return this.sounds.isMuted();
  }

  private setupCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, (bulletObject, enemyObject) => {
      const bullet = bulletObject as Bullet;
      const enemy = enemyObject as Enemy;

      bullet.destroy();
      this.sounds.enemyHit();

      const nextHP = enemy.takeDamage(1);
      enemy.flash();

      if (nextHP > 0) {
        return;
      }

      const boss = enemy.getIsBoss();
      enemy.destroy();

      this.score += boss ? GAME_CONFIG.enemy.boss.scoreValue : GAME_CONFIG.enemy.normal.scoreValue;
      this.events.emit('score-changed', this.score);

      this.checkDifficultyScaling();
    });

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (this.isGameOver) {
        return;
      }

      const enemy = enemyObject as Enemy;
      const enemyIsBoss = enemy.getIsBoss();

      enemy.destroy();
      this.cameras.main.shake(100, 0.01);
      this.sounds.playerDamage();

      const currentHp = this.player.takeDamage(
        enemyIsBoss ? GAME_CONFIG.enemy.boss.damage : GAME_CONFIG.enemy.normal.damage
      );

      if (currentHp <= 0) {
        this.triggerGameOver();
      }
    });
  }

  private startSpawnTimer() {
    this.spawnTimerEvent?.destroy();

    this.spawnTimerEvent = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }

  private spawnEnemy() {
    if (this.isGameOver) {
      return;
    }

    const viewport = getViewport(this);
    const angle = Math.random() * Math.PI * 2;
    const distance = getSpawnDistance(viewport);
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    if (
      this.score > 0 &&
      this.score % GAME_CONFIG.enemy.bossScoreInterval === 0 &&
      this.enemies.getMatching('isBoss', true).length === 0
    ) {
      this.spawnBoss(x, y);
      return;
    }

    const enemy = new Enemy(this, x, y, false, this.baseEnemySpeed);
    this.enemies.add(enemy);
  }

  private spawnBoss(x: number, y: number) {
    const boss = new Enemy(this, x, y, true, GAME_CONFIG.enemy.boss.speed);
    this.enemies.add(boss);
  }

  private checkDifficultyScaling() {
    const currentLevel = Math.floor(this.score / GAME_CONFIG.difficulty.scorePerLevel) + 1;
    const previousLevel = this.currentLevel;

    if (currentLevel > previousLevel) {
      this.currentLevel = currentLevel;
      this.sounds.levelUp();
      this.events.emit('level-changed', currentLevel);
    }

    const newDelay = Math.max(
      GAME_CONFIG.difficulty.spawnDelayMin,
      GAME_CONFIG.difficulty.spawnDelayBase - (currentLevel - 1) * GAME_CONFIG.difficulty.spawnDelayDecreasePerLevel
    );
    if (newDelay !== this.spawnDelay) {
      this.spawnDelay = newDelay;
      this.startSpawnTimer();
    }

    this.baseEnemySpeed = GAME_CONFIG.enemy.normal.speed + (currentLevel - 1) * GAME_CONFIG.difficulty.speedIncreasePerLevel;
  }

  private shootAtClosestEnemy() {
    const closestEnemy = this.findClosestEnemy();
    if (!closestEnemy) {
      return;
    }

    const bullet = new Bullet(this, this.player.x, this.player.y);
    this.bullets.add(bullet);
    this.sounds.shoot();

    bullet.fire(closestEnemy);
  }

  private findClosestEnemy() {
    const enemies = this.enemies.getChildren() as Enemy[];
    let closestEnemy: Enemy | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.spawnTimerEvent?.destroy();
    
    this.player.drawHpBar(this.isGameOver);
    this.sounds.gameOver();

    const bestScore = localStorage.getItem('bestScore');
    if (this.score > Number(bestScore || '0')) {
      window.localStorage.setItem('bestScore', String(this.score));
    }

    this.player.body.setVelocity(0);
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Enemy;
      enemy.body.setVelocity(0);
    });

    this.events.emit('game-over');

    this.input.once('pointerdown', this.handleRestartRequest);
    this.input.keyboard?.once('keydown', this.handleRestartRequest);
  }

  private pauseGame() {
    this.isPaused = true;
    this.resetVirtualControls();
    this.events.emit('game-paused');
    this.scene.pause();
  }

  private resumeGame() {
    this.isPaused = false;
    this.resetVirtualControls();
    this.events.emit('game-resumed');
    this.scene.resume();
  }

  private handleResize() {
    this.syncViewport();
  }

  private syncViewport() {
    const viewport = getViewport(this);

    this.background.setSize(viewport.width, viewport.height);
    this.physics.world.setBounds(0, 0, viewport.width, viewport.height);
    this.cameras.main.setBounds(0, 0, viewport.width, viewport.height);
    this.player.body.setCollideWorldBounds(true);
  }

  private cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    window.removeEventListener('keydown', this.handleGlobalPauseKeyDown);
    this.spawnTimerEvent?.destroy();
    
    // Make sure we stop the overlay scene when this scene is destroyed/shut down
    this.scene.stop('HudScene');
  }

  private resetVirtualControls() {
    this.virtualControls.up = false;
    this.virtualControls.down = false;
    this.virtualControls.left = false;
    this.virtualControls.right = false;
  }

  private resetSceneState() {
    this.nextAttackTime = 0;
    this.attackDelay = GAME_CONFIG.weapons.autoGun.attackDelay;
    this.baseEnemySpeed = GAME_CONFIG.enemy.normal.speed;
    this.spawnDelay = GAME_CONFIG.difficulty.spawnDelayBase;
    this.score = 0;
    this.currentLevel = 1;
    this.isGameOver = false;
    this.isPaused = false;
    this.spawnTimerEvent = undefined;
    this.resetVirtualControls();
  }
}
