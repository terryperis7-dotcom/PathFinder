/* Chat safeguarding: what may be said, what happens when it is not.

   safetyScan   finds contact details, abuse, threats and grooming language
   safetyGate   the one call every send goes through; runs the scan, asks the
                server when signed in, and applies the strike ladder
   safetyCheck  older callers: the list of reasons, or [] when the text is fine

   The rules mirror safety_scan() in supabase/schema.sql. The server is the
   authority (a message sent straight to the API is screened there too); this
   copy gives instant feedback and keeps demo mode working offline.

   Ladder: mild language = warning only. A blocked message is a strike: 1st
   warns, 2nd mutes chat for 24 h, 3rd locks it for a human. Grooming language
   locks at once. Self-harm is never blocked: the sender is pointed to help and
   an admin is told. */

const SAFETY_SEV = ["none", "low", "medium", "high", "critical"];
const SAFETY_STRONG = [
  "fuck", "shit", "bitch", "asshole", "bastard", "pussy", "whore", "slut", "nigga", "nigger", "cunt", "malaya", "kuma"
];
const SAFETY_MILD = [
  "damn", "stupid", "idiot", "moron", "dumb", "dick", "hate you", "mjinga", "mpumbavu", "pumbavu", "ushenzi", "fala"
];
const SAFETY_NUMWORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  sifuri: 0, moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, sita: 6, saba: 7, nane: 8, tisa: 9
};
/* [category, severity 1-4, pattern, how it reads to the sender] */
const SAFETY_RULES = [
  ["platform", 2, "\\b(instagram|insta|whatsapp|whatsap|watsapp|snapchat|tiktok|tik\\s*tok|facebook|telegram|discord|twitter|wechat|botim|x\\.com)\\b", "another app"],
  ["email", 2, "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}", "an email address"],
  ["email", 2, "\\b(gmail|yahoo|hotmail|outlook)\\b", "an email address"],
  ["handle", 2, "@[a-z0-9_.]{3,}", "a social handle"],
  ["handle", 2, "\\b(ig|insta|snap|tt|wa|fb)\\s*[:=-]\\s*\\S+", "a social handle"],
  ["handle", 2, "\\b(dm|inbox|pm|add)\\s+(me|my)\\b", "an invitation to chat elsewhere"],
  ["link", 2, "(https?://|www\\.)\\S+", "a web link"],
  ["link", 2, "\\b[a-z0-9-]+\\.(com|co\\.ke|ke|net|org|io|me|ly|link|tk)\\b", "a web link"],
  ["payment", 2, "\\b(send|pay)\\s+(me\\s+)?(money|cash|mpesa|m-pesa|airtime)\\b", "payment outside PathFinder"],
  ["payment", 2, "\\b(paybill|pay\\s*bill|till\\s+(number|no))\\b", "payment outside PathFinder"],
  ["payment", 2, "\\b(pay|paid)\\s+(me\\s+)?directly\\b", "payment outside PathFinder"],
  ["threat", 3, "\\b(kill|murder|stab|beat|hurt)\\s+(you|u|yourself|him|her|them)\\b", "a threat"],
  ["threat", 3, "\\b(kys|go\\s+die)\\b", "a threat"],
  ["threat", 3, "\\bi(\\s*will|.?ll|\\s*am going to)\\s+find\\s+you\\b", "a threat"],
  ["grooming", 4, "\\bdon.?t\\s+tell\\s+(your\\s+)?(mom|mum|mother|dad|father|parents?|teacher|anyone|anybody|school)\\b", "asking to keep a secret"],
  ["grooming", 4, "\\b(keep|our)\\s+(this|it|little)?\\s*(a\\s+)?secret\\b", "asking to keep a secret"],
  ["grooming", 4, "\\bbetween\\s+(us|you\\s+and\\s+me)\\b", "asking to keep a secret"],
  ["grooming", 4, "\\bno\\s+one\\s+(needs|has)\\s+to\\s+know\\b", "asking to keep a secret"],
  ["grooming", 4, "\\bdelete\\s+(this|these|the|our)\\s+(chat|chats|messages?|conversation)\\b", "asking to delete messages"],
  ["grooming", 4, "\\b(send|share|show)\\s+(me\\s+)?(a\\s+|your\\s+|ur\\s+)?(pic|pics|photo|photos|picture|pictures|selfie|selfies|video|nudes?)\\b", "asking for a photo or video"],
  ["grooming", 4, "\\b(nude|nudes|naked|sexy|horny|undress)\\b", "sexual content"],
  ["grooming", 4, "\\b(have|having)\\s+sex\\b|\\bsex\\s+(with|chat|video|pics?)\\b", "sexual content"],
  ["grooming", 3, "\\b(be\\s+)?my\\s+(girlfriend|boyfriend|babe|baby|sweetheart)\\b", "a romantic approach"],
  ["grooming", 3, "\\bi\\s+love\\s+you\\b", "a romantic approach"],
  ["grooming", 4, "\\bare\\s+you\\s+(alone|home\\s+alone)\\b", "asking if you are alone"],
  ["grooming", 4, "\\b(come|meet)\\s+(me\\s+)?(alone|at\\s+my|to\\s+my|outside|secretly|privately)\\b", "asking to meet alone"],
  ["grooming", 3, "\\b(my|your)\\s+(place|room|hotel|lodging)\\b", "asking to meet somewhere private"],
  ["grooming", 3, "\\bwhere\\s+do\\s+you\\s+(live|stay)\\b", "asking where you live"],
  ["grooming", 2, "\\bhow\\s+old\\s+are\\s+you\\b", "asking your age"],
  ["grooming", 3, "\\bi.?ll\\s+(give|buy|send)\\s+you\\s+(money|airtime|a\\s+gift|gifts|presents?)\\b", "offering gifts or money"],
  ["welfare", 3, "\\b(kill\\s+myself|want\\s+to\\s+die|end\\s+my\\s+life|suicide|suicidal|hurt\\s+myself)\\b", "a message about hurting yourself"]
].map((r) => [r[0], r[1], new RegExp(r[2], "i"), new RegExp(r[2], "gi"), r[3]]);

