import { Link } from "react-router-dom";
import "../../styles/connexion.css";
import "../../styles/espace-professionnel.css";

// ═══════════════════════════════════════════════════════════════════════════
// LCC — /professionnel : le choix de destination avant la connexion.
// ═══════════════════════════════════════════════════════════════════════════
// CE N'EST PAS UNE PORTE, C'EST UN PANNEAU INDICATEUR. Cette page ne vérifie
// rien, ne donne rien, et n'a pas à le faire : elle pré-remplit une destination
// dans /connexion. Ce qui protège /admin et /chatelain/dashboard, c'est
// RequireRole côté React et la RLS côté base — inchangés, et seuls juges. Un
// visiteur sans rôle qui suit ces liens se connecte puis se fait refuser à
// l'arrivée, exactement comme s'il avait tapé l'URL à la main.
//
// AUCUNE LOGIQUE D'AUTH ÉCRITE ICI. Le paramètre ?next est déjà lu par
// Connexion.jsx, filtré par isPathInterneValide (anti open-redirect) et
// mémorisé en lcc_auth_next jusqu'au retour. On se contente de fabriquer le
// lien : c'est la mécanique existante, pas une seconde.
//
// Le châssis visuel est celui de /connexion (.cnx-page / .cnx-container) —
// même carte crème sur fond crème, même logo. Une page d'aiguillage qui ne
// ressemblerait pas à la page d'arrivée ferait douter d'être au bon endroit.
// ═══════════════════════════════════════════════════════════════════════════

// Les deux destinations, déclarées UNE fois. Ce sont des chemins internes bruts :
// l'encodage n'a lieu qu'au moment de fabriquer l'URL, et le test unitaire
// vérifie sur CES constantes qu'isPathInterneValide les accepte. Une destination
// recalée par la whitelist mènerait à /connexion sans destination — le raccourci
// deviendrait silencieusement un lien mort.
export const DESTINATIONS_PRO = [
  {
    cle: "chatelain",
    chemin: "/chatelain/dashboard",
    titre: "Espace châtelain",
    texte:
      "Le suivi de votre domaine : vos chambres, vos disponibilités et les demandes de séjour qui vous parviennent.",
  },
  {
    cle: "admin",
    chemin: "/admin",
    titre: "Espace administrateur",
    texte:
      "L'administration de la plateforme : les domaines, les réservations et la correspondance.",
  },
];

/** URL de connexion pré-remplie de sa destination. */
export const lienConnexion = (chemin) => `/connexion?next=${encodeURIComponent(chemin)}`;

export default function EspaceProfessionnel() {
  return (
    <div className="cnx-page">
      <div className="cnx-container pro-container">
        <img src="/FDL-transparent.png" alt="" className="cnx-logo" />
        <h1 className="cnx-titre">Espace professionnel</h1>
        <p className="cnx-sous-titre">
          Propriétaires de domaines partenaires et équipe des Clés du Château.
        </p>

        <ul className="pro-choix">
          {DESTINATIONS_PRO.map((d) => (
            <li key={d.cle}>
              <Link className="pro-carte" to={lienConnexion(d.chemin)}>
                <span className="pro-carte-lys" aria-hidden="true">⚜</span>
                <span className="pro-carte-corps">
                  <span className="pro-carte-titre">{d.titre}</span>
                  <span className="pro-carte-texte">{d.texte}</span>
                </span>
                <span className="pro-carte-fleche" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Dit franchement ce que la page ne fait pas. Mieux vaut l'annoncer ici
            que laisser quelqu'un se connecter puis se heurter à un refus sans
            comprendre d'où il vient. */}
        <p className="pro-note">
          Ces espaces sont réservés. L'accès dépend du rôle attaché à votre compte.
        </p>

        <p className="cnx-no-account">
          <Link to="/">Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  );
}
