import { prisma } from "@/lib/prisma";
import { createExhibition, deleteExhibition, updateExhibition } from "@/actions/promotions";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { AdminMasterDetail } from "@/components/admin-master-detail";
import { formatDate } from "@/lib/utils";

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function ExhibitionsAdminPage() {
  const [exhibitions, products] = await Promise.all([
    prisma.exhibition.findMany({
      include: { products: true },
      orderBy: { id: "desc" },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
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
          <div><p className="mb-3 text-sm font-medium">적용 상품</p><div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-line p-4 md:grid-cols-3">{products.map((product) => <label key={product.id} className="text-sm"><input type="checkbox" name="productIds" value={product.id} /> <span className="product-name">{product.name}</span></label>)}</div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> 공개</label>
        </AdminCreateModal>
      </div>
      <AdminMasterDetail
        listTitle="기획전 목록"
        detailTitle="기획전 상세"
        columns={["기획전명", "기간", "상품 수", "상태"]}
        rows={exhibitions.map((exhibition) => {
          const selected = new Set(exhibition.products.map((row) => row.productId));
          return {
            id: exhibition.id,
            cells: [exhibition.title, `${formatDate(exhibition.startAt)} ~ ${formatDate(exhibition.endAt)}`, `${exhibition.products.length}개`, exhibition.isActive ? "공개" : "비공개"],
            detail: <form action={updateExhibition} className="grid max-w-4xl gap-4">
              <input type="hidden" name="id" value={exhibition.id} />
              <label className="text-sm font-medium">기획전명<input className="field mt-2" name="title" defaultValue={exhibition.title} /></label>
              <label className="text-sm font-medium">슬러그<input className="field mt-2" name="slug" defaultValue={exhibition.slug} /></label>
              <label className="text-sm font-medium">설명<textarea className="field mt-2 min-h-24" name="description" defaultValue={exhibition.description} /></label>
              <label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" defaultValue={exhibition.imageUrl} /></label>
              <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">시작일<input className="field mt-2" name="startAt" type="datetime-local" defaultValue={localInput(exhibition.startAt)} /></label><label className="text-sm font-medium">종료일<input className="field mt-2" name="endAt" type="datetime-local" defaultValue={localInput(exhibition.endAt)} /></label></div>
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-line p-4 md:grid-cols-3">
                {products.map((product) => (
                  <label key={product.id} className="text-sm">
                    <input
                      type="checkbox"
                      name="productIds"
                      value={product.id}
                      defaultChecked={selected.has(product.id)}
                    />{" "}
                    <span className="product-name">{product.name}</span>
                  </label>
                ))}
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
