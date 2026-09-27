import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory, updateCategory } from "@/actions/display";
import { LIMITS } from "@/lib/utils";
import { AdminCreateModal } from "@/components/admin-create-modal";

export default async function CategoriesAdminPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="display text-3xl">카테고리 관리</h1><p className="mt-2 text-sm text-muted">{categories.length} / {LIMITS.MAX_CATEGORIES}개</p></div>
        <AdminCreateModal title="카테고리 등록" triggerLabel="카테고리 등록" action={createCategory}>
          <label className="text-sm font-medium">카테고리명<input className="field mt-2" name="name" required /></label>
          <label className="text-sm font-medium">슬러그<input className="field mt-2" name="slug" /></label>
          <label className="text-sm font-medium">설명<input className="field mt-2" name="description" /></label>
          <label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" /></label>
          <label className="text-sm font-medium">정렬 순서<input className="field mt-2" name="sortOrder" type="number" defaultValue={categories.length + 1} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked /> 전시</label>
        </AdminCreateModal>
      </div>
      <div className="mt-8 space-y-6">
        {categories.map((category) => (
          <form key={category.id} action={updateCategory} className="grid gap-3 border border-line p-5">
            <input type="hidden" name="id" value={category.id} />
            <input className="field" name="name" defaultValue={category.name} />
            <input className="field" name="slug" defaultValue={category.slug} />
            <input className="field" name="description" defaultValue={category.description} />
            <input className="field" name="imageUrl" defaultValue={category.imageUrl} />
            <input className="field" name="sortOrder" type="number" defaultValue={category.sortOrder} />
            <label className="text-sm">
              <input type="checkbox" name="isVisible" defaultChecked={category.isVisible} /> 전시
            </label>
            <div className="flex gap-2">
              <button className="btn">수정</button>
              <button className="btn btn-ghost" formAction={deleteCategory}>
                삭제
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
