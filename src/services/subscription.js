import crypto from "crypto";
import db from "../config/database.js";

async function createSubscription(email, repo) {
  const token = crypto.randomBytes(16).toString("hex");
  await db("subscriptions").insert({
    email,
    repo,
    token,
    last_seen_tag: "",
  });
}

async function confirmSubscription(token) {
  return await db("subscriptions")
    .where({ token: token })
    .update({ confirmed: true });
}

export { createSubscription, confirmSubscription };
