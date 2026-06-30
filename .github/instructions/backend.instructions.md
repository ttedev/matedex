---
description: "Conventions TypeScript, Prisma et Express pour les fichiers backend Matedex. Use when writing controllers, services, routes, or middleware in backend/src/."
applyTo: "backend/src/**/*.ts"
---

# Conventions Backend Matedex

## TypeScript
- Strict mode activé — pas de `any` sauf si strictement inévitable
- Toujours annoter les types de retour des fonctions `async`
- Utiliser les types générés par Prisma (`@prisma/client`)
- Importer `SafeUser`, `JwtPayload`, `PlanWithRelations` depuis `../lib/types`

## Express Controllers
- Chaque controller handler doit avoir le type de retour `Promise<void>`
- Toujours appeler `res.status(...).json(...)` ou `res.send()` — ne jamais laisser une branche sans réponse
- Valider avec Zod AVANT tout appel au service : `if (!parsed.success) { res.status(400)... return; }`
- Utiliser `req.user!.sub` pour l'ID utilisateur (le `!` est justifié car `requireAuth` garantit sa présence)

## Services
- Pas de `req`/`res` dans les services — uniquement la logique métier et Prisma
- Lever des `Error` avec messages en français (ex: `throw new Error('Plan introuvable.')`)
- Toujours vérifier l'appartenance avant modification : `findFirst({ where: { id, userId } })`

## Sécurité
- Ne jamais retourner `passwordHash` dans les réponses — utiliser `SafeUser` ou `select` Prisma
- Toujours appeler `path.basename(filename)` avant d'accéder à un fichier uploadé
- Noms de fichiers générés avec `crypto.randomBytes(8).toString('hex')` (pas le nom original)
