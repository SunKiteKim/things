import { prisma } from "@/lib/prisma";
import { createBanner, deleteBanner, updateBanner } from "@/actions/display";
import { AdminCreateModal } from "@/components/admin-create-modal";

export default async function BannersAdminPage() {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-3xl">배너관리</h1>
        <AdminCreateModal title="배너 등록" triggerLabel="배너 등록" action={createBanner}>
          <label className="text-sm font-medium">제목<input className="field mt-2" name="title" required /></label>
          <label className="text-sm font-medium">부제<input className="field mt-2" name="subtitle" /></label>
          <label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" required /></label>
          <label className="text-sm font-medium">연결 링크<input className="field mt-2" name="href" defaultValue="/" /></label>
          <label className="text-sm font-medium">정렬 순서<input className="field mt-2" name="sortOrder" type="number" defaultValue="0" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> 노출</label>
        </AdminCreateModal>
      </div>
      <div className="mt-8 space-y-6">
        {banners.map((banner) => (
          <form key={banner.id} action={updateBanner} className="grid gap-3 border border-line p-5">
            <input type="hidden" name="id" value={banner.id} />
            <input className="field" name="title" defaultValue={banner.title} />
            <input className="field" name="subtitle" defaultValue={banner.subtitle} />
            <input className="field" name="imageUrl" defaultValue={banner.imageUrl} />
            <input className="field" name="href" defaultValue={banner.href} />
            <input className="field" name="sortOrder" type="number" defaultValue={banner.sortOrder} />
            <label className="text-sm">
              <input type="checkbox" name="isActive" defaultChecked={banner.isActive} /> 노출
            </label>
            <div className="flex gap-2">
              <button className="btn">수정</button>
              <button className="btn btn-ghost" formAction={deleteBanner}>
                삭제
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
