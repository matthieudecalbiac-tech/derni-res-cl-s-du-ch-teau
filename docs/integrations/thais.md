# Intégration Thaïs (PMS) — note d'archivage

> Statut : **exploratoire, non planifié.** Archivage de la réponse de Thaïs à notre
> prise de contact. Aucune intégration n'est développée à ce stade (voir *Notre position*).

## Notre position

**On ne code pas l'intégration tant qu'on n'a pas plusieurs châteaux sous Thaïs.**
Aujourd'hui, un seul château partenaire utilise Thaïs — l'effort d'intégration et de
maintenance ne se justifie pas pour une seule demeure. À revoir quand le parc Thaïs
s'étoffe.

## Ce qu'est Thaïs (et ce qu'il n'est pas)

Thaïs fournit le **PMS** (Property Management System). Point important :

- Pour le **channel manager**, Thaïs est **revendeur de RoomCloud** — ce n'est **pas**
  leur produit. Le channel manager sous-jacent est donc RoomCloud.
- C'est **Thaïs** qui est **également connecté à D-Edge, Reservit et Travelclick**. Ce
  sont des **channel managers alternatifs** auxquels le PMS sait parler — **pas** des
  canaux en aval de RoomCloud.
- **Conséquence** : un château sous Thaïs n'est **pas nécessairement sur RoomCloud**.

Cette chaîne (PMS Thaïs → channel manager RoomCloud → OTAs type Booking) est déterminante
pour la question ouverte ci-dessous.

## L'API Thaïs — l'essentiel

- **API générale ouverte et gratuite.**
- Documentation : https://demo.thais-hotel.com/hub/doc/index.html
- **Collection Postman** fournie + **environnement de démo** disponible pour tester.
- **Rate limit : 100 requêtes / 60 secondes glissantes.**
  - Dépassement → **429** : **backoff obligatoire**.
  - **Retry avec circuit breaker obligatoire.**
  - **Routes bulk recommandées** (réduire le nombre d'appels).
- **Tokens valides 10 minutes** (prévoir le rafraîchissement).
- **Un sous-domaine par hôtel** → la **configuration dynamique est obligatoire** (on ne
  peut pas coder un endpoint fixe ; l'URL de base dépend de l'hôtel).
- **User-Agent imposé** au format `{societe}-{produit}/{version}`.
- **Comptes « Utilisateurs Techniques »** avec un **profil de droits dédié** (à créer côté
  Thaïs).

### Webhooks

- Documentation : https://demo.thais-hotel.com/hub/doc/webhook.html
- Outil de test (request catcher) : https://thais.requestcatcher.com/

### Certification

- Certification **~15 min après développement** (processus léger, une fois l'intégration
  développée).

## Question ouverte à poser à Thaïs

**Une réservation créée par API dans le PMS ferme-t-elle immédiatement la disponibilité
côté RoomCloud (et donc côté Booking / OTAs) ?**

C'est le point bloquant à clarifier avant tout développement : si la synchro de dispo
n'est pas immédiate/automatique entre le PMS et RoomCloud, on risque le surbooking. Vu que
le channel manager est RoomCloud (revendu), il faut comprendre le sens et la latence de la
propagation PMS → RoomCloud → OTAs.

## Liens

| Ressource | URL |
|---|---|
| Doc API | https://demo.thais-hotel.com/hub/doc/index.html |
| Doc webhooks | https://demo.thais-hotel.com/hub/doc/webhook.html |
| Test webhooks | https://thais.requestcatcher.com/ |
| Collection Postman | https://demo.thais-hotel.com/hub/doc/thais-postman-collection.json |
| Doc MCP | https://demo.thais-hotel.com/hub/doc/mcp-thais.html |
| Contact | contact@thais-pms.com |
