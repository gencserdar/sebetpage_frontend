import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

interface Props {
  children: ReactNode;
}

/** Sadece kimliği doğrulanmış kullanıcıların erişebileceği rotalar */
export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
