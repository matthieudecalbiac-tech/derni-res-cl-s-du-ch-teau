import "../styles/banniere-app.css";

// Bandeau « Bientot l'application » — MOBILE UNIQUEMENT.
// banniere-app.css le masque au-dessus du seuil : le desktop ne le voit jamais,
// et son SHA-256 reste identique.
//
// Le bouton n'est PAS cable : il n'existe aujourd'hui aucune collecte d'adresses
// pour un lancement d'application. Le brancher a vide (un onClick qui ne fait
// rien, ou une modale sans destination) donnerait au visiteur l'impression
// d'avoir ete enregistre. Il est donc rendu `disabled` avec la mention
// « bientot », dans le meme registre que la pastille « Distance de chez vous »
// des puces d'inspiration — le site dit deja « ca arrive » de cette facon-la.
// A brancher le jour ou la destination existe (Brevo, liste d'attente).
export default function BanniereApp() {
  return (
    <section className="bapp" aria-labelledby="bapp-titre">
      <div className="bapp-inner">
        <span className="bapp-lys" aria-hidden="true">⚜</span>
        <p className="bapp-txt" id="bapp-titre">
          <span className="bapp-titre">Bientôt, l’application Les Clés du Château.</span>
          <span className="bapp-sous">Un accès privilégié à l’exception.</span>
        </p>
        <button type="button" className="bapp-cta" disabled aria-disabled="true">
          Être prévenu
          <span className="bapp-cta-bientot">bientôt</span>
        </button>
      </div>
    </section>
  );
}
