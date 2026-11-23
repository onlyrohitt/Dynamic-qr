
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
  return {
    id: row.id,
    code: row.code,
    label: row.label || 'Customer QR',
    destination: row.destination,
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

  const newTheme: QRThemeConfig = {
    ...DEFAULT_THEME,
    ...(payload.theme || {}),
  };

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .insert({
      code,
      label,
      destination,
      theme: newTheme,
      scan_count: 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throwDatabaseError('Create QR code', error);

  return mapQR(data);
}

/**
 * Update an existing QR code
 */
export async function updateQR(
  code: string,
  updates: Partial<
    Pick<QRCodeItem, 'destination' | 'label' | 'theme' | 'is_active'>
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

  if (updates.theme !== undefined) {
    dbUpdates.theme = updates.theme;
  }

  if (updates.is_active !== undefined) {
    dbUpdates.is_active = updates.is_active;
  }

  const { data, error } = await supabaseAdmin
    .from('qr_codes')
    .update(dbUpdates)
    .ilike('code', normCode)
    .select('*')
    .maybeSingle();

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
