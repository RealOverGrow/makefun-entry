// Keyboard and pointer input for a card game. Clicks report their canvas position so the
// loop can tell which card was picked; keys 1-5 pick a hand card, Space/Enter confirms or
// restarts, P/Esc pauses, F toggles fusion mode.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FUSE = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const FUSE = new Set(['KeyF']);
const DIGITS = new Map([
  ['Digit1', 0], ['Digit2', 1], ['Digit3', 2], ['Digit4', 3], ['Digit5', 4],
  ['Numpad1', 0], ['Numpad2', 1], ['Numpad3', 2], ['Numpad4', 3], ['Numpad5', 4],
]);

export function createInput(canvas) {
  let actions = 0;
  let pick = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (FUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_FUSE;
    } else if (DIGITS.has(event.code)) {
      if (!event.repeat) pick = DIGITS.get(event.code);
    } else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takePick() {
      const taken = pick;
      pick = -1;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
