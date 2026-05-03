const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function fetchAllResidents() {
  const res = await fetch(`${BACKEND_URL}/api/residents`);
  if (!res.ok) throw new Error('Failed to fetch residents');
  return res.json();
}

export async function fetchResident(id: string) {
  const res = await fetch(`${BACKEND_URL}/api/residents/${id}`);
  if (!res.ok) throw new Error('Resident not found');
  return res.json();
}

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
  name: string;
  unit: string;
  phone: string;
  vehicle_plate?: string;
  photo_base64?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/api/residents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create resident');
  return res.json();
}

export async function updateResident(id: string, data: Record<string, string>) {
  const res = await fetch(`${BACKEND_URL}/api/residents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update resident');
  return res.json();
}

export async function deleteResident(id: string) {
  const res = await fetch(`${BACKEND_URL}/api/residents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete resident');
  return res.json();
}
