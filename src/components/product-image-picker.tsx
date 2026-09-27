"use client";

import { useEffect, useRef, useState } from "react";
import { PRODUCT_IMAGES } from "@/lib/product-image-library";

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

export function ProductImagePicker({ initialImage = "", onBusy }: { initialImage?: string; onBusy: (busy: boolean) => void }) {
  const [selected, setSelected] = useState(initialImage);
  const [preview, setPreview] = useState(initialImage);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  return <div className="space-y-4">
    <input type="hidden" name="imageUrl" value={selected} />
    <p className="text-sm font-medium">준비된 이미지에서 선택</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {PRODUCT_IMAGES.map(image => <button key={image.src} type="button" aria-pressed={selected === image.src} aria-label={image.label + " 선택"}
        className={"overflow-hidden rounded border p-2 text-left focus-visible:outline-2 " + (selected === image.src ? "border-ink ring-1 ring-ink" : "border-line")}
        onClick={() => { version.current++; if (input.current) input.current.value = ""; setSelected(image.src); setPreview(image.src); setError(""); setBusy(false); onBusy(false); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.label} width={120} height={120} className="aspect-square w-full object-contain" />
        <span className="mt-2 block text-xs">{image.label}{selected === image.src ? " · 선택됨" : ""}</span>
      </button>)}
    </div>
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
    <p className="text-xs leading-5 text-muted">JPG · PNG · WebP / 최대 20MB. 비율을 유지해 550×550px로 저장합니다. 남는 공간은 흰색으로 채웁니다.</p>
    {busy && <p role="status" className="text-sm">이미지 크기를 조정하고 있습니다…</p>}
    {error && <p role="alert" className="text-sm text-accent">{error}</p>}
    {preview && <div>
      <p className="mb-2 text-xs text-muted">선택한 썸네일</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="선택한 상품 썸네일 미리보기" width={160} height={160} className="h-40 w-40 border border-line object-contain" />
    </div>}
  </div>;
}
