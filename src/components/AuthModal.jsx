import { useState, useEffect } from "react";
import "../styles/auth.css";

const NIVEAUX = [
  { nom: "Blue", dot: "blue", seuil: "Dès l'inscription", reservations: 0 },
  { nom: "Silver", dot: "silver", seuil: "3 réservations", reservations: 3 },
  { nom: "Gold", dot: "gold", seuil: "7 réservations", reservations: 7 },
  {
    nom: "Platinum",
    dot: "platinum",
    seuil: "15 réservations",
    reservations: 15,
  },
];

function genererNumeroMembre() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LDCC-${num}`;
}

export default function AuthModal({
  onClose,
  onConnexion,
  modeInitial = "inscription",
}) {
  const [mode, setMode] = useState(modeInitial);
  const [etape, setEtape] = useState("form"); // 'form' | 'succes'
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [nouveauMembre, setNouveauMembre] = useState(null);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    motDePasse: "",
    parrain: "",
    cgu: false,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const maj = (champ, val) => {
    setForm((f) => ({ ...f, [champ]: val }));
    setErreur("");
  };

  const validerInscription = () => {
    if (!form.prenom.trim()) return "Prénom requis";
    if (!form.nom.trim()) return "Nom requis";
    if (!form.email.includes("@")) return "Email invalide";
    if (!form.telephone.trim()) return "Téléphone requis";
    if (form.motDePasse.length < 6)
      return "Mot de passe : 6 caractères minimum";
    if (!form.cgu) return "Veuillez accepter les conditions d'utilisation";
    return null;
  };

  const validerConnexion = () => {
    if (!form.email.includes("@")) return "Email invalide";
    if (!form.motDePasse) return "Mot de passe requis";
    return null;
  };

  const soumettre = async () => {
    setErreur("");
    const err =
      mode === "inscription" ? validerInscription() : validerConnexion();
    if (err) {
      setErreur(err);
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));

    if (mode === "inscription") {
      const membre = {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        numero: genererNumeroMembre(),
        niveau: "Blue",
        reservations: 0,
        dateInscription: new Date().toLocaleDateString("fr-FR"),
        parrain: form.parrain || null,
      };
      setNouveauMembre(membre);
      setEtape("succes");
      setLoading(false);
    } else {
      // Simulation connexion
      const membre = {
        prenom: "Matthieu",
        nom: "de Calbiac",
        email: form.email,
        numero: "LDCC-4721",
        niveau: "Silver",
        reservations: 3,
        dateInscription: "01/01/2025",
      };
      setLoading(false);
      onConnexion(membre);
      onClose();
    }
  };

  const confirmerInscription = () => {
    onConnexion(nouveauMembre);
    onClose();
  };

  return (
    <div
      className="auth-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="auth-modal">
        {/* Fermer */}
        <button className="auth-modal-fermer" onClick={onClose}>
          ✕
        </button>

        {etape === "succes" && nouveauMembre ? (
          /* ── ÉCRAN SUCCÈS ── */
          <div className="auth-succes">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚜</div>
            <span className="auth-succes-numero">{nouveauMembre.numero}</span>
            <p className="auth-succes-titre">
              Bienvenue au club,
              <br />
              {nouveauMembre.prenom} !
            </p>
            <p className="auth-succes-texte">
              Votre numéro de membre vous a été attribué. Vous rejoignez les
              premières clés du château en tant que membre fondateur.
            </p>
            <div className="auth-succes-niveau">
              <span
                className={`auth-niveau-dot niveau-blue`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#4a90d9",
                  display: "inline-block",
                }}
              />
              Membre Blue · 0 réservation
            </div>
            <button
              className="auth-btn-submit"
              style={{ marginTop: "1.5rem" }}
              onClick={confirmerInscription}
            >
              Accéder à mon compte
            </button>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div className="auth-modal-header">
              <div className="auth-modal-logo">🏰</div>
              <p className="auth-modal-titre">
                {mode === "inscription" ? "Rejoindre le club" : "Bon retour"}
              </p>
              <p className="auth-modal-sous-titre">
                {mode === "inscription"
                  ? "Accédez aux dernières clés disponibles"
                  : "Connectez-vous à votre espace membre"}
              </p>

              {/* Onglets */}
              <div className="auth-onglets">
                <button
                  className={`auth-onglet ${
                    mode === "inscription" ? "actif" : ""
                  }`}
                  onClick={() => {
                    setMode("inscription");
                    setErreur("");
                  }}
                >
                  S'inscrire
                </button>
                <button
                  className={`auth-onglet ${
                    mode === "connexion" ? "actif" : ""
                  }`}
                  onClick={() => {
                    setMode("connexion");
                    setErreur("");
                  }}
                >
                  Se connecter
                </button>
              </div>
            </div>

            {/* ── FORMULAIRE ── */}
            <div className="auth-form">
              {mode === "inscription" && (
                <>
                  {/* Niveaux du club */}
                  <div className="auth-niveaux">
                    {NIVEAUX.map((n) => (
                      <div key={n.nom} className="auth-niveau">
                        <div className={`auth-niveau-dot ${n.dot}`} />
                        <span className="auth-niveau-nom">{n.nom}</span>
                        <span className="auth-niveau-seuil">{n.seuil}</span>
                      </div>
                    ))}
                  </div>

                  <div className="auth-champ-double">
                    <div className="auth-champ">
                      <label>Prénom</label>
                      <input
                        type="text"
                        placeholder="Votre prénom"
                        value={form.prenom}
                        onChange={(e) => maj("prenom", e.target.value)}
                      />
                    </div>
                    <div className="auth-champ">
                      <label>Nom</label>
                      <input
                        type="text"
                        placeholder="Votre nom"
                        value={form.nom}
                        onChange={(e) => maj("nom", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="auth-champ">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={(e) => maj("email", e.target.value)}
                />
              </div>

              {mode === "inscription" && (
                <div className="auth-champ">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    placeholder="+33 6 00 00 00 00"
                    value={form.telephone}
                    onChange={(e) => maj("telephone", e.target.value)}
                  />
                </div>
              )}

              <div className="auth-champ">
                <label>Mot de passe</label>
                <input
                  type="password"
                  placeholder={
                    mode === "inscription" ? "6 caractères minimum" : "••••••••"
                  }
                  value={form.motDePasse}
                  onChange={(e) => maj("motDePasse", e.target.value)}
                />
              </div>

              {mode === "inscription" && (
                <>
                  {/* Code parrain */}
                  <div className="auth-parrain">
                    <span className="auth-parrain-label">
                      Code parrain (optionnel)
                    </span>
                    <p className="auth-parrain-desc">
                      Vous avez été recommandé par un membre ? Entrez son code
                      pour débloquer des avantages exclusifs dès votre
                      inscription.
                    </p>
                    <div className="auth-champ">
                      <input
                        type="text"
                        placeholder="Ex: LDCC-4721"
                        value={form.parrain}
                        onChange={(e) => maj("parrain", e.target.value)}
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      />
                    </div>
                  </div>

                  {/* CGU */}
                  <label className="auth-cgu">
                    <input
                      type="checkbox"
                      checked={form.cgu}
                      onChange={(e) => maj("cgu", e.target.checked)}
                    />
                    J'accepte les <span>conditions d'utilisation</span> et la{" "}
                    <span>politique de confidentialité</span>
                  </label>
                </>
              )}

              {erreur && <div className="auth-erreur">{erreur}</div>}

              <button
                className="auth-btn-submit"
                onClick={soumettre}
                disabled={loading}
              >
                {loading
                  ? "..."
                  : mode === "inscription"
                  ? "Rejoindre le club"
                  : "Se connecter"}
              </button>

              {mode === "connexion" && (
                <p
                  style={{
                    textAlign: "center",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.65rem",
                    color: "var(--gris-fonce)",
                    letterSpacing: "0.08em",
                  }}
                >
                  Mot de passe oublié ?{" "}
                  <span style={{ color: "var(--or)", cursor: "pointer" }}>
                    Réinitialiser
                  </span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
