import { useState, useEffect } from 'react';
import { Flame, RefreshCw, Database, Trash2 } from 'lucide-react';

export function HeatmapView({ data, api, onRefresh }) {
  const [cameras, setCameras] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [rangeType, setRangeType] = useState('yesterday');
  const [customDate, setCustomDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewingHeatmap, setViewingHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

  useEffect(() => {
    const load = async () => {
      try {
        const [camRes, histRes] = await Promise.all([
          api('get', '/heatmap/cameras'),
          api('get', '/heatmap/history?limit=50')
        ]);
        const cams = camRes.data?.cameras || [];
        setCameras(cams);
        setHistory(histRes.data?.heatmaps || []);
        if (cams.length > 0) setSelectedCam(cams[0].camera_id);
        if (histRes.data?.heatmaps?.length > 0) setViewingHeatmap(histRes.data.heatmaps[0].heatmap_id);
      } catch (err) { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [api]);

  const ranges = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'custom', label: 'Fecha Especifica' },
  ];

  const generateHeatmap = async () => {
    if (!selectedCam) return;
    setGenerating(true);
    try {
      let url = `/heatmap/generate?camera_id=${selectedCam}&range_type=${rangeType}`;
      if (rangeType === 'custom' && customDate) url += `&custom_date=${customDate}`;
      const res = await api('post', url);
      setHistory(prev => [res.data, ...prev]);
      setViewingHeatmap(res.data.heatmap_id);
    } catch (err) {
      alert('Error generando heatmap: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const deleteHeatmap = async (id) => {
    try {
      await api('delete', `/heatmap/${id}`);
      setHistory(prev => prev.filter(h => h.heatmap_id !== id));
      if (viewingHeatmap === id) setViewingHeatmap(null);
    } catch (err) { /* ignore */ }
  };

  const getToken = () => {
    try { const a = JSON.parse(localStorage.getItem('conteo_auth')); return a?.token || ''; } catch { return ''; }
  };

  if (loading) return (
    <div className="empty-state">
      <RefreshCw size={32} className="spin" style={{ color: '#5B8DB8' }} />
      <p style={{ marginTop: 12 }}>Cargando camaras...</p>
    </div>
  );

  if (cameras.length === 0) return (
    <div className="empty-state" data-testid="heatmap-no-cameras">
      <Flame size={48} style={{ color: '#64748B', marginBottom: 16 }} />
      <h3>Sin camaras con Heatmap</h3>
      <p>Configura el perfil de heatmap (heatmap_profile) en las camaras para activar esta funcion.</p>
    </div>
  );

  return (
    <div className="heatmap-view" data-testid="heatmap-view">
      <div className="heatmap-controls">
        <div className="heatmap-ctrl-group">
          <label className="heatmap-label">Camara</label>
          <select className="heatmap-select" value={selectedCam} onChange={e => setSelectedCam(e.target.value)} data-testid="heatmap-camera-select">
            {cameras.map(c => <option key={c.camera_id} value={c.camera_id}>{c.camera_name} ({c.island})</option>)}
          </select>
        </div>
        <div className="heatmap-ctrl-group">
          <label className="heatmap-label">Periodo</label>
          <div className="heatmap-range-btns">
            {ranges.map(r => (
              <button key={r.id} className={`hm-range-btn ${rangeType === r.id ? 'active' : ''}`}
                onClick={() => setRangeType(r.id)} data-testid={`heatmap-range-${r.id}`}>{r.label}</button>
            ))}
          </div>
        </div>
        {rangeType === 'custom' && (
          <div className="heatmap-ctrl-group">
            <label className="heatmap-label">Fecha</label>
            <input type="date" className="heatmap-date" value={customDate} onChange={e => setCustomDate(e.target.value)} data-testid="heatmap-custom-date" />
          </div>
        )}
        <button className="heatmap-gen-btn" onClick={generateHeatmap} disabled={generating} data-testid="heatmap-generate-btn">
          {generating ? <><RefreshCw size={14} className="spin" /> Generando...</> : <><Flame size={14} /> Generar Heatmap</>}
        </button>
      </div>

      <div className="heatmap-layout">
        <div className="heatmap-viewer" data-testid="heatmap-viewer">
          {viewingHeatmap ? (
            <img src={`${API_BASE}/heatmap/image/${viewingHeatmap}?token=${getToken()}`}
              alt="Heatmap" className="heatmap-image" data-testid="heatmap-image" />
          ) : (
            <div className="heatmap-placeholder">
              <Flame size={56} />
              <p>Selecciona un heatmap del historial o genera uno nuevo</p>
            </div>
          )}
        </div>

        <div className="heatmap-history" data-testid="heatmap-history">
          <div className="heatmap-hist-title">
            <Database size={14} /> Historial ({history.length})
          </div>
          <div className="heatmap-hist-list">
            {history.map(hm => (
              <div key={hm.heatmap_id}
                className={`heatmap-hist-card ${viewingHeatmap === hm.heatmap_id ? 'active' : ''}`}
                onClick={() => setViewingHeatmap(hm.heatmap_id)}>
                <div className="hm-hist-info">
                  <span className="hm-hist-cam">{hm.camera_name || hm.camera_id}</span>
                  <span className="hm-hist-range">{hm.range_type} {hm.custom_range ? `(${hm.custom_range})` : ''}</span>
                  <span className="hm-hist-date">{new Date(hm.generated_at).toLocaleString('es-ES')}</span>
                </div>
                <button className="hm-hist-del" onClick={e => { e.stopPropagation(); deleteHeatmap(hm.heatmap_id); }} title="Eliminar">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {history.length === 0 && <p className="hm-hist-empty">Sin heatmaps almacenados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
