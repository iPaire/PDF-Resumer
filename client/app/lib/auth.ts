import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Generează un token numeric (ex. pentru resetare parolă prin cod SMS/email).
 * Uses crypto.randomInt (cryptographically secure, unbiased) instead of
 * Math.random(), which is predictable and unsuitable for security tokens.
 * @param length Numărul de cifre (default: 8)
 * @returns Tokenul ca string
 */
export const generateToken = (length = 8): string => {
  let token = '';
  for (let i = 0; i < length; i++) {
    token += crypto.randomInt(0, 10).toString();
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

/**
 * Calculează numărul de zile rămase până la expirarea trial-ului
 * @param trialExpires Data de expirare a trial-ului
 * @returns Numărul de zile rămase
 */
export const getTrialDaysLeft = (trialExpires: string | Date | null): number => {
  if (!trialExpires) return 0;
  
  const now = new Date();
  const expiresDate = new Date(trialExpires);
  const diffTime = expiresDate.getTime() - now.getTime();
  
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};