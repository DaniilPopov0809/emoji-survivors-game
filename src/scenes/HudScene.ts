import Phaser from 'phaser';
import { getViewport } from '../game/layout';

const hudOffset = {
  scoreX: 20,
  scoreY: 20,
  levelRight: 20,
  levelY: 20
};

export class HudScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;

  private gameOverText?: Phaser.GameObjects.Text;
  private restartText?: Phaser.GameObjects.Text;

  private pauseText?: Phaser.GameObjects.Text;
  private pauseHintText?: Phaser.GameObjects.Text;

  private gameScene?: Phaser.Scene;

  constructor() {
    super('HudScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    this.scoreText = this.add.text(hudOffset.scoreX, hudOffset.scoreY, '⭐ Score: 0', {
      fontSize: '20px',
      color: '#dfcb1f',
      fontFamily: 'Orbitron'
    });

    const bestScore = localStorage.getItem('bestScore') ?? '0';
    this.bestScoreText = this.add.text(hudOffset.scoreX, hudOffset.scoreY + 40, `🏆 Best: ${bestScore}`, {
      fontSize: '20px',
      color: '#be2f0b',
      fontFamily: 'Orbitron'
    });

    this.lvlText = this.add.text(0, hudOffset.levelY, 'Level 1', {
      fontSize: '20px',
      color: '#1278a7',
      fontFamily: 'Orbitron'
    });
    this.lvlText.setOrigin(1, 0);

    this.layout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    if (this.gameScene) {
      this.gameScene.events.on('score-changed', this.handleScoreChanged, this);
      this.gameScene.events.on('level-changed', this.handleLevelChanged, this);
      this.gameScene.events.on('game-over', this.showGameOver, this);
      this.gameScene.events.on('game-restart', this.hideGameOver, this);
      this.gameScene.events.on('game-paused', this.showPauseOverlay, this);
      this.gameScene.events.on('game-resumed', this.hidePauseOverlay, this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private handleScoreChanged(score: number) {
    this.scoreText.setText(`⭐ Score: ${score}`);
    const bestScore = Number(localStorage.getItem('bestScore') ?? '0');
    if (score > bestScore) {
      localStorage.setItem('bestScore', String(score));
      this.bestScoreText.setText(`🏆 Best: ${score}`);
    }
  }

  private handleLevelChanged(level: number) {
    this.lvlText.setText(`Level ${level}`);
  }

  private showGameOver() {
    const viewport = getViewport(this);

    if (!this.gameOverText) {
      this.gameOverText = this.add.text(viewport.centerX, viewport.centerY - 50, 'GAME OVER', {
        fontSize: '44px',
        color: '#811010',
        fontFamily: 'Orbitron',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    if (!this.restartText) {
      this.restartText = this.add.text(viewport.centerX, viewport.centerY + 40, 'Click or press any key to restart', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Orbitron'
      }).setOrigin(0.5);
    }

    this.layout();
  }

  private hideGameOver() {
    this.gameOverText?.destroy();
    this.restartText?.destroy();
    this.gameOverText = undefined;
    this.restartText = undefined;
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

    this.layout();
  }

  private hidePauseOverlay() {
    this.pauseText?.destroy();
    this.pauseHintText?.destroy();
    this.pauseText = undefined;
    this.pauseHintText = undefined;
  }

  private layout() {
    const viewport = getViewport(this);

    this.scoreText.setPosition(hudOffset.scoreX, hudOffset.scoreY);
    this.bestScoreText.setPosition(hudOffset.scoreX, hudOffset.scoreY + 40);
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

  private handleResize() {
    this.layout();
  }

  private cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    if (this.gameScene) {
      this.gameScene.events.off('score-changed', this.handleScoreChanged, this);
      this.gameScene.events.off('level-changed', this.handleLevelChanged, this);
      this.gameScene.events.off('game-over', this.showGameOver, this);
      this.gameScene.events.off('game-restart', this.hideGameOver, this);
      this.gameScene.events.off('game-paused', this.showPauseOverlay, this);
      this.gameScene.events.off('game-resumed', this.hidePauseOverlay, this);
    }
  }
}
