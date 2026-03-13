import { MapPin } from 'lucide-react';
import { AnimNum, BrandLogo, EmptyState } from '../shared';

export function CenterView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;
  return (
    <div className="view-wrap" data-testid="center-ranking-view">
      <div className="card">
        <h2 className="card-title"><MapPin size={18} /> Ranking por Centro — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de centros" />}
          {ranking.map((item, i) => (
            <div key={item.center_id} className="rank-row" data-testid={`center-item-${item.center_id}`}>
              <div className={`rank-pos ${i < 3 ? `medal-${i + 1}` : ''}`}>{i + 1}</div>
              <div className="rank-logo"><BrandLogo brandId={item.brand_id} size={24} /></div>
              <div className="rank-name">{item.center_name}</div>
              <div className="rank-val mono"><AnimNum value={item.total_visits || 0} /></div>
              <span className="rank-label">visitas</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
