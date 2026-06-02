import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';

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

  const isMobile = window.matchMedia('(max-width: 1023px)');
  const movementState: Direction[] = ['up', 'down', 'left', 'right'];

  const setDirection = (direction: Direction, pressed: boolean) => {
    getScene(game)?.setVirtualControlState(direction, pressed);
  };

  const dock = document.createElement('div');
  dock.className = 'mobile-controls__dock';

  const actions = document.createElement('div');
  actions.className = 'mobile-controls__actions';

  const pauseButton = createButton(
    'Pause',
    'mobile-controls__pause',
    () => {
      getScene(game)?.togglePause();
      movementState.forEach((direction) => setDirection(direction, false));
    },
    () => undefined
  );

  const muteButton = createButton(
    getScene(game)?.isMuted() ? 'Muted' : 'Sound',
    'mobile-controls__mute',
    () => {
      const muted = getScene(game)?.toggleMute() ?? false;
      muteButton.textContent = muted ? 'Muted' : 'Sound';
      muteButton.setAttribute('aria-label', muteButton.textContent);
    },
    () => undefined
  );

  const pad = document.createElement('div');
  pad.className = 'mobile-controls__controls';

  const up = createButton('UP', 'mobile-controls__button mobile-controls__button--up', () => setDirection('up', true), () => setDirection('up', false));
  const left = createButton('L', 'mobile-controls__button mobile-controls__button--left', () => setDirection('left', true), () => setDirection('left', false));
  const down = createButton('DN', 'mobile-controls__button mobile-controls__button--down', () => setDirection('down', true), () => setDirection('down', false));
  const right = createButton('R', 'mobile-controls__button mobile-controls__button--right', () => setDirection('right', true), () => setDirection('right', false));

  actions.append(muteButton, pauseButton);
  pad.append(up, left, down, right);
  dock.append(actions, pad);
  root.append(dock);

  const parent = game.canvas.parentElement ?? document.getElementById('app') ?? document.body;
  parent.append(root);

  const syncVisibility = () => {
    const inGame = game.scene.isActive('GameScene');

    if (!inGame) {
      root.hidden = true;
      return;
    }

    root.hidden = false;

    up.hidden = !isMobile.matches;
    left.hidden = !isMobile.matches;
    down.hidden = !isMobile.matches;
    right.hidden = !isMobile.matches;
  };

  const resetMovement = () => {
    movementState.forEach((direction) => setDirection(direction, false));
  };

  syncVisibility();
  game.events.on(Phaser.Core.Events.STEP, syncVisibility);
  isMobile.addEventListener('change', syncVisibility);
  window.addEventListener('blur', resetMovement);

  return {
    destroy() {
      game.events.off(Phaser.Core.Events.STEP, syncVisibility);
      isMobile.removeEventListener('change', syncVisibility);
      window.removeEventListener('blur', resetMovement);
      root.remove();
    }
  };
}
