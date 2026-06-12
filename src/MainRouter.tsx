import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePopupRoute from "./pages/ProfilePopupRoute";
import RegisterPage from "./pages/RegisterPage";
import ActivatePage from "./pages/ActivatePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedAuthRoute from "./routes/ProtectedAuthRoute";

function AppRoutes() {
  const location = useLocation();
  const isProfilePath = location.pathname.startsWith("/profile/");
  const backgroundLocation = (
    location.state as { backgroundLocation?: ReturnType<typeof useLocation> } | null
  )?.backgroundLocation;

  const baseLocation =
    backgroundLocation ??
    (isProfilePath ? { ...location, pathname: "/", search: "", hash: "" } : location);

  return (
    <>
      <Routes location={baseLocation}>
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
        <Route path="/community/:id" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isProfilePath && (
        <Routes>
          <Route path="/profile/:nickname" element={<ProfilePopupRoute />} />
        </Routes>
      )}
    </>
  );
}

export default function MainRouter() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
