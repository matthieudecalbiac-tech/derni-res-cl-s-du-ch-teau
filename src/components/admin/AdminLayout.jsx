import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/admin.css";

// Layout parent de l'espace admin (chantier admin, brique 1 — châssis vide).
// Sidebar fixe à gauche + <Outlet/> à droite où se montent les sections enfants.
// La garde (RequireAuth > RequireRole role="admin") est posée sur la route parente
// dans App.jsx : ici, profile.role === "admin" est déjà garanti.

const LIENS = [
  { to: "/admin", label: "Accueil", end: true },
  { to: "/admin/messages", label: "Messages" },
  { to: "/admin/chateaux", label: "Châteaux" },
  { to: "/admin/reservations", label: "Réservations" },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-sidebar-tete">
          <span className="adm-titre">Administration</span>
        </div>

        <nav className="adm-nav">
          {LIENS.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                "adm-nav-lien" + (isActive ? " adm-nav-lien--actif" : "")
              }
            >
              {lien.label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-pied">
          <span className="adm-connecte">
            Connecté : {profile?.full_name || profile?.first_name || profile?.email}
          </span>
          <button type="button" className="adm-deconnexion" onClick={handleDeconnexion}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="adm-contenu">
        <Outlet />
      </main>
    </div>
  );
}
