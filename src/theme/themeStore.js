import {createAppTheme, DEFAULT_THEME, COLOR_PRESETS} from './createAppTheme.js';

const STORAGE_KEYS = {
  mode: 'theme_mode',
  color: 'theme_color',
  density: 'theme_density',
};

const VALID_MODES = ['system', 'light', 'dark'];
const VALID_DENSITIES = ['comfortable', 'compact'];

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const state = {
  mode: DEFAULT_THEME.mode,
  color: DEFAULT_THEME.color,
  density: DEFAULT_THEME.density,
};

let drawer;
let backdrop;
let snackbar;
let snackbarTimeout;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function loadStateFromStorage() {
  state.mode = VALID_MODES.includes(readStored(STORAGE_KEYS.mode, state.mode))
    ? readStored(STORAGE_KEYS.mode, state.mode)
    : DEFAULT_THEME.mode;
  state.color = COLOR_PRESETS[readStored(STORAGE_KEYS.color, state.color)]
    ? readStored(STORAGE_KEYS.color, state.color)
    : DEFAULT_THEME.color;
  state.density = VALID_DENSITIES.includes(readStored(STORAGE_KEYS.density, state.density))
    ? readStored(STORAGE_KEYS.density, state.density)
    : DEFAULT_THEME.density;
}

function persistState() {
  writeStored(STORAGE_KEYS.mode, state.mode);
  writeStored(STORAGE_KEYS.color, state.color);
  writeStored(STORAGE_KEYS.density, state.density);
}

function applyCssVariables(theme) {
  const root = document.documentElement;
  root.style.setProperty('--background-default', theme.palette.background.default);
  root.style.setProperty('--background-paper', theme.palette.background.paper);
  root.style.setProperty('--surface-border', theme.palette.divider);
  root.style.setProperty('--text-primary', theme.palette.text.primary);
  root.style.setProperty('--text-secondary', theme.palette.text.secondary);
  root.style.setProperty('--muted', theme.palette.text.secondary);
  root.style.setProperty('--primary', theme.palette.primary.main);
  root.style.setProperty('--primary-text', theme.palette.primary.contrastText);
  root.style.setProperty('--secondary', theme.palette.secondary.main);
  root.style.setProperty('--secondary-text', theme.palette.secondary.contrastText);
  root.style.setProperty('--appbar-bg', theme.palette.background.paper);
  root.style.setProperty('--appbar-text', theme.palette.text.primary);
  root.style.setProperty('--appbar-border', theme.palette.divider);
  root.style.setProperty('--button-bg', theme.palette.primary.main);
  root.style.setProperty('--button-text', theme.palette.primary.contrastText);
  root.style.setProperty('--focus-ring', theme.focus.ring);
  root.style.setProperty('--surface-shadow', theme.mode === 'dark'
    ? '0 20px 45px rgba(0,0,0,0.45)'
    : '0 20px 35px rgba(15,23,42,0.25)');
  root.style.setProperty('--density-border-radius', theme.spacing.borderRadius);
  root.style.setProperty('--spacing-base', theme.spacing.baseGap);
  root.style.setProperty('--panel-padding', theme.spacing.panelPadding);
  root.style.setProperty('--input-padding', theme.spacing.inputPadding);
  root.style.setProperty('--chip-padding', theme.spacing.chipPadding);
  root.style.setProperty('--control-gap', theme.spacing.controlGap);
  root.style.setProperty('--toolbar-height', theme.spacing.toolbarHeight);
  root.dataset.themeMode = theme.mode;
  root.dataset.themeColor = theme.colorName;
}

function applyTheme() {
  const theme = createAppTheme({
    mode: state.mode,
    color: state.color,
    density: state.density,
    systemPrefersDark: mediaQuery.matches,
  });
  applyCssVariables(theme);
  syncControls();
}

