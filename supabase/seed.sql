-- PathFinder Kenya — Seed data (REAL reference data)
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Institutions mirror assets/data.js (CUE/KUCCPS/TVETA indicative 2024/2025).
-- Cut-offs change yearly — verify on kuccps.ac.ke before publishing.

insert into public.institutions (id, code, name, type, region, field, programs, funding, cutoff, fees) values
('uon','UoN','University of Nairobi','Public University','Nairobi','Engineering','["B.Sc Civil Engineering","MBChB Medicine & Surgery","B.Com Commerce","LLB Law","B.Sc Computer Science"]','KUCCPS Placement · Universities Fund (Bands 1-5) · HELB','Cluster ~42-44 (CS/Medicine)','KES 93,500-120,000/yr'),
('jkuat','JKU','JKUAT — Jomo Kenyatta Univ. of Agriculture & Tech','Public University','Kiambu','Engineering','["B.Sc Mechatronics","B.Sc Software Engineering","B.Sc Food Science","B.Sc Telecommunications"]','KUCCPS · Universities Fund · HELB','Cluster ~39-41','KES 82,000-110,000/yr'),
('ku','KU','Kenyatta University','Public University','Kiambu','Business','["B.Ed Arts/Science","B.Com","B.Sc Nursing","B.Sc Computer Science"]','KUCCPS · Universities Fund · HELB','Cluster ~36-40','KES 75,000-105,000/yr'),
('moi','Moi','Moi University','Public University','Uasin Gishu','Health','["MBChB Medicine","B.Sc Nursing","B.Ed","B.Sc Information Technology"]','KUCCPS · Universities Fund · HELB','Cluster ~38-42 (Medicine)','KES 85,000-115,000/yr'),
('egerton','EU','Egerton University','Public University','Nakuru','Agriculture','["B.Sc Agriculture","B.Sc Food Science","B.Sc Animal Science"]','KUCCPS · Universities Fund · HELB','Cluster ~34-38','KES 70,000-95,000/yr'),
('tuk','TUK','Technical University of Mombasa','Public University','Mombasa','Engineering','["B.Sc Civil Engineering","B.Sc Electrical Engineering","B.Sc Computer Science"]','KUCCPS · Universities Fund · HELB','Cluster ~35-39','KES 78,000-100,000/yr'),
('dekut','DeKUT','Dedan Kimathi University of Technology','Public University','Nyandarua','Engineering','["B.Sc Mechatronics","B.Sc Computer Science","B.Sc Civil Engineering"]','KUCCPS · Universities Fund · HELB','Cluster ~36-40','KES 80,000-105,000/yr'),
('strathmore','SU','Strathmore University','Private University','Nairobi','Business','["BBIT","LLB Law","B.Sc Financial Economics"]','HELB Tuition Loan · Need-Based Grants','Private intake','KES 380,000-520,000/yr'),
('usiu','USIU','USIU-Africa','Private University','Nairobi','Business','["B.Sc Computer Science","B.Sc International Business","LLB Law"]','HELB Tuition Loan · Merit scholarships','Private intake','KES 420,000-580,000/yr'),
('knp','KNP','Kabwe National Polytechnic','National Polytechnic / TVET','Meru','ICT','["Diploma ICT & Cyber Defence","Building & Civil Tech","Electrical (Power)"]','KUCCPS TVET · Gov Capitation KES 30,000/yr + HELB TVET','Entry KCSE C- & above','Subsidised capitation'),
('kcp','KCP','Kenya Coast Polytechnic','National Polytechnic / TVET','Mombasa','Engineering','["Diploma Civil Engineering","Diploma Electrical Engineering","Diploma ICT"]','KUCCPS TVET · Capitation + HELB TVET','Entry KCSE C- & above','Subsidised capitation'),
('kmtc','KMTC','Kenya Medical Training College (KMTC)','Health College','Nairobi','Health','["Diploma Clinical Medicine","KRCHN Nursing","Pharmacy Technology"]','KMTC Portal / KUCCPS · Dedicated HELB KMTC','KCSE C (Bio) & Chem','County hospital rotations'),
('uot','UoT','University of Toronto','International','Ontario, Canada','Engineering','["Lester B. Pearson Scholarship","Engineering & CS","Life Sciences"]','100% tuition, books, residence (4 years)','KCSE Straight A (80+ pts)','Fully funded (Pearson)')
on conflict (id) do update set name=excluded.name, programs=excluded.programs, cutoff=excluded.cutoff, fees=excluded.fees, updated_at=now();

insert into public.scholarships (name, type, coverage, amount, deadline) values
('Wings of Glory Alumni Leadership Program','Full Scholarship','100% Tuition + Stipend','KES 450,000/yr','Aug 30'),
('KCB Foundation Tertiary & Zizi','Partial Grant','Tuition + Upkeep','KES 180,000/yr','Sept 15'),
('M-PESA Foundation Academy Fund','Partial Grant','Tuition + Laptop','KES 220,000/yr','Oct 01'),
('Mastercard Foundation Scholars Program','Full Scholarship','Tuition, upkeep, mentorship','Full ride','Varies by partner uni'),
('Chevening Scholarship (UK)','Full Scholarship','Masters tuition + living','Full ride','Nov (annual)'),
('DAAD Scholarship (Germany)','Full Scholarship','Masters/PhD + stipend','Full ride','Oct (annual)'),
('TVET Capitation + HELB TVET Loan','Government','Capitation KES 30,000/yr + loan','Gov funded','KUCCPS TVET window');
