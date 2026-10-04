import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { loadPageDisplay } from "@/lib/display";

export default async function EventsPage() {
  const [exhibitions, display] = await Promise.all([
    prisma.exhibition.findMany({
      where: { isActive: true },
    }),
    loadPageDisplay("events"),
  ]);
  const placement = new Map(
    display.filter((item) => item.kind === "exhibition").map((item) => [item.refId, item]),
  );
  const visible = exhibitions
    .filter((item) => placement.get(item.id)?.isVisible === true)
    .sort((left, right) => {
      const leftOrder = placement.get(left.id)?.sortOrder ?? 0;
      const rightOrder = placement.get(right.id)?.sortOrder ?? 0;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return right.startAt.getTime() - left.startAt.getTime();
    });

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Events</p>
      <h1 className="display mt-3 text-5xl">이벤트 · 기획전</h1>
      <div className="mt-12 grid gap-10">
        {visible.map((item) => (
          <Link key={item.id} href={`/events/${item.slug}`} className="grid gap-6 md:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden bg-surface">
              <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-sm text-muted">
                {formatDate(item.startAt)} – {formatDate(item.endAt)}
              </p>
              <h2 className="display mt-3 text-4xl">{item.title}</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
