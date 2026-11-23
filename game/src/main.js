// Boot and the one loop: input is read every frame, the reveal timer advances, and the
// renderer paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_OVER, PHASE_PICK, PHASE_REVEAL, PHASE_TITLE } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, playerCardRect, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let hover = -1;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    announce('Playing. Pick a card.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.round > best) {
      best = world.state.round;
      saveBest(best);
    }
    announce(world.state.result === 'win' ? 'You win!' : 'You lose.');
  }

  function pickCard(i) {
    if (screen !== SCREEN_PLAY || world.state.phase !== PHASE_PICK) return;
    if (world.playCard(i)) announce(world.state.lastText);
  }

  function handleClick(click) {
    if (!click) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY || world.state.phase !== PHASE_PICK) return;
    for (let i = 0; i < world.state.playerHand.length; i += 1) {
      const r = playerCardRect(i, world.state.playerHand.length);
      if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
        pickCard(i);
        return;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    const actions = input.takeActions();
    const keyPick = input.takePick();
    const click = input.takeClick();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (keyPick >= 0) pickCard(keyPick);
    if (click) handleClick(click);
    if (screen === SCREEN_PLAY && world.state.phase === PHASE_REVEAL) {
      if (world.stepReveal(dt) && world.state.phase === PHASE_OVER) endGame();
    }
    // Hover highlight for the player's hand.
    hover = -1;
    renderer.draw(world.state, screen, best, hover);
  }

  announce('Ember Clash. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
