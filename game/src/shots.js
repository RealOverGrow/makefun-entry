// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { PHASE_OVER, PHASE_PICK, PHASE_REVEAL } from './world.js';
import { elementBeats } from './cards.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** The player's autopilot: the card with the best expected damage (value, then element edge). */
function bestCardIndex(state, strong) {
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < state.playerHand.length; i += 1) {
    const card = state.playerHand[i];
    // Opponent's best guess: compare against the foe's average card.
    let score = card.value;
    if (elementBeats(card.element, 'fire') || elementBeats(card.element, 'water') || elementBeats(card.element, 'leaf')) score += 1.5;
    if (!strong) score = -score;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Play one full round with the autopilot, leaving the table in the reveal phase. */
function playRound(world, strong) {
  const { state } = world;
  if (state.phase !== PHASE_PICK) return false;
  world.playCard(bestCardIndex(state, strong));
  return true;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score.
 * start: title. play: a mid-game reveal. win: the foe at 0 HP. loss: the player at 0 HP.
 */
export function stageShot(name, world) {
  const { state } = world;
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const strong = name !== 'loss';
  const targetRound = name === 'play' ? 4 : 40;
  let rounds = 0;
  while (rounds < targetRound) {
    if (state.phase === PHASE_PICK) {
      playRound(world, strong);
      rounds += 1;
      if (name === 'play' && rounds >= 4) break; // stop mid-reveal on round 4
      if (state.result) break;
    } else if (state.phase === PHASE_REVEAL) {
      world.nextRound();
    } else {
      break;
    }
  }
  if (name === 'play') return { screen: SCREEN_PLAY, best: 0 };
  // win / loss: the world is over; make sure the phase is OVER for the banner.
  if (state.phase === PHASE_REVEAL) world.nextRound();
  return { screen: SCREEN_OVER, best: state.round };
}
