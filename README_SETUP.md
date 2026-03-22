# Plateforme de Gestion des Congés - Guide de Configuration

## Démarrage rapide

### 1. Installation
```bash
pnpm install
```

### 2. Initialisation de la base de données
```bash
pnpm init-db
```

### 3. Lancer l'application
```bash
pnpm dev
```

## Identifiants de test

- **Employé:** employee@example.com / Employee123!
- **Admin RH:** admin@example.com / Admin123!
- **Owner:** owner@example.com / Owner123!

## Structure de l'application

### Pages employé
- `/employee/dashboard` - Tableau de bord avec soldes
- `/employee/offers` - Candidature aux offres
- `/employee/leave-request` - Demander des congés

### Pages admin RH
- `/admin/dashboard` - Vue d'ensemble
- `/admin/offers` - Gestion des offres
- `/admin/requests` - Validation des demandes
- `/admin/balances` - Gestion des soldes

### Pages owner
- `/owner/dashboard` - Supervision complète
- `/owner/admins` - Gestion des admins RH

## Fonctionnalités principales

✓ Authentification par email/mot de passe
✓ Gestion des rôles (Employé, Admin RH, Owner)
✓ Demandes de congés avec validation du solde
✓ Offres de vacances avec candidatures
✓ Validation des demandes par l'admin
✓ Historique complet des actions
✓ Interface épurée et minimaliste
✓ Design responsive en Tailwind CSS
