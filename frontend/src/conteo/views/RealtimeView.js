import { Users, Camera, Trophy, MapPin, BarChart3 } from 'lucide-react';
import { AnimNum, BrandLogo, EmptyState } from '../shared';

export function RealtimeView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [], totals = {}, cameras_total = 0, cameras_online = 0 } = data;
  return (
    <div className="view-wrap" data-testid="realtime-view">
      <div className="kpi-grid">
        <div className="kpi-card accent-primary">
          <div className="kpi-icon" style={{ background: '#E8F1F8', color: '#4A7CA7' }}><Users size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val mono"><AnimNum value={totals.entries || 0} /></span>
            <span className="kpi-label">Visitas Hoy</span>
          </div>
        </div>
        <div className="kpi-card accent-info">
          <div className="kpi-icon" style={{ background: '#E8EEF5', color: '#5B7FAD' }}><Camera size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val">{cameras_online}/{cameras_total}</span>
            <span className="kpi-label">Camaras Online</span>
          </div>
        </div>
        <div className="kpi-card accent-warning">
          <div className="kpi-icon" style={{ background: '#FDF5E6', color: '#C49030' }}><Trophy size={22} /></div>
          <div className="kpi-data">
            <span className="kpi-val">{ranking.length}</span>
            <span className="kpi-label">Marcas Activas</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><BarChart3 size={18} /> Ranking por Marca — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de camaras — Las camaras estan en la red local" />}
          {ranking.map((item, i) => (
            <div key={item.brand_id} className="rank-row" data-testid={`ranking-item-${item.brand_id}`}>
              <div className={`rank-pos ${i < 3 ? `medal-${i + 1}` : ''}`}>{i + 1}</div>
              <div className="rank-logo"><BrandLogo brandId={item.brand_id} size={36} /></div>
              <div className="rank-name">{item.brand_name}</div>
              <div className="rank-val mono"><AnimNum value={item.entries || 0} /></div>
              <span className="rank-label">visitas</span>
            </div>
          ))}
        </div>
      </div>

      {ranking.some(r => r.cameras?.length > 0) && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 className="card-title"><Camera size={18} /> Detalle por Camara</h2>
          <div className="cam-grid">
            {ranking.flatMap(brand =>
              (brand.cameras || []).map(cam => (
                <div key={cam.camera_id} className="cam-card">
                  <div className="cam-card-top">
                    <span className={`cam-dot ${cam.status}`} />
                    <span className="cam-card-name">{cam.camera_name}</span>
                  </div>
                  <div className="cam-card-brand"><BrandLogo brandId={brand.brand_id} size={14} /><span>{brand.brand_name}</span></div>
                  <div className="cam-card-val"><span className="cam-num">{cam.entries}</span><span className="cam-lbl">visitas</span></div>
                  {cam.island && <div className="cam-card-loc"><MapPin size={10} />{cam.island.replace(/-/g, ' ')}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
