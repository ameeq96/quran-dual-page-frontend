export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_UNAUTHORIZED_EVENT = 'admin:unauthorized';

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function hasAdminToken() {
  return getAdminToken().trim().length > 0;
}

export function notifyUnauthorized() {
  window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
}
