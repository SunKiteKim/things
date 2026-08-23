import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory, updateCategory } from "@/actions/display";
import { LIMITS } from "@/lib/utils";

export default async function CategoriesAdminPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="display text-4xl">카테고리 관리</h1>
      <p className="mt-2 text-sm text-muted">
        {categories.length} / {LIMITS.MAX_CATEGORIES}개
      </p>
      <form action={createCategory} className="mt-8 grid gap-3 border border-line bg-surface p-6">
        <input className="field" name="name" placeholder="카테고리명" required />
        <input className="field" name="slug" placeholder="slug" />
        <input className="field" name="description" placeholder="설명" />
        <input className="field" name="imageUrl" placeholder="이미지 URL" />
        <input className="field" name="sortOrder" type="number" defaultValue={categories.length + 1} />
        <label className="text-sm">
          <input type="checkbox" name="isVisible" defaultChecked /> 전시
        </label>
        <button className="btn w-fit">카테고리 등록</button>
      </form>
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
