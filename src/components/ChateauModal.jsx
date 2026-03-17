import { useEffect, useState, useRef } from 'react'
import '../styles/chateau-page.css'

export default function ChateauModal({ chateau, onClose }) {
  const [imageActive, setImageActive] = useState(0)
  const [reserve, setReserve] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setImageActive(i => (i + 1) % chateau.images.length)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [chateau.images.length])

  useEffect(() => {
    const t = setTimeout(() => setMapReady(true), 400)
    return () => clearTimeout(t)
  }, [])

  const prevImage = () => {
    clearInterval(intervalRef.current)
    setImageActive(i => (i - 1 + chateau.images.length) % chateau.images.length)
  }

  const nextImage = () => {
    clearInterval(intervalRef.current)
    setImageActive(i => (i + 1) % chateau.images.length)
  }

  const classBadge = { 'J-7': 'badge-j7', 'J-10': 'badge-j10', 'J-15': 'badge-j15' }[chateau.urgence] || 'badge-j15'

  return (
    <div className="chateau-page-overlay">
      <header className="chateau-page-header">
        <div className="chateau-page-header-gauche">
          <button className="chateau-page-retour" onClick={onClose}>← Retour</button>
          <span className="chateau-page-nom-header">{chateau.nom}</span>
        </div>
        <div className="chateau-page-header-droite">
          <span className="chateau-page-prix-header">{chateau.prix} € / nuit</span>
          <button className="chateau-page-reserver-header" onClick={() => document.getElementById('resa-form')?.scrollIntoView({ behavior: 'smooth' })}>Réserver</button>
        </div>
      </header>

      <div className="chateau-galerie">
        {chateau.images.map((img, i) => (
          <img key={i} src={img} alt={chateau.nom}
            className={'chateau-galerie-img ' + (i === imageActive ? 'actif' : 'inactif')} />
        ))}
        <div className="chateau-galerie-overlay" />
        <div className="chateau-galerie-info">
          <span className="chateau-galerie-region">{chateau.region} · {chateau.distanceParis}</span>
          <span className="chateau-galerie-titre">{chateau.nom}</span>
          <span className="chateau-galerie-style">{chateau.style} · {chateau.siecle}</span>
        </div>
        <button className="chateau-galerie-prev" onClick={prevImage}>‹</button>
        <button className="chateau-galerie-next" onClick={nextImage}>›</button>
        <div className="chateau-galerie-nav">
          {chateau.images.map((_, i) => (
            <button key={i}
              className={'chateau-galerie-dot ' + (i === imageActive ? 'actif' : '')}
              onClick={() => { clearInterval(intervalRef.current); setImageActive(i) }} />
          ))}
        </div>
      </div>

      <div className="chateau-page-corps">
        <div className="chateau-page-gauche">

          <div className="chateau-histoire">
            <div className="chateau-section-titre">
              <div className="chateau-section-titre-ligne" />
              <span className="chateau-section-label">Histoire et âme du lieu</span>
            </div>
            <p className="chateau-histoire-accroche">{chateau.accroche}</p>
            <div className="chateau-histoire-separateur" />
            <p className="chateau-histoire-texte">{chateau.histoire}</p>
          </div>

          <div className="chateau-activites">
            <div className="chateau-section-titre">
              <div className="chateau-section-titre-ligne" />
              <span className="chateau-section-label">Expériences et activités</span>
            </div>
            <div className="chateau-activites-grille">
              {chateau.activites.map((a, i) => (
                <div key={i} className="chateau-activite-item">
                  <span className="chateau-activite-icone">{a.icone}</span>
                  <div className="chateau-activite-nom">{a.nom}</div>
                  <div className="chateau-activite-desc">{a.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <div className="chateau-section-titre">
              <div className="chateau-section-titre-ligne" />
              <span className="chateau-section-label">Équipements et services</span>
            </div>
            <div className="chateau-equipements">
              <span className={'chateau-equipement ' + (chateau.petitDejeuner ? 'inclus' : 'non-inclus')}>{chateau.petitDejeuner ? '✓' : '✕'} Petit-déjeuner inclus</span>
              <span className={'chateau-equipement ' + (chateau.parking ? 'inclus' : 'non-inclus')}>{chateau.parking ? '✓' : '✕'} Parking privé</span>
              <span className={'chateau-equipement ' + (chateau.wifi ? 'inclus' : 'non-inclus')}>{chateau.wifi ? '✓' : '✕'} Wifi</span>
              <span className={'chateau-equipement ' + (chateau.animaux ? 'inclus' : 'non-inclus')}>{chateau.animaux ? '✓' : '✕'} Animaux acceptés</span>
              <span className="chateau-equipement inclus">✓ Conciergerie 24h/24</span>
              <span className="chateau-equipement inclus">✓ Transfert disponible</span>
            </div>
          </div>

          <div className="chateau-carte-section">
            <div className="chateau-section-titre">
              <div className="chateau-section-titre-ligne" />
              <span className="chateau-section-label">Localisation et accès</span>
            </div>
            <div style={{ height: '360px', border: '1px solid rgba(200,151,62,0.2)', overflow: 'hidden' }}>
              {mapReady && chateau.coordonnees && (
                <iframe
                  title="carte"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'hue-rotate(200deg) saturate(0.6) brightness(0.75)' }}
                  src={
                    'https://www.openstreetmap.org/export/embed.html?bbox=' +
                    (chateau.coordonnees.lng - 0.05) + '%2C' +
                    (chateau.coordonnees.lat - 0.03) + '%2C' +
                    (chateau.coordonnees.lng + 0.05) + '%2C' +
                    (chateau.coordonnees.lat + 0.03) +
                    '&layer=mapnik&marker=' +
                    chateau.coordonnees.lat + '%2C' + chateau.coordonnees.lng
                  }
                  allowFullScreen
                />
              )}
            </div>
            <p style={{ marginTop: '1rem', fontFamily: 'var(--font-ui)', fontSize: 'var(--t-xs)', fontWeight: 300, color: 'var(--gris-fonce)', letterSpacing: '0.1em' }}>
              📍 {chateau.departement} · {chateau.distanceParis} depuis Paris
            </p>
          </div>

          <div className="chateau-alentours">
            <div className="chateau-section-titre">
              <div className="chateau-section-titre-ligne" />
              <span className="chateau-section-label">À découvrir autour</span>
            </div>
            <div className="chateau-alentours-liste">
              {chateau.alentours.map((lieu, i) => (
                <div key={i} className="chateau-alentour-item">
                  <div className="chateau-alentour-gauche">
                    <div className="chateau-alentour-type" />
                    <span className="chateau-alentour-nom">{lieu.nom}</span>
                  </div>
                  <span className="chateau-alentour-distance">{lieu.distance}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="chateau-page-droite" id="resa-form">
          <div className="chateau-reservation-card">
            <p className="chateau-resa-titre">Réserver ce séjour</p>
            <div className="chateau-urgence-bloc">
              <span style={{ fontSize: '1rem' }}>⏳</span>
              <p className="chateau-urgence-texte">Plus que {chateau.chambresRestantes} chambre{chateau.chambresRestantes > 1 ? 's' : ''} · Offre valable {chateau.urgence}</p>
            </div>
            {!reserve ? (
              <>
                <div className="chateau-prix-bloc">
                  <span className="chateau-prix-barre">{chateau.prixBarre} € / nuit</span>
                  <span className="chateau-prix">{chateau.prix} €</span>
                  <span className="chateau-prix-nuit">par nuit · taxes incluses</span>
                  <span className="chateau-economie">Vous économisez {chateau.prixBarre - chateau.prix} €</span>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                  <span className={'badge-urgence ' + classBadge}>◆ {chateau.urgence} · {chateau.dateDisponible}</span>
                </div>
                <div className="chateau-champs">
                  <div className="chateau-champ">
                    <label>Arrivée</label>
                    <input type="date" />
                  </div>
                  <div className="chateau-champ">
                    <label>Départ</label>
                    <input type="date" />
                  </div>
                  <div className="chateau-champ">
                    <label>Voyageurs</label>
                    <select>
                      <option>1 voyageur</option>
                      <option>2 voyageurs</option>
                      <option>3 voyageurs</option>
                      <option>4 voyageurs</option>
                    </select>
                  </div>
                </div>
                <button className="chateau-btn-reserver" onClick={() => setReserve(true)}>Réserver maintenant</button>
                <button className="chateau-btn-contact">Contacter le château</button>
                <div className="chateau-garanties">
                  <span className="chateau-garantie">Annulation gratuite sous 48h</span>
                  <span className="chateau-garantie">Confirmation immédiate</span>
                  <span className="chateau-garantie">Paiement sécurisé</span>
                  <span className="chateau-garantie">Sélection vérifiée par nos soins</span>
                </div>
              </>
            ) : (
              <div className="chateau-succes">
                <span className="chateau-succes-icon">��</span>
                <p className="chateau-succes-titre">Demande envoyée !</p>
                <p className="chateau-succes-texte">Le château vous contacte sous 2 heures. Préparez vos valises.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
