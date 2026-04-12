# FinSight FastAPI Backend

Optional analytics API for server-side summary generation and future authorization enforcement.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set the frontend environment variable to enable it:

```bash
REACT_APP_ANALYTICS_API_URL=http://localhost:8000
```

## Endpoints

- `GET /health`
- `POST /api/v1/summary`
