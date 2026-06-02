import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;

  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;

  private nextAttackTime: number = 0;
  private attackDelay: number = 1200;
  private bulletSpeed: number = 250;
  private baseEnemySpeed: number = 100;

  private spawnDelay: number = 1500; 
  private spawnTimerEvent!: Phaser.Time.TimerEvent;

  private hpBar!: Phaser.GameObjects.Graphics;
  private hp: number = 100;
  private score: number = 0;
  private isGameOver: boolean = false;

  private scoreText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create() {
    this.hpBar = this.add.graphics();
    this.hp = 100;
    this.score = 0;
    this.isGameOver = false;
    this.spawnDelay = 1500;
    this.baseEnemySpeed = 100;


    this.player = this.add.text(400, 300, '🤖', { fontSize: '48px' }).setOrigin(0.5) as any
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setCircle(20, 4, 4);


    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });


    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();

    this.scoreText = this.add.text(20, 20, '⭐ Score: 0', { fontSize: '24px', color: '#ffeb3b', fontFamily: 'Arial' });
    this.lvlText = this.add.text(680, 20, 'Level 1', { fontSize: '24px', color: '#b3e5fc', fontFamily: 'Arial' });

    this.startSpawnTimer();
    this.drawHpBar();

    this.physics.add.overlap(this.bullets, this.enemies, (bullet: any, enemy: any) => {
      bullet.destroy();

      let enemyHP = enemy.getData('hp');
      if (enemyHP !== undefined) {
        enemyHP -= 1;
        enemy.setData('hp', enemyHP);

        this.tweens.add({
          targets: enemy,
          alpha: 0.5,
          duration: 50,
          yoyo: true,
          repeat: 1
        });

        if (enemyHP > 0) return; 
      }

      enemy.destroy();

      const isBoss = enemy.getData('isBoss');
      this.score += isBoss ? 100 : 10;
      this.scoreText.setText(`⭐ Score: ${this.score}`);

      this.checkDifficultyScaling();
    });

    this.physics.add.overlap(this.player, this.enemies, (player: any, enemy: any) => {
      if (this.isGameOver) return;

      const isBoss = enemy.getData('isBoss');
      enemy.destroy();

      this.cameras.main.shake(100, 0.01);

      this.hp -= isBoss ? 40 : 20;

      if (this.hp <= 0) {
        this.hp = 0;
        this.triggerGameOver();
      }
    });
  }

  update(time: number) {
    if (this.isGameOver) return;

    const speed = 250;
    this.player.body.setVelocity(0);

    if (this.cursors.left.isDown || this.wasd.left.isDown) this.player.body.setVelocityX(-speed);
    else if (this.cursors.right.isDown || this.wasd.right.isDown) this.player.body.setVelocityX(speed);

    if (this.cursors.up.isDown || this.wasd.up.isDown) this.player.body.setVelocityY(-speed);
    else if (this.cursors.down.isDown || this.wasd.down.isDown) this.player.body.setVelocityY(speed);

    this.player.body.velocity.normalize().scale(speed);

    this.enemies.getChildren().forEach((enemy: any) => {
      const customSpeed = enemy.getData('speed') || this.baseEnemySpeed;
      this.physics.moveToObject(enemy, this.player, customSpeed);
    });

    if (time > this.nextAttackTime) {
      this.shootAtClosestEnemy();
      this.nextAttackTime = time + this.attackDelay;
    }

    this.bullets.getChildren().forEach((bullet: any) => {
      if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
        bullet.destroy();
      }
    });

    this.drawHpBar();
  }

  private startSpawnTimer() {
    if (this.spawnTimerEvent) this.spawnTimerEvent.destroy();

    this.spawnTimerEvent = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }

  private spawnEnemy() {
    if (this.isGameOver) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 500;
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    if (this.score > 0 && this.score % 200 === 0 && this.enemies.getMatching('isBoss', true).length === 0) {
      this.spawnBoss(x, y);
      return;
    }

    const enemy = this.add.text(x, y, '💩', { fontSize: '32px' });
    this.enemies.add(enemy);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12, 4, 4);
  }

  private spawnBoss(x: number, y: number) {
    const boss = this.add.text(x, y, '👿', { fontSize: '64px' }); 
    this.enemies.add(boss);

    const body = boss.body as Phaser.Physics.Arcade.Body;
    body.setCircle(24, 8, 8);

    boss.setData('isBoss', true);
    boss.setData('hp', 5);         
    boss.setData('speed', 60);     
  }

  private checkDifficultyScaling() {
    const currentLvl = Math.floor(this.score / 100) + 1;
    this.lvlText.setText(`Level ${currentLvl}`);

    const newDelay = Math.max(400, 1500 - (currentLvl - 1) * 150);
    if (newDelay !== this.spawnDelay) {
      this.spawnDelay = newDelay;
      this.startSpawnTimer(); 
    }

    this.baseEnemySpeed = 100 + (currentLvl - 1) * 10;
  }

  private shootAtClosestEnemy() {
    const closestEnemy = this.physics.closest(this.player, this.enemies.getChildren()) as any;
    if (!closestEnemy) return;

    const bullet = this.add.text(this.player.x, this.player.y, '🍆', { fontSize: '28px' });
    this.bullets.add(bullet);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setCircle(10, 4, 4);

    this.physics.moveToObject(bullet, closestEnemy, this.bulletSpeed);
  }

  private drawHpBar() {
    this.hpBar.clear();

    if (this.isGameOver) return;

    const width = 50;
    const height = 6;
    
    const x = this.player.x - width / 2;
    const y = this.player.y - 35;

    this.hpBar.fillStyle(0x333333, 0.8); 
    this.hpBar.fillRect(x, y, width, height);

    const hpPercentage = this.hp / 100;
    const currentWidth = width * hpPercentage;

    const barColor = this.hp > 40 ? 0x2ecc71 : 0xe74c3c;

    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(x, y, currentWidth, height);
  }

  private triggerGameOver() {
    this.isGameOver = true;
    if (this.spawnTimerEvent) this.spawnTimerEvent.destroy();
    this.hpBar.clear();

    this.player.body.setVelocity(0);
    this.enemies.getChildren().forEach((enemy: any) => {
      enemy.body.setVelocity(0);
    });

    this.gameOverText = this.add.text(400, 250, 'GAME OVER', {
      fontSize: '64px', color: '#ff4d4d', fontFamily: 'Arial', fontWeight: 'bold'
    }).setOrigin(0.5);

    this.restartText = this.add.text(400, 340, 'Click to restart', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'Arial'
    }).setOrigin(0.5);

    const restart = () => this.scene.restart();
    this.input.once('pointerdown', restart);
    this.input.keyboard?.once('keydown', restart);
  }
}