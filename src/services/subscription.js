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

async function cancelSubscription(token) {
  return await db("subscriptions").where({ token: token }).del();
}

async function checkSubscription(email) {
  return (await db("subscriptions").select("email", "repo", "confirmed", "last_seen_tag").where({email: email}))
}

export { createSubscription, confirmSubscription, cancelSubscription, checkSubscription };
