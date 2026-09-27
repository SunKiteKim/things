import { prisma } from "@/lib/prisma";
import { createExhibition, deleteExhibition, updateExhibition } from "@/actions/promotions";
import { AdminCreateModal } from "@/components/admin-create-modal";

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function ExhibitionsAdminPage() {
  const [exhibitions, products] = await Promise.all([
    prisma.exhibition.findMany({
      include: { products: true },
      orderBy: { startAt: "desc" },
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
      <div className="mt-10 space-y-8">
        {exhibitions.map((exhibition) => {
          const selected = new Set(exhibition.products.map((row) => row.productId));
          return (
            <form key={exhibition.id} action={updateExhibition} className="grid gap-3 border border-line p-5">
              <input type="hidden" name="id" value={exhibition.id} />
              <input className="field" name="title" defaultValue={exhibition.title} />
              <input className="field" name="slug" defaultValue={exhibition.slug} />
              <textarea className="field min-h-24" name="description" defaultValue={exhibition.description} />
              <input className="field" name="imageUrl" defaultValue={exhibition.imageUrl} />
              <input className="field" name="startAt" type="datetime-local" defaultValue={localInput(exhibition.startAt)} />
              <input className="field" name="endAt" type="datetime-local" defaultValue={localInput(exhibition.endAt)} />
              <div className="grid gap-2 md:grid-cols-3">
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
            </form>
          );
        })}
      </div>
    </div>
  );
}
