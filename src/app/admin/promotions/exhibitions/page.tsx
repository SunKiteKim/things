import { prisma } from "@/lib/prisma";
import { createExhibition, deleteExhibition, updateExhibition } from "@/actions/promotions";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { AdminMasterDetail } from "@/components/admin-master-detail";
import { ProductSearchPicker } from "@/components/product-search-picker";
import { exhibitionOfferLabel } from "@/lib/exhibition-price";
import { formatDate } from "@/lib/utils";

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function discountLabel(discountType: string, discountValue: number) {
  if (discountType !== "PERCENT" && discountType !== "AMOUNT") return "없음";
  if (discountValue <= 0) return "없음";
  return exhibitionOfferLabel({ discountType, discountValue });
}

function DiscountFields({ discountType = "NONE", discountValue = 0 }: { discountType?: string; discountValue?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">
        할인 방식
        <select className="field mt-2" name="discountType" defaultValue={discountType === "PERCENT" || discountType === "AMOUNT" ? discountType : "NONE"}>
          <option value="NONE">할인 없음</option>
          <option value="PERCENT">정률 (%)</option>
          <option value="AMOUNT">정액 (원)</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        할인값
        <input className="field mt-2" name="discountValue" type="number" min={0} defaultValue={discountValue} />
      </label>
      <p className="text-xs text-muted md:col-span-2">정률은 1~100, 정액은 1원 이상입니다. 진행 중인 기획전에 등록된 상품 판매가에 적용됩니다.</p>
    </div>
  );
}

export default async function ExhibitionsAdminPage() {
  const [exhibitions, products] = await Promise.all([
    prisma.exhibition.findMany({
      include: { products: true },
      orderBy: { id: "desc" },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, imageUrl: true } }),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-3xl">기획전 관리</h1>
        <AdminCreateModal title="기획전 등록" triggerLabel="기획전 등록" action={createExhibition} wide>
          <label className="text-sm font-medium">기획전명<input className="field mt-2" name="title" required /></label>
          <label className="text-sm font-medium">슬러그<input className="field mt-2" name="slug" /></label>
          <label className="text-sm font-medium">설명<textarea className="field mt-2 min-h-24" name="description" /></label>
          <label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" required /></label>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">시작일<input className="field mt-2" name="startAt" type="datetime-local" required /></label><label className="text-sm font-medium">종료일<input className="field mt-2" name="endAt" type="datetime-local" required /></label></div>
          <DiscountFields />
          <div>
            <p className="mb-3 text-sm font-medium">적용 상품</p>
            <ProductSearchPicker products={products} name="productIds" selected={[]} idPrefix="exhibition-create" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> 공개</label>
        </AdminCreateModal>
      </div>
      <AdminMasterDetail
        listTitle="기획전 목록"
        detailTitle="기획전 상세"
        columns={["기획전명", "기간", "할인", "상품 수", "상태"]}
        rows={exhibitions.map((exhibition) => {
          const selected = exhibition.products.map((row) => row.productId);
          return {
            id: exhibition.id,
            cells: [exhibition.title, `${formatDate(exhibition.startAt)} ~ ${formatDate(exhibition.endAt)}`, discountLabel(exhibition.discountType, exhibition.discountValue), `${exhibition.products.length}개`, exhibition.isActive ? "공개" : "비공개"],
            detail: <form key={`${exhibition.id}-${exhibition.discountType}-${exhibition.discountValue}`} action={updateExhibition} className="grid max-w-4xl gap-4">
              <input type="hidden" name="id" value={exhibition.id} />
              <label className="text-sm font-medium">기획전명<input className="field mt-2" name="title" defaultValue={exhibition.title} /></label>
              <label className="text-sm font-medium">슬러그<input className="field mt-2" name="slug" defaultValue={exhibition.slug} /></label>
              <label className="text-sm font-medium">설명<textarea className="field mt-2 min-h-24" name="description" defaultValue={exhibition.description} /></label>
              <label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" defaultValue={exhibition.imageUrl} /></label>
              <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">시작일<input className="field mt-2" name="startAt" type="datetime-local" defaultValue={localInput(exhibition.startAt)} /></label><label className="text-sm font-medium">종료일<input className="field mt-2" name="endAt" type="datetime-local" defaultValue={localInput(exhibition.endAt)} /></label></div>
              <DiscountFields discountType={exhibition.discountType} discountValue={exhibition.discountValue} />
              <div>
                <p className="mb-3 text-sm font-medium">적용 상품</p>
                <ProductSearchPicker products={products} name="productIds" selected={selected} idPrefix={`exhibition-${exhibition.id}`} />
              </div>
              <label className="text-sm">
                <input type="checkbox" name="isActive" defaultChecked={exhibition.isActive} /> 공개
              </label>
              <div className="flex gap-2">
                <button className="btn">수정</button>
                <button className="btn btn-ghost" formAction={deleteExhibition}>
                  삭제
                </button>
              </div>
            </form>,
          };
        })}
      />
    </div>
  );
}
