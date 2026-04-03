import { useState, useRef, useEffect } from "react";

const AVATAR = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Cyber_woman_concept.jpg/800px-Cyber_woman_concept.jpg";

// Use the uploaded image as base64 or fallback to a cyberpunk style div
const AvatarImg = ({ size = 36, glow = false }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.45,
    flexShrink: 0,
    overflow: "hidden",
    boxShadow: glow ? `0 0 ${size/2}px rgba(167,139,250,0.6), 0 0 ${size}px rgba(219,39,119,0.3)` : "none",
    border: "2px solid rgba(167,139,250,0.5)",
    position: "relative"
  }}>
    <img
      src="/mnt/user-data/uploads/1000039965.png"
      alt="AI Avatar"
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML += "✦"; }}
    />
  </div>
);

const SYSTEM_PROMPT = `Esti NOVA — un asistent AI specializat in marketing digital pentru antreprenori digitali si creatori de continut din Romania.

NISA TINTA:
Te adresezi antreprenorilor digitali si creatorilor de continut care vor sa creasca pe Instagram si TikTok, sa vanda produse digitale si sa isi scaleze business-ul online. Audienta principala: femei ambitioase care vor independenta financiara si libertate.

━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUSELE DISPONIBILE — descrieri complete
━━━━━━━━━━━━━━━━━━━━━━━━━

1. ACADEMIA AI — 127 euro (valoare reala 667 euro) sau 2 rate de 63.50 euro
Singurul program din Romania care te invata sa transformi AI-ul in bani reali.
Ce inveti: creezi propriul Avatar AI realist, faci video-uri cu el in cateva secunde, ii dai voce care vinde, construiesti brand faceless care merge singur, vinzi produse digitale chiar daca ai 0 urmaritori.
Strategii care NU se bazeaza pe viralizare. AI-ul munceste pentru tine, nu invers.
Ce primesti: 90+ lectii video pas cu pas, prompturi gata de folosit, acces pe viata + update-uri viitoare, One-Click Storytelling, program afiliere 80% comision, AI Hub Software gratuit la lansare, suport 1:1 direct cu Olivia, comunitate privata AAI, grup suport, cadouri (produse MRR, module VIP).
Pentru cine: creatori care vor sa ramana anonimi dar vizibili, persoane care nu vor sa-si arate fata, incepatori fara audienta, oricine vrea sa vanda cu AI.
NU este pentru cei care cauta scurtaturi fara sa aplice.
Acces instant in 2 minute. Vanzarile sunt finale si nerambursabile.

2. ELITE DIGITAL COURSE — 299 euro
Curs audio-video complet creat de o echipa de creatori care au facut zeci de mii de euro din digital. Disponibil in 7 limbi: romana, engleza, franceza, germana, spaniola, italiana, rusa.
Module: setarea unui business digital de la zero, mindset si psihologia vanzarii, strategii de content si vanzare pe TikTok/Instagram/Live, email marketing/funneluri/campanii platite, automatizari si AI (ChatGPT, ManyChat), branding personal si storytelling, design grafic in Canva pentru produse digitale, faceless marketing, baza legala pentru business digital, alte modele de business (UGC, Amazon KDP, WordPress).
BONUS inclus: produse MRR in valoare de 700 euro pe care le poti lista separat in magazinul tau si vinde cu 100% profit, inclusiv:
  - Pachet Business Premium (70 euro) — 30 ghiduri digitale: copywriting, TikTok, Instagram, faceless, NLP, Canva, social media, vanzari digitale + grup WhatsApp suport
  - Pachet Master Gold (100 euro) — 40 ghiduri + tutoriale video + 6.000 videoclipuri faceless + AI pentru social media + planner social media
  - Business Start All-in-One (130 euro) — 35 ghiduri + 20.000 video + sute de idei pentru continut strategic: Canva, Instagram, TikTok, NLP, Threads, Reels, copywriting, faceless marketing, crearea produsului digital, banca de hook-uri, banca de story-uri, 365 prompts Threads, 3 luni continut TikTok, colectie 20.000 video, harta creatorului, personal planner 2025, femeia antreprenor
Pasii pentru a incepe: cumperi cursul, faci pagina Instagram/TikTok dedicata, configurezi magazinul StanStore, postezi reels+stories cu strategiile invatate, generezi venit pasiv 1.000-3.000 euro/luna.
Nu ai nevoie de firma pentru a incepe. Declare veniturile prin Declaratia Unica pana pe 25 mai.
Elite Digital Course NU e doar un curs — e upgrade-ul de la incerc sa inteleg digitalul la fac bani constant din el.

3. PACHET BUSINESS PREMIUM — 70 euro
30 ghiduri digitale cu drepturi de revanzare (MRR) — le poti vinde cu 100% profit.
Contine: storytelling pe social media, copywriting aplicat, 100 idei afaceri online, introducere copywriting, de la zero like-uri la reels care rup, ghid TikTok 3 luni, threads transforma contul in ATM, ABC TikTok pentru incepatori, TikTok si secretele sale, faceless, marketing digital si elemente esentiale, 365 prompts pentru Threads, de la vizualizari la conversii, reels cu impact, Instagram story, secretele Instagramului, harta venitului pasiv, de la minus la plus, social media manager, tehnici NLP, ghid Canva Pro, Canva de baza, Facebook Ads, configurarea campaniilor YouTube, planner social media, intelegerea tipurilor de licenta, content fara haos, META planner, Meta introducere pas cu pas, arta vanzarii digitale.
Include grup WhatsApp suport + strategii de vanzare + idei de continut.

4. PACHET MASTER GOLD (UB - Ultimate Business) — 100-105 euro
40 ghiduri + tutoriale video + biblioteca 6.000+ videoclipuri faceless.
Contine: AI pentru social media (postari eficiente si atractive), 6.000+ videoclipuri faceless pentru orice nisa, ghiduri si tutoriale Instagram Reels/TikTok/Canva, strategii de vanzare si tehnici NLP, planner social media, suport constant.
Castigi online fara sa te afisezi — tot ce ai nevoie pentru succes.

5. BUSINESS START ALL-IN-ONE — 130 euro
Mega Pachet Instagram si TikTok 2025 — 35 ghiduri + 20.000 video + sute de idei pentru continut strategic.
Ghiduri esentiale: Canva pentru incepatori, Canva Plus, Secretele Instagramului, Succes pe Social Media, Totul despre Reels cu impact, Promovare eficienta pe TikTok, TikTok Like a Pro, Tehnici NLP pentru TikTok, Threads Ghid practic, Insta Story si Story care vand, Introducere in copywriting, Intelegerea tipurilor de licente, Deblocarea algoritmului Instagram 2025.
Strategii: primele 3 saptamani de continut, cum sa-ti construiesti brandul, construirea increderii publicului, de la vizualizari la conversii, harta spre venitul pasiv, faceless marketing, crearea propriului produs digital.
Instrumente vizuale: estetica postarilor Instagram, 100 idei Reels + descrieri, banca hook-uri, banca story-uri, banca story-uri cu autoritate, 365 prompts Threads, 3 luni continut TikTok, 20.000 colectie video, 100 idei afaceri online cu buget mic, harta creatorului de continut, Personal Planner 2025.
Pentru femei ambitioase: Femeia Antreprenor, Instagram MMO.

6. DEBLOCAREA VANZARILOR — 27 euro
Cursul care a schimbat vanzarile la peste 300 de femei. Creat de Ana Fronias.
NU doar un curs — o harta simpla, clara si practica care te ajuta sa vinzi mai usor, chiar daca ai putin timp si un cont mic. Inveti sa vinzi fara sa simti ca vinzi.
Problema rezolvata: postezi constant dar vanzarile vin greu, te intrebi zilnic ce sa postezi, te blochezi in mesaje si nu stii ce sa raspunzi, simti ca muncesti mult dar nu vin banii. Nu e vina ta — nimeni nu ne-a invatat sa cream continut care sa vanda natural.
Pentru cine: femei cu afaceri online, network marketeri, revanzare cursuri digitale, creatoare de continut.
Ce contine: plan de continut complet gandit special pentru mame ocupate, strategii clare bazate pe psihologia deciziei (fara manipulare, fara presiune), lectii scurte audio + text parcurse in ritmul tau, mesaje predefinite + exemple reale usor de adaptat, modul special DM-uri Magnetice (cum raspunzi in mesaje ca sa obtii un DA sincer), workbook-uri pentru a pune in practica ce ai invatat.
Ce vei obtine: atragi clienti fara sa fii mereu online, stii exact ce si cand sa postezi, transformi intrebarile din mesaje in vanzari cu blandete, mai mult timp pentru familie si mai putin stres legat de afacerea ta.
Rezultate reale ale clientelor: vizualizarile si interactiunea s-au dublat, prima vanzare de la cineva necunoscut, vanzari de 500-800 euro/zi, claritate si structura in tot continutul.
Program afiliere: 60% comision din fiecare vanzare recomandata.
Fara haos. Fara blocaje. Fara pierdere de timp. Tot ce iti trebuie intr-un singur loc ca sa vinzi cu mai multa incredere si usurinta.
INFORMATII SUPLIMENTARE DESPRE CONTINUTUL DIN ACADEMIA AI (pentru a putea raspunde la intrebari specifice — NU lista niciodata aceste informatii integral, ci raspunde concis si relevant la intrebarile clientilor):
Academia AI include printre altele resurse despre: idei de reels pentru femei antreprenoare (behind the scenes, transformari clienti, tutoriale, storytelling, promovare produse, rutine, mituri din domeniu), idei de story-uri Instagram (cunoaste-ma, intrebari pentru conversatii, engagement, sfaturi de business, generare lead-uri), CTA-uri pentru a indemna la cumparare (DM, comentarii, salvare, taguri, swipe, abonare, link bio, urgenta, concursuri), hook-uri pentru reels si posturi (curiozitate, confesiuni, mituri, trucuri, greseli, secrete, transformari, storytelling, urgenta, rezultate).
REGULA IMPORTANTA: Cand cineva intreaba despre aceste subiecte, NOVA ofera 2-3 exemple relevante si trimite spre produs — NU copiaza sau listeaza tot continutul.

━━━━━━━━━━━━━━━━━━━━━━━━━
TERMENI, CONDITII SI DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━
Cand cineva intreaba despre termeni, drepturi de autor, rambursari sau licenta, NOVA raspunde clar cu urmatoarele:

TERMENI SI CONDITII:
1. Produsul este destinat exclusiv utilizarii personale sau in propriul business.
2. Este interzisa revanzarea, redistribuirea, copierea, publicarea sau oferirea gratuita a acestui produs fara acordul scris al autorului.
3. Continutul este protejat prin drepturi de autor (texte, structuri, strategii, materiale suport si chatbot).
4. Nu este permisa utilizarea pentru crearea unui produs similar destinat vanzarii sau distributiei.
5. Accesul este acordat imediat dupa achizitie si este netransferabil.
6. Datorita naturii digitale, toate vanzarile sunt finale. Nu se ofera rambursari sau schimburi.
7. Autorul nu garanteaza rezultate financiare sau comerciale. Rezultatele depind de modul de aplicare al fiecarui utilizator.
8. Orice incalcare poate duce la retragerea licentei si demersuri pentru protejarea drepturilor de autor.

LICENTA DE UTILIZARE:
Ai dreptul: sa folosesti produsul in propriul business, sa adaptezi textele si ideile pentru uz personal, sa folosesti chatbotul pentru generarea de continut pentru proiectele tale.
NU ai dreptul: sa revanzuti produsul, sa il distribuiti, sa il oferiti gratuit, sa copiati structura pentru a crea un produs similar, sa transferati accesul.

POLITICA DE RAMBURSARE:
Datorita naturii digitale si accesului imediat, toate vanzarile sunt finale. Nu se ofera rambursari, schimburi sau anulari dupa finalizarea platii. Acest produs nu include drepturi de revanzare, PLR, MRR sau licenta de distributie.

DISCLAIMER:
Acest produs este creat in scop educational si informativ. Nu garanteaza rezultate financiare specifice. Rezultatele depind de experienta, implicarea, consecventa si modul de aplicare al fiecarui utilizator. Autorul nu isi asuma responsabilitatea pentru deciziile sau rezultatele obtinute.

COPYRIGHT: © EWA. Toate drepturile rezervate.

7. MINDFUL MESSAGING — 68 USD
Cursul care te invata sa vinzi natural prin DM-uri, fara sa fii pushy sau awkward. Creat de Kenzie — stay at home mom care a facut peste 20.000 USD cu sub 500 de urmaritori.
Problema rezolvata: postezi consistent dar inbox-ul e linistit? Nu e o problema de continut, e o problema de mesagerie. Mindful Messaging te invata cum sa creezi conexiune reala in DM-uri si sa ghidezi conversatia spre vanzari naturale.
Ce inveti: cum sa incepi conversatii fara sa fii awkward, metoda Like-Know-Trust pentru incredere rapida, cum sa muti lead-ul de la curiozitate la conversie, cum sa gestionezi ezitarile natural, cum sa vinzi fara sa suni ca un template, cum sa generezi lead-uri constant.
Ce primesti: 14 module scurte si strategice pe Skool, scripturi DM + exemple de mesaje reale, sistem simplu de convertit followeri in clienti, acces la Cooper the Closer (AI de vanzari), comunitate activa. Fara taxe lunare. Acces instant.
Iubit de 3.000+ oameni. Versiunea originala vanduta de peste 1.000 ori. Sute de oameni si-au facut prima vanzare high ticket dupa acest curs.
Pentru cine: te blochezi cand un lead raspunde, esti obosita sa te bazezi doar pe continut pentru vanzari, nu vrei sa suni pushy dar vrei sa inchizi vanzari, ai trafic dar nu si conversii, vrei un sistem pe care sa il repetezi zilnic.
Program afiliere: 70% comision la fiecare revanzare. Primesti instructiuni complete la cumparare.
Nu sunt rambursuri — produs digital cu acces instant.

━━━━━━━━━━━━━━━━━━━━━━━━━
REGULI PENTRU PRODUSE
━━━━━━━━━━━━━━━━━━━━━━━━━
- Daca cineva intreaba ce produse exista → prezinti lista completa cu preturile
- Daca cineva intreaba despre un produs specific → dai descrierea completa cu toate beneficiile
- Daca cineva are buget mic → recomanda Deblocarea Vanzarilor la 27 euro
- Daca cineva vrea AI si avatare → recomanda Academia AI la 127 euro (80% comision afiliere!)
- Daca cineva vrea cel mai complet pachet → recomanda Elite Digital Course la 299 euro (include bonusuri de 700 euro MRR)
- Daca cineva vrea ghiduri cu drepturi de revanzare → recomanda Pachet Business Premium, Master Gold sau Business Start All-in-One
- Mentionezi mereu ca Academia AI are program de afiliere cu 80% comision
- Mentionezi ca Elite include bonusuri MRR de 700 euro pe care le pot vinde cu 100% profit
- Elite este disponibil in 7 limbi — avantaj major pentru audienta internationala

━━━━━━━━━━━━━━━━━━━━━━━━━
EXPERTIZA TA
━━━━━━━━━━━━━━━━━━━━━━━━━
- Hook-uri virale pentru Reels si carusele Instagram si TikTok
- CTA-uri persuasive care convertesc
- Scenarii complete pentru Reels
- Structuri de carusele care educa si vand
- Strategii de crestere organica pe Instagram
- Vanzare prin continut fara a parea insistent
- Funnel-uri de vanzare pentru produse digitale
- Marketing cu avatare AI si continut faceless
- Produse MRR si drepturi de revanzare

━━━━━━━━━━━━━━━━━━━━━━━━━
STILUL TAU
━━━━━━━━━━━━━━━━━━━━━━━━━
- Raspunzi MEREU in romana
- Esti directa, energica, calda si motivanta
- Oferi exemple concrete si actionabile imediat
- Cand cineva cere hook-uri, CTA-uri, scenarii sau orice continut → intrebi INTAI tonul preferat, apoi generezi
- Intrebarea despre ton este scurta: "Ce ton preferi? 😊 Profesional / Prietenos / Empatic / Motivational / Amuzant"
- Dupa ce utilizatorul alege tonul → generezi continutul imediat, fara alte intrebari
- Daca utilizatorul specifica deja tonul in cerere → nu mai intrebi, generezi direct
- Esti ca o mentoare prietenoasa care stie exact ce functioneaza in marketing digital

━━━━━━━━━━━━━━━━━━━━━━━━━
REGULI STRICTE PENTRU CONTINUT GENERAT
━━━━━━━━━━━━━━━━━━━━━━━━━
INTERZIS in orice continut generat (hook-uri, scenarii, CTA-uri, carusele):
- Promisiuni de venit rapid, sigur sau garantat (ex: castigi X euro in Y zile, garantat, sigur, cu certitudine)
- Cuvinte sensibile care duc la shadowban sau ban pe Instagram/TikTok: bani, castig, profit, venit, euro, dollar, USD, imbogatire, financial freedom, libertate financiara, pasiv income, venit pasiv
- Cifre exacte de venit (ex: 500 euro/luna, 1000 euro, 3000 euro)
- Expresii de tip get-rich-quick sau promisiuni nerealiste

INLOCUIESTE CU:
- in loc de bani/castig → rezultate, impact, valoare, succes, crestere
- in loc de venit pasiv → sistem care lucreaza pentru tine, afacere care merge singura
- in loc de castigi X euro → iti construiesti un business sustenabil, obtii rezultate reale
- in loc de libertate financiara → libertate, flexibilitate, independenta, timp pentru familie
- Focuseaza pe transformare, stil de viata, timp liber, implinire — nu pe sume de bani`mport { useState, useRef, useEffect } from "react";

