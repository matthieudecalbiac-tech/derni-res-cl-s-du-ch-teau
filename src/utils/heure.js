import { useEffect, useState } from "react";

export function formatHeureParis() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    hh: get("hour"),
    mm: get("minute"),
    jour: get("weekday"),
    jj: get("day"),
    mois: get("month"),
    hNum: parseInt(get("hour"), 10),
  };
}

export function getPlageHoraire(h) {
  if (h >= 7 && h < 12) return "matin";
  if (h >= 12 && h < 17) return "aprem";
  if (h >= 17 && h < 20) return "crepuscule";
  return "nuit";
}

export function useHorloge() {
  const [h, setH] = useState(() => formatHeureParis());
  useEffect(() => {
    const t = setInterval(() => setH(formatHeureParis()), 60000);
    return () => clearInterval(t);
  }, []);
  return h;
}
