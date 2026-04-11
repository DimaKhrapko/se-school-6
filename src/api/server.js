import Fastify from "fastify";
import fastifyFormbody from "@fastify/formbody";
import routes from "./routes.js";
import "dotenv/config";
import { initScanner } from "../job/scanner.js";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyFormbody);
fastify.register(routes, { prefix: "/api" });

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    initScanner();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export default start;