function safetyScan(text) {
  const src = String(text == null ? "" : text);
  const cats = [];
  const why = [];
  let sev = 0;
  let blocked = false;
  let masked = src;
  const add = (c, r, s, block) => {
    if (cats.indexOf(c) < 0) cats.push(c);
    if (why.indexOf(r) < 0) why.push(r);
    sev = Math.max(sev, s);
    if (block) blocked = true;
  };

  /* phone numbers, including spelled-out ones ("zero seven one two ...") */
  const digits = src
    .toLowerCase()
    .replace(/\b[a-z]+\b/g, (w) => (w in SAFETY_NUMWORDS ? String(SAFETY_NUMWORDS[w]) : w));
  if (/\+?\d([\s.()-]?\d){8,}/.test(digits)) {
    add("phone", "a phone number", 2, true);
    masked = masked
      .replace(/\+?\d([\s.()-]?\d){6,}/g, "####")
      .replace(new RegExp("\\b(" + Object.keys(SAFETY_NUMWORDS).join("|") + ")\\b", "gi"), "####");
  }

  SAFETY_RULES.forEach((r) => {
    if (!r[2].test(src)) return;
    const block = r[0] !== "welfare";
    add(r[0], r[4], r[1], block);
    if (block) masked = masked.replace(r[3], "####");
  });

  /* bad language: whole words for the mild ones; inside any word, with
     spaced-out letters ("f u c k") or symbols ("sh1t") for the strong ones */
  const swap = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", $: "s", "@": "a", "!": "i" };
  const leet = src.toLowerCase().replace(/[01345$@!]/g, (c) => swap[c]);
  const toks = leet.split(/[^a-z]+/);
  (leet.match(/\b(?:[a-z][^a-z0-9]){3,}[a-z]\b/g) || []).forEach((run) => toks.push(run.replace(/[^a-z]/g, "")));
  SAFETY_STRONG.forEach((w) => {
    if (!toks.some((t) => t.indexOf(w) >= 0)) return;
    add("profanity", "offensive language", 2, true);
    masked = masked.replace(new RegExp(w.replace(/(.)/g, "$1[^a-z0-9]{0,2}"), "gi"), "####");
  });
  SAFETY_MILD.forEach((w) => {
    if (!new RegExp("\\b" + w + "\\b").test(leet)) return;
    add("profanity", "offensive language", 1, true);
    masked = masked.replace(new RegExp("\\b" + w + "\\b", "gi"), "####");
  });

  if (!sev) return { severity: "none", blocked: false, categories: [], reasons: [], masked: src };
  if (blocked && masked === src) masked = "#### (message hidden)";
  return { severity: SAFETY_SEV[sev], blocked, categories: cats, reasons: why, masked };
}

