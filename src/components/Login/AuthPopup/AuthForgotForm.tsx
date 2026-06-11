interface AuthForgotFormProps {
  email: string;
  error: string | null;
  onEmailChange: (value: string) => void;
  onBackToLogin: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AuthForgotForm({
  email,
  error,
  onEmailChange,
  onBackToLogin,
  onSubmit,
}: AuthForgotFormProps) {
  return (
    <>
      <p className="text-sm text-gray-400 mb-6">
        Enter your email address and we'll send you a reset link.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full rounded-md bg-[#322f45] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="h-4">
          {error && (
            <span className="block text-red-400 text-sm opacity-0 translate-y-[-3px] animate-[fadeInMove_0.6s_ease-out_forwards]">
              {error}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 transition font-medium"
        >
          Send Reset Link
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition underline"
          >
            Back to Login
          </button>
        </div>
      </form>
    </>
  );
}
