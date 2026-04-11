import cron from "node-cron";
import db from "../db/database.js";
import { getReleaseTag } from "../services/github.js";
import { sendReleaseEmail } from "../services/mailer.js";

let globalPauseUntil = 0;

export async function runScanner() {
  if(Date.now() < globalPauseUntil) {
    return
  };
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
            .select("email", "token")
            .where({ repo, confirmed: true });
          if (subscribers.length > 0) {
            for(const { email, token } of subscribers) {
              await sendReleaseEmail(email, repo, latestTag, token);
            }
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
          const resetTimestamp = err.resetTimestamp;

          if(resetTimestamp) {
            const resetDate = new Date(resetTimestamp * 1000);
            globalPauseUntil = resetDate.getTime();
            console.log("GitHub API Rate Limit Exceeded")
          }
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
