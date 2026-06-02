import Phaser from 'phaser';

export interface Viewport {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function getViewport(scene: Phaser.Scene): Viewport {
  const width = scene.scale.width;
  const height = scene.scale.height;

  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2
  };
}

export function getSpawnDistance(viewport: Viewport) {
  return Math.max(viewport.width, viewport.height) * 0.8;
}

