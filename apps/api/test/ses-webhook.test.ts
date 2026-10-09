import { afterEach, expect, test } from "bun:test";
import { createSign, generateKeyPairSync } from "node:crypto";
import { Elysia } from "elysia";
import { createSesWebhook } from "../src/modules/webhooks/ses";

const topicArn = "arn:aws:sns:us-east-1:390403879931:flowcare-ses-events";
const certUrl =
  "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function signedMessage(
  type: "SubscriptionConfirmation" | "Notification",
  message: string,
) {
  const body: Record<string, string> = {
    Type: type,
    Message: message,
    MessageId: "sns-message-123",
    Timestamp: "2026-10-09T12:00:00.000Z",
    TopicArn: topicArn,
    SignatureVersion: "2",
    SigningCertURL: certUrl,
  };
  const fields =
    type === "Notification"
      ? ["Message", "MessageId", "Timestamp", "TopicArn", "Type"]
      : [
          "Message",
          "MessageId",
          "SubscribeURL",
          "Timestamp",
          "Token",
          "TopicArn",
          "Type",
        ];
  if (type === "SubscriptionConfirmation") {
    body.SubscribeURL =
      "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription";
    body.Token = "secret-confirmation-token";
  }
  const signer = createSign("RSA-SHA256");
  signer.update(fields.map((field) => `${field}\n${body[field]}\n`).join(""));
  body.Signature = signer.sign(privateKey).toString("base64");
  return body;
}

function post(body: Record<string, string>) {
  return new Elysia({ prefix: "/api" }).use(createSesWebhook(topicArn)).handle(
    new Request("http://localhost/api/webhooks/ses", {
      method: "POST",
      headers: { "content-type": "text/plain; charset=UTF-8" },
      body: JSON.stringify(body),
    }),
  );
}

test("confirma assinatura SNS válida enviada como text/plain", async () => {
  let confirmationCalled = false;
  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input) === certUrl)
      return new Response(publicKey.export({ type: "spki", format: "pem" }));
    confirmationCalled = true;
    return new Response("ok");
  }) as unknown as typeof fetch;
  const result = await post(
    signedMessage("SubscriptionConfirmation", "Confirm subscription"),
  );
  expect(result.status).toBe(200);
  expect(confirmationCalled).toBe(true);
});

test("recusa outro tópico antes de baixar certificado", async () => {
  let fetched = false;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response("unexpected");
  }) as unknown as typeof fetch;
  const body = signedMessage("Notification", "{}");
  body.TopicArn = "arn:aws:sns:us-east-1:390403879931:other-topic";
  const result = await post(body);
  expect(result.status).toBe(403);
  expect(fetched).toBe(false);
});

test("recusa assinatura adulterada", async () => {
  globalThis.fetch = (async () =>
    new Response(
      publicKey.export({ type: "spki", format: "pem" }),
    )) as unknown as typeof fetch;
  const body = signedMessage("Notification", "{}");
  body.Message = "tampered";
  const result = await post(body);
  expect(result.status).toBe(403);
});

test("registra somente ID e status de entrega", async () => {
  globalThis.fetch = (async () =>
    new Response(
      publicKey.export({ type: "spki", format: "pem" }),
    )) as unknown as typeof fetch;
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (value) => logs.push(String(value));
  try {
    const result = await post(
      signedMessage(
        "Notification",
        JSON.stringify({
          eventType: "Delivery",
          mail: {
            messageId: "ses-message-123",
            destination: ["private@example.com"],
          },
        }),
      ),
    );
    expect(result.status).toBe(204);
  } finally {
    console.info = originalInfo;
  }
  expect(logs).toHaveLength(1);
  expect(logs[0]).toContain("ses-message-123");
  expect(logs[0]).not.toContain("private@example.com");
});
