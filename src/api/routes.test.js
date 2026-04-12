import { beforeEach, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../services/mailer.js", () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue(true),
}));
jest.unstable_mockModule("../services/github.js", () => ({
  checkRepoExists: jest.fn(),
}));

const { sendConfirmationEmail } = await import("../services/mailer.js");
const db = (await import("../db/database.js")).default;
const fastify = (await import("../api/server.js")).default;
const { checkRepoExists } = await import("../services/github.js");

beforeAll(async () => {
  await fastify.ready();
  await db.migrate.latest();
});

afterAll(async () => {
  await db.destroy();
  await fastify.close();
});

describe("POST /api/subscribe", () => {
  beforeEach(async () => {
    await db("subscriptions").truncate();
  });

  test("Save subscription and return status 200", async () => {
    sendConfirmationEmail.mockClear();
    checkRepoExists.mockResolvedValueOnce(true);
    const response = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload: {
        email: "test@example.com",
        repo: "facebook/react",
      },
    });

    expect(response.statusCode).toBe(200);

    const insertedRecord = await db("subscriptions")
      .where({ email: "test@example.com" })
      .first();

    expect(insertedRecord).toBeDefined();
    expect(insertedRecord.repo).toBe("facebook/react");

    expect(sendConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  test("Return status 400 if email is invalid", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload: {
        email: "not-an-email",
        repo: "facebook/react",
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);
    expect(body.message).toContain("Invalid input (e.g., invalid repo format)");

    const userCount = await db("subscriptions").count("* as count").first();
    expect(Number(userCount.count)).toBe(0);
  });

  test("Return status 400 if repo is invalid", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload: {
        email: "test@example.com",
        repo: "facebookreact",
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);
    expect(body.message).toContain("Invalid input (e.g., invalid repo format)");

    const userCount = await db("subscriptions").count("* as count").first();
    expect(Number(userCount.count)).toBe(0);
  });

  test("Return status 404 if Github repo does not exists or is private", async () => {
    checkRepoExists.mockResolvedValueOnce(false);

    const response = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload: {
        email: "test@example.com",
        repo: "nobody/does-not-exist-or-is-private",
      },
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.payload);
    expect(body.message).toBe("Repository not found on GitHub");

    const userCount = await db("subscriptions").count("* as count").first();
    expect(Number(userCount.count)).toBe(0);
  });

  test("Return status 409 if email already subscribed to the repo", async () => {
    checkRepoExists.mockResolvedValue(true);

    const payload = {
      email: "duplivate@example.com",
      repo: "facebook/react",
    };

    const firstResponse = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload,
    });

    expect(firstResponse.statusCode).toBe(200);

    const secondResponse = await fastify.inject({
      method: "POST",
      url: "/api/subscribe",
      payload,
    });

    expect(secondResponse.statusCode).toBe(409);

    const body = JSON.parse(secondResponse.payload);

    expect(body.message).toBe("Email already subscribed to this repository");

    const userCount = await db("subscriptions")
      .where(payload)
      .count("* as count")
      .first();
    expect(Number(userCount.count)).toBe(1);
  });
});

describe("GET /api/confirm/:token", () => {
  const validTestToken = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

  beforeEach(async () => {
    await db("subscriptions").truncate();
    await db("subscriptions").insert({
      email: "confirm-test@example.com",
      repo: "test/repo",
      token: validTestToken,
      confirmed: false,
    });
  });

  test("Return status 200 and confirm subscription for a valid token", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/confirm/${validTestToken}`,
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Subscription confirmed successfully");

    const updatedRecord = await db("subscriptions")
      .where({ token: validTestToken })
      .first();

    expect(updatedRecord).toBeDefined();
    expect(updatedRecord.confirmed).toBeTruthy();
  });

  test("Return status 400 for an invalid token format", async () => {
    const shortToken = "abc123";

    const response = await fastify.inject({
      method: "GET",
      url: `/api/confirm/${shortToken}`,
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Invalid token");

    const record = await db("subscriptions")
      .where({ token: validTestToken })
      .first();

    expect(record.confirmed).toBeFalsy();
  });

  test("Return status 404 if token format is valid but not found in db", async () => {
    const missingToken = "f".repeat(32);

    const response = await fastify.inject({
      method: "GET",
      url: `/api/confirm/${missingToken}`,
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Token not found");
  });
});

describe("GET /api/unsubscribe/:token", () => {
  const validTestToken = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

  beforeEach(async () => {
    await db("subscriptions").truncate();
    await db("subscriptions").insert({
      email: "confirm-test@example.com",
      repo: "test/repo",
      token: validTestToken,
      confirmed: false,
    });
  });

  test("Return status 200 and cancel subscription for a valid token", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/unsubscribe/${validTestToken}`,
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Unsubscribed successfully");

    const updatedRecord = await db("subscriptions")
      .where({ token: validTestToken })
      .first();

    expect(updatedRecord).toBeUndefined();
  });

  test("Return status 400 for an invalid token format", async () => {
    const shortToken = "abc123";

    const response = await fastify.inject({
      method: "GET",
      url: `/api/unsubscribe/${shortToken}`,
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Invalid token");

    const record = await db("subscriptions")
      .where({ token: validTestToken })
      .first();

    expect(record).toBeDefined();
  });

  test("Return status 404 if token format is valid but not found in db", async () => {
    const missingToken = "f".repeat(32);

    const response = await fastify.inject({
      method: "GET",
      url: `/api/unsubscribe/${missingToken}`,
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Token not found");
  });
});

describe("GET /api/subscriptions", () => {
  const targetEmail = "fetch-test@example.com";
  const otherEmail = "someone-else@example.com";

  beforeEach(async () => {
    await db("subscriptions").truncate();
    await db("subscriptions").insert([
      {
        email: targetEmail,
        repo: "facebook/react",
        token: "token1",
        confirmed: true,
      },
      {
        email: targetEmail,
        repo: "vuejs/vue",
        token: "token2",
        confirmed: false,
      },
      {
        email: otherEmail,
        repo: "sveltejs/svelte",
        token: "token3",
        confirmed: true,
      },
    ]);
  });

  test("Return status 200 and list of subscriptions for a valid email", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/subscriptions`,
      query: { email: targetEmail },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    const repos = body.map((sub) => sub.repo);

    expect(repos).toContain("facebook/react");
    expect(repos).toContain("vuejs/vue");
    expect(repos).not.toContain("sveltejs/svelte");
  });

  test("Return status 400 if email is invalid", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/subscriptions`,
      query: { email: "not-an-email" },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);

    expect(body.message).toBe("Invalid email");
  });

  test("Return status 200 and empty array if email has no subscriptions", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/subscriptions`,
      query: { email: "ghost@example.com" },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });
});
