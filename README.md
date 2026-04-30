# GestorIA

Sistema de gestión integral para asesorías: fichaje, clientes, trabajos, facturación y automatización documental. Aplicación de escritorio macOS construida con Angular + Electron + FastAPI + PostgreSQL.

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

---

## Lanzador macOS (doble clic)

`GestorIA.app` es un bundle nativo de macOS que arranca toda la pila (DB → backend → frontend) sin abrir ningún terminal.

### Primer uso

```bash
# Desde la raíz del repositorio
chmod +x GestorIA.app/Contents/MacOS/GestorIA
# Quitar cuarentena si se descargó de internet
xattr -cr GestorIA.app
```

Doble clic en `GestorIA.app`. Aparece una pantalla de carga con barra de progreso mientras:

1. Se construyen e inician los contenedores Docker (DB + backend)
2. Se compila el frontend Angular
3. Se abre la ventana principal

### Requisitos previos

- Docker Desktop instalado y en ejecución
- Node.js (vía nvm o instalación directa)
- Dependencias instaladas: `cd app && npm install`

### Lanzador por terminal (alternativa)

```bash
bash scripts/launch.sh
```
