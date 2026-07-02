import { useCallback, useRef, useState } from "react";

/**
 * useScrollAnimation — declenche `visible=true` quand l'element entre dans le viewport.
 *
 * Robuste face aux montages tardifs : utilise une callback ref plutot qu'un
 * objet ref. React appelle la callback avec le noeud des qu'il est monte (et
 * avec null au demontage), donc l'observer s'attache correctement meme si
 * l'element n'existe pas au premier render (cas des composants async a
 * early-return, ex. data Supabase pas encore chargee).
 *
 * One-shot : une fois visible, l'observer est deconnecte et ne se ré-attache
 * plus (un flag empeche tout re-trigger si le noeud se remonte).
 *
 * Signature inchangee : const [ref, visible] = useScrollAnimation(threshold)
 * `ref` est une callback ref a poser via ref={ref} (transparent pour l'usage existant).
 */
export function useScrollAnimation(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef(null);
  const dejaVisibleRef = useRef(false);

  const ref = useCallback(
    (node) => {
      // Nettoyage de l'observer precedent (changement de noeud / demontage)
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      // Si deja declenche une fois, on ne ré-observe plus (one-shot)
      if (dejaVisibleRef.current) return;
      // Pas de noeud (demontage) -> rien a observer
      if (!node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            dejaVisibleRef.current = true;
            setVisible(true);
            observer.disconnect();
            observerRef.current = null;
          }
        },
        { threshold }
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [threshold]
  );

  return [ref, visible];
}
