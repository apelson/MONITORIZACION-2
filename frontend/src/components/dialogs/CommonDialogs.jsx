/**
 * Common Dialogs - Reusable dialog components
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, WifiOff, Phone, History, Activity, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusDot, StatusBadge } from '@/components/common/StatusBadges';

const WHATSAPP_ALERT_NUMBER = "+34610557829";

// Delete Confirmation Dialog
export const DeleteConfirmDialog = ({ open, onOpenChange, title, message, onConfirm }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  
  const handleDelete = async () => { 
    setDeleting(true); 
    await onConfirm(); 
    setDeleting(false); 
    onOpenChange(false); 
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            data-testid="confirm-delete-btn" 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={deleting}
          >
            {deleting ? t('common.deleting', 'Eliminando...') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Failures Summary Dialog
export const FailuresDialog = ({ open, onOpenChange, failures, onClear }) => {
  const { t } = useTranslation();
  
  const getWhatsAppLink = () => {
    if (failures.length === 0) return null;
    const message = `🚨 *ALERTA - Siempria Network Monitor*\n\n` +
      `${failures.length} dispositivo(s) offline:\n\n` +
      failures.map(f => `❌ *${f.name}*\n   IP: ${f.ip}:${f.port}\n   Hora: ${f.time}`).join('\n\n') +
      `\n\n_Enviado desde Siempria Network Monitor_`;
    return `https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  const getSingleWhatsAppLink = (device) => {
    const message = `🚨 *ALERTA - Dispositivo Offline*\n\n` +
      `❌ *${device.name}*\n` +
      `IP: ${device.ip}:${device.port}\n` +
      `Hora: ${device.time}\n\n` +
      `_Siempria Network Monitor_`;
    return `https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Resumen de Fallos ({failures.length})
          </DialogTitle>
          <DialogDescription>
            {t('devices.recentlyOffline', 'Dispositivos que han perdido conexión recientemente')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {failures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('alerts.noRecentFailures', 'No hay fallos recientes')}
            </p>
          ) : (
            failures.map((f, i) => (
              <div key={`${f.id}-${i}`} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{f.ip}:{f.port}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">{f.time}</span>
                <a 
                  href={getSingleWhatsAppLink(f)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                  title="Enviar alerta por WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="flex-shrink-0 gap-2">
          {failures.length > 0 && (
            <a 
              href={getWhatsAppLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              <Phone className="w-4 h-4" />
              Enviar todo por WhatsApp
            </a>
          )}
          <Button variant="outline" onClick={onClear}>
            {t('history.clearHistory', 'Limpiar historial')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close', 'Cerrar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// History Dialog
export const HistoryDialog = ({ open, onOpenChange, device, history }) => {
  const { t } = useTranslation();
  
  if (!device) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t('history.title', 'Historial')} - {device.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {device.ip_address}:{device.port}
          </DialogDescription>
        </DialogHeader>
        {device.notes && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <FileText className="w-4 h-4 inline mr-2" />
            <strong>{t('common.notes', 'Notas')}:</strong> {device.notes}
          </div>
        )}
        <ScrollArea className="h-[350px] pr-4">
          {history.length === 0 ? (
            <div className="empty-state py-12">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>{t('history.noHistory', 'No hay historial')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((e, i) => (
                <div key={e.id || i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <StatusDot status={e.status} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={e.status} />
                      {e.response_time_ms && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {e.response_time_ms.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className={e.ping_success ? "text-green-600" : "text-red-500"}>
                      Ping {e.ping_success ? "✓" : "✗"}
                    </span>
                    <span className={e.port_success ? "text-green-600" : "text-red-500"}>
                      Puerto {e.port_success ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
