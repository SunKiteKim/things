# tHings

포트폴리오용 오브제 이커머스. 로고는 **Montserrat ExtraBold 900**의 `tHings` 워드마크입니다.

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

브라우저에서 [http://localhost:3000](http://localhost:3000)

## 데모 계정

관리자 시드 계정은 `.env`의 `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`로 생성합니다.
회원 데모 계정이 필요하면 `SEED_MEMBER_EMAIL`, `SEED_MEMBER_PASSWORD`도 설정하세요.
실서비스 비밀번호나 개인 이메일은 저장소에 커밋하지 마세요.

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
