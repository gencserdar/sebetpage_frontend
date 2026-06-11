import { useEffect, useState } from "react";
import { useUser } from "../../../context/UserContext";
import { AccountNotActivatedError } from "../../../services/authService";
import { AuthMode } from "./types";

interface UseAuthFormParams {
  initialMode: AuthMode;
  onSubmit: () => void;
}

export function useAuthForm({ initialMode, onSubmit }: UseAuthFormParams) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [showActivationPopup, setShowActivationPopup] = useState(false);

  const { login, forgotPassword } = useUser();

  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let success = false;

      if (mode === "login") {
        success = await login(email, password, rememberMe);
      } else if (mode === "forgot") {
        success = await forgotPassword(email);
        if (success) {
          setShowResetPopup(true);
          return;
        }
      }

      if (success) {
        onSubmit();
      }
    } catch (err: unknown) {
      if (err instanceof AccountNotActivatedError) {
        setShowActivationPopup(true);
        return;
      }
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

  const title = mode === "login" ? "Log in to your account" : "Reset your password";

  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    mode,
    setMode,
    showResetPopup,
    setShowResetPopup,
    showActivationPopup,
    setShowActivationPopup,
    handleSubmit,
    title,
  };
}
