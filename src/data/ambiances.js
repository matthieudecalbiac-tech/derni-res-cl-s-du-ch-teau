// src/data/ambiances.js
// Phrases d'ambiance affichées dans le Journal des Demeures.
// Règle éditoriale : 20-28 mots, un détail sensoriel concret,
// une action humaine en cours, un ancrage géographique local.
// Jamais d'adjectifs vides, jamais de "vous", jamais promotionnel.

export default {

  // ─── 1 · VAUX-LE-VICOMTE (Île-de-France) ──────────────────────
  1: {
    matin: "Le brouillard se retire des douves. Les jardiniers passent le râteau sur les parterres brodés avant l'ouverture, comme chaque matin depuis trois siècles et demi.",
    aprem: "La géométrie de Le Nôtre projette ses ombres longues sur le Grand Canal. Une calèche remonte l'allée centrale, au pas.",
    crepuscule: "Les premières chandelles s'allument dans l'enfilade des salons. Ce soir, deux mille bougies brûleront jusqu'à minuit dans le grand château.",
    nuit: "Le château rayonne dans la nuit de Brie. On n'entend que les carpes dans les douves et le vent dans les tilleuls de l'allée d'honneur.",
    meteoLieuDit: {
      clair: "CIEL DÉGAGÉ · OMBRES LONGUES",
      nuageux: "LUMIÈRE VOILÉE SUR LE GRAND CANAL",
      pluie: "PLUIE FINE SUR LES PARTERRES",
      variable: "CIEL DE BRIE"
    }
  },

  // ─── 2 · PIERREFONDS (Hauts-de-France) ────────────────────────
  2: {
    matin: "La brume remonte de la forêt de Compiègne. Les corbeaux du donjon commencent leur ronde habituelle autour des tours de Viollet-le-Duc.",
    aprem: "Un cavalier traverse la clairière en contrebas. Le soleil frappe les tuiles vernissées des toits, comme dans une gravure du Second Empire.",
    crepuscule: "La forteresse se découpe en noir contre un ciel d'encre. Dans la grande salle, le feu est allumé sous la cheminée de pierre.",
    nuit: "Les tours veillent sur le village endormi. Par la meurtrière de la chambre des Preux, on aperçoit la lune au-dessus de la forêt.",
    meteoLieuDit: {
      clair: "SOLEIL SUR LES TOITS VERNISSÉS",
      nuageux: "TOURS DANS LA BRUME",
      pluie: "PLUIE BATTANTE SUR LES REMPARTS",
      variable: "CIEL DE PICARDIE"
    }
  },

  // ─── 3 · CHANTILLY (Hauts-de-France) ──────────────────────────
  3: {
    matin: "Les pur-sang sortent des Grandes Écuries pour l'entraînement. On entend les sabots sur les pavés et le souffle court des lads qui reviennent de l'hippodrome.",
    aprem: "Dans le Cabinet des Livres, un conservateur tourne les pages d'un manuscrit enluminé du duc d'Aumale. Les visiteurs chuchotent devant le Raphaël.",
    crepuscule: "La lumière dorée tombe sur le Grand Château et ses douves. Un cygne trace une ligne lente sur le miroir d'eau du parterre.",
    nuit: "Le musée Condé dort avec ses trésors. Dans la forêt, les chevreuils descendent boire à l'étang de Commelles, comme chaque soir depuis des siècles.",
    meteoLieuDit: {
      clair: "LUMIÈRE DORÉE SUR LES DOUVES",
      nuageux: "CIEL ARGENTÉ SUR LE PARTERRE",
      pluie: "PLUIE SUR LES GRANDES ÉCURIES",
      variable: "TEMPS DE FORÊT"
    }
  },

  // ─── 4 · FONTAINEBLEAU (Île-de-France) ────────────────────────
  4: {
    matin: "Les grimpeurs sont déjà sur les chaos de grès. On entend les cris étouffés depuis la cour du Cheval-Blanc, où Napoléon fit ses adieux.",
    aprem: "Un guide traverse la galerie François Ier, expliquant les stucs italiens du Primatice à quatre visiteurs silencieux.",
    crepuscule: "La forêt prend ses teintes bronze. Le château se vide des derniers visiteurs, et les appartements royaux retrouvent leur silence de musée.",
    nuit: "Vingt-cinq mille hectares de forêt veillent sur la demeure de trente rois. Dans les salons d'apparat, la lumière des lustres se reflète sur les parquets Versailles.",
    meteoLieuDit: {
      clair: "FORÊT CLAIRE · LUMIÈRE BRONZE",
      nuageux: "CIEL GRIS SUR LA COUR OVALE",
      pluie: "PLUIE FINE SUR LES GRÈS",
      variable: "CIEL DE FORÊT"
    }
  },

  // ─── 5 · LA FERTÉ-SAINT-AUBIN (Centre-Val de Loire) ──────────
  5: {
    matin: "Les brumes de Sologne s'effilochent lentement au-dessus des étangs. Dans les cuisines d'époque, le feu est allumé sous le grand chaudron de cuivre.",
    aprem: "Un héron s'est posé sur le grand étang. Les cuisines du XVIIᵉ sentent la pâte à pain et le gibier de Sologne qu'on prépare pour le soir.",
    crepuscule: "La famille rentre de promenade dans les allées du parc. Le feu crépite dans le grand salon, et les vins de Loire attendent sur la console.",
    nuit: "Pas un bruit, sinon le vent dans les pins et le cri d'un chevreuil au loin. La Sologne dort sous une lune rousse, et le château veille.",
    meteoLieuDit: {
      clair: "SOLEIL RASANT SUR LES ÉTANGS",
      nuageux: "BRUMES SUR L'ÉTANG",
      pluie: "PLUIE SUR LA FORÊT DE PINS",
      variable: "TEMPS DE SOLOGNE"
    }
  },

  // ─── 6 · PIERRECLOS (Bourgogne) ───────────────────────────────
  6: {
    matin: "Le soleil sort derrière la roche de Solutré. Dans les vignes du Mâconnais, les ouvriers commencent l'épamprage des ceps, rang après rang.",
    aprem: "La lumière descend sur le Mâconnais. Le vigneron prépare la dernière dégustation en cave médiévale, où six millésimes attendent sur la pierre.",
    crepuscule: "La vallée de la Saône prend des teintes d'ambre. Depuis le donjon, par temps clair, les Alpes apparaissent, bleues, à l'horizon.",
    nuit: "Les vignes dorment sous la voûte étoilée. Les murs d'un mètre du donjon du XIIᵉ siècle retiennent la chaleur du jour, comme depuis huit cents ans.",
    meteoLieuDit: {
      clair: "SOLEIL RASANT · VIGNES D'OR",
      nuageux: "LUMIÈRE VOILÉE SUR LE MÂCONNAIS",
      pluie: "PLUIE SUR LES CEPS",
      variable: "CIEL DE BOURGOGNE"
    }
  },

  // ─── 7 · LES BRIOTTIÈRES (Pays de la Loire) ───────────────────
  7: {
    matin: "La brume se lève sur le parc à l'anglaise. Madeleine dresse le petit-déjeuner sous la véranda, et l'on entend un cheval au loin dans les allées.",
    aprem: "Madeleine dresse la table du dîner dans le grand salon. Les lavandes sentent déjà l'été et l'on entend, au loin, le pas d'un cheval sur l'allée.",
    crepuscule: "Les premières chandelles s'allument dans la salle à manger des Valbray. Arnaud descend à la cave chercher un Savennières pour le dîner.",
    nuit: "Silence absolu. Seules les étoiles d'Anjou veillent sur la demeure. Dans la bibliothèque, une lampe reste allumée tard — quelqu'un lit encore.",
    meteoLieuDit: {
      clair: "CIEL VOILÉ · VENT LÉGER",
      nuageux: "LUMIÈRE DOUCE SUR LE PARC",
      pluie: "PLUIE FINE SUR LES LAVANDES",
      variable: "TEMPS D'ANJOU"
    }
  },

  // ─── 8 · LE BLANC BUISSON (Normandie) ─────────────────────────
  8: {
    matin: "Le soleil glisse sur les douves lisses. Dans le parc classé, les chênes centenaires s'éveillent au chant des oiseaux du Pays d'Ouche.",
    aprem: "Le pont-levis brille sous la pluie fine. Dans la salle de garde, le feu est préparé pour le soir, et Maïté reçoit des hôtes dans le grand salon.",
    crepuscule: "La forteresse du XIIIᵉ se découpe en noir contre un ciel normand. Les chandelles sont allumées dans la Suite du Donjon, pour ce soir.",
    nuit: "Les murs d'un mètre protègent le silence du donjon. Dehors, seuls les hiboux du bois de Rugles troublent la nuit du Pays d'Ouche.",
    meteoLieuDit: {
      clair: "SOLEIL SUR LES DOUVES",
      nuageux: "BRUMES DU PAYS D'OUCHE",
      pluie: "PLUIE FINE SUR LE PONT-LEVIS",
      variable: "TEMPS DE NORMANDIE"
    }
  },

};
