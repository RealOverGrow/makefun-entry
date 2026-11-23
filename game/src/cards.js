// Cards and the deck. A card has a value (1-10) and an element (fire, water, leaf).
// Element advantage is rock-paper-scissors: fire > leaf > water > fire.
import { ELEMENTS, ELEMENT_KEYS } from './config.js';

export function elementBeats(a, b) {
  return ELEMENTS[a].beats === b;
}

export function makeDeck(random) {
  const deck = [];
  for (const el of ELEMENT_KEYS) {
    for (let value = 1; value <= 10; value += 1) {
      deck.push({ element: el, value });
      deck.push({ element: el, value });
    }
  }
  // Fisher-Yates shuffle with the seeded random.
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Damage the winner deals: value difference plus 3 when its element beats the loser's. */
export function roundDamage(winnerCard, loserCard) {
  const diff = winnerCard.value - loserCard.value;
  const bonus = elementBeats(winnerCard.element, loserCard.element) ? 3 : 0;
  return Math.max(0, diff + bonus);
}
