import Fastify from "fastify";
import fastifyFormbody from "@fastify/formbody";
import fastifyMetrics from "fastify-metrics";
import routes from "./routes.js";
import "dotenv/config";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyMetrics, { endpoint: '/metrics'});
fastify.register(fastifyFormbody);
fastify.register(routes, { prefix: "/api" });

export default fastify;