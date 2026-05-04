import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

interface Props {
  children: ReactNode;
}

/** Giriş yapılmışsa /login-, /register- vb. sayfalara erişimi engeller */
export default function ProtectedAuthRoute({ children }: Props) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
