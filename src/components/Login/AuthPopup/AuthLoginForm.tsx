interface AuthLoginFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  error: string | null;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  onForgotPassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AuthLoginForm({
  email,
  password,
  rememberMe,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onForgotPassword,
  onSubmit,
}: AuthLoginFormProps) {
  return (
    <>
      <p className="text-sm text-gray-400 mb-6">
        Don't have an account?{" "}
        <a href="/register" className="underline">
          Sign up
        </a>
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          disabled={loading}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          disabled={loading}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Forgot Password?
          </button>
        </div>

        <div className="h-4">
          {error && (
            <span className="block text-red-400 text-sm opacity-0 translate-y-[-3px] animate-[fadeInMove_0.6s_ease-out_forwards]">
              {error}
            </span>
          )}
        </div>

        <label
          className={`flex items-center text-sm transition-all duration-300 ${
            error ? "mt-2" : "mt-0"
          }`}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            disabled={loading}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="mr-2 accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span>Remember me</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 transition font-medium disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-indigo-500 flex items-center justify-center gap-2 min-h-[2.5rem]"
        >
          {loading ? (
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          ) : (
            "Log in"
          )}
        </button>

        <div className="flex items-center my-4">
          <div className="h-px flex-grow bg-white/10"></div>
          <span className="px-3 text-sm text-gray-400">or</span>
          <div className="h-px flex-grow bg-white/10"></div>
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-white text-black hover:bg-gray-100 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
            <path
              fill="#FFC107"
              d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.1-2.5-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.3 16.1 18.8 13 24 13c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 15.1 3 7.4 8.5 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 45c5.3 0 10-1.7 13.7-4.6l-6.3-5.2C29.8 36.5 27 37.5 24 37.5c-5.3 0-9.7-3.4-11.3-8l-6.6 5C7.4 39.5 15.1 45 24 45z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5h-1.9V20H24v8h11.3c-.7 2-2.1 3.8-3.8 5.1l6.3 5.2C40.4 35.8 43.6 30.4 43.6 24c0-1.3-.1-2.5-.4-3.5z"
            />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] py-2 text-white transition hover:bg-white/[0.1]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 1024 1024"
            className="w-5 h-5"
          >
            <path d="M747 519c-1-77 33-136 101-179-38-55-96-85-173-90-73-5-153 42-182 42-31 0-102-40-157-40-115 2-239 90-239 268 0 106 39 219 87 291 41 62 95 132 162 129 64-3 88-42 165-42 77 0 98 42 165 41 68-1 111-63 152-125 48-71 68-140 69-143-2-1-132-51-134-252zM643 161c54-65 49-124 48-145-48 3-104 33-137 71-35 39-57 88-52 147 53 4 105-27 141-73z" />
          </svg>
          Continue with Apple
        </button>
      </form>
    </>
  );
}
