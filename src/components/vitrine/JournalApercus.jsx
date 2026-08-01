import { TITRE_JOURNAL_HISTOIRE_DEFAUT } from "../../utils/titresEmplacements";
import "../../styles/vitrine-journal.css";

// ═══════════════════════════════════════════════════════════════════════════
// LCC — Le journal du château : trois APERÇUS cliquables sous le hero.
// ═══════════════════════════════════════════════════════════════════════════
// CE QUE CE COMPOSANT N'EST PAS : le contenu. Une première tentative déversait
// le récit entier et la frise sous le hero — le journal devenait un doublon de
// l'onglet Histoire, en plus long. Ici chaque carte est une PORTE : une image,
// un titre, une phrase, « Découvrir → ». Le contenu complet reste où il est,
// dans ThemeHistoire / ThemeFamille / ThemeServices, et le clic y mène.
//
// AUCUNE DONNÉE NOUVELLE, aucun service appelé : on lit ce que mapChateau
// expose déjà. Chaque accroche vient d'abord du champ que la DA peut écrire en
// admin (chateau.accrocheJournal*, cf. utils/accrochesEmplacements.js) ; à
// défaut seulement, elle est DÉRIVÉE du contenu long présent (découpe par
// premieresPhrases, ou composition par accrocheServices).
//
// COMPOSITION MAGAZINE, pas trois blocs égaux. Une affiche verticale (Histoire)
// ancre à gauche ; deux brèves horizontales (Propriétaires, Services) s'empilent
// à droite. Les trois n'ont donc pas la même ANATOMIE, pas seulement pas la même
// taille — c'est ce qui distingue une mise en page d'une grille.
// ═══════════════════════════════════════════════════════════════════════════

