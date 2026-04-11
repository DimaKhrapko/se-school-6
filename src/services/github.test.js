import { describe, jest } from "@jest/globals";
import { checkRepoExists, getReleaseTag } from "./github";

global.fetch = jest.fn();

describe('GitHub service - checkRepoExists', () => {
  beforeEach(() => {
    fetch.mockClear();
  })

  test('Return true if repo exists', async () => {
    fetch.mockResolvedValueOnce({ status: 200});
    const result = await checkRepoExists('owner/repo');
    expect(result).toBe(true);
  })

  test('Return false if repo doesn\'t exist or is private', async () => {
    fetch.mockResolvedValueOnce({ status: 404});
    const result = await checkRepoExists('owner/non-existent');
    expect(result).toBe(false);
  })

  test('Throw error if github api rate limit exceeded', async () => {
    fetch.mockResolvedValueOnce({ status: 429});
    await expect(checkRepoExists('owner/repo'))
      .rejects
      .toThrow('GitHub API Rate Limit Exceeded');
  })
})

describe('GitHub service - getReleaseTag', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('Return tag_name if release exists (status 200)', async () => {
    fetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue({ tag_name: 'v2.0.0' })
    })
    const result = await getReleaseTag('owner/repo');

    expect(result).toBe('v2.0.0');
  })

  test('Return null if no release found (status 400)', async () => {
    fetch.mockResolvedValueOnce({ status: 404 });
    const result = await (getReleaseTag('owner/repo'));

    expect(result).toBeNull();
  })

  test('Throw error with resetTimestamp on rate limit (status 403/429)', async () => {
    fetch.mockResolvedValueOnce({
      status: 429,
      headers: {
        get: jest.fn().mockReturnValue('1712879999')
      }
    })

    try {
      await getReleaseTag('owner/repo');
    }
    catch(err) {
      expect(err.message).toBe('GitHub API Rate Limit Exceeded');
      expect(err.status).toBe(429);
      expect(err.resetTimestamp).toBe('1712879999');
    }
  })
})