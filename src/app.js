import fastify from "./api/server.js";
import { initScanner } from "./job/scanner.js";

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0'});
    initScanner();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
