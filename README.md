# Collector Shop API

A very small read-only Django REST Framework API for a collector-item catalog.

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

For production S3 storage, set these environment variables before running Django:

```bash
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=cdn.example.com  # optional
```

AWS credentials should come from the normal AWS environment, IAM role, or deployment platform configuration.

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
