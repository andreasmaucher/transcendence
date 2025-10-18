import { FastifyInstance } from "fastify";

export default async function scoreRoutes(fastify: FastifyInstance) {
  // ...existing routes...

  fastify.post("/score/update", async (request, reply) => {
    // Extract safe, non-sensitive identifiers for logging
    const { matchId, userId, delta, newScore } = (request.body || {}) as {
      matchId?: string | number;
      userId?: string | number;
      delta?: number;
      newScore?: number;
    };

    request.log.info(
      {
        reqId: request.id,
        action: "score.update.start",
        matchId,
        userId,
        delta,
        newScore,
      },
      "starting score update"
    );

    try {
      // ...existing code...
      // Perform the actual score update in DB/service
      // const prevScore = await getPrevScore(...);
      // const updated = await updateScore(...);

      // Example post-update log; replace prevScore/updated as appropriate
      const prevScore = undefined as any; // ...existing code...
      const updated = undefined as any; // ...existing code...

      request.log.info(
        {
          reqId: request.id,
          action: "score.update.success",
          matchId,
          userId,
          prevScore,
          newScore: updated?.score ?? newScore,
        },
        "score update succeeded"
      );

      // ...existing code...
      return reply.send(updated /* or your response object */);
    } catch (err) {
      request.log.error(
        {
          reqId: request.id,
          action: "score.update.fail",
          matchId,
          userId,
          err,
        },
        "score update failed"
      );
      // ...existing code...
      throw err;
    }
  });

  // ...existing routes...
}
