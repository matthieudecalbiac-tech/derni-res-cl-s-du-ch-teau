-- ============================================================
-- INSERTION — Château de Bonnemare (Radepont, Eure)
--
-- UNE transaction, UN seul statement : le chateau est insere dans une CTE qui
-- rend son id par RETURNING, et toutes les filles s'y raccrochent. Rien ne peut
-- exister a moitie — ni chateau sans module A, ni chambre orpheline.
--
-- Role postgres (SQL Editor) : la RLS ne s'applique pas, et admin_upsert_chateau
-- est volontairement ECARTEE — sa garde is_admin() lit auth.uid(), qui est NULL
-- hors session authentifiee. Elle refuserait (42501). Elle ne cree de toute
-- facon aucun chateau : elle commence par un SELECT ... IF NOT FOUND RAISE.
--
-- statut = 'brouillon' : rien ne part en ligne avant validation visuelle.
-- module A 13 % pose dans la MEME transaction : sans lui, le chateau n'est pas
-- reservable du tout (demande-reservation sort en 409), et avec un taux NULL il
-- encaisserait 0 % en silence.
--
-- Les textes sont en dollar-quoting ($t$...$t$). La prose francaise est dense en
-- apostrophes ; a l'interieur d'un tel bloc, aucune n'a besoin d'etre doublee, et
-- une relecture ne risque pas de casser la chaine en ajoutant un mot.
-- (Un marqueur isole dans ce commentaire casserait la parite des delimiteurs et
--  tromperait tout outil qui les apparie naivement — d'ou la formulation.)
--
-- ⚠ TYPOGRAPHIE : la prose inseree ici est en apostrophe COURBE (’, U+2019),
--   conformement au reste de la base — Blanc Buisson, Le Boulay-Morin, La Riviere
--   et Saint-Paterne n'en portent pas une seule de droite. L'agent QA
--   validation-donnees signale toute apostrophe droite (') en avertissement.
--   Ne pas retomber sur la droite en recopiant depuis un traitement de texte.
--
-- ⚠ Annotations RETIREES du contenu insere (elles s'adressaient a la redaction,
--   pas a la base) : [NOTE prix : ...] x2, [PRIX PROVISOIRE — a confirmer] x3.
--
-- ── IDEMPOTENCE ─────────────────────────────────────────────────────────────
-- Rejouable : un second passage ne fait RIEN, et n'echoue pas.
--   ON CONFLICT (slug) DO NOTHING sur chateaux -> la CTE `nouveau` ne rend
--   AUCUNE ligne, donc toutes les filles qui s'y raccrochent inserent 0 ligne.
--   C'est le pivot de tout le fichier : une seule garde neutralise la migration
--   entiere.
-- Seule exception : le bloc personnages ne depend pas de `nouveau` (il alimente
--   un referentiel PARTAGE entre chateaux). Il porte donc sa propre garde
--   ON CONFLICT (slug) DO NOTHING, et les id sont resolus par UNION ALL entre
--   les lignes qu'on vient de creer et celles qui preexistaient — un personnage
--   deja present (aujourd'hui aucun, demain peut-etre) est REUTILISE, jamais
--   duplique.
-- ============================================================

BEGIN;

WITH nouveau AS (
  INSERT INTO public.chateaux (
    nom, slug, region, departement, ville,
    accroche, siecle, style, urgence,
    distance_paris, distance_paris_label,
    coordonnees_lat, coordonnees_lng,
    histoire, description, region_narrative, region_histoire,
    chiffres_cles,
    images, video_background_youtube_id,
    prop_nom, prop_depuis, prop_initiale, prop_nom_affiche, prop_portrait,
    prop_citation, prop_description,
    couleur_theme, accent_theme,
    accroche_journal_histoire, accroche_journal_proprietaires, accroche_journal_services,
    accroche_barre_permanent, accroche_barre_dernieres_cles, accroche_barre_club,
    titre_journal_histoire, titre_theme_histoire,
    est_la_une, statut, ordre_home
  )
  VALUES (
    $t$Château de Bonnemare$t$,
    'chateau-de-bonnemare',
    $t$Normandie$t$,
    $t$Eure$t$,
    $t$Radepont$t$,
    $t$Une Renaissance intacte, une légende d’amour et des chambres d’époque — la Normandie dans une maison de famille$t$,
    $t$XVIe siècle$t$,
    $t$Renaissance normande · vallée de l’Andelle$t$,
    $t$J-15$t$,
    90,
    $t$1h30 de Paris$t$,
    49.331700,
    1.333000,
    $t$Bonnemare naît d’abord comme un manoir médiéval associé à Raoul de Bonnemare et à la légende tragique des Deux Amants. Entre 1555 et 1563, Nicolas Leconte, ami d’Henri II, fait édifier le château actuel dans un langage Renaissance inspiré de Philibert Delorme. Les charpentes courbes des tourelles, posées en 1560-1561, en sont un témoignage rare. Étienne de Fieux enrichit ensuite la demeure au XVIIe siècle, notamment avec la Chambre de Parade ; en 1777, Charles Leblond fait décorer la suite Louis XVI. À la Révolution, les armoiries sont burinées pour protéger le domaine. En 1888, Gustave Gatine, ancêtre des propriétaires actuels, l’acquiert. Depuis, une même famille veille sur Bonnemare. Alain et Sylvie Vandecandelaere ouvrent les chambres d’hôtes en 2006, puis les espaces de réception en 2018.$t$,
    $t$Une longue allée de peupliers conduit au châtelet flanqué de tourelles, seule entrée d’un ensemble Renaissance remarquablement préservé. Derrière lui : le château, la chapelle ronde, la ferme, la cidrerie complète, la grande cuisine et un parc clos de 22 hectares. Dans la Chambre de Parade, la suite Louis XVI ou la Chambre du Roi, on dort au milieu de décors classés et de meubles de famille. Sylvie et Alain Vandecandelaere reçoivent eux-mêmes leurs hôtes, avec la simplicité chaleureuse d’une maison transmise depuis 1888.$t$,
    $t$La vallée de l’Andelle est une Normandie de lisières, d’eau et de longues perspectives. À mi-chemin de Paris et de Rouen, les falaises de la Seine, la forêt de Lyons, les abbayes et les villages à pans de bois composent un paysage encore secret. Bonnemare y offre un point d’ancrage rare : assez retiré pour entendre les oiseaux du parc, assez proche de Giverny, Rouen et des Andelys pour rayonner sans hâte.$t$,
    $t$De Richard Cœur de Lion aux peintres impressionnistes, la vallée de la Seine a toujours été une voie stratégique et artistique. Château Gaillard rappelle la lutte entre Plantagenêts et Capétiens ; l’abbaye de Fontaine-Guérard porte la mémoire cistercienne ; Rouen conserve la puissance de l’ancienne capitale du duché. Au XIXe siècle, Monet et ses contemporains trouvent dans cette lumière changeante une nouvelle manière de voir. Bonnemare relie ces strates : légende médiévale, architecture Renaissance, art de vivre des XVIIe et XVIIIe siècles, puis accueil familial contemporain.$t$,
    $t$[{"lab":"Construction","val":"1555–1563"},{"lab":"Même famille","val":"depuis 1888"},{"lab":"Parc clos","val":"22 ha"},{"lab":"Classé MH","val":"1992"}]$t$::jsonb,
    ARRAY[]::text[],                 -- images : a televerser
    'M3g7rr482xc',
    $t$Sylvie & Alain Vandecandelaere$t$,
    $t$1888 pour la famille · ouverture par Sylvie et Alain en 2006$t$,
    'V',
    $t$andecandelaere$t$,             -- prop_initiale + prop_nom_affiche = « Vandecandelaere »
    NULL,                            -- prop_portrait : a televerser
    $t$« C’est la passion pour ce bâtiment et l’envie de le partager qui nous motivent aujourd’hui. »$t$,
    $t$Bonnemare appartient à la même famille depuis l’acquisition du domaine par Gustave Gatine en 1888. Héritiers de cette continuité, Sylvie et Alain Vandecandelaere ont choisi de transformer la conservation en hospitalité : chambres d’hôtes dans les décors historiques depuis 2006, visites, mariages, séminaires et activités pour les familles. Ils ne présentent pas seulement un monument ; ils introduisent chaque visiteur dans leur propre histoire familiale.$t$,
    '#213237',
    '#B68A5A',
    $t$Construit entre 1555 et 1563, Bonnemare réunit charpentes rares, chapelle ronde, cidrerie complète et décors des XVIIe et XVIIIe siècles.$t$,
    $t$Depuis 1888, une même famille protège Bonnemare. Sylvie et Alain ont choisi d’en faire une maison ouverte, transmise par l’accueil.$t$,
    $t$Cinq chambres historiques, trois gîtes, un petit-déjeuner normand, des visites, des jeux et vingt-deux hectares pour respirer.$t$,
    $t$Dormir dans les décors classés de la Chambre de Parade ou de la suite Louis XVI.$t$,
    $t$Une échappée de dernière minute entre Giverny, Rouen et la forêt de Lyons.$t$,
    $t$Visites, portraits et attentions confidentielles au cœur d’une maison de famille.$t$,
    $t$Le château, la légende et la famille$t$,
    $t$La Renaissance normande$t$,
    true,          -- est_la_une : layout vitrine premium
    'brouillon',   -- ⚠ ne pas publier avant validation visuelle
    NULL           -- ordre_home
  )
  -- LA garde d'idempotence. Rejoue, cet INSERT ne rend aucune ligne, et les
  -- huit CTE suivantes qui lisent `nouveau` deviennent des no-op en cascade.
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
),

-- ── Chambres ────────────────────────────────────────────────────────────────
-- prix_cents est NOT NULL et CHECK (> 0) : aucune chambre ne peut naître sans
-- prix. Les trois gîtes portent donc 20000 (200 €) PROVISOIRE, a corriger avant
-- publication. Chambre du Roi : 23500 est le tarif POUR DEUX alors que la
-- capacite est 4 (335 € en duplex) — ecart assume, cf. [NOTE] du formulaire.
ins_chambres AS (
  INSERT INTO public.chambres (chateau_id, nom, description, superficie, capacite, prix_cents, equipements, ordre)
  SELECT n.id, v.nom, v.description, v.superficie, v.capacite, v.prix_cents, v.equipements, v.ordre
  FROM nouveau n, (VALUES
    ($t$Chambre de Parade$t$,
     $t$La plus ancienne suite du château, créée au XVIIe siècle par Edmond de Fieux. Pourpre, dorures, lit à baldaquin d’origine, cheminée sculptée et plafond de l’alcôve racontent le Grand Siècle. Le boudoir en dôme et la salle de bain en trompe-l’œil prolongent cette immersion avec le confort d’aujourd’hui.$t$,
     $t$100 m²$t$::text, 2, 29500,
     ARRAY[$t$Lit double 140×200$t$, $t$Baignoire pour deux$t$, $t$Lavabo en marbre$t$, $t$Boudoir$t$, $t$Petit-déjeuner inclus$t$]::text[], 0),

    ($t$Suite Louis XVI$t$,
     $t$Décorée en 1777 par Charles Leblond, la suite réunit un salon et une chambre aux tonalités azur, jaune et pastel. Ses fenêtres traversantes, les stucs fleuris, le piano Érard et l’harmonium composent une atmosphère claire et raffinée, tournée vers le parc.$t$,
     $t$100 m²$t$, 2, 29500,
     ARRAY[$t$Lit 180×200$t$, $t$Salon$t$, $t$Piano Érard$t$, $t$Harmonium$t$, $t$Baignoire$t$, $t$Petit-déjeuner inclus$t$]::text[], 1),

    ($t$Chambre du Roi$t$,
     $t$Installée dans le châtelet d’entrée, la Chambre du Roi regarde à la fois le château et l’allée des peupliers. Lit à baldaquin, grande cheminée, tapisserie et fresques de grotesques restituent l’esprit du XVIe siècle. Une chambre sous les combles peut compléter l’ensemble pour une famille de quatre.$t$,
     $t$50 m²$t$, 4, 23500,
     ARRAY[$t$Lit 180×200$t$, $t$2 lits simples en duplex$t$, $t$2 salles de bain$t$, $t$Baignoire$t$, $t$Petit-déjeuner inclus$t$]::text[], 2),

    ($t$Raoul de Bonnemare$t$,
     $t$Dans l’aile nord, une chambre chaleureuse dédiée au héros de la légende des Deux Amants. Son lit king size, son ciel de lit et son accès indépendant au parc en font un cocon particulièrement paisible. La vaste douche à l’italienne est accessible aux personnes à mobilité réduite.$t$,
     NULL, 2, 17500,
     ARRAY[$t$Lit 200×200$t$, $t$Douche italienne multijets$t$, $t$Accès PMR$t$, $t$Accès parc$t$, $t$Petit-déjeuner inclus$t$]::text[], 3),

    ($t$Marie de France$t$,
     $t$Une chambre et son petit salon aux couleurs fraîches, placés sous le signe de la poétesse qui fixa par écrit la légende des Deux Amants. Deux colombes peintes veillent sur la pièce, largement ouverte sur le parc. Communicante avec la chambre Raoul, elle peut former une suite familiale.$t$,
     $t$40 m²$t$, 3, 17500,
     ARRAY[$t$Petit salon avec couchage$t$, $t$Douche hydromassante$t$, $t$Vue parc$t$, $t$Petit-déjeuner inclus$t$]::text[], 4),

    ($t$La Boulangerie du château$t$,
     $t$L’ancienne boulangerie est devenue un gîte indépendant de deux chambres, avec cuisine et jardin privé. Une maison simple et chaleureuse dans l’enceinte du domaine, idéale pour une famille qui veut profiter du parc à son rythme.$t$,
     NULL, 4, 20000,   -- PRIX PROVISOIRE
     ARRAY[$t$2 chambres$t$, $t$1 salle de bain$t$, $t$Cuisine$t$, $t$Jardin privé 500 m²$t$, $t$Accès au parc$t$]::text[], 5),

    ($t$Maison de la Ferme$t$,
     $t$Accolée au châtelet, cette maison de trois chambres bénéficie d’une vue directe sur le château. Elle conserve le caractère de la ferme historique tout en offrant trois salles de bain et une cuisine pour les séjours en tribu.$t$,
     NULL, 8, 20000,   -- PRIX PROVISOIRE
     ARRAY[$t$3 chambres$t$, $t$3 salles de bain$t$, $t$Cuisine$t$, $t$Vue château$t$, $t$Accès au parc$t$]::text[], 6),

    ($t$Gîte de la Tuilerie$t$,
     $t$À cinq minutes à pied du château, une grande maison avec jardin privé, garage et terrasse. Ses quatre chambres, dont une adaptée aux personnes à mobilité réduite, permettent de loger une famille ou un groupe tout en conservant l’accès aux extérieurs de Bonnemare.$t$,
     NULL, 10, 20000,  -- PRIX PROVISOIRE
     ARRAY[$t$4 chambres dont 1 PMR$t$, $t$4 salles de bain$t$, $t$Cuisine$t$, $t$Jardin$t$, $t$Garage$t$, $t$Terrasse$t$]::text[], 7)
  ) AS v(nom, description, superficie, capacite, prix_cents, equipements, ordre)
),

-- ── Chronologie ─────────────────────────────────────────────────────────────
-- annee est un TEXT : « Vers 1200 » et « 1555–1563 » sont des valeurs valides.
ins_timeline AS (
  INSERT INTO public.chateau_timeline (chateau_id, annee, evenement, ordre)
  SELECT n.id, v.annee, v.evenement, v.ordre
  FROM nouveau n, (VALUES
    ($t$Vers 1200$t$,  $t$Premier manoir et première chapelle associés à la légende de Raoul de Bonnemare$t$, 0),
    ($t$1555–1563$t$,  $t$Construction du château actuel par Nicolas Leconte$t$, 1),
    ($t$1560–1561$t$,  $t$Pose des rares charpentes courbes dites « à la Philibert Delorme »$t$, 2),
    ($t$Vers 1570$t$,  $t$Installation de la première presse à pommes$t$, 3),
    ($t$Vers 1637$t$,  $t$Acquisition par Étienne de Fieux et création de la Chambre de Parade$t$, 4),
    ($t$1668$t$,       $t$Installation du grand pressoir à longue étreinte conservé dans la cidrerie$t$, 5),
    ($t$1777$t$,       $t$Décoration de la suite Louis XVI par Charles Leblond$t$, 6),
    ($t$1888$t$,       $t$Acquisition par Gustave Gatine, aïeul des propriétaires actuels$t$, 7),
    ($t$1991–1992$t$,  $t$Inscription des communs puis classement du château, du châtelet et de la chapelle$t$, 8),
    ($t$2006$t$,       $t$Ouverture des chambres d’hôtes par Sylvie et Alain$t$, 9),
    ($t$2018$t$,       $t$Ouverture des espaces de réception pour mariages et séminaires$t$, 10)
  ) AS v(annee, evenement, ordre)
),

-- ── Alentours ───────────────────────────────────────────────────────────────
-- type : enum alentour_type, liste fermee de 8 valeurs.
ins_alentours AS (
  INSERT INTO public.chateau_alentours (chateau_id, nom, distance, type, icone, description, ordre)
  SELECT n.id, v.nom, v.distance, v.type::public.alentour_type, v.icone, v.description, v.ordre
  FROM nouveau n, (VALUES
    ($t$Abbaye Notre-Dame de Fontaine-Guérard$t$, $t$10 min$t$, 'patrimoine', $t$⚜$t$,
     $t$Une abbaye cistercienne fondée au XIIe siècle au bord de l’Andelle, liée à la légende des Deux Amants et remarquable par son cloître et son dortoir des moniales.$t$, 0),
    ($t$Les Andelys — Château Gaillard$t$, $t$15 min$t$, 'patrimoine', $t$✦$t$,
     $t$La forteresse édifiée par Richard Cœur de Lion en 1196 domine les méandres et les falaises de la Seine.$t$, 1),
    ($t$Lyons-la-Forêt$t$, $t$20 min$t$, 'patrimoine', $t$◆$t$,
     $t$Un village de halles, colombages et jardins au cœur de l’une des plus belles hêtraies de France.$t$, 2),
    ($t$Château de Vascœuil$t$, $t$20 min$t$, 'culture', $t$◆$t$,
     $t$Un centre d’art installé dans un château médiéval et Renaissance, entouré d’un parc de sculptures.$t$, 3),
    ($t$Rouen — cathédrale et vieille ville$t$, $t$30 min$t$, 'patrimoine', $t$⚜$t$,
     $t$La ville aux cent clochers : cathédrale peinte par Monet, Gros-Horloge, maisons à pans de bois et mémoire de Jeanne d’Arc.$t$, 4),
    ($t$Giverny — maison et jardins de Monet$t$, $t$35 min$t$, 'patrimoine', $t$◆$t$,
     $t$Le jardin d’eau, le pont japonais et la maison où Claude Monet vécut et peignit pendant plus de quarante ans.$t$, 5)
  ) AS v(nom, distance, type, icone, description, ordre)
),

-- ── Services & activités ────────────────────────────────────────────────────
-- L'id est genere ICI, avant l'insert : la liaison amenity_equipements en a
-- besoin, et un RETURNING ne serait pas lisible par une CTE soeur. Meme motif
-- que le bloc 5 d'admin_upsert_chateau.
-- equipement_slug a une FK vers equipements.slug : un slug inconnu fait echouer
-- toute la transaction. Les 5 utilises ici font partie des 21 valides.
payload_amenities AS (
  SELECT gen_random_uuid() AS amenity_id, v.*
  FROM (VALUES
    ('activite', 'culture', $t$Visite guidée de Bonnemare$t$,
     $t$À la demande des hôtes, découverte du châtelet, de la grande cuisine, des chambres historiques, de la chapelle, de la cidrerie et de leurs histoires.$t$,
     $t$⚜$t$, true, NULL::integer, 60::integer, ARRAY['visite_guidee']::text[], 0),

    ('service', 'gastronomie', $t$Petit-déjeuner dans la grande cuisine$t$,
     $t$Jus de pomme local, gâteaux et confitures maison, cœur de Neufchâtel, yaourts fermiers, pains et viennoiseries servis devant la cheminée Renaissance.$t$,
     $t$◆$t$, true, NULL, 60, ARRAY['petit_dejeuner']::text[], 1),

    ('activite', 'famille', $t$La chasse au trésor de Bonnemare$t$,
     $t$Dans les jardins, les enfants réunissent des indices, localisent le coffre puis affrontent des épreuves pour en trouver la combinaison. (6–12 ans · 2 à 10 enfants)$t$,
     $t$★$t$, false, 5000, 90, ARRAY['jeux_interieur']::text[], 2),

    ('activite', 'famille', $t$Mathilde, Raoul et la potion magique$t$,
     $t$Un jeu de piste inspiré de la légende des Deux Amants : résoudre les épreuves et composer la potion qui donnera à Raoul la force de porter Mathilde. (8–12 ans · 2 à 5 enfants)$t$,
     $t$✦$t$, false, 5000, 90, ARRAY['jeux_interieur']::text[], 3),

    ('service', 'culture', $t$Portraits dans les décors de Bonnemare$t$,
     $t$Aloïs, qui connaît chaque recoin du domaine, propose des portraits dans les décors historiques et les perspectives du parc.$t$,
     $t$◇$t$, false, NULL, NULL, ARRAY[]::text[], 4),

    ('activite', 'nature', $t$Vivre le parc de 22 hectares$t$,
     $t$Promenades, observation de la faune, ping-pong, croquet et pétanque dans un parc clos ouvert sur les coteaux de la Seine.$t$,
     $t$✦$t$, true, NULL, NULL, ARRAY['parc_jardins']::text[], 5)
  ) AS v(type, categorie, nom, description, icone, inclus, prix_supplement_cents, duree_minutes, equipements, ordre)
),
ins_amenities AS (
  INSERT INTO public.chateau_amenities
    (id, chateau_id, type, categorie, nom, description, icone, inclus, prix_supplement_cents, duree_minutes, ordre)
  SELECT p.amenity_id, n.id, p.type::public.amenity_type, p.categorie, p.nom, p.description,
         p.icone, p.inclus, p.prix_supplement_cents, p.duree_minutes, p.ordre
  FROM payload_amenities p, nouveau n
),
ins_amenity_eq AS (
  -- unnest d'un tableau vide ne rend aucune ligne : « Portraits » n'a donc
  -- simplement pas de liaison, sans traitement particulier.
  INSERT INTO public.amenity_equipements (amenity_id, equipement_slug)
  SELECT p.amenity_id, s
  FROM payload_amenities p CROSS JOIN LATERAL unnest(p.equipements) AS s
),

-- ── Histoire des lieux ──────────────────────────────────────────────────────
-- Les 7 personnages sont ABSENTS du referentiel (verifie : aucun des slugs
-- calcules par slugify() n'existe parmi les 14 lignes de public.personnages).
-- Le referentiel est PARTAGE entre chateaux : un homonyme futur devra reutiliser
-- ces slugs, pas en recreer.
ins_personnages AS (
  INSERT INTO public.personnages (nom, slug)
  VALUES
    ($t$Raoul de Bonnemare$t$,                   'raoul-de-bonnemare'),
    ($t$Marie de France$t$,                      'marie-de-france'),
    ($t$Nicolas Leconte, marquis de Draqueville$t$, 'nicolas-leconte'),
    ($t$Philibert Delorme$t$,                    'philibert-delorme'),
    ($t$Étienne de Fieux$t$,                     'etienne-de-fieux'),
    ($t$Charles Leblond$t$,                      'charles-leblond'),
    ($t$Charles IX$t$,                           'charles-ix')
  -- Le referentiel est PARTAGE : un slug deja pris appartient a un autre
  -- chateau, on ne le reecrit pas. DO NOTHING et non DO UPDATE — corriger un
  -- nom ici le renommerait sur toutes ses autres fiches, silencieusement.
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug
),
-- Les id, qu'ils viennent d'etre crees OU qu'ils preexistaient. Les deux
-- branches sont disjointes par construction : un slug insere n'est pas dans le
-- snapshot de la table, un slug preexistant n'est pas rendu par le RETURNING.
personnages_resolus AS (
  SELECT id, slug FROM ins_personnages
  UNION ALL
  SELECT id, slug FROM public.personnages
   WHERE slug IN ('raoul-de-bonnemare', 'marie-de-france', 'nicolas-leconte',
                  'philibert-delorme', 'etienne-de-fieux', 'charles-leblond', 'charles-ix')
),
ins_liaison_personnages AS (
  INSERT INTO public.chateau_personnages (chateau_id, personnage_id, nature, texte, ordre)
  SELECT n.id, p.id, v.nature, v.texte, v.ordre
  FROM nouveau n
  CROSS JOIN (VALUES
    ('raoul-de-bonnemare', 'fait_histoire',
     $t$Jeune seigneur de Bonnemare, héros tragique de la légende des Deux Amants.$t$, 0),
    ('marie-de-france', 'fait_histoire',
     $t$La poétesse fixe au XIIe siècle la légende des Deux Amants dans l’un de ses lais.$t$, 1),
    ('nicolas-leconte', 'fait_histoire',
     $t$Ami d’Henri II, il fait construire le château actuel entre 1555 et 1563.$t$, 2),
    ('philibert-delorme', 'fait_histoire',
     $t$Les rares charpentes courbes conservées à Bonnemare suivent le système décrit par l’architecte du roi.$t$, 3),
    ('etienne-de-fieux', 'a_habite',
     $t$Acquéreur vers 1637, il est à l’origine d’une grande part du décor de la Chambre de Parade.$t$, 4),
    ('charles-leblond', 'a_habite',
     $t$Au service du comte de Provence, frère de Louis XVI, il fait décorer la suite en 1777.$t$, 5),
    ('charles-ix', 'fait_histoire',
     $t$La tradition veut que le roi, grand amateur de chasse, ait séjourné dans la chambre qui porte aujourd’hui son titre.$t$, 6)
  ) AS v(slug, nature, texte, ordre)
  JOIN personnages_resolus p ON p.slug = v.slug
  ON CONFLICT ON CONSTRAINT chateau_personnages_unique DO NOTHING
)

-- ── Module A — SANS LUI, LE CHÂTEAU N'EST PAS RÉSERVABLE ────────────────────
-- demande-reservation cherche le couple (chateau, module A, est_actif) : sans
-- ligne, elle sort en 409 « indisponible ». Avec une ligne a taux NULL, la
-- reservation passe et la commission vaut 0, en silence. D'ou les deux valeurs
-- posees ici, dans la meme transaction que le chateau.
INSERT INTO public.chateau_modules (chateau_id, module_id, est_actif, commission_pct_negociee)
SELECT id, '6c150030-e9c1-574f-8124-5e08eb2981d1'::uuid, true, 13
FROM nouveau
-- Filet : `nouveau` est deja vide sur un rejeu, donc cette ligne ne sert que si
-- quelqu'un execute ce bloc isolement. DO NOTHING et non DO UPDATE : on ne veut
-- pas qu'un rejeu ecrase un taux renegocie depuis.
ON CONFLICT (chateau_id, module_id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat)
-- ============================================================

-- (A) Le compte des filles. Attendu : 8 chambres, 11 timeline, 6 alentours,
--     6 amenities, 5 liaisons equipement, 7 personnages, 1 module.
SELECT
  (SELECT count(*) FROM public.chambres          WHERE chateau_id = c.id) AS chambres,
  (SELECT count(*) FROM public.chateau_timeline  WHERE chateau_id = c.id) AS timeline,
  (SELECT count(*) FROM public.chateau_alentours WHERE chateau_id = c.id) AS alentours,
  (SELECT count(*) FROM public.chateau_amenities WHERE chateau_id = c.id) AS amenities,
  (SELECT count(*) FROM public.amenity_equipements ae
     JOIN public.chateau_amenities a ON a.id = ae.amenity_id
    WHERE a.chateau_id = c.id)                                            AS liaisons_equipement,
  (SELECT count(*) FROM public.chateau_personnages WHERE chateau_id = c.id) AS personnages,
  (SELECT count(*) FROM public.chateau_modules   WHERE chateau_id = c.id) AS modules
FROM public.chateaux c WHERE c.slug = 'chateau-de-bonnemare';

-- (B) Le module A et son taux. Attendu : A / true / 13.00
SELECT m.code, cm.est_actif, cm.commission_pct_negociee
FROM public.chateau_modules cm
JOIN public.chateaux c ON c.id = cm.chateau_id
JOIN public.modules  m ON m.id = cm.module_id
WHERE c.slug = 'chateau-de-bonnemare';

-- (C) Aucune fuite de commission sur l'ensemble de la base. Attendu : 0 ligne
--     (hors vaux-le-vicomte / B, brouillon, connu).
SELECT c.slug, c.statut, m.code
FROM public.chateau_modules cm
JOIN public.chateaux c ON c.id = cm.chateau_id
JOIN public.modules  m ON m.id = cm.module_id
WHERE cm.est_actif AND cm.commission_pct_negociee IS NULL
ORDER BY c.slug;

-- (D) Le statut. Attendu : brouillon — rien n'est en ligne.
SELECT slug, statut, est_la_une, ordre_home, cardinality(images) AS nb_images
FROM public.chateaux WHERE slug = 'chateau-de-bonnemare';
