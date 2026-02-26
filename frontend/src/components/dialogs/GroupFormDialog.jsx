/**
 * GroupFormDialog - Form for creating/editing groups
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#14b8a6", 
  "#6366f1", "#a855f7", "#e11d48", "#0ea5e9", "#65a30d", 
  "#dc2626", "#7c3aed", "#db2777", "#059669", "#ca8a04"
];

export const GroupFormDialog = ({ open, onOpenChange, group, organizations = [], onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ 
    name: "", 
    organization_id: "", 
    description: "", 
    color: "#22c55e" 
  });
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const prevOpenRef = useRef(false);

  // Only initialize form data when dialog opens, not on every render
  useEffect(() => {
    // Only run when dialog is opening (transition from closed to open)
    if (open && !prevOpenRef.current) {
      if (group) {
        setFormData({ 
          name: group.name || "", 
          organization_id: group.organization_id || "", 
          description: group.description || "", 
          color: group.color || "#22c55e" 
        });
      } else {
        setFormData({ 
          name: "", 
          organization_id: organizations[0]?.id || "", 
          description: "", 
          color: "#22c55e" 
        });
      }
    }
    prevOpenRef.current = open;
  }, [open, group]); // Remove organizations from dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.organization_id) { 
      toast.error("Nombre y organización requeridos"); 
      return; 
    }
    setSaving(true); 
    await onSave(formData, group?.id); 
    setSaving(false); 
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group ? t('groups.editGroup', 'Editar Grupo') : t('groups.newGroup', 'Nuevo Grupo')}
          </DialogTitle>
          <DialogDescription>
            {t('groups.formDescription', 'Los grupos organizan dispositivos dentro de una organización')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.name', 'Nombre')} *</Label>
              <Input 
                data-testid="group-name-input" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t('organizations.title', 'Organización')} *</Label>
              <Select value={formData.organization_id} onValueChange={(v) => setFormData({ ...formData, organization_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('common.select', 'Seleccionar')} /></SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.description', 'Descripción')}</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.color', 'Color')}</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button 
                    key={c} 
                    type="button" 
                    onClick={() => setFormData({ ...formData, color: c })} 
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} 
                    style={{ backgroundColor: c }} 
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button data-testid="save-group-btn" type="submit" disabled={saving}>
              {saving ? t('common.saving', 'Guardando...') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GroupFormDialog;
