import Phaser from 'phaser';
import { GameScene } from './GameScreen';
import { createMobileControls } from './ui/mobileControls';
import './style.css';

const app = document.getElementById('app');

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: app?.clientWidth || window.innerWidth,
    height: app?.clientHeight || window.innerHeight,
    parent: 'app',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#1a1a1a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);

createMobileControls(game);

const resizeGame = () => {
    if (!app) {
        return;
    }

    game.scale.resize(app.clientWidth, app.clientHeight);
};

window.addEventListener('resize', resizeGame);
window.visualViewport?.addEventListener('resize', resizeGame);
resizeGame();
