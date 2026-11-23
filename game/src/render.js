// Canvas rendering for Ember Clash. The table is a fixed 1280x720 logical area; the
// renderer scales it to the window. Screens: title, play, paused, over (win / loss).
import { CARD, ELEMENTS, FIELD, FONT, MAX_HP, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HAND_Y_FOE = 78;
const HAND_Y_YOU = 540;
const PLAY_Y = 268;

function handX(index, count) {
  const total = count * CARD.w + (count - 1) * CARD.gap;
  return (FIELD.width - total) / 2 + index * (CARD.w + CARD.gap);
}

export function playerCardRect(index, count) {
  return { x: handX(index, count), y: HAND_Y_YOU, w: CARD.w, h: CARD.h };
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

function drawCard(ctx, card, x, y, dim) {
  const el = ELEMENTS[card.element];
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  roundRect(ctx, x, y, CARD.w, CARD.h, CARD.radius);
  ctx.fillStyle = '#f7f3e8';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = el.color;
  ctx.stroke();
  // Element banner.
  roundRect(ctx, x + 6, y + 6, CARD.w - 12, 34, 8);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.name.toUpperCase(), x + CARD.w / 2, y + 24);
  // Big value.
  ctx.fillStyle = '#20242e';
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText(String(card.value), x + CARD.w / 2, y + 82);
  // Element icon.
  ctx.font = '34px serif';
  ctx.fillText(el.icon, x + CARD.w / 2, y + 124);
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

function drawYouHand(ctx, state, hover) {
  for (let i = 0; i < state.playerHand.length; i += 1) {
    const r = playerCardRect(i, state.playerHand.length);
    const lift = hover === i ? -12 : 0;
    drawCard(ctx, state.playerHand[i], r.x, r.y + lift, false);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + CARD.w / 2, r.y + CARD.h + 16);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('YOUR HAND — click a card or press 1–5', FIELD.width / 2, HAND_Y_YOU - 14);
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
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.lastText, cx, PLAY_Y + CARD.h + 26);
  // Damage flash.
  if (state.lastDamage > 0 && state.phase === 'reveal') {
    ctx.fillStyle = state.foeHp < MAX_HP && state.playerCard && state.playerCard.value > state.foeCard.value ? PALETTE.hp : PALETTE.foe;
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

function drawTitle(ctx, best) {
  drawTable(ctx);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `800 84px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EMBER CLASH', FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('An elemental card duel — Fire beats Leaf, Leaf beats Water, Water beats Fire.', FIELD.width / 2, 312);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText('Play a card each round. Higher value wins; the element edge adds +3 damage.', FIELD.width / 2, 346);
  ctx.fillText('First to bring the rival to 0 HP wins. 30 HP each.', FIELD.width / 2, 376);
  // Element legend cards.
  const els = ['fire', 'water', 'leaf'];
  for (let i = 0; i < els.length; i += 1) {
    drawCard(ctx, { element: els[i], value: 7 + i }, FIELD.width / 2 - 190 + i * 140, 420, false);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText('Click or press Space to start', FIELD.width / 2, 630);
  if (best > 0) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(`Best round reached: ${best}`, FIELD.width / 2, 664);
  }
}

function drawOver(ctx, state, best) {
  drawTable(ctx);
  // Show the final table faintly behind the banner.
  drawFoeHand(ctx, state);
  drawYouHand(ctx, state, -1);
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
    win ? `The rival falls in round ${state.round}. Ember bows to you.` : `The rival takes the duel in round ${state.round}.`,
    FIELD.width / 2, 368,
  );
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText('Click or press Space to play again', FIELD.width / 2, 420);
  if (best > 0) {
    ctx.fillText(`Best round reached: ${best}`, FIELD.width / 2, 452);
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
    draw(state, screen, best, hover = -1) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      if (screen === SCREEN_TITLE) {
        drawTitle(ctx, best);
        return;
      }
      if (screen === SCREEN_OVER) {
        drawOver(ctx, state, best);
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
      drawYouHand(ctx, state, screen === SCREEN_PLAY ? hover : -1);
      if (screen === SCREEN_PAUSED) drawPaused(ctx);
    },
  };
}
