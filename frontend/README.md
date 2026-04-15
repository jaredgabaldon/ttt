# Collector Shop Frontend

Vite + React storefront for the Django REST Framework API in `../backend`.

## Setup

```bash
npm install
npm run dev
```

Run the backend separately from `../backend`:

```bash
source venv/bin/activate
python manage.py runserver
```

The Vite dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`, so local API requests work without extra CORS setup.

For deployed environments, set `VITE_API_BASE_URL` to the Django API origin.
