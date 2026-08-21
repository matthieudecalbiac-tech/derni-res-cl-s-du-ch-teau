import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import "./i18n";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import FiletErreur from "./components/FiletErreur.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {/* SOUS le routeur, qui reste donc vivant ; AU-DESSUS du provider, dont
          les effets sont ainsi couverts. Un seul filet, global : aucun chrome
          ne survit hors des routes (le Header vit DANS `homeEtOverlays`), donc
          un filet par route ne sauverait rien de visible. */}
      <FiletErreur>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FiletErreur>
    </BrowserRouter>
  </StrictMode>
);
