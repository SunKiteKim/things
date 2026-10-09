"use client";

import { useMemo, useState } from "react";
import { DisabledText } from "@/components/disabled-text";
import { ProductImagePicker } from "@/components/product-image-picker";
import { RequiredMark } from "@/components/required-mark";
import type { Category, Product } from "@prisma/client";
import { createProduct, updateProduct } from "@/actions/products";
import { discountedPrice, formatDateTime, formatPrice, maskPersonalInfo } from "@/lib/utils";

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <span>{label}{required ? <RequiredMark /> : null}</span>
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
  const productId = product?.id ?? "new";
  const [loadedId, setLoadedId] = useState(productId);
  const [salePrice, setSalePrice] = useState(product?.originalPrice ?? product?.price ?? 0);
  const [rate, setRate] = useState(product?.discountRate ?? 0);
  const [imageBusy, setImageBusy] = useState(false);
  if (loadedId !== productId) {
    setLoadedId(productId);
    setSalePrice(product?.originalPrice ?? product?.price ?? 0);
    setRate(product?.discountRate ?? 0);
    setImageBusy(false);
  }
  const sale = useMemo(() => discountedPrice(salePrice, rate), [salePrice, rate]);

  return (
    <form key={productId} onSubmit={event => { if (imageBusy) event.preventDefault(); }} action={product ? updateProduct : createProduct} className="mt-8 grid max-w-3xl gap-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Field label="상품번호">
        <DisabledText>{product?.id ?? "저장 시 자동 발급 (prd0001)"}</DisabledText>
      </Field>
      <Field label="상품명" required>
        <input className="field" name="name" defaultValue={product?.name} required />
      </Field>
      <Field label="카테고리" required>
        <select className="field" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="판매가" required>
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
      <Field label="회원 할인">
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
      <Field label="1+1 할인"><label><input type="checkbox" name="onePlusOne" defaultChecked={product?.onePlusOne ?? false} /> 같은 상품 1개 증정 옵션 허용</label></Field>
      <Field label="회원 할인가">
        <DisabledText>{formatPrice(sale)}</DisabledText>
      </Field>
      <Field label="썸네일" required={!product}>
        <ProductImagePicker initialImage={product?.imageUrl} editing={Boolean(product)} onBusy={setImageBusy} />
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
      <Field label="추천">
        <label className="flex h-[3.2rem] items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} /> 추천 상품
        </label>
      </Field>
      {product ? (
        <>
          <Field label="등록일">
            <DisabledText>{formatDateTime(product.registeredAt)}</DisabledText>
          </Field>
          <Field label="생성일">
            <DisabledText>{formatDateTime(product.createdAt)}</DisabledText>
          </Field>
          <Field label="수정일">
            <DisabledText>{formatDateTime(product.updatedAt)}</DisabledText>
          </Field>
          <Field label="수정한 사람">
            <DisabledText>{maskPersonalInfo(product.updatedByName)}</DisabledText>
          </Field>
        </>
      ) : null}
      <div className="admin-row">
        <span />
        <button disabled={imageBusy} className="btn w-fit disabled:opacity-50">{product ? "상품 수정" : "상품 등록"}</button>
      </div>
    </form>
  );
}
