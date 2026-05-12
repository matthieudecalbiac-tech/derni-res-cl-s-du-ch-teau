import { useParams } from "react-router-dom";
import RoutePlaceholder from "./RoutePlaceholder";

// Route /reserver/:chateauSlug — orchestrateur du parcours de réservation.
// Vraie implémentation : Sprint S2-α (BookingFlow réel).
export default function BookingFlowPlaceholder() {
  const { chateauSlug } = useParams();
  return <RoutePlaceholder route={`/reserver/${chateauSlug ?? ":chateauSlug"}`} />;
}
