import { configDotenv } from "dotenv";

async function checkRepoExists(repo) {
  const url = `https://api.github.com/repos/${repo}`;

  const headers = {
    "User-Agent": "se-school-6",
    Accept: "application/vnd.github.v3+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: "GET", headers });

  if (response.status === 404) return false;
  if (response.status === 403 || response.status === 429) {
    const error = new Error("GitHub API Rate Limit Exceeded");
    error.status = 429;
    throw error;
  }
  return true;
}

async function getReleaseTag(repo) {
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  const headers = {
    "User-Agent": "se-school-6",
    Accept: "application/vnd.github.v3+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: "GET", headers });

  if (response.status === 200) {
    const data = await response.json();
    return data.tag_name;
  }
  if (response.status === 404) {
    return null;
  }
  if (response.status === 403 || response.status === 429) {
    const error = new Error("GitHub API Rate Limit Exceeded");
    error.status = 429;
    throw error;
  }

  throw new Error("Internal server error");
}

export { checkRepoExists, getReleaseTag };
