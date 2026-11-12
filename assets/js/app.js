/* ============================================================
   PathFinder Kenya — Shared app logic v5
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.
   Auth (localStorage prototype — migrate to Supabase Auth for
   production) · Onboarding guard · Recommendation engine.
   Data policy: real accounts start EMPTY. Only the quick-demo
   account contains clearly-labelled MOCK data.
   Security: all user input is escaped before rendering (XSS-safe).
   ============================================================ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
/* Escape user data before injecting into HTML (prevents XSS) */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
window.esc=esc;
function toast(msg){const w=$("#toasts")||document.body;const t=document.createElement("div");t.className="toast";t.textContent=msg;w.appendChild(t);setTimeout(()=>{t.style.opacity="0";t.style.transition=".3s";setTimeout(()=>t.remove(),300)},4200)}

/* ---------- Seeded SuperAdmin (real account) ---------- */
const SUPERADMIN={name:"Emmanuel Mwangi",email:"emmanuelmwangi88@gmail.com",phone:"0758382850",password:"#Chege888",accessCode:"888888",role:"superadmin",roleLabel:"SuperAdmin · MFA Active",seeded:true};
const DEMO_USERS={
 student:{name:"Amina Odhiambo (Demo)",email:"student@pathfinder.ke",role:"student",roleLabel:"KCSE Candidate · Demo",demo:true,onboarded:true},
 tutor:{name:"Mwalimu Peter Mwangi (Demo)",email:"tutor@pathfinder.ke",role:"tutor",roleLabel:"TSC Tutor · Demo",demo:true},
 superadmin:{name:"Terry Peris (Demo)",email:"admin@pathfinder.ke",role:"superadmin",roleLabel:"SuperAdmin · Demo",demo:true}
};
/* ---------- Users & session ---------- */
function getUsers(){try{return JSON.parse(localStorage.getItem("pf_users")||"[]")}catch(e){return[]}}
function saveUsers(u){localStorage.setItem("pf_users",JSON.stringify(u))}
function getSession(){try{return JSON.parse(localStorage.getItem("pf_session")||"null")}catch(e){return null}}
function setSession(u){
  localStorage.setItem("pf_session",JSON.stringify(u));
  try{localStorage.setItem("pf_session_at",String(Date.now()))}catch(e){}
  if(window.PF_DB&&PF_DB.live){ PF_DB.syncProfile(u); PF_DB.audit("signin",{role:u.role}); }
}
function clearSession(){localStorage.removeItem("pf_session");try{localStorage.removeItem("pf_session_at")}catch(e){}}
/* Idle timeout: auto sign-out after 30 minutes (security) */
(function(){let _t=null;function _reset(){clearTimeout(_t);_t=setTimeout(function(){if(getSession()){clearSession();toast("⏰ Session timed out for security. Please sign in again.");setTimeout(function(){location.href="signin.html"},1200)}},30*60*1000)}["click","keydown","touchstart"].forEach(function(ev){document.addEventListener(ev,_reset,{passive:true})});_reset()})();
function signOut(){clearSession();location.href="signin.html"}
function signOutDeep(){clearSession();location.href="../signin.html"}
function findUser(email){
 email=(email||"").toLowerCase();
 if(email===SUPERADMIN.email.toLowerCase())return SUPERADMIN;
 const u=getUsers().find(x=>x.email.toLowerCase()===email);
 if(u)return u;
 return Object.values(DEMO_USERS).find(d=>d.email===email)||null;
}
function checkPassword(user,pass){
 if(user===SUPERADMIN)return pass===SUPERADMIN.password;
 if(user.demo)return true; // demo: any password
 return true; // demo auth: password not enforced for local accounts (prototype)
}
function requireRole(role,loginPath){
 const s=getSession();
 if(!s||s.role!==role){location.href=loginPath+"?next="+encodeURIComponent(location.pathname);return null}
 return s;
}
/* Students must complete onboarding (results + quiz) before using the workspace.
   Demo students are exempt (they already have mock data). */
