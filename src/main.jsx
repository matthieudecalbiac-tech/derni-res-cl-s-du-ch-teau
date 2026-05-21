import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import "./i18n";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";

// Filet de validation runtime — uniquement en dev (zero overhead prod).
// Le bloc et ses imports dynamiques sont entièrement éliminés en prod
// par Rollup via constant folding sur import.meta.env.DEV (= false en prod).
// Si un château ne respecte pas le schéma Chateau toolkit, throw au démarrage.
if (import.meta.env.DEV) {
  const { chateaux } = await import("./data/chateaux");
  const { validateChateau } = await import("./utils/validateChateau");
  chateaux.forEach(validateChateau);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
