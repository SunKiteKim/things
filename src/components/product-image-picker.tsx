"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PRODUCT_IMAGES } from "@/lib/product-image-library";
import { ProductImage } from "@/components/product-image";

async function resizeThumbnail(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPG, PNG, WebP 이미지를 선택하세요.");
  if (file.size > 20 * 1024 * 1024) throw new Error("20MB 이하의 이미지를 선택하세요.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 550;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 처리할 수 없습니다.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 550, 550);
    const scale = Math.min(550 / bitmap.width, 550 / bitmap.height);
    const width = bitmap.width * scale, height = bitmap.height * scale;
    ctx.drawImage(bitmap, (550 - width) / 2, (550 - height) / 2, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("이미지 변환에 실패했습니다.");
    return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}

export function ProductImagePicker({ initialImage = "", editing = false, onBusy }: { initialImage?: string; editing?: boolean; onBusy: (busy: boolean) => void }) {
  const [selected, setSelected] = useState(initialImage);
  const [preview, setPreview] = useState(initialImage);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  function chooseLibrary(src: string) {
    version.current++;
    if (input.current) input.current.value = "";
    setSelected(src);
    setPreview(src);
    setError("");
    setBusy(false);
    onBusy(false);
    setLibraryOpen(false);
  }

  const upload = (
    <div>
      <label className="block text-sm font-medium">새 이미지 업로드
        <input ref={input} className="field mt-2" name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" required={!selected && !preview}
          onChange={async event => {
            const element = event.currentTarget, file = element.files?.[0];
            if (!file) return;
            const request = ++version.current;
            setBusy(true); onBusy(true); setError("");
            try {
              const resized = await resizeThumbnail(file);
              if (request !== version.current) return;
              const data = new DataTransfer(); data.items.add(resized); element.files = data.files;
              setSelected(""); setPreview(URL.createObjectURL(resized));
            } catch (err) {
              if (request !== version.current) return;
              element.value = ""; setPreview(selected); setError(err instanceof Error ? err.message : "이미지를 읽을 수 없습니다.");
            } finally { if (request === version.current) { setBusy(false); onBusy(false); } }
          }} />
      </label>
      <p className="mt-2 text-xs leading-5 text-muted">JPG · PNG · WebP / 최대 20MB. 비율을 유지해 550×550px로 저장합니다. 남는 공간은 흰색으로 채웁니다.</p>
    </div>
  );

  const libraryButton = (
    <button type="button" className="btn btn-ghost" onClick={() => setLibraryOpen(true)}>
      <a href="#prepared-product-images" onClick={(event) => event.preventDefault()}>준비된 이미지에서 선택</a>
    </button>
  );

  const selectedPreview = (editing || preview) ? (
    <div>
      <p className="mb-2 text-xs text-muted">선택한 썸네일</p>
      <ProductImage src={preview} alt="선택한 상품 썸네일 미리보기" className="h-40 w-40 border border-line object-contain" />
    </div>
  ) : null;

  const dialog = libraryOpen ? (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-black/40 px-5 py-10" role="presentation" onClick={() => setLibraryOpen(false)}>
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="준비된 이미지에서 선택" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h3 id="prepared-product-images" className="text-xl font-bold">준비된 이미지에서 선택</h3>
          <button type="button" className="text-2xl leading-none" aria-label="이미지 선택 닫기" onClick={() => setLibraryOpen(false)}>×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRODUCT_IMAGES.map((image) => (
              <button key={image.src} type="button" aria-pressed={selected === image.src} aria-label={image.label + " 선택"}
                className={"overflow-hidden rounded border p-2 text-left focus-visible:outline-2 " + (selected === image.src ? "border-ink ring-1 ring-ink" : "border-line")}
                onClick={() => chooseLibrary(image.src)}>
                <ProductImage src={image.src} alt={image.label} className="aspect-square w-full object-contain" />
                <span className="mt-2 block text-xs">{image.label}{selected === image.src ? " · 선택됨" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return <div className="space-y-4">
    <input type="hidden" name="imageUrl" value={selected} />
    {editing ? selectedPreview : null}
    {upload}
    {libraryButton}
    {editing ? null : selectedPreview}
    {busy && <p role="status" className="text-sm">이미지 크기를 조정하고 있습니다…</p>}
    {error && <p role="alert" className="text-sm text-accent">{error}</p>}
    {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
  </div>;
}
