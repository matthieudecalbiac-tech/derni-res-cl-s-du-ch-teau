import { useParams } from "react-router-dom";
import RoutePlaceholder from "./RoutePlaceholder";

// Route /reservation/:id/confirmation — page de retour post-Stripe Checkout.
// Vraie implémentation : Sprint S2-α (BookingConfirmation réel).
export default function BookingConfirmationPlaceholder() {
  const { id } = useParams();
  return <RoutePlaceholder route={`/reservation/${id ?? ":id"}/confirmation`} />;
}
