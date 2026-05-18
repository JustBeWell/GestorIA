# Despliegue productivo - GestorIA

Documento operativo para desplegar GestorIA fuera del entorno local de desarrollo.

## Alcance

La pila productiva consta de:

- PostgreSQL 17.
- Microservicios FastAPI `backend-*`.
- Gateway nginx en `:8008`.
- Frontend Angular/Electron empaquetado o servido como build estatico.
- Volumen persistente `gia_data` para archivos del portal GIA.

El `docker-compose.yml` del repositorio sirve como base local. En produccion debe usarse con variables externas, secretos reales, backups y politica de logs.

## Secretos obligatorios

No usar valores de desarrollo en produccion.

| Variable | Uso | Requisito productivo |
|---|---|---|
| `POSTGRES_PASSWORD` | Password de BD | Secreto fuerte, rotado fuera del repo. |
| `DATABASE_URL` | Conexion completa a BD | Debe apuntar a PostgreSQL productivo con `sslmode=require` si aplica. |
| `JWT_SECRET_KEY` | Firma de tokens | Minimo 32 bytes aleatorios. No usar `dev-secret-change-me`. |
| `INTERNAL_EVENTS_HMAC_SECRET` | Firma de eventos internos | Secreto aleatorio distinto de JWT. |
| `OPENAI_API_KEY` | Portal GIA | Guardar en gestor de secretos. |
| `TWILIO_ACCOUNT_SID` | 2FA SMS | Obligatorio si se activa 2FA por SMS. |
| `TWILIO_AUTH_TOKEN` | 2FA SMS | Secreto Twilio real. |
| `TWILIO_FROM_NUMBER` | 2FA SMS | Numero verificado. |
| `PUSH_VAPID_PUBLIC_KEY` | Web Push | Clave publica VAPID. |
| `PUSH_VAPID_PRIVATE_KEY` | Web Push | Clave privada VAPID. |
| `PUSH_VAPID_SUBJECT` | Web Push | Email/contacto de la asesoria. |

Recomendacion: inyectar secretos mediante el proveedor de despliegue o Docker secrets, no mediante ficheros versionados. Mantener `.env` local fuera de git.

## Configuracion recomendada

- `FRONTEND_URL`: dominio HTTPS real del frontend.
- `POSTGRES_SSLMODE`: `require` cuando la BD no este en la misma red privada.
- `JWT_EXPIRATION_HOURS`: mantener bajo, por ejemplo `8`.
- `GIA_STORAGE_DIR`: ruta persistente montada en volumen.
- `NOTIFICATIONS_RETENTION_DAYS`: definir retencion segun politica de la asesoria.
- `TIMEZONE`: `Europe/Madrid`.

## Migraciones

El arranque productivo debe aplicar todas las migraciones de `db/migrations` en orden antes de exponer la API:

1. Crear backup previo.
2. Aplicar migraciones `V001` a la ultima disponible.
3. Verificar que existen tablas clave: `usuarios`, `empleados`, `clientes`, `trabajos`, `facturas`, `pagos`, `auditoria_eventos`, `calendario_fiscal_vencimientos`, `notifications`, `empresa_configuracion`.
4. Verificar vistas: `v_deuda_por_cliente`, `v_horas_diarias`, `v_resumen_mensual`.

El `docker-compose.yml` monta migraciones concretas en `docker-entrypoint-initdb.d`, que solo se ejecutan al inicializar una BD vacia. Para upgrades de una BD existente, aplicar SQL de forma controlada con `psql` o herramienta de migraciones.

## Backups

Politica minima recomendada:

- Backup diario completo de PostgreSQL con `pg_dump`.
- Retencion: 7 diarios, 4 semanales, 12 mensuales.
- Backup del volumen `gia_data` junto con la BD.
- Prueba mensual de restauracion en entorno aislado.
- Cifrado en reposo para copias externas.

Ejemplo manual:

```bash
docker exec gestoria-db pg_dump -U gestoria -d GestorIA -Fc > backups/gestoria-$(date +%F).dump
```

Restauracion en una BD limpia:

```bash
pg_restore --clean --if-exists -U gestoria -d GestorIA backups/gestoria-YYYY-MM-DD.dump
```

## Logs y observabilidad

- Centralizar logs de contenedores (`docker logs` no basta para retencion larga).
- Mantener logs de `gateway`, `backend-*`, `db` y jobs de notificaciones.
- Alertar por errores 5xx del gateway y excepciones de backend.
- Revisar `notification_outbox` para reintentos agotados.
- Registrar auditoria funcional desde `auditoria_eventos`; no usarla como sustituto de logs tecnicos.

Comandos de inspeccion local:

```bash
docker compose logs -f gateway
docker compose logs -f backend-auth backend-pagos backend-notifications
docker compose logs -f db
```

## Checklist de salida a produccion

- [ ] Secretos reales inyectados fuera del repo.
- [ ] `JWT_SECRET_KEY` e `INTERNAL_EVENTS_HMAC_SECRET` rotados y distintos.
- [ ] BD productiva con backup previo.
- [ ] Migraciones aplicadas hasta la ultima version.
- [ ] `FRONTEND_URL` apunta al dominio productivo.
- [ ] CORS/nginx revisado para el dominio real.
- [ ] Backups programados y restauracion probada.
- [ ] Logs centralizados con retencion definida.
- [ ] Health checks de gateway y servicios monitorizados.
- [ ] 2FA probado si Twilio esta configurado.
- [ ] Web Push probado si VAPID esta configurado.
