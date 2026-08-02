-- ============================================================
-- INSERTION — Château Royal de Benays (Benais, Indre-et-Loire)
--
-- Même structure que insert-bonnemare.sql : UNE transaction, UN statement, le
-- chateau insere dans une CTE qui rend son id, toutes les filles raccrochees,
-- module A 13 % pose dans la meme transaction. statut = 'brouillon'.
--
-- ⚠ TROIS ECARTS AU FICHIER SOURCE, tous signales et reversibles :
--
--   1. prop_citation = NULL. Le formulaire la marque [À CONFIRMER]. La regle
--      editoriale du projet est explicite : « ne jamais inventer ni reformuler
--      une citation attribuee a un proprietaire. Soit on a la quote validee par
--      eux, soit le bloc citation est omis. » Une citation a confirmer n'est pas
--      validee. La ligne pour la remettre est en commentaire ci-dessous.
--
--   2. Orangerie : PAS de liaison 'spectacle'. Ces slugs servent a FILTRER ;
--      taguer une salle de mariage « Spectacle » la ferait remonter a qui
--      cherche un spectacle. Un faux positif coute plus qu'une absence de tag.
--      Le fichier laissait le choix. Ligne de rattrapage en commentaire.
--
--   3. Annotations entre crochets retirees du contenu insere ([À CONFIRMER],
--      [PRUDENCE — lien douteux...]) : elles s'adressaient a la redaction, pas
--      a la base. Le texte prudent de Napoleon, lui, est conserve ENTIER.
--
-- ⚠ TOUS LES PRIX SONT DES PLACEHOLDERS : 20000 cents = 200 €. Aucun tarif n'est
--   confirme. prix_cents etant NOT NULL et CHECK (> 0), il n'existe aucun moyen
--   d'inserer une chambre « sans prix ». A corriger AVANT publication.
--
-- ⚠ Wi-Fi : les chambres le mentionnent, mais aucune amenity ne le NOMME. Or
--   flattenAmenities (_mapping.js:297) derive les 4 booleens du NOM des
--   amenities, pas des colonnes chateaux.wifi/parking/... La vitrine affichera
--   donc « pas de Wi-Fi ». Ajouter une amenity « Wi-Fi » pour le rendre visible.
--
-- ── IDEMPOTENCE ─────────────────────────────────────────────────────────────
-- Rejouable : un second passage ne fait RIEN, et n'echoue pas.
--   ON CONFLICT (slug) DO NOTHING sur chateaux -> la CTE `nouveau` ne rend
--   AUCUNE ligne, donc toutes les filles qui s'y raccrochent inserent 0 ligne.
-- Seule exception : le bloc personnages ne depend pas de `nouveau` (referentiel
--   PARTAGE entre chateaux). Il porte sa propre garde, et les id sont resolus
--   par UNION ALL entre les lignes creees et celles qui preexistaient. C'est ce
--   qui permettra a un futur chateau de REUTILISER francois-ier plutot que de le
--   dupliquer.
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
    $t$Château Royal de Benays$t$,
    'chateau-royal-de-benays',
    $t$Centre-Val de Loire$t$,
    $t$Indre-et-Loire$t$,
    $t$Benais$t$,
    $t$Mille ans d’histoire, huit chambres face au parc, une table gastronomique et une Orangerie — la renaissance d’un château royal en Val de Loire$t$,
    $t$XVIe–XIXe siècles$t$,
    $t$Châtelet Renaissance · demeure XIXe · Val de Loire$t$,
    $t$J-15$t$,
    165,
    $t$2h45 de Paris$t$,
    47.294728,
    0.213327,
    $t$Le domaine apparaît dans les textes dès le XIIe siècle sous le nom de Beniacum. Les premiers seigneurs connus, les Beaucay, inscrivent Benais dans l’histoire capétienne : Hugues de Beaucay accompagne Saint Louis à la croisade de 1248. La seigneurie passe ensuite aux Laval, puis aux du Bellay et aux Montmorency. En 1532, Gilles de Laval y reçoit François Ier. Du château ancien, partiellement détruit avant la Révolution, subsistent notamment la porte fortifiée, ses deux tours et des communs. Au XIXe siècle, une nouvelle demeure et une orangerie sont élevées en intégrant ces vestiges. Inscrit au titre des Monuments historiques en 1929, le domaine devient en 1949 un lieu de classes vertes pour la ville de Boulogne-Billancourt. Racheté par Paul Vaudeville en 2021, il renaît aujourd’hui autour d’un hôtel intimiste, d’une table, d’un parc ouvert et de réceptions.$t$,
    $t$Au cœur du Bourgueillois, le Château Royal de Benays réunit un châtelet Renaissance, une demeure du XIXe siècle et un parc clos de 12 hectares. Ses huit chambres accueillent jusqu’à seize hôtes face aux arbres centenaires. Le séjour se prolonge à la table gastronomique « À Table », dans le parc ou sous la lumière de l’Orangerie, conçue pour les mariages et les grands événements. Un domaine longtemps fermé qui retrouve sa vocation d’accueil sans effacer les traces de ses vies successives.$t$,
    $t$Ici, la Loire quitte peu à peu la Touraine pour gagner l’Anjou. Autour de Benais, les coteaux de tuffeau portent les vignes de Bourgueil et de Saint-Nicolas-de-Bourgueil ; les villages, caves et maisons blanches composent un paysage à la fois noble et terrien. À quelques minutes, la Loire à Vélo, les forêts du parc naturel régional et les silhouettes de Langeais, Chinon, Montsoreau et Fontevraud offrent une destination dense, mais encore paisible.$t$,
    $t$Le Val de Loire occidental fut longtemps une terre de passage, de pouvoir et de frontière. Les Plantagenêts, les Capétiens puis les Valois y ont laissé forteresses, abbayes et résidences. Chinon conserve le souvenir d’Henri II Plantagenêt et de Jeanne d’Arc ; Langeais raconte l’union de Charles VIII et d’Anne de Bretagne ; Fontevraud abrite les gisants d’Aliénor d’Aquitaine et de Richard Cœur de Lion. Benais appartient à cette géographie royale, mais depuis une position plus secrète : celle d’un domaine viticole dont le châtelet a survécu aux ruptures de l’histoire.$t$,
    $t$[{"lab":"Première mention","val":"XIIe s."},{"lab":"Parc clos","val":"12 ha"},{"lab":"Chambres","val":"8"},{"lab":"Monument historique","val":"1929"}]$t$::jsonb,
    ARRAY[]::text[],                 -- images : a televerser
    NULL,                            -- video_background_youtube_id : a selectionner
    $t$Paul Vaudeville$t$,
    $t$2021$t$,
    'V',
    $t$audeville$t$,                  -- prop_initiale + prop_nom_affiche = « Vaudeville »
    NULL,                            -- prop_portrait : a televerser
    NULL,                            -- ⚠ prop_citation : formulaire marque [À CONFIRMER] -> omise
                                     -- Une fois validee par Paul Vaudeville, remplacer par :
                                     -- $t$« Je veux rendre ce domaine à la vie, en faire un lieu ouvert, culturel et profondément ancré dans son territoire. »$t$
    $t$Ancien danseur devenu entrepreneur et châtelain, Paul Vaudeville acquiert le domaine en 2021 avec un projet d’ouverture et de transmission. Après plusieurs décennies consacrées aux classes vertes, Benays change de rythme : réouverture du parc, création d’un hôtel de huit chambres, lancement d’une table gastronomique et développement d’événements dans l’Orangerie. Le fil conducteur reste le même : faire du patrimoine un lieu vécu, accessible et créateur d’activité locale.$t$,
    '#17382F',
    '#C7A76A',
    $t$D’un châtelet médiéval à une demeure du XIXe siècle, Benays porte les traces de Saint Louis, de François Ier, des classes vertes et d’une renaissance contemporaine.$t$,
    $t$En 2021, Paul Vaudeville reprend un domaine fermé depuis quatre ans et lui redonne une vocation d’accueil, de culture et de transmission.$t$,
    $t$Huit chambres, une table gastronomique, douze hectares de parc et une Orangerie pour célébrer : Benays se vit du petit-déjeuner à la nuit.$t$,
    $t$Les huit chambres du château et le Pavillon des Écureuils, au cœur d’un parc de 12 hectares.$t$,
    $t$Des séjours de dernière minute entre vignes, Loire et arbres centenaires.$t$,
    $t$Tables, visites et attentions confidentielles réservées aux membres du Club.$t$,
    $t$Mille ans d’histoire à vivre$t$,
    $t$Du châtelet à la renaissance$t$,
    true,          -- est_la_une : layout vitrine premium
    'brouillon',   -- ⚠ ne pas publier avant correction des prix
    NULL           -- ordre_home
  )
  -- LA garde d'idempotence : rejoue, cet INSERT ne rend aucune ligne, et les
  -- huit CTE suivantes deviennent des no-op en cascade.
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
),

