// Capacite d'accueil d'un chateau = somme des capacites de ses chambres.
// Extrait de PageResultats pour etre partage avec CarteInteractive (une source).
export function capaciteChateau(chateau) {
  return (chateau?.chambres || []).reduce((acc, ch) => acc + (ch.capacite || 0), 0);
}

// Vrai si le chateau peut accueillir nbInvites voyageurs.
export function capaciteSuffisante(chateau, nbInvites) {
  if (!nbInvites) return true; // pas de contrainte invites -> tout passe
  return capaciteChateau(chateau) >= nbInvites;
}
