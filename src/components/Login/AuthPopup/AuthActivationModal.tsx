import { useState } from "react";
import { resendActivationEmail } from "../../../services/authService";

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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-xl backdrop-saturate-200 bg-gradient-to-br from-white/10 to-white/5 text-white rounded-2xl p-6 shadow-lg max-w-sm w-full text-center">
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
              className="w-full mb-3 px-4 py-2 bg-[#635bff] text-white rounded-lg hover:bg-[#5146ff] disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex items-center justify-center min-h-[40px]"
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
