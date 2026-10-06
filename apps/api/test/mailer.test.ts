import { expect, test } from "bun:test";
import type { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { DisabledMailer, SesMailer } from "../src/services/mailer";

test("envio desativado não registra destinatário nem token", async () => {
  const logs: unknown[] = [];
  const originalInfo = console.info;
  console.info = (...values) => {
    logs.push(...values);
  };
  try {
    await expect(new DisabledMailer().send()).rejects.toThrow("desativada");
    expect(logs).toHaveLength(0);
  } finally {
    console.info = originalInfo;
  }
});

test("SES recebe o conteúdo e o log contém somente o ID da mensagem", async () => {
  let command: SendEmailCommand | undefined;
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (value) => logs.push(String(value));
  try {
    const mailer = new SesMailer(
      "sa-east-1",
      "Flowcare <no-reply@example.com>",
      async (sent) => {
        command = sent;
        return { MessageId: "ses-message-123" };
      },
    );
    await mailer.send({
      to: "person@example.com",
      subject: "Confirme seu e-mail",
      text: "Link privado: https://example.com/verify-email?token=secret-token",
    });
  } finally {
    console.info = originalInfo;
  }

  expect(command?.input).toMatchObject({
    FromEmailAddress: "Flowcare <no-reply@example.com>",
    Destination: { ToAddresses: ["person@example.com"] },
    Content: {
      Simple: {
        Subject: { Data: "Confirme seu e-mail" },
        Body: {
          Text: {
            Data: "Link privado: https://example.com/verify-email?token=secret-token",
          },
        },
      },
    },
  });
  expect(logs).toHaveLength(1);
  expect(logs[0]).toContain("ses-message-123");
  expect(logs[0]).not.toContain("secret-token");
  expect(logs[0]).not.toContain("person@example.com");
});
