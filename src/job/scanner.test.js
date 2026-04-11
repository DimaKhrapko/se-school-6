import { jest } from "@jest/globals";

jest.unstable_mockModule("../services/github.js", () => ({
  getReleaseTag: jest.fn(),
}));

jest.unstable_mockModule("../db/database.js", () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule("../services/mailer.js", () => ({
  sendReleaseEmail: jest.fn(),
}));

const { runScanner } = await import("./scanner.js");
const { getReleaseTag } = await import("../services/github.js");
const db = (await import("../db/database.js")).default;
const { sendReleaseEmail } = await import("../services/mailer.js");

describe("Scanner business logic (runScanner)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Stop, if no active subscriptions in db", async () => {
    db.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([])
    })

    await runScanner();

    expect(getReleaseTag).not.toHaveBeenCalled()
  })

  test("New subscription, no tag in db", async ()=> {
    db.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ repo: 'owner/repo' }]),
      where: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ last_seen_tag: null }), 
      update: jest.fn().mockResolvedValue(1)
    })

    getReleaseTag.mockResolvedValue('v1.0.0');

    await runScanner();

    expect(db().update).toHaveBeenCalledWith({ last_seen_tag: 'v1.0.0' });
    expect(sendReleaseEmail).not.toHaveBeenCalled();
  })

  test("Same saved tag as in github release, nothing changes", async () => {
    db.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ repo: 'owner/repo' }]),
      where: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ last_seen_tag: 'v1.0.0' }),
      update: jest.fn().mockResolvedValue(1)
    });

    getReleaseTag.mockResolvedValue('v1.0.0');

    await runScanner();
    
    expect(sendReleaseEmail).not.toHaveBeenCalled();
    expect(db().update).not.toHaveBeenCalled();
  })

  test("Send email and update db with new release ", async () => {
    db.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ repo: "owner/repo" }]),
      first: jest.fn().mockResolvedValue({ last_seen_tag: "v1.0.0" }),
      update: jest.fn().mockResolvedValue(1),

      where: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),

      then: function (resolve) {
        resolve([{ email: "test@example.com", token: "123" }]);
      },
    });

    getReleaseTag.mockResolvedValue("v2.0.0");

    await runScanner();

    expect(sendReleaseEmail).toHaveBeenCalledWith(
      "test@example.com",
      "owner/repo",
      "v2.0.0",
      "123",
    );
  });

  test("Pause if gets error 403 or 429 GitHub", async () => {
    db.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([{ repo: "owner/repo" }]),
    });

    const mockError = new Error("Rate limit");
    mockError.status = 429;
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    mockError.resetTimestamp = futureTime;

    getReleaseTag.mockRejectedValue(mockError);

    await runScanner();

    expect(getReleaseTag).toHaveBeenCalledWith("owner/repo");

    await runScanner();
    expect(db).toHaveBeenCalledTimes(1);
  });
});
