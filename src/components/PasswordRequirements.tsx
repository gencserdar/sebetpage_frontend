import { Check } from "lucide-react";
import { getPasswordRequirements } from "../utils/passwordPolicy";

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
  /** Confirm field: only show "Passwords match", not policy rules. */
  matchOnly?: boolean;
  visible?: boolean;
  className?: string;
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 transition-colors duration-200 ${
        met ? "text-emerald-400" : "text-red-400/90"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
          met
            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
            : "border-red-400/40 bg-red-500/10 text-red-400/60"
        }`}
      >
        {met && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </li>
  );
}

export default function PasswordRequirements({
  password,
  confirmPassword,
  showMatch = false,
  matchOnly = false,
  visible = true,
  className = "",
}: PasswordRequirementsProps) {
  if (!visible) return null;

  if (matchOnly) {
    if (!confirmPassword?.length) return null;
    return (
      <ul className={`space-y-1.5 text-sm ${className}`}>
        <RequirementRow met={password === confirmPassword} label="Passwords match" />
      </ul>
    );
  }

  if (!password) return null;

  const requirements = getPasswordRequirements(password);
  const passwordsMatch =
    showMatch && confirmPassword !== undefined && confirmPassword.length > 0
      ? password === confirmPassword
      : null;

  return (
    <ul className={`space-y-1.5 text-sm ${className}`}>
      {requirements.map((req) => (
        <RequirementRow key={req.id} met={req.met} label={req.label} />
      ))}
      {passwordsMatch !== null && (
        <RequirementRow met={passwordsMatch} label="Passwords match" />
      )}
    </ul>
  );
}
