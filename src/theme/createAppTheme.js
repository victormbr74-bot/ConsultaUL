const HEX_SHORT = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX_LONG = /^#([0-9a-fA-F]{6})$/;

const DENSITY_CONFIG = {
  comfortable: {
    baseGap: '16px',
    panelPadding: '16px',
    inputPadding: '14px',
    chipPadding: '7px 16px',
    controlGap: '12px',
    borderRadius: '16px',
  },
  compact: {
    baseGap: '10px',
    panelPadding: '12px',
    inputPadding: '10px',
    chipPadding: '5px 12px',
    controlGap: '8px',
    borderRadius: '12px',
  },
};

const DEFAULT_THEME = {
  mode: 'system',
  primary: '#60A5FA',
  secondary: '#A855F7',
  density: 'comfortable',
};

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  if(!HEX_LONG.test(hex)) return null;
  const [, raw] = hex.match(HEX_LONG);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHex({r, g, b}) {
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b))
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function mixColors(a, b, weight = 0.5) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if(!left || !right) return left ? a : right ? b : '#000000';
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: left.r * (1 - w) + right.r * w,
    g: left.g * (1 - w) + right.g * w,
    b: left.b * (1 - w) + right.b * w,
  });
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if(!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function normalizeHex(input, fallback = '#000000') {
  if(!input) return fallback;
  let hex = String(input).trim();
  if(!hex) return fallback;
  if(hex[0] !== '#') hex = `#${hex}`;
  if(HEX_SHORT.test(hex)) {
    const [, r, g, b] = hex.match(HEX_SHORT);
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }
  if(HEX_LONG.test(hex)) {
    return hex.toUpperCase();
  }
  return fallback;
}

function getContrastText(hex) {
  const lum = luminance(hex);
  return lum > 0.55 ? '#0F172A' : '#F8FAFC';
}

export function createAppTheme(options = {}) {
  const modeInput = (options.mode || DEFAULT_THEME.mode).toLowerCase();
  const resolvedDensity = DENSITY_CONFIG[options.density] ? options.density : DEFAULT_THEME.density;
  const prefersDark = !!options.systemPrefersDark;
  const resolvedMode = modeInput === 'system'
    ? (prefersDark ? 'dark' : 'light')
    : modeInput === 'dark'
      ? 'dark'
      : 'light';

  const isDark = resolvedMode === 'dark';
  const primaryColor = normalizeHex(options.primary || DEFAULT_THEME.primary, DEFAULT_THEME.primary);
  const secondaryColor = normalizeHex(options.secondary || DEFAULT_THEME.secondary, DEFAULT_THEME.secondary);
  const backgroundDefault = isDark ? '#030712' : '#F5F5FB';
  const backgroundPaper = isDark ? '#0F172A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
  const mutedText = isDark ? '#9CA3AF' : '#6B7280';

  const palette = {
    mode: resolvedMode,
    primary: {main: primaryColor, contrastText: getContrastText(primaryColor)},
    secondary: {main: secondaryColor, contrastText: getContrastText(secondaryColor)},
    background: {
      default: backgroundDefault,
      paper: backgroundPaper,
    },
    text: {
      primary: isDark ? '#F8FAFC' : '#0F172A',
      secondary: mutedText,
    },
    divider: borderColor,
  };

  const spacing = DENSITY_CONFIG[resolvedDensity];
  const focusColor = mixColors(primaryColor, isDark ? '#0F172A' : '#FFFFFF', 0.35);

  return {
    mode: resolvedMode,
    palette,
    spacing,
    density: resolvedDensity,
    focus: {ring: focusColor},
    border: borderColor,
  };
}

export {DEFAULT_THEME, normalizeHex, getContrastText};
