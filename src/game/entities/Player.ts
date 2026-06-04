import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Player extends Phaser.GameObjects.Text {
  declare body: Phaser.Physics.Arcade.Body;
  private hp = GAME_CONFIG.player.maxHp;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '🤖', {
      fontSize: `${GAME_CONFIG.player.size}px`
    });
    this.setOrigin(0.5);
    
    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.body.setCollideWorldBounds(true);
    this.body.setCircle(
      GAME_CONFIG.player.bodyRadius,
      GAME_CONFIG.player.bodyOffset,
      GAME_CONFIG.player.bodyOffset
    );

    // Create HP bar graphics
    this.hpBar = scene.add.graphics();
  }

  getHp() {
    return this.hp;
  }

  setHp(value: number) {
    this.hp = Math.max(0, Math.min(GAME_CONFIG.player.maxHp, value));
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp;
  }

  resetHp() {
    this.hp = GAME_CONFIG.player.maxHp;
  }

  updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
    },
    virtualControls: {
      up: boolean;
      down: boolean;
      left: boolean;
      right: boolean;
    }
  ) {
    const speed = GAME_CONFIG.player.baseSpeed;
    this.body.setVelocity(0);

    const moveLeft = cursors.left.isDown || wasd.left.isDown || virtualControls.left;
    const moveRight = cursors.right.isDown || wasd.right.isDown || virtualControls.right;
    const moveUp = cursors.up.isDown || wasd.up.isDown || virtualControls.up;
    const moveDown = cursors.down.isDown || wasd.down.isDown || virtualControls.down;

    if (moveLeft) {
      this.body.setVelocityX(-speed);
    } else if (moveRight) {
      this.body.setVelocityX(speed);
    }

    if (moveUp) {
      this.body.setVelocityY(-speed);
    } else if (moveDown) {
      this.body.setVelocityY(speed);
    }

    this.body.velocity.normalize().scale(speed);
  }

  drawHpBar(isGameOver = false) {
    this.hpBar.clear();

    if (isGameOver || this.hp <= 0) {
      return;
    }

    const width = 50;
    const height = 6;
    const x = this.x - width / 2;
    const y = this.y - 35;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(x, y, width, height);

    const currentWidth = width * (this.hp / GAME_CONFIG.player.maxHp);
    const barColor = this.hp > 40 ? 0x2ecc71 : 0xe74c3c;

    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(x, y, currentWidth, height);
  }

  destroy(fromScene?: boolean) {
    this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
