/* Pathway recommender: 55% RIASEC interest fit + 45% grade feasibility. */
function scorePaths(grades, answers) {
  const pts = {};
  answers.forEach((ai, qi) => {
    const l = PF_QUESTIONS[qi].o[ai].l;
    pts[l] = (pts[l] || 0) + 1;
  });
  const norm = {};
  for (const l in pts) norm[l] = pts[l] / LETTER_APP[l];
  return PF_PATHS.map((p) => {
    let fit = 0;
    for (const l in p.letters) fit += p.letters[l] * (norm[l] || 0);
    fit = Math.min(1, fit * 1.5);
    const c = slotCluster(p.slots, grades);
    const feas = 0.78 * Math.min(1, c.weighted / p.target) + 0.22 * (c.ok / 4);
    return { ...p, c, match: Math.round(12 + 48 * fit + 40 * feas) };
  }).sort((a, b) => b.match - a.match);
}
