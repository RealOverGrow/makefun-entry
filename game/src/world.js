// The game state: two fighters, their hands, the played cards, the round and the log.
// Phases: 'title' -> 'pick' (player chooses a card) -> 'reveal' (cards shown, damage applied)
// -> 'over' (win or loss). The world is pure state; the renderer paints it, input drives it.
import { HAND_SIZE, MAX_HP } from './config.js';
import { makeDeck, roundDamage } from './cards.js';

export const PHASE_TITLE = 'title';
export const PHASE_PICK = 'pick';
export const PHASE_REVEAL = 'reveal';
export const PHASE_OVER = 'over';

export function createWorld(random) {
  const state = {
    playerHp: MAX_HP,
    foeHp: MAX_HP,
    playerHand: [],
    foeHand: [],
    deck: [],
    playerCard: null,
    foeCard: null,
    phase: PHASE_TITLE,
    round: 0,
    wins: 0,
    result: null, // 'win' | 'loss' | null
    lastDamage: 0,
    lastText: '',
    log: [],
    revealT: 0,
  };

  function draw(hand) {
    if (state.deck.length === 0) state.deck = makeDeck(random);
    const card = state.deck.pop();
    hand.push(card);
    return card;
  }

  function reset() {
    state.playerHp = MAX_HP;
    state.foeHp = MAX_HP;
    state.deck = makeDeck(random);
    state.playerHand = [];
    state.foeHand = [];
    for (let i = 0; i < HAND_SIZE; i += 1) {
      state.playerHand.push(state.deck.pop());
      state.foeHand.push(state.deck.pop());
    }
    state.playerCard = null;
    state.foeCard = null;
    state.phase = PHASE_PICK;
    state.round = 1;
    state.result = null;
    state.lastDamage = 0;
    state.lastText = 'Pick a card to play.';
    state.log = ['Round 1 — pick a card.'];
    state.revealT = 0;
  }

  /** The player plays the card at hand index `i`. The foe answers with a random card. */
  function playCard(i) {
    if (state.phase !== PHASE_PICK) return false;
    if (i < 0 || i >= state.playerHand.length) return false;
    const foeIndex = Math.floor(random() * state.foeHand.length);
    state.playerCard = state.playerHand.splice(i, 1)[0];
    state.foeCard = state.foeHand.splice(foeIndex, 1)[0];
    const p = state.playerCard;
    const f = state.foeCard;
    if (p.value > f.value) {
      const dmg = roundDamage(p, f);
      state.foeHp = Math.max(0, state.foeHp - dmg);
      state.lastDamage = dmg;
      state.lastText = `You win the round! ${p.value} beats ${f.value} — ${dmg} damage.`;
      state.log.push(`R${state.round}: you ${p.value} vs foe ${f.value} — you deal ${dmg}.`);
    } else if (f.value > p.value) {
      const dmg = roundDamage(f, p);
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.lastDamage = dmg;
      state.lastText = `Foe wins the round. ${f.value} beats ${p.value} — you take ${dmg}.`;
      state.log.push(`R${state.round}: you ${p.value} vs foe ${f.value} — you take ${dmg}.`);
    } else {
      state.lastDamage = 0;
      state.lastText = `Tie at ${p.value} — no damage.`;
      state.log.push(`R${state.round}: tie at ${p.value}.`);
    }
    if (state.log.length > 4) state.log.shift();
    state.phase = PHASE_REVEAL;
    state.revealT = 0;
    if (state.foeHp <= 0) {
      state.result = 'win';
      state.wins += 1;
    } else if (state.playerHp <= 0) {
      state.result = 'loss';
    }
    return true;
  }

  /** After the reveal, clear the table, draw back up to a full hand, and start the next round. */
  function nextRound() {
    if (state.phase !== PHASE_REVEAL) return;
    if (state.result) {
      state.phase = PHASE_OVER;
      return;
    }
    state.playerCard = null;
    state.foeCard = null;
    while (state.playerHand.length < HAND_SIZE) draw(state.playerHand);
    while (state.foeHand.length < HAND_SIZE) draw(state.foeHand);
    state.round += 1;
    state.phase = PHASE_PICK;
    state.lastText = 'Pick a card to play.';
    state.log.push(`Round ${state.round} — pick a card.`);
    if (state.log.length > 4) state.log.shift();
  }

  /** Advance the reveal timer (seconds); returns true when the reveal is done. */
  function stepReveal(dt) {
    if (state.phase !== PHASE_REVEAL) return false;
    state.revealT += dt;
    if (state.revealT >= 1.6) {
      nextRound();
      return true;
    }
    return false;
  }

  return { state, reset, playCard, nextRound, stepReveal };
}
