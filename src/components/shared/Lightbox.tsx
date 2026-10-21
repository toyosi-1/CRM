import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)' }} onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
        style={{ background: 'rgba(255,255,255,0.15)' }}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt ?? 'Attachment'}
        className="max-w-full max-h-[90vh] rounded-lg object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
