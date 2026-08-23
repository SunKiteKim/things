import { prisma } from "@/lib/prisma";
import { createExhibition, deleteExhibition, updateExhibition } from "@/actions/promotions";

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
      <h1 className="display text-4xl">기획전 관리</h1>
      <form action={createExhibition} className="mt-8 grid gap-3 border border-line bg-surface p-6">
        <input className="field" name="title" placeholder="기획전명" required />
        <input className="field" name="slug" placeholder="slug" />
        <textarea className="field min-h-24" name="description" placeholder="설명" />
        <input className="field" name="imageUrl" placeholder="이미지 URL" required />
        <input className="field" name="startAt" type="datetime-local" required />
        <input className="field" name="endAt" type="datetime-local" required />
        <div className="grid gap-2 md:grid-cols-3">
          {products.map((product) => (
            <label key={product.id} className="text-sm">
              <input type="checkbox" name="productIds" value={product.id} />{" "}
              <span className="product-name">{product.name}</span>
            </label>
          ))}
        </div>
        <label className="text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> 공개
        </label>
        <button className="btn w-fit">기획전 등록</button>
      </form>
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
