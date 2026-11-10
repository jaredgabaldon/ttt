# Kubernetes Manifests

Manifests for `teristoysandtrinkets.com`, following the current PowerCluster pattern of app deployments behind ClusterIP services and an nginx/cert-manager ingress.

## Files

- `backend-config.yaml`: non-secret Django and Postgres connection settings.
- `backend.yaml`: Django deployment and service.
- `backend-secret.example.yaml`: safe template for the required secret; do not commit the real secret file.
- `frontend.yaml`: Vite/static frontend deployment and service.
- `ingress.yaml`: Routes `teristoysandtrinkets.com` to the frontend, with `/admin`, `/api`, `/media`, `/static/admin`, and `/static/rest_framework` routed to Django.
- `kustomization.yaml`: Applies all manifests together.

## Apply

Before applying, create the `teris-backend-secret` Secret and make sure these images exist:

```text
jaredgabaldon/teris-toys-and-trinkets-backend:spaces-ttt-20261110
jaredgabaldon/teris-toys-and-trinkets-frontend:latest
```

Create the secret without writing the password to a committed file:

```bash
kubectl create secret generic teris-backend-secret \
  --from-literal=DJANGO_SECRET_KEY='your-django-secret-key' \
  --from-literal=POSTGRES_USER='doadmin' \
  --from-literal=POSTGRES_PASSWORD='your-digitalocean-password' \
  --from-literal=AWS_ACCESS_KEY_ID='your-spaces-access-key' \
  --from-literal=AWS_SECRET_ACCESS_KEY='your-spaces-secret-key'
```

The deployment also requires `compuweather-spaces-credentials` with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, authorized for `power-bucket`. Explicit Secret references override the legacy Spaces keys above. Do not import this shared Secret’s bucket settings: those refer to CompuWeather.

The bucket migration is complete; see [spaces-migration.md](spaces-migration.md) for verification and recovery notes. To apply the current manifests, run:

```bash
kubectl apply -k manifests
```

## Notes

The backend uses in-cluster PostgreSQL at `teris-postgres:5432` and continues using DigitalOcean Spaces for media. Database credentials come from `teris-postgres-app-credentials` through explicit environment variables; these override the legacy database credentials in `teris-backend-secret`. Provision the database and application credentials using [postgres/README.md](postgres/README.md) before deploying the backend. The manifests configure Spaces media for `power-bucket` in `sfo3`; both media and backup uploads use keys from `compuweather-spaces-credentials`. The backend runs with `DJANGO_DEBUG=false`; admin and REST framework static assets are collected at container startup and served by WhiteNoise.

## PostgreSQL migration preparation

See [postgres/README.md](postgres/README.md) for the DigitalOcean export, separate database deployment, restore rehearsal, and cutover procedure. The app manifests now use the Kubernetes PostgreSQL database.

Daily PostgreSQL backups run at 03:00 America/Denver and retain seven archives in a private Spaces prefix. Seven-day bucket expiration is configured for `ttt/database-backups/postgres/`. See [backup operations](postgres/README.md#automated-daily-backups).
