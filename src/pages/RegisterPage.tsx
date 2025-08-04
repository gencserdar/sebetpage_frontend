import { useState } from "react";
import { register } from "../services/authService";

export default function RegisterPage() {
  const [firstName, setFirst]       = useState("");
  const [lastName, setLast]         = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConf]  = useState("");
  const [error, setError]           = useState("");
  const [showPopup, setShowPopup]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register(firstName, lastName, email, password);
      setShowPopup(true); // popup aç
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
        <h1 className="mt-2 text-2xl font-semibold">Welcome to SebetPage!</h1>
        <p className="text-gray-400">Create your account below</p>
      </div>



      {/* Form */}
      {!showPopup && (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-xl p-8 space-y-5"
        >
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <input
            type="text"
            placeholder="First name"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last name"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:outline-none"
            value={confirmPassword}
            onChange={(e) => setConf(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 py-2 rounded-lg font-semibold"
          >
            Sign Up
          </button>

          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a href="/login" className="text-blue-400 hover:underline">
              Log in
            </a>
          </div>
        </form>
      )}

      {/* Popup */}
      {showPopup && (
        <div className="absolute inZset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Check Your Email 📩</h2>
            <p className="text-gray-300 mb-6">
              We’ve sent you a confirmation link. Please verify your email to log in.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold"
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
