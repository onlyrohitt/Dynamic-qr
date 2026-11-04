import QRCode from 'qrcode';
import { QRThemeConfig, DotStyle, EyeStyle, FrameStyle, CenterIconType } from './types';

export const THEME_PRESETS: Record<string, QRThemeConfig> = {
  classic: {
    preset: 'classic',
    fgColor: '#0f172a',
    bgColor: '#ffffff',
    eyeColor: '#0f172a',
    dotStyle: 'squares',
    eyeStyle: 'square',
    frameStyle: 'none',
    frameText: 'SCAN ME',
    centerIcon: 'none',
  },
  midnight: {
    preset: 'midnight',
    fgColor: '#38bdf8',
    bgColor: '#0b1120',
    eyeColor: '#06b6d4',
    dotStyle: 'rounded',
    eyeStyle: 'rounded',
    frameStyle: 'banner-bottom',
    frameText: 'SCAN TO VISIT',
    centerIcon: 'globe',
  },
  gold: {
    preset: 'gold',
    fgColor: '#fbbf24',
    bgColor: '#18181b',
    eyeColor: '#f59e0b',
    dotStyle: 'rounded',
    eyeStyle: 'rounded',
    frameStyle: 'banner-bottom',
    frameText: 'VIP ACCESS',
    centerIcon: 'star',
  },
  neon: {
    preset: 'neon',
    fgColor: '#f43f5e',
    bgColor: '#0f071a',
    eyeColor: '#d946ef',
    dotStyle: 'dots',
    eyeStyle: 'circle',
    frameStyle: 'banner-bottom',
    frameText: 'SCAN ME',
    centerIcon: 'none',
  },
  emerald: {
    preset: 'emerald',
    fgColor: '#10b981',
    bgColor: '#041d14',
    eyeColor: '#34d399',
    dotStyle: 'rounded',
    eyeStyle: 'rounded',
    frameStyle: 'banner-bottom',
    frameText: 'DISCOVER MORE',
    centerIcon: 'link',
  },
  sunset: {
    preset: 'sunset',
    fgColor: '#fb923c',
    bgColor: '#1e1124',
    eyeColor: '#f97316',
    dotStyle: 'rounded',
    eyeStyle: 'circle',
    frameStyle: 'banner-bottom',
    frameText: 'SCAN TO CONNECT',
    centerIcon: 'store',
  },
  ocean: {
    preset: 'ocean',
    fgColor: '#60a5fa',
    bgColor: '#071529',
    eyeColor: '#3b82f6',
    dotStyle: 'dots',
    eyeStyle: 'rounded',
    frameStyle: 'banner-bottom',
    frameText: 'SCAN HERE',
    centerIcon: 'globe',
  },
  ruby: {
    preset: 'ruby',
    fgColor: '#fda4af',
    bgColor: '#20070e',
    eyeColor: '#f43f5e',
    dotStyle: 'rounded',
    eyeStyle: 'rounded',
    frameStyle: 'banner-bottom',
    frameText: 'TAP OR SCAN',
    centerIcon: 'utensils',
  },
};

export const DEFAULT_THEME = THEME_PRESETS.classic;

export const ICONS: Record<CenterIconType, string> = {
  none: '',
  globe: `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.19a15.6 15.6 0 0 0-1.38-5.14A8.04 8.04 0 0 1 19.93 11zM12 4.07a13.7 13.7 0 0 1 1.7 6.93h-3.4A13.7 13.7 0 0 1 12 4.07zM4.07 13h3.19a15.6 15.6 0 0 0 1.38 5.14A8.04 8.04 0 0 1 4.07 13zm3.19-2H4.07a8.04 8.04 0 0 1 4.57-5.14A15.6 15.6 0 0 0 7.26 11zm4.74 8.93A13.7 13.7 0 0 1 10.3 13h3.4a13.7 13.7 0 0 1-1.7 5.93zM15.36 13h3.19a8.04 8.04 0 0 1-4.57 5.14A15.6 15.6 0 0 0 15.36 13z" fill="currentColor"/>`,
  store: `<path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" fill="currentColor"/>`,
  utensils: `<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/>`,
  coffee: `<path d="M2 21h18v-2H2v2zM20 8h-2V5h2c1.1 0 2 .9 2 2s-.9 2-2 2zm0-4h-2V3c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4v-3h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z" fill="currentColor"/>`,
  star: `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>`,
  link: `<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor"/>`,
  phone: `<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>`,
};

