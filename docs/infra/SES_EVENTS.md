# SES delivery events

The API receives SNS notifications at `POST /api/webhooks/ses`. Amazon SNS sends
JSON with `Content-Type: text/plain`. The endpoint validates the SHA-256 SNS
signature, the certificate URL and the exact topic ARN before confirming a
subscription or recording an event. Logs contain only the SES message ID and
one of `Delivery`, `Bounce` or `Complaint`.

In the production API environment, set:

```env
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:<account-id>:flowcare-ses-events
SES_CONFIGURATION_SET=flowcare-transactional
```

The `flowcare-transactional` SES configuration set sends `DELIVERY`, `BOUNCE`
and `COMPLAINT` to that SNS topic. The mailer must include the configuration
set on every `SendEmail` call, otherwise SES will not publish these events.

After deploying the webhook with `SNS_TOPIC_ARN`, create or retry the HTTPS
subscription to `https://api.flowcare.me/api/webhooks/ses`. Check that SNS shows
a confirmed subscription ARN. Send a non-clinical test e-mail through the API
and verify the SES message ID appears with a delivery event in API logs. Use the
SES mailbox simulator for bounce and complaint checks; do not use real recipient
addresses for those tests.
