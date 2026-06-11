/** Mirrors auth-service PasswordPolicy.java */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  let hasLetter = false;
  let hasDigit = false;

  for (const ch of password) {
    if (/[a-zA-Z]/.test(ch)) hasLetter = true;
    else if (/\d/.test(ch)) hasDigit = true;
  }

  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: hasMinLength },
    { id: "letter", label: "At least one letter", met: hasLetter },
    { id: "digit", label: "At least one digit", met: hasDigit },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((r) => r.met);
}