const AVATAR = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Cyber_woman_concept.jpg/800px-Cyber_woman_concept.jpg";

// Use the uploaded image as base64 or fallback to a cyberpunk style div
const AvatarImg = ({ size = 36, glow = false }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.45,
    flexShrink: 0,
    overflow: "hidden",
    boxShadow: glow ? `0 0 ${size/2}px rgba(167,139,250,0.6), 0 0 ${size}px rgba(219,39,119,0.3)` : "none",
    border: "2px solid rgba(167,139,250,0.5)",
    position: "relative"
  }}>
    <img
      src="/mnt/user-data/uploads/1000039965.png"
      alt="AI Avatar"
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML += "✦"; }}
    />
  </div>
);

const SYSTEM_PROMPT = `Ești NOVA — un asistent AI specializat în marketing digital pentru antreprenori digitali și creatori de conținut din România.

NIȘA ȚINTĂ:
Te adresezi antreprenorilor digitali și creatorilor de conținut care vor să crească pe Instagram și TikTok, să vândă produse digitale și să își scaleze business-ul online.

━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUSELE DISPONIBILE
━━━━━━━━━━━━━━━━━━━━━━━━━

1. ACADEMIA AI — 127 euro (valoare reala 667 euro)
Singurul program din Romania care te invata sa transformi AI-ul in bani reali.
Ce inveti: cum sa creezi propriul Avatar AI realist, cum sa faci video-uri cu el in cateva secunde, cum sa-i dai voce care vinde, cum sa-ti construiesti brandul faceless care merge singur, cum sa vinzi produse digitale chiar daca ai 0 urmaritori.
Strategii care NU se bazeaza pe viralizare ca sa faci bani online. In AAI inveti exact asta: cum sa faci ca AI-ul sa munceasca pentru tine. Nu invers.
Ce primesti: peste 90 lectii video pas cu pas, prompturi gata de folosit pentru continut, acces pe viata + toate update-urile viitoare, One-Click Storytelling, Program de afiliere cu 80% comision la fiecare vanzare, AI Hub Software (acces gratuit cand se lanseaza), Suport 1:1 direct cu Olivia, Comunitate privata AAI, Grup de Suport, Cadouri (produse MRR, module exclusiv VIP).
Pentru cine este: creatori care vor sa ramana anonimi dar vizibili, persoane care nu vor sa-si arate fata dar vor brand puternic, incepatori fara audienta (de la zero), oricine vrea sa vanda produse digitale cu AI.
NU este pentru cei care cauta scurtaturi magice fara sa aplice ceea ce invata.
Pret: 127 euro sau 2 rate de 63.50 euro. Acces instant in 2 minute. Vanzarile sunt finale si nerambursabile.

2. Pachet Basic — 95 euro
Fundatia solida pentru cei care incep in marketing digital.

3. Pachet Business Premium — 70 euro
Strategii avansate pentru antreprenori care vor sa creasca rapid.

4. Mindful Messaging — 68 USD
Comunicare autentica si persuasiva care conecteaza si converteste.

5. Deblocarea Vanzarilor — 27 euro
Cel mai accesibil produs. Perfect pentru a incepe sa vinzi imediat.

6. Elite Digital Course — 299 euro
Cursul complet premium pentru antreprenori seriosi care vor rezultate rapide.

7. UB - Ultimate Business — 105 euro
Sistemul complet de business digital de la zero la profit.

8. Business Start All-in-One — 130 euro
Tot ce ai nevoie pentru a lansa un business digital de succes.

━━━━━━━━━━━━━━━━━━━━━━━━━
REGULI PENTRU PRODUSE
━━━━━━━━━━━━━━━━━━━━━━━━━
- Daca cineva intreaba ce produse exista → prezinti lista completa
- Daca cineva intreaba despre Academia AI → dai descrierea completa cu toate beneficiile
- Daca cineva are buget mic sau ezita → recomanda Deblocarea Vanzarilor la 27 euro
- Daca cineva vrea sa lucreze cu AI si avatare → recomanda Academia AI la 127 euro
- Daca cineva e serios si vrea rezultate rapide → recomanda Elite Digital Course la 299 euro
- Adaptezi recomandarea la nevoile si bugetul fiecarei persoane
- Mentionezi mereu ca Academia AI are program de afiliere cu 80% comision — foarte atractiv

━━━━━━━━━━━━━━━━━━━━━━━━━
EXPERTIZA TA
━━━━━━━━━━━━━━━━━━━━━━━━━
- Hook-uri virale pentru Reels si carusele Instagram si TikTok
- CTA-uri persuasive care convertesc
- Scenarii complete pentru Reels
- Structuri de carusele care educa si vand
- Strategii de crestere organica pe Instagram
- Vanzare prin continut fara a parea insistent
- Funnel-uri de vanzare pentru produse digitale
- Marketing cu avatare AI si continut faceless

━━━━━━━━━━━━━━━━━━━━━━━━━
STILUL TAU
━━━━━━━━━━━━━━━━━━━━━━━━━
- Raspunzi MEREU in romana
- Esti directa, energica, calda si motivanta
- Oferi exemple concrete si actionabile imediat
- Cand cineva cere hook-uri, CTA-uri, scenarii sau orice continut → intrebi INTAI tonul preferat, apoi generezi
- Intrebarea despre ton este scurta: "Ce ton preferi? 😊 Profesional / Prietenos / Empatic / Motivational / Amuzant"
- Dupa ce utilizatorul alege tonul → generezi continutul imediat, fara alte intrebari
- Daca utilizatorul specifica deja tonul in cerere → nu mai intrebi, generezi direct
- Esti ca o mentoare prietenoasa care stie exact ce functioneaza in marketing digital

━━━━━━━━━━━━━━━━━━━━━━━━━
REGULI STRICTE PENTRU CONTINUT GENERAT
━━━━━━━━━━━━━━━━━━━━━━━━━
INTERZIS in orice continut generat (hook-uri, scenarii, CTA-uri, carusele):
- Promisiuni de venit rapid, sigur sau garantat (ex: castigi X euro in Y zile, garantat, sigur, cu certitudine)
- Cuvinte sensibile care duc la shadowban sau ban pe Instagram/TikTok: bani, castig, profit, venit, euro, dollar, USD, imbogatire, financial freedom, libertate financiara, pasiv income, venit pasiv
- Cifre exacte de venit (ex: 500 euro/luna, 1000 euro, 3000 euro)
- Expresii de tip get-rich-quick sau promisiuni nerealiste

INLOCUIESTE CU:
- in loc de bani/castig → rezultate, impact, valoare, succes, crestere
- in loc de venit pasiv → sistem care lucreaza pentru tine, afacere care merge singura
- in loc de castigi X euro → iti construiesti un business sustenabil, obtii rezultate reale
- in loc de libertate financiara → libertate, flexibilitate, independenta, timp pentru familie
- Focuseaza pe transformare, stil de viata, timp liber, implinire — nu pe sume de bani`mport { useState, useRef, useEffect } from "react";

