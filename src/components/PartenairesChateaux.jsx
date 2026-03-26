import { useState } from "react";
import "../styles/partenaires.css";

const CONFIGS = [
  { id: "vitrine", numero: "1", titre: "Vitrine permanente", badge: "Module A · Image & acquisition",
    description: "Votre château bénéficie d'une page éditoriale immersive. Histoire du lieu, photographies, famille propriétaire, territoire. Sans frais fixes ni frais d'entrée.",
    points: ["Page dédiée · contenu éditorial complet","Contrôle éditorial total — vous validez chaque ligne","SEO · référencement sur vos requêtes cibles","Chambres permanentes requises sur la plateforme","Rémunération à la performance — conditions négociées avec chaque partenaire"],
    note: "Le château doit proposer des chambres disponibles. Sans offre réelle, la vitrine n'a pas de valeur commerciale.", couleur: "vitrine" },
  { id: "dernieres", numero: "2", titre: "Les Dernières Clés du Château", badge: "Module B · Core concept · Last-minute",
    description: "Section dédiée aux offres last-minute, pilotée librement par le château sur ses dates difficiles. Canal d'activation tactique et de yield, sans présence promotionnelle permanente.",
    points: ["Fenêtres J-7, J-10 ou J-15 selon votre appétit","Vous fixez les dates, les tarifs et les conditions","Avant-première réservée aux membres du Club","Canal de yield — jamais une remise permanente","Conditions préférentielles pour l’activation last-minute"],
    note: "Zéro engagement permanent. Vous activez quand vous en avez besoin, vous pausez quand vous le souhaitez.", couleur: "lastminute" },
  { id: "hybride", numero: "3", titre: "Vitrine + Dernières Clés", badge: "★ Configuration recommandée · Formule complète",
    description: "La combinaison la plus performante : une vitrine permanente pour votre image, et le module last-minute pour optimiser vos dates difficiles. Vous pilotez les deux rails selon la saison.",
    points: ["Vitrine permanente immersive + activation last-minute","Deux canaux complémentaires — image ET rendement","Pilotage indépendant selon la saison","Option Club des Châtelains en surcouche","Accompagnement éditorial personnalisé"],
    note: "★ La combinaison A + B constitue la configuration la plus complète et la plus performante.", couleur: "hybride" },
];

const ARGUMENTS = [
  { icone: "⚜", titre: "Votre image, protégée", texte: "Votre domaine n'apparaît pas sur Booking.com ou les plateformes de masse. L'accès passe par LCC — sélectif, éditorialisé, confidentiel." },
  { icone: "✦", titre: "Chaque lieu traité comme unique", texte: "Pas de fiche standardisée. Une page écrite comme un article — histoire, architecture, propriétaires, singularité. Le château comme un univers, pas comme un produit." },
  { icone: "◆", titre: "Vous gardez le contrôle", texte: "Vous choisissez votre configuration, vos disponibilités, vos conditions. Nous ne publions rien sans votre accord." },
  { icone: "❋", titre: "Une clientèle qui vous correspond", texte: "CSP+, Franciliens, amateurs de patrimoine. Des clients qui cherchent l'histoire et l'âme d'un lieu — pas le prix le plus bas." },
];

export default function PartenairesChateaux({ onClose }) {
  const [configActive, setConfigActive] = useState("vitrine");
  const [formEnvoye, setFormEnvoye] = useState(false);
  const [form, setForm] = useState({ nomChateau: "", departement: "", nom: "", email: "", message: "" });

  const cfg = CONFIGS.find((c) => c.id === configActive);
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = () => { if (form.nomChateau && form.email) setFormEnvoye(true); };

  return (
    <div className={onClose ? "part-overlay" : ""}>
      {onClose && (
        <div className="part-overlay-header">
          <span className="part-overlay-lys">&#x269C;</span>
          <span className="part-overlay-titre">Les Clés du Château · Propriétaires</span>
          <button className="part-overlay-close" onClick={onClose}>Fermer</button>
        </div>
      )}
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
        <span className="part-sur-titre">3 configurations · 1 module optionnel</span>
        <h3 className="part-modes-titre">Choisissez votre façon de participer</h3>
        <p className="part-modes-sous">Aucun frais d’entrée · Aucun engagement · Votre image maîtrisée</p>
      </div>

      <div className="part-modes-nav">
        {CONFIGS.map((c) => (
          <button key={c.id} className={`part-mode-btn ${configActive === c.id ? "actif" : ""}`} onClick={() => setConfigActive(c.id)}>
            <span className="part-mode-lettre">{c.numero}</span>
            <span className="part-mode-label">{c.titre}</span>
            {c.id === "hybride" && <span className="part-mode-star">★</span>}
          </button>
        ))}
      </div>

      {cfg && (
        <div className={`part-mode-detail part-mode-detail--${cfg.couleur}`}>
          <div className="part-mode-detail-gauche">
            <span className="part-mode-detail-badge">{cfg.badge}</span>
            <h3 className="part-mode-detail-titre">Config. {cfg.numero} — {cfg.titre}</h3>
            <p className="part-mode-detail-desc">{cfg.description}</p>
            {cfg.note && <p className="part-mode-detail-note">{cfg.note}</p>}
          </div>
          <ul className="part-mode-detail-points">
            {cfg.points.map((p, i) => (
              <li key={i} className="part-mode-point"><span className="part-mode-point-puce">✦</span>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="part-club-option">
        <div className="part-club-option-header">
          <span className="part-club-option-badge">Option complémentaire · Surcouche optionnelle</span>
          <div className="part-club-option-titre-wrap">
            <h3 className="part-club-option-titre">⚜ Club des Châtelains</h3>
            
          </div>
        </div>
        <p className="part-club-option-desc">
          Espace réservé aux membres inscrits, dédié aux offres, avantages et packages exclusifs <strong>hors last-minute</strong>.
          Outil de fidélisation, d'exclusivité et de montée en gamme. Les offres Club ne sont jamais visibles du grand public.
          Aucun frais fixe.
        </p>
        <div className="part-club-option-points">
          <div className="part-club-pt"><span className="part-club-pt-ico">⚜</span> Offres &amp; packages exclusifs hors last-minute</div>
          <div className="part-club-pt"><span className="part-club-pt-ico">⚜</span> Membres inscrits uniquement · Accès confidentiel</div>
          <div className="part-club-pt"><span className="part-club-pt-ico">⚜</span> Protection d'image totale · Aucune remise publique</div>
          <div className="part-club-pt"><span className="part-club-pt-ico">⚜</span> Commission 8–12 % · Sans abonnement · Sans engagement</div>
        </div>
      </div>

      

      <div className="part-separateur"><div className="part-sep-ligne" /><span className="part-sep-lys">⚜</span><div className="part-sep-ligne" /></div>

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
    </div>
  );
}