function isFinder(r: number, c: number, size: number): boolean {
  if (r < 7 && c < 7) return true; // Top-Left
  if (r < 7 && c >= size - 7) return true; // Top-Right
  if (r >= size - 7 && c < 7) return true; // Bottom-Left
  return false;
}

function isCenter(r: number, c: number, size: number, radiusModules: number): boolean {
  const center = (size - 1) / 2;
  return Math.hypot(r - center, c - center) <= radiusModules;
}

/**
 * Generate clean, modern styled SVG for a QR code
 */
export function generateStyledQRSvg(
  url: string,
  themeConfig: Partial<QRThemeConfig> = {},
  options: { outputSize?: number } = {}
): string {
  const theme: QRThemeConfig = { ...DEFAULT_THEME, ...themeConfig };
  const fg = theme.fgColor || '#000000';
  const bg = theme.bgColor || '#ffffff';
  const eye = theme.eyeColor || fg;
  const dotStyle: DotStyle = theme.dotStyle || 'squares';
  const eyeStyle: EyeStyle = theme.eyeStyle || 'square';
  const frameStyle: FrameStyle = theme.frameStyle || 'none';
  const frameText = (theme.frameText || 'SCAN ME').toUpperCase();
  const centerIcon: CenterIconType = theme.centerIcon || 'none';

  // Generate QR matrix
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const moduleCount = qr.modules.size;
  const margin = 4; // modules margin around QR
  const gridCount = moduleCount + margin * 2;
  const cellSize = 10;
  const qrCoreDim = gridCount * cellSize;

  const hasBottomBanner = frameStyle === 'banner-bottom' || frameStyle === 'card';
  const hasTopBanner = frameStyle === 'banner-top';
  const bannerHeight = 46;

  const totalWidth = qrCoreDim;
  const totalHeight = qrCoreDim + (hasBottomBanner ? bannerHeight : 0) + (hasTopBanner ? bannerHeight : 0);
  const qrOffsetY = hasTopBanner ? bannerHeight : 0;

  let elements = '';

  // Background
  elements += `<rect width="${totalWidth}" height="${totalHeight}" fill="${bg}" rx="16"/>`;

  // Finder corners configuration
  const finders = [
    { r: 0, c: 0 },
    { r: 0, c: moduleCount - 7 },
    { r: moduleCount - 7, c: 0 },
  ];

  // Draw modules
  const hasCenterIcon = centerIcon !== 'none';
  const centerRadiusModules = hasCenterIcon ? 3.5 : 0;

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinder(r, c, moduleCount)) continue;
      if (hasCenterIcon && isCenter(r, c, moduleCount, centerRadiusModules)) continue;

      if (qr.modules.get(r, c)) {
        const x = (c + margin) * cellSize;
        const y = qrOffsetY + (r + margin) * cellSize;

        if (dotStyle === 'dots') {
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const radius = (cellSize / 2) * 0.88;
          elements += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fg}"/>`;
        } else if (dotStyle === 'rounded') {
          const pad = 0.5;
          const w = cellSize - pad * 2;
          const rx = w * 0.32;
          elements += `<rect x="${x + pad}" y="${y + pad}" width="${w}" height="${w}" rx="${rx}" fill="${fg}"/>`;
        } else {
          // classic squares
          elements += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`;
        }
      }
    }
  }

  // Draw 3 styled Finder Eyes
  finders.forEach(({ r, c }) => {
    const startX = (c + margin) * cellSize;
    const startY = qrOffsetY + (r + margin) * cellSize;
    const eyeSize = 7 * cellSize; // 70px

    if (eyeStyle === 'circle') {
      const cx = startX + eyeSize / 2;
      const cy = startY + eyeSize / 2;
      // Outer ring
      elements += `<circle cx="${cx}" cy="${cy}" r="${eyeSize / 2 - 2}" stroke="${eye}" stroke-width="${cellSize}" fill="none"/>`;
      // Inner circle
      elements += `<circle cx="${cx}" cy="${cy}" r="${(3 * cellSize) / 2}" fill="${eye}"/>`;
    } else if (eyeStyle === 'rounded') {
      // Outer rounded frame
      elements += `<rect x="${startX + 2}" y="${startY + 2}" width="${eyeSize - 4}" height="${eyeSize - 4}" rx="${cellSize * 1.8}" stroke="${eye}" stroke-width="${cellSize}" fill="none"/>`;
      // Inner rounded pupil
      const innerX = startX + 2 * cellSize;
      const innerY = startY + 2 * cellSize;
      elements += `<rect x="${innerX}" y="${innerY}" width="${3 * cellSize}" height="${3 * cellSize}" rx="${cellSize * 0.8}" fill="${eye}"/>`;
    } else {
      // Classic square eye
      // Outer border
      elements += `<rect x="${startX + cellSize / 2}" y="${startY + cellSize / 2}" width="${eyeSize - cellSize}" height="${eyeSize - cellSize}" stroke="${eye}" stroke-width="${cellSize}" fill="none"/>`;
      // Inner pupil
      const innerX = startX + 2 * cellSize;
      const innerY = startY + 2 * cellSize;
      elements += `<rect x="${innerX}" y="${innerY}" width="${3 * cellSize}" height="${3 * cellSize}" fill="${eye}"/>`;
    }
  });

  // Draw center icon badge if enabled
  if (hasCenterIcon) {
    const centerMod = (moduleCount - 1) / 2;
    const centerPxX = (centerMod + margin) * cellSize + cellSize / 2;
    const centerPxY = qrOffsetY + (centerMod + margin) * cellSize + cellSize / 2;
    const badgeR = cellSize * 3.8;

    // Badge background and border
    elements += `<circle cx="${centerPxX}" cy="${centerPxY}" r="${badgeR}" fill="${bg}" stroke="${eye}" stroke-width="3"/>`;

    // Icon in center
    const iconSvg = ICONS[centerIcon];
    if (iconSvg) {
      const iconSize = cellSize * 4.2;
      const iconX = centerPxX - iconSize / 2;
      const iconY = centerPxY - iconSize / 2;
      elements += `<g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})" color="${eye}">${iconSvg}</g>`;
    }
  }

  // Draw banner if enabled
  if (hasBottomBanner) {
    const bannerY = totalHeight - bannerHeight + 6;
    const bannerBoxW = totalWidth - 40;
    const bannerBoxX = 20;
    elements += `
      <g transform="translate(0, 0)">
        <rect x="${bannerBoxX}" y="${bannerY}" width="${bannerBoxW}" height="${bannerHeight - 16}" rx="8" fill="${eye}" opacity="0.15"/>
        <rect x="${bannerBoxX + 1}" y="${bannerY + 1}" width="${bannerBoxW - 2}" height="${bannerHeight - 18}" rx="7" fill="none" stroke="${eye}" stroke-width="1.5"/>
        <text x="${totalWidth / 2}" y="${bannerY + (bannerHeight - 16) / 2 + 5}" fill="${fg}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="12" letter-spacing="1.5" text-anchor="middle">${frameText}</text>
      </g>
    `;
  }

  if (hasTopBanner) {
    const bannerY = 10;
    const bannerBoxW = totalWidth - 40;
    const bannerBoxX = 20;
    elements += `
      <g transform="translate(0, 0)">
        <rect x="${bannerBoxX}" y="${bannerY}" width="${bannerBoxW}" height="${bannerHeight - 16}" rx="8" fill="${eye}" opacity="0.15"/>
        <rect x="${bannerBoxX + 1}" y="${bannerY + 1}" width="${bannerBoxW - 2}" height="${bannerHeight - 18}" rx="7" fill="none" stroke="${eye}" stroke-width="1.5"/>
        <text x="${totalWidth / 2}" y="${bannerY + (bannerHeight - 16) / 2 + 5}" fill="${fg}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="12" letter-spacing="1.5" text-anchor="middle">${frameText}</text>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" shape-rendering="geometricPrecision">${elements}</svg>`;
  return svg;
}

/**
 * Generate standard PNG buffer for high-resolution download
 */
export async function generateQRPngBuffer(
  url: string,
  themeConfig: Partial<QRThemeConfig> = {},
  size = 800
): Promise<Buffer> {
  const theme: QRThemeConfig = { ...DEFAULT_THEME, ...themeConfig };
  const fg = theme.fgColor || '#000000';
  const bg = theme.bgColor || '#ffffff';

  return QRCode.toBuffer(url, {
    type: 'png',
    width: size,
    margin: 2,
    color: {
      dark: fg,
      light: bg,
    },
    errorCorrectionLevel: 'H',
  });
}
