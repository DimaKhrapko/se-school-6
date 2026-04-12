import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const { Client } = pg;

const client = new Client({
  host: "localhost",
  port: Number(process.env.DB_PORT) || "postgres",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: "postgres",
});

async function setupTestDb() {
  try {
    await client.connect();

    const res = await client.query(`
      SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('github_notifier_test');
    `);

    if (res.rowCount === 0) {
      console.log("Test db not found, creating github_notifier_test");
      await client.query("CREATE DATABASE github_notifier_test");
    } else {
      console.log("Test db exists");
    }
  } catch (err) {
    console.log("Error creating db", err.message);
  } finally {
    await client.end();
  }
}

setupTestDb();
