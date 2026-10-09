import { Elysia, t } from "elysia";

const notification = t.Object({
  Type: t.Optional(t.String()),
  SubscribeURL: t.Optional(t.String({ format: "uri" })),
  Message: t.Optional(t.String()),
});

export const sesWebhook = new Elysia({ name: "ses-webhook" }).post(
  "/webhooks/ses",
  async ({ body, status }) => {
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      await fetch(body.SubscribeURL);
      return status(200, { accepted: true });
    }
    if (body.Type !== "Notification" || !body.Message)
      return status(400, { accepted: false });
    try {
      const event = JSON.parse(body.Message) as {
        eventType?: string;
        mail?: { messageId?: string };
      };
      console.info(
        JSON.stringify({
          msg: "ses_event",
          messageId: event.mail?.messageId ?? null,
          status: event.eventType ?? "UNKNOWN",
        }),
      );
      return status(204);
    } catch {
      return status(400, { accepted: false });
    }
  },
  { body: notification },
);
