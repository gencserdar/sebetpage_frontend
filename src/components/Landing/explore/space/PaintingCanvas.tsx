import { Eraser, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

const BRUSH_COLORS = ["#111827", "#C1E34F", "#8b9cff", "#e879a8", "#f8fafc", "#f59e0b"];
const CANVAS_SIZE = 1200;
const BRUSH_WIDTH = 10;
const ERASER_WIDTH = 36;

interface PaintingCanvasProps {
  onCollapse: () => void;
  initialImageUrl?: string | null;
  onSend: (blob: Blob) => Promise<void>;
  sending: boolean;
}

function getPoint(
  canvas: HTMLCanvasElement,
  event: ReactPointerEvent<HTMLCanvasElement>
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export default function PaintingCanvas({
  onCollapse,
  initialImageUrl,
  onSend,
  sending,
}: PaintingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [hasStrokes, setHasStrokes] = useState(false);

  const fillPaper = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const loadImageOntoCanvas = useCallback(
    (url: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        fillPaper(ctx);
        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        setHasStrokes(true);
      };
      img.onerror = () => fillPaper(ctx);
      img.src = url;
    },
    [fillPaper]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (initialImageUrl) {
      loadImageOntoCanvas(initialImageUrl);
      return;
    }
    fillPaper(ctx);
    setHasStrokes(false);
  }, [initialImageUrl, fillPaper, loadImageOntoCanvas]);

  const startDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(canvas, event);
    ctx.strokeStyle = color;
    ctx.lineWidth = color === "#f4f1ea" ? ERASER_WIDTH : BRUSH_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasStrokes(true);
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(canvas, event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    fillPaper(ctx);
    setHasStrokes(false);
  };

  const handleSend = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return;
    await onSend(blob);
  };

  return createPortal(
    <div className="landing-space__canvas-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="landing-space__canvas-backdrop"
        aria-label="Close painting editor"
        onClick={onCollapse}
      />
      <div className="landing-space__canvas-panel landing-space__canvas-panel--expanded">
        <div className="landing-space__canvas-toolbar">
          <div className="landing-space__canvas-colors" role="list" aria-label="Brush colors">
            {BRUSH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="listitem"
                className={`landing-space__canvas-swatch${
                  color === c ? " landing-space__canvas-swatch--active" : ""
                }`}
                style={{ "--swatch": c } as CSSProperties}
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
              />
            ))}
            <button
              type="button"
              className="landing-space__canvas-tool"
              aria-label="Eraser"
              onClick={() => setColor("#f4f1ea")}
            >
              <Eraser size={15} />
            </button>
          </div>
          <div className="landing-space__canvas-actions">
            <button type="button" className="landing-space__canvas-tool" onClick={clearCanvas}>
              Clear
            </button>
            <button
              type="button"
              className="landing-space__canvas-tool"
              onClick={onCollapse}
              aria-label="Close editor"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="landing-space__canvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
        />

        <button
          type="button"
          className="landing-space__canvas-send"
          disabled={!hasStrokes || sending}
          onClick={() => void handleSend()}
        >
          <Send size={15} aria-hidden />
          {sending ? "Sending…" : "Send painting"}
        </button>
      </div>
    </div>,
    document.body
  );
}
