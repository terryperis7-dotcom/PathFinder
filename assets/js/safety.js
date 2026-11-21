/* Learner-safety filter used by every tutor chat message. */
/* ---------- Safety ---------- */
const CURSE_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "whore",
  "slut",
  "damn",
  "stupid",
  "idiot",
  "moron",
  "dumb",
  "hate you"
];
function safetyCheck(text) {
  const t = String(text).toLowerCase(),
    reasons = [];
  const digits = (text.match(/\d/g) || []).length;
  if (digits >= 9 || /(\+?25[40]|0)[17]\d{7,8}/.test(text.replace(/[\s\-().]/g, ""))) reasons.push("phone number");
  if (/@[\w.]{2,}/.test(text)) reasons.push("social handle (@…)");
  if (/\b(instagram|whatsapp|snapchat|tiktok|facebook|telegram|twitter|x\.com|discord)\b/.test(t))
    reasons.push("social app name");
  if (CURSE_WORDS.some((w) => t.includes(w))) reasons.push("offensive language");
  return reasons;
}
