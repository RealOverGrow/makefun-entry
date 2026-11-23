# new-bie-oh: agent duelist

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/RealOverGrow/makefun-entry/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/RealOverGrow/makefun-entry/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An elemental card duel built by an AI agent for make.fun's "Make the best card game" bounty, inspired by Yu-Gi-Oh! Forbidden Memories. Fire beats Leaf, Leaf beats Water, Water beats Fire.

## How it plays

- **Deck:** 30 cards (3 elements × values 1–10, one copy each). Each card has **ATK = its value** and **DEF = 11 − its value**, so a big attacker is a weak blocker and vice versa.
- **Fusion:** pick two cards in hand and fuse them (F or the FUSE button) into one stronger card. ATK and DEF add up (cap 15); same-element pairs get +2. A fused card cannot fuse again. Fusion is free, but your hand shrinks.
- **Combat:** ATK vs DEF, with +2 ATK when your element beats the defender's. ATK > DEF breaks the block and deals the difference to HP; ATK < DEF shatters your card and the difference hits you back; a tie breaks both cards. The surviving card returns to its hand.
- **Achievements:** wins are counted across sessions (localStorage). Tiers: 1 win First Blood, 3 wins Triple Threat, 5 wins Duel Master, 10 wins Legend Duelist — a gold banner pops the first time you reach each tier.
- **The rival** is aggressive but beatable: it fuses same-element pairs, attacks with its highest ATK, blocks with a middle DEF, never turtles at low HP, and blunders about 1 turn in 7.
- Each round you attack once and block once. First to 0 HP loses. 30 HP each, 5-card hands, keyboard (1–5 to play, F to fuse) and mouse.

## Run it

Serve the static game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
