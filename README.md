# GestorIA

Comprehensive web-based management system for administrative agencies: legal filing, clients, jobs, and billing with document automation.

## Backend

- Backend service location: `backend/`
- Backend technical documentation: `backend/README.md`

### Run backend locally

```bash
cd backend
python -m uvicorn main:app --reload --port 8008
```

### Run backend tests

```bash
cd backend
python -m pytest -q
```
