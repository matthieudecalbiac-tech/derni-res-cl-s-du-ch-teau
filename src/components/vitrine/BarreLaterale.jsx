import { useEffect, useState } from "react";
import { getOffresPourChateau } from "../../services/offresService";
import { formaterPrix } from "../../services/_mapping";
import { LIBELLES, PHRASES_BANDEAU, ICONES } from "./OngletsNiveau1";
import { THEMES } from "./OngletsNiveau2";
import "../../styles/barre-laterale.css";

// ═══════════════════════════════════════════════════════════════════════════
// LCC — Barre latérale permanente : LES OFFRES + EXPLORER LE CHÂTEAU.
// ═══════════════════════════════════════════════════════════════════════════
// Seul point d'accès à la navigation depuis que les onglets N1 et N2 ont quitté
// le flux de la vitrine.
//
// AUCUNE LOGIQUE DE DONNÉES CRÉÉE. Les libellés, phrases et icônes viennent
// d'OngletsNiveau1, les sept thèmes d'OngletsNiveau2 — constantes exportées,
// jamais recopiées. Les comptes d'offres passent par getOffresPourChateau, le
// même appel que faisait la bande N1 : DÉPLACÉ, pas dupliqué.
// ⚠ OngletsNiveau1 n'est plus monté nulle part. Il ne survit que pour ses
//   constantes, et sa copie de cette logique est dormante — à supprimer quand
//   le composant le sera.
//
// LES PHOTOS DES CARTES ÉVITENT CELLE DU HERO. Le hero prend images[0] ; les
// cartes piochent dans le reste, en tournant. Un château qui n'a qu'une seule
// photo la réutilise — c'est le repli, et il est visible plutôt que caché.
// ═══════════════════════════════════════════════════════════════════════════

const MODULES = ["permanent", "dernieresCles", "club"];

export default function BarreLaterale({
  chateau,
  moduleActif,
  themeActif,
  isClubMember,
  prixAPartir,
  onChoisirModule,
  onChoisirTheme,
  onClubLock,
}) {
  const [nbB, setNbB] = useState(null);
  const [nbC, setNbC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Fetchs inconditionnels : on interroge la base pour chaque module. Un
    // module sans offre affiche son état parce qu'on a cherché et rien trouvé,
    // pas parce qu'on s'est abstenu.
    getOffresPourChateau(chateau.slug, "dernieresCles", null).then((o) => {
      if (!cancelled) setNbB({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
    });
    getOffresPourChateau(chateau.slug, "club", null).then((o) => {
      if (!cancelled) setNbC({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
    });
    return () => { cancelled = true; };
  }, [chateau.slug]);

  // Le vivier des cartes : tout sauf la photo du hero. S'il n'y a qu'une image,
  // on la reprend — mieux vaut la même photo trois fois qu'un cadre vide.
  const images = chateau?.images || [];
  const vivier = images.length > 1 ? images.slice(1) : images;
  const photoCarte = (i) => (vivier.length ? vivier[i % vivier.length] : null);

  // Le détail distinctif : prix d'appel, compte, ou invitation. Rien tant que le
  // comptage n'est pas revenu — un « 0 offre » qui apparaît puis se corrige
  // serait pire que le silence.
  const detail = (m) => {
    if (m === "permanent") {
      const n = chateau.chambres?.length || 0;
      if (!n) return null;
      return prixAPartir ? `À partir de ${prixAPartir} €` : `${n} chambre${n > 1 ? "s" : ""}`;
    }
    if (m === "dernieresCles") {
      if (nbB === null) return null;
      if (nbB.n === 0) return "Aucune offre en cours";
      return nbB.min ? `Dès ${formaterPrix(nbB.min)} €` : `${nbB.n} offre${nbB.n > 1 ? "s" : ""}`;
    }
    if (m === "club") {
      if (!isClubMember) return "Découvrir les privilèges";
      if (nbC === null) return null;
      return nbC.n === 0 ? "Aucune offre en cours" : `${nbC.n} offre${nbC.n > 1 ? "s" : ""}`;
    }
    return null;
  };

  // Même règle qu'OngletsNiveau1 : le Club n'est pas masqué aux non-membres, il
  // est verrouillé au clic. Le masquer laisserait croire qu'il n'existe pas.
  const choisirModule = (m) => {
    if (m === "club" && !isClubMember) {
      onClubLock?.();
      return;
    }
    onChoisirModule?.(m);
  };

  return (
    <aside className="bl" aria-label="Les offres et la découverte du château">
      <div className="bl-sticky">
        {/* Cartouche : un encadré au filet or, comme un carton posé sur la page.
            C'est lui qui donne son unité à la colonne. */}
        <div className="bl-cartouche">

          {/* ── LES OFFRES ── */}
          <nav className="bl-section" aria-label="Modules commerciaux">
            <p className="bl-eyebrow">Les offres</p>
            <ul className="bl-offres">
              {MODULES.map((m, i) => {
                const photo = photoCarte(i);
                return (
                  <li key={m}>
                    <button
                      type="button"
                      className={"bl-offre" + (moduleActif === m ? " bl-offre--actif" : "")}
                      onClick={() => choisirModule(m)}
                      aria-current={moduleActif === m ? "true" : undefined}
                      data-module={m}
                    >
                      <span className="bl-offre-media">
                        {photo ? (
                          <span className="bl-offre-photo" style={{ backgroundImage: `url('${photo}')` }} />
                        ) : (
                          // Repli : jamais un cadre vide. Un aplat crème au lys.
                          <span className="bl-offre-photo bl-offre-photo--sans" aria-hidden="true">⚜</span>
                        )}
                      </span>
                      <span className="bl-offre-corps">
                        <img className="bl-offre-ico" src={ICONES[m]} alt="" aria-hidden="true" />
                        <span className="bl-offre-nom">{LIBELLES[m]}</span>
                        <span className="bl-offre-ligne">{PHRASES_BANDEAU[m]}</span>
                        {detail(m) && <span className="bl-offre-detail">{detail(m)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="bl-sep" aria-hidden="true">
            <span className="bl-sep-l" /><span className="bl-sep-lys">⚜</span><span className="bl-sep-l" />
          </div>

          {/* ── EXPLORER LE CHÂTEAU ──
              Grille à deux colonnes : c'est ce qui garde la barre COURTE, sept
              thèmes en quatre rangs plutôt qu'en sept. */}
          <nav className="bl-section" aria-label="Découverte éditoriale">
            <p className="bl-eyebrow">Explorer le château</p>
            <ul className="bl-themes">
              {THEMES.map((t) => (
                <li key={t.code}>
                  <button
                    type="button"
                    className={"bl-theme" + (themeActif === t.code ? " bl-theme--actif" : "")}
                    onClick={() => onChoisirTheme?.(t.code)}
                    aria-current={themeActif === t.code ? "true" : undefined}
                    data-theme={t.code}
                  >
                    {/* Le même lys pour les sept : l'ornement ponctue, c'est le
                        libellé qui distingue. Sept pictogrammes différents
                        seraient une décision d'iconographie, pas de mise en page. */}
                    <span className="bl-theme-lys" aria-hidden="true">⚜</span>
                    <span className="bl-theme-label">{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

        </div>
      </div>
    </aside>
  );
}
