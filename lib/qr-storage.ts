import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase-admin';
import { QRCodeItem, QRThemeConfig, DashboardStats } from './types';
import { THEME_PRESETS, DEFAULT_THEME } from './qr-themes';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'qr-codes.json');

// Memory cache fallback for fast response & local durability
let memoryStore: QRCodeItem[] | null = null;
let useLocalFallback = false;

const SAMPLE_INITIAL_QRS: QRCodeItem[] = [
  {
    id: 'sample-1',
    code: 'CAFE-901',
    label: 'Artisan Coffee Roasters',
    destination: 'https://example.com/artisan-coffee-menu',
    theme: {
      ...THEME_PRESETS.emerald,
      frameText: 'SCAN FOR MENU',
      centerIcon: 'coffee',
    },
    scan_count: 142,
    is_active: true,
    last_scanned_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'sample-2',
    code: 'VIP-778',
    label: 'Grand Gala Lounge & Bar',
    destination: 'https://example.com/vip-drink-list',
    theme: {
      ...THEME_PRESETS.gold,
      frameText: 'VIP ACCESS',
      centerIcon: 'star',
    },
    scan_count: 89,
    is_active: true,
    last_scanned_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: 'sample-3',
    code: 'TECH-104',
    label: 'NextGen Digital Agency',
    destination: 'https://example.com/case-studies',
    theme: {
      ...THEME_PRESETS.midnight,
      frameText: 'SCAN TO VISIT',
      centerIcon: 'globe',
    },
    scan_count: 230,
    is_active: true,
    last_scanned_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

/**
 * Generate a random readable unique code (e.g. "K9X4M2" or "CUST-8214")
 */
export function generateUniqueCode(prefix = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix.toUpperCase()}-${rand}` : rand;
}

/**
 * Read local fallback JSON file
 */
function readLocalFile(): QRCodeItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(SAMPLE_INITIAL_QRS, null, 2), 'utf-8');
      return SAMPLE_INITIAL_QRS;
    }
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SAMPLE_INITIAL_QRS;
  } catch (err) {
    console.error('[qr-storage] Failed to read local DB file:', err);
    return SAMPLE_INITIAL_QRS;
  }
}

/**
 * Save to local fallback JSON file
 */
function writeLocalFile(items: QRCodeItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('[qr-storage] Failed to write local DB file:', err);
  }
}

function getLocalStore(): QRCodeItem[] {
  if (!memoryStore) {
    memoryStore = readLocalFile();
  }
  return memoryStore;
}

function setLocalStore(items: QRCodeItem[]) {
  memoryStore = items;
  writeLocalFile(items);
}

/**
 * Normalizes code: trimmed, uppercase
 */
export function normalizeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

/**
 * Fetch all QR codes
 */
export async function getAllQRs(): Promise<QRCodeItem[]> {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Map database columns to QRCodeItem interface
        return data.map((row) => ({
          id: row.id,
          code: row.code,
          label: row.label || row.customer_name || 'Customer QR',
          destination: row.destination || row.url,
          theme: row.theme && typeof row.theme === 'object' ? row.theme : DEFAULT_THEME,
          scan_count: row.scan_count ?? 0,
          is_active: row.is_active ?? true,
          last_scanned_at: row.last_scanned_at ?? null,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        }));
      }

      console.warn('[qr-storage] Supabase query failed or qr_codes table missing, falling back to local store:', error?.message);
      useLocalFallback = true;
    } catch (err: any) {
      console.warn('[qr-storage] Network/DB error connecting to Supabase, falling back to local store:', err?.message || err);
      useLocalFallback = true;
    }
  }

  return getLocalStore();
}

/**
 * Find single QR code by code (case-insensitive)
 */
export async function getQRByCode(code: string): Promise<QRCodeItem | null> {
  const normCode = normalizeCode(code);
  if (!normCode) return null;

  if (!useLocalFallback) {
    try {
      const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .select('*')
        .ilike('code', normCode)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          code: data.code,
          label: data.label || data.customer_name || 'Customer QR',
          destination: data.destination || data.url,
          theme: data.theme && typeof data.theme === 'object' ? data.theme : DEFAULT_THEME,
          scan_count: data.scan_count ?? 0,
          is_active: data.is_active ?? true,
          last_scanned_at: data.last_scanned_at ?? null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {
      useLocalFallback = true;
    }
  }

  const items = getLocalStore();
  const match = items.find((item) => normalizeCode(item.code) === normCode);
  return match || null;
}

/**
 * Create a new QR code
 */
export async function createQR(payload: {
  code?: string;
  label: string;
  destination: string;
  theme?: Partial<QRThemeConfig>;
}): Promise<QRCodeItem> {
  const label = (payload.label || 'Customer QR').trim();
  const destination = (payload.destination || '').trim();

  let code = normalizeCode(payload.code || '');
  if (!code) {
    code = generateUniqueCode();
  }

  // Ensure code uniqueness
  const existing = await getQRByCode(code);
  if (existing) {
    code = generateUniqueCode(code.slice(0, 4));
  }

  const newTheme: QRThemeConfig = {
    ...DEFAULT_THEME,
    ...(payload.theme || {}),
  };

  const now = new Date().toISOString();
  const newItem: QRCodeItem = {
    id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code,
    label,
    destination,
    theme: newTheme,
    scan_count: 0,
    is_active: true,
    last_scanned_at: null,
    created_at: now,
    updated_at: now,
  };

  if (!useLocalFallback) {
    try {
      const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .insert({
          code: newItem.code,
          label: newItem.label,
          destination: newItem.destination,
          theme: newItem.theme,
          scan_count: 0,
          is_active: true,
          created_at: newItem.created_at,
          updated_at: newItem.updated_at,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          code: data.code,
          label: data.label,
          destination: data.destination,
          theme: data.theme || newTheme,
          scan_count: data.scan_count ?? 0,
          is_active: data.is_active ?? true,
          last_scanned_at: data.last_scanned_at ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
      console.warn('[qr-storage] Could not insert into Supabase, saving to local store:', error?.message);
      useLocalFallback = true;
    } catch (err: any) {
      console.warn('[qr-storage] Supabase insert failed, saving to local store:', err?.message || err);
      useLocalFallback = true;
    }
  }

  const items = getLocalStore();
  const updatedItems = [newItem, ...items];
  setLocalStore(updatedItems);
  return newItem;
}

/**
 * Update an existing QR code (destination URL, theme, label, active state)
 */
export async function updateQR(
  code: string,
  updates: Partial<Pick<QRCodeItem, 'destination' | 'label' | 'theme' | 'is_active'>>
): Promise<QRCodeItem | null> {
  const normCode = normalizeCode(code);
  const now = new Date().toISOString();

  if (!useLocalFallback) {
    try {
      const dbUpdates: Record<string, any> = { updated_at: now };
      if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
      if (updates.label !== undefined) dbUpdates.label = updates.label;
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .update(dbUpdates)
        .ilike('code', normCode)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          code: data.code,
          label: data.label,
          destination: data.destination,
          theme: data.theme || DEFAULT_THEME,
          scan_count: data.scan_count ?? 0,
          is_active: data.is_active ?? true,
          last_scanned_at: data.last_scanned_at ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      useLocalFallback = true;
    }
  }

  const items = getLocalStore();
  const index = items.findIndex((i) => normalizeCode(i.code) === normCode);
  if (index === -1) return null;

  const current = items[index];
  const updated: QRCodeItem = {
    ...current,
    destination: updates.destination !== undefined ? updates.destination : current.destination,
    label: updates.label !== undefined ? updates.label : current.label,
    theme: updates.theme !== undefined ? { ...current.theme, ...updates.theme } : current.theme,
    is_active: updates.is_active !== undefined ? updates.is_active : current.is_active,
    updated_at: now,
  };

  const updatedItems = [...items];
  updatedItems[index] = updated;
  setLocalStore(updatedItems);
  return updated;
}

/**
 * Delete a QR code by code
 */
export async function deleteQR(code: string): Promise<boolean> {
  const normCode = normalizeCode(code);

  if (!useLocalFallback) {
    try {
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .delete()
        .ilike('code', normCode);

      if (!error) return true;
    } catch {
      useLocalFallback = true;
    }
  }

  const items = getLocalStore();
  const filtered = items.filter((i) => normalizeCode(i.code) !== normCode);
  if (filtered.length === items.length) return false;
  setLocalStore(filtered);
  return true;
}

/**
 * Increment scan count and record last scanned timestamp
 */
export async function incrementScan(code: string): Promise<void> {
  const normCode = normalizeCode(code);
  const now = new Date().toISOString();

  if (!useLocalFallback) {
    try {
      const { error } = await supabaseAdmin.rpc('increment_qr_scan', { qr_code: normCode });
      if (!error) {
        return;
      }
      console.warn('[qr-storage] Atomic scan increment unavailable; using fallback:', error.message);
    } catch {
      // Continue to local fallback if the database function is not installed.
    }
  }

  const items = getLocalStore();
  const index = items.findIndex((i) => normalizeCode(i.code) === normCode);
  if (index !== -1) {
    items[index].scan_count = (items[index].scan_count || 0) + 1;
    items[index].last_scanned_at = now;
    setLocalStore([...items]);
  }
}

/**
 * Calculate overall stats for admin dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const items = await getAllQRs();
  const totalQRs = items.length;
  let totalScans = 0;
  let activeQRs = 0;
  let topScannedItem: QRCodeItem | null = null;

  for (const item of items) {
    totalScans += item.scan_count || 0;
    if (item.is_active) activeQRs++;
    if (!topScannedItem || (item.scan_count || 0) > (topScannedItem.scan_count || 0)) {
      topScannedItem = item;
    }
  }

  return {
    totalQRs,
    totalScans,
    activeQRs,
    topScannedCode: topScannedItem && topScannedItem.scan_count > 0 ? topScannedItem.code : null,
  };
}
