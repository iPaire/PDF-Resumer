// lib/validation.ts - Small, dependency-free input validators for auth routes.
// Kept deliberately minimal (no zod) to stay isolated and easy to audit.

// Pragmatic email shape check - not RFC 5322, just enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200; // bcrypt only hashes the first 72 bytes; cap to bound work
export const NAME_MAX = 100;

export interface ValidationError {
  field: string;
  message: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Validate and normalize a registration payload.
 * Returns either the cleaned input or a list of field errors.
 * Note: email is trimmed but intentionally NOT lower-cased here, because the
 * login lookup elsewhere matches on the raw stored value - normalizing only on
 * one side would create accounts that can't log in. Consistent casing
 * normalization across both routes is a recommended follow-up.
 */
export function validateRegister(body: unknown):
  | { ok: true; value: RegisterInput }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';

  if (!name) {
    errors.push({ field: 'name', message: 'Numele este obligatoriu.' });
  } else if (name.length > NAME_MAX) {
    errors.push({ field: 'name', message: `Numele nu poate depăși ${NAME_MAX} de caractere.` });
  }

  if (!email) {
    errors.push({ field: 'email', message: 'Emailul este obligatoriu.' });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: 'email', message: 'Adresa de email nu este validă.' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Parola este obligatorie.' });
  } else if (password.length < PASSWORD_MIN) {
    errors.push({ field: 'password', message: `Parola trebuie să aibă cel puțin ${PASSWORD_MIN} caractere.` });
  } else if (password.length > PASSWORD_MAX) {
    errors.push({ field: 'password', message: `Parola nu poate depăși ${PASSWORD_MAX} de caractere.` });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, password } };
}
