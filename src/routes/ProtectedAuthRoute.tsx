import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

/** Giriş yapılmışsa /login-, /register- vb. sayfalara erişimi engeller */
export default function ProtectedAuthRoute({ children }: Props) {
  const isAuthenticated = Boolean(localStorage.getItem("token"));

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
