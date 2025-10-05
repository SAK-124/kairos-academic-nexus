// Client-side authentication using localStorage
export interface User {
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export const AUTH_KEY = 'kairos_auth';
export const ADMIN_EMAILS = ['saboor12124@gmail.com'];

export const login = (email: string): User => {
  const user: User = {
    email,
    isAdmin: ADMIN_EMAILS.includes(email),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
};

export const logout = (): void => {
  localStorage.removeItem(AUTH_KEY);
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const isAdmin = (user: User | null): boolean => {
  return user?.isAdmin || false;
};
