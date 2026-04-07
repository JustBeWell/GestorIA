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

## Docker (Full Stack)

Servicios incluidos en `docker-compose.yml`:

- `db`: PostgreSQL 17 + carga inicial de esquema desde `db/migrations/V001__schema_inicial.sql`
- `backend`: FastAPI en `http://localhost:8008`
- `frontend-web`: Angular estático servido con Nginx en `http://localhost:4200`

### Levantar todo

```bash
docker-compose up --build
```

### Ejecutar en segundo plano

```bash
docker-compose up --build -d
```

### Parar servicios

```bash
docker-compose down
```

### Limpiar también el volumen de PostgreSQL

```bash
docker-compose down -v
```
