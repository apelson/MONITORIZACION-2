import { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, Camera, TrendingUp, BarChart3, Plus, Trash2, Edit3,
  Save, Check, Download, Target, FileSpreadsheet
} from 'lucide-react';
import { AnimNum, BrandLogo, TrendBadge } from '../shared';
import { ALL_BRANDS, ALL_ISLANDS } from '../constants';

export function ExecutiveView({ data, api }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ brand_id: '', target_visits: '', label: '' });
  const [editingGoal, setEditingGoal] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [exportRange, setExportRange] = useState({ from: '', to: '' });
  const [exportBrand, setExportBrand] = useState('');
  const [exportIsland, setExportIsland] = useState('');
  const API_BASE = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

  const {
    today_total = 0, yesterday_total = 0, day_change_pct = 0,
    month_total = 0, daily_avg = 0, cameras_total = 0, cameras_online = 0,
    goals_progress = [], month = '',
    comparison_week = {}, comparison_month = {}
  } = data || {};

  const refreshGoals = useCallback(async () => {
    try {
      const res = await api('get', `/goals?month=${month || new Date().toISOString().slice(0, 7)}`);
      setGoals(res.data?.goals || []);
    } catch {}
  }, [api, month]);

  useEffect(() => { refreshGoals(); }, [refreshGoals]);

  const saveGoal = async () => {
    if (!newGoal.brand_id || !newGoal.target_visits) return;
    try {
      await api('post', '/goals', {
        brand_id: newGoal.brand_id,
        month: month || new Date().toISOString().slice(0, 7),
        target_visits: parseInt(newGoal.target_visits),
        label: newGoal.label
      });
      setShowGoalForm(false);
      setNewGoal({ brand_id: '', target_visits: '', label: '' });
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const updateGoal = async () => {
    if (!editingGoal) return;
    try {
      await api('post', '/goals', {
        brand_id: editingGoal.brand_id,
        month: month || new Date().toISOString().slice(0, 7),
        target_visits: parseInt(editingGoal.target_visits),
        label: editingGoal.label || ''
      });
      setEditingGoal(null);
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const deleteGoal = async (goalId) => {
    if (!window.confirm('Eliminar este objetivo?')) return;
    try {
      await api('delete', `/goals/${goalId}`);
      refreshGoals();
    } catch (err) { alert('Error: ' + (err.response?.data?.detail || err.message)); }
  };

  const getToken = () => {
    try { const a = JSON.parse(localStorage.getItem('conteo_auth')); return a?.token || ''; } catch { return ''; }
  };

  const exportCSV = () => {
    if (!exportRange.from || !exportRange.to) return alert('Selecciona fechas');
    let url = `${API_BASE}/analytics/export?from_date=${exportRange.from}&to_date=${exportRange.to}&token=${getToken()}`;
    if (exportBrand) url += `&brand_id=${exportBrand}`;
    if (exportIsland) url += `&island=${exportIsland}`;
    window.open(url);
  };

  return (
    <div className="exec-view" data-testid="executive-view">
      <div className="exec-kpis">
        <div className="exec-kpi-card exec-kpi-primary" data-testid="exec-kpi-today">
          <div className="exec-kpi-icon"><Users size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={today_total} /></span>
            <span className="exec-kpi-label">Visitas hoy</span>
          </div>
          <TrendBadge current={today_total} previous={yesterday_total} />
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-yesterday">
          <div className="exec-kpi-icon" style={{color:'#94A3B8'}}><Clock size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={yesterday_total} /></span>
            <span className="exec-kpi-label">Ayer</span>
          </div>
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-month">
          <div className="exec-kpi-icon" style={{color:'#E8A83E'}}><TrendingUp size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono"><AnimNum value={month_total} /></span>
            <span className="exec-kpi-label">Este mes</span>
          </div>
          <span className="exec-kpi-sub">{daily_avg}/dia</span>
        </div>
        <div className="exec-kpi-card" data-testid="exec-kpi-cameras">
          <div className="exec-kpi-icon" style={{color:'#22c55e'}}><Camera size={22} /></div>
          <div className="exec-kpi-data">
            <span className="exec-kpi-val mono">{cameras_online}/{cameras_total}</span>
            <span className="exec-kpi-label">Camaras online</span>
          </div>
        </div>
      </div>

      <div className="exec-grid">
        <div className="exec-panel" data-testid="exec-comparison">
          <div className="exec-panel-title"><BarChart3 size={16} /> COMPARATIVA</div>
          <div className="exec-comp-cards">
            <div className="exec-comp-card">
              <span className="exec-comp-period">{comparison_week.label_current || 'Esta semana'}</span>
              <span className="exec-comp-val mono"><AnimNum value={comparison_week.current_total || 0} /></span>
              <div className="exec-comp-vs">
                <span>vs {comparison_week.label_previous || 'anterior'}: {(comparison_week.previous_total || 0).toLocaleString('es-ES')}</span>
                <TrendBadge current={comparison_week.current_total || 0} previous={comparison_week.previous_total || 0} />
              </div>
            </div>
            <div className="exec-comp-card">
              <span className="exec-comp-period">{comparison_month.label_current || 'Este mes'}</span>
              <span className="exec-comp-val mono"><AnimNum value={comparison_month.current_total || 0} /></span>
              <div className="exec-comp-vs">
                <span>vs {comparison_month.label_previous || 'anterior'}: {(comparison_month.previous_total || 0).toLocaleString('es-ES')}</span>
                <TrendBadge current={comparison_month.current_total || 0} previous={comparison_month.previous_total || 0} />
              </div>
            </div>
          </div>
          {(comparison_week.brand_comparison || []).length > 0 && (
            <div className="exec-brand-comp">
              <span className="exec-sub-title">Por marca (semana)</span>
              {comparison_week.brand_comparison.map(bc => {
                const brand = ALL_BRANDS.find(b => b.id === bc.brand_id);
                return (
                  <div key={bc.brand_id} className="exec-brand-row">
                    <BrandLogo brandId={bc.brand_id} size={20} />
                    <span className="exec-brand-name">{brand?.name || bc.brand_id}</span>
                    <span className="mono" style={{fontSize:'0.82rem'}}>{bc.current.toLocaleString('es-ES')}</span>
                    <TrendBadge current={bc.current} previous={bc.previous} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="exec-panel" data-testid="exec-goals">
          <div className="exec-panel-title">
            <Target size={16} style={{color:'#E8A83E'}} /> OBJETIVOS {month}
            <button className="exec-add-btn" onClick={() => { setShowGoalForm(!showGoalForm); setEditingGoal(null); }} data-testid="exec-add-goal">
              <Plus size={14} />
            </button>
          </div>
          {showGoalForm && (
            <div className="exec-goal-form" data-testid="goal-form">
              <select value={newGoal.brand_id} onChange={e => setNewGoal({...newGoal, brand_id: e.target.value})} className="heatmap-select" data-testid="goal-brand-select">
                <option value="">Marca...</option>
                {ALL_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="number" placeholder="Objetivo visitas" value={newGoal.target_visits}
                onChange={e => setNewGoal({...newGoal, target_visits: e.target.value})} className="heatmap-date" data-testid="goal-target-input" />
              <input type="text" placeholder="Etiqueta (opcional)" value={newGoal.label}
                onChange={e => setNewGoal({...newGoal, label: e.target.value})} className="heatmap-date" data-testid="goal-label-input" />
              <button onClick={saveGoal} className="heatmap-gen-btn" style={{padding:'0.4rem 0.8rem'}} data-testid="goal-save-btn"><Save size={14} /> Guardar</button>
            </div>
          )}
          {goals_progress.length > 0 ? goals_progress.map(g => {
            const brand = ALL_BRANDS.find(b => b.id === g.brand_id);
            const color = g.pct >= 100 ? '#22c55e' : g.pct >= 60 ? '#E8A83E' : '#ef4444';
            const goalDoc = goals.find(gl => gl.brand_id === g.brand_id);
            const isEditing = editingGoal?.brand_id === g.brand_id;
            return (
              <div key={g.brand_id} className="exec-goal-row" data-testid={`goal-${g.brand_id}`}>
                <div className="exec-goal-header">
                  <BrandLogo brandId={g.brand_id} size={24} />
                  <span className="exec-goal-brand">{brand?.name || g.brand_id}</span>
                  <span className="exec-goal-pct mono" style={{color}}>{g.pct}%</span>
                  <div className="exec-goal-actions">
                    <button className="exec-goal-action-btn" onClick={() => setEditingGoal(isEditing ? null : { brand_id: g.brand_id, target_visits: g.target, label: g.label || '' })} data-testid={`goal-edit-${g.brand_id}`} title="Editar">
                      <Edit3 size={12} />
                    </button>
                    {goalDoc && (
                      <button className="exec-goal-action-btn del" onClick={() => deleteGoal(goalDoc.goal_id)} data-testid={`goal-delete-${g.brand_id}`} title="Eliminar">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="exec-goal-edit-form" data-testid={`goal-edit-form-${g.brand_id}`}>
                    <input type="number" value={editingGoal.target_visits} onChange={e => setEditingGoal({...editingGoal, target_visits: e.target.value})} className="heatmap-date" placeholder="Nuevo objetivo" />
                    <input type="text" value={editingGoal.label} onChange={e => setEditingGoal({...editingGoal, label: e.target.value})} className="heatmap-date" placeholder="Etiqueta" />
                    <button onClick={updateGoal} className="heatmap-gen-btn" style={{padding:'0.3rem 0.6rem', fontSize:'0.72rem'}}><Check size={12} /> Aplicar</button>
                  </div>
                )}
                <div className="exec-goal-bar-bg">
                  <div className="exec-goal-bar" style={{width: `${Math.min(g.pct, 100)}%`, background: color}} />
                  {g.projected_pct > 0 && g.projected_pct < 200 && (
                    <div className="exec-goal-projected" style={{left: `${Math.min(g.projected_pct, 100)}%`}} title={`Proyeccion: ${g.projected_pct}%`} />
                  )}
                </div>
                <div className="exec-goal-details">
                  <span>{g.actual.toLocaleString('es-ES')} / {g.target.toLocaleString('es-ES')}</span>
                  <span style={{color: g.projected_pct >= 100 ? '#22c55e' : '#E8A83E'}}>
                    Proyeccion: {g.projected.toLocaleString('es-ES')} ({g.projected_pct}%)
                  </span>
                </div>
              </div>
            );
          }) : <p className="hm-hist-empty">Sin objetivos definidos. Pulsa + para crear uno.</p>}
        </div>

        <div className="exec-panel exec-export-panel" data-testid="exec-export">
          <div className="exec-panel-title"><FileSpreadsheet size={16} /> EXPORTAR DATOS</div>
          <div className="exec-export-form">
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Desde</label>
              <input type="date" className="heatmap-date" value={exportRange.from}
                onChange={e => setExportRange({...exportRange, from: e.target.value})} data-testid="export-from" />
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Hasta</label>
              <input type="date" className="heatmap-date" value={exportRange.to}
                onChange={e => setExportRange({...exportRange, to: e.target.value})} data-testid="export-to" />
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Marca</label>
              <select className="heatmap-select" value={exportBrand} onChange={e => setExportBrand(e.target.value)} data-testid="export-brand-filter">
                <option value="">Todas</option>
                {ALL_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="heatmap-ctrl-group">
              <label className="heatmap-label">Isla</label>
              <select className="heatmap-select" value={exportIsland} onChange={e => setExportIsland(e.target.value)} data-testid="export-island-filter">
                <option value="">Todas</option>
                {ALL_ISLANDS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <button className="heatmap-gen-btn" onClick={exportCSV} data-testid="export-btn">
              <Download size={14} /> Descargar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
