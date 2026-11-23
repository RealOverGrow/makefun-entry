// Win counter + achievement tiers for new-bie-oh: agent duelist.
// Pure logic (no DOM, no storage) so it can be tested in Node.
// Tiers: 1 win First Blood, 3 wins Triple Threat, 5 wins Duel Master,
// 10 wins Legend Duelist. Wins are cumulative across sessions; losses
// never reset the counter.
export const ACHIEVEMENTS = [
  { id: 'first-blood', wins: 1, name: 'First Blood', blurb: 'Win your first duel.' },
  { id: 'triple-threat', wins: 3, name: 'Triple Threat', blurb: 'Win 3 duels.' },
  { id: 'duel-master', wins: 5, name: 'Duel Master', blurb: 'Win 5 duels.' },
  { id: 'legend-duelist', wins: 10, name: 'Legend Duelist', blurb: 'Win 10 duels.' },
];

/** Achievements whose threshold the win count has reached. */
export function unlockedFor(wins) {
  return ACHIEVEMENTS.filter((a) => wins >= a.wins);
}

/** The next achievement not yet reached, or null when all are unlocked. */
export function nextAchievement(wins) {
  return ACHIEVEMENTS.find((a) => wins < a.wins) ?? null;
}

/** Achievements reached at `wins` that are not in `unlockedIds` yet —
 *  i.e. the ones whose unlock popup should fire now (first time only). */
export function newlyUnlocked(wins, unlockedIds) {
  const have = new Set(unlockedIds);
  return ACHIEVEMENTS.filter((a) => wins >= a.wins && !have.has(a.id));
}

/** One-line progress text for the title / win screens. */
export function progressText(wins) {
  const next = nextAchievement(wins);
  if (!next) return 'All achievements unlocked!';
  const left = next.wins - wins;
  return `Next: ${next.name} — ${left} more win${left === 1 ? '' : 's'}`;
}

/**
 * Build the progress snapshot the renderer needs:
 * { wins, unlocked: [achievement...], newUnlock: achievement|null, next: achievement|null }
 * Badges reflect the win count directly (self-healing); the stored id list
 * is only used to decide whether the unlock popup fires for the first time.
 */
export function makeProgress(wins, newUnlock = null) {
  return {
    wins,
    unlocked: unlockedFor(wins),
    newUnlock,
    next: nextAchievement(wins),
  };
}
