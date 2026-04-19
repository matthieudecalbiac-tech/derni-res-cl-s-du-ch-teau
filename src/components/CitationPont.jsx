import "../styles/citation-pont.css";

export default function CitationPont({ chapitre, citation, livraison }) {
  return (
    <section className="citation-pont">
      <span className="citation-pont-chapitre">— CHAPITRE {chapitre} —</span>
      <p className="citation-pont-citation">« {citation} »</p>
      {livraison && (
        <span className="citation-pont-livraison">{livraison}</span>
      )}
    </section>
  );
}
