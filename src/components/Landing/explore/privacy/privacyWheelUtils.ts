const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateWheelUnlockCode(): string {
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export const PRIVACY_WHEEL_SEGMENTS = 10;
export const PRIVACY_WHEEL_GREEN_INDEX = 0;
export const PRIVACY_WHEEL_WIN_CHANCE = 0.1;

export function pickWheelOutcome(): boolean {
  return Math.random() < PRIVACY_WHEEL_WIN_CHANCE;
}
