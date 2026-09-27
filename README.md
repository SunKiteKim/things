# things

테스트 자동화 포트폴리오용 이커머스. 로고는 **Montserrat ExtraBold 900**의 `tHings` 워드마크입니다.

**라이브:** [https://things4demo.site](https://things4demo.site)  
**어드민:** [https://adm.things4demo.site](https://adm.things4demo.site)

`www.things4demo.site`와 Vercel 기본 프로덕션 주소는 `things4demo.site`로 리다이렉트됩니다.  
쇼핑몰의 `/admin`은 `https://adm.things4demo.site`로 넘어갑니다.

## 실행

PostgreSQL이 필요합니다. Docker가 있으면:

```bash
docker compose up -d
```

`.env`의 `DATABASE_URL` 예시는 아래와 같습니다.

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/things?schema=public"
```

```bash
npm install
npx prisma generate
npm run db:reset
npm run dev
```

## 데모 계정

관리자 시드 계정은 로그인 페이지 하단에 적혀있습니다.
회원 데모 계정이 필요하면 회원 가입 가능합니다.
실서비스 비밀번호나 개인 이메일은 저장소에 커밋하지 마세요.



## 구성

### FO
- 메인 `/`
- 상품 카테고리 `/category/[slug]`
- 상품 상세 `/product/[slug]`
- 회원가입 `/signup`
- 검색 결과 `/search`
- 이벤트 `/events`
- 장바구니 `/cart`
- 주문서 `/checkout`
- 주문완료 `/order/complete`
- 마이페이지 회원정보 `/mypage`
- 주문조회 `/mypage/orders`
- 주문상세 `/mypage/orders/[id]`

### Admin
- 회원관리 CRUD
- 전시관리: 배너, 카테고리 CRUD
- 상품관리: 상품 등록 CRUD, 상품전시관리
- 프로모션: 쿠폰, 기획전 CRUD
- 주문관리 RUD (생성 없음)

## 한도

- 회원 최대 20명
- 상품 최대 50개
- 전시 카테고리 최대 5개

## 연동

`.env`에 Google 클라이언트 키를 넣으면 로그인 페이지의 소셜 로그인이 활성화됩니다.
Toss는 테스트 키가 기본으로 들어 있습니다. 위젯이 준비되지 않은 환경에서는 주문서의 **데모 결제**로 주문 완료까지 확인할 수 있습니다.

## 도메인 · Vercel 배포

메인 도메인은 `https://things4demo.site` 입니다.

1. GitHub 저장소에 푸시
2. [vercel.com](https://vercel.com)에서 저장소 Import
3. Project → Settings → Domains에 `things4demo.site`, `www.things4demo.site`, `adm.things4demo.site` 추가
4. 도메인 등록 업체 DNS를 아래로 맞춥니다.

| 타입 | 호스트 | 값 |
| --- | --- | --- |
| A | `@` | `10.0.1.2` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `adm` | `cname.vercel-dns.com` |

등록 업체가 네임서버 변경을 안내하면 Vercel이 준 네임서버로 바꿉니다. HTTPS 인증서는 Vercel이 발급합니다.

5. Environment Variables 설정

| Key | 값 |
| --- | --- |
| `DATABASE_URL` | Postgres 연결 문자열 (Neon, Vercel Postgres 등) |
| `NEXTAUTH_SECRET` | 긴 랜덤 문자열 |
| `NEXTAUTH_URL` | `https://things4demo.site` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss 테스트 클라이언트 키 |
| `TOSS_SECRET_KEY` | Toss 테스트 시크릿 키 |
| `GOOGLE_CLIENT_ID` | 선택 |
| `GOOGLE_CLIENT_SECRET` | 선택 |

6. Google OAuth를 쓰면 [Google Cloud Console](https://console.cloud.google.com)에 아래를 등록합니다.

- Authorized JavaScript origins: `https://things4demo.site`
- Authorized redirect URIs: `https://things4demo.site/api/auth/callback/google`

7. 배포 후 Postgres에 `npx prisma db push`와 `npm run db:seed`를 한 번 실행

## 관리자 계정 복구

스키마 적용: `npm run db:push` (기존 데이터 초기화 불필요).
로그인 화면의 **계정 찾기 · 비밀번호 재설정**에서 일회용 복구 코드를 사용합니다.
서버 운영자는 대상 환경의 DATABASE_URL을 설정한 서버 터미널에서 아래 명령으로 코드를 발급합니다.

```bash
npm run admin:recovery -- admin@example.com
```

코드는 관리자 1명에게 연결되며 30분 후 만료됩니다. 새 코드 발급 시 이전 코드는 폐기됩니다.
계정 찾기도 코드를 소비하므로 비밀번호 재설정에는 새 코드가 필요합니다.
코드는 본인 확인한 관리자에게 안전하게 전달하고 저장소에 커밋하지 마세요.
DB에는 코드의 SHA-256 해시만 저장합니다. 비밀번호 원문 조회는 제공하지 않습니다.
비밀번호 재설정 시 기존 관리자 세션은 다음 인증 검사에서 무효화됩니다.
로컬 DB와 운영 DB의 계정 및 복구 코드는 서로 별개입니다.

## 스토어 회원 ID/PW 찾기

로그인 화면의 **ID/PW 찾기** 또는 `/login/recovery`를 이용합니다.
ID 찾기는 가입 시 입력한 이름과 전화번호를, 비밀번호 재설정은 ID(이메일)·이름·전화번호를 확인합니다.
전화번호는 하이픈과 공백을 제외하고 비교합니다. 비밀번호 원문은 조회하지 않으며 새 비밀번호로 재설정합니다.
Google 가입 회원의 비밀번호는 Google 계정에서 변경해야 합니다. 비밀번호 변경 시 기존 회원 세션은
다음 인증 검사에서 무효화됩니다.

## 추가 할인

- 상품관리의 1+1 옵션을 켜면 상세에서 일반 구매 또는 1+1을 선택합니다. 1세트는 유료 1개 + 같은 상품 증정 1개이며 재고는 2개가 필요합니다. 주문에는 유료 수량과 증정 수량을 각각 저장합니다.
- 쿠폰관리의 최소 구매 수량을 지정하면 살수록 할인 쿠폰이 됩니다. 상품 종류에 관계없이 장바구니 유료 수량을 합산하며 증정품은 제외합니다. 0이면 수량 제한이 없습니다.
- 상품 할인가 기준으로 정률 또는 정액을 추가 할인합니다. 장바구니에서 쿠폰 1개를 선택하며 주문 생성 시 조건을 재검증합니다. 정액 할인은 상품 합계를 초과하지 않습니다.
- 배포 전 대상 DB에 `npm.cmd run db:push`로 Product.onePlusOne, Coupon.minQuantity, OrderItem.freeQuantity를 추가하세요. 기존 데이터는 기본값 false/0으로 유지됩니다.
- 할인 계산 검증: `npx.cmd tsx --test scripts/discounts.test.ts`
