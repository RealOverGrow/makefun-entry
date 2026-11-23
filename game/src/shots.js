// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { PHASE_ATTACK, PHASE_DEFEND, PHASE_OVER, PHASE_REVEAL } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { ACHIEVEMENTS, makeProgress } from './achievements.js';

/** Staged progress snapshots (the shots bypass localStorage, so the counts
 *  are set here). Title shows 3 wins with two badges; the win shot shows
 *  5 wins with the Duel Master unlock banner; the loss shot shows 5 wins
 *  with no new unlock. */
function stagedProgress(name) {
  if (name === 'win') {
    return makeProgress(5, ACHIEVEMENTS[2]); // Duel Master just unlocked
  }
  if (name === 'loss' || name === 'play') {
    return makeProgress(3);
  }
  return makeProgress(3);
}

/** The same-element unfused pair with the highest ATK sum, or null. */
function bestPair(hand) {
  let best = null;
  let bestAtk = -1;
  for (let i = 0; i < hand.length; i += 1) {
    if (hand[i].fused) continue;
    for (let j = i + 1; j < hand.length; j += 1) {
      if (hand[j].fused) continue;
      if (hand[i].element !== hand[j].element) continue;
      const atk = hand[i].atk + hand[j].atk;
      if (atk > bestAtk) {
        bestAtk = atk;
        best = [i, j];
      }
    }
  }
  return best;
}

/** Best hand index by scoreFn; when keepFused, unfused cards are preferred. */
function pickCardIndex(hand, scoreFn, keepFused) {
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < hand.length; i += 1) {
    if (keepFused && hand[i].fused) continue;
    const score = scoreFn(hand[i]);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best === -1) {
    for (let i = 0; i < hand.length; i += 1) {
      const score = scoreFn(hand[i]);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
  }
  return best;
}

/**
 * One autopilot step. strong: play the best cards (and fuse); weak: play the worst
 * and never fuse. keepFused: leave a fused card in hand so it shows in the frame.
 */
function step(world, strong, keepFused) {
  const { state } = world;
  if (state.phase === PHASE_ATTACK) {
    if (strong) {
      const hasFused = state.playerHand.some((c) => c.fused);
      if (!hasFused) {
        const pair = bestPair(state.playerHand);
        if (pair) world.fusePlayer(pair[0], pair[1]);
      }
    }
    const i = pickCardIndex(state.playerHand, (c) => (strong ? c.atk : -c.atk), keepFused);
    if (i < 0) return false;
    return world.playerAttack(i);
  }
  if (state.phase === PHASE_DEFEND) {
    const i = pickCardIndex(state.playerHand, (c) => (strong ? c.def : -c.def), keepFused);
    if (i < 0) return false;
    return world.playerDefend(i);
  }
  if (state.phase === PHASE_REVEAL) {
    world.nextRound();
    return true;
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score.
 * start: title. play: a mid-game reveal (round 4). win: the foe at 0 HP. loss: the
 * player at 0 HP.
 */
export function stageShot(name, world) {
  const { state } = world;
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return { screen: SCREEN_TITLE, best: 0, progress: stagedProgress('start') };
  }
  const strong = name !== 'loss';
  const keepFused = name === 'play';
  let guard = 0;
  while (guard < 400) {
    guard += 1;
    if (state.result) break;
    if (name === 'play' && state.round >= 4 && state.phase === PHASE_REVEAL) break;
    if (!step(world, strong, keepFused)) break;
  }
  if (name === 'play') return { screen: SCREEN_PLAY, best: 0, progress: stagedProgress('play') };
  // win / loss: the world is over; make sure the phase is OVER for the banner.
  if (state.phase === PHASE_REVEAL) world.nextRound();
  return { screen: SCREEN_OVER, best: state.round, progress: stagedProgress(name) };
}
