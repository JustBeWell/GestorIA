"use client";

import { useEffect, useRef, useState } from 'react';
import RevealWrapper from './RevealWrapper';

const GRAPH_ITEMS = [
  {
    key: 'ia',
    title: 'IA',
    desc: 'Automatiza tareas repetitivas y recomienda prioridades para que el equipo cierre mas trabajo en menos tiempo.',
  },
  {
    key: 'cliente',
    title: 'CLIENTE',
    desc: 'Ficha unica con vision 360 para responder mas rapido y mejorar la calidad de servicio desde el primer contacto.',
  },
  {
    key: 'trabajo',
    title: 'TRABAJO',
    desc: 'Kanban operativo para mover expedientes sin bloqueos, con responsables, plazos y estado siempre claros.',
  },
  {
    key: 'pagos',
    title: 'PAGOS',
    desc: 'Facturacion y cobros conectados a la operativa real para mejorar caja y reducir pendientes de forma continua.',
  },
  {
    key: 'fichaje',
    title: 'FICHAJE',
    desc: 'Control horario simple y trazable para cumplir normativa sin anadir friccion al dia a dia del equipo.',
  },
  {
    key: 'control',
    title: 'CONTROL',
    desc: 'Auditoria, vencimientos y seguridad reforzada para escalar el despacho con menos riesgo operativo.',
  },
  {
    key: 'portal',
    title: 'EFICIENCIA',
    desc: 'Todo en un solo sistema: menos cambios de herramienta, menos friccion operativa y mas tiempo para trabajo de valor.',
  },
];

export default function FeatureGraph() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedItem = GRAPH_ITEMS.find((item) => item.key === selectedKey) ?? null;
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedKey) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedNode = target.closest('.roadmap-marketing__node');
      const clickedPopover = popoverRef.current?.contains(target);

      if (!clickedNode && !clickedPopover) {
        setSelectedKey(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [selectedKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedKey(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <section className="roadmap-marketing" id="roadmap">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head roadmap-marketing__head">
            <span className="eyebrow">Ecosistema GestorIA</span>
            <h2>Todo conectado. Todo bajo control.</h2>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="roadmap-marketing__graph-wrap">
            <div
              className="roadmap-marketing__graph"
              role="group"
              aria-label="Grafo de funcionalidades conectadas por IA"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedKey(null);
                }
              }}
            >
              <span className="roadmap-marketing__link roadmap-marketing__link--cliente" aria-hidden="true" />
              <span className="roadmap-marketing__link roadmap-marketing__link--trabajo" aria-hidden="true" />
              <span className="roadmap-marketing__link roadmap-marketing__link--pagos" aria-hidden="true" />
              <span className="roadmap-marketing__link roadmap-marketing__link--fichaje" aria-hidden="true" />
              <span className="roadmap-marketing__link roadmap-marketing__link--control" aria-hidden="true" />
              <span className="roadmap-marketing__link roadmap-marketing__link--portal" aria-hidden="true" />

              {GRAPH_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`roadmap-marketing__node roadmap-marketing__node--${item.key}${item.key !== 'ia' ? ' roadmap-marketing__node--module' : ''}${selectedKey === item.key ? ' is-active' : ''}`}
                  onClick={() => setSelectedKey(item.key)}
                  aria-haspopup="true"
                  aria-expanded={selectedKey === item.key}
                >
                  {item.title}
                </button>
              ))}

              {selectedItem && (
                <div
                  ref={popoverRef}
                  className={`roadmap-marketing__popover roadmap-marketing__popover--${selectedItem.key}`}
                  role="status"
                  aria-live="polite"
                >
                  <h3>{selectedItem.title}</h3>
                  <p>{selectedItem.desc}</p>
                </div>
              )}
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}