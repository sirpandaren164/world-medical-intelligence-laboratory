window.MIW=window.MIW||{};
MIW.DiagnosticModules=(function(){
 const VERSION="10.274";
 const text=v=>v===0?"0":String(v??"").trim();
 const upper=v=>text(v).toUpperCase();
 const lower=v=>text(v).toLowerCase();
 const DEFINITIONS={
  GENERAL_LAB:{id:"GENERAL_LAB",label:"ผลแล็บทั่วไป",labelEn:"General Laboratory",short:"LAB",category:"",dashboard:"trend",booklet:"general",semantics:"reference",order:10,description:"CBC, chemistry, renal, liver, lipid, tumor marker และผลเชิงตัวเลขที่เหมาะกับการติดตามตามเวลา",descriptionEn:"CBC, chemistry, renal, liver, lipid, tumor markers and numerical results suitable for longitudinal tracking"},
  ALLERGY_IGE:{id:"ALLERGY_IGE",label:"Allergy — Specific IgE",labelEn:"Allergy — Specific IgE",short:"IgE",category:"Allergy",dashboard:"allergy",booklet:"specific-ige",semantics:"class",order:20,description:"แยก Food / Inhalant และอ่าน concentration ร่วมกับ Class 0–6",descriptionEn:"Separates Food / Inhalant allergens and interprets concentration together with Class 0–6"},
  FOOD_IGG:{id:"FOOD_IGG",label:"Food-specific IgG",labelEn:"Food-specific IgG",short:"IgG",category:"Food-specific IgG",dashboard:"food-igg",booklet:"food-igg",semantics:"food-cutoff",order:30,description:"จัดตาม High / Borderline / Normal ของชุดตรวจ ไม่ปนกับ specific IgE",descriptionEn:"Uses the assay’s High / Borderline / Normal categories and keeps them separate from specific IgE"},
  AUTOIMMUNE:{id:"AUTOIMMUNE",label:"Autoimmune & Autoantibody",labelEn:"Autoimmune & Autoantibody",short:"AI",category:"Autoimmune & Immunology",dashboard:"autoimmune",booklet:"autoimmune",semantics:"pattern-titer",order:40,description:"ANA pattern/titer, dsDNA, ENA และ Complement อ่านเป็น constellation ไม่ใช่ High/Low อย่างเดียว",descriptionEn:"ANA pattern/titer, dsDNA, ENA and Complement are interpreted as a constellation rather than a generic High/Low result"},
  TOXICOLOGY:{id:"TOXICOLOGY",label:"Toxicology / Heavy Metals",labelEn:"Toxicology / Heavy Metals",short:"TOX",category:"Toxicology / Heavy Metals",dashboard:"toxicology",booklet:"toxicology",semantics:"exposure",order:50,description:"แสดงสาร, specimen, result/reference และบริบทการสัมผัส",descriptionEn:"Shows analyte, specimen, result/reference and exposure context"},
  MICRONUTRIENT:{id:"MICRONUTRIENT",label:"Micronutrients & Nutritional Status",labelEn:"Micronutrients & Nutritional Status",short:"MICRO",category:"Micronutrients & Nutritional Status",dashboard:"micronutrient",booklet:"micronutrient",semantics:"normal-optimal",order:60,description:"วิตามิน แร่ธาตุ และ antioxidant profile พร้อมแยก clinical range จาก optimal/anti-aging target",descriptionEn:"Vitamins, minerals and antioxidant profiles with clinical ranges kept separate from optimal/anti-aging targets"},
  INBODY:{id:"INBODY",label:"InBody 720 — Body Composition",labelEn:"InBody 720 — Body Composition",short:"IB",category:"Body Composition",dashboard:"inbody",booklet:"inbody",semantics:"body-composition",order:70,description:"องค์ประกอบร่างกาย กล้ามเนื้อ-ไขมัน Segmental และ water balance",descriptionEn:"Body composition, muscle-fat distribution, segmental analysis and water balance"},
  HEMOGLOBIN_TYPING:{id:"HEMOGLOBIN_TYPING",label:"Hemoglobin Typing",labelEn:"Hemoglobin Typing",short:"Hb",category:"Hemoglobin Typing",dashboard:"hemoglobin",booklet:"hemoglobin",semantics:"fraction-pattern",order:75,description:"สรุป Hb fractions และ interpretation โดยไม่ตีความเป็น High/Low ทั่วไป",descriptionEn:"Summarizes Hb fractions and interpretation without forcing them into generic High/Low semantics"},
  MOLECULAR:{id:"MOLECULAR",label:"Molecular / PCR",labelEn:"Molecular / PCR",short:"PCR",category:"Molecular",dashboard:"categorical",booklet:"molecular",semantics:"detected",order:80,description:"Detected / Not detected / variant-type results แยกจาก numerical laboratory trend",descriptionEn:"Detected / Not detected / variant-type results are separated from numerical laboratory trends"},
  MASUYAMA:{id:"MASUYAMA",label:"Masuyama / Osaki Immunity",labelEn:"Masuyama / Osaki Immunity",short:"MASU",category:"Masuyama Immunological",dashboard:"masuyama",booklet:"masuyama",semantics:"method-specific",order:90,description:"ใช้ Best range และ immunity level ของรายงาน Masuyama โดยเฉพาะ",descriptionEn:"Uses Masuyama-specific Best range and immunity level"},
  CTC:{id:"CTC",label:"CTC / Liquid Biopsy",labelEn:"CTC / Liquid Biopsy",short:"CTC",category:"CTC",dashboard:"ctc",booklet:"ctc",semantics:"oncology",order:100,description:"CTC count, phenotype และ marker profile",descriptionEn:"CTC count, phenotype and marker profile"},
  METASTAT:{id:"METASTAT",label:"METASTAT",labelEn:"METASTAT",short:"META",category:"CTC",dashboard:"metastat",booklet:"metastat",semantics:"organ-marker",order:110,description:"organ → marker → sample level → normal level → regulation",descriptionEn:"organ → marker → sample level → normal level → regulation"},
  ONCONOMICS:{id:"ONCONOMICS",label:"Onconomics / Treatment Sensitivity",labelEn:"Onconomics / Treatment Sensitivity",short:"ONCO",category:"CTC",dashboard:"oncology-sensitivity",booklet:"onconomics",semantics:"sensitivity",order:120,description:"drug sensitivity, gene expression, pathways, resistance และ natural substances",descriptionEn:"drug sensitivity, gene expression, pathways, resistance and natural substances"}
 };
 const AUTOIMMUNE_CODES=new Set([
  "ana_if","ana_pattern_interpretation","ana_nuclear_membrane","ana_homogeneous","ana_fine_speckle_titer","ana_dense_fine_speckle","ana_coarse_speckle","ana_centromere","ana_nucleolar","ana_nuclear_dot","ana_centrioles","ana_spindle_fibres","ana_midbody","ana_cytoplasmic_staining","anti_dsdna_titer","anti_sm","anti_nrnp","anti_ssa","anti_ssb","complement_c3","complement_c4"
 ]);
 const TOX_CODES=new Set(["aluminium_blood","arsenic_blood","cadmium_blood","lead_blood","mercury_blood","arsenic_urine"]);
 const MICRO_CODES=new Set(["vitamin_a_retinol","vitamin_e_gamma","vitamin_e_alpha","lutein_zeaxanthin","beta_cryptoxanthin","lycopene","alpha_carotene","beta_carotene","coenzyme_q10","vitamin_c_ascorbate"]);
 function profileOf(row){return upper(row?.specializedProfile||row?.specialized_profile||row?.sourceProfile||row?.source_profile||row?.profileCode||row?.profile_code||row?.reportType||row?.report_type)}
 function codeOf(row){return lower(row?.testCode||row?.test_code)}
 function hay(row){return [row?.name,row?.reportedName,row?.reported_name,row?.group,row?.panel,row?.category,row?.section,row?.sourceDocument,row?.source_document,row?.sourceFileName,row?.source_file_name,row?.sourceFile,row?.source_file,row?.fileName,row?.originalFileName,row?.reportType,row?.report_type,row?.type,row?.importMode,row?.import_mode,row?.documentType,row?.document_type,row?.testCode,row?.test_code].map(text).join("\n")}
 function familyId(row){
  const profile=profileOf(row),code=codeOf(row),raw=hay(row),group=text(row?.group),panel=text(row?.panel);
  if(profile.includes("METASTAT")||code.startsWith("metastat_")||/\bMETASTAT\b/i.test(raw))return"METASTAT";
  if(/ONCONOMICS/i.test(profile)||/ONCONOMICS/i.test(raw)||/^(?:onco_|onconomics_|rgcc_onconomics)/i.test(code)||/ONCONOMICS[_\s-]*PLUS|RGCC[_\s-]*ONCONOMICS/i.test(raw))return"ONCONOMICS";
  if(profile.includes("ONCOTRAIL")||/^(?:oncotrail_|ctc_)/.test(code)||/\bONCOTRAIL\b/i.test(raw))return"CTC";
  if(profile==="INBODY_720"||code.startsWith("inbody_")||/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area/i.test(raw))return"INBODY";
  if(profile.includes("MASUYAMA")||code.startsWith("masuyama_")||/Masuyama|Comprehensive\s+Immunity|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i.test(raw))return"MASUYAMA";
  if(profile.includes("FOOD_INTOLERANCE")||code.startsWith("food_igg_")||group==="Food-specific IgG"||/FoodPrint|Food[-\s]*specific\s*IgG/i.test(raw))return"FOOD_IGG";
  if(profile.includes("ALLERGY")||code.startsWith("allergy_")||group==="Allergy"||/Specific\s*IgE|Allergy\s+Report/i.test(raw))return"ALLERGY_IGE";
  if(profile.includes("HEMOGLOBIN_TYPING")||code.startsWith("hb_typing_")||["hb_a","hb_a2"].includes(code)||/Hemoglobin\s*Typing|Hb\s*typing/i.test(raw))return"HEMOGLOBIN_TYPING";
  if(AUTOIMMUNE_CODES.has(code)||/Autoimmune\s+Serology|ANA\s+IFA\s+Pattern|Extractable\s+Nuclear\s+Antigen|\bENA\b|Anti[-\s]*(?:dsDNA|Sm|nRNP|SSA|SSB)|Complement\s+C[34]/i.test(`${panel}\n${raw}`))return"AUTOIMMUNE";
  if(TOX_CODES.has(code)||profile.includes("HEAVY_METAL")||group==="Toxicology"||/Heavy\s+Metals?|Arsenic\s+in\s+(?:Blood|Urine)|Cadmium|Mercury|Lead\s+in\s+Blood|Alumin(?:ium|um)\s+in\s+Blood/i.test(raw))return"TOXICOLOGY";
  if(profile.includes("MICRONUTRIENT")||/Micronutrients?|Antioxidant\s+Profile/i.test(panel)||/Micronutrients?\s+Profile/i.test(raw)||MICRO_CODES.has(code))return"MICRONUTRIENT";
  if(group==="Molecular"||/Respiratory\s+Pathogen\s+Panel|RT[-\s]*PCR|Molecular\s+Respiratory/i.test(`${panel}\n${raw}`))return"MOLECULAR";
  if(group==="CTC"||group==="Cancer Liquid Biopsy")return"CTC";
  return"GENERAL_LAB"
 }
 function definition(rowOrId){const id=typeof rowOrId==="string"&&DEFINITIONS[rowOrId]?rowOrId:familyId(rowOrId);return DEFINITIONS[id]||DEFINITIONS.GENERAL_LAB}
 function categoryFor(row){const def=definition(row);return def.category||text(row?.group)||"Other"}
 function isGeneral(row){return familyId(row)==="GENERAL_LAB"}
 function isSpecialized(row){return !isGeneral(row)}
 function groups(rows=[]){
  const map=new Map();
  rows.forEach(row=>{const id=familyId(row);if(!map.has(id))map.set(id,[]);map.get(id).push(row)});
  return [...map.entries()].map(([id,items])=>({definition:DEFINITIONS[id]||DEFINITIONS.GENERAL_LAB,items})).sort((a,b)=>a.definition.order-b.definition.order)
 }
 return{version:VERSION,DEFINITIONS,familyId,definition,categoryFor,isGeneral,isSpecialized,groups,profileOf,codeOf,__test:{AUTOIMMUNE_CODES,TOX_CODES,MICRO_CODES}};
})();
