import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../src/app.module";

describe("Auth + /me (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://liveapp:liveapp_password@localhost:5432/liveapp?schema=public";
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    // Clean DB between tests
    await prisma.refreshToken.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("signup -> /me works", async () => {
    const signup = await request(app.getHttpServer())
      .post("/auth/signup")
      .send({
        email: "joseph@example.com",
        username: "joseph_1",
        password: "supersecret123",
      })
      .expect(201);

    expect(signup.body.accessToken).toBeTruthy();
    expect(signup.body.refreshToken).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${signup.body.accessToken}`)
      .expect(200);

    expect(me.body.user.email).toBe("joseph@example.com");
    expect(me.body.profile.displayName).toBe("joseph_1");
  });

  it("login -> refresh -> logout revokes token", async () => {
    await request(app.getHttpServer())
      .post("/auth/signup")
      .send({
        email: "test2@example.com",
        username: "test_user2",
        password: "supersecret123",
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ emailOrUsername: "test2@example.com", password: "supersecret123" })
      .expect(200);

    const refresh = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken: refresh.body.refreshToken })
      .expect(200)
      .expect({ ok: true });

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: refresh.body.refreshToken })
      .expect(401);
  });
});
