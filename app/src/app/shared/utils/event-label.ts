export function formatEventLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Sin evento';
  }

  switch (value) {
    case 'entrada':
      return 'Entrada';
    case 'salida':
      return 'Salida';
    case 'pausa_inicio':
      return 'Inicio de pausa';
    case 'pausa_fin':
      return 'Fin de pausa';
    default:
      return value.replace(/_/g, ' ');
  }
}
