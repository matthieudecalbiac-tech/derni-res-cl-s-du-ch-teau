// ═══════════════════════════════════════════════════════════════════════════
// i18n — pré-structure Sprint S2 (décision #14)
// ═══════════════════════════════════════════════════════════════════════════
// Une seule langue active : 'fr'. Pas de sélecteur visible en S2.
// Tous les nouveaux strings des composants S2 passent par t('clef.sous_clef').
// En S3 : ajout de en.json + traduction du contenu éditorial + activation du
// sélecteur de langue.
//
// Import à faire une fois au démarrage (src/main.jsx) — react-i18next n'a pas
// besoin de provider explicite, l'instance i18n initialisée suffit.
// ═══════════════════════════════════════════════════════════════════════════
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
