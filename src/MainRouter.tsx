import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import ProtectedAuthRoute from "./routes/ProtectedAuthRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function MainRouter() {
  return (
    <Router>
      <Routes>
        {/* Herkes */}
        <Route path="/" element={<HomePage />} />

        {/* Yalnızca **giriş yapılmamış** kullanıcılar */}
        <Route
          path="/register"
          element={
            <ProtectedAuthRoute>
              <RegisterPage />
            </ProtectedAuthRoute>
          }
        />

        {/* Giriş yapmış olsun/olmasın erişilebilir */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Örnek: giriş zorunlu sayfa
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        /> */}

        {/* Tüm bilinmeyen URL’ler ana sayfaya */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
