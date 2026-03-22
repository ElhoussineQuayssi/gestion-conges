# Plan: Correction des erreurs d'approbation de demandes

## Problème identifié
Lorsque l'utilisateur essaie d'approuver une demande à `/admin/requests`, il reçoit une erreur générique "Erreur lors de la mise à jour de la demande" sans raison précise.

**Cause racine**: La fonction `approveRequestAndApply()` dans `lib/db.ts` retourne `false` silencieusement sans message d'erreur spécifique.

## Étapes de correction

### Étape 1: Modifier `lib/db.ts` - Fonction `approveRequestAndApply`
- Modifier la fonction pour retourner un objet avec `{ success: boolean, error?: string }` au lieu de juste `boolean`
- Ajouter des messages d'erreur spécifiques pour chaque cas d'échec:
  - "La demande n'est plus en attente"
  - "L'offre n'existe pas"
  - "L'offre n'est plus disponible"
  - "L'offre a expiré"
  - "L'offre est complète"
  - "Le solde de congés est insuffisant"
  - "Les dates de congés sont manquantes"

### Étape 2: Modifier `app/api/requests/[id]/route.ts`
- Adapter le endpoint PATCH pour gérer le nouvel objet de retour
- Retourner le message d'erreur spécifique du backend vers le frontend

### Étape 3: Modifier `app/admin/requests/page.tsx`
- Améliorer le gestion des erreurs pour afficher les messages d'erreur spécifiques
- Afficher le message d'erreur retourné par l'API

### Étape 4: Vérifier la cohérence avec l'approbation groupée
- Vérifier que `app/api/requests/bulk/route.ts` gère aussi correctement les erreurs
