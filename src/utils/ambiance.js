// src/utils/ambiance.js
// Helpers pour sélectionner la bonne phrase d'ambiance selon
// l'heure et la météo réelle du château.

import ambiances from '../data/ambiances';

export function getPlageHoraire(h) {
  if (h >= 7 && h < 12) return 'matin';
  if (h >= 12 && h < 17) return 'aprem';
  if (h >= 17 && h < 20) return 'crepuscule';
  return 'nuit';
}

export function getMeteoLieuDit(code) {
  if (code <= 1) return 'clair';
  if (code <= 3) return 'nuageux';
  if (code <= 67) return 'pluie';
  return 'variable';
}

export function getPhraseAmbiance(chateauId, heure) {
  const plage = getPlageHoraire(heure);
  return ambiances[chateauId]?.[plage] || '';
}

export function getMeteoPhrase(chateauId, weatherCode) {
  const cle = getMeteoLieuDit(weatherCode);
  return ambiances[chateauId]?.meteoLieuDit?.[cle] || '';
}
