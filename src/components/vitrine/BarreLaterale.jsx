import { MODULES, useCompteursOffres, detailModule } from "./offresResume";
import { LIBELLES, PHRASES_BANDEAU, ICONES } from "./OngletsNiveau1";
import { THEMES } from "./OngletsNiveau2";
import { CHAMP_PHOTO_BARRE } from "../../utils/photosEmplacements";
import { CHAMP_ACCROCHE_BARRE } from "../../utils/accrochesEmplacements";
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
// LES PHOTOS DES CARTES SONT ASSIGNABLES EN ADMIN (chateaux.img_barre_*). Si
// l'emplacement est rempli, il tranche. Sinon on retombe sur la pioche
// historique : le hero prend images[0], les cartes puisent dans le reste, en
// tournant. Un château qui n'a qu'une seule photo la réutilise — c'est le repli,
// et il est visible plutôt que caché.
// ⚠ C'est cette pioche que le journal partage à l'identique (même vivier, même
//   index) : sans assignation, la même photo paraît deux fois par écran.
// ═══════════════════════════════════════════════════════════════════════════

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
  // Comptage partagé avec la feuille « Explorer » du mobile (offresResume.js) :
  // même logique, un seul aller-retour grâce au cache d'offresService.
  const { nbB, nbC } = useCompteursOffres(chateau.slug);

  // La photo d'une carte, par ordre de priorité :
  //   1. l'emplacement ASSIGNÉ en admin (chateau.imgBarre*) — il tranche ;
  //   2. le vivier : tout sauf la photo du hero, en tournant.
  // Le vivier reste le repli et non l'inverse : tant qu'aucun emplacement n'est
  // rempli, la barre affiche exactement ce qu'elle affichait avant.
  // S'il n'y a qu'une image, on la reprend — mieux vaut la même photo trois
  // fois qu'un cadre vide.
  const images = chateau?.images || [];
  const vivier = images.length > 1 ? images.slice(1) : images;
  const photoCarte = (m, i) =>
    chateau?.[CHAMP_PHOTO_BARRE[m]] || (vivier.length ? vivier[i % vivier.length] : null);

  // La phrase d'une carte, même règle : l'accroche écrite en admin d'abord,
  // sinon la constante PHRASES_BANDEAU — la même pour tous les châteaux. C'est
  // précisément ce que l'accroche permet de particulariser, domaine par domaine.
  const phraseCarte = (m) => chateau?.[CHAMP_ACCROCHE_BARRE[m]] || PHRASES_BANDEAU[m];

  // Le détail distinctif : prix d'appel, compte, ou invitation. Extrait dans
  // offresResume.js pour être partagé avec la feuille mobile — même chaîne
  // affichée des deux côtés, écrite une seule fois.
  const detail = (m) => detailModule(m, { chateau, prixAPartir, isClubMember, nbB, nbC });

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
                const photo = photoCarte(m, i);
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
                        <span className="bl-offre-ligne">{phraseCarte(m)}</span>
                        {detail(m) && <span className="bl-offre-detail">{detail(m)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Fleur de lys clé — l'ornement de marque (/FDL-transparent.png). */}
          <div className="bl-sep" aria-hidden="true">
            <span className="bl-sep-l" />
            <img src="/FDL-transparent.png" alt="" className="bl-sep-lys" />
            <span className="bl-sep-l" />
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
