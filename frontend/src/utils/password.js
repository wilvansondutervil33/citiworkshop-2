export const PASSWORD_HINT = 'At least 8 characters with a letter, a number and a special character. No spaces.';

// Mirrors the API's password rules; returns a message, or null when the password is acceptable
export function passwordProblem(password) {
  if (/\s/.test(password)) return "Password can't contain spaces.";
  if (password.length < 8) return 'Use at least 8 characters.';
  const missing = [];
  if (!/\p{L}/u.test(password)) missing.push('a letter');
  if (!/\p{N}/u.test(password)) missing.push('a number');
  if (!/[^\p{L}\p{N}]/u.test(password)) missing.push('a special character such as ! # or @');
  if (!missing.length) return null;
  const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}` : missing[0];
  return `Add ${list}.`;
}
