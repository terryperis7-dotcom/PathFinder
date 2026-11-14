-- PathFinder Kenya — seed data (reference data)
-- Run AFTER schema.sql.
--
-- GENERATED FILE — do not edit by hand.
-- Regenerate with:  npm run seed        (node tools/gen_seed.js)
-- Source of truth:  assets/js/data.js
--
-- Re-runnable: rows are upserted on conflict.
-- Cut-offs, fees and deadlines change every year — verify on kuccps.ac.ke,
-- helb.co.ke and each institution's own website before relying on them.
-- Generated 2026-11-13 from 24 institutions and 12 scholarships.

insert into public.institutions (id, code, name, type, region, field, programs, funding, cutoff, fees) values
('uon','UoN','University of Nairobi','Public University','Nairobi','Engineering','["B.Sc Civil Engineering","MBChB Medicine & Surgery","B.Com Commerce","LLB Law","B.Sc Computer Science"]'::jsonb,'KUCCPS Placement · Universities Fund (Bands 1–5) · HELB','Cluster ~42–44 (CS/Medicine)','KES 93,500–120,000/yr'),
('jkuat','JKU','JKUAT — Jomo Kenyatta Univ. of Agriculture & Tech','Public University','Kiambu','Engineering','["B.Sc Mechatronics","B.Sc Software Engineering","B.Sc Food Science","B.Sc Telecommunications","B.Sc Civil Engineering"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~39–41','KES 82,000–110,000/yr'),
('ku','KU','Kenyatta University','Public University','Kiambu','Business','["B.Ed Arts/Science","B.Com","B.Sc Nursing","B.Sc Computer Science","B.A Psychology"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~36–40','KES 75,000–105,000/yr'),
('moi','Moi','Moi University','Public University','Uasin Gishu','Health','["MBChB Medicine","B.Sc Nursing","B.Ed","B.Sc Information Technology","B.Com"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~38–42 (Medicine)','KES 85,000–115,000/yr'),
('egerton','EU','Egerton University','Public University','Nakuru','Agriculture','["B.Sc Agriculture","B.Sc Food Science","B.Sc Animal Science","B.Sc Natural Resources","B.Ed"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~34–38','KES 70,000–95,000/yr'),
('tuk','TUK','Technical University of Mombasa','Public University','Mombasa','Engineering','["B.Sc Civil Engineering","B.Sc Electrical Engineering","B.Sc Computer Science","B.Tech Building Technology"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~35–39','KES 78,000–100,000/yr'),
('dekut','DeKUT','Dedan Kimathi University of Technology','Public University','Nyandarua','Engineering','["B.Sc Mechatronics","B.Sc Computer Science","B.Sc Civil Engineering","B.Sc Geomatic Engineering"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~36–40','KES 80,000–105,000/yr'),
('maseno','MU','Maseno University','Public University','Kisumu','Business','["B.Com","B.Ed","B.Sc Computer Science","B.Sc Nursing","B.A Communication"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~33–37','KES 68,000–92,000/yr'),
('kisii','KisU','Kisii University','Public University','Kisii','Health','["B.Sc Nursing","B.Ed","B.Com","B.Sc Computer Science"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~32–36','KES 65,000–90,000/yr'),
('seku','SEKU','South Eastern Kenya University','Public University','Kitui','Agriculture','["B.Sc Agriculture","B.Sc Computer Science","B.Com","B.Ed"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~31–35','KES 62,000–88,000/yr'),
('chuka','CU','Chuka University','Public University','Tharaka Nithi','Agriculture','["B.Sc Agriculture","B.Sc Computer Science","B.Com","B.Ed"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~31–35','KES 62,000–88,000/yr'),
('karatina','KaU','Karatina University','Public University','Nyeri','Business','["B.Com","B.Sc Computer Science","B.Ed","B.Sc Nursing"]'::jsonb,'KUCCPS · Universities Fund · HELB','Cluster ~32–36','KES 65,000–90,000/yr'),
('strathmore','SU','Strathmore University','Private University','Nairobi','Business','["BBIT","LLB Law","B.Sc Financial Economics","B.Sc Informatics & CS"]'::jsonb,'HELB Tuition Loan · Need-Based Grants (no UF public scholarship)','Private intake — own criteria','KES 380,000–520,000/yr'),
('usiu','USIU','USIU-Africa','Private University','Nairobi','Business','["B.Sc Computer Science","B.Sc International Business","B.Sc Psychology","LLB Law"]'::jsonb,'HELB Tuition Loan · Merit scholarships','Private intake','KES 420,000–580,000/yr'),
('daystar','DU','Daystar University','Private University','Nairobi','Creative','["B.A Communication","B.Sc Computer Science","B.Com","B.Ed"]'::jsonb,'HELB Tuition Loan · Scholarships','Private intake','KES 320,000–450,000/yr'),
('kca','KCA','KCA University','Private University','Nairobi','Business','["B.Com","B.Sc Computer Science","B.Sc Actuarial Science","B.A Economics"]'::jsonb,'HELB Tuition Loan','Private intake','KES 280,000–400,000/yr'),
('mku','MKU','Mount Kenya University','Private University','Kiambu','Health','["MBChB Medicine","B.Sc Nursing","B.Pharm Pharmacy","B.Sc Computer Science"]'::jsonb,'HELB Tuition Loan','Private intake','KES 450,000–700,000/yr'),
('zetech','ZU','Zetech University','Private University','Kiambu','ICT','["B.Sc Computer Science","B.Sc Information Technology","B.Com"]'::jsonb,'HELB Tuition Loan','Private intake','KES 250,000–350,000/yr'),
('merupoly','MNP','The Meru National Polytechnic','National Polytechnic / TVET','Meru','Engineering','["Diploma Building & Construction Technology","Diploma Civil Engineering","Diploma Electrical & Electronics Engineering","Diploma Quantity Surveying","Diploma ICT"]'::jsonb,'KUCCPS TVET · Gov Capitation KES 30,000/yr + HELB TVET Loan','Entry KCSE C− (diploma) · D (certificate)','Subsidised capitation'),
('kcoastpoly','KCNP','The Kenya Coast National Polytechnic','National Polytechnic / TVET','Mombasa','Engineering','["Diploma Civil Engineering","Diploma Electrical Engineering","Diploma Building Technology","Diploma ICT","Diploma Maritime & Port Logistics","Diploma Hospitality Management"]'::jsonb,'KUCCPS TVET · Gov Capitation KES 30,000/yr + HELB TVET Loan','Entry KCSE C− (diploma) · D− (artisan/certificate)','Subsidised capitation'),
('ep','EP','Eldoret National Polytechnic','National Polytechnic / TVET','Uasin Gishu','Engineering','["Diploma Mechanical Engineering","Diploma ICT","Diploma Building Technology"]'::jsonb,'KUCCPS TVET · Capitation + HELB TVET','Entry KCSE C− & above','Subsidised capitation'),
('nyeripoly','NP','Nyeri National Polytechnic','National Polytechnic / TVET','Nyeri','Agriculture','["Diploma Agriculture","Diploma ICT","Diploma Hospitality"]'::jsonb,'KUCCPS TVET · Capitation + HELB TVET','Entry KCSE C− & above','Subsidised capitation'),
('kmtc','KMTC','Kenya Medical Training College (KMTC)','Health College','Nairobi','Health','["Diploma Clinical Medicine","KRCHN Nursing","Pharmacy Technology","Medical Lab Sciences"]'::jsonb,'KMTC Portal / KUCCPS · Dedicated HELB KMTC','KCSE C (Bio) & Chem','County hospital rotations'),
('uot','UoT','University of Toronto','International','Ontario, Canada','Engineering','["Lester B. Pearson Scholarship","Engineering & CS","Life Sciences"]'::jsonb,'100% tuition, books, residence (4 years)','KCSE Straight A (80+ pts)','Fully funded (Pearson)')
on conflict (id) do update set code=excluded.code, name=excluded.name, type=excluded.type, region=excluded.region, field=excluded.field,
  programs=excluded.programs, funding=excluded.funding, cutoff=excluded.cutoff, fees=excluded.fees, updated_at=now();

