from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import get_usuario

_FUNCIONALIDADES = [
    {
        "clave": "fichaje",
        "titulo": "Fichaje",
        "descripcion": "Registro diario de entrada y salida de jornada laboral.",
        "ruta": "/fichaje",
    },
    {
        "clave": "clientes",
        "titulo": "Gestión de clientes",
        "descripcion": "Consulta y administración de clientes activos e históricos.",
        "ruta": "/clientes",
    },
    {
        "clave": "trabajos",
        "titulo": "Gestión de trabajos",
        "descripcion": "Seguimiento de expedientes, estados y prioridades de trabajos.",
        "ruta": "/trabajos",
    },
    {
        "clave": "pagos",
        "titulo": "Pagos",
        "descripcion": "Control de cobros, facturas pendientes y vencimientos.",
        "ruta": "/pagos",
    },
]


_RESUMEN_MENSUAL_DEFAULTS = {
    "total_facturado": 0,
    "total_cobrado": 0,
    "trabajos_nuevos": 0,
    "trabajos_cerrados": 0,
    "clientes_nuevos": 0,
    "horas_trabajadas": 0,
    "clientes_total": 0,
    "clientes_activos": 0,
    "trabajos_total": 0,
    "trabajos_pendientes": 0,
    "trabajos_en_curso": 0,
    "trabajos_bloqueados": 0,
    "trabajos_finalizados": 0,
    "trabajos_cancelados": 0,
    "facturas_emitidas_mes": 0,
    "pendiente_total": 0,
    "pendiente_count": 0,
    "facturas_vencidas": 0,
    "vencido_total": 0,
}


class HomeService:

    @staticmethod
    def get_home(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen_mensual = HomeService._get_resumen_mensual_actual(cursor)
                fichaje = HomeService._get_fichaje_resumen(cursor, empleado_id)

        return {
            "usuario": {
                "usuario_id": usuario["usuario_id"],
                "empleado_id": usuario["empleado_id"],
                "nombre_usuario": usuario["nombre_usuario"],
                "nombre_completo": f"{usuario['nombre']} {usuario['apellidos']}".strip(),
                "rol": usuario["rol"],
            },
            "funcionalidades": _FUNCIONALIDADES,
            "resumen_mensual": resumen_mensual,
            "fichaje": fichaje,
            "clientes": {
                "total": resumen_mensual["clientes_total"],
                "activos": resumen_mensual["clientes_activos"],
            },
            "trabajos": {
                "total": resumen_mensual["trabajos_total"],
                "pendientes": resumen_mensual["trabajos_pendientes"],
                "en_curso": resumen_mensual["trabajos_en_curso"],
                "bloqueados": resumen_mensual["trabajos_bloqueados"],
                "finalizados": resumen_mensual["trabajos_finalizados"],
                "cancelados": resumen_mensual["trabajos_cancelados"],
            },
            "pagos": {
                "cobrado_mes": resumen_mensual["total_cobrado"],
                "facturado_mes": resumen_mensual["total_facturado"],
                "facturas_emitidas_mes": resumen_mensual["facturas_emitidas_mes"],
                "pendiente_total": resumen_mensual["pendiente_total"],
                "pendiente_count": resumen_mensual["pendiente_count"],
                "facturas_vencidas": resumen_mensual["facturas_vencidas"],
                "vencido_total": resumen_mensual["vencido_total"],
            },
        }

    @staticmethod
    def get_resumen_mensual(year: int, month: int) -> dict:
        periodo = f"{year}-{month:02d}"
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                return HomeService._get_resumen_mensual(cursor, periodo, year, month)

    @staticmethod
    def _get_resumen_mensual_actual(cursor: RealDictCursor) -> dict:
        cursor.execute(
            """
            SELECT
                TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS periodo,
                EXTRACT(YEAR FROM CURRENT_DATE)::INT AS anio,
                EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_num
            """
        )
        current = cursor.fetchone() or {}
        return HomeService._get_resumen_mensual(
            cursor,
            current.get("periodo"),
            int(current.get("anio") or 0),
            int(current.get("mes_num") or 0),
        )

    @staticmethod
    def _get_resumen_mensual(cursor: RealDictCursor, periodo: str, year: int, month: int) -> dict:
        cursor.execute(
            "SELECT * FROM v_resumen_mensual WHERE periodo = %s",
            (periodo,),
        )
        row = dict(cursor.fetchone() or {})
        row.setdefault("periodo", periodo)
        row.setdefault("anio", year)
        row.setdefault("mes_num", month)
        for key, default in _RESUMEN_MENSUAL_DEFAULTS.items():
            row.setdefault(key, default)

        float_fields = {
            "total_facturado",
            "total_cobrado",
            "horas_trabajadas",
            "pendiente_total",
            "vencido_total",
        }
        normalized = {}
        for key, value in row.items():
            if key in float_fields:
                normalized[key] = float(value or 0)
            elif key in _RESUMEN_MENSUAL_DEFAULTS or key in {"anio", "mes_num"}:
                normalized[key] = int(value or 0)
            else:
                normalized[key] = value
        return normalized

    @staticmethod
    def _get_fichaje_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS eventos_hoy,
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'entrada'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS entradas_hoy,
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'salida'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS salidas_hoy,
                (ARRAY_AGG(tipo_evento::text ORDER BY fecha_hora DESC))[1] AS ultimo_evento_tipo,
                MAX(fecha_hora) AS ultimo_evento_fecha_hora
            FROM fichajes
            WHERE empleado_id = %s
            """,
            (empleado_id,),
        )
        row = cursor.fetchone() or {}
        entradas_hoy = int(row.get("entradas_hoy") or 0)
        salidas_hoy = int(row.get("salidas_hoy") or 0)
        return {
            "eventos_hoy": int(row.get("eventos_hoy") or 0),
            "ultimo_evento_tipo": row.get("ultimo_evento_tipo"),
            "ultimo_evento_fecha_hora": row.get("ultimo_evento_fecha_hora"),
            "turno_activo": entradas_hoy > salidas_hoy,
        }
