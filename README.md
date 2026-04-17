# Teri's Toys and Trinkets

A small toy-and-trinket catalog with a Django REST Framework backend and a Vite React frontend.

## Backend

```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```

API endpoints:

- `GET /api/categories/`
- `GET /api/categories/{slug}/`
- `GET /api/items/`
- `GET /api/items/{id}/`
- `GET /api/items/?category=cards`
- `GET /api/items/?featured=true`
- `GET /api/items/?search=pokemon`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`.

## Docker Images

Build the backend image from the backend directory:

```bash
docker build -t jaredgabaldon/teris-toys-and-trinkets-backend:latest backend
```

Build the frontend image from the frontend directory:

```bash
docker build -t jaredgabaldon/teris-toys-and-trinkets-frontend:latest frontend
```

The Kubernetes manifests in `manifests/` reference those image names.
