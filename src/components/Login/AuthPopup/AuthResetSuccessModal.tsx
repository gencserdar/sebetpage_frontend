interface AuthResetSuccessModalProps {
  onBackToLogin: () => void;
}

export default function AuthResetSuccessModal({ onBackToLogin }: AuthResetSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-xl backdrop-saturate-200 bg-gradient-to-br from-white/10 to-white/5 text-white rounded-2xl p-6 shadow-lg max-w-sm w-full text-center">
        <p className="mb-4 text-lg">A reset link has been sent to your email.</p>
        <button
          onClick={onBackToLogin}
          className="px-4 py-2 bg-[#635bff] text-white rounded-lg hover:bg-[#5146ff] transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
