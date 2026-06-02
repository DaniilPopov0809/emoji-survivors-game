import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private title?: Phaser.GameObjects.Text;
  private playButton?: Phaser.GameObjects.Text;
  private titleTween?: Phaser.Tweens.Tween;
  private createByText?: Phaser.GameObjects.Text;
  private emailLink?: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create() {
    this.createUi();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private createUi() {
    if (this.title && this.playButton && this.createByText) {
      return;
    }

    const { width } = this.scale;
    const isMobile = width < 1024;

    this.title = this.add.text(0, 0, '🤖 EMOJI SURVIVORS 🍆', {
      fontSize: isMobile ? '24px' : '48px',
      fontFamily: 'Orbitron',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.playButton = this.add.text(0, 0, '▶ Play', {
      fontSize: '32px',
      fontFamily: 'Orbitron',
      backgroundColor: '#2ecc71',
      padding: { x: 20, y: 10 },
      color: '#ffffff'
    }).setOrigin(0.5);

    this.createByText = this.add.text(0, 0, `created by Daniil Popov ©${new Date().getFullYear()}`, {
      fontSize: '16px',
      fontFamily: 'Orbitron',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.emailLink = this.add.text(0, 0, 'x6uhrox@gmail.com', {
      fontSize: '14px',
      fontFamily: 'Orbitron',
      color: '#2ecc71'
    }).setOrigin(0.5);

    this.emailLink.setInteractive({ useHandCursor: true });
    this.emailLink.on('pointerdown', () => {
      window.location.href = 'mailto:x6uhrox@gmail.com';
    });

    this.playButton.setInteractive({ useHandCursor: true });

    this.playButton.on('pointerover', () => {
      this.playButton?.setStyle({ fill: '#ffeb3b', backgroundColor: '#27ae60' });
    });

    this.playButton.on('pointerout', () => {
      this.playButton?.setStyle({ fill: '#ffffff', backgroundColor: '#2ecc71' });
    });

    this.playButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }

  private layout() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const isMobile = width < 1024;

    if (!this.title || !this.playButton || !this.createByText || !this.emailLink) {
      return;
    }

    this.title.setFontSize(isMobile ? '24px' : '48px');
    this.title.setPosition(centerX, centerY - 100);
    this.playButton.setPosition(centerX, centerY + 80);
    this.createByText.setPosition(centerX, height - 50);
    this.emailLink.setPosition(centerX, height - 20);

    this.titleTween?.destroy();
    this.titleTween = this.tweens.add({
      targets: this.title,
      y: centerY - 80,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private handleResize() {
    this.layout();
  }

  private cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.titleTween?.destroy();
  }
}
