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
        
        {/* Profile routes now handled by HomePage with ProfilePopup */}
        <Route 
          path="/profile/:nickname" 
          element={<HomePage />} 
        />
        
        {/* Group route (if you have groups) */}
        <Route 
          path="/group/:id" 
          element={<HomePage />} 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}