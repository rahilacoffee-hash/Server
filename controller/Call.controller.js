import crypto from "crypto";

const splitUrls = (value, fallback = []) =>
  (value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .concat(fallback);

export const getIceServersController = (req, res) => {
  // Keep Metered's complete recommended relay set: UDP/TCP on 80 and 443,
  // plus TURN-over-TLS on 443. The TLS fallback is vital on mobile networks
  // that block ordinary UDP/TCP TURN traffic.
  const maxIceUrls = 5;
  const configuredStunUrls = splitUrls(process.env.STUN_URLS, [
    "stun:stun.cloudflare.com:3478",
    "stun:stun.l.google.com:19302",
  ]);
  const configuredTurnUrls = splitUrls(process.env.TURN_URLS);
  const turnUrls = [...new Set(configuredTurnUrls)].slice(0, 4);
  // One STUN endpoint alongside Metered's four TURN transports gives Chrome
  // a direct-path candidate when possible without dropping TLS fallback.
  const stunUrls = [...new Set(configuredStunUrls)].slice(
    0,
    Math.max(0, maxIceUrls - turnUrls.length),
  );
  const turnSecret = process.env.TURN_SHARED_SECRET;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;
  const ttlSeconds = Math.min(
    Math.max(Number.parseInt(process.env.TURN_CREDENTIAL_TTL_SECONDS || "3600", 10) || 3600, 60),
    24 * 60 * 60,
  );
  const iceServers = [{ urls: stunUrls }];

  if (turnUrls.length && (turnSecret || (turnUsername && turnCredential))) {
    // Self-hosted coturn uses a shared secret to mint short-lived credentials.
    // Managed providers normally issue a username/password directly instead.
    const username = turnSecret
      ? `${Math.floor(Date.now() / 1000) + ttlSeconds}:${req.userId}`
      : turnUsername;
    const credential = turnSecret
      ? crypto.createHmac("sha1", turnSecret).update(username).digest("base64")
      : turnCredential;

    iceServers.push({ urls: turnUrls, username, credential });
  }

  return res.json({
    success: true,
    data: {
      iceServers,
      turnConfigured: Boolean(turnUrls.length && (turnSecret || (turnUsername && turnCredential))),
    },
  });
};
