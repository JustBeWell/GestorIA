from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, timedelta

from psycopg2.extras import RealDictCursor, execute_values

from database import db_connection

MONTH_NAMES_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]

AEAT_CALENDARIO_2026_URL = (
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/"
    "calendario-contribuyente-2026.html"
)
AEAT_DOMICILIACION_2026_URL = (
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/"
    "calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html"
)
TGSS_COTIZACION_URL = (
    "https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/"
    "CotizacionRecaudacionTrabajadores/9896/38386/38389"
)
TGSS_SLD_URL = (
    "https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil/"
    "5300/1861/186/187/1177/1178/114961?changeLanguage=es"
)

CALENDARIO_FISCAL_SEEDS = [
    ("2026-01-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Cuarto trimestre 2025.", "Renta y Sociedades", "4T 2025", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-01-20", "115", "Retenciones por alquileres urbanos", "Retenciones e ingresos a cuenta por arrendamientos urbanos. Cuarto trimestre 2025.", "Renta y Sociedades", "4T 2025", "media", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-01-20", "123", "Retenciones capital mobiliario", "Retenciones e ingresos a cuenta sobre capital mobiliario. Cuarto trimestre 2025.", "Renta y Sociedades", "4T 2025", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-01-30", "130", "Pago fraccionado IRPF", "Estimación directa. Cuarto trimestre 2025.", "Pagos fraccionados Renta", "4T 2025", "alta", "pendiente", ["Autónomo"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "131", "Pago fraccionado IRPF módulos", "Estimación objetiva. Cuarto trimestre 2025.", "Pagos fraccionados Renta", "4T 2025", "media", "pendiente", ["Autónomo"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "180", "Resumen anual alquileres", "Declaración informativa anual de retenciones por arrendamientos urbanos. Ejercicio 2025.", "Informativas", "2025", "media", "pendiente", ["Sociedad", "Autónomo"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "190", "Resumen anual retenciones trabajo", "Declaración informativa anual de retenciones del trabajo, actividades profesionales y premios. Ejercicio 2025.", "Informativas", "2025", "alta", "pendiente", ["Sociedad", "Autónomo"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "303", "IVA trimestral", "Autoliquidación de IVA. Cuarto trimestre 2025.", "IVA", "4T 2025", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "349", "Operaciones intracomunitarias", "Declaración recapitulativa de operaciones intracomunitarias. Cuarto trimestre 2025.", "IVA", "4T 2025", "media", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-01-30", "390", "Resumen anual IVA", "Resumen anual de IVA. Ejercicio 2025.", "IVA", "2025", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-03-02", "303", "IVA mensual", "Autoliquidación de IVA. Enero 2026.", "IVA", "Enero 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-03-02", "347", "Operaciones con terceros", "Declaración anual de operaciones con terceras personas. Ejercicio 2025.", "Informativas", "2025", "alta", "pendiente", ["Sociedad", "Autónomo"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-03-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Febrero 2026, grandes empresas.", "Renta y Sociedades", "Febrero 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-03-30", "303", "IVA mensual", "Autoliquidación de IVA. Febrero 2026.", "IVA", "Febrero 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-04-08", "100", "Inicio campaña Renta web", "Inicio de presentación por Internet de Renta y Patrimonio 2025.", "Renta", "2025", "media", "pendiente", ["Autónomo", "Persona física"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-04-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Primer trimestre 2026.", "Renta y Sociedades", "1T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "115", "Retenciones por alquileres urbanos", "Retenciones e ingresos a cuenta por arrendamientos urbanos. Primer trimestre 2026.", "Renta y Sociedades", "1T 2026", "media", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "130", "Pago fraccionado IRPF", "Estimación directa. Primer trimestre 2026.", "Pagos fraccionados Renta", "1T 2026", "alta", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "131", "Pago fraccionado IRPF módulos", "Estimación objetiva. Primer trimestre 2026.", "Pagos fraccionados Renta", "1T 2026", "media", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "202", "Pago fraccionado Impuesto sobre Sociedades", "Primer pago fraccionado del Impuesto sobre Sociedades.", "Sociedades", "Abril 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "303", "IVA trimestral", "Autoliquidación de IVA. Primer trimestre 2026.", "IVA", "1T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-20", "349", "Operaciones intracomunitarias", "Declaración recapitulativa de operaciones intracomunitarias. Primer trimestre 2026.", "IVA", "1T 2026", "baja", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-04-30", "303", "IVA mensual", "Autoliquidación de IVA. Marzo 2026.", "IVA", "Marzo 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-04-30", "322", "IVA grupo de entidades individual", "Grupo de entidades, modelo individual. Marzo 2026.", "IVA", "Marzo 2026", "baja", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-04-30", "353", "IVA grupo de entidades agregado", "Grupo de entidades, modelo agregado. Marzo 2026.", "IVA", "Marzo 2026", "baja", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-06", "100", "Renta por teléfono", "Inicio de atención telefónica para Renta 2025.", "Renta", "2025", "baja", "pendiente", ["Autónomo", "Persona física"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Abril 2026, grandes empresas.", "Renta y Sociedades", "Abril 2026", "alta", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "115", "Retenciones por alquileres urbanos", "Retenciones e ingresos a cuenta. Abril 2026, grandes empresas.", "Renta y Sociedades", "Abril 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "349", "Operaciones intracomunitarias", "Declaración recapitulativa de operaciones intracomunitarias. Abril 2026.", "IVA", "Abril 2026", "baja", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "430", "Impuesto sobre las Primas de Seguros", "Declaración mensual. Abril 2026.", "Impuesto sobre las Primas de Seguros", "Abril 2026", "baja", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "583", "Producción de energía eléctrica", "Primer pago fraccionado 2026.", "Impuestos Medioambientales", "2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-20", "592", "Impuesto sobre envases de plástico", "Autoliquidación mensual. Abril 2026.", "Impuestos Medioambientales", "Abril 2026", "baja", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-05-30", "303", "IVA mensual", "Autoliquidación de IVA. Abril 2026.", "IVA", "Abril 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-06-25", "100", "Renta con domiciliación", "Fin de plazo para declaraciones de Renta y Patrimonio 2025 con resultado a ingresar domiciliado.", "Renta", "2025", "alta", "pendiente", ["Autónomo", "Persona física"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-06-30", "100", "Declaración de la Renta", "Fin de campaña de Renta 2025.", "Renta", "2025", "alta", "pendiente", ["Autónomo", "Persona física"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-06-30", "714", "Impuesto sobre el Patrimonio", "Fin de plazo de Patrimonio 2025.", "Renta", "2025", "media", "pendiente", ["Persona física"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-06-30", "303", "IVA mensual", "Autoliquidación de IVA. Mayo 2026.", "IVA", "Mayo 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-07-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Segundo trimestre 2026.", "Renta y Sociedades", "2T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "115", "Retenciones por alquileres urbanos", "Retenciones e ingresos a cuenta por arrendamientos urbanos. Segundo trimestre 2026.", "Renta y Sociedades", "2T 2026", "media", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "130", "Pago fraccionado IRPF", "Estimación directa. Segundo trimestre 2026.", "Pagos fraccionados Renta", "2T 2026", "alta", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "131", "Pago fraccionado IRPF módulos", "Estimación objetiva. Segundo trimestre 2026.", "Pagos fraccionados Renta", "2T 2026", "media", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "202", "Pago fraccionado Impuesto sobre Sociedades", "Segundo pago fraccionado del Impuesto sobre Sociedades.", "Sociedades", "Julio 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "303", "IVA trimestral", "Autoliquidación de IVA. Segundo trimestre 2026.", "IVA", "2T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-20", "349", "Operaciones intracomunitarias", "Declaración recapitulativa de operaciones intracomunitarias. Segundo trimestre 2026.", "IVA", "2T 2026", "baja", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-07-27", "200", "Impuesto sobre Sociedades", "Declaración anual 2025 para entidades cuyo periodo impositivo coincide con el año natural.", "Sociedades", "2025", "alta", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-07-30", "303", "IVA mensual", "Autoliquidación de IVA. Junio 2026.", "IVA", "Junio 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-07-31", "390", "IVA anual SII exonerados", "Autoliquidación anual 2025 en supuestos con plazo hasta julio.", "IVA", "2025", "baja", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-08-31", "303", "IVA mensual", "Autoliquidación de IVA. Julio 2026.", "IVA", "Julio 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-09-30", "303", "IVA mensual", "Autoliquidación de IVA. Agosto 2026.", "IVA", "Agosto 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-10-20", "111", "Retenciones de trabajo y actividades", "Retenciones e ingresos a cuenta. Tercer trimestre 2026.", "Renta y Sociedades", "3T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "115", "Retenciones por alquileres urbanos", "Retenciones e ingresos a cuenta por arrendamientos urbanos. Tercer trimestre 2026.", "Renta y Sociedades", "3T 2026", "media", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "130", "Pago fraccionado IRPF", "Estimación directa. Tercer trimestre 2026.", "Pagos fraccionados Renta", "3T 2026", "alta", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "131", "Pago fraccionado IRPF módulos", "Estimación objetiva. Tercer trimestre 2026.", "Pagos fraccionados Renta", "3T 2026", "media", "pendiente", ["Autónomo"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "202", "Pago fraccionado Impuesto sobre Sociedades", "Tercer pago fraccionado del Impuesto sobre Sociedades.", "Sociedades", "Octubre 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "303", "IVA trimestral", "Autoliquidación de IVA. Tercer trimestre 2026.", "IVA", "3T 2026", "alta", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-20", "349", "Operaciones intracomunitarias", "Declaración recapitulativa de operaciones intracomunitarias. Tercer trimestre 2026.", "IVA", "3T 2026", "baja", "pendiente", ["Sociedad", "Autónomo", "SCP", "CB"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-10-30", "303", "IVA mensual", "Autoliquidación de IVA. Septiembre 2026.", "IVA", "Septiembre 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-11-05", "102", "Segundo plazo Renta", "Ingreso del segundo plazo de Renta 2025 para declaraciones fraccionadas.", "Renta", "2025", "media", "pendiente", ["Autónomo", "Persona física"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-11-30", "303", "IVA mensual", "Autoliquidación de IVA. Octubre 2026.", "IVA", "Octubre 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
    ("2026-12-21", "202", "Pago fraccionado Impuesto sobre Sociedades", "Pago fraccionado de diciembre del Impuesto sobre Sociedades.", "Sociedades", "Diciembre 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_DOMICILIACION_2026_URL),
    ("2026-12-30", "303", "IVA mensual", "Autoliquidación de IVA. Noviembre 2026.", "IVA", "Noviembre 2026", "media", "pendiente", ["Sociedad"], "AEAT", AEAT_CALENDARIO_2026_URL),
]


class CalendarioFiscalService:
    """Consulta vencimientos fiscales desde base de datos y compone el calendario mensual."""

    @staticmethod
    def get_month(year: int | None = None, month: int | None = None) -> dict:
        today = date.today()
        year = year or today.year
        month = month or today.month
        if month < 1 or month > 12:
            raise ValueError("El mes debe estar entre 1 y 12")

        start = date(year, month, 1)
        _, month_days = calendar.monthrange(year, month)
        end = date(year, month, month_days)

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                CalendarioFiscalService._ensure_schema(cursor)
                vencimientos = CalendarioFiscalService._get_vencimientos(cursor, start, end)
                connection.commit()

        by_date: dict[date, list[dict]] = defaultdict(list)
        for item in vencimientos:
            by_date[item["fecha"]].append(item)

        dias = CalendarioFiscalService._build_days(start, end, by_date, today)
        pendientes = [item for item in vencimientos if item["estado"] != "presentado"]
        futuros = [item for item in pendientes if item["fecha"] >= today]
        proximos = sorted(futuros or pendientes, key=lambda item: (item["fecha"], item["modelo"]))[:6]
        altas_pendientes = [
            item for item in pendientes
            if item["prioridad"] == "alta"
        ]

        return {
            "periodo": {
                "year": year,
                "month": month,
                "month_label": f"{MONTH_NAMES_ES[month - 1].capitalize()} {year}",
                "subtitle": f"Vencimientos fiscales y laborales · {MONTH_NAMES_ES[month - 1]} {year}",
            },
            "resumen": {
                "vencimientos_mes": len(vencimientos),
                "presentados": len([item for item in vencimientos if item["estado"] == "presentado"]),
                "pendientes_alta_prioridad": len(altas_pendientes),
                "clientes_afectados_alta_prioridad": sum(item["clientes_afectados"] for item in altas_pendientes),
                "proximo_vencimiento": proximos[0] if proximos else None,
            },
            "dias": dias,
            "vencimientos": vencimientos,
            "proximos": proximos,
        }

    @staticmethod
    def get_ics(year: int | None = None, month: int | None = None) -> bytes:
        data = CalendarioFiscalService.get_month(year, month)
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//GestorIA//Calendario Fiscal//ES",
            "CALSCALE:GREGORIAN",
        ]
        for item in data["vencimientos"]:
            dt = item["fecha"].strftime("%Y%m%d")
            uid = f"gestoria-{item['id']}@gestoria.local"
            summary = f"Modelo {item['modelo']} - {item['titulo']}"
            description = (item.get("descripcion") or "").replace("\n", " ")
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{date.today().strftime('%Y%m%d')}T000000Z",
                f"DTSTART;VALUE=DATE:{dt}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "END:VEVENT",
            ])
        lines.append("END:VCALENDAR")
        return ("\r\n".join(lines) + "\r\n").encode("utf-8")

    @staticmethod
    def _get_vencimientos(cursor: RealDictCursor, start: date, end: date) -> list[dict]:
        cursor.execute(
            """
            SELECT
                v.id::text,
                v.fecha,
                v.modelo,
                v.titulo,
                v.descripcion,
                v.categoria,
                v.periodo,
                v.prioridad,
                v.estado,
                v.fuente,
                v.fuente_url,
                COALESCE(COUNT(c.id) FILTER (WHERE c.activo), 0) AS clientes_afectados
            FROM calendario_fiscal_vencimientos v
            LEFT JOIN clientes c
                ON v.aplica_tipo_cliente IS NULL
                OR COALESCE(to_jsonb(c)->>'tipo_cliente', 'Sociedad') = ANY(v.aplica_tipo_cliente)
            WHERE v.fecha BETWEEN %s AND %s
            GROUP BY v.id
            ORDER BY v.fecha ASC,
                CASE v.prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
                v.modelo ASC
            """,
            (start, end),
        )
        rows = cursor.fetchall()
        return [
            {
                **dict(row),
                "clientes_afectados": int(row["clientes_afectados"] or 0),
            }
            for row in rows
        ]

    @staticmethod
    def _build_days(start: date, end: date, by_date: dict[date, list[dict]], today: date) -> list[dict]:
        calendar_start = start - timedelta(days=start.weekday())
        calendar_end = end + timedelta(days=(6 - end.weekday()))
        days: list[dict] = []
        current = calendar_start
        while current <= calendar_end:
            days.append({
                "fecha": current,
                "dia": current.day,
                "fuera_mes": current.month != start.month,
                "es_hoy": current == today,
                "es_fin_semana": current.weekday() >= 5,
                "vencimientos": by_date.get(current, []),
            })
            current += timedelta(days=1)
        return days

    @staticmethod
    def _ensure_schema(cursor: RealDictCursor) -> None:
        """Mantiene operativo el microservicio en instalaciones locales sin migrador automático."""
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS calendario_fiscal_vencimientos (
                id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                fecha               DATE NOT NULL,
                modelo              VARCHAR(20) NOT NULL,
                titulo              VARCHAR(255) NOT NULL,
                descripcion         TEXT,
                categoria           VARCHAR(120) NOT NULL,
                periodo             VARCHAR(80) NOT NULL,
                prioridad           VARCHAR(20) NOT NULL DEFAULT 'media',
                estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                aplica_tipo_cliente TEXT[],
                fuente              VARCHAR(120) NOT NULL DEFAULT 'AEAT',
                fuente_url          TEXT,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT chk_calendario_prioridad
                    CHECK (prioridad IN ('alta', 'media', 'baja')),
                CONSTRAINT chk_calendario_estado
                    CHECK (estado IN ('pendiente', 'presentado', 'en_preparacion', 'no_aplica')),
                CONSTRAINT uq_calendario_vencimiento
                    UNIQUE (fecha, modelo, periodo, titulo)
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_calendario_fecha
                ON calendario_fiscal_vencimientos (fecha)
            """
        )
        CalendarioFiscalService._seed_default_vencimientos(cursor)

    @staticmethod
    def _seed_default_vencimientos(cursor: RealDictCursor) -> None:
        execute_values(
            cursor,
            """
            INSERT INTO calendario_fiscal_vencimientos
                (fecha, modelo, titulo, descripcion, categoria, periodo, prioridad,
                 estado, aplica_tipo_cliente, fuente, fuente_url)
            VALUES %s
            ON CONFLICT (fecha, modelo, periodo, titulo) DO UPDATE SET
                descripcion = EXCLUDED.descripcion,
                categoria = EXCLUDED.categoria,
                prioridad = EXCLUDED.prioridad,
                aplica_tipo_cliente = EXCLUDED.aplica_tipo_cliente,
                fuente = EXCLUDED.fuente,
                fuente_url = EXCLUDED.fuente_url,
                updated_at = NOW()
            """,
            CalendarioFiscalService._default_seed_rows(),
        )

    @staticmethod
    def _default_seed_rows() -> list[tuple]:
        rows = list(CALENDARIO_FISCAL_SEEDS)
        for month in range(1, 13):
            _, last_day = calendar.monthrange(2026, month)
            periodo = CalendarioFiscalService._previous_month_label(2026, month)
            penultimate = date(2026, month, last_day - 1).isoformat()
            last = date(2026, month, last_day).isoformat()
            rows.extend([
                (
                    penultimate,
                    "SLD",
                    "Sistema RED - presentación RNT y bases",
                    "Presentación de liquidación de cotizaciones por Sistema de Liquidación Directa.",
                    "Laboral y Seguridad Social",
                    periodo,
                    "alta",
                    "pendiente",
                    ["Sociedad"],
                    "TGSS",
                    TGSS_SLD_URL,
                ),
                (
                    last,
                    "TGSS",
                    "Seguros sociales - ingreso de cuotas",
                    "Ingreso de cuotas del Régimen General dentro del mes natural siguiente al devengo.",
                    "Laboral y Seguridad Social",
                    periodo,
                    "alta",
                    "pendiente",
                    ["Sociedad"],
                    "TGSS",
                    TGSS_COTIZACION_URL,
                ),
                (
                    last,
                    "RETA",
                    "RETA - ingreso cuota autónomos",
                    "Ingreso mensual de cuotas del Régimen Especial de Trabajadores Autónomos.",
                    "Laboral y Seguridad Social",
                    f"{MONTH_NAMES_ES[month - 1].capitalize()} 2026",
                    "media",
                    "pendiente",
                    ["Autónomo"],
                    "TGSS",
                    TGSS_COTIZACION_URL,
                ),
            ])
        return rows

    @staticmethod
    def _previous_month_label(year: int, month: int) -> str:
        previous_month = 12 if month == 1 else month - 1
        previous_year = year - 1 if month == 1 else year
        return f"{MONTH_NAMES_ES[previous_month - 1].capitalize()} {previous_year}"
