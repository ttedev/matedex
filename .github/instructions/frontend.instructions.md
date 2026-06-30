---
description: "Conventions React, TailwindCSS et design system pour les fichiers frontend Matedex. Use when writing React components, pages, hooks, or API functions in frontend/src/."
applyTo: "frontend/src/**/*.{ts,tsx}"
---

# Conventions Frontend Matedex

## TypeScript + React
- Strict mode — typer toutes les props, états et retours de fonctions
- Composants fonctionnels uniquement (pas de class components)
- Nommer les composants en PascalCase, les hooks en `use*`
- Utiliser `forwardRef` pour les composants qui exposent une ref (ex: `Input`)

## TailwindCSS — Design System
- **Toujours** utiliser les classes du design system, pas les valeurs hex directes
- Couleurs disponibles : `primary`, `secondary`, `tertiary`, `surface`, `on-surface`, `surface-container`, `surface-container-high`, `surface-container-highest`, `surface-container-low`, `outline`, `outline-variant`, `error`, etc.
- Feedback tactile sur tous les éléments cliquables : `active:scale-95 transition-transform duration-200`
- Mobile-first : styler d'abord pour mobile, utiliser `md:` pour desktop

## Formulaires
- Utiliser **React Hook Form** + **Zod** (`zodResolver`) pour tous les formulaires
- `<Controller>` pour les champs non-standards (sliders, pickers, etc.)
- Afficher les erreurs champ par champ via `formState.errors`
- `isLoading` ou `isSubmitting` sur le bouton submit pendant l'envoi

## API et Données
- Utiliser **TanStack Query** (`useQuery`, `useMutation`) pour toutes les requêtes — pas de `useEffect` + fetch manuel
- `queryKey` doit être descriptif et inclure les paramètres variables : `['plans', category]`
- Appeler `queryClient.invalidateQueries` après chaque mutation réussie
- Accéder à `import.meta.env.VITE_API_URL` pour les URLs — jamais de valeurs en dur

## Textes
- 100% en **français** : labels, placeholders, messages d'erreur, confirmations
- Messages d'erreur clairs et humains, pas de messages techniques en anglais
