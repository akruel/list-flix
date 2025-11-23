import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle size={24} />
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            disabled={isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-3 justify-end">
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isDeleting && <Loader2 size={16} className="animate-spin" />}
            {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  );
};
