import { prisma } from "@/lib/prisma";
import { isDisplayPage, syncDisplayItems, type DisplayPageKey } from "@/lib/display-items";

export async function loadPageDisplay(pageKey: DisplayPageKey) {
  await syncDisplayItems(prisma);
  return prisma.displayItem.findMany({
    where: { pageKey },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export { isDisplayPage, syncDisplayItems };
