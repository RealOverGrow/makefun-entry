// Boot and the one loop: input is read every frame, the reveal timer advances, and the
// renderer paints what is there. The game moves between four screens: title, play, paused
// and game over. In play, each round has two exchanges: the player attacks (the foe
// blocks), then the foe attacks (the player blocks). F fuses two hand cards (free action).
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { ACH_KEY, BEST_KEY, WINS_KEY } from './config.js';
import { makeProgress, newlyUnlocked } from './achievements.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_ATTACK, PHASE_DEFEND, PHASE_OVER, PHASE_REVEAL, PHASE_TITLE } from './world.js';
import { ACTION_CONFIRM, ACTION_FUSE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, fuseButtonRect, playerCardRect, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
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

function readWins() {
  try {
    return Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveWins(value) {
  try {
    window.localStorage.setItem(WINS_KEY, String(value));
  } catch {
    // Storage can be off: the count then lasts this visit only.
  }
}

function readUnlockedIds() {
  try {
    const raw = window.localStorage.getItem(ACH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveUnlockedIds(ids) {
  try {
    window.localStorage.setItem(ACH_KEY, JSON.stringify(ids));
  } catch {
    // Storage can be off: the unlock record then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { progress: scene.progress });
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
  let wins = readWins();
  let unlockedIds = readUnlockedIds();
  let newUnlock = null; // achievement unlocked by the just-finished duel, if any
  let hover = -1;
  let fusionMode = false;
  let fuseSelect = [];
  let last = performance.now();

  function progress() {
    return makeProgress(wins, newUnlock);
  }

  function announce(message) {
    status.textContent = message;
  }

  function inDecision() {
    return screen === SCREEN_PLAY
      && (world.state.phase === PHASE_ATTACK || world.state.phase === PHASE_DEFEND);
  }

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    fusionMode = false;
    fuseSelect = [];
    newUnlock = null;
    announce('Playing. Pick a card to attack.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    fusionMode = false;
    fuseSelect = [];
    if (world.state.round > best) {
      best = world.state.round;
      saveBest(best);
    }
    if (world.state.result === 'win') {
      wins += 1;
      saveWins(wins);
      // Fire the unlock popup only the first time each tier is reached.
      const fresh = newlyUnlocked(wins, unlockedIds);
      if (fresh.length > 0) {
        newUnlock = fresh[fresh.length - 1];
        unlockedIds = [...unlockedIds, ...fresh.map((a) => a.id)];
        saveUnlockedIds(unlockedIds);
      } else {
        newUnlock = null;
      }
    } else {
      newUnlock = null;
    }
    announce(world.state.result === 'win' ? 'You win!' : 'You lose.');
  }

  function tryFuse() {
    if (fuseSelect.length !== 2) return false;
    const [i, j] = fuseSelect;
    if (world.fusePlayer(i, j)) {
      announce(world.state.lastText);
      fusionMode = false;
      fuseSelect = [];
      return true;
    }
    announce('Those cards cannot fuse — a fused card cannot fuse again.');
    fuseSelect = [];
    return false;
  }

  /** F (or the FUSE button): enter fusion mode, confirm a fusion, or cancel. */
  function toggleFusion() {
    if (!inDecision()) return;
    if (fusionMode && fuseSelect.length >= 2) {
      tryFuse();
      return;
    }
    if (fusionMode) {
      fusionMode = false;
      fuseSelect = [];
      announce('Fusion cancelled.');
    } else {
      fusionMode = true;
      fuseSelect = [];
      announce('Fusion mode — pick two cards to fuse.');
    }
  }

  function pickCard(i) {
    if (!inDecision()) return;
    if (i < 0 || i >= world.state.playerHand.length) return;
    if (fusionMode) {
      const at = fuseSelect.indexOf(i);
      if (at >= 0) fuseSelect.splice(at, 1);
      else if (fuseSelect.length < 2) fuseSelect.push(i);
      return;
    }
    const ok = world.state.phase === PHASE_ATTACK ? world.playerAttack(i) : world.playerDefend(i);
    if (ok) announce(world.state.lastText);
  }

  function handleClick(click) {
    if (!click) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (!inDecision()) return;
    const btn = fuseButtonRect(world.state, screen);
    if (btn && click.x >= btn.x && click.x <= btn.x + btn.w && click.y >= btn.y && click.y <= btn.y + btn.h) {
      toggleFusion();
      return;
    }
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
    if (actions & ACTION_FUSE) toggleFusion();
    if (keyPick >= 0) pickCard(keyPick);
    if (click) handleClick(click);
    if (screen === SCREEN_PLAY && world.state.phase === PHASE_REVEAL) {
      if (world.stepReveal(dt) && world.state.phase === PHASE_OVER) endGame();
    }
    if (!inDecision()) {
      fusionMode = false;
      fuseSelect = [];
    }
    // Hover highlight for the player's hand.
    hover = -1;
    renderer.draw(world.state, screen, best, { hover, fusionMode, fuseSelect, progress: progress() });
  }

  announce('new-bie-oh: agent duelist. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
