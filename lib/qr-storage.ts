
import { supabaseAdmin } from './supabase-admin';
import { QRCodeItem, QRThemeConfig, DashboardStats } from './types';
import { DEFAULT_THEME } from './qr-themes';

function throwDatabaseError(operation: string, error: any): never {
  console.error(`[qr-storage] ${operation} failed:`, error);
  throw new Error(
    `Supabase ${operation} failed: ${error?.message || 'Unknown database error'}`
  );
}

function mapQR(row: any): QRCodeItem {
  // Support both direct columns and theme-embedded fallback for maximum database compatibility
  const whatsapp_url = row.whatsapp_url !== undefined
    ? row.whatsapp_url
    : (row.theme?._whatsapp_url ?? null);
  const instagram_url = row.instagram_url !== undefined
    ? row.instagram_url
    : (row.theme?._instagram_url ?? null);

  return {
    id: row.id,
    code: row.code,
    label: row.label || 'Customer QR',
    destination: row.destination,
    whatsapp_url: whatsapp_url || null,
    instagram_url: instagram_url || null,
    theme: row.theme && typeof row.theme === 'object'
      ? row.theme
      : DEFAULT_THEME,
    scan_count: row.scan_count ?? 0,
    is_active: row.is_active ?? true,
    last_scanned_at: row.last_scanned_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function generateUniqueCode(prefix = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';

  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return prefix ? `${prefix.toUpperCase()}-${rand}` : rand;
}

/**
 * Fetch all QR codes from Supabase
 */
export async function getAllQRs(): Promise<QRCodeItem[]> {
  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throwDatabaseError('Fetch QR codes', error);

  return (data || []).map(mapQR);
}

/**
 * Find a QR code by its code
 */
export async function getQRByCode(
  code: string
): Promise<QRCodeItem | null> {
  const normCode = normalizeCode(code);

  if (!normCode) return null;

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .select('*')
    .ilike('code', normCode)
    .maybeSingle();

  if (error) throwDatabaseError('Find QR code', error);

  return data ? mapQR(data) : null;
}

/**
 * Create a new QR code
 */
export async function createQR(payload: {
  code?: string;
  label: string;
  destination: string;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  theme?: Partial<QRThemeConfig>;
}): Promise<QRCodeItem> {
  const label = (payload.label || 'Customer QR').trim();
  const destination = (payload.destination || '').trim();

  if (!destination) {
    throw new Error('Destination URL is required.');
  }

  let code = normalizeCode(payload.code || '');

  if (!code) {
    code = generateUniqueCode();
  }

  const existing = await getQRByCode(code);

  if (existing) {
    if (payload.code) {
      throw new Error(`QR code ${code} already exists.`);
    }

    code = generateUniqueCode();
  }

  const whatsapp_url = (payload.whatsapp_url || '').trim() || null;
  const instagram_url = (payload.instagram_url || '').trim() || null;

  const newTheme: any = {
    ...DEFAULT_THEME,
    ...(payload.theme || {}),
    _whatsapp_url: whatsapp_url,
    _instagram_url: instagram_url,
  };

  const now = new Date().toISOString();

  // Insert payload preserving both direct columns (if migrated) and theme JSON fallback
  const insertPayload: Record<string, any> = {
    code,
    label,
    destination,
    theme: newTheme,
    scan_count: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // If column exists in DB, it will be populated; if not, theme backup guarantees data isn't lost
  if (whatsapp_url !== undefined) {
    insertPayload.whatsapp_url = whatsapp_url;
  }
  if (instagram_url !== undefined) {
    insertPayload.instagram_url = instagram_url;
  }

  let { data, error } = await supabaseAdmin
    .from('qr_codes')
    .insert(insertPayload)
    .select('*')
    .single();

  // If Supabase throws column not found (e.g. before schema SQL is run in Supabase Studio), fallback without the columns
  if (error && (error.message?.includes('whatsapp_url') || error.message?.includes('instagram_url'))) {
    delete insertPayload.whatsapp_url;
    delete insertPayload.instagram_url;
    const retry = await supabaseAdmin
      .from('qr_codes')
      .insert(insertPayload)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throwDatabaseError('Create QR code', error);

  return mapQR(data);
}

/**
 * Update an existing QR code
 */
export async function updateQR(
  code: string,
  updates: Partial<
    Pick<QRCodeItem, 'destination' | 'label' | 'theme' | 'is_active' | 'whatsapp_url' | 'instagram_url'>
  >
): Promise<QRCodeItem | null> {
  const normCode = normalizeCode(code);

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.destination !== undefined) {
    dbUpdates.destination = updates.destination;
  }

  if (updates.label !== undefined) {
    dbUpdates.label = updates.label;
  }

  // Handle theme and keep fallback sync
  const existingItem = await getQRByCode(normCode);
  const existingTheme = existingItem?.theme ? { ...existingItem.theme } : { ...DEFAULT_THEME };

  let currentWhatsapp = updates.whatsapp_url !== undefined
    ? updates.whatsapp_url
    : existingItem?.whatsapp_url;
  let currentInstagram = updates.instagram_url !== undefined
    ? updates.instagram_url
    : existingItem?.instagram_url;

  if (updates.theme !== undefined) {
    dbUpdates.theme = {
      ...updates.theme,
      _whatsapp_url: currentWhatsapp || null,
      _instagram_url: currentInstagram || null,
    };
  } else {
    dbUpdates.theme = {
      ...existingTheme,
      _whatsapp_url: currentWhatsapp || null,
      _instagram_url: currentInstagram || null,
    };
  }

  if (updates.is_active !== undefined) {
    dbUpdates.is_active = updates.is_active;
  }

  if (updates.whatsapp_url !== undefined) {
    dbUpdates.whatsapp_url = updates.whatsapp_url;
  }

  if (updates.instagram_url !== undefined) {
    dbUpdates.instagram_url = updates.instagram_url;
  }

  let { data, error } = await supabaseAdmin
    .from('qr_codes')
    .update(dbUpdates)
    .ilike('code', normCode)
    .select('*')
    .maybeSingle();

  // If column error occurs before migration, retry without explicit columns
  if (error && (error.message?.includes('whatsapp_url') || error.message?.includes('instagram_url'))) {
    delete dbUpdates.whatsapp_url;
    delete dbUpdates.instagram_url;
    const retry = await supabaseAdmin
      .from('qr_codes')
      .update(dbUpdates)
      .ilike('code', normCode)
      .select('*')
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) throwDatabaseError('Update QR code', error);

  return data ? mapQR(data) : null;
}

/**
 * Delete a QR code
 */
export async function deleteQR(code: string): Promise<boolean> {
  const normCode = normalizeCode(code);

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .delete()
    .ilike('code', normCode)
    .select('id');

  if (error) throwDatabaseError('Delete QR code', error);

  return (data || []).length > 0;
}

/**
 * Increment scan count using the Supabase database function
 */
export async function incrementScan(code: string): Promise<void> {
  const normCode = normalizeCode(code);

  if (!normCode) return;

  const { error } = await supabaseAdmin.rpc(
    'increment_qr_scan',
    { qr_code: normCode }
  );

  if (error) throwDatabaseError('Increment scan count', error);
}

/**
 * Calculate dashboard statistics
 * Uses direct DB aggregates for accuracy instead of summing client-side.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Fetch all QRs once; the row count is small enough that this is fine,
  // and we need the full rows anyway for topScannedCode / activeQRs.
  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .select('code, scan_count, is_active');

  if (error) throwDatabaseError('Fetch stats', error);

  const items = data || [];

  const totalQRs = items.length;
  // Sum from the DB rows directly — no double-fetch, no stale cache
  const totalScans = items.reduce((sum: number, row: any) => sum + (row.scan_count ?? 0), 0);
  const activeQRs = items.filter((row: any) => row.is_active).length;

  let topScannedCode: string | null = null;
  let topCount = 0;
  for (const row of items) {
    const count = row.scan_count ?? 0;
    if (count > topCount) {
      topCount = count;
      topScannedCode = row.code;
    }
  }

  return {
    totalQRs,
    totalScans,
    activeQRs,
    topScannedCode: topCount > 0 ? topScannedCode : null,
  };
}