/* Older callers only need to know why a text was refused. */
function safetyCheck(text) {
  const s = safetyScan(text);
  return s.blocked ? s.reasons : [];
}

function safetyWarning(sc, strikes, level) {
  if (!sc.blocked)
    return "If things feel heavy, please talk to a parent, a teacher you trust, or call Childline Kenya on 116 (free). A PathFinder reviewer has been told you may need support.";
  if (level === "locked")
    return "This message was blocked and your chat is paused while our safeguarding team reviews it.";
  if (level === "muted")
    return "Blocked again. Your chat is muted for 24 hours. A third block pauses it until a reviewer looks.";
  if (sc.severity === "low") return "Message blocked: please keep the language respectful.";
  return (
    "Message blocked: it contained " + sc.reasons.join(", ") +
    ". Keep chats on PathFinder: no phone numbers, social handles, links or bad language. Warning " + strikes + " of 3."
  );
}

/* Demo mode: the same ladder, kept in this browser. */
function safetyReport(text, sc, ctx) {
  const who = (SESSION && SESSION.name) || "Guest";
  const now = Date.now();
  const cnt = sc.blocked && sc.severity !== "low";
  S.safetyLog = S.safetyLog || [];
  const prior = S.safetyLog.filter((l) => l.by === who && l.strike && l.counted !== false && now - l.ts < 30 * 864e5).length;
  const strikes = prior + (cnt ? 1 : 0);
  let level = null;
  let until = null;
  if (sc.blocked && sc.severity === "critical") level = "locked";
  else if (cnt && strikes >= 3) level = "locked";
  else if (cnt && strikes === 2) {
    level = "muted";
    until = now + 864e5;
  }
  const warning = safetyWarning(sc, strikes, level);
  S.safetyLog.push({
    id: now,
    ts: now,
    by: who,
    role: (SESSION && SESSION.role) || "student",
    tutor: (ctx && ctx.tutor) || "",
    text: String(text).slice(0, 300),
    masked: sc.masked,
    reasons: sc.reasons,
    categories: sc.categories,
    severity: sc.severity,
    strike: cnt,
    strikes,
    counted: true,
    status: level === "locked" ? "locked" : level === "muted" ? "muted" : "open",
    context: (ctx && ctx.context) || "chat"
  });
  if (level && typeof restrictAccount === "function") restrictAccount(who, "Automatic: " + sc.severity, until, level);
  if (typeof addNote === "function") {
    addNote({
      to: (SESSION && SESSION.role) || "student",
      kind: "safety",
      from: "Safeguarding",
      title: sc.blocked ? "Message blocked" : "You are not alone",
      body: warning,
      link: ""
    });
    addNote({
      to: "admin",
      kind: "safety",
      from: "Safeguarding",
      title: sc.severity === "critical" ? "URGENT: safeguarding flag" : "Message flagged",
      body: who + ": " + sc.reasons.join(", "),
      link: "admin-safety"
    });
  }
  save();
  return { warning, level, until, strikes };
}

/* Every send goes through here. Resolves { ok, restricted, masked, warning,
   level }: ok means the message may be delivered. */
async function safetyGate(text, ctx) {
  const sc = safetyScan(text);
  const booking = ctx && /^\d+$/.test(String(ctx.booking || "")) ? Number(ctx.booking) : null;
  if (typeof sb !== "undefined" && sb.live()) {
    let r = null;
    try {
      r = await sb.call("POST", "rpc/safety_intake", {
        p_text: String(text),
        p_booking: booking,
        p_context: (ctx && ctx.context) || "chat"
      });
    } catch (e) {
      r = null; /* offline or an old schema: fall through to the local rules */
    }
    if (r && r.restricted) return { ok: false, restricted: true, warning: r.warning };
    if (r && r.severity !== "none") {
      return { ok: !r.blocked, masked: r.masked || sc.masked, warning: r.warning, level: r.level || null };
    }
    if (r && !sc.blocked) return { ok: true };
  }
  if (sc.severity === "none") return { ok: true };
  const out = safetyReport(text, sc, ctx);
  return { ok: !sc.blocked, masked: sc.masked, warning: out.warning, level: out.level };
}
