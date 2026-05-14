function extraireAnneeFondation(chateau) {
  if (!chateau.timeline?.length) return null;
  const annees = chateau.timeline
    .map((t) => {
      const m = String(t.annee).match(/\d{3,4}/);
      return m ? parseInt(m[0], 10) : null;
    })
    .filter(Boolean);
  if (!annees.length) return null;
  return Math.min(...annees);
}

function formaterDistance(distanceParis) {
  if (!distanceParis) return null;
  if (distanceParis.includes("·")) {
    return { val: distanceParis.split("·")[0].trim(), lab: "De Paris" };
  }
  const sansSuffixe = distanceParis.replace(" de Paris", "").trim();
  if (sansSuffixe) {
    return { val: sansSuffixe, lab: "De Paris" };
  }
  return { val: distanceParis, lab: "Trajet" };
}

export default function IntroTroncCommun({ chateau }) {
  const photo = chateau.images?.[1] || chateau.images?.[0];
  const texte = chateau.description || chateau.accroche || "";

  const anneeFondation = extraireAnneeFondation(chateau);
  const generations = chateau.proprietaires?.nbGenerations;
  const nbChambres = chateau.chambres?.length || null;
  const distance = formaterDistance(chateau.distanceParis);

  const stats = [
    anneeFondation && { val: anneeFondation, lab: "Fondation" },
    generations && {
      val: `${generations}`,
      lab: generations === 1 ? "Génération" : "Générations",
    },
    nbChambres && { val: nbChambres, lab: "Chambres" },
    distance,
  ].filter(Boolean);

  return (
    <section className="vc4-intro-tronc" data-section="intro-tronc">
      <div className="vc4-intro-tronc-grid">
        <div
          className="vc4-intro-tronc-photo"
          style={{ backgroundImage: photo ? `url('${photo}')` : "none" }}
        >
          <div className="vc4-intro-tronc-photo-vign" />
        </div>
        <div className="vc4-intro-tronc-texte">
          <p className="vc4-intro-tronc-eyebrow">Découvrir {chateau.nom}</p>
          <p className="vc4-intro-tronc-paragraphe">{texte}</p>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="vc4-intro-tronc-chiffres">
          {stats.map((s, i) => (
            <div key={i} className="vc4-intro-tronc-chiffre">
              <span className="vc4-intro-tronc-chiffre-val">{s.val}</span>
              <span className="vc4-intro-tronc-chiffre-lab">{s.lab}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
