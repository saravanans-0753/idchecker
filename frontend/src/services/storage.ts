import AsyncStorage from '@react-native-async-storage/async-storage';

const RESIDENTS_KEY = '@gate_check_residents';
const ACCESS_LOGS_KEY = '@gate_check_logs';
const LAST_SYNC_KEY = '@gate_check_last_sync';

export interface Resident {
  id: string;
  name: string;
  unit: string;
  aadhar_masked: string;
  vehicle_plate: string;
  photo_url: string;
  photo_base64: string;
  local_photo: string;
  validity: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AccessLogEntry {
  id: string;
  resident_id: string;
  resident_name: string;
  unit: string;
  timestamp: string;
  status: string;
}

// In-memory cache for O(1) lookups
let _cache: Resident[] | null = null;
let _lookupMap: Map<string, Resident> | null = null;

function buildLookupMap(residents: Resident[]): Map<string, Resident> {
  const map = new Map<string, Resident>();
  for (const r of residents) {
    map.set(r.id.toLowerCase(), r);
  }
  return map;
}

function invalidateCache() {
  _cache = null;
  _lookupMap = null;
}

// Residents
export async function getLocalResidents(): Promise<Resident[]> {
  if (_cache) return _cache;
  const data = await AsyncStorage.getItem(RESIDENTS_KEY);
  _cache = data ? JSON.parse(data) : [];
  _lookupMap = buildLookupMap(_cache!);
  return _cache!;
}

export async function saveLocalResidents(residents: Resident[]): Promise<void> {
  // Deduplicate by id - keep latest version
  const map = new Map<string, Resident>();
  for (const r of residents) {
    map.set(r.id, r);
  }
  const deduped = Array.from(map.values());
  await AsyncStorage.setItem(RESIDENTS_KEY, JSON.stringify(deduped));
  // Update cache immediately
  _cache = deduped;
  _lookupMap = buildLookupMap(deduped);
}

export async function getResidentById(id: string): Promise<Resident | null> {
  if (!_lookupMap) await getLocalResidents();
  return _lookupMap!.get(id.toLowerCase()) || null;
}

export async function deleteLocalResident(id: string): Promise<void> {
  const residents = await getLocalResidents();
  const filtered = residents.filter(r => r.id !== id);
  await AsyncStorage.setItem(RESIDENTS_KEY, JSON.stringify(filtered));
  _cache = filtered;
  _lookupMap = buildLookupMap(filtered);
}

// Pre-warm cache on import — call after app starts
export async function preloadResidents(): Promise<number> {
  const residents = await getLocalResidents();
  return residents.length;
}

// Access Logs
export async function getLocalAccessLogs(): Promise<AccessLogEntry[]> {
  const data = await AsyncStorage.getItem(ACCESS_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addAccessLog(log: AccessLogEntry): Promise<void> {
  const logs = await getLocalAccessLogs();
  logs.unshift(log);
  const trimmed = logs.slice(0, 500);
  await AsyncStorage.setItem(ACCESS_LOGS_KEY, JSON.stringify(trimmed));
}

// Sync timestamp
export async function getLastSyncTime(): Promise<string | null> {
  return await AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setLastSyncTime(time: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, time);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([RESIDENTS_KEY, ACCESS_LOGS_KEY, LAST_SYNC_KEY]);
}
