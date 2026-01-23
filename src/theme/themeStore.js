import {createAppTheme, DEFAULT_THEME, normalizeHex} from './createAppTheme.js';

const STORAGE_KEYS = {
  mode: 'theme_mode',
  primary: 'theme_primary',
  secondary: 'theme_secondary',
  density: 'theme_density',
};

const VALID_MODES = ['system', 'light', 'dark'];
const VALID_DENSITIES = ['comfortable', 'compact'];

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const state = {
  mode: DEFAULT_THEME.mode,
  primary: DEFAULT_THEME.primary,
  secondary: DEFAULT_THEME.secondary,
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
  state.primary = normalizeHex(readStored(STORAGE_KEYS.primary, state.primary), DEFAULT_THEME.primary);
  state.secondary = normalizeHex(readStored(STORAGE_KEYS.secondary, state.secondary), DEFAULT_THEME.secondary);
  state.density = VALID_DENSITIES.includes(readStored(STORAGE_KEYS.density, state.density))
    ? readStored(STORAGE_KEYS.density, state.density)
    : DEFAULT_THEME.density;
}

function persistState() {
  writeStored(STORAGE_KEYS.mode, state.mode);
  writeStored(STORAGE_KEYS.primary, state.primary);
  writeStored(STORAGE_KEYS.secondary, state.secondary);
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
  root.style.setProperty('--appbar-bg', theme.palette.primary.main);
  root.style.setProperty('--appbar-text', theme.palette.primary.contrastText);
  root.style.setProperty('--button-bg', theme.palette.primary.main);
  root.style.setProperty('--button-text', theme.palette.primary.contrastText);
  root.style.setProperty('--focus-ring', theme.focus.ring);
  root.style.setProperty('--surface-shadow', theme.mode === 'dark'
    ? '0 20px 45px rgba(0,0,0,0.65)'
    : '0 20px 45px rgba(15,23,42,0.25)');
  root.style.setProperty('--density-border-radius', theme.spacing.borderRadius);
  root.style.setProperty('--spacing-base', theme.spacing.baseGap);
  root.style.setProperty('--panel-padding', theme.spacing.panelPadding);
  root.style.setProperty('--input-padding', theme.spacing.inputPadding);
  root.style.setProperty('--chip-padding', theme.spacing.chipPadding);
  root.style.setProperty('--control-gap', theme.spacing.controlGap);
  root.dataset.themeMode = theme.mode;
}

function applyTheme() {
  const theme = createAppTheme({
    mode: state.mode,
    primary: state.primary,
    secondary: state.secondary,
    density: state.density,
    systemPrefersDark: mediaQuery.matches,
  });
  applyCssVariables(theme);
  syncControls();
}

function syncControls() {
  const modeInputs = document.querySelectorAll('[name="appearanceMode"]');
  modeInputs.forEach((input) => {
    input.checked = input.value === state.mode;
  });
  const densityInputs = document.querySelectorAll('[name="appearanceDensity"]');
  densityInputs.forEach((input) => {
    input.checked = input.value === state.density;
  });
  const primaryColor = document.getElementById('appearancePrimaryColor');
  const primaryHex = document.getElementById('appearancePrimaryHex');
  const secondaryColor = document.getElementById('appearanceSecondaryColor');
  const secondaryHex = document.getElementById('appearanceSecondaryHex');
  if(primaryColor) primaryColor.value = state.primary;
  if(primaryHex) primaryHex.value = state.primary;
  if(secondaryColor) secondaryColor.value = state.secondary;
  if(secondaryHex) secondaryHex.value = state.secondary;
}

function sanitizeHexInput(value, fallback) {
  const normalized = normalizeHex(value || '', fallback);
  return normalized;
}

function updatePrimary(value) {
  const normalized = sanitizeHexInput(value, DEFAULT_THEME.primary);
  state.primary = normalized;
  persistState();
  applyTheme();
}

function updateSecondary(value) {
  const normalized = sanitizeHexInput(value, DEFAULT_THEME.secondary);
  state.secondary = normalized;
  persistState();
  applyTheme();
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

function handleColorInputs() {
  const primaryColor = document.getElementById('appearancePrimaryColor');
  const primaryHex = document.getElementById('appearancePrimaryHex');
  const secondaryColor = document.getElementById('appearanceSecondaryColor');
  const secondaryHex = document.getElementById('appearanceSecondaryHex');

  if(primaryColor) {
    primaryColor.addEventListener('input', (event) => {
      updatePrimary(event.target.value);
      if(primaryHex) primaryHex.value = state.primary;
    });
  }
  if(primaryHex) {
    primaryHex.addEventListener('change', (event) => {
      updatePrimary(event.target.value);
      if(primaryColor) primaryColor.value = state.primary;
    });
    primaryHex.addEventListener('blur', () => {
      if(primaryHex.value !== state.primary) primaryHex.value = state.primary;
    });
  }
  if(secondaryColor) {
    secondaryColor.addEventListener('input', (event) => {
      updateSecondary(event.target.value);
      if(secondaryHex) secondaryHex.value = state.secondary;
    });
  }
  if(secondaryHex) {
    secondaryHex.addEventListener('change', (event) => {
      updateSecondary(event.target.value);
      if(secondaryColor) secondaryColor.value = state.secondary;
    });
    secondaryHex.addEventListener('blur', () => {
      if(secondaryHex.value !== state.secondary) secondaryHex.value = state.secondary;
    });
  }
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
  state.primary = DEFAULT_THEME.primary;
  state.secondary = DEFAULT_THEME.secondary;
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
  bindDrawerListeners();
  bindModeAndDensity();
  handleColorInputs();
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
