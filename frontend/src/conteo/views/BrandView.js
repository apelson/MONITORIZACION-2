import { BarChart3 } from 'lucide-react';
import { AnimNum, BrandLogo, EmptyState } from '../shared';
import { BRAND_COLORS } from '../constants';

export function BrandView({ data }) {
  if (!data) return <EmptyState text="Sin datos" />;
  const { ranking = [] } = data;
  const maxV = Math.max(...ranking.map(r => (r.total_visits || r.entries || 0)), 1);
  return (
    <div className="view-wrap" data-testid="brand-ranking-view">
      <div className="card">
        <h2 className="card-title"><BarChart3 size={18} /> Ranking por Marca — Hoy</h2>
        <div className="rank-list">
          {ranking.length === 0 && <EmptyState text="Sin datos de camaras" />}
          {ranking.map((item, i) => {
            const val = item.total_visits || item.entries || 0;
            const color = BRAND_COLORS[item.brand_id] || item.brand_color || '#5B8DB8';
            return (
              <div key={item.brand_id} className="brand-row" data-testid={`brand-row-${item.brand_id}`}>
                <div className="brand-row-left">
                  <span className="brand-rank">#{i + 1}</span>
                  <div className="brand-row-logo"><BrandLogo brandId={item.brand_id} size={40} /></div>
                  <span className="brand-row-name">{item.brand_name}</span>
                </div>
                <div className="brand-row-mid">
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / maxV) * 100}%`, background: color }} /></div>
                </div>
                <div className="brand-row-val mono"><AnimNum value={val} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
