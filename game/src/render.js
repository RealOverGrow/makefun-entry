// Canvas rendering for new-bie-oh: agent duelist. The table is a fixed 1280x720 logical area;
// the renderer scales it to the window. Screens: title, play, paused, over (win / loss).
import { CARD, ELEMENTS, FIELD, FONT, MAX_HP, PALETTE, SUBTITLE, TITLE } from './config.js';
import { makeCard } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HAND_Y_FOE = 78;
const HAND_Y_YOU = 540;
const PLAY_Y = 268;
const FUSE_BTN = { x: 1008, y: 592, w: 150, h: 46 };

function handX(index, count) {
  const total = count * CARD.w + (count - 1) * CARD.gap;
  return (FIELD.width - total) / 2 + index * (CARD.w + CARD.gap);
}

export function playerCardRect(index, count) {
  return { x: handX(index, count), y: HAND_Y_YOU, w: CARD.w, h: CARD.h };
}

/** The FUSE button rect, or null when it is not shown (only in decision phases). */
export function fuseButtonRect(state, screen) {
  if (screen !== SCREEN_PLAY) return null;
  if (state.phase !== 'attack' && state.phase !== 'defend') return null;
  return { ...FUSE_BTN };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(ctx, card, x, y, opts = {}) {
  const el = ELEMENTS[card.element];
  const selected = opts.selected === true;
  const dim = opts.dim === true;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  roundRect(ctx, x, y, CARD.w, CARD.h, CARD.radius);
  ctx.fillStyle = '#f7f3e8';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = el.color;
  ctx.stroke();
  if (card.fused) {
    // Gold border for a fused card.
    ctx.lineWidth = 4;
    ctx.strokeStyle = PALETTE.gold;
    roundRect(ctx, x + 1.5, y + 1.5, CARD.w - 3, CARD.h - 3, CARD.radius - 1);
    ctx.stroke();
  }
  if (selected) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = PALETTE.gold;
    roundRect(ctx, x - 3, y - 3, CARD.w + 6, CARD.h + 6, CARD.radius + 3);
    ctx.stroke();
  }
  // Element banner.
  roundRect(ctx, x + 6, y + 6, CARD.w - 12, 30, 8);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.name.toUpperCase(), x + CARD.w / 2, y + 22);
  // Element icon.
  ctx.font = '30px serif';
  ctx.fillStyle = '#20242e';
  ctx.fillText(el.icon, x + CARD.w / 2, y + 66);
  // ATK and DEF, big and readable.
  ctx.fillStyle = '#20242e';
  ctx.font = `800 23px ${FONT}`;
  ctx.fillText(`⚔ ${card.atk}`, x + CARD.w / 2, y + 100);
  ctx.fillText(`🛡 ${card.def}`, x + CARD.w / 2, y + 126);
  if (card.fused) {
    ctx.fillStyle = '#a67c00';
    ctx.font = `800 10px ${FONT}`;
    ctx.fillText('★ FUSION', x + CARD.w / 2, y + 144);
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y) {
  roundRect(ctx, x, y, CARD.w, CARD.h, CARD.radius);
  ctx.fillStyle = '#2b3a67';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f2c94c';
  ctx.stroke();
  roundRect(ctx, x + 10, y + 10, CARD.w - 20, CARD.h - 20, 8);
  ctx.strokeStyle = 'rgba(242,201,76,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2c94c';
  ctx.font = '800 30px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', x + CARD.w / 2, y + CARD.h / 2);
}