function syncControls() {
  document.querySelectorAll('[name="appearanceMode"]').forEach((input) => {
    input.checked = input.value === state.mode;
  });
  document.querySelectorAll('[name="appearanceDensity"]').forEach((input) => {
    input.checked = input.value === state.density;
  });
  document.querySelectorAll('[data-color-key]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.colorKey === state.color);
  });
}

function handleModeChange(event) {
  state.mode = event.target.value;
  persistState();
  applyTheme();
}

function handleDensityChange(event) {
  state.density = event.target.value;
  persistState();
  applyTheme();
}

function updateColorSelection(colorKey) {
  if(!COLOR_PRESETS[colorKey]) return;
  state.color = colorKey;
  persistState();
  applyTheme();
}

function renderColorOptions() {
  const container = document.getElementById('appearanceColorGrid');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(COLOR_PRESETS).forEach(([key, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'appearance-color-btn';
    button.dataset.colorKey = key;
    button.setAttribute('title', preset.label);
    button.setAttribute('aria-label', preset.label);
    button.innerHTML = `
      <span class="appearance-color-btn__circle" style="background:${preset.value};"></span>
      <span class="appearance-color-btn__check" aria-hidden="true">✓</span>
    `;
    container.appendChild(button);
  });
}

function bindColorGrid() {
  const container = document.getElementById('appearanceColorGrid');
  if(!container) return;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-color-key]');
    if(!button) return;
    updateColorSelection(button.dataset.colorKey);
  });
}

function handleDrawerToggle() {
  if(!drawer || !backdrop) return;
  drawer.classList.add('open');
  backdrop.classList.add('visible');
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  if(!drawer || !backdrop) return;
  drawer.classList.remove('open');
  backdrop.classList.remove('visible');
  document.body.classList.remove('drawer-open');
}

function bindDrawerListeners() {
  const toggle = document.getElementById('appearanceToggle');
  const closeButton = document.getElementById('appearanceClose');
  if(toggle) toggle.addEventListener('click', handleDrawerToggle);
  if(closeButton) closeButton.addEventListener('click', closeDrawer);
  if(backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') closeDrawer();
  });
}

function bindModeAndDensity() {
  document.querySelectorAll('[name="appearanceMode"]').forEach((input) => {
    input.addEventListener('change', handleModeChange);
  });
  document.querySelectorAll('[name="appearanceDensity"]').forEach((input) => {
    input.addEventListener('change', handleDensityChange);
  });
}

function resetToDefaults() {
  state.mode = DEFAULT_THEME.mode;
  state.color = DEFAULT_THEME.color;
  state.density = DEFAULT_THEME.density;
  persistState();
  applyTheme();
}

function bindReset() {
  const button = document.getElementById('appearanceReset');
  if(button) button.addEventListener('click', resetToDefaults);
}

function initSnackbar() {
  snackbar = document.getElementById('snackbar');
  if(!snackbar) return;
  window.showSnackbar = (message, options = {}) => {
    const variant = options.variant === 'error' ? 'error' : 'success';
    const duration = Number(options.duration) || 4000;
    snackbar.textContent = message;
    snackbar.className = `snackbar snackbar--visible snackbar--${variant}`;
    if(snackbarTimeout) clearTimeout(snackbarTimeout);
    snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('snackbar--visible');
    }, duration);
  };
  window.hideSnackbar = () => {
    if(snackbar) snackbar.classList.remove('snackbar--visible');
  };
}

function initAppearanceControls() {
  drawer = document.getElementById('appearanceDrawer');
  backdrop = document.getElementById('appearanceBackdrop');
  renderColorOptions();
  bindDrawerListeners();
  bindModeAndDensity();
  bindColorGrid();
  bindReset();
}

function handleSystemPreferenceChange() {
  if(state.mode !== 'system') return;
  applyTheme();
}

function init() {
  loadStateFromStorage();
  initSnackbar();
  initAppearanceControls();
  applyTheme();
  mediaQuery.addEventListener('change', handleSystemPreferenceChange);
}

if(document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
