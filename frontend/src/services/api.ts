const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function syncResidents() {
  const res = await fetch(`${BACKEND_URL}/api/sync`);
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function postAccessLog(data: {
  resident_id: string;
  resident_name: string;
  unit: string;
  status: string;
}) {
  const res = await fetch(`${BACKEND_URL}/api/access-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to log access');
  return res.json();
}

export async function createResident(data: {
  id?: string;
  name: string;
  unit: string;
  aadhar_masked?: string;
  vehicle_plate?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/api/residents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create resident');
  return res.json();
}

export async function deleteResident(id: string) {
  const res = await fetch(`${BACKEND_URL}/api/residents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete resident');
  return res.json();
}

export async function importFromSheet(sheetUrl: string) {
  const res = await fetch(`${BACKEND_URL}/api/import-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet_url: sheetUrl }),
  });
  if (!res.ok) throw new Error('Failed to import from sheet');
  return res.json();
}

export async function getSheetUrl(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/config/sheet-url`);
  if (!res.ok) return '';
  const data = await res.json();
  return data.sheet_url || '';
}

export async function saveSheetUrl(sheetUrl: string) {
  const res = await fetch(`${BACKEND_URL}/api/config/sheet-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet_url: sheetUrl }),
  });
  if (!res.ok) throw new Error('Failed to save sheet URL');
  return res.json();
}