function drawHpBar(ctx, x, y, w, hp, label, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x - 6, y - 24, w + 12, 52, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - 12);
  ctx.fillStyle = '#20242e';
  roundRect(ctx, x, y, w, 16, 8);
  ctx.fill();
  const frac = Math.max(0, hp / MAX_HP);
  ctx.fillStyle = frac <= 0.33 ? PALETTE.hpLow : PALETTE.hp;
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(16, w * frac), 16, 8);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${hp} / ${MAX_HP}`, x + w, y - 12);
}

function drawTable(ctx) {
  ctx.fillStyle = PALETTE.feltDark;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.felt;
  roundRect(ctx, 14, 14, FIELD.width - 28, FIELD.height - 28, 24);
  ctx.fill();
  ctx.strokeStyle = PALETTE.tableEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, 14, 14, FIELD.width - 28, FIELD.height - 28, 24);
  ctx.stroke();
  // Centre circle.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(FIELD.width / 2, 360, 150, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFoeHand(ctx, state) {
  for (let i = 0; i < state.foeHand.length; i += 1) {
    drawCardBack(ctx, handX(i, state.foeHand.length), HAND_Y_FOE);
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('RIVAL HAND', FIELD.width / 2, HAND_Y_FOE - 12);
}

function drawYouHand(ctx, state, ui) {
  const hover = ui.hover ?? -1;
  const fuseSelect = ui.fuseSelect ?? [];
  for (let i = 0; i < state.playerHand.length; i += 1) {
    const r = playerCardRect(i, state.playerHand.length);
    const lift = hover === i || fuseSelect.includes(i) ? -12 : 0;
    drawCard(ctx, state.playerHand[i], r.x, r.y + lift, { selected: fuseSelect.includes(i) });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + CARD.w / 2, r.y + CARD.h + 16);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  const hint = state.phase === 'defend'
    ? 'RIVAL ATTACKS — click a card to block, or F to fuse'
    : 'YOUR HAND — click a card to attack, or F to fuse';
  ctx.fillText(hint, FIELD.width / 2, HAND_Y_YOU - 14);
}

function drawFuseButton(ctx, state, screen, ui) {
  const rect = fuseButtonRect(state, screen);
  if (!rect) return;
  const fusionMode = ui.fusionMode === true;
  const ready = fusionMode && (ui.fuseSelect ?? []).length >= 2;
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = ready ? PALETTE.gold : fusionMode ? '#8a6d1d' : '#2c3a2e';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ready ? '#fff' : PALETTE.gold;
  ctx.stroke();
  ctx.fillStyle = ready ? '#20242e' : PALETTE.text;
  ctx.font = `800 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ready ? 'FUSE!' : fusionMode ? 'CANCEL' : '⚡ FUSE (F)', rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
  if (fusionMode) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      (ui.fuseSelect ?? []).length >= 2 ? 'Two cards picked — hit FUSE!' : 'FUSION MODE — pick 2 cards',
      rect.x + rect.w / 2, rect.y + rect.h + 22,
    );
  }
}

function drawPlayed(ctx, state) {
  const cx = FIELD.width / 2;
  if (state.foeCard) drawCard(ctx, state.foeCard, cx - CARD.w - 26, PLAY_Y, false);
  if (state.playerCard) drawCard(ctx, state.playerCard, cx + 26, PLAY_Y, false);
  if (state.foeCard && state.playerCard) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', cx, PLAY_Y + CARD.h / 2);
  }
  if (state.phase === 'defend' && state.foeCard && !state.playerCard) {
    ctx.fillStyle = PALETTE.foe;
    ctx.font = `800 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('RIVAL ATTACK', cx - CARD.w / 2 - 26, PLAY_Y - 16);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.lastText, cx, PLAY_Y + CARD.h + 26);
  // Damage flash.
  if (state.lastDamage > 0 && state.phase === 'reveal') {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(`-${state.lastDamage}`, cx, PLAY_Y + CARD.h + 56);
  }
}

function drawLog(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, FIELD.width - 300, 14, 286, 96, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const lines = state.log.slice(-3);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], FIELD.width - 288, 36 + i * 24);
  }
}

/** Small gold chips for the achievements already unlocked, or a dimmed hint. */
function drawBadgeRow(ctx, unlocked, y) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (unlocked.length === 0) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('No achievements yet — win a duel to unlock one!', FIELD.width / 2, y);
    return;
  }
  ctx.font = `700 15px ${FONT}`;
  const labels = unlocked.map((a) => `🏆 ${a.name}`);
  const widths = labels.map((t) => ctx.measureText(t).width + 28);
  const gap = 10;
  const total = widths.reduce((s, w) => s + w, 0) + gap * (labels.length - 1);
  let x = (FIELD.width - total) / 2;
  for (let i = 0; i < labels.length; i += 1) {
    roundRect(ctx, x, y - 15, widths[i], 30, 15);
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillText(labels[i], x + widths[i] / 2, y + 1);
    x += widths[i] + gap;
  }
}

/** "🏆 Wins: N · Next: <name> — M more wins" (or all-unlocked / best-round tail). */
function winsLine(progress, best) {
  if (!progress) return best > 0 ? `Best round reached: ${best}` : '';
  const next = progress.next;
  const nextText = next
    ? `Next: ${next.name} — ${next.wins - progress.wins} more win${next.wins - progress.wins === 1 ? '' : 's'}`
    : 'All achievements unlocked!';
  const bestText = best > 0 ? ` · Best round: ${best}` : '';
  return `🏆 Wins: ${progress.wins} · ${nextText}${bestText}`;
}

function drawTitle(ctx, best, ui) {
  drawTable(ctx);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `800 72px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TITLE, FIELD.width / 2, 226);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(SUBTITLE, FIELD.width / 2, 272);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('An elemental card duel — Fire beats Leaf, Leaf beats Water, Water beats Fire.', FIELD.width / 2, 316);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('Each card has ATK and DEF. ATK beats DEF to deal damage; a blocked attack hurts you back.', FIELD.width / 2, 348);
  ctx.fillText('Fuse two cards (F) into one stronger card. First to 0 HP loses. 30 HP each.', FIELD.width / 2, 376);
  // Element legend cards.
  const els = ['fire', 'water', 'leaf'];
  const vals = [7, 8, 9];
  for (let i = 0; i < els.length; i += 1) {
    drawCard(ctx, makeCard(els[i], vals[i]), FIELD.width / 2 - 190 + i * 140, 412, false);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText('Click or press Space to start', FIELD.width / 2, 622);
  // Win counter + next achievement, then the unlocked badges.
  const progress = ui.progress;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(winsLine(progress, best), FIELD.width / 2, 656);
  drawBadgeRow(ctx, progress ? progress.unlocked : [], 688);
}

