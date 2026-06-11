import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./context/UserContext";

test("renders the home shell", () => {
  render(
    <UserProvider>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </UserProvider>
  );

  expect(screen.getByText(/SebetPage/i)).toBeInTheDocument();
});
