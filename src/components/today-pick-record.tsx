"use client";

export function TodayPickRecord({ date, products }: { date: string; products: { id: string; name: string; price: number; originalPrice: number | null; couponPrice: number; stock: number }[] }) {
  function download() {
    const record = {
      pickDate: date,
      capturedAt: new Date().toISOString(),
      timezone: "Asia/Seoul",
      priceBasis: "기획전·타임세일 적용 후, 쿠폰 적용 전 상품 단가",
      note: "현재 화면의 기록입니다. 이후 재고·가격·쿠폰 조건 변경은 이 파일에 반영되지 않습니다.",
      products,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `things-today-pick-${date}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" onClick={download} className="mb-6 text-sm underline underline-offset-4">현재 상품·가격 기록 저장</button>;
}
