import { VerifyState } from "./types";

export interface ProfileVerifyModalProps {
  verify: NonNullable<VerifyState>;
  verifyCode: string;
  verifyError: string | null;
  verifySending: boolean;
  onVerifyCodeChange: (code: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ProfileVerifyModal({
  verify,
  verifyCode,
  verifyError,
  verifySending,
  onVerifyCodeChange,
  onSubmit,
  onCancel,
}: ProfileVerifyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-app-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <h3 className="text-white text-lg font-semibold mb-2">
          {verify.kind === "email"
            ? "Confirm new email"
            : "Confirm password change"}
        </h3>
        <p className="text-gray-400 text-sm mb-5">
          {verify.kind === "email" ? (
            <>
              We sent a 6-digit code to{" "}
              <span className="text-white">{verify.pendingNewEmail}</span>.
              Enter it below to apply the change.
            </>
          ) : (
            <>
              We sent a 6-digit code to your current email. Enter it below to
              apply the new password.
            </>
          )}
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          value={verifyCode}
          onChange={(e) =>
            onVerifyCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="123456"
          className="bg-white/10 text-white text-center tracking-[0.4em] text-xl rounded-lg px-4 py-3 w-full border border-white/20 focus:border-white/40 focus:outline-none mb-3"
          autoFocus
        />
        {verifyError && (
          <p className="text-red-400 text-sm mb-3">{verifyError}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onSubmit}
            disabled={verifySending || verifyCode.length !== 6}
            className="flex-1 bg-indigo-500/80 hover:bg-indigo-500 disabled:opacity-50 p-3 rounded-lg text-white font-medium"
          >
            {verifySending ? "Verifying..." : "Confirm"}
          </button>
          <button
            onClick={onCancel}
            disabled={verifySending}
            className="bg-white/10 hover:bg-white/20 px-4 rounded-lg text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
