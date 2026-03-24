import { useState } from "react";
import "../styles/partenaires.css";

const MODES = [
  { id: "vitrine", numero: "A", titre: "Vitrine permanente", sous_titre: "Canal d'image & d'acquisition", description: "Votre domaine bénéficie d'une page dédiée, rédigée comme un article éditorial. Histoire du lieu, photographies, ambiance, singularité. Une vitrine permanente, maîtrisée, qui vous ressemble.", points: ["Page dédiée · contenu éditorialisé","Référencement SEO sur vos requêtes cibles","Accès enrichi pour les membres Club","Aucune obligation tarifaire"], couleur: "vitrine" },
  { id: "lastminute", numero: "B", titre: "Last-minute", sous_titre: "Activation ponctuelle · dates difficiles", description: "Vous choisissez vos fenêtres : J-7, J-10 ou J-15. Vous gardez le contrôle total sur les dates proposées et les conditions. Nous activons la demande sur ces créneaux précis.", points: ["Fenêtres J-7 / J-10 / J-15 selon votre appétit","Vous fixez les dates et les conditions","Avant-première réservée aux membres Club","Activation sans engagement permanent"], couleur: "lastminute" },
  { id: "hybride", numero: "C", titre: "Hybride", sous_titre: "Vitrine + opérations privées", description: "La formule complète : une vitrine permanente pour votre image, des fenêtres last-minute pour optimiser vos dates. Vous pilotez les deux selon la saison et vos besoins.", points: ["Vitrine permanente + last-minute","Packages exclusifs membres Club","Pilotage selon la saison et vos priorités","Accompagnement éditorial personnalisé"], couleur: "hybride" },
];

const ARGUMENTS = [
  { icone: "⚜", titre: "Votre image, protégée", texte: "Votre domaine n'apparaît pas sur Booking.com, Expedia ou les plateformes de masse. L'accès passe par LDCC — sélectif, éditorialisé, confidentiel." },
  { icone: "✦", titre: "Chaque lieu traité comme unique", texte: "Pas de fiche standardisée. Une page écrite comme un article — histoire, architecture, propriétaires, singularité du lieu. Le château comme un univers, pas comme un produit." },
  { icone: "◆", titre: "Vous gardez le contrôle", texte: "Vous choisissez votre mode d'entrée, vos disponibilités, vos conditions. Nous ne publions rien sans votre accord. Vous restez maître de votre distribution." },
  { icone: "❋", titre: "Une clientèle qui vous correspond", texte: "CSP+, Franciliens, amateurs de patrimoine. Des clients qui cherchent l'histoire et l'âme d'un lieu — pas le prix le plus bas." },
];

