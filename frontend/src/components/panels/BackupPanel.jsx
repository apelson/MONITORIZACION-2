/**
 * BackupPanel - System backup management component
 * Extracted from App.js for better maintainability
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Archive, HardDrive, Download, FolderArchive, RotateCcw, Upload,
  Plus, Trash2, Info, FileIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

const BackupPanel = ({ authAxios }) => {
  const { t } = useTranslation();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const fileInputRef = useRef(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await authAxios.get("/backup/list");
      setBackups(res.data.backups || []);
    } catch (e) { console.error("Error fetching backups:", e); }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleDownload = async (format = "json") => {
    setDownloading(true);
    try {
      const endpoint = format === "zip" ? "/backup/download-zip" : "/backup/download";
      const response = await authAxios.get(`${endpoint}?include_history=${includeHistory}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.setAttribute('download', `siempria_backup_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Backup descargado correctamente");
    } catch (e) {
      console.error("Download error:", e);
      toast.error("Error al descargar backup");
    }
    setDownloading(false);
  };

  const handleCreateAuto = async () => {
    setCreating(true);
    try {
      await authAxios.post(`/backup/create-auto?include_history=${includeHistory}`);
      toast.success("Backup creado en el servidor");
      fetchBackups();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear backup");
    }
    setCreating(false);
  };

  const handleRestore = async (file) => {
    if (!file) return;
    if (!window.confirm("ADVERTENCIA: Restaurar un backup reemplazara todos los datos actuales. Continuar?")) {
      return;
    }
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await authAxios.post(`/backup/restore?merge=${mergeMode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Backup restaurado correctamente. Recargando...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      console.error("Restore error:", e);
      toast.error(e.response?.data?.detail || "Error al restaurar backup");
    }
    setRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadServerBackup = async (filename) => {
    try {
      const response = await authAxios.get(`/backup/auto/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Backup descargado");
    } catch (e) {
      toast.error("Error al descargar");
    }
  };

  const handleDeleteServerBackup = async (filename) => {
    if (!window.confirm(`Eliminar backup ${filename}?`)) return;
    try {
      await authAxios.delete(`/backup/auto/${filename}`);
      toast.success("Backup eliminado");
      fetchBackups();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card data-testid="backup-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-blue-600" />
          Sistema de Backup
        </CardTitle>
        <CardDescription>Crea, descarga y restaura copias de seguridad de tus datos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Descargar Backup</p>
              <p className="text-sm text-blue-700">Descarga una copia completa de todos tus datos</p>
            </div>
            <HardDrive className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={includeHistory} onCheckedChange={setIncludeHistory} />
            <span className="text-sm text-blue-800">Incluir historial (archivo mas grande)</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleDownload("json")} disabled={downloading} className="bg-blue-600 hover:bg-blue-700" data-testid="download-json-btn">
              <Download className="w-4 h-4 mr-2" />{downloading ? "Descargando..." : "Descargar JSON"}
            </Button>
            <Button onClick={() => handleDownload("zip")} disabled={downloading} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50" data-testid="download-zip-btn">
              <FolderArchive className="w-4 h-4 mr-2" />Descargar ZIP
            </Button>
          </div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-900">Restaurar Backup</p>
              <p className="text-sm text-amber-700">Restaura tus datos desde un archivo de backup</p>
            </div>
            <RotateCcw className="w-8 h-8 text-amber-600" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={mergeMode} onCheckedChange={setMergeMode} />
            <span className="text-sm text-amber-800">Modo fusion (no elimina datos existentes)</span>
          </div>
          <div className="flex gap-2 items-center">
            <input ref={fileInputRef} type="file" accept=".json,.zip" onChange={(e) => handleRestore(e.target.files?.[0])} className="hidden" id="backup-file-input" data-testid="backup-file-input" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={restoring} variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-100" data-testid="restore-backup-btn">
              <Upload className="w-4 h-4 mr-2" />{restoring ? t('backup.restoring', 'Restaurando...') : t('backup.selectFile', 'Seleccionar archivo')}
            </Button>
            <span className="text-xs text-amber-600">JSON o ZIP</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Backups en Servidor</p>
              <p className="text-sm text-muted-foreground">Backups automaticos almacenados en el servidor</p>
            </div>
            <Button onClick={handleCreateAuto} disabled={creating} size="sm" variant="outline" data-testid="create-backup-btn">
              <Plus className="w-4 h-4 mr-1" />{creating ? t('common.creating', 'Creando...') : t('backup.createNow', 'Crear ahora')}
            </Button>
          </div>
          {loading ? (<Skeleton className="h-20 w-full" />) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay backups en el servidor</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="backups-list">
              {backups.map((backup) => (
                <div key={backup.filename} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs truncate">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(backup.size)} - {new Date(backup.created).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadServerBackup(backup.filename)}><Download className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDeleteServerBackup(backup.filename)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground"><Info className="w-3 h-3 inline mr-1" />Los backups incluyen: organizaciones, grupos, dispositivos, usuarios, alertas y configuraciones. Se mantienen los ultimos 10 backups automaticos en el servidor.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackupPanel;
