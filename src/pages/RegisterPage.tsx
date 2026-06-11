import { useState } from "react";
import { Link } from "react-router-dom";
import PasswordRequirements from "../components/PasswordRequirements";
import { register } from "../services/authService";
import { isPasswordValid } from "../utils/passwordPolicy";

export default function RegisterPage() {
  const [firstName, setFirst]       = useState("");
  const [lastName, setLast]         = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConf]  = useState("");
  const [nickname, setNickname]     = useState("");
  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!isPasswordValid(password)) {
      setError("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(firstName, lastName, email, password, nickname);
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f11] flex flex-col items-center justify-center text-white relative">
      {/* Logo & Welcome */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img
          src="/img4.png"
          alt="SebetPage Logo"
          className="w-40 h-40 -mb-3" // increased size, centered
        />
        {!registered && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Join SebetPage</h1>
            <p className="text-gray-400">Create your account below</p>
          </>
        )}
      </div>



      {registered ? (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="text-gray-300 mb-6">
            We&apos;ve sent you a confirmation link. Please verify your email to log in.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold transition-colors"
          >
            Go to Home
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-xl p-8 space-y-5"
        >
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <input
            type="text"
            placeholder="First name"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <input
            type="text"
            placeholder="Last name"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
            />
            <PasswordRequirements password={password} />
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              value={confirmPassword}
              onChange={(e) => {
                setConf(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
            />
            <PasswordRequirements
              password={password}
              confirmPassword={confirmPassword}
              matchOnly
              visible={confirmPassword.length > 0}
            />
          </div>
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !isPasswordValid(password) ||
              !confirmPassword ||
              password !== confirmPassword
            }
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/40 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center min-h-[40px]"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign Up"
            )}
          </button>

          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/?login=1" className="text-blue-400 hover:underline">
              Log in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
