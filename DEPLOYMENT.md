# Deployment VPS

Ce projet est prepare pour un deploiement GitHub Actions vers un VPS avec Docker Compose et une image publiee sur GHCR.

## Fichiers ajoutes

- `Dockerfile`: build multi-stage pour l'application Angular SSR.
- `docker-compose.prod.yml`: definition du service a lancer sur le VPS.
- `.github/workflows/ci-cd.yml`: pipeline CI/CD GitHub.
- `package.json`: scripts `test:ci` et `quality` pour reproduire localement les controles CI.

Le `Dockerfile` genere inline le fichier Angular `src/environments/environment.ts` pendant le build de l'image.

## Secrets GitHub a creer

### Obligatoires

- `APP_API_URL`: URL publique de l'API backend en production.
- `APP_MERCURE_HUB_URL`: URL publique du hub Mercure en production.
- `VPS_HOST`: hostname ou IP du VPS.
- `VPS_USER`: utilisateur SSH du VPS.
- `VPS_SSH_KEY`: cle privee SSH pour se connecter au VPS.

### Optionnels

- `VPS_PORT`: port SSH si different de `22`.

## Variables GitHub optionnelles

- `APP_NAME`: nom d'application injecte au build. Valeur par defaut: `Fireguard`.
- `APP_MAINTENANCE`: `true` ou `false`. Valeur par defaut: `false`.
- `VPS_APP_DIR`: dossier de deploiement sur le VPS, relatif au home de l'utilisateur SSH. Valeur par defaut: `apps/fireguard-sso-web`.
- `VPS_APP_PORT`: port expose sur le VPS. Valeur par defaut: `4000`.

## Prerequis sur le VPS

- Docker Engine installe.
- Plugin Docker Compose installe (`docker compose`).
- L'utilisateur SSH doit pouvoir executer Docker.
- Un reverse proxy externe est recommande si tu publies l'application derriere un domaine.

## Fonctionnement du pipeline

1. Sur pull request, la pipeline lance `npm ci`, `npm run format:check`, `npm run lint`, `npm run test:ci` et `npm run build`.
2. Sur `main` et en execution manuelle, la pipeline injecte la configuration Angular de production au build de l'image Docker SSR puis pousse l'image sur GHCR.
3. GitHub Actions copie `docker-compose.prod.yml` sur le VPS, ecrit un fichier `.env` minimal et relance le service.

## Verification locale avant push

- `npm run quality`: reproduit les controles bloquants de la CI.

## Premiere mise en service

1. Cree les secrets et variables GitHub.
2. Verifie que le VPS accepte la connexion SSH depuis GitHub Actions.
3. Verifie que `docker` et `docker compose` fonctionnent avec l'utilisateur cible.
4. Pousse sur `main` ou lance manuellement le workflow `CI/CD VPS`.
5. Place ensuite un reverse proxy Nginx ou Caddy devant le port expose par `VPS_APP_PORT`.

## Point important

La configuration front publique est compilee dans l'image via le mecanisme Angular `environment.ts`. Si tu changes `APP_API_URL` ou `APP_MERCURE_HUB_URL`, il faut reconstruire puis redeployer l'image.

## Methode Angular retenue

L'application utilise a nouveau le pattern officiel Angular de configuration par fichier d'environnement compile au build. Le code Angular importe `@env/environment`; la partie Docker/CI se contente de generer ce fichier de production juste avant `ng build`.
