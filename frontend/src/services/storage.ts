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

// Residents
export async function getLocalResidents(): Promise<Resident[]> {
  const data = await AsyncStorage.getItem(RESIDENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveLocalResidents(residents: Resident[]): Promise<void> {
  // Deduplicate by id - keep latest version
  const map = new Map<string, Resident>();
  for (const r of residents) {
    map.set(r.id, r);
  }
  const deduped = Array.from(map.values());
  await AsyncStorage.setItem(RESIDENTS_KEY, JSON.stringify(deduped));
}

export async function getResidentById(id: string): Promise<Resident | null> {
  const residents = await getLocalResidents();
  return residents.find(r => r.id === id) || null;
}

export async function deleteLocalResident(id: string): Promise<void> {
  const residents = await getLocalResidents();
  const filtered = residents.filter(r => r.id !== id);
  await AsyncStorage.setItem(RESIDENTS_KEY, JSON.stringify(filtered));
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
