import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import ActivatePage from "./pages/ActivatePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedAuthRoute from "./routes/ProtectedAuthRoute";

export default function MainRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/register"
          element={
            <ProtectedAuthRoute>
              <RegisterPage />
            </ProtectedAuthRoute>
          }
        />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile/:nickname" element={<HomePage />} />
        <Route path="/community/:id" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
