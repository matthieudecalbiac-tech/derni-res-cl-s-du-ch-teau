import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const CIVILITES = [
  { v: "", label: "—" },
  { v: "M", label: "M." },
  { v: "Mme", label: "Mme" },
  { v: "Mx", label: "Mx" },
];

function labelCivilite(v) {
  const c = CIVILITES.find((x) => x.v === v);
  return c && c.v ? c.label : "—";
}

export default function OngletInfos({ profile, user }) {
  const { refreshProfile } = useAuth();
  const [edition, setEdition] = useState(false);
  const [civilite, setCivilite] = useState(profile?.civilite || "");
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [telephone, setTelephone] = useState(profile?.telephone || "");
  const [marketing, setMarketing] = useState(!!profile?.marketing_consent);
  const [etat, setEtat] = useState("idle"); // idle | saving | ok | error
  const [message, setMessage] = useState("");

  // Reinitialise les champs depuis le profil (pour Annuler)
  const resetDepuisProfil = () => {
    setCivilite(profile?.civilite || "");
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setTelephone(profile?.telephone || "");
    setMarketing(!!profile?.marketing_consent);
  };

  const entrerEdition = () => {
    resetDepuisProfil();
    setMessage("");
    setEtat("idle");
    setEdition(true);
  };

  const annuler = () => {
    resetDepuisProfil();
    setMessage("");
    setEtat("idle");
    setEdition(false);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setEtat("error");
      setMessage("Le prénom et le nom sont requis.");
      return;
    }
    setEtat("saving");
    setMessage("");
    const { error } = await supabase
      .from("users")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        civilite: civilite || null,
        telephone: telephone.trim() || null,
        marketing_consent: marketing,
      })
      .eq("id", user.id);
    if (error) {
      setEtat("error");
      setMessage("Une erreur est survenue lors de l'enregistrement.");
      return;
    }
    if (refreshProfile) await refreshProfile();
    setEtat("ok");
    setMessage("Vos informations ont été enregistrées.");
    setEdition(false);
  };

  return (
    <div className="infos">
      <header className="infos-entete">
        <div>
          <h2 className="infos-titre">Informations personnelles</h2>
          <p className="infos-sous">Gérez les informations de votre compte.</p>
        </div>
        {!edition && (
          <button className="infos-modifier" onClick={entrerEdition}>Modifier</button>
        )}
      </header>

      {/* Message de confirmation (visible en lecture apres save) */}
      {message && etat === "ok" && (
        <div className="infos-message infos-message--ok">
          <span className="infos-check">✓</span> {message}
        </div>
      )}

      {!edition ? (
        /* ─── MODE LECTURE ─── */
        <div className="infos-lecture">
          <div className="infos-ligne-l"><span className="infos-lab-l">Civilité</span><span className="infos-val-l">{labelCivilite(profile?.civilite)}</span></div>
          <div className="infos-ligne-l"><span className="infos-lab-l">Prénom</span><span className="infos-val-l">{profile?.first_name || "—"}</span></div>
          <div className="infos-ligne-l"><span className="infos-lab-l">Nom</span><span className="infos-val-l">{profile?.last_name || "—"}</span></div>
          <div className="infos-ligne-l"><span className="infos-lab-l">Adresse email</span><span className="infos-val-l">{profile?.email || user?.email || "—"}</span></div>
          <div className="infos-ligne-l"><span className="infos-lab-l">Téléphone</span><span className="infos-val-l">{profile?.telephone || "—"}</span></div>
          <div className="infos-ligne-l"><span className="infos-lab-l">Communications</span><span className="infos-val-l">{profile?.marketing_consent ? "Abonné aux communications du Club" : "Non abonné"}</span></div>
        </div>
      ) : (
        /* ─── MODE EDITION ─── */
        <div className="infos-form">
          <div className="infos-champ">
            <label className="infos-label">Civilité</label>
            <select className="infos-input" value={civilite} onChange={(e) => setCivilite(e.target.value)}>
              {CIVILITES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </div>

          <div className="infos-rangee">
            <div className="infos-champ">
              <label className="infos-label">Prénom *</label>
              <input className="infos-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
            </div>
            <div className="infos-champ">
              <label className="infos-label">Nom *</label>
              <input className="infos-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
            </div>
          </div>

          <div className="infos-champ">
            <label className="infos-label">Adresse email</label>
            <input className="infos-input infos-input--lecture" value={profile?.email || user?.email || ""} disabled readOnly />
            <span className="infos-aide">L'adresse email ne peut pas être modifiée ici.</span>
          </div>

          <div className="infos-champ">
            <label className="infos-label">Téléphone</label>
            <input className="infos-input" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+33 6 12 34 56 78" />
          </div>

          <label className="infos-consent">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>Je souhaite recevoir les communications du Club des Châtelains (offres, nouveautés). Désinscription possible à tout moment.</span>
          </label>

          {message && etat === "error" && (
            <div className="infos-message infos-message--erreur">{message}</div>
          )}

          <div className="infos-actions">
            <button className="infos-bouton" onClick={handleSave} disabled={etat === "saving"}>
              {etat === "saving" ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button className="infos-annuler" onClick={annuler} disabled={etat === "saving"}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
