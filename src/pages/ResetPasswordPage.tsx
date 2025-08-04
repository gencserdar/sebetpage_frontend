import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";

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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const ok = await resetPassword(code, password);
      if (ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="bg-[#1f1f1f] p-8 rounded-2xl shadow-lg w-full max-w-md text-white">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/img4.png" alt="Logo" className="w-32 h-32" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
        {/* Form */}
        {error && <p className="text-red-400 mb-3 text-center">{error}</p>}
        {success && <p className="text-green-400 mb-3 text-center">Password has been reset successfully!</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-[#2c2c2c] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]"
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md bg-[#2c2c2c] py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635bff]"
            required
          />
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-[#635bff] hover:bg-[#5146ff] transition font-medium"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
