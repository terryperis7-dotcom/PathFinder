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
 run('assets/js/supabase.js'); run('assets/js/app.js');
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
 await t('quiz definition: 12 questions x 6 options',()=>{assert.strictEqual(PF_QUIZ.length,12);PF_QUIZ.forEach(q=>assert.strictEqual(q.opts.length,6))});

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
