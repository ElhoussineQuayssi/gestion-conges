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

## Déploiement Vercel

### 1. Importer le projet
- Importez ce dépôt dans Vercel
- Framework Preset: `Next.js`

### 2. Variables d'environnement
- `SESSION_SECRET` : clé secrète longue et unique pour signer les sessions

### 3. Commandes Vercel
- Install Command: `pnpm install --no-frozen-lockfile`
- Build Command: `pnpm build`

### 4. Initialisation
- Le projet initialise automatiquement les données de démo au premier lancement
- Vous pouvez aussi appeler `POST /api/init` si vous voulez forcer l'initialisation

### 5. Limitation importante
- Le projet utilise actuellement SQLite via `sql.js`
- En local, les données sont écrites dans `data/database.sqlite`
- Sur Vercel, le fichier est écrit dans `/tmp`, donc les données ne sont pas garanties entre exécutions serverless
- Pour une vraie production persistante sur Vercel, il faudra migrer vers une base distante comme Vercel Postgres, Neon, Supabase ou Turso

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
