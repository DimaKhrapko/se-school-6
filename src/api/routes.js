import {
  createSubscription,
  confirmSubscription,
  cancelSubscription,
  checkSubscription,
} from "../services/subscription.js";

const tokenValidScheme = {
  type: "object",
  required: ["token"],
  properties: {
    token: {
      type: "string",
      minLength: 32,
      maxLength: 32,
      pattern: "^[0-9a-f]{32}",
    },
  },
};

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

const emailQueryScheme = {
  type: "object",
  required: ["email"],
  properties: {
    email: {
      type: "string",
      format: "email",
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

  fastify.get(
    "/confirm/:token",
    {
      schema: {
        params: tokenValidScheme,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({ message: "Invalid token" });
      }

      const { token } = request.params;

      const isConfirmed = await confirmSubscription(token);
      if (!isConfirmed) {
        return reply.status(404).send({ message: "Token not found" });
      }

      return reply
        .status(200)
        .send({ message: "Subscription confirmed successfully" });
    },
  );
  fastify.get(
    "/unsubscribe/:token",
    {
      schema: {
        params: tokenValidScheme,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({ message: "Invalid token" });
      }

      const { token } = request.params;

      const isCancelled = await cancelSubscription(token);
      if (!isCancelled) {
        return reply.status(404).send({ message: "Token not found" });
      }

      return reply.status(200).send({ message: "Unsubscribed successfully" });
    },
  );

  fastify.get(
    "/subscriptions",
    {
      schema: {
        querystring: emailQueryScheme,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({ message: "Invalid email" });
      }

      const { email } = request.query;

      const userSubscriptions = await checkSubscription(email);

      return reply.status(200).send( userSubscriptions );
    },
  );
}

export default routes;
