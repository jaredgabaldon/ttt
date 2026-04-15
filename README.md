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

## API

- `GET /api/categories/`
- `GET /api/categories/{slug}/`
- `GET /api/items/`
- `GET /api/items/{id}/`
- `GET /api/items/?category=cards`
- `GET /api/items/?featured=true`
- `GET /api/items/?search=pokemon`

Open `/api/` in a browser while the server is running to use DRF's browsable API.
