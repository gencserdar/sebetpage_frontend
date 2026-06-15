import { appModalShellClass } from "../../../theme/appTheme";

interface AuthResetSuccessModalProps {
  onBackToLogin: () => void;
}

export default function AuthResetSuccessModal({ onBackToLogin }: AuthResetSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className={`max-w-sm w-full p-6 text-center ${appModalShellClass}`}>
        <p className="mb-4 text-lg">A reset link has been sent to your email.</p>
        <button
          onClick={onBackToLogin}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
