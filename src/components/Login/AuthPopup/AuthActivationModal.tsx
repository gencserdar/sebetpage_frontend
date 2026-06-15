import { useState } from "react";
import { resendActivationEmail } from "../../../services/authService";
import { appModalShellClass } from "../../../theme/appTheme";

interface AuthActivationModalProps {
  email: string;
  onClose: () => void;
}

export default function AuthActivationModal({ email, onClose }: AuthActivationModalProps) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (sending || !email.trim()) return;
    setError("");
    setSending(true);
    try {
      await resendActivationEmail(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend link");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className={`max-w-sm w-full p-6 text-center ${appModalShellClass}`}>
        <h3 className="text-lg font-semibold mb-2">Activate your email</h3>
        <p className="text-gray-300 text-sm mb-4">
          You haven&apos;t activated your account yet. Check your inbox or request a new link.
        </p>

        {sent ? (
          <p className="text-green-400 text-sm mb-4">
            If an unactivated account exists for {email}, a new link was sent.
          </p>
        ) : (
          <>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="mb-3 flex min-h-[40px] w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Resend activation email"
              )}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
