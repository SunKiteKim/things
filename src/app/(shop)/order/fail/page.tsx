import Link from "next/link";

export default function OrderFailPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="display text-4xl">결제가 완료되지 않았습니다</h1>
      <Link href="/checkout" className="btn mt-8 inline-flex">
        주문서 다시 열기
      </Link>
    </div>
  );
}
