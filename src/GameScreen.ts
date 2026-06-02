import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;

  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;


  private nextAttackTime: number = 0;
  private attackDelay: number = 800;


  constructor() {
    super('GameScene');
  }

  create() {

    this.player = this.add.text(400, 300, '🤖', { fontSize: '48px' }) as any;
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

    this.time.addEvent({
      delay: 1500,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(this.bullets, this.enemies, (bullet: any, enemy: any) => {
      bullet.destroy();
      enemy.destroy();
    });

    this.physics.add.overlap(this.player, this.enemies, (player: any, enemy: any) => {
      enemy.destroy();
      this.cameras.main.shake(100, 0.01);
    });
  }

  update(time: number) {
    const speed = 250;
    this.player.body.setVelocity(0);

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.body.setVelocityX(speed);
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.player.body.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.player.body.setVelocityY(speed);
    }

    this.player.body.velocity.normalize().scale(speed);

    this.enemies.getChildren().forEach((enemy: any) => {
      this.physics.moveToObject(enemy, this.player, 100);
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
  }

  private spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 500;

    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    const enemy = this.add.text(x, y, '💩', { fontSize: '32px' });
    this.enemies.add(enemy);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12, 4, 4);
  }

  private shootAtClosestEnemy() {
    const closestEnemy = this.physics.closest(this.player, this.enemies.getChildren()) as any;

    if (!closestEnemy) return;
    const bullet = this.add.text(this.player.x, this.player.y, '🍆', { fontSize: '20px' });
    this.bullets.add(bullet);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setCircle(10, 4, 4);

    this.physics.moveToObject(bullet, closestEnemy, this.b);
  }
}