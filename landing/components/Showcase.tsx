'use client';

import { useState } from 'react';
import RevealWrapper from './RevealWrapper';

type Tab = 'Dashboard' | 'Clientes' | 'Trabajos' | 'Pagos';

const TABS: Tab[] = ['Dashboard', 'Clientes', 'Trabajos', 'Pagos'];

export default function Showcase() {
  const [active, setActive] = useState<Tab>('Dashboard');

  return (
    <section className="showcase">
      <div className="wrap">
        <RevealWrapper>
          <div className="section-head">
            <span className="eyebrow">Interfaz</span>
            <h2>Una app que da gusto usar</h2>
            <p>Diseñada para la productividad: cada módulo donde lo necesitas, sin perder el tiempo.</p>
          </div>
        </RevealWrapper>

        <RevealWrapper>
          <div className="showcase__hero">
            {/* macOS chrome */}
            <div className="showcase__chrome">
              <i /><i /><i />
              <span>gestoria.app / {active.toLowerCase()}</span>
            </div>

            {/* App mockup frame */}
            <div className="showcase__frame">
              {active === 'Dashboard' && <DashboardMock />}
              {active === 'Clientes' && <ClientesMock />}
              {active === 'Trabajos' && <TrabajosMock />}
              {active === 'Pagos' && <PagosMock />}
            </div>
          </div>

          {/* Tab pills */}
          <div className="showcase__pills">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`showcase__pill${active === tab ? ' is-active' : ''}`}
                onClick={() => setActive(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

/* ---- Mini app mockups per tab ---- */

function DashboardMock() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1e1a', display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', color: '#f3ecda', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, opacity: 0.8 }}>Dashboard · mayo 2026</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { l: 'Clientes', v: '47' },
          { l: 'Trabajos', v: '12' },
          { l: 'Facturado', v: '€8.4k' },
          { l: 'Pendiente', v: '€2.1k' },
        ].map((k) => (
          <div key={k.l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '10px', opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{k.l}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', flex: 1 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.45, marginBottom: '10px' }}>Actividad reciente</div>
          {['Factura #2041 pagada', 'Trabajo vence mañana', 'Nuevo cliente añadido', 'Fichaje olvidado — ayer'].map((t, i) => (
            <div key={i} style={{ fontSize: '12px', opacity: 0.65, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ['#57b59a', '#f0b63e', '#57b59a', '#e05b5b'][i], flexShrink: 0, display: 'inline-block' }} />
              {t}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.45, marginBottom: '10px' }}>Evolución cobros</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
            {[30, 55, 40, 70, 60, 85, 65, 95, 75, 100, 80, 90].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: h >= 90 ? '#3f9a82' : '#275448', opacity: h >= 90 ? 1 : 0.65 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientesMock() {
  const rows = [
    { nombre: 'Garaje Pons SL', tipo: 'Empresa', estado: 'Activo', trabajos: 3, facturado: '€1.200' },
    { nombre: 'María López García', tipo: 'Particular', estado: 'Activo', trabajos: 1, facturado: '€350' },
    { nombre: 'Papelería Norte CB', tipo: 'Empresa', estado: 'Activo', trabajos: 2, facturado: '€870' },
    { nombre: 'Muebles Ibérica SA', tipo: 'Empresa', estado: 'Inactivo', trabajos: 0, facturado: '€0' },
    { nombre: 'Carlos Ruiz Moreno', tipo: 'Particular', estado: 'Activo', trabajos: 1, facturado: '€480' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1e1a', display: 'flex', flexDirection: 'column', color: '#f3ecda', fontFamily: 'var(--font-sans)', overflowY: 'auto' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>Clientes</span>
        <span style={{ background: '#275448', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Nuevo</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['Nombre', 'Tipo', 'Estado', 'Trabajos', 'Facturado'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', opacity: 0.45, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, opacity: 0.9 }}>{r.nombre}</td>
                <td style={{ padding: '10px 16px', opacity: 0.55 }}>{r.tipo}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: r.estado === 'Activo' ? 'rgba(63,154,130,0.2)' : 'rgba(255,255,255,0.07)', color: r.estado === 'Activo' ? '#57b59a' : 'rgba(243,236,218,0.4)', padding: '3px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600 }}>{r.estado}</span>
                </td>
                <td style={{ padding: '10px 16px', opacity: 0.6, textAlign: 'center' }}>{r.trabajos}</td>
                <td style={{ padding: '10px 16px', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>{r.facturado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrabajosMock() {
  const cols: { title: string; color: string; items: string[] }[] = [
    { title: 'Pendiente', color: '#f0b63e', items: ['Renta 2025 — López', 'IVA T1 — Garaje Pons'] },
    { title: 'En curso', color: '#3f9a82', items: ['IS 2024 — Papelería Norte', 'Contabilidad Mayo — Ruiz'] },
    { title: 'Finalizado', color: '#57b59a', items: ['Renta 2024 — Gómez', 'Nóminas Abr — Ibérica'] },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1e1a', display: 'flex', flexDirection: 'column', color: '#f3ecda', fontFamily: 'var(--font-sans)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: '14px' }}>Trabajos — Kanban</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px', flex: 1 }}>
        {cols.map((col) => (
          <div key={col.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: col.color, marginBottom: '4px' }}>{col.title}</div>
            {col.items.map((item) => (
              <div key={item} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', opacity: 0.8 }}>{item}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PagosMock() {
  const rows = [
    { factura: '#2041', cliente: 'Garaje Pons SL', estado: 'Pagada', total: '€1.200', pendiente: '€0' },
    { factura: '#2040', cliente: 'Papelería Norte', estado: 'Parcial', total: '€870', pendiente: '€370' },
    { factura: '#2039', cliente: 'Muebles Ibérica', estado: 'Vencida', total: '€540', pendiente: '€540' },
    { factura: '#2038', cliente: 'Carlos Ruiz', estado: 'Emitida', total: '€480', pendiente: '€480' },
  ];
  const badgeColor: Record<string, { bg: string; fg: string }> = {
    Pagada: { bg: 'rgba(63,154,130,0.2)', fg: '#57b59a' },
    Parcial: { bg: 'rgba(240,182,62,0.2)', fg: '#f0b63e' },
    Vencida: { bg: 'rgba(224,91,91,0.2)', fg: '#e05b5b' },
    Emitida: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(243,236,218,0.6)' },
  };
  return (
    <div style={{ width: '100%', height: '100%', background: '#0d1e1a', display: 'flex', flexDirection: 'column', color: '#f3ecda', fontFamily: 'var(--font-sans)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: '14px' }}>Pagos y facturas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '14px 20px' }}>
        {[
          { l: 'Cobrado 30d', v: '€8.400', sub: 'últimos 30 días' },
          { l: 'Pendiente', v: '€1.390', sub: 'por cobrar' },
          { l: 'Vencido', v: '€540', sub: 'sin cobrar' },
        ].map((k) => (
          <div key={k.l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '10px', opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{k.l}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>{k.v}</div>
            <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '2px' }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['Nº', 'Cliente', 'Estado', 'Total', 'Pendiente'].map((h) => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', opacity: 0.4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = badgeColor[r.estado];
              return (
                <tr key={r.factura} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>{r.factura}</td>
                  <td style={{ padding: '10px 16px', opacity: 0.8 }}>{r.cliente}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: c.bg, color: c.fg, padding: '3px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600 }}>{r.estado}</span>
                  </td>
                  <td style={{ padding: '10px 16px', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>{r.total}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: r.pendiente === '€0' ? '#57b59a' : r.estado === 'Vencida' ? '#e05b5b' : 'rgba(243,236,218,0.8)' }}>{r.pendiente}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
