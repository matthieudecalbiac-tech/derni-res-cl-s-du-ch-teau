import { useEffect, useMemo, useState } from "react";
import { useChateaux } from "../hooks/useChateaux";
import ambiances from "../data/ambiances";
import { useHorloge, getPlageHoraire } from "../utils/heure";
import "../styles/heure-aux-demeures.css";

function weatherCodeKey(code) {
  if (code == null) return "variable";
  if (code <= 1) return "clair";
  if (code <= 3) return "nuageux";
  if (code <= 67) return "pluie";
  return "variable";
}

function weatherCodeLabelBref(code) {
  if (code == null) return null;
  if (code <= 1) return "ciel dégagé";
  if (code <= 3) return "nuageux";
  if (code <= 67) return "pluie fine";
  return "variable";
}

function getAmbianceLieuDit(slug, code) {
  const key = weatherCodeKey(code);
  const entry = ambiances[slug]?.meteoLieuDit?.[key];
  if (!entry || entry.startsWith("/* TODO")) return null;
  return entry;
}

function getPhrase(slug, plage) {
  const entry = ambiances[slug];
  if (!entry) return null;
  const p = entry[plage] ?? entry.aprem;
  if (!p || p.startsWith("/* TODO")) return null;
  return p;
}

function tronquerPhrase(s, max = 55) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

export default function HeureAuxDemeures({ onOuvrirChateau, onOuvrirDernieres }) {
  const { chateaux, loading, error } = useChateaux();
  /**
   * Sélection éditoriale "Heure aux demeures" — choix patrimoniaux.
   * Refactor Phase 4.6 : numbers (legacy) → slugs (UUIDs Supabase).
   *
   * - slugsCartes : 3 châteaux narratifs en cartes hero
   *     Pierreclos (vigne Mâconnais), Ferté-St-Aubin (Sologne intime),
   *     Vaux-le-Vicomte (Versailles inspiration)
   * - slugsIndex : 4 châteaux en index visuel secondaire
   *     2 vedettes (Briottières + Blanc Buisson) + 2 spectaculaires
   *     (Pierrefonds néo-médiéval + Chantilly Condé)
   */
  const cartes = useMemo(() => {
    const slugsCartes = ["pierreclos", "ferte-saint-aubin", "vaux-le-vicomte"];
    return slugsCartes.map((slug) => chateaux.find((c) => c.slug === slug)).filter(Boolean);
  }, [chateaux]);

  const index = useMemo(() => {
    const slugsIndex = ["les-briottieres", "blanc-buisson", "pierrefonds", "chantilly"];
    return slugsIndex.map((slug) => chateaux.find((c) => c.slug === slug)).filter(Boolean);
  }, [chateaux]);

  const affiches = useMemo(() => [...cartes, ...index], [cartes, index]);

  const [meteo, setMeteo] = useState({});
  const horloge = useHorloge();

  useEffect(() => {
    let annule = false;
    const lats = affiches.map((c) => c.coordonnees?.lat).filter(Boolean).join(",");
    const lngs = affiches.map((c) => c.coordonnees?.lng).filter(Boolean).join(",");
    if (!lats || !lngs) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weathercode&timezone=Europe%2FParis`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (annule) return;
        const entries = Array.isArray(data) ? data : [data];
        const map = {};
        entries.forEach((entry, i) => {
          const slug = affiches[i]?.slug;
          if (!slug) return;
          map[slug] = {
            temp: entry?.current?.temperature_2m,
            code: entry?.current?.weathercode,
          };
        });
        setMeteo(map);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [affiches]);

  const plage = getPlageHoraire(horloge.hNum);

  return (
    <section className="journal-demeures">
      {/* Bloc A — Trois cartes postales */}
      <div className="journal-demeures-cartes">
        {cartes.map((c) => {
          const m = meteo[c.slug];
          const lieuDit = getAmbianceLieuDit(c.slug, m?.code);
          const labelBref = weatherCodeLabelBref(m?.code);
          const phrase = getPhrase(c.slug, plage);
          return (
            <article
              key={c.id}
              className="journal-carte"
              onClick={() => onOuvrirChateau?.(c)}
            >
              <div className="journal-carte-photo">
                <img src={c.images?.[0]} alt={c.nom} loading="lazy" />
                <span className="journal-carte-heure">
                  {horloge.hh}:{horloge.mm}
                </span>
                <div className="journal-carte-overlay">
                  <span className="journal-carte-region">
                    {c.region} · {c.departement}
                  </span>
                  <h3 className="journal-carte-nom">{c.nom}</h3>
                </div>
              </div>
              <div className="journal-carte-pied">
                {(m?.temp != null || lieuDit || labelBref) && (
                  <p className="journal-carte-meteo">
                    {m?.temp != null && `${Math.round(m.temp)}°`}
                    {m?.temp != null && (lieuDit || labelBref) && " · "}
                    {lieuDit || (labelBref ? labelBref.toUpperCase() : "")}
                  </p>
                )}
                {phrase && (
                  <p className="journal-carte-phrase">{phrase}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Bloc B — Index typographique */}
      <div className="journal-demeures-index">
        <div className="journal-index-orne">
          <span className="journal-index-orne-ligne" />
          <span className="journal-index-orne-texte">— ÉGALEMENT CE WEEK-END —</span>
          <span className="journal-index-orne-ligne" />
        </div>

        <div className="journal-index-grille">
          {index.map((c) => {
            const m = meteo[c.slug];
            const phrase = tronquerPhrase(getPhrase(c.slug, plage), 55);
            return (
              <article
                key={c.id}
                className="journal-index-entree"
                onClick={() => onOuvrirChateau?.(c)}
              >
                <span className="journal-index-eyebrow">
                  {c.region.toUpperCase()} · {horloge.hh}H{horloge.mm}
                </span>
                <h4 className="journal-index-nom">{c.nom}</h4>
                {(m?.temp != null || phrase) && (
                  <p className="journal-index-phrase">
                    {m?.temp != null && `${Math.round(m.temp)}° · `}
                    {phrase}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Bloc C — CTA final typographique. Audit Fondation J2 (P1-1) : chiffre retiré du CTA */}
      <div className="journal-demeures-cta-wrap">
        <button
          type="button"
          className="journal-demeures-cta"
          onClick={() => onOuvrirDernieres?.()}
        >
          — DÉCOUVRIR TOUTES LES DEMEURES —
        </button>
      </div>
    </section>
  );
}
