-- ---------------------------------------------------------------
-- PathFinder Kenya — reference data seed
-- GENERATED FILE. Do not edit by hand: run `npm run seed`,
-- which rewrites this file from assets/js/data.js.
-- Regenerate with: npm run seed   (no timestamp: keeps the file stable in git)
-- Rows: 24 institutions · 12 scholarships · 47 counties · 14 clusters
-- ---------------------------------------------------------------

truncate table public.institutions restart identity cascade;
truncate table public.scholarships restart identity cascade;
truncate table public.counties restart identity cascade;
truncate table public.clusters  restart identity cascade;
truncate table public.funding_bands restart identity cascade;
truncate table public.pathways      cascade;

insert into public.institutions (id, code, name, type, region, field, cut_off, fees, funding, programmes, website) values
  ('uon', 'UoN', 'University of Nairobi', 'Public University', 'Nairobi', 'Engineering', 'Cluster ~42–44 (CS/Medicine)', 'KES 93,500–120,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Civil Engineering','MBChB Medicine & Surgery','B.Com Commerce','LLB Law','B.Sc Computer Science'], 'https://www.uonbi.ac.ke'),
  ('jkuat', 'JKU', 'JKUAT', 'Public University', 'Kiambu', 'Engineering', 'Cluster ~39–41', 'KES 82,000–110,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Mechatronics','B.Sc Software Engineering','B.Sc Food Science','B.Sc Civil Engineering'], 'https://www.jkuat.ac.ke'),
  ('ku', 'KU', 'Kenyatta University', 'Public University', 'Kiambu (Nairobi)', 'Business', 'Cluster ~36–40', 'KES 75,000–105,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Ed Arts/Science','B.Com','B.Sc Nursing','B.Sc Computer Science'], 'https://www.ku.ac.ke'),
  ('moi', 'Moi', 'Moi University', 'Public University', 'Uasin Gishu', 'Health', 'Cluster ~38–42 (Medicine)', 'KES 85,000–115,000/yr', 'KUCCPS · Universities Fund · HELB', array['MBChB Medicine','B.Sc Nursing','B.Ed','B.Sc IT'], 'https://www.mu.ac.ke'),
  ('egerton', 'EU', 'Egerton University', 'Public University', 'Nakuru', 'Agriculture', 'Cluster ~34–38', 'KES 70,000–95,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Agriculture','B.Sc Food Science','B.Sc Animal Science','B.Ed'], 'https://www.egerton.ac.ke'),
  ('tuk', 'TUK', 'Technical University of Mombasa', 'Public University', 'Mombasa', 'Engineering', 'Cluster ~35–39', 'KES 78,000–100,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Civil Engineering','B.Sc Electrical Engineering','B.Sc Computer Science'], 'https://www.tum.ac.ke'),
  ('dekut', 'DeKUT', 'Dedan Kimathi University of Technology', 'Public University', 'Nyandarua', 'Engineering', 'Cluster ~36–40', 'KES 80,000–105,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Mechatronics','B.Sc Computer Science','B.Sc Civil Engineering'], 'https://www.dkut.ac.ke'),
  ('maseno', 'MU', 'Maseno University', 'Public University', 'Kisumu', 'Business', 'Cluster ~33–37', 'KES 68,000–92,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Com','B.Ed','B.Sc Computer Science','B.Sc Nursing'], 'https://www.maseno.ac.ke'),
  ('kisii', 'KisU', 'Kisii University', 'Public University', 'Kisii', 'Health', 'Cluster ~32–36', 'KES 65,000–90,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Nursing','B.Ed','B.Com','B.Sc CS'], 'https://www.kisiiuniversity.ac.ke'),
  ('seku', 'SEKU', 'South Eastern Kenya University', 'Public University', 'Kitui', 'Agriculture', 'Cluster ~31–35', 'KES 62,000–88,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Agriculture','B.Sc CS','B.Com','B.Ed'], 'https://www.seku.ac.ke'),
  ('chuka', 'CU', 'Chuka University', 'Public University', 'Tharaka Nithi', 'Agriculture', 'Cluster ~31–35', 'KES 62,000–88,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Sc Agriculture','B.Sc CS','B.Com','B.Ed'], 'https://www.cu.ac.ke'),
  ('karatina', 'KaU', 'Karatina University', 'Public University', 'Nyeri', 'Business', 'Cluster ~32–36', 'KES 65,000–90,000/yr', 'KUCCPS · Universities Fund · HELB', array['B.Com','B.Sc CS','B.Ed','B.Sc Nursing'], 'https://www.karatinauniversity.ac.ke'),
  ('strathmore', 'SU', 'Strathmore University', 'Private University', 'Nairobi', 'Business', 'Private intake — own criteria', 'KES 380,000–520,000/yr', 'HELB · need-based grants', array['BBIT','LLB Law','B.Sc Financial Economics'], 'https://www.strathmore.edu'),
  ('usiu', 'USIU', 'USIU-Africa', 'Private University', 'Nairobi', 'Business', 'Private intake', 'KES 420,000–580,000/yr', 'HELB · merit scholarships', array['B.Sc CS','B.Sc Intl Business','LLB Law'], 'https://www.usiu.ac.ke'),
  ('daystar', 'DU', 'Daystar University', 'Private University', 'Nairobi', 'Creative', 'Private intake', 'KES 320,000–450,000/yr', 'HELB · scholarships', array['B.A Communication','B.Sc CS','B.Com'], 'https://www.daystar.ac.ke'),
  ('kca', 'KCA', 'KCA University', 'Private University', 'Nairobi', 'Business', 'Private intake', 'KES 280,000–400,000/yr', 'HELB tuition loan', array['B.Com','B.Sc CS','B.Sc Actuarial Science'], 'https://www.kca.ac.ke'),
  ('mku', 'MKU', 'Mount Kenya University', 'Private University', 'Kiambu', 'Health', 'Private intake', 'KES 450,000–700,000/yr', 'HELB tuition loan', array['MBChB','B.Sc Nursing','B.Pharm'], 'https://www.mku.ac.ke'),
  ('zetech', 'ZU', 'Zetech University', 'Private University', 'Kiambu', 'ICT', 'Private intake', 'KES 250,000–350,000/yr', 'HELB tuition loan', array['B.Sc CS','B.Sc IT','B.Com'], 'https://www.zetech.ac.ke'),
  ('merupoly', 'MNP', 'Meru National Polytechnic', 'National Polytechnic / TVET', 'Meru', 'Engineering', 'KCSE C− (diploma) · D (cert)', 'Subsidised capitation', 'KUCCPS TVET · Capitation + HELB TVET', array['Diploma Building','Diploma Civil','Diploma Electrical','Diploma ICT'], null),
  ('kcoastpoly', 'KCNP', 'Kenya Coast National Polytechnic', 'National Polytechnic / TVET', 'Mombasa', 'Engineering', 'KCSE C− · D− (artisan)', 'Subsidised capitation', 'KUCCPS TVET · Capitation + HELB TVET', array['Diploma Civil','Diploma Electrical','Diploma Maritime','Diploma Hospitality'], null),
  ('ep', 'ENP', 'Eldoret National Polytechnic', 'National Polytechnic / TVET', 'Uasin Gishu', 'Engineering', 'KCSE C− & above', 'Subsidised capitation', 'KUCCPS TVET · Capitation + HELB', array['Diploma Mechanical','Diploma ICT','Diploma Building'], null),
  ('nyeripoly', 'NNP', 'Nyeri National Polytechnic', 'National Polytechnic / TVET', 'Nyeri', 'Agriculture', 'KCSE C− & above', 'Subsidised capitation', 'KUCCPS TVET · Capitation + HELB', array['Diploma Agriculture','Diploma ICT','Diploma Hospitality'], null),
  ('kabete', 'KNP', 'Kabete National Polytechnic', 'National Polytechnic / TVET', 'Kiambu', 'Agriculture', 'KCSE C− & above', 'Subsidised capitation', 'KUCCPS TVET · Capitation + HELB', array['Diploma Agriculture','Diploma Veterinary','Diploma ICT'], null),
  ('kmtc', 'KMTC', 'Kenya Medical Training College', 'Public College (KMTC)', 'National — 30+ campuses', 'Health', 'C plain (clinical) · C−', 'KES 60,000–95,000/yr', 'Gov capitation · HELB TVET', array['Diploma Clinical Medicine','Diploma Nursing','Diploma Pharmacy','Diploma Lab'], 'https://www.kmtc.ac.ke');