insert into public.scholarships (name, type, coverage, amount, deadline, url) values
('Wings of Glory Alumni Leadership Program','Full Scholarship','100% Tuition + Stipend','KES 450,000/yr','Aug 30','https://www.wingsofglory.co.ke'),
('KCB Foundation Tertiary & Zizi','Partial Grant','Tuition + Upkeep','KES 180,000/yr','Sept 15','https://www.kcbfoundation.org'),
('M-PESA Foundation Academy Fund','Partial Grant','Tuition + Laptop','KES 220,000/yr','Oct 01','https://www.safaricom.co.ke/mpesa-foundation'),
('Elimu Higher Education Fund','Merit Award','Full University','KES 300,000/yr','Nov 20','https://www.equitybank.co.ke'),
('Mastercard Foundation Scholars Program','Full Scholarship','Tuition, upkeep, mentorship','Full ride','Varies by partner uni','https://mastercardfdn.org'),
('Chevening Scholarship (UK)','Full Scholarship','Masters tuition + living','Full ride','Nov (annual)','https://www.chevening.org'),
('DAAD Scholarship (Germany)','Full Scholarship','Masters/PhD + stipend','Full ride','Oct (annual)','https://www.daad-kenya.org'),
('Commonwealth Scholarship','Full Scholarship','Masters tuition + living','Full ride','Dec (annual)','https://cscuk.fcdo.gov.uk'),
('Equity Bank Wings to Fly (secondary→uni)','Full Scholarship','Secondary + University','Full ride','Jan (annual)','https://www.equitybank.co.ke'),
('Kenya Women Trust Fund','Partial Grant','Tuition support (women)','KES 150,000/yr','Rolling','https://www.kenyawomen.org'),
('County Government Bursaries (47 counties)','Partial Grant','Tuition top-up','KES 20,000–80,000/yr','Per county','https://www.helb.co.ke'),
('TVET Capitation + HELB TVET Loan','Government','Capitation KES 30,000/yr + loan','Gov funded','KUCCPS TVET window','https://www.helb.co.ke')
on conflict (name) do update set type=excluded.type, coverage=excluded.coverage, amount=excluded.amount, deadline=excluded.deadline, url=excluded.url;
