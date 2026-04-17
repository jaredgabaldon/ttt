# Teri's Toys and Trinkets API

A very small read-only Django REST Framework API for a toy-and-trinket catalog.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Pictures

Items have an optional `image` field. In local development, uploaded files are stored in `media/` and served from `/media/` while `DEBUG=True`.

For DigitalOcean Spaces storage, set these environment variables before running Django:

```bash
AWS_STORAGE_BUCKET_NAME=teris-toys-and-trinkets-media
AWS_S3_REGION_NAME=sfo2
AWS_S3_ENDPOINT_URL=https://sfo2.digitaloceanspaces.com
AWS_S3_CUSTOM_DOMAIN=your-cdn-domain.example.com  # optional, only if CDN is enabled
AWS_ACCESS_KEY_ID=your-spaces-access-key
AWS_SECRET_ACCESS_KEY=your-spaces-secret-key
```

The Space origin endpoint is `https://teris-toys-and-trinkets-media.sfo2.digitaloceanspaces.com`. Keep access keys in environment variables or Kubernetes Secrets, not committed files.

## API

- `GET /api/categories/`
- `GET /api/categories/{slug}/`
- `GET /api/items/`
- `GET /api/items/{id}/`
- `GET /api/items/?category=cards`
- `GET /api/items/?featured=true`
- `GET /api/items/?search=pokemon`

Item responses include `image` when a picture is available.

Open `/api/` in a browser while the server is running to use DRF's browsable API.

## Database

The app uses SQLite locally when `POSTGRES_HOST` is not set. In Kubernetes, the manifests configure DigitalOcean Postgres with these environment variables:

```bash
POSTGRES_HOST=db-postgresql-sfo2-41105-do-user-35993427-0.h.db.ondigitalocean.com
POSTGRES_PORT=25060
POSTGRES_DB=defaultdb
POSTGRES_USER=doadmin
POSTGRES_PASSWORD=your-password
POSTGRES_SSLMODE=require
```