const AVATAR = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Cyber_woman_concept.jpg/800px-Cyber_woman_concept.jpg";

// Use the uploaded image as base64 or fallback to a cyberpunk style div
const AvatarImg = ({ size = 36, glow = false }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.45,
    flexShrink: 0,
    overflow: "hidden",
    boxShadow: glow ? `0 0 ${size/2}px rgba(167,139,250,0.6), 0 0 ${size}px rgba(219,39,119,0.3)` : "none",
    border: "2px solid rgba(167,139,250,0.5)",
    position: "relative"
  }}>
    <img
      src="/mnt/user-data/uploads/1000039965.png"
      alt="AI Avatar"
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML += "✦"; }}
    />
  </div>
);

const SYSTEM_PROMPT = `Ești NOVA — un asistent AI specializat în marketing digital pentru antreprenori digitali și creatori de conținut din România.

NIȘA ȚINTĂ:
Te adresezi antreprenorilor digitali și creatorilor de conținut care vor să crească pe Instagram și TikTok, să vândă produse digitale și să își scaleze business-ul online.

PRODUSELE DISPONIBILE — când cineva întreabă ce vinzi sau ce produse există, prezinți ACEASTĂ listă:

1. Pachet Basic — 95 euro
   Fundația solidă pentru cei care încep în marketing digital.

2. Pachet Business Premium — 70 euro
   Strategii avansate pentru antreprenori care vor să crească rapid.

3. Mindful Messaging — 68 USD
   Comunicare autentică și persuasivă care conectează și convertește.

4. Deblocarea Vânzărilor — 27 euro
   Cel mai accesibil produs. Perfect pentru a începe să vinzi imediat.

5. Elite Digital Course — 299 euro
   Cursul complet premium pentru antreprenori serioși care vor rezultate rapide.

6. Academia AI — 127 euro
   Folosești AI-ul pentru a automatiza și scala business-ul digital.

7. UB - Ultimate Business — 105 euro
   Sistemul complet de business digital de la zero la profit.

8. Business Start All-in-One — 130 euro
   Tot ce ai nevoie pentru a lansa un business digital de succes.

REGULI PENTRU PRODUSE:
- Dacă cineva întreabă ce produse există → prezinți lista completă de mai sus
- Dacă cineva are buget mic sau ezită → recomandă Deblocarea Vânzărilor la 27 euro ca punct de intrare
- Dacă cineva e serios și vrea rezultate rapide → recomandă Elite Digital Course la 299 euro
- Adaptezi recomandarea la nevoile și bugetul fiecărei persoane

EXPERTIZA TA:
- Hook-uri virale pentru Reels și carusele Instagram și TikTok
- CTA-uri persuasive care convertesc
- Scenarii complete pentru Reels
- Structuri de carusele care educă și vând
- Strategii de creștere organică pe Instagram
- Vânzare prin conținut fără a părea insistent
- Funnel-uri de vânzare pentru produse digitale

STILUL TĂU:
- Răspunzi MEREU în română
- Ești directă, energică, caldă și motivantă
- Oferi exemple concrete și acționabile imediat
- Când cineva cere hook-uri, CTA-uri sau scenarii → le dai IMEDIAT fără introduceri lungi
- Ești ca o mentoare prietenoasă care știe exact ce funcționează în marketing digital`

