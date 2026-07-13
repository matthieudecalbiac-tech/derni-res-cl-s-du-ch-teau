import { useState, useRef } from "react";
import { uploadImage } from "../../services/chateauxService";

// Bouton de téléversement d'image réutilisable (chantier admin, upload).
// props :
//   - valeur   : URL/chemin actuel (pour l'aperçu miniature)
//   - onUpload : callback(url) qui écrit l'URL retournée dans le champ parent
// Le choix d'un fichier déclenche l'upload ; le champ texte parent reste
// éditable à la main (rétrocompatible avec les chemins public/ existants).
export default function BoutonTeleverser({ valeur, onUpload }) {
  const inputRef = useRef(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const handleFichier = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur(null);
    setEnCours(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err) {
      setErreur(err.message || "Échec du téléversement.");
    } finally {
      setEnCours(false);
      // Réinitialise l'input pour permettre de re-choisir le même fichier.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="adm-upload">
      {valeur ? <img className="adm-upload-apercu" src={valeur} alt="" /> : null}
      <label className="adm-upload-btn">
        {enCours ? "Téléversement…" : "Téléverser"}
        <input
          ref={inputRef}
          type="file"
          accept="image/avif,image/jpeg,image/png,image/webp"
          onChange={handleFichier}
          disabled={enCours}
          hidden
        />
      </label>
      {erreur ? <span className="adm-upload-erreur">{erreur}</span> : null}
    </div>
  );
}
