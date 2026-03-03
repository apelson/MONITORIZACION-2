/**
 * PushNotificationToggle - Componente para activar/desactivar notificaciones push
 * Usado en el dashboard móvil y en configuraciones
 */
import React from 'react';
import { Bell, BellOff, BellRing, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import usePushNotifications from '@/hooks/usePushNotifications';

// Simple toggle version for mobile dashboard
export const PushToggle = ({ authAxios, className = '' }) => {
  const { 
    isSupported, 
    isSubscribed, 
    loading, 
    subscribe, 
    unsubscribe,
    canSubscribe 
  } = usePushNotifications(authAxios);

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={loading || !canSubscribe}
        data-testid="push-toggle"
      />
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isSubscribed ? (
          <BellRing className="w-4 h-4 text-green-500" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
        <Label className="text-sm cursor-pointer">
          {isSubscribed ? 'Alertas CRA activadas' : 'Activar alertas CRA'}
        </Label>
      </div>
    </div>
  );
};

// Full card version for settings panel
const PushNotificationToggle = ({ authAxios }) => {
  const { 
    isSupported, 
    isSubscribed, 
    permission,
    loading, 
    subscribe, 
    unsubscribe,
    sendTestNotification,
    canSubscribe 
  } = usePushNotifications(authAxios);

  if (!isSupported) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BellOff className="w-4 h-4" />
            Notificaciones Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tu navegador no soporta notificaciones push.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="push-notification-settings">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Notificaciones Push CRA
          </CardTitle>
          {isSubscribed && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              Activas
            </Badge>
          )}
        </div>
        <CardDescription>
          Recibe alertas instantáneas cuando un dispositivo CRA se desconecte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission status */}
        {permission === 'denied' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            Notificaciones bloqueadas. Habilítalas en la configuración de tu navegador.
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <BellRing className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isSubscribed ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed 
                  ? 'Recibirás alertas incluso con la app cerrada'
                  : 'Activa para recibir alertas de dispositivos CRA'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={() => isSubscribed ? unsubscribe() : subscribe()}
            disabled={loading || !canSubscribe}
            data-testid="push-notification-switch"
          />
        </div>

        {/* Test button */}
        {isSubscribed && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={sendTestNotification}
            className="w-full gap-2"
            data-testid="test-push-btn"
          >
            <Send className="w-4 h-4" />
            Enviar notificación de prueba
          </Button>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Alertas instantáneas cuando dispositivos CRA se desconectan</p>
          <p>• Notificación de recuperación cuando vuelven online</p>
          <p>• Funciona incluso con la aplicación cerrada</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationToggle;
