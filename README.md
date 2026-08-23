# tHings

포트폴리오용 오브제 이커머스. 로고는 **Montserrat ExtraBold 900**의 `tHings` 워드마크입니다.

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

브라우저에서 [http://localhost:3000](http://localhost:3000)

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| Admin | admin@things.store | admin1234 |
| 회원 | member@things.store | member1234 |

쿠폰 코드: `THINGS10`, `WELCOME5`

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

## Vercel 배포

1. GitHub 저장소에 푸시
2. [vercel.com](https://vercel.com)에서 저장소 Import
3. Environment Variables 설정

| Key | 값 |
| --- | --- |
| `DATABASE_URL` | Postgres 연결 문자열 (Neon, Vercel Postgres 등) |
| `NEXTAUTH_SECRET` | 긴 랜덤 문자열 |
| `NEXTAUTH_URL` | 배포 주소, 예: `https://프로젝트.vercel.app` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss 테스트 클라이언트 키 |
| `TOSS_SECRET_KEY` | Toss 테스트 시크릿 키 |
| `GOOGLE_CLIENT_ID` | 선택 |
| `GOOGLE_CLIENT_SECRET` | 선택 |

4. 배포 후 Postgres에 `npx prisma db push`와 `npm run db:seed`를 한 번 실행
