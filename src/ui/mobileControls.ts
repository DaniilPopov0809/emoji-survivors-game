import Phaser from 'phaser';
import { GameScene } from '../GameScreen';

type Direction = 'up' | 'down' | 'left' | 'right';

interface MobileControls {
  destroy(): void;
}

function getScene(game: Phaser.Game) {
  return game.scene.getScene('GameScene') as GameScene | undefined;
}

function createButton(
  label: string,
  className: string,
  onPress: () => void,
  onRelease: () => void
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', label);

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    onPress();
  });

  button.addEventListener('pointerup', (event) => {
    event.preventDefault();
    onRelease();
  });

  button.addEventListener('pointercancel', onRelease);
  button.addEventListener('pointerleave', onRelease);

  return button;
}

export function createMobileControls(game: Phaser.Game): MobileControls {
  const root = document.createElement('div');
  root.className = 'mobile-controls';

  const isCompact = window.matchMedia('(max-width: 1023px)');
  const movementState: Direction[] = ['up', 'down', 'left', 'right'];

  const setDirection = (direction: Direction, pressed: boolean) => {
    getScene(game)?.setVirtualControlState(direction, pressed);
  };

  const dock = document.createElement('div');
  dock.className = 'mobile-controls__dock';

  const pauseButton = createButton(
    'Pause',
    'mobile-controls__pause',
    () => {
      getScene(game)?.togglePause();
      movementState.forEach((direction) => setDirection(direction, false));
    },
    () => undefined
  );

  const pad = document.createElement('div');
  pad.className = 'mobile-controls__controls';

  const up = createButton('↑', 'mobile-controls__button mobile-controls__button--up', () => setDirection('up', true), () => setDirection('up', false));
  const left = createButton('←', 'mobile-controls__button mobile-controls__button--left', () => setDirection('left', true), () => setDirection('left', false));
  const down = createButton('↓', 'mobile-controls__button mobile-controls__button--down', () => setDirection('down', true), () => setDirection('down', false));
  const right = createButton('→', 'mobile-controls__button mobile-controls__button--right', () => setDirection('right', true), () => setDirection('right', false));

  pad.append(up, left, down, right);
  dock.append(pauseButton, pad);
  root.append(dock);

  const parent = game.canvas.parentElement ?? document.getElementById('app') ?? document.body;
  parent.append(root);

  const syncVisibility = () => {
    root.hidden = !isCompact.matches;
  };

  const resetMovement = () => {
    movementState.forEach((direction) => setDirection(direction, false));
  };

  syncVisibility();
  isCompact.addEventListener('change', syncVisibility);
  window.addEventListener('blur', resetMovement);

  return {
    destroy() {
      isCompact.removeEventListener('change', syncVisibility);
      window.removeEventListener('blur', resetMovement);
      root.remove();
    }
  };
}
