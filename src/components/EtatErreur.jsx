import "../styles/etat-erreur.css";

// L'ecran qu'on voit quand les donnees ne sont pas venues.
//
// ⚠ IL SE DECLENCHE SUR `error`, JAMAIS SUR UNE LISTE VIDE. Ce sont deux etats
// distincts, et les confondre serait pire que de n'en montrer aucun :
//
//   erreur  le fetch a echoue        -> « nous n'avons pas pu joindre »
//   vide    le fetch a REUSSI, 0 ligne -> « aucune demeure pour ces criteres »
//
// Afficher une erreur sur une recherche qui ne rend rien accuserait le site
// d'une panne alors que la reponse est juste. Le filet garde cette distinction.
//
// PAS D'ICONE D'ALERTE. Ni triangle rouge, ni « Error ». Le registre du site est
// patrimonial : une porte close se dit sans vocabulaire technique. Le lys sert
// de marque, discret, comme partout ailleurs.
export default function EtatErreur({
  titre = "Les portes sont momentanément closes",
  corps = "Nous n'avons pas pu joindre nos demeures. Cela tient sans doute à votre connexion, ou à une indisponibilité passagère de notre côté.",
  onReessayer,
  // ⚠ LE LIBELLE DE L'ACTION EST UNE PROP, ET SON DEFAUT NE BOUGE PAS.
  // « Reessayer » suppose qu'il y a quelque chose a redemander — vrai pour une
  // donnee absente (PR1) ou des offres injoignables (PR2a), FAUX pour une erreur
  // de RENDU : il n'y a rien a refetcher, seulement une page a recharger.
  // Le defaut reste donc « Reessayer », et les usages anterieurs ne changent pas
  // d'un caractere. Un filet de non-regression le verifie.
  libelleAction = "Réessayer",
  onRetour,
  libelleRetour = "← Retour",
}) {
  return (
    <div className="err-bloc" role="alert" aria-live="polite">
      <span className="err-lys" aria-hidden="true">⚜</span>
      <h2 className="err-titre">{titre}</h2>
      <p className="err-corps">{corps}</p>
      <div className="err-actions">
        {onReessayer && (
          <button type="button" className="err-btn" onClick={onReessayer}>
            {libelleAction}
          </button>
        )}
        {onRetour && (
          <button type="button" className="err-lien" onClick={onRetour}>
            {libelleRetour}
          </button>
        )}
      </div>
    </div>
  );
}
