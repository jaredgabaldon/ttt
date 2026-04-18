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
jaredgabaldon/teris-toys-and-trinkets-backend:latest
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

Then run:

```bash
kubectl apply -k manifests
```

## Notes

The backend manifest uses DigitalOcean Postgres and DigitalOcean Spaces connection values through environment variables. Spaces media is configured for the `teris-toys-and-trinkets-media` Space in `sfo2`; the real Spaces access keys belong in the `teris-backend-secret` Kubernetes Secret. The backend runs with `DJANGO_DEBUG=false`; admin and REST framework static assets are collected at container startup and served by WhiteNoise.
