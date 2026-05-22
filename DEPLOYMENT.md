# Deployment VPS

Ce projet est prepare pour un deploiement GitHub Actions vers un VPS avec Docker Compose et une image publiee sur GHCR.

## Fichiers ajoutes

- `Dockerfile`: build multi-stage pour l'application Angular SSR.
- `docker-compose.prod.yml`: definition du service a lancer sur le VPS.
- `.github/workflows/ci.yml`: controles qualite.
- `.github/workflows/docker.yml`: build et publication de l'image Docker sur GHCR.
- `.github/workflows/deploy-vps.yml`: deploiement VPS.
- `package.json`: scripts `test:ci` et `quality` pour reproduire localement les controles CI.

Le build Docker utilise directement les fichiers Angular `src/environments/environment.ts` et `src/environments/environment.development.ts` deja presents dans le depot.

## Environnement GitHub

Cree un environnement GitHub nomme `production` dans `Settings > Environments`.

Les secrets ci-dessous peuvent etre crees dans cet environnement. Les workflows `Docker Image` et `Deploy VPS` declarent `environment: production`.

## Secrets GitHub a creer

### Obligatoires

- `VPS_HOST`: hostname ou IP du VPS.
- `VPS_USER`: utilisateur SSH du VPS.
- `VPS_SSH_KEY`: cle privee SSH pour se connecter au VPS.

### Optionnels

- `VPS_PORT`: port SSH si different de `22`.

## Variables GitHub optionnelles

- `VPS_APP_DIR`: dossier de deploiement sur le VPS, relatif au home de l'utilisateur SSH. Valeur par defaut: `apps/fireguard-web`.
- `APP_HOST`: domaine public expose par Traefik. Valeur par defaut: `app.fireguard.valentin-fortin.pro`.

## Prerequis sur le VPS

- Docker Engine installe.
- Plugin Docker Compose installe (`docker compose`).
- L'utilisateur SSH doit pouvoir executer Docker.
- Traefik doit deja tourner sur le VPS.
- Le reseau Docker externe `traefik_proxy` doit exister.
- Traefik doit exposer l'entrypoint `websecure` et le certresolver `letsencrypt`.

## Fonctionnement du pipeline

1. `CI` lance `npm ci`, `npm run format:check`, `npm run lint`, `npm run test:ci` et `npm run build` sur pull request, push `main` et execution manuelle.
2. `Docker Image` se lance apres un `CI` reussi sur `main`, ou manuellement, build l'image Docker SSR avec les fichiers d'environnement Angular presents dans le depot puis pousse l'image sur GHCR.
3. Apres une publication Docker reussie, `Docker Image` declenche `Deploy VPS` avec la reference exacte de l'image a deployer.
4. `Deploy VPS` peut aussi etre lance manuellement avec une image precise ou, sans saisie, avec l'image `latest`.

## Verification locale avant push

- `npm run quality`: reproduit les controles bloquants de la CI.

## Premiere mise en service

1. Cree les secrets et variables GitHub.
2. Verifie que le VPS accepte la connexion SSH depuis GitHub Actions.
3. Verifie que `docker` et `docker compose` fonctionnent avec l'utilisateur cible.
4. Pousse sur `main` pour declencher `CI`, puis `Docker Image`, puis `Deploy VPS`.
5. Verifie que le DNS de `APP_HOST` pointe vers le VPS, puis teste `https://app.fireguard.valentin-fortin.pro/auth/login`.

## Point important

La configuration front publique reste compilee dans l'image via le mecanisme Angular `environment.ts`. Si tu changes une valeur de production dans `src/environments/environment.ts`, il faut reconstruire puis redeployer l'image.

## Methode Angular retenue

L'application utilise le pattern officiel Angular de configuration par fichier d'environnement compile au build. Le code Angular importe `@env/environment`; la production utilise `src/environments/environment.ts` et le developpement utilise `src/environments/environment.development.ts` via les file replacements definis dans `angular.json`.
