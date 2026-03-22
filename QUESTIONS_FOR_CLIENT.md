# Questions à Valider avec le Client - Fenie Brossette

## Résumé de l'Audit - Section 9 : Points à valider

Ce document répertorie les règles métier "en attente" qui nécessitent une confirmation explicite de la part de Fenie Brossette avant la finalisation de l'implémentation.

---

## 1. Règle de Calcul des Congés (Leave Calculation Rule)

### Implémentation Actuelle
La logique de calcul est implémentée dans [`lib/db.ts`](lib/db.ts:669) avec la formule suivante :

```typescript
const calculatedLeave = Math.floor(daysWorked / 22) * 1.5;
```

**Configuration actuelle :**
- **Période de calcul** : 22 jours travaillés (configurable via `leave_calculation_days`)
- **Taux d'acquisition** : 1.5 jours de congé par période (configurable via `leave_calculation_rate`)
- **Exemple** : 44 jours travaillés = 3 jours de congé acquis

**Gestion configurable** : Ces paramètres sont modifiables par le propriétaire (Owner) dans [`/owner/settings`](app/owner/settings/page.tsx).

### ❓ Question pour le Client
> **Confirmez-vous la règle actuelle de 22 jours travaillés = 1.5 jour de congé ?**
>
> - [ ] Oui, cette règle est correcte
> - [ ] Non, la règle doit être modifiée (précisez : _______ jours travaillés = _______ jours de congé)
> - [ ] La règle varie selon le département ou l'ancienneté (précisez)

---

## 2. Champs Obligatoires pour les Offres (Mandatory Offer Data)

### Implémentation Actuelle
La validation des offres se trouve dans [`app/api/offers/route.ts`](app/api/offers/route.ts:76-81).

**Champs REQUIS actuels :**
| Champ | Description |
|-------|-------------|
| `title` | Titre de l'offre |
| `destination` | Destination du voyage |
| `start_date` | Date de début (séjour) |
| `end_date` | Date de fin (séjour) |
| `price` | Prix du forfait (EUR) |
| `max_participants` | Nombre maximum de participants |

**Champs OPTIONNELS actuels :**
| Champ | Description |
|-------|-------------|
| `description` | Description détaillée |
| `duration` | Durée formatée (ex: "7 jours / 6 nuits") |
| `application_deadline` | Date limite de candidature |
| `hotel_name` | Nom de l'hôtel/accommodation |
| `conditions` | Conditions générales |
| `images` | Galerie d'images |