insert into public.scholarships (name, audience, covers, "window", url) values
  ('Wings to Fly — Equity Group Foundation', 'Top KCPE/KCSE performers from disadvantaged homes', 'Full secondary & university scholarship + mentorship', 'Dec – Jan', 'https://equitygroupfoundation.com'),
  ('Equity Leaders Program (ELP)', 'Top KCSE candidates in strong universities', 'Full university sponsorship + leadership training', 'After KCSE results', 'https://equitygroupfoundation.com'),
  ('KCB Foundation — 2jiajiri', 'Youth 18–35 for vocational / TVET training', 'Full tuition, tools, business training & seed capital', 'Opens ~Feb yearly', 'https://kcbfoundation.com'),
  ('Mastercard Foundation Scholars', 'Talented, financially constrained students', 'Full fees + stipend at partner unis', 'Varies by university', 'https://mastercardfdn.org'),
  ('HEF Universities Fund', 'All public-university students', 'Scholarship + loan mix per band', 'After KUCCPS placement', 'https://www.hef.co.ke'),
  ('HELB Undergraduate Loan', 'Degree students', 'Tuition + upkeep loan', 'Rolling', 'https://www.helb.co.ke'),
  ('HELB TVET Loan', 'Diploma & artisan students', 'Tuition + KES 30,000/yr capitation', 'Rolling', 'https://www.helb.co.ke'),
  ('NG-CDF & County bursaries', 'Constituency residents', 'Fee top-ups', 'Year-round', 'https://www.ngcdf.go.ke'),
  ('Zawadi Africa Education Fund', 'High-achieving girls from low-income homes', 'Full university scholarship + leadership mentoring abroad', 'Jan – Mar', 'https://zawadiafrica.org'),
  ('Safaricom Foundation Scholarship', 'Needy students in partner counties', 'School fees, books and mentorship through secondary school', 'Feb – Apr', 'https://www.safaricomfoundation.org'),
  ('M-PESA Foundation Bursary', 'Orphans and vulnerable learners', 'Fees and upkeep, paid directly to the institution', 'Varies by county', 'https://mpesafoundation.org'),
  ('Chandaria Foundation Bursary', 'Bright students facing hardship', 'Partial to full fee support, renewed yearly', 'Rolling', 'https://chandariafoundation.org');

