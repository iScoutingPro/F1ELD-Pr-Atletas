import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const VIEWPORT = 288; // lado da área de enquadramento, em px (w-72)
const OUTPUT = 600; // lado da imagem gerada, em px
const MAX_ZOOM = 3;

interface ImageCropperProps {
  src: string;
  onCancel: () => void;
  onConfirm: (image: string) => void;
}

// Enquadramento da foto do atleta: arrastar para posicionar e zoom para aproximar ou afastar.
export const ImageCropper = ({ src, onCancel, onConfirm }: ImageCropperProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Zoom 1 = a foto preenche o círculo inteiro; o mínimo mostra a foto inteira (com faixas escuras)
  const coverScale = size ? Math.max(VIEWPORT / size.w, VIEWPORT / size.h) : 1;
  const minZoom = size ? Math.min(VIEWPORT / size.w, VIEWPORT / size.h) / coverScale : 1;
  const width = (size?.w || 0) * coverScale * zoom;
  const height = (size?.h || 0) * coverScale * zoom;

  const clamp = (pos: { x: number; y: number }, z: number) => {
    if (!size) return pos;
    const maxX = Math.abs(size.w * coverScale * z - VIEWPORT) / 2;
    const maxY = Math.abs(size.h * coverScale * z - VIEWPORT) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    };
  };

  const changeZoom = (value: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(minZoom, value));
    setZoom(next);
    setOffset((current) => clamp(current, next));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: offset.x, y: offset.y, startX: e.clientX, startY: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(clamp({ x: drag.x + e.clientX - drag.startX, y: drag.y + e.clientY - drag.startY }, zoom));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !size) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const factor = OUTPUT / VIEWPORT;
    ctx.fillStyle = '#131313';
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.drawImage(
      img,
      OUTPUT / 2 + (offset.x - width / 2) * factor,
      OUTPUT / 2 + (offset.y - height / 2) * factor,
      width * factor,
      height * factor,
    );
    onConfirm(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface-low p-6 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Foto do atleta</p>
        <h3 className="mt-2 text-xl font-black uppercase italic leading-none text-white">Ajustar foto</h3>
        <p className="mt-2 text-xs font-bold text-on-surface-variant">Arraste a foto para posicionar e use o zoom para aproximar ou afastar.</p>

        <div
          className="relative mx-auto mt-5 h-72 w-72 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-background active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={(e) => changeZoom(zoom - e.deltaY * 0.001)}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Foto do atleta"
            draggable={false}
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width,
              height,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              visibility: size ? 'visible' : 'hidden',
            }}
          />
          {/* Escurece o que fica fora do círculo da foto */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-white/80" />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <input
            type="range"
            min={minZoom}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="w-full accent-white"
            aria-label="Zoom da foto"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-on-surface-variant" />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-surface-high py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant transition hover:border-white/30 hover:text-on-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-primary py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-background transition hover:opacity-90"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
