// Store the current user address
let currentUserAddress: string | null = null;

export function setCurrentUserAddress(address: string | null) {
  currentUserAddress = address;
}

function getCurrentUserAddress(): string | null {
  return currentUserAddress;
}

export async function apiGet<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  const address = getCurrentUserAddress();
  if (address) {
    headers["x-user-id"] = address;
  }

  const res = await fetch(url, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const address = getCurrentUserAddress();
  if (address) {
    headers["x-user-id"] = address;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const address = getCurrentUserAddress();
  if (address) {
    headers["x-user-id"] = address;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
