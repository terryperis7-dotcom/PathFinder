const vm=require('vm'),fs=require('fs'),assert=require('assert');
const root=require('path').join(__dirname,'..')+'/';
const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
globalThis.window=globalThis;
globalThis.document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({style:{},appendChild(){},remove(){}}),body:{appendChild(){}},documentElement:{}};
globalThis.location={pathname:'/signin.html',href:'',search:''};
const calls=[]; // fake supabase
function builder(table){const b={};['select','insert','update','delete','upsert','eq','order'].forEach(m=>b[m]=(...a)=>{calls.push({table,m,a});return b});b.maybeSingle=async()=>({data:{id:'u1',role:'student',full_name:'Real Name',county:'Kisumu',stage:'KCSE Candidate (Form 3–4)',onboarded:true}});b.then=r=>r({data:[],error:null});return b}
function run(f){vm.runInThisContext(fs.readFileSync(root+f,'utf8'),{filename:f})}
run('assets/js/data.js');
let pass=0;const t=async(n,f)=>{try{await f();pass++;console.log('ok  ',n)}catch(e){console.log('FAIL',n,'\n    ',e.message);process.exitCode=1}};
(async()=>{
 // ---- local mode ----
 run('assets/js/supabase.js'); run('assets/js/app.js'); run('assets/js/cluster.js'); run('assets/js/tutor.js'); run('assets/js/avatar.js');
 await t('PF_DB not live without keys',()=>assert.strictEqual(PF_DB.live,false));
 await t('password too short rejected',async()=>{const r=await registerAccount({name:'A',email:'a@x.ke',password:'short',role:'student'});assert(r.error)});
 await t('register student ok, hash stored, no plaintext',async()=>{
   const r=await registerAccount({name:'Amina',email:'Amina@X.ke',phone:'0700',password:'Correct-Horse-1',role:'student',extra:{stage:'KCSE Candidate (Form 3–4)'}});
   assert(r.user&&!r.error); assert(!('hash' in r.user)&&!('salt' in r.user));
   const raw=localStorage.getItem('pf_users'); assert(!raw.includes('Correct-Horse-1')); assert(raw.includes('"hash"'));});
 await t('duplicate email rejected (case-insensitive)',async()=>{const r=await registerAccount({name:'B',email:'amina@x.ke',password:'Another-Pass-9',role:'student'});assert(r.error)});
 await t('superadmin self-signup is coerced to student',async()=>{const r=await registerAccount({name:'Evil',email:'evil@x.ke',password:'Evil-Pass-123',role:'superadmin'});assert.strictEqual(r.user.role,'student')});
 await t('hard-coded admin credentials no longer work',async()=>{const r=await loginAccount('emmanuelmwangi88@gmail.com','#Chege888');assert(r.error&&!r.user)});
 await t('correct password logs in',async()=>{const r=await loginAccount('amina@x.ke','Correct-Horse-1');assert(r.user&&r.user.name==='Amina')});
 await t('wrong password rejected, same message as unknown user',async()=>{
   const a=await loginAccount('amina@x.ke','nope-nope-nope'),b=await loginAccount('ghost@x.ke','whatever1234');
   assert(a.error&&b.error); assert.strictEqual(a.error,b.error)});
 await t('lockout after repeated failures',async()=>{
   for(let i=0;i<5;i++) await loginAccount('amina@x.ke','bad-bad-bad'+i);
   const r=await loginAccount('amina@x.ke','Correct-Horse-1'); assert(/Too many/.test(r.error))});
 await t('legacy account (no hash) must set a strong password',async()=>{
   const u=JSON.parse(localStorage.getItem('pf_users'));u.push({name:'Old',email:'old@x.ke',role:'student'});localStorage.setItem('pf_users',JSON.stringify(u));
   assert((await loginAccount('old@x.ke','123')).error);
   const ok=await loginAccount('old@x.ke','Brand-New-Pass1');assert(ok.user);
   assert((await loginAccount('old@x.ke','wrong-wrong-1')).error);
   assert((await loginAccount('old@x.ke','Brand-New-Pass1')).user)});
 await t('session never contains password material',async()=>{
   const u=(await loginAccount('old@x.ke','Brand-New-Pass1')).user; setSession(u);
   const raw=localStorage.getItem('pf_session'); assert(!/hash|salt|iter/.test(raw))});
 await t('safeNext blocks open redirects',()=>{
   assert.strictEqual(safeNext('https://evil.com','home'),'home');assert.strictEqual(safeNext('//evil.com','home'),'home');
   assert.strictEqual(safeNext('javascript:alert(1)','home'),'home');assert.strictEqual(safeNext('/student/dashboard.html','h'),'student/dashboard.html')});
 await t('csvCell neutralises formulas and quotes',()=>{
   assert.strictEqual(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.strictEqual(csvCell('a,b'),'"a,b"')});
 await t('esc escapes HTML',()=>assert.strictEqual(esc('<img onerror="x">&\''),'&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;'));
 await t('quiz: index and letter answers give identical recommendations',()=>{
   const results=[{subject:'Mathematics',score:80,target:85},{subject:'Physics',score:75,target:80},{subject:'Chemistry',score:70,target:75},{subject:'English',score:60,target:70}];
   const idx={},let_={};PF_QUIZ.forEach((q,i)=>{idx[i]=i%6;let_[i]=q.opts[i%6][1]});
   const a=computeRecommendations({results,quiz:{answers:idx}}),b=computeRecommendations({results,quiz:{answers:let_}});
   assert.deepStrictEqual(a.ranked.map(r=>[r.id,r.overall]),b.ranked.map(r=>[r.id,r.overall]));assert.strictEqual(a.ranked.length,6)});
 await t('recommendations: 6 ranked pathways, plans sorted by gap, avg correct',()=>{
   const r=computeRecommendations({results:[{subject:'Mathematics',score:90,target:95},{subject:'Chemistry',score:40,target:70}],quiz:{answers:{}}});
   assert.strictEqual(r.avg,65);assert.strictEqual(r.plans[0].subject,'Chemistry');assert.strictEqual(r.plans[0].priority,'High')});
 await t('chart output escapes subject names',()=>{const h=renderScoreChart([{subject:'<script>x</script>',score:50,target:60}]);assert(!h.includes('<script>'))});
 await t('quiz definition: 6 questions x 6 options',()=>{
   assert.strictEqual(PF_QUIZ.length,6);
   PF_QUIZ.forEach(q=>assert.strictEqual(q.opts.length,6));
   PF_QUIZ.forEach(q=>q.opts.forEach(o=>assert.strictEqual(o.length,2)));
 });
 await t('quiz covers every RIASEC dimension the pathways score on',()=>{
   /* Pathways score on R I A S E C plus N (nature/agriculture). Every one must
      be selectable, or that pathway can never earn its full personality score. */
   const used=new Set(); PF_QUIZ.forEach(q=>q.opts.forEach(o=>used.add(o[1])));
   const needed=new Set(); PATHWAY_DEFS.forEach(p=>p.riasec.forEach(l=>needed.add(l)));
   needed.forEach(l=>assert.ok(used.has(l),'no quiz option maps to '+l));
   /* N must be reachable in more than one question or it is all-or-nothing. */
   const nQuestions=PF_QUIZ.filter(q=>q.opts.some(o=>o[1]==='N')).length;
   assert.ok(nQuestions>=2,'only '+nQuestions+' question(s) offer N');
 });
 await t('personality score is calibrated to the question count',()=>{
   /* persPct = pers/18*100, with 3 points for a pathway primary dimension.
      The 18 must equal questionCount x 3, or the scale saturates early. */
   const calib=PF_QUIZ.length*3;
   assert.strictEqual(calib,18,'scoring constant 18 no longer matches '+PF_QUIZ.length+' questions');
   /* All answers on a pathway's primary dimension must reach exactly 100%. */
   const p=PATHWAY_DEFS[0];
   const answers={}; PF_QUIZ.forEach((q,i)=>{
     const idx=q.opts.findIndex(o=>o[1]===p.riasec[0]);
     assert.ok(idx>=0,'no option for '+p.riasec[0]+' in question '+i);
     answers[i]=idx;
   });
   const r=computeRecommendations({results:[{subject:'Mathematics',score:90},{subject:'Physics',score:88}],quiz:{answers}});
   const row=r.ranked.find(x=>x.id===p.id);
   assert.ok(row,'pathway '+p.id+' missing from ranked output');
   assert.strictEqual(row.persPct,100,'primary-dimension answers should score 100, got '+row.persPct);
 });
 await t('stored answers from a longer quiz are discarded, not silently trusted',()=>{
   /* A quiz saved when there were more questions must not count as complete. */
   const stale={results:[{subject:'Mathematics',score:80}],onboarded:true,quiz:{answers:{0:0,1:1,2:2,3:3,4:4,5:5,9:0,11:2}}};
   const clean=sanitiseQuizAnswers(stale);
   /* Salvaging the in-range answers is deliberately NOT done: if the question
      set changed, index 2 may now be a different question, so the stored
      answer no longer means what the student chose. Everything is cleared. */
   assert.deepStrictEqual(clean.quiz.answers,{},'stale answers should be cleared, not partly kept');
   /* It is no longer a complete quiz, so onboarding must ask again. */
   assert.strictEqual(clean.onboarded,false);
   /* The student is told why, rather than finding an empty quiz. */
   assert.strictEqual(clean.quizResetReason,'questions-changed');
   /* Grades are untouched — only the quiz is discarded. */
   assert.strictEqual(clean.results.length,1);
 });
 /* ---------- Language switch ---------- */
 /* ---------- KCSE grade boundaries ----------
    gradeOf() once used its own shortened table: everything under 40 collapsed
    to "C", so a 22% average was presented as a passing grade. It also returned
    "A-" with a Unicode minus while the points table is keyed on an ASCII
    hyphen, so that grade scored zero points. Both are asserted here. */
 await t('gradeOf matches the official KNEC bands at every boundary',()=>{
   const bands=[[80,'A'],[75,'A-'],[70,'B+'],[65,'B'],[60,'B-'],[55,'C+'],
                [50,'C'],[45,'C-'],[40,'D+'],[35,'D'],[30,'D-'],[0,'E']];
   bands.forEach(([min,grade])=>{
     assert.strictEqual(gradeOf(min),grade,min+'% should be '+grade);
     assert.strictEqual(gradeOf(min+4>100?100:min+4),grade,(min+4)+'% should still be '+grade);
     if(min>0) assert.notStrictEqual(gradeOf(min-1),grade,(min-1)+'% should NOT be '+grade);
   });
 });
 await t('every grade gradeOf returns is worth points',()=>{
   for(let n=0;n<=100;n++){
     const g=gradeOf(n);
     assert.ok(g in PF_GRADE_POINTS, 'gradeOf('+n+') returned '+JSON.stringify(g)+' which has no points');
   }
 });
 await t('gradeOf and the cluster calculator agree',()=>{
   for(let n=0;n<=100;n+=1){
     const a=gradeOf(n), b=gradeFromScore(n);
     assert.strictEqual(a,b,'at '+n+'%: gradeOf says '+a+', gradeFromScore says '+b);
   }
 });
 await t('a grade written with a Unicode minus still scores points',()=>{
   assert.strictEqual(gradePoints('B\u2212'), gradePoints('B-'), 'U+2212 minus scored differently');
   assert.strictEqual(gradePoints('B\u2212'), 8);
 });
 await t('pathway summaries cite no invented institutions',()=>{
   const banned=[/kabwe/i];
   PATHWAY_DEFS.forEach(p=>{
     const text=(p.unis||'')+' '+(p.tvet||'');
     banned.forEach(re=>assert.ok(!re.test(text),'pathway '+p.id+' cites '+text));
   });
 });

 await t('sw dictionary is well formed',()=>{
   assert.ok(PF_I18N && PF_I18N.sw, 'PF_I18N.sw missing');
   assert.deepStrictEqual(PF_I18N.en, {}, 'en must stay empty: it is the source language');
   const keys=Object.keys(PF_I18N.sw);
   assert.ok(keys.length>=60, 'dictionary too small to be visible: '+keys.length);
   keys.forEach(k=>{
     assert.ok(k && k.trim(), 'empty key in dictionary');
     assert.ok(PF_I18N.sw[k] && PF_I18N.sw[k]!==k, 'no translation for '+JSON.stringify(k));
   });
   // Duplicate keys differing only by whitespace silently translate nothing.
   const norm=keys.map(k=>k.trim().toLowerCase());
   assert.strictEqual(new Set(norm).size, norm.length, 'duplicate dictionary keys');
 });
 await t('language round-trip restores the original text without a reload',()=>{
   /* Minimal node tree: applyTranslations works on direct child TEXT nodes,
      which is how a nav link keeps its label beside its icon. */
   const link=mkEl('A','Dashboard',[mkEl('SVG','')]);
   const plain=mkEl('H2','Your average');
   const all=[link,plain];
   const realQS=document.querySelectorAll;
   document.querySelectorAll=()=>all;
   try{
     const n=applyTranslations(PF_I18N.sw);
     assert.strictEqual(n,2,'should translate the label beside the icon too, got '+n);
     assert.strictEqual(link.textContent,'Dashibodi');
     assert.strictEqual(plain.textContent,'Wastani wako');
     assert.strictEqual(link.dataset.pfOrig,'Dashboard','original not cached');
     const m=restoreTranslations();
     assert.strictEqual(m,2);
     assert.strictEqual(link.textContent,'Dashboard','EN did not restore');
     assert.strictEqual(plain.textContent,'Your average','EN did not restore');
     assert.strictEqual(link.dataset.pfOrig,undefined,'cache not cleared after restore');
   } finally { document.querySelectorAll=realQS; }
 });
 await t('translator never touches inputs or numbers',()=>{
   const input=mkEl('INPUT','Dashboard');
   const num=mkEl('SPAN','84');
   const realQS=document.querySelectorAll;
   document.querySelectorAll=()=>[input,num];
   try{
     const n=applyTranslations(PF_I18N.sw);
     assert.strictEqual(n,0,'must not translate form values or bare numbers');
     assert.strictEqual(input.textContent,'Dashboard');
     assert.strictEqual(num.textContent,'84');
   } finally { document.querySelectorAll=realQS; }
 });
 /* Minimal element stub. textContent needs a real setter: restoreTranslations
    assigns to it, and a getter-only property would silently swallow the write
    and make the test pass for the wrong reason. */
 function mkEl(tag,text,kids){
   const textNodes = text==null?[]:[{nodeType:3,nodeValue:text}];
   return {tagName:tag, children:kids||[], childNodes:[...(kids||[]), ...textNodes], dataset:{},
     get textContent(){return this.childNodes.filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('')},
     set textContent(v){
       const tn=this.childNodes.filter(n=>n.nodeType===3);
       if(tn.length){ tn[0].nodeValue=v; for(let i=1;i<tn.length;i++) tn[i].nodeValue=''; }
       else this.childNodes.push({nodeType:3,nodeValue:v});
     }};
 }

 await t('sanitiseQuizAnswers leaves a complete, valid quiz untouched',()=>{
   const answers={}; PF_QUIZ.forEach((q,i)=>answers[i]=0);
   const d={results:[{subject:'Mathematics',score:80}],onboarded:true,quiz:{answers}};
   const out=sanitiseQuizAnswers(d);
   assert.deepStrictEqual(out.quiz.answers,answers);
   assert.strictEqual(out.onboarded,true,'a finished quiz must stay finished');
 });


 // ---- KUCCPS cluster points engine ----
 await t('grade points scale: A=12 down to E=1',()=>{
   const exp={A:12,'A-':11,'B+':10,B:9,'B-':8,'C+':7,C:6,'C-':5,'D+':4,D:3,'D-':2,E:1};
   Object.keys(exp).forEach(g=>assert.strictEqual(gradePoints(g),exp[g],'grade '+g));
   assert.strictEqual(gradePoints(''),0); assert.strictEqual(gradePoints(null),0);
 });
 await t('KNEC percentage -> letter grade boundaries',()=>{
   assert.strictEqual(gradeFromScore(84),'A');   assert.strictEqual(gradeFromScore(80),'A');
   assert.strictEqual(gradeFromScore(79),'A-');  assert.strictEqual(gradeFromScore(75),'A-');
   assert.strictEqual(gradeFromScore(74),'B+');  assert.strictEqual(gradeFromScore(58),'C+');
   assert.strictEqual(gradeFromScore(55),'C+');  assert.strictEqual(gradeFromScore(54),'C');
   assert.strictEqual(gradeFromScore(29),'E');   assert.strictEqual(gradeFromScore(0),'E');
   assert.strictEqual(gradeFromScore(-5),null);  assert.strictEqual(gradeFromScore('abc'),null);
 });
 await t('aggregate = sum of best 7, capped at 84',()=>{
   const g={ENG:12&&'B',KIS:'B',MATA:'A',BIO:'A',PHY:'A',CHE:'A',GEO:'A',HAG:'A',CRE:'A'};
   // nine A/B grades -> best 7 = 7*12 = 84
   assert.strictEqual(aggregatePoints({ENG:'A',KIS:'A',MATA:'A',BIO:'A',PHY:'A',CHE:'A',GEO:'A',HAG:'A',CRE:'A'},7),84);
   // fewer than 7 subjects: sums what exists
   assert.strictEqual(aggregatePoints({MATA:'A',ENG:'B'},7),12+9);
   assert.strictEqual(aggregatePoints({},7),0);
   assert.strictEqual(aggregatePoints({MATA:'A',ENG:''},7),12);
 });
 await t('weighted formula matches the published worked example (39.799)',()=>{
   // Math B+ / Bio A / Chem A- / Eng B / Geo B- / Hist C+ / Kis B  -> raw 42, agg 66
   const g={MATA:'B+',BIO:'A',CHE:'A-',ENG:'B',GEO:'B-',HAG:'C+',KIS:'B'};
   const r=computeClusterResult('sciences',g);
   assert.strictEqual(r.raw,42);
   assert.strictEqual(r.aggregate,66);
   assert.strictEqual(r.points,39.799);
 });
 await t('perfect candidate scores exactly 48.000',()=>{
   const g={ENG:'A',KIS:'A',MATA:'A',BIO:'A',PHY:'A',CHE:'A',GEO:'A'};
   const r=computeClusterResult('medicine',g);
   assert.strictEqual(r.raw,48); assert.strictEqual(r.aggregate,84);
   assert.strictEqual(r.points,48);
 });
 await t('no grades -> zero points and every slot empty',()=>{
   const r=computeClusterResult('engineering',{});
   assert.strictEqual(r.points,0); assert.strictEqual(r.raw,0);
   assert.strictEqual(r.picked.filter(Boolean).length,0);
   assert.strictEqual(r.missing.length,4);
   assert.strictEqual(r.eligible,false);
 });
 await t('a subject can only be counted once across the four slots',()=>{
   const r=computeClusterResult('medicine',{BIO:'A',CHE:'A',MATA:'A',PHY:'A',ENG:'A',KIS:'A',GEO:'A'});
   const codes=r.picked.filter(Boolean);
   assert.strictEqual(new Set(codes).size,codes.length,'duplicate subject in slots: '+codes);
 });
 await t('picks the best valid combination, not the greedy one',()=>{
   // Slot1 accepts X or Y; Slot2 accepts only X. Greedy would spend X on slot 1
   // and leave slot 2 empty (12 pts). The optimum is Y in slot 1 and X in slot 2 (13 pts).
   const fake={id:'t',num:99,name:'T',icon:'',official:false,programmes:[],
     slots:[{pick:['MATA','PHY']},{pick:['MATA']},{pick:['ENG']},{pick:['KIS']}],mins:[]};
   const r=computeClusterResult(fake,{MATA:'A',PHY:'E',ENG:'E',KIS:'E'});
   assert.strictEqual(r.picked[0],'PHY');
   assert.strictEqual(r.picked[1],'MATA');
   assert.strictEqual(r.raw,12+1+1+1);           // better than the greedy 12+0+1+1
 });
 await t('group slots expand to the right KCSE subjects',()=>{
   assert.deepStrictEqual(slotCodes({pick:['ENG'],groups:['II']}),['ENG','BIO','PHY','CHE','GSC']);
   assert.strictEqual(slotCodes({groups:['I']}).length,4);
   assert.strictEqual(PF_SUBJECTS.length,30);
 });
 await t('minimum subject grades are detected',()=>{
   const good=computeClusterResult('engineering',{MATA:'B',PHY:'B',CHE:'B',ENG:'B',BIO:'B',KIS:'B',GEO:'B'});
   assert.strictEqual(good.minimums.length,3);
   assert.ok(good.minimums.every(m=>m.ok));
   assert.strictEqual(good.eligible,true);
   const bad=computeClusterResult('engineering',{MATA:'C',PHY:'B',CHE:'B',ENG:'B',BIO:'B',KIS:'B',GEO:'B'});
   assert.ok(bad.minimums.some(m=>m.code==='MATA'&&!m.ok));
   assert.strictEqual(bad.eligible,false);
 });
 await t('an alternative subject can satisfy a minimum',()=>{
   // Medicine requires MAT A or PHY at B; here only PHY qualifies.
   const r=computeClusterResult('medicine',{BIO:'B',CHE:'B',MATA:'C',PHY:'B',ENG:'B',KIS:'B',GEO:'B'});
   const m=r.minimums.filter(x=>x.code==='MATA')[0];
   assert.strictEqual(m.ok,true); assert.strictEqual(m.which,'PHY');
 });
 await t('improvement plan is positive, sorted and capped',()=>{
   const g={MATA:'C',PHY:'B',CHE:'B',ENG:'B',BIO:'B',KIS:'B',GEO:'B'};
   const plan=improvementPlan('engineering',g,3);
   assert.ok(plan.length>0);
   assert.ok(plan.length<=3);
   assert.ok(plan.every(p=>p.delta>0));
   for(let i=1;i<plan.length;i++) assert.ok(plan[i-1].delta>=plan[i].delta,'not sorted');
   plan.forEach(p=>assert.ok(PF_GRADE_ORDER.indexOf(p.to)<PF_GRADE_ORDER.indexOf(p.from),'grade did not improve'));
   // an A student has nowhere to go
   assert.strictEqual(improvementPlan('engineering',{MATA:'A',PHY:'A',CHE:'A',ENG:'A',BIO:'A',KIS:'A',GEO:'A'}).length,0);
 });
 await t('cut-off matching returns sane verdicts',()=>{
   const easy=matchCutoffs('engineering',46);   // well above every cut-off
   assert.ok(easy.length>0); assert.ok(easy.every(x=>x.verdict==='likely'));
   const hard=matchCutoffs('engineering',10);
   assert.ok(hard.every(x=>x.verdict==='short'));
   assert.ok(hard.every(x=>x.gap>0));
   assert.strictEqual(matchCutoffs('engineering',40)[0].verdict,'borderline');
   assert.strictEqual(matchCutoffs('nomatchcluster',40).length,0);
 });
 await t('all clusters are well formed',()=>{
   const ids=new Set();
   PF_CLUSTERS.forEach(c=>{
     assert.ok(c.id&&!ids.has(c.id),'duplicate cluster id '+c.id); ids.add(c.id);
     assert.strictEqual(c.slots.length,4,'cluster '+c.id+' must have 4 slots');
     assert.ok(c.programmes.length>0,'cluster '+c.id+' has no programmes');
     c.slots.forEach((sl,i)=>assert.ok(slotCodes(sl).length>0,'cluster '+c.id+' slot '+i+' is empty'));
     (c.mins||[]).forEach(m=>assert.ok(PF_SUBJECT_BY_CODE[m.code],'unknown minimum subject '+m.code));
     (c.mins||[]).forEach(m=>assert.ok(PF_GRADE_POINTS[m.min],'unknown minimum grade '+m.min));
   });
   assert.ok(PF_CLUSTERS.some(c=>c.num===13&&c.id==='medicine'));
   assert.ok(PF_CLUSTERS.some(c=>c.num===5&&c.id==='engineering'));
 });
 await t('every cluster result is computable for a realistic candidate',()=>{
   const g={ENG:'B',KIS:'B',MATA:'B',BIO:'B',PHY:'B',CHE:'B',GEO:'B'};
   const all=computeAllClusters(g);
   assert.strictEqual(all.length,PF_CLUSTERS.length);
   all.forEach(r=>{
     assert.ok(r.points>0&&r.points<=48,'points out of range: '+r.cluster.id+'='+r.points);
     assert.strictEqual(r.picked.filter(Boolean).length,4,r.cluster.id+' did not fill 4 slots');
   });
   for(let i=1;i<all.length;i++) assert.ok(all[i-1].points>=all[i].points,'ranking not sorted');
 });


 // ---- Tutor workspace data layer ----
 setSession({ name:'Test Tutor', email:'tutor@x.ke', role:'tutor', roleLabel:'TSC Tutor' });
 await t('tutor profile defaults and round-trips through storage',()=>{
   localStorage.removeItem('pf_tutor_tutor@x.ke');
   const d=loadTutorProfile();
   assert.strictEqual(d.rate,TUTOR_RATE);
   assert.deepStrictEqual(d.subjects,[]);
   assert.deepStrictEqual(d.sessions,[]);
   updateTutorProfile({ tsc:'489201', county:'Nairobi', subjects:['Mathematics','Physics'] });
   const again=loadTutorProfile();
   assert.strictEqual(again.tsc,'489201');
   assert.strictEqual(again.county,'Nairobi');
   assert.deepStrictEqual(again.subjects,['Mathematics','Physics']);
 });
 await t('verification never marks anything verified by itself',()=>{
   localStorage.removeItem('pf_tutor_tutor@x.ke');
   let v=tutorVerification();
   assert.strictEqual(v.verified,0,'a fresh profile must not be verified');
   assert.strictEqual(v.complete,false);
   assert.strictEqual(v.canTakeBookings,false);
   assert.strictEqual(v.total,PF_VERIFICATION_STEPS.length);
   // submitting documents moves them to "awaiting review", never "verified"
   PF_VERIFICATION_STEPS.forEach(st=>submitTutorDoc(st.id));
   v=tutorVerification();
   assert.strictEqual(v.submitted,v.total,'all steps should be submitted');
   assert.strictEqual(v.verified,0,'submission must NOT equal verification');
   assert.strictEqual(v.complete,false);
   assert.strictEqual(v.canTakeBookings,false);
   v.steps.forEach(st=>assert.strictEqual(st.status,'submitted'));
   withdrawTutorDoc('tsc');
   assert.strictEqual(tutorVerification().submitted,v.total-1);
   assert.strictEqual(submitTutorDoc('not-a-real-step'),null);
 });
 await t('availability: add, reject duplicates/overlaps, count hours',()=>{
   localStorage.removeItem('pf_tutor_tutor@x.ke');
   assert.strictEqual(loadTutorProfile().availability.length,0);
   addTutorSlot('Monday','16:00','17:00');
   addTutorSlot('Monday','18:00','19:30');
   const p=loadTutorProfile();
   assert.strictEqual(p.availability.length,2);
   // duplicates and invalid ranges are refused
   addTutorSlot('Monday','16:00','17:00');
   assert.strictEqual(loadTutorProfile().availability.length,2,'duplicate slot was accepted');
   assert.strictEqual(addTutorSlot('Tuesday','18:00','18:00'),null,'zero-length slot accepted');
   assert.strictEqual(addTutorSlot('Tuesday','19:00','18:00'),null,'reversed range accepted');
   assert.strictEqual(addTutorSlot('Notaday','09:00','10:00'),null,'bad day accepted');
   assert.strictEqual(tutorWeeklyHours(),2.5,'1h + 1.5h expected');
   removeTutorSlot(0);
   assert.strictEqual(tutorWeeklyHours(),1.5);
 });
 await t('sessions start empty and only grow when added',()=>{
   localStorage.removeItem('pf_tutor_tutor@x.ke');
   assert.strictEqual(loadTutorProfile().sessions.length,0,'sessions must not be pre-seeded');
   assert.strictEqual(addTutorSession({day:'',student:'X'}),null,'missing day accepted');
   assert.strictEqual(addTutorSession({day:'Monday',student:''}),null,'missing student accepted');
   const a=addTutorSession({day:'Friday',time:'4:00 PM',student:'Jane W.',subject:'Biology'});
   addTutorSession({day:'Monday',time:'9:00 AM',student:'Sam O.',subject:'Chemistry'});
   assert.ok(a && a.id);
   // every new session waits on guardian consent
   assert.strictEqual(a.status,'Awaiting guardian consent');
   assert.strictEqual(loadTutorProfile().sessions.length,2);
   // sorted Monday-first
   const sorted=tutorSessionsSorted();
   assert.strictEqual(sorted[0].day,'Monday');
   assert.strictEqual(sorted[1].day,'Friday');
   const est=tutorMonthlyEstimate();
   assert.strictEqual(est.sessions,2);
   assert.strictEqual(est.amount,2*TUTOR_RATE*4);
   removeTutorSession(a.id);
   assert.strictEqual(loadTutorProfile().sessions.length,1);
 });

 // ---- Reference data audit ----
 await t('reference data audit passes on the shipped data',()=>{
   const a=auditReferenceData();
   assert.ok(a.total>0);
   assert.strictEqual(a.errors,0,'audit errors: '+
     a.checks.filter(c=>c.severity==='error').map(c=>c.label+' ('+c.detail+')').join(' | '));
   // the shipped data does carry warnings — that is honest, not a failure
   assert.ok(a.warnings>0,'expected the audit to flag something needing confirmation');
   assert.strictEqual(a.passed+a.errors+a.warnings+a.notes,a.total);
   assert.ok(a.checks.some(c=>c.id==='inst-unique-code'));
   assert.ok(a.checks.some(c=>c.id==='cluster-shape'),'cluster checks missing — is cluster.js loaded?');
   assert.ok(a.checks.some(c=>c.id==='counties'));
 });
 await t('audit catches a duplicate institution code',()=>{
   const insts=window.PF_INSTITUTIONS;
   const saved=insts.map(i=>Object.assign({},i));
   insts[1].code=insts[0].code;              // deliberately break it
   const a=auditReferenceData();
   assert.strictEqual(a.checks.filter(c=>c.id==='inst-unique-code')[0].severity,'error');
   assert.ok(a.errors>0);
   insts.length=0; saved.forEach(i=>insts.push(i));   // restore
   assert.strictEqual(auditReferenceData().errors,0);
 });
 await t('audit flags an institution with no contact details',()=>{
   const det=window.PF_INSTITUTION_DETAILS;
   const saved=det.uon; delete det.uon;
   const a=auditReferenceData();
   assert.strictEqual(a.checks.filter(c=>c.id==='inst-details')[0].severity,'error');
   det.uon=saved;
   assert.strictEqual(auditReferenceData().errors,0);
 });


 // ---- Generated avatars (assets/js/avatar.js) ----
 await t('12 personas, unique ids and complete palettes',()=>{
   assert.strictEqual(PF_PERSONAS.length,12);
   const ids=new Set();
   PF_PERSONAS.forEach(p=>{
     assert.ok(p.id&&!ids.has(p.id),'duplicate id '+p.id); ids.add(p.id);
     assert.ok(p.name&&p.sw,'persona '+p.id+' needs en + sw names');
     assert.match(p.from,/^#[0-9a-f]{6}$/i,'bad from colour on '+p.id);
     assert.match(p.to,/^#[0-9a-f]{6}$/i,'bad to colour on '+p.id);
     assert.ok(PF_MOTIFS[p.motif],'persona '+p.id+' has no motif named '+p.motif);
   });
 });
 // Gradient ids are unique per call (that is deliberate), so normalise them
 // before comparing two avatars for equality.
 const flat=svg=>svg.replace(/pfav\d+/g,'pfav').replace(/\sxmlns="[^"]*"/g,'');
 await t('every persona renders a well-formed self-contained SVG',()=>{
   PF_PERSONAS.forEach((p,i)=>{
     const svg=flat(avatarSVG(i));
     assert.ok(svg.startsWith('<svg'),p.id+' is not an svg');
     assert.ok(svg.trim().endsWith('</svg>'),p.id+' is not closed');
     assert.ok(/viewBox="0 0 64 64"/.test(svg),p.id+' missing viewBox');
     assert.ok(/stop-color="#/.test(svg),p.id+' missing gradient stops');
     assert.ok(/url\(#pfav[^)]*\)/.test(svg),p.id+' gradient not referenced');
     // no external requests of any kind — this is the whole point
     assert.doesNotMatch(svg,/https?:\/\//,p.id+' references an external URL');
     assert.doesNotMatch(svg,/fetch|url\(http/i,p.id+' could trigger a network call');
     assert.doesNotMatch(svg,/<image|xlink:href|src=/i,p.id+' embeds an image file');
     assert.ok(/role="img"/.test(svg)&&/aria-label="/.test(svg),p.id+' is not labelled');
   });
 });
 await t('gradient ids are unique so avatars do not collide on one page',()=>{
   const ids=[...Array(8)].map((_,i)=>/url\(#(pfav\d+)\)/.exec(avatarSVG(i))[1]);
   assert.strictEqual(new Set(ids).size,8,'duplicate gradient id: '+ids.join(','));
 });
 await t('persona index wraps instead of rendering nothing',()=>{
   assert.strictEqual(flat(avatarSVG(12)),flat(avatarSVG(0)));
   assert.strictEqual(flat(avatarSVG(-1)),flat(avatarSVG(11)));
   assert.strictEqual(flat(avatarSVG(999)),flat(avatarSVG(999%12)));
   assert.strictEqual(flat(avatarSVG('3')),flat(avatarSVG(3)));
   assert.strictEqual(flat(avatarSVG(null)),flat(avatarSVG(0)));
   assert.ok(avatarSVG(NaN).includes('<svg'),'NaN index must still render');
 });
 await t('avatarForName is deterministic and always in range',()=>{
   const names=['Amina Odhiambo','Brian Kiprop','','  ','Faith Wanjiku','OTIENO'];
   names.forEach(n=>{
     const a=avatarForName(n), b=avatarForName(n);
     assert.strictEqual(a,b,'not stable for '+JSON.stringify(n));
     assert.ok(a>=0&&a<12,'out of range for '+JSON.stringify(n));
   });
   assert.strictEqual(avatarForName(''),0,'blank name should fall back to 0');
   assert.ok(avatarForName(null)===0||avatarForName(null)<12);
   // different people should not all land on the same avatar
   const spread=new Set(['Amina','Brian','Faith','Mercy','Kevin','Zawadi'].map(avatarForName));
   assert.ok(spread.size>=3,'names all mapped to the same avatar: '+[...spread]);
 });
 await t('initials avatar uses up to two initials and escapes the name',()=>{
   assert.ok(avatarInitialsSVG('Amina Odhiambo').includes('>AO<'));
   assert.ok(avatarInitialsSVG('Brian').includes('>B<'));
   assert.ok(avatarInitialsSVG('Mary Njeri Wanjiku').includes('>MN<'));
   assert.ok(avatarInitialsSVG('Amina Odhiambo (Demo)').includes('>AO<'),'demo suffix should not leak into initials');
   assert.ok(avatarInitialsSVG('Amina (Demo)').includes('>A<'),'demo suffix should not leak into initials');
   assert.ok(avatarInitialsSVG('   ').includes('>?<'),'blank name should render a placeholder');
   assert.ok(avatarInitialsSVG('').includes('>?<'),'empty name should render a placeholder');
   // escaping
   const evil='<img src=x onerror=alert(1)>';
   assert.ok(avatarInitialsSVG(evil).includes('&lt;img'),'name was not escaped');
   assert.doesNotMatch(avatarInitialsSVG(evil),/<img[ >]/,'a live tag survived escaping');
   assert.doesNotMatch(avatarInitialsSVG(evil),/aria-label="[^"]*[<>]"/,'raw angle bracket inside an attribute');
   assert.ok(avatarInitialsSVG(evil).includes('&gt;'),'name was not escaped');
   assert.doesNotMatch(avatarSVG(0,{title:'</svg><script>x</script>'}),/<script>/);
   assert.ok(avatarSVG(0,{title:'Ada & Grace'}).includes('Ada &amp; Grace'));
 });

 // ---- Supabase mode with a recording fake client ----
 window.PF_SUPABASE_CONFIG={url:'https://x.supabase.co',anonKey:'anon'};
 window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'u1'}}}),getSession:async()=>({data:{session:{}}}),signOut:async()=>{},
   signUp:async(o)=>{calls.push({auth:'signUp',o});return{data:{user:{id:'u1',email:o.email,user_metadata:o.options.data},session:{}},error:null}},
   signInWithPassword:async()=>({data:{user:{id:'u1',email:'amina@x.ke',user_metadata:{role:'superadmin'}}},error:null})},from:builder})};
 run('assets/js/supabase.js');
 await t('PF_DB live with keys',()=>assert.strictEqual(PF_DB.live,true));
 await t('signup sends only whitelisted role (never superadmin) in metadata',async()=>{
   calls.length=0;await registerAccount({name:'X',email:'x@y.ke',password:'Valid-Pass-123',role:'superadmin'});
   const c=calls.find(c=>c.auth==='signUp');assert.strictEqual(c.o.options.data.role,'student')});
 await t('role comes from the profiles row, not user metadata',async()=>{
   const r=await loginAccount('amina@x.ke','Valid-Pass-123');assert.strictEqual(r.user.role,'student');assert.strictEqual(r.user.name,'Real Name')});
 await t('profile sync never sends role or email',async()=>{
   calls.length=0;await PF_DB.syncProfile({name:'N',role:'superadmin',email:'e@x',extra:{}});
   const u=calls.find(c=>c.table==='profiles'&&c.m==='update');assert(u);assert(!('role' in u.a[0])&&!('email' in u.a[0]))});
 await t('quiz sync stores option index + valid RIASEC letter',async()=>{
   calls.length=0;await PF_DB.syncStudentData({results:[{subject:'Mathematics',score:80,target:90}],quiz:{answers:{0:0,1:1,2:2}},assessments:[]});
   const ins=calls.find(c=>c.table==='quiz_answers'&&c.m==='insert');assert(ins);
   ins.a[0].forEach(r=>{assert(['R','I','A','S','E','C','N'].includes(r.answer_letter));assert(Number.isInteger(r.option_idx))});
   assert.strictEqual(ins.a[0].length,3)});
 console.log('\n'+pass+' checks passed');process.exit(process.exitCode||0);
})();
