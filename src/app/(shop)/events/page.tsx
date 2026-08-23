import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function EventsPage() {
  const exhibitions = await prisma.exhibition.findMany({
    where: { isActive: true },
    orderBy: { startAt: "desc" },
  });

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Events</p>
      <h1 className="display mt-3 text-5xl">이벤트 · 기획전</h1>
      <div className="mt-12 grid gap-10">
        {exhibitions.map((item) => (
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
