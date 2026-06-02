import Phaser from 'phaser';

export type ArcadeText = Phaser.GameObjects.Text & {
  body: Phaser.Physics.Arcade.Body;
  getData(key: string): unknown;
  setData(key: string, value: unknown): void;
};

export function createArcadeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle
): ArcadeText {
  const actor = scene.add.text(x, y, text, style) as ArcadeText;
  scene.physics.add.existing(actor);

  return actor;
}

export function setCircleBody(actor: ArcadeText, radius: number, offset = 0) {
  actor.body.setCircle(radius, offset, offset);
}

export function isBossEnemy(actor: Phaser.GameObjects.GameObject) {
  return (actor as ArcadeText).getData('isBoss') === true;
}