### ❓ Question pour le Client
> **Confirmez-vous cette liste de champs obligatoires pour la création d'une offre ?**
>
> - [ ] Oui, la liste actuelle est correcte
> - [ ] Non, des champs doivent être ajoutés (lesquels ?)
> - [ ] Non, certains champs obligatoires doivent devenir optionnels (lesquels ?)
>
> **Champs additionnels souhaités ?** (par exemple : type de transport, catégorie d'hôtel, régime de pension...)

---

## 3. Seuils de Visibilité (Visibility Thresholds)

### Implémentation Actuelle
La visibilité est gérée dans le middleware [`middleware.ts`](middleware.ts:74-91) et les pages concernées.

**Accès PUBLIC (sans authentification) :**
| Page | Contenu visible |
|------|-----------------|
| `/` (Accueil) | Présentation générale, fonctionnalités, processus |
| `/offers` | Liste des offres actives (titre, destination, dates, prix, places disponibles) |
| `/login` | Formulaire de connexion |

**Accès AUTHENTIFIÉ uniquement :**
| Rôle | Pages accessibles |
|------|-------------------|
| **Employé** | `/employee/*` (dashboard, soumission de demandes, détails complets des offres) |
| **Admin RH** | `/admin/*` (gestion offres, validation demandes, soldes) |
| **Propriétaire** | `/owner/*` (gestion admins, paramètres système, journaux) |

**Limitations actuelles pour le public :**
- Peut voir la liste des offres mais PAS les détails complets (hôtel, conditions)
- Ne peut PAS soumettre de demande (bouton "Se connecter" affiché)

### ❓ Question pour le Client
> **Confirmez-vous les seuils de visibilité suivants ?**
>
> **1. Informations publiques (pré-login) :**
> - [ ] Liste des offres avec titre, destination, dates, prix
> - [ ] Nombre de places disponibles
> - [ ] Autres informations à rendre publiques : _______________
>
> **2. Informations réservées aux employés connectés :**
> - [ ] Détails complets des offres (hôtel, conditions, photos)
> - [ ] Soumission de demandes
> - [ ] Consultation du solde de congés
>
> **Souhaitez-vous restreindre davantage les informations publiques ?** (ex: masquer les prix ou les places disponibles avant connexion)

---

## 4. Permissions du Rôle Propriétaire vs Admin RH (Owner Role Permissions)

### Implémentation Actuelle
Les permissions sont définies dans plusieurs fichiers API et composants.

**Rôle PROPRIÉTAIRE (Owner) - Accès exclusifs :**
| Fonction | Endpoint/Page | Description |
|----------|---------------|-------------|
| Gestion des Admin RH | `/api/admin-users/*` | Créer, modifier, supprimer, activer/désactiver les comptes RH |
| Paramètres système | `/api/settings/*` | Modifier les règles de calcul, timeouts, rétention logs |
| Journaux d'activité | `/owner/activity-logs` | Consulter l'historique complet des actions |
| Dashboard propriétaire | `/owner/dashboard` | Statistiques globales, performance RH |

**Permissions PARTAGÉES (Owner + Admin RH) :**
| Fonction | Description |
|----------|-------------|
| Gestion des offres | Créer, modifier, supprimer des offres |
| Validation des demandes | Approuver/rejeter les demandes de congés et offres |
| Gestion des soldes | Ajuster manuellement les soldes de congés |
| Export des données | Extraire les données (CSV actuellement) |

### ❓ Question pour le Client
> **Confirmez-vous cette répartition des permissions ?**
>
> **Le Propriétaire doit-il avoir des droits EXCLUSIFS sur :**
> - [ ] Gestion des comptes Admin RH (création, suppression, activation/désactivation)
> - [ ] Modification des paramètres système (règles de calcul, timeouts)
> - [ ] Accès aux journaux d'activité complets
>
> **Le Admin RH ne doit PAS pouvoir :**
> - [ ] Créer/supprimer d'autres admins
> - [ ] Modifier les paramètres de calcul des congés
> - [ ] Voir les journaux d'activité détaillés
>
> **Faut-il ajouter des permissions granulaires spécifiques ?** (par exemple : certains RH peuvent seulement valider des demandes mais pas créer d'offres)

---

## 5. Logique de Priorisation (Prioritization Logic)

### Implémentation Actuelle
La logique de traitement des demandes se trouve dans [`app/api/requests/route.ts`](app/api/requests/route.ts:59-199).

**Système actuel : "Premier arrivé, premier servi" (First-Come-First-Served)**

```
1. Employé soumet une demande
2. Vérification automatique des conditions (solde, places disponibles)
3. Si OK → Statut "En attente RH"
4. Si KO → Statut "Refus automatique" avec motif
5. Validation manuelle par RH ou rejet
```

**Règles actuelles :**
- Pas de priorisation par ancienneté
- Pas de priorisation par département
- Pas de file d'attente prioritaire
- Lorsqu'une offre est complète (`current_participants >= max_participants`), les nouvelles demandes sont automatiquement rejetées

### ❓ Question pour le Client
> **Quelle logique de priorisation souhaitez-vous implémenter ?**
>
> **Option 1 : Premier arrivé, premier servi (actuel)**
> - [ ] Garder le système actuel
>
> **Option 2 : Ancienneté prioritaire**
> - [ ] Les employés avec X années d'ancienneté ont la priorité
> - [ ] Seuil d'ancienneté : _______ années
>
> **Option 3 : Places réservées**
> - [ ] Réserver un % de places pour les cas prioritaires
> - [ ] Pourcentage de places réservées : _______%
>
> **Option 4 : File d'attente avec priorité**
> - [ ] Mise en file d'attente si l'offre est complète
> - [ ] Libération automatique si une place se libère
>
> **Nombre maximum de places par offre :**
> - Actuellement : configurable par offre (`max_participants`)
> - [ ] Confirmez-vous cette flexibilité ?
> - [ ] Souhaitez-vous une limite globale (ex: max 50 places par offre) ?

---

## 6. Formats de Rapport (Reporting Formats)

### Implémentation Actuelle
L'export de données est implémenté dans [`app/api/requests/bulk/route.ts`](app/api/requests/bulk/route.ts:110-196).

**Format actuellement supporté : CSV uniquement**

```csv
ID,Employé,Email,Type,Statut,Titre offre,Destination,Date début,Date fin,Motif,Date création,Approuvé par,Date approbation,Commentaire
```

**Contenu de l'export :**
- Toutes les demandes (offres + congés)
- Informations employé (nom, email)
- Informations offre (titre, destination)
- Statuts complets
- Historique de validation

**Accès :** Réservé aux Admin RH et Propriétaire

### ❓ Question pour le Client
> **Quels formats d'export souhaitez-vous pour les rapports RH ?**
>
> **Formats requis :**
> - [ ] CSV (implémenté)
> - [ ] Excel (.xlsx)
> - [ ] PDF (rapports formatés)
> - [ ] JSON (pour intégrations)
>
> **Types de rapports souhaités :**
> - [ ] Export des demandes (actuel)
> - [ ] Rapport des soldes de congés par employé
> - [ ] Rapport statistique (taux d'approbation, délais moyens)
> - [ ] Rapport des offres (taux de remplissage, popularité)
>
> **Fréquence d'export :**
> - [ ] À la demande (actuel)
> - [ ] Export automatique programmé (quotidien/hebdomadaire/mensuel)

---

## Synthèse des Points à Confirmer

| # | Point | Statut | Priorité |
|---|-------|--------|----------|
| 1 | Règle de calcul 22 jours = 1.5 jour | ✅ À confirmer | Haute |
| 2 | Champs obligatoires des offres | ✅ À confirmer | Haute |
| 3 | Seuils de visibilité publique | ✅ À confirmer | Moyenne |
| 4 | Permissions Owner vs Admin RH | ✅ À confirmer | Haute |
| 5 | Logique de priorisation | ✅ À confirmer | Moyenne |
| 6 | Formats d'export | ✅ À confirmer | Moyenne |

---

## Configuration Configurable

Les éléments marqués comme "configurables" peuvent être modifiés via l'interface Owner Settings sans intervention technique :

- `leave_calculation_days` : Nombre de jours travaillés pour le calcul
- `leave_calculation_rate` : Taux d'acquisition de congés
- `auto_rejection_enabled` : Activation du rejet automatique
- `session_timeout_minutes` : Durée de session
- `log_retention_days` : Rétention des journaux

---

## Prochaines Étapes

Une fois ces questions validées par le client :

1. **Mise à jour des constantes** selon les réponses
2. **Implémentation des formats d'export** supplémentaires (si PDF/Excel demandés)
3. **Ajustement des permissions** selon la granularité souhaitée
4. **Implémentation de la logique de priorisation** (si différente du FCFS)
5. **Mise à jour de la documentation** utilisateur

---

**Document généré le :** 21 Mars 2026  
**Version :** 1.0  
**Projet :** Plateforme de Gestion des Congés - Fenie Brossette Maroc
