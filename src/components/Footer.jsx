import "../styles/footer.css";

export default function Footer({ onOuvrirCarte, onOuvrirAPropos, onOuvrirProprietaires }) {
  return (
    <footer className="footer">
      <div className="footer-corps">

        {/* Colonne marque */}
        <div className="footer-marque">
          <div className="footer-logo">
            <span className="footer-logo-principale">Les Clés du Château</span>
            <span className="footer-logo-secondaire">Patrimoine · France · Évasion</span>
          </div>
          <p className="footer-manifeste">
            Une plateforme éditoriale hybride qui donne accès aux plus beaux domaines
            de France — dans le respect de leur histoire et de leurs propriétaires.
          </p>
          <div className="footer-reseaux">
            <div className="footer-reseau" title="Instagram">✦</div>
            <div className="footer-reseau" title="Pinterest">P</div>
          </div>
        </div>

        {/* Colonne contact */}
        <div className="footer-colonne">
          <span className="footer-colonne-titre">Informations</span>
          <div className="footer-liens">
            <span className="footer-lien" onClick={onOuvrirAPropos} role="button" tabIndex={0}>
              ◆ À propos
            </span>
            <span className="footer-lien" onClick={onOuvrirProprietaires} role="button" tabIndex={0}>
              ◆ Propriétaires
            </span>
            <span className="footer-lien footer-lien--carte" onClick={onOuvrirCarte}>
              ◆ Explorer la carte
            </span>
            <a className="footer-lien" href="mailto:contact@lesclesduchateau.fr">
              ◆ Nous contacter
            </a>
            <span className="footer-lien">◆ CGU</span>
            <span className="footer-lien">◆ Mentions légales</span>
          </div>
        </div>

      </div>

      <div className="footer-separateur" />

      <div className="footer-bas">
        <span className="footer-copyright">
          © 2025 Les Clés du Château · Tous droits réservés
        </span>
        <span className="footer-signature">
          Fait avec soin, pour les amoureux des châteaux
        </span>
      </div>

      <div className="footer-bande" />
    </footer>
  );
}