insert into public.counties (name) values
  ('Mombasa'),
  ('Kwale'),
  ('Kilifi'),
  ('Tana River'),
  ('Lamu'),
  ('Taita Taveta'),
  ('Garissa'),
  ('Wajir'),
  ('Mandera'),
  ('Marsabit'),
  ('Isiolo'),
  ('Meru'),
  ('Tharaka Nithi'),
  ('Embu'),
  ('Kitui'),
  ('Machakos'),
  ('Makueni'),
  ('Nyandarua'),
  ('Nyeri'),
  ('Kirinyaga'),
  ('Murang''a'),
  ('Kiambu'),
  ('Turkana'),
  ('West Pokot'),
  ('Samburu'),
  ('Trans Nzoia'),
  ('Uasin Gishu'),
  ('Elgeyo Marakwet'),
  ('Nandi'),
  ('Baringo'),
  ('Laikipia'),
  ('Nakuru'),
  ('Narok'),
  ('Kajiado'),
  ('Kericho'),
  ('Bomet'),
  ('Kakamega'),
  ('Vihiga'),
  ('Bungoma'),
  ('Busia'),
  ('Siaya'),
  ('Kisumu'),
  ('Homa Bay'),
  ('Migori'),
  ('Kisii'),
  ('Nyamira'),
  ('Nairobi');

