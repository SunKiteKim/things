"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { createProduct, updateProduct } from "@/actions/products";
import { discountedPrice, formatDateTime, formatPrice } from "@/lib/utils";

const THUMB_SIZE = 550;

async function resizeThumbnail(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  const scale = Math.max(THUMB_SIZE / bitmap.width, THUMB_SIZE / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, (THUMB_SIZE - width) / 2, (THUMB_SIZE - height) / 2, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) return file;
  return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const [salePrice, setSalePrice] = useState(product?.originalPrice ?? product?.price ?? 0);
  const [rate, setRate] = useState(product?.discountRate ?? 0);
  const [preview, setPreview] = useState(product?.imageUrl ?? "");
  const sale = useMemo(() => discountedPrice(salePrice, rate), [salePrice, rate]);

  return (
    <form action={product ? updateProduct : createProduct} className="mt-8 grid max-w-3xl gap-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Field label="상품번호">
        <input className="field bg-surface" name="idDisplay" value={product?.id ?? "저장 시 자동 발급 (prd0001)"} readOnly />
      </Field>
      <Field label="상품명">
        <input className="field" name="name" defaultValue={product?.name} required />
      </Field>
      <Field label="카테고리">
        <select className="field" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="판매가">
        <input
          className="field"
          name="originalPrice"
          type="number"
          min={0}
          value={salePrice}
          onChange={(event) => setSalePrice(Number(event.target.value || 0))}
          required
        />
      </Field>
      <Field label="할인율">
        <div className="flex items-center gap-2">
          <input
            className="field"
            name="discountRate"
            type="number"
            min={0}
            max={100}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value || 0))}
          />
          <span className="text-sm text-muted">%</span>
        </div>
      </Field>
      <Field label="할인가">
        <input className="field bg-surface" value={formatPrice(sale)} readOnly />
      </Field>
      <Field label="썸네일">
        <div className="space-y-3">
          <input
            className="field"
            name="thumbnail"
            type="file"
            accept="image/*"
            required={!product}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              const resized = await resizeThumbnail(file);
              const dt = new DataTransfer();
              dt.items.add(resized);
              input.files = dt.files;
              setPreview(URL.createObjectURL(resized));
            }}
          />
          <p className="text-sm text-muted">550×550 정사각으로 저장됩니다.</p>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="썸네일 미리보기" width={160} height={160} className="h-40 w-40 object-cover" />
          ) : null}
        </div>
      </Field>
      <Field label="설명">
        <textarea className="field min-h-32" name="description" defaultValue={product?.description} />
      </Field>
      <Field label="재고">
        <input className="field" name="stock" type="number" min={0} defaultValue={product?.stock ?? 10} />
      </Field>
      <Field label="공개">
        <label className="flex h-[3.2rem] items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? true} /> 판매 공개
        </label>
      </Field>
      <Field label="메인 노출">
        <label className="flex h-[3.2rem] items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} /> 홈 메인 노출
        </label>
      </Field>
      {product ? (
        <>
          <Field label="등록일">
            <input className="field bg-surface" value={formatDateTime(product.registeredAt)} readOnly />
          </Field>
          <Field label="생성일">
            <input className="field bg-surface" value={formatDateTime(product.createdAt)} readOnly />
          </Field>
          <Field label="수정일">
            <input className="field bg-surface" value={formatDateTime(product.updatedAt)} readOnly />
          </Field>
          <Field label="수정한 사람">
            <input className="field bg-surface" value={product.updatedByName || "-"} readOnly />
          </Field>
        </>
      ) : null}
      <div className="admin-row">
        <span />
        <button className="btn w-fit">{product ? "상품 수정" : "상품 등록"}</button>
      </div>
    </form>
  );
}
