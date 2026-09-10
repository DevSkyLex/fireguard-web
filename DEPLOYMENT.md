# Déploiement VPS

Le frontend Angular SSR est construit une seule fois puis configuré au démarrage du conteneur. `main` déploie la production et `develop` déploie l’environnement de développement sur le même VPS, dans deux projets Docker distincts.

| Environnement GitHub | Branche   | Domaine                                 | Répertoire VPS                          | Projet Docker                | Image de canal |
| -------------------- | --------- | --------------------------------------- | --------------------------------------- | ---------------------------- | -------------- |
| `production`         | `main`    | `app.fireguard.valentin-fortin.pro`     | `/srv/apps/fireguard/production/front`  | `fireguard-production-front` | `latest`       |
| `development`        | `develop` | `dev.app.fireguard.valentin-fortin.pro` | `/srv/apps/fireguard/development/front` | `fireguard-dev-front`        | `develop`      |

Chaque image reçoit aussi un tag immuable `sha-<commit complet>` utilisé par le déploiement et les rollbacks.

## Configuration runtime

Le serveur SSR lit ces variables au démarrage :

- `APP_API_URL`
- `APP_MERCURE_HUB_URL`
- `APP_NAME`
- `APP_MAINTENANCE`

La configuration publique résolue côté serveur est transmise au navigateur avec `TransferState`. Le serveur expose aussi la même configuration sur `/runtime-config.json` : le bootstrap navigateur la charge avant de créer les services, ce qui garde un shell PWA mis en cache sur l'environnement qui le sert. Le service worker privilégie le SSR pour les navigations et conserve cette configuration publique comme secours hors ligne pendant 24 heures.

Les fichiers `src/environments/environment*.ts` restent les valeurs de secours des commandes Angular locales et ne portent aucune configuration propre au VPS. Un déploiement hébergé échoue au démarrage si son endpoint runtime est indisponible ou invalide au lieu de retomber sur la configuration d'un autre environnement.

## Environnements GitHub

`production` accepte uniquement `main`. `development` accepte uniquement `develop`. Les valeurs de connexion au VPS sont enregistrées séparément dans chaque environnement afin qu’un job de `develop` ne puisse pas lire les secrets de production.

Secrets requis :

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `GHCR_TOKEN` si le jeton du workflow ne suffit pas
- `BASIC_AUTH_USERS` dans `development`, au format htpasswd reconnu par Traefik
- `BASIC_AUTH_CREDENTIALS` dans `development`, au format `utilisateur:mot-de-passe`, uniquement pour le contrôle de santé public

Variables requises :

- `VPS_PORT`, `VPS_APP_DIR`, `VPS_APP_PORT`
- `APP_HOST`, `APP_API_URL`, `APP_MERCURE_HUB_URL`, `APP_NAME`, `APP_MAINTENANCE`
- `DOCKER_PROJECT_NAME`, `DOCKER_CONTAINER_NAME`, `TRAEFIK_ROUTER_NAME`
- `GHCR_USERNAME`

La surcharge `docker-compose.dev.yml` applique Basic Auth au seul frontend et ajoute `X-Robots-Tag: noindex, nofollow, noarchive`. L’API conserve ses en-têtes Bearer sans middleware Basic Auth.

## Pipeline

1. `CI` contrôle les pull requests et les pushes sur `main` et `develop`.
2. `Docker Image` publie l’image `sha-*` et met à jour `latest` ou `develop` après une CI réussie.
3. `Deploy VPS` choisit l’environnement GitHub depuis la branche, vérifie au moins 2,5 Gio de mémoire disponible et 10 Gio de disque libre, puis valide la configuration Compose.
4. Le conteneur doit devenir sain. Le contrôle public suit les redirections, vérifie Basic Auth en dev et confirme la présence de `noindex`.

## Pré-requis VPS

- Docker Engine et le plugin Docker Compose
- accès SSH de GitHub Actions
- réseau externe `traefik_proxy`
- Traefik avec l’entrypoint `websecure` et le résolveur `letsencrypt`
- enregistrements DNS A des domaines vers le VPS

## Rollback

Relancer `Deploy VPS` depuis la branche de l’environnement avec une ancienne référence `ghcr.io/devskylex/fireguard-web:sha-<commit>`. Le rollback dev agit uniquement dans `/srv/apps/fireguard/development/front` et le projet `fireguard-dev-front`.
