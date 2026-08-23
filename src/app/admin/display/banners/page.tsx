import { prisma } from "@/lib/prisma";
import { createBanner, deleteBanner, updateBanner } from "@/actions/display";

export default async function BannersAdminPage() {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="display text-4xl">배너관리</h1>
      <form action={createBanner} className="mt-8 grid gap-3 border border-line bg-surface p-6">
        <input className="field" name="title" placeholder="제목" required />
        <input className="field" name="subtitle" placeholder="부제" />
        <input className="field" name="imageUrl" placeholder="이미지 URL" required />
        <input className="field" name="href" placeholder="링크" defaultValue="/" />
        <input className="field" name="sortOrder" type="number" placeholder="정렬" defaultValue="0" />
        <label className="text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> 노출
        </label>
        <button className="btn w-fit">배너 등록</button>
      </form>
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
