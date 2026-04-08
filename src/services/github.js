import { configDotenv } from "dotenv";

async function checkRepoExists(repo) {
  const url = `https://api.github.com/repos/${repo}`;

  const headers = {
    "User-Agent" : "se-school-6",
    "Accept" : "application/vnd.github.v3+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if(token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {method: "GET", headers});

  if(response.status === 404) return false;
  if(response.status === 403 || response.status === 429) {
    const error = new Error("GitHub API Rate Limit Exceeded");
    error.status = 429;
    throw error;
  } 
  return true;
}

export default checkRepoExists;