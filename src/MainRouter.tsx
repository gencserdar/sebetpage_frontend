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
// import ProfilePopup from "./components/ProfilePopup"; 

import ProtectedAuthRoute from "./routes/ProtectedAuthRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

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
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}