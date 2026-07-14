/**
 * Helper siecles — fonction pure synchrone.
 * Derive les valeurs de `siecle` DISTINCTES presentes sur les chateaux
 * cherchables (non-demo), triees chronologiquement. AUCUNE liste en dur :
 * les options du filtre suivent les donnees reelles.
 *
 * `siecle` est un champ texte libre ("XVIIe siecle", "XIIIe siecle", et un jour
 * peut-etre "XIIe-XIXe"). On trie sur le chiffre romain de tete converti en
 * entier (chronologique) ; fallback alpha si pas de romain reconnu.
 *
 * @param {Array} chateaux - tableau de chateaux deja charge (via useChateaux()).
 * @returns {string[]} valeurs de siecle distinctes, triees.
 */
const VAL_ROMAINES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romainVersEntier(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = VAL_ROMAINES[s[i]];
    const suiv = VAL_ROMAINES[s[i + 1]];
    if (!cur) return NaN;
    if (suiv && cur < suiv) total -= cur;
    else total += cur;
  }
  return total;
}

export function getSieclesDisponibles(chateaux = []) {
  const set = new Set();
  const liste = Array.isArray(chateaux) ? chateaux : [];
  for (const c of liste) {
    if (!c || c.isDemoMock) continue;
    if (typeof c.siecle === "string" && c.siecle.trim() !== "") {
      set.add(c.siecle.trim());
    }
  }

  // Cle de tri chronologique : chiffre romain de tete -> entier.
  const cle = (s) => {
    const m = s.match(/^[IVXLCDM]+/i);
    const n = m ? romainVersEntier(m[0].toUpperCase()) : NaN;
    return Number.isFinite(n) ? n : Infinity; // valeurs non parsables en fin de liste
  };

  return Array.from(set).sort((a, b) => cle(a) - cle(b) || a.localeCompare(b, "fr"));
}

/** Libelle court pour l'affichage compact (retire " siecle" final). Ex: "XVIIe siecle" -> "XVIIe". */
export function siecleCourt(s) {
  if (typeof s !== "string") return "";
  return s.replace(/\s*si[eè]cle\s*$/i, "").trim();
}
