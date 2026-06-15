import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppAmbientGlow from "../components/AppAmbientGlow";
import PasswordRequirements from "../components/PasswordRequirements";
import { resetPassword } from "../services/authService";
import { isPasswordValid } from "../utils/passwordPolicy";
import { appPageClass, appSurfaceCardClass } from "../theme/appTheme";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const code = searchParams.get("code") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const ok = await resetPassword(code, password);
      if (ok) {
        setSuccess(true);
        setTimeout(() => navigate("/?login=1"), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className={`${appPageClass} items-center justify-center`}>
      <AppAmbientGlow />
      <div className={`relative w-full max-w-md p-8 text-white ${appSurfaceCardClass}`}>
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/img4.png" alt="Logo" className="w-32 h-32" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
        {/* Form */}
        {error && <p className="text-red-400 mb-3 text-center">{error}</p>}
        {success && <p className="text-green-400 mb-3 text-center">Password has been reset successfully!</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            />
            <PasswordRequirements password={password} />
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            />
            <PasswordRequirements
              password={password}
              confirmPassword={confirmPassword}
              matchOnly
              visible={confirmPassword.length > 0}
            />
          </div>
          <button
            type="submit"
            disabled={
              !isPasswordValid(password) ||
              !confirmPassword ||
              password !== confirmPassword
            }
            className="w-full rounded-lg bg-indigo-500 py-2 font-medium transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/40"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
