import { prisma } from "@/lib/prisma";
import { createBanner, deleteBanner, updateBanner } from "@/actions/display";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { AdminMasterDetail } from "@/components/admin-master-detail";

export default async function BannersAdminPage() {
  const banners = await prisma.banner.findMany({ orderBy: { id: "desc" } });

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
      <AdminMasterDetail
        listTitle="배너 목록"
        detailTitle="배너 상세"
        columns={["제목", "연결 링크", "정렬", "상태"]}
        rows={banners.map((banner) => ({
          id: banner.id,
          cells: [banner.title, banner.href, banner.sortOrder, banner.isActive ? "노출" : "숨김"],
          detail: <form action={updateBanner} className="grid max-w-3xl gap-4"><input type="hidden" name="id" value={banner.id} /><label className="text-sm font-medium">제목<input className="field mt-2" name="title" defaultValue={banner.title} /></label><label className="text-sm font-medium">부제<input className="field mt-2" name="subtitle" defaultValue={banner.subtitle} /></label><label className="text-sm font-medium">이미지 URL<input className="field mt-2" name="imageUrl" defaultValue={banner.imageUrl} /></label><label className="text-sm font-medium">연결 링크<input className="field mt-2" name="href" defaultValue={banner.href} /></label><label className="text-sm font-medium">정렬 순서<input className="field mt-2" name="sortOrder" type="number" defaultValue={banner.sortOrder} /></label><label className="text-sm"><input type="checkbox" name="isActive" defaultChecked={banner.isActive} /> 노출</label><div className="flex gap-2"><button className="btn">수정</button><button className="btn btn-ghost" formAction={deleteBanner}>삭제</button></div></form>,
        }))}
      />
    </div>
  );
}
