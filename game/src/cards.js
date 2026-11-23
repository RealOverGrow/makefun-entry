// Cards, the deck, fusion and combat.
// A base card has a value (1-10) and an element (fire, water, leaf):
//   ATK = value, DEF = 11 - value, so ATK + DEF = 11.
// A fused card has ATK/DEF summed from its two parents (cap 15), plus +2 to both
// when the parents share an element. A fused card cannot be fused again.
import { ELEMENTS, ELEMENT_KEYS, ELEMENT_BONUS, FUSION_CAP } from './config.js';

export function elementBeats(a, b) {
  return ELEMENTS[a].beats === b;
}

export function makeCard(element, value) {
  return { element, value, atk: value, def: 11 - value, fused: false };
}

export function makeDeck(random) {
  const deck = [];
  for (const el of ELEMENT_KEYS) {
    for (let value = 1; value <= 10; value += 1) {
      deck.push(makeCard(el, value));
    }
  }
  // Fisher-Yates shuffle with the seeded random.
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Fuse two cards into one. Returns the fused card, or null when the fusion is not
 * allowed (either card is already fused). The fused card keeps the element of the
 * higher-ATK parent (the first parent on a tie).
 */
export function fuseCards(a, b) {
  if (!a || !b || a.fused || b.fused) return null;
  const same = a.element === b.element;
  const bonus = same ? ELEMENT_BONUS : 0;
  const element = a.atk >= b.atk ? a.element : b.element;
  return {
    element,
    value: null,
    atk: Math.min(FUSION_CAP, a.atk + b.atk + bonus),
    def: Math.min(FUSION_CAP, a.def + b.def + bonus),
    fused: true,
  };
}

/**
 * Resolve one attack (atkCard) against one block (defCard).
 * Effective ATK = ATK + 2 when the attacker's element beats the defender's.
 * Returns { effAtk, dmgToDefender, dmgToAttacker, atkDestroyed, defDestroyed }.
 */
export function resolveCombat(atkCard, defCard) {
  const effAtk = atkCard.atk + (elementBeats(atkCard.element, defCard.element) ? ELEMENT_BONUS : 0);
  if (effAtk > defCard.def) {
    return { effAtk, dmgToDefender: effAtk - defCard.def, dmgToAttacker: 0, atkDestroyed: false, defDestroyed: true };
  }
  if (effAtk < defCard.def) {
    return { effAtk, dmgToDefender: 0, dmgToAttacker: defCard.def - effAtk, atkDestroyed: true, defDestroyed: false };
  }
  return { effAtk, dmgToDefender: 0, dmgToAttacker: 0, atkDestroyed: true, defDestroyed: true };
}

/** Short label for a card, used in the log: "Fire 7" or "FUSION Fire 14/12". */
export function cardLabel(card) {
  const name = card.element[0].toUpperCase() + card.element.slice(1);
  if (card.fused) return `FUSION ${name} ${card.atk}/${card.def}`;
  return `${name} ${card.value}`;
}