insert into public.clusters (name, subject_slots) values
  ('1 · Law', to_jsonb(array['English','Kiswahili','Mathematics','Physics','History','Geography','CRE']::text[])),
  ('2 · Business, Hospitality & Tourism', to_jsonb(array['English','Mathematics','Business','Geography','History','CRE','Agriculture']::text[])),
  ('3 · Communication, Media & Languages', to_jsonb(array['English','Kiswahili','History','Geography','CRE','Business','Agriculture']::text[])),
  ('4 · Architecture & Building', to_jsonb(array['Mathematics','Physics','English','Chemistry','Geography','Computer Studies']::text[])),
  ('5 · Medicine, Health & Veterinary', to_jsonb(array['English','Biology','Chemistry','Mathematics','Physics']::text[])),
  ('6 · Computer Science & IT', to_jsonb(array['Mathematics','Physics','English','Chemistry','Computer Studies','Biology']::text[])),
  ('7 · Actuarial, Maths & Statistics', to_jsonb(array['Mathematics','Physics','English','Chemistry','Computer Studies']::text[])),
  ('8 · Engineering & Technology', to_jsonb(array['Mathematics','Physics','Chemistry','English']::text[])),
  ('9 · Agriculture & Food Science', to_jsonb(array['Biology','Agriculture','Chemistry','Mathematics','Physics','English','Geography']::text[])),
  ('10 · Environmental & Natural Resources', to_jsonb(array['Biology','Chemistry','Geography','Mathematics','Physics','English','Agriculture']::text[])),
  ('11 · Education (Arts)', to_jsonb(array['English','Kiswahili','History','Geography','CRE','Business','Agriculture']::text[])),
  ('12 · Education (Science)', to_jsonb(array['Mathematics','Physics','Chemistry','Biology','English','Kiswahili','Geography']::text[])),
  ('13 · Pharmacy', to_jsonb(array['Biology','Chemistry','Mathematics','Physics','English']::text[])),
  ('14 · Nursing & Midwifery', to_jsonb(array['Biology','Chemistry','English','Mathematics','Physics']::text[]));

insert into public.funding_bands (band, tagline, split, detail) values
  (1, 'Most needy', '~100% scholarship · 0% loan', 'Full government scholarship — no loan to repay.'),
  (2, 'Very needy', '~70% scholarship · ~30% loan', 'Majority scholarship with a small HELB loan component.'),
  (3, 'Needy', '~50% scholarship · ~50% loan', 'An even split between scholarship and loan.'),
  (4, 'Less needy', '~30% scholarship · ~70% loan', 'Smaller scholarship, larger loan portion.'),
  (5, 'Least needy', '~0% scholarship · 100% loan + top-up', 'Fully funded through HELB loans; families may top up.');

-- career pathways: interest weights drive the recommender
insert into public.pathways (id, name, target_points, interest_weights) values
  ('health', 'Health & Medicine', 41, '{"I":0.55,"S":0.45}'::jsonb),
  ('eng', 'Engineering & Technology', 39, '{"R":0.6,"I":0.4}'::jsonb),
  ('biz', 'Business, Law & Commerce', 36, '{"E":0.6,"C":0.4}'::jsonb),
  ('agri', 'Agriculture & Environment', 33, '{"R":0.45,"I":0.35,"S":0.2}'::jsonb),
  ('creative', 'Creative, Media & Design', 30, '{"A":0.75,"E":0.15,"S":0.1}'::jsonb),
  ('edu', 'Education & Social Services', 32, '{"S":0.6,"A":0.2,"E":0.2}'::jsonb);
