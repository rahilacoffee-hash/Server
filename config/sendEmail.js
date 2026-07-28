const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendEmail({ sendTo, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "ChatVerse";

  if (!apiKey || !senderEmail) {
    const message = "Brevo is not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL";
    console.error("Email error:", message);
    return { success: false, error: message };
  }

  try {
    const response = await fetch(BREVO_EMAIL_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: sendTo }],
        subject,
        textContent: text || undefined,
        htmlContent: html || undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || `Brevo request failed with status ${response.status}`);
    }

    console.log("Email queued by Brevo:", payload.messageId);
    return { success: true, messageId: payload.messageId };
  } catch (error) {
    console.error("Email error:", error.message);
    return { success: false, error: error.message };
  }
}

export default sendEmail;
