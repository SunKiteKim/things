import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const memberEmail = process.env.SEED_MEMBER_EMAIL?.trim().toLowerCase();
  const memberPassword = process.env.SEED_MEMBER_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error("SEED_ADMIN_EMAIL and a 10+ character SEED_ADMIN_PASSWORD are required.");
  }
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.exhibitionProduct.deleteMany();
  await prisma.exhibition.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const seedUsers = [
      {
        email: adminEmail,
        name: "tHings Admin",
        passwordHash: hashSync(adminPassword, 12),
        provider: "credentials",
        role: "ADMIN",
      },
      ...(memberEmail && memberPassword && memberPassword.length >= 10 ? [{
        email: memberEmail,
        name: "데모 회원",
        passwordHash: hashSync(memberPassword, 12),
        provider: "credentials",
        role: "MEMBER",
      }] : []),
    ];
  await prisma.user.createMany({ data: seedUsers });

  const [object, light, table, textile, scent] = await Promise.all([
    prisma.category.create({
      data: {
        name: "오브제",
        slug: "object",
        description: "손끝에 남는 형태와 무게.",
        imageUrl:
          "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: "조명",
        slug: "light",
        description: "공간을 나누는 가장 조용한 방법.",
        imageUrl:
          "https://images.unsplash.com/photo-1507473881161-ead4d0e0d00f?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: "테이블",
        slug: "table",
        description: "올려두는 일이 일상이 되는 면.",
        imageUrl:
          "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: "텍스타일",
        slug: "textile",
        description: "온도와 결을 더하는 직물.",
        imageUrl:
          "https://images.unsplash.com/photo-1600369671236-e7452150e53e?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: "센트",
        slug: "scent",
        description: "머물고 싶은 공기의 농도.",
        imageUrl:
          "https://images.unsplash.com/photo-1603006905003-be475563bc48?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 5,
      },
    }),
  ]);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: adminEmail },
  });
  const audit = {
    updatedById: admin.id,
    updatedByName: admin.name,
  };

  const products = await Promise.all([
    prisma.product.create({
      data: {
        id: "prd0001",
        name: "캐스트 아이언 캔들홀더",
        slug: "cast-iron-candleholder",
        description:
          "무광 흑철을 두드려 만든 홀더. 촛농이 흘러도 형태가 먼저 보입니다. 식탁 한가운데, 혹은 창가 선반에 두세요.",
        price: 48000,
        originalPrice: 56000,
        discountRate: 14,
        stock: 18,
        imageUrl:
          "https://images.unsplash.com/photo-1603006905003-be475563bc48?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 1,
        categoryId: object.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0002",
        name: "스톤웨어 화병 02",
        slug: "stoneware-vase-02",
        description:
          "잿빛 유약이 흘러내린 듯한 표면. 한 송이만 꽂아도 공간이 정리됩니다.",
        price: 72000,
        originalPrice: 72000,
        discountRate: 0,
        stock: 12,
        imageUrl:
          "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 2,
        categoryId: object.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0003",
        name: "핸드블로운 워터글라스 2p",
        slug: "handblown-water-glass",
        description:
          "입구가 살짝 두꺼운 수제 글라스. 물결처럼 남는 기포가 한 점씩 다릅니다.",
        price: 39000,
        originalPrice: 39000,
        discountRate: 0,
        stock: 24,
        imageUrl:
          "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 3,
        categoryId: object.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0004",
        name: "페이퍼 펜던트 조명",
        slug: "paper-pendant",
        description:
          "한지를 겹쳐 만든 반구형 펜던트. 불을 켜면 그림자가 아니라 면이 드러납니다.",
        price: 128000,
        originalPrice: 148000,
        discountRate: 14,
        stock: 8,
        imageUrl:
          "https://images.unsplash.com/photo-1507473881161-ead4d0e0d00f?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 4,
        categoryId: light.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0005",
        name: "브라스 월 라이트",
        slug: "brass-wall-light",
        description:
          "얇은 황동 암과 오pal 글라스. 복도와 침대 옆, 둘 다에 맞습니다.",
        price: 159000,
        originalPrice: 159000,
        discountRate: 0,
        stock: 6,
        imageUrl:
          "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 5,
        categoryId: light.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0006",
        name: "오크 사이드 테이블",
        slug: "oak-side-table",
        description:
          "북유럽 오크 원목. 모서리를 둥글려 손등이 먼저 닿습니다. 소파 옆, 침대 옆.",
        price: 210000,
        originalPrice: 210000,
        discountRate: 0,
        stock: 5,
        imageUrl:
          "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 6,
        categoryId: table.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0007",
        name: "월넛 서빙 트레이",
        slug: "walnut-serving-tray",
        description:
          "호두나무 결이 그대로 보이는 트레이. 아침 커피와 저녁 잔을 옮기는 용도.",
        price: 64000,
        originalPrice: 64000,
        discountRate: 0,
        stock: 15,
        imageUrl:
          "https://images.unsplash.com/photo-1611486212557-88be5ff6f941?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 7,
        categoryId: table.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0008",
        name: "린넨 테이블클로스",
        slug: "linen-tablecloth",
        description:
          "스톤워싱 린넨. 구김을 숨기지 않습니다. 140 x 220, 내추럴 아이보리.",
        price: 89000,
        originalPrice: 89000,
        discountRate: 0,
        stock: 11,
        imageUrl:
          "https://images.unsplash.com/photo-1600369671236-e7452150e53e?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 8,
        categoryId: textile.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0009",
        name: "울 스로우 블랭킷",
        slug: "wool-throw",
        description:
          "메리노 울 70%. 무릎 위에 두르기 좋은 무게. 차콜과 오트밀 투톤.",
        price: 118000,
        originalPrice: 118000,
        discountRate: 0,
        stock: 9,
        imageUrl:
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 9,
        categoryId: textile.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0010",
        name: "샌달우드 디퓨저",
        slug: "sandalwood-diffuser",
        description:
          "백단과 베르가못. 뚜껑을 열면 먼저 나무가 나고, 한 시간 뒤에 껍질이 납니다.",
        price: 42000,
        originalPrice: 42000,
        discountRate: 0,
        stock: 20,
        imageUrl:
          "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1400&q=80",
        isFeatured: true,
        sortOrder: 10,
        categoryId: scent.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0011",
        name: "비즈왁스 필라 캔들",
        slug: "beeswax-pillar",
        description:
          "밀랍 본연의 꿀 향. 무향 첨가. 지름 7cm, 높이 14cm.",
        price: 28000,
        originalPrice: 28000,
        discountRate: 0,
        stock: 30,
        imageUrl:
          "https://images.unsplash.com/photo-1608181839517-5110a512fb39?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 11,
        categoryId: scent.id,
        ...audit,
      },
    }),
    prisma.product.create({
      data: {
        id: "prd0012",
        name: "세라믹 머그 세트",
        slug: "ceramic-mug-set",
        description:
          "손잡이가 두꺼운 머그 2개. 유약은 회백, 바닥은 맨흙이 드러납니다.",
        price: 36000,
        originalPrice: 42000,
        discountRate: 14,
        stock: 16,
        imageUrl:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1400&q=80",
        sortOrder: 12,
        categoryId: object.id,
        ...audit,
      },
    }),
  ]);

  await prisma.banner.createMany({
    data: [
      {
        title: "사물을 고르는 일",
        subtitle: "취향이 쌓이는 오브제 스토어 tHings",
        imageUrl:
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1800&q=80",
        href: "/category/object",
        sortOrder: 1,
        isActive: true,
      },
      {
        title: "빛이 머무는 면",
        subtitle: "페이퍼 펜던트와 브라스 월 라이트",
        imageUrl:
          "https://images.unsplash.com/photo-1507473881161-ead4d0e0d00f?auto=format&fit=crop&w=1800&q=80",
        href: "/category/light",
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  const now = new Date();
  const later = new Date();
  later.setMonth(later.getMonth() + 2);

  const exhibition = await prisma.exhibition.create({
    data: {
      title: "가을의 결",
      slug: "autumn-grain",
      description:
        "나무, 린넨, 밀랍. 계절이 바뀌기 전, 손에 남는 질감만 모았습니다.",
      imageUrl:
        "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1800&q=80",
      startAt: now,
      endAt: later,
      isActive: true,
    },
  });

  await prisma.exhibitionProduct.createMany({
    data: [
      { exhibitionId: exhibition.id, productId: products[5].id },
      { exhibitionId: exhibition.id, productId: products[7].id },
      { exhibitionId: exhibition.id, productId: products[9].id },
      { exhibitionId: exhibition.id, productId: products[6].id },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      {
        code: "THINGS10",
        name: "첫 구매 10%",
        discountType: "PERCENT",
        discountValue: 10,
        minOrderAmount: 50000,
        maxUses: 100,
        startAt: now,
        endAt: later,
        isActive: true,
      },
      {
        code: "WELCOME5",
        name: "웰컴 5,000원",
        discountType: "AMOUNT",
        discountValue: 5000,
        minOrderAmount: 30000,
        maxUses: 200,
        startAt: now,
        endAt: later,
        isActive: true,
      },
    ],
  });

  console.log("tHings seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
