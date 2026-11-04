export type DotStyle = 'squares' | 'rounded' | 'dots';
export type EyeStyle = 'square' | 'rounded' | 'circle';
export type FrameStyle = 'none' | 'banner-bottom' | 'banner-top' | 'card';
export type CenterIconType = 'none' | 'globe' | 'store' | 'utensils' | 'coffee' | 'star' | 'link' | 'phone';

export interface QRThemeConfig {
  preset: string; // 'classic' | 'midnight' | 'neon' | 'gold' | 'emerald' | 'sunset' | 'ocean' | 'ruby' | 'custom'
  fgColor: string; // foreground/dots color (hex)
  bgColor: string; // background color (hex)
  eyeColor?: string; // corner eye color (hex, defaults to fgColor)
  dotStyle: DotStyle;
  eyeStyle: EyeStyle;
  frameStyle?: FrameStyle;
  frameText?: string; // e.g. "SCAN ME"
  centerIcon?: CenterIconType;
}

export interface QRCodeItem {
  id: string;
  code: string; // Unique alphanumeric code, uppercase, e.g. "CUST-1001"
  label: string; // Customer or campaign name
  destination: string; // Redirect target URL
  theme: QRThemeConfig;
  scan_count: number;
  is_active: boolean;
  last_scanned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalQRs: number;
  totalScans: number;
  activeQRs: number;
  topScannedCode: string | null;
}
