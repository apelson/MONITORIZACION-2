/**
 * SortableCard Component - Wrapper for drag and drop functionality
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export const SortableCard = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 z-10 p-1.5 bg-white/80 rounded-md cursor-grab active:cursor-grabbing hover:bg-white shadow-sm opacity-0 hover:opacity-100 transition-opacity"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      {children}
    </div>
  );
};

export default SortableCard;
