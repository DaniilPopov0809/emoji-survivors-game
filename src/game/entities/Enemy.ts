import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Enemy extends Phaser.GameObjects.Text {
  declare body: Phaser.Physics.Arcade.Body;
  private hp: number;
  private speed: number;
  private isBoss: boolean;
  private damage: number;
  private scoreValue: number;

  constructor(scene: Phaser.Scene, x: number, y: number, isBoss: boolean, speed: number) {
    const config = isBoss ? GAME_CONFIG.enemy.boss : GAME_CONFIG.enemy.normal;
    super(scene, x, y, config.emoji, {
      fontSize: config.size
    });
    this.setOrigin(0.5);

    this.isBoss = isBoss;
    this.hp = config.hp;
    this.speed = speed;
    this.damage = config.damage;
    this.scoreValue = config.scoreValue;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.body.setCircle(
      config.bodyRadius,
      config.bodyOffset,
      config.bodyOffset
    );

    // Set Phaser data keys for compatibility with other game systems
    this.setData('isBoss', isBoss);
    this.setData('hp', this.hp);
    this.setData('speed', this.speed);
  }

  getHp() {
    return this.hp;
  }

  getDamage() {
    return this.damage;
  }

  getScoreValue() {
    return this.scoreValue;
  }

  getIsBoss() {
    return this.isBoss;
  }

  takeDamage(amount: number): number {
    this.hp = Math.max(0, this.hp - amount);
    this.setData('hp', this.hp);
    return this.hp;
  }

  chase(target: Phaser.GameObjects.Components.Transform) {
    this.scene.physics.moveToObject(this, target, this.speed);
  }

  flash() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
      repeat: 1
    });
  }
}
