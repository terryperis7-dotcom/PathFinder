/* Reference data — the single source of truth for the whole app.
   Institutions, scholarships, clusters, quiz, counties, tutors.
   tools/gen_seed.mjs rewrites supabase/seed.sql from this file. */
/* ---------- Data ---------- */
const GRADES = [
  ["A", 12],
  ["A-", 11],
  ["B+", 10],
  ["B", 9],
  ["B-", 8],
  ["C+", 7],
  ["C", 6],
  ["C-", 5],
  ["D+", 4],
  ["D", 3],
  ["D-", 2],
  ["E", 1]
];
const SUBJECTS = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Biology",
  "Physics",
  "Chemistry",
  "Business",
  "Geography",
  "History",
  "Agriculture",
  "Computer Studies",
  "CRE"
];
const COUNTIES = [
  "Mombasa",
  "Kwale",
  "Kilifi",
  "Tana River",
  "Lamu",
  "Taita Taveta",
  "Garissa",
  "Wajir",
  "Mandera",
  "Marsabit",
  "Isiolo",
  "Meru",
  "Tharaka Nithi",
  "Embu",
  "Kitui",
  "Machakos",
  "Makueni",
  "Nyandarua",
  "Nyeri",
  "Kirinyaga",
  "Murang'a",
  "Kiambu",
  "Turkana",
  "West Pokot",
  "Samburu",
  "Trans Nzoia",
  "Uasin Gishu",
  "Elgeyo Marakwet",
  "Nandi",
  "Baringo",
  "Laikipia",
  "Nakuru",
  "Narok",
  "Kajiado",
  "Kericho",
  "Bomet",
  "Kakamega",
  "Vihiga",
  "Bungoma",
  "Busia",
  "Siaya",
  "Kisumu",
  "Homa Bay",
  "Migori",
  "Kisii",
  "Nyamira",
  "Nairobi"
];
const SCHED_BANDS = ["8–10 AM", "10 AM–12", "2–4 PM", "4–6 PM", "6–8 PM"];
const SCHED_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PF_PATHS = [
  {
    id: "health",
    name: "Health & Medicine",
    icon: "i-pulse",
    tile: "rose",
    letters: { I: 0.55, S: 0.45 },
    target: 41,
    slots: [["English"], ["Mathematics"], ["Biology", "Physics"], ["Chemistry"]],
    roles: ["Medicine (MBChB)", "Nursing", "Pharmacy", "Clinical Medicine"],
    why: "You enjoy science that ends up helping a real person."
  },
  {
    id: "eng",
    name: "Engineering & Technology",
    icon: "i-cog",
    tile: "sky",
    letters: { R: 0.6, I: 0.4 },
    target: 39,
    slots: [["English"], ["Mathematics"], ["Physics"], ["Chemistry", "Computer Studies"]],
    roles: ["Civil / Electrical / Mechanical", "Software Engineering", "Mechatronics"],
    why: "You like building, fixing and figuring out how things work."
  },
  {
    id: "biz",
    name: "Business, Law & Commerce",
    icon: "i-scale",
    tile: "vio",
    letters: { E: 0.6, C: 0.4 },
    target: 36,
    slots: [["English"], ["Mathematics"], ["Business", "Geography"], ["History", "Business", "Geography"]],
    roles: ["Law (LLB)", "Commerce", "Economics", "Actuarial Science"],
    why: "You organise people and money confidently."
  },
  {
    id: "agri",
    name: "Agriculture & Environment",
    icon: "i-leaf",
    tile: "mint",
    letters: { R: 0.45, I: 0.35, S: 0.2 },
    target: 33,
    slots: [["English"], ["Biology", "Agriculture"], ["Chemistry", "Agriculture"], ["Geography", "Agriculture"]],
    roles: ["Agriculture", "Environmental Science", "Veterinary Medicine"],
    why: "You want practical, outdoor science."
  },
  {
    id: "creative",
    name: "Creative, Media & Design",
    icon: "i-brush",
    tile: "peach",
    letters: { A: 0.75, E: 0.15, S: 0.1 },
    target: 30,
    slots: [["English"], ["Kiswahili"], ["History", "CRE", "Geography"], ["Geography", "CRE", "History"]],
    roles: ["Journalism", "Film & Animation", "Graphic Design"],
    why: "You tell stories, draw, film or design."
  },
  {
    id: "edu",
    name: "Education & Social Services",
    icon: "i-cap",
    tile: "lav",
    letters: { S: 0.6, A: 0.2, E: 0.2 },
    target: 32,
    slots: [["English"], ["Kiswahili"], ["Geography", "History", "CRE"], ["CRE", "History", "Geography"]],
    roles: ["Bachelor of Education", "Psychology", "Social Work"],
    why: "You explain things patiently and people learn faster."
  }
];
const PF_QUESTIONS = [
  {
    q: "It's Saturday afternoon and you have free time. You're most likely to…",
    o: [
      { t: "Fix something that broke at home — the bike chain, a door hinge, the radio", l: "R" },
      { t: "Take something apart or run a small experiment to see how it works", l: "I" },
      { t: "Draw, make music, or film and edit something on your phone", l: "A" },
      { t: "Sit with a friend who's struggling and help them sort it out", l: "S" }
    ]
  },
  {
    q: "In a group project at school, the role you naturally take is…",
    o: [
      { t: "Building the physical part — the model, the stand, the wiring", l: "R" },
      { t: "Researching sources and fact-checking everyone's work", l: "I" },
      { t: "Designing the poster and deciding how everything looks", l: "A" },
      { t: "Presenting the work and persuading the class to vote for it", l: "E" }
    ]
  },
  {
    q: "Which problem would you most like to be the one solving?",
    o: [
      { t: "Designing a cheaper way to pipe clean water to villages", l: "R" },
      { t: "Helping a young person plan their subjects, money and future", l: "S" },
      { t: "Telling stories that change how people see an issue", l: "A" },
      { t: "Starting a small business that employs people in your area", l: "E" }
    ]
  },
  {
    q: "Which school activity sounds the most fun to you?",
    o: [
      { t: "The workshop or school shamba — welding, cooking, farming the plot", l: "R" },
      { t: "Science congress or quiz club, going deep on one topic", l: "I" },
      { t: "Drama festival, music club or the school magazine", l: "A" },
      { t: "Young entrepreneurs club — actually selling something for profit", l: "E" }
    ]
  },
  {
    q: "A friend is worried about their KCSE results. You usually…",
    o: [
      { t: "Sit down, listen properly and help them talk it through", l: "S" },
      { t: "Draw up a realistic timetable and a clear plan of action", l: "C" },
      { t: "Research the options — retakes, diplomas, colleges — with them", l: "I" },
      { t: "Rally the group: study together, motivate each other daily", l: "E" }
    ]
  },
  {
    q: "Years from now, what would you most want people to say about your work?",
    o: [
      { t: "“They built things that really lasted.”", l: "R" },
      { t: "“They discovered something that was true.”", l: "I" },
      { t: "“They changed lives for the better.”", l: "S" },
      { t: "“They kept everything running without a single mistake.”", l: "C" }
    ]
  }
];
const LETTER_APP = {};
PF_QUESTIONS.forEach((q) =>
  q.o.forEach((o) => {
    LETTER_APP[o.l] = (LETTER_APP[o.l] || 0) + 1;
  })
);
const PF_CLUSTERS = [
  { n: "1 · Law", slots: [["English"], ["Kiswahili"], ["Mathematics", "Physics"], ["History", "Geography", "CRE"]] },
  {
    n: "2 · Business, Hospitality & Tourism",
    slots: [["English"], ["Mathematics"], ["Business", "Geography"], ["History", "CRE", "Agriculture"]]
  },
  {
    n: "3 · Communication, Media & Languages",
    slots: [["English"], ["Kiswahili"], ["History", "Geography", "CRE"], ["Business", "Agriculture"]]
  },
  {
    n: "4 · Architecture & Building",
    slots: [["Mathematics"], ["Physics"], ["English"], ["Chemistry", "Geography", "Computer Studies"]]
  },
  {
    n: "5 · Medicine, Health & Veterinary",
    slots: [["English"], ["Biology"], ["Chemistry"], ["Mathematics", "Physics"]]
  },
  {
    n: "6 · Computer Science & IT",
    slots: [["Mathematics"], ["Physics"], ["English"], ["Chemistry", "Computer Studies", "Biology"]]
  },
  {
    n: "7 · Actuarial, Maths & Statistics",
    slots: [["Mathematics"], ["Physics"], ["English"], ["Chemistry", "Computer Studies"]]
  },
  { n: "8 · Engineering & Technology", slots: [["Mathematics"], ["Physics"], ["Chemistry"], ["English"]] },
  {
    n: "9 · Agriculture & Food Science",
    slots: [["Biology", "Agriculture"], ["Chemistry"], ["Mathematics", "Physics"], ["English", "Geography"]]
  },
  {
    n: "10 · Environmental & Natural Resources",
    slots: [["Biology"], ["Chemistry", "Geography"], ["Mathematics", "Physics"], ["English", "Agriculture"]]
  },
  {
    n: "11 · Education (Arts)",
    slots: [["English"], ["Kiswahili"], ["History", "Geography", "CRE"], ["Business", "Agriculture"]]
  },
  {
    n: "12 · Education (Science)",
    slots: [["Mathematics"], ["Physics", "Chemistry", "Biology"], ["English"], ["Kiswahili", "Geography"]]
  },
  { n: "13 · Pharmacy", slots: [["Biology"], ["Chemistry"], ["Mathematics", "Physics"], ["English"]] },
  { n: "14 · Nursing & Midwifery", slots: [["Biology"], ["Chemistry"], ["English"], ["Mathematics", "Physics"]] }
];
const PF_INST = [
  {
    id: "uon",
    code: "UoN",
    name: "University of Nairobi",
    type: "Public University",
    region: "Nairobi",
    field: "Engineering",
    color: "#0f5c46",
    minPts: 42,
    progs: ["B.Sc Civil Engineering", "MBChB Medicine & Surgery", "B.Com Commerce", "LLB Law", "B.Sc Computer Science"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~42–44 (CS/Medicine)",
    fees: "KES 93,500–120,000/yr",
    site: "https://www.uonbi.ac.ke"
  },
  {
    id: "jkuat",
    code: "JKU",
    name: "JKUAT",
    type: "Public University",
    region: "Kiambu",
    field: "Engineering",
    color: "#7a9a1f",
    minPts: 39,
    progs: ["B.Sc Mechatronics", "B.Sc Software Engineering", "B.Sc Food Science", "B.Sc Civil Engineering"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~39–41",
    fees: "KES 82,000–110,000/yr",
    site: "https://www.jkuat.ac.ke"
  },
  {
    id: "ku",
    code: "KU",
    name: "Kenyatta University",
    type: "Public University",
    region: "Kiambu (Nairobi)",
    field: "Business",
    color: "#8e24aa",
    minPts: 36,
    progs: ["B.Ed Arts/Science", "B.Com", "B.Sc Nursing", "B.Sc Computer Science"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~36–40",
    fees: "KES 75,000–105,000/yr",
    site: "https://www.ku.ac.ke"
  },
  {
    id: "moi",
    code: "Moi",
    name: "Moi University",
    type: "Public University",
    region: "Uasin Gishu",
    field: "Health",
    color: "#1565c0",
    minPts: 38,
    progs: ["MBChB Medicine", "B.Sc Nursing", "B.Ed", "B.Sc IT"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~38–42 (Medicine)",
    fees: "KES 85,000–115,000/yr",
    site: "https://www.mu.ac.ke"
  },
  {
    id: "egerton",
    code: "EU",
    name: "Egerton University",
    type: "Public University",
    region: "Nakuru",
    field: "Agriculture",
    color: "#2e7d32",
    minPts: 34,
    progs: ["B.Sc Agriculture", "B.Sc Food Science", "B.Sc Animal Science", "B.Ed"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~34–38",
    fees: "KES 70,000–95,000/yr",
    site: "https://www.egerton.ac.ke"
  },
  {
    id: "tuk",
    code: "TUK",
    name: "Technical University of Mombasa",
    type: "Public University",
    region: "Mombasa",
    field: "Engineering",
    color: "#00838f",
    minPts: 35,
    progs: ["B.Sc Civil Engineering", "B.Sc Electrical Engineering", "B.Sc Computer Science"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~35–39",
    fees: "KES 78,000–100,000/yr",
    site: "https://www.tum.ac.ke"
  },
  {
    id: "dekut",
    code: "DeKUT",
    name: "Dedan Kimathi University of Technology",
    type: "Public University",
    region: "Nyandarua",
    field: "Engineering",
    color: "#6a1b9a",
    minPts: 36,
    progs: ["B.Sc Mechatronics", "B.Sc Computer Science", "B.Sc Civil Engineering"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~36–40",
    fees: "KES 80,000–105,000/yr",
    site: "https://www.dkut.ac.ke"
  },
  {
    id: "maseno",
    code: "MU",
    name: "Maseno University",
    type: "Public University",
    region: "Kisumu",
    field: "Business",
    color: "#ad1457",
    minPts: 33,
    progs: ["B.Com", "B.Ed", "B.Sc Computer Science", "B.Sc Nursing"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~33–37",
    fees: "KES 68,000–92,000/yr",
    site: "https://www.maseno.ac.ke"
  },
  {
    id: "kisii",
    code: "KisU",
    name: "Kisii University",
    type: "Public University",
    region: "Kisii",
    field: "Health",
    color: "#4527a0",
    minPts: 32,
    progs: ["B.Sc Nursing", "B.Ed", "B.Com", "B.Sc CS"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~32–36",
    fees: "KES 65,000–90,000/yr",
    site: "https://www.kisiiuniversity.ac.ke"
  },
  {
    id: "seku",
    code: "SEKU",
    name: "South Eastern Kenya University",
    type: "Public University",
    region: "Kitui",
    field: "Agriculture",
    color: "#ef6c00",
    minPts: 31,
    progs: ["B.Sc Agriculture", "B.Sc CS", "B.Com", "B.Ed"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~31–35",
    fees: "KES 62,000–88,000/yr",
    site: "https://www.seku.ac.ke"
  },
  {
    id: "chuka",
    code: "CU",
    name: "Chuka University",
    type: "Public University",
    region: "Tharaka Nithi",
    field: "Agriculture",
    color: "#558b2f",
    minPts: 31,
    progs: ["B.Sc Agriculture", "B.Sc CS", "B.Com", "B.Ed"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~31–35",
    fees: "KES 62,000–88,000/yr",
    site: "https://www.cu.ac.ke"
  },
  {
    id: "karatina",
    code: "KaU",
    name: "Karatina University",
    type: "Public University",
    region: "Nyeri",
    field: "Business",
    color: "#283593",
    minPts: 32,
    progs: ["B.Com", "B.Sc CS", "B.Ed", "B.Sc Nursing"],
    funding: "KUCCPS · Universities Fund · HELB",
    cutoff: "Cluster ~32–36",
    fees: "KES 65,000–90,000/yr",
    site: "https://www.karatinauniversity.ac.ke"
  },
  {
    id: "strathmore",
    code: "SU",
    name: "Strathmore University",
    type: "Private University",
    region: "Nairobi",
    field: "Business",
    color: "#5b4fe0",
    minPts: 0,
    progs: ["BBIT", "LLB Law", "B.Sc Financial Economics"],
    funding: "HELB · need-based grants",
    cutoff: "Private intake — own criteria",
    fees: "KES 380,000–520,000/yr",
    site: "https://www.strathmore.edu"
  },
  {
    id: "usiu",
    code: "USIU",
    name: "USIU-Africa",
    type: "Private University",
    region: "Nairobi",
    field: "Business",
    color: "#b71c1c",
    minPts: 0,
    progs: ["B.Sc CS", "B.Sc Intl Business", "LLB Law"],
    funding: "HELB · merit scholarships",
    cutoff: "Private intake",
    fees: "KES 420,000–580,000/yr",
    site: "https://www.usiu.ac.ke"
  },
  {
    id: "daystar",
    code: "DU",
    name: "Daystar University",
    type: "Private University",
    region: "Nairobi",
    field: "Creative",
    color: "#f9a825",
    minPts: 0,
    progs: ["B.A Communication", "B.Sc CS", "B.Com"],
    funding: "HELB · scholarships",
    cutoff: "Private intake",
    fees: "KES 320,000–450,000/yr",
    site: "https://www.daystar.ac.ke"
  },
  {
    id: "kca",
    code: "KCA",
    name: "KCA University",
    type: "Private University",
    region: "Nairobi",
    field: "Business",
    color: "#00695c",
    minPts: 0,
    progs: ["B.Com", "B.Sc CS", "B.Sc Actuarial Science"],
    funding: "HELB tuition loan",
    cutoff: "Private intake",
    fees: "KES 280,000–400,000/yr",
    site: "https://www.kca.ac.ke"
  },
  {
    id: "mku",
    code: "MKU",
    name: "Mount Kenya University",
    type: "Private University",
    region: "Kiambu",
    field: "Health",
    color: "#4a148c",
    minPts: 0,
    progs: ["MBChB", "B.Sc Nursing", "B.Pharm"],
    funding: "HELB tuition loan",
    cutoff: "Private intake",
    fees: "KES 450,000–700,000/yr",
    site: "https://www.mku.ac.ke"
  },
  {
    id: "zetech",
    code: "ZU",
    name: "Zetech University",
    type: "Private University",
    region: "Kiambu",
    field: "ICT",
    color: "#0277bd",
    minPts: 0,
    progs: ["B.Sc CS", "B.Sc IT", "B.Com"],
    funding: "HELB tuition loan",
    cutoff: "Private intake",
    fees: "KES 250,000–350,000/yr",
    site: "https://www.zetech.ac.ke"
  },
  {
    id: "merupoly",
    code: "MNP",
    name: "Meru National Polytechnic",
    type: "National Polytechnic / TVET",
    region: "Meru",
    field: "Engineering",
    color: "#2b5ea7",
    minPts: 0,
    progs: ["Diploma Building", "Diploma Civil", "Diploma Electrical", "Diploma ICT"],
    funding: "KUCCPS TVET · Capitation + HELB TVET",
    cutoff: "KCSE C− (diploma) · D (cert)",
    fees: "Subsidised capitation"
  },
  {
    id: "kcoastpoly",
    code: "KCNP",
    name: "Kenya Coast National Polytechnic",
    type: "National Polytechnic / TVET",
    region: "Mombasa",
    field: "Engineering",
    color: "#00897b",
    minPts: 0,
    progs: ["Diploma Civil", "Diploma Electrical", "Diploma Maritime", "Diploma Hospitality"],
    funding: "KUCCPS TVET · Capitation + HELB TVET",
    cutoff: "KCSE C− · D− (artisan)",
    fees: "Subsidised capitation"
  },
  {
    id: "ep",
    code: "ENP",
    name: "Eldoret National Polytechnic",
    type: "National Polytechnic / TVET",
    region: "Uasin Gishu",
    field: "Engineering",
    color: "#5d4037",
    minPts: 0,
    progs: ["Diploma Mechanical", "Diploma ICT", "Diploma Building"],
    funding: "KUCCPS TVET · Capitation + HELB",
    cutoff: "KCSE C− & above",
    fees: "Subsidised capitation"
  },
  {
    id: "nyeripoly",
    code: "NNP",
    name: "Nyeri National Polytechnic",
    type: "National Polytechnic / TVET",
    region: "Nyeri",
    field: "Agriculture",
    color: "#33691e",
    minPts: 0,
    progs: ["Diploma Agriculture", "Diploma ICT", "Diploma Hospitality"],
    funding: "KUCCPS TVET · Capitation + HELB",
    cutoff: "KCSE C− & above",
    fees: "Subsidised capitation"
  },
  {
    id: "kabete",
    code: "KNP",
    name: "Kabete National Polytechnic",
    type: "National Polytechnic / TVET",
    region: "Kiambu",
    field: "Agriculture",
    color: "#6d4c41",
    minPts: 0,
    progs: ["Diploma Agriculture", "Diploma Veterinary", "Diploma ICT"],
    funding: "KUCCPS TVET · Capitation + HELB",
    cutoff: "KCSE C− & above",
    fees: "Subsidised capitation"
  },
  {
    id: "kmtc",
    code: "KMTC",
    name: "Kenya Medical Training College",
    type: "Public College (KMTC)",
    region: "National — 30+ campuses",
    field: "Health",
    color: "#00695c",
    minPts: 0,
    progs: ["Diploma Clinical Medicine", "Diploma Nursing", "Diploma Pharmacy", "Diploma Lab"],
    funding: "Gov capitation · HELB TVET",
    cutoff: "C plain (clinical) · C−",
    fees: "KES 60,000–95,000/yr",
    site: "https://www.kmtc.ac.ke"
  }
];
const PF_FUNDS = [
  {
    b: "Band 1",
    tag: "Most needy",
    split: "~100% scholarship · 0% loan",
    d: "Full government scholarship — no loan to repay."
  },
  {
    b: "Band 2",
    tag: "Very needy",
    split: "~70% scholarship · ~30% loan",
    d: "Majority scholarship with a small HELB loan component."
  },
  {
    b: "Band 3",
    tag: "Needy",
    split: "~50% scholarship · ~50% loan",
    d: "An even split between scholarship and loan."
  },
  {
    b: "Band 4",
    tag: "Less needy",
    split: "~30% scholarship · ~70% loan",
    d: "Smaller scholarship, larger loan portion."
  },
  {
    b: "Band 5",
    tag: "Least needy",
    split: "~0% scholarship · 100% loan + top-up",
    d: "Fully funded through HELB loans; families may top up."
  }
];
const PF_SCH = [
  {
    name: "Wings to Fly — Equity Group Foundation",
    who: "Top KCPE/KCSE performers from disadvantaged homes",
    covers: "Full secondary & university scholarship + mentorship",
    window: "Dec – Jan",
    url: "https://equitygroupfoundation.com"
  },
  {
    name: "Equity Leaders Program (ELP)",
    who: "Top KCSE candidates in strong universities",
    covers: "Full university sponsorship + leadership training",
    window: "After KCSE results",
    url: "https://equitygroupfoundation.com"
  },
  {
    name: "KCB Foundation — 2jiajiri",
    who: "Youth 18–35 for vocational / TVET training",
    covers: "Full tuition, tools, business training & seed capital",
    window: "Opens ~Feb yearly",
    url: "https://kcbfoundation.com"
  },
  {
    name: "Mastercard Foundation Scholars",
    who: "Talented, financially constrained students",
    covers: "Full fees + stipend at partner unis",
    window: "Varies by university",
    url: "https://mastercardfdn.org"
  },
  {
    name: "HEF Universities Fund",
    who: "All public-university students",
    covers: "Scholarship + loan mix per band",
    window: "After KUCCPS placement",
    url: "https://www.hef.co.ke"
  },
  {
    name: "HELB Undergraduate Loan",
    who: "Degree students",
    covers: "Tuition + upkeep loan",
    window: "Rolling",
    url: "https://www.helb.co.ke"
  },
  {
    name: "HELB TVET Loan",
    who: "Diploma & artisan students",
    covers: "Tuition + KES 30,000/yr capitation",
    window: "Rolling",
    url: "https://www.helb.co.ke"
  },
  {
    name: "NG-CDF & County bursaries",
    who: "Constituency residents",
    covers: "Fee top-ups",
    window: "Year-round",
    url: "https://www.ngcdf.go.ke"
  },
  {
    name: "Zawadi Africa Education Fund",
    who: "High-achieving girls from low-income homes",
    covers: "Full university scholarship + leadership mentoring abroad",
    window: "Jan – Mar",
    url: "https://zawadiafrica.org"
  },
  {
    name: "Safaricom Foundation Scholarship",
    who: "Needy students in partner counties",
    covers: "School fees, books and mentorship through secondary school",
    window: "Feb – Apr",
    url: "https://www.safaricomfoundation.org"
  },
  {
    name: "M-PESA Foundation Bursary",
    who: "Orphans and vulnerable learners",
    covers: "Fees and upkeep, paid directly to the institution",
    window: "Varies by county",
    url: "https://mpesafoundation.org"
  },
  {
    name: "Chandaria Foundation Bursary",
    who: "Bright students facing hardship",
    covers: "Partial to full fee support, renewed yearly",
    window: "Rolling",
    url: "https://chandariafoundation.org"
  }
];
const PF_TUTORS = [
  {
    id: "t1",
    name: "Brian Otieno",
    subjects: ["Mathematics", "Physics"],
    area: "Nairobi · online nationwide",
    mode: "both",
    rate: 500,
    rating: 4.9,
    sessions: 134,
    resp: "~2 hrs",
    bio: "Former Alliance High teacher, 9 years coaching KCSE candidates.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Mon|4–6 PM", "Wed|4–6 PM", "Sat|8–10 AM"],
    slots: [
      { d: "Mon", t: "4:00–6:00 PM" },
      { d: "Wed", t: "4:00–6:00 PM" },
      { d: "Sat", t: "9:00–11:00 AM" }
    ],
    c1: "#7c5cff",
    c2: "#a78bfa"
  },
  {
    id: "t2",
    name: "Faith Wanjiku",
    subjects: ["Chemistry", "Biology"],
    area: "Nairobi · Kiambu",
    mode: "both",
    rate: 450,
    rating: 4.8,
    sessions: 98,
    resp: "~3 hrs",
    bio: "B.Sc Biochemistry (UoN). Past-paper drills end every topic.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Tue|4–6 PM", "Thu|4–6 PM", "Sun|2–4 PM"],
    slots: [
      { d: "Tue", t: "5:00–7:00 PM" },
      { d: "Thu", t: "5:00–7:00 PM" },
      { d: "Sun", t: "2:00–4:00 PM" }
    ],
    c1: "#0f5c46",
    c2: "#34d399"
  },
  {
    id: "t3",
    name: "Kevin Mwangi",
    subjects: ["English", "Kiswahili"],
    area: "Online nationwide",
    mode: "online",
    rate: 400,
    rating: 4.7,
    sessions: 76,
    resp: "~1 hr",
    bio: "Composition, comprehension and insha frameworks that score.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Mon|6–8 PM", "Fri|4–6 PM", "Sat|10 AM–12"],
    slots: [
      { d: "Mon", t: "6:00–8:00 PM" },
      { d: "Fri", t: "4:00–6:00 PM" },
      { d: "Sat", t: "10:00 AM–12:00 PM" }
    ],
    c1: "#b45309",
    c2: "#fbbf24"
  },
  {
    id: "t4",
    name: "Achieng Odhiambo",
    subjects: ["Business", "History", "Geography"],
    area: "Kisumu · online nationwide",
    mode: "both",
    rate: 400,
    rating: 4.8,
    sessions: 61,
    resp: "~2 hrs",
    bio: "Answer frameworks, case-study banks, weekly essay marking.",
    checks: { tsc: true, id: true, conduct: true, safe: false },
    grid: ["Wed|4–6 PM", "Sat|2–4 PM"],
    slots: [
      { d: "Wed", t: "5:00–7:00 PM" },
      { d: "Sat", t: "2:00–4:00 PM" }
    ],
    c1: "#ad1457",
    c2: "#f472b6"
  },
  {
    id: "t5",
    name: "Yusuf Abdi",
    subjects: ["Mathematics", "Computer Studies"],
    area: "Online nationwide",
    mode: "online",
    rate: 450,
    rating: 4.9,
    sessions: 88,
    resp: "~1 hr",
    bio: "B.Sc CS (JKUAT). KCSE Math paper 2 specialist.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Tue|6–8 PM", "Thu|6–8 PM", "Sun|4–6 PM"],
    slots: [
      { d: "Tue", t: "7:00–9:00 PM" },
      { d: "Thu", t: "7:00–9:00 PM" },
      { d: "Sun", t: "4:00–6:00 PM" }
    ],
    c1: "#0277bd",
    c2: "#38bdf8"
  },
  {
    id: "t6",
    name: "Grace Muthoni",
    subjects: ["Geography", "Agriculture", "CRE"],
    area: "Nyeri · Murang'a",
    mode: "inperson",
    rate: 350,
    rating: 4.6,
    sessions: 42,
    resp: "~4 hrs",
    bio: "Retired district teacher, 20+ years.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Sat|8–10 AM", "Sun|2–4 PM"],
    slots: [
      { d: "Sat", t: "9:00 AM–12:00 PM" },
      { d: "Sun", t: "2:00–5:00 PM" }
    ],
    c1: "#33691e",
    c2: "#a3e635"
  },
  {
    id: "t7",
    name: "Dennis Kiprop",
    subjects: ["Physics", "Mathematics"],
    area: "Eldoret · Uasin Gishu",
    mode: "both",
    rate: 400,
    rating: 4.7,
    sessions: 55,
    resp: "~2 hrs",
    bio: "Engineering graduate (TUK). Physics made visual.",
    checks: { tsc: true, id: true, conduct: false, safe: true },
    grid: ["Mon|4–6 PM", "Wed|4–6 PM", "Sat|8–10 AM"],
    slots: [
      { d: "Mon", t: "5:00–7:00 PM" },
      { d: "Wed", t: "5:00–7:00 PM" },
      { d: "Sat", t: "8:00–10:00 AM" }
    ],
    c1: "#4527a0",
    c2: "#a78bfa"
  },
  {
    id: "t8",
    name: "Joy Akinyi",
    subjects: ["Computer Studies", "Biology"],
    area: "Kisumu · online nationwide",
    mode: "both",
    rate: 400,
    rating: 4.8,
    sessions: 49,
    resp: "~1 hr",
    bio: "B.Ed Science (Maseno). Practical-based teaching.",
    checks: { tsc: true, id: true, conduct: true, safe: true },
    grid: ["Tue|4–6 PM", "Thu|4–6 PM", "Sun|10 AM–12"],
    slots: [
      { d: "Tue", t: "4:00–6:00 PM" },
      { d: "Thu", t: "4:00–6:00 PM" },
      { d: "Sun", t: "10:00 AM–12:00 PM" }
    ],
    c1: "#00695c",
    c2: "#5eead4"
  }
];
const FAQS = [
  [
    "Is PathFinder an official KUCCPS service?",
    "No — a private pilot that gives guidance. Official cluster points, cut-offs, placement and funding come from KUCCPS, HEF and HELB; we link straight to their portals."
  ],
  [
    "Does it cost anything?",
    "No. Free for students forever. No agent commissions, no ads, and we never ask for payment to create a KUCCPS or HELB account."
  ],
  [
    "How are learners protected from bad tutors?",
    "Three layers: tutors pass a 4-point verification (TSC, ID, good conduct, safeguarding) before badges show; chat automatically blocks phone numbers, social handles and abusive language; and any learner can report a tutor, which admins can act on — including instant suspension."
  ],
  [
    "Are the cut-offs exact?",
    "Indicative, from public sources (CUE, KUCCPS, TVETA). They change yearly — confirm on the official portal before applying."
  ],
  [
    "Is my data safe?",
    "Yes. Built around Kenya's Data Protection Act 2019 — never sold, exportable, deletable any time from your profile."
  ],
  [
    "Will it work on my phone?",
    "Yes — built for Kenyan phones from 320px wide, works on 2G/3G, and the repo ships an offline app shell."
  ]
];
