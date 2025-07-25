// lib/auth.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Generează un token numeric (ex. pentru resetare parolă prin cod SMS/email).
 * @param length Numărul de cifre (default: 6)
 * @returns Tokenul ca string
 */
export const generateToken = (length = 6): string => {
  const digits = '0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return token;
};

/**
 * Generează un token criptografic aleator (ex. pentru email/token reset).
 * @param length Numărul de bytes (default: 32)
 * @returns Token hexazecimal
 */
export const generateSecureToken = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash-uiește o parolă folosind bcrypt.
 * @param password Parola în clar
 * @returns Hash-ul
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compară o parolă cu un hash stocat.
 * @param plainPassword Parola introdusă
 * @param hashedPassword Hash-ul stocat
 * @returns true dacă parolele coincid
 */
export const comparePasswords = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};