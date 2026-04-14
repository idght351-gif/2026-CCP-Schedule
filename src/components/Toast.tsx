import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  toast: { message: string; type: 'success' | 'error' } | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md"
          style={{ 
            backgroundColor: toast.type === 'success' ? 'rgba(240, 253, 244, 0.9)' : 'rgba(254, 242, 242, 0.9)',
            borderColor: toast.type === 'success' ? '#86efac' : '#fca5a5'
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <span className={`font-bold ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {toast.message}
          </span>
          <button 
            onClick={onClose}
            className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
