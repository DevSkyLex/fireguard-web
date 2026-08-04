# Parcours actuels — relevé factuel (Phase 0 du chantier refonte)

> Vérifié dans le code le 2026-08-04 (`app.routes.ts`, guards, layouts,
> `organization-navigation.config.ts`). Ce document décrit **l'existant**, sans
> jugement ni proposition : il sert de référence « avant » aux journey maps de
> la planche Vision.

## Chiffres clés

| Mesure | Valeur actuelle |
| --- | --- |
| Démarrage à froid → workspace d'une intervention (desktop) | **4 clics, 3 écrans intermédiaires** (3 clics sans MFA) |
| Idem sur mobile | **+1 clic** (pane `list` d'abord si l'URL n'a pas de destination) |
| Bascule d'organisation sur mobile | **impossible** (org-switcher = rail `hidden … lg:flex`) |
| User-menu (profil / logout) sur mobile | **inaccessible** (même rail) |
| Liens de nav métier affichés | ≤ 8, **liste plate** (5 groupes déclarés, 0 rendu) |
| Sous-chemin préservé à la bascule d'org | **non** — retour à la landing de l'org cible |

## 1. Atterrissage post-login

```
/auth/login ──(Sign in)──► resolveReturnUrl(returnUrl) ; fallback « / »
   │  (mfaRequired → /auth/mfa-verify, returnUrl propagé)
   ▼
/  ──► MAIN_ROUTES '' ──► redirectTo /organizations
   ──► organizationGuard (retourne TOUJOURS un UrlTree) :
         cookie last-organization valide ───► /organizations/:id
         sinon 1re org accessible ─────────► /organizations/:id
         orgs toutes exclues (?excluded) ──► /error/403
         aucune organisation ──────────────► /onboarding
         échec transport ──────────────────► /error/500
   ──► organizationAccessGuard (charge /me)
   ──► organizationLandingGuard :
         DASHBOARD_READ ──► OrganizationOverviewPage (dashboard)
         sinon ──────────► 1re destination permise de la nav
         aucune ─────────► /organizations?excluded=:id
```

Constat : l'utilisateur ne choisit jamais sa destination — trois guards en
chaîne décident pour lui, et la destination par défaut est le dashboard
(inventaire), pas le travail.

## 2. Démarrage à froid → travail terrain (le parcours cœur)

| # | Écran | Action | Clic |
| --- | --- | --- | --- |
| 1 | `/auth/login` | saisie + « Sign in » | 1 |
| 2 | `/auth/mfa-verify` (si MFA) | OTP + « Verify » | 2 |
| 3 | redirections automatiques → dashboard | — | 0 |
| 4 | Dashboard | « Interventions » dans la sidebar | 3 |
| 5 | `/organizations/:id/interventions` | clic sur une ligne/carte | 4 |
| 6 | `/organizations/:id/interventions/:iid` | **arrivé** | — |

Mobile : après login sans destination dans l'URL, le shell ouvre le pane
`list` (sidebar plein écran) → +1 clic pour rejoindre le contenu. Chemins
alternatifs vers le même écran : `?view=calendar` + clic événement ; recherche
texte ; prev/next de `InterventionHeaderActions` une fois dans un workspace.

## 3. Bascule d'organisation

- **Où** : uniquement le rail 60px desktop (`OrganizationRail`, région `lead`).
  Tuile 38px par org, tuile pointillée « Add organization » → `/onboarding`.
- **Comportement** : `navigateByUrl('/organizations/:id')` — le sous-chemin
  courant est perdu (le JSDoc prétend le contraire : dérive doc/code).
- **Mobile** : aucun équivalent. Le user-menu (`AccountRailMenu`, région
  `footer` du rail : profil, notifications, logout) est également absent.
- Préférence : cookie `last-organization`, purgé par les guards quand l'org
  visée devient inaccessible.

## 4. Onboarding — trois portes d'entrée, toutes bloquantes

1. `onboardingRequiredGuard` sur **toute** la branche workspace : tout état
   ≠ `completed` → `/onboarding`, **y compris `null` après échec de
   l'endpoint** (une panne API enferme l'utilisateur dans l'onboarding).
2. `organizationGuard` : aucune organisation → `/onboarding`.
3. Miroir : `onboardingGuard` sur `/onboarding` renvoie vers `/` si déjà
   `completed`.

Wizard 4 phases (`loading / welcome / steps / completion`), 5 étapes
(organisation → plan → équipe → premier site → premier équipement), progression
« reprise où vous en étiez » côté serveur ; le showcase gauche (≥ `lg`) miroite
la timeline, le stepper in-content prend le relais < `xl`.

## 5. Invitation — logged-out puis retour

`/organizations/invitations/accept?token=…` — hors de tout layout, hors
guards. 9 branches d'état dans le template (token absent, chargement, preview
en erreur, déjà accepté, email non concordant, expirée/révoquée, authentifié
concordant → acceptation automatique via effect, non authentifié → « Sign in to
accept » / « Create an account », les deux avec `returnUrl` bouclant sur cette
URL). Après login, `resolveReturnUrl` ramène ici et l'acceptation part.

## 6. Fallbacks d'erreur & maintenance

- `**` racine → `/error/404` ; `ERROR_ROUTES` sans guard (toujours
  atteignables) ; `organizationGuard` → 403 (toutes exclues) / 500 (transport).
- `organizationPermissionGuard` refusé → repli sur la landing de l'org, **pas**
  sur `/error/403` (échec silencieux du point de vue de l'utilisateur).
- `maintenanceGuard` (shell + onboarding) → `/maintenance` si actif ;
  `/maintenance` reste atteignable en permanence.
- `unauthorized.interceptor` (401) → `/auth/login`.

## 7. Breadcrumb & titre

- Fourni par `BreadcrumbService`, **provided dans `WorkspaceLayout`**
  (inexistant dans split/focused). Modèle : `🏠 › <Organisation> › <Section> ›
  <Entité>` ; les feuilles de liste posent `breadcrumb: false` pour ne pas
  doubler le crumb parent ; le dernier item perd son lien.
- Mobile : seul le **dernier** crumb est visible (CSS `[pt]`, pas de swap de
  modèle — choix SSR documenté).
- Le `h1` des routes sans titre visible est le fallback `sr-only` du header
  shell (dernier crumb), auto-désactivé dès que la page rend son propre `h1`.

## 8. Navigation affichée vs déclarée

Déclaré (`organization-navigation.config.ts`) : 5 groupes — `overview`,
`field-work`, `assets`, `compliance`, `administration` — portant 8 items
(Dashboard, Interventions, Facilities, Equipments, Inspections, Members,
Roles→`team`, Settings), chacun gardé par permissions (`all`/`any`).

Rendu (`organization-workspace-nav`) : `sections().flatMap(...)` — **liste
plate sans titres de groupe**. En dessous, le slot secondaire ajoute les blocs
collaboration : « Saved », **Favorites** (repliable), **Channels** (repliable,
recherche), **Direct messages** (repliable, picker « New direct message »).

Absents de la nav : l'audit log (délibéré — permission compte globale) ;
`checklists` (feature sans entrée de nav).
