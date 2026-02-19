/**
 * Telegram Settings Component - Configure Telegram bot notifications
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Send, Plus, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TelegramSettings = ({ settings, onSave, authAxios }) => {
  const [formData, setFormData] = useState({
    telegram_bot_token: "",
    telegram_chat_ids: [],
    telegram_enabled: false
  });
  const [newChatId, setNewChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (settings) {
      setFormData({
        telegram_bot_token: settings.telegram_bot_token || "",
        telegram_chat_ids: settings.telegram_chat_ids || [],
        telegram_enabled: settings.telegram_enabled || false
      });
      setLoading(false);
    }
  }, [settings]);

  const handleAddChatId = () => {
    const chatId = newChatId.trim();
    if (!chatId) {
      toast.error("Ingresa un Chat ID válido");
      return;
    }
    if (formData.telegram_chat_ids.includes(chatId)) {
      toast.error("Este Chat ID ya existe");
      return;
    }
    setFormData(prev => ({
      ...prev,
      telegram_chat_ids: [...prev.telegram_chat_ids, chatId]
    }));
    setNewChatId("");
  };

  const handleRemoveChatId = (chatId) => {
    setFormData(prev => ({
      ...prev,
      telegram_chat_ids: prev.telegram_chat_ids.filter(id => id !== chatId)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.telegram_bot_token) {
      toast.error("Ingresa el Token del Bot");
      return;
    }
    if (formData.telegram_chat_ids.length === 0) {
      toast.error("Agrega al menos un Chat ID");
      return;
    }

    setSaving(true);
    try {
      await authAxios.post("/settings/telegram", formData);
      toast.success("Configuración de Telegram guardada");
      if (onSave) onSave(formData);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await authAxios.post("/settings/test-telegram");
      toast.success("Mensaje de prueba enviado a Telegram");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al enviar mensaje de prueba");
    }
    setTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Configuración Telegram
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2 h-6 w-6 p-0">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Cómo configurar:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Busca @BotFather en Telegram</li>
                  <li>Escribe /newbot y sigue las instrucciones</li>
                  <li>Copia el token que te proporciona</li>
                  <li>Para obtener tu Chat ID:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Envía un mensaje al bot</li>
                      <li>Visita: api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</li>
                      <li>Busca "chat":&#123;"id":XXXXXXXX&#125;</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
        <CardDescription>
          Configura el bot de Telegram para recibir alertas instantáneas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <MessageSquare className={`w-5 h-5 ${formData.telegram_enabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
                <div>
                  <Label>Notificaciones Telegram</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.telegram_enabled ? "Las alertas se enviarán a Telegram" : "Las notificaciones están desactivadas"}
                  </p>
                </div>
              </div>
              <Switch
                data-testid="telegram-enabled-switch"
                checked={formData.telegram_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, telegram_enabled: checked }))}
              />
            </div>

            {/* Bot Token */}
            <div className="space-y-2">
              <Label>Token del Bot</Label>
              <Input
                data-testid="telegram-bot-token-input"
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={formData.telegram_bot_token}
                onChange={(e) => setFormData(prev => ({ ...prev, telegram_bot_token: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Obtén el token de @BotFather en Telegram
              </p>
            </div>

            {/* Chat IDs */}
            <div className="space-y-2">
              <Label>Chat IDs</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="telegram-chat-id-input"
                  placeholder="Ej: -1001234567890"
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChatId())}
                />
                <Button type="button" onClick={handleAddChatId} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Grupos: usa el ID con guión (ej: -100...). Usuarios: ID sin guión.
              </p>

              {/* Chat ID Badges */}
              {formData.telegram_chat_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.telegram_chat_ids.map((chatId) => (
                    <Badge
                      key={chatId}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {chatId}
                      <button
                        type="button"
                        onClick={() => handleRemoveChatId(chatId)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saving}
                data-testid="save-telegram-settings-btn"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                ) : null}
                Guardar Configuración
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !formData.telegram_enabled || !formData.telegram_bot_token || formData.telegram_chat_ids.length === 0}
                data-testid="test-telegram-btn"
              >
                {testing ? (
                  <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Prueba
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramSettings;