-- ── Chambres ────────────────────────────────────────────────────────────────
-- ⚠ LES NEUF PRIX SONT DES PLACEHOLDERS (20000 cents = 200 €). prix_cents est
--   NOT NULL avec CHECK (> 0) : ni NULL ni 0 ne sont insérables. La valeur est
--   volontairement ronde et identique partout, pour se reperer d'un coup d'oeil.
ins_chambres AS (
  INSERT INTO public.chambres (chateau_id, nom, description, superficie, capacite, prix_cents, equipements, ordre)
  SELECT n.id, v.nom, v.description, v.superficie, v.capacite, v.prix_cents, v.equipements, v.ordre
  FROM nouveau n, (VALUES
    ($t$Napoléon Bonaparte$t$,
     $t$Une chambre de caractère qui reprend le nom de l’un des hôtes historiques revendiqués par le domaine. Parquet ancien, lumière du parc et calme d’une demeure entourée de douze hectares : une parenthèse élégante au cœur du Val de Loire.$t$,
     NULL::text, 2, 20000,
     ARRAY[$t$Lit double$t$, $t$Vue parc$t$, $t$Wi-Fi$t$, $t$Baignoire et douche séparées$t$]::text[], 0),

    ($t$Suite Premium$t$,
     $t$La plus familiale des suites du château : un grand lit, deux couchages complémentaires et une vue ouverte sur le parc. Une adresse pensée pour vivre le domaine à plusieurs sans renoncer à l’intimité.$t$,
     NULL, 4, 20000,
     ARRAY[$t$1 lit double$t$, $t$2 lits simples$t$, $t$Fenêtre$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 1),

    ($t$Suite Privilège$t$,
     $t$Une suite spacieuse tournée vers les frondaisons, associant une chambre double et deux couchages simples. La bonne option pour un séjour familial au château, à quelques pas de la table et des promenades du parc.$t$,
     NULL, 4, 20000,
     ARRAY[$t$1 lit double$t$, $t$2 lits simples$t$, $t$Fenêtre$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 2),

    ($t$Chambre Premium$t$,
     $t$Une chambre double lumineuse, habillée avec sobriété pour laisser toute sa place à l’architecture du château et aux vues sur le parc. Idéale pour un week-end à deux entre vignes et Loire.$t$,
     NULL, 2, 20000,
     ARRAY[$t$Lit double$t$, $t$Fenêtre$t$, $t$Wi-Fi$t$, $t$Baignoire et douche séparées$t$]::text[], 3),

    ($t$Chambre Deluxe Plus$t$,
     $t$Un refuge double confortable, animé par la lumière traversant les hautes fenêtres et par le dessin des parquets anciens. Une chambre pour ralentir, lire et retrouver le silence du parc.$t$,
     NULL, 2, 20000,
     ARRAY[$t$Lit double$t$, $t$Bureau$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 4),

    ($t$Chambre Deluxe$t$,
     $t$Une chambre double simple et élégante, ouverte sur la nature du domaine. Le confort contemporain s’y glisse avec discrétion dans une maison chargée de plusieurs siècles d’histoire.$t$,
     NULL, 2, 20000,
     ARRAY[$t$Lit double$t$, $t$Vue parc$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 5),

    ($t$Chambre Privilège$t$,
     $t$Une chambre double tournée vers le parc, conçue comme une retraite intime après une journée entre châteaux, caves et villages de Loire.$t$,
     NULL, 2, 20000,
     ARRAY[$t$Lit double$t$, $t$Fenêtre$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 6),

    ($t$Chambre Supérieure$t$,
     $t$Une chambre lumineuse avec grand lit et vue sur le parc. L’essentiel de Benays : le calme, la lumière et le sentiment d’habiter pour une nuit une demeure historique.$t$,
     NULL, 2, 20000,
     ARRAY[$t$Très grand lit$t$, $t$Vue parc$t$, $t$Wi-Fi$t$, $t$Salle de bain privée$t$]::text[], 7),

    ($t$Pavillon des Écureuils$t$,
     $t$Une maison indépendante au cœur du parc à l’anglaise. Deux chambres, une cuisine équipée, une terrasse et un balcon composent une bulle de verdure pour quatre personnes, entre piverts, arbres anciens et écureuils.$t$,
     $t$80 m²$t$, 4, 20000,
     ARRAY[$t$2 chambres$t$, $t$Cuisine$t$, $t$Lave-linge$t$, $t$Terrasse$t$, $t$Balcon$t$, $t$Parking$t$, $t$Animaux sur demande$t$]::text[], 8)
  ) AS v(nom, description, superficie, capacite, prix_cents, equipements, ordre)
),

-- ── Chronologie ─────────────────────────────────────────────────────────────
ins_timeline AS (
  INSERT INTO public.chateau_timeline (chateau_id, annee, evenement, ordre)
  SELECT n.id, v.annee, v.evenement, v.ordre
  FROM nouveau n, (VALUES
    ($t$XIIe siècle$t$,  $t$Première mention du site sous le nom de Beniacum$t$, 0),
    ($t$1248$t$,         $t$Hugues de Beaucay accompagne Saint Louis à la croisade$t$, 1),
    ($t$1532$t$,         $t$François Ier est reçu à Benais par Gilles de Laval$t$, 2),
    ($t$Avant 1789$t$,   $t$Destruction partielle du château ancien ; subsistent notamment communs et châtelet$t$, 3),
    ($t$XIXe siècle$t$,  $t$Construction de la demeure actuelle et de l’Orangerie en intégrant les vestiges$t$, 4),
    ($t$1929$t$,         $t$Inscription du château au titre des Monuments historiques$t$, 5),
    ($t$1949$t$,         $t$Acquisition par Boulogne-Billancourt et ouverture d’un centre de classes vertes$t$, 6),
    ($t$2017$t$,         $t$Fermeture du centre éducatif$t$, 7),
    ($t$2021$t$,         $t$Acquisition par Paul Vaudeville et lancement du projet écotouristique$t$, 8),
    ($t$2024$t$,         $t$Réouverture du parc au public$t$, 9),
    ($t$2025$t$,         $t$Ouverture de l’hôtel de huit chambres$t$, 10)
  ) AS v(annee, evenement, ordre)
),

-- ── Alentours ───────────────────────────────────────────────────────────────
-- « Terroir » n'existe pas dans l'enum alentour_type (8 valeurs fermees) :
-- Bourgueil et ses caves passe en 'gastronomie'.
ins_alentours AS (
  INSERT INTO public.chateau_alentours (chateau_id, nom, distance, type, icone, description, ordre)
  SELECT n.id, v.nom, v.distance, v.type::public.alentour_type, v.icone, v.description, v.ordre
  FROM nouveau n, (VALUES
    ($t$Bourgueil et ses caves$t$, $t$5–10 min$t$, 'gastronomie', $t$◆$t$,
     $t$L’un des grands vignobles de cabernet franc de Loire. Caves de tuffeau, domaines familiaux et dégustations dessinent une route des vins immédiatement accessible depuis le château.$t$, 0),
    ($t$Château des Réaux$t$, $t$12 min$t$, 'patrimoine', $t$⚜$t$,
     $t$Une demeure Renaissance associée au récit de Rabelais et aujourd’hui connue pour son parc et sa collection d’art. Première étape naturelle d’un circuit de châteaux depuis Benais.$t$, 1),
    ($t$Château de Langeais$t$, $t$20 min$t$, 'patrimoine', $t$⚜$t$,
     $t$Une forteresse devenue résidence royale, célèbre pour le mariage de Charles VIII et d’Anne de Bretagne en 1491. Pont-levis, appartements meublés et panorama sur la Loire.$t$, 2),
    ($t$Chinon — forteresse et vieille ville$t$, $t$25 min$t$, 'patrimoine', $t$✦$t$,
     $t$La forteresse qui domine la Vienne, les ruelles médiévales et les caves creusées dans le tuffeau. Jeanne d’Arc y rencontre Charles VII en 1429.$t$, 3),
    ($t$Montsoreau et Candes-Saint-Martin$t$, $t$25 min$t$, 'patrimoine', $t$◆$t$,
     $t$Deux villages de pierre blanche au confluent de la Loire et de la Vienne. Château, collégiale, quais et vues sur le fleuve composent l’une des plus belles promenades de l’ouest tourangeau.$t$, 4),
    ($t$Abbaye royale de Fontevraud$t$, $t$30 min$t$, 'patrimoine', $t$⚜$t$,
     $t$La plus vaste cité monastique d’Europe, fondée en 1101. Elle abrite notamment les gisants d’Aliénor d’Aquitaine, d’Henri II Plantagenêt et de Richard Cœur de Lion.$t$, 5)
  ) AS v(nom, distance, type, icone, description, ordre)
),

-- ── Services & activités ────────────────────────────────────────────────────
-- « Séjour » ne correspond à aucune des 6 valeurs du CHECK categorie -> NULL.
-- ⚠ L'Orangerie n'a AUCUNE liaison d'equipement (cf. ecart 2 en tete de fichier).
payload_amenities AS (
  SELECT gen_random_uuid() AS amenity_id, v.*
  FROM (VALUES
    ('service', NULL::text, $t$Dormir au Château Royal de Benays$t$,
     $t$Huit chambres pour seize hôtes dans la demeure, avec vues sur le parc, Wi-Fi et salles de bain privées.$t$,
     $t$♜$t$, true, NULL::integer, NULL::integer, ARRAY[]::text[], 0),

    ('service', 'gastronomie', $t$À Table — la table gastronomique$t$,
     $t$Une table conçue comme le cœur vivant du château, autour d’une grande pièce de bois réalisée sur mesure et d’une cuisine de saison.$t$,
     $t$◆$t$, false, NULL, 120, ARRAY['table_hotes']::text[], 1),

    ('activite', 'nature', $t$Promenade dans le parc du château$t$,
     $t$Une promenade libre dans un parc clos de 12 hectares où se rencontrent arbres anciens, architecture et paysages du Bourgueillois. (5€ public extérieur)$t$,
     $t$✦$t$, false, 500, 90, ARRAY['parc_jardins']::text[], 2),

    ('service', 'culture', $t$Mariages et réceptions dans l’Orangerie$t$,
     $t$Une verrière lumineuse pour les dîners, cérémonies et événements d’entreprise, au cœur des douze hectares du domaine. (200 pers. assises, jusqu’à 300 avec danse)$t$,
     -- Pour rattacher malgre tout le slug 'spectacle', remplacer ARRAY[]::text[]
     -- par ARRAY['spectacle']::text[] sur la ligne suivante.
     $t$◇$t$, false, NULL, NULL, ARRAY[]::text[], 3),

    ('activite', 'nature', $t$Vignes et Loire à vélo$t$,
     $t$Depuis Benais, rejoindre les domaines du Bourgueillois puis les itinéraires cyclables de Loire pour une journée entre caves, villages et bords du fleuve.$t$,
     $t$◆$t$, false, NULL, NULL, ARRAY['velos']::text[], 4)
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
  INSERT INTO public.amenity_equipements (amenity_id, equipement_slug)
  SELECT p.amenity_id, s
  FROM payload_amenities p CROSS JOIN LATERAL unnest(p.equipements) AS s
),

-- ── Histoire des lieux ──────────────────────────────────────────────────────
-- Les 5 personnages sont ABSENTS du referentiel — François Ier et Napoléon
-- COMPRIS (verifie : seuls henri-iv et jean-ii y figuraient parmi les rois).
ins_personnages AS (
  INSERT INTO public.personnages (nom, slug)
  VALUES
    ($t$Hugues de Beaucay$t$,  'hugues-de-beaucay'),
    ($t$François Ier$t$,       'francois-ier'),
    ($t$Gilles de Laval$t$,    'gilles-de-laval'),
    ($t$Napoléon Bonaparte$t$, 'napoleon-bonaparte'),
    ($t$Paul Vaudeville$t$,    'paul-vaudeville')
  -- Referentiel PARTAGE : DO NOTHING et non DO UPDATE — corriger un nom ici le
  -- renommerait sur toutes ses autres fiches, silencieusement.
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug
),
-- Les id, qu'ils viennent d'etre crees OU qu'ils preexistaient. Branches
-- disjointes par construction (un slug insere n'est pas dans le snapshot).
personnages_resolus AS (
  SELECT id, slug FROM ins_personnages
  UNION ALL
  SELECT id, slug FROM public.personnages
   WHERE slug IN ('hugues-de-beaucay', 'francois-ier', 'gilles-de-laval',
                  'napoleon-bonaparte', 'paul-vaudeville')
),
ins_liaison_personnages AS (
  INSERT INTO public.chateau_personnages (chateau_id, personnage_id, nature, texte, ordre)
  SELECT n.id, p.id, v.nature, v.texte, v.ordre
  FROM nouveau n
  CROSS JOIN (VALUES
    ('hugues-de-beaucay', 'fait_histoire',
     $t$Seigneur de Benais, il accompagne Saint Louis à la croisade de 1248.$t$, 0),
    ('francois-ier', 'fait_histoire',
     $t$Le roi est reçu au château en 1532 par Gilles de Laval.$t$, 1),
    ('gilles-de-laval', 'a_habite',
     $t$Seigneur de Benais, il accueille François Ier en 1532.$t$, 2),
    -- ⚠ NAPOLÉON : le lien est REVENDIQUE par le domaine, pas etabli. Le texte
    --   dit exactement cela et n'affirme rien. Ne pas le reformuler en assertion.
    ('napoleon-bonaparte', 'fait_histoire',
     $t$Le domaine revendique son passage et lui consacre une chambre ; la preuve historique précise doit être validée avant publication.$t$, 3),
    ('paul-vaudeville', 'a_habite',
     $t$Il rachète le domaine en 2021 et conduit sa réouverture hôtelière, culturelle et événementielle.$t$, 4)
  ) AS v(slug, nature, texte, ordre)
  JOIN personnages_resolus p ON p.slug = v.slug
  ON CONFLICT ON CONSTRAINT chateau_personnages_unique DO NOTHING
)

-- ── Module A — SANS LUI, LE CHÂTEAU N'EST PAS RÉSERVABLE ────────────────────
INSERT INTO public.chateau_modules (chateau_id, module_id, est_actif, commission_pct_negociee)
SELECT id, '6c150030-e9c1-574f-8124-5e08eb2981d1'::uuid, true, 13
FROM nouveau
-- DO NOTHING et non DO UPDATE : un rejeu ne doit pas ecraser un taux renegocie.
ON CONFLICT (chateau_id, module_id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATIONS (lecture seule ; le Dashboard n'affiche que le DERNIER resultat)
-- ============================================================

-- (A) Le compte des filles. Attendu : 9 chambres, 11 timeline, 6 alentours,
--     5 amenities, 3 liaisons equipement, 5 personnages, 1 module.
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
FROM public.chateaux c WHERE c.slug = 'chateau-royal-de-benays';

-- (B) Le module A et son taux. Attendu : A / true / 13.00
SELECT m.code, cm.est_actif, cm.commission_pct_negociee
FROM public.chateau_modules cm
JOIN public.chateaux c ON c.id = cm.chateau_id
JOIN public.modules  m ON m.id = cm.module_id
WHERE c.slug = 'chateau-royal-de-benays';

-- (C) LES PRIX PROVISOIRES, a corriger avant publication.
--     Attendu AUJOURD'HUI : 9 lignes a 200,00 €. Cette requete doit rendre
--     0 ligne le jour ou les tarifs reels sont poses.
SELECT ch.nom, ch.prix_cents / 100.0 AS euros
FROM public.chambres ch
JOIN public.chateaux c ON c.id = ch.chateau_id
WHERE c.slug = 'chateau-royal-de-benays' AND ch.prix_cents = 20000
ORDER BY ch.ordre;

-- (D) Le statut et ce qui manque avant publication.
SELECT slug, statut, est_la_une,
       cardinality(images)          AS nb_images,        -- attendu 0 : a televerser
       (prop_portrait IS NULL)      AS portrait_manquant,
       (prop_citation IS NULL)      AS citation_omise,    -- true : [À CONFIRMER]
       (video_background_youtube_id IS NULL) AS video_manquante
FROM public.chateaux WHERE slug = 'chateau-royal-de-benays';
