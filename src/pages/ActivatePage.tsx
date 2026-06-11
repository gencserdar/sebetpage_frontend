import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { activateAccount } from "../services/authService";

type Status = "loading" | "success" | "error";

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [goingHome, setGoingHome] = useState(false);

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setError("Invalid activation link");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await activateAccount(code);
        if (!cancelled) setStatus("success");
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Activation failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleGoHome = () => {
    if (goingHome) return;
    setGoingHome(true);
    navigate("/?login=1", { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f11] flex flex-col items-center justify-center text-white relative">
      <div className="mb-8 text-center flex flex-col items-center">
        <img
          src="/img4.png"
          alt="SebetPage Logo"
          className="w-40 h-40 -mb-3"
        />
        {status === "success" && (
          <h1 className="mt-2 text-2xl font-semibold">Welcome to SebetPage!</h1>
        )}
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-xl p-8 text-center">
        {status === "loading" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Activating your account</h2>
            <p className="text-gray-300 mb-6">Please wait a moment...</p>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <p className="text-gray-300 mb-6">
              Your email is verified. Log in to start using SebetPage.
            </p>
            <button
              type="button"
              onClick={handleGoHome}
              disabled={goingHome}
              className="w-full px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/40 rounded-lg font-semibold transition-colors flex items-center justify-center min-h-[40px]"
            >
              {goingHome ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Go to login"
              )}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Activation failed</h2>
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <p className="text-gray-400 text-sm mb-6">
              The link may have expired. Log in to request a new activation email.
            </p>
            <Link
              to="/?login=1"
              className="inline-block w-full px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold transition-colors"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
