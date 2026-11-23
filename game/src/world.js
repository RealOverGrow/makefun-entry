// The game state: two fighters, their hands, the played cards, the round and the log.
// One round has two exchanges: the player attacks (foe blocks), then the foe attacks
// (the player blocks). Fusion is a free action in either decision phase.
// Phases: 'title' -> 'attack' (player picks an attack card) -> 'reveal'
// -> 'defend' (player picks a block card) -> 'reveal' -> 'over' (win or loss).
// The world is pure state; the renderer paints it, input drives it.
import { HAND_SIZE, MAX_HP } from './config.js';
import { makeDeck, resolveCombat, fuseCards, cardLabel, elementBeats } from './cards.js';

export const PHASE_TITLE = 'title';
export const PHASE_ATTACK = 'attack';
export const PHASE_DEFEND = 'defend';
export const PHASE_REVEAL = 'reveal';
export const PHASE_OVER = 'over';

export function createWorld(random) {
  const state = {
    playerHp: MAX_HP,
    foeHp: MAX_HP,
    playerHand: [],
    foeHand: [],
    deck: [],
    playerCard: null, // card the player played this exchange (attack or block)
    foeCard: null, // card the foe played this exchange (block or attack)
    phase: PHASE_TITLE,
    exchange: 'attack', // 'attack' (player attacks) or 'defend' (foe attacks)
    round: 0,
    wins: 0,
    result: null, // 'win' | 'loss' | null
    lastDamage: 0,
    lastText: '',
    log: [],
    revealT: 0,
    survivor: null, // { card, side } — the card that survived, returned to hand after the reveal
    playerLastElement: null,
  };

  function draw(hand) {
    if (state.deck.length === 0) state.deck = makeDeck(random);
    const card = state.deck.pop();
    hand.push(card);
    return card;
  }

  function refill() {
    while (state.playerHand.length < HAND_SIZE) draw(state.playerHand);
    while (state.foeHand.length < HAND_SIZE) draw(state.foeHand);
  }

  function pushLog(text) {
    state.log.push(text);
    if (state.log.length > 4) state.log.shift();
  }

  function checkResult() {
    if (state.foeHp <= 0) {
      state.result = 'win';
      state.wins += 1;
    } else if (state.playerHp <= 0) {
      state.result = 'loss';
    }
  }

  /** The foe fuses two same-element cards in hand, 80% of the time it can. */
  function foeMaybeFuse() {
    const hand = state.foeHand;
    let bestPair = null;
    let bestAtk = -1;
    for (let i = 0; i < hand.length; i += 1) {
      if (hand[i].fused) continue;
      for (let j = i + 1; j < hand.length; j += 1) {
        if (hand[j].fused) continue;
        if (hand[i].element !== hand[j].element) continue;
        const atk = hand[i].atk + hand[j].atk;
        if (atk > bestAtk) {
          bestAtk = atk;
          bestPair = [i, j];
        }
      }
    }
    if (!bestPair || random() >= 0.8) return false;
    const [i, j] = bestPair;
    const a = hand[i];
    const b = hand[j];
    const fused = fuseCards(a, b);
    if (!fused) return false;
    hand.splice(Math.max(i, j), 1);
    hand.splice(Math.min(i, j), 1);
    hand.push(fused);
    pushLog(`Rival fuses ${cardLabel(a)} + ${cardLabel(b)}!`);
    return true;
  }

  /** The foe's block: a middle DEF card (2nd-highest), sometimes a random one. */
  function foeDefenseIndex() {
    const hand = state.foeHand;
    if (hand.length === 0) draw(hand);
    if (hand.length === 1 || random() < 0.3) return Math.floor(random() * hand.length);
    const order = hand.map((c, i) => i).sort((a, b) => hand[b].def - hand[a].def);
    return order[1];
  }

  /** The foe's attack: its highest-ATK card, preferring an element edge over the
   *  player's last card; 15% of the time it blunders and plays a random card. */
  function foeAttackIndex() {
    const hand = state.foeHand;
    if (hand.length === 0) draw(hand);
    if (random() < 0.15) return Math.floor(random() * hand.length);
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < hand.length; i += 1) {
      const card = hand[i];
      // Prefer the element that beats the player's last card.
      const score = card.atk + (state.playerLastElement && elementBeats(card.element, state.playerLastElement) ? 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
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
    state.phase = PHASE_ATTACK;
    state.exchange = 'attack';
    state.round = 1;
    state.result = null;
    state.lastDamage = 0;
    state.lastText = 'Pick a card to attack.';
    state.log = ['Round 1 — pick a card to attack.'];
    state.revealT = 0;
    state.survivor = null;
    state.playerLastElement = null;
    foeMaybeFuse();
  }

  /** Fuse two of the player's hand cards (indices i, j). Free action; the hand shrinks. */
  function fusePlayer(i, j) {
    if (state.phase !== PHASE_ATTACK && state.phase !== PHASE_DEFEND) return false;
    if (i === j || i < 0 || j < 0 || i >= state.playerHand.length || j >= state.playerHand.length) return false;
    const a = state.playerHand[i];
    const b = state.playerHand[j];
    const fused = fuseCards(a, b);
    if (!fused) return false;
    state.playerHand.splice(Math.max(i, j), 1);
    state.playerHand.splice(Math.min(i, j), 1);
    state.playerHand.push(fused);
    state.lastText = `Fused ${cardLabel(a)} + ${cardLabel(b)} → ${cardLabel(fused)}!`;
    pushLog(state.lastText);
    return true;
  }

  /** Resolve one exchange and write the outcome into the state. */
  function resolveExchange(atkCard, defCard, atkSide) {
    const r = resolveCombat(atkCard, defCard);
    const atkLabel = cardLabel(atkCard);
    const defLabel = cardLabel(defCard);
    const edge = r.effAtk > atkCard.atk ? ' (element edge +2)' : '';
    if (r.dmgToDefender > 0) {
      if (atkSide === 'player') state.foeHp = Math.max(0, state.foeHp - r.dmgToDefender);
      else state.playerHp = Math.max(0, state.playerHp - r.dmgToDefender);
      state.lastDamage = r.dmgToDefender;
      state.lastText = `${atkLabel} breaks ${defLabel}${edge} — ${r.dmgToDefender} damage!`;
      pushLog(`${atkSide === 'player' ? 'You' : 'Rival'} deal ${r.dmgToDefender} (${atkCard.atk} vs ${defCard.def}).`);
      state.survivor = { card: atkCard, side: atkSide };
    } else if (r.dmgToAttacker > 0) {
      if (atkSide === 'player') state.playerHp = Math.max(0, state.playerHp - r.dmgToAttacker);
      else state.foeHp = Math.max(0, state.foeHp - r.dmgToAttacker);
      state.lastDamage = r.dmgToAttacker;
      state.lastText = `${defLabel} holds! ${atkLabel}${edge} shatters — ${r.dmgToAttacker} damage back.`;
      pushLog(`${atkSide === 'player' ? 'You take' : 'Rival takes'} ${r.dmgToAttacker} back (${atkCard.atk} vs ${defCard.def}).`);
      state.survivor = { card: defCard, side: atkSide === 'player' ? 'foe' : 'player' };
    } else {
      state.lastDamage = 0;
      state.lastText = `${atkLabel} clashes with ${defLabel}${edge} — both shatter!`;
      pushLog(`Tie: ${atkCard.atk} vs ${defCard.def} — both cards break.`);
      state.survivor = null;
    }
    checkResult();
  }

  /** The player attacks with the card at hand index `i`; the foe blocks. */
  function playerAttack(i) {
    if (state.phase !== PHASE_ATTACK) return false;
    if (i < 0 || i >= state.playerHand.length) return false;
    state.playerCard = state.playerHand.splice(i, 1)[0];
    state.playerLastElement = state.playerCard.element;
    const defIndex = foeDefenseIndex();
    state.foeCard = state.foeHand.splice(defIndex, 1)[0];
    resolveExchange(state.playerCard, state.foeCard, 'player');
    state.phase = PHASE_REVEAL;
    state.exchange = 'attack';
    state.revealT = 0;
    return true;
  }

  /** The player blocks the foe's attack with the card at hand index `i`. */
  function playerDefend(i) {
    if (state.phase !== PHASE_DEFEND) return false;
    if (i < 0 || i >= state.playerHand.length) return false;
    if (!state.foeCard) return false;
    state.playerCard = state.playerHand.splice(i, 1)[0];
    state.playerLastElement = state.playerCard.element;
    resolveExchange(state.foeCard, state.playerCard, 'foe');
    state.phase = PHASE_REVEAL;
    state.exchange = 'defend';
    state.revealT = 0;
    return true;
  }

  /** After the reveal: return the survivor to its hand, then move on. */
  function nextRound() {
    if (state.phase !== PHASE_REVEAL) return;
    if (state.survivor) {
      const { card, side } = state.survivor;
      (side === 'player' ? state.playerHand : state.foeHand).push(card);
      pushLog(`${cardLabel(card)} survives and returns to ${side === 'player' ? 'your' : 'the rival'} hand.`);
      state.survivor = null;
    }
    if (state.result) {
      state.playerCard = null;
      state.foeCard = null;
      state.phase = PHASE_OVER;
      return;
    }
    if (state.exchange === 'attack') {
      // The foe now attacks: it picks its attack card and shows it.
      state.playerCard = null;
      state.foeCard = null;
      const atkIndex = foeAttackIndex();
      state.foeCard = state.foeHand.splice(atkIndex, 1)[0];
      state.phase = PHASE_DEFEND;
      state.exchange = 'defend';
      state.lastText = `Rival attacks with ${cardLabel(state.foeCard)}! Pick a card to block.`;
      pushLog(`Rival attacks — block it!`);
      return;
    }
    // The defend exchange is done: clear the table, refill, new round.
    state.playerCard = null;
    state.foeCard = null;
    refill();
    foeMaybeFuse();
    state.round += 1;
    state.phase = PHASE_ATTACK;
    state.exchange = 'attack';
    state.lastText = 'Pick a card to attack.';
    pushLog(`Round ${state.round} — pick a card to attack.`);
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

  return { state, reset, playerAttack, playerDefend, fusePlayer, nextRound, stepReveal, foeMaybeFuse };
}
