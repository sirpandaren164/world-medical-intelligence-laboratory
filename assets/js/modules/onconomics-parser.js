window.MIW=window.MIW||{};
MIW.OnconomicsParser=(function(){
 "use strict";

 const DRUG_NAMES=["Oxaliplatin", "Carboplatin", "Cisplatin", "Mitomycin", "Nedaplatin", "Melphalan", "Cyclophosphamide", "Ifosfamide", "Dacarbazine", "Treosulfan", "Temozolomide", "Procarbazine", "BCNU", "ACNU", "CCNU", "Bleomycin", "Trofosfamide", "Estramustine", "Bendamustine", "Chlorambucil", "Hydroxyurea", "Altretamine", "CPT-11 (Irinotecan)", "Topotecan", "Gimatecan", "Doxorubicin", "Liposomal Doxorubicin", "Epirubicin", "Daunorubicin", "Idarubicin", "Etoposide", "Mitoxantrone", "Dactinomycin", "Amsacrine Hydrochloride", "Vincristine", "Vinblastine", "Vinorelbine", "Paclitaxel", "Docetaxel", "Eribulin", "Ixabepilone", "Abraxane", "Cabazitaxel", "Methotrexate", "Pemetrexed", "Cytarabine", "Gemcitabine", "Fludarabine", "5-FU", "FUDR", "Capecitabine", "UFT", "Raltitrexed", "Bevacizumab", "Ramucirumab", "Cetuximab", "Panitumumab", "Pembrolizumab", "Nivolumab", "Alemtuzumab", "Atezolizumab", "Avelumab", "Durvalumab", "Erdafitinib", "Enfortumab Vedotin", "Brentuximab Vedotin", "Catumaxomab", "Gemtuzumab", "Ibritumomab Tiuxetan", "Ipilimumab", "Obinutuzumab", "Pertuzumab", "Tositumomab", "Trastuzumab", "Rituximab", "5-Azacytidine", "Abiraterone", "Afatinib", "Anastrozole", "Axitinib", "Bortezomib", "Crizotinib", "Dabrafenib", "Dasatinib", "Erlotinib", "Everolimus/Temsirolimus", "Exemestane", "Gefitinib", "Goserelin", "Imatinib Mesylate", "Lapatinib", "Letrozole", "Nilotinib", "Nintedanib", "Niraparib", "Octreotide", "Olaparib", "Osimertinib", "Palbociclib", "Pazopanib", "Regorafenib", "Ruxolitinib", "Semaxanib", "Sorafenib", "Sunitinib", "Tamoxifen", "Trabectedin", "Trametinib", "Vandetanib", "Veliparib", "Vemurafenib", "Vorinostat", "Fulvestrant", "Ponatinib", "Ziv-Aflibercept", "Fruquintinib", "Lonsurf + Bevacizumab", "Daraxonrasib", "Botensilimab + Balstilimab", "Ivonescimab", "Cemiplimab", "Dostarlimab", "Sintilimab", "Nivolumab/Relatlimab", "L-Asparaginase", "Pegaspargase", "Teniposide", "Cladribine", "6-Mercaptopurine", "Ofatumumab"];
 const GENE_NAMES=["MDR1", "MRP1", "LRP", "GST", "p180", "Bcr-abl", "PTEN", "COX2", "5-LOX", "NFkB", "IkB(a,b,c)", "ALK", "EML-4-ALK", "NPM-ALK", "RET", "SS-r", "CD 117(c-kit)", "IGF-r 1", "IGF-r 2", "EGF", "c-erb-B1", "c-erb-B2", "JAK 1/2", "c-Jun", "c-Fos", "Ras/Raf/MEK/ERK", "mTOR", "Progesterone Receptor", "Estrogene Receptor", "NR3C4-A", "NR3C4-B", "TGF-b", "HSP27", "HSP72", "HSP90", "DNA methyltransferase I", "DNA demethylase", "O6-methyl-DNA-transferase", "Histone-deacetylase-dipeptide", "HAT", "CXCR4", "CXCL12", "Gamma GC", "HDAC", "PARP (1-17)", "VEGF", "FGF", "PDGF", "ANG 1", "ANG 2", "c-MET", "67LR", "KISS-1-r", "Nm23", "MMP", "E2F1", "CDC6", "h-TERT", "Bcl-2", "Bax", "CD95 (fas-r)", "p27", "p53", "p16", "CDK4/6", "DPD", "UP", "NP", "TP", "TS", "DHFR", "SHMT", "GARFT", "Ribonucleoside reductase", "CES1&2 (carboxyesterase)", "CypB1", "ERCC1", "RRM1", "CD33", "CD52", "CD20", "EpCAM", "PD-L1", "PD 1", "PD-L2"];
 const NATURAL_NAMES=["Ascorbic acid", "Butyric Acid", "Oxaloacetate (Cronaxal)", "Artesunate", "Super Artemisinin", "DCA", "C-statin", "Artecin", "Amygdalin (B17)", "Agaricus Blazei Murill", "Avemar pulvis", "Bio D Mulsion NuMedica D3", "Cordyceps Sinensis", "DDG", "Doxycycline", "Frankincense", "Lycopene", "Pau D'Arco", "Black Cumin", "IP6 (Inositol)", "OnkoBel Pro", "Poly-MVA", "Ivermectin", "Ribraxx", "Salicinium", "Theaflavin", "Colloidal Silver", "Vitanox", "Alpha Lipoic Acid", "Boswellia Serrata", "Fucoidan", "Mistletoe", "Astaxanthin", "Reishi Pure", "Sodium Bicarbonate", "Amygdalin", "Apigenin", "Citrus Pectin", "Diosmin", "Curcumin (Turmeric)", "MitoLipoCurmin", "Genistein", "Indol 3 Carbinol", "Melatonin", "Naltrexone", "Pau-Pau", "Pure Quercetin", "Quercetin", "Resveratrol", "Salvestrol", "Vascustatin", "Vitamin D3", "CoQ10", "Angiostop", "Breastin", "Pau-Paw"];
 const ALIASES={"CPT-11 (Irinotecan)": ["CPT11", "CPT 11", "CPT-11", "Irinotecan"], "5-FU": ["5FU", "5 FU", "Fluorouracil"], "FUDR": ["Fudr", "Floxuridine"], "UFT": ["UFT", "Tegafur uracil"], "Raltitrexed": ["Raltitrexed", "Tomudex"], "Liposomal Doxorubicin": ["Liposomal Doxorubicin", "Pegylated liposomal doxorubicin", "PLD"], "Abraxane": ["Abraxane", "Nab-paclitaxel", "Nab paclitaxel"], "BCNU": ["BCNU", "Carmustine"], "CCNU": ["CCNU", "Lomustine"], "ACNU": ["ACNU", "Nimustine"], "Everolimus/Temsirolimus": ["Everolimus", "Temsirolimus", "Everolimus/Temsirolimus"], "Imatinib Mesylate": ["Imatinib", "Imatinib mesylate"], "Ibritumomab Tiuxetan": ["Ibritumomab", "Ibritumomab tiuxetan", "Zevalin"], "Brentuximab Vedotin": ["Premuximab vedotin", "Brentuximab vedotin"], "Erdafitinib": ["Erdafitinib", "Erdatinib", "Erda tinib"], "Ziv-Aflibercept": ["Ziv Aflibercept", "Ziv-Aflibercept", "Aflibercept"], "Lonsurf + Bevacizumab": ["Lonsurf+bevacizumab", "Lonsurf + bevacizumab", "Trifluridine tipiracil + bevacizumab"], "Botensilimab + Balstilimab": ["Botensilimab + Balstilimab", "Botensilimab+Balstilimab"], "O6-methyl-DNA-transferase": ["06-methyl-DNA-tran", "O6-methyl-DNA-tran", "MGMT"], "Ribonucleoside reductase": ["Ribonucleosider Eductase", "Ribonucleoside reductase"], "CES1&2 (carboxyesterase)": ["CES1&2", "CES1-2", "carboxyesterase"], "Ras/Raf/MEK/ERK": ["Ras/Raf/MEK/ERK", "Ras/Raf/MEK/Er k", "Ras-Raf-MEK-ERK", "Ras Raf MEK ERK"], "EpCAM": ["EpCAM", "EpCAM (EpCAm+ve)", "EpCAm+ve"], "Ascorbic acid": ["Ascorbic acid", "Vitamin C"], "Avemar pulvis": ["Avemar pulvis", "Avemar"]};
 const TEMPLATE_CHARTS=[{"match": "Alkylating\\s+Agents", "region": [0.13, 0.49], "names": ["Cisplatin", "Carboplatin", "Cyclophosphamide", "Ifosfamide", "Dacarbazine", "Oxaliplatin", "Mitomycin", "Melphalan", "Treosulfan", "Temozolomide", "Procarbazine", "BCNU", "ACNU", "CCNU", "Bleomycin", "Trofosfamide", "Estramustine", "Bendamustine", "Nedaplatin", "Chlorambucil", "Hydroxyurea", "Altretamine"]}, {"match": "Inhibitors\\s+of\\s+Topoisomerase\\s+I\\s*&\\s*II|Topoisomerase", "region": [0.58, 0.9], "names": ["CPT-11 (Irinotecan)", "Topotecan", "Gimatecan", "Doxorubicin", "Liposomal Doxorubicin", "Epirubicin", "Daunorubicin", "Dactinomycin", "Idarubicin", "Etoposide", "Mitoxantrone", "Amsacrine Hydrochloride"]}, {"match": "Epothilones\\s*&\\s*Nucleus\\s+Spindle|Epothilones", "region": [0.14, 0.49], "names": ["Ixabepilone", "Paclitaxel", "Docetaxel", "Eribulin", "Abraxane", "Cabazitaxel", "Vincristine", "Vinblastine", "Vinorelbine"]}, {"match": "Nucleoside\\s+Analogues|Antimetabolites", "region": [0.57, 0.9], "names": ["5-FU", "Methotrexate", "Gemcitabine", "Capecitabine", "FUDR", "UFT", "Raltitrexed", "Pemetrexed", "Cytarabine", "Fludarabine"]}, {"match": "Resistance\\s+Factors", "region": [0.13, 0.49], "names": ["MDR1", "MRP1", "LRP", "GST"]}, {"match": "Moab\\s*-?\\s*Monoclonal\\s+Antibodies|Monoclonal\\s+Antibodies", "region": [0.58, 0.9], "names": ["Alemtuzumab", "Atezolizumab", "Avelumab", "Bevacizumab", "Brentuximab Vedotin", "Catumaxomab", "Cetuximab", "Gemtuzumab", "Ibritumomab Tiuxetan", "Ipilimumab", "Nivolumab", "Ofatumumab", "Panitumumab", "Pembrolizumab", "Pertuzumab", "Ramucirumab", "Rituximab", "Tositumomab", "Trastuzumab"]}, {"match": "SMW\\s*-\\s*Small\\s+Molecular|Small\\s+Molecular", "region": [0.12, 0.49], "names": ["5-Azacytidine", "Abiraterone", "Afatinib", "Anastrozole", "Axitinib", "Bortezomib", "Crizotinib", "Dabrafenib", "Dasatinib", "Erlotinib", "Everolimus/Temsirolimus", "Exemestane", "Gefitinib", "Goserelin", "Imatinib Mesylate", "Lapatinib", "Letrozole", "Nilotinib", "Nintedanib"]}, {"match": "SMW\\s*-\\s*Small\\s+Molecular|Small\\s+Molecular", "region": [0.56, 0.9], "names": ["Niraparib", "Octreotide", "Olaparib", "Osimertinib", "Palbociclib", "Pazopanib", "Regorafenib", "Ruxolitinib", "Semaxanib", "Sorafenib", "Sunitinib", "Tamoxifen", "Trabectedin", "Trametinib", "Vandetanib", "Veliparib", "Vemurafenib", "Vorinostat", "Fulvestrant", "Ponatinib", "Ziv-Aflibercept"]}, {"match": "Class\\s+I\\s*\\(Cytotoxic\\s+Agents\\)", "region": [0.14, 0.49], "names": ["Artecin", "Amygdalin (B17)", "Agaricus Blazei Murill", "Artesunate", "Ascorbic acid", "Avemar pulvis", "Bio D Mulsion NuMedica D3", "Butyric Acid", "C-statin", "Cordyceps Sinensis", "DCA", "DDG", "Doxycycline", "Frankincense"]}, {"match": "Class\\s+I\\s*\\(Cytotoxic\\s+Agents\\)", "region": [0.57, 0.9], "names": ["Lycopene", "Pau D'Arco", "Black Cumin", "IP6 (Inositol)", "OnkoBel Pro", "Oxaloacetate (Cronaxal)", "Poly-MVA", "Ivermectin", "Ribraxx", "Salicinium", "Super Artemisinin", "Theaflavin", "Colloidal Silver", "Vitanox"]}, {"match": "Class\\s+II\\s*\\(Immunostimulants", "region": [0.14, 0.49], "names": ["Alpha Lipoic Acid", "Boswellia Serrata", "Fucoidan", "Mistletoe", "Astaxanthin", "Reishi Pure", "Sodium Bicarbonate"]}, {"match": "Class\\s+III\\s*\\(PK\\s+Inhibitors", "region": [0.57, 0.9], "names": ["Angiostop", "Apigenin", "Citrus Pectin", "Breastin", "CoQ10", "Curcumin (Turmeric)", "MitoLipoCurmin", "Genistein", "Indol 3 Carbinol", "Melatonin", "Naltrexone", "Pau-Paw", "IP6 (Inositol)", "Pure Quercetin", "Quercetin", "Resveratrol", "Salvestrol", "Vascustatin"]}].map(x=>({...x,match:new RegExp(x.match,"i")}));
 let ocrWorkerPromise=null;

 function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
 function normalize(text){return String(text||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\r/g,"")}
 function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"")}
 function aliasesFor(name){return [...new Set([name,...(ALIASES[name]||[])])]}
 function allNames(){return [...DRUG_NAMES,...GENE_NAMES,...NATURAL_NAMES]}
 function knownNameScore(reported,alias){
   const n=norm(reported),a=norm(alias);
   if(!n||!a)return 0;
   if(n===a)return 10000+a.length;
   const shared=Math.min(n.length,a.length);
   if(shared<6)return 0;
   if(n.startsWith(a)||a.startsWith(n))return 6000+shared;
   if(shared>=9&&(n.includes(a)||a.includes(n)))return 4000+shared;
   return 0
 }
 function matchKnownName(reported,catalog=allNames()){
   let best=null;
   for(const name of catalog){
     for(const alias of aliasesFor(name)){
       const score=knownNameScore(reported,alias);
       if(score>0&&(!best||score>best.score))best={name,score}
     }
   }
   return best?.name||null
 }
 function domainOf(name){return DRUG_NAMES.includes(name)?"DRUG":GENE_NAMES.includes(name)?"GENE":"NATURAL"}
 function naturalClass(name){
   for(let index=0;index<TEMPLATE_CHARTS.length;index++){
     const chart=TEMPLATE_CHARTS[index];
     if(!chart.names.includes(name))continue;
     if(index===8||index===9)return"Class I - Cytotoxic agents";
     if(index===10)return"Class II - Immunostimulants / Immunomodulators";
     if(index===11)return"Class III - Protein kinase inhibitors";
   }
   return"Natural substances"
 }
 function naturalSectionsForName(name){
   const sections=[];
   TEMPLATE_CHARTS.forEach((chart,index)=>{
     if(!chart.names.includes(name))return;
     const section=index===8||index===9?"Class I - Cytotoxic agents":index===10?"Class II - Immunostimulants / Immunomodulators":index===11?"Class III - Protein kinase inhibitors":"";
     if(section&&!sections.includes(section))sections.push(section)
   });
   return sections
 }
 function naturalSectionForChartIndex(index){
   if(index===8||index===9)return"Class I - Cytotoxic agents";
   if(index===10)return"Class II - Immunostimulants / Immunomodulators";
   if(index===11)return"Class III - Protein kinase inhibitors";
   return"Natural substances"
 }
 function sectionFor(name,domain){
   if(domain==="NATURAL")return naturalClass(name);
   if(domain==="GENE")return"Gene expression";
   const groups=[
    {label:"Alkylating Agents",names:TEMPLATE_CHARTS[0].names},
    {label:"Topoisomerase I inhibitors",names:["CPT-11 (Irinotecan)","Topotecan","Gimatecan"]},
    {label:"Topoisomerase II inhibitors",names:["Doxorubicin","Liposomal Doxorubicin","Epirubicin","Daunorubicin","Idarubicin","Etoposide","Mitoxantrone","Dactinomycin","Amsacrine Hydrochloride"]},
    {label:"Epothilones and Microtubule Inhibitors",names:TEMPLATE_CHARTS[2].names},
    {label:"Nucleoside Analogues",names:TEMPLATE_CHARTS[3].names},
    {label:"Monoclonal Antibodies",names:TEMPLATE_CHARTS[5].names},
    {label:"Small Molecular Weight Molecules",names:[...TEMPLATE_CHARTS[6].names,...TEMPLATE_CHARTS[7].names]}
   ];
   return groups.find(group=>group.names.includes(name))?.label||"Drug sensitivity"
 }
 function geneSectionFor(name,rec={}){
   const context=`${rec.function||""} ${rec.related||""}`.toLowerCase();
   if(/signal\s*transduction|transduction\s*pathway|proto-oncogene/.test(context))return"Signal Transduction Pathway";
   if(/growth factor|somatostatin|insulin like|her1|her\/neu/.test(context))return"Growth Factors / Receptors";
   if(/hormone|androgen|progesterone|estrogen|nucleous receptor/.test(context))return"Hormone Receptors";
   if(/heat shock|dna repair|dna methyl|histone|resistant phenotype|alkylating/.test(context))return"Self Repair / Resistance";
   if(/angiogen/.test(context))return"Angiogenesis";
   if(/metastas|migration|invasion|laminin|epithelial transition/.test(context))return"Metastasis / Invasion";
   if(/apoptosis|cell cycle|immortal|cell arrest|cyclin/.test(context))return"Cell Cycle / Apoptosis";
   if(/5fu|thfa|dna synthesis|camptothecin|xenobiotic|nucleotide polymer/.test(context))return"Drug Metabolism / Targets";
   return sectionFor(name,"GENE")
 }
 function geneMainTopicForPage(pageText,name=""){
   const source=String(pageText||"").toUpperCase().replace(/\s+/g," ");
   if(/GROWTH FACTORS PROLIFERATION STIMULI/.test(source))return"Growth Factors Proliferation Stimuli";
   if(/SELF REPAIR\s*-\s*RESISTANCE/.test(source))return"Self Repair - Resistance";
   if(/ANGIOGENESIS\s*-\s*METASTASES/.test(source))return"Angiogenesis - Metastases";
   if(/CELL CYCLE REGULATION\s*&\s*IMMORTALIZATION\s*\/\s*APOPTOSIS/.test(source))return"Cell Cycle Regulation & Immortalization / Apoptosis";
   if(/DRUG METABOLISMS\s*&\s*TARGETS/.test(source))return"Drug Metabolisms & Targets";
   if(/(?:^|\s)MARKERS(?:\s|$)/.test(source))return"Markers";
   if(/RESISTANCE FACTORS/.test(source))return"Resistance Factors";
   return MIW.GeneReportSchema?.resolve(name)?.mainTopic||""
 }
 function sensitivity(value,row={}){
   const n=Number(value);
   if(!Number.isFinite(n))return"REVIEW";
   const sourceClass=MIW.OncoSourceTruth?.classify?.(row,n);
   if(sourceClass&&sourceClass.profile?.mode!=="raw")return sourceClass.label;
   return n>=80?"High sensitivity":n>=30?"Partial sensitivity":"No sensitivity"
 }
 function geneStatus(value){
   const n=Number(value);return n>0?"Positive":n<0?"Negative / Down-regulated":"Not detected"
 }
 function reportDate(text){
   const month={jan:"01",january:"01",feb:"02",february:"02",mar:"03",march:"03",apr:"04",april:"04",may:"05",jun:"06",june:"06",jul:"07",july:"07",juli:"07",aug:"08",august:"08",sep:"09",sept:"09",september:"09",oct:"10",october:"10",nov:"11",november:"11",dec:"12",december:"12"};
   let m=String(text).match(/Report\s+Date\s+(\d{4})\s+([A-Za-z]+)\.?\s+(\d{1,2})/i);
   if(m&&month[m[2].toLowerCase()])return `${m[1]}-${month[m[2].toLowerCase()]}-${String(m[3]).padStart(2,"0")}`;
   m=String(text).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
   if(m&&month[m[2].toLowerCase()])return `${m[3]}-${month[m[2].toLowerCase()]}-${String(m[1]).padStart(2,"0")}`;
   return""
 }
 function metadata(pages,fileName){
   const all=pages.map(p=>p.text).join("\n"), summary=pages.find(p=>/REPORT\s+SUMMARY/i.test(p.text))?.text||all;
   const filePatient=String(fileName||"").replace(/\.[^.]+$/," ").split(/\s+-\s+Onconomics/i)[0].trim();
   const identity=summary.match(/([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,5})\s+(\d{4}-[A-Za-z]{3}-\d{2})\s+([A-Za-z][A-Za-z /&+()-]{2,50}?)\s+(I|II|III|IV)\b/i);
   const pm=summary.match(/(?:Patient[\s\S]{0,80}?)?NAME\s+(?:DATE\s+OF\s+BIRTH[\s\S]{0,120}?)?([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,5})\s+(\d{4}-[A-Za-z]{3}-\d{2})/i);
   const ctc=(summary.match(/Isolated\s+(\d+(?:[.,]\d+)?)\s*cells\s*\/?\s*ml/i)||[])[1]||"";
   const disease=(identity?.[3]||"").trim();
   const stage=(identity?.[4]||"").trim();
   const vial=(summary.match(/(?:20ml|25ml)\s+Blood\s+(\d{4,})/i)||[])[1]||"";
   const specimen=(summary.match(/((?:20|25)ml\s+Blood)/i)||[])[1]||"";
   const safeFilePatient=/^(?:ilovepdf|merged|nutrition|report|laboratory|document|scan)/i.test(filePatient)?"":filePatient;
   return{patient:identity?.[1]||pm?.[1]||(safeFilePatient&&!/Onconomics/i.test(safeFilePatient)?safeFilePatient:""),dob:identity?.[2]||pm?.[2]||"",disease,stage,ctc,date:reportDate(all),vial,specimen}
 }
 function reportSchemaVersion(pages,pageCount){
   const tablePages=(pages||[]).filter(detectGeneTablePage).map(page=>Number(page.page)).filter(Number.isFinite);
   const firstTablePage=tablePages.length?Math.min(...tablePages):null;
   if(Number(pageCount)===19||firstTablePage===6)return"RGCC_LEGACY_19_PAGE";
   if(Number(pageCount)===20||firstTablePage===7)return"RGCC_CURRENT_20_PAGE";
   return"RGCC_STRUCTURE_DETECTED_BY_COLUMNS"
 }
 function summaryData(text){
   const source=String(text||"");
   const grab=(label,next)=>{const r=new RegExp(label+"\\s*:\s*([\s\S]*?)(?="+next+")","i");return (source.match(r)||[])[1]?.replace(/\n/g," ").replace(/\s+/g," ").trim()||""};
   const sensitivityBlock=(source.match(/SENSITIVITY\s*-\s*GENE\s+EXPRESSION([\s\S]*?)(?=NATURAL\s+SUBSTANCES\s+SENSITIVITY)/i)||[])[1]||source;
   const has=pattern=>pattern.test(sensitivityBlock);
   const high=[];
   if(has(/alkylating\s+factors?/i))high.push("alkylating factors");
   if(has(/alkaloids?\s+of\s+vinca/i))high.push("alkaloids of vinca");
   if(has(/inhibitors?\s+of\s+topoisomerase\s+I(?!I)/i))high.push("inhibitors of topoisomerase I");
   const partial=[];
   if(has(/(?:\bMTX\b|methotrexate)/i))partial.push("MTX");
   if(has(/pemetrexed/i))partial.push("Pemetrexed");
   if(has(/inhibitors?\s+of\s+topoisomerase\s+II/i))partial.push("inhibitors of topoisomerase II");
   const expressionNames=["C-erb-B1","EGF","COX2","IGF-r 1","IGF-r 2","TGF-b","HAT","VEGF","ANG 1","ANG 2","C-MET"];
   const downNames=["5-LOX","HSP90","HSP72","HSP27"];
   const findNames=names=>names.filter(name=>new RegExp("(?:^|[^A-Za-z0-9])"+escRe(name).replace(/\s+/g,"\\s*")+"(?:$|[^A-Za-z0-9])","i").test(sensitivityBlock));
   const over=findNames(expressionNames),down=findNames(downNames);
   const naturalBlock=(source.match(/NATURAL\s+SUBSTANCES\s+SENSITIVITY([\s\S]*?)(?=Conclusion Results)/i)||[])[1]||"";
   const naturalFound=NATURAL_NAMES.filter(name=>aliasesFor(name).some(alias=>new RegExp("(?:^|[^A-Za-z0-9])"+escRe(alias).replace(/\s+/g,"\\s*")+"(?:$|[^A-Za-z0-9])","i").test(naturalBlock)));
   const classI=naturalFound.filter(name=>naturalClass(name).startsWith("Class I -"));
   const classII=naturalFound.filter(name=>naturalClass(name).startsWith("Class II -"));
   const classIII=naturalFound.filter(name=>naturalClass(name).startsWith("Class III -"));
   return{
    highSensitivity:high.join(", ")||grab("High sensitivity","Partial sensitivity|Expression"),
    partialSensitivity:partial.join(", ")||grab("Partial sensitivity","Expression"),
    overExpression:over.join(", ")||grab("Over expression","Down regulation"),
    downRegulation:down.join(", ")||grab("Down regulation","NATURAL SUBSTANCES"),
    naturalClassI:classI.join(", "),naturalClassII:classII.join(", "),naturalClassIII:classIII.join(", "),
    naturalDisclaimer:(naturalBlock.match(/\*\s*Disclaimer!?([\s\S]*)/i)||[])[1]?.replace(/\n+/g," ").replace(/\s+/g," ").trim()||"",
    conclusion:(source.match(/Conclusion Results([\s\S]*?)(?=Patient\s|RGCC International)/i)||[])[1]?.replace(/\n+/g," ").replace(/\s+/g," ").trim()||""
   }
 }

 async function getWorker(onProgress){
   if(!window.Tesseract)throw new Error("Tesseract.js not loaded");
   if(!ocrWorkerPromise){
     ocrWorkerPromise=Tesseract.createWorker("eng",1,{
       logger:m=>{
         if(onProgress&&m&&m.status){
           const pct=typeof m.progress==="number"?` ${Math.round(m.progress*100)}%`:"";
           onProgress(`OCR: ${m.status}${pct}`)
         }
       }
     })
   }
   return ocrWorkerPromise
 }
 function words(data){
   return (data?.words||[]).map(w=>({text:String(w.text||"").trim(),x0:w.bbox?.x0||0,x1:w.bbox?.x1||0,y0:w.bbox?.y0||0,y1:w.bbox?.y1||0,conf:Number(w.confidence||w.conf||0)})).filter(w=>w.text)
 }
 function percentToken(t){
   const s=String(t||"").replace(/[Oo]/g,"0").replace(/[,.;:]/g,"").trim();
   let m=s.match(/^(-?\d{1,3})\s*%$/);if(m)return Number(m[1]);
   m=s.match(/^(-?\d{1,3})$/);return m?Number(m[1]):null
 }
 function assignTemplate(out,wordList,names,region,W,H,page){
   const top=region[0]*H,bottom=region[1]*H,left=.105*W,right=.925*W,spacing=(right-left)/Math.max(1,names.length);
   const candidates=wordList.map(w=>({...w,cx:(w.x0+w.x1)/2,cy:(w.y0+w.y1)/2,val:percentToken(w.text)}))
     .filter(w=>
       w.val!==null&&w.val>=-100&&w.val<=100&&
       // Axis labels sit outside the plot. Never allow a left-side threshold
       // label to become the first compound's result.
       w.cx>=left+Math.max(2,spacing*.03)&&w.cx<=right-spacing*.03&&
       w.cy>top&&w.cy<bottom
     );
   names.forEach((name,i)=>{
     const ex=left+(i+.5)*spacing;
     // A result label must belong to the same x-slot. The old .55-slot window
     // could pull the y-axis 5% label or a neighbour into the first/last item.
     const maxDx=Math.max(18,spacing*.40);
     const near=candidates.filter(c=>Math.abs(c.cx-ex)<=maxDx)
       .sort((a,b)=>
         Math.abs(a.cx-ex)-Math.abs(b.cx-ex)||
         b.conf-a.conf||
         a.cy-b.cy
       );
     if(near[0]&&out[name]===undefined)out[name]={
       value:near[0].val,page,
       confidence:Math.max(60,Math.min(99,near[0].conf||75)),
       sourceLine:`LTX v15.1.1 same-slot chart label ${near[0].text}`,
       evidenceType:"LTX_V15_1_1_SAME_SLOT",
       slotX:ex,labelX:near[0].cx,labelY:near[0].cy,
       slotDistance:Math.abs(near[0].cx-ex)
     }
   })
 }
 function templateValues(data,pageText,canvas,page){
   const out={}, ws=words(data), W=canvas.width||1,H=canvas.height||1;
   TEMPLATE_CHARTS.filter(c=>c.match.test(String(pageText||""))).forEach(c=>assignTemplate(out,ws,c.names,c.region,W,H,page));
   return out
 }

 function pixelIsBarFill(r,g,b,a){
   if(a<180)return false;
   // RGCC uses three solid fills in the sensitivity charts: dark blue,
   // purple and neutral grey. The pale plot backgrounds are deliberately
   // excluded, as are black value labels and axis text.
   const darkBlue=r<55&&g>35&&g<145&&b>65&&b<185&&b>g+10;
   const purple=r>95&&r<215&&g>45&&g<160&&b>105&&b<220&&r>g+12&&b>g+12;
   const neutralGrey=Math.max(r,g,b)-Math.min(r,g,b)<18&&r>55&&r<175;
   return darkBlue||purple||neutralGrey
 }
 function pixelIsHundredLine(r,g,b,a){
   return a>=180&&r>95&&r<215&&g>45&&g<160&&b>105&&b<220&&r>g+12&&b>g+12
 }
 function pixelIsBaseline(r,g,b,a){
   return a>=180&&r<70&&g<70&&b<70
 }
 function horizontalLine(canvasData,W,H,region,predicate){
   // Template regions describe the chart body approximately. Expand both
   // ends because the 19-page and 20-page RGCC layouts shift the 100% and
   // 0% rules by a few percent of page height.
   const y0=Math.max(0,Math.floor((region[0]-.045)*H));
   const y1=Math.min(H-1,Math.ceil((region[1]+.045)*H));
   const x0=Math.floor(.105*W),x1=Math.ceil(.925*W);
   let best=null;
   for(let y=y0;y<=y1;y++){
     let hit=0,total=0;
     for(let x=x0;x<=x1;x+=3){
       const i=(y*W+x)*4;
       total++;
       if(predicate(canvasData[i],canvasData[i+1],canvasData[i+2],canvasData[i+3]))hit++
     }
     const score=total?hit/total:0;
     if(score>=.78&&(!best||score>best.score))best={y,score}
   }
   if(!best)return null;
   let first=null,last=null;
   for(let x=Math.floor(.06*W);x<=Math.ceil(.96*W);x++){
     const i=(best.y*W+x)*4;
     if(!predicate(canvasData[i],canvasData[i+1],canvasData[i+2],canvasData[i+3]))continue;
     if(first===null)first=x;
     last=x
   }
   return{...best,x0:first??x0,x1:last??x1}
 }
 function slotBarGeometry(imageData,W,H,ex,spacing,topLine,baseline){
   const chartHeight=baseline.y-topLine.y;
   const half=Math.max(3,Math.floor(spacing*.20));
   const x0=Math.max(0,Math.floor(ex-half)),x1=Math.min(W-1,Math.ceil(ex+half));
   const minimumRun=Math.max(10,Math.round(chartHeight*.009));
   const slotFilledAt=y=>{
     let fill=0,total=0;
     for(let x=x0;x<=x1;x+=2){
       const i=(y*W+x)*4;
       total++;
       if(pixelIsBarFill(imageData[i],imageData[i+1],imageData[i+2],imageData[i+3]))fill++
     }
     return total>0&&fill/total>=.72
   };
   const globalGuideAt=y=>{
     let fill=0,total=0;
     for(let x=topLine.x0;x<=topLine.x1;x+=3){
       const i=(y*W+x)*4;
       total++;
       if(pixelIsBarFill(imageData[i],imageData[i+1],imageData[i+2],imageData[i+3]))fill++
     }
     return total>0&&fill/total>=.65
   };
   let run=0,barTop=null,maxRun=0;
   for(let y=topLine.y+2;y<baseline.y;y++){
     const filled=slotFilledAt(y);
     if(filled){
       run++;
       maxRun=Math.max(maxRun,run);
       if(run===minimumRun){
         barTop=y-minimumRun+1;
         break
       }
     }else run=0
   }
   // The cyan 30% rule is painted over a blue bar. A 31% bar therefore has a
   // short true segment above the rule, a 4-6 px gap, and a long segment below.
   // Recover that upper segment, but never backtrack onto a full-width 80% rule
   // (the exact failure that used to turn 79% into 80%).
   if(barTop!==null){
     let cursor=barTop-1,gap=0,upperStart=null;
     const maxGap=Math.max(8,Math.round(chartHeight*.008));
     while(cursor>topLine.y&&gap<=maxGap){
       if(slotFilledAt(cursor)){
         if(globalGuideAt(cursor))break;
         upperStart=cursor;
         while(upperStart>topLine.y&&slotFilledAt(upperStart-1)&&!globalGuideAt(upperStart-1))upperStart--;
         break
       }
       gap++;cursor--
     }
     if(upperStart!==null)barTop=upperStart
   }
   if(barTop===null)return{
     visible:false,value:0,barTopY:null,maxRun,
     topLineY:topLine.y,baselineY:baseline.y,
     confidence:Math.round(Math.min(98,94+Math.min(topLine.score,baseline.score)*4))
   };
   const raw=(baseline.y-barTop)/chartHeight*100;
   const snapTolerance=Math.max(3,chartHeight*.005);
   const snappedThreshold=[100,80,30].find(threshold=>{
     const expectedY=baseline.y-threshold/100*chartHeight;
     return Math.abs(barTop-expectedY)<=snapTolerance
   });
   return{
     visible:true,
     value:Math.max(0,Math.min(100,snappedThreshold??Math.round(raw))),
     rawValue:raw,barTopY:barTop,maxRun:Math.max(maxRun,minimumRun),
     snappedThreshold:snappedThreshold??null,
     topLineY:topLine.y,baselineY:baseline.y,
     confidence:Math.round(Math.min(99,95+Math.min(topLine.score,baseline.score)*4))
   }
 }
 function visualBarValues(canvas,pageText,page){
   const out={},W=canvas.width||1,H=canvas.height||1;
   let data;
   try{data=canvas.getContext("2d",{willReadFrequently:true}).getImageData(0,0,W,H).data}catch(_){return out}
   TEMPLATE_CHARTS.filter(c=>c.match.test(String(pageText||""))).forEach(c=>{
     const topLine=horizontalLine(data,W,H,c.region,pixelIsHundredLine);
     const baseline=horizontalLine(data,W,H,c.region,pixelIsBaseline);
     if(!topLine||!baseline||baseline.y<=topLine.y||baseline.y-topLine.y<.16*H)return;
     // RGCC leaves a small, symmetric margin between the full-width axis rule
     // and the first/last categorical slot. Derive it from the detected rule
     // instead of using a fixed right edge, which drifted by almost half a slot
     // on the 22-bar Alkylating chart.
     const plotWidth=Math.max(1,topLine.x1-topLine.x0);
     const left=topLine.x0+plotWidth*.021,right=topLine.x1-plotWidth*.021;
     const spacing=(right-left)/Math.max(1,c.names.length);
     c.names.forEach((name,i)=>{
       const ex=left+(i+.5)*spacing;
       const geometry=slotBarGeometry(data,W,H,ex,spacing,topLine,baseline);
       out[name]={
         value:geometry.value,page,
         confidence:geometry.confidence,
         sourceLine:geometry.visible
           ?`LTX v15.9 Gridline-Immune Bar Geometry: ${geometry.value}% from bar top y=${geometry.barTopY}, 100% y=${geometry.topLineY}, 0% y=${geometry.baselineY}`
           :`LTX v15.9 Gridline-Immune Bar Geometry: no solid bar above 0% baseline y=${geometry.baselineY}; explicit 0%`,
         evidenceType:geometry.visible
           ?"LTX_V15_7_GRIDLINE_IMMUNE_BAR_GEOMETRY"
           :"LTX_V15_7_GRIDLINE_IMMUNE_ZERO",
         slotX:ex,barTopY:geometry.barTopY,
         topLineY:geometry.topLineY,baselineY:geometry.baselineY,
         rawGeometryValue:geometry.rawValue??0,
         topLineScore:topLine.score,baselineScore:baseline.score,
         barMaxRun:geometry.maxRun
       }
     })
   });
   return out
 }
 function mergeValues(target,source,{preferSource=false}={}){
   for(const [k,v] of Object.entries(source||{})){
     const previous=target[k];
     const candidates=[
       ...(previous?.candidates||[previous].filter(Boolean)),
       ...(v?.candidates||[v].filter(Boolean))
     ];
     // The printed RESULTS column in the upper Gene table is the source of
     // truth. Graph OCR and proximity readers remain useful evidence, but may
     // never replace a value already tied to the canonical table row.
     if(previous?.evidenceType==="LTX_V15_2_CANONICAL_GENE_TABLE"&&
        v?.evidenceType!=="LTX_V15_2_CANONICAL_GENE_TABLE"){
       target[k]={...previous,candidates};
       continue
     }
     if(previous===undefined || preferSource || Number(v.confidence)>Number(previous.confidence)){
       target[k]={...v,candidates};
     }else{
       target[k]={...previous,candidates};
     }
   }
 }


 function itemCenterX(it){return Number(it.x||0)+(Number(it.width||0)/2)}
 function sameTextRow(a,b){
   const ay=Number(a.y||0),by=Number(b.y||0);
   const ah=Math.max(6,Number(a.height||10)),bh=Math.max(6,Number(b.height||10));
   return Math.abs(ay-by)<=Math.max(6,Math.min(ah,bh)*.72)
 }
 function signedPercentFromRow(row,label){
   const lx=itemCenterX(label);
   const right=row.filter(it=>itemCenterX(it)>lx+4).sort((a,b)=>itemCenterX(a)-itemCenterX(b));
   const joined=right.slice(0,8).map(it=>String(it.text||"").trim()).join(" ")
     .replace(/[−–—]/g,"-").replace(/[Oo]/g,"0");
   let m=joined.match(/(^|\s)(-)\s*(\d{1,3})\s*%/);
   if(m)return{value:-Number(m[3]),text:`-${m[3]}%`,parts:right.slice(0,4)};
   m=joined.match(/(^|\s)(-?\d{1,3})\s*%/);
   if(m)return{value:Number(m[2]),text:`${m[2]}%`,parts:right.slice(0,4)};
   // PDF text often splits minus and number into separate objects.
   for(let i=0;i<right.length;i++){
     const t=String(right[i].text||"").trim().replace(/[−–—]/g,"-").replace(/[Oo]/g,"0");
     if(/^-$/.test(t)){
       for(let j=i+1;j<Math.min(right.length,i+4);j++){
         const n=String(right[j].text||"").trim().replace(/[Oo]/g,"0");
         const mm=n.match(/^(\d{1,3})\s*%?$/);
         if(mm)return{value:-Number(mm[1]),text:`-${mm[1]}%`,parts:[right[i],right[j]]}
       }
     }
     const mm=t.match(/^(-?\d{1,3})\s*%$/);
     if(mm)return{value:Number(mm[1]),text:t,parts:[right[i]]}
   }
   return null
 }
 function signedGeneTextValues(pageObjects){
   const out={};
   for(const page of pageObjects){
     const items=page.items||[];
     // Group PDF text objects by visual row, preserving left-to-right order.
     const rows=[];
     [...items].sort((a,b)=>Number(a.y||0)-Number(b.y||0)||Number(a.x||0)-Number(b.x||0)).forEach(it=>{
       let row=rows.find(r=>sameTextRow(r.anchor,it));
       if(!row){row={anchor:it,items:[]};rows.push(row)}
     row.items.push(it)
   });
   for(const name of GENE_NAMES){
       for(const row of rows){
         const ordered=row.items.sort((a,b)=>itemCenterX(a)-itemCenterX(b));
         const label=ordered.find(it=>matchKnownName(it.text,GENE_NAMES)===name);
         if(!label)continue;
         const signed=signedPercentFromRow(ordered,label);
         if(!signed)continue;
         out[name]={
           value:signed.value,page:page.page,confidence:97,
           sourceLine:`LTX v15.1.2 signed same-row PDF text: ${label.text} … ${signed.text}`,
           evidenceType:"LTX_V15_1_2_SIGNED_GENE_ROW",
           reportedName:String(label.text||name).trim(),
           sourceRawText:textOf(ordered),
           rowY:Number(label.y||0),labelX:itemCenterX(label),
           candidates:[]
         };
         break
       }
     }
   }
   return out
 }


 const GENE_TABLE_HEADERS=["NAME","FUNCTION","CLINICAL RISK","RELATED","RESULTS %","OUTCOME"];
 function normHeader(t){
   return String(t||"").toUpperCase().replace(/\s+/g," ").trim()
 }
 function detectGeneTablePage(page){
   const text=String(page.text||"");
   const score=GENE_TABLE_HEADERS.reduce((n,h)=>n+(normHeader(text).includes(h)?1:0),0);
   // All canonical Gene pages share the six-column NAME/FUNCTION/RISK/
   // RELATED/RESULTS/OUTCOME table. Requiring the literal word "GENE" missed
   // valid pages headed ANGIOGENESIS or CELL CYCLE.
   return score>=5
 }
 function clusterRows(items,tolerance=5){
   const rows=[];
   [...(items||[])].sort((a,b)=>Number(a.y||0)-Number(b.y||0)||Number(a.x||0)-Number(b.x||0)).forEach(it=>{
     const y=Number(it.y||0);
     let row=rows.find(r=>Math.abs(r.y-y)<=tolerance);
     if(!row){row={y,items:[]};rows.push(row)}
     row.items.push(it)
   });
   return rows.map(r=>({...r,items:r.items.sort((a,b)=>Number(a.x||0)-Number(b.x||0))}))
 }
 function textOf(items){return items.map(x=>String(x.text||"").trim()).filter(Boolean).join(" ").replace(/\s+/g," ").trim()}
 function parseSignedPercent(t){
   const cleaned=String(t||"").replace(/[−–—]/g,"-").replace(/[Oo]/g,"0");
   const m=cleaned.match(/(-?\d{1,3})\s*%?/);
   if(!m)return null;
   const n=Number(m[1]);
   return Number.isFinite(n)&&n>=-100&&n<=100?n:null
 }
 function canonicalGeneTableValues(pageObjects){
   const out={};
   for(const page of pageObjects){
     if(!detectGeneTablePage(page))continue;
     const rows=clusterRows(page.items,5);
     const headerRow=rows.find(r=>{
       const t=normHeader(textOf(r.items));
       return t.includes("NAME")&&t.includes("FUNCTION")&&t.includes("RESULT")
     });
     if(!headerRow)continue;

     const headerItems=headerRow.items;
     function hx(label, fallback){
       const it=headerItems.find(x=>normHeader(x.text).includes(label));
       return it?Number(it.x||fallback):fallback
     }
     const xName=hx("NAME",20);
     const xFunction=hx("FUNCTION",140);
     const xRisk=hx("CLINICAL",270);
     const xRelated=hx("RELATED",360);
     const xResult=hx("RESULT",520);
     const xOutcome=hx("OUTCOME",610);
     const cuts=[xName,xFunction,xRisk,xRelated,xResult,xOutcome,99999];

     for(const row of rows){
       // PDF.js coordinates start at the bottom of the page, so table rows
       // printed below the header have a smaller Y value. The previous
       // comparison used screen-coordinate direction and skipped every Gene
       // data row, leaving names visible but values unresolved.
       if(row.y>=headerRow.y-3)continue;
       const cells=[[],[],[],[],[],[]];
       for(const it of row.items){
         const x=Number(it.x||0);
         let idx=0;
         for(let i=0;i<6;i++){
           if(x>=cuts[i]&&x<cuts[i+1]){idx=i;break}
         }
         cells[idx].push(it)
       }
       const nameCell=textOf(cells[0]);
       const functionCell=textOf(cells[1]);
       const riskCell=textOf(cells[2]);
       const relatedCell=textOf(cells[3]);
       const resultCell=textOf(cells[4]);
       const outcomeCell=textOf(cells[5]);
       if(!nameCell)continue;

       const matchedName=matchKnownName(nameCell,GENE_NAMES);
       if(!matchedName)continue;

       // Header text is left-aligned while values/outcomes are right-aligned,
       // so the visual boundary is slightly left of the OUTCOME header.
       const resultBoundary=xOutcome-12;
       const rowResultCell=textOf(row.items.filter(it=>Number(it.x||0)>=xResult-12&&Number(it.x||0)<resultBoundary));
       const rowOutcomeCell=textOf(row.items.filter(it=>Number(it.x||0)>=resultBoundary));
       let value=parseSignedPercent(rowResultCell||resultCell);
       if(value===null){
         // Some PDFs split the sign/number or shift it a few pixels. Use all items
         // near the canonical RESULT column but stay on the same table row.
         const near=row.items.filter(it=>Number(it.x||0)>=xRelated&&Number(it.x||0)<xOutcome);
         value=parseSignedPercent(textOf(near))
       }
       if(value===null)continue;

       out[matchedName]={
         value,page:page.page,confidence:99,
         sourceLine:`Canonical gene table: ${nameCell} | ${functionCell} | ${riskCell} | ${relatedCell} | ${value}% | ${rowOutcomeCell||outcomeCell}`,
         evidenceType:"LTX_V15_2_CANONICAL_GENE_TABLE",
         reportedName:nameCell,
         sourceRawText:textOf(row.items),
         function:functionCell,
         clinicalRisk:riskCell,
         related:relatedCell,
         outcome:rowOutcomeCell||outcomeCell,
         mainTopic:geneMainTopicForPage(page.text,matchedName),
         subGroup:functionCell||"",
         tableRowY:row.y,
         candidates:[]
       }
     }
   }
   return out
 }

 function storedPageObjects(pages){
   return (pages||[]).map((page,index)=>{
     const sourceItems=(Array.isArray(page?.pdfTextItems)&&page.pdfTextItems.length?page.pdfTextItems:page?.textItems)||[];
     const items=sourceItems.map(item=>({
       text:String(item?.text??item?.str??"").trim(),
       x:Number(item?.x??item?.transform?.[4]??0),
       y:Number(item?.y??item?.transform?.[5]??0)
     })).filter(item=>item.text);
     const pageNumber=Number(page?.sourcePageNumber??page?.pageNumber??page?.page??index+1);
     return{page:pageNumber,text:String(page?.pdfText||page?.text||items.map(item=>item.text).join("\n")||""),items}
   }).filter(page=>page.items.length)
 }
 function reconcileStoredResults(rows,pages){
   const pageObjects=storedPageObjects(pages),canonical=canonicalGeneTableValues(pageObjects);
   let changed=0,resolved=0;
   const repaired=(rows||[]).map(original=>{
     const row={...original},group=String(row?.group||"").toUpperCase();
     if(group==="CTC"&&/CTC\s*count/i.test(String(row?.name||row?.section||""))&&row.value!==null&&row.value!==undefined&&Number.isFinite(Number(row.value))){
       const next={...row,parserStatus:"VERIFIED",verificationStatus:"SOURCE_SUMMARY_VERIFIED",confidence:Math.max(99,Number(row.confidence||0)),confidenceBand:"HIGH",conflict:false,reviewRecommended:false,
         evidenceType:row.evidenceType||"REPORT_SUMMARY_CTC",canonicalSource:row.canonicalSource||"REPORT_SUMMARY",
         reconciliationReason:"ใช้ค่า CTC count ที่พิมพ์ใน REPORT SUMMARY ของต้นฉบับ"};
       if(row.parserStatus!==next.parserStatus||row.verificationStatus!==next.verificationStatus||Number(row.confidence||0)<99||row.reviewRecommended===true)changed++;
       resolved++;return next
     }
     if(group!=="GENE")return row;
     const matched=matchKnownName(String(row?.name||row?.reported_name||row?.normalized_name||""),GENE_NAMES);
     const rec=matched?canonical[matched]:null;
     if(!rec||rec.value===null||rec.value===undefined||!Number.isFinite(Number(rec.value)))return row;
     const template=MIW.GeneReportSchema?.resolve?.(matched)||null;
     const next={...row,
       name:matched,reported_name:rec.reportedName||row.reported_name||matched,normalized_name:matched,
       value:Number(rec.value),unit:"%",page:rec.page,source_page_number:rec.page,
       source_raw_text:rec.sourceRawText||rec.sourceLine||row.source_raw_text||"",sourceLine:rec.sourceLine||row.sourceLine||"",sourceContext:rec.sourceLine||row.sourceContext||"",
       function:rec.function||row.function||"",clinicalRisk:rec.clinicalRisk||row.clinicalRisk||"",related:rec.related||row.related||"",outcome:rec.outcome||row.outcome||"",
       main_topic_name:rec.mainTopic||row.main_topic_name||row.mainTopicName||template?.mainTopic||"",
       mainTopicName:rec.mainTopic||row.mainTopicName||row.main_topic_name||template?.mainTopic||"",
       sub_group_name:rec.subGroup||row.sub_group_name||row.subGroupName||template?.subGroup||"",
       subGroupName:rec.subGroup||row.subGroupName||row.sub_group_name||template?.subGroup||"",
       section:rec.subGroup||row.section||template?.subGroup||"",
       confidence:99,confidenceBand:"HIGH",evidenceType:rec.evidenceType,canonicalSource:"GENE_TABLE",
       evidence:[{...rec,value:Number(rec.value)}],evidenceCount:1,
       verificationStatus:"SOURCE_TABLE_VERIFIED",parserStatus:"VERIFIED",conflict:false,alternatives:[],reviewRecommended:false,
       reconciliationReason:"กู้ค่าจาก RESULTS ในแถวเดียวกันของตาราง Gene Expression ที่เก็บไว้ใน source pages; ไม่ใช้ค่า provisional/OCR เก่า",
       status:geneStatus(Number(rec.value)),level:geneStatus(Number(rec.value)),
       parserVersion:"MIW v10.200 · Stored Source Table Recovery",engine:"MIW_V10_200_STORED_SOURCE_TABLE_RECOVERY"
     };
     const materiallyDifferent=Number(row.value)!==Number(next.value)||String(row.verificationStatus||"")!==next.verificationStatus||String(row.parserStatus||"")!==next.parserStatus||row.conflict===true||row.reviewRecommended===true||Number(row.source_page_number??row.page)!==Number(rec.page);
     if(materiallyDifferent)changed++;
     resolved++;return next
   });
   return{rows:repaired,changed,resolved,canonicalCount:Object.keys(canonical).length,pageCount:pageObjects.length}
 }

 function textLayerValues(pageObjects){
   const out={};
   for(const page of pageObjects){
     const items=page.items||[];
     const pct=items.map(it=>({...it,value:percentToken(it.text)})).filter(it=>it.value!==null&&/%/.test(it.text));
     for(const name of allNames()){
       const labels=items.filter(it=>matchKnownName(it.text,allNames())===name);
       for(const lab of labels){
         let cand=pct.filter(v=>Math.abs(v.x-lab.x)<28&&v.y>lab.y-10&&v.y<lab.y+420);
         if(!cand.length)cand=pct.filter(v=>Math.abs(v.x-lab.x)<45);
         cand.sort((a,b)=>Math.abs(a.x-lab.x)-Math.abs(b.x-lab.x)+Math.abs(a.y-lab.y)*.02-Math.abs(b.y-lab.y)*.02);
         if(cand[0]){out[name]={value:cand[0].value,page:page.page,confidence:90,sourceLine:`Lab Tracker v15.1 PDF text: ${lab.text} … ${cand[0].text}`,evidenceType:"LAB_TRACKER_V15_1_TEXT",reportedName:String(lab.text||name).trim(),sourceRawText:`${lab.text} … ${cand[0].text}`};break}
       }
     }
   }
   return out
 }
 function nearbyTextValue(text,name){
   for(const alias of aliasesFor(name)){
     const e=escRe(alias).replace(/\s+/g,"\\s*");
     let ms=[...text.matchAll(new RegExp(e+"[\\s\\S]{0,180}?(-?\\d{1,3})\\s*%","ig"))];
     if(ms.length)return Number(ms.at(-1)[1]);
     const labels=[...text.matchAll(new RegExp(e,"ig"))], vals=[...text.matchAll(/(-?\d{1,3})\s*%/g)];
     let best=null;
     for(const l of labels)for(const v of vals){const d=Math.abs(v.index-l.index);if(d<=700&&(!best||d<best.d))best={d,n:Number(v[1])}}
     if(best)return best.n
   }
   return null
 }
 function detectionEvidence(pages,fileName=""){
   const source=`${fileName}\n${pages.map(p=>p.text).join("\n")}`.toUpperCase().replace(/\s+/g," ");
   const rules=[/ONCONOMICS/,/\bRGCC\b/,/CTC[S]?\s+COUNT/,/NATURAL\s+SUBSTANCES/,/GENE\s+EXPRESSION/,/SMALL\s+MOLECULAR/,/MONOCLONAL\s+ANTIBODIES/];
   const hits=rules.filter(r=>r.test(source)).length+(/ONCONOMICS|RGCC/i.test(fileName)?2:0);
   return{isOnconomics:hits>=3,score:hits}
 }

 function buildRows(pages,graphic){
   const rows=[];
   const add=(name,domain,rec)=>{
     const rawCandidates=[
       ...(rec?.candidates||[rec].filter(Boolean))
     ];
     // Add an independent text-proximity candidate when present. This is used for
     // reconciliation, not as an automatic override.
     const hasSignedGene=domain==="GENE"&&rawCandidates.some(x=>["LTX_V15_1_2_SIGNED_GENE_ROW","LTX_V15_2_CANONICAL_GENE_TABLE"].includes(x?.evidenceType));
     if(!hasSignedGene)for(const pg of pages){
       const n=nearbyTextValue(pg.text,name);
       if(n!==null){
         rawCandidates.push({
           value:n,page:pg.page,confidence:58,
           sourceLine:`Text proximity candidate: ${name} … ${n}%`,
           evidenceType:"LAB_TRACKER_V15_1_PROXIMITY"
         });
         break
       }
     }
    const canonicalGene=domain==="GENE"&&rec?.evidenceType==="LTX_V15_2_CANONICAL_GENE_TABLE"&&
      rec.value!==null&&rec.value!==undefined&&Number.isFinite(Number(rec.value));
    const canonicalChart=["DRUG","NATURAL"].includes(domain)&&
      /^LTX_V15_7_GRIDLINE_IMMUNE_(?:BAR_GEOMETRY|ZERO)$/.test(String(rec?.evidenceType||""))&&
      rec.value!==null&&rec.value!==undefined&&Number.isFinite(Number(rec.value));
    // The printed upper Gene table and the fixed-position chart geometry are
    // source-of-truth layers. OCR/proximity candidates remain in the audit trail
    // but may not silently exclude a source row from the patient booklet.
    const decision=canonicalGene?{
      value:Number(rec.value),confidence:99,confidenceBand:"HIGH",
      evidence:[{...rec,value:Number(rec.value)}],status:"VERIFIED",
      verificationStatus:"SOURCE_TABLE_VERIFIED",conflict:false,alternatives:[],
      reason:"ใช้ค่า RESULTS จากแถวเดียวกันในตาราง Gene Expression; กราฟใช้ตรวจสอบเท่านั้น",
      parserVersion:"MIW v10.129 Source Table and Chart Truth"
    }:canonicalChart?{
      value:Number(rec.value),confidence:Math.max(98,Number(rec.confidence||0)),confidenceBand:"HIGH",
      evidence:rawCandidates.length?rawCandidates:[{...rec,value:Number(rec.value)}],status:"VERIFIED",
      verificationStatus:"SOURCE_CHART_VERIFIED",conflict:false,
      alternatives:[...new Set(rawCandidates.map(x=>Number(x?.value)).filter(Number.isFinite).filter(v=>v!==Number(rec.value)))],
      reason:"ใช้ความสูงแท่งในช่องตำแหน่งคงที่เทียบเส้น 0% และ 100% ของกราฟต้นฉบับ; OCR ใช้เป็นหลักฐานประกอบ",
      parserVersion:"MIW v10.129 Fixed-position chart source truth"
    }:MIW.EvidenceEngine.reconcile(rawCandidates,{name,domain});
     const hasValue=decision.value!==null&&decision.value!==undefined;
     const geneTemplate=domain==="GENE"?MIW.GeneReportSchema?.resolve(name):null;
     const geneSubGroup=rec?.subGroup||geneTemplate?.subGroup||geneSectionFor(name,rec);
     const geneMainTopic=rec?.mainTopic||geneTemplate?.mainTopic||geneSectionFor(name,rec);
     rows.push({
       group:domain,section:domain==="GENE"?geneSubGroup:sectionFor(name,domain),name,
       main_topic_name:domain==="GENE"?geneMainTopic:sectionFor(name,domain),
       mainTopicName:domain==="GENE"?geneMainTopic:null,
       sub_group_name:domain==="GENE"?geneSubGroup:null,
       subGroupName:domain==="GENE"?geneSubGroup:null,
       value:hasValue?Number(decision.value):null,unit:hasValue?"%":"",
       page:rec?.page||decision.evidence?.[0]?.page||null,
       source_page_number:rec?.page||decision.evidence?.[0]?.page||null,
       source_raw_text:rec?.sourceRawText||rec?.sourceLine||decision.reason||"",
       reported_name:rec?.reportedName||name,
       normalized_name:name,
       sourceLine:rec?.sourceLine||decision.reason,
       sourceContext:rec?.sourceLine||decision.reason,
       confidence:decision.confidence,
       confidenceBand:decision.confidenceBand,
       evidenceType:rec?.evidenceType||"V15_2_UNRESOLVED",
       evidence:decision.evidence,
       evidenceCount:decision.evidence.length,
       verificationStatus:decision.verificationStatus,
       parserStatus:decision.status,
       conflict:decision.conflict,
       alternatives:decision.alternatives||[],
       reconciliationReason:decision.reason,
       parserVersion:decision.parserVersion,
       function:rec?.function||"",
       clinicalRisk:rec?.clinicalRisk||"",
       related:rec?.related||"",
       outcome:rec?.outcome||"",
       canonicalSource:rec?.evidenceType==="LTX_V15_2_CANONICAL_GENE_TABLE"?"GENE_TABLE":"",
       status:hasValue?(domain==="GENE"?geneStatus(decision.value):sensitivity(decision.value,{group:domain,section:sectionFor(name,domain),name})):"REVIEW",
       level:hasValue?(domain==="GENE"?geneStatus(decision.value):sensitivity(decision.value,{group:domain,section:sectionFor(name,domain),name})):"",
       engine:"MIW_V10_283_LTX_V15_11_PANEL_AWARE"
     })
   };
   for(const name of allNames()){
     const rec=graphic[name];
     // Match individual PDF/OCR text objects so a short name such as EGF, NP,
     // or p27 cannot be inferred from VEGF, NPM-ALK, or HSP27.
     const found=pages.find(p=>String(p.text||"").split(/\n+/).some(part=>matchKnownName(part,allNames())===name));
     if(rec||found){
       add(name,domainOf(name),rec||{
         value:null,page:found?.page,confidence:0,
         sourceLine:`พบชื่อ ${name} แต่ LTX ยังต้องอ่านค่าจากกราฟซ้ำ`,
         evidenceType:"V15_2_UNRESOLVED",candidates:[]
       })
     }
   }
   MIW.GeneReportSchema?.repairReportRows(rows);
   return rows
 }
 function additionalRows(pages){
   const out=[];
   for(const p of pages){
     if(!/Additional\s+tested\s+drugs\s*\/\s*substances/i.test(p.text))continue;
     const flat=String(p.text||"")
       .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g,"")
       .replace(/\s+/g," ");
     const re=/([A-Z][A-Za-z0-9+()\/-]*(?:\s+[A-Za-z0-9+()\/-]+){0,8}?)\s+Class\s*([123])\s+(\d+)\s+(\d+)\s+(Not\s+Effective|Effective)/gi;
     for(const m of flat.matchAll(re)){
      // Text extraction may prepend the table's column headers to the first
      // drug name (for example "W/O SUBSTANCE VALUE WITH SUBSTANCE EFFICACY
      // Fruquintinib"). Strip those labels before matching the catalogue so
      // the generic Drug-sensitivity row can be deduplicated correctly.
      const raw=m[1].trim()
       .replace(/^.*?\bEFFICACY\s+(?=[A-Za-z0-9])/i,"")
       .replace(/^(?:SUBSTANCE\s+NAME\s+)?(?:VALUE\s+)?W\s*\/?\s*O\s+SUBSTANCE\s+(?:VALUE\s+)?WITH\s+SUBSTANCE\s+EFFICACY\s*/i,"")
       .replace(/^WITH\s+SUBSTANCE\s+EFFICACY\s*/i,"")
       .trim();
      const exact=DRUG_NAMES.find(n=>norm(n)===norm(raw));
      const known=exact||(/\s[-+]\s/.test(raw)?raw:(matchKnownName(raw,DRUG_NAMES)||raw));
       if(/^Class\s*[123]$/i.test(known))continue;
       const valueWithout=Number(m[3]),valueWith=Number(m[4]);
       const effectiveness=/^not\s+effective$/i.test(m[5])?"Not Effective":"Effective";
       // The old and new RGCC Additional-tested tables print two assay values
       // and a qualitative EFFICACY result. They do not print a response
       // percentage. Keep the measurements as evidence, but never manufacture
       // (valueWith-valueWithout)/valueWithout as a drug-sensitivity percent.
       out.push({
         group:"ADDITIONAL",section:"Additional tested drugs",name:known,
         value:null,unit:"",valueWithout,valueWith,
         calculatedPercent:null,percentSource:"NOT_REPORTED",
         resultType:"QUALITATIVE_EFFICACY",effectiveness,status:effectiveness,
         reportedClass:`Class ${m[2]}`,
         reportLayer:{
           reportedName:raw,valueWithoutSubstance:valueWithout,
           valueWithSubstance:valueWith,efficacy:effectiveness,reportedClass:`Class ${m[2]}`,
           printedPercent:null,page:p.page,mainTopic:"Additional tested drugs"
         },
         page:p.page,sourceLine:m[0],confidence:99,
         confidenceBand:"HIGH",verificationStatus:"SOURCE_EFFICACY_VERIFIED",
         parserStatus:"VERIFIED",evidenceType:"V15_6_ADDITIONAL_EFFICACY_TABLE",
         evidence:[
           {value:valueWithout,page:p.page,confidence:99,evidenceType:"REPORTED_VALUE_WITHOUT_SUBSTANCE",sourceLine:`${known}: without substance = ${valueWithout}`},
           {value:valueWith,page:p.page,confidence:99,evidenceType:"REPORTED_VALUE_WITH_SUBSTANCE",sourceLine:`${known}: with substance = ${valueWith}`},
           {value:effectiveness,page:p.page,confidence:99,evidenceType:"REPORTED_EFFICACY",sourceLine:`${known}: EFFICACY = ${effectiveness}`}
         ],
         evidenceCount:3,
         reconciliationReason:"ใช้คอลัมน์ EFFICACY ตามรายงาน; ค่าก่อนและหลังเป็นค่า assay ไม่ใช่เปอร์เซ็นต์ drug sensitivity",
         engine:"MIW_V8_PHASE1_2_LTX_V15_6_ADDITIONAL_EFFICACY"
       })
     }
   }
   return out
 }

 async function extractPdf(file,options={}){
   const onProgress=typeof options.onProgress==="function"?options.onProgress:()=>{};
   onProgress("กำลังเปิดไฟล์ PDF...");
   if(!window.pdfjsLib)throw new Error("PDF.js not loaded");
   const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
   const requestedPages=Array.isArray(options.pageNumbers)
     ?[...new Set(options.pageNumbers.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=pdf.numPages))].sort((a,b)=>a-b)
     :[];
   const selectedPageNumbers=requestedPages.length?requestedPages:Array.from({length:pdf.numPages},(_,index)=>index+1);
   onProgress(`พบเอกสาร ${pdf.numPages} หน้า · อ่าน Onconomics ${selectedPageNumbers.length} หน้า กำลังอ่าน Text Layer...`);
   const pages=[], pageObjects=[];
   for(let localPage=1;localPage<=selectedPageNumbers.length;localPage++){
     const sourcePageNumber=selectedPageNumbers[localPage-1];
     onProgress(`กำลังอ่าน Text Layer หน้า Onconomics ${localPage}/${selectedPageNumbers.length} · ต้นฉบับหน้า ${sourcePageNumber}...`);
     const pg=await pdf.getPage(sourcePageNumber),tc=await pg.getTextContent();
     const items=tc.items.map(it=>({text:String(it.str||"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g,"").trim(),x:it.transform[4],y:it.transform[5]})).filter(it=>it.text);
     pages.push({page:localPage,sourcePageNumber,text:items.map(i=>i.text).join("\n")});
     pageObjects.push({page:localPage,sourcePageNumber,items})
   }
   const detection=detectionEvidence(pages,file.name);
   if(!detection.isOnconomics)throw new Error("ตรวจไม่พบโครงสร้าง RGCC Onconomics Plus");

   const graphic=textLayerValues(pageObjects),supplementalNaturalEvidence=[];
   for(const rec of Object.values(graphic))rec.candidates=[{...rec}];

   // Gene pages: the upper table is the canonical source. The lower graph is
   // visualization only and must not override a valid table result.
   mergeValues(graphic,signedGeneTextValues(pageObjects),{preferSource:true});
   mergeValues(graphic,canonicalGeneTableValues(pageObjects),{preferSource:true});
   const likely=pages.filter(p=>TEMPLATE_CHARTS.some(c=>c.match.test(p.text))).map(p=>p.page);
   if(likely.length){
     const worker=await getWorker(onProgress);
     for(let i=0;i<likely.length;i++){
       const n=likely[i],sourcePageNumber=pages[n-1]?.sourcePageNumber||n;
       onProgress(`กำลังอ่านกราฟ Onconomics หน้า ${n} · ต้นฉบับหน้า ${sourcePageNumber} (${i+1}/${likely.length})...`);
       const pg=await pdf.getPage(sourcePageNumber),viewport=pg.getViewport({scale:4});
       const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
       await pg.render({canvasContext:canvas.getContext("2d",{willReadFrequently:true}),viewport}).promise;
       const result=await worker.recognize(canvas);
       const ocrText=String(result.data?.text||"");
       // The fixed-position template may replace generic proximity evidence,
       // while mergeValues protects any canonical Gene-table result.
       const pageText=pages[n-1].text+"\n"+ocrText;
       const template=templateValues(result.data,pageText,canvas,n);
       // First keep Lab Tracker v15.1 numeric labels.
       mergeValues(graphic,template,{preferSource:true});
       // The percentage label can be cut by the horizontal 80%/30% rule.
       // Measure the solid bar against the printed 100% and 0% rules instead of
       // guessing damaged glyphs. This shared geometry works for both RGCC's
       // legacy 19-page and current 20-page layouts. Canonical Gene-table rows
       // remain protected inside mergeValues.
       const visual=visualBarValues(canvas,pageText,n);
       mergeValues(graphic,visual,{preferSource:true});
       // v15.10: a natural substance may be printed in more than one source
       // panel (IP6 appears in both Class I and Class III in the supplied RGCC
       // report). Preserve panel-specific evidence instead of collapsing it by
       // analyte name before the row layer is built.
       TEMPLATE_CHARTS.forEach((chart,index)=>{
         if(index<8||!chart.match.test(pageText))return;
         for(const name of chart.names){
           if(naturalSectionsForName(name).length<2)continue;
           const rec=visual[name]||template[name];
           if(rec&&Number.isFinite(Number(rec.value)))supplementalNaturalEvidence.push({name,section:naturalSectionForChartIndex(index),value:Number(rec.value),page:n,sourcePageNumber,confidence:Number(rec.confidence||98),evidenceType:rec.evidenceType||"LTX_V15_10_PANEL_AWARE_DUPLICATE",sourceLine:rec.sourceLine||`${name}: panel-specific chart value ${rec.value}%`})
         }
       });
       pages[n-1].text+="\n"+ocrText
     }
   }

   onProgress("กำลังจับคู่ชื่อยา ยีน และ Natural substances...");
   const meta=metadata(pages,file.name),summaryPage=pages.find(p=>/REPORT\s+SUMMARY/i.test(p.text))?.text||"";
   meta.reportSchemaVersion=reportSchemaVersion(pages,selectedPageNumbers.length);
   const sourcePageForLocal=localPage=>selectedPageNumbers[Math.max(0,Number(localPage||1)-1)]||Number(localPage||1);
   const attachSourcePage=row=>{
     if(!row)return row;
     row.source_page_number=sourcePageForLocal(row.page);
     if(Array.isArray(row.evidence))row.evidence=row.evidence.map(e=>({...e,source_page_number:sourcePageForLocal(e.page||row.page)}));
     if(row.reportLayer)row.reportLayer={...row.reportLayer,sourcePageNumber:sourcePageForLocal(row.reportLayer.page||row.page)};
     return row
   };
   const all=buildRows(pages,graphic).map(attachSourcePage);
   // Rehydrate panel-specific duplicate natural analytes that cannot be
   // represented by the legacy name-keyed graphic map.
   for(const rec of supplementalNaturalEvidence){
     if(all.some(row=>row.group==="NATURAL"&&norm(row.name)===norm(rec.name)&&row.section===rec.section))continue;
     const base=all.find(row=>row.group==="NATURAL"&&norm(row.name)===norm(rec.name));
     const row={...(base||{}),group:"NATURAL",section:rec.section,name:rec.name,reported_name:rec.name,normalized_name:rec.name,value:rec.value,unit:"%",page:rec.page,source_page_number:rec.sourcePageNumber,sourceLine:rec.sourceLine,sourceContext:rec.sourceLine,confidence:rec.confidence,confidenceBand:"HIGH",evidenceType:rec.evidenceType,evidence:[{value:rec.value,page:rec.page,source_page_number:rec.sourcePageNumber,confidence:rec.confidence,evidenceType:rec.evidenceType,sourceLine:rec.sourceLine}],evidenceCount:1,verificationStatus:"SOURCE_CHART_VERIFIED",parserStatus:"VERIFIED",conflict:false,alternatives:[],reconciliationReason:"Panel-aware duplicate analyte preserved from its own RGCC source graph.",parserVersion:"MIW v10.283 · LTX v15.11 Panel-aware duplicate analytes + Cluster-aware Source Truth",status:sensitivity(rec.value,{group:"NATURAL",section:rec.section,name:rec.name}),level:sensitivity(rec.value,{group:"NATURAL",section:rec.section,name:rec.name}),engine:"MIW_V10_283_LTX_V15_11_PANEL_AWARE"};
     all.push(row)
   }
   const additional=additionalRows(pages).map(attachSourcePage);
   meta.sourcePageNumbers=selectedPageNumbers.slice();
   meta.sourcePageStart=selectedPageNumbers[0]||1;
   meta.sourcePageEnd=selectedPageNumbers[selectedPageNumbers.length-1]||pdf.numPages;
   meta.sourcePageMap=Object.fromEntries(selectedPageNumbers.map((sourcePageNumber,index)=>[index+1,sourcePageNumber]));
   meta.sourceDocumentPageCount=pdf.numPages;
   const payload={
     meta,summary:summaryData(summaryPage),
     drugs:all.filter(r=>r.group==="DRUG"),
     genes:all.filter(r=>r.group==="GENE"),
     natural:all.filter(r=>r.group==="NATURAL"),
     additional,
     pageCount:selectedPageNumbers.length,detection,reportSchemaVersion:meta.reportSchemaVersion,
     extractionAudit:{
       numeric:{
         drugs:all.filter(r=>r.group==="DRUG"&&r.value!==null).length,
         genes:all.filter(r=>r.group==="GENE"&&r.value!==null).length,
         natural:all.filter(r=>r.group==="NATURAL"&&r.value!==null).length
       },
       unresolved:{
         drugs:all.filter(r=>r.group==="DRUG"&&r.value===null).length,
         genes:all.filter(r=>r.group==="GENE"&&r.value===null).length,
         natural:all.filter(r=>r.group==="NATURAL"&&r.value===null).length
       },
       engine:"MIW_V10_283_LTX_V15_11_PANEL_AWARE"
     },
     extractionWarnings:[
       "LTX v15.11 ใช้ Gridline-Immune Bar Geometry และเก็บ analyte ที่ซ้ำข้าม panel แยกตาม panel วัดแท่งจากแกน 0% ถึง 100% และปัดเป็นจำนวนเต็ม; ค่าที่เคยถูกบันทึกคลาดในฐานเก่าจะถูกแก้ด้วย printed-label source audit แยกต่างหาก",
       "ค่าจากแต่ละ reader ไม่เขียนทับหลักฐานเดิม แต่ถูกนำไป reconcile พร้อมแสดง conflict",
       "ชื่อยีนจากต้นฉบับถูกเก็บใน reported_name และจับคู่ด้วย normalized_name; ช่องว่างจาก PDF เช่น Er k ไม่ทำให้ ERK หลุดจากตาราง",
       "ค่าจาก RESULTS ในตาราง Gene Expression เป็น source of truth และกราฟ OCR ไม่มีสิทธิ์เขียนทับ",
       "ค่ากราฟรองรับทั้งรายงาน RGCC 19 หน้าและ 20 หน้า; แท่งสีน้ำเงิน ม่วง และเทาถูกวัดด้วยแกนของกราฟเดียวกัน ส่วนเส้นแนวนอนไม่ถูกนับเป็นแท่ง",
       "ค่า 0% ถูกเก็บเป็นตัวเลขจริง รายการที่จับค่าไม่ได้แสดง REVIEW โดยไม่สร้าง SUPPORTED/HIGH เอง",
       "Additional tested drugs ใช้คอลัมน์ EFFICACY ตามต้นฉบับ; ค่า VALUE W/O และ VALUE WITH เป็นหลักฐาน assay และไม่ถูกแปลงเป็นเปอร์เซ็นต์",
       "Gene Report Schema Adapter ตรวจโครงรายงาน 19 หน้าและ 20 หน้าแยกกัน แต่จัด Main Topic และ Function ด้วยชื่อยีน ไม่ผูกกับเลขหน้าของผู้ป่วยคนเดียว",
       "Clinical Risk และ Outcome ใช้ข้อความจากคอลัมน์ต้นฉบับก่อนเสมอ; ค่าเปอร์เซ็นต์ไม่มีสิทธิ์เขียนทับสถานะ HIGH RISK, LOW RISK หรือ SENSITIVE"
     ],
     engine:"MIW_V10_283_LTX_V15_11_PANEL_AWARE"
   };
   onProgress(`อ่านเสร็จ: ยา ${payload.drugs.length}, ยีน ${payload.genes.length}, Natural ${payload.natural.length}`);
   return payload
 }
 async function extractStoredPages(storedPages,options={}){
   const onProgress=typeof options.onProgress==="function"?options.onProgress:()=>{};
   const fileName=String(options.fileName||"Stored mixed PDF");
   const sourcePages=storedPageObjects(storedPages).sort((a,b)=>Number(a.page)-Number(b.page));
   if(!sourcePages.length)throw new Error("ไม่พบ Text Layer ของหน้า Onconomics ที่บันทึกไว้");
   const selectedPageNumbers=sourcePages.map(page=>Number(page.page));
   const pages=sourcePages.map((source,index)=>({page:index+1,sourcePageNumber:Number(source.page),text:String(source.text||"")}));
   const pageObjects=sourcePages.map((source,index)=>({page:index+1,sourcePageNumber:Number(source.page),items:source.items||[]}));
   const detection=detectionEvidence(pages,fileName);
   if(!detection.isOnconomics)throw new Error("Stored pages ไม่มีหลักฐาน Onconomics Plus เพียงพอ");
   onProgress(`กู้ Onconomics จาก Text Layer ที่บันทึกไว้ ${pages.length} หน้า...`);
   // Recovery mode intentionally avoids the expensive all-name proximity scan.
   // Canonical Gene tables are text-native and provide a fast, source-grounded
   // minimum dataset; chart-only drug/natural values remain absent rather than
   // being guessed. A normally auto-persisted Onconomics report still takes priority.
   const canonical=canonicalGeneTableValues(pageObjects);
   const sourcePageForLocal=localPage=>selectedPageNumbers[Math.max(0,Number(localPage||1)-1)]||Number(localPage||1);
   const genes=Object.entries(canonical).map(([name,rec])=>({
     group:"GENE",section:rec.subGroup||geneSectionFor(name,rec),name,
     main_topic_name:rec.mainTopic||geneMainTopicForPage(pages[Math.max(0,Number(rec.page||1)-1)]?.text||"",name),
     mainTopicName:rec.mainTopic||"",sub_group_name:rec.subGroup||rec.function||"",subGroupName:rec.subGroup||rec.function||"",
     value:Number(rec.value),unit:"%",page:rec.page,source_page_number:sourcePageForLocal(rec.page),
     source_raw_text:rec.sourceRawText||rec.sourceLine||"",reported_name:rec.reportedName||name,normalized_name:name,
     sourceLine:rec.sourceLine||"",sourceContext:rec.sourceLine||"",confidence:99,confidenceBand:"HIGH",
     evidenceType:rec.evidenceType||"LTX_V15_2_CANONICAL_GENE_TABLE",evidence:[{...rec,value:Number(rec.value),source_page_number:sourcePageForLocal(rec.page)}],evidenceCount:1,
     verificationStatus:"SOURCE_TABLE_VERIFIED",parserStatus:"VERIFIED",conflict:false,alternatives:[],reviewRecommended:false,
     reconciliationReason:"Recovered from the canonical RESULTS column in the stored Onconomics Gene table.",
     function:rec.function||"",clinicalRisk:rec.clinicalRisk||"",related:rec.related||"",outcome:rec.outcome||"",canonicalSource:"GENE_TABLE",
     status:geneStatus(Number(rec.value)),level:geneStatus(Number(rec.value)),engine:"MIW_V10_310_STORED_PAGE_RECOVERY"
   }));
   const additional=additionalRows(pages).map(row=>({...row,source_page_number:sourcePageForLocal(row.page)}));
   const meta=metadata(pages,fileName),summaryPage=pages.find(p=>/REPORT\s+SUMMARY/i.test(p.text))?.text||"";
   meta.reportSchemaVersion=reportSchemaVersion(pages,pages.length);
   meta.sourcePageNumbers=selectedPageNumbers.slice();meta.sourcePageStart=selectedPageNumbers[0]||1;meta.sourcePageEnd=selectedPageNumbers.at(-1)||pages.length;
   meta.sourcePageMap=Object.fromEntries(selectedPageNumbers.map((sourcePageNumber,index)=>[index+1,sourcePageNumber]));
   meta.sourceDocumentPageCount=Number(options.sourceDocumentPageCount)||Math.max(...selectedPageNumbers);
   const payload={meta,summary:summaryData(summaryPage),drugs:[],genes,natural:[],additional,pageCount:pages.length,detection,reportSchemaVersion:meta.reportSchemaVersion,
     extractionAudit:{numeric:{drugs:0,genes:genes.length,natural:0},unresolved:{drugs:0,genes:0,natural:0},engine:"MIW_V10_310_STORED_PAGE_RECOVERY"},
     extractionWarnings:["Booklet recovery used stored PDF Text Layer. Canonical Gene-table values and report summary are restored; chart-only drug/natural values are not invented. Re-uploading the source PDF allows the full chart OCR pathway when needed."],
     engine:"MIW_V10_310_STORED_PAGE_RECOVERY"};
   onProgress(`กู้ Onconomics สำเร็จ: CTC ${meta.ctc||"—"}, Gene ${genes.length}, Additional ${additional.length}`);return payload
 }
 function masterCatalog(){
   return [
     ...DRUG_NAMES.map(name=>({domain:"DRUG",name,section:sectionFor(name,"DRUG")})),
     ...GENE_NAMES.map(name=>({domain:"GENE",name,section:sectionFor(name,"GENE")})),
     ...NATURAL_NAMES.map(name=>({domain:"NATURAL",name,section:sectionFor(name,"NATURAL")}))
   ];
 }
 return{
   extractPdf,extractStoredPages,
   masterCatalog,
   masterNames:(domain="")=>masterCatalog().filter(x=>!domain||x.domain===domain).map(x=>x.name),
   reconcileStoredResults,
   engineVersion:"MIW v10.283 · LTX v15.11 Source-profile + Cluster-aware panel recovery",
   _test:{additionalRows,visualBarValues,canonicalGeneTableValues,storedPageObjects,reconcileStoredResults,mergeValues,buildRows,norm,summaryData,metadata,sectionFor,naturalClass}
 };
})();
