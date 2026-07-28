import crypto from "crypto";

const splitUrls = (value, fallback = []) =>
  (value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .concat(fallback);

export const getIceServersController = (req, res) => {
  const maxIceUrls = 4;
  const configuredStunUrls = splitUrls(process.env.STUN_URLS, [
    "stun:stun.cloudflare.com:3478",
    "stun:stun.l.google.com:19302",
  ]);
  const configuredTurnUrls = splitUrls(process.env.TURN_URLS);
  const turnUrls = [...new Set(configuredTurnUrls)].slice(0, 3);
  // Browsers warn, and can take noticeably longer to connect on mobile, when
  // five or more ICE URLs are supplied. Prefer the TURN transports and retain
  // only enough STUN fallbacks to keep the total at four or fewer.
  const stunUrls = [...new Set(configuredStunUrls)].slice(
    0,
    Math.max(0, maxIceUrls - turnUrls.length),
  );
  const turnSecret = process.env.TURN_SHARED_SECRET;
  const ttlSeconds = Math.min(
    Math.max(Number.parseInt(process.env.TURN_CREDENTIAL_TTL_SECONDS || "3600", 10) || 3600, 60),
    24 * 60 * 60,
  );
  const iceServers = [{ urls: stunUrls }];

  if (turnUrls.length && turnSecret) {
    const username = `${Math.floor(Date.now() / 1000) + ttlSeconds}:${req.userId}`;
    const credential = crypto
      .createHmac("sha1", turnSecret)
      .update(username)
      .digest("base64");

    iceServers.push({ urls: turnUrls, username, credential });
  }

  return res.json({
    success: true,
    data: {
      iceServers,
      turnConfigured: Boolean(turnUrls.length && turnSecret),
    },
  });
};
