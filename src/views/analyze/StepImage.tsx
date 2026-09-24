import { useRef, useState } from "react";
import { useApp } from "../../state/AppState";
import { useAnalyze } from "./context";
import { Button, Card, Label, TextField } from "../../ui/primitives";
import { fileToDataUrl, loadImageFromDataUrl, imageToCanvas, getImageData, toGrayscaleFloat } from "../../image/canvasUtils";
import { sha256OfDataUrl } from "../../core/checksum";
import { nowIso } from "../../core/id";

const ACCEPTED = ["image/jpeg", "image/png", "image/bmp", "image/tiff", "image/tif"];

export function StepImage() {
  const { state, addAudit } = useApp();
  const { draft, setDraft, setPipeline, goStep } = useAnalyze();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analysis = state.currentAnalysis!;

  async function ingest(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImageFromDataUrl(dataUrl);
      const checksum = await sha256OfDataUrl(dataUrl);

      const dup = analysis.fields.find((f) => f.original.checksumSha256 === checksum);
      if (dup) {
        setDupWarning(
          `This image appears identical to Field ${dup.fieldNumber} (checksum match). You may continue, but this will be recorded as an intentional duplicate.`,
        );
      } else {
        setDupWarning(null);
      }

      const workingCanvas = imageToCanvas(img, 1600);
      const imageData = getImageData(workingCanvas);
      const gray = toGrayscaleFloat(imageData);

      setDraft((f) => ({
        ...f,
        original: {
          dataUrl,
          filename: file.name,
          mimeType: file.type || "unknown",
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeBytes: file.size,
          acquiredAt: nowIso(),
          checksumSha256: checksum,
        },
        flags: { ...f.flags, duplicateCandidate: !!dup, duplicateReason: dup ? `Checksum matches Field ${dup.fieldNumber}` : undefined },
      }));
      setPipeline((p) => ({
        ...p,
        width: workingCanvas.width,
        height: workingCanvas.height,
        workingCanvasDataUrl: workingCanvas.toDataURL(),
        grayOriginal: gray,
        stages: [],
        processedGray: null,
        candidates: [],
      }));
      addAudit("image_uploaded", `Image "${file.name}" uploaded for field ${draft.fieldNumber}. SHA-256: ${checksum.slice(0, 16)}…`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The image could not be decoded. Try exporting as TIFF, PNG, or high-quality JPEG.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingest(file);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      setErr("Camera access was denied or is unavailable in this browser/device.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      await ingest(file);
    }, "image/jpeg", 0.95);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  const hasImage = !!draft.original.dataUrl;

  return (
    <Card className="animate-fade-in-up">
      <div className="mb-4 text-sm font-semibold text-app">Field Image Ingestion</div>

      {!hasImage && !cameraOn && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed p-14 text-center transition-colors ${
            dragOver ? "border-accent bg-accent/5" : "border-app-strong"
          }`}
        >
          <div className="text-4xl">🖼️</div>
          <div className="text-sm font-semibold text-app">Drag & drop a microscope image</div>
          <div className="text-xs text-app-muted">JPG, PNG, BMP, TIFF supported. The original file is never modified.</div>
          <div className="mt-2 flex gap-3">
            <Button onClick={() => inputRef.current?.click()}>Choose File</Button>
            <Button variant="secondary" onClick={startCamera}>
              Use Camera
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",") + ",.tif,.tiff"}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && ingest(e.target.files[0])}
          />
        </div>
      )}

      {cameraOn && (
        <div className="space-y-3">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-[12px] bg-black" />
          <div className="flex gap-3">
            <Button onClick={capturePhoto}>Capture</Button>
            <Button variant="secondary" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {busy && <div className="mt-4 text-sm text-app-secondary">Decoding image and computing SHA-256 checksum…</div>}
      {err && <div className="mt-4 rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>}
      {dupWarning && (
        <div className="mt-4 rounded-[10px] border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          ⚠ {dupWarning}
        </div>
      )}

      {hasImage && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Original — Immutable</Label>
              <img src={draft.original.dataUrl} alt="original" className="mt-2 w-full rounded-[12px] border border-app object-contain" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 font-mono-num text-xs text-app-secondary">
                <div>Filename: <span className="text-app">{draft.original.filename}</span></div>
                <div>Type: <span className="text-app">{draft.original.mimeType}</span></div>
                <div>Dimensions: <span className="text-app">{draft.original.width}×{draft.original.height}</span></div>
                <div>Size: <span className="text-app">{(draft.original.fileSizeBytes / 1024).toFixed(1)} KB</span></div>
                <div className="col-span-2 break-all">SHA-256: <span className="text-accent">{draft.original.checksumSha256}</span></div>
              </div>
              <TextField label="Field Location Label" value={draft.locationLabel} onChange={(v) => setDraft({ locationLabel: v })} placeholder="e.g. Center, Quadrant NW, 2mm from edge" />
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    inputRef.current?.click();
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Replace Image
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED.join(",") + ",.tif,.tiff"}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && ingest(e.target.files[0])}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => goStep(3)}>Continue to Quality Check →</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