// Fin de phrase = ponctuation SUIVIE d'un espace puis d'une majuscule, avec au
// moins 40 caractères devant. Un split(".") trancherait sur « XVIIe s. » ou
// « av. J.-C. » : ces deux conditions, une abréviation ne les remplit pas.
const FIN_DE_PHRASE = /^(.{40,}?[.!?])\s+(?=[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ«"])/;

function decouperPhrases(texte) {
  const phrases = [];
  let reste = String(texte ?? "").trim().replace(/\s+/g, " ");
  while (reste) {
    const m = reste.match(FIN_DE_PHRASE);
    if (!m) { phrases.push(reste); break; }
    phrases.push(m[1]);
    reste = reste.slice(m[0].length);
  }
  return phrases;
}

/**
 * Les N premières phrases d'un texte long — assez pour donner envie, pas assez
 * pour tout dire : l'aperçu mène à l'onglet complet, il ne le remplace pas.
 *
 * C'est désormais le REPLI, plus le seul chemin : depuis la migration
 * 2026-08-01, chaque section a son champ d'accroche en admin. Cette découpe ne
 * s'applique qu'aux châteaux dont personne n'a encore écrit le teaser — c'est
 * le cas de tous tant que rien n'est saisi.
 *
 * Le plafond de caractères est un garde-fou de mise en page (une phrase de 300
 * caractères existe) : il coupe au dernier espace, jamais en plein mot. Il ne
 * s'applique PAS à une accroche écrite à la main — quand la DA compose la
 * phrase, elle en décide aussi la longueur.
 */
function premieresPhrases(texte, nb = 3, max = 340) {
  const phrases = decouperPhrases(texte);
  if (phrases.length === 0) return "";
  const extrait = phrases.slice(0, nb).join(" ");
  if (extrait.length <= max) return extrait;
  const coupe = extrait.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return (espace > 0 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:]+$/, "") + "…";
}

/**
 * Services : aucune prose d'ensemble n'existe en base (amenities est une liste
 * d'items). On COMPOSE donc une phrase d'accroche factuelle — les comptes réels,
 * jamais un superlatif — puis on nomme ce qui est là.
 */
function accrocheServices(amenities) {
  const parType = (type) =>
    amenities.filter((a) => a?.type === type).map((a) => a?.nom).filter(Boolean);
  const services = parType("service");
  const activites = parType("activite");
  if (services.length === 0 && activites.length === 0) return "";

  const morceaux = [];
  if (services.length) morceaux.push(`${services.length} service${services.length > 1 ? "s" : ""}`);
  if (activites.length) morceaux.push(`${activites.length} activité${activites.length > 1 ? "s" : ""}`);
  const phrase = `Le domaine compte ${morceaux.join(" et ")}.`;

  // La liste illustre l'annonce : on cite, on ne dénombre pas deux fois.
  const cites = (services.length ? services : activites).slice(0, 4);
  return `${phrase} ${cites.join(", ")}.`;
}

// Une carte. `variante` décide de l'anatomie : "affiche" (image en haut, corps
// dessous) ou "breve" (vignette à gauche, texte à droite).
function CarteApercu({ variante, taille, eyebrow, titre, texte, image, onOuvrir }) {
  return (
    <button
      type="button"
      className={`vj-carte vj-carte--${variante} vj-carte--${taille}`}
      onClick={onOuvrir}
      aria-label={`${titre} — découvrir`}
    >
      <span className="vj-carte-media">
        {image ? (
          <span className="vj-carte-img" style={{ backgroundImage: `url('${image}')` }} />
        ) : (
          // DÉGRADÉ : jamais un cadre vide. Un aplat crème et le lys — la carte
          // reste une carte, elle a seulement renoncé à l'image.
          <span className="vj-carte-img vj-carte-img--sans" aria-hidden="true">⚜</span>
        )}
      </span>
      <span className="vj-carte-corps">
        <span className="vj-carte-eyebrow">{eyebrow}</span>
        <span className="vj-carte-titre">{titre}</span>
        {texte && <span className="vj-carte-texte">{texte}</span>}
        <span className="vj-carte-lien">
          Découvrir <span className="vj-carte-fleche" aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}

export default function JournalApercus({ chateau, onOuvrirTheme }) {
  const images = chateau?.images || [];
  const amenities = chateau?.amenities || [];
  const prop = chateau?.proprietaires || null;

  // Repli d'image en cascade : l'emplacement ASSIGNÉ en admin
  // (chateau.imgJournal*, cf. utils/photosEmplacements.js), puis la source
  // propre à la section, puis une photo du domaine, puis rien (l'aplat au lys).
  // L'assignation vient en tête et ne supprime rien : tant qu'elle est vide, la
  // cascade d'origine s'applique mot pour mot.
  //
  // LE HERO PREND images[0] : le journal pioche donc dans le RESTE, en tournant,
  // pour ne pas réafficher la photo qu'on vient de voir en plein cadre. Un
  // château qui n'a qu'une seule image la réutilise — c'est le repli, et il vaut
  // mieux la même photo deux fois qu'un cadre vide.
  const vivier = images.length > 1 ? images.slice(1) : images;
  const photoDomaine = (i) => (vivier.length ? vivier[i % vivier.length] : null);
  const photoService = amenities.find((a) => a?.image)?.image || null;

  const cartes = [
    {
      cle: "histoire",
      theme: "histoire",
      variante: "affiche",
      taille: "grande",
      eyebrow: "Le récit",
      // L'eyebrow reste constant — il ponctue, il ne raconte pas. Le TITRE, lui,
      // est la porte d'entrée du récit sur la plus grande carte de la page :
      // c'est le seul du journal qui mérite d'être écrit par château.
      titre: chateau?.titreJournalHistoire || TITRE_JOURNAL_HISTOIRE_DEFAUT,
      // 4 phrases : l affiche porte le recit, et cette longueur equilibre sa
      // colonne face aux deux breves empilees en face.
      texte: chateau?.accrocheJournalHistoire || premieresPhrases(chateau?.histoire, 4, 460),
      image: chateau?.imgJournalHistoire || photoDomaine(0),
    },
    {
      cle: "famille",
      theme: "famille",
      variante: "breve",
      taille: "moyenne",
      eyebrow: "Les propriétaires",
      // Le nom de la famille EST le titre : c'est ce qui donne son visage à la
      // carte. « La famille » en repli, jamais un titre vide.
      titre: prop?.nom || "La famille",
      // 2 phrases : la brève est plus étroite que l'affiche, et la citation en
      // repli est déjà un propos complet.
      texte:
        chateau?.accrocheJournalProprietaires ||
        premieresPhrases(prop?.description || prop?.citation, 2, 240),
      image: chateau?.imgJournalProprietaires || prop?.portrait || photoDomaine(1),
    },
    {
      cle: "services",
      theme: "services",
      variante: "breve",
      taille: "petite",
      eyebrow: "L'art de recevoir",
      titre: "Table d'hôtes & Services",
      // Déjà composée en deux phrases (annonce + citation) : on la prend telle
      // quelle, la découper la mutilerait.
      texte: chateau?.accrocheJournalServices || accrocheServices(amenities),
      image: chateau?.imgJournalServices || photoService || photoDomaine(2),
    },
  ].filter((c) => c.texte || c.image);

  if (cartes.length === 0) return null;

  return (
    <section className="vj-journal" aria-labelledby="vj-journal-titre">
      <div className="vj-inner">
        <header className="vj-entete">
          <p className="vj-eyebrow">Le journal</p>
          <h2 id="vj-journal-titre" className="vj-titre">
            {chateau?.nom ? `Découvrir ${chateau.nom}` : "Découvrir le domaine"}
          </h2>
          {/* Ornement : la FLEUR DE LYS CLÉ (/FDL-transparent.png), et non le ⚜
              unicode — la clé fait partie de la marque, le glyphe ne l'a pas.
              Même patron que PageHistoire / PagePersonnage : alt="" et
              aria-hidden, c'est décoratif. */}
          <div className="vj-orn" aria-hidden="true">
            <span className="vj-orn-l" />
            <img src="/FDL-transparent.png" alt="" className="vj-orn-lys" />
            <span className="vj-orn-l" />
          </div>
        </header>

        {/* L'affiche à gauche, les deux brèves empilées dans leur propre
            colonne. Un conteneur plutôt qu'un `grid-row: span 2` sur l'affiche :
            le span forçait l'affiche à s'étirer à la hauteur des deux brèves
            (mesuré à 1625 px, dont un vide énorme sous son texte). Ici chaque
            colonne prend sa hauteur naturelle. */}
        <div className="vj-grille">
          {cartes.slice(0, 1).map((c) => (
            <CarteApercu
              key={c.cle}
              variante={c.variante}
              taille={c.taille}
              eyebrow={c.eyebrow}
              titre={c.titre}
              texte={c.texte}
              image={c.image}
              onOuvrir={() => onOuvrirTheme?.(c.theme)}
            />
          ))}
          {cartes.length > 1 && (
            <div className="vj-breves">
              {cartes.slice(1).map((c) => (
                <CarteApercu
                  key={c.cle}
                  variante={c.variante}
                  taille={c.taille}
                  eyebrow={c.eyebrow}
                  titre={c.titre}
                  texte={c.texte}
                  image={c.image}
                  onOuvrir={() => onOuvrirTheme?.(c.theme)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