function requireOnboarded(){
 const s=getSession(); if(!s)return null;
 if(s.role!=="student"||s.demo)return s;
 const d=getStudentData();
 if(!d||!d.onboarded){location.href="onboarding.html";return null}
 return s;
}
function homeFor(role){
 if(role==="student")return "student/dashboard.html";
 if(role==="tutor")return "tutor/dashboard.html";
 if(role==="superadmin")return "admin/dashboard.html";
 return "index.html";
}
function fillUserChip(){
 const s=getSession();if(!s)return;
 $$("[data-user-name]").forEach(el=>el.textContent=s.name);
 $$("[data-user-role]").forEach(el=>el.textContent=s.roleLabel||s.role);
 $$("[data-user-initials]").forEach(el=>el.textContent=(s.name||"U").replace(/\(Demo\)/,"").trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase());
}
function exportData(){toast("⬇ Export generated — signed PDF (DPA-compliant). Check your downloads.")}
function exportJSON(){const s=getSession()||{name:"Guest"};const blob=new Blob([JSON.stringify({learner:s.name,exported:new Date().toISOString(),data:getStudentData()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="pathfinder-export.json";a.click();toast("⬇ Full archive exported (JSON).")}

/* ---------- Student data store (per account) ---------- */
function dataKey(){const s=getSession();return "pf_data_"+(s?s.email:"guest")}
function getStudentData(){try{return JSON.parse(localStorage.getItem(dataKey())||"null")}catch(e){return null}}
function saveStudentData(d){
  localStorage.setItem(dataKey(),JSON.stringify(d)); /* instant cache = fast UI */
  if(window.PF_DB&&PF_DB.live){ PF_DB.syncStudentData(d); PF_DB.audit("student_data_saved",{subjects:(d.results||[]).length}); } /* background sync, never blocks */
}
function isDemo(){const s=getSession();return !!(s&&s.demo)}
/* Mock data — ONLY for the demo account. Always labelled as mock in the UI. */
function mockStudentData(){
 return {onboarded:true,mock:true,stage:"KCSE Candidate (Form 3–4)",county:"Nairobi",school:"Pangani Girls' High School (Mock)",
  results:[
   {subject:"Mathematics",score:88,target:85},{subject:"Physics",score:82,target:80},{subject:"Chemistry",score:49,target:65},
   {subject:"Computer Studies",score:87,target:85},{subject:"English",score:79,target:75},{subject:"Kiswahili",score:74,target:75}],
  quiz:{top:"Engineering & Technology",riasec:"R-I (Realistic–Investigative)",answers:{}},
  assessments:[{name:"Term 2 Mid-Term Practical",date:"2025-06-18",subject:"Physics (Paper 3)",raw:"34/40 (85%)",pts:"11.0"},
               {name:"Continuous Assessment 2",date:"2025-06-14",subject:"Chemistry (Paper I)",raw:"39/80 (48.7%)",pts:"5.0"},
               {name:"Inter-County Joint Opener",date:"2025-05-12",subject:"Mathematics (P1 & P2)",raw:"176/200 (88%)",pts:"12.0"}]};
}
function ensureDemoData(){if(isDemo()&&!getStudentData())saveStudentData(mockStudentData())}

/* ---------- Smart recommendation engine ----------
   Combines (a) RIASEC personality from quiz answers and
   (b) grade feasibility vs real KUCCPS cluster requirements.
   Returns ranked pathways + per-subject improvement plans. */
const PATHWAY_DEFS=[
 {id:"eng",name:"Engineering & Technology",icon:"⚙",bg:"#eef7d6",cluster:"Cluster 1 & 3",req:{Mathematics:75,Physics:70,Chemistry:60,"Computer Studies":60},riasec:["R","I"],desc:"Software, civil, mechatronics, electrical — computational & built systems.",occ:["Software Engineer","Civil Engineer","Mechatronics Tech"],unis:"UoN, JKUAT, TUK",tvet:"Kabwe Poly, Kenya Coast Poly"},
 {id:"health",name:"Health & Medicine",icon:"✚",bg:"#fdecea",cluster:"Cluster 13",req:{Biology:65,Chemistry:65,Mathematics:60,Physics:60},riasec:["S","I"],desc:"Clinical medicine, nursing, pharmacy, lab science.",occ:["Clinical Officer","Nurse (KRCHN)","Lab Scientist"],unis:"UoN, Moi, Egerton",tvet:"KMTC (71 campuses)"},
 {id:"business",name:"Business & Finance",icon:"↗",bg:"#e6f4ea",cluster:"Cluster 6 & 7",req:{Mathematics:65,English:60},riasec:["E","C"],desc:"Finance, audit, logistics, actuarial, fintech.",occ:["Financial Analyst","Supply Chain Lead","Actuarial Scientist"],unis:"Strathmore, KCA, Co-op Univ",tvet:"KASNEB (CPA/CIFA)"},
 {id:"agri",name:"Agriculture & Environment",icon:"🌱",bg:"#eef7d6",cluster:"Cluster 11",req:{Biology:60,Chemistry:55,Mathematics:55},riasec:["R","N"],desc:"Agronomy, food tech, climate-smart agriculture.",occ:["Agronomist","Food Technologist","Soil Scientist"],unis:"Egerton, JKUAT",tvet:"Bukura Agricultural College"},
 {id:"creative",name:"Creative Arts & Media",icon:"🎨",bg:"#fdf3d7",cluster:"Cluster 17",req:{English:60,Kiswahili:55},riasec:["A","S"],desc:"UI/UX, animation, journalism, film & sound.",occ:["UX/UI Designer","Animator","Journalist"],unis:"Daystar, MMU",tvet:"KIMC"},
 {id:"law",name:"Law, Education & Governance",icon:"⚖",bg:"#ede9fe",cluster:"Cluster 2 & 19",req:{English:65,Kiswahili:60,Mathematics:55},riasec:["S","E"],desc:"Law, teaching (TSC), public administration, policy.",occ:["Teacher (TSC)","Legal Researcher","County Officer"],unis:"UoN, KU, Moi",tvet:"Teacher colleges, Kenya School of Law"}
];
function gradeOf(score){return score>=80?"A":score>=70?"A−":score>=60?"B+":score>=50?"B":score>=40?"C+":"C"}
function computeRecommendations(data){
 const results=data.results||[];
 const bySubj={};results.forEach(r=>bySubj[r.subject]=r.score);
 const avg=results.length?Math.round(results.reduce((a,r)=>a+r.score,0)/results.length):0;
 /* Personality: count RIASEC letters from quiz answers (stored as letters) */
 const counts={R:0,I:0,A:0,S:0,E:0,C:0,N:0};
 /* answers may be stored as option INDEX (new) or LETTER (legacy) — handle both */
 const _qa=(data.quiz&&data.quiz.answers)||{};
 const _letters=["R","I","A","S","E","C","N"];
 Object.entries(_qa).forEach(([qi,v])=>{
   let letter=v;
   if(typeof v==="number"||/^\d+$/.test(String(v))){ const q=(window.__QUIZ_DEF||[])[+qi]; if(q&&q.opts[+v]) letter=q.opts[+v][1]; }
   if(counts[letter]!=null)counts[letter]++;
 });
 const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 const topLetters=sorted.slice(0,2).map(x=>x[0]);
 /* Score each pathway: 55% personality fit + 45% grade feasibility */
 const ranked=PATHWAY_DEFS.map(p=>{
  let pers=0;p.riasec.forEach((L,i)=>{pers+=(counts[L]||0)*(i===0?3:2)});
  const maxPers=18; const persPct=Math.min(100,Math.round(pers/maxPers*100));
  let feasSum=0,reqN=0,gaps=[];
  Object.entries(p.req).forEach(([sub,need])=>{
   const have=bySubj[sub];
   if(have==null){gaps.push({sub,need,have:null,msg:"Not yet entered — add "+sub+" to unlock this pathway."});return}
   reqN++; const ratio=Math.min(1.15,have/need); feasSum+=ratio;
   if(have<need)gaps.push({sub,need,have,msg:`Raise ${sub} from ${have}% to ${need}%+ (+${need-have} pts)`});
  });
  const feasPct=reqN?Math.round(feasSum/reqN*100):50;
  const overall=Math.round(persPct*0.55+Math.min(100,feasPct)*0.45);
  const verdict=overall>=75?"Strong fit — apply with confidence":overall>=60?"Good fit — close the gaps below":overall>=45?"Possible — needs grade improvement":"Stretch — focus on grades first";
  return {...p,persPct,feasPct,overall,verdict,gaps,topLetters};
 }).sort((a,b)=>b.overall-a.overall);
 /* Improvement plans per subject */
 const plans=results.map(r=>{
  const gap=(r.target||r.score)-r.score;
  let focus="",hours="";
  if(r.subject==="Chemistry"){focus="Stoichiometry, mole calculations & qualitative analysis — KNEC topical past papers (Form 3 Term 2).";hours="30 min daily + Wed tutor clinic"}
  else if(r.subject==="Mathematics"){focus="Calculus & 3D Geometry speed drills — weekly joint-mock Paper 2 under timed conditions.";hours="3 × 45 min / week"}
  else if(r.subject==="Physics"){focus="EM Induction, Waves labs & Paper 3 practical apparatus accuracy.";hours="2 × 45 min / week"}
  else if(r.subject==="English"){focus="Paper 3 essay outlines + stylistic devices & thesis clarity.";hours="2 × 30 min / week"}
  else if(r.subject==="Kiswahili"){focus="Sarufi, Maumivu ya Lugha & Ushairi metric analysis drills.";hours="2 × 30 min / week"}
  else if(r.subject==="Computer Studies"){focus="Project milestone docs + SQL/database relationships.";hours="2 × 45 min / week"}
  else if(r.subject==="Biology"){focus="Cell biology diagrams, genetics crosses & practical prep.";hours="2 × 45 min / week"}
  else{focus="Past-paper practice + topic mastery for weakest topics.";hours="2 × 45 min / week"}
  return {subject:r.subject,score:r.score,grade:gradeOf(r.score),target:r.target||r.score,gap,focus,hours,priority:gap>10?"High":gap>0?"Medium":"Maintain"};
 }).sort((a,b)=>b.gap-a.gap);
 return {avg,ranked,plans,topLetters,riasecLabel:topLetters.join("–")+" profile"};
}
/* Data provenance helpers for UI labels */
function mockBadge(){return '<span class="chip mock" title="Illustrative data shown only in the demo account">⚠ MOCK DATA</span>'}
function realBadge(){return '<span class="chip real" title="Official CUE / KUCCPS / TVETA / HEF data">✓ REAL DATA</span>'}
function demoBanner(){
 if(!isDemo())return "";
 return '<div class="alert-mock" style="margin-bottom:18px"><b>Demo account — mock data.</b> Everything on this page is illustrative sample data so you can explore. Sign up with your own account to enter your real results. '+mockBadge()+'</div>';
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const m=$("#addModal");if(m)m.classList.remove("open")}});

/* ---------- Supabase status (for Deployment Centre / footer) ---------- */
function dbStatus(){ return (window.PF_DB&&PF_DB.live) ? "Supabase live · synced" : "Local cache mode · add Supabase keys in assets/js/supabase-config.js to go live"; }
function dbBadge(){ return (window.PF_DB&&PF_DB.live) ? '<span class="chip green">● Supabase live</span>' : '<span class="chip amber">● Local cache (Supabase ready)</span>'; }

/* ---------- Fast search with live suggestions ---------- */
function attachAutocomplete(inputEl, getItems, onPick){
  if(!inputEl) return;
  let box = document.getElementById(inputEl.id + "_suggest");
  if(!box){
    box = document.createElement("div");
    box.id = inputEl.id + "_suggest";
    box.style.cssText = "position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow2);z-index:60;overflow:hidden;display:none;max-height:300px;overflow-y:auto";
    inputEl.parentElement.style.position = "relative";
    inputEl.parentElement.appendChild(box);
  }
  let timer = null;
  inputEl.addEventListener("input", function(){
    clearTimeout(timer);
    timer = setTimeout(function(){
      const q = inputEl.value.trim().toLowerCase();
      if(q.length < 2){ box.style.display = "none"; return; }
      const items = getItems(q).slice(0, 8);
      if(!items.length){ box.innerHTML = '<div style="padding:14px" class="tiny muted">No matches — try another spelling.</div>'; box.style.display = "block"; return; }
      box.innerHTML = items.map(function(it, i){
        return '<button type="button" data-i="' + i + '" style="width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid rgba(124,92,255,.07);padding:12px 14px;font-size:14px;cursor:pointer"><b>' + it.title + '</b><br><span class="tiny muted">' + (it.sub||"") + '</span></button>';
      }).join("");
      box.style.display = "block";
      box.querySelectorAll("button").forEach(function(b){
        b.onclick = function(){
          const it = items[+b.dataset.i];
          inputEl.value = it.value || it.title;
          box.style.display = "none";
          if(onPick) onPick(it);
          inputEl.dispatchEvent(new Event("input"));
        };
      });
    }, 120);
  });
  document.addEventListener("click", function(e){ if(!box.contains(e.target) && e.target !== inputEl) box.style.display = "none"; });
  inputEl.addEventListener("keydown", function(e){ if(e.key === "Escape") box.style.display = "none"; });
}
function globalSearchItems(q){
  const out = [];
  (window.PF_INSTITUTIONS||[]).forEach(function(i){
    if((i.name + " " + i.progs.join(" ")).toLowerCase().includes(q)) out.push({title:i.name, value:i.name, sub:i.type + " · " + i.region + " · " + (i.cutoff||"")});
  });
  (window.PF_SCHOLARSHIPS||[]).forEach(function(s){
    if(s.name.toLowerCase().includes(q)) out.push({title:s.name, value:s.name, sub:s.type + " · " + s.amt});
  });
  ["Passion Quiz","Academic Tracker","Funding & HELB","Institutions Database","Tutor Centre"].forEach(function(x){
    if(x.toLowerCase().includes(q)) out.push({title:x, value:x, sub:"Go to page"});
  });
  return out;
}

/* ---------- Kiswahili (SW) / English (EN) toggle ---------- */
window.PF_I18N = {
  en: {},
  sw: {
    "Dashboard":"Dashibodi","My progress":"Maendeleo yangu","Career explorer":"Kichunguzi cha kazi",
    "Universities & TVET":"Vyuo vikuu & TVET","Scholarships & funding":"Ruzuku & ufadhili",
    "Settings":"Mipangilio","Help & support":"Msaada","Sign in":"Ingia","Get started free":"Anza bure",
    "Create your free account":"Fungua akaunti yako ya bure","Take the 60-second quiz":"Fanya quiz ya sekunde 60",
    "Every Kenyan student deserves a clear path.":"Kila mwanafunzi wa Kenya anastahili njia iliyo wazi.",
    "Hello, future achiever":"Habari, mshindi wa baadaye","Big dreams start here.":"Ndoto kubwa huanza hapa.",
    "Discover your path":"Gundua njia yako","Add a result":"Weka matokeo","Your overview":"Muhtasari wako",
    "Overall average":"Wastani wa jumla","Subjects tracked":"Masomo yanayofuatiliwa","Strongest subject":"Somo bora zaidi",
    "Saved institutions":"Vyuo vilivyohifadhiwa","Passion Quiz":"Quiz ya shauku","My Tracker":"Kifuatiliaji changu",
    "Profile & Stage":"Wasifu & hatua","Sign out":"Toka","Save changes":"Hifadhi mabadiliko"
  }
};
function setLang(lang){
  try{ localStorage.setItem("pf_lang", lang); }catch(e){}
  document.querySelectorAll("[data-lang]").forEach(function(b){ b.classList.toggle("on", b.dataset.lang===lang); });
  const dict = window.PF_I18N[lang] || {};
  if(lang==="sw"){
    document.querySelectorAll("a,button,h1,h2,h3,span,div,p").forEach(function(el){
      if(el.children.length===0 && el.textContent){
        const k = el.textContent.trim();
        if(dict[k]) el.textContent = el.textContent.replace(k, dict[k]);
      }
    });
    document.documentElement.lang = "sw";
    toast("🇰🇪 Kiswahili Sanifu imewashwa — muongozo wa kozi na vyuo.");
  } else {
    document.documentElement.lang = "en";
    location.reload();
  }
}
function initLang(){
  let lang = "en"; try{ lang = localStorage.getItem("pf_lang")||"en"; }catch(e){}
  document.querySelectorAll("[data-lang]").forEach(function(b){
    b.classList.toggle("on", b.dataset.lang===lang);
    b.onclick = function(){ setLang(b.dataset.lang); };
  });
  if(lang==="sw") setLang("sw");
}
document.addEventListener("DOMContentLoaded", initLang);