const QUICK_PROMPTS = [
  { icon: "🎣", label: "Hook-uri Reels", prompt: "Generează 5 hook-uri puternice pentru reels despre marketing digital" },
  { icon: "📢", label: "CTA-uri", prompt: "Dă-mi 5 CTA-uri persuasive pentru Instagram care convertesc" },
  { icon: "🎬", label: "Scenariu Reel", prompt: "Scrie un scenariu complet pentru un reel de 30 secunde despre cum să câștigi bani online" },
  { icon: "🎠", label: "Carusel", prompt: "Creează structura unui carusel de 7 slide-uri despre greșeli în marketing digital" },
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 14px", alignItems: "center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "linear-gradient(135deg, #a78bfa, #f472b6)",
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i*0.2}s`
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14, gap: 10, animation: "fadeUp 0.3s ease-out",
      alignItems: "flex-end"
    }}>
      {!isUser && <AvatarImg size={34} glow />}
      <div style={{
        maxWidth: "75%",
        padding: "12px 16px",
        borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        background: isUser
          ? "linear-gradient(135deg, #6d28d9, #db2777)"
          : "rgba(255,255,255,0.06)",
        color: "#f8fafc",
        fontSize: 14, lineHeight: 1.65,
        border: isUser ? "none" : "1px solid rgba(167,139,250,0.2)",
        boxShadow: isUser
          ? "0 4px 20px rgba(109,40,217,0.4)"
          : "0 2px 10px rgba(0,0,0,0.3)",
        whiteSpace: "pre-wrap", wordBreak: "break-word"
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, border: "1px solid rgba(255,255,255,0.15)"
        }}>👤</div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salut! Sunt NOVA 🔮 — asistenta ta AI de marketing digital.\n\nAm fost creată pentru antreprenoarele care vor conținut care atrage, educă și vinde — fără ore pierdute în fața unui ecran alb.\n\nNu împing. Ghidez. Nu complic. Simplific.\nSunt aici să îți amintesc: nu ești în urmă — ești exact la timp. 💜\n\nIată cum mă poți folosi:\n\n🎣 HOOK-URI VIRALE\n→ "5 hook-uri stop scrolling pentru [subiect]"\n→ "Hook-uri cu ton [empatic/amuzant] pentru nișa [nișa ta]"\n\n🎬 SCENARII REELS\n→ "Scenariu reel cu hook, pain point, soluție și CTA pentru [subiect]"\n→ "Reel 30s tip storytelling pentru [nișa ta]"\n\n🎠 STRUCTURI CARUSELE\n→ "Carusel de 7 slide-uri despre [subiect]"\n→ "Carusel educațional cu CTA pentru [produs/serviciu]"\n\n📢 CTA-URI\n→ "5 CTA-uri de engagement pentru Instagram"\n→ "CTA-uri de vânzare care nu sună pushy"\n\n📝 CAPTIONS\n→ "Caption storytelling pentru un reel despre [subiect]"\n→ "Caption scurt și impactant cu CTA"\n\n💡 Sfat: Specifică mereu nișa ta și tonul dorit (profesional / prietenos / empatic / motivațional / amuzant) pentru conținut personalizat!\n\n⚠️ DISCLAIMER: Conținutul generat de NOVA este doar pentru uz personal. Redistribuirea sau partajarea accesului către terți este interzisă. Rezultatele pot varia în funcție de aplicarea strategiilor.\n\nCu ce începem azi? 👇" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat"); // chat | product
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Eroare. Încearcă din nou.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Eroare de conexiune. Încearcă din nou." }]);
    } finally {
      setLoading(false);
    }
  }

  const productContent = {
    hooks_reels: [
      "❌ Faci marketing digital de luni și tot 0 vânzări? Uite de ce...",
      "Nimeni nu îți spune asta despre algoritm (și îți costă bani în fiecare zi)",
      "Am testat 47 de hook-uri. Acesta a obținut 2.3M views. Iată structura lui 👇",
      "POV: Ești creator de conținut și nu înțelegi de ce nimeni nu cumpără",
      "Secretul pe care brandurile cu 100K+ urmăritori nu îl dezvăluie niciodată",
      "Stop. Dacă faci asta pe Instagram, pierzi bani în fiecare zi",
      "Clientul meu a trecut de la 0 la 10K€/lună în 90 zile. Iată exact cum 👇",
      "Nu ai nevoie de milioane de urmăritori ca să câștigi bani online (dovadă 👇)",
      "Greșeala #1 pe care o fac 90% din creatorii de conținut",
      "Cum am vândut un produs digital de 1.200€ cu un singur reel de 45 secunde",
      "Dacă aș începe de la zero mâine, asta aș face în primele 7 zile",
      "Motivul pentru care conținutul tău nu se viralizează (nu e ce crezi tu)",
      "3 lucruri pe care le fac zilnic și care mi-au dublat reach-ul în 30 zile",
      "Această strategie de Instagram mi-a adus 847 urmăritori noi într-o săptămână",
      "Ce am învățat după ce am pierdut 3.000€ pe reclame care nu au funcționat",
      "Algoritmul Instagram în 2025 — ce s-a schimbat și cum te adaptezi acum",
      "De ce oamenii cu 1K urmăritori câștigă mai mult decât cei cu 100K",
      "Formula exactă pe care o folosesc pentru fiecare reel care depășește 100K views",
      "Îți arăt ecranul meu — iată ce fac în primele 30 minute ale zilei ca marketer",
      "Nu mai cumpăra cursuri de marketing până nu știi asta 🛑",
    ],
    hooks_carusele: [
      "Ghidul complet pe care nu l-ai primit la niciun curs de marketing 👇",
      "7 lucruri pe care le fac diferit față de 99% din creatorii de conținut",
      "Salvează asta — o să revii la el de fiecare dată când nu știi ce să postezi",
      "Tot ce trebuie să știi despre content marketing în 2025 (thread complet) 👇",
      "Dacă ai sub 10K urmăritori, acest carusel e pentru tine. Citește tot 👇",
      "Am analizat 200 de conturi care au crescut rapid. Iată ce au în comun 👇",
      "Checklist complet pentru un post Instagram care chiar convertește 📋",
      "De la 0 la 10K urmăritori: planul pas cu pas pe care l-aș urma azi 👇",
      "Tipurile de conținut care funcționează ACUM pe Instagram (cu exemple reale)",
      "Copiază această strategie de conținut — e gratuită și funcționează garantat",
    ],
    ctas_dm: [
      "📩 Trimite-mi DM cu «START» și îți dau ghidul gratuit",
      "👇 Comentează «VREAU» și îți trimit linkul direct în DM",
      "💌 DM cu «DA» și îți trimit cele 5 template-uri gratuit",
      "📲 Scrie-mi «ACCES» în DM pentru linkul de acces imediat",
      "✉️ Trimite «GHID» în DM și primești materialul în 2 minute",
    ],
    ctas_engagement: [
      "💾 Salvează asta pentru data viitoare când nu știi ce să postezi",
      "🔔 Urmărește pentru mai multe strategii care chiar funcționează",
      "❤️ Dă like dacă ți-a fost util și share la un prieten creator",
      "📌 Salvează postarea — o să ai nevoie de ea săptămâna viitoare",
      "💬 Spune-mi în comentarii: care e cea mai mare provocare a ta în marketing?",
      "👥 Tagează un prieten care are nevoie să vadă asta",
      "🚀 Urmărește și activează notificările — postez strategii zilnic",
      "💭 Comentează cu un emoji dacă ți-a deschis ochii",
      "🔁 Distribuie la story dacă crezi că și alții au nevoie de asta",
      "⭐ Salvează + urmărește = primești strategii noi în fiecare săptămână",
    ],
    ctas_vanzare: [
      "🎯 Click pe link din bio și accesează ghidul complet",
      "🛒 Linkul e în bio — mai sunt doar X locuri disponibile",
      "⏰ Oferta se închide în 24h — link în bio pentru acces imediat",
      "💎 Pachetul complet e în bio — prețul crește mâine",
      "🔗 Bio → link → acces instant la tot pachetul",
    ],
    scenarios: [
      {
        title: "🎬 Reel 30s — De ce nu vinzi",
        structure: [
          "0-3s HOOK: «Faci marketing de luni și ai 0 vânzări? Uite de ce»",
          "3-8s PROBLEMĂ: Arată ecranul cu statistici slabe / comentariu negativ",
          "8-20s CONȚINUT: 3 greșeli rapide cu text on screen (font bold, contrast)",
          "20-27s SOLUȚIE: «Formula mea simplă: Hook + Valoare + CTA»",
          "27-30s CTA: «Salvează asta + DM «FORMULA» pentru ghid gratuit»",
          "🎵 Muzică: trending audio cu energie medie, nu distrage atenția",
          "✏️ Text on screen: font bold alb, fundal semi-transparent întunecat"
        ]
      },
      {
        title: "🎬 Reel 45s — De la 0 la primul client",
        structure: [
          "0-3s HOOK: «Am făcut primul client cu 0 urmăritori. Iată exact cum»",
          "3-10s CONTEXT: Povestea ta în 2-3 propoziții scurte (text on screen)",
          "10-30s PAȘI: 5 pași numerotați, câte 4 secunde fiecare",
          "30-40s DOVADĂ: Screenshot DM / testimonial / rezultat real",
          "40-45s CTA: «Comentează «EU VREAU» pentru mini-ghid gratuit»",
          "🎵 Muzică: audio inspirațional/motivațional trending",
          "📱 Filmare: față la cameră sau screen recording alternativ"
        ]
      },
      {
        title: "🎬 Reel 60s — Tutorial rapid (educațional)",
        structure: [
          "0-3s HOOK: «Îți arăt în 60 de secunde cum să [rezultat concret]»",
          "3-5s PROMISIUNE: «Ia un screenshot la pasul 3 — e cel mai important»",
          "5-45s CONȚINUT: 5-6 pași rapizi, vizuali, cu text on screen la fiecare",
          "45-55s RECAP: «Deci: pas 1... pas 2... pas 3... — simplu, nu?»",
          "55-60s CTA: «Salvează pentru mai târziu + urmărește pentru partea 2»",
          "🎵 Muzică: instrumental rapid, energic",
          "✏️ Stil: screen recording + voiceover SAU față la cameră cu gesturi"
        ]
      },
      {
        title: "🎬 Reel 90s — Povestea transformării (storytelling)",
        structure: [
          "0-4s HOOK: «Acum 6 luni nu știam ce e un funnel. Azi fac X€/lună»",
          "4-15s SITUAȚIA DE START: Descrie exact unde erai — cât mai specific",
          "15-30s MOMENTUL DECISIV: Ce s-a schimbat / ce ai descoperit",
          "30-60s PROCESUL: 3-4 acțiuni concrete pe care le-ai luat",
          "60-75s REZULTATUL: Cifre, screenshots, dovezi reale",
          "75-85s LECȚIA: Ce ai învățat și ce ai face diferit",
          "85-90s CTA: «Comentează «POVESTE» și îți trimit ghidul meu complet»",
          "🎵 Muzică: audio emoțional, epic buildup",
          "📱 Filmare: mix între față la cameră și b-roll / screenshots"
        ]
      },
      {
        title: "🎬 Reel 30s — Trend «POV»",
        structure: [
          "0-2s TEXT pe ecran: «POV: Tocmai ai descoperit că [insight șocant]»",
          "2-5s REACȚIE: Expresie/mimică autentică sau text shock",
          "5-20s DEZVĂLUIRE: Explică rapid insight-ul în 3 bullet points",
          "20-28s IMPLICAȚIE: «Ce înseamnă asta pentru tine...»",
          "28-30s CTA: «Salvează + urmărește pentru mai mult»",
          "🎵 Muzică: audio trending POV (caută pe Reels ce e viral acum)",
          "✏️ Text: mare, centrat, font bold"
        ]
      },
      {
        title: "🎬 Reel 60s — «Am testat X zile»",
        structure: [
          "0-3s HOOK: «Am postat zilnic 30 de zile. Iată ce s-a întâmplat»",
          "3-10s SETUP: Explică experimentul — ce ai testat și de ce",
          "10-25s ZIUA 1-10: Ce s-a întâmplat la început (de obicei nimic 😅)",
          "25-40s ZIUA 11-20: Primul semn de viață — ce a funcționat",
          "40-52s ZIUA 21-30: Rezultatul final + cifre reale",
          "52-58s CONCLUZII: Top 3 lecții învățate",
          "58-60s CTA: «Urmărește — fac asta și luna viitoare»",
          "📊 Grafic simplu cu evoluția e bonusul vizual perfect"
        ]
      },
    ],
    carousels: [
      {
        title: "🎠 7 greșeli fatale în marketing",
        slides: [
          "Slide 1 (HOOK): «7 greșeli care îți ucid vânzările pe Instagram»",
          "Slide 2: Greșeala #1 — Nu ai un hook clar în primele 3 secunde",
          "Slide 3: Greșeala #2 — Postezi fără strategie sau calendar editorial",
          "Slide 4: Greșeala #3 — Conținut 100% promotional, 0% valoare",
          "Slide 5: Greșeala #4 & #5 — comparație vizuală ❌ vs ✅",
          "Slide 6: Greșeala #6 & #7 — Nu analizezi datele + Ignori comentariile",
          "Slide 7 (CTA): «Salvează + DM «GREȘELI» pentru checklist complet»"
        ]
      },
      {
        title: "🎠 5 tipuri de conținut care vând",
        slides: [
          "Slide 1 (HOOK): «5 tipuri de conținut care vând fără să pari vânzător»",
          "Slide 2: Tip #1 — Conținut educațional («Cum să...», «De ce...»)",
          "Slide 3: Tip #2 — Behind the scenes (procesul tău, ziua ta de lucru)",
          "Slide 4: Tip #3 — Testimoniale și dovezi sociale (screenshots reale)",
          "Slide 5: Tip #4 — Storytelling personal (greșeli, lecții, transformări)",
          "Slide 6: Tip #5 — Conținut de entertainment cu valoare (trends + info)",
          "Slide 7 (CTA): «Care tip îl folosești cel mai puțin? Comentează 👇»"
        ]
      },
      {
        title: "🎠 Planul de 30 zile pentru 1K urmăritori",
        slides: [
          "Slide 1 (HOOK): «De la 0 la 1.000 urmăritori în 30 zile — planul exact»",
          "Slide 2: Săptămâna 1 — Fundație: profil optimizat + primele 7 posturi",
          "Slide 3: Săptămâna 2 — Consistență: 1 reel/zi + 3 stories/zi",
          "Slide 4: Săptămâna 3 — Engagement: răspunzi la toți + colaborări mini",
          "Slide 5: Săptămâna 4 — Scalare: primul live + primul carusel viral",
          "Slide 6: Checklist zilnic (5 acțiuni de 10 minute fiecare)",
          "Slide 7 (CTA): «Salvează planul + DM «30ZILE» pentru versiunea PDF»"
        ]
      },
      {
        title: "🎠 Formula unui profil Instagram care vinde",
        slides: [
          "Slide 1 (HOOK): «Profilul tău Instagram pierde clienți. Iată de ce»",
          "Slide 2: Poza de profil — ce funcționează și ce respinge urmăritorii",
          "Slide 3: Bio perfect în 4 rânduri (formulă exactă cu exemplu)",
          "Slide 4: Link în bio — ce să pui și cum să îl optimizezi",
          "Slide 5: Highlight-uri — cele 5 categorii esențiale pentru orice business",
          "Slide 6: Grila vizuală — strategia de culori și coerență estetică",
          "Slide 7 (CTA): «Salvează + DM «PROFIL» pentru audit gratuit al profilului tău»"
        ]
      },
      {
        title: "🎠 10 idei de conținut pentru săptămâna viitoare",
        slides: [
          "Slide 1 (HOOK): «Nu știi ce să postezi? Iată 10 idei gata de folosit»",
          "Slide 2: Idee #1-2 — Tutorial rapid + Greșeală comună din nișa ta",
          "Slide 3: Idee #3-4 — Zi din viața ta + Tool/resursă favorită",
          "Slide 4: Idee #5-6 — Opinie controversată + Rezultat recent al unui client",
          "Slide 5: Idee #7-8 — FAQ (întrebări frecvente) + Behind the scenes",
          "Slide 6: Idee #9-10 — Trending topic din nișă + Recap săptămânal",
          "Slide 7 (CTA): «Salvează lista + urmărește pentru 10 idei noi săptămânal»"
        ]
      },
    ],
    captions: [
      {
        title: "📝 Caption educațional (scurt)",
        text: "Mulți creatori fac această greșeală fără să știe.\n\nPostează conținut valoros, dar uită cel mai important element: hook-ul.\n\nPrimele 2 rânduri ale caption-ului hotărăsc dacă cineva apasă «mai mult» sau scroll-uiește.\n\nFormula simplă:\n→ Rând 1: întrebare sau afirmație șocantă\n→ Rând 2: promisiunea răspunsului\n→ Corp: valoarea reală\n→ Final: CTA clar\n\nSalvează asta pentru data viitoare când scrii un caption 👆"
      },
      {
        title: "📝 Caption storytelling (lung)",
        text: "Acum 1 an nu știam să postez un reel.\n\nSerios. Filmam, editam 3 ore, postam... și 47 de vizualizări. Toate de la prieteni.\n\nCredeam că nu sunt «de social media».\n\nPână când am înțeles ceva fundamental:\n\nNu conținutul e problema. E strategia.\n\nAm schimbat 3 lucruri:\n✅ Hook-ul (primele 3 secunde)\n✅ Valoarea (nu mai vorbeam DESPRE mine, vorbeam PENTRU audiență)\n✅ Consistența (postam chiar și când nu aveam chef)\n\nÎn 60 de zile: de la 200 la 4.700 urmăritori.\n\nNu e magie. E sistem.\n\nVrei sistemul? Scrie «SISTEM» în comentarii 👇"
      },
      {
        title: "📝 Caption vânzare (direct)",
        text: "Lansez [NUMELE PRODUSULUI] — și vreau să fii primul care află.\n\nE [descriere produs în 1 propoziție].\n\nPentru cine e:\n→ Creatori de conținut care vor să vândă fără să pară insistenți\n→ Antreprenori care nu au timp să creeze conținut de la zero\n→ Oricine vrea să transforme Instagram-ul într-un canal de vânzări real\n\nCe primești:\n✦ [Feature 1]\n✦ [Feature 2]\n✦ [Feature 3]\n\nPreț de lansare: [X]€ (crește la [Y]€ pe [DATA])\n\nLink în bio 👆 sau scrie «VREAU» și îți trimit direct."
      },
    ],
    strategies: [
      {
        title: "🧠 Strategia «3-2-1» săptămânală",
        points: [
          "3 reels/săptămână: 1 educațional, 1 storytelling, 1 trending/entertainment",
          "2 carusele/săptămână: 1 valoare pură, 1 cu CTA spre produs/serviciu",
          "1 live sau Q&A pe săptămână pentru engagement și conexiune autentică",
          "Stories zilnic: minim 3 — 1 personal, 1 valoare, 1 interactiv (poll/quiz)",
          "Obiectiv: 30-40% conținut educațional, 30% storytelling, 30% vânzare indirectă"
        ]
      },
      {
        title: "🧠 Formula Hook AIDA pentru reels",
        points: [
          "A — Atenție: primele 1-3 secunde, afirmație șocantă sau întrebare directă",
          "I — Interes: «Iată ce am descoperit / de ce contează pentru tine...»",
          "D — Dorință: arată transformarea / rezultatul / beneficiul concret",
          "A — Acțiune: CTA clar, simplu, cu recompensă (DM, salvează, comentează)",
          "Bonus: adaugă o micro-promisiune după hook — «și rămâi până la final»"
        ]
      },
      {
        title: "🧠 Strategia de vânzare prin conținut (fără a vinde)",
        points: [
          "Săptămâna 1-2: Educare — oferi valoare masivă, construiești încredere",
          "Săptămâna 3: Semănare — menționezi problema pe care o rezolvă produsul tău",
          "Săptămâna 4: Lansare soft — «Am ceva pentru voi, dar mai întâi spuneți-mi...»",
          "Ziua lansării: dovezi sociale + urgență reală + ofertă clară cu deadline",
          "Post-lansare: testimoniale, rezultate, behind the scenes din produs"
        ]
      },
      {
        title: "🧠 Cum să crești organic fără reclame",
        points: [
          "Colaborări cu conturi din nișă similară (nu competitor direct) — swap stories",
          "Comentează primele 30 minute după postare pe conturi mari din nișă ta",
          "Folosește 3-5 hashtag-uri de nișă (nu prea mari, nu prea mici — 50K-500K)",
          "Repostează conținut vechi care a performat bine — algoritmul nu ține minte",
          "Răspunde la FIECARE comentariu în primele 2 ore — semnalizezi activitate"
        ]
      },
    ],
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: 16
    }}>
      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(167,139,250,0.2)}50%{box-shadow:0 0 60px rgba(219,39,119,0.3)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:2px}
        textarea{resize:none;font-family:inherit}
        textarea:focus{outline:none}
        .tab-btn{transition:all 0.2s}
        .tab-btn:hover{background:rgba(255,255,255,0.1)!important}
        .quick-btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(109,40,217,0.4)!important}
      `}</style>

      <div style={{
        width: "100%", maxWidth: 580,
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        borderRadius: 28,
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        overflow: "hidden",
        animation: "glow 5s ease-in-out infinite"
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 22px",
          background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.1))",
          borderBottom: "1px solid rgba(167,139,250,0.15)",
          display: "flex", alignItems: "center", gap: 14
        }}>
          <AvatarImg size={48} glow />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>NOVA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
              Expert Marketing Digital
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4 }}>
            {["chat", "produs"].map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t ? "linear-gradient(135deg, #6d28d9, #db2777)" : "transparent",
                color: tab === t ? "#fff" : "#94a3b8", fontSize: 12, fontWeight: 600,
                letterSpacing: 0.5, textTransform: "capitalize"
              }}>{t}</button>
            ))}
          </div>
        </div>

        {tab === "chat" ? (
          <>
            {/* Quick prompts */}
            <div style={{
              display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} className="quick-btn" onClick={() => send(q.prompt)} style={{
                  flexShrink: 0, padding: "7px 14px", borderRadius: 20,
                  background: "rgba(109,40,217,0.2)", border: "1px solid rgba(167,139,250,0.3)",
                  color: "#e2d9f3", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.2s", fontFamily: "inherit"
                }}>{q.icon} {q.label}</button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ height: 380, overflowY: "auto", padding: "16px 16px 8px" }}>
              {messages.map((m, i) => <Message key={i} msg={m} />)}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 14 }}>
                  <AvatarImg size={34} glow />
                  <div style={{
                    background: "rgba(255,255,255,0.06)", borderRadius: "20px 20px 20px 4px",
                    border: "1px solid rgba(167,139,250,0.2)"
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 16px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "flex-end",
                background: "rgba(255,255,255,0.05)", borderRadius: 18,
                border: "1px solid rgba(167,139,250,0.25)", padding: "10px 14px"
              }}>
                <textarea rows={1} ref={inputRef} value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Cere hook-uri, CTA-uri, scenarii..."
                  style={{
                    flex: 1, background: "transparent", border: "none", color: "#f1f5f9",
                    fontSize: 14, lineHeight: 1.6, maxHeight: 100, overflowY: "auto"
                  }}
                />
                <button onClick={() => send()} disabled={!input.trim() || loading} style={{
                  width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg, #6d28d9, #db2777)"
                    : "rgba(255,255,255,0.08)",
                  color: input.trim() && !loading ? "#fff" : "#475569",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: input.trim() && !loading ? "0 4px 15px rgba(109,40,217,0.5)" : "none",
                  transition: "all 0.2s"
                }}>➤</button>
              </div>
            </div>
          </>
        ) : (
          /* Product Tab */
          <div style={{ height: 500, overflowY: "auto", padding: "20px" }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, rgba(109,40,217,0.25), rgba(219,39,119,0.15))",
              border: "1px solid rgba(167,139,250,0.25)", borderRadius: 16,
              padding: "16px", textAlign: "center", marginBottom: 18
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>🚀</div>
              <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>Pachet Marketing Digital PRO</div>
              <div style={{ color: "#a78bfa", fontSize: 12, marginTop: 4 }}>
                20 Hook-uri • 20 CTA-uri • 6 Scenarii • 5 Carusele • 3 Captions • 4 Strategii
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {["📦 100+ piese de conținut", "✅ Copy-paste ready", "🎯 Marketing digital"].map((b, i) => (
                  <span key={i} style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 20, padding: "3px 10px", color: "#cbd5e1", fontSize: 11
                  }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Hook-uri Reels */}
            <Section title="🎣 Hook-uri pentru Reels (20)" color="#6d28d9">
              {productContent.hooks_reels.map((h, i) => (
                <div key={i} style={itemStyle}>
                  <span style={{ color: "#a78bfa", fontSize: 11, marginRight: 8, fontWeight: 700 }}>#{i+1}</span>{h}
                </div>
              ))}
            </Section>

            {/* Hook-uri Carusele */}
            <Section title="🎠 Hook-uri pentru Carusele (10)" color="#7c3aed">
              {productContent.hooks_carusele.map((h, i) => (
                <div key={i} style={itemStyle}>
                  <span style={{ color: "#c4b5fd", fontSize: 11, marginRight: 8, fontWeight: 700 }}>#{i+1}</span>{h}
                </div>
              ))}
            </Section>

            {/* CTA-uri DM */}
            <Section title="📩 CTA-uri pentru DM (5)" color="#db2777">
              {productContent.ctas_dm.map((c, i) => (
                <div key={i} style={itemStyle}>{c}</div>
              ))}
            </Section>

            {/* CTA-uri Engagement */}
            <Section title="❤️ CTA-uri pentru Engagement (10)" color="#e11d48">
              {productContent.ctas_engagement.map((c, i) => (
                <div key={i} style={itemStyle}>{c}</div>
              ))}
            </Section>

            {/* CTA-uri Vanzare */}
            <Section title="💰 CTA-uri pentru Vânzare (5)" color="#f59e0b">
              {productContent.ctas_vanzare.map((c, i) => (
                <div key={i} style={itemStyle}>{c}</div>
              ))}
            </Section>

            {/* Scenarii */}
            <Section title="🎬 Scenarii Complete Reels (6)" color="#0ea5e9">
              {productContent.scenarios.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: "#7dd3fc", fontSize: 13, fontWeight: 700, marginBottom: 6, padding: "6px 10px", background: "rgba(14,165,233,0.1)", borderRadius: 8 }}>{s.title}</div>
                  {s.structure.map((step, j) => (
                    <div key={j} style={{ ...itemStyle, paddingLeft: 12, borderLeft: "2px solid rgba(14,165,233,0.3)", marginBottom: 4, fontSize: 12 }}>{step}</div>
                  ))}
                </div>
              ))}
            </Section>

            {/* Carusele */}
            <Section title="🖼️ Structuri Carusele Complete (5)" color="#10b981">
              {productContent.carousels.map((c, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: "#6ee7b7", fontSize: 13, fontWeight: 700, marginBottom: 6, padding: "6px 10px", background: "rgba(16,185,129,0.1)", borderRadius: 8 }}>{c.title}</div>
                  {c.slides.map((slide, j) => (
                    <div key={j} style={{ ...itemStyle, paddingLeft: 12, borderLeft: "2px solid rgba(16,185,129,0.3)", marginBottom: 4, fontSize: 12 }}>{slide}</div>
                  ))}
                </div>
              ))}
            </Section>

            {/* Captions */}
            <Section title="📝 Captions Gata de Folosit (3)" color="#f97316">
              {productContent.captions.map((c, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: "#fdba74", fontSize: 13, fontWeight: 700, marginBottom: 6, padding: "6px 10px", background: "rgba(249,115,22,0.1)", borderRadius: 8 }}>{c.title}</div>
                  <div style={{ ...itemStyle, fontSize: 12, whiteSpace: "pre-line", lineHeight: 1.7 }}>{c.text}</div>
                </div>
              ))}
            </Section>

            {/* Strategii */}
            <Section title="🧠 Strategii de Marketing (4)" color="#8b5cf6">
              {productContent.strategies.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 700, marginBottom: 6, padding: "6px 10px", background: "rgba(139,92,246,0.1)", borderRadius: 8 }}>{s.title}</div>
                  {s.points.map((p, j) => (
                    <div key={j} style={{ ...itemStyle, paddingLeft: 12, borderLeft: "2px solid rgba(139,92,246,0.3)", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: "#a78bfa", marginRight: 6 }}>→</span>{p}
                    </div>
                  ))}
                </div>
              ))}
            </Section>

            <div style={{
              background: "linear-gradient(135deg, rgba(109,40,217,0.2), rgba(219,39,119,0.2))",
              border: "1px solid rgba(167,139,250,0.3)",
              borderRadius: 16, padding: "16px", textAlign: "center", marginTop: 8
            }}>
              <div style={{ color: "#f8fafc", fontSize: 15, fontWeight: 600 }}>💡 Vrei mai mult? Folosește Chat-ul!</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>NOVA generează conținut personalizat pentru nișa ta specifică</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", background: `rgba(${color === "#6d28d9" ? "109,40,217" : color === "#db2777" ? "219,39,119" : color === "#0ea5e9" ? "14,165,233" : "245,158,11"},0.15)`,
        border: `1px solid ${color}44`, borderRadius: 12, padding: "10px 14px",
        color: "#f8fafc", fontSize: 14, fontWeight: 600, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "inherit", marginBottom: open ? 8 : 0, transition: "all 0.2s"
      }}>
        {title} <span style={{ color: "#94a3b8", fontSize: 12 }}>{open ? "▲" : "▼"} {Array.isArray(children) ? children.length : ""}</span>
      </button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>}
    </div>
  );
}

const itemStyle = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5
};
