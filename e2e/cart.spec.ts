import { expect, test } from "@playwright/test";

test("장바구니", async ({ page }) => {
  await page.goto("/products");
  const cards = page.locator("[data-testid='상품카드'][data-purchasable='true']");
  const count = await cards.count();
  let card = cards.first();
  for (let index = 0; index < count; index += 1) {
    const stock = Number(await cards.nth(index).getAttribute("data-stock"));
    if (stock >= 2) {
      card = cards.nth(index);
      break;
    }
  }
  await expect(card.getByTestId("판매가")).toBeVisible();
  await card.getByTestId("상품링크").click();

  const detail = page.getByTestId("상품상세");
  await expect(detail).toHaveAttribute("data-purchasable", "true");
  const salePrice = page.getByTestId("판매가");
  await expect(salePrice).toBeVisible();
  const listPrice = Number(await salePrice.getAttribute("data-price"));
  await expect(page.getByTestId("재고")).toHaveAttribute("data-purchasable", "true");
  await expect(page.getByTestId("장바구니담기")).toBeEnabled();

  await page.getByTestId("장바구니담기").click();
  await page.getByTestId("장바구니이동").click();

  const line = page.getByTestId("장바구니상품");
  await expect(line.getByTestId("장바구니상품명")).toBeVisible();
  await expect(line).toHaveAttribute("data-quantity", "1");
  await expect(line).toHaveAttribute("data-unit-price", String(listPrice));
  await expect(line).toHaveAttribute("data-line-amount", String(listPrice));
  await expect(line.getByTestId("장바구니단가")).toHaveAttribute("data-price", String(listPrice));

  await line.getByTestId("장바구니수량증가").click();
  await expect(line).toHaveAttribute("data-quantity", "2");
  await expect(line).toHaveAttribute("data-line-amount", String(listPrice * 2));
  await expect(line.getByTestId("장바구니수량")).toHaveAttribute("data-quantity", "2");

  await page.reload();
  const kept = page.getByTestId("장바구니상품");
  await expect(kept).toHaveAttribute("data-quantity", "2");
  await expect(kept).toHaveAttribute("data-line-amount", String(listPrice * 2));

  await kept.getByTestId("상품삭제").click();
  await expect(page.getByTestId("빈장바구니")).toBeVisible();
  await expect(page.getByTestId("헤더장바구니수량")).toHaveCount(0);
});
