const HEX_SHORT = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX_LONG = /^#([0-9a-fA-F]{6})$/;

const COLOR_PRESETS = {
  blue: {
    label: 'Azul',
    value: '#2563EB',
  },
  cyan: {
    label: 'Ciano',
    value: '#06B6D4',
  },
  purple: {
    label: 'Roxo',
    value: '#7C3AED',
  },
  green: {
    label: 'Verde',
    value: '#22C55E',
  },
  orange: {
    label: 'Laranja',
    value: '#F97316',
  },
};

const DENSITY_CONFIG = {
  comfortable: {
    baseGap: '18px',
    panelPadding: '18px',
    inputPadding: '12px',
    chipPadding: '6px 14px',
    controlGap: '14px',
    borderRadius: '14px',
    toolbarHeight: '56px',
  },
  compact: {
    baseGap: '12px',
    panelPadding: '14px',
    inputPadding: '10px',
    chipPadding: '5px 12px',
    controlGap: '10px',
    borderRadius: '12px',
    toolbarHeight: '52px',
  },
};

const DEFAULT_THEME = {
  mode: 'system',
  color: 'blue',
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

function resolveColorName(key) {
  if(!key) return DEFAULT_THEME.color;
  const lower = String(key).toLowerCase();
  if(COLOR_PRESETS[lower]) return lower;
  return DEFAULT_THEME.color;
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
  const resolvedColor = resolveColorName(options.color);

  const isDark = resolvedMode === 'dark';
  const primaryColor = normalizeHex(COLOR_PRESETS[resolvedColor].value, COLOR_PRESETS[DEFAULT_THEME.color].value);
  const secondaryColor = mixColors(primaryColor, '#ffffff', 0.4);
  const backgroundDefault = isDark ? '#05070f' : '#F4F5FB';
  const backgroundPaper = isDark ? '#0b1220' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';

  const palette = {
    mode: resolvedMode,
    primary: {main: primaryColor, contrastText: getContrastText(primaryColor)},
    secondary: {main: normalizeHex(secondaryColor, '#a3bffa'), contrastText: getContrastText(secondaryColor)},
    background: {
      default: backgroundDefault,
      paper: backgroundPaper,
    },
    text: {
      primary: isDark ? '#f8fafc' : '#0f172a',
      secondary: mutedText,
    },
    divider: borderColor,
  };

  const spacing = DENSITY_CONFIG[resolvedDensity];
  const typography = {
    fontFamily: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'].join(','),
    h5: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      fontSize: '1.35rem',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0.08em',
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.95rem',
      letterSpacing: '0.01em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  };

  const components = {
    shape: {
      borderRadius: 14,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? '0 18px 45px rgba(0,0,0,0.6)' : '0 10px 35px rgba(15,23,42,0.25)',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 3,
            backgroundColor: primaryColor,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: '10px 18px',
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
          },
        },
      },
    },
  };

  const focusColor = mixColors(primaryColor, isDark ? '#0F172A' : '#FFFFFF', 0.35);

  return {
    mode: resolvedMode,
    palette,
    spacing,
    density: resolvedDensity,
    focus: {ring: focusColor},
    border: borderColor,
    typography,
    components,
    primaryColor,
    colorName: resolvedColor,
  };
}

export {DEFAULT_THEME, COLOR_PRESETS, getContrastText};
