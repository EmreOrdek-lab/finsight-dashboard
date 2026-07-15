# FinSight FastAPI Backend

Optional analytics API for server-side summary generation and future authorization enforcement.
It can also power the FinSight AI analysis panel with the OpenAI Responses API.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
OPENAI_TIMEOUT_SECONDS=30
```

Set the frontend environment variable to enable it:

```bash
REACT_APP_ANALYTICS_API_URL=http://localhost:8000
```

## Endpoints

- `GET /health`
- `POST /api/v1/summary`
- `POST /api/v1/ai-analysis`
