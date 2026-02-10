/**
 * Notification Settings Component
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Volume2, VolumeX, Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationSettings = () => {
  const { t } = useTranslation();
  const {
    permission,
    soundEnabled,
    isSupported,
    isEnabled,
    requestPermission,
    toggleSound,
    playTestSound
  } = useNotifications();

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }

    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('¡Notificaciones activadas!');
    } else if (result === 'denied') {
      toast.error('Las notificaciones fueron bloqueadas. Habilítalas en la configuración del navegador.');
    }
  };

  const handleTestNotification = () => {
    if (!isEnabled) {
      toast.error('Primero activa las notificaciones');
      return;
    }

    new Notification('🔔 Prueba de Notificación', {
      body: 'Las notificaciones están funcionando correctamente',
      icon: '/logo192.png'
    });
    toast.success('Notificación de prueba enviada');
  };

  const handleTestSound = () => {
    playTestSound();
    toast.success('Sonido de prueba reproducido');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {t('settings.notifications', 'Notificaciones')}
        </CardTitle>
        <CardDescription>
          Configura las notificaciones del navegador y alertas sonoras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Notificaciones del navegador</Label>
              <p className="text-sm text-muted-foreground">
                Recibe alertas incluso cuando la pestaña no esté activa
              </p>
            </div>
            <Badge variant={isEnabled ? 'default' : 'secondary'} className="ml-2">
              {isEnabled ? (
                <><Check className="w-3 h-3 mr-1" /> Activas</>
              ) : (
                <><X className="w-3 h-3 mr-1" /> Inactivas</>
              )}
            </Badge>
          </div>

          {!isSupported ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
              <Info className="w-4 h-4" />
              Tu navegador no soporta notificaciones push
            </div>
          ) : !isEnabled ? (
            <Button onClick={handleEnableNotifications} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Activar notificaciones
            </Button>
          ) : (
            <Button variant="outline" onClick={handleTestNotification} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Enviar notificación de prueba
            </Button>
          )}

          {permission === 'denied' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <p className="font-medium">Notificaciones bloqueadas</p>
              <p className="text-xs mt-1">
                Para activarlas, haz clic en el candado 🔒 en la barra de direcciones y permite notificaciones
              </p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          {/* Sound alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Alertas sonoras
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduce un sonido cuando hay alertas críticas
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

          {soundEnabled && (
            <Button variant="outline" size="sm" onClick={handleTestSound} className="mt-3">
              <Volume2 className="w-4 h-4 mr-2" />
              Probar sonido
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="border-t pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <p className="font-medium mb-1">Tipos de notificaciones</p>
            <ul className="text-xs space-y-1">
              <li>🔴 <strong>Caídas:</strong> Cuando un dispositivo se desconecta</li>
              <li>🟢 <strong>Recuperaciones:</strong> Cuando un dispositivo vuelve en línea</li>
              <li>💾 <strong>NAS:</strong> Alertas de conexión con unidades NAS</li>
              <li>📋 <strong>Incidencias:</strong> Nuevas incidencias asignadas</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
