import cron from "node-cron";
import db from "../config/database.js";
import { getReleaseTag } from "../services/github.js";

async function runScanner() {
  try {
    const repos = await db("subscriptions").distinct("repo");
    if (!repos.length) {
      console.log("No active subscriptions");
      return;
    }

    for (const { repo } of repos) {
      try {
        const latestTag = await getReleaseTag(repo);

        if (!latestTag) {
          console.log("Repo doesn't have releases");
          continue;
        }

        const knownSub = await db("subscriptions")
          .where({ repo })
          .whereNotNull("last_seen_tag")
          .first();

        const lastSeenTag = knownSub ? knownSub.last_seen_tag : null;

        if (!lastSeenTag) {
          await db("subscriptions")
            .where({ repo })
            .update({ last_seen_tag: latestTag });
          continue;
        }

        if (lastSeenTag !== latestTag) {
          const subscribers = await db("subscriptions")
            .select("email")
            .where({ repo, confirmed: true });
          const emails = subscribers.map((sub) => sub.email);
          if (emails.length > 0) {
            console.log(`Sending from ${repo} to ${emails.length}`);
          }

          await db("subscriptions")
            .where({ repo })
            .update({ last_seen_tag: latestTag });
          continue;
        }

        if (lastSeenTag === latestTag) {
          await db("subscriptions")
            .where({ repo })
            .andWhere((builder) => {
              builder.whereNull("last_seen_tag").orWhere("last_seen_tag", "");
            })
            .update({ last_seen_tag: latestTag });
        }
      } catch (err) {
        if (err.status === 403 || err.status === 429) {
          console.log("GitHub API Rate Limit Exceeded");
          break;
        }
      }
    }
  } catch (err) {
    console.error(err.message);
  }
}

export async function initScanner() {
  cron.schedule("* * * * *", runScanner);
}
