import Phaser from 'phaser';
import { createArcadeText, isBossEnemy, setCircleBody, type ArcadeText } from './game/actors';
import { getSpawnDistance, getViewport } from './game/layout';
import { SoundEffects } from './game/soundEffects';

type EnemyActor = ArcadeText;
type Direction = 'up' | 'down' | 'left' | 'right';

const hudOffset = {
  scoreX: 20,
  scoreY: 20,
  levelRight: 20,
  levelY: 20
};

export class GameScene extends Phaser.Scene {
  private player!: ArcadeText;
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
  private attackDelay = 1200;
  private bulletSpeed = 250;
  private baseEnemySpeed = 100;

  private spawnDelay = 1500;
  private spawnTimerEvent?: Phaser.Time.TimerEvent;

  private hpBar!: Phaser.GameObjects.Graphics;
  private hp = 100;
  private score = 0;
  private isGameOver = false;
  private isPaused = false;
  private virtualControls: Record<Direction, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  private scoreText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private gameOverText?: Phaser.GameObjects.Text;
  private restartText?: Phaser.GameObjects.Text;
  private pauseText?: Phaser.GameObjects.Text;
  private pauseHintText?: Phaser.GameObjects.Text;
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

  constructor() {
    super('GameScene');
  }

  create() {
    this.hpBar = this.add.graphics();
    this.player = this.createPlayer();
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
    this.bullets = this.physics.add.group()


    this.scoreText = this.add.text(20, 20, '⭐ Score: 0', {
      fontSize: '20px',
      color: '#dfcb1f',
      fontFamily: 'Orbitron'
    });

    this.lvlText = this.add.text(0, hudOffset.levelY, 'Level 100', {
      fontSize: '20px',
      color: '#1278a7',
      fontFamily: 'Orbitron'
    });
    this.lvlText.setOrigin(1, 0);

    this.startSpawnTimer();
    this.setupCollisions();
    this.syncViewport();
    this.drawHpBar();
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
    const speed = 250;

    this.player.body.setVelocity(0);

    const moveLeft = this.cursors.left.isDown || this.wasd.left.isDown || this.virtualControls.left;
    const moveRight = this.cursors.right.isDown || this.wasd.right.isDown || this.virtualControls.right;
    const moveUp = this.cursors.up.isDown || this.wasd.up.isDown || this.virtualControls.up;
    const moveDown = this.cursors.down.isDown || this.wasd.down.isDown || this.virtualControls.down;

    if (moveLeft) {
      this.player.body.setVelocityX(-speed);
    } else if (moveRight) {
      this.player.body.setVelocityX(speed);
    }

    if (moveUp) {
      this.player.body.setVelocityY(-speed);
    } else if (moveDown) {
      this.player.body.setVelocityY(speed);
    }

    this.player.body.velocity.normalize().scale(speed);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as EnemyActor;
      const customSpeed = (enemy.getData('speed') as number | undefined) ?? this.baseEnemySpeed;

      this.physics.moveToObject(enemy, this.player, customSpeed);
    });

    if (time > this.nextAttackTime) {
      this.shootAtClosestEnemy();
      this.nextAttackTime = time + this.attackDelay;
    }

    this.bullets.getChildren().forEach((bulletObject) => {
      const bullet = bulletObject as ArcadeText;

      if (
        bullet.x < 0 ||
        bullet.x > viewport.width ||
        bullet.y < 0 ||
        bullet.y > viewport.height
      ) {
        bullet.destroy();
      }
    });

    this.drawHpBar();
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

  private createPlayer() {
    const viewport = getViewport(this);
    const player = createArcadeText(this, viewport.centerX, viewport.centerY, '🤖', {
      fontSize: '44px'
    }).setOrigin(0.5);

    player.body.setCollideWorldBounds(true);
    setCircleBody(player, 20, 4);

    return player;
  }

  private setupCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, (bulletObject, enemyObject) => {
      const bullet = bulletObject as ArcadeText;
      const enemy = enemyObject as EnemyActor;

      bullet.destroy();
      this.sounds.enemyHit();

      const enemyHP = (enemy.getData('hp') as number | undefined) ?? 1;
      const nextHP = enemyHP - 1;
      enemy.setData('hp', nextHP);

      this.tweens.add({
        targets: enemy,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
        repeat: 1
      });

      if (nextHP > 0) {
        return;
      }

      const boss = isBossEnemy(enemy);
      enemy.destroy();

      this.score += boss ? 100 : 10;
      this.scoreText.setText(`⭐ Score: ${this.score}`);

      this.checkDifficultyScaling();
    });

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (this.isGameOver) {
        return;
      }

      const enemy = enemyObject as EnemyActor;
      const enemyIsBoss = isBossEnemy(enemy);

      enemy.destroy();
      this.cameras.main.shake(100, 0.01);
      this.sounds.playerDamage();

      this.hp -= enemyIsBoss ? 40 : 20;

      if (this.hp <= 0) {
        this.hp = 0;
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
      this.score % 200 === 0 &&
      this.enemies.getMatching('isBoss', true).length === 0
    ) {
      this.spawnBoss(x, y);
      return;
    }

    const enemy = createArcadeText(this, x, y, '💩', { fontSize: '32px' });
    setCircleBody(enemy, 12, 4);
    enemy.setData('hp', 1);
    enemy.setData('isBoss', false);
    this.enemies.add(enemy);
  }

  private spawnBoss(x: number, y: number) {
    const boss = createArcadeText(this, x, y, '👾', { fontSize: '64px' });
    setCircleBody(boss, 24, 8);
    boss.setData('isBoss', true);
    boss.setData('hp', 5);
    boss.setData('speed', 60);
    this.enemies.add(boss);
  }

  private checkDifficultyScaling() {
    const currentLevel = Math.floor(this.score / 100) + 1;
    const previousLevel = Number(this.lvlText.text.replace('Level ', '')) || 1;
    this.lvlText.setText(`Level ${currentLevel}`);

    if (currentLevel > previousLevel) {
      this.sounds.levelUp();
    }

    const newDelay = Math.max(400, 1500 - (currentLevel - 1) * 150);
    if (newDelay !== this.spawnDelay) {
      this.spawnDelay = newDelay;
      this.startSpawnTimer();
    }

    this.baseEnemySpeed = 100 + (currentLevel - 1) * 10;
  }

  private shootAtClosestEnemy() {
    const closestEnemy = this.findClosestEnemy();
    if (!closestEnemy) {
      return;
    }

    const bullet = createArcadeText(this, this.player.x, this.player.y, '🍆', {
      fontSize: '28px'
    });
    setCircleBody(bullet, 10, 4);
    this.bullets.add(bullet);
    this.sounds.shoot();

    this.physics.moveToObject(bullet, closestEnemy, this.bulletSpeed);
  }

  private findClosestEnemy() {
    const enemies = this.enemies.getChildren() as EnemyActor[];
    let closestEnemy: EnemyActor | null = null;
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

  private drawHpBar() {
    this.hpBar.clear();

    if (this.isGameOver) {
      return;
    }

    const width = 50;
    const height = 6;
    const x = this.player.x - width / 2;
    const y = this.player.y - 35;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(x, y, width, height);

    const currentWidth = width * (this.hp / 100);
    const barColor = this.hp > 40 ? 0x2ecc71 : 0xe74c3c;

    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(x, y, currentWidth, height);
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.spawnTimerEvent?.destroy();
    this.hpBar.clear();
    this.hidePauseOverlay();
    this.sounds.gameOver();

    this.player.body.setVelocity(0);
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as EnemyActor;
      enemy.body.setVelocity(0);
    });

    const viewport = getViewport(this);

    this.gameOverText = this.add.text(viewport.centerX, viewport.centerY - 50, 'GAME OVER', {
      fontSize: '44px',
      color: '#811010',
      fontFamily: 'Orbitron',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.restartText = this.add.text(viewport.centerX, viewport.centerY + 40, 'Click or press any key to restart', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Orbitron'
    }).setOrigin(0.5);

    const restart = () => this.scene.restart();
    this.input.once('pointerdown', restart);
    this.input.keyboard?.once('keydown', restart);
  }

  private pauseGame() {
    this.isPaused = true;
    this.resetVirtualControls();
    this.showPauseOverlay();
    this.scene.pause();
  }

  private resumeGame() {
    this.isPaused = false;
    this.resetVirtualControls();
    this.hidePauseOverlay();
    this.scene.resume();
  }

  private handleResize() {
    this.syncViewport();
    this.positionHud();
  }

  private syncViewport() {
    const viewport = getViewport(this);

    this.physics.world.setBounds(0, 0, viewport.width, viewport.height);
    this.cameras.main.setBounds(0, 0, viewport.width, viewport.height);
    this.player.body.setCollideWorldBounds(true);

    this.positionHud();
  }

  private positionHud() {
    const viewport = getViewport(this);

    this.scoreText.setPosition(hudOffset.scoreX, hudOffset.scoreY);
    this.lvlText.setPosition(viewport.width - hudOffset.levelRight, hudOffset.levelY);

    if (this.gameOverText && this.restartText) {
      this.gameOverText.setPosition(viewport.centerX, viewport.centerY - 50);
      this.restartText.setPosition(viewport.centerX, viewport.centerY + 40);
    }

    if (this.pauseText && this.pauseHintText) {
      this.pauseText.setPosition(viewport.centerX, viewport.centerY - 50);
      this.pauseHintText.setPosition(viewport.centerX, viewport.centerY + 20);
    }
  }

  private cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    window.removeEventListener('keydown', this.handleGlobalPauseKeyDown);
    this.spawnTimerEvent?.destroy();
  }

  private showPauseOverlay() {
    const viewport = getViewport(this);

    if (!this.pauseText) {
      this.pauseText = this.add.text(viewport.centerX, viewport.centerY - 50, 'PAUSED', {
        fontSize: '44px',
        color: '#ffffff',
        fontFamily: 'Orbitron',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    if (!this.pauseHintText) {
      this.pauseHintText = this.add.text(viewport.centerX, viewport.centerY + 20, 'Tap Pause to continue', {
        fontSize: '20px',
        color: '#d1d5db',
        fontFamily: 'Orbitron'
      }).setOrigin(0.5);
    }

    this.positionHud();
  }

  private hidePauseOverlay() {
    this.pauseText?.destroy();
    this.pauseHintText?.destroy();
    this.pauseText = undefined;
    this.pauseHintText = undefined;
  }

  private resetVirtualControls() {
    this.virtualControls.up = false;
    this.virtualControls.down = false;
    this.virtualControls.left = false;
    this.virtualControls.right = false;
  }
}
