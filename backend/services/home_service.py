from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import get_usuario
from services.clientes_service import ClientesService
from services.fichaje_service import FichajeService
from services.pagos_service import PagosService
from services.trabajos_service import TrabajosService

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


class HomeService:

    @staticmethod
    def get_home(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                fichaje = FichajeService.get_fichaje_resumen(cursor, empleado_id)
                clientes = ClientesService.get_clientes_resumen(cursor, empleado_id)
                trabajos = TrabajosService.get_trabajos_resumen(cursor, empleado_id)
                pagos = PagosService.get_pagos_resumen(cursor, empleado_id)

        return {
            "usuario": {
                "usuario_id": usuario["usuario_id"],
                "empleado_id": usuario["empleado_id"],
                "nombre_usuario": usuario["nombre_usuario"],
                "nombre_completo": f"{usuario['nombre']} {usuario['apellidos']}".strip(),
                "rol": usuario["rol"],
            },
            "funcionalidades": _FUNCIONALIDADES,
            "fichaje": fichaje,
            "clientes": clientes,
            "trabajos": trabajos,
            "pagos": pagos,
        }
