window.MIW=window.MIW||{};
MIW.OncoKnowledge=(function(){
 const entries=[];

 function add(domain,name,category,subgroup,mechanism,meaning,high,low,normal,aliases=[]){
   entries.push({domain,name,category,subgroup,mechanism,meaning,high,low,normal,aliases});
 }

 function addDrug(name,category,subgroup,mechanism,aliases=[]){
   const wording={
     "Chemotherapy":{
       meaning:"ยาเคมีบำบัดหรือ cytotoxic therapy ผลจาก Onconomics เป็นผลความไวเชิง functional ของเซลล์ ไม่ใช่คำสั่งรักษาและไม่แทนขนาดยาทางคลินิก",
       high:"ผล HIGH/EFFECTIVE สนับสนุนว่าตัวอย่างมีความไวต่อยานี้มากกว่าในแบบทดสอบ",
       low:"ผล LOW/NOT EFFECTIVE หมายถึงสัญญาณความไวต่ำหรือไม่ตอบสนองในแบบทดสอบ",
       normal:"ไม่มีค่าปกติแบบแล็บ ใช้ระดับ HIGH / SUPPORTED / LOW / NOT EFFECTIVE"
     },
     "Targeted therapy":{
       meaning:"ยามุ่งเป้าที่ออกฤทธิ์ต่อ receptor, kinase หรือ pathway เฉพาะ ต้องตีความร่วมกับ biomarker มาตรฐาน ชนิดมะเร็ง และข้อบ่งใช้ของยา",
       high:"ผลสูงสนับสนุนความไวเชิง functional แต่ไม่แทน genomic eligibility หรือข้อบ่งใช้มาตรฐาน",
       low:"ผลต่ำลดน้ำหนักการเลือกยาในรายงานนี้ แต่ไม่ใช่ข้อห้ามเด็ดขาด",
       normal:"ไม่มีค่าปกติแบบแล็บ"
     },
     "Immunotherapy":{
       meaning:"ยาที่ปรับหรือกระตุ้นภูมิคุ้มกันต้านมะเร็ง ต้องตีความร่วมกับ PD-L1, MSI/MMR, TMB, ชนิดมะเร็ง และข้อห้ามด้านภูมิคุ้มกัน",
       high:"ผล HIGH/SUPPORTED สนับสนุนสัญญาณความไวในระบบทดสอบ",
       low:"ผลต่ำไม่ได้ตัดประโยชน์ทางคลินิกทั้งหมด",
       normal:"ไม่มีค่าปกติแบบแล็บ"
     },
     "Hormonal therapy":{
       meaning:"ยาฮอร์โมนบำบัด ต้องตีความร่วมกับ receptor status และชนิดของมะเร็ง",
       high:"ผลสูงสนับสนุนความไวในระบบทดสอบ",
       low:"ผลต่ำลดน้ำหนักการเลือก",
       normal:"ไม่มีค่าปกติแบบแล็บ"
     }
   }[category]||{
     meaning:"ยาหรือสารจากรายงาน Onconomics",
     high:"ผลสูงหมายถึงสัญญาณตอบสนองมากกว่า",
     low:"ผลต่ำหมายถึงสัญญาณตอบสนองน้อยกว่า",
     normal:"ไม่มีค่าปกติแบบแล็บ"
   };

   add("DRUG",name,category,subgroup,mechanism,wording.meaning,wording.high,wording.low,wording.normal,aliases);
 }

 function addNatural(name,subgroup,mechanism,aliases=[]){
   add("NATURAL",name,"Natural supplements",subgroup,mechanism,
     "สารธรรมชาติหรืออาหารเสริมจากรายงาน RGCC ผลที่ได้เป็นความไวเชิงทดลอง ไม่ใช่หลักฐานว่าสามารถทดแทนการรักษามาตรฐานได้",
     "ผลสูงหมายถึงสัญญาณตอบสนองมากกว่าในแบบทดสอบ",
     "ผลต่ำหมายถึงสัญญาณตอบสนองน้อยกว่าในแบบทดสอบ",
     "ไม่มีค่าปกติสากล ใช้ Class หรือระดับของรายงาน",aliases);
 }

 function addGene(name,subgroup,mechanism,meaning,high,low,normal,aliases=[]){
   add("GENE",name,"Gene expression",subgroup,mechanism,meaning,high,low,normal,aliases);
 }

 // ============================================================
 // CHEMOTHERAPY
 // ============================================================

 [
  ["Cisplatin","Platinum","DNA cross-linking"],
  ["Carboplatin","Platinum","DNA cross-linking"],
  ["Oxaliplatin","Platinum","DNA cross-linking"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Cyclophosphamide","Alkylating agents","DNA alkylation"],
  ["Ifosfamide","Alkylating agents","DNA alkylation"],
  ["Melphalan","Alkylating agents","DNA alkylation"],
  ["Bendamustine","Alkylating agents","DNA alkylation and cross-linking"],
  ["Temozolomide","Alkylating agents","DNA methylation"],
  ["Dacarbazine","Alkylating agents","DNA methylation"],
  ["Busulfan","Alkylating agents","DNA cross-linking"],
  ["Chlorambucil","Alkylating agents","DNA alkylation"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Doxorubicin","Anthracyclines","Topoisomerase II inhibition and free-radical injury"],
  ["Epirubicin","Anthracyclines","Topoisomerase II inhibition"],
  ["Idarubicin","Anthracyclines","Topoisomerase II inhibition"],
  ["Daunorubicin","Anthracyclines","Topoisomerase II inhibition"],
  ["Mitoxantrone","Anthracenediones","Topoisomerase II inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Irinotecan","Topoisomerase I inhibitors","Topoisomerase I inhibition",["CPT-11","CPT11"]],
  ["Topotecan","Topoisomerase I inhibitors","Topoisomerase I inhibition"]
 ].forEach(([n,s,m,a])=>addDrug(n,"Chemotherapy",s,m,a||[]));

 [
  ["Etoposide","Topoisomerase II inhibitors","Topoisomerase II inhibition"],
  ["Teniposide","Topoisomerase II inhibitors","Topoisomerase II inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Paclitaxel","Taxanes","Microtubule stabilization"],
  ["Docetaxel","Taxanes","Microtubule stabilization"],
  ["Cabazitaxel","Taxanes","Microtubule stabilization"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Vincristine","Vinca alkaloids","Microtubule inhibition"],
  ["Vinblastine","Vinca alkaloids","Microtubule inhibition"],
  ["Vinorelbine","Vinca alkaloids","Microtubule inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["Ixabepilone","Epothilones","Microtubule stabilization"],
  ["Eribulin","Microtubule inhibitors","Microtubule dynamics inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 [
  ["5-FU","Fluoropyrimidines","Thymidylate synthase inhibition",["Fluorouracil","5FU"]],
  ["Capecitabine","Fluoropyrimidines","Oral fluoropyrimidine prodrug"],
  ["Tegafur","Fluoropyrimidines","Fluoropyrimidine prodrug"],
  ["S-1","Fluoropyrimidines","Tegafur combination fluoropyrimidine",["TS-1","Tegafur/Gimeracil/Oteracil"]]
 ].forEach(([n,s,m,a])=>addDrug(n,"Chemotherapy",s,m,a||[]));

 [
  ["Gemcitabine","Gemcitabine family","Nucleoside analogue"],
  ["Cytarabine","Nucleoside / antimetabolites","Cytidine analogue"],
  ["Fludarabine","Nucleoside / antimetabolites","Purine analogue"],
  ["Cladribine","Nucleoside / antimetabolites","Purine analogue"],
  ["Methotrexate","Antimetabolites","DHFR inhibition",["MTX"]],
  ["Pemetrexed","Antimetabolites","Multitarget antifolate"],
  ["Mercaptopurine","Antimetabolites","Purine antagonist",["6-MP"]],
  ["Thioguanine","Antimetabolites","Purine antagonist"]
 ].forEach(([n,s,m,a])=>addDrug(n,"Chemotherapy",s,m,a||[]));

 [
  ["Bleomycin","Antitumor antibiotics","DNA strand breaks"],
  ["Mitomycin C","Antitumor antibiotics","DNA cross-linking"],
  ["Actinomycin D","Antitumor antibiotics","Transcription inhibition"],
  ["Trabectedin","Other cytotoxic chemotherapy","DNA minor-groove binding"]
 ].forEach(([n,s,m])=>addDrug(n,"Chemotherapy",s,m));

 // ============================================================
 // TARGETED THERAPY
 // ============================================================

 [
  ["Erlotinib","EGFR inhibitors","EGFR tyrosine-kinase inhibition"],
  ["Gefitinib","EGFR inhibitors","EGFR tyrosine-kinase inhibition"],
  ["Afatinib","EGFR inhibitors","Irreversible ERBB-family inhibition"],
  ["Osimertinib","EGFR inhibitors","Mutant-selective EGFR inhibition"],
  ["Dacomitinib","EGFR inhibitors","Pan-ERBB inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Trastuzumab","HER2 inhibitors","HER2 blockade"],
  ["Pertuzumab","HER2 inhibitors","HER2 dimerization blockade"],
  ["Lapatinib","HER2 inhibitors","HER2 and EGFR inhibition"],
  ["Tucatinib","HER2 inhibitors","Selective HER2 inhibition"],
  ["Neratinib","HER2 inhibitors","Irreversible pan-HER inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Bevacizumab","VEGF / VEGFR inhibitors","VEGF-A neutralization"],
  ["Ramucirumab","VEGF / VEGFR inhibitors","VEGFR2 inhibition"],
  ["Aflibercept","VEGF / VEGFR inhibitors","VEGF trap"],
  ["Fruquintinib","VEGF / VEGFR inhibitors","VEGFR1/2/3 inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Capmatinib","MET inhibitors","MET inhibition"],
  ["Tepotinib","MET inhibitors","MET inhibition"],
  ["Cabozantinib","MET inhibitors","MET/VEGFR/AXL inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Crizotinib","ALK inhibitors","ALK/ROS1/MET inhibition"],
  ["Alectinib","ALK inhibitors","ALK inhibition"],
  ["Brigatinib","ALK inhibitors","ALK inhibition"],
  ["Lorlatinib","ALK inhibitors","Brain-penetrant ALK/ROS1 inhibition"],
  ["Ceritinib","ALK inhibitors","ALK inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Entrectinib","ROS1 inhibitors","ROS1/TRK/ALK inhibition"],
  ["Crizotinib","ROS1 inhibitors","ROS1/ALK/MET inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Selpercatinib","RET inhibitors","RET inhibition"],
  ["Pralsetinib","RET inhibitors","RET inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Vemurafenib","BRAF inhibitors","BRAF V600 inhibition"],
  ["Dabrafenib","BRAF inhibitors","BRAF inhibition"],
  ["Encorafenib","BRAF inhibitors","BRAF inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Trametinib","MEK inhibitors","MEK1/2 inhibition"],
  ["Cobimetinib","MEK inhibitors","MEK1/2 inhibition"],
  ["Binimetinib","MEK inhibitors","MEK1/2 inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Alpelisib","PI3K inhibitors","PI3K-alpha inhibition"],
  ["Idelalisib","PI3K inhibitors","PI3K-delta inhibition"],
  ["Copanlisib","PI3K inhibitors","PI3K-alpha/delta inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Everolimus","mTOR inhibitors","mTORC1 inhibition"],
  ["Temsirolimus","mTOR inhibitors","mTOR inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Palbociclib","CDK4/6 inhibitors","CDK4/6 inhibition"],
  ["Ribociclib","CDK4/6 inhibitors","CDK4/6 inhibition"],
  ["Abemaciclib","CDK4/6 inhibitors","CDK4/6 inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Olaparib","PARP inhibitors","PARP inhibition and synthetic lethality"],
  ["Niraparib","PARP inhibitors","PARP inhibition"],
  ["Rucaparib","PARP inhibitors","PARP inhibition"],
  ["Talazoparib","PARP inhibitors","PARP inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Ibrutinib","BTK inhibitors","BTK inhibition"],
  ["Acalabrutinib","BTK inhibitors","BTK inhibition"],
  ["Zanubrutinib","BTK inhibitors","BTK inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["Regorafenib","Multi-kinase inhibitors","VEGFR/TIE2/RAF inhibition"],
  ["Pazopanib","Multi-kinase inhibitors","VEGFR/PDGFR/KIT inhibition"],
  ["Sorafenib","Multi-kinase inhibitors","RAF/VEGFR/PDGFR inhibition"],
  ["Sunitinib","Multi-kinase inhibitors","VEGFR/PDGFR/KIT inhibition"],
  ["Lenvatinib","Multi-kinase inhibitors","VEGFR/FGFR inhibition"],
  ["Imatinib","Multi-kinase inhibitors","BCR-ABL/KIT/PDGFR inhibition"],
  ["Dasatinib","Multi-kinase inhibitors","BCR-ABL/SRC inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Targeted therapy",s,m));

 [
  ["T-DM1","ADC","HER2-directed antibody-drug conjugate",["Ado-trastuzumab emtansine"]],
  ["Trastuzumab deruxtecan","ADC","HER2-directed topoisomerase-I payload",["T-DXd"]],
  ["Sacituzumab govitecan","ADC","TROP2-directed topoisomerase-I payload"],
  ["Enfortumab vedotin","ADC","Nectin-4 directed microtubule payload"]
 ].forEach(([n,s,m,a])=>addDrug(n,"Targeted therapy",s,m,a||[]));

 // ============================================================
 // IMMUNOTHERAPY / MONOCLONAL ANTIBODIES
 // ============================================================

 [
  ["Pembrolizumab","PD-1 inhibitors","PD-1 blockade"],
  ["Nivolumab","PD-1 inhibitors","PD-1 blockade"],
  ["Cemiplimab","PD-1 inhibitors","PD-1 blockade"],
  ["Dostarlimab","PD-1 inhibitors","PD-1 blockade"]
 ].forEach(([n,s,m])=>addDrug(n,"Immunotherapy",s,m));

 [
  ["Atezolizumab","PD-L1 inhibitors","PD-L1 blockade"],
  ["Durvalumab","PD-L1 inhibitors","PD-L1 blockade"],
  ["Avelumab","PD-L1 inhibitors","PD-L1 blockade"]
 ].forEach(([n,s,m])=>addDrug(n,"Immunotherapy",s,m));

 [
  ["Ipilimumab","CTLA-4 inhibitors","CTLA-4 blockade"],
  ["Tremelimumab","CTLA-4 inhibitors","CTLA-4 blockade"]
 ].forEach(([n,s,m])=>addDrug(n,"Immunotherapy",s,m));

 [
  ["Bevacizumab","Anti-VEGF antibody","VEGF-A neutralization"],
  ["Ramucirumab","Anti-VEGF antibody","VEGFR2 inhibition"],
  ["Cetuximab","Anti-EGFR antibody","EGFR blockade"],
  ["Panitumumab","Anti-EGFR antibody","EGFR blockade"],
  ["Trastuzumab","Anti-HER2 antibody","HER2 blockade"],
  ["Pertuzumab","Anti-HER2 antibody","HER2 dimerization blockade"],
  ["Rituximab","Anti-CD20 antibody","CD20-directed B-cell depletion"],
  ["Obinutuzumab","Anti-CD20 antibody","CD20-directed B-cell depletion"],
  ["Denosumab","Anti-RANKL","RANKL inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Immunotherapy",s,m));

 // Hormonal therapy
 [
  ["Tamoxifen","SERMs","Estrogen-receptor modulation"],
  ["Fulvestrant","SERDs","Estrogen-receptor degradation"],
  ["Letrozole","Aromatase inhibitors","Estrogen synthesis inhibition"],
  ["Anastrozole","Aromatase inhibitors","Estrogen synthesis inhibition"],
  ["Exemestane","Aromatase inhibitors","Estrogen synthesis inhibition"],
  ["Abiraterone","Androgen-axis therapy","CYP17 inhibition"],
  ["Enzalutamide","Androgen-axis therapy","Androgen-receptor inhibition"]
 ].forEach(([n,s,m])=>addDrug(n,"Hormonal therapy",s,m));


 // RGCC COMPLETE CATALOG — VERIFIED MISSING DRUG ENTRIES
 addDrug("Mitomycin","Chemotherapy","Antitumor antibiotics","Bioreductive DNA cross-linking",["Mitomycin C"]);
 addDrug("Nedaplatin","Chemotherapy","Platinum","Platinum-mediated DNA cross-linking",[]);
 addDrug("Treosulfan","Chemotherapy","Alkylating agents","Bifunctional DNA alkylation and cross-linking",[]);
 addDrug("Procarbazine","Chemotherapy","Alkylating agents","DNA methylation and free-radical injury",[]);
 addDrug("BCNU","Chemotherapy","Nitrosoureas","DNA alkylation and cross-linking",["Carmustine"]);
 addDrug("ACNU","Chemotherapy","Nitrosoureas","DNA alkylation and cross-linking",["Nimustine"]);
 addDrug("CCNU","Chemotherapy","Nitrosoureas","DNA alkylation and cross-linking",["Lomustine"]);
 addDrug("Trofosfamide","Chemotherapy","Oxazaphosphorines","DNA alkylation",[]);
 addDrug("Estramustine","Chemotherapy","Microtubule inhibitors","Microtubule-associated protein disruption",[]);
 addDrug("Hydroxyurea","Chemotherapy","Antimetabolites","Ribonucleotide reductase inhibition",[]);
 addDrug("Altretamine","Chemotherapy","Alkylating-like agents","DNA-damaging methylating metabolites",[]);
 addDrug("CPT-11 (Irinotecan)","Chemotherapy","Topoisomerase I inhibitors","Topoisomerase I inhibition",["CPT11", "Irinotecan"]);
 addDrug("Gimatecan","Chemotherapy","Topoisomerase I inhibitors","Topoisomerase I inhibition",[]);
 addDrug("Liposomal Doxorubicin","Chemotherapy","Anthracyclines","Topoisomerase II inhibition in liposomal formulation",["Pegylated liposomal doxorubicin"]);
 addDrug("Dactinomycin","Chemotherapy","Antitumor antibiotics","DNA intercalation and RNA synthesis inhibition",["Actinomycin D"]);
 addDrug("Amsacrine Hydrochloride","Chemotherapy","Topoisomerase II inhibitors","DNA intercalation and topoisomerase II inhibition",["Amsacrine"]);
 addDrug("Abraxane","Chemotherapy","Taxanes","Albumin-bound paclitaxel; microtubule stabilization",["Nab-paclitaxel"]);
 addDrug("FUDR","Chemotherapy","Fluoropyrimidines","Thymidylate synthase inhibition",["Floxuridine"]);
 addDrug("UFT","Chemotherapy","Fluoropyrimidines","Tegafur plus uracil oral fluoropyrimidine",[]);
 addDrug("Raltitrexed","Chemotherapy","Antimetabolites","Direct thymidylate synthase inhibition",[]);
 addDrug("Alemtuzumab","Targeted therapy","CD52 antibodies","CD52-directed monoclonal antibody",[]);
 addDrug("Brentuximab Vedotin","Targeted therapy","Antibody-drug conjugates","CD30-directed antibody-drug conjugate",[]);
 addDrug("Catumaxomab","Immunotherapy","Bispecific antibodies","EpCAM/CD3 bispecific immune-cell engagement",[]);
 addDrug("Gemtuzumab","Targeted therapy","Antibody-drug conjugates","CD33-directed antibody-drug conjugate",["Gemtuzumab ozogamicin"]);
 addDrug("Ibritumomab Tiuxetan","Targeted therapy","Radioimmunotherapy","CD20-directed radioimmunoconjugate",[]);
 addDrug("Tositumomab","Targeted therapy","Radioimmunotherapy","CD20-directed radioimmunotherapy",[]);
 addDrug("Ofatumumab","Targeted therapy","CD20 antibodies","CD20-directed monoclonal antibody",[]);
 addDrug("5-Azacytidine","Chemotherapy","Hypomethylating agents","DNA/RNA methyltransferase inhibition",["Azacitidine"]);
 addDrug("Axitinib","Targeted therapy","VEGF / VEGFR inhibitors","VEGFR1/2/3 tyrosine-kinase inhibition",[]);
 addDrug("Bortezomib","Targeted therapy","Proteasome inhibitors","26S proteasome inhibition",[]);
 addDrug("Everolimus/Temsirolimus","Targeted therapy","mTOR inhibitors","mTORC1 inhibition",["Everolimus", "Temsirolimus"]);
 addDrug("Goserelin","Hormonal therapy","GnRH agonists","Pituitary GnRH receptor agonism with gonadal suppression",[]);
 addDrug("Imatinib Mesylate","Targeted therapy","BCR-ABL/KIT/PDGFR inhibitors","BCR-ABL, KIT and PDGFR inhibition",["Imatinib"]);
 addDrug("Nilotinib","Targeted therapy","BCR-ABL inhibitors","BCR-ABL tyrosine-kinase inhibition",[]);
 addDrug("Nintedanib","Targeted therapy","Multi-kinase inhibitors","VEGFR/FGFR/PDGFR inhibition",[]);
 addDrug("Octreotide","Hormonal therapy","Somatostatin analogues","Somatostatin-receptor agonism",[]);
 addDrug("Ruxolitinib","Targeted therapy","JAK inhibitors","JAK1/2 inhibition",[]);
 addDrug("Semaxanib","Targeted therapy","VEGF / VEGFR inhibitors","VEGFR2 tyrosine-kinase inhibition",["SU5416"]);
 addDrug("Vandetanib","Targeted therapy","Multi-kinase inhibitors","RET, VEGFR and EGFR inhibition",[]);
 addDrug("Veliparib","Targeted therapy","PARP inhibitors","PARP1/2 inhibition",[]);
 addDrug("Vorinostat","Targeted therapy","HDAC inhibitors","Histone deacetylase inhibition",[]);
 addDrug("Ponatinib","Targeted therapy","BCR-ABL inhibitors","Pan-BCR-ABL inhibition including T315I",[]);
 addDrug("Ziv-Aflibercept","Targeted therapy","VEGF / VEGFR inhibitors","Soluble VEGF decoy receptor",["Aflibercept"]);
 addDrug("Lonsurf + Bevacizumab","Chemotherapy","Combination regimens","Trifluridine/tipiracil plus VEGF-A blockade",["TAS-102 + Bevacizumab"]);
 addDrug("Daraxonrasib","Targeted therapy","KRAS inhibitors","Investigational KRAS G12D-selective inhibition",["RMC-9805"]);
 addDrug("Botensilimab + Balstilimab","Immunotherapy","Checkpoint combinations","Fc-enhanced CTLA-4 blockade plus PD-1 blockade",[]);
 addDrug("Ivonescimab","Immunotherapy","Bispecific antibodies","PD-1/VEGF bispecific antibody",[]);
 addDrug("Sintilimab","Immunotherapy","PD-1 inhibitors","PD-1 blockade",[]);
 addDrug("Nivolumab/Relatlimab","Immunotherapy","Checkpoint combinations","PD-1 plus LAG-3 blockade",["Nivolumab + Relatlimab"]);
 addDrug("L-Asparaginase","Chemotherapy","Enzyme therapy","Systemic asparagine depletion",[]);
 addDrug("Pegaspargase","Chemotherapy","Enzyme therapy","Pegylated asparaginase; systemic asparagine depletion",[]);
 addDrug("6-Mercaptopurine","Chemotherapy","Antimetabolites","Purine analogue inhibiting nucleotide synthesis",["Mercaptopurine", "6-MP"]);

 // ============================================================
 // NATURAL SUBSTANCES
 // ============================================================

 [
  ["Artemisinin","Class I - Cytotoxic agents","Iron-dependent oxidative injury"],
  ["Artesunate","Class I - Cytotoxic agents","Iron-dependent oxidative injury"],
  ["Agaricus","Class I - Cytotoxic agents","Mushroom-derived cytotoxic and immune effects"],
  ["Vitamin C","Class I - Cytotoxic agents","Redox modulation; IV differs from oral"],
  ["DCA","Class I - Cytotoxic agents","Pyruvate dehydrogenase kinase inhibition",["Dichloroacetate"]],
  ["IP6","Class I - Cytotoxic agents","Inositol phosphate signaling and chelation"],
  ["Lycopene","Class I - Cytotoxic agents","Carotenoid antioxidant and IGF modulation"],
  ["Frankincense","Class I - Cytotoxic agents","Boswellic-acid and 5-LOX modulation",["Boswellia"]],
  ["Black cumin","Class I - Cytotoxic agents","Thymoquinone-related signaling",["Nigella sativa"]],
  ["Avemar","Class I - Cytotoxic agents","Fermented wheat-germ metabolic modulation"]
 ].forEach(([n,s,m,a])=>addNatural(n,s,m,a||[]));

 [
  ["AHCC","Class II - Immunostimulants / Immunomodulators","Innate and adaptive immune modulation"],
  ["Beta-glucan","Class II - Immunostimulants / Immunomodulators","Pattern-recognition receptor activation"],
  ["Maitake","Class II - Immunostimulants / Immunomodulators","Beta-glucan immune modulation"],
  ["Coriolus","Class II - Immunostimulants / Immunomodulators","PSK/PSP immune modulation",["Turkey tail"]],
  ["Reishi","Class II - Immunostimulants / Immunomodulators","Beta-glucan and triterpene immune modulation"],
  ["Medicinal mushroom","Class II - Immunostimulants / Immunomodulators","Mushroom-derived immune modulation"],
  ["Mistletoe","Class II - Immunostimulants / Immunomodulators","Lectin-mediated immune modulation"]
 ].forEach(([n,s,m,a])=>addNatural(n,s,m,a||[]));

 [
  ["Curcumin","Class III - Protein kinase inhibitors","NF-κB/STAT3/COX-2 modulation"],
  ["Quercetin","Class III - Protein kinase inhibitors","PI3K/AKT and kinase modulation"],
  ["Resveratrol","Class III - Protein kinase inhibitors","SIRT1/AMPK and kinase signaling"],
  ["Genistein","Class III - Protein kinase inhibitors","Tyrosine-kinase and estrogen-receptor modulation"],
  ["Apigenin","Class III - Protein kinase inhibitors","PI3K/AKT and cell-cycle modulation"],
  ["CoQ10","Class III - Protein kinase inhibitors","Mitochondrial electron transport and redox support"],
  ["Indole-3-carbinol","Class III - Protein kinase inhibitors","Estrogen metabolism and AhR signaling"],
  ["Salvestrol","Class III - Protein kinase inhibitors","Prodrug concept dependent on CYP1B1 activation"]
 ].forEach(([n,s,m])=>addNatural(n,s,m));

 [
  ["EGCG","Antioxidant / Polyphenols","EGFR, VEGF and proteasome modulation"],
  ["Luteolin","Antioxidant / Polyphenols","STAT3 and NF-κB modulation"],
  ["Silymarin","Antioxidant / Polyphenols","Flavonolignan antioxidant pathways"],
  ["NAC","Antioxidant / Redox support","Glutathione precursor"],
  ["Alpha-lipoic acid","Antioxidant / Redox support","Mitochondrial cofactor and antioxidant recycling"],
  ["Selenium","Antioxidant / Redox support","Selenoprotein and redox pathways"],
  ["Zinc","Antioxidant / Redox support","Enzyme, immune and DNA-repair support"]
 ].forEach(([n,s,m])=>addNatural(n,s,m));

 [
  ["Berberine","Metabolism","AMPK and mitochondrial metabolism"],
  ["Omega-3","Metabolism","Eicosanoid and inflammation modulation"],
  ["Modified Citrus Pectin","Metabolism","Galectin-3 binding"],
  ["Melatonin","Metabolism","Circadian, antioxidant and immune modulation"],
  ["Vitamin D","Metabolism","Vitamin-D receptor signaling"],
  ["Sulforaphane","Metabolism","Nrf2 and HDAC modulation"],
  ["DIM","Metabolism","Estrogen metabolism and apoptosis signaling"],
  ["Cordyceps","Metabolism","Immune and metabolic modulation"]
 ].forEach(([n,s,m])=>addNatural(n,s,m));

 // ============================================================
 // GENE EXPRESSION
 // ============================================================

 [
  ["EGF","Growth factors / Proliferation","Epidermal growth factor","Growth-factor ligand driving proliferation",
   "ค่าสูงสนับสนุน proliferative signaling","ค่าต่ำสะท้อน signal ต่ำ","0% หรือ baseline ของรายงาน"],
  ["IGF-r 1","Growth factors / Proliferation","IGF-1 receptor","Receptor for insulin-like growth factor signaling",
   "สูงสนับสนุน IGF-driven growth","ต่ำสะท้อน IGF signaling ต่ำ","0% หรือ baseline",["IGF-1R"]],
  ["IGF-r-2","Growth factors / Proliferation","IGF-2 receptor","IGF-2 related signaling",
   "สูงสนับสนุน IGF pathway activity","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline",["IGF-2R"]],
  ["c-erb-B1","Growth factors / Proliferation","HER1 / EGFR","Epidermal growth-factor receptor",
   "สูงอาจสัมพันธ์กับ EGFR signaling","ต่ำลดน้ำหนัก EGFR-driven biology","0% หรือ baseline",["HER1","EGFR"]],
  ["c-erb-B2","Growth factors / Proliferation","HER2","HER2 receptor signaling",
   "สูงอาจสัมพันธ์กับ HER2 pathway","ต่ำไม่สนับสนุน overexpression","ต้องยืนยันด้วย IHC/ISH",["HER2","ERBB2"]],
  ["CD 117(c-kit)","Growth factors / Proliferation","c-KIT","Receptor tyrosine kinase",
   "สูงสนับสนุน KIT signaling","ต่ำสะท้อน KIT signal ต่ำ","0% หรือ baseline",["c-KIT","CD117"]],
  ["SS-r","Growth factors / Proliferation","Somatostatin receptor","Somatostatin-receptor expression",
   "สูงอาจสนับสนุน receptor expression","ต่ำสะท้อน receptor signal ต่ำ","ขึ้นกับวิธีทดสอบ",["SSTR"]]
 ].forEach(x=>addGene(...x));

 [
  ["JAK 1/2","Signal transduction","JAK-STAT pathway","Cytokine signal transduction",
   "สูงสนับสนุน JAK/STAT activity","ต่ำสะท้อน pathway activity ต่ำ","0% หรือ baseline",["JAK","JAK1","JAK2"]],
  ["mTOR","Signal transduction","mTOR pathway","Growth and nutrient sensing kinase",
   "สูงสนับสนุน proliferative signaling","ต่ำสะท้อน pathway activity ต่ำ","0% หรือ baseline"],
  ["c-Jun","Signal transduction","AP-1 transcription factor","Stress and proliferation signaling",
   "สูงสนับสนุน AP-1 activity","ต่ำสะท้อน activity ต่ำ","0% หรือ baseline"],
  ["c-Fos","Signal transduction","AP-1 transcription factor","Immediate early response signaling",
   "สูงสนับสนุน AP-1 activity","ต่ำสะท้อน activity ต่ำ","0% หรือ baseline"],
  ["Ras/Raf/MEK/Er k","Signal transduction","MAPK pathway","Ras-Raf-MEK-ERK signaling",
   "สูงสนับสนุน MAPK activation","ต่ำสะท้อน pathway activity ต่ำ","0% หรือ baseline",["Ras/Raf/MEK/ERK","MAPK"]]
 ].forEach(x=>addGene(...x));

 [
  ["Estrogene Receptor","Hormone receptors","Estrogen receptor","Estrogen-receptor signaling",
   "สูงสนับสนุน estrogen-driven biology","ต่ำสะท้อน receptor expression ต่ำ","ต้องเทียบ IHC มาตรฐาน",["ER","Estrogen Receptor"]],
  ["Progesterone Receptor","Hormone receptors","Progesterone receptor","Progesterone-receptor signaling",
   "สูงสนับสนุน hormone responsiveness","ต่ำสะท้อน receptor expression ต่ำ","ต้องเทียบ IHC มาตรฐาน",["PR"]],
  ["NR3C4-A","Hormone receptors","Androgen receptor isoform","Androgen-receptor signaling",
   "สูงสนับสนุน androgen-axis activity","ต่ำสะท้อน receptor expression ต่ำ","ขึ้นกับวิธีทดสอบ",["AR-A"]],
  ["NR3C4-B","Hormone receptors","Androgen receptor isoform","Androgen-receptor signaling",
   "สูงสนับสนุน androgen-axis activity","ต่ำสะท้อน receptor expression ต่ำ","ขึ้นกับวิธีทดสอบ",["AR-B"]]
 ].forEach(x=>addGene(...x));

 [
  ["TGF-b","Self repair / Resistance","TGF-beta signaling","Fibrosis, immune suppression and EMT signaling",
   "สูงสัมพันธ์กับ repair/EMT/resistance signaling","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline",["TGF-beta"]],
  ["HSP27","Heat shock / Resistance","Heat-shock protein 27","Cellular stress adaptation",
   "สูงสัมพันธ์กับ stress resistance","ต่ำสะท้อน resistance signal ต่ำ","0% หรือ baseline"],
  ["HSP72","Heat shock / Resistance","Heat-shock protein 72","Stress adaptation and protein protection",
   "สูงสัมพันธ์กับ stress adaptation","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["HSP90","Heat shock / Resistance","Heat-shock protein 90","Chaperone supporting oncogenic proteins",
   "สูงสัมพันธ์กับ protein stability and resistance","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["PARP (1-17)","DNA repair / Resistance","PARP family","Single-strand DNA repair",
   "สูงอาจสัมพันธ์กับ DNA-repair capacity","ต่ำอาจสัมพันธ์กับ repair deficiency","ไม่มีช่วงปกติสากล",["PARP"]],
  ["HDAC","Epigenetic regulation / Resistance","Histone deacetylase","Chromatin compaction and gene repression",
   "สูงสนับสนุน HDAC activity","ต่ำสะท้อน activity ต่ำ","0% หรือ baseline"],
  ["HAT","Epigenetic regulation / Resistance","Histone acetyltransferase","Histone acetylation and chromatin opening",
   "สูงสนับสนุน acetylation activity","ต่ำสะท้อน activity ต่ำ","0% หรือ baseline"],
  ["CXCR4","Self repair / Resistance","Chemokine receptor","Migration, homing and metastatic signaling",
   "สูงสัมพันธ์กับ migration/metastatic signaling","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["CXCL12","Self repair / Resistance","CXCR4 ligand","Chemokine signaling and stromal interaction",
   "สูงสนับสนุน CXCR4/CXCL12 axis","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"]
 ].forEach(x=>addGene(...x));

 [
  ["VEGF","Angiogenesis / Metastasis","Vascular endothelial growth factor","Tumor angiogenesis",
   "สูงสัมพันธ์กับ angiogenic drive","ต่ำบ่งชี้ angiogenic signal น้อยกว่า","0% หรือ baseline"],
  ["PDGF","Angiogenesis / Metastasis","Platelet-derived growth factor","Stromal and vascular signaling",
   "สูงสนับสนุน stromal/angiogenic signaling","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["FGF","Angiogenesis / Metastasis","Fibroblast growth factor","Angiogenesis and proliferation",
   "สูงสนับสนุน angiogenesis/proliferation","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["ANG 1","Angiogenesis / Metastasis","Angiopoietin-1","Vascular maturation signaling",
   "สูงสัมพันธ์กับ vascular signaling","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline",["ANG1"]],
  ["ANG 2","Angiogenesis / Metastasis","Angiopoietin-2","Vascular remodeling",
   "สูงสัมพันธ์กับ vascular remodeling","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline",["ANG2"]],
  ["c-MET","Angiogenesis / Metastasis","HGF receptor","Growth, invasion and metastatic signaling",
   "สูงสัมพันธ์กับ MET signaling","ต่ำสะท้อน signal ต่ำ","ต้องยืนยัน amplification/exon14 alteration เมื่อใช้ยา",["MET"]],
  ["MMP","Angiogenesis / Metastasis","Matrix metalloproteinases","Matrix remodeling and invasion",
   "สูงสัมพันธ์กับ invasion","ต่ำสะท้อน invasion signal ต่ำ","0% หรือ baseline"],
  ["67LR","Angiogenesis / Metastasis","67-kDa laminin receptor","Adhesion and invasion signaling",
   "สูงสัมพันธ์กับ invasive phenotype","ต่ำสะท้อน signal ต่ำ","0% หรือ baseline"],
  ["KISS-1-r","Angiogenesis / Metastasis","KISS1 receptor","Metastasis-suppressor pathway",
   "สูงอาจสนับสนุน anti-metastatic signaling","ต่ำอาจลด metastasis-suppressor signal","0% หรือ baseline",["KISS1R"]],
  ["Nm23","Angiogenesis / Metastasis","Metastasis suppressor","Metastasis-suppressor pathway",
   "สูงอาจสัมพันธ์กับ metastasis suppression","ต่ำอาจสัมพันธ์กับ metastatic potential","0% หรือ baseline"]
 ].forEach(x=>addGene(...x));

 [
  ["MDR1","Resistance markers","P-glycoprotein efflux pump","Multidrug resistance via drug efflux",
   "สูงอาจสัมพันธ์กับ multidrug resistance","ต่ำลดน้ำหนัก efflux-mediated resistance","0% หรือ baseline",["ABCB1"]],
  ["MRP1","Resistance markers","ABC transporter","Drug efflux and multidrug resistance",
   "สูงอาจสัมพันธ์กับ drug efflux","ต่ำสะท้อน efflux signal ต่ำ","0% หรือ baseline",["ABCC1"]],
  ["LRP","Resistance markers","Lung resistance-related protein","Intracellular drug transport and resistance",
   "สูงอาจสัมพันธ์กับ drug resistance","ต่ำสะท้อน resistance signal ต่ำ","0% หรือ baseline"],
  ["GST","Resistance markers","Glutathione S-transferase","Drug detoxification",
   "สูงอาจสัมพันธ์กับ detoxification-mediated resistance","ต่ำสะท้อน detoxification signal ต่ำ","0% หรือ baseline"]
 ].forEach(x=>addGene(...x));

 // Additional clinically useful RGCC markers already seen in reports
 [
  ["ERCC1","DNA repair / Resistance","Nucleotide-excision repair","Platinum-related DNA repair",
   "สูงอาจสัมพันธ์กับ platinum resistance","ต่ำอาจสนับสนุน platinum sensitivity","ไม่มีช่วงปกติสากล"],
  ["RRM1","DNA repair / Resistance","Ribonucleotide reductase subunit","DNA synthesis and gemcitabine resistance",
   "สูงอาจสัมพันธ์กับ gemcitabine resistance","ต่ำอาจสนับสนุน gemcitabine sensitivity","ไม่มีช่วงปกติสากล"],
  ["TS","Drug metabolism / Targets","Thymidylate synthase","Fluoropyrimidine target",
   "สูงอาจสัมพันธ์กับ fluoropyrimidine resistance","ต่ำอาจสนับสนุน fluoropyrimidine sensitivity","ไม่มีช่วงปกติสากล"],
  ["DPD","Drug metabolism / Targets","Dihydropyrimidine dehydrogenase","Fluoropyrimidine catabolism",
   "สูงอาจลด exposure ต่อ 5-FU","ต่ำมากอาจเพิ่มความเสี่ยงพิษ","ต้องใช้ DPYD/phenotyping มาตรฐานเพื่อความปลอดภัย"],
  ["PD-L1","Immune checkpoints","PD-L1","Immune checkpoint ligand",
   "สูงอาจสนับสนุน immune-evasion biology","ต่ำไม่ตัดประโยชน์ immunotherapy","เกณฑ์ขึ้นกับ IHC assay และชนิดมะเร็ง"],
  ["PD 1","Immune checkpoints","PD-1","T-cell inhibitory receptor",
   "สูงสะท้อน checkpoint signaling","ต่ำสะท้อน signal ต่ำ","ไม่มีช่วงปกติสากล",["PD-1"]],
  ["PD-L2","Immune checkpoints","PD-L2","Second ligand for PD-1",
   "สูงสะท้อน immune-checkpoint signaling","ต่ำสะท้อน signal ต่ำ","ไม่มีช่วงปกติสากล"]
 ].forEach(x=>addGene(...x));

 const TRADE_NAMES={
   "Cisplatin":"Platinol","Carboplatin":"Paraplatin","Oxaliplatin":"Eloxatin",
   "Cyclophosphamide":"Cytoxan / Endoxan","Ifosfamide":"Ifex / Holoxan","Melphalan":"Alkeran",
   "Temozolomide":"Temodal / Temodar","Dacarbazine":"DTIC-Dome","Bendamustine":"Treanda",
   "Doxorubicin":"Adriamycin","Epirubicin":"Ellence","Irinotecan":"Camptosar",
   "Topotecan":"Hycamtin","Etoposide":"Vepesid","Paclitaxel":"Taxol",
   "Docetaxel":"Taxotere","Cabazitaxel":"Jevtana","Vincristine":"Oncovin",
   "Vinblastine":"Velban","Vinorelbine":"Navelbine","Eribulin":"Halaven",
   "5-FU":"Adrucil","Capecitabine":"Xeloda","S-1":"TS-1",
   "Gemcitabine":"Gemzar","Pemetrexed":"Alimta","Methotrexate":"Trexall",
   "Bleomycin":"Blenoxane","Mitomycin C":"Mutamycin",
   "Erlotinib":"Tarceva","Gefitinib":"Iressa","Afatinib":"Giotrif",
   "Osimertinib":"Tagrisso","Trastuzumab":"Herceptin","Pertuzumab":"Perjeta",
   "Lapatinib":"Tykerb","Tucatinib":"Tukysa","Bevacizumab":"Avastin",
   "Ramucirumab":"Cyramza","Fruquintinib":"Fruzaqla / Elunate",
   "Capmatinib":"Tabrecta","Tepotinib":"Tepmetko","Cabozantinib":"Cabometyx",
   "Crizotinib":"Xalkori","Alectinib":"Alecensa","Brigatinib":"Alunbrig",
   "Lorlatinib":"Lorbrena","Ceritinib":"Zykadia","Entrectinib":"Rozlytrek",
   "Selpercatinib":"Retevmo","Pralsetinib":"Gavreto","Vemurafenib":"Zelboraf",
   "Dabrafenib":"Tafinlar","Encorafenib":"Braftovi","Trametinib":"Mekinist",
   "Cobimetinib":"Cotellic","Binimetinib":"Mektovi","Alpelisib":"Piqray",
   "Everolimus":"Afinitor","Temsirolimus":"Torisel","Palbociclib":"Ibrance",
   "Ribociclib":"Kisqali","Abemaciclib":"Verzenio","Olaparib":"Lynparza",
   "Niraparib":"Zejula","Rucaparib":"Rubraca","Talazoparib":"Talzenna",
   "Ibrutinib":"Imbruvica","Acalabrutinib":"Calquence","Zanubrutinib":"Brukinsa",
   "Regorafenib":"Stivarga","Pazopanib":"Votrient","Sorafenib":"Nexavar",
   "Sunitinib":"Sutent","Lenvatinib":"Lenvima","Imatinib":"Glivec / Gleevec",
   "Dasatinib":"Sprycel","Pembrolizumab":"Keytruda","Nivolumab":"Opdivo",
   "Atezolizumab":"Tecentriq","Durvalumab":"Imfinzi","Ipilimumab":"Yervoy",
   "Tamoxifen":"Nolvadex","Fulvestrant":"Faslodex","Letrozole":"Femara",
   "Anastrozole":"Arimidex","Exemestane":"Aromasin","Abiraterone":"Zytiga",
   "Enzalutamide":"Xtandi"
 };

 const BIOMARKERS_BY_SUBGROUP={
   "Platinum":"DNA-repair capacity, ERCC1/NER pathway, homologous-recombination status",
   "Alkylating agents":"DNA-repair pathways; MGMT is particularly relevant to temozolomide",
   "Anthracyclines":"TOP2A activity and cellular DNA-damage response",
   "Topoisomerase I inhibitors":"TOP1 activity; UGT1A1 is relevant to irinotecan pharmacology",
   "Topoisomerase II inhibitors":"TOP2A/TOP2B and DNA-damage response",
   "Taxanes":"Microtubule dynamics, TUBB3 and mitotic-spindle signaling",
   "Vinca alkaloids":"Tubulin and microtubule-assembly pathways",
   "Fluoropyrimidines":"Thymidylate synthase (TYMS), DPD/DPYD and fluoropyrimidine metabolism",
   "Gemcitabine family":"RRM1, hENT1/SLC29A1 and nucleoside metabolism",
   "Antimetabolites":"Drug-specific metabolic enzymes and DNA/RNA synthesis pathways",
   "EGFR inhibitors":"EGFR mutation/amplification and downstream RAS–RAF–MEK–ERK signaling",
   "HER2 inhibitors":"HER2/ERBB2 expression, amplification or activating alteration",
   "VEGF / VEGFR inhibitors":"VEGF-A/VEGFR signaling and angiogenic activity",
   "MET inhibitors":"MET exon 14 skipping, amplification or activating alteration",
   "ALK inhibitors":"ALK rearrangement or activating alteration",
   "ROS1 inhibitors":"ROS1 fusion",
   "RET inhibitors":"RET fusion or activating mutation",
   "BRAF inhibitors":"BRAF V600 or other actionable BRAF alteration",
   "MEK inhibitors":"MAPK-pathway activation including BRAF, RAS and MEK alterations",
   "PI3K inhibitors":"PIK3CA/PI3K-pathway activation",
   "mTOR inhibitors":"PI3K–AKT–mTOR pathway activation",
   "CDK4/6 inhibitors":"Hormone-receptor biology, RB1 function and cyclin-D–CDK4/6 signaling",
   "PARP inhibitors":"BRCA1/2 alteration and homologous-recombination deficiency",
   "BTK inhibitors":"B-cell receptor/BTK pathway activity",
   "Multi-kinase inhibitors":"Depends on the specific drug; commonly VEGFR, PDGFR, KIT, RAF, AXL or FGFR",
   "PD-1 inhibitors":"PD-L1, MSI/MMR, TMB and tumor-specific eligibility criteria",
   "PD-L1 inhibitors":"PD-L1, MSI/MMR, TMB and tumor-specific eligibility criteria",
   "CTLA-4 inhibitors":"Immune-checkpoint context and tumor-specific eligibility criteria",
   "Aromatase inhibitors":"Estrogen-receptor positive disease and estrogen dependence",
   "Androgen-axis therapy":"Androgen-receptor signaling and prostate-cancer context",
   "ADC":"Expression of the antibody target and tumor-specific eligibility"
 };

 const NATURAL_META={
   "Ascorbic acid":["วิตามินที่พบในผลไม้รสเปรี้ยว ฝรั่ง พริกหวาน และผักหลายชนิด; รูปแบบในผลิตภัณฑ์อาจเป็นชนิดรับประทานหรือให้ทางหลอดเลือดดำ", "Ascorbic acid / ascorbate", "เป็นตัวให้อิเล็กตรอนในปฏิกิริยารีดอกซ์และเป็น cofactor ของเอนไซม์หลายชนิด; ที่ความเข้มข้นสูงทางหลอดเลือดอาจเกิด extracellular hydrogen peroxide ซึ่งแตกต่างจากการรับประทาน", "Redox balance, HIF-prolyl hydroxylases, collagen synthesis, iron-dependent oxidative reactions", "อาจรบกวนการตรวจน้ำตาลปลายนิ้วและการตรวจทางห้องปฏิบัติการบางชนิด; ควรทบทวนร่วมกับยาที่อาศัย redox mechanism", "ระวังใน G6PD deficiency, ไตวาย, นิ่วออกซาเลต และภาวะเหล็กเกิน โดยเฉพาะเมื่อใช้ขนาดสูงทางหลอดเลือด"],
   "Butyric Acid":["กรดไขมันสายสั้นที่จุลชีพในลำไส้สร้างจากการหมักใยอาหาร; ผลิตภัณฑ์มักอยู่ในรูป sodium butyrate หรือ tributyrin", "Butyrate / sodium butyrate / tributyrin", "เป็นแหล่งพลังงานของ colonocyte และยับยั้ง histone deacetylase บางชนิด ส่งผลต่อการแสดงออกของยีน การอักเสบ และ tight junction", "HDAC, GPR41/FFAR3, GPR43/FFAR2, intestinal barrier signaling", "อาจเสริมผลของยาหรือสารที่มีฤทธิ์ต่อ HDAC และอาจเปลี่ยนการดูดซึมยาเมื่อมีอาการทางทางเดินอาหาร", "อาจทำให้ท้องอืด คลื่นไส้ หรือถ่ายเหลว; ระวังในผู้ป่วยลำไส้อุดตันหรือมีอาการทาง GI รุนแรง"],
   "Oxaloacetate (Cronaxal)":["สารตัวกลางในวัฏจักรกรดซิตริก; Cronaxal เป็นชื่อผลิตภัณฑ์เสริมอาหารที่มี oxaloacetate", "Oxaloacetate", "เกี่ยวข้องกับ mitochondrial metabolism, malate–aspartate shuttle และสมดุล NAD+/NADH; การใช้เป็นผลิตภัณฑ์เสริมอาหารมีเป้าหมายต่อเมแทบอลิซึมของเซลล์", "TCA cycle, malate dehydrogenase, NAD+/NADH balance, gluconeogenic pathways", "ข้อมูลปฏิกิริยากับยามีจำกัด; ควรระวังร่วมกับยาที่กระทบระดับน้ำตาลหรือเมแทบอลิซึมของตับ", "อาจเกิดอาการไม่สบายทางเดินอาหาร; ผู้ป่วยเบาหวาน ตั้งครรภ์ หรือมีโรคตับควรประเมินก่อนใช้"],
   "Artesunate":["อนุพันธ์กึ่งสังเคราะห์ที่ละลายน้ำได้ของ artemisinin จาก Artemisia annua", "Artesunate และ metabolite dihydroartemisinin", "พันธะ endoperoxide ถูกกระตุ้นโดย heme/iron ทำให้เกิด radical species, oxidative stress และความเสียหายต่อไมโทคอนเดรีย", "Heme/iron metabolism, ROS, mitochondrial membrane potential, apoptosis pathways", "อาจมีปฏิกิริยาผ่าน hepatic metabolism และอาจเสริมผลของยาที่ก่อ oxidative stress", "ระวัง hemolysis ระยะหลังการใช้, ความผิดปกติของเม็ดเลือด ตับ และการใช้ในหญิงตั้งครรภ์ตามบริบททางคลินิก"],
   "Super Artemisinin":["ผลิตภัณฑ์ artemisinin เข้มข้นหรือสูตรผสมจาก Artemisia annua; องค์ประกอบจริงขึ้นกับผู้ผลิต", "Artemisinin derivatives ตามฉลากผลิตภัณฑ์", "อาศัย endoperoxide bridge ที่เกิดปฏิกิริยากับ iron/heme ทำให้เกิด oxidative radicals และ mitochondrial stress", "Heme/iron, ROS, mitochondrial apoptosis, ferroptosis-related signaling", "อาจเปลี่ยนระดับยาที่ผ่าน CYP enzymes และอาจเสริม oxidative toxicity ของยาบางชนิด", "ต้องตรวจขนาดและส่วนประกอบจากฉลาก; ระวังในโรคตับ ภาวะซีด การตั้งครรภ์ และการใช้ต่อเนื่องโดยไม่มีการติดตาม"],
   "DCA":["สารสังเคราะห์ dichloroacetate ไม่ใช่สารสกัดจากพืช แต่ถูกจัดอยู่ในรายการเสริมของรายงาน", "Dichloroacetate", "ยับยั้ง pyruvate dehydrogenase kinase ทำให้ pyruvate dehydrogenase ทำงานมากขึ้นและเปลี่ยนการใช้พลังงานไปทาง mitochondrial oxidation", "PDK1-4, PDH, lactate metabolism, mitochondrial respiration", "อาจเพิ่มความเสี่ยง neuropathy เมื่อใช้ร่วมกับยาที่มีพิษต่อเส้นประสาท และอาจมีปฏิกิริยากับยาที่ metabolized ผ่าน GSTZ1", "ระวัง peripheral neuropathy, hepatotoxicity และภาวะกรดด่างผิดปกติ; ควรติดตามอาการทางประสาทและการทำงานของตับ"],
   "C-statin":["ผลิตภัณฑ์เสริมที่ทำจากสารสกัด field bindweed (Convolvulus arvensis) ซึ่งมี proteoglycan mixture; ต้องยืนยันสูตรตามฉลาก", "Proteoglycan mixture (PGM) จาก field bindweed", "ถูกพัฒนาเพื่อมุ่งต่อกระบวนการ angiogenesis และ endothelial-cell signaling แต่กลไกของผลิตภัณฑ์ขึ้นกับองค์ประกอบมาตรฐานของผู้ผลิต", "Angiogenesis-related signaling, endothelial proliferation, VEGF-associated pathways", "ข้อมูลปฏิกิริยาระหว่างยามีจำกัด; ควรหลีกเลี่ยงการใช้แทน anti-angiogenic therapy มาตรฐาน", "ตรวจสอบแหล่งผลิตและส่วนประกอบ; ระวังการแพ้และการใช้ร่วมกับยาต้านการสร้างหลอดเลือดหรือยาต้านการแข็งตัวของเลือด"],
   "Artecin":["ชื่อผลิตภัณฑ์ที่มักเกี่ยวข้องกับอนุพันธ์ artemisinin; สูตรและความเข้มข้นต้องตรวจจากฉลาก", "Artemisinin-related compounds ตามสูตรผลิตภัณฑ์", "คาดว่าอาศัย endoperoxide-mediated radical formation และ mitochondrial oxidative stress เช่นเดียวกับอนุพันธ์ artemisinin", "Heme/iron, ROS, mitochondrial apoptosis", "อาจมีผลต่อ CYP metabolism และเสริมพิษของยาที่ก่อ oxidative stress", "ไม่ควรตีความชื่อการค้าว่าเป็นสารชนิดเดียวกันทุกผู้ผลิต; ระวังตับ เม็ดเลือด และการตั้งครรภ์"],
   "Amygdalin (B17)":["พบในเมล็ดแอปริคอต เมล็ดพีช และพืชวงศ์ Rosaceae; มีการเรียกเชิงการค้าว่า vitamin B17 แต่ไม่ใช่วิตามินที่ได้รับการยอมรับ", "Amygdalin ซึ่งสามารถปลดปล่อย cyanide ได้", "ถูก hydrolyze โดย beta-glucosidase ให้ benzaldehyde และ cyanide; ความเป็นพิษจาก cyanide เป็นประเด็นสำคัญ", "Beta-glucosidase metabolism, mitochondrial cytochrome oxidase inhibition from cyanide", "วิตามินซีขนาดสูงและอาหาร/ผลิตภัณฑ์ที่มี beta-glucosidase อาจเพิ่มการปลดปล่อย cyanide; อาจเสริมพิษกับสารที่ลดออกซิเจนระดับเซลล์", "เสี่ยง cyanide poisoning โดยเฉพาะชนิดรับประทาน; ห้ามใช้ในหญิงตั้งครรภ์ เด็ก และผู้มีโรคตับ/ไตรุนแรงโดยไม่มีการกำกับ"],
   "Agaricus Blazei Murill":["เห็ด Agaricus blazei หรือ Agaricus subrufescens ที่ใช้เป็นอาหารและผลิตภัณฑ์สกัด", "Beta-glucans, proteoglycans และ polysaccharides", "กระตุ้น pattern-recognition receptors ของ innate immunity และปรับ cytokine signaling", "Dectin-1, complement receptors, macrophage/NK-cell signaling", "อาจเสริมฤทธิ์ immunomodulatory กับยากระตุ้นภูมิหรือรบกวนยากดภูมิ", "ระวังในโรค autoimmune หลังปลูกถ่ายอวัยวะ การแพ้เห็ด และผลิตภัณฑ์ที่ปนเปื้อน"],
   "Avemar pulvis":["ผลิตภัณฑ์ fermented wheat germ extract จากจมูกข้าวสาลีหมักด้วย Saccharomyces cerevisiae", "2,6-dimethoxy-p-benzoquinone และสารจาก fermented wheat germ", "เกี่ยวข้องกับการเปลี่ยนแปลง glucose metabolism, pentose-phosphate pathway, ribonucleotide synthesis และ immune signaling", "Transketolase, pentose-phosphate pathway, ribonucleotide metabolism, MHC-related immune signaling", "อาจมีปฏิกิริยากับ immunosuppressants; ควรแยกเวลาจากยาอื่นตามคำแนะนำผลิตภัณฑ์", "หลีกเลี่ยงในผู้แพ้ข้าวสาลีหรือ gluten-sensitive disease หากผลิตภัณฑ์ไม่รับรองปราศจาก gluten; อาจเกิดอาการ GI"],
   "Bio D Mulsion NuMedica D3":["ผลิตภัณฑ์วิตามิน D3 แบบอิมัลชันของ NuMedica; ปริมาณต่อหยดต้องตรวจจากฉลาก", "Cholecalciferol (vitamin D3)", "ถูกเปลี่ยนเป็น calcitriol และจับ vitamin-D receptor เพื่อควบคุมการแสดงออกของยีน การดูดซึมแคลเซียม และ immune signaling", "VDR, calcium-phosphate homeostasis, CYP27B1/CYP24A1", "thiazide diuretics และ calcium supplements อาจเพิ่มความเสี่ยง hypercalcemia; anticonvulsants บางชนิดลดระดับ vitamin D", "ระวัง hypercalcemia, hyperparathyroidism, sarcoidosis และไตวาย; ต้องคำนวณขนาดจาก IU ต่อหยด"],
   "Cordyceps Sinensis":["เชื้อรา Ophiocordyceps sinensis หรือสายพันธุ์เพาะเลี้ยงที่ใช้ทดแทนในผลิตภัณฑ์", "Cordycepin, adenosine derivatives, polysaccharides", "ปรับ AMPK, adenosine signaling, mitochondrial function และ immune cytokines", "AMPK, adenosine receptors, mitochondrial metabolism, macrophage/NK signaling", "อาจเสริมผลของยาลดน้ำตาล ยาต้านการแข็งตัว และยากระตุ้นภูมิ", "ระวัง autoimmune disease, การปลูกถ่ายอวัยวะ, bleeding risk และความแตกต่างของสายพันธุ์/การปนเปื้อน"],
   "DDG":["ชื่อย่อของผลิตภัณฑ์ในรายงานซึ่งไม่ระบุองค์ประกอบทางเคมีอย่างชัดเจน", "ต้องยืนยันชื่อเต็มและส่วนประกอบจากฉลากหรือใบรับรองผลิตภัณฑ์", "ไม่สามารถระบุกลไกจำเพาะได้อย่างปลอดภัยจนกว่าจะยืนยันองค์ประกอบของ DDG", "ยังไม่สามารถระบุ molecular targets โดยไม่ทราบสูตร", "ไม่ควรประเมิน drug interaction จากชื่อย่อเพียงอย่างเดียว; ต้องนำฉลากจริงมาตรวจ", "ตั้งสถานะเป็นต้องตรวจสอบผลิตภัณฑ์ก่อนใช้ ห้ามอนุมานขนาด กลไก หรือความปลอดภัยจากชื่อ DDG"],
   "Doxycycline":["ยาปฏิชีวนะกึ่งสังเคราะห์กลุ่ม tetracycline; ไม่ใช่สารสกัดธรรมชาติ แม้อยู่ในหมวด supplemental agents ของรายงาน", "Doxycycline", "จับ 30S ribosomal subunit ของแบคทีเรีย; ในงานทดลองยังเกี่ยวข้องกับ matrix metalloproteinases และ mitochondrial protein synthesis", "30S ribosome, MMPs, mitochondrial ribosomes", "ยาลดกรด เหล็ก แคลเซียม และแมกนีเซียมลดการดูดซึม; อาจเสริม anticoagulant effect", "ระวัง esophagitis, photosensitivity, โรคตับ และการใช้ในหญิงตั้งครรภ์/เด็กตามข้อบ่งใช้"],
   "Frankincense":["ยางไม้ Boswellia species เช่น Boswellia sacra หรือ B. serrata", "Boswellic acids และ triterpenes", "ยับยั้ง 5-lipoxygenase และปรับ NF-κB/inflammatory signaling", "5-LOX, leukotriene synthesis, NF-κB", "อาจเสริมผลยาต้านการอักเสบและยาต้านเกล็ดเลือด; สูตรน้ำมันหอมระเหยต่างจากสารสกัด boswellic acid", "ระวังอาการ GI การแพ้ และ bleeding risk; ต้องแยกชนิด essential oil ออกจาก standardized extract"],
   "Lycopene":["รงควัตถุ carotenoid ในมะเขือเทศ แตงโม ฝรั่งสีชมพู และผลไม้สีแดง", "Lycopene", "ทำหน้าที่เป็น antioxidant ในเยื่อหุ้มเซลล์และปรับ IGF, androgen และ gap-junction signaling ในระบบทดลอง", "ROS, IGF-1 signaling, androgen-related signaling, connexin pathways", "อาจเพิ่ม bleeding tendency เล็กน้อยเมื่อใช้ขนาดสูงร่วมกับ anticoagulants", "อาจทำให้ผิวเปลี่ยนสีเมื่อรับประทานมาก; ระวังผลิตภัณฑ์เข้มข้นในผู้มีความดันต่ำหรือ bleeding risk"],
   "Pau D'Arco":["เปลือกชั้นในของต้น Tabebuia/Handroanthus species", "Lapachol และ beta-lapachone", "quinone compounds เกี่ยวข้องกับ redox cycling, ROS generation และ NQO1-dependent signaling", "NQO1, ROS, topoisomerase-related and redox pathways", "อาจเพิ่ม bleeding risk และเสริมพิษของยาที่ก่อ oxidative stress", "ขนาดสูงอาจทำให้คลื่นไส้ อาเจียน เลือดออก และพิษต่อตับ/ไต; หลีกเลี่ยงในหญิงตั้งครรภ์"],
   "Black Cumin":["เมล็ด Nigella sativa และน้ำมันเมล็ดเทียนดำ", "Thymoquinone และ volatile oils", "ปรับ NF-κB, STAT3, PI3K-AKT, oxidative stress และ inflammatory mediators", "NF-κB, STAT3, PI3K-AKT, Nrf2", "อาจเสริมผลยาลดน้ำตาล ลดความดัน และ anticoagulants; อาจมีผลต่อ CYP enzymes", "ระวัง hypoglycemia, hypotension, bleeding และการแพ้น้ำมันหอมระเหย"],
   "IP6 (Inositol)":["phytic acid ที่พบในเมล็ดธัญพืช ถั่ว และรำ; บางสูตรใช้ร่วมกับ inositol", "Inositol hexaphosphate (IP6) และอาจมี myo-inositol", "จับแร่ธาตุและเกี่ยวข้องกับ inositol-phosphate signaling, redox balance และ cell-cycle regulation", "Inositol-phosphate pathways, iron chelation, PI3K-related signaling", "ลดการดูดซึมเหล็ก สังกะสี แคลเซียม และยาบางชนิดเมื่อรับประทานพร้อมกัน", "ควรแยกจากแร่ธาตุและยา; ระวังภาวะขาดธาตุเหล็กและทุพโภชนาการ"],
   "OnkoBel Pro":["สูตรผลิตภัณฑ์ Beljanski ที่ประกอบด้วยสารสกัด Pao pereira, Rauwolfia vomitoria, Ginkgo biloba และ magnesium ตามสูตรผู้ผลิต", "Plant alkaloids/polyphenols จาก Pao pereira, Rauwolfia, Ginkgo และ magnesium", "เป็นสูตรผสมจึงอาจกระทบ DNA-associated signaling, cell proliferation, platelet activity และ vascular signaling ตามองค์ประกอบแต่ละชนิด", "หลายเป้าหมาย ได้แก่ DNA-related signaling, PI3K/AKT, platelet-activating factor และ vascular pathways", "Ginkgo อาจเพิ่ม bleeding risk; Rauwolfia อาจมีปฏิกิริยากับยาความดัน ยากล่อมประสาท และยาที่มีผลต่อ catecholamines", "ต้องตรวจฉลากและขนาดจริง; ระวังความดันต่ำ หัวใจเต้นช้า bleeding risk และยาทางจิตเวช"],
   "Poly-MVA":["ผลิตภัณฑ์ proprietary complex ที่มี palladium-lipoic acid ร่วมกับวิตามิน แร่ธาตุ และกรดอะมิโน", "Palladium-lipoic acid complex และ micronutrients ตามสูตร", "ถูกออกแบบเพื่อถ่ายโอนอิเล็กตรอนและสนับสนุน mitochondrial redox metabolism; กลไกขึ้นกับสูตร proprietary", "Mitochondrial electron transport, redox balance, lipoate-dependent enzymes", "อาจเปลี่ยน glucose control และมีปฏิกิริยากับสาร antioxidant หรือยาที่มีโลหะเป็นองค์ประกอบ", "ต้องตรวจองค์ประกอบและแร่ธาตุทั้งหมดเพื่อป้องกันขนาดซ้ำซ้อน; ระวังเบาหวาน โรคไต และการแพ้ส่วนประกอบ"],
   "Ivermectin":["ยาต้านปรสิตกึ่งสังเคราะห์จาก avermectins ที่ผลิตโดย Streptomyces avermitilis; ไม่ใช่ผลิตภัณฑ์เสริมอาหารทั่วไป", "Ivermectin", "จับ glutamate-gated chloride channels ในปรสิต; กลไกต้านมะเร็งที่ศึกษาในห้องทดลองเกี่ยวข้องกับหลาย pathway แต่ไม่ใช่ข้อบ่งใช้มาตรฐาน", "Parasite chloride channels; experimental WNT, PAK1, YAP/TAZ and mitochondrial pathways", "เป็น substrate ของ CYP3A4/P-gp; ระวังร่วมกับยากดประสาทและยาที่ยับยั้ง CYP3A4/P-gp", "ห้ามใช้ขนาดสัตวแพทย์; ระวัง neurotoxicity, โรคตับ และการใช้โดยไม่มีข้อบ่งใช้ทางการแพทย์"],
   "Ribraxx":["ผลิตภัณฑ์ rice-bran arabinoxylan compound หรือ MGN-3/BioBran ที่ผ่านการย่อยด้วยเอนไซม์จาก shiitake", "Arabinoxylan จาก rice bran", "ปรับการทำงานของ NK cells, dendritic cells และ cytokine signaling", "NK-cell cytotoxicity, dendritic-cell maturation, innate immune pathways", "อาจรบกวนยากดภูมิหรือเสริม immunomodulatory therapy", "ระวังผู้แพ้รำข้าว/เห็ด โรค autoimmune และหลังปลูกถ่ายอวัยวะ; ตรวจคุณภาพผลิตภัณฑ์"],
   "Salicinium":["ชื่อผลิตภัณฑ์ proprietary ที่มักอ้างถึงอนุพันธ์ salicin/salicylate; องค์ประกอบจริงต้องตรวจจากฉลาก", "Salicin- หรือ salicylate-related compounds ตามสูตร", "หากเป็น salicylate จะเกี่ยวข้องกับ cyclooxygenase, prostaglandin synthesis และ inflammatory signaling", "COX-1/COX-2, prostaglandins, platelet signaling", "อาจเพิ่ม bleeding risk ร่วมกับ aspirin, NSAIDs, anticoagulants และอาจมี cross-reactivity ในผู้แพ้ salicylate", "ต้องยืนยันสูตร; ระวังแผลในกระเพาะ เลือดออก โรคไต หอบหืดจาก aspirin และเด็กที่มี viral illness"],
   "Theaflavin":["polyphenol จากชาดำที่เกิดระหว่างกระบวนการหมักใบชา", "Theaflavin, theaflavin-3-gallate และอนุพันธ์", "ปรับ NF-κB, MAPK, EGFR และ oxidative-stress signaling", "NF-κB, MAPK, EGFR, ROS pathways", "ชาอาจลดการดูดซึมธาตุเหล็กและมีปฏิกิริยากับ anticoagulants ขึ้นกับสูตรและ caffeine", "ระวังภาวะขาดธาตุเหล็ก โรคตับ และผลิตภัณฑ์ที่มี caffeine สูง"],
   "Colloidal Silver":["สารแขวนลอยอนุภาคเงินในของเหลว; ไม่ใช่แร่ธาตุจำเป็นของร่างกาย", "Silver nanoparticles / ionic silver", "มีฤทธิ์ antimicrobial จากการรบกวน membrane, protein และ ROS ของจุลชีพ; ไม่มี molecular target ทางมะเร็งที่ยืนยันสำหรับใช้ทางคลินิก", "Microbial membranes, thiol-containing proteins, oxidative stress", "อาจลดการดูดซึมยาบางชนิด เช่น tetracyclines และ quinolones และสะสมร่วมกับโลหะอื่น", "เสี่ยง argyria ถาวร พิษต่อไต/ระบบประสาท และการปนเปื้อน; ไม่ควรใช้ฉีดหรือใช้แทนการรักษามาตรฐาน"],
   "Vitanox":["ชื่อผลิตภัณฑ์ antioxidant blend; สูตรที่พบบ่อยมักมี grape seed, green tea, turmeric และ rosemary แต่ต้องตรวจฉลาก", "Polyphenols หลายชนิดตามสูตร เช่น proanthocyanidins, catechins, curcuminoids และ rosmarinic compounds", "ปรับ redox balance, NF-κB, Nrf2 และ inflammatory signaling แบบหลายองค์ประกอบ", "Nrf2, NF-κB, COX-2, ROS and polyphenol-sensitive pathways", "อาจเพิ่ม bleeding risk และมีปฏิกิริยากับ CYP enzymes จากส่วนผสมหลายชนิด", "ต้องตรวจส่วนประกอบเพื่อหลีกเลี่ยงสารซ้ำ; ระวังโรคตับ การใช้ anticoagulants และก่อนผ่าตัด"],
   "Alpha Lipoic Acid":["สาร cofactor ที่สร้างในไมโทคอนเดรียและใช้เป็นผลิตภัณฑ์เสริมในรูป alpha-lipoic acid หรือ thioctic acid", "Alpha-lipoic acid; R-lipoic acid", "เป็น cofactor ของ mitochondrial dehydrogenase complexes และช่วยรีไซเคิล antioxidant หลายระบบ", "PDH, alpha-ketoglutarate dehydrogenase, glutathione and redox pathways", "อาจเสริมฤทธิ์ยาลดน้ำตาลและจับแร่ธาตุบางชนิด; อาจมีผลต่อ thyroid medication", "ระวัง hypoglycemia, thiamine deficiency, thyroid disease และอาการ GI"],
   "Boswellia Serrata":["ยางไม้ Boswellia serrata ที่ใช้เป็น standardized extract", "Acetyl-11-keto-beta-boswellic acid (AKBA) และ boswellic acids", "ยับยั้ง 5-lipoxygenase และปรับ leukotriene/NF-κB signaling", "5-LOX, leukotrienes, NF-κB, inflammatory cytokines", "อาจเสริมยาต้านการอักเสบและยาต้านเกล็ดเลือด; อาจมีผลต่อ P-gp/CYP ในระดับผลิตภัณฑ์", "อาจทำให้ dyspepsia และท้องเสีย; ระวัง bleeding risk และหญิงตั้งครรภ์"],
   "Fucoidan":["polysaccharide ที่มี sulfate สูงจากสาหร่ายสีน้ำตาล เช่น Undaria และ Fucus", "Fucoidan; fucose-rich sulfated polysaccharides", "เกี่ยวข้องกับ selectin-mediated adhesion, coagulation, immune signaling และ apoptosis ในระบบทดลอง", "Selectins, coagulation factors, TLR-related immunity, apoptosis pathways", "อาจเสริม anticoagulant/antiplatelet effect และอาจมี iodine ร่วมในผลิตภัณฑ์สาหร่าย", "ระวังเลือดออก โรคไทรอยด์ แพ้อาหารทะเล/สาหร่าย และความแปรปรวนของ molecular weight"],
   "Mistletoe":["สารสกัด Viscum album ที่ใช้ในบางระบบการแพทย์แบบเสริม โดยมักให้ใต้ผิวหนัง", "Mistletoe lectins, viscotoxins และ polysaccharides", "กระตุ้น cytokine/innate immune signaling และอาจเหนี่ยวนำ apoptosis ในระบบทดลอง", "Ribosome-inactivating lectins, cytokines, NK-cell and apoptosis pathways", "อาจเสริม immune stimulation และทำให้ประเมินไข้จาก immunotherapy ยากขึ้น", "เสี่ยงไข้ แพ้รุนแรง และ injection-site reaction; หลีกเลี่ยงการฉีดเข้าก้อนหรือหลอดเลือดโดยไม่มีผู้เชี่ยวชาญ"],
   "Astaxanthin":["carotenoid สีแดงจาก microalgae Haematococcus pluvialis และสัตว์ทะเล", "Astaxanthin", "แทรกในเยื่อหุ้มเซลล์และปรับ oxidative stress, Nrf2 และ inflammatory pathways", "Nrf2, NF-κB, lipid peroxidation, mitochondrial membranes", "อาจเสริมผลยาลดความดัน ยาลดน้ำตาล และ anticoagulants", "ระวังความดันต่ำ น้ำตาลต่ำ และสีอุจจาระ/ผิวเปลี่ยนเมื่อใช้ขนาดสูง"],
   "Reishi Pure":["ผลิตภัณฑ์ Ganoderma lucidum หรือ reishi extract; ต้องตรวจว่าใช้ fruiting body หรือ mycelium", "Beta-glucans, ganoderic acids และ triterpenoids", "ปรับ innate immunity, cytokines, NF-κB และ inflammatory signaling", "Dectin-1, complement, cytokines, NF-κB", "อาจเพิ่ม bleeding risk และรบกวน immunosuppressants", "ระวังตับอักเสบจากผลิตภัณฑ์บางชนิด การแพ้เห็ด bleeding risk และหลังปลูกถ่ายอวัยวะ"],
   "Sodium Bicarbonate":["เกลือด่างที่ใช้ทางการแพทย์และในอาหาร; ไม่ใช่สารสกัดธรรมชาติ", "Sodium bicarbonate", "เพิ่ม bicarbonate buffer และเปลี่ยนกรดด่างในทางเดินอาหาร/เลือดตาม route; ไม่ได้ปรับ pH ของก้อนมะเร็งอย่างเลือกจำเพาะด้วยการรับประทาน", "Systemic acid-base balance, gastric pH, renal bicarbonate handling", "ลดหรือเปลี่ยนการดูดซึมยาที่ขึ้นกับ gastric pH และเพิ่ม sodium load", "ระวัง metabolic alkalosis, hypernatremia, หัวใจล้มเหลว ไตวาย และการใช้ร่วมกับยาที่ต้องการสภาวะกรดในกระเพาะ"],
   "Amygdalin":["สาร cyanogenic glycoside จากเมล็ดพืชวงศ์ Rosaceae เช่น apricot kernel", "Amygdalin", "ถูกสลายเป็น cyanide ซึ่งยับยั้ง mitochondrial cytochrome c oxidase", "Beta-glucosidase metabolism and mitochondrial complex IV inhibition", "วิตามินซีและอาหารที่มี beta-glucosidase อาจเพิ่ม cyanide exposure", "เสี่ยงพิษ cyanide ชัก โคม่า และเสียชีวิต; ความเสี่ยงสูงกว่าชนิดรับประทาน"],
   "Apigenin":["flavone ในผักชีฝรั่ง celery chamomile และพืชหลายชนิด", "Apigenin", "ปรับ PI3K-AKT, MAPK, NF-κB, CDK และ apoptosis signaling", "PI3K-AKT, MAPK, NF-κB, CDKs, BCL-2 family", "อาจยับยั้ง CYP enzymes และเสริมฤทธิ์ sedatives จาก chamomile-containing products", "ระวังการแพ้พืชวงศ์ Asteraceae, anticoagulants และยาที่มี therapeutic index แคบ"],
   "Citrus Pectin":["pectin จากเปลือกผลไม้ตระกูลส้ม; modified citrus pectin มีขนาดโมเลกุลเล็กกว่าชนิดอาหาร", "Pectin polysaccharides และ galactoside-rich fragments", "modified form อาจจับ galectin-3 และเปลี่ยน cell adhesion/fibrosis signaling", "Galectin-3, cell adhesion, extracellular-matrix signaling", "เส้นใยอาจลดการดูดซึมยาและแร่ธาตุเมื่อรับประทานพร้อมกัน", "แยกเวลาจากยา; อาจทำให้ท้องอืด ถ่ายเหลว และระวังการแพ้ citrus"],
   "Diosmin":["flavonoid จาก citrus ซึ่งมักใช้ร่วมกับ hesperidin ในผลิตภัณฑ์หลอดเลือดดำ", "Diosmin และ metabolite diosmetin", "ปรับ venous tone, capillary permeability, inflammatory mediators และ oxidative stress", "Noradrenergic venous tone, prostaglandins, NF-κB, vascular permeability", "อาจเพิ่ม bleeding tendency ร่วมกับ anticoagulants/antiplatelets และมีผลต่อ CYP enzymes", "ระวังเลือดออก อาการ GI และการใช้ก่อนผ่าตัด"],
   "Curcumin (Turmeric)":["สาร polyphenol จากเหง้าขมิ้นชัน Curcuma longa", "Curcuminoids โดยเฉพาะ curcumin", "ปรับ NF-κB, STAT3, COX-2, PI3K-AKT, Nrf2 และ inflammatory signaling", "NF-κB, STAT3, COX-2, PI3K-AKT, Nrf2, angiogenesis pathways", "อาจเพิ่ม bleeding risk และมีปฏิกิริยากับ CYP/P-gp; piperine เพิ่มระดับยาและสารอื่นได้", "ระวังนิ่วในถุงน้ำดี การอุดตันทางเดินน้ำดี bleeding risk และผลิตภัณฑ์ขนาดสูงที่มี bioenhancer"],
   "MitoLipoCurmin":["ผลิตภัณฑ์ curcumin แบบ liposomal หรือ mitochondrial-targeted; สูตร carrier ต้องตรวจจากผู้ผลิต", "Curcumin/curcuminoids ในระบบนำส่งไขมันหรือ liposome", "ใช้กลไกของ curcumin แต่เพิ่ม bioavailability และการนำส่งเข้าสู่เซลล์/ไมโทคอนเดรียตามเทคโนโลยีสูตร", "NF-κB, STAT3, PI3K-AKT, Nrf2, mitochondrial redox pathways", "ความเข้มข้นสูงขึ้นอาจเพิ่มปฏิกิริยากับ anticoagulants และ CYP/P-gp substrates", "ตรวจปริมาณ curcuminoid จริงและสารช่วยดูดซึม; ระวังโรคทางเดินน้ำดีและ bleeding risk"],
   "Genistein":["isoflavone จากถั่วเหลืองและ legumes", "Genistein", "จับ estrogen receptors โดยเฉพาะ ER-beta และยับยั้ง tyrosine kinases บางชนิดในระบบทดลอง", "ER-alpha/ER-beta, tyrosine kinases, PI3K-AKT, topoisomerase-related pathways", "อาจมีปฏิสัมพันธ์กับ endocrine therapy และยาที่ metabolized ผ่าน CYP; อาหาร soy ต่างจากสารสกัดเข้มข้น", "ระวังในมะเร็งที่ไวต่อฮอร์โมนเมื่อใช้สารสกัดขนาดสูง และในผู้ใช้ levothyroxine"],
   "Indol 3 Carbinol":["สารจาก glucobrassicin ในผักตระกูลกะหล่ำ ซึ่งเปลี่ยนเป็น DIM ในกระเพาะ", "Indole-3-carbinol และ diindolylmethane (DIM)", "ปรับ estrogen metabolism, aryl hydrocarbon receptor และ phase-I/II detoxification enzymes", "AHR, CYP1A1, estrogen-metabolism pathways, NF-κB", "กระตุ้น CYP1A enzymes และอาจเปลี่ยนระดับยาหลายชนิด", "ระวัง endocrine-sensitive conditions, ยาที่มี therapeutic index แคบ และผลิตภัณฑ์ขนาดสูง"],
   "Melatonin":["ฮอร์โมนจาก pineal gland และผลิตภัณฑ์สังเคราะห์", "Melatonin", "จับ MT1/MT2 receptors ควบคุม circadian rhythm และปรับ antioxidant/immune signaling", "MT1, MT2, circadian clock genes, mitochondrial redox pathways", "เสริมฤทธิ์ยานอนหลับ ยากล่อมประสาท และอาจมีปฏิกิริยากับ anticoagulants/immunosuppressants", "ระวังง่วงซึม การขับรถ autoimmune disease และการใช้ร่วมกับยากดประสาท"],
   "Naltrexone":["ยาต้าน opioid receptor; ในรายการเสริมมักหมายถึง low-dose naltrexone แต่ต้องยืนยันขนาด", "Naltrexone", "ยับยั้ง mu-opioid receptor; low-dose regimen มีสมมติฐานเรื่อง rebound endorphin และ TLR4/microglial modulation", "Mu-opioid receptor, TLR4, microglial and endorphin signaling", "ห้ามใช้ร่วมกับ opioid analgesics เพราะทำให้ยาแก้ปวดไม่ได้ผลและกระตุ้น withdrawal", "ต้องหยุด opioid ตามระยะเหมาะสมก่อนใช้; ระวังโรคตับและต้องยืนยันว่าเป็นขนาดมาตรฐานหรือ low-dose"],
   "Pau-Pau":["ชื่อผลิตภัณฑ์ที่อาจหมายถึง pawpaw extract; ต้องตรวจชื่อผู้ผลิตและ botanical species", "อาจเป็น acetogenins จาก Asimina triloba ตามสูตรผลิตภัณฑ์", "acetogenins สามารถยับยั้ง mitochondrial complex I ในระบบทดลอง", "Mitochondrial complex I, ATP production", "อาจเสริมพิษของยาที่มีผลต่อไมโทคอนเดรียหรือระบบประสาท", "ต้องยืนยันผลิตภัณฑ์; ระวัง neurotoxicity, คลื่นไส้ น้ำหนักลด และการใช้ต่อเนื่อง"],
   "Pure Quercetin":["ผลิตภัณฑ์ quercetin เดี่ยวความบริสุทธิ์สูงจากแหล่งพืช", "Quercetin", "ปรับ PI3K-AKT, MAPK, NF-κB, Nrf2, ROS และ cell-cycle signaling", "PI3K-AKT, MAPK, NF-κB, Nrf2, ABC transporters", "อาจยับยั้ง CYP3A4/CYP2C8 และ transporters; อาจเปลี่ยนระดับยาบางชนิด", "ระวังโรคไต ขนาดสูงต่อเนื่อง anticoagulants และยาที่มี therapeutic index แคบ"],
   "Quercetin":["flavonol ในหัวหอม แอปเปิล berries และผักหลายชนิด", "Quercetin และ glycosides", "ปรับ PI3K-AKT, MAPK, NF-κB, oxidative stress และ cell-cycle regulators", "PI3K-AKT, MAPK, NF-κB, Nrf2, ABC transporters", "อาจมีปฏิกิริยากับ CYP enzymes และ P-gp/OATP transporters", "ระวังไตบกพร่อง anticoagulants และขนาดสูงระยะยาว"],
   "Resveratrol":["polyphenol จากเปลือกองุ่น berries และ Polygonum cuspidatum", "Trans-resveratrol", "ปรับ SIRT1, AMPK, NF-κB, mitochondrial biogenesis และ estrogen-related signaling", "SIRT1, AMPK, NF-κB, PGC-1alpha, estrogen receptors", "อาจเพิ่ม bleeding risk และยับยั้ง CYP enzymes; อาจมีผลต่อ endocrine therapy", "ระวัง anticoagulants การผ่าตัด และ hormone-sensitive disease เมื่อใช้สารสกัดขนาดสูง"],
   "Salvestrol":["ชื่อเชิงการค้าของกลุ่ม phytonutrients ที่อ้างว่าเป็น substrates ของ CYP1B1; องค์ประกอบจริงแตกต่างตามผลิตภัณฑ์", "ส่วนผสม polyphenols/phytoalexins ตามสูตร proprietary", "แนวคิดผลิตภัณฑ์อาศัยการ metabolize โดย CYP1B1 ให้เป็น reactive metabolites แต่ต้องตรวจองค์ประกอบรายสูตร", "CYP1B1 และ redox-related pathways", "อาจมีปฏิกิริยากับยาที่เป็น substrate/inhibitor ของ CYP1B1 หรือ CYP enzymes อื่น", "ข้อมูลผลิตภัณฑ์และความเข้มข้นไม่สม่ำเสมอ; ต้องตรวจฉลากและไม่ควรใช้แทนการรักษามาตรฐาน"],
   "Vascustatin":["ชื่อผลิตภัณฑ์ proprietary ที่มุ่งด้าน vascular/angiogenesis support; องค์ประกอบต้องยืนยันจากฉลาก", "ไม่สามารถระบุสารสำคัญได้อย่างถูกต้องหากไม่มีข้อมูลผู้ผลิต", "ไม่ควรระบุกลไกจำเพาะจากชื่อการค้าเพียงอย่างเดียว; ต้องประเมินตามส่วนประกอบจริง", "ยังไม่สามารถระบุ molecular targets จนกว่าจะทราบสูตร", "การประเมิน interaction ต้องทำจากส่วนประกอบแต่ละชนิด ไม่ใช่ชื่อ Vascustatin", "ตั้งสถานะต้องตรวจสอบฉลาก/COA ก่อนใช้ โดยเฉพาะหากใช้ร่วมกับ anti-VEGF, anticoagulants หรือยาความดัน"],
   "Vitamin D3":["วิตามิน D ที่สร้างจากผิวหนังเมื่อได้รับแสง UVB และพบในอาหาร/ผลิตภัณฑ์เสริม", "Cholecalciferol ซึ่งเปลี่ยนเป็น 25-OH vitamin D และ calcitriol", "จับ VDR เพื่อควบคุม calcium-phosphate metabolism, differentiation และ immune signaling", "VDR, CYP27B1, CYP24A1, calcium-regulatory pathways", "thiazides และ calcium เพิ่ม hypercalcemia risk; anticonvulsants และ glucocorticoids อาจลดระดับ", "ระวัง hypercalcemia, granulomatous disease, hyperparathyroidism และไตวาย; ใช้ผล 25-OH vitamin D ประกอบ"],
   "CoQ10":["สาร ubiquinone ที่สร้างในร่างกายและพบในอาหาร; ผลิตภัณฑ์มี ubiquinone หรือ ubiquinol", "Coenzyme Q10", "ถ่ายโอนอิเล็กตรอนใน mitochondrial respiratory chain และทำหน้าที่ lipid-soluble antioxidant", "Mitochondrial complexes I/II to III, membrane redox balance", "อาจลดฤทธิ์ warfarin และเสริมผลยาลดความดัน/น้ำตาล", "ระวังในผู้ใช้ warfarin ความดันต่ำ และควรแยกรูป ubiquinone/ubiquinol เพราะการดูดซึมต่างกัน"],
   "Angiostop":["ชื่อผลิตภัณฑ์ proprietary ที่มุ่งการควบคุม angiogenesis; สูตรอาจแตกต่างตามผู้ผลิต", "ต้องตรวจสารออกฤทธิ์และ standardized extract จากฉลาก", "กลไกควรอธิบายตามองค์ประกอบจริง เช่น VEGF/endothelial signaling ไม่ควรอนุมานจากชื่อผลิตภัณฑ์", "อาจเกี่ยวข้องกับ VEGF, endothelial proliferation หรือ matrix remodeling ขึ้นกับสูตร", "อาจเสริมฤทธิ์ anti-angiogenic drugs, anticoagulants หรือยาความดันตามส่วนประกอบ", "ต้องตรวจสูตรก่อนใช้; ระวังเลือดออก แผลหายช้า ความดัน และการใช้รอบการผ่าตัด"],
   "Breastin":["ชื่อผลิตภัณฑ์ proprietary ที่สื่อถึงการดูแลเต้านมหรือฮอร์โมน; ไม่สามารถยืนยันองค์ประกอบจากชื่อเพียงอย่างเดียว", "ต้องตรวจฉลากผลิตภัณฑ์เพื่อระบุ botanical extracts และขนาด", "กลไกอาจเกี่ยวข้องกับ estrogen metabolism หรือ antioxidant signaling หากมีสารในกลุ่มนั้น แต่ต้องยืนยันสูตร", "ไม่สามารถระบุเป้าหมายอย่างปลอดภัยจนกว่าจะทราบส่วนประกอบ", "อาจมีปฏิกิริยากับ tamoxifen, aromatase inhibitors หรือยาฮอร์โมนหากมี phytoestrogens", "ห้ามใช้ชื่อผลิตภัณฑ์เป็นตัวแทนของกลไก; ต้องตรวจส่วนประกอบ โดยเฉพาะใน hormone-sensitive cancer"],
   "Pau-Paw":["สารสกัดจาก American pawpaw, Asimina triloba; ต่างจาก papaya", "Annonaceous acetogenins", "ยับยั้ง mitochondrial complex I ทำให้ ATP production ลดลงในระบบทดลอง", "Mitochondrial complex I, cellular ATP production", "อาจเสริม mitochondrial toxicity, neurotoxicity และผลของยาลด ATP metabolism", "ระวัง neuropathy, คลื่นไส้ อาเจียน น้ำหนักลด และการใช้ระยะยาว"]
 };

 const GENE_HALLMARKS={
   "Growth factors / Proliferation":"Sustained proliferative signaling",
   "Signal transduction":"Sustained proliferative signaling and altered intracellular signaling",
   "Hormone receptors":"Hormone-dependent proliferative signaling",
   "Self repair / Resistance":"Therapy resistance, plasticity and stress adaptation",
   "Heat shock / Resistance":"Proteotoxic-stress adaptation and therapy resistance",
   "DNA repair / Resistance":"Genome maintenance and therapy resistance",
   "Epigenetic regulation / Resistance":"Epigenetic plasticity and altered gene regulation",
   "Angiogenesis / Metastasis":"Angiogenesis, invasion and metastatic dissemination",
   "Resistance markers":"Drug efflux, detoxification and multidrug resistance",
   "Drug metabolism / Targets":"Drug metabolism and treatment-response biology",
   "Immune checkpoints":"Immune evasion"
 };

 function enrich(entry){
   const e={...entry};
   if(e.domain==="DRUG"){
     e.tradeNames=TRADE_NAMES[e.name]||"—";
     e.drugClass=`${e.category}${e.subgroup?` — ${e.subgroup}`:""}`;
     e.mechanismFormal=e.mechanism
       ?`${e.name} ออกฤทธิ์หลักผ่าน ${e.mechanism} ส่งผลต่อกระบวนการที่จำเป็นต่อการอยู่รอด การแบ่งตัว หรือการส่งสัญญาณของเซลล์มะเร็ง โดยผลทางชีววิทยาที่เกิดขึ้นขึ้นกับชนิดของยาและบริบทของเซลล์เป้าหมาย`
       :"ยังไม่มีคำอธิบายกลไกเฉพาะในฐานข้อมูลรุ่นนี้";
     e.biomarkers=BIOMARKERS_BY_SUBGROUP[e.subgroup]||"ขึ้นกับเป้าหมายของยา ชนิดมะเร็ง และ biomarker มาตรฐานที่เกี่ยวข้อง";
     e.onconomicsInterpretation="ค่าที่รายงานสะท้อนความไวเชิง functional ของตัวอย่างต่อยานี้ในระบบทดสอบของรายงาน ควรใช้เพื่อประกอบการพิจารณาร่วมกับพยาธิวิทยา ระยะโรค biomarker มาตรฐาน ประวัติการรักษา และดุลยพินิจของแพทย์ ไม่ควรใช้แทนข้อบ่งใช้หรือแนวทางการรักษามาตรฐาน";
   }else if(e.domain==="GENE"){
     e.geneSymbol=e.name;
     e.fullName=e.mechanism||e.name;
     e.biologicalFunction=e.meaning||"เกี่ยวข้องกับกระบวนการทางชีววิทยาของเซลล์มะเร็ง";
     e.signalingPathway=e.subgroup||"Unclassified pathway";
     e.cancerAssociation=`การเปลี่ยนแปลงของ ${e.name} อาจสะท้อนบทบาทใน ${String(e.subgroup||"tumor biology").toLowerCase()} ทั้งนี้ความหมายขึ้นกับชนิดมะเร็ง วิธีทดสอบ และทิศทางการเปลี่ยนแปลง`;
     e.hallmarks=GENE_HALLMARKS[e.subgroup]||"เกี่ยวข้องกับชีววิทยาของมะเร็งตามหน้าที่ของยีนหรือโปรตีนนี้";
     e.targetedDrugs="ยาที่เกี่ยวข้องควรพิจารณาตาม molecular alteration ที่ยืนยันด้วยวิธีมาตรฐานและข้อบ่งใช้เฉพาะโรค";
     e.rgccInterpretation=`ค่าสูง: ${e.high||"อาจสะท้อนการแสดงออกหรือ activity ที่เพิ่มขึ้น"} ค่าต่ำ: ${e.low||"อาจสะท้อนการแสดงออกหรือ activity ที่ลดลง"} Baseline: ${e.normal||"ขึ้นกับวิธีทดสอบของรายงาน"}`;
   }else if(e.domain==="NATURAL"){
     const m=NATURAL_META[e.name];
     e.source=m?.[0]||`ยังไม่มีข้อมูลแหล่งที่มาที่ตรวจสอบได้สำหรับ ${e.name}`;
     e.activeCompounds=m?.[1]||`ต้องตรวจฉลากหรือ Certificate of Analysis ของ ${e.name}`;
     e.mechanismFormal=m?.[2]||`ยังไม่ควรระบุกลไกของ ${e.name} จนกว่าจะยืนยันองค์ประกอบ`;
     e.molecularTargets=m?.[3]||`ยังไม่สามารถระบุ molecular targets ของ ${e.name} ได้โดยไม่มีสูตรผลิตภัณฑ์`;
     e.drugInteractions=m?.[4]||`ต้องประเมินปฏิกิริยาระหว่างยาจากส่วนประกอบจริงของ ${e.name}`;
     e.precautions=m?.[5]||`ต้องตรวจฉลาก ผู้ผลิต เลขล็อต และส่วนประกอบของ ${e.name} ก่อนนำไปใช้ทางคลินิก`;
   }
   return e
 }

 function norm(s){
   return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
 }

 function find(domain,name){
   const q=norm(name);
   return entries.find(e=>(!domain||e.domain===domain)&&[e.name,...(e.aliases||[])].some(x=>norm(x)===q))||null;
 }

 function ctcKnowledge(name){
   return {
     domain:"CTC",name:name||"CTC count",category:"Circulating Tumor Cells",subgroup:"CTC count",mechanism:"Enumeration of circulating tumour cells in peripheral blood",
     meaning:"จำนวนเซลล์มะเร็งที่ตรวจพบว่าไหลเวียนอยู่ในกระแสเลือด ใช้ประกอบการติดตามภาระโรคและแนวโน้มการตอบสนองต่อการรักษา",
     high:"จำนวนที่สูงขึ้นหรือเพิ่มขึ้นต่อเนื่องอาจสัมพันธ์กับภาระโรคหรือการดำเนินโรค แต่ต้องใช้เกณฑ์เฉพาะของ assay และชนิดมะเร็ง",
     low:"จำนวนที่ลดลงต่อเนื่องอาจสนับสนุนการตอบสนองต่อการรักษา แต่ต้องประเมินร่วมกับภาพถ่ายรังสี อาการ และตัวบ่งชี้อื่น",
     normal:"ไม่มีค่าปกติสากล; 0 หมายถึงไม่ตรวจพบภายใต้ข้อจำกัดของวิธี ไม่ได้ตัดโรคที่ยังเหลืออยู่"
   };
 }

 function fallback(domain,name,source={}){
   if(domain==="CTC")return ctcKnowledge(name);
   if(domain==="GENE"){
     return{
       domain,name,category:"Gene expression",subgroup:source.section||"Unclassified genes",mechanism:"",
       meaning:`${name} เป็นยีนหรือ marker ในรายงาน Gene Expression ค่าที่แสดงบอกทิศทางการแสดงออกเทียบกับ baseline ของวิธีตรวจ และต้องตีความตามหน้าที่ของยีนกับชนิดมะเร็ง`,
       high:`ค่าบวกหมายถึงการแสดงออกของ ${name} สูงกว่า baseline ไม่ได้หมายความว่าเป็น mutation และไม่ได้แปลว่าเป็นผลเสียเสมอ`,
       low:`ค่าลบหมายถึงการแสดงออกของ ${name} ต่ำกว่า baseline ไม่ได้แปลว่าเป็นผลดีเสมอ โดยเฉพาะเมื่อยีนมีหน้าที่กดมะเร็งหรือซ่อมแซม DNA`,
       normal:"ถ้ารายงานใช้ percentage deviation มักใช้ 0% เป็น baseline แต่ต้องตรวจวิธีทดสอบ"
     };
   }
   if(domain==="NATURAL"){
     return{
       domain,name,category:"Natural supplements",subgroup:source.section||"Unclassified natural substances",mechanism:"",
       meaning:"สารธรรมชาติจากรายงานที่ยังไม่มีรายการใน Dictionary",
       high:"สัญญาณความไวสูงกว่าในแบบทดสอบ",
       low:"สัญญาณความไวต่ำกว่าในแบบทดสอบ",
       normal:"ไม่มีค่าปกติสากล"
     };
   }
   return{
     domain,name,category:"Unclassified therapy",subgroup:source.section||"Unclassified",mechanism:"",
     meaning:"ยาหรือสารที่ยังไม่ถูกจับคู่ใน Dictionary กรุณาตรวจชื่อจากต้นฉบับ",
     high:"ความไวสูงกว่าในแบบทดสอบ",
     low:"ความไวต่ำหรือไม่ตอบสนองในแบบทดสอบ",
     normal:"ไม่มีค่าปกติแบบแล็บ"
   };
 }

 function classify(domain,name,source={}){
   return enrich(find(domain,name)||fallback(domain,name,source));
 }

 function categories(domain){
   return [...new Set(entries.filter(e=>e.domain===domain).map(e=>e.category))];
 }

 function coverage(master=[]){
   const byDomain={};
   master.forEach(x=>{
     const d=x.domain,k=classify(d,x.name,x);
     byDomain[d]=byDomain[d]||{total:0,classified:0,unclassified:0};
     byDomain[d].total++;
     const missing=String(k.category||"").startsWith("Unclassified")||
       String(k.subgroup||"").startsWith("Unclassified")||
       !String(k.mechanism||k.mechanismFormal||"").trim();
     if(missing)byDomain[d].unclassified++;else byDomain[d].classified++;
   });
   return {total:master.length,byDomain}
 }

 return{
   classify,find,categories,coverage,
   entries:()=>entries.map(enrich)
 };
})();
