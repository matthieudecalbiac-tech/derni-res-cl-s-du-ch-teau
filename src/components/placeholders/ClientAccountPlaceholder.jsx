import { useTranslation } from "react-i18next";
import RoutePlaceholder from "./RoutePlaceholder";

// Route /mon-compte — espace client (liste des réservations + factures).
// Vraie implémentation : Sprint S2-α (ClientAccount réel).
// Utilise useTranslation() ici pour vérifier que le pipeline i18n fonctionne :
// doit afficher "Chargement…" et non la clé "common.loading".
export default function ClientAccountPlaceholder() {
  const { t } = useTranslation();
  return (
    <RoutePlaceholder route="/mon-compte">
      <span className="s2-placeholder-note">{t("common.loading")}</span>
    </RoutePlaceholder>
  );
}
