import crypto from "crypto";

const splitUrls = (value, fallback = []) =>
  (value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .concat(fallback);

export const getIceServersController = (req, res) => {
  // Chrome warns when five or more ICE URLs are supplied. Retain one direct
  // STUN candidate and the three useful relay paths for mobile networks.
  const maxIceUrls = 4;
  const configuredStunUrls = splitUrls(process.env.STUN_URLS, [
    "stun:stun.cloudflare.com:3478",
    "stun:stun.l.google.com:19302",
  ]);
  const configuredTurnUrls = splitUrls(process.env.TURN_URLS);
  const uniqueTurnUrls = [...new Set(configuredTurnUrls)];
  // Prefer UDP and TCP on 80 plus TURN-over-TLS on 443. Plain UDP on port 443
  // is redundant once these paths are available and would trigger Chrome's
  // five-or-more-servers discovery warning.
  const turnUrls = uniqueTurnUrls.length <= 3
    ? uniqueTurnUrls
    : [
        uniqueTurnUrls.find((url) => url.startsWith("turn:") && url.includes(":80") && !url.includes("transport=")),
        uniqueTurnUrls.find((url) => url.startsWith("turn:") && url.includes("transport=tcp")),
        uniqueTurnUrls.find((url) => url.startsWith("turns:") && url.includes(":443")),
      ].filter(Boolean);
  // One STUN endpoint alongside three TURN transports gives Chrome a direct
  // path when possible without dropping TLS fallback.
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