export default function PartenairesChateaux() {
  const [modeActif, setModeActif] = useState("vitrine");
  const [formEnvoye, setFormEnvoye] = useState(false);
  const [form, setForm] = useState({ nomChateau: "", departement: "", nom: "", email: "", message: "" });
  const modeSelectionne = MODES.find((m) => m.id === modeActif);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = () => { if (form.nomChateau && form.email) setFormEnvoye(true); };

  return (
    <section className="part-section" id="partenaires">
      <div className="part-entete">
        <div className="part-ornement"><span className="part-trait" /><span className="part-lys">⚜</span><span className="part-trait" /></div>
        <span className="part-sur-titre">Pour les propriétaires · Rejoindre la sélection</span>
        <h2 className="part-titre">Votre domaine mérite une autre scène</h2>
        <p className="part-sous-titre">Pas une OTA de masse. Une plateforme éditoriale qui traite chaque lieu comme un univers singulier — et protège l'image des propriétaires qui nous font confiance.</p>
      </div>
      <div className="part-arguments">
        {ARGUMENTS.map((arg, i) => (
          <div key={i} className="part-argument">
            <div className="part-arg-icone">{arg.icone}</div>
            <h3 className="part-arg-titre">{arg.titre}</h3>
            <p className="part-arg-texte">{arg.texte}</p>
          </div>
        ))}
      </div>
      <div className="part-separateur"><div className="part-sep-ligne" /><span className="part-sep-lys">⚜</span><div className="part-sep-ligne" /></div>
      <div className="part-modes-entete">
        <span className="part-sur-titre">Trois modes d'entrée</span>
        <h3 className="part-modes-titre">Choisissez votre façon de participer</h3>
      </div>
      <div className="part-modes-nav">
        {MODES.map((m) => (
          <button key={m.id} className={`part-mode-btn ${modeActif === m.id ? "actif" : ""}`} onClick={() => setModeActif(m.id)}>
            <span className="part-mode-lettre">{m.numero}</span>
            <span className="part-mode-label">{m.titre}</span>
          </button>
        ))}
      </div>
      {modeSelectionne && (
        <div className={`part-mode-detail part-mode-detail--${modeSelectionne.couleur}`}>
          <div className="part-mode-detail-gauche">
            <span className="part-mode-detail-badge">{modeSelectionne.sous_titre}</span>
            <h3 className="part-mode-detail-titre">Mode {modeSelectionne.numero} — {modeSelectionne.titre}</h3>
            <p className="part-mode-detail-desc">{modeSelectionne.description}</p>
          </div>
          <ul className="part-mode-detail-points">
            {modeSelectionne.points.map((p, i) => (
              <li key={i} className="part-mode-point"><span className="part-mode-point-puce">✦</span>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="part-chiffres">
        <div className="part-chiffre"><span className="part-chiffre-nombre">81</span><span className="part-chiffre-label">Domaines sélectionnés</span></div>
        <div className="part-chiffre-sep" />
        <div className="part-chiffre"><span className="part-chiffre-nombre">7</span><span className="part-chiffre-label">Régions couvertes</span></div>
        <div className="part-chiffre-sep" />
        <div className="part-chiffre"><span className="part-chiffre-nombre">&lt;3h</span><span className="part-chiffre-label">De Paris · Bassin prioritaire</span></div>
        <div className="part-chiffre-sep" />
        <div className="part-chiffre"><span className="part-chiffre-nombre">2026</span><span className="part-chiffre-label">Lancement · Printemps</span></div>
      </div>
      <div className="part-separateur"><div className="part-sep-ligne" /><span className="part-sep-lys">⚜</span><div className="part-sep-ligne" /></div>
      <div className="part-contact">
        <div className="part-contact-intro">
          <span className="part-sur-titre">Nous contacter · Devenir partenaire</span>
          <h3 className="part-contact-titre">Parlons de votre domaine</h3>
          <p className="part-contact-sous">Vous gérez ou possédez un château, un manoir, une abbaye ou un domaine de caractère ? Laissez-nous vos coordonnées — nous vous contactons sous 48 heures.</p>
        </div>
        {!formEnvoye ? (
          <div className="part-form">
            <div className="part-form-ligne">
              <div className="part-form-champ"><label>Nom du domaine *</label><input type="text" name="nomChateau" placeholder="Château de…" value={form.nomChateau} onChange={handleChange} /></div>
              <div className="part-form-champ"><label>Département</label><input type="text" name="departement" placeholder="ex. Oise, Indre-et-Loire…" value={form.departement} onChange={handleChange} /></div>
            </div>
            <div className="part-form-ligne">
              <div className="part-form-champ"><label>Votre nom</label><input type="text" name="nom" placeholder="Prénom Nom" value={form.nom} onChange={handleChange} /></div>
              <div className="part-form-champ"><label>Votre email *</label><input type="email" name="email" placeholder="contact@domaine.fr" value={form.email} onChange={handleChange} /></div>
            </div>
            <div className="part-form-champ part-form-champ--full">
              <label>Message (optionnel)</label>
              <textarea name="message" placeholder="Décrivez brièvement votre domaine…" value={form.message} onChange={handleChange} rows={3} />
            </div>
            <div className="part-form-pied">
              <p className="part-form-note">* Champs obligatoires · Données strictement confidentielles</p>
              <button className="part-form-btn" onClick={handleSubmit} disabled={!form.nomChateau || !form.email}>
                <span>Envoyer ma demande</span><span className="part-form-btn-fleche">→</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="part-succes">
            <span className="part-succes-lys">⚜</span>
            <h3 className="part-succes-titre">Message reçu</h3>
            <p className="part-succes-texte">Nous avons bien reçu votre demande concernant <strong>{form.nomChateau}</strong>. Notre équipe vous contacte sous 48 heures.</p>
          </div>
        )}
      </div>
    </section>
  );
}
