import crypto from "crypto";
import db from "../config/database.js";

async function createSubscription(email, repo) {
  const token = crypto.randomBytes(16).toString('hex');
    await db("subscriptions").insert({
      email,
      repo,
      token,
      last_seen_tag: "",
    });

}

export default createSubscription;
