// Every tuning number and colour in one place. The table is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

export const MAX_HP = 30;
export const HAND_SIZE = 5;

// Elements: Fire beats Leaf, Leaf beats Water, Water beats Fire.
export const ELEMENTS = {
  fire: { name: 'Fire', icon: '🔥', color: '#e5534b', dark: '#8f2f2a', beats: 'leaf' },
  water: { name: 'Water', icon: '💧', color: '#4fc3f7', dark: '#1d6f9e', beats: 'fire' },
  leaf: { name: 'Leaf', icon: '🍃', color: '#7bc96f', dark: '#3e7a34', beats: 'water' },
};
export const ELEMENT_KEYS = ['fire', 'water', 'leaf'];

export const CARD = { w: 110, h: 150, gap: 14, radius: 12 };
export const BACK = { w: 110, h: 150 };

export const PALETTE = {
  felt: '#1d5c3a',
  feltDark: '#14452b',
  feltLight: '#267349',
  tableEdge: '#0e2f1e',
  gold: '#f2c94c',
  panel: '#20242e',
  panelEdge: '#3a4152',
  text: '#f4f6f8',
  muted: '#aab2c0',
  player: '#4fc3f7',
  foe: '#e5534b',
  hp: '#58c96b',
  hpLow: '#e5534b',
  win: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'ember-clash.best';
