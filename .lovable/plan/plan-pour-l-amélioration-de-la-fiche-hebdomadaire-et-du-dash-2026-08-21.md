# Plan pour l'amélioration de la fiche hebdomadaire et du dashboard employé

Ce plan vise à simplifier l'interface utilisateur, améliorer la pertinence des indicateurs de progression et sécuriser le workflow de soumission des fiches hebdomadaires.

## Améliorations de l'Interface Utilisateur (Simplification)

- **Indicateurs d'onglets intelligents** : Remplacer la coche verte binaire par un indicateur plus nuancé (point orange pour les tâches en cours, point gris si vide, coche seulement si au moins une tâche est terminée ou avec un avancement significatif).
- **Suppression des doublons** : Retirer le rappel de soumission dans la sidebar pour ne le garder que dans le bloc "Coach ATS", évitant ainsi la surcharge visuelle.
- **Gestion des placeholders** : Masquer le texte "Nouvelle tâche" par défaut dans le champ de saisie pour utiliser un vrai placeholder grisé ("Ajouter une tâche...").
- **Focus automatique** : À l'ouverture, activer automatiquement l'onglet du jour courant (ex: Vendredi) plutôt que de rester bloqué sur Lundi.

## Logique Métier et Progression

- **Calcul de progression réel** : Synchroniser la barre de progression globale sur le nombre de jours réellement complétés (basé sur 5 jours ouvrés).
- **Validation avant soumission** : Désactiver le bouton "Soumettre" ou ajouter un avertissement explicite si des jours ou des notes obligatoires sont manquants.
- **Résumé visuel des manques** : Ajouter un mini-compteur en haut de page (ex: "3/5 jours renseignés") pour une visibilité immédiate des éléments manquants.

## Détails Techniques

- **Composant `FichePage` (`src/routes/_authenticated/fiche.tsx`)** :
    - Mise à jour de `dayComplete` pour vérifier le contenu réel (tâche + avancement).
    - Modification du calcul de `completion`.
    - Ajout d'un état `initialActiveDay` basé sur `new Date().getDay()`.
    - Ajout d'un bandeau de statistiques rapides dans le `PageHeader` ou sous la barre de progression.
    - Ajout d'une boîte de dialogue de confirmation pour la soumission en cas de manques.
- **Composant `AppSidebar` (`src/components/app-sidebar.tsx`)** :
    - Suppression du bloc de texte "Rappel : Soumettez votre fiche...".
- **Composant `EntryRow` (`src/routes/_authenticated/fiche.tsx`)** :
    - Ajustement des placeholders des inputs.
    - Correction de la valeur initiale "Nouvelle tâche" lors de l'ajout d'une ligne.
