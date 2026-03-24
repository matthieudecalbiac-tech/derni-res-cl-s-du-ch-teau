import "../styles/footer.css";

const LIENS = {
  explorer: [
    "Offres du moment",
    "Châteaux en Île-de-France",
    "Châteaux en Normandie",
    "Châteaux en Loire",
    "Châteaux en Bourgogne",
    "Toute la sélection",
  ],
  experiences: [
    "Week-ends gastronomiques",
    "Séjours équestres",
    "Escapades avec spa",
    "Châteaux avec parc",
    "Dîners aux chandelles",
    "Séjours historiques",
  ],
  club: [
    "Rejoindre le club",
    "Comment ça marche",
    "Pour les châteaux",
    "Notre sélection",
    "Presse & médias",
    "Nous contacter",
  ],
};

export default function Footer({ onOuvrirCarte }) {
  return (
    <footer className="footer">
      <div className="footer-corps">
        {/* Colonne marque */}
        <div className="footer-marque">
          <div className="footer-logo">
            <span className="footer-logo-principale">
              Les Dernières Clés du Château
            </span>
            <span className="footer-logo-secondaire">
              Échappées aristocratiques · À moins de 3h de Paris
            </span>
          </div>

          <p className="footer-manifeste">
            Un club d'échappées de dernière minute pour permettre aux Parisiens
            de goûter, le temps d'un week-end, à l'art de vivre aristocratique
            des châteaux de campagne.
          </p>

          <div className="footer-reseaux">
            <div className="footer-reseau" title="Instagram">
              ✦
            </div>
            <div className="footer-reseau" title="Facebook">
              f
            </div>
            <div className="footer-reseau" title="Pinterest">
              P
            </div>
            <div className="footer-reseau" title="LinkedIn">
              in
            </div>
          </div>
        </div>

        {/* Explorer */}
        <div className="footer-colonne">
          <span className="footer-colonne-titre">Explorer</span>
          <div className="footer-liens">
            <span className="footer-lien footer-lien--carte" onClick={onOuvrirCarte}>
              ◆ Explorer la carte
            </span>
            {LIENS.explorer.map((lien) => (
              <span key={lien} className="footer-lien">
                {lien}
              </span>
            ))}
          </div>
        </div>

        {/* Expériences */}
        <div className="footer-colonne">
          <span className="footer-colonne-titre">Expériences</span>
          <div className="footer-liens">
            {LIENS.experiences.map((lien) => (
              <span key={lien} className="footer-lien">
                {lien}
              </span>
            ))}
          </div>
        </div>

        {/* Le club */}
        <div className="footer-colonne">
          <span className="footer-colonne-titre">Le Club</span>
          <div className="footer-liens">
            {LIENS.club.map((lien) => (
              <span key={lien} className="footer-lien">
                {lien}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-separateur" />

      <div className="footer-bas">
        <span className="footer-copyright">
          © 2025 Les Dernières Clés du Château · Tous droits réservés
        </span>

        <div className="footer-mentions">
          <span className="footer-mention">Mentions légales</span>
          <span className="footer-mention">Confidentialité</span>
          <span className="footer-mention">CGU</span>
          <span className="footer-mention">Cookies</span>
        </div>

        <span className="footer-signature">
          Fait avec soin, pour les amoureux des châteaux
        </span>
      </div>

      <div className="footer-bande" />
    </footer>
  );
}