function drawOver(ctx, state, best, ui) {
  drawTable(ctx);
  // Show the final table faintly behind the banner.
  drawFoeHand(ctx, state);
  drawYouHand(ctx, state, {});
  ctx.fillStyle = 'rgba(10,14,10,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const win = state.result === 'win';
  ctx.fillStyle = win ? PALETTE.win : PALETTE.foe;
  ctx.font = `800 84px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(win ? 'YOU WIN!' : 'YOU LOSE', FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(
    win ? `The rival agent falls in round ${state.round}. You are the top duelist.` : `The rival agent takes the duel in round ${state.round}.`,
    FIELD.width / 2, 368,
  );
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText('Click or press Space to play again', FIELD.width / 2, 420);
  const progress = ui.progress;
  ctx.fillText(winsLine(progress, best), FIELD.width / 2, 452);
  // First-time unlock banner for the tier this win just reached.
  if (progress && progress.newUnlock) {
    const a = progress.newUnlock;
    const bw = 560;
    const bx = (FIELD.width - bw) / 2;
    const by = 478;
    ctx.save();
    roundRect(ctx, bx, by, bw, 64, 12);
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#20242e';
    ctx.font = `800 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 ACHIEVEMENT UNLOCKED!', FIELD.width / 2, by + 20);
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`${a.name} — ${a.wins} duel${a.wins === 1 ? '' : 's'} won!`, FIELD.width / 2, by + 46);
    ctx.restore();
  }
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10,14,10,0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 56px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Press P or Space to resume', FIELD.width / 2, 392);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = FIELD.width;
    canvas.height = FIELD.height;
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  return {
    draw(state, screen, best, ui = {}) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      if (screen === SCREEN_TITLE) {
        drawTitle(ctx, best, ui);
        return;
      }
      if (screen === SCREEN_OVER) {
        drawOver(ctx, state, best, ui);
        return;
      }
      drawTable(ctx);
      drawHpBar(ctx, 40, 48, 320, state.foeHp, 'RIVAL', PALETTE.foe);
      drawHpBar(ctx, 40, 522, 320, state.playerHp, 'YOU', PALETTE.player);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ROUND ${state.round}`, FIELD.width / 2, 36);
      drawLog(ctx, state);
      drawFoeHand(ctx, state);
      drawPlayed(ctx, state);
      drawYouHand(ctx, state, screen === SCREEN_PLAY ? ui : {});
      drawFuseButton(ctx, state, screen, ui);
      if (screen === SCREEN_PAUSED) drawPaused(ctx);
    },
  };
}
