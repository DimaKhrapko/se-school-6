import fastifyFormbody from "@fastify/formbody";
import Fastify from "fastify";
import routes from "./routes.js";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyFormbody);
fastify.register(routes, { prefix: "/api" });

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export default start;
