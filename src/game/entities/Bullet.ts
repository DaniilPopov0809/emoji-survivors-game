import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Bullet extends Phaser.GameObjects.Text {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, GAME_CONFIG.bullet.emoji, {
      fontSize: GAME_CONFIG.bullet.size
    });
    this.setOrigin(0.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCircle(
      GAME_CONFIG.bullet.bodyRadius,
      GAME_CONFIG.bullet.bodyOffset,
      GAME_CONFIG.bullet.bodyOffset
    );
  }

  fire(target: Phaser.GameObjects.Components.Transform) {
    this.scene.physics.moveToObject(this, target, GAME_CONFIG.bullet.speed);
  }
}
