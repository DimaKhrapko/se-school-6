import createSubscription from "../services/subscription.js";

const subscribeBodyScheme = {
  type: "object",
  required: ["email", "repo"],
  properties: {
    email: {
      type: "string",
      format: "email",
    },
    repo: {
      type: "string",
      pattern: "^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$",
    },
  },
};

async function routes(fastify, options) {
  fastify.post(
    "/subscribe",
    {
      schema: {
        body: subscribeBodyScheme,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          message: "Invalid input (e.g., invalid repo format)",
        });
      }
      const { email, repo } = request.body;

      try {
        await createSubscription(email, repo);
      } catch (err) {
        if (err.code === "23505") {
          return reply
            .status(409)
            .send({ message: "Email already subscribed to this repository" });
        }
        return reply.status(500).send({ message: "Internal server error" });
      }

      return reply
        .status(200)
        .send({ message: "Subscription successful. Confirmation email sent." });
    },
  );
}

export default routes;
