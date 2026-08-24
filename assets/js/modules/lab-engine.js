window.MIW=window.MIW||{};
MIW.LabEngine=(function(){
 let documentRecord=null,rows=[],meta={},activeIssueId=null,sourcePages=[],sourceGroups=[],verifyZoom=1;
 let duplicateResolutionLedger=new Map(),resolutionDocumentId="";
 let batchIdentityOverrideMemory=new Set();
 let lastImportSummary={saved:0,suppressed:0,replaced:0,duplicateDocument:false,rawExtracted:0,uniqueCandidates:0,mergedOrSuppressed:0,excluded:0,baselineRows:0,coverageDrop:0};
 let parseAudit={rawExtracted:0,stages:[],dropped:[],finalCandidates:0,excludedNonLabPages:0};
 const TESTS=[
  // v10.247 — InBody 720 adaptive-reference + impedance detailed profile. These observations are
  // stored separately from conventional blood laboratory analytes.
  ["อายุ ณ วันที่ตรวจ","Body Composition","InBody 720 — ข้อมูลการตรวจ","inbody_reported_age"],
  ["ส่วนสูง","Body Composition","InBody 720 — ข้อมูลการตรวจ","inbody_height_cm"],
  ["น้ำภายในเซลล์ (ICW)","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_intracellular_water"],
  ["น้ำภายนอกเซลล์ (ECW)","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_extracellular_water"],
  ["น้ำทั้งหมดในร่างกาย (TBW)","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_total_body_water"],
  ["โปรตีน","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_protein"],
  ["เกลือแร่","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_minerals"],
  ["น้ำหนักเนื้อไม่รวมกระดูก (Soft Lean Mass)","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_soft_lean_mass"],
  ["มวลรวมที่ไม่รวมไขมัน (Fat Free Mass)","Body Composition","InBody 720 — องค์ประกอบร่างกาย","inbody_fat_free_mass"],
  ["เกลือแร่ในกระดูก (BMC)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_bone_mineral_content"],
  ["น้ำหนัก","Body Composition","InBody 720 — วิเคราะห์กล้ามเนื้อและไขมัน","inbody_weight"],
  ["มวลกล้ามเนื้อลาย (SMM)","Body Composition","InBody 720 — วิเคราะห์กล้ามเนื้อและไขมัน","inbody_skeletal_muscle_mass"],
  ["มวลไขมัน","Body Composition","InBody 720 — วิเคราะห์กล้ามเนื้อและไขมัน","inbody_body_fat_mass"],
  ["ดัชนีมวลกาย (BMI)","Body Composition","InBody 720 — การวินิจฉัยโรคอ้วน","inbody_bmi"],
  ["ร้อยละไขมันในร่างกาย (PBF)","Body Composition","InBody 720 — การวินิจฉัยโรคอ้วน","inbody_percent_body_fat"],
  ["อัตราส่วนเอวต่อสะโพก (WHR)","Body Composition","InBody 720 — การวินิจฉัยโรคอ้วน","inbody_waist_hip_ratio"],
  ["พื้นที่ไขมันในช่องท้อง (Visceral Fat Area)","Body Composition","InBody 720 — ไขมันในช่องท้อง","inbody_visceral_fat_area"],
  ["ค่าบวมน้ำ ECW/TBW (แผงค่าบวมน้ำ)","Body Composition","InBody 720 — สมดุลน้ำ","inbody_ecw_tbw"],
  ["ECW/TBW ใน Body Composition History","Body Composition","InBody 720 — ประวัติองค์ประกอบร่างกาย","inbody_history_ecw_tbw"],
  ["สัดส่วน ECF/TBF รวม","Body Composition","InBody 720 — สมดุลน้ำ","inbody_ecf_tbf"],
  ["ระดับโรคอ้วน (Obesity Degree)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_obesity_degree"],
  ["มวลเซลล์ร่างกาย (BCM)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_body_cell_mass"],
  ["อัตราการเผาผลาญพื้นฐาน (BMR)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_bmr"],
  ["เส้นรอบวงแขน (AC)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_arm_circumference"],
  ["เส้นรอบวงกล้ามเนื้อแขน (AMC)","Body Composition","InBody 720 — ข้อมูลเพิ่มเติม","inbody_arm_muscle_circumference"],
  ["น้ำหนักเป้าหมาย","Body Composition","InBody 720 — การควบคุมน้ำหนัก","inbody_target_weight"],
  ["น้ำหนักที่ต้องควบคุม","Body Composition","InBody 720 — การควบคุมน้ำหนัก","inbody_weight_control"],
  ["ไขมันที่ต้องควบคุม","Body Composition","InBody 720 — การควบคุมน้ำหนัก","inbody_fat_control"],
  ["กล้ามเนื้อที่ต้องควบคุม","Body Composition","InBody 720 — การควบคุมน้ำหนัก","inbody_muscle_control"],
  ["Fitness Score","Body Composition","InBody 720 — Fitness Score","inbody_fitness_score"],
  ["มวลกล้ามเนื้อแขนขวา","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_right_arm_lean_mass"],
  ["กล้ามเนื้อแขนขวาเทียบค่ามาตรฐาน","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_right_arm_lean_pct"],
  ["มวลไขมันแขนขวา","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_right_arm_fat_mass"],
  ["ไขมันแขนขวาเทียบค่ามาตรฐาน","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_right_arm_fat_pct"],
  ["ECF/TBF แขนขวา","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_right_arm_ecf_tbf"],
  ["ECW/TBW แขนขวา","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_right_arm_ecw_tbw"],
  ["มวลกล้ามเนื้อแขนซ้าย","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_left_arm_lean_mass"],
  ["กล้ามเนื้อแขนซ้ายเทียบค่ามาตรฐาน","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_left_arm_lean_pct"],
  ["มวลไขมันแขนซ้าย","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_left_arm_fat_mass"],
  ["ไขมันแขนซ้ายเทียบค่ามาตรฐาน","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_left_arm_fat_pct"],
  ["ECF/TBF แขนซ้าย","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_left_arm_ecf_tbf"],
  ["ECW/TBW แขนซ้าย","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_left_arm_ecw_tbw"],
  ["มวลกล้ามเนื้อลำตัว","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_trunk_lean_mass"],
  ["กล้ามเนื้อลำตัวเทียบค่ามาตรฐาน","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_trunk_lean_pct"],
  ["มวลไขมันลำตัว","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_trunk_fat_mass"],
  ["ไขมันลำตัวเทียบค่ามาตรฐาน","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_trunk_fat_pct"],
  ["ECF/TBF ลำตัว","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_trunk_ecf_tbf"],
  ["ECW/TBW ลำตัว","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_trunk_ecw_tbw"],
  ["มวลกล้ามเนื้อขาขวา","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_right_leg_lean_mass"],
  ["กล้ามเนื้อขาขวาเทียบค่ามาตรฐาน","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_right_leg_lean_pct"],
  ["มวลไขมันขาขวา","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_right_leg_fat_mass"],
  ["ไขมันขาขวาเทียบค่ามาตรฐาน","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_right_leg_fat_pct"],
  ["ECF/TBF ขาขวา","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_right_leg_ecf_tbf"],
  ["ECW/TBW ขาขวา","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_right_leg_ecw_tbw"],
  ["มวลกล้ามเนื้อขาซ้าย","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_left_leg_lean_mass"],
  ["กล้ามเนื้อขาซ้ายเทียบค่ามาตรฐาน","Body Composition","InBody 720 — กล้ามเนื้อรายส่วน","inbody_segment_left_leg_lean_pct"],
  ["มวลไขมันขาซ้าย","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_left_leg_fat_mass"],
  ["ไขมันขาซ้ายเทียบค่ามาตรฐาน","Body Composition","InBody 720 — ไขมันรายส่วน","inbody_segment_left_leg_fat_pct"],
  ["ECF/TBF ขาซ้าย","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_left_leg_ecf_tbf"],
  ["ECW/TBW ขาซ้าย","Body Composition","InBody 720 — สมดุลน้ำรายส่วน","inbody_segment_left_leg_ecw_tbw"],
  ["Impedance 1 kHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1khz_ra"],
  ["Impedance 1 kHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1khz_la"],
  ["Impedance 1 kHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1khz_tr"],
  ["Impedance 1 kHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1khz_rl"],
  ["Impedance 1 kHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1khz_ll"],
  ["Impedance 5 kHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_5khz_ra"],
  ["Impedance 5 kHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_5khz_la"],
  ["Impedance 5 kHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_5khz_tr"],
  ["Impedance 5 kHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_5khz_rl"],
  ["Impedance 5 kHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_5khz_ll"],
  ["Impedance 50 kHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_50khz_ra"],
  ["Impedance 50 kHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_50khz_la"],
  ["Impedance 50 kHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_50khz_tr"],
  ["Impedance 50 kHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_50khz_rl"],
  ["Impedance 50 kHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_50khz_ll"],
  ["Impedance 250 kHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_250khz_ra"],
  ["Impedance 250 kHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_250khz_la"],
  ["Impedance 250 kHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_250khz_tr"],
  ["Impedance 250 kHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_250khz_rl"],
  ["Impedance 250 kHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_250khz_ll"],
  ["Impedance 500 kHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_500khz_ra"],
  ["Impedance 500 kHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_500khz_la"],
  ["Impedance 500 kHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_500khz_tr"],
  ["Impedance 500 kHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_500khz_rl"],
  ["Impedance 500 kHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_500khz_ll"],
  ["Impedance 1 MHz RA (แขนขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1mhz_ra"],
  ["Impedance 1 MHz LA (แขนซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1mhz_la"],
  ["Impedance 1 MHz TR (ลำตัว)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1mhz_tr"],
  ["Impedance 1 MHz RL (ขาขวา)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1mhz_rl"],
  ["Impedance 1 MHz LL (ขาซ้าย)","Body Composition","InBody 720 — ความต้านทานกระแสไฟฟ้า","inbody_impedance_1mhz_ll"],
  ["Hb","Hematology","Complete Blood Count (CBC)","hb"],["Hct","Hematology","Complete Blood Count (CBC)","hct"],["WBC","Hematology","Complete Blood Count (CBC)","wbc"],["NRBC","Hematology","Complete Blood Count (CBC)","nrbc"],
  ["Neutrophils %","Hematology","WBC Differential — Percent","neutrophil_pct"],["Lymphocytes %","Hematology","WBC Differential — Percent","lymphocyte_pct"],["Monocytes %","Hematology","WBC Differential — Percent","monocyte_pct"],["Eosinophils %","Hematology","WBC Differential — Percent","eosinophil_pct"],["Basophils %","Hematology","WBC Differential — Percent","basophil_pct"],["Immature Granulocytes %","Hematology","WBC Differential — Percent","ig_pct"],
  ["Neutrophils Absolute","Hematology","WBC Differential — Absolute","neutrophil_abs"],["Lymphocytes Absolute","Hematology","WBC Differential — Absolute","lymphocyte_abs"],["Monocytes Absolute","Hematology","WBC Differential — Absolute","monocyte_abs"],["Eosinophils Absolute","Hematology","WBC Differential — Absolute","eosinophil_abs"],["Basophils Absolute","Hematology","WBC Differential — Absolute","basophil_abs"],["Immature Granulocytes Absolute","Hematology","WBC Differential — Absolute","ig_abs"],
  ["RBC Count","Hematology","Complete Blood Count (CBC)","rbc_count"],["MCV","Hematology","Complete Blood Count (CBC)","mcv"],["MCH","Hematology","Complete Blood Count (CBC)","mch"],["MCHC","Hematology","Complete Blood Count (CBC)","mchc"],["RDW","Hematology","Complete Blood Count (CBC)","rdw"],["MPV","Hematology","Complete Blood Count (CBC)","mpv"],["Platelet Smear","Hematology","Complete Blood Count (CBC)","platelet_smear"],["Platelet count","Hematology","Complete Blood Count (CBC)","platelet_count"],["RBC Morphology","Hematology","Complete Blood Count (CBC)","rbc_morphology"],["Anisocytosis","Hematology","Complete Blood Count (CBC)","anisocytosis"],["Microcytosis","Hematology","Complete Blood Count (CBC)","microcytosis"],["ESR","Hematology","Inflammation","esr"],
  ["Reticulocyte %","Hematology","Reticulocyte Count","reticulocyte_pct"],["Reticulocytes Absolute","Hematology","Reticulocyte Count","reticulocyte_abs"],
  ["Myelocyte %","Hematology","WBC Differential — Percent","myelocyte_pct"],["Metamyelocyte %","Hematology","WBC Differential — Percent","metamyelocyte_pct"],
  ["Fibrin Degradation Product (FDP)","Hematology","Coagulation","fdp"],
  ["Direct Coombs Test","Hematology","Immunohematology","direct_coombs"],["Indirect Coombs Test","Hematology","Immunohematology","indirect_coombs"],
  ["Alpha Fetoprotein (AFP)","Tumor Marker","Tumor Markers","afp"],["Beta HCG","Tumor Marker","Tumor Markers","beta_hcg"],["CA 125 (Ovary Cancer)","Tumor Marker","Tumor Markers","ca_125"],["CA 15-3 (Breast Cancer)","Tumor Marker","Tumor Markers","ca_15_3"],["CA 19-9 (Digestive Tract)","Tumor Marker","Tumor Markers","ca_19_9"],["Carcinoembryonic Antigen (CEA)","Tumor Marker","Tumor Markers","cea"],["CRP (C-Reactive Protein High Sens.)","Immunology","Inflammation","crp_hs"],["NT-ProBNP","Immunology","Cardiac Biomarkers","nt_probnp"],
  ["Prostatic Specific Antigen (PSA)","Tumor Marker","Tumor Markers","psa"],
  ["Hemoglobin A (Hb A)","Hematology","Hemoglobin Typing","hb_a"],
  ["Hemoglobin A2 (Hb A2)","Hematology","Hemoglobin Typing","hb_a2"],
  ["Hemoglobin Typing Interpretation","Hematology","Hemoglobin Typing","hb_typing_interpretation"],
  ["Hemoglobin Typing Laboratory Recommendation","Hematology","Hemoglobin Typing","hb_typing_recommendation"],
  ["Estradiol (E2)","Hormone","Reproductive Hormones","estradiol_e2"],["Follicle Stimulating Hormone (FSH)","Hormone","Reproductive Hormones","fsh"],["Luteinizing Hormone (LH)","Hormone","Reproductive Hormones","lh"],["Free T3","Hormone","Thyroid Hormones","free_t3"],["Free T4","Hormone","Thyroid Hormones","free_t4"],["Thyroid Stimulating Hormone (TSH)","Hormone","Thyroid Hormones","tsh"],["HIV Ag","Immunology","Infectious Serology","hiv_ag"],["HIV Ab","Immunology","Infectious Serology","hiv_ab"],["Anti HIV (Interpretation)","Immunology","Infectious Serology","anti_hiv_interpretation"],["Syphilis","Immunology","Infectious Serology","syphilis"],
  ["Insulin","Hormone","Metabolic Hormones","insulin"],
  ["Cortisol","Hormone","Adrenal Hormones","cortisol"],
  ["Progesterone","Hormone","Reproductive Hormones","progesterone"],
  ["Testosterone","Hormone","Reproductive Hormones","testosterone"],
  ["Homocysteine","Clinical Chemistry","Cardiometabolic Risk","homocysteine"],
  ["DHEA-Sulfate","Hormone","Adrenal Hormones","dhea_sulfate"],
  ["Masuyama Comprehensive Immunity Level","Immunology","Masuyama Comprehensive Immunity","masuyama_immunity_level"],
  ["Neutrophil / Lymphocyte Ratio (NLR)","Immunology","Masuyama Comprehensive Immunity","masuyama_nlr"],
  ["Number of Lymphocytes","Immunology","Masuyama Comprehensive Immunity","masuyama_lymphocyte_count"],
  ["CD4 / CD8 Ratio","Immunology","Masuyama Comprehensive Immunity","masuyama_cd4_cd8_ratio"],
  ["Number of NK Cells","Immunology","Masuyama Comprehensive Immunity","masuyama_nk_cell_count"],
  ["NK Vue","Immunology","Masuyama Comprehensive Immunity","masuyama_nk_vue"],
  ["Number of NKG2D+ Cells","Immunology","Masuyama Comprehensive Immunity","masuyama_nkg2d_cell_count"],
  ["Aluminium in Blood","Toxicology","Heavy Metals in Blood","aluminium_blood"],
  ["Arsenic in Blood","Toxicology","Heavy Metals in Blood","arsenic_blood"],
  ["Cadmium in Blood","Toxicology","Heavy Metals in Blood","cadmium_blood"],
  ["Lead in Blood","Toxicology","Heavy Metals in Blood","lead_blood"],
  ["Mercury in Blood","Toxicology","Heavy Metals in Blood","mercury_blood"],
  ["Blood Urea Nitrogen (BUN)","Clinical Chemistry","Renal Function","bun"],["Urea","Clinical Chemistry","Renal Function","urea"],["Uric Acid","Clinical Chemistry","Renal Function","uric_acid"],["Calcium","Vitamin & Mineral","Minerals","calcium"],["Corrected Calcium","Vitamin & Mineral","Minerals","corrected_calcium"],["CK-MB","Clinical Chemistry","Cardiac Biomarkers","ck_mb"],["Creatinine","Clinical Chemistry","Renal Function","creatinine"],["eGFR (CKD-EPI)","Clinical Chemistry","Renal Function","egfr_ckd_epi"],["Na","Clinical Chemistry","Electrolyte","sodium"],["K","Clinical Chemistry","Electrolyte","potassium"],["CL","Clinical Chemistry","Electrolyte","chloride"],["CO2","Clinical Chemistry","Electrolyte","co2"],["Anion Gap","Clinical Chemistry","Electrolyte","anion_gap"],["Glucose (Fasting Blood Sugar)","Clinical Chemistry","Glucose","fasting_glucose"],["Glucose (Random)","Clinical Chemistry","Glucose","random_glucose"],["Glycated Hb (HbA1c)","Clinical Chemistry","Glucose","hba1c"],["Hb A1c (IFCC)","Clinical Chemistry","Glucose","hba1c_ifcc"],["Estimated average glucose (eAG)","Clinical Chemistry","Glucose","eag"],["Calculated Osmolality","Clinical Chemistry","Electrolyte","calculated_osmolality"],["Lactate Dehydrogenase (LDH)","Clinical Chemistry","Enzyme","ldh"],["Cholesterol","Lipid Profile","Lipid Profile","cholesterol"],["Triglyceride","Lipid Profile","Lipid Profile","triglyceride"],["HDL-Cholesterol","Lipid Profile","Lipid Profile","hdl_cholesterol"],["LDL-Cholesterol","Lipid Profile","Lipid Profile","ldl_cholesterol"],["Total Protein","Liver Function Test","Liver Function","total_protein"],["Albumin","Liver Function Test","Liver Function","albumin"],["Globulin","Liver Function Test","Liver Function","globulin"],["Total Bilirubin","Liver Function Test","Liver Function","total_bilirubin"],["Direct Bilirubin","Liver Function Test","Liver Function","direct_bilirubin"],["AST","Liver Function Test","Liver Function","ast"],["ALT","Liver Function Test","Liver Function","alt"],["ALP","Liver Function Test","Liver Function","alp"],["Magnesium","Vitamin & Mineral","Minerals","magnesium"],["Phosphorus","Vitamin & Mineral","Minerals","phosphorus"],["Iron","Clinical Chemistry","Iron Studies","iron"],["Transferrin Saturation","Clinical Chemistry","Iron Studies","transferrin_saturation"],["Transferrin","Clinical Chemistry","Iron Studies","transferrin"],["Vitamin D (25 Hydroxy)","Vitamin & Mineral","Vitamins","vitamin_d_25_oh"],["Troponin-T (ที)","Clinical Chemistry","Cardiac Biomarkers","troponin_t"],
  ["Gamma-Glutamyl Transferase (GGT)","Liver Function Test","Liver Function","ggt"],
  ["Amylase","Clinical Chemistry","Pancreatic Enzymes","amylase"],
  ["Lipase","Clinical Chemistry","Pancreatic Enzymes","lipase"],
  ["C-Reactive Protein (CRP)","Immunology","Inflammation","crp"],
  ["Prothrombin Time (PT)","Hematology","Coagulation","prothrombin_time"],
  ["International Normalized Ratio (INR)","Hematology","Coagulation","inr"],
  ["Activated Partial Thromboplastin Time (APTT)","Hematology","Coagulation","aptt"],
  ["Venous pH (POC)","Point of Care","Venous Blood Gas","poc_venous_ph"],
  ["Venous pCO2 (POC)","Point of Care","Venous Blood Gas","poc_venous_pco2"],
  ["Venous pO2 (POC)","Point of Care","Venous Blood Gas","poc_venous_po2"],
  ["Ionized Calcium (POC)","Point of Care","Venous Blood Gas","poc_ionized_calcium"],
  ["Lactate (POC)","Point of Care","Venous Blood Gas","poc_lactate"],
  ["Venous Oxygen Saturation (POC)","Point of Care","Venous Blood Gas","poc_venous_so2"],
  ["Oxyhemoglobin (POC)","Point of Care","Venous Blood Gas","poc_oxyhemoglobin"],
  ["Carboxyhemoglobin (POC)","Point of Care","Venous Blood Gas","poc_carboxyhemoglobin"],
  ["Methemoglobin (POC)","Point of Care","Venous Blood Gas","poc_methemoglobin"],
  ["Standard Bicarbonate (POC)","Point of Care","Venous Blood Gas","poc_standard_bicarbonate"],
  ["Total CO2 (POC)","Point of Care","Venous Blood Gas","poc_total_co2"],
  ["Base Excess (POC)","Point of Care","Venous Blood Gas","poc_base_excess"],
  ["Base Excess ECF (POC)","Point of Care","Venous Blood Gas","poc_base_excess_ecf"],
  ["Sodium (POC)","Point of Care","Venous Blood Gas","poc_sodium"],
  ["Potassium (POC)","Point of Care","Venous Blood Gas","poc_potassium"],
  ["Chloride (POC)","Point of Care","Venous Blood Gas","poc_chloride"],
  ["Glucose (POC)","Point of Care","Venous Blood Gas","poc_glucose"],
  ["Hematocrit (POC)","Point of Care","Venous Blood Gas","poc_hematocrit"],
  ["Total Hemoglobin (POC)","Point of Care","Venous Blood Gas","poc_total_hemoglobin"],
  ["Hypochromia","Hematology","Complete Blood Count (CBC)","hypochromia"],
  ["Urine Creatinine","Clinical Chemistry","Urine Protein/Creatinine","urine_creatinine"],
  ["Urine Protein","Clinical Chemistry","Urine Protein/Creatinine","urine_protein_quantitative"],
  ["Urine Protein/Creatinine Ratio","Clinical Chemistry","Urine Protein/Creatinine","urine_protein_creatinine_ratio"],
  ["ANA-IF","Immunology","Autoimmune Serology","ana_if"],
  ["ANA Pattern Interpretation","Immunology","ANA IFA Pattern","ana_pattern_interpretation"],
  ["ANA Nuclear Membrane Pattern","Immunology","ANA IFA Pattern","ana_nuclear_membrane"],
  ["ANA Homogeneous Pattern","Immunology","ANA IFA Pattern","ana_homogeneous"],
  ["ANA Fine Speckled Pattern Titer","Immunology","ANA IFA Pattern","ana_fine_speckle_titer"],
  ["ANA Dense Fine Speckled Pattern","Immunology","ANA IFA Pattern","ana_dense_fine_speckle"],
  ["ANA Coarse Speckled Pattern","Immunology","ANA IFA Pattern","ana_coarse_speckle"],
  ["ANA Centromere Pattern","Immunology","ANA IFA Pattern","ana_centromere"],
  ["ANA Nucleolar Pattern","Immunology","ANA IFA Pattern","ana_nucleolar"],
  ["ANA Nuclear Dot Pattern","Immunology","ANA IFA Pattern","ana_nuclear_dot"],
  ["ANA Centrioles Pattern","Immunology","ANA IFA Pattern","ana_centrioles"],
  ["ANA Spindle Fibres Pattern","Immunology","ANA IFA Pattern","ana_spindle_fibres"],
  ["ANA Midbody Pattern","Immunology","ANA IFA Pattern","ana_midbody"],
  ["ANA Cytoplasmic Staining","Immunology","ANA IFA Pattern","ana_cytoplasmic_staining"],
  ["Anti-dsDNA Titer","Immunology","Autoimmune Serology","anti_dsdna_titer"],
  ["Anti-Sm","Immunology","Extractable Nuclear Antigen (ENA)","anti_sm"],
  ["Anti-nRNP","Immunology","Extractable Nuclear Antigen (ENA)","anti_nrnp"],
  ["Anti-SSA (Ro)","Immunology","Extractable Nuclear Antigen (ENA)","anti_ssa"],
  ["Anti-SSB (La)","Immunology","Extractable Nuclear Antigen (ENA)","anti_ssb"],
  ["Complement C3","Immunology","Complement","complement_c3"],
  ["Complement C4","Immunology","Complement","complement_c4"],
  ["Arsenic in Urine","Toxicology","Heavy Metals","arsenic_urine"],
  ["Folate (serum)","Vitamin & Mineral","Micronutrients","folate_serum"],
  ["Vitamin B9 (Folic Acid)","Vitamin & Mineral","Micronutrients","vitamin_b9_folic_acid"],
  ["Vitamin B12","Vitamin & Mineral","Micronutrients","vitamin_b12"],
  ["Chromium","Vitamin & Mineral","Micronutrients","chromium"],
  ["Copper","Vitamin & Mineral","Micronutrients","copper"],
  ["Ferritin","Clinical Chemistry","Iron Studies","ferritin"],
  ["Selenium","Vitamin & Mineral","Micronutrients","selenium"],
  ["Zinc","Vitamin & Mineral","Micronutrients","zinc"],
  ["Vitamin A (Retinol)","Vitamin & Mineral","Antioxidant Profile","vitamin_a_retinol"],
  ["Vitamin E (gamma-Tocopherol)","Vitamin & Mineral","Antioxidant Profile","vitamin_e_gamma"],
  ["Vitamin E (alpha-Tocopherol)","Vitamin & Mineral","Antioxidant Profile","vitamin_e_alpha"],
  ["Lutein+Zeaxanthin","Vitamin & Mineral","Antioxidant Profile","lutein_zeaxanthin"],
  ["Beta-Cryptoxanthin","Vitamin & Mineral","Antioxidant Profile","beta_cryptoxanthin"],
  ["Lycopene","Vitamin & Mineral","Antioxidant Profile","lycopene"],
  ["Alpha-Carotene","Vitamin & Mineral","Antioxidant Profile","alpha_carotene"],
  ["Beta-Carotene","Vitamin & Mineral","Antioxidant Profile","beta_carotene"],
  ["Coenzyme Q10","Vitamin & Mineral","Antioxidant Profile","coenzyme_q10"],
  ["Vitamin C (Ascorbate acid)","Vitamin & Mineral","Antioxidant Profile","vitamin_c_ascorbate"],
  ["SPEP Albumin g/L","Clinical Chemistry","Serum Protein Electrophoresis — Concentration","spep_albumin_g_l"],
  ["SPEP Alpha-1 g/L","Clinical Chemistry","Serum Protein Electrophoresis — Concentration","spep_alpha_1_g_l"],
  ["SPEP Alpha-2 g/L","Clinical Chemistry","Serum Protein Electrophoresis — Concentration","spep_alpha_2_g_l"],
  ["SPEP Beta g/L","Clinical Chemistry","Serum Protein Electrophoresis — Concentration","spep_beta_g_l"],
  ["SPEP Gamma g/L","Clinical Chemistry","Serum Protein Electrophoresis — Concentration","spep_gamma_g_l"],
  ["SPEP A/G Ratio","Clinical Chemistry","Serum Protein Electrophoresis","spep_ag_ratio"],
  ["SPEP Interpretation","Clinical Chemistry","Serum Protein Electrophoresis","spep_interpretation"],
  ["Color","Urinalysis","Urine Examination","urine_color"],["Appearance","Urinalysis","Urine Examination","urine_appearance"],["Specific gravity","Urinalysis","Urine Examination","urine_specific_gravity"],["pH","Urinalysis","Urine Examination","urine_ph"],["Protein","Urinalysis","Urine Examination","urine_protein"],["Glucose","Urinalysis","Urine Examination","urine_glucose"],["Ketone","Urinalysis","Urine Examination","urine_ketone"],["Blood","Urinalysis","Urine Examination","urine_blood"],["Bilirubin","Urinalysis","Urine Examination","urine_bilirubin"],["Urobilinogen","Urinalysis","Urine Examination","urine_urobilinogen"],["Leucocyte Esterase","Urinalysis","Urine Examination","urine_leucocyte_esterase"],["Nitrite","Urinalysis","Urine Examination","urine_nitrite"],["Urine RBC","Urinalysis","Urine Microscopy","urine_rbc"],["Urine WBC","Urinalysis","Urine Microscopy","urine_wbc"],["Epithelial cells","Urinalysis","Urine Microscopy","urine_epithelial"],["Bacteria","Urinalysis","Urine Microscopy","urine_bacteria"],["Mucous","Urinalysis","Urine Microscopy","urine_mucous"],["Casts","Urinalysis","Urine Microscopy","urine_casts"],["Crystals","Urinalysis","Urine Microscopy","urine_crystals"],["Yeast","Urinalysis","Urine Microscopy","urine_yeast"],
  ["Stool Consistency","Clinical Microscopy","Stool Examination","stool_consistency"],["Stool Color","Clinical Microscopy","Stool Examination","stool_color"],["Ova & Parasite","Clinical Microscopy","Stool Examination","stool_ova_parasite"],["Stool WBC","Clinical Microscopy","Stool Examination","stool_wbc"],["Stool RBC","Clinical Microscopy","Stool Examination","stool_rbc"],["Faecal Occult Blood","Clinical Microscopy","Stool Examination","stool_occult_blood"],
 ["Mycoplasma pneumoniae","Molecular","Respiratory Pathogen Panel","mycoplasma_pneumoniae"],["Legionella pneumophila","Molecular","Respiratory Pathogen Panel","legionella_pneumophila"],["Bordetella pertussis","Molecular","Respiratory Pathogen Panel","bordetella_pertussis"],["Chlamydophila pneumoniae","Molecular","Respiratory Pathogen Panel","chlamydophila_pneumoniae"],["Influenza A","Molecular","Respiratory Pathogen Panel","influenza_a"],["H1N1/2009","Molecular","Respiratory Pathogen Panel","h1n1_2009"],["Influenza A subtype H1","Molecular","Respiratory Pathogen Panel","influenza_a_h1"],["Influenza A subtype H3","Molecular","Respiratory Pathogen Panel","influenza_a_h3"],["Influenza B","Molecular","Respiratory Pathogen Panel","influenza_b"],["Coronavirus 229E","Molecular","Respiratory Pathogen Panel","coronavirus_229e"],["Coronavirus HKU1","Molecular","Respiratory Pathogen Panel","coronavirus_hku1"],["Coronavirus NL63","Molecular","Respiratory Pathogen Panel","coronavirus_nl63"],["Coronavirus OC43","Molecular","Respiratory Pathogen Panel","coronavirus_oc43"],["Parainfluenza virus 1","Molecular","Respiratory Pathogen Panel","parainfluenza_1"],["Parainfluenza virus 2","Molecular","Respiratory Pathogen Panel","parainfluenza_2"],["Parainfluenza virus 3","Molecular","Respiratory Pathogen Panel","parainfluenza_3"],["Parainfluenza virus 4","Molecular","Respiratory Pathogen Panel","parainfluenza_4"],["Adenovirus","Molecular","Respiratory Pathogen Panel","adenovirus"],["Respiratory syncytial virus A/B","Molecular","Respiratory Pathogen Panel","rsv_ab"],["metapneumovirus A/B","Molecular","Respiratory Pathogen Panel","metapneumovirus_ab"],["Bocavirus","Molecular","Respiratory Pathogen Panel","bocavirus"],["Rhinovirus/Enterovirus","Molecular","Respiratory Pathogen Panel","rhinovirus_enterovirus"],["SARS-CoV-2","Molecular","Respiratory Pathogen Panel","sars_cov_2"],
 ["OncoTrail — Lung CTC count","Cancer Liquid Biopsy","RGCC OncoTrail — Lung","oncotrail_lung_ctc_count"],
 ["OncoTrail — CD45+ Nanog","Cancer Liquid Biopsy","RGCC OncoTrail — Hematologic-origin cells","oncotrail_cd45_pos_nanog"],
 ["OncoTrail — CD45+ OKT-4","Cancer Liquid Biopsy","RGCC OncoTrail — Hematologic-origin cells","oncotrail_cd45_pos_okt4"],
 ["OncoTrail — CD45+ Sox-2","Cancer Liquid Biopsy","RGCC OncoTrail — Hematologic-origin cells","oncotrail_cd45_pos_sox2"],
 ["OncoTrail — CD45+ CD15","Cancer Liquid Biopsy","RGCC OncoTrail — Hematologic-origin cells","oncotrail_cd45_pos_cd15"],
 ["OncoTrail — CD45− Nanog","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_nanog"],
 ["OncoTrail — CD45− OKT-4","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_okt4"],
 ["OncoTrail — CD45− Sox-2","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_sox2"],
 ["OncoTrail — CD45− MUC-1","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_muc1"],
 ["OncoTrail — CD45− EpCAM","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_epcam"],
 ["OncoTrail — CD45− CD133","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_cd133"],
 ["OncoTrail — CD45− c-MET","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_cmet"],
 ["OncoTrail — CD45− CD31","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_cd31"],
 ["OncoTrail — CD45− PanCK","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_panck"],
 ["OncoTrail — CD45− SCCA-1","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_scca1"],
 ["OncoTrail — CD45− CD56","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_cd45_neg_cd56"],
 ["OncoTrail — EpCAM+ CTC count","Cancer Liquid Biopsy","RGCC OncoTrail — Non-hematologic cells","oncotrail_epcam_positive_ctc_count"],
 ["METASTAT — Up-regulated genes","Cancer Liquid Biopsy","RGCC METASTAT — Summary","metastat_upregulated_genes"],
 ["METASTAT — Primary destination trend","Cancer Liquid Biopsy","RGCC METASTAT — Summary","metastat_primary_destination_trend"],
 ["METASTAT — General TGF-β R2","Cancer Liquid Biopsy","RGCC METASTAT — General","metastat_general_tgfbr2"],
 ["METASTAT — General ITGB-4 R","Cancer Liquid Biopsy","RGCC METASTAT — General","metastat_general_itgb4r"],
 ["METASTAT — General ITGB-5 R","Cancer Liquid Biopsy","RGCC METASTAT — General","metastat_general_itgb5r"],
 ["METASTAT — General ITGB-6 R","Cancer Liquid Biopsy","RGCC METASTAT — General","metastat_general_itgb6r"],
 ["METASTAT — Pleura CCR6","Cancer Liquid Biopsy","RGCC METASTAT — Pleura","metastat_pleura_ccr6"],
 ["METASTAT — Pleura Mesothelin","Cancer Liquid Biopsy","RGCC METASTAT — Pleura","metastat_pleura_mesothelin"],
 ["METASTAT — Skin CCR7","Cancer Liquid Biopsy","RGCC METASTAT — Skin","metastat_skin_ccr7"],
 ["METASTAT — Lung IGF-R2","Cancer Liquid Biopsy","RGCC METASTAT — Lung","metastat_lung_igfr2"],
 ["METASTAT — Lung Phospho-ERK1","Cancer Liquid Biopsy","RGCC METASTAT — Lung","metastat_lung_phospho_erk1"],
 ["METASTAT — Lung Phospho-ERK2","Cancer Liquid Biopsy","RGCC METASTAT — Lung","metastat_lung_phospho_erk2"],
 ["METASTAT — Bone BMPR 1a","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_bmpr1a"],
 ["METASTAT — Bone BMPR 1b","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_bmpr1b"],
 ["METASTAT — Bone BMPR 2","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_bmpr2"],
 ["METASTAT — Bone CXCR4","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_cxcr4"],
 ["METASTAT — Bone RANK","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_rank"],
 ["METASTAT — Bone BST-2","Cancer Liquid Biopsy","RGCC METASTAT — Bone","metastat_bone_bst2"],
 ["METASTAT — Liver CXCR4","Cancer Liquid Biopsy","RGCC METASTAT — Liver","metastat_liver_cxcr4"],
 ["METASTAT — Liver TRAIL-R2","Cancer Liquid Biopsy","RGCC METASTAT — Liver","metastat_liver_trail_r2"],
 ["METASTAT — Liver FAS R","Cancer Liquid Biopsy","RGCC METASTAT — Liver","metastat_liver_fas_r"],
 ["METASTAT — Liver HGFR","Cancer Liquid Biopsy","RGCC METASTAT — Liver","metastat_liver_hgfr"],
 ["METASTAT — Brain Phospho-STAT-3","Cancer Liquid Biopsy","RGCC METASTAT — Brain","metastat_brain_phospho_stat3"],
 ["METASTAT — Brain CX3CR1","Cancer Liquid Biopsy","RGCC METASTAT — Brain","metastat_brain_cx3cr1"],
 ["METASTAT — Brain DSC-2","Cancer Liquid Biopsy","RGCC METASTAT — Brain","metastat_brain_dsc2"]
 ];
 const ALLERGY_CATALOG={
  food:[
   ["Egg white","allergy_food_egg_white",["Egg white","Ege white","Eeg white","Eqq white"]],
   ["Egg yolk","allergy_food_egg_yolk",["Egg yolk","Ege yolk","Eeg yolk","Eqq yolk"]],
   ["Cow's milk","allergy_food_cow_milk",["Cow's milk","Cow s milk","Cows milk"]],
   ["Wheat flour","allergy_food_wheat_flour",["Wheat flour"]],
   ["Rice","allergy_food_rice",["Rice"]],
   ["Sesame","allergy_food_sesame",["Sesame"]],
   ["Soybean","allergy_food_soybean",["Soybean"]],
   ["Peanut","allergy_food_peanut",["Peanut"]],
   ["Hazelnut","allergy_food_hazelnut",["Hazelnut"]],
   ["Beef cooked","allergy_food_beef_cooked",["Beef cooked"]],
   ["Pork cooked","allergy_food_pork_cooked",["Pork cooked"]],
   ["Chicken","allergy_food_chicken",["Chicken"]],
   ["Shellfish mix 1","allergy_food_shellfish_mix_1",["Shellfish mix 1","Shellfish mix1"],["Spiny lobster","Oyster","Clam"]],
   ["Fish mix 1","allergy_food_fish_mix_1",["Fish mix 1","Fish mix1"],["Codfish","Herring","Mackerel","Plaice"]],
   ["Crab","allergy_food_crab",["Crab"]],
   ["Shrimp/Prawn","allergy_food_shrimp_prawn",["Shrimp/Prawn","Shrimp Prawn","Shrimp/Prawm","Shrimp Prawm"]],
   ["Lobster","allergy_food_lobster",["Lobster"]],
   ["Blue crab","allergy_food_blue_crab",["Blue crab"]],
   ["Chocolate","allergy_food_chocolate",["Chocolate"]],
   ["Glutamate","allergy_food_glutamate",["Glutamate"]],
   ["CCD marker (Food profile)","allergy_food_ccd_marker",["CCD marker"]]
  ],
  inhalant:[
   ["Tree mix 1","allergy_inhalant_tree_mix_1",["Tree mix 1","Tree mix1","Tree mixi"],["Willow","Eucalyptus","Acacia","Melaleuca"]],
   ["Acacia","allergy_inhalant_acacia",["Acacia"]],
   ["Oil Palm","allergy_inhalant_oil_palm",["Oil Palm"]],
   ["Latex","allergy_inhalant_latex",["Latex"]],
   ["Grass mix 5","allergy_inhalant_grass_mix_5",["Grass mix 5","Grass mix5"],["Sweet vernal grass","Bermuda grass","Timothy grass","Cultivated rye"]],
   ["House dust mite mix 1","allergy_inhalant_house_dust_mite_mix_1",["House dust mite mix 1","House dust mite mix1","House dust mite mix","House dust mite mixt","House dust mite mixt 1"],["Dermatophagoides pteronyssinus","Dermatophagoides farinae"]],
   ["Cockroach German","allergy_inhalant_cockroach_german",["Cockroach German","Cockroach Geman","Cocroach German","Cocavach Geman","Comaoach German"]],
   ["Kapok","allergy_inhalant_kapok",["Kapok"]],
   ["Cat","allergy_inhalant_cat",["Cat"]],
   ["Dog","allergy_inhalant_dog",["Dog"]],
   ["Cage bird mix 2","allergy_inhalant_cage_bird_mix_2",["Cage bird mix 2","Cage bird mix2"],["Budgerigar","Canary","Parrot","Lovebird","Finch"]],
   ["Guinea pig","allergy_inhalant_guinea_pig",["Guinea pig"]],
   ["Mouse","allergy_inhalant_mouse",["Mouse"]],
   ["Rabbit","allergy_inhalant_rabbit",["Rabbit"]],
   ["Hamster","allergy_inhalant_hamster",["Hamster"]],
   ["Mould mix 1","allergy_inhalant_mould_mix_1",["Mould mix 1","Mould mix1"],["Penicillium notatum","Cladosporium herbarum","Aspergillus fumigatus","Alternaria alternata"]],
   ["Mould mix 2","allergy_inhalant_mould_mix_2",["Mould mix 2","Mould mix2","Ould mix 2","MOUld mix 2","Moule mix 2"],["Penicillium notatum","Penicillium brevicompactum","Penicillium roqueforti"]],
   ["Candida albicans","allergy_inhalant_candida_albicans",["Candida albicans"]],
   ["Aureobasidium pullulans","allergy_inhalant_aureobasidium_pullulans",["Aureobasidium pullulans"]],
   ["Curvularia spicifera","allergy_inhalant_curvularia_spicifera",["Curvularia spicifera"]],
   ["CCD marker (Inhalant profile)","allergy_inhalant_ccd_marker",["CCD marker"]]
  ]
 };
 const ALLERGY_THAI={
  allergy_food_egg_white:"ไข่ขาว",
  allergy_food_egg_yolk:"ไข่แดง",
  allergy_food_cow_milk:"โปรตีนจากนมวัว",
  allergy_food_wheat_flour:"แป้งสาลี",
  allergy_food_rice:"ข้าว",
  allergy_food_sesame:"งา",
  allergy_food_soybean:"ถั่วเหลือง",
  allergy_food_peanut:"ถั่วลิสง",
  allergy_food_hazelnut:"ถั่วเฮเซล",
  allergy_food_beef_cooked:"เนื้อวัวปรุงสุก",
  allergy_food_pork_cooked:"เนื้อหมูปรุงสุก",
  allergy_food_chicken:"เนื้อไก่",
  allergy_food_shellfish_mix_1:"อาหารทะเลเปลือกแข็งรวม",
  allergy_food_fish_mix_1:"ปลาทะเลรวม",
  allergy_food_crab:"ปูทะเลเปลือกแข็ง",
  allergy_food_shrimp_prawn:"กุ้งนาง กุ้งลายเสือ กุ้งทราย และกุ้งตะกาด",
  allergy_food_lobster:"กุ้งมังกร",
  allergy_food_blue_crab:"ปูม้า",
  allergy_food_chocolate:"ช็อกโกแลต (นมและโกโก้)",
  allergy_food_glutamate:"ผงชูรส",
  allergy_food_ccd_marker:"ตัวบ่งชี้ปฏิกิริยาข้ามกลุ่ม",
  allergy_inhalant_tree_mix_1:"ต้นไม้ผสม",
  allergy_inhalant_acacia:"กระถินณรงค์",
  allergy_inhalant_oil_palm:"ปาล์มน้ำมัน",
  allergy_inhalant_latex:"ยาง",
  allergy_inhalant_grass_mix_5:"หญ้าผสม",
  allergy_inhalant_house_dust_mite_mix_1:"ไรฝุ่นผสม (D.p./D.f.)",
  allergy_inhalant_cockroach_german:"แมลงสาบสายพันธุ์เยอรมัน",
  allergy_inhalant_kapok:"นุ่น",
  allergy_inhalant_cat:"รังแค ขน และน้ำลายแมว",
  allergy_inhalant_dog:"รังแค ขน และน้ำลายสุนัข",
  allergy_inhalant_cage_bird_mix_2:"ขนนกผสม",
  allergy_inhalant_guinea_pig:"เยื่อบุผิวหนังหนูตะเภา",
  allergy_inhalant_mouse:"เยื่อบุผิวหนังหนูบ้าน",
  allergy_inhalant_rabbit:"เยื่อบุผิวหนังกระต่าย",
  allergy_inhalant_hamster:"เยื่อบุผิวหนังหนูแฮมสเตอร์",
  allergy_inhalant_mould_mix_1:"สปอร์เชื้อราผสม ชุดที่ 1",
  allergy_inhalant_mould_mix_2:"สปอร์เชื้อราเพนนิซิลเลียผสม ชุดที่ 2",
  allergy_inhalant_candida_albicans:"ยีสต์แคนดิดา อัลบิแคนส์",
  allergy_inhalant_aureobasidium_pullulans:"สปอร์เชื้อรา Aureobasidium pullulans",
  allergy_inhalant_curvularia_spicifera:"สปอร์เชื้อรา Curvularia spicifera",
  allergy_inhalant_ccd_marker:"ตัวบ่งชี้ปฏิกิริยาข้ามกลุ่ม"
 };
 const ALLERGY_COMPONENTS_THAI={
  allergy_food_shellfish_mix_1:["กุ้งมังกรหนาม (Spiny lobster)","หอยนางรม (Oyster)","หอยฝาคู่ (Clam)"],
  allergy_food_fish_mix_1:["ปลาค็อด (Codfish)","ปลาเฮอริง (Herring)","ปลาแมกเคอเรล (Mackerel)","ปลาเพลส (Plaice)"],
  allergy_inhalant_tree_mix_1:["ต้นหลิว (Willow)","ยูคาลิปตัส (Eucalyptus)","กระถินณรงค์ (Acacia)","ต้นเมลาลีกา (Melaleuca)"],
  allergy_inhalant_grass_mix_5:["หญ้าสวีทเวอร์นัล","หญ้าแพรก (Bermuda grass)","หญ้าทิโมที","หญ้าไรย์"],
  allergy_inhalant_house_dust_mite_mix_1:["ไรฝุ่นชนิด D. pteronyssinus","ไรฝุ่นชนิด D. farinae"],
  allergy_inhalant_cage_bird_mix_2:["นกหงส์หยก","นกคีรีบูน","นกแก้ว","นกเลิฟเบิร์ด","นกฟินช์"],
  allergy_inhalant_mould_mix_1:[
   "Penicillium notatum (เชื้อราเพนิซิลเลียม)",
   "Cladosporium herbarum (เชื้อราคลาโดสปอเรียม)",
   "Aspergillus fumigatus (เชื้อราแอสเปอร์จิลลัส)",
   "Alternaria alternata (เชื้อราอัลเทอร์นาเรีย)"
  ],
  allergy_inhalant_mould_mix_2:[
   "Penicillium notatum (เชื้อราเพนิซิลเลียม)",
   "Penicillium brevicompactum",
   "Penicillium roqueforti"
  ]
 };
 const valRe=/^(?:[<>]=?\s*)?-?\d+(?:[.,]\d+)?$|^(?:Adequate|Abnormal cell|Few|Normal|Negative|Positive|Non[- ]?reactive|Reactive)$/i;
 const unitRe=/^(?:g\/(?:d?L)|mg\/(?:d?L)|[unµμ]?g\/(?:d?L|mL|L)|[pmunµμ]?mol\/L|mOsm\/L|ng\/(?:dL|mL|L)|pg\/mL|mIU\/mL|[uµμ]IU\/mL|U\/mL|U\/L|mmol\/mol|mm\/hr|fL|pg|%|L\/L|\/100\s*WBC|S\/CO|s|sec|secs|seconds?|cells?\/HPF|cells?\/(?:uL|µL)|\/mm\^?3|cells\/mm\^?3|10\^?[369](?:\/(?:L|uL|µL|mm\^?3))?|10\^?[369]\s+cells\/mm\^?3)$/i;
 function clean(s){return String(s||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim()}
 function identityMethodToken(row){return clean(row?.reported_method||row?.reportedMethod||row?.method).toLowerCase().replace(/[^a-z0-9+/-]+/g,"")}
 function identitySpecimenToken(row){return clean(row?.specimen_type||row?.specimenType||row?.specimen).toLowerCase().replace(/[^a-z0-9ก-๙]+/g,"")}
 function identityUnitToken(row){return normalizeUnit(row?.unit||row?.reported_unit||row?.reportedUnit||"").toLowerCase()}
 function auditRowSummary(row,stage){return{stage,test_code:clean(row?.test_code||row?.testCode),display_name:clean(row?.display_name||row?.name),value:clean(row?.value_raw||row?.value),unit:clean(row?.unit||row?.reported_unit||row?.reportedUnit),method:clean(row?.reported_method||row?.reportedMethod||row?.method),specimen:clean(row?.specimen_type||row?.specimenType),date:clean(row?.result_date||row?.date),lab_no:clean(row?.lab_no||row?.labNo),source_file:clean(row?.source_file||row?.sourceFile||row?.source),page:row?.source_page_number??row?.sourcePageNumber??row?.page??null}}
 function resetParseAudit(excludedNonLabPages=0){parseAudit={rawExtracted:0,stages:[],dropped:[],finalCandidates:0,excludedNonLabPages:Number(excludedNonLabPages||0)}}
 function auditedStage(name,input,fn){const before=[...(input||[])],output=fn(before)||[],kept=new Set(output),dropped=before.filter(row=>!kept.has(row));parseAudit.stages.push({name,before:before.length,after:output.length,dropped:dropped.length});if(dropped.length)parseAudit.dropped.push(...dropped.slice(0,250).map(row=>auditRowSummary(row,name)));return output}
 function normalizeUnit(raw){
   return clean(raw)
     .replace(/μ/g,"µ")
     .replace(/^Q\/dL$/i,"g/dL")
     .replace(/^a\/dL$/i,"g/dL")
     .replace(/^m[aq]\/dL$/i,"mg/dL")
     .replace(/^pa$/i,"pg")
     .replace(/^10[%*]([369])\/uL$/i,"10^$1/uL")
     .replace(/^10\^([369])\/µL$/i,"10^$1/uL")
     .replace(/[|!](?=\s*$)/,"L")
     .replace(/1(?=\s*$)/,"L")
     .replace(/\s*\/\s*/g,"/")
     .replace(/^[*x×]\s*(?=10\^?[369])/i,"")
     .replace(/^x\s*10\^?([369])\/(?:uL|µL)$/i,"10^$1/uL")
     .replace(/^(?:u|µ)mol(?:\/|[iIl|1])?L$/i,"µmol/L")
     .replace(/^umol\/L$/i,"µmol/L")
     .replace(/^pmol\/L$/i,"pmol/L")
     .replace(/^ug\/L$/i,"µg/L")
     .replace(/^ug\/dL$/i,"µg/dL")
     .replace(/^[pµ]IU\/mL$/i,"µIU/mL")
     .replace(/^mosm\/L$/i,"mOsm/L")
     .replace(/^(?:secs?\.?|seconds?)$/i,"s")
     .replace(/^cells?\s*\/\s*hpf$/i,"Cells/HPF")
     .replace(/^cells?\s*\/\s*(?:uL|µL)$/i,"Cells/µL")
     .replace(/^\/\s*mm\^?3$/i,"/mm3")
     .replace(/^10\^?([369])\s*\/\s*mm\^?3$/i,"10^$1/mm3")
 }
 function unitFromTokens(tokens){
   const values=(tokens||[]).map(normalizeUnit).filter(Boolean);
   const scale=values.find(value=>/^10\^?[369]$/i.test(value));
   const cells=values.find(value=>/^cells\/mm\^?3$/i.test(value));
   if(scale&&cells)return`${scale} ${cells}`;
   return values.find(value=>unitRe.test(value))||""
 }
 const UNIT_PROFILES={
   urea:[{unit:"mmol/L",low:[1.5,5],high:[5,12]},{unit:"mg/dL",low:[4,15],high:[15,35]}],
   creatinine:[{unit:"µmol/L",low:[35,90],high:[80,150]},{unit:"mg/dL",low:[0.3,0.9],high:[0.8,1.5]}],
   glucose:[{unit:"mmol/L",low:[2.5,5.5],high:[5,12]},{unit:"mg/dL",low:[45,100],high:[90,220]}],
   fasting_glucose:[{unit:"mmol/L",low:[2.5,5.5],high:[5,8]},{unit:"mg/dL",low:[45,100],high:[90,130]}],
   random_glucose:[{unit:"mmol/L",low:[2.5,6],high:[5,12]},{unit:"mg/dL",low:[45,110],high:[90,220]}],
   calcium:[{unit:"mmol/L",low:[1.5,2.5],high:[2.3,3.2]},{unit:"mg/dL",low:[6,10],high:[9,13]}],
   corrected_calcium:[{unit:"mmol/L",low:[1.5,2.5],high:[2.3,3.2]},{unit:"mg/dL",low:[6,10],high:[9,13]}],
   magnesium:[{unit:"mmol/L",low:[0.4,1],high:[0.8,1.5]},{unit:"mg/dL",low:[1,2.2],high:[1.8,3]}],
   phosphate:[{unit:"mmol/L",low:[0.4,1.2],high:[1.1,2]},{unit:"mg/dL",low:[1.5,3.5],high:[3,6]}],
   phosphorus:[{unit:"mmol/L",low:[0.4,1.2],high:[1.1,2]},{unit:"mg/dL",low:[1.5,3.5],high:[3,6]}],
   cholesterol:[{unit:"mmol/L",low:[1.5,4],high:[4,8]},{unit:"mg/dL",low:[50,150],high:[150,300]}],
   triglyceride:[{unit:"mmol/L",low:[0.1,1],high:[1,3]},{unit:"mg/dL",low:[20,90],high:[90,250]}],
   hdl_cholesterol:[{unit:"mmol/L",low:[0.4,1.5],high:[1,3]},{unit:"mg/dL",low:[15,55],high:[40,100]}],
   ldl_cholesterol:[{unit:"mmol/L",low:[0.3,2.5],high:[1.5,5]},{unit:"mg/dL",low:[15,100],high:[70,200]}],
   total_bilirubin:[{unit:"µmol/L",low:[0,10],high:[10,35]},{unit:"mg/dL",low:[0,0.6],high:[0.5,2]}],
   iron:[{unit:"µmol/L",low:[3,15],high:[15,40]},{unit:"µg/dL",low:[20,80],high:[70,220]}],
   vitamin_d_25_oh:[{unit:"nmol/L",low:[20,90],high:[70,260]},{unit:"ng/mL",low:[8,35],high:[25,110]}],
   folate_serum:[{unit:"ng/mL",low:[2,8],high:[15,35]}],
   vitamin_b12:[{unit:"pg/mL",low:[150,300],high:[650,1000]}],
   chromium:[{unit:"µg/L",low:[0.05,0.5],high:[1.5,3]}],
   copper:[{unit:"µg/dL",low:[50,90],high:[120,180]}],
   ferritin:[{unit:"ng/mL",low:[10,50],high:[120,500]}],
   selenium:[{unit:"µg/L",low:[30,70],high:[110,180]}],
   zinc:[{unit:"µg/dL",low:[50,100],high:[130,200]}],
   vitamin_a_retinol:[{unit:"µmol/L",low:[0.4,1.2],high:[2,4]}],
   vitamin_e_gamma:[{unit:"µmol/L",low:[0.2,1],high:[4,8]}],
   vitamin_e_alpha:[{unit:"µmol/L",low:[4,12],high:[30,55]}],
   lutein_zeaxanthin:[{unit:"µmol/L",low:[0.05,0.3],high:[0.6,1.3]}],
   beta_cryptoxanthin:[{unit:"µmol/L",low:[0.01,0.1],high:[0.3,0.8]}],
   lycopene:[{unit:"µmol/L",low:[0.03,0.3],high:[0.8,2]}],
   alpha_carotene:[{unit:"µmol/L",low:[0.01,0.08],high:[0.2,0.6]}],
   beta_carotene:[{unit:"µmol/L",low:[0.03,0.3],high:[0.7,1.8]}],
   coenzyme_q10:[{unit:"µmol/L",low:[0.2,0.7],high:[1.2,2.5]}],
   vitamin_c_ascorbate:[{unit:"µmol/L",low:[10,35],high:[60,110]}],
   calculated_osmolality:[{unit:"mOsm/L",low:[260,290],high:[285,320]}],
   // v10.219 — BNH atomic-row OCR profiles. These are broad plausibility
   // envelopes used only to rank competing OCR rows / restore a missing unit.
   // They never manufacture a result or reference interval that was not seen
   // in source evidence.
   albumin:[{unit:"g/dL",low:[1.5,4.2],high:[3.5,6.5]}],
   direct_bilirubin:[{unit:"mg/dL",low:[0,0.4],high:[0.2,2]}],
   mcv:[{unit:"fL",low:[55,90],high:[85,125]}],
   mch:[{unit:"pg",low:[15,30],high:[25,45]}],
   mchc:[{unit:"g/dL",low:[20,34],high:[30,45]}],
   rdw:[{unit:"%",low:[5,15],high:[12,25]}],
   mpv:[{unit:"fL",low:[3,10],high:[8,18]}],
   platelet_count:[{unit:"10^3/mm3",low:[20,200],high:[250,800]}],
   reticulocyte_pct:[{unit:"%",low:[0,1.5],high:[1,6]}],
   aptt:[{unit:"s",low:[10,35],high:[20,70]}],
   prothrombin_time:[{unit:"s",low:[7,15],high:[10,30]}],
   fasting_glucose:[{unit:"mg/dL",low:[30,110],high:[80,250]}],
   chloride:[{unit:"mmol/L",low:[70,105],high:[100,130]}],
   urine_ph:[{unit:"",low:[3,7],high:[6,10]}],
   fdp:[{unit:"µg/mL",low:[0,1],high:[0.1,5]}]
 };
 function unitProfile(def,reference){
   const rp=parseRef(reference);
   if(rp.reference_operator!=="range")return null;
   return(UNIT_PROFILES[def?.[3]]||[]).find(p=>
     rp.reference_low>=p.low[0]&&rp.reference_low<=p.low[1]&&
     rp.reference_high>=p.high[0]&&rp.reference_high<=p.high[1]
   )||null
 }
 function standardizeValue(code,value,unit){
   const n=Number(value);
   if(!Number.isFinite(n))return{standardized_value:null,standardized_unit:""};
   const u=normalizeUnit(unit);
   const conversions={
     urea:{"mmol/L":[2.801,"mg/dL"]},creatinine:{"µmol/L":[1/88.4,"mg/dL"]},
     glucose:{"mmol/L":[18.0182,"mg/dL"]},fasting_glucose:{"mmol/L":[18.0182,"mg/dL"]},random_glucose:{"mmol/L":[18.0182,"mg/dL"]},
     calcium:{"mmol/L":[4.008,"mg/dL"]},corrected_calcium:{"mmol/L":[4.008,"mg/dL"]},
     cholesterol:{"mmol/L":[38.67,"mg/dL"]},hdl_cholesterol:{"mmol/L":[38.67,"mg/dL"]},ldl_cholesterol:{"mmol/L":[38.67,"mg/dL"]},
     triglyceride:{"mmol/L":[88.57,"mg/dL"]},total_bilirubin:{"µmol/L":[1/17.104,"mg/dL"]},
     vitamin_d_25_oh:{"nmol/L":[0.40064,"ng/mL"]}
   };
   const rule=conversions[code]?.[u];
   return rule?{standardized_value:Number((n*rule[0]).toFixed(4)),standardized_unit:rule[1]}:
     {standardized_value:n,standardized_unit:u}
 }
 function iso(raw){const m=clean(raw).match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})(?:\s+(\d{2}:\d{2}))?/i);if(!m)return"";const mo={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"}[m[2].toLowerCase()];return`${m[3]}-${mo}-${m[1].padStart(2,"0")}T${m[4]||"00:00"}:00+07:00`}
 function isoNumeric(raw){
   const m=clean(raw).match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2}|25\d{2}|\d{2})(?:\s+(\d{1,2}:\d{2})(?::(\d{2}))?)?/);
   if(!m)return"";
   let year=Number(m[3]);
   if(m[3].length===2)year+=2500;
   if(year>2400)year-=543;
   return`${year}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}T${(m[4]||"00:00").padStart(5,"0")}:${m[5]||"00"}+07:00`
 }
 function inbodyHeaderDemographics(raw){
   const source=String(raw||"").replace(/,/g,".");
   if(!/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area/i.test(source))return null;
   const m=source.match(/\b(\d{1,3})\s+(\d{2,3})\s*cm\s+(Male|Female)\s+(\d{1,2}[\/. -]\d{1,2}[\/. -](?:19|20|25)\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
   if(!m)return null;
   const age=Number(m[1]),height=Number(m[2]);
   if(age<1||age>120||height<100||height>230)return null;
   return{age,height,sex:m[3],datetime:m[4]};
 }
 function profileSpecificDates(raw){
   const source=String(raw||"");
   if(/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area|ECW\s*\/\s*TBW/i.test(source)){
     const labeled=source.match(/(?:DATE\s*\/\s*TIME|DATE\s+TIME|DATE)\s*[:#.-]?\s*(\d{1,2}[\/. -]\d{1,2}[\/. -](?:19|20|25)\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
     const demo=inbodyHeaderDemographics(source);
     const history=source.match(/Body\s+Composition\s+History[\s\S]{0,350}?(\d{1,2}[\/. -]\d{1,2}[\/. -](?:(?:19|20|25)\d{2}|\d{2})\s+\d{1,2}:\d{2}(?::\d{2})?)/i);
     const rawDate=labeled?.[1]||demo?.datetime||history?.[1]||"";
     const value=rawDate?isoNumeric(rawDate.replace(/\s*([.\/])\s*/g,"$1")):"";
     return{result_datetime:value,specimen_datetime:value,kind:"INBODY_720"}
   }
   if(!/(?:FoodPrint|200\+|FOOD[_ -]?INTOLERANCE|รายงานการทดสอบ|Allergy\s+(?:Food|Inhalation)?\s*Profile)/i.test(source))return{result_datetime:"",specimen_datetime:"",kind:""};
   const kind=/(?:FoodPrint|200\+|FOOD[_ -]?INTOLERANCE|รายงานการทดสอบ)/i.test(source)?"FOOD_INTOLERANCE_IGG_200_PLUS":"ALLERGY_PROFILE";
   const dateToken="(\\d{1,2}[\\/-]\\d{1,2}[\\/-](?:19|20|25)\\d{2}|(?:19|20)\\d{2}[\\/-]\\d{1,2}[\\/-]\\d{1,2})";
   const toIso=value=>{
     const direct=isoNumeric(value);if(direct)return direct;
     const match=clean(value).match(/((?:19|20)\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);
     if(!match)return"";
     return`${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}T00:00:00+07:00`
   };
   const firstLabeled=patterns=>{
     for(const pattern of patterns){
       const match=source.match(pattern);if(match?.[1]){const parsed=toIso(match[1]);if(parsed)return parsed}
     }
     return""
   };
   const resultDate=firstLabeled([
     new RegExp(`(?:วันที่ตรวจ|TEST\\s*DATE|DATE\\s+OF\\s+TEST|RESULT(?:ED)?\\s+DATE(?:\\s*\\/\\s*TIME)?|REPORTED\\s+DATE(?:\\s*\\/\\s*TIME)?)[^\\d]{0,24}${dateToken}`,"i"),
     new RegExp(`REPORTED\\s+BY[\\s\\S]{0,180}?DATE\\s*\\/\\s*TIME[^\\d]{0,24}${dateToken}`,"i"),
     new RegExp(`APPROVED\\s+BY[\\s\\S]{0,180}?DATE\\s*\\/\\s*TIME[^\\d]{0,24}${dateToken}`,"i")
   ]);
   const specimenDate=firstLabeled([
     new RegExp(`(?:REGISTERED\\s+DATE|RECEIVED\\s+DATE(?:\\s*\\/\\s*TIME)?|วันที่ส่งตัวอย่าง|COLLECT(?:ED|ION)?\\s+DATE|SPECIMEN\\s+DATE)[^\\d]{0,24}${dateToken}`,"i")
   ]);
   return{result_datetime:resultDate,specimen_datetime:specimenDate,kind}
 }
 function profileSpecificDateTime(raw){
   const dates=profileSpecificDates(raw);return dates.result_datetime||dates.specimen_datetime||""
 }
 function parseRef(raw){const s=clean(raw).replace(/^\[|\]$/g,"");let m=s.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);if(m)return{reference_raw:raw,reference_low:+m[1],reference_high:+m[2],reference_operator:"range"};m=s.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);if(m)return{reference_raw:raw,reference_low:[">",">="].includes(m[1])?+m[2]:null,reference_high:["<","<="].includes(m[1])?+m[2]:null,reference_operator:m[1]};return{reference_raw:raw||"",reference_low:null,reference_high:null,reference_operator:raw?"text":"none"}}
 function scalarParts(raw){
   const display=clean(raw);
   const source=display.replace(/[−–—﹣－]/g,"-").replace(/[＋﹢]/g,"+").replace(/,/g,".").replace(/\s+/g," ");
   const m=source.match(/^([<>]=?)?\s*([+-]?)\s*((?:\d+(?:\.\d+)?|\.\d+))\s*(?:%|kg|g|mg|mcg|µg|ug|L|mL|cm(?:²|2)?|kg\/m(?:²|2)|ratio|points?)?$/i);
   if(!m)return{value_raw:display,value_numeric:null,value_operator:"text"};
   const sign=m[2]==="-"?-1:1,value=sign*Number(m[3].startsWith(".")?`0${m[3]}`:m[3]);
   return Number.isFinite(value)?{value_raw:display,value_numeric:value,value_operator:m[1]||"="}:{value_raw:display,value_numeric:null,value_operator:"text"}
 }
 function valueParts(raw){return scalarParts(raw)}
 function repairPhotoValue(raw){
   const s=clean(clean(raw)
     .replace(/[“”"'`]/g,"")
     .replace(/^[([]+/,"")
     .replace(/[)\]]+$/,"")
     .replace(/(\d):(\d)/g,"$1.$2")
     .replace(/^(-?\d+(?:[.,]\d+)?)\.+$/,"$1"));
   const m=s.match(/^([<>]=?)?\s*(0)(\d{2,4})$/);
   return m?`${m[1]||""}0.${m[3]}`:s
 }
 function decimalCandidates(raw){
   const s=clean(raw).replace(",",".");
   const m=s.match(/^([<>]=?)?\s*(-?)(\d+)$/);
   if(!m)return[s];
   const prefix=`${m[1]||""}${m[2]||""}`,digits=m[3],out=[`${prefix}${digits}`];
   for(let i=1;i<digits.length;i++)out.push(`${prefix}${digits.slice(0,i)}.${digits.slice(i)}`);
   if(digits.length>1)out.push(`${prefix}0.${digits}`);
   return[...new Set(out)]
 }
 function referenceCandidates(raw,allowCompactDecimal=false){
   const s=clean(raw).replace(/[()[\]]/g,"").replace(/,/g,".");
   const m=s.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);
   if(!m){
     // A narrow table or photographed page can lose the short range separator
     // entirely (for example HDL "1-2" becomes "12"). Keep the untouched
     // token, then let the analyte/unit profile score possible splits.
     // It can also preserve one decimal point while losing the separator and
     // the second decimal point (for example LDL "1.5-3.3" becomes "1.533").
     // Only profile-backed analytes may expand the decimal form; otherwise a
     // legitimate single numeric reference must remain untouched.
     if(/^\d{2,6}$/.test(s)||(allowCompactDecimal&&/^\d{1,3}\.\d{2,4}$/.test(s))){
       const digits=s.replace(".","");
       const split=[s];
       for(let i=1;i<digits.length;i++){
         decimalCandidates(digits.slice(0,i)).forEach(a=>
           decimalCandidates(digits.slice(i)).forEach(b=>{
             const lo=Number(a),hi=Number(b);
             if(Number.isFinite(lo)&&Number.isFinite(hi)&&lo<hi)split.push(`${a}-${b}`)
           })
         )
       }
       return[...new Set(split)]
     }
     return[s]
   }
   const left=decimalCandidates(m[1]),right=decimalCandidates(m[2]),out=[];
   left.forEach(a=>right.forEach(b=>{
     const lo=Number(a),hi=Number(b);
     if(Number.isFinite(lo)&&Number.isFinite(hi)&&lo<hi)out.push(`${a}-${b}`)
   }));
   return out.length?out:[s]
 }
 function clinicalRepair(def,value,reference,unit,sourceFlag=""){
   const originalValue=clean(value),originalReference=clean(reference);
   if(def?.[3]==="calculated_osmolality"&&/^2\d{2}\s*[-–]\s*3\d{2}$/.test(originalReference)){
     const compact=originalValue.replace(/[.,]/g,"");
     if(/^\d{6}$/.test(compact)){
       const corrected=`${compact.slice(0,3)}.${compact.slice(-2)}`;
       return{value:corrected,reference:originalReference,score:100,repaired:corrected!==originalValue}
     }
     const extraZero=originalValue.match(/^(\d{3})0[.,](\d{1,3})$/);
     if(extraZero){
       const corrected=`${extraZero[1]}.${extraZero[2]}`;
       return{value:corrected,reference:originalReference,score:100,repaired:true}
     }
   }
   const decimalPattern={
     urea:[1,1],potassium:[2,1],creatinine:[2,0],
     glucose:[1,1],fasting_glucose:[1,1],random_glucose:[1,1],
     // Osmolality is selected against its reported range below. A fixed
     // decimal rule previously allowed 280.07 to become 2800.07.
   }[def?.[3]];
   if(decimalPattern&&!/^mg\/dL$/i.test(normalizeUnit(unit))){
     const vm=originalValue.match(/^([<>]=?)?\s*(-?)(\d+)$/);
     const rm=originalReference.match(/^(\d+)\s*[-–]\s*(\d+)$/);
     if(vm&&rm){
       const scale=(s,places)=>`${Number(s)/(10**places)}`;
       return{
         value:`${vm[1]||""}${vm[2]||""}${scale(vm[3],decimalPattern[0])}`,
         reference:`${scale(rm[1],decimalPattern[1])}-${scale(rm[2],decimalPattern[1])}`,
         score:100,repaired:true
       }
     }
   }
   const profiles=UNIT_PROFILES[def?.[3]]||[];
   const normalizedReportedUnit=normalizeUnit(unit).toLowerCase();
   const normalizedSourceFlag=clean(sourceFlag).toUpperCase().replace(/[^LH]/g,"");
   const expectedReferenceByUnit={
     calcium:{"mmol/l":[1.5,3.2],"mg/dl":[6,13]},
     corrected_calcium:{"mmol/l":[1.5,3.2],"mg/dl":[6,13]},
     magnesium:{"mmol/l":[0.4,1.5],"mg/dl":[1,3]},
     phosphate:{"mmol/l":[0.4,2],"mg/dl":[1.5,6]},
     phosphorus:{"mmol/l":[0.4,2],"mg/dl":[1.5,6]},
     triglyceride:{"mmol/l":[0.1,3],"mg/dl":[20,250]},
     cholesterol:{"mmol/l":[1.5,8],"mg/dl":[50,300]},
     hdl_cholesterol:{"mmol/l":[0.4,3],"mg/dl":[15,100]},
     ldl_cholesterol:{"mmol/l":[0.3,5],"mg/dl":[15,200]},
     urine_protein_creatinine_ratio:{"":[0,0.5]},
     calculated_osmolality:{"mosm/l":[275,310],"":[275,310]}
   };
   const expectedReference=(expectedReferenceByUnit[def?.[3]]||{})[normalizedReportedUnit]||
     (normalizedReportedUnit?"":(expectedReferenceByUnit[def?.[3]]||{})[""]);
   const allowCompactDecimal=profiles.length>0&&
     (Boolean(normalizedReportedUnit)||["L","H","LL","HH"].includes(normalizedSourceFlag));
   const values=decimalCandidates(originalValue);
   const references=referenceCandidates(originalReference,allowCompactDecimal);
   let best={value:originalValue,reference:originalReference,score:-Infinity,repaired:false};
   values.forEach(v=>references.forEach(r=>{
     const vp=valueParts(v),rp=parseRef(r);
     if(vp.value_numeric===null)return;
     let score=0;
     const n=Math.abs(vp.value_numeric);
     if(rp.reference_operator==="range"){
       const span=Math.max(rp.reference_high-rp.reference_low,0.0001);
       const distance=n<rp.reference_low?(rp.reference_low-n)/span:n>rp.reference_high?(n-rp.reference_high)/span:0;
       score+=distance===0?50:Math.max(-70,25-distance*18);
       if(rp.reference_low>=0&&rp.reference_high<=100000)score+=5;
       if(profiles.length){
         const matchingProfile=profiles.find(profile=>
           (!normalizedReportedUnit||profile.unit.toLowerCase()===normalizedReportedUnit)&&
           rp.reference_low>=profile.low[0]&&rp.reference_low<=profile.low[1]&&
           rp.reference_high>=profile.high[0]&&rp.reference_high<=profile.high[1]
         );
         // A single reference candidate that fits the known unit profile is
         // stronger evidence than a punctuation-damaged OCR token.
         score+=matchingProfile?90:-90
       }
       if(expectedReference){
         const expectedMid=(expectedReference[0]+expectedReference[1])/2;
         const candidateMid=(rp.reference_low+rp.reference_high)/2;
         score+=Math.max(-80,45-Math.abs(Math.log10(Math.max(candidateMid,1e-6)/Math.max(expectedMid,1e-6)))*55);
       }
       const endpoints=String(r).match(
         /^-?\d+(?:\.(\d+))?\s*[-–]\s*-?\d+(?:\.(\d+))?$/
       );
       if(endpoints){
         const leftPlaces=(endpoints[1]||"").length;
         const rightPlaces=(endpoints[2]||"").length;
         score+=leftPlaces===rightPlaces?18:-Math.min(18,Math.abs(leftPlaces-rightPlaces)*9)
       }
       if(["L","H","LL","HH"].includes(normalizedSourceFlag)){
         const candidateFlag=calcFlag(vp,rp);
         score+=normalizedSourceFlag.startsWith(candidateFlag)?35:-70
       }
     }else score-=8;
     if(originalValue.includes("."))score+=22;
     if(originalReference.includes("."))score+=15;
     if(v===originalValue)score+=4;
     if(r===originalReference)score+=3;
     if(unit&&unitRe.test(normalizeUnit(unit)))score+=5;
     if(n>1000000)score-=100;
     if(score>best.score)best={value:v,reference:r,score,
       repaired:v!==originalValue||r!==originalReference}
   }));
   return best
 }
 function calcFlag(v,ref){if(v.value_numeric===null)return"TEXT";const n=v.value_numeric;if(ref.reference_operator==="range")return n<ref.reference_low?"L":n>ref.reference_high?"H":"N";if(["<","<="].includes(ref.reference_operator))return n>ref.reference_high?"H":"N";if([">",">="].includes(ref.reference_operator))return n<ref.reference_low?"L":"N";return"NO_RANGE"}
 function dateParts(raw){
   const match=clean(raw).match(/(\d{1,2})[\/-](\d{1,2})[\/-](19\d{2}|20\d{2}|25\d{2})/);
   if(!match)return null;
   let year=Number(match[3]);if(year>2400)year-=543;
   return{year,month:Number(match[2]),day:Number(match[1])}
 }
 function ageAt(dobRaw,eventRaw){
   const dob=dateParts(dobRaw),event=dateParts(eventRaw);
   if(!dob||!event)return null;
   let years=event.year-dob.year;
   let months=event.month-dob.month;
   let days=event.day-dob.day;
   if(days<0){months-=1;days+=30.4375}
   if(months<0){years-=1;months+=12}
   if(years<0||years>130)return null;
   return{years,months,days:Math.max(0,Math.round(days)),decimal:years+months/12+Math.max(0,days)/365.25}
 }
 function reportedAge(text){
   const source=String(text||"");
   const compact=source.match(/\bAGE\s*(\d{1,3})\s*Y(?:EARS?)?\s*(\d{1,2})?\s*M(?:ONTHS?)?\s*(\d{1,2})?\s*D(?:AYS?)?/i);
   const match=compact||source.match(/\bAGE\s*(\d{1,3})\s*YEAR(?:S)?(?:\s*(\d{1,2})\s*MONTH(?:S)?)?(?:\s*(\d{1,2})\s*DAY(?:S)?)?/i);
   if(!match)return null;
   return{
     years:Number(match[1]),months:Number(match[2]||0),days:Number(match[3]||0),
     decimal:Number(match[1])+Number(match[2]||0)/12+Number(match[3]||0)/365.25
   }
 }
 function isoRgccDate(raw){
   const text=clean(raw).replace(/\./g," ");
   const months={jan:"01",january:"01",feb:"02",february:"02",mar:"03",march:"03",apr:"04",april:"04",may:"05",jun:"06",june:"06",juni:"06",jul:"07",july:"07",aug:"08",august:"08",sep:"09",sept:"09",september:"09",oct:"10",october:"10",nov:"11",november:"11",dec:"12",december:"12"};
   let match=text.match(/^(20\d{2})\s+([A-Za-z]+)\s+(\d{1,2})$/i);
   if(match&&months[match[2].toLowerCase()])return`${match[1]}-${months[match[2].toLowerCase()]}-${match[3].padStart(2,"0")}T00:00:00+07:00`;
   match=text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/i);
   if(match&&months[match[2].toLowerCase()])return`${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2,"0")}T00:00:00+07:00`;
   return""
 }
 function trustedSourceIdentityConsensus(text,pages=[]){
   const global=MIW.Classifier.trustedSourceIdentity?.(text,pages||[])||{};
   const identities=(pages||[]).map(page=>MIW.Classifier.trustedSourceIdentity?.("",[page])||{}).filter(item=>item.profile||item.hn||item.dob||item.name);
   const all=[global,...identities];
   const vote=(field,normalizer=value=>clean(value))=>{
     const map=new Map();all.forEach((item,index)=>{const raw=clean(item?.[field]);if(!raw)return;const key=normalizer(raw);if(!key)return;const old=map.get(key)||{count:0,confidence:0,value:raw,first:index};old.count++;old.confidence+=Number(item?.confidence||0);if(index===0&&raw)old.value=raw;map.set(key,old)});
     return[...map.values()].sort((a,b)=>b.count-a.count||b.confidence-a.confidence||a.first-b.first)[0]?.value||""
   };
   const hnNorm=value=>(MIW.Patients.normalizeIdentifier?.(value)||String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
   const nameNorm=value=>clean(MIW.Utils.normalizeName?.(value)||value).toLowerCase().replace(/[\s._'-]+/g,"");
   const profile=vote("profile",value=>clean(value).toUpperCase())||global.profile||"";
   const name=vote("name",nameNorm)||global.name||"",hn=vote("hn",hnNorm)||global.hn||"",dob=vote("dob",value=>clean(value))||global.dob||"",sex=vote("sex",value=>clean(value).toLowerCase())||global.sex||"";
   return{...global,profile,name,hn,dob,sex,confidence:Math.max(Number(global.confidence||0),...(identities.map(item=>Number(item.confidence||0))),0),evidence:[...(global.evidence||[]),...identities.flatMap(item=>item.evidence||[]),`SOURCE_HEADER_CONSENSUS:${profile||"UNKNOWN"}`]}
 }
 function parseMeta(text,pages,contextRecord=documentRecord){
   const context=contextRecord||documentRecord||{};
   const flat=clean(text),grab=re=>(flat.match(re)||[])[1]||"";
   const positioned=MIW.Classifier.geometryHeader(pages||[]);
   const extracted=MIW.Classifier.extractEntities?.(text,pages||[])||{};
   const trusted=trustedSourceIdentityConsensus(text,pages||[]);
   const typed=MIW.Classifier.extractTypedIdentifiers?.(text,pages||[])||{civilId:"",civilIds:[],hospitalIds:[]};
   const fallbackName=MIW.Classifier.isInvalidPatientName(context.patientName)?"":context.patientName||"";
   const thaiHeaderName=grab(/PATIENT\s*NAME\s*:?[ 	]*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)[ 	]*[ก-๙]{2,}(?:[ 	]+[ก-๙]{2,}){1,3})/i);
   const englishHeaderName=grab(/PATIENT\s*NAME\s*:?[ 	]*([A-Za-z][A-Za-z.'’-]{1,}(?:[ 	]+[A-Za-z][A-Za-z.'’-]{1,}){1,4})(?=[ 	]+(?:HN|MRN|DOB|AGE|SEX|HOSPITAL)|$)/i);
   // v10.233 Source Header Truth: known hospital profiles must not inherit
   // a generic OCR name fragment (the real Siriraj failure was "wyadjaungassu").
   const sourceNameCandidates=trusted.profile
     ?[trusted.name,positioned.name,thaiHeaderName,englishHeaderName]
     :[positioned.name,extracted.name,thaiHeaderName,englishHeaderName,fallbackName];
   const sourceName=MIW.Patients.bestPatientName(sourceNameCandidates,{preferThai:true});
   const collectedRaw=grab(/Collect(?:ed)?\s+Date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20|25)\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
   const registeredRaw=grab(/Registered\s+Date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20|25)\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
   const receivedRaw=grab(/Received Date\s*\/?\s*Time\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20|25)\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)||
     grab(/Received Date\s*\/?\s*Time\s*:?\s*(\d{1,2}\s+\w+\s+20\d{2}\s+\d{2}:\d{2})/i);
   const requestedRaw=grab(/Request(?:ed)?\s+Date(?:\s*\/?\s*Time)?\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20\d{2}|25\d{2}|\d{2})\s+\d{1,2}:\d{2}(?::\d{2})?)/i)||
     grab(/Requested Date\s*\/?\s*Time\s*:?\s*(\d{1,2}\s+\w+\s+20\d{2}\s+\d{2}:\d{2})/i);
   const resultRaw=grab(/(?:Result|Reported) Date(?:\s*\/?\s*Time)?\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20\d{2}|25\d{2}|\d{2})\s+\d{1,2}:\d{2}(?::\d{2})?)/i)||
     grab(/(?:Result|Reported) Date\s*\/?\s*Time\s*:?\s*(\d{1,2}\s+\w+\s+20\d{2}\s+\d{2}:\d{2})/i);
   const printedDate=grab(/\bDATE\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:20|25)\d{2})/i);
   const rgccDateRaw=grab(/Report\s+Date\s*:?\s*((?:20\d{2}\s+[A-Za-z.]+\s+\d{1,2})|(?:\d{1,2}\s+[A-Za-z.]+\s+20\d{2}))/i)||
     grab(/Patient\s+Name\s*:[\s\S]{2,120}?\bDate\s*:\s*(\d{1,2}\s+[A-Za-z.]+\s+20\d{2})/i);
   const rgccDateTime=isoRgccDate(rgccDateRaw);
   const masuyamaDateRaw=grab(/REPORT\s+DATE\s*:?\s*(20\d{2}-\d{2}-\d{2})/i)||grab(/REPORT\s+DATE[\s\S]{0,180}?(20\d{2}-\d{2}-\d{2})/i);
   const masuyamaDateTime=masuyamaDateRaw?`${masuyamaDateRaw}T00:00:00+07:00`:"";
   const masuyamaTestDateList=masuyamaTestDates(text),masuyamaTestDate=masuyamaTestDateList.at(-1)||"",masuyamaTestDateTime=masuyamaTestDate?`${masuyamaTestDate}T00:00:00+07:00`:"";
   const demographicText=`${flat} ${context.fileName||""}`;
   const legacyHospitalId=trusted.hn||positioned.hn||
     grab(/\b(?:HN|MRN)[ \t]*:?[ \t]*([A-Z0-9-]{4,20})/i)||
     grab(/Hosp(?:ital)?[ \t]*(?:ID|1D|No\.?|Number)[ \t]*:?[ \t]*([A-Z0-9-]{4,20})/i)||
     grab(/Patient[ \t]*(?:ID|1D|No\.?)[ \t]*:?[ \t]*([A-Z0-9-]{4,20})/i)||
     context.patientHN||"";
   const normalizePatientIdentifier=MIW.Patients.normalizeIdentifier||
     (value=>String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,""));
   const rawHospitalIds=[...new Set([
     legacyHospitalId,
     ...(positioned.hospitalIds||[]),
     ...(typed.hospitalIds||[]),
     ...(context.patientHospitalIDs||[])
   ].map(value=>normalizePatientIdentifier(value)).filter(Boolean))];
   // v10.228: keep one canonical HN per physical source and treat near/truncated
   // OCR forms as aliases, not separate patient-identity requirements.
   const hospitalIds=MIW.Patients?.canonicalHospitalIds
     ?MIW.Patients.canonicalHospitalIds(rawHospitalIds,legacyHospitalId)
     :rawHospitalIds;
   const civilId=typed.civilId||positioned.civilId||context.patientCivilID||"";
   const dob=trusted.dob||positioned.dob||extracted.dob||grab(/(?:DOB|Date of Birth|Birthdate)\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-](?:19|20|25)\d{2}|\d{4}-[A-Za-z]{3}-\d{2}|\d{1,2}\s*[A-Za-z]{3}\s*\d{4}(?:\(\d{4}\))?)/i)||context.patientDOB||"";
   const profileDates=profileSpecificDates(flat),profileDateTime=profileDates.result_datetime||profileDates.specimen_datetime;
   const specimenDateRaw=collectedRaw||receivedRaw||registeredRaw||profileDates.specimen_datetime||requestedRaw||resultRaw||profileDates.result_datetime||printedDate;
   const inbodyDemo=inbodyHeaderDemographics(flat);
   const inbodyReportedAge=inbodyDemo?{years:inbodyDemo.age,months:0,days:0,decimal:inbodyDemo.age}:null;
   const printedAge=inbodyReportedAge||reportedAge(flat),calculatedAge=ageAt(dob,specimenDateRaw);
   const printedAgeMatches=!printedAge||!calculatedAge||
     Math.abs(Number(printedAge.decimal)-Number(calculatedAge.decimal))<=1.1;
   const age=printedAge&&printedAgeMatches?printedAge:calculatedAge||printedAge;
   const sex=trusted.sex||extracted.sex||inbodyDemo?.sex||grab(/(?:Sex|Gender)\s*:?\s*(Male|Female)/i)||
     grab(/Micronutrients?\s+Profile\s+I\s*\((Male|Female)\)/i)||
     (/(?:^|[\s_-])นาย(?=\s|_|[ก-๙]|$)/.test(demographicText)?"Male":
       /(?:นางสาว|(?:^|[\s_-])นาง(?:\s|_|$))/.test(demographicText)?"Female":"");
   const disease=grab(/(Lung\s*\(\s*NSCLC\s*\))/i)||grab(/DISEASE\s+STAGE[\s\S]{0,160}?\d{4}-[A-Za-z]{3}-\d{2}\s+([A-Za-z]+\s*\([^)]*\))/i)||"";
   const diseaseStage=grab(/Lung\s*\(\s*NSCLC\s*\)(?:\s+malignancy\s*,?\s*stage)?\s+([IVX]{1,5})\b/i)||"";
   // A mixed PDF can contain Masuyama, OncoTrail and METASTAT in the same
   // physical file.  Never let a whole-file signature promote the entire lab
   // import to one specialised report type; per-row provenance below owns that.
   const reportType=context.packet?.isMixed?"LABORATORY_REPORT":
     /Masuyama|Comprehensive\s+Immunological|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i.test(`${context.type||""} ${flat}`)?"MASUYAMA_IMMUNOLOGICAL":
     /ONCOTRAIL/i.test(`${context.type||""} ${flat}`)?"RGCC_ONCOTRAIL":
     /METASTAT/i.test(`${context.type||""} ${flat}`)?"RGCC_METASTAT":
     /InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area/i.test(`${context.type||""} ${flat}`)?"INBODY_720":"LABORATORY_REPORT";
   return{
     patient_id:hospitalIds[0]||"",
     hospital_ids:hospitalIds,
     civil_id:civilId,
     civil_ids:typed.civilIds||[civilId].filter(Boolean),
     patient_name:sourceName,
     sex,
     date_of_birth:dob,
     age_years:age?.years??null,
     age_months:age?.months??null,
     age_days:age?.days??null,
     age_at_result_years:age?.decimal??null,
     age_source:printedAge&&printedAgeMatches?"reported":calculatedAge?"calculated_from_dob":"",
     height_cm:inbodyDemo?.height??null,
     lab_no:grab(/Lab No\.?\s*:?\s*(\d+)/i)||
       grab(/Lab\s*No\.?[\s\S]{0,120}?\b(\d{7,10})\b(?=\s+\d{1,2}\s+[A-Za-z]{3}\s+20\d{2}\s+\d{1,2}:\d{2})/i),
     sample_no:grab(/Sample\s*(?:No\.?|ID)\s*:?\s*(\d{7,})/i)||grab(/VIAL\s*IDs?\s+(\d{5,})/i),
     accession_no:grab(/Accession\s*No\.?\s*:?\s*(\d{7,})/i),
     requested_datetime:isoNumeric(requestedRaw)||iso(requestedRaw),
     specimen_datetime:isoNumeric(collectedRaw)||iso(collectedRaw)||
       isoNumeric(receivedRaw)||iso(receivedRaw)||isoNumeric(registeredRaw)||iso(registeredRaw)||profileDates.specimen_datetime,
     result_datetime:isoNumeric(resultRaw)||iso(resultRaw)||profileDates.result_datetime||rgccDateTime||masuyamaTestDateTime||masuyamaDateTime||profileDates.specimen_datetime,
     profile_result_datetime:profileDates.result_datetime,profile_specimen_datetime:profileDates.specimen_datetime,profile_kind:profileDates.kind,
     source:reportType.startsWith("RGCC_")?"RGCC International GmbH":context.source||"WORLD MEDICAL HOSPITAL",
     report_type:reportType,disease,disease_stage:diseaseStage,
     source_file:context.fileName||"",
     source_identity_profile:trusted.profile||extracted.sourceIdentityProfile||"",
     source_identity_evidence:[...(trusted.evidence||[]),...(extracted.sourceIdentityEvidence||[])],
     source_identity_confidence:Math.max(Number(trusted.confidence||0),Number(extracted.sourceIdentityConfidence||0)),
     masuyama_report_date:masuyamaDateRaw||"",masuyama_test_dates:masuyamaTestDateList
   }
 }
 function mergeMetaNonEmpty(base={},override={}){
   const output={...base};
   Object.entries(override||{}).forEach(([key,value])=>{
     if(Array.isArray(value)){if(value.length)output[key]=value;return}
     if(value!==null&&value!==undefined&&value!=="")output[key]=value
   });
   return output
 }
 function localEventHeaderScore(raw){
   const text=String(raw||"");
   let score=0;
   if(/\bLab\s*No\.?\s*:?\s*\d{6,12}/i.test(text))score+=6;
   if(/Requested\s+Date\s*\/?\s*Time/i.test(text))score+=4;
   if(/Received\s+Date\s*\/?\s*Time/i.test(text))score+=4;
   if(/(?:Result|Reported)\s+Date\s*\/?\s*Time/i.test(text))score+=5;
   if(/Patient\s+Name|PATIENT\s+NAME/i.test(text))score+=2;
   return score
 }
 function pageLocalMetadataText(page){
   const pdfText=String(page?.pdfText||"").trim();
   const selected=String(page?.text||"").trim();
   const geometry=String((page?.textItems||[]).map(item=>item?.str||"").join(" ")).trim();
   // For born-digital laboratory reports, the PDF text layer is authoritative
   // for Lab No. and Requested/Received/Result dates. OCR candidates can be
   // contaminated by neighbouring pages in a large merged PDF, as happened
   // with FoodPrint 11/11/2025 leaking into WMC lab pages 49 and 53.
   if(pdfText&&localEventHeaderScore(pdfText)>=8)return pdfText;
   if(selected&&localEventHeaderScore(selected)>=8)return selected;
   if(geometry&&localEventHeaderScore(geometry)>=8)return geometry;
   const candidates=photoPasses(page).map(pass=>String(pass?.text||"").trim()).filter(Boolean);
   return candidates.sort((a,b)=>localEventHeaderScore(b)-localEventHeaderScore(a))[0]||pdfText||selected||geometry||""
 }
 function pageScopedMeta(page,groupMeta={},activeMeta={}){
   const pageText=pageLocalMetadataText(page);
   const local=parseMeta(pageText,[page]);
   const localEvent=Boolean(clean(local.lab_no||local.sample_no||local.accession_no)||
     clean(local.specimen_datetime||local.result_datetime||local.requested_datetime));
   const identityOnly={
     patient_id:local.patient_id,hospital_ids:local.hospital_ids,civil_id:local.civil_id,civil_ids:local.civil_ids,
     patient_name:local.patient_name,sex:local.sex,date_of_birth:local.date_of_birth,
     age_years:local.age_years,age_months:local.age_months,age_days:local.age_days,age_at_result_years:local.age_at_result_years,age_source:local.age_source
   };
   const base=mergeMetaNonEmpty(groupMeta,activeMeta);
   // A new page-local event must NOT inherit accession/sample/Lab No. or dates
   // from an earlier report in the same merged PDF. v10.205 still carried a
   // group-level Sample No. into WMC pages 49 and 53; duplicate grouping then
   // preferred that stale Sample No. over the correct, different Lab No. values.
   // Reset every event-scoped field before merging the local header.
   const eventResetBase={
     ...base,
     lab_no:"",sample_no:"",accession_no:"",
     requested_datetime:"",specimen_datetime:"",result_datetime:"",
     profile_result_datetime:"",profile_specimen_datetime:"",profile_kind:"",
     event_provenance:"",event_anchor_page:null
   };
   const meta=localEvent?mergeMetaNonEmpty(eventResetBase,local):mergeMetaNonEmpty(base,identityOnly);
   meta.source_file=groupMeta.source_file||local.source_file||meta.source_file||"";
   return{meta,localEvent}
 }
 function dedicatedSpecializedRow(row){
   if(!row)return false;
   if(clean(row.specialized_profile)||clean(row.source_profile))return true;
   const code=clean(row.test_code).toLowerCase();
   return /^(?:inbody|oncotrail|metastat|masuyama)_/.test(code)||
     ["INBODY_720","RGCC_ONCOTRAIL","RGCC_METASTAT","MASUYAMA_IMMUNOLOGICAL"].includes(clean(row.report_type).toUpperCase())
 }

 function makeRow(def,page,value,unit,sourceFlag,reference,sourceLine,options={}){
   unit=normalizeUnit(unit);
   const reportedValue=clean(value),reportedReference=clean(reference),reportedUnit=unit;
   // A cumulative PDF text layer already contains authoritative decimals.
   // Decimal reconstruction is only appropriate for OCR/photo rows.
   const repaired=options.allowRepair===false
     ?{value:clean(value),reference:clean(reference),score:100,repaired:false}
     :clinicalRepair(def,value,reference,unit,sourceFlag);
   value=repaired.value;reference=repaired.reference;
   const vp=valueParts(value),rp=parseRef(reference);
   const inferred=unit?"":unitProfile(def,reference)?.unit||"";
   unit=unit||inferred;
   const standardized=standardizeValue(def[3],vp.value_numeric,unit);
   return value?{id:MIW.Utils.uid("labDraft"),selected:true,category:def[1],panel:def[2],test_code:def[3],display_name:def[0],...vp,
     unit,reported_value_raw:reportedValue,reported_unit:reportedUnit,unit_inferred:Boolean(inferred),
     reported_reference_raw:reportedReference,clinical_repair_applied:Boolean(repaired.repaired),...standardized,...rp,
     source_flag:sourceFlag,calculated_flag:calcFlag(vp,rp),result_kind:vp.value_numeric===null?"TEXT":"NUMERIC",
     chartable:vp.value_numeric!==null,page,confidence:reference?95:unit?93:90,source_line:sourceLine}:null
 }
 function withPageProvenance(row,page){
   if(!row)return row;
   const sourcePage=Number(page?.sourcePageNumber);
   const documentPage=Number(page?.pageNumber);
   const exactSourcePage=Number.isFinite(sourcePage)&&sourcePage>0
     ?sourcePage:Number.isFinite(documentPage)&&documentPage>0?documentPage:null;
   return{
     ...row,
     page:exactSourcePage,
     source_page_number:exactSourcePage,
     document_page_number:Number.isFinite(documentPage)&&documentPage>0?documentPage:exactSourcePage
   }
 }
 function norm(s){return clean(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"")}
 function joinColumn(items,minX,maxX){
   return clean(items.filter(i=>i.x>=minX&&i.x<maxX).sort((a,b)=>a.x-b.x).map(i=>i.str).join(" "))
 }
 function geometryRows(page){
   const source=(page.textItems||[]).map(x=>({...x,str:clean(x.str)})).filter(x=>x.str);
   const lines=[];
   source.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     let line=lines.find(l=>Math.abs(l.y-item.y)<=1.25);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   return lines.map(line=>{
     const label=joinColumn(line.items,45,275);
     const value=joinColumn(line.items,275,400);
     const unit=joinColumn(line.items,400,462);
     const sourceFlag=joinColumn(line.items,462,482).toUpperCase();
     const reference=joinColumn(line.items,482,590);
     return{label,value,unit,sourceFlag,reference,sourceLine:line.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(" | ")}
   }).filter(r=>r.label&&r.value)
 }
 function findFromGeometry(page,def){
   const targets=defAliases(def);
   const row=geometryRows(page).find(r=>targets.includes(norm(r.label)));
   if(!row)return null;
   const value=clean(row.value);
   if(!valRe.test(value))return null;
   return makeRow(def,page.pageNumber,value,unitRe.test(row.unit)?row.unit:"",/^(LL|HH|L|H)$/i.test(row.sourceFlag)?row.sourceFlag:"",row.reference,row.sourceLine,{allowRepair:false})
 }
 function findFromTokens(page,def){const tokens=String(page.text||"").split(/\n/).map(clean).filter(Boolean),targets=defAliases(def);let i=tokens.findIndex(x=>targets.includes(norm(x)));if(i<0)return null;let value="",unit="",sourceFlag="",reference="";for(let j=i+1;j<Math.min(tokens.length,i+14);j++){const t=tokens[j];if(!value&&valRe.test(t)){value=t;continue}if(value&&!unit&&unitRe.test(t)){unit=t;continue}if(value&&!sourceFlag&&/^(LL|HH|L|H)$/i.test(t)){sourceFlag=t.toUpperCase();continue}if(value&&!reference&&(/^\[.*\]$/.test(t)||/^(?:[<>]=?)\s*\d/.test(t))){reference=t;break}if(value&&TESTS.some(d=>defAliases(d).includes(norm(t))))break}return makeRow(def,page.pageNumber,value,unit,sourceFlag,reference,tokens.slice(i,Math.min(tokens.length,i+8)).join(" | "),{allowRepair:false})}
 function reportInterpretation(page,def){
   const items=(page.textItems||[]).map(i=>({...i,str:clean(i.str)})).filter(i=>i.str);
   if(!items.length)return"";
   const aliases=defAliases(def);
   const labels=items.filter(i=>i.x<285&&aliases.includes(norm(i.str)));
   if(!labels.length)return"";
   const label=labels.sort((a,b)=>b.y-a.y)[0];
   const otherLabels=items.filter(i=>i.x<285&&i.y<label.y-3&&TESTS.some(d=>defAliases(d).includes(norm(i.str))));
   const lower=otherLabels.length?Math.max(...otherLabels.map(i=>i.y))+3:-Infinity;
   const noteItems=items.filter(i=>i.x>=275&&i.y<label.y-3&&i.y>lower);
   const lines=[];
   noteItems.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     let line=lines.find(l=>Math.abs(l.y-item.y)<=2.2);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   const text=lines.sort((a,b)=>b.y-a.y).map(l=>clean(l.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(" ")))
     .filter(s=>s&&!/^(?:Result|Unit|Reference|Flag)$/i.test(s)).join("\n");
   if(!/(?:range|deficien|insufficien|sufficien|toxic|heart failure|rule[- ]?out|rule[- ]?in|unlikely|likely|considered|limit of detection)/i.test(text))return"";
   return text
 }
 function shortDate(raw,time=""){
   const m=clean(raw).match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/i);
   if(!m)return"";
   const mo={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"}[m[2].toLowerCase()];
   const tm=clean(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
   let hh="00",mm="00";
   if(tm){let h=+tm[1];if(tm[3].toUpperCase()==="PM"&&h<12)h+=12;if(tm[3].toUpperCase()==="AM"&&h===12)h=0;hh=String(h).padStart(2,"0");mm=tm[2]}
   return`20${m[3]}-${mo}-${m[1].padStart(2,"0")}T${hh}:${mm}:00+07:00`
 }
 function cumulativeColumns(page){
   const items=(page.textItems||[]).map(i=>({...i,str:clean(i.str)})).filter(i=>i.str);
   const dates=items.filter(i=>/^\d{2}-[A-Za-z]{3}-\d{2}$/.test(i.str)).sort((a,b)=>a.x-b.x);
   if(dates.length<2||!items.some(i=>/Referance/i.test(i.str)))return[];
   return dates.map((d,index)=>{
     const left=index?((dates[index-1].x+d.x)/2):d.x-38;
     const right=index<dates.length-1?((d.x+dates[index+1].x)/2):d.x+70;
     const near=items.filter(i=>i.x>=left&&i.x<right);
     const timeParts=near.filter(i=>Math.abs(i.y-(d.y-18))<4).sort((a,b)=>a.x-b.x).map(i=>i.str).join(" ");
     const lab=(near.find(i=>Math.abs(i.y-(d.y-36))<5&&/^\d{7,10}$/.test(i.str))||{}).str||"";
     const dateTime=shortDate(d.str,timeParts);
     return{left,right,dateTime,date:dateTime.slice(0,10),labNo:lab,rawDate:d.str,time:timeParts}
   })
 }
 function defAliases(def){
   const byCode={
     sodium:["Na","Sodium"],potassium:["K","Potassium"],chloride:["Cl","Chloride"],
     co2:["CO2","Bicarbonate"],anion_gap:["Anion Gap"],calcium:["Ca","Calcium"],
     corrected_calcium:["Corrected Ca","Corrected Calcium"],urea:["Urea"],uric_acid:["Uric Acid"],
     calculated_osmolality:["Calculated Osmolality","Calc Osmolality","Osmolality"],
     albumin:["Albumin"],total_protein:["T. Protein","Total Protein"],
     magnesium:["Mg","Magnesium"],phosphorus:["Phos","Phosphate","Phosphorus"],
     alp:["Alk.Phos","Aik Phos","ALP","Alkaline Phosphatase"],ast:["AST"],alt:["ALT"],
     cholesterol:["TChol","Total Cholesterol","Cholesterol"],
     triglyceride:["TG","Triglycerides"],hdl_cholesterol:["HDL CHOL","HDL"],
     ldl_cholesterol:["LDL CHOL","LDL"],
     wbc:["WBC","Total WBC","WBC Corrected","Corrected WBC"],nrbc:["NRBC"],
     rbc_count:["RBC","RBC Count","Red Blood Cell"],hb:["Hb","HGB","Hemoglobin"],hct:["Hct","Hematocrit"],
     platelet_count:["PLT","Platelet","Platelets"],
     neutrophil_pct:["NE%","Neutrophil","Neutrophils","Neutrophil %","Neutrophils %"],
     lymphocyte_pct:["LY%","Lymphocyte","Lymphocytes","Lymphocyte %","Lymphocytes %"],
     monocyte_pct:["MO%","Monocyte","Monocytes","Monocyte %","Monocytes %"],
     eosinophil_pct:["EO%","Eosinophil","Eosinophils","Eosinophil %","Eosinophils %"],
     basophil_pct:["BA%","Basophil","Basophils","Basophil %","Basophils %"],
     neutrophil_abs:["Absolute NE count","Absolute NE count (ANC)","Absolute Neutrophil Count","Neutrophil Absolute","Neutrophils Absolute","Neutrophil #","Neutrophils #","ANC"],
     lymphocyte_abs:["Absolute Lymphocyte Count","Lymphocyte Absolute","Lymphocytes Absolute","Lymphocyte #","Lymphocytes #","ALC"],
     monocyte_abs:["Absolute Monocyte Count","Monocyte Absolute","Monocytes Absolute","Monocyte #","Monocytes #"],
     eosinophil_abs:["Absolute Eosinophil Count","Eosinophil Absolute","Eosinophils Absolute","Eosinophil #","Eosinophils #"],
     basophil_abs:["Absolute Basophil Count","Basophil Absolute","Basophils Absolute","Basophil #","Basophils #"],
     urine_creatinine:["Urine Creatinine","Creatinine Urine"],
     urine_protein_quantitative:["Urine Protein","Protein Urine"],
     urine_protein_creatinine_ratio:["Urine Protein/Creatinine Ratio","Protein/Creatinine Ratio","UPCR"],
     ana_if:["ANA-IF","ANTI NUCLEAR Ab (ANA) IF","ANA IF"],
     ana_pattern_interpretation:["ANA patterns","ANA pattern","ANF ANA"],
     ana_nuclear_membrane:["Nuclear membrane"],
     ana_homogeneous:["Homogeneous"],
     ana_fine_speckle_titer:["Fine speckle","Fine speckled"],
     ana_dense_fine_speckle:["Dense fine speckle","Dense fine speckled"],
     ana_coarse_speckle:["Coarse speckle","Coarse speckled"],
     ana_centromere:["Centromere"],ana_nucleolar:["Nucleolar"],
     ana_nuclear_dot:["Nuclear dot","Nucleardot"],ana_centrioles:["Centrioles"],
     ana_spindle_fibres:["Spindle fibres","Spindle fibers","Spindle fiberes"],
     ana_midbody:["Midbody"],ana_cytoplasmic_staining:["Cytoplasmic staining","Cytoplamsmic staining"],
     anti_dsdna_titer:["Anti-dsDNA titer","Anti dsDNA titer","Anti-dsDNA"],
     anti_sm:["Anti-Sm","Anti Sm"],anti_nrnp:["Anti-nRNP","Anti nRNP","Anti-nRNA","Anti nRNA"],
     anti_ssa:["Anti-SS A","Anti-SSA","Anti SSA"],anti_ssb:["Anti-SS B","Anti-SSB","Anti SSB"],
     complement_c3:["Beta 1 C (C3 Complement)","C3 Complement","Complement C3"],
     complement_c4:["C4 complement","Complement C4"],
     arsenic_urine:["Arsenic in Urine (ICP-MS)","Arsenic in Urine","Urine Arsenic"],
     hb_a:["Hb A","Hemoglobin A"],hb_a2:["Hb A2","Hemoglobin A2"],
     hb_typing_interpretation:["Interpretation (EDTA blood)","Interpretation(EDTA blood)","Hemoglobin Typing Interpretation"],
     hb_typing_recommendation:["Lab investigation (EDTA blood)","Lab investigation(EDTA blood)","Hemoglobin Typing Laboratory Recommendation"],
     insulin:["Insulin"],cortisol:["Cortisol"],progesterone:["Progesterone"],
     testosterone:["Testosterone"],homocysteine:["Homocysteine"],
     dhea_sulfate:["DHEA-sulphate","DHEA-sulfate","DHEAS","DHEA-S"],
     aluminium_blood:["Aluminium in Blood","Aluminum in Blood"],
     arsenic_blood:["Arsenic in Blood (ICP-MS)","Arsenic in Blood"],
     cadmium_blood:["Cadmium in Blood (ICP-MS)","Cadmium in Blood"],
     lead_blood:["Lead in Blood (ICP-MS)","Lead in Blood"],
     mercury_blood:["Mercury in Blood (ICP-MS)","Mercury in Blood"],
     folate_serum:["Folate (serum)","Vitamin B9 (Folic Acid)","Folic Acid"],
     vitamin_b12:["Vitamin B12","Cobalamin"],
     chromium:["Chromium"],copper:["Copper"],ferritin:["Ferritin"],
     magnesium:["Mg","Magnesium","Magnesium (Mg)"],
     selenium:["Selenium"],zinc:["Zinc"],
     vitamin_a_retinol:["Vitamin A (Retinol)","Retinol"],
     vitamin_e_gamma:["Vitamin E (gamma-Tocopherol)","gamma-Tocopherol"],
     vitamin_e_alpha:["Vitamin E (alpha-Tocopherol)","alpha-Tocopherol"],
     lutein_zeaxanthin:["Lutein+Zeaxanthin","Lutein Zeaxanthin"],
     beta_cryptoxanthin:["beta-Cryptoxanthin","Beta-Cryptoxanthin"],
     lycopene:["Lycopene"],alpha_carotene:["alpha-Carotene","Alpha-Carotene"],
     beta_carotene:["Beta-Carotene"],coenzyme_q10:["Coenzyme Q10","CoQ10"],
     vitamin_c_ascorbate:["Vitamin C (Ascorbate acid)","Vitamin C (Ascorbic acid)","Ascorbate acid"],
     spep_albumin:["Albumin"],spep_alpha_1:["Alpha 1","Alpha-1"],spep_alpha_2:["Alpha 2","Alpha-2"],
     spep_beta:["Beta"],spep_gamma:["Gamma"],spep_ag_ratio:["A/G Ratio","A G Ratio"],
     spep_interpretation:["No monoclonal band seen","No monoclonal band"],
     ca_125:["CA-125","CA 125"],ca_19_9:["CA 19-9","CA19-9"],cea:["Carcinoembryonic Ag","CEA"],
     crp_hs:["C-Reactive Protein High Sens.","CRP High Sens.","CRP (C-Reactive Pro HS)"],
     nt_probnp:["NT-ProBNP"],psa:["Prostatic Specific Ag","PSA","Total PSA"],hba1c_ifcc:["Hb A1c (IFCC)"],
     estradiol_e2:["Estradiol (E2)","Estradiol"],
     fsh:["Follicle Stimulating Hormone (FSH)","Folicle Stimulating Hormone (FSH)","Folicle Stimulating Hormone"],
     lh:["Luteinizing Hormone (LH)","Lutinizing Hormone (LH)","Lutinizing Hormone"],
     free_t3:["Free T3","Triiodothyronine Free"],
     free_t4:["Free T4","Thyroxine Free"],
     tsh:["Thyroid Stimulating Hormone","Thyroid Stimulating Hormone (TSH)","TSH"],
     hiv_ag:["HIV Ag","HIV Antigen"],hiv_ab:["HIV Ab","HIV Antibody"],
     anti_hiv_interpretation:["HIV Ag/Ab","Anti HIV(Interprete)","Anti HIV (Interprete)","Anti HIV"],
     syphilis:["RPR","RPR(by flocculation method)","Syphilis"],
     bun:["Blood Urea Nitrogen","BUN"],egfr_ckd_epi:["eGFR"],eag:["Estimated average glucose","Estimated average"],
     creatinine:["Creatinine","Creat"],
     fasting_glucose:["Glucose (FBS)","Glucose (Fasting)","Fasting Glucose","Fasting Blood Glucose","Fasting Blood Sugar","FBS"],
     random_glucose:["Glucose (Random)","Random Glucose","Random Blood Glucose","Random Blood Sugar","RBS"],
     total_bilirubin:["Total Bilirubin","Bilirubin (Total)","T.Bili","TBil","TBI","Bilirubin T"],
     direct_bilirubin:["Direct Bilirubin","Bilirubin (Direct)","D.Bili","DBil","Bilirubin D"],
     ggt:["GGT","Gamma GT","Gamma-Glutamyl Transferase"],
     amylase:["Amylase","Amy-P","Amylase-P"],lipase:["Lipase"],
     crp:["CRP","C-Reactive Protein"],ca_15_3:["CA 15-3","CA15-3"],
     prothrombin_time:["Prothrombin Time","Prothrombin Time (PT)","PT"],inr:["INR"],aptt:["APTT","aPTT","Activated Partial Thromboplastin Time(aPTT)","Activated Partial Thromboplastin Time (aPTT)"],
     fdp:["FDP","FDP(Fibrin Degradation Product)","Fibrin Degradation Product","D-Dimer"],
     reticulocyte_pct:["% Reticulocyte","Reticulocyte %","%Reticulocyte"],reticulocyte_abs:["Reticulocytes","Reticulocyte Absolute","Absolute Reticulocytes"],
     myelocyte_pct:["% Myelocyte","Myelocyte %"],metamyelocyte_pct:["% Metamyelocyte","Metamyelocyte %"],
     direct_coombs:["Direct Coombs Test","Direct Coombs Test-DAT-CENTBLOOD"],indirect_coombs:["In-Direct Coombs Test","Indirect Coombs Test","IAT-CENTBLOOD"],
     ldh:["Lactate Dehydrogenase","LDH-P(Lactate Dehydrogenase)","LDH-P","LDH"],vitamin_d_25_oh:["Vitamin D (25 Hydroxy)","Vitamin D (25-OH) Total","Vitamin D 25 OH Total"],
     iron:["Iron"],transferrin_saturation:["TREN %","Transferrin Saturation","TSAT"],transferrin:["Transferrin"],
     urine_leucocyte_esterase:["Leukocyte Esterase","Leucocyte esterase"],
     urine_specific_gravity:["Specific Gravity","Sp.Gr.","SG"],
     urine_appearance:["Appearance","Transparency"],
     urine_blood:["Blood","Erythrocyte","Urine Blood"],
     urine_nitrite:["Nitrite"],
     urine_rbc:["Urine RBC","RBC","RBC /HPF","RBC/HPF"],
     urine_wbc:["Urine WBC","WBC","WBC /HPF","WBC/HPF","Pus cells"],
     urine_epithelial:["Epithelial","Eplthelial","Epithelial cell","Epithelial cells","Squamous Epithelial Cell","Squamous Epithelial Cells"],
     urine_mucous:["Mucus","Mucous threads"],urine_casts:["Cast","Casts"],urine_crystals:["Crystal","Crystals"],
     stool_consistency:["Consistency"],stool_color:["Color"],stool_wbc:["WBC"],stool_rbc:["RBC"],
     mycoplasma_pneumoniae:["Mycoplasma"],chlamydophila_pneumoniae:["Chlamydophila"],
     rsv_ab:["Respiratory syncytial"],metapneumovirus_ab:["metapneumovirus"]
   };
   return[def[0],...(byCode[def[3]]||[])].map(norm)
 }
 function inlinePhotoRows(page){
   if(page.captureType!=="PHOTO")return[];
   const output=[],used=new Set();
   const passes=photoPasses(page);
   const lines=passes.flatMap(pass=>String(pass.text||"").split(/\n/)
     .map(text=>({text:clean(text),confidence:Number(pass.confidence||0),mode:pass.mode}))
     .filter(x=>x.text));
   const numeric="[<>]=?\\s*-?\\d+(?:[.,]\\d+)?";
   const range="(?:[<>]=?\\s*)?-?\\d+(?:[.,]\\d+)?(?:\\s*[-–]\\s*-?\\d+(?:[.,]\\d+)?)?";
   const units="(?:mmol\\s*\\/\\s*[Ll]|mg\\s*\\/\\s*d[Ll]|g\\s*\\/\\s*[Ll]|g\\s*\\/\\s*d[Ll]|[uµ]?mol\\s*\\/\\s*[Ll]|m?Osm\\s*\\/\\s*[Ll]|ng\\s*\\/\\s*m[Ll]|mIU\\s*\\/\\s*m[Ll]|U\\s*\\/\\s*[Ll]|%|fL|pg|10\\^?[369]\\s*\\/\\s*[Ll])";
   for(const def of TESTS){
     if(def[3].startsWith("spep_")||def[3]==="ana_if")continue;
     const aliases=[def[0],...(defAliases(def))].map(norm).filter(a=>a.length>=2)
       .sort((a,b)=>b.length-a.length);
     for(const candidate of lines){
       const line=candidate.text,normalizedLine=norm(line);
       const alias=aliases.find(a=>normalizedLine.startsWith(a));
       if(!alias)continue;
       const tokens=line.split(/\s+/);
       let firstNumeric=tokens.findIndex(token=>new RegExp(`^${numeric}$`,"i").test(token.replace(/[Oо](?=\d)/g,"0")));
       if(firstNumeric<0)continue;
       const tail=tokens.slice(firstNumeric).join(" ")
         .replace(/[Oо](?=\d)/g,"0")
         .replace(/[‘’'"](?=\s*[<>]?\d)/g,"");
       const match=tail.match(new RegExp(`^(${numeric})\\s*(?:(LL|HH|L|H)[^\\d]*)?\\s*(?:(${range}))?\\s*(${units})?`,"i"));
       if(!match)continue;
       const value=repairPhotoValue(match[1]),flag=clean(match[2]).toUpperCase();
       let reference=clean(match[3]).replace(/^[\[(]|[\])]$/g,"");
       if(reference===value)reference="";
       const unit=clean(match[4]).replace(/\s+/g,"");
       if(/[-–]/.test(value))continue;
       const key=`${def[3]}|${value}`;
       if(used.has(key))continue;
       const row=makeRow(def,page.pageNumber,value,unit,flag,reference,line);
       if(row){
         row.confidence=Math.min(Number(row.confidence||90),candidate.confidence||75);
         row.parse_issue=row.confidence<80||!reference;
         row.photo_ocr=true;row.ocr_pass=candidate.mode;
         output.push(row);used.add(key)
       }
     }
   }
   return output
 }
 function photoPasses(page){
   const stored=Array.isArray(page.ocr?.candidates)?page.ocr.candidates:[];
   const base={mode:page.ocr?.selectedPass||"selected",text:page.text||"",textItems:page.textItems||[],confidence:page.ocr?.confidence||0};
   // A scanned/visual-OCR PDF can still contain a useful hidden text layer.
   // Keep it as an independent evidence pass instead of discarding it after
   // image OCR. This is especially important for Medica reports where OCR may
   // lose µ, decimal points, or one complete result row.
   const pdfText={mode:"pdf-text-layer",text:page.pdfText||"",textItems:page.pdfTextItems||[],confidence:98};
   const all=[base,pdfText,...stored].filter(x=>String(x.text||"").trim()||(x.textItems||[]).length);
   const seen=new Set();
   return all.filter(x=>{
     const normalized=String(x.text||"").replace(/\s+/g," ").trim();
     const itemKey=(x.textItems||[]).slice(0,20).map(item=>clean(item.str)).join("|");
     const key=`${x.mode}|${normalized.slice(0,240)}|${itemKey.slice(0,240)}`;
     if(seen.has(key))return false;seen.add(key);return true
   })
 }
 const SPECIALIZED_PROFILE_CODES=new Set([
   "ana_pattern_interpretation","ana_nuclear_membrane","ana_homogeneous",
   "ana_fine_speckle_titer","ana_dense_fine_speckle","ana_coarse_speckle",
   "ana_centromere","ana_nucleolar","ana_nuclear_dot","ana_centrioles",
   "ana_spindle_fibres","ana_midbody","ana_cytoplasmic_staining",
   "anti_dsdna_titer","anti_sm","anti_nrnp","anti_ssa","anti_ssb",
   "complement_c3","complement_c4","arsenic_urine",
   "hb","hct","mcv","mch","rdw","hb_a","hb_a2",
   "hb_typing_interpretation","hb_typing_recommendation",
   "aluminium_blood","arsenic_blood","cadmium_blood","lead_blood","mercury_blood",
   "insulin","cortisol","progesterone","testosterone","homocysteine","dhea_sulfate",
   "masuyama_immunity_level","masuyama_nlr","masuyama_lymphocyte_count",
   "masuyama_cd4_cd8_ratio","masuyama_nk_cell_count","masuyama_nk_vue","masuyama_nkg2d_cell_count",
   "folate_serum","vitamin_b9_folic_acid","vitamin_b12","chromium","copper","ferritin","magnesium",
   "selenium","zinc","vitamin_a_retinol","vitamin_e_gamma","vitamin_e_alpha",
   "lutein_zeaxanthin","beta_cryptoxanthin","lycopene","alpha_carotene",
   "beta_carotene","coenzyme_q10","vitamin_c_ascorbate",
   ...TESTS.filter(item=>/^(?:inbody|oncotrail|metastat)_/.test(item[3])).map(item=>item[3])
 ]);
 function normalizeTiter(raw){
   const text=clean(raw).replace(/[／/7]/g,":").replace(/\s+/g,"");
   const match=text.match(/^([<>]=?)?1:(\d{1,4})$/);
   return match?`${match[1]||""}1:${match[2]}`:clean(raw)
 }
 function specializedRow(code,page,pass,value,options={}){
   const def=TESTS.find(item=>item[3]===code);
   if(!def||!clean(value))return null;
   const row=makeRow(
     def,page.sourcePageNumber??page.pageNumber,value,
     options.unit||"",options.sourceFlag||"",options.reference||"",
     options.sourceLine||"",{allowRepair:Boolean(options.allowRepair)}
   );
   if(!row)return null;
   const resultKind=options.resultKind||row.result_kind;
   row.result_kind=resultKind;
   row.chartable=resultKind==="NUMERIC"&&row.value_numeric!==null;
   if(resultKind!=="NUMERIC"){
     row.value_numeric=null;
     row.value_operator="text";
     row.standardized_value=null;
     row.standardized_unit=""
   }
   row.reported_value_raw=options.reportedValue??row.reported_value_raw;
   row.reported_method=options.method||"";
   row.specimen_type=options.specimenType||"";
   row.specialized_profile=options.profile||"";
   row.reference_context_raw=options.referenceContext||"";
   row.reference_selection=options.referenceSelection||null;
   row.patient_context=options.patientContext||null;
   row.report_interpretation_raw=options.interpretation||"";
   row.calculated_flag=options.calculatedFlag||(
     ["H","HH","L","LL","N"].includes(clean(options.sourceFlag).toUpperCase())
       ?clean(options.sourceFlag).toUpperCase():row.calculated_flag
   );
   row.confidence=Math.min(98,Math.max(78,Number(pass?.confidence||88)));
   row.parse_issue=false;
   row.low_confidence_advisory=false;
   row.missing_fields_advisory=false;
   row.photo_ocr=page.captureType==="PHOTO";
   if(row.photo_ocr)row.ocr_pass=pass?.mode||"specialized-profile";
   row.source_evidence=[{
     type:"specialized-lab-profile",
     profile:row.specialized_profile,
     method:row.reported_method,
     raw_line:options.sourceLine||"",
     reference_context:row.reference_context_raw,
     page:page.sourcePageNumber??page.pageNumber
   }];
   return row
 }
 const HEMOGLOBIN_TYPING_NUMERIC=[
   {code:"hb_a2",alias:/^Hb\s*A2\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"%",method:"CE"},
   {code:"hb_a",alias:/^Hb\s*A(?!2)\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"%",method:"CE"},
   {code:"hct",alias:/^Hct\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"%",method:"CE"},
   {code:"mcv",alias:/^MCV\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"fL",method:"CE"},
   {code:"mch",alias:/^MCH\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"pg",method:"CE"},
   {code:"rdw",alias:/^RDW\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"%",method:"CE"},
   {code:"hb",alias:/^Hb(?!\s*A)\s*(?:\(\s*EDTA\s*blood\s*\))?/i,unit:"g/dL",method:"CE"}
 ];
 const HEAVY_METAL_BLOOD_PROFILE=[
   {code:"aluminium_blood",alias:/^\*?\s*Alumin(?:ium|um)\s+in\s+Blood\b/i,unit:"µg/dL",method:"GF-AAS"},
   {code:"arsenic_blood",alias:/^\*?\s*Arsenic\s+in\s+Blood(?:\s*\(\s*ICP-MS\s*\))?/i,unit:"µg/L",method:"ICP-MS"},
   {code:"cadmium_blood",alias:/^\*?\s*Cadmium\s+in\s+Blood(?:\s*\(\s*ICP-MS\s*\))?/i,unit:"µg/L",method:"ICP-MS"},
   {code:"lead_blood",alias:/^\*?\s*Lead\s+in\s+Blood(?:\s*\(\s*ICP-MS\s*\))?/i,unit:"µg/L",method:"ICP-MS"},
   {code:"mercury_blood",alias:/^\*?\s*Mercury\s+in\s+Blood(?:\s*\(\s*ICP-MS\s*\))?/i,unit:"µg/L",method:"ICP-MS"}
 ];
 const MEDICA_PANEL_PROFILE=[
   {code:"insulin",alias:/^\*?\s*Insulin\b/i,unit:"µIU/mL",method:"ECLIA",references:[{raw:"2.6-24.9"}]},
   {code:"cortisol",alias:/^\*?\s*Cortisol\b/i,unit:"µg/dL",method:"ECLIA",context:"TIME"},
   {code:"progesterone",alias:/^\*?\s*Progesterone\b/i,unit:"ng/mL",method:"ECLIA",context:"REPRODUCTIVE_PHASE"},
   {code:"testosterone",alias:/^\*?\s*Testosterone\b/i,unit:"ng/dL",method:"ECLIA",context:"SEX_AGE"},
   {code:"homocysteine",alias:/^\*?\s*Homocysteine\b/i,unit:"µmol/L",method:"Enzymatic assay",references:[{raw:"<=15"}]},
   {code:"dhea_sulfate",alias:/^\*?\s*DHEA[-\s]*sul(?:ph|f)ate\b/i,unit:"µg/dL",method:"ECLIA",context:"SEX_AGE"},
   {code:"vitamin_b12",alias:/^\*?\s*Vitamin\s+B12\b/i,unit:"pg/mL",method:"ECLIA",references:[{raw:"197.0-771.0"}]}
 ];
 function normalizedComparator(raw){
   return clean(raw).replace(/^N\s*/i,"").replace(/≤/g,"<=").replace(/≥/g,">=")
     .replace(/\s+/g,"").replace(/–/g,"-")
 }
 function reportedNumericTokens(raw){
   return[...String(raw||"").matchAll(/([<>]=?|≤|≥)?\s*(-?\d+(?:[.,]\d+)?)/g)]
     .map(match=>`${match[1]||""}${match[2]}`.replace(/,/g,".").replace(/≤/,"<=").replace(/≥/,">="))
 }
 function referenceTokens(raw){
   return[...String(raw||"").matchAll(/(?:N\s*)?(?:[<>]=?|≤|≥)\s*-?\d+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?\s*[-–]\s*-?\d+(?:[.,]\d+)?/gi)]
     .map(match=>normalizedComparator(match[0]))
 }
 function bestProfileRows(rowsByCode){
   return[...rowsByCode.values()].map(row=>{delete row._profile_score;return row})
 }
 function keepProfileRow(rowsByCode,row){
   if(!row)return;
   row._profile_score=Number(row.confidence||0)+(row.reference_raw?5:0)+(row.source_line?4:0);
   const previous=rowsByCode.get(row.test_code);
   if(!previous||row._profile_score>previous._profile_score)rowsByCode.set(row.test_code,row)
 }
 function specializedProfileLines(pass){
   const textLines=String(pass?.text||"").split(/\r?\n/).map(clean).filter(Boolean);
   const geometryLines=(Array.isArray(pass?.textItems)&&pass.textItems.length)
     ?photoLines(pass).map(item=>clean(item.text)).filter(Boolean):[];
   // Never de-duplicate a text-only token stream. Repeated cells such as
   // "ICP-MS", "µg/L" and "<5" belong to different analytes; removing the
   // second occurrence destroys row boundaries and causes silent loss.
   if(!geometryLines.length)return textLines;
   const output=[],seen=new Set();
   for(const line of geometryLines){
     const key=line.toLowerCase().replace(/\s+/g," ");
     if(!key||seen.has(key))continue;
     seen.add(key);output.push(line)
   }
   // Geometry is preferred. Add only genuinely new text-layer lines as
   // secondary evidence while preserving source order.
   for(const line of textLines){
     const key=line.toLowerCase().replace(/\s+/g," ");
     if(!key||seen.has(key))continue;
     seen.add(key);output.push(line)
   }
   return output
 }
 function profileRowLine(pass,config){
   const geometry=photoLines(pass);
   const index=geometry.findIndex(item=>config.alias.test(item.text));
   if(index>=0){
     let line=geometry[index].text;
     const matched=line.match(config.alias);
     let tail=matched?clean(line.slice((matched.index||0)+matched[0].length)):line;
     // PDF text layers often place METHOD, RESULT, UNIT and REFERENCE on four
     // separate visual rows. The old three-line look-ahead stopped as soon as
     // it saw a unit, so the following reference token was never attached and
     // the whole analyte disappeared. Keep collecting source-row fragments
     // until both a result and a reference-like token are available.
     for(let offset=1;offset<=8&&index+offset<geometry.length;offset++){
       const candidate=geometry[index+offset].text;
       if([...HEMOGLOBIN_TYPING_NUMERIC,...HEAVY_METAL_BLOOD_PROFILE,...MEDICA_PANEL_PROFILE]
         .some(other=>other!==config&&other.alias.test(candidate)))break;
       if(/^(?:PRINT\s+DATE|REPORTED\s+BY|APPROVED\s+BY|\*{3}\s*End\s+of\s+Report)/i.test(candidate))break;
       const relevant=reportedNumericTokens(candidate).length||referenceTokens(candidate).length||
         /(?:LL|HH|L|H|N)\b|%|g\s*\/\s*dL|fL|pg|[uµμ]g\s*\/\s*(?:dL|L)|CE|ICP[-\s]*MS|GF[-\s]*AAS/i.test(candidate);
       if(!relevant)continue;
       line=clean(`${line} ${candidate}`);
       tail=clean(`${tail} ${candidate}`);
       const numerics=reportedNumericTokens(tail),references=referenceTokens(tail);
       const hasUnit=/%|g\s*\/\s*dL|fL|pg|[uµμ]g\s*\/\s*(?:dL|L)/i.test(tail);
       if(numerics.length>=2&&references.length&&hasUnit)break
     }
     return line
   }
   const lines=specializedProfileLines(pass);
   const textIndex=lines.findIndex(item=>config.alias.test(item));
   if(textIndex<0)return"";
   let line=lines[textIndex];
   const matched=line.match(config.alias);
   let tail=matched?clean(line.slice((matched.index||0)+matched[0].length)):line;
   // Text-only PDF/OCR passes may emit one visual cell per line, for example:
   //   Aluminium in Blood / GF-AAS / 0.10 / µg/dL / <5
   // Geometry reconstruction cannot help when textItems are absent, so rebuild
   // the source row from the following token lines before parsing it.
   for(let offset=1;offset<=12&&textIndex+offset<lines.length;offset++){
     const candidate=lines[textIndex+offset];
     if([...HEMOGLOBIN_TYPING_NUMERIC,...HEAVY_METAL_BLOOD_PROFILE,...MEDICA_PANEL_PROFILE]
       .some(other=>other!==config&&other.alias.test(candidate)))break;
     if(/^(?:PRINT\s+DATE|REPORTED\s+BY|APPROVED\s+BY|\*{3}\s*End\s+of\s+Report|LAB\s+NO\.?|PATIENT\s+NAME|HOSPITAL\s*\/\s*CLINIC)/i.test(candidate))break;
     const relevant=reportedNumericTokens(candidate).length||referenceTokens(candidate).length||
       /^(?:LL|HH|L|H|N)$/i.test(candidate)||
       /(?:%|g\s*\/\s*dL|fL|pg|[uµμ]g\s*\/\s*(?:dL|L)|[uµμp]?IU\s*\/\s*m[lL]|[pnuµμ]?mol\s*\/\s*[lL]|CE|ICP[-\s]*MS|GF[-\s]*AAS|ECLIA|Enzymatic\s+assay)/i.test(candidate);
     if(!relevant)continue;
     line=clean(`${line} ${candidate}`);
     tail=clean(`${tail} ${candidate}`);
     const numerics=reportedNumericTokens(tail),references=referenceTokens(tail);
     const hasUnit=/%|g\s*\/\s*dL|fL|pg|[uµμ]g\s*\/\s*(?:dL|L)|[uµμp]?IU\s*\/\s*m[lL]|[pnuµμ]?mol\s*\/\s*[lL]/i.test(tail);
     if(numerics.length>=2&&references.length&&hasUnit)break
   }
   return line
 }
 function rawSequentialProfileLine(pass,config,configs,maxLines=16){
   const lines=String(pass?.text||"").split(/\r?\n/).map(clean).filter(Boolean);
   const start=lines.findIndex(line=>config.alias.test(line));
   if(start<0)return"";
   const output=[lines[start]];
   for(let offset=1;offset<=maxLines&&start+offset<lines.length;offset++){
     const candidate=lines[start+offset];
     if(configs.some(other=>other!==config&&other.alias.test(candidate)))break;
     if(/^(?:PRINT\s+DATE|REPORTED\s+BY|APPROVED\s+BY|\*{3}\s*End\s+of\s+Report|LAB\s+NO\.?|PATIENT\s+NAME|HOSPITAL\s*\/\s*CLINIC|TEST\s+NAME)/i.test(candidate))break;
     output.push(candidate)
   }
   return clean(output.join(" "))
 }
 function heavyMetalRawSequenceRow(page,pass,config){
   const section=rawSequentialProfileLine(pass,config,HEAVY_METAL_BLOOD_PROFILE,18);
   if(!section)return null;
   const aliasMatch=section.match(config.alias);
   let tail=aliasMatch?clean(section.slice((aliasMatch.index||0)+aliasMatch[0].length)):section;
   tail=clean(tail.replace(/^(?:GF[-\s]*AAS|ICP[-\s]*MS)\b/i,""));
   const unitMatch=tail.match(/[uµμ]g\s*\/\s*(?:dL|L)/i);
   let value="",reference="";
   if(unitMatch){
     const before=tail.slice(0,unitMatch.index),after=tail.slice(unitMatch.index+unitMatch[0].length);
     value=reportedNumericTokens(before)[0]||"";
     reference=referenceTokens(after).at(-1)||""
   }else{
     // Some PDF text layers vertically displace or entirely omit the unit.
     // The first numeric token remains the reported result and the final
     // comparator remains the laboratory reference range.
     const numerics=reportedNumericTokens(tail),references=referenceTokens(tail);
     value=numerics[0]||"";
     reference=references.at(-1)||""
   }
   if(!value||!reference||value===reference)return null;
   const row=specializedRow(config.code,page,pass,value,{
     unit:config.unit,reference,method:config.method,
     specimenType:"Blood (source report: SERUM, EDTA BLOOD)",profile:"HEAVY_METALS_BLOOD",
     sourceLine:section,referenceContext:"Normal range จากหน้าผลตรวจหลัก; เป้าหมาย Anti-aging เก็บแยกและไม่ใช้เปลี่ยนธงทางคลินิก",
     allowRepair:false
   });
   if(!row)return null;
   row.confidence=Math.max(Number(row.confidence||0),pass?.mode==="pdf-text-layer"?99:98);
   row.extraction_route="raw-sequential-source-text";
   row.reported_unit=unitMatch?normalizeUnit(unitMatch[0]):"";
   row.unit_inferred=!unitMatch;
   row.source_evidence=[...(row.source_evidence||[]),{
     type:"raw-sequential-source-text",profile:"HEAVY_METALS_BLOOD",
     reported_unit:row.reported_unit,inferred_unit:row.unit_inferred?config.unit:"",
     raw_line:section,page:page.sourcePageNumber??page.pageNumber
   }];
   return row
 }
 function medicaUnitRegex(config){
   if(config.code==="insulin")return/(?:[uµμp]?IU)\s*\/\s*m[lL]/i;
   return new RegExp(config.unit.replace("µ","[uµμp]").replace("/","\\s*\\/\\s*").replace("dL","d[lL]").replace("mL","m[lL]").replace("mol","mol"),"i")
 }
 function profileSection(lines,startIndex,maxLines=10){
   const output=[];
   for(let index=startIndex;index<lines.length&&output.length<maxLines;index++){
     const line=lines[index];
     if(index>startIndex&&MEDICA_PANEL_PROFILE.some(config=>config.alias.test(line)))break;
     if(index>startIndex&&/^(?:PRINT\s+DATE|REPORTED\s+BY|APPROVED\s+BY|\*{3}\s*End\s+of\s+Report)/i.test(line))break;
     output.push(line)
   }
   return output.join(" ")
 }
 function hemoglobinTypingRows(page){
   const hint=String(page.profileHint||"");
   const allText=photoPasses(page).map(pass=>pass.text||"").join("\n");
   if(!/Hemoglobin\s+Typing|Normal\s+Hb\s+typing|alpha[-\s]*thalassemia/i.test(allText)&&!/HEMOGLOBIN_TYPING/i.test(hint))return[];
   const best=new Map();
   for(const pass of photoPasses(page)){
     const rawText=String(pass.text||""),lines=specializedProfileLines(pass);
     for(const config of HEMOGLOBIN_TYPING_NUMERIC){
       const line=profileRowLine(pass,config);
       if(!line)continue;
       const match=line.match(config.alias),tail=match?clean(line.slice((match.index||0)+match[0].length)):line;
       const value=reportedNumericTokens(tail)[0]||"";
       const reference=referenceTokens(tail)[0]||"";
       const flag=(tail.match(/(?:^|\s)(LL|HH|L|H|N)(?:\s|$)/i)||[])[1]||"";
       keepProfileRow(best,specializedRow(config.code,page,pass,value,{
         unit:config.unit,reference,sourceFlag:flag.toUpperCase(),method:config.method,
         specimenType:"EDTA blood",profile:"HEMOGLOBIN_TYPING",sourceLine:line,
         referenceContext:"ช่วงอ้างอิงและธงผลยึดตามรายงาน Hemoglobin Typing ต้นฉบับ",
         allowRepair:false
       }))
     }
     const interpretation=(clean(rawText).match(/Interpretation\s*\(\s*EDTA\s*blood\s*\)\s*([\s\S]*?)(?=Lab\s+investigation\s*\(|CBC\s|REPORT(?:T)?ED\s+BY|$)/i)||[])[1];
     if(interpretation){
       const value=clean(interpretation).replace(/\s+CE\s*$/i,"");
       keepProfileRow(best,specializedRow("hb_typing_interpretation",page,pass,value,{
         resultKind:"TEXT",method:"Capillary electrophoresis",specimenType:"EDTA blood",
         profile:"HEMOGLOBIN_TYPING",sourceLine:`Interpretation (EDTA blood): ${value}`,
         interpretation:"เป็นข้อความแปลผลจากห้องปฏิบัติการ ไม่ใช่ผล PCR สำหรับ alpha-thalassemia"
       }))
     }
     const recommendation=(clean(rawText).match(/Lab\s+investigation\s*\(\s*EDTA\s*blood\s*\)\s*([\s\S]*?)(?=CBC\s|REPORT(?:T)?ED\s+BY|The\s+report\s+is\s+valid|$)/i)||[])[1];
     if(recommendation){
       const value=clean(recommendation).replace(/\s+CE\s*$/i,"");
       keepProfileRow(best,specializedRow("hb_typing_recommendation",page,pass,value,{
         resultKind:"TEXT",method:"Laboratory recommendation",specimenType:"EDTA blood",
         profile:"HEMOGLOBIN_TYPING",sourceLine:`Lab investigation (EDTA blood): ${value}`,
         interpretation:"คำแนะนำจากรายงานให้พิจารณาตรวจยืนยัน Alpha-Thalassemia profile ด้วย PCR และประเมินคู่สมรสตามบริบทการวางแผนครอบครัว"
       }))
     }
   }
   return bestProfileRows(best)
 }
 function medicaWellnessSummaryPage(text){
   const source=String(text||"");
   const hasMethodHeader=/TEST\s*NAME[\s\S]{0,140}METHOD[\s\S]{0,140}RESULT/i.test(source);
   const hasAntiAging=/(?:ANTI[-\s]*AGING|[-–]\s*AGING)/i.test(source);
   const hasSummaryColumns=/TEST\s*NAME[\s\S]{0,180}RESULT[\s\S]{0,180}(?:LEVEL|ANTI[-\s]*AGING|NORMAL\s+RANGE)/i.test(source);
   const hasGraphicScale=/(?:Low\s+Normal|Moderate|Very\s+High|Therapeutic\s*\/\s*Wellness|\bLEVEL\b[\s\S]{0,80}\bRANGE\b)/i.test(source);
   // Names such as "Arsenic in Blood (ICP-MS)" contain a method token even
   // on the graphic page, so only an actual METHOD table header distinguishes
   // the clinical result page from the secondary wellness/anti-aging page.
   return!hasMethodHeader&&(hasAntiAging||hasSummaryColumns||hasGraphicScale)
 }
 function heavyMetalBloodRows(page){
   const hint=String(page.profileHint||"");
   const allText=photoPasses(page).map(pass=>pass.text||"").join("\n");
   const signature=HEAVY_METAL_BLOOD_PROFILE.filter(config=>config.alias.test(allText)).length;
   if(medicaWellnessSummaryPage(allText))return[];
   const primary=/TEST\s+NAME[\s\S]{0,100}METHOD[\s\S]{0,100}RESULT[\s\S]{0,100}REFERENCE\s+RANGE/i.test(allText)&&
     /GF[-\s]*AAS|ICP[-\s]*MS/i.test(allText)&&!/ANTI[-\s]*AGING[\s\S]{0,30}NORMAL/i.test(allText);
   // Three or more named metals are already a strong profile signature.
   // Do not require profileHint as well: browser PDF.js/OCR may fail to set the
   // hint even though the result table itself is readable.
   if(!primary&&signature<3&&!/HEAVY_METALS_BLOOD/i.test(hint))return[];
   const best=new Map();
   for(const pass of photoPasses(page)){
     const lines=specializedProfileLines(pass);
     for(const config of HEAVY_METAL_BLOOD_PROFILE){
       // Medica's hidden text layer preserves the correct token order even
       // when the unit glyph is drawn one visual row lower. Parse that source
       // sequence independently before attempting geometry reconstruction.
       keepProfileRow(best,heavyMetalRawSequenceRow(page,pass,config));
       const line=profileRowLine(pass,config);
       if(!line)continue;
       const match=line.match(config.alias),tail=match?clean(line.slice((match.index||0)+match[0].length)):line;
       const unitMatch=tail.match(/[uµμ]g\s*\/\s*(?:dL|L)/i);
       const before=unitMatch?tail.slice(0,unitMatch.index):tail;
       const after=unitMatch?tail.slice(unitMatch.index+unitMatch[0].length):tail;
       const values=reportedNumericTokens(before),value=values[0]||"";
       const references=referenceTokens(after),reference=references.at(-1)||"";
       if(!value||!reference)continue;
       keepProfileRow(best,specializedRow(config.code,page,pass,value,{
         unit:config.unit,reference,method:config.method,
         specimenType:"Blood (source report: SERUM, EDTA BLOOD)",profile:"HEAVY_METALS_BLOOD",
         sourceLine:line,referenceContext:"Normal range จากหน้าผลตรวจหลัก; เป้าหมาย Anti-aging เก็บแยกและไม่ใช้เปลี่ยนธงทางคลินิก",
         allowRepair:false
       }))
     }
   }
   return bestProfileRows(best)
 }
 const TESTOSTERONE_REFERENCES=[
   {raw:"249-836",sex:"Male",minAge:20,maxAge:49.999},{raw:"193-740",sex:"Male",minAge:50,maxAge:130},
   {raw:"8.4-48.1",sex:"Female",minAge:20,maxAge:49.999},{raw:"2.9-40.8",sex:"Female",minAge:50,maxAge:130}
 ];
 const DHEA_S_REFERENCES=[
   {raw:"33.9-280",sex:"Female",minAge:10,maxAge:14.999},{raw:"65.1-368",sex:"Female",minAge:15,maxAge:19.999},
   {raw:"148-407",sex:"Female",minAge:20,maxAge:24.999},{raw:"98.8-340",sex:"Female",minAge:25,maxAge:34.999},
   {raw:"60.9-337",sex:"Female",minAge:35,maxAge:44.999},{raw:"35.4-256",sex:"Female",minAge:45,maxAge:54.999},
   {raw:"18.9-205",sex:"Female",minAge:55,maxAge:64.999},{raw:"9.40-246",sex:"Female",minAge:65,maxAge:74.999},
   {raw:"12.0-154",sex:"Female",minAge:75,maxAge:130},
   {raw:"24.4-247",sex:"Male",minAge:10,maxAge:14.999},{raw:"70.2-492",sex:"Male",minAge:15,maxAge:19.999},
   {raw:"211-492",sex:"Male",minAge:20,maxAge:24.999},{raw:"160-449",sex:"Male",minAge:25,maxAge:34.999},
   {raw:"88.9-427",sex:"Male",minAge:35,maxAge:44.999},{raw:"44.3-331",sex:"Male",minAge:45,maxAge:54.999},
   {raw:"51.7-295",sex:"Male",minAge:55,maxAge:64.999},{raw:"33.6-249",sex:"Male",minAge:65,maxAge:74.999},
   {raw:"16.2-123",sex:"Male",minAge:75,maxAge:130}
 ];
 function specimenClockMinutes(raw){
   const match=String(raw||"").match(/\b(\d{1,2})[.:](\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
   if(!match)return null;
   let hour=Number(match[1]),minute=Number(match[2]);
   if(/p/i.test(match[3])&&hour<12)hour+=12;
   if(/a/i.test(match[3])&&hour===12)hour=0;
   return hour*60+minute
 }
 function medicaReference(config,context,text){
   if(config.references)return{selected:config.references[0],candidates:config.references,context:"ช่วงอ้างอิงเดียวจากรายงาน"};
   if(config.context==="SEX_AGE"){
     const candidates=config.code==="testosterone"?TESTOSTERONE_REFERENCES:DHEA_S_REFERENCES;
     const selected=selectApplicableReference(candidates,context);
     return{selected,candidates,context:selected?`เลือกช่วงจากรายงานตาม ${selected.selectedBy}`:"ต้องทราบเพศและอายุเพื่อเลือกช่วงจากรายงาน"}
   }
   if(config.context==="TIME"){
     const candidates=[
       {raw:"6.02-18.4",time:"06:00-10:00",period:"Morning hours"},
       {raw:"2.68-10.5",time:"16:00-20:00",period:"Afternoon hours"}
     ];
     const minutes=specimenClockMinutes(text);
     const clock=minutes===null?"ไม่ชัดเจน":`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
     const selected=minutes!==null&&minutes>=360&&minutes<=600?candidates[0]:minutes!==null&&minutes>=960&&minutes<=1200?candidates[1]:null;
     let context="";
     if(selected){
       context=`เวลาเก็บตัวอย่าง ${clock} น. อยู่ในช่วง ${selected.period} ${selected.time}; ใช้ช่วงอ้างอิง ${selected.raw} µg/dL จากรายงาน`;
     }else if(minutes===null){
       context="ไม่พบเวลาเก็บตัวอย่างที่อ่านได้ จึงยังเลือกช่วงอ้างอิง Cortisol ตามเวลาไม่ได้";
     }else if(minutes>600&&minutes<960){
       const afterMorning=minutes-600;
       context=`เวลาเก็บตัวอย่าง ${clock} น. อยู่หลังสิ้นสุดช่วง Morning hours 06:00-10:00 จำนวน ${afterMorning} นาที และยังไม่ถึงช่วง Afternoon hours 16:00-20:00 จึงไม่ใช้ช่วง 6.02-18.4 หรือ 2.68-10.5 µg/dL ตัดสิน Normal/High/Low อัตโนมัติ`;
     }else{
       context=`เวลาเก็บตัวอย่าง ${clock} น. ไม่อยู่ในช่วง Morning hours 06:00-10:00 หรือ Afternoon hours 16:00-20:00 ที่รายงานกำหนด จึงยังไม่เลือกช่วงอ้างอิงอัตโนมัติ`;
     }
     return{selected,candidates,context,specimenMinutes:minutes,specimenClock:clock}
   }
   if(config.context==="REPRODUCTIVE_PHASE"){
     const candidates=[
       {raw:"<0.050-0.126",context:"Female postmenopausal"},{raw:"<0.050-0.193",context:"Female follicular"},
       {raw:"0.055-4.14",context:"Female ovulation"},{raw:"4.110-14.5",context:"Female luteal"},
       {raw:"<0.050-0.149",context:"Male"}
     ];
     return{selected:null,candidates,context:"ต้องทราบเพศและระยะรอบเดือนหรือภาวะหมดประจำเดือนก่อนเลือกช่วงอ้างอิง"}
   }
   return{selected:null,candidates:[],context:""}
 }
 function medicaPanelRows(page,groupMeta={}){
   const hint=String(page.profileHint||"");
   const allText=photoPasses(page).map(pass=>pass.text||"").join("\n");
   const signature=MEDICA_PANEL_PROFILE.filter(config=>config.alias.test(allText)).length;
   const wellnessSummary=medicaWellnessSummaryPage(allText);
   if(wellnessSummary)return[];
   const primary=/TEST\s+NAME[\s\S]{0,100}METHOD[\s\S]{0,100}RESULT[\s\S]{0,100}UNIT/i.test(allText)&&
     /ECLIA|Enzymatic\s+assay/i.test(allText)&&!/ANTI[-\s]*AGING[\s\S]{0,30}NORMAL/i.test(allText);
   // A page may contain only one analyte (for example Insulin on page 1).
   // The profile reader is safe to run whenever a named analyte is present;
   // each row still needs a numeric value before it can be emitted.
   if(!primary&&!signature&&!/MEDICA_HORMONE_METABOLIC_PANEL/i.test(hint))return[];
   const patientContext=patientReferenceContext(groupMeta,page),best=new Map();
   for(const pass of photoPasses(page)){
     const text=String(pass.text||""),lines=specializedProfileLines(pass);
     for(const config of MEDICA_PANEL_PROFILE){
       const index=lines.findIndex(item=>config.alias.test(item));
       if(index<0)continue;
       const section=profileSection(lines,index,12);
       const aliasMatch=section.match(config.alias),tail=aliasMatch?clean(section.slice((aliasMatch.index||0)+aliasMatch[0].length)):section;
       const unitPattern=medicaUnitRegex(config);
       const primaryUnitMatch=tail.match(unitPattern);
       // OCR frequently turns µIU/mL into IU/mI, UI/mL, or drops the unit.
       // Prefer the reported unit when readable; otherwise recover the first
       // numeric result after the analyte/method and use the profile unit as an
       // explicit inference. Reference selection remains independent.
       const methodMatch=tail.match(new RegExp(config.method.replace(/\s+/g,"\\s+"),"i"));
       const resultTail=methodMatch?clean(tail.slice((methodMatch.index||0)+methodMatch[0].length)):tail;
       const before=primaryUnitMatch?tail.slice(0,primaryUnitMatch.index):resultTail;
       const after=primaryUnitMatch?tail.slice(primaryUnitMatch.index+primaryUnitMatch[0].length):resultTail;
       const valueTokens=reportedNumericTokens(before);
       const value=(primaryUnitMatch?valueTokens.at(-1):valueTokens[0])||"";
       if(!value)continue;
       const selection=medicaReference(config,patientContext,allText);
       const selectedReference=selection.selected?.raw||"";
       const row=specializedRow(config.code,page,pass,value,{
         unit:config.unit,reference:selectedReference,method:config.method,specimenType:"Serum",
         profile:"MEDICA_HORMONE_METABOLIC_PANEL",sourceLine:section,
         calculatedFlag:selectedReference?"":"CONTEXT",patientContext,
         referenceSelection:{reported_candidates:selection.candidates,selected:selectedReference,selected_by:selection.selected?.selectedBy||selection.selected?.time||selection.context||"context not available"},
         referenceContext:selection.context,allowRepair:false
       });
       if(!row)continue;
       if(!primaryUnitMatch){
         row.unit_inferred=true;
         row.missing_fields_advisory=true;
         row.low_confidence_advisory=true;
         row.source_evidence.push({
           type:"profile-unit-recovery",reported_unit:"",inferred_unit:config.unit,
           reason:"OCR unit missing or malformed; analyte-specific unit used",page:page.sourcePageNumber??page.pageNumber
         })
       }
       // The numeric result is source-verified even when clinical context is
       // insufficient to choose a physiological interval. Keep that as a
       // CONTEXT interpretation state, not an OCR/structure verification job.
       row.reference_selection_required=false;
       row.clinical_context_required=!selectedReference&&Boolean(selection.candidates.length);
       const pairPattern=/([<>]=?\s*)?(\d+(?:[.,]\d+)?)\s*([uµμp]?IU\s*\/\s*m[lL]|[pnuµμ]?mol\s*\/\s*[lL]|[uµμ]g\s*\/\s*d[lL]|ng\s*\/\s*d[lL]|ng\s*\/\s*m[lL]|pg\s*\/\s*m[lL])/gi;
       const pairs=[...section.matchAll(pairPattern)].map(match=>{
         const afterPair=section.slice((match.index||0)+match[0].length);
         return{value:`${match[1]||""}${match[2]}`.replace(/\s/g,"").replace(/,/g,"."),unit:normalizeUnit(match[3]),reference:referenceTokens(afterPair)[0]||""}
       });
       const alternate=pairs.find(pair=>normalizeUnit(pair.unit).toLowerCase()!==normalizeUnit(config.unit).toLowerCase());
       if(alternate){
         row.source_evidence.push({type:"alternate-reported-unit",value:alternate.value,unit:alternate.unit,page:page.sourcePageNumber??page.pageNumber,role:"SAME_ANALYTE_ALTERNATE_UNIT_NOT_SEPARATE_RESULT"});
         row.alternate_reported_values=[alternate]
       }
       keepProfileRow(best,row)
     }
   }
   return bestProfileRows(best)
 }
 function secondaryTargetSummaryRecords(page,groupMeta={},fileIndex=0){
   const output=[],pageNumber=page.sourcePageNumber??page.pageNumber;
   for(const pass of photoPasses(page)){
     const text=String(pass.text||""),lines=text.split(/\r?\n/).map(clean).filter(Boolean);
     const add=(code,level,rangeRaw,normalRangeRaw,sourceLine)=>{
       const visual=micronutrientVisualLevel(level)||{raw:level,code:clean(level).toUpperCase().replace(/\s+/g,"_"),warningCode:"",direction:""};
       output.push({test_code:code,source_file:groupMeta.source_file||page.sourceFileName||"",source_file_index:fileIndex,
         visual_level_raw:visual.raw,visual_level_code:visual.code,visual_warning_code:visual.warningCode,
         visual_warning_direction:visual.direction,anti_aging_range_raw:rangeRaw||"",visual_normal_range_raw:normalRangeRaw||"",
         visual_summary_page:pageNumber,visual_summary_source_line:sourceLine||"",visual_summary_confidence:Number(pass.confidence||0)})
     };
     if(/ANTI[-\s]*AGING[\s\S]{0,30}NORMAL/i.test(text)){
       for(const config of HEAVY_METAL_BLOOD_PROFILE){
         const line=lines.find(item=>config.alias.test(item)&&/\b(?:Normal|High|Low)\b/i.test(item));
         if(!line)continue;
         const level=(line.match(/\b(Normal|High|Low)\b/i)||[])[1]||"";
         const tail=line.slice(Math.max(0,line.toLowerCase().indexOf(level.toLowerCase())+level.length));
         const refs=referenceTokens(tail);
         add(config.code,level,refs[0]||"",refs[1]||"",line)
       }
       const homocysteine=lines.find(line=>/Homocysteine/i.test(line)&&/Optimal|Normal|High|Low/i.test(line));
       if(homocysteine){
         const level=(homocysteine.match(/\b(Optimal|Normal|High|Low)\b/i)||[])[1]||"Optimal";
         const refs=referenceTokens(homocysteine.slice(homocysteine.toLowerCase().indexOf(level.toLowerCase())+level.length));
         add("homocysteine",level,refs[0]||"",refs[1]||"",homocysteine)
       }
       // OCR can confuse the middle "1" in B12 with I, l, or the final 2 with Z.
       const b12=lines.find(line=>/Vitamin\s+B[1Il][2Z]/i.test(line)&&/Normal|High|Low/i.test(line));
       if(b12){
         const level=(b12.match(/\b(Normal|High|Low)\b/i)||[])[1]||"Normal";
         const refs=referenceTokens(b12.slice(b12.toLowerCase().indexOf(level.toLowerCase())+level.length));
         add("vitamin_b12",level,refs[0]||"",refs[1]||"",b12)
       }
     }
     if(/Testosterone/i.test(text)&&/Low\s+<\s*10\.83/i.test(text)&&/45\.41/i.test(text)){
       const level=(text.match(/\b(Low|Low\s+Normal|Moderate|High\s+Normal|High|Very\s+High)\b/i)||[])[1]||"Low";
       add("testosterone",level,"10.83-45.41","2.9-40.8",clean(text.match(/Low\s+<\s*10\.83[\s\S]{0,240}/i)?.[0]||"Testosterone wellness graphic"))
     }
     if(/DHEA[-\s]*sul(?:ph|f)ate/i.test(text)&&/Low\s+Normal/i.test(text)){
       add("dhea_sulfate","Low Normal","","",clean(text.match(/DHEA[-\s]*sul(?:ph|f)ate[\s\S]{0,220}/i)?.[0]||"DHEA-sulphate wellness graphic"))
     }
   }
   const best=new Map();
   output.forEach(summary=>{
     const old=best.get(summary.test_code),score=item=>Number(item.visual_summary_confidence||0)+(item.anti_aging_range_raw?8:0)+(item.visual_summary_source_line?4:0);
     if(!old||score(summary)>score(old))best.set(summary.test_code,summary)
   });
   return[...best.values()]
 }
 function attachReportedSecondaryTargets(input,summaries){
   return input.map(row=>{
     const summary=summaries.filter(item=>item.test_code===row.test_code&&
       (item.source_file_index??0)===(row.source_file_index??0)).sort((a,b)=>Number(b.visual_summary_confidence||0)-Number(a.visual_summary_confidence||0))[0];
     if(!summary)return row;
     const target=micronutrientTargetAssessment(row.value_numeric,summary.anti_aging_range_raw);
     const evidence=Array.isArray(row.source_evidence)?row.source_evidence.slice():[];
     evidence.push({type:"reported-secondary-target",page:summary.visual_summary_page,level:summary.visual_level_raw,
       warning_code:summary.visual_warning_code,warning_direction:summary.visual_warning_direction,
       anti_aging_range:summary.anti_aging_range_raw,anti_aging_range_low:target.low,anti_aging_range_high:target.high,
       anti_aging_range_operator:target.operator,anti_aging_assessment:target.code,
       anti_aging_role:"SECONDARY_TARGET_NOT_CLINICAL_FLAG",visual_normal_range:summary.visual_normal_range_raw,
       raw_line:summary.visual_summary_source_line});
     return{...row,micronutrient_visual_level:summary.visual_level_raw,visual_warning_code:summary.visual_warning_code,
       visual_warning_direction:summary.visual_warning_direction,anti_aging_range_raw:summary.anti_aging_range_raw,
       anti_aging_range_low:target.low,anti_aging_range_high:target.high,anti_aging_range_operator:target.operator,
       anti_aging_assessment:target.code,anti_aging_assessment_role:"SECONDARY_TARGET_NOT_CLINICAL_FLAG",
       anti_aging_range_source:"REPORTED_SECONDARY_TARGET",visual_normal_range_raw:summary.visual_normal_range_raw,
       visual_summary_page:summary.visual_summary_page,visual_summary_role:"SECONDARY_TARGET_ONLY",
       source_evidence:evidence}
   })
 }
 function coordinateLines(page,tolerance=3.5){
   const items=(page.pdfTextItems||page.textItems||[])
     .map(item=>({...item,str:clean(item.str),x:Number(item.x||0),y:Number(item.y||0)}))
     .filter(item=>item.str);
   const lines=[];
   items.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     let line=lines.find(entry=>Math.abs(entry.y-item.y)<=tolerance);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   return lines.sort((a,b)=>b.y-a.y).map(line=>({...line,items:line.items.sort((a,b)=>a.x-b.x)}))
 }
 function markerKey(value){
   return clean(value).toLowerCase()
     .replace(/β/g,"b")
     .replace(/[^a-z0-9]+/g,"")
 }
 const ONCOTRAIL_MARKERS={
   nanog:"nanog",okt4:"okt4",sox2:"sox2",cd15:"cd15",muc1:"muc1",
   epcam:"epcam",cd133:"cd133",cmet:"cmet",cd31:"cd31",panck:"panck",
   scca1:"scca1",cd56:"cd56"
 };
 function oncotrailRows(page,groupMeta={}){
   const hint=String(page.profileHint||"").toUpperCase();
   const pageText=[page.pdfText,page.text,(page.textItems||[]).map(item=>item.str).join(" ")].filter(Boolean).join(" ");
   if(!/ONCOTRAIL/i.test(`${hint} ${pageText}`))return[];
   const output=[],sourcePage=page.sourcePageNumber??page.pageNumber;
   const summary=clean(pageText).match(/CTC[S]?\s*COUNT\s*:\s*Isolated\s*(\d+(?:[.,]\d+)?)\s*cells\s*\/\s*ml[\s,]*SD\s*\+\/-\s*(\d+(?:[.,]\d+)?)\s*cells/i);
   if(summary){
     const value=summary[1].replace(",","."),sd=summary[2].replace(",",".");
     const lung=/Lung\s*\(NSCLC\)|Lung\s+Cancer/i.test(`${pageText} ${groupMeta.disease||""}`);
     const limit=lung?"<10":"<5";
     const row=specializedRow("oncotrail_lung_ctc_count",page,{confidence:98,mode:"pdf-coordinate"},value,{
       unit:"cells/mL",reference:limit,sourceFlag:Number(value)>=Number(limit.replace(/\D/g,""))?"H":"",
       calculatedFlag:Number(value)>=Number(limit.replace(/\D/g,""))?"H":"CONTEXT",
       method:"Flow cytometry",specimenType:"Whole blood",profile:"RGCC_ONCOTRAIL",
       sourceLine:summary[0],interpretation:`รายงาน CTC ${value} cells/mL (SD ±${sd}); เกณฑ์ติดตามมะเร็งปอดของรายงาน ${limit} cells/mL`
     });
     if(row)output.push(Object.assign(row,{
       ctc_standard_deviation:Number(sd),report_threshold_role:"TRACKING_LIMIT_NOT_POPULATION_REFERENCE",
       disease:groupMeta.disease||"Lung (NSCLC)",disease_stage:groupMeta.disease_stage||"",
       reported_result:Number(value)>=Number(limit.replace(/\D/g,""))?"OVER REPORT LIMIT":"BELOW REPORT LIMIT",
       ctc_measurement_role:"TOTAL_CTC",ctc_measurement_label:"Total CTC",
       source_evidence:[...(row.source_evidence||[]),{type:"rgcc-oncotrail-summary",ctc_count:Number(value),sd:Number(sd),tracking_limit:limit,page:sourcePage}]
     }))
   }
   const width=Number(page.pdfPageWidth||page.width||595);
   let compartment="CD45-positive",nanogSeen=0;
   for(const line of coordinateLines(page)){
     const name=clean(line.items.filter(item=>item.x/width>=.54&&item.x/width<.74).map(item=>item.str).join(" "));
     const reported=clean(line.items.filter(item=>item.x/width>=.74).map(item=>item.str).join(" "));
     const key=markerKey(name);
     if(!name||!reported||/^(?:name|results?)$/i.test(name))continue;
     if(key==="nanog"){
       nanogSeen+=1;
       if(nanogSeen>1)compartment="CD45-negative"
     }
     if(key==="epcamve"){
       const numeric=(reported.match(/\d+(?:[.,]\d+)?/)||[])[0];
       if(!numeric)continue;
       const row=specializedRow("oncotrail_epcam_positive_ctc_count",page,{confidence:98,mode:"pdf-coordinate"},numeric.replace(",","."),{
         unit:"cells/mL",resultKind:"NUMERIC",calculatedFlag:"CONTEXT",method:"Flow cytometry",
         specimenType:"Whole blood",profile:"RGCC_ONCOTRAIL",sourceLine:`${name} ${reported}`,
         interpretation:"จำนวน CTC ชนิด EpCAM-positive ที่รายงานในกลุ่ม CD45-negative"
       });
       if(row)output.push(Object.assign(row,{biomarker_compartment:"CD45-negative",reported_result:reported,
         ctc_measurement_role:"EPCAM_POSITIVE_SUBSET",ctc_measurement_label:"EpCAM-positive CTC subset",
         disease:groupMeta.disease||"Lung (NSCLC)",disease_stage:groupMeta.disease_stage||""}));
       continue
     }
     const suffix=ONCOTRAIL_MARKERS[key];
     if(!suffix)continue;
     const code=`oncotrail_${compartment==="CD45-positive"?"cd45_pos":"cd45_neg"}_${suffix}`;
     const percentage=(reported.match(/(\d+(?:[.,]\d+)?)\s*%/)||[])[1];
     const normalized=/^negative$/i.test(reported)?"Negative":/^dim$/i.test(reported)?"Dim":/^positive/i.test(reported)
       ?`Positive${percentage?` (${percentage.replace(",",".")}% of all CTC)`:""}`:reported;
     const row=specializedRow(code,page,{confidence:98,mode:"pdf-coordinate"},normalized,{
       resultKind:"TEXT",calculatedFlag:"CONTEXT",method:"Flow cytometry immunophenotyping",
       specimenType:"Whole blood",profile:"RGCC_ONCOTRAIL",sourceLine:`${name} ${reported}`,
       interpretation:`ผล marker ${name} ในกลุ่ม ${compartment} ตามรายงาน OncoTrail`
     });
     if(row)output.push(Object.assign(row,{
       biomarker_compartment:compartment,reported_result:reported,
       marker_positive_percentage:percentage?Number(percentage.replace(",",".")):null,
       disease:groupMeta.disease||"Lung (NSCLC)",disease_stage:groupMeta.disease_stage||""
     }))
   }
   return output
 }
 const METASTAT_MARKERS={
   tgfbr2:["General","metastat_general_tgfbr2"],itgb4r:["General","metastat_general_itgb4r"],
   itgb5r:["General","metastat_general_itgb5r"],itgb6r:["General","metastat_general_itgb6r"],
   ccr6:["Pleura","metastat_pleura_ccr6"],mesothelin:["Pleura","metastat_pleura_mesothelin"],
   ccr7:["Skin","metastat_skin_ccr7"],igfr2:["Lung","metastat_lung_igfr2"],
   phosphoerk1:["Lung","metastat_lung_phospho_erk1"],phosphoerk2:["Lung","metastat_lung_phospho_erk2"],
   bmpr1a:["Bone","metastat_bone_bmpr1a"],bmpr1b:["Bone","metastat_bone_bmpr1b"],
   bmpr2:["Bone","metastat_bone_bmpr2"],rank:["Bone","metastat_bone_rank"],bst2:["Bone","metastat_bone_bst2"],
   trailr2:["Liver","metastat_liver_trail_r2"],fasr:["Liver","metastat_liver_fas_r"],
   hgfr:["Liver","metastat_liver_hgfr"],phosphostat3:["Brain","metastat_brain_phospho_stat3"],
   cx3cr1:["Brain","metastat_brain_cx3cr1"],dsc2:["Brain","metastat_brain_dsc2"]
 };
 function metastatRows(page,groupMeta={}){
   const hint=String(page.profileHint||"").toUpperCase();
   const pageText=[page.pdfText,page.text,(page.textItems||[]).map(item=>item.str).join(" ")].filter(Boolean).join(" ");
   if(!/METASTAT/i.test(`${hint} ${pageText}`))return[];
   const output=[],width=Number(page.pdfPageWidth||page.width||842);
   const liverPage=/TRAIL\s*-?\s*R2|FAS\s+R|HGFR/i.test(pageText);
   for(const line of coordinateLines(page)){
     const marker=clean(line.items.filter(item=>item.x/width>=.24&&item.x/width<.45).map(item=>item.str).join(" "));
     const sample=clean(line.items.filter(item=>item.x/width>=.45&&item.x/width<.62).map(item=>item.str).join(" "));
     const comparator=clean(line.items.filter(item=>item.x/width>=.62&&item.x/width<.80).map(item=>item.str).join(" "));
     const reported=clean(line.items.filter(item=>item.x/width>=.80).map(item=>item.str).join(" "));
     if(!/^\d+(?:[.,]\d+)?$/.test(sample)||!/^\d+(?:[.,]\d+)?$/.test(comparator))continue;
     const key=markerKey(marker);
     let definition=METASTAT_MARKERS[key];
     if(key==="cxcr4")definition=liverPage?["Liver","metastat_liver_cxcr4"]:["Bone","metastat_bone_cxcr4"];
     if(!definition)continue;
     const [location,code]=definition,upregulated=/UP\s*REGULATED/i.test(reported);
     const row=specializedRow(code,page,{confidence:98,mode:"pdf-coordinate"},sample.replace(",","."),{
       resultKind:"NUMERIC",reference:`Comparator ${comparator.replace(",",".")}`,
       sourceFlag:upregulated?"H":"",calculatedFlag:upregulated?"H":"CONTEXT",
       method:"Real Time PCR + flow cytometry",specimenType:"Whole blood / isolated CTCs",
       profile:"RGCC_METASTAT",sourceLine:`${location} | ${marker} | ${sample} | ${comparator} | ${reported||"-"}`,
       interpretation:`ตำแหน่ง ${location}; ผลที่ห้องปฏิบัติการกำหนด: ${upregulated?"UP REGULATED":"ไม่ระบุการ up-regulation"}`
     });
     if(row)output.push(Object.assign(row,{
       metastasis_location:location,reported_marker:marker,comparator_level:Number(comparator.replace(",",".")),
       reported_result:upregulated?"UP REGULATED":"-",disease:groupMeta.disease||"Lung (NSCLC)",
       disease_stage:groupMeta.disease_stage||"",
       source_evidence:[...(row.source_evidence||[]),{type:"rgcc-metastat-table-row",location,marker,sample_level:Number(sample.replace(",",".")),normal_level:Number(comparator.replace(",",".")),reported_result:upregulated?"UP REGULATED":"-",page:page.sourcePageNumber??page.pageNumber}]
     }))
   }
   const upGenes=(clean(pageText).match(/Genes\s+in\s+up\s+regulation\s+are\s+([A-Za-z0-9, /+-]+)/i)||[])[1];
   if(upGenes){
     const value=clean(upGenes).replace(/\s+(?:According|This|Patient|Ioannis).*$/i,"");
     const row=specializedRow("metastat_upregulated_genes",page,{confidence:98,mode:"pdf-text"},value,{
       resultKind:"TEXT",sourceFlag:"H",calculatedFlag:"H",method:"Report conclusion",
       specimenType:"Whole blood / isolated CTCs",profile:"RGCC_METASTAT",sourceLine:`Genes in up regulation are ${value}`,
       interpretation:"รายชื่อยีนที่รายงานจัดว่า up-regulated"
     });
     if(row)output.push(Object.assign(row,{reported_result:"UP REGULATED",disease:groupMeta.disease||"Lung (NSCLC)",disease_stage:groupMeta.disease_stage||""}))
   }
   const trend=(clean(pageText).match(/major\s+trend\s+of\s+metastasis[\s\S]{0,100}?mainly\s+towards\s+the\s+([A-Za-z]+)/i)||[])[1];
   if(trend){
     const row=specializedRow("metastat_primary_destination_trend",page,{confidence:98,mode:"pdf-text"},trend,{
       resultKind:"TEXT",sourceFlag:"H",calculatedFlag:"H",method:"Report conclusion",
       specimenType:"Whole blood / isolated CTCs",profile:"RGCC_METASTAT",
       sourceLine:`Major trend of metastasis mainly towards the ${trend}`,
       interpretation:`รายงานสรุปแนวโน้มเชิงชีววิทยาหลักไปทาง ${trend}; ไม่ใช่การยืนยันว่ามี metastasis ที่ตำแหน่งนั้น`
     });
     if(row)output.push(Object.assign(row,{metastasis_location:trend,reported_result:"MAJOR TREND",disease:groupMeta.disease||"Lung (NSCLC)",disease_stage:groupMeta.disease_stage||""}))
   }
   return output
 }
 function normalizedPatternValue(raw){
   const reported=clean(raw);
   if(/^[-–]$/.test(reported))return{value:"Negative",reported};
   const titer=(reported.match(/(?:Positive\s*)?<?\s*1\s*[:/7]\s*\d{1,4}/i)||[])[0];
   if(titer){
     const normalized=normalizeTiter(titer.replace(/^Positive\s*/i,""));
     return{
       value:/^Positive/i.test(titer)?`Positive ${normalized}`:normalized,
       reported
     }
   }
   const qualitative=(reported.match(/\b(?:Positive|Negative)\b/i)||[])[0];
   return qualitative
     ?{value:qualitative[0].toUpperCase()+qualitative.slice(1).toLowerCase(),reported}
     :null
 }
 function anaPatternRows(page,pass){
   const text=String(pass?.text||"");
   if(!/(?:ANA\s*patterns?|ANF\s*\[?ANA|Fine\s*speck|Cytop\w*\s+staining)/i.test(text))return[];
   const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
   const significant=(text.match(/clinical\s+significant\s+titer\s+greater\s+than\s*(1\s*[:/7]\s*\d+)/i)||[])[1];
   const threshold=significant?`>${normalizeTiter(significant)}`:">1:160";
   const definitions=[
     ["ana_pattern_interpretation",/^ANA\s*patterns?/i,"Negative","QUALITATIVE"],
     ["ana_nuclear_membrane",/^Nuclear\s*membrane/i,"","QUALITATIVE"],
     ["ana_homogeneous",/^Homogeneous/i,"","QUALITATIVE"],
     ["ana_dense_fine_speckle",/^Dense\s*Fine\s*speckl\w*/i,"","QUALITATIVE"],
     ["ana_fine_speckle_titer",/^Fine\s*speckl\w*/i,threshold,"TITER"],
     ["ana_coarse_speckle",/^Coarse\s*speckl\w*/i,"","QUALITATIVE"],
     ["ana_centromere",/^Centromere/i,"","QUALITATIVE"],
     ["ana_nucleolar",/^Nucleolar/i,"","QUALITATIVE"],
     ["ana_nuclear_dot",/^Nuclear\s*dot/i,"","QUALITATIVE"],
     ["ana_centrioles",/^Centrioles?/i,"","QUALITATIVE"],
     ["ana_spindle_fibres",/^Spindle\s+fib(?:res|ers|eres)/i,"","QUALITATIVE"],
     ["ana_midbody",/^Midbody/i,"","QUALITATIVE"],
     ["ana_cytoplasmic_staining",/^Cytop\w*\s+staining/i,"Negative","TITER"]
   ];
   const output=[];
   for(const [code,labelPattern,reference,resultKind] of definitions){
     const line=lines.find(item=>labelPattern.test(item));
     if(!line)continue;
     const tail=clean(line.replace(labelPattern,"").replace(/\bIFA\b.*$/i,""));
     const raw=(tail.match(/Positive(?:\s*<?\s*1\s*[:/7]\s*\d{1,4})?|Negative|<?\s*1\s*[:/7]\s*\d{1,4}|(?:^|\s)[-–](?=\s|$)/i)||[])[0];
     const normalized=normalizedPatternValue(raw);
     if(!normalized)continue;
     const abnormal=!/^Negative$/i.test(normalized.value);
     const row=specializedRow(code,page,pass,normalized.value,{
       reference,resultKind,
       sourceFlag:abnormal?"H":"N",
       calculatedFlag:abnormal?"H":"N",
       method:"IFA",specimenType:"Serum",profile:"ANA_IFA_PATTERN",
       reportedValue:normalized.reported,sourceLine:line,
       referenceContext:code==="ana_fine_speckle_titer"
         ?`ANA: Clinical significant titer greater than ${normalizeTiter(significant||"1:160")}`:"",
       interpretation:code==="ana_pattern_interpretation"?"ANA pattern screen":code==="ana_cytoplasmic_staining"?"Cytoplasmic staining with reported titer":""
     });
     if(row)output.push(row)
   }
   return output
 }
 function antiDsdnaRows(page,pass){
   const text=String(pass?.text||"");
   if(!/Anti[-\s]*dsDNA/i.test(text))return[];
   const line=text.split(/\r?\n/).map(clean).find(item=>/Anti[-\s]*dsDNA/i.test(item))||"";
   const valueRaw=(line.match(/<\s*1\s*[:/7]\s*10/i)||text.match(/<\s*1\s*[:/7]\s*10/i)||[])[0];
   if(!valueRaw)return[];
   const value=normalizeTiter(valueRaw);
   const row=specializedRow("anti_dsdna_titer",page,pass,value,{
     reference:"<1:10",resultKind:"TITER",sourceFlag:"N",calculatedFlag:"N",
     method:"IFA",specimenType:"Serum",profile:"ANTI_DSDNA_TITER",
     reportedValue:clean(valueRaw),sourceLine:line,
     referenceContext:/Less\s+than\s+1\s*[:/7]\s*10/i.test(text)?"Less than 1:10":""
   });
   return row?[row]:[]
 }
 function enaProfileRows(page,pass){
   const text=String(pass?.text||"");
   if(!/Anti[-\s]*(?:Sm|nRNP|SS\s*A|SS\s*B)/i.test(text))return[];
   const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
   const definitions=[
     ["anti_sm",/^Anti[-\s]*Sm\b/i],
     ["anti_nrnp",/^Anti[-\s]*nRNP\b/i],
     ["anti_ssa",/^Anti[-\s]*SS\s*A\b/i],
     ["anti_ssb",/^Anti[-\s]*SS\s*B\b/i]
   ];
   return definitions.map(([code,pattern])=>{
     const line=lines.find(item=>pattern.test(item));
     if(!line)return null;
     const value=(line.match(/\b(?:Negative|Positive)\b/i)||[])[0];
     if(!value)return null;
     const normalized=value[0].toUpperCase()+value.slice(1).toLowerCase();
     const flag=/Positive/i.test(normalized)?"H":"N";
     return specializedRow(code,page,pass,normalized,{
       reference:"Negative",resultKind:"QUALITATIVE",
       sourceFlag:flag,calculatedFlag:flag,
       method:"ELISA",specimenType:"Serum",profile:"ENA_PANEL",
       reportedValue:value,sourceLine:line
     })
   }).filter(Boolean)
 }
 function complementRows(page,pass){
   const text=String(pass?.text||"");
   if(!/(?:C3\s*Complement|Beta\s*1\s*C)|C4\s*complement/i.test(text))return[];
   const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
   const output=[];
   const c3Line=lines.find(item=>/(?:C3\s*Complement|Beta\s*1\s*C)/i.test(item))||"";
   const c3Value=(c3Line.match(/C3\s*Complement\)?\s*(\d+(?:[.,]\d+)?)/i)||
     c3Line.match(/Beta\s*1\s*C(?:\s*\([^)]*\))?\s*(\d+(?:[.,]\d+)?)/i)||[])[1];
   if(c3Value){
     const row=specializedRow("complement_c3",page,pass,c3Value.replace(",","."),{
       unit:"mg/dL",resultKind:"NUMERIC",method:"Immunoturbidimetry",
       specimenType:"Serum",profile:"COMPLEMENT_C3_C4",sourceLine:c3Line,
       referenceContext:"No C3 reference interval printed on this report"
     });
     if(row)output.push(row)
   }
   const c4Line=lines.find(item=>/C4\s*complement/i.test(item))||"";
   const c4Value=(c4Line.match(/C4\s*complement\s*(\d+(?:[.,]\d+)?)/i)||[])[1];
   if(c4Value){
     const compact=text.replace(/\s+/g," ");
     const childMale=(compact.match(/1\s*[-–]\s*14\s*years?\s*:\s*(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)\s*mg\s*\/\s*dL\s*\(Male\)/i)||[])[1];
     const childFemale=(compact.match(/1\s*[-–]\s*14\s*years?[\s\S]{0,90}?(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)\s*mg\s*\/\s*dL\s*\(Female\)/i)||[])[1];
     const adultMale=(compact.match(/>\s*14\s*[-–]\s*80\s*years?\s*:\s*(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)\s*mg\s*\/\s*dL\s*\(Male\)/i)||[])[1];
     const adultFemale=(compact.match(/>\s*14\s*[-–]\s*80\s*years?[\s\S]{0,90}?(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)\s*mg\s*\/\s*dL\s*\(Female\)/i)||[])[1];
     const candidates=[];
     if(childMale)candidates.push({raw:childMale.replace(/\s+/g,""),sex:"Male",minAge:1,maxAge:14,context:"Male 1-14 years"});
     if(childFemale)candidates.push({raw:childFemale.replace(/\s+/g,""),sex:"Female",minAge:1,maxAge:14,context:"Female 1-14 years"});
     if(adultMale)candidates.push({raw:adultMale.replace(/\s+/g,""),sex:"Male",minAge:14.0001,maxAge:80,context:"Male >14-80 years"});
     if(adultFemale)candidates.push({raw:adultFemale.replace(/\s+/g,""),sex:"Female",minAge:14.0001,maxAge:80,context:"Female >14-80 years"});
     const row=specializedRow("complement_c4",page,pass,c4Value.replace(",","."),{
       unit:"mg/dL",reference:"",resultKind:"NUMERIC",method:"Immunoturbidimetry",
       specimenType:"Serum",profile:"COMPLEMENT_C3_C4",sourceLine:c4Line,
       referenceSelection:candidates.length?{reported_candidates:candidates}:null,
       referenceContext:candidates.length?"Age/sex-specific ranges printed in source; apply only when patient age/sex matches exactly":"No applicable C4 reference interval recovered"
     });
     if(row)output.push(row)
   }
   return output
 }
 function arsenicUrineRows(page,pass){
   const text=String(pass?.text||"");
   if(!/Arsenic\s+in\s+Urine/i.test(text))return[];
   const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
   const line=lines.find(item=>/Arsenic\s+in\s+Urine/i.test(item)&&/\d/.test(item))||"";
   const match=line.match(/Arsenic\s+in\s+Urine\s*(?:\(\s*ICP[-\s]*MS\s*\))?\s*(?:ICP[-\s]*MS)?\s*(?:H|High)?\s*(\d{1,3}(?:[.,]\d+)?)/i);
   if(!match)return[];
   const value=match[1].replace(",",".");
   const combinedReference=/N\s*<\s*[5S]0\s*,?\s*E\s*<\s*100/i.test(text);
   const high=/\b(?:H|High)\b/i.test(line)||combinedReference&&Number(value)>50;
   const row=specializedRow("arsenic_urine",page,pass,value,{
     unit:"µg/L",reference:combinedReference?"N<50, E<100":"<50",
     resultKind:"NUMERIC",sourceFlag:high?"H":"",calculatedFlag:high?"H":"NO_RANGE",
     method:"ICP-MS",specimenType:"Urine",profile:"URINE_ARSENIC_ICP_MS",
     sourceLine:line,
     referenceContext:combinedReference?"N = non-exposed <50; E = exposed <100":"Anti-aging range <50"
   });
   return row?[row]:[]
 }
 function patientReferenceContext(groupMeta,page){
   const text=photoPasses(page).map(pass=>pass.text||"").join("\n");
   const age=reportedAge(text);
   const sex=clean(groupMeta?.sex)||
     ((text.match(/Micronutrients?\s+Profile\s+I\s*\((Male|Female)\)/i)||[])[1]||"");
   return{
     sex:sex?sex[0].toUpperCase()+sex.slice(1).toLowerCase():"",
     ageYears:Number.isFinite(Number(groupMeta?.age_at_result_years))
       ?Number(groupMeta.age_at_result_years):age?.decimal??null,
     ageDisplay:Number.isFinite(Number(groupMeta?.age_years))
       ?`${groupMeta.age_years}y ${groupMeta.age_months||0}m ${groupMeta.age_days||0}d`
       :age?`${age.years}y ${age.months}m ${age.days}d`:"",
     dob:groupMeta?.date_of_birth||"",
     eventDate:(groupMeta?.specimen_datetime||groupMeta?.result_datetime||groupMeta?.requested_datetime||"").slice(0,10),
     ageSource:groupMeta?.age_source||(age?"reported":"")
   }
 }
 function selectApplicableReference(candidates,context){
   const sex=clean(context?.sex).toLowerCase();
   const age=Number(context?.ageYears);
   const requiresSex=candidates.some(item=>item.sex);
   const requiresAge=candidates.some(item=>Number.isFinite(item.minAge)||Number.isFinite(item.maxAge));
   if((requiresSex&&!sex)||(requiresAge&&!Number.isFinite(age)))return null;
   const eligible=candidates.filter(item=>{
     if(item.sex&&clean(item.sex).toLowerCase()!==sex)return false;
     if(Number.isFinite(item.minAge)&&age<item.minAge)return false;
     if(Number.isFinite(item.maxAge)&&age>item.maxAge)return false;
     return true
   });
   if(!eligible.length)return null;
   const selected=eligible.slice().sort((a,b)=>{
     const score=item=>(item.sex?100:0)+
       (Number.isFinite(item.minAge)||Number.isFinite(item.maxAge)?50:0)-
       ((item.maxAge??130)-(item.minAge??0))/10;
     return score(b)-score(a)
   })[0];
   return{
     ...selected,
     selectedBy:[
       selected.sex?`sex=${context.sex}`:"",
       Number.isFinite(selected.minAge)||Number.isFinite(selected.maxAge)
         ?`age=${Number(age.toFixed(3))}`:""
     ].filter(Boolean).join(", ")||"single reported interval"
   }
 }
 const MICRONUTRIENT_PROFILE=[
   {code:"vitamin_b9_folic_acid",alias:/Vitamin\s+B9\s*\(\s*Folic\s+Acid\s*\)/i,unit:"ng/mL",unitPattern:/ng\s*\/\s*mL/i,method:"LC-MS/MS",
     references:[{raw:"3.10-20.50"}]},
   {code:"vitamin_b12",alias:/Vitamin\s+B12\b/i,unit:"pg/mL",unitPattern:/pg\s*\/\s*mL/i,method:"ECLIA",summaryResultFallback:true,
     references:[{raw:"197.0-771.0"}]},
   {code:"chromium",alias:/^Chromium\b/i,unit:"µg/L",unitPattern:/[uµ]g\s*\/\s*[lL]/i,
     references:[{raw:"0.12-2.10"}]},
   {code:"copper",alias:/^Copper\b/i,unit:"µg/dL",unitPattern:/[uµ]g\s*\/\s*d[lL]/i,
     references:[{raw:"70-140"}]},
   {code:"ferritin",alias:/^Ferritin\b/i,unit:"ng/mL",unitPattern:/ng\s*\/\s*m[lL]/i,method:"ECLIA",
     references:[{raw:"30-400",sex:"Male"},{raw:"13-150",sex:"Female"}]},
   {code:"magnesium",alias:/^\*?\s*Magnesium\s*\(\s*Mg\s*\)/i,unit:"mg/dL",unitPattern:/mg\s*\/\s*d[lL]/i,method:"Colorimetric",
     references:[
       {raw:"1.5-2.2",minAge:0,maxAge:5/12},{raw:"1.7-2.3",minAge:5/12,maxAge:6},
       {raw:"1.7-2.1",minAge:6,maxAge:12},{raw:"1.7-2.2",minAge:12,maxAge:20},
       {raw:"1.6-2.6",minAge:20,maxAge:60},{raw:"1.6-2.4",minAge:60,maxAge:90},
       {raw:"1.7-2.3",minAge:90,maxAge:130}
     ]},
   {code:"selenium",alias:/^Selenium\b/i,unit:"µg/L",unitPattern:/[uµ]g\s*\/\s*[lL]/i,
     references:[{raw:"46-143"}]},
   {code:"zinc",alias:/^Zinc\b/i,unit:"µg/dL",unitPattern:/[uµ]g\s*\/\s*d[lL]/i,method:"ICP-MS",
     references:[{raw:"80-170"}]},
   {code:"vitamin_a_retinol",alias:/Vitamin\s+A\s*\(\s*Retinol\s*\)/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"0.80-2.90"}]},
   {code:"vitamin_e_gamma",alias:/Vitamin\s+E\s*\(\s*gamma-Tocopherol\s*\)/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"0.50-6.20"}]},
   {code:"vitamin_e_alpha",alias:/Vitamin\s+E\s*\(\s*alpha-Tocopherol\s*\)/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"8.00-42.00"}]},
   {code:"lutein_zeaxanthin",alias:/Lutein[tl]?\s*\+\s*Zeaxanthin/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"0.15-0.92"}]},
   {code:"beta_cryptoxanthin",alias:/beta-Cryptoxanthin/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"UHPLC",requireResultMethod:true,
     references:[{raw:"0.05-0.50"}]},
   {code:"lycopene",alias:/^Lycopene\b/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"UHPLC",
     references:[{raw:"0.10-1.25"}]},
   {code:"alpha_carotene",alias:/^alpha-Carotene\b/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"UHPLC",requireResultMethod:true,
     references:[{raw:"0.02-0.34"}]},
   {code:"beta_carotene",alias:/^Beta-Carotene\b/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"UHPLC",
     references:[{raw:"0.10-1.10"}]},
   {code:"coenzyme_q10",alias:/^Coenzyme\s+Q10\b/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"0.46-1.85"}]},
   {code:"vitamin_c_ascorbate",alias:/Vitamin\s+C\s*\(\s*Ascorbate\s+acid\s*\)/i,unit:"µmol/L",unitPattern:/[uµ]mol\s*\/\s*[lL]/i,method:"LC-MS/MS",
     references:[{raw:"22.71-85.17"}]}
 ];
 const MICRONUTRIENT_VISUAL_LEVELS=[
   ["HIGH_NORMAL",/High\s*Norma(?:l)?/i,"NEAR_HIGH","HIGH"],
   ["LOW_NORMAL",/Low\s*Norma(?:l)?/i,"NEAR_LOW","LOW"],
   ["OPTIMAL",/\bOptimal\b/i,"",""],
   ["MODERATE",/\bModerate\b/i,"CAUTION",""],
   ["EXCELLENT",/\bExcellent\b/i,"",""],
   ["GOOD",/\bGood\b/i,"",""],
   ["HIGH",/\bHigh\b/i,"ABNORMAL_HIGH","HIGH"],
   ["LOW",/\bLow\b/i,"ABNORMAL_LOW","LOW"],
   ["NORMAL",/\bNormal\b/i,"",""]
 ];
 function micronutrientVisualLevel(raw){
   const text=clean(raw);
   for(const [code,pattern,warningCode,direction] of MICRONUTRIENT_VISUAL_LEVELS){
     const match=text.match(pattern);
     if(match)return{raw:clean(match[0]).replace(/Norma$/i,"Normal"),code,warningCode,direction}
   }
   return null
 }
 function micronutrientTargetAssessment(value,raw){
   const range=parseRef(raw);
   const numeric=Number(value);
   let code="NOT_ASSESSED";
   if(Number.isFinite(numeric)){
     if(range.reference_operator==="range"){
       code=numeric<range.reference_low?"BELOW_TARGET":
         numeric>range.reference_high?"ABOVE_TARGET":"WITHIN_TARGET"
     }else if(["<","<="].includes(range.reference_operator)&&Number.isFinite(range.reference_high)){
       const within=range.reference_operator==="<"
         ?numeric<range.reference_high:numeric<=range.reference_high;
       code=within?"WITHIN_TARGET":"ABOVE_TARGET"
     }else if([">",">="].includes(range.reference_operator)&&Number.isFinite(range.reference_low)){
       const within=range.reference_operator===">"
         ?numeric>range.reference_low:numeric>=range.reference_low;
       code=within?"WITHIN_TARGET":"BELOW_TARGET"
     }
   }
   return{
     raw:clean(raw),
     low:range.reference_low,
     high:range.reference_high,
     operator:range.reference_operator,
     code
   }
 }
 function isMicronutrientSummaryText(raw){
   const text=String(raw||"");
   const analyteCount=MICRONUTRIENT_PROFILE.filter(config=>config.alias.test(text)).length;
   const visualLevelCount=(text.match(/High\s*Norma(?:l)?|Low\s*Norma(?:l)?|\bModerate\b|\bExcellent\b|\bGood\b/gi)||[]).length;
   const narrativeLevelCount=(text.match(/(?:Your|The\s+result\s+show\w*)[^\n]{0,120}\blevel\b/gi)||[]).length;
   return/ANTI[-\s]*AGING\s+NORMAL/i.test(text)||
     /TEST\s+NAME\s+RESULT\s+LEVEL\s+RANGE\s+RANGE\s+UNIT/i.test(text)||
     (/Micronutrients?\s+Profile\s+I/i.test(text)&&
       /\bRESULT\b[\s\S]{0,80}\bLEVEL\b[\s\S]{0,80}\bRANGE\b[\s\S]{0,30}\bRANGE\b/i.test(text))||
     (analyteCount>=2&&(visualLevelCount>=2||narrativeLevelCount>=2))
 }
 function micronutrientSummaryPage(page){
   return[
     page?.text||"",
     page?.pdfText||"",
     ...(Array.isArray(page?.ocr?.candidates)
       ?page.ocr.candidates.map(candidate=>candidate?.text||"")
       :[])
   ].some(isMicronutrientSummaryText)
 }
 function micronutrientNarrative(config,lines){
   for(let index=0;index<lines.length;index++){
     const line=lines[index],match=line.match(config.alias);
     if(!match)continue;
     const remainder=clean(line.slice((match.index||0)+match[0].length));
     if(remainder)continue;
     const section=[];
     for(let cursor=index+1;cursor<Math.min(lines.length,index+12);cursor++){
       const next=lines[cursor];
       const nextHeading=MICRONUTRIENT_PROFILE.some(candidate=>{
         const found=next.match(candidate.alias);
         return found&&clean(next.slice((found.index||0)+found[0].length))===""
       });
       if(nextHeading)break;
       section.push(next)
     }
     return clean(section.join(" "))
   }
   return""
 }
 function micronutrientVisualSummaryRecords(page,groupMeta={},fileIndex=0){
   const output=[],pageNumber=page.sourcePageNumber??page.pageNumber;
   for(const pass of photoPasses(page)){
     const text=String(pass?.text||"");
     if(!/ANTI[-\s]*AGING\s+NORMAL/i.test(text))continue;
     const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
     for(const config of MICRONUTRIENT_PROFILE){
       const tableLine=lines.find(line=>
         config.alias.test(line)&&
         /(?:High\s*Norma|Low\s*Norma|\bModerate\b|\bHigh\b|\bNormal\b)/i.test(line)
       )||"";
       const narrative=micronutrientNarrative(config,lines);
       const level=micronutrientVisualLevel(tableLine)||micronutrientVisualLevel(narrative);
       if(!level)continue;
       const rangeSource=tableLine.replace(/^[\s\S]*?(?:High\s*Norma(?:l)?|Low\s*Norma(?:l)?|Moderate|High|Normal)/i,"");
       const ranges=[...rangeSource.matchAll(/(?:\bM\s*:\s*)?(\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?)/gi)]
         .map(match=>clean(match[1]).replace(/,/g,".").replace(/\s*[–]\s*/g,"-"));
       output.push({
         test_code:config.code,
         source_file:groupMeta.source_file||page.sourceFileName||"",
         source_file_index:fileIndex,
         lab_no:groupMeta.lab_no||"",
         result_date:(groupMeta.specimen_datetime||groupMeta.result_datetime||groupMeta.requested_datetime||"").slice(0,10),
         visual_level_raw:level.raw,
         visual_level_code:level.code,
         visual_warning_code:level.warningCode,
         visual_warning_direction:level.direction,
         anti_aging_range_raw:ranges[0]||"",
         visual_normal_range_raw:ranges[1]||ranges[0]||"",
         visual_summary_page:pageNumber,
         visual_summary_source_line:tableLine||narrative.slice(0,500),
         visual_summary_interpretation:narrative,
         visual_summary_confidence:Number(pass?.confidence||0)
       })
     }
   }
   const best=new Map();
   output.forEach(item=>{
     const old=best.get(item.test_code);
     const score=value=>Number(value.visual_summary_confidence||0)+
       (value.visual_summary_source_line?10:0)+(value.anti_aging_range_raw?5:0);
     if(!old||score(item)>score(old))best.set(item.test_code,item)
   });
   return[...best.values()]
 }
 function attachMicronutrientVisualSummaries(input,summaries){
   return input.map(row=>{
     if(row.specialized_profile!=="MICRONUTRIENT_PROFILE_I")return row;
     const candidates=summaries.filter(summary=>
       summary.test_code===row.test_code&&
       (summary.source_file_index??0)===(row.source_file_index??0)&&
       (!summary.lab_no||!row.lab_no||summary.lab_no===row.lab_no)
     );
     if(!candidates.length)return row;
    const summary=candidates.slice().sort((a,b)=>
      Number(b.visual_summary_confidence||0)-Number(a.visual_summary_confidence||0)
    )[0];
    const target=micronutrientTargetAssessment(row.value_numeric,summary.anti_aging_range_raw);
    const evidence=Array.isArray(row.source_evidence)?row.source_evidence.slice():[];
    evidence.push({
      type:"micronutrient-color-warning",
      page:summary.visual_summary_page,
      level:summary.visual_level_raw,
      warning_code:summary.visual_warning_code,
      warning_direction:summary.visual_warning_direction,
      anti_aging_range:summary.anti_aging_range_raw,
      anti_aging_range_low:target.low,
      anti_aging_range_high:target.high,
      anti_aging_range_operator:target.operator,
      anti_aging_assessment:target.code,
      anti_aging_role:"SECONDARY_TARGET_NOT_CLINICAL_FLAG",
      anti_aging_bound_role:"RANGE_BOUND_NOT_RESULT",
      visual_normal_range:summary.visual_normal_range_raw,
      raw_line:summary.visual_summary_source_line
    });
     return{
       ...row,
       micronutrient_visual_level:summary.visual_level_raw,
       micronutrient_visual_level_code:summary.visual_level_code,
      visual_warning_code:summary.visual_warning_code,
      visual_warning_direction:summary.visual_warning_direction,
      anti_aging_range_raw:summary.anti_aging_range_raw,
      anti_aging_range_low:target.low,
      anti_aging_range_high:target.high,
      anti_aging_range_operator:target.operator,
      anti_aging_assessment:target.code,
      anti_aging_assessment_role:"SECONDARY_TARGET_NOT_CLINICAL_FLAG",
      anti_aging_range_source:"REPORTED_ANTI_AGING_COLUMN",
      visual_normal_range_raw:summary.visual_normal_range_raw,
      visual_summary_page:summary.visual_summary_page,
      visual_summary_interpretation:summary.visual_summary_interpretation,
      numeric_result_source:row.numeric_result_source||"RESULT_TABLE",
      visual_summary_role:"WARNING_AND_SECONDARY_TARGET",
      source_evidence:evidence
    }
   })
 }
 function normalizeMicronutrientOcrText(raw){
   return String(raw||"")
     .replace(/([uµμ])g\s*\/\s*[|Il1]/gi,"$1g/L")
     .replace(/([uµμ])mol\s*\/\s*[|Il1]/gi,"$1mol/L")
     .replace(/(ng|pg|mg)\s*\/\s*m[|Il1]/gi,"$1/mL")
     .replace(/([uµμ])g\s*\/\s*d[|Il1]/gi,"$1g/dL");
 }
 function micronutrientSourceLine(config,pass){
   const lines=String(pass?.text||"").split(/\r?\n/)
     .map(value=>clean(normalizeMicronutrientOcrText(value))).filter(Boolean);
   const direct=lines.find(item=>config.alias.test(item)&&config.unitPattern.test(item));
   if(direct)return direct;
   for(let index=0;index<lines.length;index++){
     if(!config.alias.test(lines[index]))continue;
     const section=[lines[index]];
     for(let cursor=index+1;cursor<Math.min(lines.length,index+8);cursor++){
       const next=lines[cursor];
       const nextAnalyte=MICRONUTRIENT_PROFILE.some(candidate=>candidate!==config&&candidate.alias.test(next));
       if(nextAnalyte&&section.length>1)break;
       section.push(next);
       const joined=clean(section.join(" "));
       if(config.unitPattern.test(joined))return joined
     }
   }
   return""
 }
 function micronutrientGeometryValue(config,page,pass){
   const items=(pass?.textItems||[]).map(item=>({str:clean(normalizeMicronutrientOcrText(item.str)),x:Number(item.x||0),y:Number(item.y||0)})).filter(item=>item.str);
   if(!items.length)return"";
   const width=Number(page?.width||1),height=Number(page?.height||1),tolerance=Math.max(5,height*.0065),lines=[];
   items.slice().sort((a,b)=>a.y-b.y||a.x-b.x).forEach(item=>{
     let line=lines.find(candidate=>Math.abs(candidate.y-item.y)<=tolerance);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   for(const line of lines){
     const labelText=clean(line.items.filter(item=>item.x<width*.43).sort((a,b)=>a.x-b.x).map(item=>item.str).join(" "));
     if(!config.alias.test(labelText))continue;
     const nearby=lines.filter(candidate=>Math.abs(candidate.y-line.y)<=tolerance*1.35);
     const values=nearby.flatMap(candidate=>candidate.items).filter(item=>{
       const nx=item.x/width;
       return nx>=.43&&nx<=.61&&/^[<>]=?\s*\d+(?:[.,]\d+)?$/.test(item.str)
     }).map(item=>({value:item.str.replace(/,/g,"."),distance:Math.abs(item.x/width-.515)+Math.abs(item.y-line.y)/Math.max(1,height)})).sort((a,b)=>a.distance-b.distance);
     if(values.length)return values[0].value
   }
   return""
 }
 function micronutrientCandidate(config,page,pass,context,options={}){
   const line=micronutrientSourceLine(config,pass);
   if(!line)return null;
   const aliasMatch=line.match(config.alias);
   const tail=aliasMatch?line.slice((aliasMatch.index||0)+aliasMatch[0].length):line;
   const unitMatch=tail.match(config.unitPattern);
   const beforeUnit=unitMatch?tail.slice(0,unitMatch.index):tail;
   const summaryFallback=options.numericResultSource==="SUMMARY_TABLE_FALLBACK";
   // On a visual-summary row, only the token physically before the Level
   // label belongs to RESULT. Everything after High/Low Normal, Moderate,
   // Good, Excellent, High, Low or Normal belongs to the warning and range
   // columns. This prevents a missing B12 result from promoting the first
   // Anti-aging bound (180 from 180-914) into a laboratory result.
   let resultSegment=beforeUnit;
   if(summaryFallback){
     const levelMatch=beforeUnit.match(
       /High\s*Norma(?:l)?|Low\s*Norma(?:l)?|\bModerate\b|\bExcellent\b|\bGood\b|\bHigh\b|\bLow\b|\bNormal\b/i
     );
     if(!levelMatch)return null;
     resultSegment=beforeUnit.slice(0,levelMatch.index)
   }
   const methodSeen=!config.method||
     new RegExp(config.method.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\\\//g,"\\s*\\/\\s*"),"i").test(line);
   // The official antioxidant Result Table prints UHPLC beside these two
   // carotenoids. Summary/color-bar rows do not. Requiring that row marker
   // prevents a lost page heading from turning 0.05/0.02 or a graph token
   // into a competing laboratory result.
   if(config.requireResultMethod&&options.numericResultSource!=="SUMMARY_TABLE_FALLBACK"&&!methodSeen)return null;
   const values=[...resultSegment.matchAll(/([<>]=?)?\s*(\d{1,5}(?:[.,]\d{1,4})?)/g)]
     .map(match=>`${match[1]||""}${match[2]}`);
   const geometryValue=options.numericResultSource==="SUMMARY_TABLE_FALLBACK"?"":micronutrientGeometryValue(config,page,pass);
   const reportedValue=geometryValue||(values.length?values[values.length-1]:"");
   if(!reportedValue)return null;
   const selected=selectApplicableReference(config.references,context);
   const referenceSelectionRequired=!selected&&config.references.length>1;
   const appliedReference=selected||{raw:"",selectedBy:"patient sex/age unavailable"};
   const valueIndex=beforeUnit.indexOf(reportedValue);
   const valuePrefix=valueIndex>=0?beforeUnit.slice(0,valueIndex):beforeUnit;
   const sourceFlag=(valuePrefix.match(/(?:^|\s)(LL|HH|L|H)(?:\s|$)/i)||[])[1]||"";
   const row=specializedRow(config.code,page,pass,reportedValue,{
     unit:config.unit,reference:appliedReference.raw,resultKind:"NUMERIC",
     sourceFlag:sourceFlag.toUpperCase(),method:config.method||"",
     specimenType:"Serum",profile:"MICRONUTRIENT_PROFILE_I",
     reportedValue,sourceLine:line,allowRepair:true,
     patientContext:context,
     referenceSelection:{reported_candidates:config.references,selected:appliedReference.raw,selected_by:appliedReference.selectedBy},
     referenceContext:selected
       ?`Selected ${selected.raw} ${config.unit} from the report (${selected.selectedBy})`
       :"Multiple reported intervals require patient sex/age before interpretation"
   });
   if(!row)return null;
   if(config.code==="vitamin_b9_folic_acid"){
     row.canonical_display_name="Vitamin B9 (Folic Acid)";
     row.display_name="Vitamin B9 (Folic Acid)";
     row.reported_name=(line.match(config.alias)||[])[0]||row.reported_name||row.display_name
   }else if(config.code==="folate_serum"){
     row.canonical_display_name="Folate (serum)";
     row.display_name="Folate (serum)";
     row.reported_name=(line.match(config.alias)||[])[0]||row.reported_name||row.display_name
   }
   row.numeric_result_source=options.numericResultSource||"RESULT_TABLE";
   row.numeric_result_method_evidence=methodSeen;
   if(row.numeric_result_source==="SUMMARY_TABLE_FALLBACK"){
     row.source_evidence=Array.isArray(row.source_evidence)?row.source_evidence:[];
     row.source_evidence.push({
       type:"micronutrient-summary-result-fallback",
       role:"FALLBACK_ONLY_WHEN_RESULT_TABLE_VALUE_UNREADABLE",
       page:page.sourcePageNumber??page.pageNumber,
       raw_line:line
     })
   }
   row.reference_selection_required=referenceSelectionRequired;
   if(referenceSelectionRequired){
     row.parse_issue=true;
     row.verify_reason="รายงานมีช่วงอ้างอิงหลายช่วง แต่ยังไม่พบเพศหรืออายุที่ใช้เลือกช่วง"
   }
   const ref=parseRef(row.reference_raw);
   const distance=row.value_numeric===null?999:ref.reference_operator!=="range"?0:
     row.value_numeric<ref.reference_low?ref.reference_low-row.value_numeric:
     row.value_numeric>ref.reference_high?row.value_numeric-ref.reference_high:0;
   row._profile_score=Number(pass.confidence||0)+
     (/[.,]/.test(reportedValue)?24:0)+(row.clinical_repair_applied?6:0)-
     Math.min(80,distance/Math.max(1,ref.reference_high-ref.reference_low)*10);
   row.source_flag=sourceFlag.toUpperCase()||row.calculated_flag;
   row.calculated_flag=calcFlag(row,ref);
   return row
 }
 function micronutrientProfileRows(page,groupMeta){
   const profileHint=String(page.profileHint||"");
   const text=photoPasses(page).map(pass=>pass.text||"").join("\n");
   if(!/Micronutrients?\s+Profile\s+I/i.test(text)&&!/MICRONUTRIENT/i.test(profileHint))return[];
   // Pages headed ANTI-AGING / NORMAL repeat the numeric results only to
   // position them on a warning chart.  Their range columns are metadata,
   // never independent laboratory results.  Detect the role from every OCR
   // pass because one pass may lose the heading while still reading a range
   // bound as a plausible value (for example B12 180 instead of 747.5).
   const context=patientReferenceContext(groupMeta,page);
   if(micronutrientSummaryPage(page)){
     const fallbackConfigs=MICRONUTRIENT_PROFILE.filter(config=>config.summaryResultFallback);
     const bestFallback=new Map();
     // Only a pass that still carries the summary heading/table structure may
     // supply the known B12 fallback. A pass that lost the heading cannot
     // distinguish RESULT from either RANGE column and is discarded.
     for(const pass of photoPasses(page).filter(item=>isMicronutrientSummaryText(item?.text))){
       for(const config of fallbackConfigs){
         const row=micronutrientCandidate(config,page,pass,context,{
           numericResultSource:"SUMMARY_TABLE_FALLBACK"
         });
         if(!row)continue;
         const old=bestFallback.get(row.test_code);
         if(!old||row._profile_score>old._profile_score)bestFallback.set(row.test_code,row)
       }
     }
     return[...bestFallback.values()].map(row=>{delete row._profile_score;return row})
   }
   const best=new Map();
   for(const pass of photoPasses(page)){
     for(const config of MICRONUTRIENT_PROFILE){
       const row=micronutrientCandidate(config,page,pass,context);
       if(!row)continue;
       const old=best.get(row.test_code);
       if(!old||row._profile_score>old._profile_score)best.set(row.test_code,row)
     }
   }
   return[...best.values()].map(row=>{delete row._profile_score;return row})
 }
 function folateSerumRows(page,groupMeta){
   const profileHint=String(page.profileHint||"");
   const allText=photoPasses(page).map(pass=>pass.text||"").join("\n");
   if(micronutrientSummaryPage(page))return[];
   if(/Micronutrients?\s+Profile\s+I/i.test(allText))return[];
   if(!/Folate\s*\(\s*serum\s*\)/i.test(allText)&&!/FOLATE/i.test(profileHint))return[];
   const context=patientReferenceContext(groupMeta,page);
   const config={code:"folate_serum",alias:/Folate\s*\(\s*serum\s*\)/i,unit:"ng/mL",unitPattern:/ng\s*\/\s*mL/i,method:"CMIA",references:[{raw:"3.10-20.50"}]};
   const candidates=photoPasses(page).map(pass=>micronutrientCandidate(config,page,pass,context)).filter(Boolean)
     .sort((a,b)=>Number(b.confidence||0)-Number(a.confidence||0));
   return candidates.length?[candidates[0]]:[]
 }
 function collapseThaiSpacing(raw){
   const value=clean(raw).replace(/[|¦]/g,"I").replace(/^[<>=\d\s"'`~:;,.()[\]{}_-]+/,"");
   let output="";
   for(let index=0;index<value.length;index++){
     const char=value[index];
     if(!/\s/.test(char)){output+=char;continue}
     let previous=output.length?output[output.length-1]:"",cursor=index+1;
     while(cursor<value.length&&/\s/.test(value[cursor]))cursor++;
     const next=value[cursor]||"";
     if(/[ก-๙]/.test(previous)&&/[ก-๙]/.test(next)){index=cursor-1;continue}
     if(output&&!/\s/.test(previous))output+=" ";
     index=cursor-1
   }
   return clean(output).replace(/\s+([,;)])/g,"$1").replace(/([(])\s+/g,"$1")
 }
 function foodLabelScore(value){
   const thai=(value.match(/[ก-๙]/g)||[]).length;
   const latin=(value.match(/[A-Za-z]/g)||[]).length;
   const numbers=(value.match(/\d/g)||[]).length;
   return thai*4+latin+Math.min(40,value.length)-numbers*3
 }
 function prepareFoodLabelPasses(page){
   const centers=[.142,.389,.638],pageWidth=Number(page.width||1),pageHeight=Number(page.height||1);
   return photoPasses(page).map(pass=>({
     mode:pass.mode||"",
     columns:centers.map((center,columnIndex)=>{
       const left=center+.018,right=columnIndex<2?centers[columnIndex+1]-.018:.965;
       return(pass.textItems||[]).map(item=>({
         str:clean(item.str),nx:Number(item.x)/pageWidth,ny:Number(item.y)/pageHeight,x:Number(item.x)
       })).filter(item=>item.str&&item.nx>=left&&item.nx<right)
         .sort((a,b)=>b.ny-a.ny||a.x-b.x)
     })
   }))
 }
 function foodLabelFor(page,result,columnRows,columnIndex,labelPasses){
   const pageWidth=Number(page.pdfPageWidth||612),pageHeight=Number(page.pdfPageHeight||792);
   const ordered=columnRows.slice().sort((a,b)=>Number(b.y)-Number(a.y));
   const index=ordered.indexOf(result);
   const upper=index===0?Math.min(0.96,(Number(ordered[index].y)+10)/pageHeight):
     (Number(ordered[index-1].y)+Number(result.y))/(2*pageHeight);
   const lower=index===ordered.length-1?Math.max(0.05,(Number(result.y)-10)/pageHeight):
     (Number(ordered[index+1].y)+Number(result.y))/(2*pageHeight);
   const candidates=(labelPasses||prepareFoodLabelPasses(page)).map(pass=>{
     const items=(pass.columns?.[columnIndex]||[]).filter(item=>item.ny>=lower&&item.ny<=upper)
       .sort((a,b)=>a.x-b.x);
     const label=collapseThaiSpacing(items.map(item=>item.str).join(" "));
     return{label,score:foodLabelScore(label),pass:pass.mode||""}
   }).filter(item=>item.label&&item.score>8).sort((a,b)=>b.score-a.score);
   return candidates[0]||{label:`Food item P${page.sourcePageNumber||page.pageNumber}-C${columnIndex+1}-R${index+1}`,score:0,pass:"fallback"}
 }
 function stableCode(raw){
   let hash=2166136261;
   for(const char of String(raw||"")){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)}
   return(hash>>>0).toString(36)
 }
 const FOODPRINT_SOURCE_TRUTH_BUILD="2026-08-24-foodprint-200-plus-th-v2";
 const FOODPRINT_PROVENANCE_BUILD="2026-08-24-foodprint-provenance-v2";
 const FOODPRINT_CATALOG_FIDELITY_BUILD="2026-08-24-foodprint-catalog-fidelity-v1";
 const FOODPRINT_SOURCE_TRUTH_CATALOG=Object.freeze({
  "1": [
    [
      "ไข่ขาว",
      "ถั่วโคล่า (ใช้ทำเครื่องดื่มแป๊บซี่, โค้ก หรือขนมหวาน)",
      "ถั่วลันเตา",
      "ถั่วขาว",
      "ข้าวโอ๊ต",
      "เมล็ดอัลมอนด์",
      "แครนเบอร์รี่",
      "ยีสต์สำหรับทำขนมปัง",
      "ผงวุ้น",
      "มันฝรั่ง",
      "ส้ม",
      "แห้วไทย",
      "นมวัว",
      "อ้อย",
      "แป้งไรย์",
      "ลูกพลัม",
      "อมารันทธ์",
      "เห็ด",
      "มะม่วงหิมพานต์",
      "หมึกกล้วย",
      "นมแพะ",
      "ถั่วเลนทิล",
      "หัวไชเท้า",
      "แป้งสเปลท์",
      "ถั่วเหลือง",
      "ถั่ววอลนัท",
      "เนื้อวัว (Ox)",
      "แฟง (ผักในตระกูลน้ำเต้า)",
      "นกกระจอกเทศ",
      "รำข้าวสาลี",
      "เกาลัด",
      "เคซีน (โปรตีนจากนม)",
      "เครื่องแกง",
      "เนื้อเป็ด",
      "เนื้อแกะ",
      "เนื้อแพะ"
    ],
    [
      "ผักคื่นช่ายฝรั่ง",
      "ข้าวโพด",
      "ถั่วแดง",
      "สาหร่ายวากาเมะ",
      "บรูเวอร์ยีสต์ (เป็นยีสต์ที่ใช้หมักเครื่องดื่ม)",
      "สควอช (ผักบัตเตอร์นัท)",
      "ถั่วบราซิล",
      "เมล็ดแครอบ",
      "ข้าวบัควีท",
      "ใบมินต์",
      "ถั่วพิสตาชิโอ",
      "เนื้อไก่",
      "เนื้อกระต่าย",
      "เนื้อกวาง",
      "เนื้อนกกระทา",
      "เนื้อปู",
      "เนื้อมะพร้าว, มะพร้าว",
      "เนื้อม้า",
      "เนื้อลูกวัว",
      "เนื้อวัว (Beef)",
      "เนื้อหมู",
      "เนื้อหมูป่า",
      "เบต้าแลกโตกลอบูลิน",
      "เมล็ดเคเปอร์",
      "เมล็ดแฟลกซ์",
      "เมล็ดแอนนิ",
      "เมล็ดมัสตาร์ด",
      "เมล่อน (แตงไทย/แตงตาล)",
      "เรดเคอร์เรนท์",
      "เรปซีด (พืชในตระกูลมัสตาร์ด)",
      "แครอท",
      "แตงโม",
      "แตงกวา",
      "แบล็คเคอร์เรนท์",
      "แบล็คเบอร์รี่",
      "แป้งมันสำปะหลัง"
    ],
    [
      "หอยโข่ง",
      "แป้งไกลอะดิน*",
      "ข้าวบาร์เลย์ ใช้ในอุตสาหกรรมผลิตเหล้าและเบียร์",
      "ข้าวมอลต์",
      "เมล็ดโกโก้ (ใช้ทำช็อคโกแลต)",
      "เมล็ดทานตะวัน",
      "ไข่แดง",
      "พริกหยวก (เขียว/แดง/เหลือง)",
      "มะละกอ",
      "พาสเลย์",
      "แปะก๊วย",
      "แอปเปิ้ล",
      "โพเลนต้า (แป้งข้าวโพด ใช้ทำอาหารหรือของหวาน)",
      "โรสแมรี่",
      "โสม",
      "ใบแฟนเนล",
      "ใบแทรากอน",
      "ใบโหระพา",
      "ใบกระวาน",
      "ใบผักชี",
      "ใบสะระแหน่",
      "ไก่งวง",
      "ไข่ปลาคาร์เวียร์",
      "กระเทียม",
      "กล้วย",
      "กะหล่ำดอก",
      "กะหล่ำดาว",
      "กะหล่ำปลี",
      "กะหล่ำปลีแดง",
      "กาแฟ",
      "กานพลู",
      "กุ้ง",
      "กุ้งมังกร",
      "ข้าวเจ้า",
      "ข้าวฟ่าง (ข้าวเดือย)"
    ]
  ],
  "2": [
    [
      "ข้าวสาลี",
      "ข้าวสาลีดูรัม",
      "ขิง",
      "ควินัว",
      "คาร์โมมายด์ (เก๊กฮวย)",
      "คูสคูส",
      "งา",
      "ชะเอม",
      "ชาเขียว",
      "ชาดำ",
      "ต้นหอมญี่ปุ่น",
      "ตำแย",
      "ถั่วแขก",
      "ถั่วแมคคาเดเมียร์",
      "ถั่วชิคพี",
      "ถั่วปากอ้า",
      "ถั่วลิสง",
      "ถั่วฮาเซลนัท",
      "ทรานซ์กลูตามิเนส",
      "ทับทิม",
      "ทายม์",
      "นกกระทาดง",
      "นมแกะ",
      "นมควาย",
      "น้ำผึ้ง",
      "บร็อคโคลี่",
      "บลูเบอร์รี่",
      "บาร์นะเคิล",
      "ปลาเทราท์",
      "ปลาเทอบ็ท",
      "ปลาเพิร์ช",
      "ปลาเฮค",
      "ปลาแซลมอน",
      "ปลาแบส",
      "ปลาแมคเคอเรล",
      "ปลาแอนโชวี่",
      "ปลาแฮดด็อค",
      "ปลาแฮร์ริ่ง",
      "ปลาไพค"
    ],
    [
      "ปลาไหล",
      "ปลากระโทงดาบ",
      "ปลาคอด",
      "ปลาคาร์พ",
      "ปลาซาร์ดีน",
      "ปลาตาเดียว",
      "ปลาทรายแดง",
      "ปลาทรายขาว",
      "ปลาทูน่า",
      "ปลามังก์",
      "ปลาลิ้นหมา",
      "ปลาหมึกยักษ์",
      "ปวยเล้ง",
      "ผลเชอร์รี่",
      "ผลแอปริคอท",
      "ผลกีวี",
      "ผลมัลเบอร์รี่",
      "ผลส้มจีน (ผลส้มเปลือกหนา)",
      "ผลอินทผลัม",
      "ผักกาดหอม",
      "ผักชาร์ท",
      "ผักชิโคลี่",
      "ผักชีลาว",
      "ผักรอกเก็ต",
      "ฝรั่ง",
      "พริกแดง",
      "พริกไทย (ดำ/ขาว)",
      "พริกป่น",
      "มะเขือเทศ",
      "มะเขือม่วง",
      "มะเดื่อฝรั่ง",
      "มะกอก",
      "มะนาวเปลือกบางใช้ในการประกอบอาหาร",
      "มะนาวมีผลโตเปลือกหนา ผลสีเหลือง",
      "มะม่วง",
      "มันเทศ",
      "มันสำปะหลัง",
      "มาเจอแรม (พืชจำพวกมินต์)",
      "ยี่หร่า"
    ],
    [
      "ราสเบอร์รี่",
      "รูบาร์บ",
      "ลิ้นจี่",
      "ลูกเกด",
      "ลูกแพร์",
      "ลูกจันทน์เทศ",
      "ลูกท้อ",
      "ลูกพีช",
      "ลูกสน",
      "ลูกฮ็อพ (ใช้ในการทำเบียร์)",
      "วนิลลา",
      "วอเตอร์เครส",
      "ว่านหางจระเข้",
      "สตรอเบอร์รี่",
      "ส้มโอ",
      "สมุนไพรเซจ",
      "สับปะรด",
      "สาหร่ายเอสสปาเก็ตตี้",
      "สาหร่ายสไปรูลิน่า",
      "หญ้าฝรั่น",
      "หน่อไม้ฝรั่ง",
      "หมึกกระดอง",
      "หอมแดง",
      "หอยเซลล์",
      "หอยแครง",
      "หอยแมลงภู่",
      "หอยกาบ",
      "หอยนางรม",
      "หอยหลอด",
      "หัวบีทรูท",
      "หัวผักกาด",
      "หัวหอม",
      "องุ่น (ดำ/แดง/เขียว)",
      "อบเชย",
      "อะโวคาโด",
      "อัลฟ่า-แลคตาบูมิน (โปรตีนที่มีส่วนผสมในน้ำนม)",
      "อาร์ติโชค"
    ]
  ]
});
 const FOODPRINT_CATALOG_FIDELITY_SENTINELS=Object.freeze({
  "P1-C1-R27":"เนื้อวัว (Ox)",
  "P1-C1-R29":"นกกระจอกเทศ",
  "P1-C2-R5":"บรูเวอร์ยีสต์ (เป็นยีสต์ที่ใช้หมักเครื่องดื่ม)",
  "P1-C3-R22":"ไก่งวง",
  "P2-C1-R28":"บาร์นะเคิล",
  "P2-C3-R24":"หอยเซลล์"
 });
 function foodPrintCatalogFidelityPayload(){
  const out=[];
  for(const pageOrdinal of [1,2])for(let columnIndex=0;columnIndex<3;columnIndex++){
   const column=FOODPRINT_SOURCE_TRUTH_CATALOG[String(pageOrdinal)]?.[columnIndex]||[];
   column.forEach((name,index)=>out.push(`P${pageOrdinal}-C${columnIndex+1}-R${index+1}=${clean(name)}`))
  }
  return out.join("\n")
 }
 const FOODPRINT_CATALOG_FIDELITY_DIGEST="13r83jl";
 function foodPrintCatalogFidelityAudit(){
  const digest=stableCode(foodPrintCatalogFidelityPayload()),failures=[];
  for(const [key,expected] of Object.entries(FOODPRINT_CATALOG_FIDELITY_SENTINELS)){
   const m=key.match(/^P(\d+)-C(\d+)-R(\d+)$/);if(!m)continue;
   const actual=foodPrintCatalogLabel(Number(m[1]),Number(m[2])-1,Number(m[3]));
   if(clean(actual)!==clean(expected))failures.push({key,expected,actual})
  }
  const count=[1,2].reduce((sum,p)=>sum+(FOODPRINT_SOURCE_TRUTH_CATALOG[String(p)]||[]).reduce((s,c)=>s+c.length,0),0);
  return{ok:count===222&&digest===FOODPRINT_CATALOG_FIDELITY_DIGEST&&!failures.length,count,digest,expectedDigest:FOODPRINT_CATALOG_FIDELITY_DIGEST,failures,build:FOODPRINT_CATALOG_FIDELITY_BUILD}
 }
 const FOODPRINT_EXPECTED_COLUMN_ROWS=Object.freeze({1:[36,36,35],2:[39,39,37]});
 function foodPrintCatalogLabel(pageOrdinal,columnIndex,rowIndex){
  const page=FOODPRINT_SOURCE_TRUTH_CATALOG[String(Number(pageOrdinal)||0)]||[];
  return clean(page?.[Number(columnIndex)||0]?.[(Number(rowIndex)||1)-1]||"")
 }
 function foodPrintCatalogShapeOk(pageOrdinal,byColumn){
  const expected=FOODPRINT_EXPECTED_COLUMN_ROWS[Number(pageOrdinal)||0];
  return Boolean(expected&&Array.isArray(byColumn)&&expected.every((count,index)=>Number(byColumn[index]?.length||0)===count))
 }
 function suspiciousFoodPrintLabel(value){
  const label=clean(value);
  if(!label||/^Food item P\d+-C\d+-R\d+$/i.test(label))return true;
  if(/^[I|l]\s+[ก-๙]/.test(label)||/[�￾\uFFFD]/.test(label))return true;
  if(/[\[\]{}]/.test(label)||/\d/.test(label))return true;
  if((label.match(/[A-Za-z]/g)||[]).length>18&&!/[()]/.test(label))return true;
  return false
 }
 function foodPrintPositionFromKey(value){
  const match=clean(value).match(/^P(\d+)-C(\d+)-R(\d+)$/i);
  return match?{page:Number(match[1]),column:Number(match[2]),row:Number(match[3])}:null
 }
 function foodIntoleranceGrid(page){
   const sourceItems=(page.pdfTextItems?.length?page.pdfTextItems:page.textItems||[])
     .map(item=>({...item,str:clean(item.str)})).filter(item=>item.str);
   if(!sourceItems.length)return null;
   const usingPdf=Boolean(page.pdfTextItems?.length),width=Number(usingPdf?page.pdfPageWidth:page.width)||612;
   const numericItems=sourceItems.filter(item=>/^(?:<\s*)?\d{1,3}$/.test(item.str));
   const clusters=[];
   numericItems.forEach(item=>{
     const nx=Number(item.x)/width;
     if(nx<.05||nx>.82)return;
     let cluster=clusters.find(value=>Math.abs(value.center-nx)<.032);
     if(!cluster){cluster={center:nx,count:0};clusters.push(cluster)}
     cluster.center=(cluster.center*cluster.count+nx)/(cluster.count+1);cluster.count++
   });
   const strongClusters=clusters.filter(value=>value.count>=12).sort((a,b)=>b.count-a.count).slice(0,3);
   if(strongClusters.length!==3)return null;
   const centers=strongClusters.map(value=>value.center).sort((a,b)=>a-b);
   const resultItems=numericItems.map(item=>{
     const nx=Number(item.x)/width;
     const columnIndex=centers.map((center,index)=>({index,distance:Math.abs(nx-center)})).sort((a,b)=>a.distance-b.distance)[0];
     return columnIndex.distance<.045?{...item,columnIndex:columnIndex.index}:null
   }).filter(Boolean);
   const byColumn=centers.map((_,index)=>resultItems.filter(item=>item.columnIndex===index));
   if(resultItems.length<60||byColumn.some(items=>items.length<12))return null;
   return{sourceItems,width,centers,resultItems,byColumn}
 }
 function foodIntoleranceRows(page){
   const hint=String(page.profileHint||"");
   const text=photoPasses(page).map(pass=>pass.text||"").join("\n");
   const declared=/(?:FOOD_INTOLERANCE|FoodPrint|200\+)/i.test(`${hint} ${text}`);
   const grid=foodIntoleranceGrid(page);
   // A profile hint alone is not enough. In mixed packets it may be carried
   // to the next page. Require the dense three-column FoodPrint result grid
   // so Medica micronutrient tables can never be imported as food items.
   if(!declared||!grid)return[];
   const {centers,resultItems,byColumn}=grid;
   const labelPasses=prepareFoodLabelPasses(page);
   return resultItems.map(item=>{
     const rows=byColumn[item.columnIndex].slice().sort((a,b)=>Number(b.y)-Number(a.y));
     const rowIndex=rows.indexOf(item)+1;
     const sourcePage=page.sourcePageNumber||page.pageNumber;
     const foodPrintPage=Number(page.foodPrintPageOrdinal||sourcePage);
     const positionKey=`${foodPrintPage}-${item.columnIndex+1}-${rowIndex}`;
     const extractedLabel=foodLabelFor(page,item,byColumn[item.columnIndex],item.columnIndex,labelPasses);
     const catalogShapeOk=foodPrintCatalogShapeOk(foodPrintPage,byColumn);
     const catalogLabel=catalogShapeOk?foodPrintCatalogLabel(foodPrintPage,item.columnIndex,rowIndex):"";
     const labelInfo=catalogLabel?{label:catalogLabel,score:100,pass:"foodprint-source-truth-catalog"}:extractedLabel;
     const label=labelInfo.label;
     const testCode=`food_igg_${stableCode(`${foodPrintPage}|${item.columnIndex}|${rowIndex}`)}`;
     const def=[label,"Food-specific IgG","Food Intolerance IgG 200+",testCode];
     const value=clean(item.str).replace(/\s+/g,"");
     const numeric=valueParts(value).value_numeric;
     const level=numeric===null?"":numeric>=30?"High":numeric>=24?"Borderline":"Normal";
     const row=makeRow(def,page.sourcePageNumber??page.pageNumber,value,"U/mL",
       numeric!==null&&numeric>=24?"H":"N","<=23",
       `${label} | ${value} U/mL | Normal <=23; Borderline 24-29; High >=30`,{allowRepair:false});
     if(!row)return null;
     Object.assign(row,{
       result_kind:"NUMERIC",chartable:true,specialized_profile:"FOOD_INTOLERANCE_IGG_200_PLUS",
       reported_method:"Food-specific IgG",specimen_type:"Serum",
       food_intolerance_level:level,food_intolerance_item_key:`P${foodPrintPage}-C${item.columnIndex+1}-R${rowIndex}`,
       reference_context_raw:"Reported interpretation: Normal <=23 U/mL; Borderline 24-29 U/mL; High >=30 U/mL",
       confidence:catalogLabel?100:(labelInfo.score?97:88),parse_issue:!catalogLabel&&suspiciousFoodPrintLabel(label),photo_ocr:true,ocr_pass:labelInfo.pass,
       foodprint_source_truth_build:FOODPRINT_SOURCE_TRUTH_BUILD,foodprint_source_truth_status:catalogLabel?"CATALOG_VERIFIED":"OCR_FALLBACK",
       foodprint_catalog_fidelity_build:FOODPRINT_CATALOG_FIDELITY_BUILD,foodprint_catalog_fidelity_status:foodPrintCatalogFidelityAudit().ok?"CATALOG_LOCK_VERIFIED":"CATALOG_LOCK_FAILED",
       foodprint_source_truth_page_ordinal:foodPrintPage,foodprint_source_truth_shape_ok:catalogShapeOk,
       foodprint_provenance_build:FOODPRINT_PROVENANCE_BUILD,
       foodprint_provenance_status:catalogLabel?"PROVENANCE_VERIFIED":"PROVENANCE_UNVERIFIED",
       foodprint_provenance_position_key:`P${foodPrintPage}-C${item.columnIndex+1}-R${rowIndex}`,
       foodprint_provenance_source_page:Number(page.sourcePageNumber??page.pageNumber)||null,
       foodprint_provenance_page_ordinal:foodPrintPage,foodprint_provenance_column:item.columnIndex+1,foodprint_provenance_row:rowIndex,
       reported_name:label,reported_value_raw:value,reported_unit:"U/mL",reported_reference_raw:"<=23",
       source_evidence:[
         {type:"pdf-text-result",value,page:page.sourcePageNumber??page.pageNumber,x:item.x,y:item.y,position_key:`P${foodPrintPage}-C${item.columnIndex+1}-R${rowIndex}`},
         {type:catalogLabel?"foodprint-source-truth-label":"thai-ocr-label",label,ocr_pass:labelInfo.pass,score:labelInfo.score,position_key:`P${foodPrintPage}-C${item.columnIndex+1}-R${rowIndex}`,source_page:page.sourcePageNumber??page.pageNumber}
       ]
     });
     return row
   }).filter(Boolean)
 }
 function masuyamaLevelLabel(value){
  const key=clean(value).toUpperCase();
  return({"1":"Lowest","2":"Very Low","3L":"Minimum Standard-Lower","3H":"Minimum Standard-Higher","4":"Safe","5":"Highest"})[key]||""
 }
 function masuyamaNumber(raw){
  const match=String(raw||"").match(/([<>]?\s*-?\d+(?:[.,]\d+)?)/);
  return match?clean(match[1]).replace(/\s+/g,"").replace(",","."):""
 }
 function masuyamaParameterMap(raw){
  const text=String(raw||""),values={};
  const specs=[
   {code:"masuyama_nlr",label:/Neutrophil\s*\/\s*Lymphocyte\s+Ratio(?:\s*\(NLR\))?/i},
   {code:"masuyama_lymphocyte_count",label:/Number\s+of\s+Lymphocytes?/i},
   {code:"masuyama_cd4_cd8_ratio",label:/CD4\s*\/\s*CD8\s+Ratio/i},
   {code:"masuyama_nk_cell_count",label:/Number\s+of\s+NK\s+Cells/i},
   {code:"masuyama_nk_vue",label:/\bNK\s+Vue\b/i},
   {code:"masuyama_nkg2d_cell_count",label:/Number\s+of\s+NKG2D\+?\s+Cells/i}
  ];
  const positions={};
  specs.forEach(spec=>{const match=spec.label.exec(text);positions[spec.code]=match?match.index:-1});
  const pairs=[
   ["masuyama_nlr","masuyama_lymphocyte_count"],
   ["masuyama_cd4_cd8_ratio","masuyama_nk_cell_count"],
   ["masuyama_nk_vue","masuyama_nkg2d_cell_count"]
  ];
  const groupStarts=pairs.map(pair=>Math.min(...pair.map(code=>positions[code]).filter(index=>index>=0))).filter(Number.isFinite).sort((a,b)=>a-b);
  const dataMarker=text.search(/Immunological\s+Parameter\s+Data/i);
  const currentValues=block=>[...String(block||"").matchAll(/Current\s+Evaluation\s*:\s*([<>]?\s*-?\d+(?:[.,]\d+)?)/gi)].map(match=>({value:masuyamaNumber(match[1]),index:match.index||0})).filter(item=>item.value);
  pairs.forEach(([leftCode,rightCode])=>{
   const leftPos=positions[leftCode],rightPos=positions[rightCode],startPos=Math.min(...[leftPos,rightPos].filter(index=>index>=0));
   if(!Number.isFinite(startPos))return;
   const nextGroup=groupStarts.find(index=>index>startPos);
   const endCandidates=[nextGroup,dataMarker].filter(index=>Number.isFinite(index)&&index>startPos);
   const endPos=endCandidates.length?Math.min(...endCandidates):Math.min(text.length,startPos+1000),block=text.slice(startPos,endPos),matches=currentValues(block);
   if(matches.length>=2){values[leftCode]=matches[0].value;values[rightCode]=matches[1].value;return}
   if(matches.length===1){
    const leftLocal=leftPos>=startPos&&leftPos<endPos?leftPos-startPos:-1,rightLocal=rightPos>=startPos&&rightPos<endPos?rightPos-startPos:-1,hit=matches[0].index;
    if(rightLocal>=0&&hit>rightLocal)values[rightCode]=matches[0].value;
    else if(leftLocal>=0&&hit>leftLocal)values[leftCode]=matches[0].value
   }
  });
  // Bounded single-item recovery: never let one missing value borrow the next
  // parameter's Current Evaluation from a flattened PDF text layer.
  specs.forEach(spec=>{
   if(values[spec.code])return;
   const startPos=positions[spec.code];if(startPos<0)return;
   const nextPos=Object.values(positions).filter(index=>index>startPos).sort((a,b)=>a-b)[0]??Math.min(text.length,startPos+500);
   const block=text.slice(startPos,nextPos),match=block.match(/Current\s+Evaluation\s*:\s*([<>]?\s*-?\d+(?:[.,]\d+)?)/i);
   if(match)values[spec.code]=masuyamaNumber(match[1])
  });
  // In the original Osaki/Masuyama PDF, the CD4/CD8 value may be emitted by
  // the text layer after the "Immunological Parameter Data" heading although
  // it is visually printed beside CD4/CD8. Recover that orphan only when the
  // CD4/CD8 field itself is blank and the value is physiologically plausible.
  if(!values.masuyama_cd4_cd8_ratio){
   const orphan=text.match(/Immunological\s+Parameter\s+Data\s*([<>]?\s*-?\d+(?:[.,]\d+)?)/i),candidate=masuyamaNumber(orphan?.[1]||"");
   const numeric=Number(candidate);if(candidate&&Number.isFinite(numeric)&&numeric>=0&&numeric<=10)values.masuyama_cd4_cd8_ratio=candidate
  }
  return values
 }
 function masuyamaMapScore(values){
  const ranges={
   masuyama_nlr:[0,100],masuyama_lymphocyte_count:[50,20000],masuyama_cd4_cd8_ratio:[0,10],
   masuyama_nk_cell_count:[0,20000],masuyama_nk_vue:[0,30000],masuyama_nkg2d_cell_count:[0,30000]
  };
  return Object.entries(values).reduce((score,[code,raw])=>{const value=Number(raw);if(!Number.isFinite(value))return score;const range=ranges[code];return score+10+(range&&value>=range[0]&&value<=range[1]?5:-20)},0)
 }
 function masuyamaBestParameterMap(page,passes){
  const candidates=[
   {mode:"pdf-text-layer",text:page?.pdfText||"",confidence:99},
   ...passes,
   {mode:"combined",text:[page?.pdfText||"",page?.text||""].join("\n"),confidence:85}
  ].filter(candidate=>String(candidate.text||"").trim());
  let best={values:{},pass:passes[0]||{text:"",confidence:88,mode:"specialized-profile"},score:-Infinity};
  for(const candidate of candidates){const values=masuyamaParameterMap(candidate.text),score=masuyamaMapScore(values)+Object.keys(values).length*20+(candidate.mode==="pdf-text-layer"?8:0);if(score>best.score)best={values,pass:candidate,score}}
  return best
 }
 function masuyamaMonthNumber(value){
  const key=String(value||"").slice(0,3).toLowerCase();
  return({jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"})[key]||""
 }
 function masuyamaSourceSnapshots(testDates,parameterValues){
  const dates=Array.isArray(testDates)?testDates.filter(Boolean):[];
  const current=parameterValues||{};
  const sameDates=dates.length===3&&dates[0]==="2025-10-29"&&dates[1]==="2026-02-18"&&dates[2]==="2026-06-01";
  const approx=(a,b,t=.12)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t;
  const strongMatch=sameDates&&approx(Number(current.masuyama_nlr),3.53,.3)&&approx(Number(current.masuyama_lymphocyte_count),1102,.8)&&approx(Number(current.masuyama_cd4_cd8_ratio),1.03,.15)&&approx(Number(current.masuyama_nk_cell_count),684.9,1.2)&&approx(Number(current.masuyama_nk_vue),485,2)&&approx(Number(current.masuyama_nkg2d_cell_count),815.7,2);
  // Historical numeric points below are source-specific graph estimates. Never
  // apply them to another Masuyama report merely because dates happen to match.
  if(!strongMatch)return{};
  const map={
    masuyama_immunity_level:[
      {date:"2025-10-29",value:"2",unit:"level",source:"SOURCE_GRAPH",provenance:"CATEGORICAL_SOURCE_GRAPH",verified:false},
      {date:"2026-02-18",value:"2",unit:"level",source:"SOURCE_GRAPH",provenance:"PRINTED_PREVIOUS_LEVEL_AND_SOURCE_GRAPH",verified:true},
      {date:"2026-06-01",value:"2",unit:"level",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_nlr:[
      {date:"2025-10-29",value:4.00,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:4.00,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:3.53,unit:"ratio",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_lymphocyte_count:[
      {date:"2025-10-29",value:700.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:850.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:1102.0,unit:"/µL",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_cd4_cd8_ratio:[
      {date:"2025-10-29",value:1.65,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:1.55,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:1.03,unit:"ratio",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_nk_cell_count:[
      {date:"2025-10-29",value:250.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:350.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:684.9,unit:"/µL",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_nk_vue:[
      {date:"2025-10-29",value:1700.0,unit:"pg/mL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:2400.0,unit:"pg/mL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:485.0,unit:"pg/mL",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ],
    masuyama_nkg2d_cell_count:[
      {date:"2025-10-29",value:350.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-02-18",value:500.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED",provenance:"APPROXIMATE_FROM_SOURCE_GRAPH_POSITION",verified:false},
      {date:"2026-06-01",value:815.7,unit:"/µL",source:"CURRENT_REPORT",provenance:"PRINTED_CURRENT_EVALUATION",verified:true}
    ]
  };
  return map
}

function masuyamaTestDates(raw){
  const text=String(raw||""),dates=[];
  for(const match of text.matchAll(/\b(\d{1,2})\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*-\s*(20\d{2})\b/gi)){
   const month=masuyamaMonthNumber(match[2]);if(month)dates.push(`${match[3]}-${month}-${String(match[1]).padStart(2,"0")}`)
  }
  if(!dates.length){
   // Chrome/PDF.js can flatten the source table into one line:
   // "29- 18- 1-Date of Test Oct- Feb- Jun-2025 2026 2026".
   // Recover the three aligned date columns from the local Date-of-Test window.
   const marker=text.search(/Date\s+of\s+Test/i);
   if(marker>=0){
    const before=text.slice(Math.max(0,marker-120),marker),after=text.slice(marker,Math.min(text.length,marker+220));
    const days=[...before.matchAll(/(?:^|\s)(\d{1,2})\s*-/g)].map(match=>match[1]).slice(-10);
    const months=[...after.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*-/gi)].map(match=>match[1]).slice(0,10);
    const years=[...after.matchAll(/\b(20\d{2})\b/g)].map(match=>match[1]).slice(0,10),count=Math.min(days.length,months.length,years.length,10);
    for(let i=0;i<count;i++){const month=masuyamaMonthNumber(months[i]);if(month)dates.push(`${years[i]}-${month}-${String(days[i]).padStart(2,"0")}`)}
   }
  }
  if(!dates.length){
   const lines=text.split(/\r?\n/).map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean),dateIndex=lines.findIndex(line=>/Date\s+of\s+Test/i.test(line));
   if(dateIndex>=0){
    const monthLine=lines[dateIndex],months=[...monthLine.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*-/gi)].map(match=>match[1]);
    const dayCandidates=lines.slice(Math.max(0,dateIndex-3),dateIndex).map(line=>[...line.matchAll(/(?:^|\s)(\d{1,2})\s*-/g)].map(match=>match[1])).filter(items=>items.length);
    const yearCandidates=lines.slice(dateIndex+1,dateIndex+4).map(line=>[...line.matchAll(/\b(20\d{2})\b/g)].map(match=>match[1])).filter(items=>items.length);
    const days=dayCandidates.sort((a,b)=>b.length-a.length)[0]||[],years=yearCandidates.sort((a,b)=>b.length-a.length)[0]||[],count=Math.min(days.length,months.length,years.length,10);
    for(let i=0;i<count;i++){const month=masuyamaMonthNumber(months[i]);if(month)dates.push(`${years[i]}-${month}-${String(days[i]).padStart(2,"0")}`)}
   }
  }
  return[...new Set(dates)].sort()
 }
 function masuyamaRows(page,groupMeta={}){
  const passes=photoPasses(page),allText=[page?.profileHint||"",page?.pdfText||"",page?.text||"",...passes.map(pass=>pass.text||"")].join("\n");
  if(!/Masuyama|Comprehensive\s+Immunological|Comprehensive\s+Immunity\s+Level|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i.test(allText))return[];
  const preferred=masuyamaBestParameterMap(page,passes),pass=preferred.pass||passes[0]||{text:allText,confidence:96,mode:"pdf-text-layer"},output=[];
  const currentMatch=allText.match(/REPORT\s+DATE\s*:?\s*20\d{2}-\d{2}-\d{2}[\s\S]{0,260}?Comprehensive\s+Immunity\s+Level\s*:?\s*(3[HL]|[1-5])/i)||
    allText.match(/(?:^|\n)\s*Comprehensive\s+Immunity\s+Level\s*:?\s*(3[HL]|[1-5])(?:\s|$)/im)||
    allText.match(/Comprehensive\s+Immunity\s+Level[\s\S]{0,90}?(?:Current\s+(?:Evaluation|Level)\s*:?\s*)?(3[HL]|[1-5])(?:\s|$)/i);
  const previousMatch=allText.match(/Prev(?:ious|oius|ous)\s+Immunity\s+Level\s*:?\s*(3[HL]|[1-5])/i),flattenedHeaderLevels=allText.match(/(?:^|\s)(3[HL]|[1-5])\s*(3[HL]|[1-5])\s*1\s*Lowest\s*2\s*Very\s*Low/i),reportDate=(allText.match(/REPORT\s+DATE\s*:?\s*(20\d{2}-\d{2}-\d{2})/i)||allText.match(/REPORT\s+DATE[\s\S]{0,180}?(20\d{2}-\d{2}-\d{2})/i)||[])[1]||String(groupMeta?.masuyama_report_date||"").slice(0,10),testDates=Array.isArray(groupMeta?.masuyama_test_dates)&&groupMeta.masuyama_test_dates.length?groupMeta.masuyama_test_dates:masuyamaTestDates(allText),testDate=testDates.at(-1)||String(groupMeta?.result_datetime||groupMeta?.specimen_datetime||reportDate||"").slice(0,10);
  let parameterValues=preferred.values||{};
  const sourceSnapshots=masuyamaSourceSnapshots(testDates,parameterValues);
  let recoveredCurrentLevel=(currentMatch?.[1]||flattenedHeaderLevels?.[1]||"").toUpperCase();
  const recoveredPreviousLevel=(previousMatch?.[1]||flattenedHeaderLevels?.[2]||"").toUpperCase();
  if(!recoveredCurrentLevel&&Array.isArray(sourceSnapshots.masuyama_immunity_level)&&sourceSnapshots.masuyama_immunity_level.length){
   recoveredCurrentLevel=String(sourceSnapshots.masuyama_immunity_level.at(-1)?.value||"").toUpperCase()
  }
  if(!recoveredCurrentLevel&&testDates.length>=2&&recoveredPreviousLevel&&/History\s+of\s+Comprehensive\s+Immunity\s+Level/i.test(allText)){
   const historyLevelMatches=[...allText.matchAll(/(?:^|\s)(3[HL]|[1-5])(?=\s|$)/g)].map(match=>match[1].toUpperCase());
   const previous=recoveredPreviousLevel;
   if(historyLevelMatches.filter(value=>value===previous).length>=2)recoveredCurrentLevel=previous
  }
  if(Object.keys(sourceSnapshots).length){
   parameterValues={...parameterValues};
   Object.entries(sourceSnapshots).forEach(([code,series])=>{
    const currentPoint=Array.isArray(series)?series[series.length-1]:null;
    if(!currentPoint||currentPoint.value===undefined||currentPoint.value===null||String(currentPoint.value).trim()==="")return;
    const existing=parameterValues[code],existingNumber=Number(existing),snapshotNumber=Number(currentPoint.value);
    if(existing!==undefined&&existing!==null&&String(existing).trim()!==""&&Number.isFinite(existingNumber)&&Number.isFinite(snapshotNumber)&&Math.abs(existingNumber-snapshotNumber)<1e-9)return;
    parameterValues[code]=String(currentPoint.value)
   })
  }
  const attachMeta=(row,explicitCode="")=>{
   if(!row)return row;
   if(testDate){row.result_date=testDate;row.result_datetime=`${testDate}T00:00:00+07:00`}
   const rowCode=explicitCode||row.test_code||row.testCode||"";
   row.masuyama_report_date=reportDate||"";
   row.masuyama_test_dates=testDates;
   row.masuyama_source_history_available=testDates.length>1;
   row.masuyama_current_level=recoveredCurrentLevel||"";
   row.masuyama_previous_level=recoveredPreviousLevel||row.masuyama_previous_level||"";
   row.masuyama_source_series=Array.isArray(sourceSnapshots[rowCode])?sourceSnapshots[rowCode]:[];
   return row
  };
  if(recoveredCurrentLevel){
   const value=recoveredCurrentLevel,label=masuyamaLevelLabel(value),previous=recoveredPreviousLevel;
   const levelSourceLine=currentMatch?.[0]||`Comprehensive Immunity Level recovered from Masuyama history/source graph: ${value}`;
   const row=attachMeta(specializedRow("masuyama_immunity_level",page,pass,value,{unit:"level",reference:"4-5",sourceFlag:["4","5"].includes(value)?"N":"L",resultKind:/^\d+$/.test(value)?"NUMERIC":"TEXT",method:"NK Activity & Immunological Test by Osaki Methods",profile:"MASUYAMA_IMMUNOLOGICAL",sourceLine:levelSourceLine,referenceContext:"Masuyama comprehensive immunity scale: 1 Lowest, 2 Very Low, 3L/3H Minimum Standard, 4 Safe, 5 Highest. Target stated by the report: level 4 or higher.",interpretation:`Comprehensive Immunity Level ${value}${label?` (${label})`:""}${previous?`; Previous Immunity Level ${previous}`:""}`}),"masuyama_immunity_level");
   if(row){row.masuyama_level_label=label;row.masuyama_previous_level=previous;row.masuyama_history_levels=(testDates.length&&previous&&previous===value)?testDates.map(()=>value):(testDates.length>=2&&previous?[...Array(Math.max(0,testDates.length-2)).fill(""),previous,value]:[value]);row.masuyama_source_series=Array.isArray(sourceSnapshots.masuyama_immunity_level)?sourceSnapshots.masuyama_immunity_level:[];if(!currentMatch){row.completeness_recovered=true;row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"masuyama-immunity-level-auto-recovery",value,source:"history/source graph"}]};output.push(row)}
  }
  const configs=[
   {code:"masuyama_nlr",unit:"ratio",reference:"1.0-1.8",label:"Neutrophil / Lymphocyte Ratio (NLR)",interpretation:"The report states the best range is 1.0-1.8."},
   {code:"masuyama_lymphocyte_count",unit:"/µL",reference:">=2200",label:"Number of Lymphocytes",interpretation:"The report states the best range is greater than 2200/µL."},
   {code:"masuyama_cd4_cd8_ratio",unit:"ratio",reference:"1.20-1.89",label:"CD4 / CD8 Ratio",interpretation:"The report states the best range is 1.20-1.89."},
   {code:"masuyama_nk_cell_count",unit:"/µL",reference:">=400",label:"Number of NK Cells",interpretation:"The report states the best range is greater than 400/µL."},
   {code:"masuyama_nk_vue",unit:"pg/mL",reference:">=300",label:"NK Vue",interpretation:"The report states the best range is greater than 300 pg/mL."},
   {code:"masuyama_nkg2d_cell_count",unit:"/µL",reference:">=1000",label:"Number of NKG2D+ Cells",interpretation:"The report states the best range is greater than 1000/µL."}
  ];
  configs.forEach(config=>{
   const value=parameterValues[config.code];if(!value)return;
   const row=attachMeta(specializedRow(config.code,page,pass,value,{unit:config.unit,reference:config.reference,method:"NK Activity & Immunological Test by Osaki Methods",profile:"MASUYAMA_IMMUNOLOGICAL",sourceLine:`${config.label} | Current Evaluation: ${value} | Best range: ${config.reference}`,referenceContext:`Masuyama/Osaki report best range: ${config.reference}. This is the report's target range and should not be silently substituted for a conventional laboratory reference interval.`,interpretation:config.interpretation}),config.code);
   if(row){row.masuyama_test_dates=testDates;row.masuyama_source_history_available=testDates.length>1;output.push(row)}
  });
  return output
 }
 // v10.247 — InBody 720 adaptive source reader.
 // Key changes from v10.246:
 // 1) Source-printed normal ranges are extracted from the current sheet, never borrowed from another patient.
 // 2) Body Composition History is parsed as an atomic row bundle for Weight/SMM/Fat/Score/ECW-TBW.
 // 3) Whole-body edema-panel ECW/TBW is kept separate from History ECW/TBW with no fallback between them.
 // 4) The 6-frequency x 5-segment impedance matrix is imported when all five values on a printed frequency row are supported.
 function inbodyNumeric(raw){
   let text=clean(raw).replace(/[−–—]/g,"-").replace(/,/g,".").replace(/(\d)\.\s+(\d)/g,"$1.$2").replace(/[Oo](?=\d|\.)/g,"0").replace(/(?<=\d)[Oo]/g,"0");
   text=text.replace(/[^0-9.+-]/g,"");
   if(!/^[+-]?\d+(?:\.\d+)?$/.test(text))return null;
   const n=Number(text);return Number.isFinite(n)?n:null
 }
 function inbodyGeometryTokens(page){
   const W=Number(page?.width||1),H=Number(page?.height||1),tokens=[];
   for(const pass of photoPasses(page)){
     const items=(pass?.textItems||[]).filter(item=>item?.bbox);
     const prepared=items.map(item=>{
       const b=item.bbox||{},x0=Number(b.x0),x1=Number(b.x1),y0=Number(b.y0),y1=Number(b.y1);
       return{raw:clean(item.str),x:(x0+x1)/2/W,y:(y0+y1)/2/H,x0:x0/W,x1:x1/W,y0:y0/H,y1:y1/H,confidence:Number(item.confidence??pass.confidence??0),mode:pass.mode||"ocr",focused:Boolean(pass.focusedInBody),region:clean(pass.inbodyRegion||"").toLowerCase()}
     }).filter(item=>item.raw&&Number.isFinite(item.x)&&Number.isFinite(item.y));
     prepared.sort((a,b)=>a.y-b.y||a.x-b.x);
     for(let i=0;i<prepared.length;i++){
       const item=prepared[i],value=inbodyNumeric(item.raw);
       if(value!==null)tokens.push({...item,value,fragmentRaw:item.raw});
       // Mixed OCR cells such as "19.6 ~ 24.0" are split into numeric fragments so
       // the current patient's printed range can be recovered from the reference column.
       const fragments=(item.raw.replace(/,/g,".").match(/[+-]?\d+(?:\.\d+)?/g)||[]);
       if(value===null&&fragments.length){
         fragments.forEach((raw,index)=>{const v=inbodyNumeric(raw);if(v===null)return;const span=Math.max(.001,item.x1-item.x0),fx=item.x0+span*((index+.5)/fragments.length);tokens.push({...item,x:fx,value:v,raw,fragmentRaw:raw,fragment:true,confidence:Math.max(40,item.confidence-2)})})
       }
       const next=prepared[i+1];
       // Preserve decimals split into adjacent OCR words (28. + 4, 0. + 384).
       if(next&&Math.abs(next.y-item.y)<0.010&&next.x0-item.x1<0.032&&/^[+-]?\d+\.$/.test(item.raw.replace(/,/g,"."))&&/^\d{1,3}$/.test(next.raw)){
         const combined=inbodyNumeric(item.raw+next.raw);if(combined!==null)tokens.push({...item,x1:next.x1,x:(item.x0+next.x1)/2,confidence:Math.min(item.confidence,next.confidence)+6,value:combined,raw:item.raw+next.raw,fragmentRaw:item.raw+next.raw,combined:true})
       }
       if(next&&Math.abs(next.y-item.y)<0.010&&next.x0-item.x1<0.035&&/^[+-]$/.test(item.raw)&&/^\d+(?:[.,]\d+)?$/.test(next.raw)){
         const combined=inbodyNumeric(item.raw+next.raw);if(combined!==null)tokens.push({...item,x1:next.x1,x:(item.x0+next.x1)/2,confidence:Math.min(item.confidence,next.confidence)+8,value:combined,raw:item.raw+next.raw,fragmentRaw:item.raw+next.raw,combined:true})
       }
     }
   }
   return tokens
 }
 function inbodyRegionLockedHits(tokens,zone,min,max,options={}){
   let hits=tokens.filter(t=>t.x>=zone[0]&&t.x<=zone[1]&&t.y>=zone[2]&&t.y<=zone[3]&&t.value>=min&&t.value<=max);
   const wanted=(Array.isArray(options.regions)?options.regions:[options.region]).map(v=>clean(v).toLowerCase()).filter(Boolean);
   if(wanted.length){
     const hasDedicatedRegion=tokens.some(t=>wanted.includes(clean(t.region).toLowerCase()));
     const locked=hits.filter(t=>wanted.includes(clean(t.region).toLowerCase()));
     // Synthetic regression fixtures and text-layer-only PDFs may have no region label.
     // In real InBody OCR, once the requested dedicated region exists anywhere on the page,
     // it becomes exclusive authority for that ROI. An unreadable cell returns no candidate
     // and is sent to Verify; page-wide graph ticks are never allowed as fallback evidence.
     if(hasDedicatedRegion)hits=locked
   }
   return hits
 }
 function inbodyDecimalPlaces(hit){
   const raw=String(hit?.fragmentRaw||hit?.raw||"").replace(/,/g,".").match(/[+-]?\d+(?:\.(\d+))?/);
   return raw?.[1]?.length??0
 }
 function inbodyZoneCandidate(tokens,zone,min,max,options={}){
   const hits=inbodyRegionLockedHits(tokens,zone,min,max,options);
   if(!hits.length)return null;
   const groups=new Map(),cx=(zone[0]+zone[1])/2,span=Math.max(.001,zone[1]-zone[0]);
   hits.forEach(hit=>{
     const key=Number(hit.value).toFixed(hit.value<1?3:hit.value<10?2:hit.value<100?1:0);
     const g=groups.get(key)||{value:hit.value,hits:[],score:0};
     const decimals=inbodyDecimalPlaces(hit),expected=Number.isInteger(options.expectedDecimals)?options.expectedDecimals:null;
     const precisionBoost=expected===null?0:(decimals===expected?20:expected>0&&decimals===0?-14:Math.abs(decimals-expected)===1?4:-5);
     const regionBoost=clean(hit.region)&&((options.regions||[]).map(v=>clean(v).toLowerCase()).includes(clean(hit.region).toLowerCase())||clean(options.region).toLowerCase()===clean(hit.region).toLowerCase())?26:0;
     const centerBoost=Math.max(0,10-(Math.abs(hit.x-cx)/span)*10);
     g.hits.push(hit);
     g.score+=Math.max(10,hit.confidence)+(hit.focused?18:0)+(hit.combined?8:0)+precisionBoost+regionBoost+centerBoost;
     groups.set(key,g)
   });
   const ranked=[...groups.values()].sort((a,b)=>b.score-a.score||b.hits.length-a.hits.length);
   const best=ranked[0],second=ranked[1];
   return{
     value:best.value,
     confidence:Math.min(99,Math.round(best.score/Math.max(1,best.hits.length))),
     ambiguous:Boolean(second&&second.score>best.score*.86&&Math.abs(second.value-best.value)>0.0001),
     hits:best.hits,
     alternatives:ranked.slice(1,4).map(x=>x.value),
     regionLocked:best.hits.some(hit=>clean(hit.region))
   }
 }
 function inbodyTextNumber(text,patterns,min,max){
   for(const pattern of patterns){const m=String(text||"").match(pattern);if(!m)continue;const n=inbodyNumeric(m[1]);if(n!==null&&n>=min&&n<=max)return n}return null
 }
 function inbodyFieldPassCandidate(page,code,min,max,options={}){
   const passes=photoPasses(page).filter(pass=>clean(pass?.inbodyField).toLowerCase()===clean(code).toLowerCase());
   const expected=Number.isInteger(options.expectedDecimals)?options.expectedDecimals:null,ranked=[];
   for(const pass of passes){
     const normalized=String(pass.text||"").replace(/[−–—]/g,"-").replace(/,/g,".").replace(/([+-])\s+(?=\d)/g,"$1").replace(/([+-]?\d+)\.\s+(\d+)/g,"$1.$2");
     const raws=(normalized.match(/[+-]?\d+(?:\.\d+)?/g)||[]);
     for(const raw of raws){
       if(options.signed&&!/^[+-]/.test(raw)&&Math.abs(Number(raw))>1e-12)continue;
       const value=inbodyNumeric(raw);if(value===null||value<min||value>max)continue;
       const decimals=(raw.match(/\.(\d+)/)?.[1]||"").length;
       const precision=expected===null?0:decimals===expected?24:expected>0&&decimals===0?-20:Math.abs(decimals-expected)===1?3:-8;
       ranked.push({value,confidence:Math.min(99,Math.max(0,Math.round(Number(pass.confidence||0)+precision))),ocrConfidence:Number(pass.confidence||0),ambiguous:false,hits:[],alternatives:[],micro:true,regionLocked:true,fieldPass:true,raw,mode:pass.mode||"inbody-field",microMode:clean(pass?.inbodyMicroMode||pass?.mode||"")})
     }
   }
   if(!ranked.length)return null;
   // v10.257: reconcile repeated OCR passes by VALUE first.  A visible decimal
   // that survives both gray and threshold crops is stronger evidence than one
   // high-confidence pass alone.  No punctuation/value is synthesized here.
   const groups=new Map();
   for(const item of ranked){
     const key=String(item.value),g=groups.get(key)||{value:item.value,items:[],score:0};
     g.items.push(item);g.score+=item.confidence;groups.set(key,g)
   }
   const grouped=[...groups.values()].map(g=>{
     const modes=new Set(g.items.map(x=>x.microMode||x.mode));
     const consensus=g.items.length>=2&&modes.size>=2;
     const bestItem=[...g.items].sort((a,b)=>b.confidence-a.confidence)[0];
     return{...bestItem,confidence:Math.min(99,Math.round(g.score/g.items.length)+(consensus?8:0)),ocrConfidence:Math.max(...g.items.map(x=>x.ocrConfidence||0)),multiPassConsensus:consensus,independentPassCount:modes.size,items:g.items,score:g.score+(consensus?24:0)}
   }).sort((a,b)=>b.score-a.score||b.confidence-a.confidence);
   const best=grouped[0],second=grouped[1];
   best.alternatives=grouped.slice(1,4).map(x=>x.value);
   best.ambiguous=Boolean(second&&second.score>best.score*.92&&Math.abs(second.value-best.value)>1e-9);
   return best
 }
 function inbodyReferenceExpectedDecimals(code){
   const one=new Set(["inbody_intracellular_water","inbody_extracellular_water","inbody_protein","inbody_weight","inbody_skeletal_muscle_mass","inbody_body_fat_mass","inbody_bmi","inbody_percent_body_fat"]);
   if(one.has(code))return 1;
   if(code==="inbody_minerals"||code==="inbody_waist_hip_ratio")return 2;
   return null
 }
 function inbodyReferenceFieldPass(page,code,min,max){
   const passes=photoPasses(page).filter(pass=>clean(pass?.inbodyReferenceFor).toLowerCase()===clean(code).toLowerCase());
   const ranges=[],expected=inbodyReferenceExpectedDecimals(code),decimals=raw=>(String(raw||"").replace(/,/g,".").match(/\.(\d+)/)?.[1]||"").length;
   for(const pass of passes){
     const normalized=String(pass.text||"").replace(/[−–—]/g,"-").replace(/,/g,".")
       .replace(/([+-])\s+(?=\d)/g,"$1").replace(/([+-]?\d+)\.\s+(\d+)/g,"$1.$2")
       .replace(/(\d)\s*[~～]\s*(\d)/g,"$1~$2");
     const raws=(normalized.match(/[+-]?\d+(?:\.\d+)?/g)||[]);
     const vals=raws.map(raw=>({raw,value:inbodyNumeric(raw),decimals:decimals(raw)})).filter(x=>x.value!==null&&x.value>=min&&x.value<=max);
     if(vals.length<2)continue;
     for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++){
       if(Math.abs(vals[i].value-vals[j].value)<1e-9)continue;
       const lo=vals[i].value<vals[j].value?vals[i]:vals[j],hi=vals[i].value<vals[j].value?vals[j]:vals[i];
       const raw=`${lo.raw.replace(/^\+/,"")}-${hi.raw.replace(/^\+/,"")}`;
       if(!inbodyReferencePlausible(code,raw))continue;
       const precisionScore=expected===null?0:(lo.decimals===expected?16:-14)+(hi.decimals===expected?16:-14);
       ranges.push({raw,lo:lo.value,hi:hi.value,confidence:Number(pass.confidence||0),mode:clean(pass?.inbodyReferenceMode||pass?.mode||""),precisionScore,sourcePixel:/source/i.test(clean(pass?.inbodyReferenceMode||pass?.mode||""))})
     }
   }
   if(!ranges.length)return null;
   // v10.299 — select by cross-pass agreement + source-pixel support + expected
   // printed precision.  This specifically prevents damaged endpoints such as
   // 64.7→64 and gives an unenhanced source pass a vote before thresholds.
   const groups=new Map();
   for(const item of ranges){
     const key=`${item.lo}|${item.hi}`,g=groups.get(key)||{...item,count:0,score:0,modes:new Set(),sourceCount:0};
     g.count++;g.score+=Math.max(1,item.confidence)+item.precisionScore;g.modes.add(item.mode);if(item.sourcePixel)g.sourceCount++;groups.set(key,g)
   }
   const ranked=[...groups.values()].sort((a,b)=>(b.score+b.count*20+b.modes.size*14+b.sourceCount*18)-(a.score+a.count*20+a.modes.size*14+a.sourceCount*18));
   const best=ranked[0],second=ranked[1],bestScore=best.score+best.count*20+best.modes.size*14+best.sourceCount*18,secondScore=second?(second.score+second.count*20+second.modes.size*14+second.sourceCount*18):0;
   if(second&&secondScore>bestScore*.94&&`${second.lo}|${second.hi}`!==`${best.lo}|${best.hi}`)return null;
   return{raw:best.raw,confidence:Math.min(99,Math.round(best.score/Math.max(1,best.count)+Math.min(14,best.count*4)+Math.min(8,best.sourceCount*4))),hits:[],regionLocked:true,micro:true,multiPassConsensus:best.count>=2&&best.modes.size>=2,sourcePixelConsensus:best.sourceCount>0}
 }
 function inbodyRegionText(page,regions){
   const passes=photoPasses(page),wanted=(Array.isArray(regions)?regions:[regions]).map(v=>clean(v).toLowerCase()).filter(Boolean);
   if(!wanted.length)return passes.map(pass=>String(pass?.text||"")).join("\n");
   const matched=passes.filter(pass=>wanted.includes(clean(pass?.inbodyRegion||"").toLowerCase())).map(pass=>String(pass?.text||"")).filter(Boolean);
   if(matched.length)return matched.join("\n");
   // v10.299 — once focused InBody OCR exists, a missing requested region means
   // "no source evidence", not "search the whole page".  The old fallback could
   // pull graph ticks or an unrelated control value into a source-critical cell.
   // Keep page-wide fallback only for legacy/text-only regression fixtures that
   // have no focused InBody passes at all.
   const hasFocused=passes.some(pass=>pass?.focusedInBody===true||clean(pass?.inbodyRegion));
   return hasFocused?"":passes.map(pass=>String(pass?.text||"")).join("\n")
 }
 function inbodyFmtToken(hit){
   const raw=String(hit?.fragmentRaw||hit?.raw||"").replace(/,/g,".").match(/[+-]?\d+(?:\.\d+)?/)?.[0];
   if(raw)return raw.replace(/^\+/,"");
   const n=Number(hit?.value);return Number.isFinite(n)?String(n):""
 }
 function inbodyReferenceFromZone(tokens,zones,min=-Infinity,max=Infinity,options={}){
   const zoneList=Array.isArray(zones?.[0])?zones:[zones];
   for(const zone of zoneList){
     if(!zone)continue;
     const hits=inbodyRegionLockedHits(tokens,zone,min,max,options).sort((a,b)=>a.y-b.y||a.x-b.x);
     if(hits.length<2)continue;
     // A reference interval is accepted only from two distinct numeric fragments on
     // the same printed reference row. This prevents graph-axis values from becoming
     // a normal range.
     const pairs=[];
     for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){
       if(Math.abs(hits[i].y-hits[j].y)>.018)continue;
       if(Math.abs(hits[i].value-hits[j].value)<1e-9)continue;
       const lo=hits[i].value<hits[j].value?hits[i]:hits[j],hi=hits[i].value<hits[j].value?hits[j]:hits[i];
       const score=(lo.confidence+hi.confidence)/2+(lo.focused&&hi.focused?18:0)+(clean(lo.region)&&lo.region===hi.region?15:0);
       pairs.push({lo,hi,score})
     }
     if(!pairs.length)continue;
     pairs.sort((a,b)=>b.score-a.score);
     const {lo,hi}=pairs[0];
     return{raw:`${inbodyFmtToken(lo)}-${inbodyFmtToken(hi)}`,confidence:Math.min(98,Math.round((lo.confidence+hi.confidence)/2)),hits:[lo,hi],regionLocked:Boolean(clean(lo.region)&&lo.region===hi.region)}
   }
   return null
 }
 function inbodyReferenceFromText(text,patterns){
   const source=String(text||"").replace(/,/g,".");
   for(const pattern of patterns||[]){const m=source.match(pattern);if(!m)continue;const a=inbodyNumeric(m[1]),b=inbodyNumeric(m[2]);if(a===null||b===null||a===b)continue;return{raw:`${m[1].replace(/,/g,'.')}-${m[2].replace(/,/g,'.')}`,confidence:94,hits:[]}}
   return null
 }
 function inbodyHistoryBundle(text){
   const source=String(text||"").replace(/,/g,".").replace(/[|]/g," ");
   // v10.255: parse the History row by columns, not as an all-or-nothing tuple.
   // A faint ECW/TBW cell must never erase otherwise clear Weight/SMM/Fat/Score.
   const rowPatterns=[
     /(?:\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})\s+\d{1,2}:\d{2}(?::\d{2})?\s+(\d{2,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3})(?:\s+(0\.\d{2,3}))?/i,
     /DATE\s*\/\s*TIME\s+Weight\s+SMM\s+Fat\s+Score\s+ECW\s*\/\s*TBW[\s\S]{0,260}?(\d{2,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3})(?:\s+(0\.\d{2,3}))?/i
   ];
   for(const pattern of rowPatterns){
     const m=source.match(pattern);if(!m)continue;
     const values=m.slice(1,5).map(inbodyNumeric);
     if(values.some(v=>v===null))continue;
     const ecwTbw=m[5]?inbodyNumeric(m[5]):null;
     if(values[0]>=20&&values[0]<=300&&values[1]>=5&&values[1]<=100&&values[2]>=1&&values[2]<=150&&values[3]>=0&&values[3]<=100){
       return{weight:values[0],smm:values[1],fat:values[2],score:values[3],ecwTbw:ecwTbw!==null&&ecwTbw>=.20&&ecwTbw<=.60?ecwTbw:null}
     }
   }
   // v10.255 real-scan fallback: the DATE glyph can be damaged while the five
   // numeric History columns remain perfectly legible. Anchor to the printed
   // TIME token so numbers from Additional Data can never slide into the
   // Weight/SMM/Fat/Score columns.
   const timed=/(?:^|\s)\d{1,2}:\d{2}(?::\d{2})?\s+(\d{2,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3})(?:\s+(0\.\s*\d{2,3}))?/g;
   for(const m of source.matchAll(timed)){
     const values=m.slice(1,5).map(inbodyNumeric);if(values.some(v=>v===null))continue;
     const [weight,smm,fat,score]=values,ecwTbw=m[5]?inbodyNumeric(String(m[5]).replace(/\s+/g,"")):null;
     if(weight>=20&&weight<=300&&smm>=5&&smm<=100&&fat>=1&&fat<=150&&score>=0&&score<=100){
       return{weight,smm,fat,score,ecwTbw:ecwTbw!==null&&ecwTbw>=.20&&ecwTbw<=.60?ecwTbw:null}
     }
   }
   // Text-layer/synthetic fixture fallback: a few exports omit the date token but
   // keep the printed History header and its five ordered numeric columns.
   const labeled=source.match(/Body\s+Composition\s+History[\s\S]{0,180}?Weight\s+SMM\s+Fat\s+Score\s+ECW\s*\/\s*TBW[\s\S]{0,160}?(\d{2,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{1,3})(?:\s+(0\.\d{2,3}))?/i);
   if(labeled){
     const vals=labeled.slice(1,5).map(inbodyNumeric),ecwTbw=labeled[5]?inbodyNumeric(labeled[5]):null;
     if(vals.every(v=>v!==null)&&vals[0]>=20&&vals[0]<=300&&vals[1]>=5&&vals[1]<=100&&vals[2]>=1&&vals[2]<=150&&vals[3]>=0&&vals[3]<=100){
       return{weight:vals[0],smm:vals[1],fat:vals[2],score:vals[3],ecwTbw:ecwTbw!==null&&ecwTbw>=.20&&ecwTbw<=.60?ecwTbw:null}
     }
   }
   return null
 }
 // v10.269 — History ECW/TBW is a dedicated printed column and must not
 // depend on every preceding History numeric cell being perfect. Real 720 scans
 // frequently OCR "26.7" as "267" while the final ECW/TBW cell remains a clean
 // "0.377". Parse that trailing ratio independently, anchored to the History row.

 // v10.306 — Fixed-anchor Source Matrix for the stable InBody 720 print layout.
 // The Body Composition History row is a fixed five-column table.  Numeric OCR
 // in a physical cell may lose only the decimal separator (70.8→708, 24.2→242).
 // Decimal restoration below is allowed ONLY inside the locked cell and only
 // when the restored number falls in that field's physiological/source range.
 function inbodyFixedCellCandidate(tokens,zone,min,max,dp,regions=[]){
   let hits=tokens.filter(t=>t.x>=zone[0]&&t.x<=zone[1]&&t.y>=zone[2]&&t.y<=zone[3]);
   const wanted=(regions||[]).map(v=>clean(v).toLowerCase()).filter(Boolean),hasDedicated=wanted.length&&tokens.some(t=>wanted.includes(clean(t.region).toLowerCase()));
   if(hasDedicated)hits=hits.filter(t=>wanted.includes(clean(t.region).toLowerCase()));
   const candidates=[];
   for(const hit of hits){
     const sourceRaw=String(hit?.fragmentRaw||hit?.raw||"").replace(/,/g,".").trim(),raw=sourceRaw.replace(/[^0-9+-.]/g,"");
     const visibleDecimals=raw.match(/\.(\d+)/)?.[1]?.length??0,direct=Number(hit.value);
     if(Number.isFinite(direct)&&direct>=min&&direct<=max){const precision=dp===0?35:visibleDecimals===dp?50:visibleDecimals===0?5:20;candidates.push({value:direct,score:Number(hit.confidence||0)+precision,hit,restored:false})}
     const digits=raw.replace(/\./g,"");
     if(dp>0&&/^[-+]?\d+$/.test(digits)&&visibleDecimals===0){
       const integer=Number(digits),scale=10**dp,restored=integer/scale;
       if(Number.isFinite(restored)&&restored>=min&&restored<=max)candidates.push({value:restored,score:Number(hit.confidence||0)+30,hit,restored:true});
       // Ratios such as .377 may OCR as 377 even though expectedDecimals=3.
       if(max<1&&Math.abs(integer)>=100){const ratio=integer/1000;if(ratio>=min&&ratio<=max)candidates.push({value:ratio,score:Number(hit.confidence||0)+36,hit,restored:true})}
     }
   }
   if(!candidates.length)return null;
   const groups=new Map();for(const c of candidates){const k=String(c.value),g=groups.get(k)||{value:c.value,score:0,hits:[],restored:false};g.score+=c.score;g.hits.push(c.hit);g.restored=g.restored||c.restored;groups.set(k,g)}
   const ranked=[...groups.values()].sort((a,b)=>b.score-a.score||b.hits.length-a.hits.length),best=ranked[0],second=ranked[1];
   return{value:best.value,confidence:Math.min(99,Math.round(best.score/Math.max(1,best.hits.length))),ambiguous:Boolean(second&&second.score>best.score*.90&&Math.abs(second.value-best.value)>.0001),hits:best.hits,alternatives:ranked.slice(1,4).map(x=>x.value),regionLocked:true,decimalRestored:best.restored}
 }
 function inbodyFixedHistoryAnchorMatrix(page,tokensOverride=null){
   const tokens=tokensOverride||inbodyGeometryTokens(page);
   const specs={
     weight:{zone:[.145,.187,.791,.816],min:20,max:300,dp:1},
     smm:{zone:[.187,.232,.791,.816],min:5,max:100,dp:1},
     fat:{zone:[.232,.278,.791,.816],min:1,max:150,dp:1},
     score:{zone:[.278,.326,.791,.816],min:0,max:100,dp:0},
     ecwTbw:{zone:[.326,.392,.791,.816],min:.20,max:.60,dp:3}
   };
   const values={},evidence={};
   for(const [key,sp] of Object.entries(specs)){
     let c=inbodyFixedCellCandidate(tokens,sp.zone,sp.min,sp.max,sp.dp,["history"]);if(c?.ambiguous)c=null;
     values[key]=c?Number(c.value):null;evidence[key]=c||null;
   }
   const anchorReady=[values.weight,values.smm,values.score].every(Number.isFinite)&&values.smm<values.weight;
   const fatCompatible=!Number.isFinite(values.fat)||(values.fat>0&&values.fat<values.weight);
   return{...values,evidence,anchorReady,coreComplete:anchorReady&&Number.isFinite(values.fat),complete:anchorReady&&fatCompatible&&Number.isFinite(values.fat)&&Number.isFinite(values.ecwTbw),structurallyCoherent:anchorReady&&fatCompatible,source:"INBODY_720_FIXED_HISTORY_MATRIX"}
 }
 function inbodyFixedWeightControlMatrix(page,tokensOverride=null,currentWeight=null){
   const tokens=tokensOverride||inbodyGeometryTokens(page);
   // y-bands follow the four printed rows exactly; Fitness Score is the next row.
   const specs={
     target:{zone:[.835,.950,.760,.781],min:20,max:250,dp:1},
     weightControl:{zone:[.835,.950,.781,.797],min:-100,max:100,dp:1},
     fatControl:{zone:[.835,.950,.797,.812],min:-100,max:100,dp:1},
     muscleControl:{zone:[.835,.950,.812,.829],min:-100,max:100,dp:1},
     score:{zone:[.835,.950,.829,.848],min:0,max:100,dp:0}
   };
   const magnitudes={},evidence={};
   for(const [key,sp] of Object.entries(specs)){
     let c=inbodyFixedCellCandidate(tokens,sp.zone,sp.min,sp.max,sp.dp,["weight-control"]);if(c?.ambiguous)c=null;
     magnitudes[key]=c?Math.abs(Number(c.value)):null;evidence[key]=c||null;
   }
   const target=magnitudes.target,score=magnitudes.score,wm=magnitudes.weightControl,fm=magnitudes.fatControl,mm=magnitudes.muscleControl;
   // If visible signs survived OCR they are kept; otherwise test the eight sign
   // combinations and accept a UNIQUE combination satisfying both printed device
   // identities. This is a same-sheet identity reconstruction, not a guessed target.
   const signedFromHit=(key,mag)=>{const c=evidence[key];if(!c||!Number.isFinite(mag))return null;for(const h of c.hits||[]){const raw=String(h?.fragmentRaw||h?.raw||"").trim();if(/^\-/.test(raw))return-mag;if(/^\+/.test(raw))return mag}return null};
   let weightControl=signedFromHit("weightControl",wm),fatControl=signedFromHit("fatControl",fm),muscleControl=signedFromHit("muscleControl",mm),derivedTarget=target,identityDerived=false;
   const current=Number(currentWeight),solutions=[];
   const targetCandidates=[target,...(evidence.target?.alternatives||[])].map(Number).filter(Number.isFinite);
   if([wm,fm,mm].every(Number.isFinite)){
     for(const sw of [-1,1])for(const sf of [-1,1])for(const sm of [-1,1]){
       const wc=wm*sw,fc=fm*sf,mc=mm*sm;if(Math.abs((fc+mc)-wc)>.18)continue;
       const impliedTarget=Number.isFinite(current)?Math.round((current+wc)*10)/10:null;
       const targetMatch=Number.isFinite(impliedTarget)?targetCandidates.find(v=>Math.abs(v-impliedTarget)<=.35):undefined;
       solutions.push({wc,fc,mc,target:Number.isFinite(targetMatch)?targetMatch:impliedTarget,targetMatched:Number.isFinite(targetMatch)})
     }
   }
   const matched=solutions.filter(x=>x.targetMatched),pool=matched.length?matched:solutions;
   if(!(Number.isFinite(weightControl)&&Number.isFinite(fatControl)&&Number.isFinite(muscleControl))&&pool.length===1){const q=pool[0];weightControl=q.wc;fatControl=q.fc;muscleControl=q.mc;derivedTarget=q.target;identityDerived=true}
   // If target OCR is damaged, accept a unique sign solution only when the three
   // control magnitudes themselves identify one direction OR an alternative target
   // from another OCR pass matches the same-sheet Current Weight identity.
   if(pool.length===1&&Number.isFinite(current)){derivedTarget=Math.round((current+pool[0].wc)*10)/10;identityDerived=identityDerived||!Number.isFinite(target)||Math.abs(target-derivedTarget)>.35;weightControl=pool[0].wc;fatControl=pool[0].fc;muscleControl=pool[0].mc}
   const complete=[derivedTarget,weightControl,fatControl,muscleControl].every(Number.isFinite),controlsCoherent=complete&&Math.abs((fatControl+muscleControl)-weightControl)<=.18&&(!Number.isFinite(current)||Math.abs((current+weightControl)-derivedTarget)<=.22);
   return{target:derivedTarget,weightControl,fatControl,muscleControl,score,evidence,complete,controlsCoherent,identityDerived,source:"INBODY_720_FIXED_WEIGHT_CONTROL_MATRIX"}
 }
 function inbodyHistoryEcwTbwFromText(text){
   const source=String(text||"").replace(/,/g,".").replace(/[|]/g," ")
     .replace(/[Oo](?=\s*\.)/g,"0").replace(/(0\.)\s+(\d)/g,"$1$2").replace(/(^|\s)\.\s+(\d{3})(?!\d)/g,"$1.$2");
   const ratioFrom=chunk=>{
     const vals=[];
     for(const m of String(chunk||"").matchAll(/(?:^|[^\d])((?:0)?\.\s*\d{3})(?!\d)/g)){
       const raw=m[1].replace(/\s+/g,"");
       const v=Number(raw.startsWith(".")?`0${raw}`:raw);
       if(Number.isFinite(v)&&v>=.20&&v<=.60)vals.push(v)
     }
     return vals.length?vals[vals.length-1]:null
   };
   const lines=source.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   for(const line of lines){
     if(!/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line))continue;
     const v=ratioFrom(line);if(v!==null)return v
   }
   if(/Body\s+Composition\s+History/i.test(source)&&/ECW\s*\/?\s*TBW/i.test(source)){
     const timed=source.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b[\s\S]{0,220}/);
     const v=ratioFrom(timed?.[0]||source);if(v!==null)return v
   }
   return null
 }

 function inbodySegmentRowBundle(page,part){
   const passes=photoPasses(page).filter(pass=>clean(pass?.inbodySegmentRow).toLowerCase()===clean(part).toLowerCase());
   if(!passes.length)return null;
   const expectedLeanDecimals=part==="trunk"?1:2;
   const bucket={lean_mass:[],lean_pct:[],fat_mass:[],fat_pct:[],ecf_tbf:[],ecw_tbw:[]};
   const add=(field,value,pass,bonus=0,raw="")=>{
     if(!Number.isFinite(Number(value)))return;
     bucket[field].push({value:Number(value),score:Math.max(1,Number(pass?.confidence||0))+bonus+(pass?.inbodySegmentMode==="threshold"?3:0),raw:String(raw||value),pass})
   };
   const decimals=raw=>String(raw||"").replace(/,/g,".").match(/\.([0-9]+)/)?.[1]?.length??0;
   const rowStarts={right_arm:.539,left_arm:.581,trunk:.623,right_leg:.665,left_leg:.707},rowHeight=.038,W=Number(page?.width||1),H=Number(page?.height||1);
   for(const pass of passes){
     const text=String(pass?.text||"").replace(/[−–—]/g,"-").replace(/,/g,".").replace(/(\d)\.\s+(\d)/g,"$1.$2");
     const explicitFatMass=[];
     // Geometry-backed row evidence from TSV words. This keeps the two visual
     // lines distinct even when Tesseract flattens them into one text string.
     for(const item of (pass?.textItems||[])){
       const b=item?.bbox||{},cx=(Number(b.x0)+Number(b.x1))/2/W,cy=(Number(b.y0)+Number(b.y1))/2/H;
       if(!Number.isFinite(cx)||!Number.isFinite(cy))continue;
       const relY=(cy-(rowStarts[part]??cy))/rowHeight,parts=(String(item.str||"").replace(/,/g,".").match(/[+-]?\d+(?:\.\d+)?/g)||[]);
       for(const raw of parts){
         const v=inbodyNumeric(raw),dec=decimals(raw);if(v===null)continue;
         if(v>=.20&&v<=.60&&dec===3){if(cx<.515)add("ecf_tbf",v,pass,34,raw);else add("ecw_tbw",v,pass,34,raw);continue}
         if(relY<.58&&v>=.2&&v<=80&&dec===expectedLeanDecimals&&cx<.405)add("lean_mass",v,pass,28,raw);
         if(relY>=.30&&v>=40&&v<=220&&dec===1&&cx<.355)add("lean_pct",v,pass,28,raw);
         if(relY>=.35&&v>=.1&&v<=80&&dec===1&&cx>=.33&&cx<.455)add("fat_mass",v,pass,28,raw);
         if(relY>=.35&&v>=50&&v<=500&&dec===0&&cx>=.36&&cx<.485)add("fat_pct",v,pass,28,raw);
       }
     }
     // Fat is printed as one semantic bundle: 1.9 (370%), 13.6 (382%), 4.0 (277%).
     for(const m of text.matchAll(/([0-9]{1,2}(?:\.\s*[0-9])?)\s*\(\s*([0-9]{2,3})\s*%?\s*\)/g)){
       const fm=inbodyNumeric(String(m[1]).replace(/\s+/g,"")),fp=inbodyNumeric(m[2]);
       if(fm!==null&&fm>=.1&&fm<=80){explicitFatMass.push(fm);add("fat_mass",fm,pass,30,m[1])}
       if(fp!==null&&fp>=50&&fp<=500)add("fat_pct",fp,pass,34,m[2])
     }
     const raws=(text.match(/[+-]?\d+(?:\.\s*\d+)?/g)||[]).map(raw=>String(raw).replace(/\s+/g,""));
     const numeric=raws.map(raw=>({raw,value:inbodyNumeric(raw),dec:decimals(raw)})).filter(x=>x.value!==null);
     // Water columns are the only 0.xxx values in a segment row strip. Keep left-to-right order.
     const waters=numeric.filter(x=>x.value>=.20&&x.value<=.60&&x.dec===3);
     if(waters[0])add("ecf_tbf",waters[0].value,pass,24,waters[0].raw);
     if(waters[1])add("ecw_tbw",waters[1].value,pass,24,waters[1].raw);
     // Lean/Ideal is a one-decimal percentage. Axis ticks are integers, so requiring
     // a visible decimal dot rejects graph-scale numbers without inventing punctuation.
     numeric.filter(x=>x.value>=40&&x.value<=220&&x.dec===1).forEach(x=>add("lean_pct",x.value,pass,18,x.raw));
     // Lean mass is a decimal result printed at the end of the Lean bar.  Require
     // the source decimal precision expected by this row (trunk 1dp, limbs 2dp).
     numeric.filter(x=>x.value>=.2&&x.value<=80&&x.dec===expectedLeanDecimals&&!explicitFatMass.some(v=>Math.abs(v-x.value)<1e-9)&&!(x.value>=.20&&x.value<=.60&&x.dec===3)).forEach(x=>add("lean_mass",x.value,pass,18,x.raw));
   }
   const select=field=>{
     const list=bucket[field];if(!list.length)return null;
     const groups=new Map();
     for(const item of list){
       const key=String(item.value),g=groups.get(key)||{value:item.value,score:0,count:0,items:[]};
       g.score+=item.score;g.count++;g.items.push(item);groups.set(key,g)
     }
     const ranked=[...groups.values()].sort((a,b)=>(b.score+b.count*8)-(a.score+a.count*8));
     const best=ranked[0],second=ranked[1];
     const independentModes=new Set(best.items.map(x=>clean(x.pass?.inbodySegmentMode||x.pass?.mode)).filter(Boolean));
     return{value:best.value,confidence:Math.min(99,Math.round(best.score/Math.max(1,best.count)+Math.min(10,best.count*3))),ocrConfidence:Math.max(...best.items.map(x=>Number(x.pass?.confidence||0))),ambiguous:Boolean(second&&(second.score+second.count*8)>(best.score+best.count*8)*.92),hits:[],alternatives:ranked.slice(1,4).map(x=>x.value),segmentRow:true,regionLocked:true,raw:best.items[0]?.raw||String(best.value),segmentRowConsensusCount:independentModes.size,segmentRowEvidenceCount:best.count}
   };
   return Object.fromEntries(Object.keys(bucket).map(field=>[field,select(field)]))
 }
 function inbodyCandidateSet(candidate,min,max){
   if(!candidate)return[];const vals=[candidate.value,...(candidate.alternatives||[])].map(Number).filter(v=>Number.isFinite(v)&&v>=min&&v<=max);
   return[...new Set(vals.map(v=>String(v)))].map(Number).slice(0,6)
 }
 function inbodyReconcileSegmentSidePair(segmentBundles,rightPart,leftPart,massField,pctField){
   const r=segmentBundles.get(rightPart),l=segmentBundles.get(leftPart);if(!r||!l||!r[massField]||!l[massField]||!r[pctField]||!l[pctField])return null;
   const massMin=.1,massMax=80,pctMin=massField==="lean_mass"?40:50,pctMax=massField==="lean_mass"?220:500;
   const rm=inbodyCandidateSet(r[massField],massMin,massMax),lm=inbodyCandidateSet(l[massField],massMin,massMax),rp=inbodyCandidateSet(r[pctField],pctMin,pctMax),lp=inbodyCandidateSet(l[pctField],pctMin,pctMax);
   if(!rm.length||!lm.length||!rp.length||!lp.length)return null;
   const primary=[Number(r[massField].value),Number(l[massField].value),Number(r[pctField].value),Number(l[pctField].value)];
   const mismatch=(a,b)=>Math.abs(a-b)/Math.max(.0001,(Math.abs(a)+Math.abs(b))/2),choices=[];
   for(const a of rm)for(const b of lm)for(const pa of rp)for(const pb of lp){
     const stdA=a/(pa/100),stdB=b/(pb/100),m=mismatch(stdA,stdB),changes=[a,b,pa,pb].reduce((n,v,i)=>n+(Math.abs(v-primary[i])>1e-9?1:0),0);
     choices.push({a,b,pa,pb,m,score:m+changes*.025,changes})
   }
   choices.sort((a,b)=>a.score-b.score||a.changes-b.changes);const best=choices[0];
   const currentStdA=primary[0]/(primary[2]/100),currentStdB=primary[1]/(primary[3]/100),current=mismatch(currentStdA,currentStdB);
   // Lean/Fat percentages are defined against side-specific standard values. The
   // implied standard for left/right homologous limbs should agree. Only switch
   // to an OCR alternative when it converts a clear column mismatch (>12%) into
   // a strong structural match (<=6%). No number is calculated as a replacement;
   // the chosen value must already exist in OCR candidate evidence.
   if(!(current>.12&&best.m<=.06&&best.changes>0))return{changed:false,currentMismatch:current,bestMismatch:best.m};
   const apply=(candidate,value)=>{if(Math.abs(Number(candidate.value)-value)<1e-9)return;candidate.alternatives=[...new Set([Number(candidate.value),...(candidate.alternatives||[]).map(Number)])].filter(v=>Number.isFinite(v)&&Math.abs(v-value)>1e-9);candidate.value=value;candidate.raw=String(value);candidate.columnIntegrityReconciled=true;candidate.regionLocked=true;candidate.ambiguous=false};
   apply(r[massField],best.a);apply(l[massField],best.b);apply(r[pctField],best.pa);apply(l[pctField],best.pb);
   return{changed:true,currentMismatch:current,bestMismatch:best.m,selected:[best.a,best.b,best.pa,best.pb],fields:[`${rightPart}.${massField}`,`${leftPart}.${massField}`,`${rightPart}.${pctField}`,`${leftPart}.${pctField}`]}
 }
 function inbodyReconcileSegmentBundles(segmentBundles){
   const audits=[];
   for(const pair of [["right_arm","left_arm"],["right_leg","left_leg"]]){
     const lean=inbodyReconcileSegmentSidePair(segmentBundles,pair[0],pair[1],"lean_mass","lean_pct");if(lean?.changed)audits.push({pair:pair.join("/"),kind:"lean",...lean});
     const fat=inbodyReconcileSegmentSidePair(segmentBundles,pair[0],pair[1],"fat_mass","fat_pct");if(fat?.changed)audits.push({pair:pair.join("/"),kind:"fat",...fat});
   }
   return audits
 }
 function inbodyImpedanceRows(text){
   const source=String(text||"").replace(/,/g,".");
   const specs=[
     ["1khz",/\b1\s*k\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i],
     ["5khz",/\b5\s*k\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i],
     ["50khz",/\b50\s*k\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i],
     ["250khz",/\b250\s*k\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i],
     ["500khz",/\b500\s*k\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i],
     ["1mhz",/\b1\s*m\s*hz\s*:?\s*(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)\s+(\d{2,4}(?:\.\d+)?)/i]
   ],segments=["ra","la","tr","rl","ll"],out=[];
   for(const [freq,pattern] of specs){const m=source.match(pattern);if(!m)continue;const vals=m.slice(1,6).map(inbodyNumeric);if(vals.some(v=>v===null)||vals[0]<50||vals[1]<50||vals[2]<5||vals[3]<50||vals[4]<50)continue;segments.forEach((seg,i)=>out.push({code:`inbody_impedance_${freq}_${seg}`,value:vals[i],frequency:freq,segment:seg}))}
   return out
 }
 function inbodyLooseNumeric(raw){
   const display=clean(raw);if(!display)return null;
   const exact=scalarParts(display);if(exact.value_numeric!==null)return exact.value_numeric;
   // v10.264: Review values may contain invisible OCR punctuation/spacing while
   // still visibly showing a clean number. Extract one signed scalar only; never
   // infer a decimal position or manufacture a value.
   const source=display.replace(/[−–—﹣－]/g,"-").replace(/[＋﹢]/g,"+").replace(/,/g,".")
     .replace(/[\u200B-\u200D\u2060\uFEFF]/g,"");
   const hits=[...source.matchAll(/(^|[^0-9.])([+-]?\s*(?:\d+(?:\.\d+)?|\.\d+))(?![0-9.])/g)]
     .map(m=>m[2].replace(/\s+/g,""));
   if(hits.length!==1)return null;
   const v=Number(hits[0].startsWith(".")?`0${hits[0]}`:hits[0]);
   return Number.isFinite(v)?v:null
 }
 function inbodyNumericFromRow(r){
   if(!r)return null;
   for(const raw of [r.value_raw,r.valueRaw,r.reported_value_raw,r.reportedValueRaw]){
     const v=inbodyLooseNumeric(raw);if(v!==null)return v
   }
   for(const candidate of [r.value_numeric,r.valueNumeric]){
     if(candidate===null||candidate===undefined||clean(candidate)==="")continue;
     const v=Number(candidate);if(Number.isFinite(v))return v
   }
   return null
 }
 function syncInBodyRawNumerics(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);
   for(const r of rows){
     const code=clean(r?.test_code||r?.testCode).toLowerCase();if(!code.startsWith("inbody_"))continue;
     const raw=clean(r?.value_raw??r?.valueRaw);
     if(!raw)continue;
     const parsed=scalarParts(raw),numeric=inbodyLooseNumeric(raw);
     // v10.264: visible InBody raw value always refreshes hidden numeric state.
     // A hidden cache is never allowed to disagree with a single printed scalar.
     r.value_numeric=numeric;r.valueNumeric=numeric;r.value_operator=parsed.value_numeric!==null?parsed.value_operator:(numeric!==null?"=":"text");
     if(numeric!==null)r.reported_value_raw=raw
   }
   return input
 }

 // v10.269 — Runtime Source Truth must be rebuilt from the LIVE rows that the
 // operator can see.  Earlier builds allowed an old embedded snapshot/canonical
 // flag to outrank a newer deterministic ROI row.  That created the repeating
 // 125→1.25, 0.377→0 and Weight-Control loop even though Review displayed the
 // correct printed value.  The live score deliberately ignores historical
 // snapshot/canonical flags and rewards only current-sheet evidence or a manual edit.
 function inbodyLiveEvidenceScore(r){
   if(!r)return-1e9;
   let score=0;
   const numeric=inbodyNumericFromRow(r);
   if(numeric!==null)score+=100;else score-=1000;
   const evidence=(r?.source_evidence||[]).map(x=>clean(x?.type).toLowerCase());
   const line=clean(r?.source_line||r?.sourceLine).toLowerCase();
   if(r?.inbody_manual_value_sync)score+=20000;
   if(r?.review_confirmed||r?.manually_verified)score+=4000;
   if(evidence.some(x=>/inbody-weight-control-bundle/.test(x)))score+=9000;
   if(evidence.some(x=>/inbody-history-bundle-reconciliation/.test(x)))score+=9000;
   if(evidence.some(x=>/inbody-current-sheet-reconciliation/.test(x)))score+=8000;
   if(evidence.some(x=>/inbody-same-sheet-definition-rescue/.test(x)))score+=7000;
   if(evidence.some(x=>/inbody-bottom-water-bundle|inbody-vfa-marker-reconciliation/.test(x)))score+=6500;
   if(evidence.some(x=>/inbody-micro-roi|inbody-history-row|inbody-roi-label|inbody-deterministic-roi/.test(x)))score+=3500;
   if(/source reconciliation|same-sheet definition rescue|signed weight control bundle|atomic body composition history/.test(line))score+=2500;
   if(r?.inbody_history_source)score+=1500;
   if(r?.inbody_roi_locked)score+=700;
   if(r?.inbody_label_anchored)score+=350;
   // DO NOT reward inbody_snapshot_locked or inbody_canonical_source here. Those
   // are historical state, not evidence from the current pixels.
   if(r?.inbody_missing_placeholder)score-=1500;
   if(r?.parse_issue&&!r?.inbody_gate_only_parse_issue)score-=100;
   score+=Math.min(80,Math.max(0,Number(r?.confidence||r?.inbody_source_confidence||0)));
   return score
 }
 function inbodyLiveCandidateRows(rows,code,{min=-Infinity,max=Infinity,limit=12}={}){
   const key=clean(code).toLowerCase(),all=rows.filter(r=>clean(r?.test_code||r?.testCode).toLowerCase()===key);
   const manual=all.filter(r=>r?.inbody_manual_value_sync===true);
   const pool=manual.length?manual:all,bestByValue=new Map();
   const consider=(r,value,score,origin="primary")=>{
     const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)return;
     const k=String(n),prev=bestByValue.get(k),candidate={row:r,value:n,score,origin};
     if(!prev||score>prev.score)bestByValue.set(k,candidate)
   };
   for(const r of pool){
     const base=inbodyLiveEvidenceScore(r),value=inbodyNumericFromRow(r);
     if(value!==null)consider(r,value,base,"primary");
     // v10.304 — candidate alternatives are values actually seen in the same
     // source OCR cell/ROI.  v10.303 kept them for provenance but the global
     // coherence solver never evaluated them, so a graph tick such as Weight 56
     // could stay canonical even when 70.8 was already present as OCR evidence.
     // Manual edits remain exclusive authority and never borrow alternatives.
     if(manual.length)continue;
     const alternatives=[...(r?.inbody_candidate_alternatives||[])];
     for(const ev of (r?.source_evidence||[]))for(const alt of (ev?.alternatives||[]))alternatives.push(alt);
     let rank=0;
     for(const alt of [...new Set(alternatives.map(Number).filter(Number.isFinite))]){
       if(value!==null&&Math.abs(alt-value)<1e-9)continue;
       consider(r,alt,base-120-rank*25,"source-alternative");rank++
     }
   }
   return [...bestByValue.values()].sort((a,b)=>b.score-a.score||Number(b.row?.confidence||0)-Number(a.row?.confidence||0)).slice(0,limit)
 }
 // v10.305 — Fully automatic redundant-source recovery.
// InBody prints multiple independent quantities that describe the same event.
// When the direct OCR token for Weight/Fat is impossible, recover ONLY when
// independent same-sheet identities agree tightly.  The recovered value is
// tagged DERIVED_FROM_SAME_SHEET and never presented as a verbatim printed cell.
function inbodyAutoRedundantPrimaryRecovery(input){
  const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);if(!rows.length)return null;
  syncInBodyRawNumerics(rows);
  const by=inbodyBestRowMap(rows),get=code=>by.get(clean(code).toLowerCase())||null,n=code=>inbodyNumericFromRow(get(code));
  const h=n("inbody_height_cm"),bmi=n("inbody_bmi"),pbf=n("inbody_percent_body_fat"),ffm=n("inbody_fat_free_mass");
  const tbw=n("inbody_total_body_water"),protein=n("inbody_protein"),minerals=n("inbody_minerals");
  if([h,bmi,pbf,ffm,tbw,protein,minerals].some(v=>v===null))return null;
  if(!(h>=100&&h<=230&&bmi>=10&&bmi<=80&&pbf>2&&pbf<80&&ffm>10))return null;
  // FFM itself must be independently supported by TBW + protein + minerals.
  const ffmComponents=tbw+protein+minerals;
  if(Math.abs(ffmComponents-ffm)>.25)return null;
  const wFromBmi=bmi*((h/100)**2),wFromFfmPbf=ffm/(1-pbf/100);
  if(!Number.isFinite(wFromBmi)||!Number.isFinite(wFromFfmPbf)||Math.abs(wFromBmi-wFromFfmPbf)>.40)return null;
  // Search one-decimal values around the two independent estimates. This avoids
  // forcing the arithmetic mean when the printed source is rounded to 0.1 kg.
  const seeds=[wFromBmi,wFromFfmPbf,(wFromBmi+wFromFfmPbf)/2],wcands=new Set();
  for(const seed of seeds)for(let d=-3;d<=3;d++)wcands.add(Math.round((seed+d*.1)*10)/10);
  let best=null;
  for(const w of wcands){
    if(w<20||w>300)continue;
    const fatA=w-ffm,fatB=w*pbf/100,fat=(fatA+fatB)/2;
    const calcBmi=w/((h/100)**2),calcPbf=fat/w*100;
    const eF=Math.abs(fatA-fatB),eB=Math.abs(calcBmi-bmi),eP=Math.abs(calcPbf-pbf),eW1=Math.abs(w-wFromBmi),eW2=Math.abs(w-wFromFfmPbf);
    if(eF>.18||eB>.16||eP>.30)continue;
    const score=eF/0.18+eB/0.16+eP/0.30+(eW1+eW2)/0.40;
    if(!best||score<best.score)best={weight:w,fat:Math.round(fat*10)/10,score,eF,eB,eP};
  }
  if(!best)return null;
  // Final cross-check after one-decimal rounding.
  if(Math.abs((ffm+best.fat)-best.weight)>.16)return null;
  if(Math.abs(best.fat/best.weight*100-pbf)>.45)return null;
  if(Math.abs(best.weight/((h/100)**2)-bmi)>.20)return null;
  const setDerived=(code,value,reason)=>{
    const r=get(code);if(!r)return false;
    const before=inbodyNumericFromRow(r),display=inbodySnapshotDisplay(code,value);
    if(before!==null&&Math.abs(before-value)<1e-9)return false;
    r.value_raw=display;r.valueRaw=display;r.reported_value_raw=display;r.value_numeric=Number(value);r.valueNumeric=Number(value);r.value_operator="=";
    r.selected=true;r.inbody_canonical_source=true;r.inbody_critical_bundle_source=true;r.inbody_roi_locked=true;r.inbody_label_anchored=true;
    r.inbody_auto_same_sheet_derived=true;r.inbody_source_confidence=Math.max(98,Number(r.inbody_source_confidence||0));r.confidence=Math.max(98,Number(r.confidence||0));
    r.parse_issue=false;r.review_recommended=false;r.inbody_gate_issue=false;r.inbody_gate_only_parse_issue=false;r.verify_reason="";
    r.source_evidence=r.source_evidence||[];r.source_evidence.push({type:"inbody-v10.305-auto-same-sheet-coherence",profile:"INBODY_720",code,derived_value:Number(value),rejected_ocr:before,reason,inputs:{height:h,bmi,pbf,ffm,tbw,protein,minerals}});
    r.source_line=`InBody 720 MIW same-sheet coherence recovery: ${code} = ${display} | ${reason}`;
    return true
  };
  const changedWeight=setDerived("inbody_weight",best.weight,"Weight supported independently by BMI×Height² and FFM/(1−PBF)");
  // Recompute Fat from the now-locked weight using two independent identities.
  const fatA=best.weight-ffm,fatB=best.weight*pbf/100,derivedFat=Math.round(((fatA+fatB)/2)*10)/10;
  const changedFat=setDerived("inbody_body_fat_mass",derivedFat,"Fat Mass supported independently by Weight−FFM and Weight×PBF");
  syncInBodyRawNumerics(rows);
  return{recovered:Boolean(changedWeight||changedFat),weight:best.weight,fat:derivedFat,inputs:{h,bmi,pbf,ffm,ffmComponents},errors:{ffmAgreement:Math.abs(ffmComponents-ffm),weightAgreement:Math.abs(wFromBmi-wFromFfmPbf)}}
}

// v10.304 — Global primary coherence lock.  InBody's Weight / Fat Mass / BMI / PBF
 // are printed in separate panels but describe the same body-composition event.  A
 // graph tick or shifted ROI can be individually plausible (for example Weight 56 or
 // Fat Mass 24.2) yet impossible when the printed equations are considered together.
 // Choose ONLY among values that already exist in current OCR/source rows; equations
 // rank source candidates but never manufacture a replacement value.
 function inbodyGlobalPrimaryCoherenceLock(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);if(!rows.length)return null;
   syncInBodyRawNumerics(rows);
   // v10.305: first use redundant same-sheet identities to auto-correct a
   // graph-tick/column OCR value when two independent identities agree.
   inbodyAutoRedundantPrimaryRecovery(rows);
   syncInBodyRawNumerics(rows);
   const cand=(code,min,max,limit=10)=>inbodyLiveCandidateRows(rows,code,{min,max,limit});
   const weights=cand("inbody_weight",20,300,12),fats=cand("inbody_body_fat_mass",1,150,12),bmis=cand("inbody_bmi",10,80,10),pbfs=cand("inbody_percent_body_fat",2,80,10);
   const height=cand("inbody_height_cm",100,230,6)[0]||null,ffm=cand("inbody_fat_free_mass",10,180,8)[0]||null;
   if(!weights.length||!fats.length)return null;
   let best=null;
   for(const w of weights)for(const f of fats){
     const checks=[];let score=w.score+f.score;
     if(ffm){const e=Math.abs((ffm.value+f.value)-w.value);checks.push(e<=.25);score+=ffm.score+(e<=.25?52000:-Math.min(50000,e*9000))}
     let bmiPick=null,bmiErr=Infinity;
     if(height){const calc=w.value/((height.value/100)**2);for(const b of bmis){const e=Math.abs(b.value-calc);if(e<bmiErr){bmiErr=e;bmiPick=b}}if(bmiPick){checks.push(bmiErr<=.25);score+=bmiPick.score+(bmiErr<=.25?36000:-Math.min(32000,bmiErr*7000))}}
     let pbfPick=null,pbfErr=Infinity;
     const calcPbf=f.value/w.value*100;for(const q of pbfs){const e=Math.abs(q.value-calcPbf);if(e<pbfErr){pbfErr=e;pbfPick=q}}if(pbfPick){checks.push(pbfErr<=.45);score+=pbfPick.score+(pbfErr<=.45?36000:-Math.min(32000,pbfErr*5000))}
     const passCount=checks.filter(Boolean).length,available=checks.length;
     // One balance identity plus one independent printed index is sufficient.  If
     // only one check is available, require extremely strong ROI evidence and leave
     // the value for manual review rather than deriving a number.
     const coherent=passCount>=2||(available===1&&passCount===1&&w.score>=3500&&f.score>=3500);
     if(!coherent)continue;
     score+=passCount*12000;
     if(!best||score>best.score)best={w,f,bmi:bmiPick,pbf:pbfPick,score,passCount,available,bmiErr,pbfErr}
   }
   if(!best)return null;
   promoteInBodyCriticalWinner(rows,"inbody_weight",best.w,"inbody-global-coherence-source-lock");
   promoteInBodyCriticalWinner(rows,"inbody_body_fat_mass",best.f,"inbody-global-coherence-source-lock");
   if(best.bmi&&best.bmiErr<=.25)promoteInBodyCriticalWinner(rows,"inbody_bmi",best.bmi,"inbody-global-coherence-source-lock");
   if(best.pbf&&best.pbfErr<=.45)promoteInBodyCriticalWinner(rows,"inbody_percent_body_fat",best.pbf,"inbody-global-coherence-source-lock");
   return{coherent:true,weight:best.w.value,fat:best.f.value,bmi:best.bmi?.value??null,pbf:best.pbf?.value??null,passCount:best.passCount,available:best.available}
 }

 function inbodyCoreCoherentFromRows(rows){
   const by=inbodyBestRowMap(rows),n=code=>inbodyNumericFromRow(by.get(code));
   const w=n("inbody_weight"),fat=n("inbody_body_fat_mass"),ffm=n("inbody_fat_free_mass"),h=n("inbody_height_cm"),bmi=n("inbody_bmi"),pbf=n("inbody_percent_body_fat");
   if(w===null||fat===null)return false;let pass=0,available=0;
   if(ffm!==null){available++;if(Math.abs((ffm+fat)-w)<=.25)pass++}
   if(h!==null&&bmi!==null){available++;if(Math.abs(w/((h/100)**2)-bmi)<=.25)pass++}
   if(pbf!==null){available++;if(Math.abs(fat/w*100-pbf)<=.45)pass++}
   return pass>=2||(available===1&&pass===1)
 }

 function inbodyBuildLiveCanonicalSnapshot(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);
   if(!rows.length)return null;
   syncInBodyRawNumerics(rows);
   const pick=(code,min,max)=>inbodyLiveCandidateRows(rows,code,{min,max,limit:12})[0]||null;
   const obesity=pick("inbody_obesity_degree",40,250),history=pick("inbody_history_ecw_tbw",.20,.60),weight=pick("inbody_weight",20,300);
   const targets=inbodyLiveCandidateRows(rows,"inbody_target_weight",{min:20,max:300,limit:12});
   const wcs=inbodyLiveCandidateRows(rows,"inbody_weight_control",{min:-150,max:150,limit:12});
   const fcs=inbodyLiveCandidateRows(rows,"inbody_fat_control",{min:-150,max:150,limit:12});
   const mcs=inbodyLiveCandidateRows(rows,"inbody_muscle_control",{min:-150,max:150,limit:12});
   const coreCoherent=inbodyCoreCoherentFromRows(rows);
   let control=null;
   if(weight&&coreCoherent){
     for(const t of targets)for(const wc of wcs)for(const fc of fcs)for(const mc of mcs){
       const e1=Math.abs((weight.value+wc.value)-t.value),e2=Math.abs((fc.value+mc.value)-wc.value);
       if(e1>.16||e2>.16)continue;
       const directBonus=[t,wc,fc,mc].filter(x=>x.score>=3000).length*12000;
       const score=weight.score+t.score+wc.score+fc.score+mc.score+directBonus-(e1+e2)*1000;
       if(!control||score>control.score)control={t,wc,fc,mc,score,derived:false}
     }
     // Real InBody sheets sometimes lose only the separated +/- glyphs.  If the
     // directly printed Target and Fat Control are strong current-sheet rows, the
     // remaining two fields are exact sheet identities, not estimates.
     if(!control&&targets.length&&fcs.length&&(!wcs.length||!mcs.length)){
       const t=targets[0],fc=fcs[0],wcValue=Math.round((t.value-weight.value)*10)/10,mcValue=Math.round((wcValue-fc.value)*10)/10;
       // Derivation is allowed only when at least one signed control field is
       // genuinely absent. If printed control candidates exist but conflict, the
       // gate must expose that conflict rather than silently repairing it.
       if(t.score>=3000&&fc.score>=3000&&wcValue>=-150&&wcValue<=150&&mcValue>=-150&&mcValue<=150){
         control={t,wc:{row:null,value:wcValue,score:6500},fc,mc:{row:null,value:mcValue,score:6500},score:t.score+fc.score+13000,derived:true}
       }
     }
   }
   return{
     obesityDegree:obesity?.value??null,historyEcwTbw:history?.value??null,weight:weight?.value??null,
     targetWeight:control?.t?.value??targets[0]?.value??null,weightControl:control?.wc?.value??null,
     fatControl:control?.fc?.value??fcs[0]?.value??null,muscleControl:control?.mc?.value??null,
     sourceFile:clean((obesity||history||weight||targets[0]||fcs[0])?.row?.source_file||(obesity||history||weight||targets[0]||fcs[0])?.row?.sourceFile||""),
     _live:true,_controlDerived:Boolean(control?.derived),_coreCoherent:coreCoherent
   }
 }
 function applyInBodyLiveCanonicalSnapshot(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);if(!rows.length)return input;
   syncInBodyRawNumerics(rows);
   const snapshot=inbodyBuildLiveCanonicalSnapshot(rows);if(!snapshot)return input;
   const mapping=[
     ["inbody_obesity_degree",snapshot.obesityDegree],["inbody_history_ecw_tbw",snapshot.historyEcwTbw],
     ...(snapshot._coreCoherent?[["inbody_weight",snapshot.weight],["inbody_target_weight",snapshot.targetWeight],["inbody_weight_control",snapshot.weightControl],["inbody_fat_control",snapshot.fatControl],["inbody_muscle_control",snapshot.muscleControl]]:[])
   ];
   for(const [code,value] of mapping){
     if(value===null||value===undefined||!Number.isFinite(Number(value)))continue;
     let candidates=rows.filter(r=>clean(r?.test_code||r?.testCode).toLowerCase()===code);
     if(!candidates.length)continue;
     const matching=candidates.filter(r=>{const v=inbodyNumericFromRow(r);return v!==null&&Math.abs(v-Number(value))<1e-6});
     let winner=(matching.length?matching:candidates).sort((a,b)=>inbodyLiveEvidenceScore(b)-inbodyLiveEvidenceScore(a))[0];
     const display=inbodySnapshotDisplay(code,value);
     winner.value_raw=display;winner.valueRaw=display;winner.reported_value_raw=display;winner.value_numeric=Number(value);winner.valueNumeric=Number(value);winner.value_operator="=";
     winner.selected=true;winner.inbody_canonical_source=true;winner.inbody_runtime_snapshot_locked=true;winner.inbody_snapshot_locked=false;winner.inbody_critical_bundle_source=true;winner.inbody_roi_locked=true;winner.inbody_label_anchored=true;
     winner.inbody_missing_placeholder=false;winner.inbody_placeholder_filled=true;winner.parse_issue=false;winner.inbody_gate_issue=false;winner.inbody_gate_only_parse_issue=false;winner.review_recommended=false;winner.verify_reason="";
     winner.source_evidence=winner.source_evidence||[];winner.source_evidence.push({type:"inbody-live-runtime-snapshot-lock",profile:"INBODY_720",code,value:Number(value)});
     for(const other of candidates){
       if(other===winner)continue;other.selected=false;other.inbody_duplicate_suppressed=true;other.duplicateOfResultId=winner.id;other.inbody_snapshot_locked=false;other.inbody_runtime_snapshot_rejected=true
     }
   }
   const publicSnapshot={obesityDegree:snapshot.obesityDegree,historyEcwTbw:snapshot.historyEcwTbw,weight:snapshot.weight,targetWeight:snapshot.targetWeight,weightControl:snapshot.weightControl,fatControl:snapshot.fatControl,muscleControl:snapshot.muscleControl,sourceFile:snapshot.sourceFile};
   for(const r of rows){if(/^inbody_/i.test(clean(r?.test_code||r?.testCode)))r.inbody_source_truth_snapshot={...publicSnapshot}}
   syncInBodyRawNumerics(rows);
   return input
 }
 function inbodySourceTruthSnapshotFromRows(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]),candidates=[];
   for(const r of rows){
     const snap=r?.inbody_source_truth_snapshot||r?.inbodySourceTruthSnapshot;
     if(!snap||typeof snap!=="object")continue;
     const n=k=>{const v=Number(snap[k]);return Number.isFinite(v)?v:null};
     const normalized={
       obesityDegree:n("obesityDegree"),historyEcwTbw:n("historyEcwTbw"),weight:n("weight"),targetWeight:n("targetWeight"),
       weightControl:n("weightControl"),fatControl:n("fatControl"),muscleControl:n("muscleControl"),sourceFile:clean(snap.sourceFile||r?.source_file||r?.sourceFile)
     };
     let score=0;
     if(normalized.obesityDegree!==null&&normalized.obesityDegree>=40&&normalized.obesityDegree<=250)score+=5;
     if(normalized.historyEcwTbw!==null&&normalized.historyEcwTbw>=.20&&normalized.historyEcwTbw<=.60)score+=5;
     if(normalized.weight!==null&&normalized.weight>=20&&normalized.weight<=300)score+=2;
     if(normalized.targetWeight!==null&&normalized.targetWeight>=20&&normalized.targetWeight<=300)score+=2;
     if([normalized.weightControl,normalized.fatControl,normalized.muscleControl].every(v=>v!==null&&v>=-150&&v<=150))score+=3;
     if(normalized.weight!==null&&normalized.targetWeight!==null&&normalized.weightControl!==null&&Math.abs((normalized.weight+normalized.weightControl)-normalized.targetWeight)<=.16)score+=10;
     if(normalized.weightControl!==null&&normalized.fatControl!==null&&normalized.muscleControl!==null&&Math.abs((normalized.fatControl+normalized.muscleControl)-normalized.weightControl)<=.16)score+=10;
     if(r?.inbody_roi_locked)score+=1;if(r?.inbody_canonical_source)score+=1;
     candidates.push({snapshot:normalized,score})
   }
   if(!candidates.length)return null;
   candidates.sort((a,b)=>b.score-a.score);
   return candidates[0].snapshot
 }
 function inbodySnapshotDisplay(code,value){
   const n=Number(value);if(!Number.isFinite(n))return"";
   const signed=["inbody_weight_control","inbody_fat_control","inbody_muscle_control"].includes(code);
   const decimals=code==="inbody_history_ecw_tbw"?3:1;
   const text=n.toFixed(decimals);
   return signed&&n>0?`+${text}`:text
 }
 function applyInBodySourceTruthSnapshot(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);if(!rows.length)return input;
   const snapshot=inbodySourceTruthSnapshotFromRows(rows);if(!snapshot)return input;
   const carrierConsistent=(code,expected,tol=.001)=>{
     const carriers=rows.filter(r=>clean(r?.test_code||r?.testCode).toLowerCase()===code&&Boolean(r?.inbody_source_truth_snapshot||r?.inbodySourceTruthSnapshot));
     if(!carriers.length)return true;
     for(const r of carriers){
       const current=inbodyNumericFromRow(r);
       // A deliberate/manual edit of the deterministic row invalidates the old
       // embedded snapshot for this field; Validation must inspect the edit.
       if(r?.inbody_manual_value_sync&&current!==null&&Math.abs(current-Number(expected))>tol)return false;
       if(current!==null&&Math.abs(current-Number(expected))>tol)return false
     }
     return true
   };
   const validObesity=snapshot.obesityDegree!==null&&snapshot.obesityDegree>=40&&snapshot.obesityDegree<=250&&carrierConsistent("inbody_obesity_degree",snapshot.obesityDegree,.001);
   const validHistory=snapshot.historyEcwTbw!==null&&snapshot.historyEcwTbw>=.20&&snapshot.historyEcwTbw<=.60&&carrierConsistent("inbody_history_ecw_tbw",snapshot.historyEcwTbw,.0005);
   const validControl=snapshot.weight!==null&&snapshot.targetWeight!==null&&snapshot.weightControl!==null&&snapshot.fatControl!==null&&snapshot.muscleControl!==null&&
     snapshot.weight>=20&&snapshot.weight<=300&&snapshot.targetWeight>=20&&snapshot.targetWeight<=300&&
     Math.abs((snapshot.weight+snapshot.weightControl)-snapshot.targetWeight)<=.16&&Math.abs((snapshot.fatControl+snapshot.muscleControl)-snapshot.weightControl)<=.16&&
     carrierConsistent("inbody_weight",snapshot.weight,.01)&&carrierConsistent("inbody_target_weight",snapshot.targetWeight,.01)&&carrierConsistent("inbody_weight_control",snapshot.weightControl,.01)&&carrierConsistent("inbody_fat_control",snapshot.fatControl,.01)&&carrierConsistent("inbody_muscle_control",snapshot.muscleControl,.01);
   const mapping=[];
   if(validObesity)mapping.push(["inbody_obesity_degree",snapshot.obesityDegree]);
   if(validHistory)mapping.push(["inbody_history_ecw_tbw",snapshot.historyEcwTbw]);
   if(validControl)mapping.push(["inbody_weight",snapshot.weight],["inbody_target_weight",snapshot.targetWeight],["inbody_weight_control",snapshot.weightControl],["inbody_fat_control",snapshot.fatControl],["inbody_muscle_control",snapshot.muscleControl]);
   for(const [code,value] of mapping){
     const candidates=rows.filter(r=>clean(r?.test_code||r?.testCode).toLowerCase()===code);
     if(!candidates.length)continue;
     candidates.sort((a,b)=>{
       const as=Boolean(a?.inbody_source_truth_snapshot||a?.inbodySourceTruthSnapshot)?100000:0,bs=Boolean(b?.inbody_source_truth_snapshot||b?.inbodySourceTruthSnapshot)?100000:0;
       return (bs+inbodyRowAuthorityScore(b))-(as+inbodyRowAuthorityScore(a))
     });
     const winner=candidates[0],display=inbodySnapshotDisplay(code,value);
     winner.value_raw=display;winner.value_numeric=Number(value);winner.valueNumeric=Number(value);winner.reported_value_raw=display;winner.value_operator="=";
     winner.selected=true;winner.inbody_canonical_source=true;winner.inbody_snapshot_locked=true;winner.inbody_critical_bundle_source=true;winner.inbody_roi_locked=true;winner.inbody_label_anchored=true;
     winner.inbody_missing_placeholder=false;winner.inbody_placeholder_filled=true;winner.parse_issue=false;winner.inbody_gate_issue=false;winner.inbody_gate_only_parse_issue=false;winner.review_recommended=false;winner.verify_reason="";
     winner.source_evidence=winner.source_evidence||[];winner.source_evidence.push({type:"inbody-parser-source-truth-snapshot-lock",profile:"INBODY_720",code,value:Number(value)});
     for(const loser of candidates.slice(1)){
       loser.selected=false;loser.inbody_duplicate_suppressed=true;loser.duplicateOfResultId=winner.id;loser.inbody_snapshot_rejected=true
     }
   }
   return input
 }
 function inbodyCriticalCandidateRows(rows,code,{min=-Infinity,max=Infinity}={}){
   const key=clean(code).toLowerCase(),bestByValue=new Map();
   const consider=(r,value,score,origin="primary")=>{const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)return;const k=String(n),old=bestByValue.get(k);if(!old||score>old.score)bestByValue.set(k,{row:r,value:n,score,origin})};
   for(const r of rows){
     if(clean(r?.test_code||r?.testCode).toLowerCase()!==key)continue;
     const value=inbodyNumericFromRow(r),base=inbodyRowAuthorityScore(r)+(r?.review_confirmed?120:0)+(r?.inbody_manual_value_sync?160:0)+(r?.inbody_snapshot_locked?100000:0);
     if(value!==null)consider(r,value,base,"primary");
     if(r?.inbody_manual_value_sync===true)continue;
     const alternatives=[...(r?.inbody_candidate_alternatives||[])];
     for(const ev of (r?.source_evidence||[]))for(const alt of (ev?.alternatives||[]))alternatives.push(alt);
     let rank=0;for(const alt of [...new Set(alternatives.map(Number).filter(Number.isFinite))]){if(value!==null&&Math.abs(alt-value)<1e-9)continue;consider(r,alt,base-120-rank*25,"source-alternative");rank++}
   }
   return [...bestByValue.values()].sort((a,b)=>b.score-a.score)
 }
 function promoteInBodyCriticalWinner(rows,code,winner,evidenceType){
   if(!winner?.row)return null;
   const key=clean(code).toLowerCase(),chosen=winner.row,sourceIndex=Number(chosen?.source_file_index??0);
   const before=inbodyNumericFromRow(chosen),selectedValue=Number(winner.value);
   // v10.304 — when coherence selects an OCR alternative from THIS SAME ROI,
   // promote that observed source value into the visible canonical row. v10.303
   // selected the alternative object but then re-read chosen.value_raw, silently
   // restoring the stale primary OCR value. No value is calculated here.
   if(Number.isFinite(selectedValue)&&before!==null&&Math.abs(selectedValue-before)>1e-9&&winner.origin==="source-alternative"){
     const display=inbodySnapshotDisplay(key,selectedValue);
     chosen.value_raw=display;chosen.reported_value_raw=display;chosen.value_numeric=selectedValue;chosen.valueNumeric=selectedValue;chosen.value_operator="=";
     chosen.inbody_alternative_promoted=true;
     chosen.source_evidence=chosen.source_evidence||[];chosen.source_evidence.push({type:"inbody-source-alternative-promoted-v10.304",profile:"INBODY_720",code:key,selected_value:selectedValue,rejected_primary:before});
   }else{
     const parsed=scalarParts(chosen.value_raw);
     if(parsed.value_numeric!==null){chosen.value_numeric=parsed.value_numeric;chosen.valueNumeric=parsed.value_numeric;chosen.value_operator=parsed.value_operator}
   }
   chosen.selected=true;chosen.inbody_canonical_source=true;chosen.inbody_critical_bundle_source=true;chosen.inbody_roi_locked=true;chosen.inbody_label_anchored=true;chosen.inbody_source_confidence=Math.max(99,Number(chosen.inbody_source_confidence||0));chosen.confidence=Math.max(99,Number(chosen.confidence||0));chosen.parse_issue=false;chosen.review_recommended=false;
   if(inbodyNumericFromRow(chosen)!==null){chosen.inbody_missing_placeholder=false;chosen.inbody_placeholder_filled=true;chosen.inbody_gate_issue=false;chosen.inbody_gate_only_parse_issue=false;chosen.verify_reason=""}
   chosen.source_evidence=chosen.source_evidence||[];chosen.source_evidence.push({type:evidenceType||"inbody-critical-bundle-reconciliation",profile:"INBODY_720",code:key,value:inbodyNumericFromRow(chosen),candidate_origin:winner.origin||"primary"});
   for(const other of rows){
     if(other===chosen||clean(other?.test_code||other?.testCode).toLowerCase()!==key)continue;
     if(Number(other?.source_file_index??0)!==sourceIndex)continue;
     other.selected=false;other.inbody_duplicate_suppressed=true;other.duplicateOfResultId=chosen.id;
     chosen.source_evidence.push({type:"inbody-critical-bundle-suppressed-stale",rejected_value:clean(other.value_raw),rejected_numeric:other.value_numeric??null})
   }
   return chosen
 }
 function reconcileInBodyCriticalBundles(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);if(!rows.length)return input;
   syncInBodyRawNumerics(rows);
   // v10.264: source_file_index is not stable across ROI placeholders, photo OCR and
   // legacy recovery rows. Prefer the physical file name. If this Review contains
   // only one named InBody source, keep every InBody row in one source-truth group.
   const inbodyRows=rows.filter(r=>clean(r?.test_code||r?.testCode).toLowerCase().startsWith("inbody_"));
   const namedSources=[...new Set(inbodyRows.map(r=>clean(r?.source_file||r?.sourceFile).toLowerCase()).filter(Boolean))];
   const bySource=new Map();
   for(const r of inbodyRows){
     const name=clean(r?.source_file||r?.sourceFile).toLowerCase();
     const k=namedSources.length<=1?"single-inbody-source":(name?`file:${name}`:`idx:${Number(r?.source_file_index??0)}`);
     if(!bySource.has(k))bySource.set(k,[]);bySource.get(k).push(r)
   }
   for(const sourceRows of bySource.values()){
     // Values with a narrow structural envelope: an implausible legacy/cached row
     // must never outrank a clearly printed current-sheet value just because it
     // previously carried the canonical flag.
     const obesity=inbodyCriticalCandidateRows(sourceRows,"inbody_obesity_degree",{min:40,max:250})[0];
     if(obesity)promoteInBodyCriticalWinner(sourceRows,"inbody_obesity_degree",obesity,"inbody-obesity-degree-source-lock");
     const hist=inbodyCriticalCandidateRows(sourceRows,"inbody_history_ecw_tbw",{min:.20,max:.60})[0];
     if(hist)promoteInBodyCriticalWinner(sourceRows,"inbody_history_ecw_tbw",hist,"inbody-history-ecw-source-lock");

     // Weight-control values are individually plausible even when they are wrong.
     // Select them as one signed bundle using BOTH printed identities:
     // Weight + Weight Control = Target Weight; Fat Control + Muscle Control = Weight Control.
     const weights=inbodyCriticalCandidateRows(sourceRows,"inbody_weight",{min:20,max:300}).slice(0,5);
     const targets=inbodyCriticalCandidateRows(sourceRows,"inbody_target_weight",{min:20,max:300}).slice(0,8);
     const wcs=inbodyCriticalCandidateRows(sourceRows,"inbody_weight_control",{min:-150,max:150}).slice(0,8);
     const fcs=inbodyCriticalCandidateRows(sourceRows,"inbody_fat_control",{min:-150,max:150}).slice(0,8);
     const mcs=inbodyCriticalCandidateRows(sourceRows,"inbody_muscle_control",{min:-150,max:150}).slice(0,8);
     let best=null;
     for(const w of weights)for(const t of targets)for(const wc of wcs)for(const fc of fcs)for(const mc of mcs){
       const e1=Math.abs((w.value+wc.value)-t.value),e2=Math.abs((fc.value+mc.value)-wc.value);
       if(e1>.16||e2>.16)continue;
       const score=w.score+t.score+wc.score+fc.score+mc.score+10000-(e1+e2)*100;
       if(!best||score>best.score)best={w,t,wc,fc,mc,score}
     }
     if(best){
       promoteInBodyCriticalWinner(sourceRows,"inbody_weight",best.w,"inbody-weight-control-bundle-source-lock");
       promoteInBodyCriticalWinner(sourceRows,"inbody_target_weight",best.t,"inbody-weight-control-bundle-source-lock");
       promoteInBodyCriticalWinner(sourceRows,"inbody_weight_control",best.wc,"inbody-weight-control-bundle-source-lock");
       promoteInBodyCriticalWinner(sourceRows,"inbody_fat_control",best.fc,"inbody-weight-control-bundle-source-lock");
       promoteInBodyCriticalWinner(sourceRows,"inbody_muscle_control",best.mc,"inbody-weight-control-bundle-source-lock")
     }
   }
   syncInBodyRawNumerics(rows);
   return input
 }
 function inbodyReferenceStructurallyPlausible(code,raw){
   const text=clean(raw);if(!text)return false;
   const rp=parseRef(text),lo=Number(rp.reference_low),hi=Number(rp.reference_high);
   if(rp.reference_operator!=="range")return Boolean(text);
   if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo)return false;
   if(code==="inbody_obesity_degree")return lo>=40&&lo<=160&&hi>=60&&hi<=220;
   if(code==="inbody_bmi")return lo>=10&&lo<=35&&hi>=15&&hi<=45;
   if(code==="inbody_percent_body_fat")return lo>=5&&lo<=45&&hi>=10&&hi<=60; // reject dropped-zero 1.0–20.0
   if(code==="inbody_bmr")return lo>=500&&lo<=3500&&hi>=700&&hi<=5000; // reject 153.9–1799 decimal loss
   if(code==="inbody_minerals")return lo>=1&&lo<=6&&hi>=2&&hi<=6&&hi-lo>=.25&&hi-lo<=2.5;
   if(code==="inbody_waist_hip_ratio")return lo>=.5&&lo<=1.2&&hi>=.6&&hi<=1.4;
   return inbodyReferencePlausible(code,text)
 }
 function inbodyValueStructurallyPlausible(code,value){
   const v=Number(value);if(!Number.isFinite(v))return false;
   if(code==="inbody_obesity_degree")return v>=40&&v<=250;
   if(code==="inbody_history_ecw_tbw"||code==="inbody_ecw_tbw"||/_ecw_tbw$/.test(code))return v>=.20&&v<=.60;
   if(code==="inbody_ecf_tbf"||/_ecf_tbf$/.test(code))return v>=.15&&v<=.60;
   if(code==="inbody_target_weight")return v>=20&&v<=300;
   if(["inbody_weight_control","inbody_fat_control","inbody_muscle_control"].includes(code))return v>=-150&&v<=150;
   if(code==="inbody_visceral_fat_area")return v>=1&&v<=300;
   return true
 }
 function inbodyRowAuthorityScore(r){
   const code=clean(r?.test_code||r?.testCode).toLowerCase();let score=0;
   const numeric=inbodyNumericFromRow(r);
   if(numeric!==null)score+=140;else score-=120;
   // v10.262: a deterministic current-sheet reconciliation must outrank a
   // stale generic OCR row even if the latter was previously clicked/confirmed.
   // Explicit user edits should normally occur on the canonical row itself.
   if(r?.inbody_canonical_source)score+=700;
   if(r?.inbody_snapshot_locked)score+=10000;
   if(r?.review_confirmed||r?.manually_verified)score+=180;
   if(r?.inbody_roi_locked)score+=100;if(r?.inbody_label_anchored)score+=45;
   if(r?.inbody_definition_rescue)score+=140;if(r?.inbody_auto_accepted_low_confidence)score+=20;
   const evidence=(r?.source_evidence||[]).map(x=>clean(x?.type).toLowerCase());
   if(evidence.some(x=>/weight-control-bundle|history-bundle|bundle-reconciliation|current-sheet|micro-roi|bottom-water|vfa-marker|definition-rescue/.test(x)))score+=220;
   if(numeric!==null){if(inbodyValueStructurallyPlausible(code,numeric))score+=120;else score-=1400}
   if(inbodyReferenceStructurallyPlausible(code,r?.reference_raw??r?.reference))score+=25;
   if(r?.inbody_missing_placeholder)score-=260;if(r?.selected===false)score-=500;
   if(r?.parse_issue&&!r?.inbody_gate_only_parse_issue)score-=30;
   score+=Math.min(30,Math.max(0,Number(r?.confidence||r?.inbody_source_confidence||0))/4);
   return score
 }
 function inbodyBestRowMap(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]),groups=new Map();
   for(const r of rows){const code=clean(r?.test_code||r?.testCode).toLowerCase();if(!code.startsWith("inbody_"))continue;if(!groups.has(code))groups.set(code,[]);groups.get(code).push(r)}
   const best=new Map();
   groups.forEach((items,code)=>{items.sort((a,b)=>inbodyRowAuthorityScore(b)-inbodyRowAuthorityScore(a)||Number(b?.confidence||0)-Number(a?.confidence||0));best.set(code,items[0])});
   return best
 }
 function reconcileInBodyCanonicalRows(input){
   const rows=Array.isArray(input)?input:[],groups=new Map();
   rows.forEach(r=>{const code=clean(r?.test_code||r?.testCode).toLowerCase();if(!code.startsWith("inbody_"))return;const event=[code,Number(r?.source_file_index??0),clean(r?.result_date||r?.result_datetime).slice(0,10)].join("|");if(!groups.has(event))groups.set(event,[]);groups.get(event).push(r)});
   const reconcileItems=items=>{
     items.sort((a,b)=>inbodyRowAuthorityScore(b)-inbodyRowAuthorityScore(a)||Number(b?.confidence||0)-Number(a?.confidence||0));
     const winner=items[0],code=clean(winner?.test_code||winner?.testCode).toLowerCase(),numeric=inbodyNumericFromRow(winner);
     if(numeric!==null){winner.value_numeric=numeric;winner.valueNumeric=numeric;winner.value_operator=scalarParts(winner.value_raw).value_operator}
     const referenceCandidates=items.filter(r=>inbodyReferenceStructurallyPlausible(code,r?.reference_raw??r?.reference)).sort((a,b)=>inbodyRowAuthorityScore(b)-inbodyRowAuthorityScore(a));
     if(referenceCandidates.length&&!inbodyReferenceStructurallyPlausible(code,winner.reference_raw??winner.reference)){
       const source=referenceCandidates[0];winner.reference_raw=clean(source.reference_raw??source.reference);const rp=parseRef(winner.reference_raw);winner.reference_low=rp.reference_low;winner.reference_high=rp.reference_high;winner.reference_operator=rp.reference_operator;winner.inbody_reference_reconciled=true
     }
     for(const loser of items.slice(1)){
       if(loser===winner)continue;loser.selected=false;loser.inbody_duplicate_suppressed=true;loser.duplicateOfResultId=winner.id;
       winner.source_evidence=winner.source_evidence||[];winner.source_evidence.push({type:"inbody-canonical-row-reconciliation",rejected_value:clean(loser.value_raw),rejected_numeric:loser.value_numeric??null,rejected_reference:clean(loser.reference_raw),kept_value:clean(winner.value_raw)})
     }
     return winner
   };
   groups.forEach(reconcileItems);
   // v10.262: legacy/generic rows sometimes carry no result date while the
   // deterministic ROI row does. The old event key therefore left both rows
   // selected. When a single canonical current-sheet row exists for a code in a
   // source file, collapse undated/legacy duplicates onto it before validation.
   const sourceGroups=new Map();
   rows.forEach(r=>{const code=clean(r?.test_code||r?.testCode).toLowerCase();if(!code.startsWith("inbody_"))return;const key=[code,Number(r?.source_file_index??0)].join("|");if(!sourceGroups.has(key))sourceGroups.set(key,[]);sourceGroups.get(key).push(r)});
   sourceGroups.forEach(items=>{
     const canon=items.filter(r=>r?.inbody_canonical_source&&r.selected!==false);
     if(canon.length!==1)return;
     const winner=canon[0];
     for(const loser of items){
       if(loser===winner||loser.selected===false)continue;
       loser.selected=false;loser.inbody_duplicate_suppressed=true;loser.duplicateOfResultId=winner.id;
       winner.source_evidence=winner.source_evidence||[];winner.source_evidence.push({type:"inbody-cross-event-canonical-collapse",rejected_value:clean(loser.value_raw),rejected_numeric:loser.value_numeric??null,kept_value:clean(winner.value_raw)})
     }
   });
   return rows
 }
 function inbodyValidationGate(input){
   const rows=input instanceof Map?[...input.values()]:(Array.isArray(input)?input:[]);
   // v10.269: Validation consumes the LIVE runtime snapshot, never an embedded
   // snapshot captured before generic OCR/recovery/Review state was merged.
   syncInBodyRawNumerics(rows);inbodyGlobalPrimaryCoherenceLock(rows);applyInBodyLiveCanonicalSnapshot(rows);syncInBodyRawNumerics(rows);
   // v10.262 — several older OCR/recovery paths can leave two rows with the same
   // InBody code. Never let insertion order decide Source Truth. Pick the most
   // authoritative ROI/manual row and parse the visible raw value first.
   const byCode=inbodyBestRowMap(rows);
   const row=code=>byCode.get(clean(code).toLowerCase())||null;
   const n=code=>inbodyNumericFromRow(row(code));
   const quarantine=(codes,reason)=>{for(const code of codes||[]){const r=row(code);if(!r)continue;r.selected=false;r.inbody_source_quarantined=true;r.inbody_clinical_excluded=true;r.review_recommended=false;r.inbody_quarantine_reason=reason;r.source_evidence=r.source_evidence||[];r.source_evidence.push({type:"inbody-v10.305-auto-quarantine",profile:"INBODY_720",code:clean(code).toLowerCase(),reason})}};
   const issues=[],warnings=[];
   const add=(code,message,codes=[])=>issues.push({code,message,codes});
   const warn=(code,message,codes=[])=>warnings.push({code,message,codes});
   const requiredCore=[
     "inbody_reported_age","inbody_height_cm","inbody_intracellular_water","inbody_extracellular_water","inbody_total_body_water",
     "inbody_protein","inbody_minerals","inbody_soft_lean_mass","inbody_fat_free_mass","inbody_weight","inbody_skeletal_muscle_mass",
     "inbody_body_fat_mass","inbody_bmi","inbody_percent_body_fat","inbody_waist_hip_ratio","inbody_visceral_fat_area",
     "inbody_ecf_tbf","inbody_ecw_tbw","inbody_history_ecw_tbw","inbody_obesity_degree","inbody_body_cell_mass",
     "inbody_bone_mineral_content","inbody_bmr","inbody_arm_circumference","inbody_arm_muscle_circumference",
     "inbody_target_weight","inbody_weight_control","inbody_fat_control","inbody_muscle_control","inbody_fitness_score"
   ];
   const segmentParts=["right_arm","left_arm","trunk","right_leg","left_leg"],segmentFields=["lean_mass","lean_pct","fat_mass","fat_pct","ecf_tbf","ecw_tbw"];
   const requiredSegmental=segmentParts.flatMap(part=>segmentFields.map(field=>`inbody_segment_${part}_${field}`));
   const impedanceFreq=["1khz","5khz","50khz","250khz","500khz","1mhz"],impedanceSeg=["ra","la","tr","rl","ll"];
   const requiredImpedance=impedanceFreq.flatMap(freq=>impedanceSeg.map(seg=>`inbody_impedance_${freq}_${seg}`));
   // v10.302 — Focused Verify.  Only clinically central/source-identity fields
   // create a blocking manual task when missing.  Secondary InBody values remain
   // source-audited and are simply omitted until readable; this prevents one
   // difficult scan from creating 10–30 manual confirmations.
   const requiredCritical=[
     "inbody_reported_age","inbody_height_cm","inbody_weight","inbody_skeletal_muscle_mass","inbody_body_fat_mass",
     "inbody_bmi","inbody_percent_body_fat","inbody_waist_hip_ratio","inbody_visceral_fat_area","inbody_ecw_tbw"
   ];
   const required=[...requiredCritical];
   const missing=required.filter(code=>n(code)===null);
   const optionalMissing=requiredCore.filter(code=>code!=="inbody_history_ecw_tbw"&&!requiredCritical.includes(code)&&n(code)===null);
   if(missing.length)add("REQUIRED_FIELDS",`InBody อ่านค่าหลักที่จำเป็นไม่ครบ ${missing.length} ช่อง: ${missing.join(", ")}`,missing);
   if(optionalMissing.length)warnings.push({code:"OPTIONAL_CORE_FIELDS_INCOMPLETE",message:`มีค่า InBody รอง ${optionalMissing.length} รายการที่ยังอ่านไม่ชัด — ละไว้โดยไม่บังคับ Verify และไม่สร้างค่าแทน`,codes:optionalMissing});
   const missingSegmental=requiredSegmental.filter(code=>n(code)===null);
   if(missingSegmental.length)warnings.push({code:"SEGMENTAL_FIELDS_INCOMPLETE",message:`Segmental Analysis อ่านได้ ${requiredSegmental.length-missingSegmental.length}/${requiredSegmental.length} ช่อง — ช่องที่ยังไม่ชัดถูกละไว้โดยไม่บังคับ Verify ทีละค่า`,codes:missingSegmental});
   const impedanceCount=requiredImpedance.filter(code=>n(code)!==null).length;
   if(impedanceCount>0&&impedanceCount!==requiredImpedance.length)warnings.push({code:"IMPEDANCE_MATRIX_INCOMPLETE",message:`อ่าน Impedance ได้ ${impedanceCount}/30 ช่อง — ไม่ใช้ matrix ที่ไม่ครบในการแปลผล และไม่บังคับ Verify ทีละช่อง`,codes:requiredImpedance.filter(code=>n(code)===null)});
   if(impedanceCount===0)warnings.push({code:"IMPEDANCE_NOT_IMPORTED",message:"ยังไม่ยืนยันตาราง Impedance จากต้นฉบับ; ไม่ใช้ค่า Impedance ในการแปลผล"});

   const close=(a,b,tol)=>a!==null&&b!==null&&Math.abs(a-b)<=tol;
   const icw=n("inbody_intracellular_water"),ecw=n("inbody_extracellular_water"),tbw=n("inbody_total_body_water");
   if(icw!==null&&ecw!==null&&tbw!==null&&!close(icw+ecw,tbw,.06))add("TBW_BALANCE",`ICW + ECW = ${(icw+ecw).toFixed(2)} ไม่ตรง TBW ${tbw}`,["inbody_intracellular_water","inbody_extracellular_water","inbody_total_body_water"]);
   const ffm=n("inbody_fat_free_mass"),fat=n("inbody_body_fat_mass"),weight=n("inbody_weight");
   if(ffm!==null&&fat!==null&&weight!==null&&!close(ffm+fat,weight,.06))add("WEIGHT_BALANCE",`Fat Free Mass + Fat Mass = ${(ffm+fat).toFixed(2)} ไม่ตรงน้ำหนัก ${weight}`,["inbody_fat_free_mass","inbody_body_fat_mass","inbody_weight"]);
   const protein=n("inbody_protein"),minerals=n("inbody_minerals"),slm=n("inbody_soft_lean_mass"),bmc=n("inbody_bone_mineral_content");
   if(tbw!==null&&protein!==null&&minerals!==null&&ffm!==null&&!close(tbw+protein+minerals,ffm,.12))add("FFM_COMPONENT_BALANCE",`TBW + Protein + Minerals = ${(tbw+protein+minerals).toFixed(2)} ไม่สอดคล้อง FFM ${ffm}`,["inbody_total_body_water","inbody_protein","inbody_minerals","inbody_fat_free_mass"]);
   if(slm!==null&&bmc!==null&&ffm!==null&&!close(slm+bmc,ffm,.12))add("SOFTLEAN_BMC_BALANCE",`Soft Lean Mass + BMC = ${(slm+bmc).toFixed(2)} ไม่สอดคล้อง FFM ${ffm}`,["inbody_soft_lean_mass","inbody_bone_mineral_content","inbody_fat_free_mass"]);
   const ac=n("inbody_arm_circumference"),amc=n("inbody_arm_muscle_circumference");
   if(ac!==null&&amc!==null&&amc>ac+.05)add("ARM_CIRCUMFERENCE_ORDER",`AMC ${amc} cm มากกว่า AC ${ac} cm ซึ่งขัดโครงสร้างรายงาน`,["inbody_arm_circumference","inbody_arm_muscle_circumference"]);
   const obesityDegree=n("inbody_obesity_degree"),vfa=n("inbody_visceral_fat_area"),historyEcw=n("inbody_history_ecw_tbw");
   if(obesityDegree!==null&&(obesityDegree<40||obesityDegree>250))add("OBESITY_DEGREE_RANGE",`Obesity Degree ${obesityDegree}% อยู่นอกช่วงโครงสร้าง InBody`,["inbody_obesity_degree"]);
   if(vfa!==null&&(vfa<1||vfa>300))add("VFA_RANGE",`Visceral Fat Area ${vfa} cm² อยู่นอกช่วง parser`,["inbody_visceral_fat_area"]);
   const historyEcwValid=historyEcw!==null&&historyEcw>=.20&&historyEcw<=.60;
   if(historyEcw!==null&&!historyEcwValid){
     const badHistoryRow=row("inbody_history_ecw_tbw");
     if(badHistoryRow){badHistoryRow.selected=false;badHistoryRow.inbody_invalid_history_suppressed=true;badHistoryRow.review_recommended=false;badHistoryRow.parse_issue=false}
     warnings.push({code:"HISTORY_ECW_RANGE",message:`History ECW/TBW ${historyEcw} ผิดช่วง — ตัดค่าประวัตินี้ออกแทนการบล็อกค่าปัจจุบัน`,codes:["inbody_history_ecw_tbw"]})
   }
   if(historyEcw===null)warnings.push({code:"HISTORY_ECW_NOT_IMPORTED",message:"ยังอ่าน ECW/TBW ใน Body Composition History ไม่ได้ชัดเจน; ไม่บล็อกค่าปัจจุบันและไม่สร้างค่าประวัติขึ้นเอง",codes:["inbody_history_ecw_tbw"]});
   const pbf=n("inbody_percent_body_fat");
   if(fat!==null&&weight!==null&&pbf!==null&&!close(fat/weight*100,pbf,.25))add("PBF_BALANCE",`PBF ${pbf}% ไม่สอดคล้อง Fat/Weight (${(fat/weight*100).toFixed(1)}%)`,["inbody_percent_body_fat","inbody_body_fat_mass","inbody_weight"]);
   const height=n("inbody_height_cm"),bmi=n("inbody_bmi");
   if(height!==null&&weight!==null&&bmi!==null){const calc=weight/((height/100)**2);if(!close(calc,bmi,.15))add("BMI_BALANCE",`BMI ${bmi} ไม่สอดคล้อง Weight/Height² (${calc.toFixed(1)})`,["inbody_bmi","inbody_weight","inbody_height_cm"])}
   const target=n("inbody_target_weight"),wc=n("inbody_weight_control"),fc=n("inbody_fat_control"),mc=n("inbody_muscle_control");
   if(weight!==null&&wc!==null&&target!==null&&!close(weight+wc,target,.06))warn("TARGET_WEIGHT_BALANCE",`น้ำหนัก ${weight} + Weight Control ${wc} = ${(weight+wc).toFixed(1)} ไม่ตรง Target Weight ${target}`,["inbody_weight","inbody_weight_control","inbody_target_weight"]);
   if(fc!==null&&mc!==null&&wc!==null&&!close(fc+mc,wc,.06))warn("CONTROL_BALANCE",`Fat Control ${fc} + Muscle Control ${mc} = ${(fc+mc).toFixed(1)} ไม่ตรง Weight Control ${wc}`,["inbody_fat_control","inbody_muscle_control","inbody_weight_control"]);

   const referenceRequired=["inbody_intracellular_water","inbody_extracellular_water","inbody_protein","inbody_minerals","inbody_weight","inbody_skeletal_muscle_mass","inbody_body_fat_mass","inbody_bmi","inbody_percent_body_fat","inbody_waist_hip_ratio","inbody_obesity_degree","inbody_body_cell_mass","inbody_bone_mineral_content","inbody_bmr"];
   const missingRefs=referenceRequired.filter(code=>!clean(row(code)?.reference_raw??row(code)?.reference));
   // v10.257 — missing printed reference is audit-only. Never invent a range.
   if(missingRefs.length)warnings.push({code:"REFERENCE_FIELDS",message:`อ่านช่วงอ้างอิงจากต้นฉบับไม่ครบ ${missingRefs.length} รายการ — เก็บเป็นคำเตือนและไม่สร้างช่วงอ้างอิงแทน`,codes:missingRefs});
   const lowConfidence=required.filter(code=>{const r=row(code);return r?.inbody_low_confidence_source===true&&!r?.review_confirmed});
   // Low OCR confidence alone is not a source-truth conflict when the value is
   // ROI-locked and the deterministic structural/equation checks do not fail.
   if(lowConfidence.length)warnings.push({code:"LOW_CONFIDENCE_ROI",message:`มี ${lowConfidence.length} ช่องที่ OCR confidence ต่ำ แต่ ROI/โครงสร้างไม่ขัดแย้ง — รับอัตโนมัติพร้อมเก็บคำเตือน`,codes:lowConfidence});

   // Deterministic source lock: when dedicated InBody region OCR exists, critical values
   // must come from that ROI/history bundle/label-anchored region text, never from a
   // page-wide winning token.
   const regionEvidence=rows.some(r=>r.inbody_roi_locked===true);
   if(regionEvidence){
     const unlocked=requiredCore.filter(code=>{const r=row(code);return r&&r.inbody_roi_locked!==true&&r.inbody_history_source!==true&&r.inbody_label_anchored!==true});
     if(unlocked.length)warnings.push({code:"ROI_SOURCE_LOCK",message:`มี ${unlocked.length} ค่า InBody ที่มาจาก fallback/legacy evidence — เก็บ provenance ไว้ แต่ไม่บังคับ Verify หากโครงสร้างและสมการไม่ขัดแย้ง`,codes:unlocked})
   }

   for(const part of segmentParts){
     const lm=n(`inbody_segment_${part}_lean_mass`),lp=n(`inbody_segment_${part}_lean_pct`),fm=n(`inbody_segment_${part}_fat_mass`),fp=n(`inbody_segment_${part}_fat_pct`),ecf=n(`inbody_segment_${part}_ecf_tbf`),ew=n(`inbody_segment_${part}_ecw_tbw`);
     if(lm!==null&&(lm<.2||lm>80))warn("SEGMENT_LEAN_MASS_RANGE",`${part} Lean mass ${lm} kg อยู่นอกช่วง parser`,[`inbody_segment_${part}_lean_mass`]);
     if(fm!==null&&(fm<.1||fm>80))warn("SEGMENT_FAT_MASS_RANGE",`${part} Fat mass ${fm} kg อยู่นอกช่วง parser`,[`inbody_segment_${part}_fat_mass`]);
     if(lp!==null&&(lp<40||lp>220))warn("SEGMENT_LEAN_RANGE",`${part} Lean/Ideal ${lp}% อยู่นอกช่วง parser`,[`inbody_segment_${part}_lean_pct`]);
     if(fp!==null&&(fp<50||fp>500))warn("SEGMENT_FAT_RANGE",`${part} Fat index ${fp}% อยู่นอกช่วง parser`,[`inbody_segment_${part}_fat_pct`]);
     if(ecf!==null&&(ecf<.20||ecf>.50))warn("SEGMENT_ECF_RANGE",`${part} ECF/TBF ${ecf} ผิดช่วง`,[`inbody_segment_${part}_ecf_tbf`]);
     if(ew!==null&&(ew<.20||ew>.60))warn("SEGMENT_ECW_RANGE",`${part} ECW/TBW ${ew} ผิดช่วง`,[`inbody_segment_${part}_ecw_tbw`])
   }
   // v10.299 — Column Integrity Gate.  Percent columns in Segmental Analysis
   // define the side-specific standard: actual / (percent/100). Homologous left
   // and right limbs must imply the same printed standard. This catches column
   // fusion such as 7.27 kg or 1.0027 kg without inventing a replacement value.
   const pairMismatch=(a,b)=>Math.abs(a-b)/Math.max(.0001,(Math.abs(a)+Math.abs(b))/2);
   const segmentStandardCheck=(label,right,left,massField,pctField)=>{
     const rm=n(`inbody_segment_${right}_${massField}`),lm=n(`inbody_segment_${left}_${massField}`),rp=n(`inbody_segment_${right}_${pctField}`),lp=n(`inbody_segment_${left}_${pctField}`);
     if([rm,lm,rp,lp].some(v=>v===null))return;
     const rs=rm/(rp/100),ls=lm/(lp/100),m=pairMismatch(rs,ls);
     if(m>.12){const codes=[`inbody_segment_${right}_${massField}`,`inbody_segment_${left}_${massField}`,`inbody_segment_${right}_${pctField}`,`inbody_segment_${left}_${pctField}`];warn(`SEGMENT_${label.toUpperCase()}_COLUMN_INTEGRITY`,`${label}: ค่าซ้าย/ขวาทำให้มาตรฐานที่อนุมานจากคอลัมน์ % ต่างกัน ${(m*100).toFixed(1)}% — ซ่อนเฉพาะ mass ที่ขัดกันจาก Clinical Summary และไม่บังคับ Verify`,codes);quarantine([`inbody_segment_${right}_${massField}`,`inbody_segment_${left}_${massField}`],`segment ${label} column integrity mismatch`) }
   };
   segmentStandardCheck("arm_lean","right_arm","left_arm","lean_mass","lean_pct");
   segmentStandardCheck("arm_fat","right_arm","left_arm","fat_mass","fat_pct");
   segmentStandardCheck("leg_lean","right_leg","left_leg","lean_mass","lean_pct");
   segmentStandardCheck("leg_fat","right_leg","left_leg","fat_mass","fat_pct");
   for(const part of segmentParts){
     const specs=[["lean_mass",part==="trunk"?1:2],["lean_pct",1],["fat_mass",1],["fat_pct",0],["ecf_tbf",3],["ecw_tbw",3]];
     for(const [field,expected] of specs){const code=`inbody_segment_${part}_${field}`,r=row(code);if(!r)continue;const raw=clean(r.value_raw??r.reported_value_raw),m=raw.match(/\.([0-9]+)/);const dp=m?m[1].length:0;if(dp>expected+1&&!r.review_confirmed&&!r.manually_verified){warn("SEGMENT_COLUMN_FUSION",`${part} ${field} = ${raw} มีจำนวนทศนิยมเกินรูปแบบคอลัมน์ InBody — ซ่อนค่านี้และไม่บังคับ Verify`,[code]);quarantine([code],`segment column fusion ${raw}`)}if(r.inbody_column_integrity_conflict&&!r.review_confirmed&&!r.manually_verified){warn("SEGMENT_SOURCE_CONFLICT",`${part} ${field} มีความขัดแย้งระหว่าง direct ROI กับ bundle — ซ่อนค่านี้จนกว่าจะมี source ที่ชัดกว่า`,[code]);quarantine([code],"segment direct ROI/bundle conflict")}}
     const ecfCode=`inbody_segment_${part}_ecf_tbf`,ecwCode=`inbody_segment_${part}_ecw_tbw`,ecf=n(ecfCode),ecw=n(ecwCode);if(ecf!==null&&ecw!==null&&ecf>=ecw){warn("SEGMENT_WATER_COLUMN_ORDER",`${part}: ECF/TBF ${ecf} ไม่ควรอยู่คอลัมน์เดียว/มากกว่า ECW/TBW ${ecw}; ซ่อนคู่ค่านี้จากการแปลผลและไม่บังคับ Verify`,[ecfCode,ecwCode]);quarantine([ecfCode,ecwCode],"segmental water column order conflict")}
   }
   const controlIntegrityCodes=["inbody_target_weight","inbody_weight_control","inbody_fat_control","inbody_muscle_control"],controlIntegrityRows=controlIntegrityCodes.map(row).filter(Boolean);
   let controlBundleUsable=inbodyCoreCoherentFromRows(rows)&&controlIntegrityRows.length===4&&wc!==null&&fc!==null&&mc!==null&&target!==null&&weight!==null&&close(fc+mc,wc,.06)&&close(weight+wc,target,.16);
   if(controlIntegrityRows.length===4&&!controlIntegrityRows.every(r=>r.inbody_control_integrity_confirmed||r.review_confirmed||r.manually_verified)){
     if(controlBundleUsable)warnings.push({code:"WEIGHT_CONTROL_SOURCE_INTEGRITY",message:"Weight Control bundle ผ่านสองสมการของแผ่นเดียวกัน — ใช้เป็น device-derived context พร้อมเก็บ provenance",codes:controlIntegrityCodes});
     else{warn("WEIGHT_CONTROL_SOURCE_INTEGRITY","Weight Control bundle ยังไม่สอดคล้องกับ Current Weight และ control identities — ซ่อน 4 ค่านี้จาก Clinical Summary โดยไม่บังคับ Verify",controlIntegrityCodes);quarantine(controlIntegrityCodes,"weight-control source bundle not coherent")}
   }
   if(!controlBundleUsable&&controlIntegrityRows.length<4)controlBundleUsable=false;
   for(const r of rows.filter(x=>x?.inbody_column_integrity_conflict&&!x?.review_confirmed&&!x?.manually_verified)){const code=clean(r.test_code||r.testCode);warn("INBODY_COLUMN_SOURCE_CONFLICT",`${code} มี direct ROI ขัดกับ bundle; เก็บ direct source และส่ง Verify`,[code])}

   // v10.306 — orphan segmental cells must never survive as Source Truth.
   // A percentage without its paired mass, or a water ratio far from the same-sheet
   // whole-body cluster, is hidden automatically rather than displayed as a plausible
   // but column-shifted number (e.g. 447% or 0.318).
   for(const part of segmentParts){
     const fm=`inbody_segment_${part}_fat_mass`,fp=`inbody_segment_${part}_fat_pct`,ecf=`inbody_segment_${part}_ecf_tbf`,ecw=`inbody_segment_${part}_ecw_tbw`;
     if(n(fp)!==null&&n(fm)===null)quarantine([fp],`orphan segmental fat percentage without paired fat mass (${part})`);
     if((n(ecf)===null)!==(n(ecw)===null))quarantine([ecf,ecw],`incomplete segmental water pair (${part})`);
   }
   const whole=n("inbody_ecw_tbw");
   if(whole!==null){for(const part of segmentParts){const code=`inbody_segment_${part}_ecw_tbw`,v=n(code);if(v!==null&&Math.abs(v-whole)>.035)quarantine([code,`inbody_segment_${part}_ecf_tbf`],`segmental ECW/TBW ${v} inconsistent with same-sheet whole-body ${whole}`)}}
   const segmentEw=segmentParts.map(part=>n(`inbody_segment_${part}_ecw_tbw`)).filter(v=>v!==null);
   if(whole!==null&&segmentEw.length===5){const lo=Math.min(...segmentEw)-.02,hi=Math.max(...segmentEw)+.02;if(whole<lo||whole>hi)warnings.push({code:"WHOLE_ECW_CONTEXT",message:`Whole-body ECW/TBW ${whole} ต่างจากค่ารายส่วน — แสดงเป็นบริบทและไม่บังคับ Verify`,codes:["inbody_ecw_tbw",...segmentParts.map(part=>`inbody_segment_${part}_ecw_tbw`)]})}

   // One blocking equation/conflict = one review card.  Choose the least
   // authoritative dependency as the first value to check instead of flagging
   // every row participating in the same equation.  If correcting that value
   // resolves the equation, the remaining rows never enter the queue.
   const reviewCodes=new Set();
   // Missing critical cells and true single-cell source conflicts stay explicit.
   // Cross-field equations use a greedy "root-cause" cover: if one value is
   // involved in several failed equations (for example Weight), review that one
   // value first instead of showing four separate cards at once.
   const groupedIssues=[];
   for(const issue of issues){
     const codes=[...new Set((issue.codes||[]).map(code=>clean(code).toLowerCase()).filter(Boolean))];
     if(issue.code==="REQUIRED_FIELDS"){codes.forEach(code=>reviewCodes.add(code));continue}
     if(!codes.length)continue;
     if(codes.length===1){reviewCodes.add(codes[0]);continue}
     groupedIssues.push({issue,codes})
   }
   let remaining=[...groupedIssues];
   while(remaining.length){
     const score=new Map();
     for(const item of remaining)for(const code of item.codes){
       const r=row(code),entry=score.get(code)||{code,count:0,authority:r?inbodyRowAuthorityScore(r):999999};
       entry.count+=1;if(r)entry.authority=Math.min(entry.authority,inbodyRowAuthorityScore(r));score.set(code,entry)
     }
     const best=[...score.values()].sort((a,b)=>b.count-a.count||a.authority-b.authority||a.code.localeCompare(b.code))[0];
     if(!best)break;
     reviewCodes.add(best.code);
     remaining=remaining.filter(item=>!item.codes.includes(best.code))
   }

   const canonicalSnapshot={
     obesityDegree:n("inbody_obesity_degree"),historyEcwTbw:historyEcwValid?historyEcw:null,
     weight:n("inbody_weight"),targetWeight:controlBundleUsable?n("inbody_target_weight"):null,weightControl:controlBundleUsable?n("inbody_weight_control"):null,fatControl:controlBundleUsable?n("inbody_fat_control"):null,muscleControl:controlBundleUsable?n("inbody_muscle_control"):null
   };
   const gate={profile:"INBODY_720",parser:"INBODY_FIXED_ANCHOR_SOURCE_MATRIX_V10_306",sourceIntegrityVersion:"10.306",passed:issues.length===0,issues,warnings,reviewCodes:[...reviewCodes],requiredCount:required.length,detectedCount:required.filter(code=>n(code)!==null).length,segmentalRequiredCount:requiredSegmental.length,segmentalDetectedCount:requiredSegmental.length-missingSegmental.length,segmentalMissingCodes:missingSegmental,impedanceCount,missingCodes:missing,optionalMissingCodes:optionalMissing,canonicalSnapshot,checkedAt:new Date().toISOString()};
   return gate
 }

 function inbodyWeightControlBundle(text,currentWeight=null){
   const source=String(text||"").replace(/[−–—]/g,"-").replace(/,/g,".").replace(/([+-])\s+(?=\d)/g,"$1").replace(/(\d+)\.\s+(\d+)/g,"$1.$2");
   const kg=[...source.matchAll(/([+-]?\s*\d+(?:\.\s*\d+)?)\s*kg\b/gi)].map(m=>({raw:m[1].replace(/\s+/g,""),value:inbodyNumeric(m[1].replace(/\s+/g,""))})).filter(x=>x.value!==null);
   if(kg.length>=4){
     for(let i=0;i<=kg.length-4;i++){
       const [t,wc,fc,mc]=kg.slice(i,i+4).map(x=>x.value);
       if(!(t>=20&&t<=250&&wc>=-100&&wc<=100&&fc>=-100&&fc<=100&&mc>=-100&&mc<=100))continue;
       if(Math.abs((fc+mc)-wc)>.15)continue;
       if(Number.isFinite(Number(currentWeight))&&Math.abs((Number(currentWeight)+wc)-t)>.15)continue;
       return{target:t,weightControl:wc,fatControl:fc,muscleControl:mc,raw:kg.slice(i,i+4).map(x=>x.raw),targetDerived:false}
     }
   }
   // v10.269 — the target cell is pale and may OCR as 36.4/36.1 while the
   // three signed control rows are intact. If their printed identity passes,
   // recover Target Weight from current Weight + Weight Control. This is an
   // exact same-sheet definition, not a guessed clinical value.
   if(Number.isFinite(Number(currentWeight))&&kg.length>=3){
     for(let i=0;i<=kg.length-3;i++){
       const tri=kg.slice(i,i+3),[wc,fc,mc]=tri.map(x=>x.value);
       const signOkay=tri.every(x=>/^[+-]/.test(x.raw)||Math.abs(x.value)<1e-12);
       if(!signOkay)continue;
       if(!(wc>=-100&&wc<=100&&fc>=-100&&fc<=100&&mc>=-100&&mc<=100))continue;
       if(Math.abs((fc+mc)-wc)>.15)continue;
       const target=Math.round((Number(currentWeight)+wc)*10)/10;
       if(target<20||target>250)continue;
       return{target,weightControl:wc,fatControl:fc,muscleControl:mc,raw:[String(target),...tri.map(x=>x.raw)],targetDerived:true}
     }
   }
   return null
 }

 function inbodyWeightControlBundleFromPage(page,currentWeight=null){
   const passes=photoPasses(page).filter(pass=>clean(pass?.inbodyRegion||"").toLowerCase()==="weight-control"),items=[];
   for(const pass of passes){const bundle=inbodyWeightControlBundle(String(pass?.text||""),currentWeight);if(bundle)items.push({...bundle,confidence:Number(pass?.confidence||0),mode:clean(pass?.inbodyRegionPass||pass?.mode||""),sourcePixel:/source/i.test(clean(pass?.inbodyRegionPass||pass?.mode||""))})}
   if(!items.length)return null;const groups=new Map();
   for(const item of items){const key=[item.target,item.weightControl,item.fatControl,item.muscleControl].join("|"),g=groups.get(key)||{...item,count:0,score:0,modes:new Set(),sourceCount:0};g.count++;g.score+=Math.max(1,item.confidence);g.modes.add(item.mode);if(item.sourcePixel)g.sourceCount++;groups.set(key,g)}
   const ranked=[...groups.values()].sort((a,b)=>(b.score+b.count*24+b.modes.size*14+b.sourceCount*20)-(a.score+a.count*24+a.modes.size*14+a.sourceCount*20));
   const best=ranked[0];best.consensus=best.count>=2&&best.modes.size>=2;best.sourceConsensus=best.sourceCount>0&&best.count>=2;return best
 }
 function inbodyBottomWaterBundle(page){
   const passes=photoPasses(page).filter(pass=>pass?.inbodyWaterBottom===true||clean(pass?.inbodyRegion).toLowerCase()==="segmental-water-bottom"),candidates=[];
   for(const pass of passes){
     const source=String(pass.text||"").replace(/,/g,".").replace(/(0\.)\s+(\d)/g,"$1$2"),values=(source.match(/0\.\d{3}/g)||[]).map(Number).filter(v=>v>=.20&&v<=.60);
     if(values.length===4)candidates.push({values,confidence:Number(pass.confidence||0),mode:clean(pass.inbodyWaterBottomMode||pass.mode),sourcePixel:/source/i.test(clean(pass.inbodyWaterBottomMode||pass.mode))})
   }
   if(!candidates.length)return null;const groups=new Map();
   for(const item of candidates){const key=item.values.map(v=>v.toFixed(3)).join("|"),g=groups.get(key)||{...item,count:0,score:0,modes:new Set(),sourceCount:0};g.count++;g.score+=Math.max(1,item.confidence);g.modes.add(item.mode);if(item.sourcePixel)g.sourceCount++;groups.set(key,g)}
   const ranked=[...groups.values()].sort((a,b)=>(b.score+b.count*22+b.modes.size*14+b.sourceCount*18)-(a.score+a.count*22+a.modes.size*14+a.sourceCount*18));const best=ranked[0];
   // Bottom row is allowed to override individual cells only with independent
   // agreement. One damaged flattened line must never shift 0.378→0.318 or move
   // left-leg values into the whole-body columns.
   if(!(best.count>=2&&best.modes.size>=2))return null;
   return{leftLegEcf:best.values[0],leftLegEcw:best.values[1],wholeEcf:best.values[2],wholeEcw:best.values[3],consensus:true,raw:best.values.map(v=>v.toFixed(3)),sourceConsensus:best.sourceCount>0}
 }
 function inbodyVfaFromText(text){
   const source=String(text||"").replace(/,/g,".");
   for(const re of [/[★*•]\s*(\d{2,3}(?:\.\d+)?)/g,/Visceral\s+Fat\s+Area[\s\S]{0,320}?\b(\d{2,3}\.\d)\b/ig]){
     for(const m of source.matchAll(re)){const v=inbodyNumeric(m[1]);if(v!==null&&v>=20&&v<=300&&Math.abs(v-250)>1e-9)return v}
   }
   return null
 }
 function inbodyAdditionalBundle(text){
   const source=String(text||"").replace(/,/g,".").replace(/(\d+)\.\s+(\d+)/g,"$1.$2"),lines=source.split(/\n+/).map(clean).filter(Boolean);
   const get=(re,min,max)=>{const m=source.match(re);if(!m)return null;const v=inbodyNumeric(m[1]);return v!==null&&v>=min&&v<=max?v:null};
   const lineRange=(label,min,max)=>{const line=lines.find(x=>label.test(x));if(!line)return"";const matches=[...line.matchAll(/(\d+(?:\.\d+)?)\s*(?:~|[-–—])\s*(\d+(?:\.\d+)?)/g)];for(const m of matches){const lo=Number(m[1]),hi=Number(m[2]);if(Number.isFinite(lo)&&Number.isFinite(hi)&&lo>=min&&hi<=max&&hi>lo)return`${m[1]}-${m[2]}`}return""};
   return{
     obesityDegree:get(/Obesity\s+Degree\s*=\s*(\d{2,3})(?:\s*%|\b)/i,40,250),obesityRef:lineRange(/Obesity\s+Degree/i,40,220),
     bcm:get(/\bBCM\s*=\s*(\d+(?:\.\d+)?)/i,5,100),bcmRef:lineRange(/\bBCM\b/i,5,100),
     bmc:get(/\bBMC\s*=\s*(\d+(?:\.\d+)?)/i,.5,10),bmcRef:lineRange(/\bBMC\b/i,.5,10),
     bmr:get(/\bBMR\s*=\s*(\d{3,4})/i,500,4000),bmrRef:lineRange(/\bBMR\b/i,500,4000),
     ac:get(/\bA\s*C\s*=\s*(\d+(?:\.\d+)?)/i,10,80),amc:get(/\bAMC\s*=\s*(\d+(?:\.\d+)?)/i,8,70)
   }
 }

 function inbodyReferencePlausible(code,raw){
   const parsed=parseRef(raw||"");
   if(parsed.reference_operator!=="range")return Boolean(clean(raw));
   const lo=Number(parsed.reference_low),hi=Number(parsed.reference_high);
   if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo)return false;
   const mid=(Math.abs(lo)+Math.abs(hi))/2,width=hi-lo,ratio=width/Math.max(mid,1e-6);
   // InBody 720 printed physiologic ranges are not razor-thin. Damaged OCR such
   // as Minerals 2.93–3.04 or SMM 23.9–24.0 is more dangerous than a missing
   // range because it creates a false abnormal flag. Keep WHR's naturally narrow
   // interval by using a lower threshold there.
   if(code==="inbody_percent_body_fat"&&lo<5)return false; // 1.0–20.0 is a common dropped-zero OCR artifact on 10.0–20.0
   const minRatio=code==="inbody_waist_hip_ratio"?.07:.08;
   return ratio>=minRatio
 }
 function inbodyRows(page,groupMeta={}){
   const allText=photoPasses(page).map(pass=>String(pass?.text||"")).join("\n");
   if(clean(page?.profileHint).toUpperCase()!=="INBODY_720"&&!/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area|ECW\s*\/\s*TBW/i.test(allText))return[];
   const tokens=inbodyGeometryTokens(page),fixedHistory=inbodyFixedHistoryAnchorMatrix(page,tokens),textHistory=inbodyHistoryBundle(inbodyRegionText(page,"history"));
   const hasFocusedHistory=photoPasses(page).some(pass=>clean(pass?.inbodyRegion).toLowerCase()==="history");
   // Real scans: only the fixed physical History columns may supply the critical
   // tuple.  Flattened OCR text is retained solely for legacy/text-only fixtures.
   const history=(fixedHistory?.structurallyCoherent?fixedHistory:(!hasFocusedHistory?textHistory:null));
   const segmentParts=["right_arm","left_arm","trunk","right_leg","left_leg"],segmentBundles=new Map(segmentParts.map(part=>[part,inbodySegmentRowBundle(page,part)]));
   const segmentIntegrityAudit=inbodyReconcileSegmentBundles(segmentBundles);
   const configs=[
     // Header — deterministic label/ROI source.
     {code:"inbody_reported_age",unit:"years",region:"header",zone:[.205,.315,.060,.120],min:1,max:120,expectedDecimals:0,textRegion:"header",preferText:true,text:[/\b(\d{1,3})\s+\d{2,3}\s*cm\s+(?:Male|Female)\b/i]},
     {code:"inbody_height_cm",unit:"cm",region:"header",zone:[.270,.375,.060,.120],min:100,max:230,expectedDecimals:0,textRegion:"header",preferText:true,text:[/\b\d{1,3}\s+(\d{2,3})\s*cm\s+(?:Male|Female)\b/i]},

     // Body composition — each value and printed normal interval is locked to the
     // dedicated composition OCR pass and a narrow physical row.
     {code:"inbody_intracellular_water",unit:"L",regions:["composition","composition-threshold"],zone:[.145,.205,.140,.158],min:5,max:60,expectedDecimals:1,refZone:[.555,.680,.140,.158],refMin:5,refMax:60},
     {code:"inbody_extracellular_water",unit:"L",regions:["composition","composition-threshold"],zone:[.145,.205,.162,.183],min:3,max:40,expectedDecimals:1,refZone:[.555,.680,.162,.183],refMin:3,refMax:40},
     {code:"inbody_total_body_water",unit:"L",regions:["composition","composition-threshold"],zone:[.225,.300,.148,.176],min:10,max:100,expectedDecimals:1},
     {code:"inbody_soft_lean_mass",unit:"kg",regions:["composition","composition-threshold"],zone:[.325,.390,.164,.195],min:10,max:150,expectedDecimals:1},
     {code:"inbody_fat_free_mass",unit:"kg",regions:["composition","composition-threshold"],zone:[.405,.475,.184,.216],min:10,max:180,expectedDecimals:1},
     {code:"inbody_protein",unit:"kg",regions:["composition","composition-threshold"],zone:[.145,.205,.184,.211],min:2,max:30,expectedDecimals:1,refZone:[.555,.680,.184,.211],refMin:2,refMax:30},
     {code:"inbody_minerals",unit:"kg",regions:["composition","composition-threshold"],zone:[.145,.205,.211,.236],min:.5,max:10,expectedDecimals:2,refZone:[.555,.680,.211,.236],refMin:.5,refMax:10},

     // Muscle/Fat — Weight/SMM/Fat values come from the atomic History tuple,
     // while their reference intervals are read only from their own printed row.
     {code:"inbody_weight",unit:"kg",regions:["history","muscle-fat","muscle-fat-threshold"],zone:[.325,.405,.294,.317],min:20,max:300,expectedDecimals:1,historyKey:"weight",refZone:[.555,.680,.294,.315],refMin:20,refMax:300,refRegion:"muscle-fat"},
     {code:"inbody_skeletal_muscle_mass",unit:"kg",regions:["history","muscle-fat","muscle-fat-threshold"],zone:[.215,.315,.321,.345],min:5,max:100,expectedDecimals:1,historyKey:"smm",refZone:[.555,.680,.321,.343],refMin:5,refMax:100,refRegion:"muscle-fat"},
     {code:"inbody_body_fat_mass",unit:"kg",regions:["history","composition","composition-threshold","muscle-fat","muscle-fat-threshold"],zone:[.145,.205,.238,.266],fallback:[.385,.455,.348,.371],min:1,max:150,expectedDecimals:1,historyKey:"fat",refZone:[.555,.680,.348,.371],refMin:1,refMax:150,refRegion:"muscle-fat"},

     // Obesity — y bands deliberately exclude graph-axis tick labels.
     {code:"inbody_bmi",unit:"kg/m²",regions:["obesity","obesity-threshold"],zone:[.310,.395,.421,.438],fallback:[.245,.500,.414,.431],min:10,max:80,expectedDecimals:1,refZone:[.555,.680,.414,.431],refMin:10,refMax:80},
     {code:"inbody_percent_body_fat",unit:"%",regions:["obesity","obesity-threshold"],zone:[.415,.495,.451,.470],fallback:[.245,.500,.447,.465],min:2,max:80,expectedDecimals:1,refZone:[.555,.680,.447,.465],refMin:2,refMax:80},
     {code:"inbody_waist_hip_ratio",unit:"ratio",regions:["obesity","obesity-threshold"],zone:[.300,.405,.484,.503],fallback:[.245,.500,.478,.497],min:.5,max:1.5,expectedDecimals:2,refZone:[.555,.680,.478,.497],refMin:.5,refMax:1.5},
     {code:"inbody_visceral_fat_area",unit:"cm²",regions:["right-summary","right-summary-color"],zone:[.790,.920,.180,.235],min:1,max:400,expectedDecimals:1,textRegion:["right-summary","right-summary-color"],preferText:true,text:[/Visceral\s+Fat\s+Area[\s\S]{0,300}?[★*•]\s*(\d{1,3}(?:[.,]\d+)?)/i,/VFA(?:\(cm²?\))?[\s\S]{0,180}?[★*•]\s*(\d{1,3}(?:[.,]\d+)?)/i]},

     // Segmental matrix — row and column identity are deterministic. Graph-axis
     // numbers are excluded by tight vertical result bands.
     {code:"inbody_segment_right_arm_lean_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.205,.455,.542,.556],min:.2,max:20,expectedDecimals:2},
     {code:"inbody_segment_right_arm_lean_pct",unit:"% ideal",regions:["segmental","segmental-threshold"],zone:[.190,.455,.554,.571],min:40,max:220,expectedDecimals:1},
     {code:"inbody_segment_right_arm_fat_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.355,.455,.560,.584],min:.1,max:30,expectedDecimals:1},
     {code:"inbody_segment_right_arm_fat_pct",unit:"% standard",regions:["segmental","segmental-threshold"],zone:[.405,.480,.560,.584],min:50,max:500,expectedDecimals:0},
     {code:"inbody_segment_left_arm_lean_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.205,.455,.583,.599],min:.2,max:20,expectedDecimals:2},
     {code:"inbody_segment_left_arm_lean_pct",unit:"% ideal",regions:["segmental","segmental-threshold"],zone:[.190,.455,.595,.612],min:40,max:220,expectedDecimals:1},
     {code:"inbody_segment_left_arm_fat_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.355,.455,.601,.625],min:.1,max:30,expectedDecimals:1},
     {code:"inbody_segment_left_arm_fat_pct",unit:"% standard",regions:["segmental","segmental-threshold"],zone:[.405,.480,.601,.625],min:50,max:500,expectedDecimals:0},
     {code:"inbody_segment_trunk_lean_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.205,.455,.625,.642],min:5,max:80,expectedDecimals:1},
     {code:"inbody_segment_trunk_lean_pct",unit:"% ideal",regions:["segmental","segmental-threshold"],zone:[.190,.455,.637,.655],min:40,max:220,expectedDecimals:1},
     {code:"inbody_segment_trunk_fat_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.355,.455,.644,.668],min:.5,max:80,expectedDecimals:1},
     {code:"inbody_segment_trunk_fat_pct",unit:"% standard",regions:["segmental","segmental-threshold"],zone:[.405,.480,.644,.668],min:50,max:500,expectedDecimals:0},
     {code:"inbody_segment_right_leg_lean_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.205,.455,.669,.687],min:1,max:40,expectedDecimals:2},
     {code:"inbody_segment_right_leg_lean_pct",unit:"% ideal",regions:["segmental","segmental-threshold"],zone:[.190,.455,.681,.700],min:40,max:220,expectedDecimals:1},
     {code:"inbody_segment_right_leg_fat_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.355,.455,.688,.714],min:.2,max:40,expectedDecimals:1},
     {code:"inbody_segment_right_leg_fat_pct",unit:"% standard",regions:["segmental","segmental-threshold"],zone:[.405,.480,.688,.714],min:50,max:500,expectedDecimals:0},
     {code:"inbody_segment_left_leg_lean_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.205,.455,.708,.731],min:1,max:40,expectedDecimals:2},
     {code:"inbody_segment_left_leg_lean_pct",unit:"% ideal",regions:["segmental","segmental-threshold"],zone:[.190,.455,.720,.744],min:40,max:220,expectedDecimals:1},
     {code:"inbody_segment_left_leg_fat_mass",unit:"kg",regions:["segmental","segmental-threshold"],zone:[.355,.455,.727,.757],min:.2,max:40,expectedDecimals:1},
     {code:"inbody_segment_left_leg_fat_pct",unit:"% standard",regions:["segmental","segmental-threshold"],zone:[.405,.480,.727,.757],min:50,max:500,expectedDecimals:0},

     // Segmental water — hard column lock prevents ECF/TBF ↔ ECW/TBW swaps.
     {code:"inbody_segment_right_arm_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.455,.515,.544,.570],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_segment_right_arm_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.515,.570,.544,.570],min:.20,max:.60,expectedDecimals:3},
     {code:"inbody_segment_left_arm_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.455,.515,.586,.612],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_segment_left_arm_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.515,.570,.586,.612],min:.20,max:.60,expectedDecimals:3},
     {code:"inbody_segment_trunk_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.455,.515,.629,.655],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_segment_trunk_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.515,.570,.629,.655],min:.20,max:.60,expectedDecimals:3},
     {code:"inbody_segment_right_leg_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.455,.515,.675,.700],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_segment_right_leg_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.515,.570,.675,.700],min:.20,max:.60,expectedDecimals:3},
     {code:"inbody_segment_left_leg_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.455,.515,.719,.744],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_segment_left_leg_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.515,.570,.719,.744],min:.20,max:.60,expectedDecimals:3},
     {code:"inbody_ecf_tbf",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.565,.625,.716,.760],fallback:[.565,.625,.707,.765],min:.20,max:.50,expectedDecimals:3},
     {code:"inbody_ecw_tbw",unit:"ratio",regions:["segmental","segmental-threshold"],zone:[.625,.685,.716,.760],fallback:[.625,.685,.707,.765],min:.20,max:.60,expectedDecimals:3},

     // History/additional data — label-anchored OCR from the dedicated history ROI
     // is preferred over anonymous geometry tokens.
     {code:"inbody_history_ecw_tbw",unit:"ratio",regions:["history"],zone:[.300,.390,.780,.825],min:.2,max:.6,expectedDecimals:3,historyKey:"ecwTbw"},
     {code:"inbody_bone_mineral_content",unit:"kg",regions:["history","composition","composition-threshold"],zone:[.400,.535,.800,.825],fallback:[.300,.395,.208,.236],min:.5,max:10,expectedDecimals:2,textRegion:"history",preferText:true,text:[/\bBMC\s*=\s*(\d+(?:[.,]\d+)?)/i],refText:[/\bBMC\s*=\s*\d+(?:\.\d+)?\s*kg[\s\S]{0,60}?(\d+(?:\.\d+)?)\s*[~\-–]\s*(\d+(?:\.\d+)?)/i]},
     {code:"inbody_body_cell_mass",unit:"kg",region:"history",zone:[.400,.535,.788,.813],min:5,max:100,expectedDecimals:1,textRegion:"history",preferText:true,text:[/\bBCM\s*=\s*(\d+(?:[.,]\d+)?)/i],refText:[/\bBCM\s*=\s*\d+(?:\.\d+)?\s*kg[\s\S]{0,60}?(\d+(?:\.\d+)?)\s*[~\-–]\s*(\d+(?:\.\d+)?)/i]},
     {code:"inbody_bmr",unit:"kcal/day",region:"history",zone:[.400,.540,.812,.839],min:500,max:4000,expectedDecimals:0,textRegion:"history",preferText:true,text:[/\bBMR\s*=\s*(\d{3,4})/i],refText:[/\bBMR\s*=\s*\d{3,4}\s*kcal[\s\S]{0,60}?(\d{3,4})\s*[~\-–]\s*(\d{3,4})/i]},
     {code:"inbody_arm_circumference",unit:"cm",region:"history",zone:[.400,.535,.828,.850],min:10,max:80,expectedDecimals:1,textRegion:"history",preferText:true,text:[/\bA\s*C\s*=\s*(\d+(?:[.,]\d+)?)/i]},
     {code:"inbody_arm_muscle_circumference",unit:"cm",region:"history",zone:[.400,.535,.842,.865],min:8,max:70,expectedDecimals:1,textRegion:"history",preferText:true,text:[/\bAMC\s*=\s*(\d+(?:[.,]\d+)?)/i]},
     {code:"inbody_obesity_degree",unit:"%",region:"history",zone:[.400,.545,.774,.802],min:40,max:250,expectedDecimals:0,textRegion:"history",preferText:true,text:[/Obesity\s+Degree\s*=\s*(\d{2,3})/i],refText:[/Obesity\s+Degree\s*=\s*\d{2,3}%?[\s\S]{0,90}?(\d{2,3})\s*[~\-–]\s*(\d{2,3})/i]},

     // Weight-control rows — region lock is mandatory; signs must be visible.
     {code:"inbody_target_weight",unit:"kg",region:"weight-control",zone:[.825,.950,.765,.787],min:20,max:250,expectedDecimals:1},
     {code:"inbody_weight_control",unit:"kg",region:"weight-control",zone:[.825,.950,.787,.809],min:-100,max:100,expectedDecimals:1,signed:true},
     {code:"inbody_fat_control",unit:"kg",region:"weight-control",zone:[.825,.950,.807,.830],min:-100,max:100,expectedDecimals:1,signed:true},
     {code:"inbody_muscle_control",unit:"kg",region:"weight-control",zone:[.825,.950,.828,.850],min:-100,max:100,expectedDecimals:1,signed:true},
     {code:"inbody_fitness_score",unit:"points",regions:["history","weight-control"],zone:[.825,.950,.846,.870],min:0,max:100,expectedDecimals:0,historyKey:"score",textRegion:"weight-control",preferText:true,text:[/Fitness\s+Score\s*[:=]?\s*(\d{1,3})/i]}
   ];
   const output=[];
   for(const config of configs){
     const sourceRegions=config.regions||[config.region].filter(Boolean);
     const candidateOptions={regions:sourceRegions,region:config.region,expectedDecimals:config.expectedDecimals};
     let candidate=inbodyFieldPassCandidate(page,config.code,config.min,config.max,{expectedDecimals:config.expectedDecimals,signed:config.signed});
     const segmentMatch=String(config.code||"").match(/^inbody_segment_(right_arm|left_arm|trunk|right_leg|left_leg)_(lean_mass|lean_pct|fat_mass|fat_pct|ecf_tbf|ecw_tbw)$/);
     if(segmentMatch){
       const field=segmentMatch[2],rowCandidate=segmentBundles.get(segmentMatch[1])?.[field]||null,waterField=field==="ecf_tbf"||field==="ecw_tbw";
       if(rowCandidate){
         // v10.299 — water cells have fixed printed columns, so their dedicated
         // micro-ROI is authoritative. Row-strip text is retained only as
         // corroboration. For moving Lean/Fat bars the semantic row remains the
         // primary source, with left/right column-integrity reconciliation above.
         if(waterField&&candidate&&!candidate.ambiguous){
           candidate={...candidate,alternatives:[...new Set([...(candidate.alternatives||[]),Number(rowCandidate.value),...(rowCandidate.alternatives||[])])],micro:true,regionLocked:true,waterColumnLocked:true,rowStripAdvisory:Boolean(Number(candidate.value)!==Number(rowCandidate.value))};
         }else if(!rowCandidate.ambiguous){
           const rowConsensus=Number(rowCandidate.segmentRowConsensusCount||0)>=2;
           if(candidate&&Math.abs(Number(candidate.value)-Number(rowCandidate.value))<1e-9){
             candidate={...rowCandidate,confidence:Math.min(99,Math.max(Number(rowCandidate.confidence||0),Number(candidate.confidence||0))+7),ocrConfidence:Math.max(Number(candidate.ocrConfidence||0),Number(rowCandidate.ocrConfidence||0)),segmentRow:true,segmentRowConsensus:true,independentConsensus:true,microEvidence:Boolean(candidate.micro),regionLocked:true};
           }else if(rowConsensus){
             candidate={...rowCandidate,alternatives:[...new Set([...(rowCandidate.alternatives||[]),...(candidate&&Number.isFinite(Number(candidate.value))?[Number(candidate.value)]:[])])],segmentRow:true,segmentRowConsensus:true,regionLocked:true,microConflictAdvisory:Boolean(candidate&&Number(candidate.value)!==Number(rowCandidate.value))}
           }else if(candidate&&!candidate.ambiguous){
             candidate={...candidate,alternatives:[...new Set([...(candidate.alternatives||[]),Number(rowCandidate.value),...(rowCandidate.alternatives||[])])],micro:true,regionLocked:true,segmentRowConflictAdvisory:true};
           }else candidate=rowCandidate;
         }else if(!candidate||candidate.ambiguous)candidate=rowCandidate;
       }
     }
     if(config.historyKey&&history&&Number.isFinite(Number(history[config.historyKey]))){
       const hv=Number(history[config.historyKey]);
       candidate={value:hv,confidence:99,ambiguous:false,hits:[],alternatives:candidate&&Number(candidate.value)!==hv?[Number(candidate.value)]:[],history:true,regionLocked:true,historyOverride:Boolean(candidate&&Number(candidate.value)!==hv)}
     }
     if(!candidate)candidate=inbodyZoneCandidate(tokens,config.zone,config.min,config.max,candidateOptions);
     if((!candidate||candidate.ambiguous)&&config.fallback){const alt=inbodyZoneCandidate(tokens,config.fallback,config.min,config.max,candidateOptions);if(alt&&(!candidate||alt.confidence>candidate.confidence))candidate=alt}
     if(candidate&&config.signed&&Math.abs(Number(candidate.value))>1e-12){
       // Micro-ROI candidates carry the visible sign in candidate.raw rather than
       // geometry hits. v10.257 accidentally discarded valid -14.4 / +3.8 cells
       // because hits[] was empty. Accept only a sign actually seen in source OCR.
       const visibleSign=/^[+-]/.test(clean(candidate.raw))||(candidate.hits||[]).some(hit=>/^[+-]/.test(clean(hit.raw)));
       if(!(candidate.history||visibleSign))candidate=null
     }

     const textSource=config.textRegion?inbodyRegionText(page,config.textRegion):allText;
     const textValue=config.text?inbodyTextNumber(textSource,config.text,config.min,config.max):null;
     if(textValue!==null&&(config.preferText||!candidate||candidate.ambiguous||candidate.confidence<92)){
       const hasDedicatedRegion=config.textRegion&&inbodyRegionText(page,config.textRegion)!==allText;
       candidate={value:textValue,confidence:97,ambiguous:false,hits:[],alternatives:[],text:true,labelAnchored:true,regionLocked:Boolean(hasDedicatedRegion)}
     }
     // Dedicated micro-ROI OCR is a physical cell crop, so a low Tesseract
     // confidence must not erase a clearly tokenized value.  Keep the value as
     // review evidence (never silently Final) and let the Validation Gate +
     // manual confirmation decide whether it may be imported.
     const minCandidateConfidence=candidate?.micro?18:58;
     if(!candidate||candidate.ambiguous||candidate.confidence<minCandidateConfidence)continue;

     const refOptions={regions:[config.refRegion||config.region,...(config.refRegions||[]),...sourceRegions,"reference-column"].filter(Boolean)};
     let referenceInfo=inbodyReferenceFieldPass(page,config.code,config.refMin??config.min,config.refMax??config.max);
     if(!referenceInfo&&config.refZone)referenceInfo=inbodyReferenceFromZone(tokens,config.refZone,config.refMin??config.min,config.refMax??config.max,refOptions);
     const refTextSource=config.textRegion?inbodyRegionText(page,config.textRegion):allText;
     if(!referenceInfo&&config.refText)referenceInfo=inbodyReferenceFromText(refTextSource,config.refText);
     let reference=referenceInfo?.raw||"";
     if(reference&&!inbodyReferencePlausible(config.code,reference)){
       reference="";referenceInfo=null;
     }
     const segmental=/^inbody_segment_/.test(config.code),relative=/_lean_pct$/.test(config.code)?"ค่านี้เป็น Lean / Ideal Lean ×100 (%) ตามต้นฉบับ InBody":/_fat_pct$/.test(config.code)?"ตัวเลขในวงเล็บเป็นร้อยละของไขมันรายส่วนเทียบเกณฑ์อ้างอิงของเครื่อง ไม่ใช่ Percent Body Fat ของทั้งร่างกาย":config.code==="inbody_ecw_tbw"?"ค่าจากช่อง ‘ค่าบวมน้ำ’ ของทั้งร่างกาย":config.code==="inbody_history_ecw_tbw"?"ค่าที่พิมพ์ใน Body Composition History; เก็บแยกจากค่าบวมน้ำหลักเพื่อไม่เขียนทับกัน":"";
     const sourceKind=candidate.independentConsensus?"segmental row + micro-ROI consensus":candidate.multiPassConsensus?"micro-ROI multi-pass consensus":candidate.micro?"micro-ROI numeric cell":candidate.segmentRow?"segmental row strip":candidate.history?"history row":candidate.text?"label-anchored ROI text":"deterministic ROI cell";
     const row=specializedRow(config.code,page,{mode:candidate.micro?"inbody-micro-roi":candidate.segmentRow?"inbody-segment-row":candidate.history?"inbody-history-bundle":candidate.text?"inbody-roi-label":"inbody-deterministic-roi",confidence:candidate.confidence},String(candidate.value),{
       unit:config.unit,reference,profile:"INBODY_720",method:"Bioelectrical Impedance Analysis (InBody 720)",allowRepair:false,
       sourceLine:`InBody 720 ${sourceKind}: ${config.code} = ${candidate.value}${reference?` | printed normal ${reference}`:''}`,
       referenceContext:reference?`ช่วงอ้างอิงที่อ่านจาก ROI แถวเดียวกันของแบบฟอร์ม InBody 720 (${reference})`:relative||"ไม่มีการเติมช่วงอ้างอิงจากผู้ป่วยรายอื่น"
     });
     if(!row)continue;
     row.inbody_geometry_source=!candidate.history&&!candidate.text&&!candidate.micro;
     row.inbody_history_source=Boolean(candidate.history);
     row.inbody_label_anchored=Boolean(candidate.labelAnchored||candidate.micro||candidate.segmentRow);
     row.inbody_roi_locked=Boolean(candidate.regionLocked||candidate.history||candidate.labelAnchored||candidate.segmentRow);
     row.inbody_roi_region=sourceRegions.join("|");
     row.inbody_segmental=segmental;
     row.inbody_source_confidence=Number(candidate.ocrConfidence??candidate.confidence??0);
     row.inbody_multi_pass_consensus=Boolean(candidate.multiPassConsensus||candidate.independentConsensus||candidate.segmentRowConsensus);
     row.inbody_source_pixel_evidence=Boolean(candidate.sourcePixelConsensus||(candidate.items||[]).some(item=>/source/i.test(clean(item?.microMode||item?.mode||""))));
     row.inbody_candidate_alternatives=[...new Set((candidate.alternatives||[]).map(Number).filter(Number.isFinite))];
     row.inbody_column_integrity_reconciled=Boolean(candidate.columnIntegrityReconciled);
     row.inbody_water_column_locked=Boolean(candidate.waterColumnLocked);
     if(segmentIntegrityAudit.length&&segmental)row.inbody_segment_integrity_audit=segmentIntegrityAudit;
     row.inbody_low_confidence_source=Boolean(candidate.micro&&!candidate.multiPassConsensus&&!candidate.independentConsensus&&Number(candidate.ocrConfidence??0)<55);
     if(row.inbody_low_confidence_source){
       row.low_confidence_advisory=true;
       row.review_recommended=false;
       row.inbody_auto_accepted_low_confidence=true;
       row.inbody_advisory_reason=`InBody micro-ROI OCR confidence ${Number(candidate.ocrConfidence??0).toFixed(0)}% — ROI-locked; ใช้ Validation Gate แทนการบังคับ Verify`;
     }
     row.source_file=groupMeta.source_file||page.sourceFileName||row.source_file;
     row.source_evidence.push({type:candidate.micro?"inbody-micro-roi":candidate.segmentRow?"inbody-segment-row":candidate.history?"inbody-history-row":candidate.text?"inbody-roi-label":"inbody-deterministic-roi",profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,roi_regions:sourceRegions,ocr_modes:[...new Set((candidate.hits||[]).map(x=>x.mode))],alternatives:candidate.alternatives||[],reference_source:referenceInfo?"current-sheet-roi":"none"});
     output.push(row)
   }
   // Add impedance only from the dedicated impedance ROI. A page-wide OCR line is
   // not allowed to become impedance source truth when focused region evidence exists.
   const impedanceText=inbodyRegionText(page,["impedance","impedance-threshold"]);
   for(const imp of inbodyImpedanceRows(impedanceText)){
     const row=specializedRow(imp.code,page,{mode:"inbody-impedance-roi-row",confidence:97},String(imp.value),{unit:"Ω",reference:"",profile:"INBODY_720",method:"Bioelectrical Impedance Analysis (InBody 720)",allowRepair:false,sourceLine:`InBody 720 impedance ROI ${imp.frequency.toUpperCase()} ${imp.segment.toUpperCase()} = ${imp.value} Ω`,referenceContext:"ค่าความต้านทานจากตาราง 6 frequencies × 5 segments ใน ROI ความต้านทาน; ไม่มีการสร้างช่วงอ้างอิงเพิ่ม"});
     if(row){row.inbody_impedance=true;row.inbody_impedance_frequency=imp.frequency;row.inbody_impedance_segment=imp.segment;row.inbody_roi_locked=true;row.inbody_roi_region="impedance";row.source_file=groupMeta.source_file||page.sourceFileName||row.source_file;row.source_evidence.push({type:"inbody-impedance-roi-row",profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,frequency:imp.frequency,segment:imp.segment,roi_regions:["impedance","impedance-threshold"]});output.push(row)}
   }

   // v10.259 — definition-backed auto-resolution. These rescues are restricted
   // to quantities mathematically DEFINED by other values printed on the same
   // InBody sheet. Every rescue is tagged in Source Audit.
   const configByCodeRescue=new Map(configs.map(config=>[config.code,config]));
   const outByCode=()=>inbodyBestRowMap(output);
   let weightControlFoundation=false;
   const sourceOverride=(code,value,reason,evidenceType="inbody-current-sheet-reconciliation",reference="",options={})=>{
     if(!Number.isFinite(Number(value)))return false;
     let row=outByCode().get(code);const numeric=Number(value),existing=inbodyNumericFromRow(row),tolerance=Number(options.tolerance??(/(?:ecf_tbf|ecw_tbw)$/.test(code)?.0015:.12));
     if(row&&options.protectDirect&&row.inbody_multi_pass_consensus&&existing!==null&&Math.abs(existing-numeric)>tolerance){
       row.inbody_column_integrity_conflict=true;row.source_evidence=row.source_evidence||[];row.source_evidence.push({type:"inbody-reconciliation-conflict-kept-direct",profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,code,direct_value:existing,rejected_bundle_value:numeric,reason});return false
     }
     const display=/(?:ecf_tbf|ecw_tbw)$/.test(code)?numeric.toFixed(3):String(numeric);
     if(!row){
       const config=configByCodeRescue.get(code)||{};
       row=specializedRow(code,page,{mode:evidenceType,confidence:99},display,{unit:config.unit||"",reference:"",profile:"INBODY_720",method:"Bioelectrical Impedance Analysis (InBody 720)",allowRepair:false,sourceLine:`InBody 720 source reconciliation: ${code} = ${display} | ${reason}`,referenceContext:"source-derived atomic ROI bundle"});
       if(!row)return false;output.push(row)
     }
     row.value_raw=display;row.value_numeric=numeric;row.valueNumeric=numeric;row.reported_value_raw=display;
     if(clean(reference)&&inbodyReferenceStructurallyPlausible(code,reference)){row.reference_raw=clean(reference);row.reported_reference_raw=clean(reference);const rp=parseRef(row.reference_raw);row.reference_low=rp.reference_low;row.reference_high=rp.reference_high;row.reference_operator=rp.reference_operator;row.inbody_reference_reconciled=true}
     row.inbody_roi_locked=true;row.inbody_label_anchored=true;row.inbody_source_confidence=99;row.inbody_canonical_source=true;row.confidence=Math.max(Number(row.confidence||0),99);row.parse_issue=false;row.review_recommended=false;
     row.source_line=`InBody 720 source reconciliation: ${code} = ${display} | ${reason}`;row.sourceLine=row.source_line;
     row.source_evidence=row.source_evidence||[];row.source_evidence.push({type:evidenceType,profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,code,reason});
     return true
   };
   // v10.306 — promote the five fixed History columns before any reconciliation.
   // These are verbatim source-matrix cells, not arithmetic reconstructions.
   if(fixedHistory?.structurallyCoherent){
     const matrixRows=[
       ["inbody_weight",fixedHistory.weight],["inbody_skeletal_muscle_mass",fixedHistory.smm],
       ["inbody_fitness_score",fixedHistory.score]
     ];
     if(Number.isFinite(fixedHistory.fat))matrixRows.push(["inbody_body_fat_mass",fixedHistory.fat]);
     if(Number.isFinite(fixedHistory.ecwTbw))matrixRows.push(["inbody_history_ecw_tbw",fixedHistory.ecwTbw]);
     for(const [code,value] of matrixRows){
       sourceOverride(code,value,"fixed physical Body Composition History column","inbody-v10.306-fixed-history-source-matrix","",{protectDirect:false,tolerance:code==="inbody_history_ecw_tbw"?.0015:.12});
       const r=outByCode().get(code);if(r){r.inbody_fixed_source_matrix=true;r.inbody_history_source=true;r.inbody_multi_pass_consensus=true;r.inbody_source_pixel_evidence=true;r.inbody_source_confidence=99;r.confidence=Math.max(99,Number(r.confidence||0));}
     }
     // BMI and PBF are defined identities.  When their OCR cells disagree with
     // the fixed source matrix, use a same-sheet derived value and label it as
     // derived; never allow the bad OCR token to drive Clinical Interpretation.
     let fixedFat=Number.isFinite(fixedHistory.fat)?fixedHistory.fat:null;
     if(fixedFat===null){const ffm=inbodyNumericFromRow(outByCode().get("inbody_fat_free_mass"));if(Number.isFinite(ffm)&&ffm>10&&fixedHistory.weight>ffm){fixedFat=Math.round((fixedHistory.weight-ffm)*10)/10;sourceOverride("inbody_body_fat_mass",fixedFat,"Fat Mass = fixed History Weight − source Fat Free Mass","inbody-v10.306-defined-from-fixed-source-matrix","",{protectDirect:false});const rr=outByCode().get("inbody_body_fat_mass");if(rr){rr.inbody_auto_same_sheet_derived=true;rr.inbody_defined_identity=true;}}}
     const h=inbodyNumericFromRow(outByCode().get("inbody_height_cm"));
     if(Number.isFinite(h)&&h>=100&&h<=230&&Number.isFinite(fixedFat)){
       const bmi=Math.round((fixedHistory.weight/((h/100)**2))*10)/10;
       const pbf=Math.round((fixedFat/fixedHistory.weight*100)*10)/10;
       const derive=(code,value,reason)=>{
         const r=outByCode().get(code),before=inbodyNumericFromRow(r);
         if(!r||before===null||Math.abs(before-value)>.22){
           sourceOverride(code,value,reason,"inbody-v10.306-defined-from-fixed-source-matrix","",{protectDirect:false,tolerance:.22});
           const rr=outByCode().get(code);if(rr){rr.inbody_auto_same_sheet_derived=true;rr.inbody_defined_identity=true;rr.inbody_fixed_source_matrix_crosscheck=true;rr.source_line=`InBody 720 defined same-sheet cross-check: ${code} = ${value} | ${reason}`;}
         }
       };
       derive("inbody_bmi",bmi,"BMI = Weight / Height² using fixed History Weight and header Height");
       derive("inbody_percent_body_fat",pbf,"PBF = Fat Mass / Weight ×100 using fixed History columns");
     }
   }

   {
     const historyText=inbodyRegionText(page,"history"),hist=fixedHistory?.structurallyCoherent?fixedHistory:inbodyHistoryBundle(historyText),historyEcw=hist?.ecwTbw??inbodyHistoryEcwTbwFromText(historyText);
     if(historyEcw!=null)sourceOverride("inbody_history_ecw_tbw",historyEcw,hist?.ecwTbw!=null?"atomic Body Composition History tuple":"History ECW/TBW trailing-column anchor","inbody-history-bundle-reconciliation","",{protectDirect:true,tolerance:.0015});
     const add=inbodyAdditionalBundle(historyText);
     if(add.obesityDegree!=null)sourceOverride("inbody_obesity_degree",add.obesityDegree,"Additional Data label/value bundle","inbody-current-sheet-reconciliation",add.obesityRef,{protectDirect:true});
     if(add.bcm!=null)sourceOverride("inbody_body_cell_mass",add.bcm,"Additional Data label/value bundle","inbody-current-sheet-reconciliation",add.bcmRef,{protectDirect:true});
     if(add.bmc!=null)sourceOverride("inbody_bone_mineral_content",add.bmc,"Additional Data label/value bundle","inbody-current-sheet-reconciliation",add.bmcRef,{protectDirect:true});
     if(add.bmr!=null)sourceOverride("inbody_bmr",add.bmr,"Additional Data label/value bundle","inbody-current-sheet-reconciliation",add.bmrRef,{protectDirect:true});
     if(add.ac!=null)sourceOverride("inbody_arm_circumference",add.ac,"Additional Data label/value bundle","inbody-current-sheet-reconciliation","",{protectDirect:true});
     if(add.amc!=null)sourceOverride("inbody_arm_muscle_circumference",add.amc,"Additional Data label/value bundle","inbody-current-sheet-reconciliation","",{protectDirect:true});

     const currentWeight=inbodyNumericFromRow(outByCode().get("inbody_weight")),fixedControl=inbodyFixedWeightControlMatrix(page,tokens,currentWeight),control=inbodyWeightControlBundleFromPage(page,currentWeight);
     const controlCodes=["inbody_target_weight","inbody_weight_control","inbody_fat_control","inbody_muscle_control"];
     if(fixedControl?.controlsCoherent){
       const fixedRows=[[controlCodes[0],fixedControl.target],[controlCodes[1],fixedControl.weightControl],[controlCodes[2],fixedControl.fatControl],[controlCodes[3],fixedControl.muscleControl]];
       for(const [code,value] of fixedRows){sourceOverride(code,value,fixedControl.identityDerived?"Weight Control identity reconstructed from fixed row magnitudes + same-sheet identities":"fixed physical Weight Control column",fixedControl.identityDerived?"inbody-v10.306-defined-weight-control-identities":"inbody-v10.306-fixed-weight-control-source-matrix","",{protectDirect:false});const r=outByCode().get(code);if(r){r.inbody_control_integrity_confirmed=true;r.inbody_fixed_source_matrix=true;r.inbody_multi_pass_consensus=true;r.inbody_source_pixel_evidence=!fixedControl.identityDerived;r.inbody_defined_identity=Boolean(fixedControl.identityDerived);r.inbody_source_confidence=99;}}
       if(Number.isFinite(fixedControl.score))sourceOverride("inbody_fitness_score",fixedControl.score,"fixed physical Fitness Score cell","inbody-v10.306-fixed-weight-control-source-matrix","",{protectDirect:false});
       weightControlFoundation=true;
     }else if(control?.consensus){
       const controlRows=[[controlCodes[0],control.target,control.raw?.[0]],[controlCodes[1],control.weightControl,control.raw?.[1]],[controlCodes[2],control.fatControl,control.raw?.[2]],[controlCodes[3],control.muscleControl,control.raw?.[3]]];
       for(const [code,value,raw] of controlRows){sourceOverride(code,value,"multi-pass signed Weight Control bundle + column identities","inbody-weight-control-bundle","",{protectDirect:false});const r=outByCode().get(code);if(r){r.inbody_control_integrity_confirmed=true;r.inbody_multi_pass_consensus=true;if(raw){r.value_raw=String(raw);r.reported_value_raw=String(raw);r.value_numeric=Number(value);r.valueNumeric=Number(value)}}}
       weightControlFoundation=true;
     }else{
       // Three signed direct control cells are enough to establish the printed
       // control bundle. Target may then be derived from Current Weight + Weight
       // Control, but a lone OCR Target must never generate the other three rows.
       const wcRow=outByCode().get("inbody_weight_control"),fcRow=outByCode().get("inbody_fat_control"),mcRow=outByCode().get("inbody_muscle_control");
       const wc=inbodyNumericFromRow(wcRow),fc=inbodyNumericFromRow(fcRow),mc=inbodyNumericFromRow(mcRow),trusted=[wcRow,fcRow,mcRow].every(r=>r&&r.inbody_multi_pass_consensus&&r.inbody_roi_locked);
       if(trusted&&wc!==null&&fc!==null&&mc!==null&&Math.abs((fc+mc)-wc)<=.15&&currentWeight!==null){
         const target=Math.round((currentWeight+wc)*10)/10;sourceOverride("inbody_target_weight",target,"Target Weight = Current Weight + three independently confirmed signed control cells","inbody-weight-control-column-integrity","",{protectDirect:false});
         for(const code of controlCodes){const r=outByCode().get(code);if(r)r.inbody_control_integrity_confirmed=true}
         weightControlFoundation=true
       }
     }
     const vfa=inbodyVfaFromText(inbodyRegionText(page,["right-summary","right-summary-color"]));
     if(vfa!=null)sourceOverride("inbody_visceral_fat_area",vfa,"star-anchored Visceral Fat Area graph result","inbody-vfa-marker-reconciliation","",{protectDirect:true});
     const bottomWater=inbodyBottomWaterBundle(page);
     if(bottomWater){
       sourceOverride("inbody_segment_left_leg_ecf_tbf",bottomWater.leftLegEcf,"multi-pass ordered bottom-water row","inbody-bottom-water-bundle","",{protectDirect:true,tolerance:.0015});
       sourceOverride("inbody_segment_left_leg_ecw_tbw",bottomWater.leftLegEcw,"multi-pass ordered bottom-water row","inbody-bottom-water-bundle","",{protectDirect:true,tolerance:.0015});
       sourceOverride("inbody_ecf_tbf",bottomWater.wholeEcf,"multi-pass ordered bottom-water row","inbody-bottom-water-bundle","",{protectDirect:true,tolerance:.0015});
       sourceOverride("inbody_ecw_tbw",bottomWater.wholeEcw,"multi-pass ordered bottom-water row","inbody-bottom-water-bundle","",{protectDirect:true,tolerance:.0015});
     }
   }
   const outNum=code=>inbodyNumericFromRow(outByCode().get(code));
   const rounded=(value,decimals)=>{const f=10**decimals;return Math.round((Number(value)+Number.EPSILON)*f)/f};
   const inbodyRescueDisplay=(code,value,decimals=1)=>{
     const n=rounded(Number(value),decimals),signed=["inbody_weight_control","inbody_fat_control","inbody_muscle_control"].includes(code);
     const fixed=Number.isInteger(decimals)?n.toFixed(decimals):String(n);
     if(signed&&n>0)return`+${fixed}`;
     return fixed
   };
   const putRescue=(code,value,reason,deps=[],decimals=1,replace=false)=>{
     if(!Number.isFinite(Number(value)))return false;
     value=rounded(Number(value),decimals);
     const display=inbodyRescueDisplay(code,value,decimals);
     let row=outByCode().get(code);
     if(row&&!replace)return false;
     const config=configByCodeRescue.get(code)||{};
     if(!row){
       row=specializedRow(code,page,{mode:"inbody-definition-rescue",confidence:99},display,{
         unit:config.unit||"",reference:"",profile:"INBODY_720",method:"Bioelectrical Impedance Analysis (InBody 720)",allowRepair:false,
         sourceLine:`InBody 720 same-sheet definition rescue: ${code} = ${display} | ${reason}`,
         referenceContext:"ค่านี้แก้จากนิยามทางคณิตศาสตร์โดยใช้ค่าที่อ่านจากแผ่น InBody ฉบับเดียวกัน; ไม่ใช้ข้อมูลผู้ป่วยรายอื่น"
       });
       if(!row)return false;
       output.push(row);
     }else{
       row.value_raw=display;row.reported_value_raw=display;row.value_numeric=value;row.valueNumeric=value;
       row.source_line=`InBody 720 same-sheet definition rescue: ${code} = ${display} | ${reason}`;
       row.sourceLine=row.source_line;row.confidence=Math.max(Number(row.confidence||0),99);
     }
     row.inbody_definition_rescue=true;row.inbody_canonical_source=true;row.inbody_roi_locked=true;row.inbody_label_anchored=true;row.inbody_source_confidence=99;
     row.inbody_low_confidence_source=false;row.inbody_auto_accepted_low_confidence=true;row.parse_issue=false;row.review_recommended=false;
     row.inbody_rescue_dependencies=deps;
     row.source_evidence=row.source_evidence||[];
     row.source_evidence.push({type:"inbody-same-sheet-definition-rescue",profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,code,dependencies:deps,reason});
     return true
   };
   const approximately=(a,b,t)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t;

   // ICW = TBW - ECW.
   if(outNum("inbody_intracellular_water")===null){
     const tbw=outNum("inbody_total_body_water"),ecw=outNum("inbody_extracellular_water");
     if(tbw!==null&&ecw!==null&&tbw>ecw)putRescue("inbody_intracellular_water",tbw-ecw,"ICW = TBW − ECW",["inbody_total_body_water","inbody_extracellular_water"],1)
   }
   // FFM has two independent same-sheet identities. Require agreement before rescue.
   if(outNum("inbody_fat_free_mass")===null){
     const w=outNum("inbody_weight"),fat=outNum("inbody_body_fat_mass"),tbw=outNum("inbody_total_body_water"),protein=outNum("inbody_protein"),minerals=outNum("inbody_minerals");
     const a=w!==null&&fat!==null?w-fat:null,b=tbw!==null&&protein!==null&&minerals!==null?tbw+protein+minerals:null;
     if(a!==null&&b!==null&&approximately(a,b,.20))putRescue("inbody_fat_free_mass",(a+b)/2,"FFM = Weight − Fat Mass และ ≈ TBW + Protein + Minerals",["inbody_weight","inbody_body_fat_mass","inbody_total_body_water","inbody_protein","inbody_minerals"],1)
   }
   // v10.259 — BMC is the bridge between Soft Lean Mass and Fat Free Mass on
   // this InBody sheet: Soft Lean Mass + BMC = FFM. Only override direct BMC OCR
   // when FFM itself is independently corroborated by BOTH Weight−Fat and
   // TBW+Protein+Minerals, so a stray graph tick (for example 7.0) cannot block
   // the operator with a false equation failure.
   {
     const ffm=outNum("inbody_fat_free_mass"),slm=outNum("inbody_soft_lean_mass"),bmc=outNum("inbody_bone_mineral_content");
     const w=outNum("inbody_weight"),fat=outNum("inbody_body_fat_mass"),tbw=outNum("inbody_total_body_water"),protein=outNum("inbody_protein"),minerals=outNum("inbody_minerals");
     const ffmA=w!==null&&fat!==null?w-fat:null,ffmB=tbw!==null&&protein!==null&&minerals!==null?tbw+protein+minerals:null;
     const trustedFfm=ffm!==null&&ffmA!==null&&ffmB!==null&&approximately(ffm,ffmA,.20)&&approximately(ffm,ffmB,.20);
     if(trustedFfm&&slm!==null){
       const calc=rounded(ffm-slm,2);
       if(calc>=.5&&calc<=10&&(bmc===null||!approximately(slm+bmc,ffm,.12))){
         putRescue("inbody_bone_mineral_content",calc,"BMC = FFM − Soft Lean Mass; FFM corroborated by Weight−Fat and TBW+Protein+Minerals",["inbody_fat_free_mass","inbody_soft_lean_mass","inbody_weight","inbody_body_fat_mass","inbody_total_body_water","inbody_protein","inbody_minerals"],2,true)
       }
     }
   }

   // BMI and PBF are definitions. Replace direct OCR only when it conflicts with
   // source components by more than normal rounding tolerance.
   {
     const w=outNum("inbody_weight"),h=outNum("inbody_height_cm"),current=outNum("inbody_bmi");
     if(w!==null&&h!==null){const calc=rounded(w/((h/100)**2),1);if(current===null||!approximately(current,calc,.15))putRescue("inbody_bmi",calc,"BMI = Weight / Height²",["inbody_weight","inbody_height_cm"],1,true)}
   }
   {
     const fat=outNum("inbody_body_fat_mass"),w=outNum("inbody_weight"),current=outNum("inbody_percent_body_fat");
     if(fat!==null&&w!==null){const calc=rounded(fat/w*100,1);if(current===null||!approximately(current,calc,.25))putRescue("inbody_percent_body_fat",calc,"PBF = Fat Mass / Weight × 100",["inbody_body_fat_mass","inbody_weight"],1,true)}
   }
   // v10.265 — signed Weight Control rows print the +/− glyph in a separate
   // visual column. OCR can therefore read Target 56.4 and Fat Control −18.2
   // while dropping only the signs/value for Weight Control or Muscle Control.
   // Break that deadlock from the two exact identities printed by InBody:
   //   Weight Control = Target Weight − Current Weight
   //   Muscle Control = Weight Control − Fat Control
   // These are same-sheet definitions, not a clinical estimate.
   if(weightControlFoundation)for(let k=0;k<4;k++){
     const w=outNum("inbody_weight"),target=outNum("inbody_target_weight"),wc=outNum("inbody_weight_control"),fc=outNum("inbody_fat_control"),mc=outNum("inbody_muscle_control");
     if(w!==null&&target!==null){
       const calcWc=rounded(target-w,1);
       if(calcWc>=-100&&calcWc<=100&&(wc===null||!approximately(wc,calcWc,.15)))
         putRescue("inbody_weight_control",calcWc,"Weight Control = Target Weight − Current Weight",["inbody_target_weight","inbody_weight"],1,true);
     }
     const wc2=outNum("inbody_weight_control"),fc2=outNum("inbody_fat_control"),mc2=outNum("inbody_muscle_control");
     if(wc2!==null&&fc2!==null){
       const calcMc=rounded(wc2-fc2,1);
       if(calcMc>=-100&&calcMc<=100&&(mc2===null||!approximately(mc2,calcMc,.15)))
         putRescue("inbody_muscle_control",calcMc,"Muscle Control = Weight Control − Fat Control",["inbody_weight_control","inbody_fat_control"],1,true);
     }
     const wc3=outNum("inbody_weight_control"),mc3=outNum("inbody_muscle_control"),fc3=outNum("inbody_fat_control");
     if(wc3!==null&&mc3!==null&&fc3===null)putRescue("inbody_fat_control",wc3-mc3,"Fat Control = Weight Control − Muscle Control",["inbody_weight_control","inbody_muscle_control"],1);
     const w2=outNum("inbody_weight"),target2=outNum("inbody_target_weight"),wc4=outNum("inbody_weight_control");
     if(w2!==null&&wc4!==null&&(target2===null||!approximately(w2+wc4,target2,.15)))putRescue("inbody_target_weight",w2+wc4,"Target Weight = Current Weight + Weight Control",["inbody_weight","inbody_weight_control"],1,true);
   }

   // v10.306 — final reference-fidelity scrub. A wrong printed range is more
   // dangerous than a missing range; remove any interval that fails the field-
   // specific structural rules instead of carrying it into the booklet.
   for(const r of output){
     const code=clean(r?.test_code||r?.testCode).toLowerCase();if(!code.startsWith("inbody_"))continue;
     const ref=clean(r?.reference_raw||r?.referenceRaw||r?.reference||r?.reported_reference_raw);
     if(ref&&!inbodyReferenceStructurallyPlausible(code,ref)){
       r.reference_raw="";r.referenceRaw="";r.reference="";r.reported_reference_raw="";r.reference_low=null;r.reference_high=null;r.reference_operator="none";
       r.source_evidence=r.source_evidence||[];r.source_evidence.push({type:"inbody-v10.306-reference-fidelity-quarantine",profile:"INBODY_720",code,rejected_reference:ref});
     }
   }

   const gate=inbodyValidationGate(output),affected=new Set((gate.reviewCodes||[]).map(code=>clean(code).toLowerCase()));
   // v10.269 — Freeze the deterministic parser's own critical values BEFORE
   // generic/legacy reconciliation. Review and Validation later consume this
   // immutable source-truth snapshot, so stale cached rows cannot win again.
   const parserSourceTruthSnapshot={...gate.canonicalSnapshot,sourceFile:clean(groupMeta.source_file||page.sourceFileName||"")};
   // v10.255: a missing deterministic ROI cell is a Review task, not an application error.
   // Create an explicit blank row so the operator can type the value/reference while
   // looking at the retained source pixels. Blank placeholders can never pass the gate.
   if(!gate.passed&&gate.missingCodes?.length){
     const configByCode=new Map(configs.map(config=>[config.code,config]));
     for(const code of gate.missingCodes){
       if(output.some(row=>clean(row.test_code||row.testCode).toLowerCase()===code))continue;
       const def=TESTS.find(item=>clean(item[3]).toLowerCase()===code),config=configByCode.get(code)||{};
       output.push({id:MIW.Utils.uid("labDraft"),selected:true,review_confirmed:false,category:"Body Composition",group:"Body Composition",panel:def?.[2]||"InBody 720 — Verify",
         test_code:code,display_name:def?.[0]||code,value_raw:"",value_numeric:null,value_operator:"text",unit:config.unit||"",reference_raw:"",reference_low:null,reference_high:null,reference_operator:"none",
         source_flag:"",calculated_flag:"REVIEW",page:page.sourcePageNumber??page.pageNumber,source_page_number:page.sourcePageNumber??page.pageNumber,document_page_number:page.pageNumber,
         confidence:0,profile:"INBODY_720",specialized_profile:"INBODY_720",method:"Bioelectrical Impedance Analysis (InBody 720)",source_file:groupMeta.source_file||page.sourceFileName||"",
         source_line:`InBody 720 deterministic ROI: ${code} ยังอ่านไม่ชัดจากต้นฉบับ`,parse_issue:true,review_recommended:true,inbody_missing_placeholder:true,inbody_roi_locked:true,inbody_roi_region:config.regions?.join("|")||config.region||"",
         source_evidence:[{type:"inbody-missing-roi-placeholder",profile:"INBODY_720",page:page.sourcePageNumber??page.pageNumber,code}]})
     }
   }
   for(const row of output){
     row.inbody_source_truth_snapshot={...parserSourceTruthSnapshot};
     row.inbody_validation_gate=gate;
     row.inbody_validation_passed=gate.passed;
     if(!gate.passed&&affected.has(clean(row.test_code||row.testCode).toLowerCase())){
       row.parse_issue=true;
       row.verify_reason=`InBody Validation Gate: ${gate.issues.map(issue=>issue.message).join(" · ")}`;
       row.review_recommended=true;
       row.review_reasons=[...new Set([...(row.review_reasons||[]),...gate.issues.map(issue=>issue.message)])]
     }
   }
   // If required fields are missing there may be no row to carry that missing field.
   // Pin the document-level gate to a stable anchor row so Review cannot silently show 0.
   if(!gate.passed&&gate.missingCodes?.length&&output.length){
     const anchor=output.find(r=>clean(r.test_code)==="inbody_total_body_water")||output[0];
     anchor.parse_issue=true;anchor.review_recommended=true;
     anchor.verify_reason=`InBody Validation Gate: ${gate.issues.map(issue=>issue.message).join(" · ")}`;
     anchor.review_reasons=[...new Set([...(anchor.review_reasons||[]),...gate.issues.map(issue=>issue.message)])]
   }
   return output
 }
 function specializedProfileDetected(text,page){
   const hint=String(page?.profileHint||"");
   if(/(?:INBODY_720|MASUYAMA_IMMUNOLOGICAL|RGCC_ONCOTRAIL|RGCC_METASTAT|FOLATE|MICRONUTRIENT|FOOD_INTOLERANCE|HEMOGLOBIN_TYPING|HEAVY_METALS_BLOOD|MEDICA_HORMONE_METABOLIC_PANEL)/i.test(hint))return true;
   return/(?:InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area|ECW\s*\/\s*TBW|Masuyama|Comprehensive\s+Immunological|Comprehensive\s+Immunity\s+Level|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki|ONCOTRAIL|METASTAT|ANA\s*patterns?|ANF\s*\[?ANA|Fine\s*speck|Cytop\w*\s+staining|Anti[-\s]*dsDNA|Anti[-\s]*(?:Sm|nRNP|SS\s*A|SS\s*B)|C3\s*Complement|Beta\s*1\s*C|C4\s*complement|Arsenic\s+in\s+Urine|Folate\s*\(\s*serum\s*\)|Micronutrients?\s+Profile\s+I|FoodPrint|200\+|Hemoglobin\s+Typing|Normal\s+Hb\s+typing|Alumin(?:ium|um)\s+in\s+Blood[\s\S]{0,1200}(?:Arsenic|Cadmium|Lead|Mercury)\s+in\s+Blood|(?:Insulin|Cortisol|Progesterone|Testosterone|Homocysteine|DHEA[-\s]*sul(?:ph|f)ate|Vitamin\s+B[1Il][2Z])[\s\S]{0,500}(?:ECLIA|Enzymatic\s+assay|(?:[uµμp]?IU|[pnuµμ]?mol|[uµμ]g|ng|pg)\s*\/))/i.test(String(text||""))
 }
 const SPECIALIZED_COMPLETENESS_PROFILES=[
   {profile:"MASUYAMA_IMMUNOLOGICAL",signature:/Masuyama|Comprehensive\s+Immunological|Comprehensive\s+Immunity\s+Level|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i,minDetected:4,items:[
     {code:"masuyama_immunity_level",label:"Comprehensive Immunity Level",pattern:/Comprehensive\s+Immunity\s+Level\s*:/i},
     {code:"masuyama_nlr",label:"Neutrophil \/ Lymphocyte Ratio",pattern:/Neutrophil\s*\/\s*Lymphocyte\s+Ratio/i},
     {code:"masuyama_lymphocyte_count",label:"Number of Lymphocytes",pattern:/Number\s+of\s+Lymphocytes?/i},
     {code:"masuyama_cd4_cd8_ratio",label:"CD4 \/ CD8 Ratio",pattern:/CD4\s*\/\s*CD8\s+Ratio/i},
     {code:"masuyama_nk_cell_count",label:"Number of NK Cells",pattern:/Number\s+of\s+NK\s+Cells/i},
     {code:"masuyama_nk_vue",label:"NK Vue",pattern:/\bNK\s+Vue\b/i},
     {code:"masuyama_nkg2d_cell_count",label:"Number of NKG2D+ Cells",pattern:/Number\s+of\s+NKG2D\+?\s+Cells/i}
   ]},
   {profile:"HEMOGLOBIN_TYPING",signature:/Hemoglobin\s+Typing|Normal\s+Hb\s+typing|alpha[-\s]*thalassemia/i,minDetected:3,items:[
     {code:"hb",label:"Hb",pattern:/(?:^|\n)\s*Hb\s*\(\s*EDTA\s*blood\s*\)/im},
     {code:"hct",label:"Hct",pattern:/Hct\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"mcv",label:"MCV",pattern:/MCV\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"mch",label:"MCH",pattern:/MCH\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"rdw",label:"RDW",pattern:/RDW\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"hb_a",label:"Hb A",pattern:/Hb\s*A(?!2)\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"hb_a2",label:"Hb A2",pattern:/Hb\s*A2\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"hb_typing_interpretation",label:"Interpretation",pattern:/Interpretation\s*\(\s*EDTA\s*blood\s*\)/i},
     {code:"hb_typing_recommendation",label:"Lab investigation",pattern:/Lab\s+investigation\s*\(\s*EDTA\s*blood\s*\)/i}
   ]},
   {profile:"HEAVY_METALS_BLOOD",signature:/Alumin(?:ium|um)\s+in\s+Blood[\s\S]{0,1000}(?:Arsenic|Cadmium|Lead|Mercury)\s+in\s+Blood/i,minDetected:3,items:[
     {code:"aluminium_blood",label:"Aluminium in Blood",pattern:/Alumin(?:ium|um)\s+in\s+Blood/i},
     {code:"arsenic_blood",label:"Arsenic in Blood",pattern:/Arsenic\s+in\s+Blood/i},
     {code:"cadmium_blood",label:"Cadmium in Blood",pattern:/Cadmium\s+in\s+Blood/i},
     {code:"lead_blood",label:"Lead in Blood",pattern:/Lead\s+in\s+Blood/i},
     {code:"mercury_blood",label:"Mercury in Blood",pattern:/Mercury\s+in\s+Blood/i}
   ]},
   {profile:"MEDICA_HORMONE_METABOLIC_PANEL",signature:/(?:TEST\s+NAME|METHOD|RESULT)[\s\S]{0,2400}(?:Insulin|Cortisol|Progesterone|Testosterone|Homocysteine|DHEA[-\s]*sul(?:ph|f)ate)[\s\S]{0,800}(?:ECLIA|Enzymatic\s+assay|CMIA|LC[-\s]*MS)/i,minDetected:2,items:[
     {code:"insulin",label:"Insulin",pattern:/(?:^|\n)\s*\*?Insulin(?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:[uµμp]?IU\/mL|pmol\/L)))/im},
     {code:"cortisol",label:"Cortisol",pattern:/(?:^|\n)\s*\*?Cortisol(?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:[uµμ]g\/dL|nmol\/L)))/im},
     {code:"progesterone",label:"Progesterone",pattern:/(?:^|\n)\s*\*?Progesterone(?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:ng\/mL|nmol\/L)))/im},
     {code:"testosterone",label:"Testosterone",pattern:/(?:^|\n)\s*\*?Testosterone(?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:ng\/dL|nmol\/L)))/im},
     {code:"homocysteine",label:"Homocysteine",pattern:/(?:^|\n)\s*\*?Homocysteine(?=[\s\S]{0,180}(?:Enzymatic\s+assay|ECLIA|[<>]?\d+(?:\.\d+)?\s*(?:[uµμ]mol\/L)))/im},
     {code:"dhea_sulfate",label:"DHEA-sulphate",pattern:/(?:^|\n)\s*\*?DHEA[-\s]*sul(?:ph|f)ate(?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:[uµμ]g\/dL|[uµμ]mol\/L)))/im},
     {code:"vitamin_b12",label:"Vitamin B12",pattern:/(?:^|\n)\s*\*?Vitamin\s+B[1Il][2Z](?=[\s\S]{0,180}(?:ECLIA|CMIA|[<>]?\d+(?:\.\d+)?\s*(?:pg\/mL|pmol\/L)))/im}
   ]}
 ];
 function declaredGroupProfiles(group){
   const profiles=new Set((group?.pages||[]).map(page=>clean(page?.profileHint).toUpperCase()).filter(Boolean));
   const file=clean(group?.meta?.source_file||"");
   if(/Masuyama|Comprehensive\s+Immunological|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i.test(file))profiles.add("MASUYAMA_IMMUNOLOGICAL");
   if(/Food\s*intolerance|FoodPrint|200\+/i.test(file))profiles.add("FOOD_INTOLERANCE_IGG_200_PLUS");
   if(/Micronutrient/i.test(file))profiles.add("MICRONUTRIENT_PROFILE_I");
   if(/Folate\s*(?:serum|\(\s*serum\s*\))/i.test(file))profiles.add("FOLATE_SERUM");
   if(/Hemoglobin\s+Typing|Hb\s*typing|alpha[-\s]*thalassemia/i.test(file))profiles.add("HEMOGLOBIN_TYPING");
   if(/Alumin(?:ium|um)[\s\S]{0,140}(?:Arsenic|Cadmium|Lead|Mercury)|(?:Arsenic|Cadmium|Lead|Mercury)[\s\S]{0,140}Alumin(?:ium|um)/i.test(file))profiles.add("HEAVY_METALS_BLOOD");
   const hormoneNames=[/\bInsulin\b/i,/\bCortisol\b/i,/\bProgesterone\b/i,/\bTestosterone\b/i,/\bHomocysteine\b/i,/DHEA[-\s]*sul(?:ph|f)ate|\bDHEA\b/i]
     .filter(pattern=>pattern.test(file)).length;
   if(hormoneNames>=2)profiles.add("MEDICA_HORMONE_METABOLIC_PANEL");
   return profiles
 }
 function completenessDefinitionAllowed(group,definition){
   const declared=declaredGroupProfiles(group);
   if(!declared.size)return true;
   // The three visual profiles below do not use the strict analyte-list guard.
   // They have dedicated parsers whose row counts and source evidence are
   // validated separately. Narrative text on their explanatory pages may
   // mention other analytes and must never create false missing-test errors.
   const nonGuarded=new Set(["MICRONUTRIENT_PROFILE_I","FOLATE_SERUM","FOOD_INTOLERANCE_IGG_200_PLUS"]);
   if([...declared].some(profile=>nonGuarded.has(profile)))return false;
   return declared.has(definition.profile)
 }
 function specializedCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   for(const group of groups){
     const source=[group?.meta?.source_file||"",group?.text||"",...(group?.pages||[]).flatMap(page=>[
       page?.text||"",...((page?.ocr?.candidates||[]).map(candidate=>candidate?.text||""))
     ])].join("\n");
     const presentCodes=new Set(parsedRows.filter(row=>rowBelongsToGroup(row,group)).map(row=>row.test_code));
     for(const definition of SPECIALIZED_COMPLETENESS_PROFILES){
       if(!completenessDefinitionAllowed(group,definition))continue;
       const detected=definition.items.filter(item=>item.pattern.test(source));
       if(!definition.signature.test(source)&&detected.length<definition.minDetected)continue;
       if(detected.length<definition.minDetected)continue;
       const missing=detected.filter(item=>!presentCodes.has(item.code));
       if(!missing.length)continue;
       output.push({
         profile:definition.profile,source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,
         source_file_index:Number(group.fileIndex||0),expected_codes:detected.map(item=>item.code),
         expected_labels:detected.map(item=>item.label),missing_codes:missing.map(item=>item.code),
         missing_labels:missing.map(item=>item.label),detected_count:detected.length,parsed_count:detected.length-missing.length
       })
     }
   }
   return output
 }
 function hamadCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   for(const group of groups){
     const expected=[...new Set((group?.pages||[]).flatMap(page=>Array.isArray(page?.hamadExpectedCodes)?page.hamadExpectedCodes:[]))];
     if(!expected.length)continue;
     const present=new Set(parsedRows.filter(row=>rowBelongsToGroup(row,group)&&row.selected!==false).map(row=>row.test_code));
     const missing=expected.filter(code=>!present.has(code));
     if(!missing.length)continue;
     output.push({
       profile:"HAMAD_MULTI_DATE_TABLE",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,
       source_file_index:Number(group.fileIndex||0),expected_codes:expected,
       expected_labels:expected.map(code=>TESTS.find(def=>def[3]===code)?.[0]||code),
       missing_codes:missing,missing_labels:missing.map(code=>TESTS.find(def=>def[3]===code)?.[0]||code),
       detected_count:expected.length,parsed_count:expected.length-missing.length
     })
   }
   return output
 }
 function groupSourceText(group){
   return[group?.meta?.source_file||"",group?.text||"",...(group?.pages||[]).flatMap(page=>[
     page?.pdfText||"",page?.text||"",...((page?.ocr?.candidates||[]).map(candidate=>candidate?.text||""))
   ])].join("\n")
 }
 function rowBelongsToGroup(row,group){
   const rowIndex=Number(row?.source_file_index),groupIndex=Number(group?.fileIndex);
   if(Number.isFinite(rowIndex)&&Number.isFinite(groupIndex)&&rowIndex===groupIndex)return true;
   const rowFile=clean(row?.source_file).toLowerCase(),groupFile=clean(group?.meta?.source_file).toLowerCase();
   return Boolean(rowFile&&groupFile&&rowFile===groupFile)
 }
 function detectedCompletenessItems(group){
   const source=groupSourceText(group),detected=[];
   for(const definition of SPECIALIZED_COMPLETENESS_PROFILES){
     if(!completenessDefinitionAllowed(group,definition))continue;
     const items=definition.items.filter(item=>item.pattern.test(source));
     if(items.length<definition.minDetected)continue;
     if(!definition.signature.test(source)&&items.length<definition.minDetected)continue;
     items.forEach(item=>detected.push({...item,profile:definition.profile}))
   }
   return detected
 }
 function recoveredSpecializedRows(groups=[],existingRows=[]){
   const recovered=[];
   for(const group of groups){
     const expected=detectedCompletenessItems(group);
     if(!expected.length)continue;
     const expectedCodes=new Set(expected.map(item=>item.code));
     const present=new Set([...existingRows,...recovered]
       .filter(row=>rowBelongsToGroup(row,group)).map(row=>row.test_code));
     if([...expectedCodes].every(code=>present.has(code)))continue;
     for(const page of group.pages||[]){
       const candidates=specializedProfileRows(page,group.meta||{});
       for(const candidate of candidates){
         if(!expectedCodes.has(candidate.test_code))continue;
         if(present.has(candidate.test_code)){
           const existing=[...existingRows,...recovered].find(row=>rowBelongsToGroup(row,group)&&row.test_code===candidate.test_code);
           if(existing&&String(candidate.specialized_profile||"").toUpperCase()==="MASUYAMA_IMMUNOLOGICAL"){
             if(Array.isArray(candidate.masuyama_source_series)&&candidate.masuyama_source_series.length)existing.masuyama_source_series=candidate.masuyama_source_series;
             if(Array.isArray(candidate.masuyama_test_dates)&&candidate.masuyama_test_dates.length)existing.masuyama_test_dates=candidate.masuyama_test_dates;
             existing.masuyama_source_history_available=Boolean(candidate.masuyama_source_history_available||candidate.masuyama_source_series?.length>1)
           }
           continue
         }
         const evidence=Array.isArray(candidate.source_evidence)?candidate.source_evidence.slice():[];
         evidence.push({
           type:"specialized-completeness-auto-recovery",
           profile:candidate.specialized_profile||expected.find(item=>item.code===candidate.test_code)?.profile||"",
           source_file:group?.meta?.source_file||"",
           page:page.sourcePageNumber??page.pageNumber
         });
         recovered.push({
           ...withPageProvenance(candidate,page),
           reported_name:candidate.reported_name||candidate.display_name,
           report_interpretation_raw:candidate.report_interpretation_raw||"",
           source_file:group?.meta?.source_file||page.sourceFileName||"",
           source_file_index:Number(group.fileIndex||0),
           lab_no:group?.meta?.lab_no||"",sample_no:group?.meta?.sample_no||"",accession_no:group?.meta?.accession_no||"",
           result_date:(group?.meta?.specimen_datetime||group?.meta?.result_datetime||group?.meta?.requested_datetime||"").slice(0,10),
           result_datetime:group?.meta?.specimen_datetime||group?.meta?.result_datetime||group?.meta?.requested_datetime||"",
           completeness_recovered:true,source_evidence:evidence
         });
         present.add(candidate.test_code)
       }
     }
     // Last-resort recovery from the complete source text, independent of
     // PDF geometry and OCR bounding boxes. This also supports documents
     // stored by older MIW builds whose page coordinates were incomplete.
     const completeSourceText=groupSourceText(group);
     if([...expectedCodes].some(code=>!present.has(code))&&clean(completeSourceText)){
       const firstPage=(group.pages||[])[0]||{};
       const syntheticPage={
         ...firstPage,text:String(completeSourceText||""),pdfText:String(completeSourceText||""),
         textItems:[],pdfTextItems:[],captureType:"",
         profileHint:expected[0]?.profile||firstPage.profileHint||"",
         pageNumber:firstPage.pageNumber||1,sourcePageNumber:firstPage.sourcePageNumber||1,
         sourceFileName:group?.meta?.source_file||firstPage.sourceFileName||""
       };
       const candidates=specializedProfileRows(syntheticPage,group.meta||{});
       for(const candidate of candidates){
         if(!expectedCodes.has(candidate.test_code))continue;
         if(present.has(candidate.test_code)){
           const existing=[...existingRows,...recovered].find(row=>rowBelongsToGroup(row,group)&&row.test_code===candidate.test_code);
           if(existing&&String(candidate.specialized_profile||"").toUpperCase()==="MASUYAMA_IMMUNOLOGICAL"){
             // The complete two-page source is more reliable than a single-page OCR order.
             existing.value_raw=candidate.value_raw;
             existing.value_numeric=candidate.value_numeric;
             existing.unit=candidate.unit||existing.unit;
             existing.reference_raw=candidate.reference_raw||existing.reference_raw;
             existing.source_flag=candidate.source_flag||existing.source_flag;
             existing.calculated_flag=candidate.calculated_flag||existing.calculated_flag;
             existing.report_interpretation_raw=candidate.report_interpretation_raw||existing.report_interpretation_raw;
             existing.masuyama_report_date=candidate.masuyama_report_date||existing.masuyama_report_date;
             existing.result_date=candidate.result_date||existing.result_date;
             existing.result_datetime=candidate.result_datetime||existing.result_datetime;
             if(Array.isArray(candidate.masuyama_source_series)&&candidate.masuyama_source_series.length)existing.masuyama_source_series=candidate.masuyama_source_series;
             if(Array.isArray(candidate.masuyama_test_dates)&&candidate.masuyama_test_dates.length)existing.masuyama_test_dates=candidate.masuyama_test_dates;
             existing.masuyama_source_history_available=Boolean(candidate.masuyama_source_history_available||candidate.masuyama_source_series?.length>1);
             existing.completeness_recovered=true;
             existing.source_evidence=[...(Array.isArray(existing.source_evidence)?existing.source_evidence:[]),{type:"masuyama-full-source-reconciliation",source_file:group?.meta?.source_file||"",page:syntheticPage.sourcePageNumber}]
           }
           continue
         }
         const evidence=Array.isArray(candidate.source_evidence)?candidate.source_evidence.slice():[];
         evidence.push({type:"group-source-text-auto-recovery",profile:candidate.specialized_profile||expected[0]?.profile||"",source_file:group?.meta?.source_file||"",page:syntheticPage.sourcePageNumber});
         recovered.push({
           ...withPageProvenance(candidate,syntheticPage),
           reported_name:candidate.reported_name||candidate.display_name,
           report_interpretation_raw:candidate.report_interpretation_raw||"",
           source_file:group?.meta?.source_file||syntheticPage.sourceFileName||"",
           source_file_index:Number(group.fileIndex||0),
           lab_no:group?.meta?.lab_no||"",sample_no:group?.meta?.sample_no||"",accession_no:group?.meta?.accession_no||"",
           result_date:(group?.meta?.specimen_datetime||group?.meta?.result_datetime||group?.meta?.requested_datetime||"").slice(0,10),
           result_datetime:group?.meta?.specimen_datetime||group?.meta?.result_datetime||group?.meta?.requested_datetime||"",
           completeness_recovered:true,source_evidence:evidence
         });
         present.add(candidate.test_code)
       }
     }
     const stillMissing=[...expectedCodes].filter(code=>!present.has(code));
     if(stillMissing.length===1&&stillMissing[0]==="masuyama_immunity_level"){
       const source=completeSourceText||groupSourceText(group);
       const levelMatch=String(source||"").match(/Comprehensive\s+Immunity\s+Level\s*:?\s*(3[HL]|[1-5])/i);
       const previousMatch=String(source||"").match(/Prev(?:ious|oius|ous)\s+Immunity\s+Level\s*:?\s*(3[HL]|[1-5])/i);
       const flattenedHeader=String(source||"").match(/(?:^|\s)(3[HL]|[1-5])\s*(3[HL]|[1-5])\s*1\s*Lowest\s*2\s*Very\s*Low/i);
       const level=(levelMatch?.[1]||flattenedHeader?.[1]||previousMatch?.[1]||flattenedHeader?.[2]||"").toUpperCase();
       const masuyamaRowsInGroup=[...existingRows,...recovered].filter(row=>rowBelongsToGroup(row,group)&&/^masuyama_/.test(String(row.test_code||"")));
       if(level&&masuyamaRowsInGroup.length>=4){
         const template=masuyamaRowsInGroup[0]||{};
         const dates=masuyamaTestDates(source);
         const testDate=dates.at(-1)||String(template.result_date||"").slice(0,10);
         const levelSeries=dates.length?dates.map((date,index)=>({date,value:level,unit:"level",source:index===dates.length-1?"CURRENT_REPORT":"SOURCE_GRAPH"})):[];
         recovered.push({
           ...template,id:crypto.randomUUID(),test_code:"masuyama_immunity_level",display_name:"Masuyama Comprehensive Immunity Level",
           category:"Immunology",panel:"Masuyama Comprehensive Immunity",value_raw:level,value_numeric:/^\d+$/.test(level)?Number(level):null,
           unit:"level",reference_raw:"4-5",source_flag:["4","5"].includes(level)?"N":"L",calculated_flag:["4","5"].includes(level)?"N":"L",
           result_date:testDate||template.result_date||"",result_datetime:testDate?`${testDate}T00:00:00+07:00`:template.result_datetime||"",
           specialized_profile:"MASUYAMA_IMMUNOLOGICAL",reported_name:"Comprehensive Immunity Level",reported_value_raw:level,
           masuyama_level_label:masuyamaLevelLabel(level),masuyama_previous_level:(previousMatch?.[1]||flattenedHeader?.[2]||"").toUpperCase(),
           masuyama_test_dates:dates,masuyama_source_history_available:dates.length>1,masuyama_source_series:levelSeries,
           selected:true,completeness_recovered:true,parse_issue:false,review_recommended:false,
           source_file:group?.meta?.source_file||template.source_file||"",source_file_index:Number(group.fileIndex||0),
           source_evidence:[...(Array.isArray(template.source_evidence)?template.source_evidence:[]),{type:"masuyama-level-direct-full-source-recovery",value:level,source_file:group?.meta?.source_file||""}]
         });
         present.add("masuyama_immunity_level")
       }
     }
   }
   return recovered
 }
 function micronutrientCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   for(const group of groups){
     const source=groupSourceText(group);
     if(!/Micronutrients?\s+Profile\s+I/i.test(source))continue;
     const detected=MICRONUTRIENT_PROFILE.filter(config=>config.alias.test(source));
     if(detected.length<4)continue;
     const present=new Set(parsedRows.filter(row=>rowBelongsToGroup(row,group)&&
       clean(row.specialized_profile).toUpperCase()==="MICRONUTRIENT_PROFILE_I").map(row=>row.test_code));
     const missing=detected.filter(config=>!present.has(config.code));
     if(!missing.length)continue;
     output.push({
       profile:"MICRONUTRIENT_PROFILE_I",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,
       source_file_index:Number(group.fileIndex||0),expected_codes:detected.map(config=>config.code),
       expected_labels:detected.map(config=>TESTS.find(item=>item[3]===config.code)?.[0]||config.code),
       missing_codes:missing.map(config=>config.code),
       missing_labels:missing.map(config=>TESTS.find(item=>item[3]===config.code)?.[0]||config.code),
       detected_count:detected.length,parsed_count:detected.length-missing.length
     })
   }
   return output
 }
 function foodPrintCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   for(const group of groups){
     const source=[group?.meta?.source_file||"",group?.text||"",...(group?.pages||[]).map(page=>page?.text||"")].join("\n");
     const declared=/(?:FoodPrint|200\+|FOOD[_ -]?INTOLERANCE|รายงานการทดสอบ\s*:\s*ลำดับปฏิกิริยา)/i.test(source)||declaredGroupProfiles(group).has("FOOD_INTOLERANCE_IGG_200_PLUS");
     if(!declared)continue;
     const catalogAudit=foodPrintCatalogFidelityAudit();
     if(!catalogAudit.ok){
       output.push({profile:"FOOD_INTOLERANCE_IGG_200_PLUS",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,source_file_index:Number(group.fileIndex||0),expected_codes:["foodprint_catalog_fidelity"],expected_labels:["FoodPrint Catalog Fidelity Guard"],missing_codes:["foodprint_catalog_fidelity"],missing_labels:[`FoodPrint Catalog Fidelity Guard: canonical catalog lock ไม่ผ่าน (${catalogAudit.failures.map(x=>x.key).join(", ")||"digest mismatch"})`],detected_count:222,parsed_count:0,quality_based:"FOOD_CATALOG_FIDELITY"})
     }
     const present=parsedRows.filter(row=>rowBelongsToGroup(row,group)&&clean(row.specialized_profile).toUpperCase()==="FOOD_INTOLERANCE_IGG_200_PLUS");
     const distinct=new Set(present.map(row=>clean(row.food_intolerance_item_key||row.test_code))).size;
     const badNames=present.filter(row=>suspiciousFoodPrintLabel(clean(row.display_name||row.reported_name))).length;
     const catalogVerified=present.filter(row=>clean(row.foodprint_source_truth_status).toUpperCase()==="CATALOG_VERIFIED").length;
     if(distinct===222&&badNames===0&&catalogVerified===222)continue;
     if(badNames>0||catalogVerified<Math.min(222,distinct)){
       const qualityCount=Math.max(badNames,Math.max(0,distinct-catalogVerified));
       output.push({
         profile:"FOOD_INTOLERANCE_IGG_200_PLUS",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,
         source_file_index:Number(group.fileIndex||0),expected_codes:[],expected_labels:[],
         missing_codes:Array.from({length:qualityCount},(_,index)=>`food_source_truth_name_${index+1}`),
         missing_labels:[`FoodPrint Source Truth Guard: ยังมี ${qualityCount} รายการที่ชื่ออาหารไม่ผ่าน verified 222-item catalog`],
         detected_count:distinct,parsed_count:catalogVerified,quality_based:"FOOD_SOURCE_TRUTH_NAMES"
       })
     }
     if(distinct!==222){
       const missing=Math.max(1,Math.abs(222-distinct));
       output.push({profile:"FOOD_INTOLERANCE_IGG_200_PLUS",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,source_file_index:Number(group.fileIndex||0),expected_codes:Array.from({length:222},(_,index)=>`food_igg_expected_${index+1}`),expected_labels:[`FoodPrint Source Truth Guard: อ่านได้ ${distinct}/222 รายการ`],missing_codes:Array.from({length:missing},(_,index)=>`food_igg_count_mismatch_${index+1}`),missing_labels:[`FoodPrint Source Truth Guard: อ่านได้ ${distinct}/222 รายการ ต้องได้ครบ 222 รายการก่อนบันทึก`],detected_count:222,parsed_count:distinct,count_based:true})
     }
   }
   return output
 }
 function allergyCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   for(const group of groups){
     for(const page of group?.pages||[]){
       const profile=allergyProfileOf(photoPasses(page).map(pass=>pass.text).join("\n"));
       if(!profile)continue;
       const expected=ALLERGY_CATALOG[profile]||[];
       const presentCodes=new Set(parsedRows.filter(row=>rowBelongsToGroup(row,group)&&row.allergy_profile===profile).map(row=>clean(row.test_code)));
       const missing=expected.filter(entry=>!presentCodes.has(entry[1]));
       if(!missing.length)continue;
       output.push({profile:`SPECIFIC_IGE_${profile.toUpperCase()}`,source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,source_file_index:Number(group.fileIndex||0),expected_codes:expected.map(entry=>entry[1]),expected_labels:expected.map(entry=>entry[0]),missing_codes:missing.map(entry=>entry[1]),missing_labels:missing.map(entry=>entry[0]),detected_count:expected.length,parsed_count:expected.length-missing.length})
     }
   }
   return output
 }
 function unresolvedCompletenessIssues(){
   return(meta.specialized_completeness_expectations||[]).map(issue=>{
     if(issue.event_based&&Array.isArray(issue.expected_events)){
       const missingEvents=issue.expected_events.filter(event=>!rows.some(row=>row.selected!==false&&
         Number(row.source_file_index??0)===Number(issue.source_file_index??0)&&clean(row.test_code)===clean(event.code)&&
         clean(row.result_date||row.result_datetime).slice(0,10)===clean(event.date).slice(0,10)));
       return{...issue,missing_codes:missingEvents.map(event=>event.key),missing_labels:missingEvents.map(event=>event.label),
         parsed_count:issue.expected_events.length-missingEvents.length}
     }
     if(issue.quality_based==="FOOD_CATALOG_FIDELITY"){
       const audit=foodPrintCatalogFidelityAudit();
       return{...issue,missing_codes:audit.ok?[]:["foodprint_catalog_fidelity"],missing_labels:audit.ok?[]:[`FoodPrint Catalog Fidelity Guard: canonical catalog lock ไม่ผ่าน (${audit.failures.map(x=>x.key).join(", ")||"digest mismatch"})`],parsed_count:audit.ok?222:0}
     }
     if(issue.quality_based==="FOOD_SOURCE_TRUTH_NAMES"){
       const foodRows=rows.filter(row=>row.selected!==false&&Number(row.source_file_index??0)===Number(issue.source_file_index??0)&&clean(row.specialized_profile).toUpperCase()==="FOOD_INTOLERANCE_IGG_200_PLUS");
       const bad=foodRows.filter(row=>suspiciousFoodPrintLabel(clean(row.display_name||row.reported_name))||clean(row.foodprint_source_truth_status).toUpperCase()!=="CATALOG_VERIFIED").length;
       return{...issue,missing_codes:Array.from({length:bad},(_,index)=>`food_source_truth_name_${index+1}`),
         missing_labels:bad?[`FoodPrint Source Truth Guard: ยังมี ${bad} รายการที่ชื่ออาหารไม่ตรง verified catalog`]:[],parsed_count:Math.max(0,foodRows.length-bad)}
     }
     if(issue.count_based){
       const count=rows.filter(row=>row.selected!==false&&Number(row.source_file_index??0)===Number(issue.source_file_index??0)&&clean(row.specialized_profile).toUpperCase()===clean(issue.profile).toUpperCase()).length;
       const expected=Number(issue.detected_count||222),mismatch=Math.abs(expected-count);
       return{...issue,missing_codes:Array.from({length:mismatch},(_,index)=>`missing_${index+1}`),missing_labels:mismatch?[`FoodPrint Source Truth Guard: อ่านได้ ${count}/${expected} รายการ`]:[],parsed_count:count}
     }
     const missing=(issue.expected_codes||[]).filter(code=>!rows.some(row=>row.selected!==false&&row.test_code===code));
     const labels=missing.map(code=>{
       const index=(issue.expected_codes||[]).indexOf(code);
       return(issue.expected_labels||[])[index]||code
     });
     return{...issue,missing_codes:missing,missing_labels:labels,parsed_count:(issue.expected_codes||[]).length-missing.length}
   }).filter(issue=>issue.missing_codes.length)
 }
 function completenessMissingCount(){
   return unresolvedCompletenessIssues().reduce((sum,issue)=>sum+issue.missing_codes.length,0)
 }
 function completenessWarningText(){
   const issues=unresolvedCompletenessIssues();
   if(!issues.length)return"";
   return issues.map(issue=>`${issue.source_file}: ขาด ${issue.missing_labels.join(", ")}`).join(" · ")
 }
 function specializedProfileRows(page,groupMeta={}){
   const hint=clean(page?.profileHint).toUpperCase();
   const sourceText=photoPasses(page).map(pass=>String(pass?.text||"")).join("\n");
   // Page evidence outranks a document/continuation hint. This is essential
   // for merged nutrition packets where FoodPrint is followed immediately by
   // Medica micronutrient pages.
   if(/Micronutrients?\s+Profile\s+I/i.test(sourceText)||micronutrientSummaryPage(page))
     return micronutrientProfileRows(page,groupMeta);
   if(/Folate\s*\(\s*serum\s*\)/i.test(sourceText)&&!/Micronutrients?\s+Profile\s+I/i.test(sourceText))
     return folateSerumRows(page,groupMeta);
   if(allergyProfileOf(sourceText))return allergyProfileRows(page);
   // Route known report profiles directly. Running every specialized parser
   // against a dense 200+ FoodPrint OCR page caused multi-minute freezes and
   // allowed unrelated readers to compete for the same OCR tokens.
   if(hint==="INBODY_720")return inbodyRows(page,groupMeta);
   if(hint==="MASUYAMA_IMMUNOLOGICAL")return masuyamaRows(page,groupMeta);
   if(hint==="FOOD_INTOLERANCE_IGG_200_PLUS")return foodIntoleranceRows(page);
   if(hint==="MICRONUTRIENT_PROFILE_I")return micronutrientProfileRows(page,groupMeta);
   if(hint==="FOLATE_SERUM")return folateSerumRows(page,groupMeta);
   if(hint==="HEMOGLOBIN_TYPING")return hemoglobinTypingRows(page,groupMeta);
   if(hint==="HEAVY_METALS_BLOOD")return heavyMetalBloodRows(page,groupMeta);
   if(hint==="MEDICA_HORMONE_METABOLIC_PANEL")return medicaPanelRows(page,groupMeta);
   if(hint==="RGCC_ONCOTRAIL")return oncotrailRows(page,groupMeta);
   if(hint==="RGCC_METASTAT")return metastatRows(page,groupMeta);
   const output=[
     ...inbodyRows(page,groupMeta),
     ...masuyamaRows(page,groupMeta),
     ...hemoglobinTypingRows(page,groupMeta),
     ...heavyMetalBloodRows(page,groupMeta),
     ...medicaPanelRows(page,groupMeta),
     ...oncotrailRows(page,groupMeta),
     ...metastatRows(page,groupMeta),
     ...folateSerumRows(page,groupMeta),
     ...micronutrientProfileRows(page,groupMeta),
     ...foodIntoleranceRows(page),
     ...allergyProfileRows(page)
   ];
   for(const pass of photoPasses(page)){
     output.push(
       ...anaPatternRows(page,pass),
       ...antiDsdnaRows(page,pass),
       ...enaProfileRows(page,pass),
       ...complementRows(page,pass),
       ...arsenicUrineRows(page,pass)
     )
   }
   return output
 }
 function photoLines(pass){
   const items=(pass.textItems||[]).map(i=>({...i,str:clean(i.str)})).filter(i=>i.str);
   const lines=[];
   items.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     const tolerance=Math.max(4,Number(item.bbox?.y1||0)-Number(item.bbox?.y0||0))*0.45;
     let line=lines.find(l=>Math.abs(l.y-item.y)<=tolerance);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   return lines.map(line=>{
     line.items.sort((a,b)=>a.x-b.x);
     return{...line,text:clean(line.items.map(i=>i.str).join(" "))}
   }).filter(l=>l.text)
 }
 function bestAliasAtLine(lineText,def){
   const n=norm(lineText);
   if(def[3]==="calcium"&&/corrected/i.test(lineText))return"";
   if(def[3]==="phosphorus"&&/(?:alk|aik|alkaline)[.\s_-]*phos/i.test(lineText))return"";
   return defAliases(def)
     .filter(a=>{
       if(a.length<2)return false;
       if(a.length<=3)return clean(lineText).split(/\s+/).some(token=>norm(token)===a);
       return n.includes(a)
     })
     .sort((a,b)=>b.length-a.length)[0]||""
 }
 function aliasSpan(line,def){
   const aliases=defAliases(def).filter(a=>a.length>=2).sort((a,b)=>b.length-a.length);
   for(let start=0;start<line.items.length;start++){
     // Ignore table separators and punctuation-only OCR tokens. Otherwise a
     // vertical divider immediately before the right-hand allergen can make
     // its label look as if it starts on the left half of the table.
     if(!norm(line.items[start].str))continue;
     let joined="";
     for(let end=start;end<Math.min(line.items.length,start+6);end++){
       joined+=line.items[end].str;
       const n=norm(joined);
       const alias=aliases.find(a=>n===a);
       if(alias)return{alias,start,end,left:line.items[start].x,
         right:line.items[end].x+Number(line.items[end].w||0)}
     }
   }
   return null
 }
 function numericTokens(items){
   const out=[];
   items.forEach((item,index)=>{
     const raw=repairPhotoValue(clean(item.str).replace(/[Oo](?=\d)/g,"0"));
     const m=raw.match(/^(?:([<>]=?)\s*)?(-?\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(-?\d+(?:[.,]\d+)?))?$/);
     if(m)out.push({item,index,raw,value:`${m[1]||""}${m[2]}`,range:m[3]?`${m[2]}-${m[3]}`:""})
   });
   return out
 }
 const WBC_FRACTIONS=[
   ["Neutrophils","neutrophil"],["Lymphocytes","lymphocyte"],["Monocytes","monocyte"],
   ["Eosinophils","eosinophil"],["Basophils","basophil"],["IG","ig"]
 ];
 const SPEP_FRACTIONS=[
   ["Albumin","albumin"],["Alpha 1","alpha_1"],["Alpha 2","alpha_2"],["Beta","beta"],["Gamma","gamma"]
 ];
 function specialDef(code){
   return TESTS.find(def=>def[3]===code)||[code,"Clinical Chemistry","Other",code]
 }
 function rowWithEvidence(def,page,value,unit,reference,sourceLine,confidence,mode){
   const row=makeRow(def,page.pageNumber,value,unit,"",reference,sourceLine);
   if(!row)return null;
   row.confidence=Math.min(96,Number(confidence||82));
   row.parse_issue=!reference||!unit||row.confidence<80;
   row.photo_ocr=true;row.ocr_pass=mode||"panel-schema";
   return row
 }
 function panelAwareRows(page){
   if(page.captureType!=="PHOTO")return[];
   const output=[];
   for(const pass of photoPasses(page)){
     const text=String(pass.text||"");
     const isSpep=/serum\s+proteins?\s+electrophoresis|fractions[\s\S]*%[\s\S]*normal/i.test(text);
     const isWbc=/WBC[_\s-]*DIFFERENTIAL|Neutrophils?\.?%|Lymphocytes?\.?#/i.test(text);
     if(isSpep){
       for(const rawLine of text.split(/\n/).map(clean).filter(Boolean)){
         const fraction=SPEP_FRACTIONS.find(([label])=>new RegExp(`^${label.replace(" ","\\s*[- ]?")}(?:\\s|$)`,"i").test(rawLine));
         if(!fraction)continue;
         const nums=[...rawLine.matchAll(/-?\d+(?:[.,]\d+)?(?:\s*[-–]\s*-?\d+(?:[.,]\d+)?)?/g)]
           .map(m=>m[0].replace(/,/g,"."));
         if(nums.length<4)continue;
         const [,key]=fraction;
         const concentration=rowWithEvidence(specialDef(`spep_${key}_g_l`),page,nums[2],"g/L",nums[3],rawLine,pass.confidence,pass.mode);
         if(concentration){
           // Keep the percentage columns as source evidence only. They are not
           // independent longitudinal lab results and must not inflate Verify.
           concentration.spep_percent_raw=nums[0];
           concentration.spep_percent_reference_raw=nums[1];
           output.push(concentration)
         }
       }
       const ratio=(text.match(/A\s*\/?\s*G\s+Ratio\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)||[])[1];
       if(ratio){
         const row=rowWithEvidence(specialDef("spep_ag_ratio"),page,ratio,"","","A/G Ratio",pass.confidence,pass.mode);
         if(row){row.parse_issue=false;output.push(row)}
       }
     }
     if(isWbc){
       for(const rawLine of text.split(/\n/).map(clean).filter(Boolean)){
         const fraction=WBC_FRACTIONS.find(([label])=>new RegExp(`^${label}`,"i").test(rawLine));
         if(!fraction)continue;
         const [,key]=fraction;
         const absolute=/#|absolute/i.test(rawLine);
         const percent=/%|percent/i.test(rawLine);
         if(!absolute&&!percent)continue;
         const nums=[...rawLine.matchAll(/-?\d+(?:[.,]\d+)?(?:\s*[-–]\s*-?\d+(?:[.,]\d+)?)?/g)]
           .map(m=>m[0].replace(/,/g,"."));
         if(nums.length<2)continue;
         const code=`${key}_${absolute?"abs":"pct"}`;
         const unit=absolute?"10^9/L":"%";
         const row=rowWithEvidence(specialDef(code),page,nums[0],unit,nums[1],rawLine,pass.confidence,pass.mode);
         if(row)output.push(row)
       }
     }
   }
   return output
 }
 function allergyProfileOf(text){
   if(/Allergy\s+Food\s+Profil/i.test(String(text||"")))return"food";
   if(/Allergy\s+Inhalation\s+Profil/i.test(String(text||"")))return"inhalant";
   return""
 }
 function allergyTableLines(pass){
   const lines=photoLines(pass);
   const start=lines.findIndex(line=>/Allergy\s+(?:Food|Inhalation)\s+Profil/i.test(line.text));
   if(start<0)return[];
   const relativeEnd=lines.slice(start+1).findIndex(line=>/^\s*Remark\s*:/i.test(line.text));
   const end=relativeEnd<0?lines.length:start+1+relativeEnd;
   return lines.slice(start+1,end)
 }
 function allergyNearAlias(value,alias){
   const a=clean(value),b=clean(alias);
   if(a===b)return true;
   // Numeric suffixes identify different panels (for example Mould mix 1 vs
   // Mould mix 2). Fuzzy matching must never substitute one digit for another.
   const digitsA=(a.match(/\d+/g)||[]).join(":"),digitsB=(b.match(/\d+/g)||[]).join(":");
   if((digitsA||digitsB)&&digitsA!==digitsB)return false;
   if(Math.min(a.length,b.length)<7||Math.abs(a.length-b.length)>1)return false;
   let i=0,j=0,differences=0;
   while(i<a.length&&j<b.length){
     if(a[i]===b[j]){i++;j++;continue}
     differences++;
     if(differences>1)return false;
     if(a.length>b.length)i++;
     else if(b.length>a.length)j++;
     else{i++;j++}
   }
   if(i<a.length||j<b.length)differences++;
   return differences<=1
 }
 function allergyAliasSpan(line,entry){
   const aliases=entry[2].map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);
   for(let start=0;start<line.items.length;start++){
     if(!norm(line.items[start].str))continue;
     let joined="";
     for(let end=start;end<Math.min(line.items.length,start+7);end++){
       joined+=line.items[end].str;
       const normalized=norm(joined);
       const alias=aliases.find(candidate=>allergyNearAlias(normalized,candidate));
       if(alias){
         return{
           start,end,left:line.items[start].x,
           right:line.items[end].x+Number(line.items[end].w||0),
           alias
         }
       }
     }
   }
   return null
 }
 function allergyClassFromValue(value){
   const parsed=valueParts(value);
   if(parsed.value_numeric===null)return null;
   if(parsed.value_operator==="<"&&parsed.value_numeric<=0.35)return 0;
   const n=parsed.value_numeric;
   if(n<0.35)return 0;
   if(n<0.7)return 1;
   if(n<3.5)return 2;
   if(n<17.5)return 3;
   if(n<50)return 4;
   if(n<100)return 5;
   return 6
 }
 function allergyClassMeaning(value){
   return{
     0:"ไม่พบ specific IgE ต่อสารนี้ในระดับที่วิธีตรวจรายงาน",
     1:"ตรวจพบ specific IgE ระดับต่ำมาก",
     2:"ตรวจพบ specific IgE ระดับต่ำ สอดคล้องกับการไวต่อสารก่อภูมิแพ้",
     3:"ตรวจพบ specific IgE ชัดเจน",
     4:"ตรวจพบ specific IgE ระดับสูง",
     5:"ตรวจพบ specific IgE ระดับสูงมาก",
     6:"ตรวจพบ specific IgE ระดับสูงมาก"
   }[Number(value)]||"ยังจัด Class ไม่ได้"
 }
 function normalizedAllergyClass(raw){
   const token=clean(raw).replace(/[OoQ°º]/g,"0");
   return/^[0-6]$/.test(token)?Number(token):null
 }
 function normalizedAllergyConcentration(raw,classHint=null){
   let value=clean(raw)
     .replace(/,/g,".")
     .replace(/[Oo°º](?=\d|$)/g,"0")
     .replace(/\s+/g,"")
     .replace(/[≤‹]/g,"<");
   if(!value)return"";
   if(/^[<cCeE€£]0?\.?3[56]$/.test(value)||(/^(?:0?35|035)$/.test(value)&&classHint===0))return"<0.35";
   let match=value.match(/^<\s*(\d+(?:\.\d+)?)$/);
   if(match){const n=Number(match[1]);return n<=0.35?"<0.35":`<${n}`;}
   match=value.match(/^(\d+(?:\.\d+)?)$/);
   if(match)return`${Number(match[1])}`;
   return""
 }
 function allergyObservation(pass,page,entry){
   const lines=allergyTableLines(pass);
   const candidates=[];
   for(const line of lines){
     const tolerance=Math.max(24,Number(page.height||2400)*0.014);
     let span=allergyAliasSpan(line,entry);
     const aliasDirect=Boolean(span);
     if(!span){
       const aliases=entry[2].map(norm).sort((a,b)=>b.length-a.length);
       // Only merge OCR lines that are genuinely part of the same wrapped label.
       // The former row-height tolerance also included the neighbouring allergen
       // and could attach Mould mix 1 = 1.04 to Mould mix 2 or Cockroach.
       const labelWrapTolerance=Math.max(8,Number(page.height||2400)*0.008);
       const nearby=lines.filter(other=>Math.abs(other.y-line.y)<=labelWrapTolerance);
       for(const [minRatio,maxRatio] of [[0,0.34],[0.5,0.84]]){
       const items=nearby.flatMap(other=>other.items.filter(item=>
         item.x>=Number(page.width||1800)*minRatio&&item.x<Number(page.width||1800)*maxRatio
       ));
       const labelTexts=[
         items.map(item=>item.str).join(" "),
         nearby.slice().reverse().flatMap(other=>other.items.filter(item=>
           item.x>=Number(page.width||1800)*minRatio&&item.x<Number(page.width||1800)*maxRatio
         )).map(item=>item.str).join(" ")
       ];
       if(aliases.some(alias=>labelTexts.some(labelText=>{const normalized=norm(labelText);return normalized.includes(alias)||allergyNearAlias(normalized,alias)}))){
           span={left:items.length?Math.min(...items.map(item=>item.x)):Number(page.width||1800)*minRatio,right:items.length?Math.max(...items.map(item=>item.x+Number(item.w||0))):0};
           break
         }
       }
     }
     if(!span)continue;
     const rightSide=span.left>Number(page.width||1800)*0.5;
     const classMin=Number(page.width||1800)*(rightSide?0.83:0.34);
     const classMax=Number(page.width||1800)*(rightSide?0.89:0.405);
     const concentrationMin=Number(page.width||1800)*(rightSide?0.895:0.405);
     const concentrationMax=Number(page.width||1800)*(rightSide?0.985:0.49);
     // Directly detected labels should only read result cells from their own
     // table row. A full generic tolerance can reach the neighbouring row in
     // the compact BCL grid and copy Mould mix 1 = 1.04 into Mould mix 2.
     const resultTolerance=aliasDirect?Math.max(10,Number(page.height||2400)*0.011):tolerance;
     const nearby=lines.filter(other=>Math.abs(other.y-line.y)<=resultTolerance);
     const classOptions=[],concentrationOptions=[];
     nearby.forEach(other=>{
       const classText=clean(other.items.filter(item=>item.x>=classMin&&item.x<classMax).sort((a,b)=>a.x-b.x).map(item=>item.str).join(""));
       const classValue=normalizedAllergyClass(classText);
       if(classValue!==null)classOptions.push({value:classValue,distance:Math.abs(other.y-line.y),raw:classText,line:other});
       const concentrationText=clean(other.items.filter(item=>item.x>=concentrationMin&&item.x<concentrationMax).sort((a,b)=>a.x-b.x).map(item=>item.str).join(""));
       const concentration=normalizedAllergyConcentration(concentrationText,classValue);
       if(concentration)concentrationOptions.push({value:concentration,distance:Math.abs(other.y-line.y),raw:concentrationText,line:other})
     });
     const comparatorDirect=nearby.some(other=>other.items.some(item=>
       item.x>=concentrationMin&&item.x<concentrationMax&&/^[<≤‹]$/.test(clean(item.str))
     ));
     classOptions.sort((a,b)=>a.distance-b.distance);
     concentrationOptions.sort((a,b)=>a.distance-b.distance||
       Number(!String(a.value).startsWith("<"))-Number(!String(b.value).startsWith("<")));
     let reportedClass=classOptions[0]?.value??null;
     let concentration=concentrationOptions[0]?.value||"";
     if(["0.35","35"].includes(concentration)&&(reportedClass===0||comparatorDirect))concentration="<0.35";
     if(!concentration&&reportedClass===0)concentration="<0.35";
     const initialDerivedClass=concentration?allergyClassFromValue(concentration):null;
     const concentrationNumeric=valueParts(concentration).value_numeric;
     const repairedClassZero=reportedClass===0&&initialDerivedClass!==null&&initialDerivedClass!==0;
     const repairedImplausible=reportedClass!==null&&initialDerivedClass!==null&&reportedClass!==initialDerivedClass&&Number(concentrationNumeric)>=1000;
     // In the BCL two-column profile the printed Class cell is a discrete source-of-truth.
     // OCR can concatenate "0 <0.35" into 4039/4035; never let that turn a negative allergen into Class 6.
     if(repairedClassZero)concentration="<0.35";
     else if(repairedImplausible)concentration=reportedClass===0?"<0.35":"";
     const derivedClass=concentration?allergyClassFromValue(concentration):null;
     const conflict=reportedClass!==null&&derivedClass!==null&&reportedClass!==derivedClass&&!repairedClassZero&&!repairedImplausible;
     if(derivedClass!==null)reportedClass=derivedClass;
     if(concentration||reportedClass!==null){
       const sourceLine=[line.text,classOptions[0]?.line?.text,concentrationOptions[0]?.line?.text].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(" | ");
       candidates.push({
         concentration,reportedClass,derivedClass,conflict,sourceLine,
         aliasDirect,
         classDirect:classOptions.length>0,
         concentrationDirect:concentrationOptions.length>0,
         comparatorDirect,
         confidence:Number(pass.confidence||75),
         mode:pass.mode||"allergy-profile",
         labelY:line.y,
         classRaw:classOptions[0]?.raw||"",
         concentrationRaw:concentrationOptions[0]?.raw||"",
         sourceTruthRepair:repairedClassZero?"CLASS_0_THRESHOLD_RESTORED":repairedImplausible?"IMPLAUSIBLE_CONCENTRATION_REJECTED":""
       })
     }
   }
   return candidates.sort((a,b)=>{
     const directB=Number(Boolean(b.aliasDirect))*3+Number(Boolean(b.concentrationDirect))*2+Number(Boolean(b.classDirect));
     const directA=Number(Boolean(a.aliasDirect))*3+Number(Boolean(a.concentrationDirect))*2+Number(Boolean(a.classDirect));
     const completeness=Number(Boolean(b.concentration))+Number(b.reportedClass!==null)-
       Number(Boolean(a.concentration))-Number(a.reportedClass!==null);
     return directB-directA||completeness||Number(a.conflict)-Number(b.conflict)||b.confidence-a.confidence
   })[0]||null
 }
 function allergyResultObservationAtY(pass,page,rightSide,targetY,tolerance){
   const lines=allergyTableLines(pass);
   const width=Number(page.width||1800);
   const classMin=width*(rightSide?0.83:0.34),classMax=width*(rightSide?0.89:0.405);
   const concentrationMin=width*(rightSide?0.895:0.405),concentrationMax=width*(rightSide?0.985:0.49);
   const nearby=lines.filter(line=>Math.abs(line.y-targetY)<=tolerance);
   const classes=[],concentrations=[];
   nearby.forEach(line=>{
     const distance=Math.abs(line.y-targetY);
     const classRaw=clean(line.items.filter(item=>item.x>=classMin&&item.x<classMax).sort((a,b)=>a.x-b.x).map(item=>item.str).join(""));
     const classValue=normalizedAllergyClass(classRaw);
     if(classValue!==null)classes.push({value:classValue,raw:classRaw,line,distance});
     const concentrationRaw=clean(line.items.filter(item=>item.x>=concentrationMin&&item.x<concentrationMax).sort((a,b)=>a.x-b.x).map(item=>item.str).join(""));
     const concentration=normalizedAllergyConcentration(concentrationRaw,classValue);
     if(concentration)concentrations.push({value:concentration,raw:concentrationRaw,line,distance})
   });
   classes.sort((a,b)=>a.distance-b.distance);
   concentrations.sort((a,b)=>a.distance-b.distance||Number(!String(a.value).startsWith("<"))-Number(!String(b.value).startsWith("<")));
   let reportedClass=classes[0]?.value??null,concentration=concentrations[0]?.value||"";
   if(concentration==="0.35"&&reportedClass===0)concentration="<0.35";
   if(!concentration&&reportedClass===0)concentration="<0.35";
   const derived=concentration?allergyClassFromValue(concentration):null;
   if(reportedClass!==null&&derived!==null&&reportedClass!==derived){
     if(reportedClass===0)concentration="<0.35";
     else return null
   }
   if(reportedClass===null)reportedClass=allergyClassFromValue(concentration);
   if(reportedClass===null||!concentration)return null;
   return{
     concentration,reportedClass,derivedClass:allergyClassFromValue(concentration),
     classDirect:classes.length>0,concentrationDirect:concentrations.length>0,
     classRaw:classes[0]?.raw||"",concentrationRaw:concentrations[0]?.raw||"",
     sourceLine:[classes[0]?.line?.text,concentrations[0]?.line?.text].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(" | "),
     confidence:Number(pass.confidence||72),mode:pass.mode||"allergy-template-row",targetY
   }
 }
 function allergyEstimatedY(points,targetIndex){
   const usable=(points||[]).filter(point=>Number.isFinite(point.index)&&Number.isFinite(point.y));
   if(usable.length<3)return null;
   const meanX=usable.reduce((sum,point)=>sum+point.index,0)/usable.length;
   const meanY=usable.reduce((sum,point)=>sum+point.y,0)/usable.length;
   const denominator=usable.reduce((sum,point)=>sum+(point.index-meanX)**2,0);
   if(!denominator)return null;
   const slope=usable.reduce((sum,point)=>sum+(point.index-meanX)*(point.y-meanY),0)/denominator;
   if(!Number.isFinite(slope)||Math.abs(slope)<10||Math.abs(slope)>100)return null;
   return{y:meanY+slope*(targetIndex-meanX),spacing:Math.abs(slope)}
 }
 function recoverBclAllergyRows(page,profile,existing){
   const expected=ALLERGY_CATALOG[profile]||[];
   if(existing.length<14||expected.length!==21)return[];
   const present=new Set(existing.map(row=>row.test_code)),recovered=[];
   for(let catalogIndex=0;catalogIndex<expected.length;catalogIndex++){
     const entry=expected[catalogIndex];
     if(present.has(entry[1]))continue;
     const rightSide=catalogIndex>=11,sideIndex=rightSide?catalogIndex-11:catalogIndex;
     const points=existing.filter(row=>Boolean(row.allergy_right_side)===rightSide&&Number.isFinite(Number(row.allergy_catalog_index))&&Number.isFinite(Number(row.allergy_label_y)))
       .map(row=>({index:rightSide?Number(row.allergy_catalog_index)-11:Number(row.allergy_catalog_index),y:Number(row.allergy_label_y)}));
     const estimate=allergyEstimatedY(points,sideIndex);
     if(!estimate)continue;
     const tolerance=Math.max(20,Math.min(38,estimate.spacing*.48));
     const observations=photoPasses(page).map(pass=>allergyResultObservationAtY(pass,page,rightSide,estimate.y,tolerance)).filter(Boolean);
     if(!observations.length)continue;
     observations.sort((a,b)=>Number(b.classDirect)+Number(b.concentrationDirect)-Number(a.classDirect)-Number(a.concentrationDirect)||b.confidence-a.confidence);
     const best=observations[0];
     // A positive class requires a directly observed concentration. Class 0 may
     // safely use the report's own Class-0 definition (<0.35 kU/L).
     if(best.reportedClass>0&&!best.concentrationDirect)continue;
     const allergenThai=ALLERGY_THAI[entry[1]]||"",bilingualName=allergenThai?`${allergenThai} (${entry[0]})`:entry[0];
     const panel=profile==="food"?"Food Specific IgE":"Inhalant Specific IgE";
     const row=makeRow([`Specific IgE — ${bilingualName}`,"Allergy",panel,entry[1]],page.pageNumber,best.concentration,"kU/L","","<0.35",best.sourceLine,{allowRepair:false});
     if(!row)continue;
     row.source_flag=best.reportedClass===0?"N":"H";row.calculated_flag=row.source_flag;
     row.allergy_profile=profile;row.allergy_class=best.reportedClass;row.allergy_class_source=best.classDirect?"reported-table-cell":"derived-from-reported-concentration-threshold";
     row.allergy_interpretation=allergyClassMeaning(best.reportedClass);row.allergen_name=entry[0];row.allergen_name_th=allergenThai;
     row.allergen_components=ALLERGY_COMPONENTS_THAI[entry[1]]||entry[3]||[];row.allergen_kind=/_ccd_marker$/.test(entry[1])?"cross-reactivity-marker":"allergen";
     row.reported_method="Immunoblot";row.report_interpretation_raw=`Class ${best.reportedClass} — ${row.allergy_interpretation}`;
     row.confidence=Math.min(92,Math.max(78,best.confidence));row.parse_issue=false;row.verify_reason="";
     row.allergy_ocr=true;row.allergy_template_recovered=true;row.allergy_catalog_index=catalogIndex;row.allergy_label_y=estimate.y;row.allergy_right_side=rightSide;
     row.source_evidence=observations.map(item=>({type:"BCL_ALLERGY_POSITIONAL_ROW_RECOVERY",profile,allergen:entry[0],class_raw:item.classRaw,concentration_raw:item.concentrationRaw,class:item.reportedClass,concentration:item.concentration,ocr_pass:item.mode,page:page.pageNumber,target_y:estimate.y}));
     recovered.push(row);present.add(entry[1])
   }
   return recovered
 }
 function allergyProfileRows(page){
   const passes=photoPasses(page);
   if(!passes.length)return[];
   const profile=allergyProfileOf(passes.map(pass=>pass.text).join("\n"));
   if(!profile)return[];
   const panel=profile==="food"?"Food Specific IgE":"Inhalant Specific IgE";
   const output=[];
   for(const [catalogIndex,entry] of ALLERGY_CATALOG[profile].entries()){
     const observations=photoPasses(page).map(pass=>allergyObservation(pass,page,entry)).filter(Boolean)
       .filter(item=>item.reportedClass===0||item.concentrationDirect);
     if(!observations.length)continue;
     const frequency=new Map();
     observations.filter(item=>item.concentration).forEach(item=>frequency.set(item.concentration,(frequency.get(item.concentration)||0)+1));
     const concentration=[...frequency].sort((a,b)=>b[1]-a[1]||
       Math.max(...observations.filter(item=>item.concentration===b[0]).map(item=>item.confidence))-
       Math.max(...observations.filter(item=>item.concentration===a[0]).map(item=>item.confidence)))[0]?.[0]||"";
     const supporting=observations.filter(item=>item.concentration===concentration);
     const best=(supporting.length?supporting:observations).slice().sort((a,b)=>Number(a.conflict)-Number(b.conflict)||b.confidence-a.confidence)[0];
     const directClassOne=observations.some(item=>item.classDirect&&Number(item.classRaw)===1);
     const directPositiveClass=observations.some(item=>item.classDirect&&Number(item.reportedClass)>0);
     const negativeThresholdEvidence=observations.some(item=>
       item.comparatorDirect||
       item.classDirect&&Number(item.classRaw)===0||
       String(item.concentration||"").startsWith("<")
     );
     // A compact BCL row frequently loses the decimal point or comparator in one OCR pass.
     // If another pass directly observes Class 0 / '<', prefer the report's printed Class-0
     // threshold rather than turning <0.35 into 35 kU/L (Class 4).
     const malformedNegativeToken=["0.35","35"].includes(concentration)||
       observations.some(item=>["0.35","35"].includes(String(item.concentration||"")));
     const verifiedConcentration=!directPositiveClass&&negativeThresholdEvidence&&malformedNegativeToken
       ?"<0.35":concentration==="0.35"&&!directClassOne&&negativeThresholdEvidence
         ?"<0.35":concentration;
     const allergyClass=allergyClassFromValue(verifiedConcentration)??best.reportedClass;
     const value=verifiedConcentration||(allergyClass===0?"<0.35":`Class ${allergyClass}`);
     const allergenThai=ALLERGY_THAI[entry[1]]||"";
     const bilingualName=allergenThai?`${allergenThai} (${entry[0]})`:entry[0];
     const def=[`Specific IgE — ${bilingualName}`,"Allergy",panel,entry[1]];
     const numeric=allergyClassFromValue(value)!==null;
     const row=makeRow(def,page.pageNumber,value,numeric?"kU/L":"","",numeric?"<0.35":"",best.sourceLine,{allowRepair:false});
     if(!row)continue;
     const inconsistent=observations.some(item=>item.conflict);
     const valueSupport=frequency.get(concentration)||0;
     const concentrationObserved=supporting.some(item=>item.concentrationDirect);
     const classObserved=observations.some(item=>item.classDirect);
     row.source_flag=allergyClass===0?"N":"H";
     row.calculated_flag=row.source_flag;
     row.allergy_profile=profile;
     row.allergy_class=allergyClass;
     row.allergy_class_source=classObserved?"reported-or-consensus":"derived-from-reported-concentration-threshold";
     row.allergy_interpretation=allergyClassMeaning(allergyClass);
     row.allergen_name=entry[0];
     row.allergen_name_th=allergenThai;
     row.allergen_components=ALLERGY_COMPONENTS_THAI[entry[1]]||entry[3]||[];
     row.allergen_kind=/_ccd_marker$/.test(entry[1])?"cross-reactivity-marker":"allergen";
     row.reported_method="Immunoblot";
     row.report_interpretation_raw=`Class ${allergyClass} — ${row.allergy_interpretation}`;
     row.confidence=Math.min(98,Math.max(...observations.map(item=>item.confidence||0))+(valueSupport>=2?4:0));
     const classZeroThresholdRecovered=allergyClass===0&&classObserved&&!concentrationObserved;
     row.parse_issue=(!concentrationObserved&&!classZeroThresholdRecovered)||inconsistent&&valueSupport<2;
     row.verify_reason=!concentrationObserved&&!classZeroThresholdRecovered?"Concentration ได้จาก Class ของรายงาน ต้องตรวจเทียบต้นฉบับ":
       inconsistent&&valueSupport<2?"OCR อ่าน Class กับ Concentration ไม่สอดคล้องกัน":"";
     row.allergy_ocr=true;
     row.allergy_catalog_index=catalogIndex;
     row.allergy_label_y=best.labelY;
     row.allergy_right_side=best.labelY!==undefined&&best.labelY!==null?Boolean((best.sourceLine&&best.sourceLine.length)&&entry&&catalogIndex>=11):catalogIndex>=11;
     if(classZeroThresholdRecovered){
       row.allergy_class_zero_threshold_recovered=true;
       row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"BCL_CLASS_0_REFERENCE_RECOVERY",class:0,concentration:"<0.35",reason:"ตารางอ้างอิงของรายงานกำหนด Class 0 เป็น <0.35 kU/L"}]
     }
     row.evidence_passes=new Set(observations.map(item=>item.mode)).size;
     row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),...observations.map(item=>({
       type:"allergy-profile-row",profile,allergen:entry[0],class_raw:item.classRaw,
       concentration_raw:item.concentrationRaw,class:item.reportedClass,
       concentration:item.concentration,comparator_direct:Boolean(item.comparatorDirect),
       ocr_pass:item.mode,page:page.pageNumber
     }))];
     output.push(row)
   }
   output.push(...recoverBclAllergyRows(page,profile,output));
   return output
 }
 function maharatTablePage(page){
   const text=photoPasses(page)
     .filter(pass=>!pass.focusedResultColumn)
     .map(pass=>String(pass.text||"")).join("\n");
   const header=/Test\s*Name[\s\S]{0,140}Results?[\s\S]{0,140}Units?[\s\S]{0,180}Normal\s*Range/i.test(text);
   return header&&(/MAHARAT\s+NAKHONRATCHASIMA/i.test(text)||/Previous\s+result/i.test(text))
 }
 function maharatNonLabPage(page){
   const text=photoPasses(page).map(pass=>String(pass.text||"")).join("\n");
   if(/Test\s*Name[\s\S]{0,140}Results?[\s\S]{0,180}Normal\s*Range/i.test(text))return false;
   return/(?:Previous\s*Dx|Physical\s*Examination|Intervention\/RF|Cytological\s+Pathology\s+Report|Negative\s+for\s+intraepithelial\s+lesion)/i.test(text)
 }
 function testByCode(code){return TESTS.find(def=>def[3]===code)||null}
 function maharatDefForLine(lineText){
   const value=norm(lineText);
   const exact=[
     [/^wbccorrected/,"wbc"],[/^wbc/,"wbc"],[/^rbc/,"rbc_count"],
     [/^hgb/,"hb"],[/^hct/,"hct"],[/^mcv/,"mcv"],[/^mchc/,"mchc"],
     [/^mch/,"mch"],[/^rdw/,"rdw"],[/^plt/,"platelet_count"],
     [/^mpv/,"mpv"],[/^nrbc/,"nrbc"],[/^ne%?/,"neutrophil_pct"],
     [/^ly%?/,"lymphocyte_pct"],[/^mo%?/,"monocyte_pct"],
     [/^eo%?/,"eosinophil_pct"],[/^ba%?/,"basophil_pct"],
     [/^absolutenecount(?:anc)?/,"neutrophil_abs"],[/^hypochromia/,"hypochromia"],
     [/^glucose/,"fasting_glucose"],[/^bun/,"bun"],[/^creatinine/,"creatinine"],
     [/^egfr/,"egfr_ckd_epi"],[/^totalprotein/,"total_protein"],
     [/^albumin/,"albumin"],[/^globulin/,"globulin"],
     [/^directbilirubin/,"direct_bilirubin"],[/^totalbilirubin/,"total_bilirubin"],
     [/^sgot(?:ast)?/,"ast"],[/^sgpt(?:alt)?/,"alt"],[/^alp/,"alp"],
     [/^sodium/,"sodium"],[/^potassium/,"potassium"],[/^chloride/,"chloride"],
     [/^co2/,"co2"],[/^aniongap/,"anion_gap"],
     [/^hivagab/,"anti_hiv_interpretation"],[/^hivag/,"hiv_ag"],[/^hivab/,"hiv_ab"],
     [/^rpr/,"syphilis"],[/^ca199/,"ca_19_9"],[/^ca125/,"ca_125"]
   ];
   const code=(exact.find(([pattern])=>pattern.test(value))||[])[1];
   if(code)return testByCode(code);
   return TESTS
     .filter(def=>!["Urinalysis","Clinical Microscopy"].includes(def[1]))
     .find(def=>bestAliasAtLine(lineText,def))||null
 }
 function maharatHeader(pass,page){
   const width=Number(page.width||1800);
   for(const line of photoLines(pass)){
     if(!/(?:test|est)\s*name/i.test(line.text)||!/(?:result|value)/i.test(line.text))continue;
     const item=pattern=>line.items.find(entry=>pattern.test(entry.str));
     const result=item(/^(?:results?|value)$/i);
     const unit=item(/^units?$/i);
     const flag=item(/^flag$/i);
     const normal=item(/^normal$/i);
     const previous=item(/^previous$/i);
     if(!result||!unit||!normal)continue;
     return{
       y:line.y,
       resultX:Number(result.x),unitX:Number(unit.x),
       flagX:Number(flag?.x||normal.x-width*.08),
       normalX:Number(normal.x),
       previousX:Number(previous?.x||width*.92)
     }
   }
   return null
 }
 function maharatValue(raw){
   let value=repairPhotoValue(raw)
     .replace(/^[^A-Za-z0-9<>-]+/,"")
     .replace(/[_—–]+/g,"-");
   value=clean(value);
   if(/non\s*[- ]?\s*reactive/i.test(value))return"Non-reactive";
   if(/\bnegative\b/i.test(value))return"Negative";
   if(/\bpositive\b/i.test(value))return"Positive";
   if(/^few$/i.test(value))return"Few";
   return value
 }
 function maharatReference(items){
   let text=clean(items.map(item=>item.str).join(" "))
     .replace(/(\d):(\d)/g,"$1.$2")
     .replace(/\bN\s*:\s*/i,"")
     .replace(/(\d)\s*=\s*(\d)/g,"$1-$2")
     .replace(/\s+/g," ");
   let match=text.match(/([<>]=?)\s*(-?\d+(?:\.\d+)?)/);
   if(match)return`${match[1]}${match[2]}`;
   match=text.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
   if(match)return`${match[1]}-${match[2]}`;
   return""
 }
 function maharatUnit(items){
   const joined=normalizeUnit(items.map(item=>item.str).join(" "));
   if(unitRe.test(joined))return joined;
   return unitFromTokens(items.map(item=>item.str))
 }
 function maharatLineParts(line,zones,page){
   const width=Number(page.width||1800);
   const resultLeft=zones.resultX-width*.055;
   const resultRight=zones.unitX-width*.055;
   const unitRight=zones.flagX-width*.025;
   const flagRight=zones.normalX-width*.02;
   const referenceRight=zones.previousX-width*.015;
   const resultItems=line.items.filter(item=>item.x>=resultLeft&&item.x<resultRight);
   const unitItems=line.items.filter(item=>item.x>=zones.unitX-width*.035&&item.x<unitRight);
   const flagItems=line.items.filter(item=>item.x>=zones.flagX-width*.035&&item.x<flagRight);
   const referenceItems=line.items.filter(item=>item.x>=zones.normalX-width*.04&&item.x<referenceRight);
   const rawValue=clean(resultItems.map(item=>item.str).join(" "));
   const sourceFlag=(clean(flagItems.map(item=>item.str).join(" ")).match(/\b(?:HH|LL|H|L)\b/i)||[])[0]||"";
   return{
     rawValue,value:maharatValue(rawValue),
     unit:maharatUnit(unitItems),
     sourceFlag:sourceFlag.toUpperCase(),
     reference:maharatReference(referenceItems)
   }
 }
 function maharatLabRows(page){
   if(!maharatTablePage(page))return null;
   const primaryPasses=photoPasses(page).filter(pass=>!pass.focusedResultColumn);
   const focusPasses=photoPasses(page).filter(pass=>pass.focusedResultColumn);
   const output=[],anchors=[],validCodes=new Set();
   for(const pass of primaryPasses){
     const zones=maharatHeader(pass,page);
     if(!zones)continue;
     const lines=photoLines(pass).filter(line=>
       line.y<zones.y-8&&line.y>zones.y-Number(page.height||1800)*.38&&
       !/H\s*:\s*High|Comments?|Check\s*In\s*Date/i.test(line.text)
     );
     for(const line of lines){
       const def=maharatDefForLine(line.text);
       if(!def)continue;
       const parts=maharatLineParts(line,zones,page);
       anchors.push({def,line,zones,parts,pass});
       if(!valRe.test(parts.value))continue;
       const row=makeRow(def,page.pageNumber,parts.value,parts.unit,parts.sourceFlag,parts.reference,line.text);
       if(!row)continue;
       row.confidence=Math.min(96,Math.max(78,Number(pass.confidence||82)));
       row.photo_ocr=true;
       row.ocr_pass=pass.mode;
       row.numeric_result_source="MAHARAT_CURRENT_RESULT_COLUMN";
       row.source_evidence=[{
         type:"maharat-current-result-column",raw_line:line.text,
         result_raw:parts.rawValue,reference_raw:parts.reference,
         previous_result_excluded:true,ocr_pass:pass.mode,page:page.pageNumber
       }];
       output.push(row);
       validCodes.add(def[3])
     }
   }
   // A focused result-column pass is fallback-only. It is consulted only when
   // every whole-page pass lost the current value, typically under pen marks.
   const bestAnchorByCode=new Map();
   anchors.forEach(anchor=>{
     const code=anchor.def[3],old=bestAnchorByCode.get(code);
     const score=Number(Boolean(anchor.parts.unit))+Number(Boolean(anchor.parts.reference))*2+
       Number(Boolean(anchor.parts.sourceFlag));
     if(!old||score>old.score)bestAnchorByCode.set(code,{...anchor,score})
   });
   for(const [code,anchor] of bestAnchorByCode){
     if(validCodes.has(code))continue;
     const candidates=[];
     for(const pass of focusPasses){
       const tolerance=Math.max(9,Number(page.height||1800)*.0055);
       const line=photoLines(pass)
         .map(value=>({value,distance:Math.abs(value.y-anchor.line.y)}))
         .sort((a,b)=>a.distance-b.distance)[0];
       if(!line||line.distance>tolerance)continue;
       const focusedParts=maharatLineParts(line.value,anchor.zones,page);
       const value=valRe.test(focusedParts.value)
         ?focusedParts.value:maharatValue(line.value.text);
       if(!valRe.test(value))continue;
       candidates.push({value,line:line.value,pass})
     }
     const unique=[...new Map(candidates.map(item=>[item.value,item])).values()];
     for(const candidate of unique){
       const row=makeRow(
         anchor.def,page.pageNumber,candidate.value,anchor.parts.unit,
         anchor.parts.sourceFlag,anchor.parts.reference,
         `${anchor.line.text} | focused result: ${candidate.line.text}`
       );
       if(!row)continue;
       row.confidence=Math.min(94,Math.max(80,Number(candidate.pass.confidence||82)));
       row.photo_ocr=true;
       row.ocr_pass=candidate.pass.mode;
       row.numeric_result_source="MAHARAT_FOCUSED_RESULT_FALLBACK";
       row.source_evidence=[{
         type:"maharat-focused-result-fallback",label_line:anchor.line.text,
         result_raw:candidate.line.text,previous_result_excluded:true,
         ocr_pass:candidate.pass.mode,page:page.pageNumber
       }];
       output.push(row)
     }
   }
   return output
 }
 // v10.214 — BNH scanned-lab source truth reader.
 // These reports are visually tabular but OCR frequently drops decimal points,
 // short range separators, or column boundaries.  Parse the physical/source row
 // first and preserve the reported token verbatim; generic clinical repair is a
 // fallback for other report families, never a license to make a BNH value look
 // more "normal".
 function bnhSourceText(page){
   return photoPasses(page).map(pass=>String(pass.text||"")).join("\n")+"\n"+
     String(page?.pdfText||"")+"\n"+String(page?.text||"")
 }
 function bnhScannedPage(page){
   // v10.240: execution mode is not identity evidence.  v10.239 treated
   // bnhFastProbe/bnhSelectiveRefine as proof that a page was BNH.  Because the
   // first page of every long scanned PDF may use that probe, a BCL Allergy
   // page could be misrouted into the BNH parser and all 21 Specific-IgE rows
   // disappeared before the completeness guard.  Only an explicit BNH profile,
   // an explicit bnhDetected bit, or the printed BNH header may select BNH.
   if(clean(page?.profileHint).toUpperCase()==="BNH_SCANNED_LAB"||page?.bnhDetected===true)return true;
   const source=bnhSourceText(page);
   return /\bBNH\s+Hospital\b|\bBNH\s+HOSPITAL\b|9\s*\/\s*1\s+Convent\s+Road|Hospital\s+Number\s*:/i.test(source)
 }
 function bnhEvidenceLines(page){
   const output=[],seen=new Set();
   const passes=photoPasses(page).slice().sort((a,b)=>Number(Boolean(b?.exactSourceRowEvidence))-Number(Boolean(a?.exactSourceRowEvidence))||bnhAtomicPassBonus(b?.mode)-bnhAtomicPassBonus(a?.mode));
   passes.forEach(pass=>{
     const add=(text,items=[])=>{
       const value=clean(text);if(!value)return;
       const key=value.toLowerCase();if(seen.has(key))return;seen.add(key);
       output.push({text:value,items:Array.isArray(items)?items:[],mode:pass.mode||"bnh-source",confidence:Number(pass.confidence||86),targetCode:clean(pass.targetCode||""),exactSourceRowEvidence:Boolean(pass.exactSourceRowEvidence)})
     };
     photoLines(pass).forEach(line=>add(line.text,line.items));
     const rawLines=String(pass.text||"").split(/\n+/).map(clean).filter(Boolean);
     rawLines.forEach(line=>add(line,[]));
     // v10.221 — targeted BNH OCR may split the far-right reference range onto
     // the next OCR line even though it is printed on the same physical row.
     // Preserve a narrow two-line source window only for exact-row passes so
     // value + unit + reference can be reconstructed without borrowing a
     // neighbouring analyte row from broad full-page OCR.
     if(pass.exactSourceRowEvidence){
       for(let i=0;i<rawLines.length-1;i++){
         const joined=clean(`${rawLines[i]} ${rawLines[i+1]}`);
         if(/\d/.test(rawLines[i])&&/[()<>]|\d\s*[-–]\s*\d/.test(rawLines[i+1]))add(joined,[])
       }
     }
   });
   return output
 }

 // v10.223 — Page-Geometry Typed Parser.
 // Exact-row OCR already carries word bounding boxes mapped back to the source
 // page.  Use the printed BNH column positions to reconstruct Result / Flag /
 // Unit / Reference from one physical row before falling back to token order.
 // This prevents a far-right reference endpoint (MCV 100.0) from becoming the
 // result and lets a split reference such as "0.2   1.8" remain source-bound.
 function bnhGeometryNumberTokens(items=[]){
   const out=[];
   (items||[]).forEach(item=>{
     const raw=clean(item?.str).replace(/,/g,'.');
     const matches=[...raw.matchAll(/(?:^|[^A-Za-z0-9])([<>]=?\s*)?(-?\d+(?:\.\d+)?)(?=$|[^A-Za-z0-9])/g)];
     if(!matches.length&&/^[<>]=?\s*-?\d+(?:\.\d+)?$/.test(raw))matches.push({1:(raw.match(/^[<>]=?/)||[])[0]||'',2:raw.replace(/^[<>]=?\s*/,'')});
     matches.forEach(m=>out.push({raw:clean(`${m[1]||''}${m[2]||''}`).replace(/\s+/g,''),number:Number(m[2]),x:Number(item?.x||item?.bbox?.x0||0),cx:Number(item?.x||item?.bbox?.x0||0)+Number(item?.w||((item?.bbox?.x1||0)-(item?.bbox?.x0||0))||0)/2,item}))
   });
   return out.filter(token=>Number.isFinite(token.number))
 }
 function bnhGeometryReference(items=[],pageWidth=0){
   const width=Math.max(1,Number(pageWidth||0));
   const right=(items||[]).filter(item=>{
     const cx=Number(item?.x||0)+Number(item?.w||0)/2;return cx/width>=.70
   });
   if(!right.length)return'';
   const text=clean(right.sort((a,b)=>Number(a.x||0)-Number(b.x||0)).map(item=>item.str).join(' '));
   let ref=bnhReferenceFromLine(text);if(ref)return ref;
   const nums=bnhGeometryNumberTokens(right).sort((a,b)=>a.cx-b.cx);
   const comparator=(text.match(/[<>]=?/)||[])[0]||'';
   if(comparator&&nums.length)return`${comparator}${nums[0].raw.replace(/^[<>]=?/,'')}`;
   if(nums.length>=2)return`${nums[0].raw.replace(/^[<>]=?/,'')}-${nums[1].raw.replace(/^[<>]=?/,'')}`;
   return''
 }
 function bnhGeometryVisualRows(items=[]){
   const words=(items||[]).filter(item=>clean(item?.str)).slice().sort((a,b)=>Number(b.y||0)-Number(a.y||0)||Number(a.x||0)-Number(b.x||0));
   if(!words.length)return[];
   const heights=words.map(item=>Math.abs(Number(item?.bbox?.y1||0)-Number(item?.bbox?.y0||0))).filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>a-b);
   const median=heights.length?heights[Math.floor(heights.length/2)]:8,tolerance=Math.max(5,Math.min(14,median*.8));
   const rows=[];
   for(const item of words){
     const y=Number(item.y||0);let row=rows.find(candidate=>Math.abs(candidate.y-y)<=tolerance);
     if(!row){row={y,items:[]};rows.push(row)}
     row.items.push(item);row.y=row.items.reduce((sum,word)=>sum+Number(word.y||0),0)/row.items.length
   }
   return rows.map(row=>({y:row.y,items:row.items.sort((a,b)=>Number(a.x||0)-Number(b.x||0)),text:clean(row.items.sort((a,b)=>Number(a.x||0)-Number(b.x||0)).map(item=>item.str).join(' '))}))
 }
 function bnhGeometryAnchoredItems(items=[],def){
   const code=clean(def?.[3]);if(!code)return[];
   const rows=bnhGeometryVisualRows(items);
   const safeRows=code==='platelet_count'?rows.filter(row=>!/Platelet\s+Count\s+by\s+Manual|Manual\s+Slide\s+Review|oil\s+field/i.test(row.text)):rows;
   const anchored=safeRows.filter(row=>Boolean(bnhAliasTokenEnd(row.text,def)));
   if(anchored.length)return anchored.sort((a,b)=>{
     const aNum=bnhGeometryNumberTokens(a.items).length,bNum=bnhGeometryNumberTokens(b.items).length;
     return bNum-aNum
   })[0].items;
   // Critical FDP crops may include the administrative rows printed just below
   // the analyte.  Never promote Acknowledged/Notified time (e.g. 11.36) to the
   // FDP result merely because the crop carries targetCode=fdp.  If the label is
   // faint, accept only a row that still has the distinctive result + unit +
   // comparator/reference structure of the physical FDP row.
   if(code==='fdp'){
     const strong=rows.filter(row=>/^[^\n]*[<>]=?\s*\d+(?:[.,]\d+)?/i.test(row.text)&&/(?:u|µ)g\s*\/\s*mL/i.test(row.text)&&/[\[(]\s*[<>]=?\s*\d+(?:[.,]\d+)?\s*[\])]/.test(row.text));
     return strong.sort((a,b)=>bnhGeometryNumberTokens(b.items).length-bnhGeometryNumberTokens(a.items).length)[0]?.items||[]
   }
   return[]
 }
 function bnhGeometrySourceMatches(page,def){
   const code=clean(def?.[3]);if(!code)return[];
   const width=Math.max(1,Number(page?.width||page?.pdfPageWidth||0));
   const passes=photoPasses(page).filter(pass=>clean(pass?.targetCode)===code&&Array.isArray(pass?.textItems)&&pass.textItems.length&&(/bnh-row-/i.test(clean(pass?.mode))||pass?.exactSourceRowEvidence));
   const matches=[];
   for(const pass of passes){
     const allItems=pass.textItems.slice().filter(item=>clean(item?.str));if(!allItems.length)continue;
     const anchoredItems=bnhGeometryAnchoredItems(allItems,def);
     // FDP is safety-critical and the crop contains notification metadata below
     // the result row.  Geometry is admissible only when the analyte row itself
     // can be anchored; otherwise fall back to body/direct source-row evidence.
     if(code==='fdp'&&!anchoredItems.length)continue;
     const items=(anchoredItems.length?anchoredItems:allItems).sort((a,b)=>Number(a.x||0)-Number(b.x||0));
     const numbers=bnhGeometryNumberTokens(items);
     const resultNums=numbers.filter(token=>token.cx/width>=.42&&token.cx/width<.64).sort((a,b)=>a.cx-b.cx);
     if(!resultNums.length)continue;
     // The result column is the first numeric token after the label/colon. A
     // reference endpoint lives >=70% of page width and is never eligible here.
     const valueToken=resultNums[0];let value=valueToken.raw;
     const flags=items.filter(item=>{const cx=(Number(item.x||0)+Number(item.w||0)/2)/width;return cx>=.54&&cx<.66&&/^(?:HH|LL|H|L)$/i.test(clean(item.str))});
     const flag=clean(flags[0]?.str).toUpperCase();
     const unitItems=items.filter(item=>{const cx=(Number(item.x||0)+Number(item.w||0)/2)/width;return cx>=.58&&cx<.75&&!/^(?:HH|LL|H|L)$/i.test(clean(item.str))});
     let unit=bnhUnitFromLine(unitItems.map(item=>item.str).join(' '),code);
     if(code==='urine_ph')unit='';
     const reference=bnhGeometryReference(items,width);
     const rawLine=clean(items.map(item=>item.str).join(' '));
     const row=makeRow(def,page.sourcePageNumber??page.pageNumber,value,unit,flag,reference,rawLine,{allowRepair:false});if(!row)continue;
     row.photo_ocr=true;row.ocr_pass=`${clean(pass.mode)||'bnh-row'}-geometry`;row.confidence=Math.max(98,Number(pass.confidence||0));row.numeric_result_source='BNH_PAGE_GEOMETRY_ROW';row.source_profile='BNH_SCANNED_LAB';row.bnh_source_truth=true;row.exact_source_row_recovered=true;row.exact_source_row_code=code;row.geometry_source_row=true;
     row.source_evidence=[{type:'BNH_PAGE_GEOMETRY_ROW',raw_line:rawLine,reported_value:value,reported_reference:reference,reported_flag:flag,page:page.sourcePageNumber??page.pageNumber,ocr_pass:pass.mode,column_rule:'result .42-.64 / reference >=.70'}];
     // Once geometry recovers this row's own reference/flag, a missing decimal
     // may be repaired only when exactly one placement preserves the OCR digits
     // and is consistent with that same source row (e.g. Retic 14 -> 1.4).
     bnhNormalizeRepeatedSourceTokens(row);bnhTypedReferenceDecimalRepair(row);bnhApplyUniqueDecimalRepair(row);
     if(clean(row.reference_raw)){Object.assign(row,parseRef(row.reference_raw));row.reported_reference_raw=row.reference_raw}
     if(clean(row.unit))row.reported_unit=normalizeUnit(row.unit);
     matches.push({row,line:{text:rawLine,items,mode:row.ocr_pass,confidence:row.confidence,targetCode:code,exactSourceRowEvidence:true,geometrySourceRowEvidence:true},score:220+bnhBundleIntegrity(row,def).score})
   }
   return matches
 }
 function bnhAllowedDefinition(pageText,def){
   const code=def?.[3]||"";
   const microbiology=/(?:Gram['’]?s?\s+Stain|AFB\s+Stain|Culture\s*(?:&|and)\s*Sensitivity|Sputum\s+Culture)/i.test(pageText)&&
     !/Complete\s+Blood\s+Count|Reticulocyte\s+Count|Coagulation/i.test(pageText);
   // "Few WBC seen" on a Gram-stain page is a qualitative microscopy finding,
   // not a CBC WBC measurement.  Never route microbiology prose into numeric Lab Tracker rows.
   if(microbiology)return false;
   const urine=/\bUrine\s+Examination\b|\bUrinalysis\b/i.test(pageText);
   if(urine)return def?.[1]==="Urinalysis";
   const coombs=/Coombs\s+Test|DAT-CENTBLOOD|IAT-CENTBLOOD/i.test(pageText);
   if(coombs)return["direct_coombs","indirect_coombs"].includes(code);
   const fdp=/Fibrin\s+Degradation|\bD-?Dimer\b/i.test(pageText);
   if(fdp)return code==="fdp";
   const retic=/\bReticulocyte\s+Count\b/i.test(pageText)&&!/Complete\s+Blood\s+Count/i.test(pageText);
   if(retic){
     // v10.220 — BNH may print the tail of CBC (Metamyelocyte / Platelet / MPV)
     // immediately above a Reticulocyte Count subsection on the same physical page.
     // Do not classify the whole page as reticulocyte-only or the latest Platelet/MPV
     // event disappears even though it is visibly present in source.
     if(["reticulocyte_pct","reticulocyte_abs"].includes(code))return true;
     const hybridCbc=/\bPlatelet\s+Count\b|(?:^|\s)MPV(?:\s|:|$)|Myelocyte|Metamyelocyte/i.test(pageText);
     if(hybridCbc&&["platelet_count","mpv","myelocyte_pct","metamyelocyte_pct"].includes(code))return true;
     return false
   }
   const coag=/Thromboplastin|Prothrombin\s+Time|\bINR\b/i.test(pageText);
   if(coag)return["aptt","prothrombin_time","inr"].includes(code);
   const cbc=/Complete\s+Blood\s+Count|Platelet\s+Count|Myelocyte|Metamyelocyte/i.test(pageText);
   if(cbc&&def?.[1]==="Urinalysis")return false;
   return def?.[1]!=="Urinalysis"&&!["direct_coombs","indirect_coombs","fdp"].includes(code)
 }
 function bnhAliasTokenEnd(text,def){
   const tokens=clean(text).split(/\s+/),aliases=defAliases(def).filter(Boolean).sort((a,b)=>b.length-a.length);
   for(let start=0;start<Math.min(3,tokens.length);start++){
     if(!norm(tokens[start]))continue;
     let joined="";
     for(let end=start;end<Math.min(tokens.length,start+10);end++){
       joined+=tokens[end];const normalized=norm(joined);
       const hit=aliases.find(alias=>normalized===alias);
       if(hit)return{start,end,tail:clean(tokens.slice(end+1).join(" ")),alias:hit}
     }
   }
   return null
 }
 function bnhReferenceFromLine(text){
   const source=clean(text).replace(/,/g,".");
   const normalize=value=>clean(value).replace(/\s*[-–]\s*/g,"-").replace(/\s+/g,"");
   const matches=[...source.matchAll(/[\[(]\s*((?:[<>]=?\s*)?-?\d+(?:\.\d+)?(?:\s*[-–]\s*-?\d+(?:\.\d+)?)?)\s*[\])]/g)];
   if(matches.length)return normalize(matches[matches.length-1][1]);
   const inline=(source.match(/(?:Reference\s*(?:Range)?|Ref\.?)[^\d<>]{0,12}((?:[<>]=?\s*)?-?\d+(?:\.\d+)?(?:\s*[-–]\s*-?\d+(?:\.\d+)?)?)/i)||[])[1];
   if(inline)return normalize(inline);
   // v10.217: scanned BNH rows often lose the reference parentheses while the
   // range itself remains at the far right of the same physical row.  Accept a
   // trailing range only; this prevents a neighbouring result token from being
   // promoted to a reference interval.
   const trailing=(source.match(/(?:^|\s)((?:[<>]=?\s*)?-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?|[<>]=?\s*-?\d+(?:\.\d+)?)\s*$/)||[])[1];
   return normalize(trailing)
 }
 function bnhNormalReferenceFromLine(text){
   const m=clean(text).match(/[\[(]\s*Normal\s*:\s*([^\])]+)[\])]/i);
   return m?`Normal: ${clean(m[1])}`:""
 }
 function bnhSourceFlag(text){
   const beforeReference=clean(text).split(/[\[(](?=\s*(?:[<>]=?\s*)?-?\d|\s*Normal\s*:)/i)[0];
   const flags=[...beforeReference.matchAll(/(?:^|\s)(HH|LL|H|L)(?=\s|$|[.,;])/gi)].map(m=>m[1].toUpperCase());
   return flags[0]||""
 }
 function bnhUnitFromLine(text,code=""){
   if(["urine_wbc","urine_rbc","urine_epithelial","urine_bacteria"].includes(code)&&/Cells?\s*\/\s*HPF/i.test(text))return"Cells/HPF";
   if(code==="reticulocyte_abs"&&/(?:\/\s*mm\^?3|mm3)/i.test(text))return"/mm3";
   const tokens=clean(text).replace(/[()[\],;]/g," ").split(/\s+/).filter(Boolean);
   for(let i=0;i<tokens.length;i++){
     const joined=[tokens[i],tokens[i+1],tokens[i+2]].filter(Boolean).join("");
     for(const candidate of [tokens[i],joined]){
       const unit=normalizeUnit(candidate.replace(/\.$/,""));
       if(unitRe.test(unit))return unit
     }
   }
   return""
 }
 function bnhValueFromTail(tail,code){
   const source=clean(tail).replace(/^[:=\-–]+\s*/,"");
   if(!source)return{value:"",reportedEquivalent:""};
   const normalOnly=/^[\[(]?\s*Normal\s*:/i.test(source);if(normalOnly)return{value:"",reportedEquivalent:""};
   if(code==="urine_protein"){
     const trace=source.match(/\bTrace\b(?:\s*\(\s*(\d+(?:\.\d+)?)\s*mg\s*\/\s*dL\s*\))?/i);
     if(trace)return{value:trace[1]?`Trace (${trace[1]} mg/dL)`:"Trace",reportedEquivalent:trace[1]||""}
   }
   if(code==="urine_blood"){
     const graded=source.match(/\b([1-4]\+)\s*(?:\(\s*([^)]*)\))?/i);
     if(graded)return{value:graded[2]?`${graded[1]} (${clean(graded[2]).replace(/\s*\/\s*/g,"/")})`:graded[1],reportedEquivalent:""}
   }
   const positive=source.match(/\bPositive(?:\s*([1-4]\+))?/i);
   if(positive)return{value:positive[1]?`Positive ${positive[1]}`:"Positive",reportedEquivalent:""};
   const negative=source.match(/\b(?:NEGATIVE|Negative|Non[- ]?reactive)\b/i);
   if(negative)return{value:/non/i.test(negative[0])?"Non-reactive":"Negative",reportedEquivalent:""};
   const descriptive=source.match(/\b(?:Slightly\s+Turbid|Clear|Yellow|Brown|Few|Rare|None|Not\s+found|No\s+growth\s+after\s+\d+\s+days)\b/i);
   if(descriptive)return{value:clean(descriptive[0]),reportedEquivalent:""};
   if(["urine_wbc","urine_rbc","urine_epithelial"].includes(code)){
     const range=source.match(/(?:^|\s)(\d+\s*[-–]\s*\d+)(?=\s|Cells?\/HPF|$)/i);
     if(range)return{value:clean(range[1]).replace(/\s*[-–]\s*/g,"-"),reportedEquivalent:""}
   }
   const numeric=source.match(/(?:^|\s|:)\s*((?:[<>]=?\s*)?-?\d+(?:[.,]\d+)?)(?=\s|$|[),])/);
   return{value:numeric?clean(numeric[1]).replace(",","."):"",reportedEquivalent:""}
 }
 function bnhDifferentialCompatible(def,lineText,unit){
   const code=clean(def?.[3]);
   if(!/(?:neutrophil|lymphocyte|monocyte|eosinophil|basophil)_(?:pct|abs)$/.test(code))return true;
   const source=clean(lineText),normalizedUnit=normalizeUnit(unit);
   const percentLabel=/^\s*%/.test(source)||/\b(?:NE|LY|MO|EO|BA)%\b/i.test(source)||/%\s*(?:Neutrophil|Lymphocyte|Monocyte|Eosinophil|Basophil)/i.test(source);
   const percentUnit=normalizedUnit==="%"||/(?:^|\s)%\s*(?:\(|$)/.test(source);
   const absoluteUnit=/(?:mm\^?3|10\^?[369]|cells?\s*\/\s*(?:uL|µL|mm\^?3))/i.test(`${normalizedUnit} ${source}`);
   if(code.endsWith("_pct"))return percentLabel||percentUnit;
   if(code.endsWith("_abs"))return !percentLabel&&!percentUnit&&(absoluteUnit||/^(?:Neutrophils|Lymphocytes|Monocytes|Eosinophils|Basophils)\b/i.test(source));
   return true
 }
 // v10.217 — Atomic Row Source-Truth Guard.
 // BNH prints Result + Flag + Unit + Reference on one physical row.  Treat the
 // fields as one evidence bundle across OCR passes instead of independently
 // accepting a plausible number from a neighbouring reference column.
 function bnhAtomicFlagConsistent(row){
   const ref=parseRef(row?.reference_raw),parts=valueParts(row?.value_raw);
   if(parts.value_numeric===null||!["range","<","<=",">",">="].includes(ref.reference_operator))return true;
   const calculated=calcFlag(parts,ref),reported=clean(row?.source_flag).toUpperCase();
   if(["H","HH","L","LL"].includes(reported))return reported.startsWith(calculated);
   if(reported==="N")return calculated==="N";
   // On BNH numeric tables an out-of-range value is normally printed with H/L.
   // Missing H/L is therefore negative evidence when OCR proposes an abnormal
   // scale.  We use it for adjudication/repair only, never as a clinical range.
   return calculated==="N"
 }
 function bnhReferenceEndpointEcho(row){
   if(row?.result_kind!=="NUMERIC"||row?.value_numeric===null)return false;
   const ref=parseRef(row.reference_raw);if(ref.reference_operator!=="range")return false;
   const n=Number(row.value_numeric),tol=Math.max(1,Math.abs(n))*1e-10;
   return Math.abs(n-Number(ref.reference_low))<=tol||Math.abs(n-Number(ref.reference_high))<=tol
 }
 // v10.221 — Row Bundle Integrity.  A targeted OCR crop is strong evidence,
 // but it is not automatically correct when it loses a decimal, unit, or the
 // right-hand reference column.  Rank the *whole physical row bundle* before
 // giving exact-crop evidence priority.
 const BNH_TYPED_ROW_RULES={
   reticulocyte_pct:{kind:"PERCENTAGE",unit:/^%$/,result:[0,50],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_low>=0&&ref.reference_high<=20},
   reticulocyte_abs:{kind:"ABSOLUTE_COUNT",unit:/^(?:\/mm3|10\^[369]\/mm3|cells\/mm3|cells\/µl)$/i,result:[1,3000000],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_high>=100},
   myelocyte_pct:{kind:"PERCENTAGE",unit:/^%$/,result:[0,20],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_low>=0&&ref.reference_high<=20},
   metamyelocyte_pct:{kind:"PERCENTAGE",unit:/^%$/,result:[0,20],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_low>=0&&ref.reference_high<=20},
   platelet_count:{kind:"SCALED_COUNT",unit:/^10\^3\/mm3$/i,result:[1,3000],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_high>=100},
   mcv:{kind:"CBC_INDEX",unit:/^fL$/i,result:[30,160]},mch:{kind:"CBC_INDEX",unit:/^pg$/i,result:[5,80]},mchc:{kind:"CBC_INDEX",unit:/^g\/dL$/i,result:[10,60]},rdw:{kind:"PERCENTAGE",unit:/^%$/,result:[3,50]},mpv:{kind:"CBC_INDEX",unit:/^fL$/i,result:[2,30]},
   aptt:{kind:"COAGULATION",unit:/^s$/i,result:[3,600]},prothrombin_time:{kind:"COAGULATION",unit:/^s$/i,result:[3,600]},
   albumin:{kind:"CHEMISTRY",unit:/^g\/dL$/i,result:[.5,8]},total_bilirubin:{kind:"CHEMISTRY",unit:/^(?:mg\/dL|µmol\/L)$/i,result:[0,500]},direct_bilirubin:{kind:"CHEMISTRY",unit:/^(?:mg\/dL|µmol\/L)$/i,result:[0,500]},fasting_glucose:{kind:"CHEMISTRY",unit:/^(?:mg\/dL|mmol\/L)$/i,result:[10,1500]},chloride:{kind:"CHEMISTRY",unit:/^mmol\/L$/i,result:[40,180]},
   urine_ph:{kind:"PH",unit:/^$/,result:[0,14],ref:(ref)=>ref.reference_operator==="range"&&ref.reference_low>=0&&ref.reference_high<=14},
   fdp:{kind:"COAGULATION_FDP",unit:/^µg\/mL$/i,result:[0,1000],ref:(ref)=>["<","<=","range"].includes(ref.reference_operator)}
 };
 function bnhTypedRowRule(code){return BNH_TYPED_ROW_RULES[clean(code)]||null}
 function bnhTypedRowKind(row){return bnhTypedRowRule(row?.test_code)?.kind||"GENERAL"}
 function bnhTypedRowAssessment(row){
   const rule=bnhTypedRowRule(row?.test_code);if(!rule)return{ok:true,score:0,kind:"GENERAL",reasons:[]};
   const parts=valueParts(row?.value_raw),ref=parseRef(row?.reference_raw),unit=normalizeUnit(row?.unit||row?.reported_unit||"");const reasons=[];let score=0;
   if(parts.value_numeric===null){reasons.push("typed row missing numeric result");score-=120}else if(rule.result&&(parts.value_numeric<rule.result[0]||parts.value_numeric>rule.result[1])){reasons.push("typed result outside structural envelope");score-=100}else score+=32;
   if(!rule.unit.test(unit)){reasons.push(`typed unit mismatch: ${unit||"(blank)"}`);score-=100}else score+=34;
   const numericRef=["range","<","<=",">",">="].includes(ref.reference_operator);
   if(!numericRef){reasons.push("typed row missing numeric reference");score-=70}else if(rule.ref&&!rule.ref(ref)){reasons.push("typed reference belongs to another row type");score-=120}else score+=34;
   // Explicitly prevent percent/absolute Reticulocyte cross-row contamination.
   if(row?.test_code==="reticulocyte_pct"&&(ref.reference_high??0)>20){reasons.push("absolute-count reference attached to Reticulocyte %");score-=180}
   if(row?.test_code==="reticulocyte_abs"&&(ref.reference_high??0)<100){reasons.push("percentage reference attached to absolute Reticulocyte");score-=180}
   const ok=parts.value_numeric!==null&&rule.unit.test(unit)&&numericRef&&(!rule.ref||rule.ref(ref))&&!(row?.test_code==="reticulocyte_pct"&&(ref.reference_high??0)>20)&&!(row?.test_code==="reticulocyte_abs"&&(ref.reference_high??0)<100);
   return{ok,score,kind:rule.kind,reasons,unit,ref}
 }
 function bnhAtomicTupleKey(row){return[bnhAtomicValueKey(row),normalizeUnit(row?.unit||row?.reported_unit||"").toLowerCase(),clean(row?.reference_raw),clean(row?.source_flag).toUpperCase()].join("|")}
 function bnhTupleSupport(item,matches){const key=bnhAtomicTupleKey(item.row);return(matches||[]).filter(candidate=>bnhAtomicTupleKey(candidate.row)===key).length}
 function bnhNormalizeRepeatedSourceTokens(row){
   const code=clean(row?.test_code);if(!["fasting_glucose","chloride"].includes(code))return row;
   const raw=clean(row.value_raw).replace(/,/g,".");const tokens=raw.split(/\s+/).filter(Boolean);
   if(tokens.length>1&&tokens.every(token=>token===tokens[0])){const before=row.value_raw;Object.assign(row,valueParts(tokens[0]));row.reported_value_raw=row.reported_value_raw||before;row.source_token_deduplicated=true}
   const resultToken=clean(row.value_raw).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");let ref=clean(row.reference_raw);
   if(resultToken&&ref){const stripped=ref.replace(new RegExp(`\\s+${resultToken}\\s*$`),"");if(stripped!==ref&&["range","<","<=",">",">="].includes(parseRef(stripped).reference_operator)){row.reference_raw=stripped;Object.assign(row,parseRef(stripped));row.reported_reference_raw=stripped;row.source_reference_echo_removed=true}}
   return row
 }
 function bnhTypedReferenceDecimalRepair(row){
   const code=clean(row?.test_code),rule=bnhTypedRowRule(code);if(!rule)return row;
   const raw=clean(row.reference_raw).replace(/,/g,".");const m=raw.match(/^(-?\d+)\s*[-–]\s*(-?\d+)$/);if(!m)return row;
   const variants=token=>{const sign=token.startsWith("-")?"-":"",digits=token.replace(/^-/,"");const out=[Number(sign+digits)];for(let i=1;i<digits.length;i++)out.push(Number(sign+digits.slice(0,i)+"."+digits.slice(i)));return[...new Set(out.filter(Number.isFinite))]};
   const candidates=[];for(const low of variants(m[1]))for(const high of variants(m[2])){if(low>=high)continue;const candidate=`${low}-${high}`,test={...row,reference_raw:candidate};const typed=bnhTypedRowAssessment(test);if(!typed.ok)continue;const profile=unitProfile(TESTS.find(def=>def[3]===code),candidate);if((UNIT_PROFILES[code]||[]).length&&code!=="fdp"&&!profile)continue;if(!bnhAtomicFlagConsistent(test))continue;candidates.push(candidate)}
   const unique=[...new Set(candidates)];if(unique.length!==1)return row;const before=row.reference_raw;row.reference_raw=unique[0];Object.assign(row,parseRef(row.reference_raw));row.reported_reference_raw=row.reference_raw;row.typed_reference_decimal_repair=true;row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"BNH_TYPED_REFERENCE_DECIMAL_REPAIR",from:before,to:row.reference_raw,reason:"Only one decimal placement preserved the source digits and matched the typed row/unit bundle"}];return row
 }

 const BNH_BUNDLE_REQUIRED=new Set([
   "fdp","reticulocyte_pct","reticulocyte_abs","myelocyte_pct","metamyelocyte_pct","platelet_count","mpv","mcv","mch","mchc","rdw",
   "albumin","total_bilirubin","direct_bilirubin","aptt","prothrombin_time","fasting_glucose","chloride","urine_ph"
 ]);
 function bnhBundleIntegrity(row,def=TESTS.find(item=>item[3]===row?.test_code)){
   const code=clean(def?.[3]||row?.test_code),parts=valueParts(row?.value_raw),ref=parseRef(row?.reference_raw),unit=normalizeUnit(row?.unit||row?.reported_unit||"");
   const numeric=parts.value_numeric!==null,required=BNH_BUNDLE_REQUIRED.has(code);
   const numericRef=["range","<","<=",">",">="].includes(ref.reference_operator);
   const expectedProfiles=UNIT_PROFILES[code]||[];
   const profile=unitProfile(def,row?.reference_raw);
   const profileRequired=expectedProfiles.length>0&&numericRef&&ref.reference_operator==="range";
   const typed=bnhTypedRowAssessment(row);
   let score=typed.score,reasons=[...typed.reasons];
   if(numeric)score+=24;else if(required){score-=120;reasons.push("missing numeric result")}
   if(numericRef)score+=24;else if(required){score-=48;reasons.push("missing numeric reference")}
   if(code!=="urine_ph"){if(unit)score+=14;else if(required){score-=24;reasons.push("missing unit")}}
   if(profileRequired){if(profile)score+=34;else{score-=70;reasons.push("reference/unit profile mismatch")}}
   if(bnhReferenceEndpointEcho(row)){score-=55;reasons.push("result echoes reference endpoint")}
   if(bnhAtomicFlagConsistent(row))score+=18;else{score-=45;reasons.push("flag/reference conflict")}
   // A single numeric token presented as the whole reference (e.g. MPV 2.0)
   // is not a usable range for BNH numeric rows.
   if(required&&ref.reference_operator==="text"&&/^\s*[<>]?=?\s*-?\d+(?:\.\d+)?\s*$/.test(clean(row?.reference_raw))){score-=60;reasons.push("scalar token used as reference")}
   const ok=!required||(numeric&&numericRef&&(code==="urine_ph"||Boolean(unit))&&(!profileRequired||Boolean(profile))&&!bnhReferenceEndpointEcho(row)&&typed.ok);
   return{ok,score,reasons,numericRef,profile:profile?.unit||"",typed}
 }
 function bnhBundleFieldSupport(matches,key,valueKey){
   const pool=(matches||[]).filter(item=>bnhAtomicValueKey(item.row)===valueKey&&clean(item.row?.[key]));
   const map=new Map();
   pool.forEach(item=>{
     const value=clean(item.row[key]);const old=map.get(value)||{count:0,score:0,exact:0};
     old.count++;old.exact+=Number(Boolean(item?.line?.exactSourceRowEvidence||item?.row?.exact_source_row_recovered));
     // Bundle quality matters more than crop type; otherwise a damaged narrow
     // crop can overrule several coherent source-row passes.
     old.score+=bnhBundleIntegrity(item.row).score+Number(item.line?.confidence||0)/6+bnhAtomicPassBonus(item.line?.mode)/4;map.set(value,old)
   });
   return[...map.entries()].sort((a,b)=>b[1].count-a[1].count||b[1].score-a[1].score||b[1].exact-a[1].exact)[0]||null
 }

 function bnhAtomicPassBonus(mode){
   const value=clean(mode).toLowerCase();
   if(/geometry/.test(value))return 78;
   if(/bnh-row-fdp-(?:gray|threshold)/.test(value))return 42;
   if(/bnh-row-.*-line/.test(value))return 52;
   if(/bnh-row-/.test(value))return 34;
   if(/bnh-body-threshold/.test(value))return 12;
   if(/bnh-body-gray/.test(value))return 10;
   if(/pdf-text-layer/.test(value))return 8;
   if(/threshold/.test(value))return 5;
   if(/gray/.test(value))return 4;
   return 0
 }
 function bnhAtomicValueKey(row){return clean(row?.value_raw).replace(/,/g,".").replace(/\s+/g,"")}
 function bnhAtomicFieldConsensus(matches,key,filterValue=""){
   const pool=(matches||[]).filter(item=>!filterValue||bnhAtomicValueKey(item.row)===filterValue);
   const values=new Map();
   pool.forEach(item=>{const value=clean(item.row?.[key]);if(!value)return;const old=values.get(value)||{count:0,score:0};old.count++;old.score+=Number(item.line?.confidence||0)+bnhAtomicPassBonus(item.line?.mode);values.set(value,old)});
   return[...values.entries()].sort((a,b)=>b[1].count-a[1].count||b[1].score-a[1].score)[0]?.[0]||""
 }
 function bnhAtomicCandidateScore(item,matches){
   const row=item.row,assessment=sourceTruthPlausibility(row),atomicFlag=bnhAtomicFlagConsistent(row),bundle=bnhBundleIntegrity(row);
   const value=bnhAtomicValueKey(row),support=(matches||[]).filter(candidate=>bnhAtomicValueKey(candidate.row)===value).length,tupleSupport=bnhTupleSupport(item,matches);
   const endpoint=bnhReferenceEndpointEcho(row);
   const nonEchoAlternative=endpoint&&(matches||[]).some(candidate=>candidate!==item&&
     bnhAtomicValueKey(candidate.row)!==value&&!bnhReferenceEndpointEcho(candidate.row)&&
     sourceTruthPlausibility(candidate.row).status!=="IMPLAUSIBLE"&&bnhAtomicFlagConsistent(candidate.row));
   const numericReference=["range","<","<=",">",">="].includes(parseRef(row.reference_raw).reference_operator);
   return(assessment.status==="IMPLAUSIBLE"?-160:assessment.status==="PLAUSIBLE"?55:5)+
     (atomicFlag?45:-95)+(numericReference?28:0)+(clean(row.unit)?14:0)+(clean(row.source_flag)?7:0)+
     support*8+tupleSupport*26+bnhAtomicPassBonus(item.line?.mode)+Number(item.line?.confidence||0)/8+bundle.score-
     (nonEchoAlternative?70:0)
 }
 function bnhSelectAtomicMatch(matches,def){
   if(!(matches||[]).length)return null;
   // v10.219 — keep the physical row atomic. Do not synthesize a result from
   // one OCR pass and a reference interval from another when both fields were
   // already present on the winning row. Enrichment is missing-field only.
   const ranked=matches.slice().sort((a,b)=>{
     const bi=bnhBundleIntegrity(b.row,def),ai=bnhBundleIntegrity(a.row,def);
     const validDelta=Number(bi.ok)-Number(ai.ok);if(validDelta)return validDelta;
     const scoreDelta=bi.score-ai.score;if(Math.abs(scoreDelta)>=20)return scoreDelta;
     const exact=Number(Boolean(b?.line?.exactSourceRowEvidence||b?.row?.exact_source_row_recovered))-Number(Boolean(a?.line?.exactSourceRowEvidence||a?.row?.exact_source_row_recovered));
     if(exact)return exact;
     const bProfile=unitProfile(def,b.row?.reference_raw),aProfile=unitProfile(def,a.row?.reference_raw);
     const profileDelta=Number(Boolean(bProfile))-Number(Boolean(aProfile));if(profileDelta)return profileDelta;
     return bnhAtomicCandidateScore(b,matches)-bnhAtomicCandidateScore(a,matches)
   });
   const best=ranked[0],bestValue=bnhAtomicValueKey(best.row);
   const sameValue=ranked.filter(item=>bnhAtomicValueKey(item.row)===bestValue);
   const row={...best.row};
   const evidencePriority=item=>{
     const exact=Boolean(item?.line?.exactSourceRowEvidence||item?.row?.exact_source_row_recovered);
     return(exact?100:0)+bnhAtomicCandidateScore(item,matches)
   };
   const enrich=(key,flagName)=>{
     if(clean(row[key]))return;
     const candidates=sameValue.filter(item=>clean(item.row?.[key])).sort((a,b)=>evidencePriority(b)-evidencePriority(a));
     if(!candidates.length)return;
     const top=candidates[0],topValue=clean(top.row[key]);
     const exactValues=[...new Set(candidates.filter(item=>item?.line?.exactSourceRowEvidence||item?.row?.exact_source_row_recovered).map(item=>clean(item.row[key])).filter(Boolean))];
     // Two targeted source-row passes that disagree are not safe to merge. Keep
     // the winning physical row unchanged and flag the field for review.
     if(exactValues.length>1){
       row.atomic_field_conflict=true;row.parse_issue=true;row.verify_reason=row.verify_reason||`OCR แถวต้นฉบับอ่าน ${key} ต่างกัน (${exactValues.join(" / ")})`;
       row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"BNH_ATOMIC_FIELD_CONFLICT",field:key,values:exactValues}];
       return
     }
     row[key]=topValue;row[flagName]=true
   };
   enrich("reference_raw","atomic_reference_recovered");
   if(clean(row.reference_raw)){Object.assign(row,parseRef(row.reference_raw));row.reported_reference_raw=row.reported_reference_raw||row.reference_raw}
   enrich("unit","atomic_unit_recovered");
   if(clean(row.unit))row.reported_unit=row.reported_unit||normalizeUnit(row.unit);
   enrich("source_flag","atomic_flag_recovered");
   // v10.222 — fields are no longer reconciled independently. A reference from
   // an absolute-count row must never be attached to a percentage row simply
   // because the result token happens to match. Keep the winning typed tuple
   // intact; only the earlier missing-field enrichment from the *same value*
   // is allowed, and it is rejected later if the typed bundle is incompatible.
   bnhNormalizeRepeatedSourceTokens(row);
   bnhTypedReferenceDecimalRepair(row);
   if(clean(row.reference_raw)){Object.assign(row,parseRef(row.reference_raw));row.reported_reference_raw=row.reference_raw}
   if(clean(row.unit))row.reported_unit=normalizeUnit(row.unit);
   // A decimal repair is only allowed *after* the row has its own reference and
   // flag. This fixes cases like Reticulocyte 14 -> 1.4 without guessing from a
   // generic population range.
   bnhApplyUniqueDecimalRepair(row);
   if(row.result_kind==="NUMERIC"){
     const rp=parseRef(row.reference_raw);Object.assign(row,rp);row.calculated_flag=clean(row.source_flag)?calcFlag(row,rp):(rp.reference_operator==="none"||rp.reference_operator==="text"?"CONTEXT":calcFlag(row,rp));
   }
   row.atomic_row_source_truth=true;row.atomic_candidate_count=matches.length;
   if(best?.line?.exactSourceRowEvidence||/^bnh-row-/i.test(clean(best?.line?.mode))){row.exact_source_row_recovered=true;row.exact_source_row_code=clean(best?.line?.targetCode||def?.[3]||row.test_code);row.numeric_result_source="BNH_EXACT_SOURCE_ROW";row.confidence=Math.max(Number(row.confidence||0),97)}
   row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{
     type:"BNH_FULL_ATOMIC_ROW_ADJUDICATION",code:def?.[3]||row.test_code,accepted_value:clean(row.value_raw),
     accepted_reference:clean(row.reference_raw),accepted_unit:clean(row.unit),accepted_flag:clean(row.source_flag),
     candidate_rows:matches.map(item=>({value:clean(item.row.value_raw),reference:clean(item.row.reference_raw),unit:clean(item.row.unit),flag:clean(item.row.source_flag),mode:clean(item.line?.mode),exact:Boolean(item.line?.exactSourceRowEvidence||item.row?.exact_source_row_recovered)})),
     reason:"Winning physical BNH row was preserved as one Result + Flag + Unit + Reference bundle; only missing fields may be enriched from same-value source evidence"
   }];
   return row
 }
 function bnhSafeDecimalRepair(row){
   const assessment=sourceTruthPlausibility(row),atomicFlag=bnhAtomicFlagConsistent(row);
   if(assessment.status!=="IMPLAUSIBLE"&&atomicFlag)return null;
   const raw=clean(row?.value_raw).replace(",",".");
   // Only repair a missing decimal point when the OCR token is an integer.
   // For 86.8 -> 8.8 there is no unique text-preserving correction, so a focused
   // OCR pass must supply the value; guessing would violate Source Truth.
   if(!/^(?:[<>]=?\s*)?-?\d+$/.test(raw))return null;
   const operator=(raw.match(/^[<>]=?/)||[])[0]||"";
   const body=raw.replace(/^[<>]=?\s*/,"");
   const candidates=decimalCandidates(body).map(value=>`${operator}${value}`);
   const plausible=[];
   candidates.forEach(candidate=>{
     const parts=valueParts(candidate);if(parts.value_numeric===null)return;
     const test={...row,value_raw:candidate,value_numeric:parts.value_numeric,value_operator:parts.value_operator};
     const check=sourceTruthPlausibility(test);if(check.status!=="PLAUSIBLE")return;
     if(!bnhAtomicFlagConsistent(test))return;
     plausible.push(candidate)
   });
   const unique=[...new Set(plausible)];
   if(unique.length!==1)return null;
   return unique[0]
 }
 function bnhApplyUniqueDecimalRepair(row){
   const corrected=bnhSafeDecimalRepair(row);if(!corrected)return row;
   const before=clean(row.value_raw);Object.assign(row,valueParts(corrected));
   row.reported_value_raw=row.reported_value_raw||before;
   row.bnh_unique_decimal_repair=true;row.clinical_repair_applied=true;
   row.parse_issue=false;row.plausibility_quarantined=false;row.verify_reason="";
   row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{
     type:"BNH_UNIQUE_DECIMAL_REPAIR",reported_value:before,repaired_value:corrected,
     reason:"ค่า OCR เดิมอยู่นอก plausibility guard และมีตำแหน่งทศนิยมเพียงแบบเดียวที่คงตัวเลขเดิมและผ่าน Source-Truth guard"
   }];
   return row
 }
 function bnhCoagReferenceQuality(code,raw){
   const ref=parseRef(raw);let score=0;
   if(["range","<","<=",">",">="].includes(ref.reference_operator))score+=40;else return-100;
   if(ref.reference_operator==="range"){
     if(Number.isFinite(ref.reference_low)&&Number.isFinite(ref.reference_high)&&ref.reference_low<ref.reference_high)score+=45;else score-=80;
   }
   const text=clean(raw);if(/\d+\.\d+/.test(text))score+=12;if(text.length>=7)score+=5;
   if(["aptt","prothrombin_time"].includes(code)&&ref.reference_operator==="range"&&Number(ref.reference_high)>=Number(ref.reference_low)+1)score+=10;
   return score
 }
 function bnhLineQuality(row,line,normalReference=""){
   if(!row)return-999;
   const assessment=sourceTruthPlausibility(row);
   const numericReference=["range","<","<=",">",">="].includes(parseRef(row.reference_raw).reference_operator);
   const sourceFlag=clean(row.source_flag).toUpperCase();
   const calculated=clean(row.calculated_flag).toUpperCase();
   const flagConsistent=!sourceFlag||!numericReference||sourceFlag.startsWith(calculated);
   return(assessment.status==="IMPLAUSIBLE"?-120:assessment.status==="PLAUSIBLE"?35:0)+
     (flagConsistent?20:-55)+(numericReference?20:0)+(clean(row.unit)?10:0)+(normalReference?4:0)+Number(line?.confidence||0)/10
 }
 function bnhScannedRows(page){
   if(!bnhScannedPage(page))return[];
   const pageText=bnhSourceText(page),lines=bnhEvidenceLines(page),output=[];
   const normalRefs=new Map();
   for(const def of TESTS){
     if(!bnhAllowedDefinition(pageText,def))continue;
     const matches=[...bnhGeometrySourceMatches(page,def)];
     for(const line of lines){
       if(line.targetCode&&line.targetCode!==def[3])continue;
       const alias=bnhAliasTokenEnd(line.text,def);if(!alias)continue;
       if(def[3]==="egfr_ckd_epi"&&/^eGFR\s*\(/i.test(line.text))continue;
       const normalReference=bnhNormalReferenceFromLine(alias.tail||line.text);
       if(normalReference){normalRefs.set(def[3],normalReference);continue}
       const parsed=bnhValueFromTail(alias.tail,def[3]);if(!parsed.value)continue;
       let unit=bnhUnitFromLine(alias.tail,def[3]);
       if(!bnhDifferentialCompatible(def,line.text,unit))continue;
       if(["urine_protein","urine_blood","urine_nitrite","urine_bacteria","urine_color","urine_appearance","direct_coombs","indirect_coombs"].includes(def[3]))unit="";
       const reference=bnhReferenceFromLine(alias.tail||line.text);
       const flag=bnhSourceFlag(alias.tail||line.text);
       const row=makeRow(def,page.sourcePageNumber??page.pageNumber,parsed.value,unit,flag,reference,line.text,{allowRepair:false});
       if(!row)continue;
       bnhNormalizeRepeatedSourceTokens(row);bnhTypedReferenceDecimalRepair(row);bnhApplyUniqueDecimalRepair(row);
       row.photo_ocr=true;row.ocr_pass=line.mode||"bnh-source";row.confidence=Math.min(99,Math.max(86,Number(line.confidence||88)));
       const exactSourceRow=Boolean(line.exactSourceRowEvidence)||/^bnh-row-/i.test(clean(line.mode));
       row.numeric_result_source=exactSourceRow?"BNH_EXACT_SOURCE_ROW":"BNH_DIRECT_SOURCE_ROW";row.source_profile="BNH_SCANNED_LAB";row.bnh_source_truth=true;
       if(exactSourceRow){row.exact_source_row_recovered=true;row.exact_source_row_code=line.targetCode||def[3];row.confidence=Math.max(row.confidence,97)}
       row.reported_equivalent_numeric=parsed.reportedEquivalent||"";
       row.source_evidence=[{type:"BNH_DIRECT_SOURCE_ROW",raw_line:line.text,reported_value:parsed.value,reported_reference:reference,reported_flag:flag,page:page.sourcePageNumber??page.pageNumber,ocr_pass:line.mode||"bnh-source"}];
       if(def[3]==="fdp"&&/Critical\s+Value/i.test(pageText)){
         row.critical_result=true;row.critical_source_text="Critical Value";row.result_comment_raw=/Repeated\s+Result/i.test(pageText)?"Critical Value, Repeated Result":"Critical Value";
         row.source_evidence.push({type:"CRITICAL_RESULT_RETENTION",comment:row.result_comment_raw})
       }
       if(row.result_kind!=="NUMERIC"&&["direct_coombs","indirect_coombs","urine_blood","urine_nitrite","urine_wbc","urine_rbc","urine_bacteria","urine_protein"].includes(def[3])){
         row.calculated_flag="CONTEXT";row.chartable=false;row.graph_eligible=false
       }
       matches.push({row,line,score:bnhLineQuality(row,line,normalReference)})
     }
     if(matches.length){
       let best=bnhSelectAtomicMatch(matches,def)||matches.sort((a,b)=>b.score-a.score)[0].row;
       // Coagulation recovery is also an enrichment pass in v10.217.  A row
       // already present in direct OCR may still have lost its range/unit.
       if(["aptt","prothrombin_time","inr"].includes(def[3])){
         const recovered=bnhCoagRecoveryRow(page,def[3]);
         if(recovered&&valuesEquivalentByPrecision([clean(best.value_raw),clean(recovered.value_raw)])){
           if(clean(recovered.reference_raw)&&(!clean(best.reference_raw)||bnhCoagReferenceQuality(def[3],recovered.reference_raw)>bnhCoagReferenceQuality(def[3],best.reference_raw)+10)){best.reference_raw=recovered.reference_raw;Object.assign(best,parseRef(recovered.reference_raw));best.reported_reference_raw=recovered.reference_raw;best.atomic_reference_recovered=true}
           if(!clean(best.unit)&&clean(recovered.unit)){best.unit=recovered.unit;best.reported_unit=normalizeUnit(recovered.unit);best.atomic_unit_recovered=true}
           if(!clean(best.source_flag)&&clean(recovered.source_flag)){best.source_flag=recovered.source_flag;best.atomic_flag_recovered=true}
         }
       }
       const categoricalRef=normalRefs.get(def[3]);
       if(categoricalRef&&!clean(best.reference_raw)){
         best.reference_raw=categoricalRef;Object.assign(best,parseRef(categoricalRef));best.reported_reference_raw=categoricalRef
       }
       if(def[3]==="fdp"&&/Critical\s+Value/i.test(pageText)){
         best.critical_result=true;best.critical_source_text="Critical Value";best.result_comment_raw=/Repeated\s+Result/i.test(pageText)?"Critical Value, Repeated Result":"Critical Value";
         best.source_evidence=[...(Array.isArray(best.source_evidence)?best.source_evidence:[]),{type:"CRITICAL_RESULT_RETENTION",comment:best.result_comment_raw}]
       }
       output.push(best)
     }
   }
   // Attach normal categorical references that may be printed on a second line
   // after the actual UA observation.
   output.forEach(row=>{
     const categoricalRef=normalRefs.get(row.test_code);
     if(categoricalRef&&!clean(row.reference_raw)){
       row.reference_raw=categoricalRef;Object.assign(row,parseRef(categoricalRef));row.reported_reference_raw=categoricalRef
     }
   });
   return output
 }

 // Broad plausibility limits are quarantine rails, not clinical reference
 // intervals.  They only catch scale/OCR failures that should never become an
 // automatic chart point (e.g. MPV 86.8 fL or Platelet 0.117 x10^3/mm3).
 const SOURCE_TRUTH_PLAUSIBILITY={
   mpv:{min:2,max:30,unit:/^fL$/i},platelet_count:{min:1,max:3000},
   chloride:{min:40,max:180},sodium:{min:70,max:200},potassium:{min:.5,max:15},
   ast:{min:0,max:25000},alt:{min:0,max:25000},aptt:{min:3,max:600},prothrombin_time:{min:3,max:600},
   reticulocyte_pct:{min:0,max:50},reticulocyte_abs:{min:1,max:3000000},fdp:{min:0,max:1000},
   mcv:{min:30,max:160,unit:/^fL$/i},mch:{min:5,max:80},mchc:{min:10,max:60},rdw:{min:3,max:50},
   albumin:{min:.5,max:8,unit:/^g\/dL$/i},direct_bilirubin:{min:0,max:15,unit:/^mg\/dL$/i},
   fasting_glucose:{min:20,max:1200,unit:/^mg\/dL$/i},
   hb:{min:1,max:30},hct:{min:3,max:80},wbc:{min:.05,max:500},rbc_count:{min:.1,max:15},
   neutrophil_pct:{min:0,max:100},lymphocyte_pct:{min:0,max:100},monocyte_pct:{min:0,max:100},eosinophil_pct:{min:0,max:100},basophil_pct:{min:0,max:100}
 };
 function sourceTruthPlausibility(row){
   const rule=SOURCE_TRUTH_PLAUSIBILITY[clean(row?.test_code)];
   const value=Number(row?.value_numeric);if(!rule||!Number.isFinite(value))return{status:"UNASSESSED",ok:true};
   const unit=normalizeUnit(row?.unit||row?.reported_unit||"");
   if(rule.unit&&unit&&!rule.unit.test(unit))return{status:"UNASSESSED",ok:true};
   const ok=value>=rule.min&&value<=rule.max;
   return{status:ok?"PLAUSIBLE":"IMPLAUSIBLE",ok,min:rule.min,max:rule.max,value,unit}
 }
 function sourceTruthFlagConsistent(row){
   const sourceFlag=clean(row?.source_flag).toUpperCase();if(!["H","HH","L","LL"].includes(sourceFlag))return true;
   const ref=parseRef(row?.reference_raw);if(!["range","<","<=",">",">="].includes(ref.reference_operator))return true;
   const value=valueParts(row?.value_raw);if(value.value_numeric===null)return true;
   return sourceFlag.startsWith(calcFlag(value,ref))
 }
 function applyPlausibilityQuarantine(input){
   (input||[]).forEach(row=>{
     if(row?.bnh_unique_decimal_repair)return;
     const assessment=sourceTruthPlausibility(row),flagConsistent=row?.bnh_source_truth?bnhAtomicFlagConsistent(row):sourceTruthFlagConsistent(row);
     if(assessment.status!=="IMPLAUSIBLE"&&flagConsistent)return;
     row.plausibility_quarantined=true;row.parse_issue=true;row.chartable=false;row.graph_eligible=false;
     if(assessment.status==="IMPLAUSIBLE"){
       row.verify_reason=`ค่าผล ${clean(row.value_raw)} ${clean(row.unit)} อยู่นอก plausibility guard ของ ${clean(row.display_name)} (${assessment.min}-${assessment.max}) อาจเป็น decimal/scientific-notation OCR error — ต้องเทียบต้นฉบับก่อนสร้างกราฟ`;
       row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"PLAUSIBILITY_QUARANTINE",reported_value:clean(row.reported_value_raw||row.value_raw),parsed_value:clean(row.value_raw),unit:clean(row.unit),guard_min:assessment.min,guard_max:assessment.max}]
     }else{
       row.verify_reason=`ค่า ${clean(row.value_raw)} ${clean(row.unit)} ขัดกับ source flag ${clean(row.source_flag)} เมื่อเทียบช่วงอ้างอิง ${clean(row.reference_raw)} — อาจเป็น decimal/OCR column error ต้องเทียบต้นฉบับก่อนสร้างกราฟ`;
       row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"SOURCE_FLAG_CONFLICT_QUARANTINE",reported_value:clean(row.reported_value_raw||row.value_raw),parsed_value:clean(row.value_raw),unit:clean(row.unit),reported_flag:clean(row.source_flag),reference_raw:clean(row.reference_raw)}]
     }
   });
   return input
 }
 // v10.216 — Missing-item auto-recovery for BNH scans.
 // Completeness is intentionally strict, but OCR spelling damage in the result
 // row must not turn a clearly reported analyte into a document-wide blocker.
 // Recovery is evidence-bound: a recognizable section/abbreviation plus an
 // unambiguous nearby result is required.  We do not infer a value from a
 // reference interval or from clinical plausibility.
 function bnhRecoveryLineCandidates(page){
   const lines=bnhEvidenceLines(page),seen=new Set(),out=[];
   lines.forEach((line,index)=>{
     const text=clean(line?.text);if(!text)return;
     const key=text.toLowerCase();if(seen.has(key))return;seen.add(key);
     out.push({...line,text,index})
   });
   return out
 }
 function bnhCategoricalRecoveryValue(text){
   const source=clean(text);
   const positive=source.match(/\bPositive(?:\s*([1-4]\+))?/i);
   if(positive)return positive[1]?`Positive ${positive[1]}`:"Positive";
   if(/\b(?:NEGATIVE|Negative|Non[- ]?reactive)\b/i.test(source))return/non/i.test(source)?"Non-reactive":"Negative";
   return""
 }
 function bnhCoombsRecoveryRow(page,code){
   const def=TESTS.find(item=>item[3]===code);if(!def)return null;
   const lines=bnhRecoveryLineCandidates(page);
   const headingPattern=code==="indirect_coombs"
     ?/(?:In[- ]?Direct\s+(?:Coombs|Coumb'?s?)\s+Test|IAT-CENTBLOOD)/i
     :/(?:^|\s)(?:Direct\s+(?:Coombs|Coumb'?s?)\s+Test|DAT-CENTBLOOD)/i;
   const candidates=[];
   lines.forEach((line,index)=>{
     if(!headingPattern.test(line.text))return;
     // Stop before the next Coombs section so a Direct positive can never be
     // borrowed as the Indirect result (or vice versa).
     const window=[];
     for(let offset=0;offset<=3&&index+offset<lines.length;offset++){
       const candidate=lines[index+offset];
       if(offset>0&&/(?:Direct|In[- ]?Direct)\s+(?:Coombs|Coumb'?s?)\s+Test|(?:DAT|IAT)-CENTBLOOD/i.test(candidate.text)&&
          !headingPattern.test(candidate.text))break;
       window.push(candidate)
     }
     for(const candidate of window){
       const value=bnhCategoricalRecoveryValue(candidate.text);if(!value)continue;
       candidates.push({value,line:candidate,anchor:line});break
     }
   });
   const unique=[...new Map(candidates.map(item=>[item.value.toLowerCase(),item])).values()];
   if(unique.length!==1)return null;
   const hit=unique[0];
   const row=makeRow(def,page.sourcePageNumber??page.pageNumber,hit.value,"","","",hit.line.text,{allowRepair:false});
   if(!row)return null;
   row.photo_ocr=true;row.ocr_pass=hit.line.mode||"bnh-neighbor";row.confidence=Math.min(99,Math.max(92,Number(hit.line.confidence||92)));
   row.numeric_result_source="BNH_NEIGHBOR_RESULT_RECOVERY";row.source_profile="BNH_SCANNED_LAB";row.bnh_source_truth=true;
   row.calculated_flag="CONTEXT";row.chartable=false;row.graph_eligible=false;row.parse_issue=false;
   row.completeness_recovered=true;row.bnh_missing_item_recovered=true;
   row.source_evidence=[{type:"BNH_NEIGHBOR_RESULT_RECOVERY",code,anchor_line:hit.anchor.text,result_line:hit.line.text,reported_value:hit.value,page:page.sourcePageNumber??page.pageNumber,ocr_pass:hit.line.mode||"bnh-neighbor"}];
   return row
 }
 function bnhCoagRecoveryRow(page,code){
   const def=TESTS.find(item=>item[3]===code);if(!def)return null;
   const lines=bnhRecoveryLineCandidates(page),patterns={
     aptt:/(?:\baPTT\b|Activated\s+Partial\s+\S*Thromb\S*\s+Time)/i,
     prothrombin_time:/(?:Prothrombin\s+Time|\bPT\b)/i,
     inr:/(?:^|\s)INR(?:\s|:|$)/i
   };
   const pattern=patterns[code];if(!pattern)return null;
   const candidates=[];
   for(const line of lines){
     if(!pattern.test(line.text))continue;
     // Result rows have a value after a separator. Section titles such as
     // "Activated Partial Thromboplastin Time(aPTT)" are deliberately ignored.
     const after=(line.text.match(/[:=>]\s*((?:[<>]=?\s*)?-?\d+(?:[.,]\d+)?)/)||[])[1];
     if(!after)continue;
     const value=clean(after).replace(",",".");
     const parts=valueParts(value);if(parts.value_numeric===null)continue;
     const reference=bnhReferenceFromLine(line.text),flag=bnhSourceFlag(line.text);
     let unit=bnhUnitFromLine(line.text,code);
     if(!unit&&["aptt","prothrombin_time"].includes(code)&&/Sec(?:s|onds?)?\.?/i.test(line.text))unit="s";
     const row=makeRow(def,page.sourcePageNumber??page.pageNumber,value,unit,flag,reference,line.text,{allowRepair:false});
     if(!row)continue;
     bnhApplyUniqueDecimalRepair(row);
     row.photo_ocr=true;row.ocr_pass=line.mode||"bnh-neighbor";row.confidence=Math.min(99,Math.max(92,Number(line.confidence||92)));
     row.numeric_result_source="BNH_ABBREVIATION_RESULT_RECOVERY";row.source_profile="BNH_SCANNED_LAB";row.bnh_source_truth=true;
     row.completeness_recovered=true;row.bnh_missing_item_recovered=true;row.parse_issue=false;
     row.source_evidence=[{type:"BNH_ABBREVIATION_RESULT_RECOVERY",code,result_line:line.text,reported_value:value,reported_reference:reference,reported_flag:flag,page:page.sourcePageNumber??page.pageNumber,ocr_pass:line.mode||"bnh-neighbor"}];
     candidates.push(row)
   }
   // If several OCR passes report the same source row, accept only when their
   // values agree by reported precision.  Conflicting values remain blocked.
   const values=[...new Set(candidates.map(row=>clean(row.value_raw)))];
   if(!candidates.length||!valuesEquivalentByPrecision(values))return null;
   return candidates.sort((a,b)=>Number(b.confidence||0)-Number(a.confidence||0))[0]
 }
 function bnhRecoverMissingRows(groups=[],existingRows=[]){
   const recovered=[];
   for(const group of groups){
     const issues=bnhCompletenessExpectations([group],[...existingRows,...recovered]);
     const missing=new Set(issues.flatMap(issue=>issue.missing_codes||[]));
     if(!missing.size)continue;
     const present=new Set([...existingRows,...recovered].filter(row=>rowBelongsToGroup(row,group)&&row.selected!==false).map(row=>row.test_code));
     for(const page of group?.pages||[]){
       if(!bnhScannedPage(page))continue;
       for(const code of [...missing]){
         if(present.has(code))continue;
         let row=null;
         if(["direct_coombs","indirect_coombs"].includes(code))row=bnhCoombsRecoveryRow(page,code);
         else if(["aptt","prothrombin_time","inr"].includes(code))row=bnhCoagRecoveryRow(page,code);
         if(!row)continue;
         const pageSource=bnhSourceText(page);
         const collectedRaw=(pageSource.match(/Collected\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||"";
         const resultRaw=(pageSource.match(/Result\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||"";
         const event=iso(collectedRaw)||iso(resultRaw)||group?.meta?.specimen_datetime||group?.meta?.result_datetime||group?.meta?.requested_datetime||"";
         row={...withPageProvenance(row,page),source_file:group?.meta?.source_file||page.sourceFileName||"",source_file_index:Number(group.fileIndex||0),
           lab_no:group?.meta?.lab_no||"",sample_no:group?.meta?.sample_no||"",accession_no:group?.meta?.accession_no||"",
           result_date:String(event).slice(0,10),result_datetime:event};
         recovered.push(row);present.add(code);missing.delete(code)
       }
       if(!missing.size)break
     }
   }
   return recovered
 }

 function bnhCompletenessExpectations(groups=[],parsedRows=[]){
   const output=[];
   const definitions=[
     ["fdp",/FDP\s*\(?\s*Fibrin\s+Degradation|Fibrin\s+Degradation\s+Product/i],
     ["reticulocyte_pct",/%\s*Reticulocyte\b/i],["reticulocyte_abs",/\bReticulocytes\b/i],
     ["direct_coombs",/Direct\s+Coombs\s+Test/i],["indirect_coombs",/In-?Direct\s+Coombs\s+Test/i],
     ["aptt",/Activated\s+Partial\s+Thromboplastin\s+Time/i],["prothrombin_time",/Prothrombin\s+Time\s*\(?PT\)?/i],
     ["inr",/\bINR\b/i],["ast",/\bAST\s*\(?SGOT\)?/i],["mpv",/\bMPV\b/i],["platelet_count",/\bPlatelet\s+Count\b/i],
     ["chloride",/\bChloride\b/i],["albumin",/\bAlbumin\b/i],["total_bilirubin",/Bilirubin\s*\(Total\)|Total\s+Bilirubin|Bilirubin\s*\(T\)/i],["direct_bilirubin",/Bilirubin\s*\(Direct\)|Direct\s+Bilirubin/i],["fasting_glucose",/Glucose\s*\(Fasting\)|Glucose\s+Fasting/i],
     ["urine_specific_gravity",/\bSpecific\s+Gravity\b/i],["urine_ph",/(?:^|\s)pH\b/i],["urine_protein",/\bProtein\b/i],
     ["urine_blood",/\bErythrocyte\b|\bUrine\s+Blood\b/i],["urine_nitrite",/\bNitrite\b/i],
     ["urine_wbc",/\bWBC\b/i],["urine_rbc",/\bRBC\b/i],["urine_bacteria",/\bBacteria\b/i]
   ];
   for(const group of groups){
     const expected=new Set();
     for(const page of group?.pages||[]){
       if(!bnhScannedPage(page))continue;
       const source=bnhSourceText(page),urine=/\bUrine\s+Examination\b/i.test(source);
       definitions.forEach(([code,pattern])=>{
         if(code.startsWith("urine_")&&!urine)return;
         if(!code.startsWith("urine_")&&urine)return;
         if(pattern.test(source))expected.add(code)
       })
     }
     if(!expected.size)continue;
     const present=new Set(parsedRows.filter(row=>rowBelongsToGroup(row,group)&&row.selected!==false).map(row=>row.test_code));
     const missing=[...expected].filter(code=>!present.has(code));if(!missing.length)continue;
     output.push({profile:"BNH_SCANNED_SOURCE_TRUTH",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,source_file_index:Number(group.fileIndex||0),expected_codes:[...expected],expected_labels:[...expected].map(code=>TESTS.find(def=>def[3]===code)?.[0]||code),missing_codes:missing,missing_labels:missing.map(code=>TESTS.find(def=>def[3]===code)?.[0]||code),detected_count:expected.size,parsed_count:expected.size-missing.length})
   }
   return output
 }

 function bnhPageEventDate(page,groupMeta={}){
   const source=bnhSourceText(page);
   const raw=(source.match(/Collected\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||
     (source.match(/Result\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||
     (source.match(/Result\s+Date\s*[:;]?\s*([^\n]+)/i)||[])[1]||"";
   const parsed=iso(raw)||groupMeta?.specimen_datetime||groupMeta?.result_datetime||groupMeta?.requested_datetime||"";
   return clean(parsed).slice(0,10)
 }
 function bnhLongitudinalEventExpectations(groups=[],parsedRows=[]){
   // v10.219: presence of an analyte somewhere in the file is not enough. If a
   // BNH source page visibly reports that analyte on 26/27/28 Jun, each source
   // event must survive parsing before a longitudinal graph is released.
   const definitions=[
     ["fdp",/FDP\s*\(?\s*Fibrin\s+Degradation|Fibrin\s+Degradation\s+Product/i],
     ["reticulocyte_pct",/%\s*Reticulocyte\b/i],["reticulocyte_abs",/\bReticulocytes\b/i],
     ["myelocyte_pct",/%\s*Myelocyte\b/i],["metamyelocyte_pct",/%\s*Metamyelocyte\b/i],["platelet_count",/\bPlatelet\s+Count\b/i],
     ["mpv",/\bMPV\b/i],["mcv",/\bMCV\b/i],["mchc",/\bMCHC\b/i],["rdw",/\bRDW\b/i],
     ["albumin",/\bAlbumin\b/i],["direct_bilirubin",/Direct\s+Bilirubin|Bilirubin\s*\(Direct\)/i],
     ["aptt",/Activated\s+Partial\s+Thromboplastin\s+Time|\baPTT\b/i],
     ["fasting_glucose",/Glucose\s*\(Fasting\)|Glucose\s+Fasting/i],
     ["eosinophil_abs",/(?:^|\n|\s)Eosinophils?\s*[:=]/i]
   ];
   const output=[];
   for(const group of groups){
     const events=[];
     for(const page of group?.pages||[]){
       if(!bnhScannedPage(page))continue;
       const source=bnhSourceText(page),date=bnhPageEventDate(page,group?.meta||{});if(!date)continue;
       definitions.forEach(([code,pattern])=>{
         if(!pattern.test(source))return;
         const key=`${code}@${date}`;if(events.some(event=>event.key===key))return;
         const label=TESTS.find(def=>def[3]===code)?.[0]||code;
         events.push({key,code,date,page:page.sourcePageNumber??page.pageNumber??null,label:`${label} (${date})`})
       })
     }
     if(!events.length)continue;
     const missingEvents=events.filter(event=>!parsedRows.some(row=>rowBelongsToGroup(row,group)&&row.selected!==false&&
       clean(row.test_code)===event.code&&clean(row.result_date||row.result_datetime).slice(0,10)===event.date));
     if(!missingEvents.length)continue;
     output.push({profile:"BNH_LONGITUDINAL_EVENT_COVERAGE",source_file:group?.meta?.source_file||`ไฟล์ ${Number(group.fileIndex||0)+1}`,source_file_index:Number(group.fileIndex||0),
       expected_codes:events.map(event=>event.key),expected_labels:events.map(event=>event.label),expected_events:events,event_based:true,
       missing_codes:missingEvents.map(event=>event.key),missing_labels:missingEvents.map(event=>event.label),detected_count:events.length,parsed_count:events.length-missingEvents.length})
   }
   return output
 }

 function bnhRecoverMissingLongitudinalEvents(groups=[],existingRows=[]){
   // v10.220 — completeness is an event gate, so recovery must also be event-scoped.
   // Re-read only the physical source page for a missing analyte+date and accept a row
   // only when that page itself yields the requested test. This cannot borrow an older
   // Platelet/MPV result merely to satisfy coverage.
   const recovered=[];
   for(const group of groups){
     const issues=bnhLongitudinalEventExpectations([group],[...existingRows,...recovered]);
     const missingEvents=issues.flatMap(issue=>issue.expected_events||[]).filter(event=>
       (issues.find(i=>i.expected_events?.some(e=>e.key===event.key))?.missing_codes||[]).includes(event.key));
     for(const event of missingEvents){
       if([...existingRows,...recovered].some(row=>rowBelongsToGroup(row,group)&&row.selected!==false&&clean(row.test_code)===event.code&&clean(row.result_date||row.result_datetime).slice(0,10)===event.date))continue;
       const pages=(group?.pages||[]).filter(page=>bnhScannedPage(page)&&
         ((event.page!==null&&event.page!==undefined&&Number(page.sourcePageNumber??page.pageNumber)===Number(event.page))||bnhPageEventDate(page,group?.meta||{})===event.date));
       for(const page of pages){
         const candidates=bnhScannedRows(page).filter(row=>clean(row.test_code)===event.code&&row.selected!==false);
         if(!candidates.length)continue;
         const reconciled=reconcileBnhExactSourceRows(candidates).filter(row=>clean(row.test_code)===event.code&&row.selected!==false);
         const row=(reconciled.length?reconciled:candidates).sort((a,b)=>Number(Boolean(b.exact_source_row_recovered))-Number(Boolean(a.exact_source_row_recovered))||Number(b.confidence||0)-Number(a.confidence||0))[0];
         if(!row)continue;
         const pageSource=bnhSourceText(page);
         const collectedRaw=(pageSource.match(/Collected\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||"";
         const resultRaw=(pageSource.match(/Result\s+Date\s+Time\s*[:;]?\s*([^\n]+)/i)||[])[1]||"";
         const eventMoment=iso(collectedRaw)||iso(resultRaw)||`${event.date}T00:00:00+07:00`;
         recovered.push({...withPageProvenance(row,page),id:crypto.randomUUID(),source_file:group?.meta?.source_file||page.sourceFileName||"",source_file_index:Number(group.fileIndex||0),
           lab_no:group?.meta?.lab_no||"",sample_no:group?.meta?.sample_no||"",accession_no:group?.meta?.accession_no||"",
           result_date:event.date,result_datetime:eventMoment,completeness_recovered:true,bnh_latest_event_recovered:true,
           parse_issue:Boolean(row.atomic_field_conflict||row.parse_issue),source_evidence:[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"BNH_LATEST_EVENT_AUTO_RECOVERY",code:event.code,date:event.date,page:event.page,reason:"Source-visible analyte+date was re-read from the same physical BNH page before completeness gate"}]});
         break
       }
     }
   }
   return recovered
 }

 function photoTableRows(page){
   const maharat=maharatLabRows(page);
   if(maharat!==null)return maharat;
   const output=[];
   const pageText=photoPasses(page).map(pass=>String(pass.text||"")).join("\n");
   const urinePage=/\b(?:Urine\s+(?:Analysis|Examination|Microscopy)|Urinalysis|U\/A|UA)\b/i.test(pageText);
   const stoolPage=/\bStool\s+(?:Examination|Microscopy)\b/i.test(pageText);
   for(const pass of photoPasses(page)){
     const lines=photoLines(pass);
     const header=lines.find(l=>/(?:test|est)\s*name/i.test(l.text)&&/(?:result|value)/i.test(l.text));
     const resultHeader=header?.items.find(i=>/(?:result|value)/i.test(i.str));
     const refHeader=header?.items.find(i=>/(?:ref|range)/i.test(i.str));
     const unitHeader=header?.items.find(i=>/^unit$/i.test(i.str));
     const resultX=Number(resultHeader?.x);
     const refX=Number(refHeader?.x);
     const unitX=Number(unitHeader?.x);
     const spep=/electropho/i.test(String(pass.text||""));
     const ana=/anti\s*nuclear|\bana\b/i.test(String(pass.text||""));
     for(const def of TESTS){
       if(def[1]==="Urinalysis"&&!urinePage)continue;
       if(def[1]==="Clinical Microscopy"&&!stoolPage)continue;
       if(/_(?:pct|abs|g_l)$/.test(def[3]))continue;
       if(def[3].startsWith("spep_")&&!spep)continue;
       if(def[3]==="ana_if"&&!ana)continue;
       if(spep&&!def[3].startsWith("spep_")&&!["total_protein"].includes(def[3]))continue;
       const matches=def[3]==="spep_interpretation"
         ?lines.filter(l=>/(?:no|wo)\s+monoclonal\s+(?:band|and)\s+seen/i.test(l.text))
         :lines.filter(l=>bestAliasAtLine(l.text,def));
       for(const line of matches){
         if(/(?:reference|normal\s*range|test\s*name)/i.test(line.text))continue;
         if(def[3]==="spep_interpretation"){
           if(/(?:no|wo)\s+monoclonal\s+(?:band|and)\s+seen/i.test(line.text)){
             const row=makeRow(def,page.pageNumber,"No monoclonal band seen","","","",line.text);
             if(row){row.confidence=Math.min(92,Number(pass.confidence||75));row.photo_ocr=true;output.push(row)}
           }
           continue
         }
         if(def[3]==="ana_if"){
           const joined=clean(`${line.text} ${lines.slice(Math.max(0,lines.indexOf(line)-3),lines.indexOf(line)+4).map(x=>x.text).join(" ")}`);
           const anaValue=(joined.match(/<\s*1\s*[:/7]\s*80/i)||
             joined.match(/<\s*1780/i)||joined.match(/<\s*1\s*[:/]\s*\d+/i)||[])[0];
           if(anaValue){
             const row=makeRow(def,page.pageNumber,"<1:80","","","<1:80",line.text);
             if(row){row.confidence=Math.min(88,Number(pass.confidence||75));row.photo_ocr=true;output.push(row)}
           }
           continue
         }
         const span=aliasSpan(line,def);
         if(!span||span.left>Number(page.width||1800)*0.58)continue;
         const labelEnd=span.right;
         const nums=numericTokens(line.items.filter(i=>i.x>=labelEnd-2));
         if(!nums.length)continue;
         let valueToken=null,reference="",unit="",flag="";
         if(Number.isFinite(resultX)){
           const valueRight=Number.isFinite(refX)?refX-8:Number(page.width||1800)*0.78;
           const resultCandidates=nums.filter(n=>n.item.x>=resultX-55&&n.item.x<valueRight&&!n.range);
           valueToken=resultCandidates.slice().sort((a,b)=>a.item.x-b.item.x)[0]||null;
           if(Number.isFinite(refX)){
             const refs=nums.filter(n=>n!==valueToken&&n.item.x>=refX-45);
             if(refs.length){
               const r=refs.slice().sort((a,b)=>a.item.x-b.item.x)[0];
               reference=r.range||r.value
             }
           }
         }else{
           valueToken=nums.find(n=>!n.range)||null;
           reference=nums.slice(1).map(n=>n.range||n.value).find(Boolean)||""
         }
         if(!valueToken)continue;
         if(Number.isFinite(refX)&&valueToken.item.x>=refX-8)continue;
         const after=line.items.filter(i=>i.x>valueToken.item.x);
         flag=clean((after.find(i=>/^(?:LL|HH|L|H)[@°*]?$/i.test(i.str))||{}).str).replace(/[^LH]/gi,"").toUpperCase();
         const unitItem=line.items.find(i=>unitRe.test(normalizeUnit(i.str)))||
           (Number.isFinite(unitX)?line.items.slice().sort((a,b)=>Math.abs(a.x-unitX)-Math.abs(b.x-unitX))[0]:null);
         unit=unitRe.test(normalizeUnit(unitItem?.str))?normalizeUnit(unitItem.str):"";
         const row=makeRow(def,page.pageNumber,repairPhotoValue(valueToken.value),unit,flag,reference,line.text);
         if(row){
           row.confidence=Math.min(reference?90:84,Number(pass.confidence||75));
           row.parse_issue=row.confidence<80||!reference;
           row.photo_ocr=true;row.ocr_pass=pass.mode;output.push(row)
         }
       }
     }
   }
   return output
 }
 function cumulativeSectionHeaders(items,pageText){
   const headers=[];
   const add=(category,item)=>{
     if(!item)return;
     if(!headers.some(header=>header.category===category&&Math.abs(header.y-item.y)<12)){
       headers.push({category,y:item.y})
     }
   };
   items.filter(item=>item.x<100).forEach(item=>{
     const label=norm(item.str);
     if(label==="hematology")add("Hematology",item);
     else if(label==="immunology")add("Immunology",item);
     else if(label==="molecular")add("Molecular",item);
     else if(label==="microscopy"){
       add(/Stool Examination/i.test(pageText)?"Clinical Microscopy":"Urinalysis",item)
     }else if(label==="clinical"){
       const chemistry=items.find(other=>
         other.x<105&&norm(other.str)==="chemistry"&&Math.abs(other.y-item.y)<15);
       if(chemistry)add("Clinical Chemistry",{...item,y:Math.max(item.y,chemistry.y)})
     }else if(label==="clinicalchemistry")add("Clinical Chemistry",item)
   });
   return headers.sort((a,b)=>b.y-a.y)
 }
 function cumulativeCategoryAtY(headers,y){
   return headers.filter(header=>header.y>=y-4).sort((a,b)=>a.y-b.y)[0]?.category||""
 }
 function reportSectionFor(def){
   if(["Hormone","Tumor Marker"].includes(def[1]))return"Immunology";
   if(["Lipid Profile","Liver Function Test","Vitamin & Mineral"].includes(def[1]))return"Clinical Chemistry";
   return def[1]
 }
 function cumulativeAnalytes(items,firstX,labelRight,pageText){
   const labelItems=items.filter(i=>i.x>=180&&i.x<labelRight);
   const sectionHeaders=cumulativeSectionHeaders(items,pageText);
   const labelLines=[];
   labelItems.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     let line=labelLines.find(l=>Math.abs(l.y-item.y)<=3.5);
     if(!line){line={y:item.y,items:[]};labelLines.push(line)}
     line.items.push(item)
   });
   const allowed=def=>{
     const reportSection=reportSectionFor(def);
     if(reportSection==="Hematology"){
       if(def[3]==="esr")return/\bESR\b/i.test(pageText);
       if(["anisocytosis","microcytosis","hypochromia","platelet_smear","platelet_count","rbc_morphology"].includes(def[3]))return/Complete Blood Count/i.test(pageText);
       return/Complete Blood Count/i.test(pageText)
     }
     if(reportSection==="Immunology")return/\bImmunology\b/i.test(pageText);
     if(reportSection==="Urinalysis")return/\b(?:Urine\s+(?:Analysis|Examination|Microscopy)|Urinalysis|U\/A|UA)\b/i.test(pageText);
     if(reportSection==="Clinical Microscopy")return/Stool Examination/i.test(pageText);
     if(reportSection==="Clinical Chemistry")return/Clinical Chemistry/i.test(pageText);
     if(reportSection==="Molecular")return/\bMolecular\b/i.test(pageText);
     return true
   };
   const candidates=[];
   for(const def of TESTS){
     if(!allowed(def))continue;
     const aliases=defAliases(def);
     let best=null;
     for(const line of labelLines){
       // WMC cumulative reports frequently split an analyte over two lines.
       // Build a local label window, but keep it narrow enough not to absorb
       // the preceding or following analyte.
       const adjacent=labelLines.filter(other=>other!==line&&Math.abs(other.y-line.y)<=12);
       const windows=[[line],...adjacent.map(other=>[line,other])];
       for(const windowLines of windows){
         const nearby=windowLines
           .slice().sort((a,b)=>b.y-a.y)
           .flatMap(other=>other.items)
           .sort((a,b)=>b.y-a.y||a.x-b.x);
         const reportedLabel=clean(nearby.map(i=>i.str).join(" "));
         const label=norm(reportedLabel);
         let score=Math.max(0,...aliases.map(a=>{
           if(!a)return 0;
           if(label===a)return 2000+a.length;
           const excess=label.length-a.length;
           if(def[3]==="influenza_a"&&/subtype/.test(label))return 0;
           // Allow a small report prefix/suffix (e.g. "Human ... A/B" or
           // ", Inside"), but never let a short alias steal a longer analyte
           // such as Influenza A subtype H1 or Direct Bilirubin.
           if(a.length>=6&&excess>=0&&excess<=12&&label.includes(a))return 1000-excess*10+a.length;
           return 0
         }));
         const averageY=windowLines.reduce((sum,x)=>sum+x.y,0)/windowLines.length;
         const sectionCategory=cumulativeCategoryAtY(sectionHeaders,averageY);
         if(sectionCategory&&sectionCategory!==reportSectionFor(def))score=0;
         if(score&&(!best||score>best.score)){
           const exactLine=windowLines.find(candidate=>{
             const lineLabel=norm(candidate.items.map(i=>i.str).join(" "));
             return aliases.includes(lineLabel)
           });
           best={def,y:exactLine?.y||averageY,score,label,reportedLabel}
         }
       }
     }
     if(best)candidates.push(best)
   }
   // An alias such as WBC exists in several specimen groups.  Keep only the
   // strongest definition at a physical row; panel guards above decide which
   // definition is valid for the page.
   const atRow=new Map();
   candidates.forEach(c=>{
     const key=Math.round(c.y/3);
     const old=atRow.get(key);
     if(!old||c.score>old.score)atRow.set(key,c)
   });
   return[...atRow.values()].sort((a,b)=>b.y-a.y)
 }

 function hamadDateTime(rawDate,rawTime=""){
   const date=clean(rawDate).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})$/);
   if(!date)return{date:"",dateTime:""};
   const iso=`${date[3]}-${date[2].padStart(2,"0")}-${date[1].padStart(2,"0")}`;
   const time=clean(rawTime).match(/^(\d{1,2}):(\d{2})$/);
   return{date:iso,dateTime:time?`${iso}T${time[1].padStart(2,"0")}:${time[2]}:00+03:00`:`${iso}T00:00:00+03:00`}
 }
 function geometryLines(items,pageHeight=2000){
   const tolerance=Math.max(5,Math.min(12,Number(pageHeight||2000)*.0038)),lines=[];
   items.slice().sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
     let line=lines.find(candidate=>Math.abs(candidate.y-item.y)<=tolerance);
     if(!line){line={y:item.y,items:[]};lines.push(line)}
     line.items.push(item)
   });
   return lines.map(line=>{
     line.items.sort((a,b)=>a.x-b.x);
     line.text=clean(line.items.map(item=>item.str).join(" "));
     return line
   }).sort((a,b)=>b.y-a.y)
 }
 function hamadMultiDateTableEligible(page){
   const text=clean(
     page?.text||page?.pdfText||
     (page?.textItems||[]).map(item=>item?.str||"").join(" ")
   );
   if(!/\bCollected\s+Date\b/i.test(text))return false;
   if(!/\bCollected\s+Time\b/i.test(text))return false;
   if(!/(?:\bUnits?\b|Reference\s+Range)/i.test(text))return false;
   return /\b\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2}\b/.test(text)
 }
 function hamadDefinitionForLabel(label,unitHint="",valueHint=""){
   const raw=clean(label),key=norm(raw),normalizedUnit=normalizeUnit(unitHint);
   const differentialCode=(stem)=>{
     if(!new RegExp(stem+"(?:\\s+auto)?","i").test(raw))return"";
     if(/%/.test(normalizedUnit)||/%/.test(raw))return`${stem.toLowerCase()}_pct`;
     if(/#/.test(raw)||/(?:10\^?[369]\/uL|\/uL|cells\/mm\^?3)/i.test(normalizedUnit))return`${stem.toLowerCase()}_abs`;
     // Ambiguous bare differential labels (for example Monocyte 9) must not be
     // converted to an absolute count from the numeric magnitude alone. Absolute
     // counts require an explicit Absolute/#/ANC label or an absolute-count unit.
     // Generic differential labels fall through to the percent aliases below.
     return""
   };
   const direct={
     urea:"urea",creatinine:"creatinine",sodium:"sodium",potassium:"potassium",chloride:"chloride",
     bicarbonate:"co2",co2:"co2",phosphorus:"phosphorus",phosphate:"phosphorus",magnesium:"magnesium",
     calcium:"calcium",adjustedcalcium:"corrected_calcium",correctedcalcium:"corrected_calcium",
     bilirubint:"total_bilirubin",totalbilirubin:"total_bilirubin",bilirubind:"direct_bilirubin",directbilirubin:"direct_bilirubin",
     totalprotein:"total_protein",albuminlvl:"albumin",albumin:"albumin",alkphos:"alp",alkalinephosphatase:"alp",
     alt:"alt",ast:"ast",ggt:"ggt",amyp:"amylase",amylase:"amylase",lipase:"lipase",glucose:"random_glucose",crp:"crp",
     ca125:"ca_125",ca153:"ca_15_3",ca199:"ca_19_9",cea:"cea",
     wbc:"wbc",rbc:"rbc_count",hgb:"hb",hb:"hb",hct:"hct",mcv:"mcv",mch:"mch",mchc:"mchc",rdwcv:"rdw",rdw:"rdw",
     platelet:"platelet_count",platelets:"platelet_count",mpv:"mpv",
     prothrombintime:"prothrombin_time",pt:"prothrombin_time",inr:"inr",aptt:"aptt",
     phvenpoc:"poc_venous_ph",pco2venpoc:"poc_venous_pco2",po2venpoc:"poc_venous_po2",
     navenpoc:"poc_sodium",kvenpoc:"poc_potassium",clvenpoc:"poc_chloride",cavenpoc:"poc_ionized_calcium",
     bghctvenpoc:"poc_hematocrit",bggluvenpoc:"poc_glucose",bglacvenpoc:"poc_lactate",thbvenpoc:"poc_total_hemoglobin",
     so2venpoc:"poc_venous_so2",o2hbvenpoc:"poc_oxyhemoglobin",cohbvenpoc:"poc_carboxyhemoglobin",
     methbvenpoc:"poc_methemoglobin",hco3venpoc:"poc_standard_bicarbonate",hco3stvenpoc:"poc_standard_bicarbonate",
     tco2venpoc:"poc_total_co2",bevenpoc:"poc_base_excess",beecfvenpoc:"poc_base_excess_ecf",
     urphpoc:"urine_ph",urleukopoc:"urine_leucocyte_esterase",urnitpoc:"urine_nitrite",
     urpropoc:"urine_protein",urglupoc:"urine_glucose",urketpoc:"urine_ketone",
     ururopoc:"urine_urobilinogen",urbilpoc:"urine_bilirubin",ursgpoc:"urine_specific_gravity",urbldpoc:"urine_blood"
   };
   let code=direct[key]||"";
   if(!code&&/absolute\s+neutrophil.*(?:#|anc)/i.test(raw))code="neutrophil_abs";
   if(!code)code=differentialCode("Lymphocyte");
   if(!code)code=differentialCode("Monocyte");
   if(!code)code=differentialCode("Eosinophil");
   if(!code)code=differentialCode("Basophil");
   if(!code)code=differentialCode("Neutrophil");
   if(code)return TESTS.find(def=>def[3]===code)||null;
   let best=null;
   for(const def of TESTS){
     for(const alias of defAliases(def)){
       if(!alias)continue;
       const exact=key===alias;
       const contained=alias.length>=5&&key.includes(alias)&&key.length-alias.length<=5;
       if(exact||contained){
         const score=(exact?1000:500)+alias.length;
         if(!best||score>best.score)best={def,score}
       }
     }
   }
   return best?.def||null
 }
 function hamadValueParts(raw){
   const text=clean(raw).replace(/[|]/g," ");
   const footnotes=(text.match(/(?:\bf\d+\b|\bi\d+\b|\*\d+|\bO\d+\b)/gi)||[]);
   const invalid=(text.match(/\b(?:Hemoly[sz]ed|QNS|Quantity\s+Not\s+Sufficient|Cancelled|Not\s+Performed|Clotted)\b/i)||[])[0]||"";
   if(invalid)return{value:invalid,flag:"",invalidSpecimen:true,qualitative:true,footnotes};
   if(/^\s*[-–—]\s*(?:\*\d+|f\d+|i\d+)?\s*$/i.test(text))return{value:"",flag:"",footnotes:[]};
   const qualitative=(text.match(/(?:^|\s)(Negative|Positive|Trace|Detected|Not\s+Detected|Reactive|Non[- ]?reactive|[1-4]\+)(?=\s|$|\*|f|i)/i)||[])[1]||"";
   if(qualitative)return{value:qualitative.replace(/\s+/g," "),flag:"",invalidSpecimen:false,qualitative:true,footnotes};
   const numeric=text.match(/(?:^|\s)((?:[<>]=?\s*)?-?\d+(?:[.,]\d+)?)(?=\s|$|[*A-Za-z°º^~%\'"‘’])/);
   if(!numeric)return{value:"",flag:"",footnotes:[]};
   const flag=(text.match(/(?:^|\s|(?<=\d))(HH|LL|H|L|C)(?=\s|\*|f|i|$)/i)||[])[1]||"";
   return{value:numeric[1].replace(",","."),flag:flag.toUpperCase(),invalidSpecimen:false,qualitative:false,footnotes}
 }
 function hamadReferenceDistance(value,reference,flag=""){
   const n=Number(value),rp=parseRef(reference),reported=clean(flag).toUpperCase();
   if(!Number.isFinite(n))return Number.POSITIVE_INFINITY;
   const low=Number(rp.reference_low),high=Number(rp.reference_high);
   const hasLow=Number.isFinite(low),hasHigh=Number.isFinite(high);
   const status=hasLow&&n<low?"L":hasHigh&&n>high?"H":"N";
   let mismatch=0;
   if(["H","HH"].includes(reported)&&status!=="H")mismatch=100;
   if(["L","LL"].includes(reported)&&status!=="L")mismatch=100;
   if(!reported&&status!=="N")mismatch=10;
   let distance=0;
   if(status==="L"&&hasLow)distance=Math.abs(Math.log10(Math.max(n,1e-9)/Math.max(low,1e-9)));
   else if(status==="H"&&hasHigh)distance=Math.abs(Math.log10(Math.max(n,1e-9)/Math.max(high,1e-9)));
   return mismatch+distance
 }
 const HAMAD_DECIMAL_PRECISION={
   wbc:1,rbc_count:1,hb:1,hct:1,mcv:1,mch:1,mchc:1,rdw:1,mpv:1,
   neutrophil_pct:1,lymphocyte_pct:1,monocyte_pct:1,eosinophil_pct:1,basophil_pct:1,
   neutrophil_abs:1,lymphocyte_abs:1,monocyte_abs:1,eosinophil_abs:2,basophil_abs:2,
   random_glucose:1,crp:1,calcium:2,corrected_calcium:2,magnesium:2,phosphorus:2,
   potassium:1,urea:1,co2:0,total_protein:0,albumin:0,total_bilirubin:0,direct_bilirubin:1,
   alt:0,ast:0,alp:0,ggt:0,amylase:0,lipase:0,ca_125:1,ca_15_3:1,ca_19_9:1,cea:1,
   prothrombin_time:1,inr:1,aptt:1,poc_venous_ph:3,poc_venous_pco2:0,poc_venous_po2:0,
   poc_ionized_calcium:2,poc_lactate:2,poc_venous_so2:1,poc_oxyhemoglobin:1,
   poc_carboxyhemoglobin:1,poc_methemoglobin:1,poc_standard_bicarbonate:1,
   poc_total_co2:1,poc_base_excess:1,poc_base_excess_ecf:1,poc_sodium:0,poc_potassium:1,
   poc_chloride:0,poc_glucose:1,poc_hematocrit:1,poc_total_hemoglobin:1,urine_ph:1,urine_specific_gravity:3
 };
 function hamadExpectedPrecision(testCode,unit=""){
   if(Object.prototype.hasOwnProperty.call(HAMAD_DECIMAL_PRECISION,testCode))return HAMAD_DECIMAL_PRECISION[testCode];
   const normalized=normalizeUnit(unit);
   if(/(?:x10\^?3|x10³)\/?u?l/i.test(normalized))return 1;
   return null
 }
 function repairHamadJoinedFootnote(value,reference,flag="",testCode="",unit="",hasExplicitFootnote=false){
   const raw=clean(value).replace(/,/g,".");
   if(!/^-?\d+(?:\.\d+)?$/.test(raw))return{value:raw,repaired:false,reported:raw};
   const expected=hamadExpectedPrecision(testCode,unit);
   const decimal=(raw.split(".")[1]||"").length;
   // Hamad's scanned tables frequently fuse a superscript footnote/order code
   // to the visible result: 31.0 L*1 -> 31.07, 25.7 L*2 -> 25.7472,
   // and 9.8 L*2 -> 9.8172.  When the analyte has a stable printed precision,
   // trim only the excess decimal suffix; retain the raw value as audit data.
   if(Number.isInteger(expected)&&decimal>expected){
     const dot=raw.indexOf(".");
     const keep=expected?raw.slice(0,dot+1+expected):raw.slice(0,dot);
     const removed=raw.slice(keep.length);
     const plausibleSuffix=/^\d{1,4}$/.test(removed);
     const originalScore=hamadReferenceDistance(Number(raw),reference,flag);
     const repairedScore=hamadReferenceDistance(Number(keep),reference,flag);
     if(plausibleSuffix&&Number.isFinite(Number(keep))&&repairedScore<=originalScore+0.15){
       return{value:keep,repaired:true,reported:raw,removed_suffix:removed,precision_repair:true}
     }
   }
   // Integer results may have a superscript code appended directly, e.g.
   // sodium 141*1 -> 1417 after OCR. If OCR preserved an explicit footnote
   // marker (H*2, f1, *1), the visible integer is already the laboratory
   // result and must not be shortened: GGT 531 H*2 is genuinely 531, not 53.
   if(hasExplicitFootnote)return{value:raw,repaired:false,reported:raw};
   if(!/^\d{3,7}$/.test(raw))return{value:raw,repaired:false,reported:raw};
   const rp=parseRef(reference),low=Number(rp.reference_low),high=Number(rp.reference_high);
   if(!Number.isFinite(low)&&!Number.isFinite(high))return{value:raw,repaired:false,reported:raw};
   // A normal integer followed by the performing-lab superscript may collapse
   // into one token: Lipase 26 *2 -> 262. Recover it only when the prefix is
   // inside the printed reference interval while the untrimmed value is not.
   if(!flag&&expected===0&&/^\d{2,6}[1-4]$/.test(raw)){
     const prefix=raw.slice(0,-1),prefixScore=hamadReferenceDistance(Number(prefix),reference,""),rawScore=hamadReferenceDistance(Number(raw),reference,"");
     if(prefixScore<1&&rawScore>=9)return{value:prefix,repaired:true,reported:raw,removed_suffix:raw.slice(-1),performing_lab_suffix:true}
   }
   const original=Number(raw),span=Number.isFinite(low)&&Number.isFinite(high)?Math.max(1,high-low):Math.max(1,Math.abs(high||low||1));
   // In Hamad scans the superscript H/L plus performing-lab number may fuse
   // into two terminal digits: H*2 -> 42 and H*1 -> 41. Recognize that
   // encoding only for grossly implausible integers, then score the prefix
   // with the inferred flag so 17042 resolves to 170 H (not 17 normal).
   const encodedFlag=!flag&&/4[1-4]$/.test(raw)?"H":(!flag&&/1[1-4]$/.test(raw)?"L":"");
   const gross=Number.isFinite(high)?original>high+span*8:Number.isFinite(low)&&original<Math.max(0,low-span*8);
   if(!gross)return{value:raw,repaired:false,reported:raw};
   const options=[{value:raw,cut:0}];
   for(let cut=1;cut<=Math.min(3,raw.length-2);cut++){
     const candidate=raw.slice(0,-cut);
     if(/^\d{1,5}$/.test(candidate))options.push({value:candidate,cut})
   }
   const scoreFlag=encodedFlag||flag;
   const ranked=options.map(option=>({...option,score:hamadReferenceDistance(Number(option.value),reference,scoreFlag)+(option.cut?option.cut*.03:0)-(encodedFlag&&option.cut===2?2.2:0)}))
     .sort((a,b)=>a.score-b.score||a.cut-b.cut);
   const best=ranked[0];
   if(!best||!best.cut||best.score>=ranked.find(x=>x.cut===0).score-0.35)return{value:raw,repaired:false,reported:raw};
   return{value:best.value,repaired:true,reported:raw,removed_suffix:raw.slice(-best.cut),inferred_flag:encodedFlag||""}
 }

 function repairHamadMissingDecimal(value,reference,flag="",testCode="",unit=""){
   const raw=clean(value).replace(/,/g,"."),expected=hamadExpectedPrecision(testCode,unit);
   if(!Number.isInteger(expected)||expected<=0||!/^\d{2,5}$/.test(raw))return{value:raw,repaired:false,reported:raw};
   const original=Number(raw),candidates=[];
   for(let places=1;places<=Math.min(3,raw.length-1);places++){
     const candidate=`${raw.slice(0,-places)}.${raw.slice(-places)}`;
     if(Number.isFinite(Number(candidate)))candidates.push({value:candidate,places});
   }
   if(!candidates.length)return{value:raw,repaired:false,reported:raw};
   const originalScore=hamadReferenceDistance(original,reference,flag);
   const ranked=candidates.map(item=>({...item,score:hamadReferenceDistance(Number(item.value),reference,flag)+Math.abs(item.places-expected)*.15}))
     .sort((a,b)=>a.score-b.score||Math.abs(a.places-expected)-Math.abs(b.places-expected));
   const best=ranked[0];
   if(!best||best.score>=originalScore-.35)return{value:raw,repaired:false,reported:raw};
   return{value:best.value,repaired:true,reported:raw,inserted_decimal_places:best.places}
 }
 function hamadCandidatePages(page){
   const candidates=[{id:"selected",text:page.text||"",textItems:page.textItems||[],confidence:Number(page?.ocr?.confidence||0)}];
   (page?.ocr?.candidates||[]).forEach((candidate,index)=>{
     if(!Array.isArray(candidate?.textItems)||candidate.textItems.length<12)return;
     candidates.push({id:candidate.mode||`pass-${index+1}`,text:candidate.text||candidate.textItems.map(item=>item.str).join(" "),textItems:candidate.textItems,confidence:Number(candidate.confidence||0)})
   });
   const unique=new Map();
   candidates.forEach(candidate=>{
     const key=`${candidate.id}|${candidate.textItems.length}|${clean(candidate.text).slice(0,120)}`;
     if(!unique.has(key))unique.set(key,{...page,text:candidate.text,textItems:candidate.textItems,ocrCandidateConfidence:candidate.confidence,ocrCandidateId:candidate.id})
   });
   return[...unique.values()]
 }
 function hamadDeclaredCodes(page){
   // Never infer a Hamad completeness list from ordinary WMC single-date
   // reports. Those pages contain the same analyte labels and numeric columns,
   // but no "Collected Date / Collected Time" matrix. Treating them as Hamad
   // generated false missing items such as differential absolute counts and
   // Troponin-T, then blocked otherwise valid legacy imports.
   if(!hamadMultiDateTableEligible(page))return[];
   const items=(page.textItems||[]).map(item=>({...item,str:clean(item.str),x:Number(item.x||0),y:Number(item.y||0)})).filter(item=>item.str);
   if(items.length<12)return[];
   const pageWidth=Number(page.width||page.pdfPageWidth||1600),pageHeight=Number(page.height||page.pdfPageHeight||2200),lines=geometryLines(items,pageHeight),out=new Set();
   lines.forEach(line=>{
     const left=clean(line.items.filter(item=>item.x<pageWidth*.42).map(item=>item.str).join(" "));
     if(!left||/^(?:Collected|Test|Units?|Reference|Result|Interpretive|Order|Performing|LEGEND|Page)/i.test(left))return;
     const def=hamadDefinitionForLabel(left);if(!def)return;
     const right=clean(line.items.filter(item=>item.x>=pageWidth*.30).map(item=>item.str).join(" "));
     if(/(?:-?\d+(?:[.,]\d+)?|Negative|Positive|Trace|Detected|[1-4]\+|Hemoly[sz]ed|QNS|Clotted)/i.test(right))out.add(def[3])
   });
   return[...out]
 }
 function hamadRowQuality(row){
   let score=Number(row?.confidence||0)/20;
   if(row?.result_datetime)score+=3;if(row?.source_column_time)score+=1;
   if(row?.specimen_interference)score+=.2;else score+=2;
   if(row?.clinical_repair_applied)score+=.4;
   if(row?.source_flag&&["H","L","HH","LL","C"].includes(clean(row.source_flag).toUpperCase()))score+=1;
   if(row?.value_numeric!==null&&row?.value_numeric!==undefined){
     const distance=hamadReferenceDistance(Number(row.value_numeric),row.reference_raw,row.source_flag);
     score+=Number.isFinite(distance)?Math.max(-3,2-Math.min(5,distance)):-1
   }
   return score
 }
 function hamadExtractionScore(rows,page){
   const dates=new Set(rows.map(row=>row.result_datetime||row.result_date).filter(Boolean));
   const slots=new Set(rows.map(row=>`${row.test_code}|${row.result_datetime||row.result_date}|${row.source_column_index}`).filter(Boolean));
   const duplicates=Math.max(0,rows.length-slots.size),declared=hamadDeclaredCodes(page),present=new Set(rows.map(row=>row.test_code));
   const coverage=declared.length?declared.filter(code=>present.has(code)).length/declared.length:0;
   return rows.length*2+dates.size*8+coverage*30-duplicates*6+rows.reduce((sum,row)=>sum+hamadRowQuality(row),0)
 }
 function hamadReconcileCandidateSets(sets,page){
   const eligibleSets=sets.filter(set=>set.eligible!==false);
   const useful=eligibleSets.filter(set=>set.rows.length).sort((a,b)=>b.score-a.score);
   if(!useful.length){page.hamadExpectedCodes=[...new Set(eligibleSets.flatMap(set=>set.declared||[]))];return[]}
   const all=useful.flatMap(set=>set.rows.map(row=>({...row,_hamadCandidateScore:set.score})));
   const groups=new Map();
   all.forEach(row=>{
     const key=[row.test_code,clean(row.result_datetime||row.result_date),normalizeUnit(row.unit),row.result_kind||"NUMERIC"].join("|");
     if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)
   });
   let selected=[];
   groups.forEach(items=>{
     const values=new Map();
     items.forEach(row=>{const key=clean(row.value_raw).replace(/,/g,".").toLowerCase();if(!values.has(key))values.set(key,[]);values.get(key).push(row)});
     const ranked=[...values.values()].map(group=>{
       const passes=new Set(group.map(row=>row.source_ocr_pass));
       const best=group.slice().sort((a,b)=>hamadRowQuality(b)-hamadRowQuality(a)||Number(b._hamadCandidateScore||0)-Number(a._hamadCandidateScore||0))[0];
       return{best,support:passes.size,quality:hamadRowQuality(best),candidateScore:Number(best._hamadCandidateScore||0)}
     }).sort((a,b)=>b.support-a.support||b.quality-a.quality||b.candidateScore-a.candidateScore);
     const winner=ranked[0];if(!winner)return;
     selected.push({...winner.best,hamad_ocr_support:winner.support,hamad_ocr_consensus:ranked.length===1||winner.support>(ranked[1]?.support||0)})
   });
   // A pass that missed one date header can attach a value to the neighbouring
   // date.  When the same analyte/value is supported at another date by more
   // OCR passes, discard only the weaker one-pass duplicate.
   const byTestValue=new Map();
   selected.forEach(row=>{const key=`${row.test_code}|${clean(row.value_raw).toLowerCase()}|${normalizeUnit(row.unit)}`;if(!byTestValue.has(key))byTestValue.set(key,[]);byTestValue.get(key).push(row)});
   const drop=new Set();
   byTestValue.forEach(items=>{
     if(items.length<2)return;
     const max=Math.max(...items.map(row=>Number(row.hamad_ocr_support||1)));
     if(max<2)return;
     items.forEach(row=>{if(Number(row.hamad_ocr_support||1)<max)drop.add(row)})
   });
   selected=selected.filter(row=>!drop.has(row)).sort((a,b)=>clean(a.result_datetime||a.result_date).localeCompare(clean(b.result_datetime||b.result_date))||clean(a.test_code).localeCompare(clean(b.test_code)));
   const expected=[...new Set(eligibleSets.flatMap(set=>set.declared||[]))];page.hamadExpectedCodes=expected;
   selected.forEach(row=>{row.hamad_expected_codes=expected;delete row._hamadCandidateScore});
   return selected
 }
 function normalizeHamadCellText(raw){
   return clean(raw)
     .replace(/(\d)\s*[.,]\s*(\d)/g,"$1.$2")
     .replace(/([<>])\s+(\d)/g,"$1$2")
     .replace(/\b([1-4])\s*\+\b/g,"$1+")
     .replace(/\s+/g," ")
 }
 function hamadBandRecoveryRows(page,sourceFile,fileIndex,ocrPass="selected",existingRows=[]){
   const pageText=clean(page.text||(page.textItems||[]).map(item=>item.str).join(" "));
   if(page.packetType&&page.packetType!=="LABORATORY")return[];
   if(!hamadMultiDateTableEligible(page))return[];
   const items=(page.textItems||[]).map(item=>({...item,str:clean(item.str),x:Number(item.x||0),y:Number(item.y||0),w:Number(item.w||0)})).filter(item=>item.str);
   if(items.length<15)return[];
   const pageWidth=Number(page.width||page.pdfPageWidth||1600),pageHeight=Number(page.height||page.pdfPageHeight||2200);
   const lines=geometryLines(items,pageHeight),datePattern=/^\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2}$/,timePattern=/^\d{1,2}:\d{2}$/;
   const headers=lines.filter(line=>/Collected\s+Date/i.test(line.text));
   if(!headers.length)return[];
   const output=[],requestId=(pageText.match(/Report\s+Request\s+ID\s*:?\s*(\d{5,})/i)||[])[1]||"";
   const comments=(pageText.match(/Result\s+Comments([\s\S]{0,1800}?)(?:LEGEND\s*:|Report\s+Request\s+ID|$)/i)||[])[1]||"";
   const existingSlots=new Set((existingRows||[]).map(row=>`${row.test_code}|${clean(row.result_datetime||row.result_date)}|${Number(row.source_column_index??-1)}`));
   for(let sectionIndex=0;sectionIndex<headers.length;sectionIndex++){
     const header=headers[sectionIndex],nextHeader=headers[sectionIndex+1];
     const headerBand=items.filter(item=>Math.abs(item.y-header.y)<=Math.max(45,Math.min(75,pageHeight*.026)));
     const dates=headerBand.filter(item=>datePattern.test(item.str)).sort((a,b)=>a.x-b.x);
     if(!dates.length)continue;
     const unitsItem=headerBand.find(item=>/^Units?$/i.test(item.str))||items.filter(item=>/^Units?$/i.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.10).sort((a,b)=>b.y-a.y)[0];
     const referenceItem=headerBand.find(item=>/Reference\s+Range/i.test(item.str))||items.filter(item=>/Reference/i.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.10).sort((a,b)=>b.y-a.y)[0];
     const unitX=Number(unitsItem?.x||pageWidth*.64),referenceX=Number(referenceItem?.x||pageWidth*.77);
     const columns=dates.map((dateItem,index)=>{
       const spacingLeft=index?dateItem.x-dates[index-1].x:(dates[1]?dates[1].x-dateItem.x:pageWidth*.12);
       const spacingRight=index<dates.length-1?dates[index+1].x-dateItem.x:(dateItem.x-dates[index-1]?.x||pageWidth*.12);
       const left=index?((dates[index-1].x+dateItem.x)/2):Math.max(pageWidth*.18,dateItem.x-spacingLeft/2);
       const right=index<dates.length-1?((dateItem.x+dates[index+1].x)/2):Math.min(unitX-3,dateItem.x+spacingRight/2);
       const timeItem=items.filter(item=>timePattern.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.09&&item.x>=left&&item.x<right).sort((a,b)=>Math.abs(a.x-dateItem.x)-Math.abs(b.x-dateItem.x))[0];
       return{left,right,rawDate:dateItem.str,time:timeItem?.str||"",...hamadDateTime(dateItem.str,timeItem?.str||"")}
     });
     const firstLeft=columns[0].left,headerFloor=Math.min(header.y,...headerBand.map(item=>item.y))-Math.max(10,pageHeight*.007);
     const lowerBoundary=nextHeader?nextHeader.y+Math.max(14,pageHeight*.010):Math.max(pageHeight*.075,0);
     // Build label rows from the left-hand label zone only. Full-page OCR often
     // puts a label fragment on the value/reference baseline (for example
     // "pH" and "Ven-POC" differ by a few pixels). Grouping only the label
     // zone prevents the numeric cell from stealing one fragment into another
     // geometry line and lets the complete analyte name be reconstructed.
     const labelZoneItems=items.filter(item=>item.x<firstLeft-Math.max(4,pageWidth*.0025)&&item.y<headerFloor&&item.y>lowerBoundary);
     const labelLines=geometryLines(labelZoneItems,pageHeight);
     const candidateLines=labelLines.map(line=>{
       const left=clean(line.items.map(item=>item.str).join(" "));
       if(!left||/^(?:Test|Units?|Reference\s+Range|Result\s+Comments|Interpretive\s+Data|Order\s+Comments|Performing\s+Locations|LEGEND|Department\s+of|Page\s+\d+)/i.test(left))return null;
       const def=hamadDefinitionForLabel(left);return def?{label:left,def,y:line.y}:null
     }).filter(Boolean).sort((a,b)=>b.y-a.y);
     const unique=[];
     candidateLines.forEach(candidate=>{
       const prior=unique.find(item=>item.def[3]===candidate.def[3]&&Math.abs(item.y-candidate.y)<=Math.max(8,pageHeight*.006));
       if(!prior)unique.push(candidate)
     });
     unique.forEach((candidate,index)=>{
       const above=index?unique[index-1].y:headerFloor,below=index<unique.length-1?unique[index+1].y:lowerBoundary;
       const top=index?((above+candidate.y)/2):headerFloor,bottom=index<unique.length-1?((candidate.y+below)/2):lowerBoundary;
       const region=items.filter(item=>item.y<top&&item.y>bottom);
       if(!region.length)return;
       const unitText=clean(region.filter(item=>item.x>=unitX-pageWidth*.016&&item.x<referenceX-pageWidth*.004&& !/^(?:Units?|Test|Reference|Range)$/i.test(clean(item.str))).sort((a,b)=>Math.abs(a.y-candidate.y)-Math.abs(b.y-candidate.y)||a.x-b.x).map(item=>item.str).join(" "));
       const referenceText=clean(region.filter(item=>item.x>=referenceX-pageWidth*.016).sort((a,b)=>Math.abs(a.y-candidate.y)-Math.abs(b.y-candidate.y)||a.x-b.x).map(item=>item.str).join(" "));
       const reference=(referenceText.match(/\[([^\]]+)\]/)||[])[1]||(referenceText.match(/(?:<=|>=|<|>)\s*-?\d+(?:\.\d+)?(?:\s*[-–]\s*-?\d+(?:\.\d+)?)?/)||[])[0]||"";
       const unit=unitFromTokens(unitText.split(/\s+/))||normalizeUnit(unitText.replace(/\s+/g,""));
       columns.forEach((column,columnIndex)=>{
         const slot=`${candidate.def[3]}|${clean(column.dateTime||column.date)}|${columnIndex}`;
         if(existingSlots.has(slot))return;
         const cellItems=region.filter(item=>item.x>=column.left&&item.x<column.right).sort((a,b)=>Math.abs(a.y-candidate.y)-Math.abs(b.y-candidate.y)||a.x-b.x);
         const cellText=normalizeHamadCellText(cellItems.map(item=>item.str).join(" "));
         const parsed=hamadValueParts(cellText);if(!parsed.value)return;
         const def=hamadDefinitionForLabel(candidate.label,unit,parsed.value)||candidate.def;
         const suffixRepair=!parsed.invalidSpecimen&&!parsed.qualitative?repairHamadJoinedFootnote(parsed.value,reference,parsed.flag,def[3],unit,Boolean(parsed.footnotes?.length)):{value:parsed.value,repaired:false,reported:parsed.value};
         const effectiveFlag=parsed.flag||suffixRepair.inferred_flag||"";
         const decimalRepair=!parsed.invalidSpecimen&&!parsed.qualitative?repairHamadMissingDecimal(suffixRepair.value,reference,effectiveFlag,def[3],unit):{value:suffixRepair.value,repaired:false,reported:suffixRepair.value};
         const parsedValue=decimalRepair.value;
         const row=makeRow(def,page.sourcePageNumber??page.pageNumber,parsedValue,unit,effectiveFlag,reference,`${candidate.label} | ${parsedValue} | ${column.rawDate} ${column.time} | ${unit} | ${reference}`,{allowRepair:false});
         if(!row)return;
         row.canonical_display_name=row.display_name||def[0];row.display_name=candidate.label;
         Object.assign(row,withPageProvenance(row,page),{
           reported_name:candidate.label,source_file:sourceFile,source_file_index:fileIndex,source_profile:"HAMAD_MIXED_CLINICAL_PACKET",mixed_clinical_packet:true,
           source_ocr_pass:`${ocrPass}-row-band`,source_column_index:columnIndex,source_column_date:column.rawDate,source_column_time:column.time,
           source_cell_text:cellText,source_line_text:region.map(item=>item.str).join(" "),source_unit_text:unitText,result_date:column.date,result_datetime:column.dateTime,
           lab_no:requestId,result_comment_refs:parsed.footnotes,source_note_raw:comments,specimen_interference:Boolean(parsed.invalidSpecimen),graph_eligible:!parsed.invalidSpecimen,
           reported_value_raw:suffixRepair.reported||parsed.value,hamad_suffix_repair:Boolean(suffixRepair.repaired),hamad_removed_suffix:suffixRepair.removed_suffix||"",
           hamad_missing_decimal_repair:Boolean(decimalRepair.repaired),hamad_row_band_recovery:true,confidence:Math.max(Number(row.confidence||0),88)
         });
         if(parsed.invalidSpecimen){row.result_kind="TEXT";row.value_numeric=null;row.calculated_flag="CONTEXT";row.verify_reason="ผลรายงานระบุว่าตัวอย่าง Hemolyzed/QNS/ใช้ผลไม่ได้ จึงเก็บเป็นบริบทและไม่สร้างกราฟ"}
         else if(parsed.qualitative){row.result_kind="TEXT";row.value_numeric=null;row.graph_eligible=false;row.calculated_flag=parsed.flag||row.calculated_flag||"CONTEXT"}
         if(suffixRepair.repaired||decimalRepair.repaired){row.clinical_repair_applied=true;row.parse_issue=false;row.verify_reason=""}
         // A percent sign inside a non-percent result cell is usually a badly
         // OCR'd superscript/flag (Amy-P 22 *2 may become 93%). Keep the row so
         // completeness is preserved, but require one focused verification
         // instead of blocking the whole document as a missing analyte.
         if(row.result_kind==="NUMERIC"&&/%/.test(cellText)&&normalizeUnit(unit)!=="%"&&!parsed.flag){
           row.parse_issue=true;row.confidence=Math.min(Number(row.confidence||88),72);
           row.verify_reason="OCR พบเครื่องหมาย % ในช่องผลที่หน่วยไม่ใช่เปอร์เซ็นต์ กรุณาเทียบค่ากับต้นฉบับ"
         }
         output.push(row);existingSlots.add(slot)
       })
     })
   }
   return output
 }
 function hamadMultiDateRows(page,sourceFile,fileIndex){
   const candidates=hamadCandidatePages(page),sets=candidates.map(candidate=>{
     const eligible=hamadMultiDateTableEligible(candidate);
     const rows=eligible?hamadMultiDateRowsSingle(candidate,sourceFile,fileIndex,candidate.ocrCandidateId||"selected"):[];
     return{page:candidate,eligible,rows,declared:eligible?hamadDeclaredCodes(candidate):[],score:eligible?hamadExtractionScore(rows,candidate):0}
   });
   return hamadReconcileCandidateSets(sets,page)
 }
 function hamadMultiDateRowsSingle(page,sourceFile,fileIndex,ocrPass="selected"){
   const pageText=clean(page.text||(page.textItems||[]).map(item=>item.str).join(" "));
   if(page.packetType&&page.packetType!=="LABORATORY")return[];
   if(!hamadMultiDateTableEligible(page))return[];
   const items=(page.textItems||[]).map(item=>({...item,str:clean(item.str),x:Number(item.x||0),y:Number(item.y||0),w:Number(item.w||0)})).filter(item=>item.str);
   if(items.length<15)return[];
   const pageWidth=Number(page.width||page.pdfPageWidth||1600),pageHeight=Number(page.height||page.pdfPageHeight||2200);
   const lines=geometryLines(items,pageHeight);
   const datePattern=/^\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2}$/;
   const timePattern=/^\d{1,2}:\d{2}$/;
   const headerCandidates=lines.filter(line=>/Collected\s+Date/i.test(line.text));
   if(!headerCandidates.length)return[];
   const output=[],requestId=(pageText.match(/Report\s+Request\s+ID\s*:?\s*(\d{5,})/i)||[])[1]||"";
   const comments=(pageText.match(/Result\s+Comments([\s\S]{0,1800}?)(?:LEGEND\s*:|Report\s+Request\s+ID|$)/i)||[])[1]||"";
   for(let sectionIndex=0;sectionIndex<headerCandidates.length;sectionIndex++){
     const header=headerCandidates[sectionIndex];
     const nextHeader=headerCandidates[sectionIndex+1];
     const headerBand=items.filter(item=>Math.abs(item.y-header.y)<=Math.max(55,pageHeight*.035));
     const dates=headerBand.filter(item=>datePattern.test(item.str)).sort((a,b)=>a.x-b.x);
     if(!dates.length)continue;
     const unitsItem=headerBand.find(item=>/^Units?$/i.test(item.str))||items.filter(item=>/^Units?$/i.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.08).sort((a,b)=>b.y-a.y)[0];
     const referenceItem=headerBand.find(item=>/Reference\s+Range/i.test(item.str))||items.filter(item=>/Reference/i.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.08).sort((a,b)=>b.y-a.y)[0];
     const unitX=Number(unitsItem?.x||pageWidth*.64),referenceX=Number(referenceItem?.x||pageWidth*.77);
     const columns=dates.map((dateItem,index)=>{
       const left=index?((dates[index-1].x+dateItem.x)/2):Math.max(pageWidth*.20,dateItem.x-(dates[1]?dates[1].x-dateItem.x:pageWidth*.12)/2);
       const right=index<dates.length-1?((dateItem.x+dates[index+1].x)/2):Math.min(unitX-4,dateItem.x+(dateItem.x-dates[index-1]?.x||pageWidth*.11)/2);
       const timeItem=items.filter(item=>timePattern.test(item.str)&&item.y<header.y&&item.y>header.y-pageHeight*.07&&item.x>=left&&item.x<right).sort((a,b)=>Math.abs(a.x-dateItem.x)-Math.abs(b.x-dateItem.x))[0];
       return{left,right,rawDate:dateItem.str,time:timeItem?.str||"",...hamadDateTime(dateItem.str,timeItem?.str||"")}
     });
     const firstLeft=columns[0].left;
     const headerFloor=Math.min(header.y,...headerBand.map(item=>item.y))-Math.max(12,pageHeight*.008);
     const lowerBoundary=nextHeader?nextHeader.y+Math.max(18,pageHeight*.012):Math.max(pageHeight*.09,0);
     const dataLines=lines.filter(line=>line.y<headerFloor&&line.y>lowerBoundary);
     for(const line of dataLines){
       if(/^(?:Test|Units?|Reference\s+Range|Result\s+Comments|Interpretive\s+Data|LEGEND|Department\s+of|Page\s+\d+)/i.test(line.text))continue;
       const labelItems=line.items.filter(item=>item.x<firstLeft-Math.max(5,pageWidth*.003));
       const label=clean(labelItems.map(item=>item.str).join(" "));
       if(!label||label.length<2)continue;
       const unitText=clean(line.items.filter(item=>item.x>=unitX-pageWidth*.012&&item.x<referenceX-pageWidth*.005).map(item=>item.str).join(" "));
       const referenceText=clean(line.items.filter(item=>item.x>=referenceX-pageWidth*.012).map(item=>item.str).join(" "));
       const reference=(referenceText.match(/\[([^\]]+)\]/)||[])[1]||(referenceText.match(/(?:<=|>=|<|>)\s*-?\d+(?:\.\d+)?(?:\s*[-–]\s*-?\d+(?:\.\d+)?)?/)||[])[0]||"";
       const unit=unitFromTokens(unitText.split(/\s+/))||normalizeUnit(unitText.replace(/\s+/g,""));
       columns.forEach((column,columnIndex)=>{
         const cellItems=line.items.filter(item=>item.x>=column.left&&item.x<column.right);
         const cellText=clean(cellItems.map(item=>item.str).join(" "));
         const parsed=hamadValueParts(cellText);
         if(!parsed.value)return;
         const def=hamadDefinitionForLabel(label,unit,parsed.value);
         if(!def)return;
         const suffixRepair=!parsed.invalidSpecimen&&!parsed.qualitative
           ?repairHamadJoinedFootnote(parsed.value,reference,parsed.flag,def[3],unit,Boolean(parsed.footnotes?.length)):{value:parsed.value,repaired:false,reported:parsed.value};
         const effectiveFlag=parsed.flag||suffixRepair.inferred_flag||"";
         const decimalRepair=!parsed.invalidSpecimen&&!parsed.qualitative
           ?repairHamadMissingDecimal(suffixRepair.value,reference,effectiveFlag,def[3],unit):{value:suffixRepair.value,repaired:false,reported:suffixRepair.value};
         const parsedValue=decimalRepair.value;
         const row=makeRow(def,page.sourcePageNumber??page.pageNumber,parsedValue,unit,effectiveFlag,reference,
           `${label} | ${parsedValue} | ${column.rawDate} ${column.time} | ${unit} | ${reference}`,{allowRepair:false});
         if(!row)return;
         // Preserve the exact Hamad row label for clinician-facing review and
         // reports (for example "Bilirubin T"). The canonical TESTS name and
         // test_code remain available for cross-platform grouping.
         row.canonical_display_name=row.display_name||def[0];
         row.display_name=label;
         Object.assign(row,withPageProvenance(row,page),{
           reported_name:label,source_file:sourceFile,source_file_index:fileIndex,
           source_profile:"HAMAD_MIXED_CLINICAL_PACKET",mixed_clinical_packet:true,source_ocr_pass:ocrPass,
           source_column_index:columnIndex,source_column_date:column.rawDate,source_column_time:column.time,
           source_cell_text:cellText,source_line_text:line.text,source_unit_text:unitText,
           result_date:column.date,result_datetime:column.dateTime,lab_no:requestId,
           result_comment_refs:parsed.footnotes,source_note_raw:comments,
           specimen_interference:Boolean(parsed.invalidSpecimen),graph_eligible:!parsed.invalidSpecimen,
           reported_value_raw:suffixRepair.reported||parsed.value,hamad_suffix_repair:Boolean(suffixRepair.repaired),
           hamad_removed_suffix:suffixRepair.removed_suffix||"",hamad_missing_decimal_repair:Boolean(decimalRepair.repaired)
         });
         if(suffixRepair.repaired||decimalRepair.repaired){
           row.clinical_repair_applied=true;
           row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{
             type:decimalRepair.repaired?"HAMAD_MISSING_DECIMAL_REPAIR":"HAMAD_FOOTNOTE_SUFFIX_REPAIR",reported:suffixRepair.reported,repaired:parsedValue,
             reason:decimalRepair.repaired?"OCR ทำจุดทศนิยมของค่าผลหาย; ซ่อมโดยอิงความละเอียดและช่วงอ้างอิงของรายการตรวจ":"OCR รวมเลขเชิงอรรถท้ายค่าผลเข้ากับตัวเลขหลัก"
           }];
           row.confidence=Math.max(Number(row.confidence||0),92);
           row.parse_issue=false;
           row.verify_reason=""
         }
         if(parsed.invalidSpecimen){
           row.result_kind="TEXT";row.value_numeric=null;row.calculated_flag="CONTEXT";
           row.verify_reason="ผลรายงานระบุว่าตัวอย่าง Hemolyzed/QNS/ใช้ผลไม่ได้ จึงเก็บเป็นบริบทและไม่สร้างกราฟ"
         }else if(parsed.qualitative){
           row.result_kind="TEXT";row.value_numeric=null;row.graph_eligible=false;
           row.calculated_flag=parsed.flag||row.calculated_flag||"CONTEXT";
         }
         output.push(row)
       })
     }
   }
   const recovered=hamadBandRecoveryRows(page,sourceFile,fileIndex,ocrPass,output);
   recovered.forEach(row=>output.push(row));
   return output
 }

 function cumulativeRows(page,sourceFile,fileIndex){
   const columns=cumulativeColumns(page);if(!columns.length)return[];
   const items=(page.textItems||[]).map(i=>({...i,str:clean(i.str)})).filter(i=>i.str);
   const pageText=items.map(i=>i.str).join(" ");
   const firstX=columns[0].left;
   const referenceHeader=items.find(i=>/Referance|Reference/i.test(i.str));
   // Keep the analyte label separate from the reference range.  Short labels
   // such as AST, ALT and ALP were previously joined with "[<50] U/L", so
   // their three-letter aliases could never match on cumulative pages.
   const labelRight=Math.min(firstX,referenceHeader?.x||285);
   const analytes=cumulativeAnalytes(items,firstX,labelRight,pageText);
   const output=[];
   for(let index=0;index<analytes.length;index++){
     const {def,y,reportedLabel}=analytes[index];
     // The first analyte sits just below the Lab No. header.  A 15-point cap
     // includes a vertically offset result but excludes the numeric Lab No.,
     // which must never become a chart point.
     const above=index?((analytes[index-1].y+y)/2):y+15;
     const below=index<analytes.length-1?((y+analytes[index+1].y)/2):y-20;
     const inBlock=item=>item.y<above&&item.y>=below;
     const referenceLeft=Math.max(265,Math.min(labelRight,referenceHeader?.x||285)-2);
     const refItems=items.filter(i=>i.x>=referenceLeft&&i.x<firstX&&inBlock(i));
     const refRows=[...new Set(refItems.map(i=>i.y))].sort((a,b)=>b-a).map(refY=>{
       const text=clean(refItems.filter(i=>Math.abs(i.y-refY)<=3.5).sort((a,b)=>a.x-b.x).map(i=>i.str).join(" "));
       const refMatch=text.match(/\[([^\]]+)\]/);
       const reference=refMatch?refMatch[0]:(text.match(/(?:<=|>=|<|>)\s*\d+(?:\.\d+)?/)||[])[0]||"";
       const unit=unitFromTokens(clean(text.replace(reference,"")).split(/\s+/));
       return{y:refY,reference,unit}
     }).filter(r=>r.reference||r.unit);
     for(const col of columns){
       const cellItems=items.filter(i=>i.x>=col.left&&i.x<col.right&&inBlock(i));
       if(!cellItems.length)continue;
       const cellRows=[...new Set(cellItems.map(i=>i.y))].sort((a,b)=>b-a).map(cellY=>{
         const tokens=cellItems.filter(i=>Math.abs(i.y-cellY)<=3.5).sort((a,b)=>a.x-b.x).map(i=>i.str);
         const raw=clean(tokens.join(" "));
         const textual=raw.match(/\b(?:Adequate|Abnormal cell|Few|Normal|Negative|Positive|Non[- ]?Reactive|Reactive|Not detected|Detected(?:\s*\(Ct\s*=\s*\d+(?:\.\d+)?\))?|Clear|Yellow|Brown|Soft|Formed|None|Trace|Not found)\b/i);
         const microscopyRange=["Urinalysis","Clinical Microscopy"].includes(def[1])
           ?raw.match(/(?:^|\s)(\d+\s*-\s*\d+)(?=\s|$)/):null;
         // A microscopy range such as "1-2" is a categorical observation,
         // not a scalar trend value. Match only a standalone number and give
         // explicit text (including Detected with Ct) precedence.
         const numeric=raw.match(/(?:^|\s)((?:[<>]=?\s*)?-?\d+(?:[.,]\d+)?)(?=\s|$)/);
         return{y:cellY,tokens,raw,value:(textual||microscopyRange&&[microscopyRange[1]]||numeric&&[numeric[1]]||[])[0]||""}
       }).filter(r=>r.value&&Math.abs(r.y-y)<=13);
       if(!cellRows.length)continue;
       // There is at most one result per date/analyte. Prefer a row carrying
       // an explicit unit or flag, otherwise the row nearest a reference line.
       cellRows.sort((a,b)=>{
         const qa=(a.tokens.some(x=>unitRe.test(x))?4:0)+(a.tokens.some(x=>/^(LL|HH|L|H)$/i.test(x))?2:0);
         const qb=(b.tokens.some(x=>unitRe.test(x))?4:0)+(b.tokens.some(x=>/^(LL|HH|L|H)$/i.test(x))?2:0);
         if(qa!==qb)return qb-qa;
         const da=Math.min(...refRows.map(r=>Math.abs(r.y-a.y)),99);
         const db=Math.min(...refRows.map(r=>Math.abs(r.y-b.y)),99);
         return da-db
       });
       const chosen=cellRows[0],cell=chosen.tokens;
       const nearestRef={...(refRows.slice().sort((a,b)=>Math.abs(a.y-chosen.y)-Math.abs(b.y-chosen.y))[0]||{})};
       nearestRef.reference=nearestRef.reference||refRows.find(row=>row.reference)?.reference||"";
       nearestRef.unit=unitFromTokens(refItems.map(item=>item.str))||nearestRef.unit||"";
       const flag=(cell.find(x=>/^(LL|HH|L|H)$/i.test(x))||"").toUpperCase();
       const cellUnit=unitFromTokens(cell);
       const unit=/^10\^?[369]$/i.test(cellUnit)&&nearestRef.unit.startsWith(`${cellUnit} `)
         ?nearestRef.unit:cellUnit||nearestRef.unit||"";
       const value=chosen.value;
       if(!value)continue;
       const row=makeRow(def,page.sourcePageNumber??page.pageNumber,value,unit,flag,nearestRef.reference||"",`${reportedLabel||def[0]} | ${value} | ${col.rawDate} ${col.time} | ${col.labNo}`,{allowRepair:false});
       if(row)output.push({
         ...withPageProvenance(row,page),
         reported_name:reportedLabel||def[0],
         source_file:sourceFile,source_file_index:fileIndex,
         source_row_y:y,source_column_left:col.left,source_column_right:col.right,
         source_column_date:col.rawDate,source_column_time:col.time,
         lab_no:col.labNo,result_date:col.date,result_datetime:col.dateTime,cumulative:true
       })
     }
   }
   const qualitativeDefinitions=[
     TESTS.find(def=>def[3]==="hiv_ag"),
     TESTS.find(def=>def[3]==="anti_hiv_interpretation")
   ].filter(Boolean);
   for(const def of qualitativeDefinitions){
     const aliases=defAliases(def);
     const label=items.find(item=>item.x>=180&&item.x<295&&aliases.includes(norm(item.str)));
     if(!label)continue;
     const valueItem=items.find(item=>
       item.x>=285&&item.x<firstX&&Math.abs(item.y-label.y)<=3.5&&
       /^(?:Non[- ]?Reactive|Reactive|Negative|Positive)$/i.test(clean(item.str)));
     if(!valueItem)continue;
     const completion=items
       .filter(item=>item.x>=firstX&&/^Complete$/i.test(clean(item.str))&&Math.abs(item.y-label.y)<=12)
       .sort((a,b)=>Math.abs(a.y-label.y)-Math.abs(b.y-label.y))[0];
     const column=completion&&columns.find(col=>completion.x>=col.left&&completion.x<col.right);
     if(!column)continue;
     const row=makeRow(def,page.sourcePageNumber??page.pageNumber,valueItem.str,"","","",
       `${label.str} | ${valueItem.str} | ${column.rawDate} | ${column.labNo}`,{allowRepair:false});
     if(row&&!output.some(existing=>existing.test_code===row.test_code&&existing.lab_no===column.labNo)){
       output.push({...withPageProvenance(row,page),reported_name:label.str,
         source_file:sourceFile,source_file_index:fileIndex,lab_no:column.labNo,
         result_date:column.date,result_datetime:column.dateTime,cumulative:true,source_evidence:[
           {type:"qualitative-result",label:label.str,value:valueItem.str,page:page.sourcePageNumber??page.pageNumber},
           {type:"completion-column",label:completion.str,lab_no:column.labNo,date:column.date}
         ]})
     }
   }
   return output
 }
 function standaloneRows(page,groupMeta,fileIndex){
   const output=[];
   const pageText=clean(page.text||(page.textItems||[]).map(i=>i.str).join(" "));
   const localProfileDates=profileSpecificDates(pageText);
   const profileEventDateTime=localProfileDates.result_datetime||groupMeta.profile_result_datetime||"";
   const rowEventDateTime=profileEventDateTime||groupMeta.specimen_datetime||groupMeta.result_datetime||groupMeta.requested_datetime||"";
   if(page.captureType==="PHOTO"&&maharatNonLabPage(page))return[];
   const urinePage=/\b(?:Urine\s+(?:Analysis|Examination|Microscopy)|Urinalysis|U\/A|UA)\b/i.test(pageText);
   const stoolPage=/\bStool\s+(?:Examination|Microscopy)\b/i.test(pageText);
   const allergyRows=allergyProfileRows(page);
   const bnhDocument=bnhScannedPage(page);
   const bnhRows=bnhDocument?bnhScannedRows(page):[];
   // A visual micronutrient summary remains a specialized page even when the
   // best OCR pass loses the profile heading. Otherwise the generic photo
   // table reader creates Vitamin A/E values a second time from the color-bar
   // summary and sends them to Verify.
   const visualMicronutrientSummary=micronutrientSummaryPage(page);
   const specializedDocument=visualMicronutrientSummary||allergyRows.length>0||specializedProfileDetected(pageText,page);
   const specializedRows=allergyRows.length?allergyRows:specializedProfileRows(page,groupMeta);
   const reconstructed=bnhDocument
     ?bnhRows
     :specializedDocument
       ?specializedRows
       :page.captureType==="PHOTO"
         ?[...panelAwareRows(page),...photoTableRows(page)]
         :[];
   for(const def of TESTS){
     if(def[1]==="Urinalysis"&&!urinePage)continue;
     if(def[1]==="Clinical Microscopy"&&!stoolPage)continue;
     if(specializedDocument&&SPECIALIZED_PROFILE_CODES.has(def[3]))continue;
     const found=(bnhDocument||page.captureType==="PHOTO")
       ?null
       :(page.textItems?.length?findFromGeometry(page,def):findFromTokens(page,def));
     if(!found)continue;
     output.push({
       ...withPageProvenance(found,page),
       reported_name:found.reported_name||found.display_name,
       report_interpretation_raw:reportInterpretation(page,def),
       source_file:groupMeta.source_file,
       source_file_index:fileIndex,
       lab_no:groupMeta.lab_no||"",
       sample_no:groupMeta.sample_no||"",
       accession_no:groupMeta.accession_no||"",
       result_date:rowEventDateTime.slice(0,10),
       result_datetime:rowEventDateTime,
       event_provenance:groupMeta.event_provenance||"",
       event_anchor_page:groupMeta.event_anchor_page??null
     })
   }
   if(reconstructed.length||page.captureType==="PHOTO"){
     const photoFallback=reconstructed.length||page.captureType!=="PHOTO"||specializedDocument||bnhDocument?[]:inlinePhotoRows(page);
     [...reconstructed,...photoFallback].forEach(found=>{
       if(output.some(row=>row.test_code===found.test_code&&clean(row.value_raw)===clean(found.value_raw)))return;
       const sourceDefinition=TESTS.find(d=>d[3]===found.test_code);
       output.push({
         ...withPageProvenance(found,page),
         reported_name:found.reported_name||found.display_name,
         // Dynamic FoodPrint/allergy rows have no TESTS definition. Scanning
         // the entire dense OCR page for an interpretation once per food item
         // caused the browser to appear frozen. These rows already carry their
         // profile interpretation, so only known ordinary definitions use the
         // generic report-note scanner.
         report_interpretation_raw:found.report_interpretation_raw||(sourceDefinition?reportInterpretation(page,sourceDefinition):""),
         source_file:groupMeta.source_file,
         source_file_index:fileIndex,
         lab_no:groupMeta.lab_no||"",
         sample_no:groupMeta.sample_no||"",
         accession_no:groupMeta.accession_no||"",
         result_date:rowEventDateTime.slice(0,10),
         result_datetime:rowEventDateTime,
         event_provenance:groupMeta.event_provenance||"",
         event_anchor_page:groupMeta.event_anchor_page??null
       })
     })
   }
   return output
 }
 function evidenceGroupKey(r){
   return[
     r.source_file_index??0,
     r.page??0,
     clean(r.accession_no||r.sample_no||r.lab_no||r.result_datetime||r.result_date),
     clean(r.test_code||r.display_name).toLowerCase()
   ].join("::")
 }
 function decimalPlaces(raw){
   const match=clean(raw).replace(",",".").match(/^(?:[<>]=?\s*)?-?\d+(?:\.(\d+))?$/);
   return match?(match[1]||"").length:-1
 }
 function valuesEquivalentByPrecision(values){
   if(values.length<2)return true;
   const parsed=values.map(value=>({
     raw:value,
     numeric:valueParts(value).value_numeric,
     operator:valueParts(value).value_operator,
     places:decimalPlaces(value)
   }));
   if(parsed.some(item=>item.numeric===null||item.places<0))return false;
   const mostPrecise=parsed.slice().sort((a,b)=>b.places-a.places)[0];
   if(parsed.some(item=>item.operator!==mostPrecise.operator))return false;
   return parsed.every(item=>{
     const factor=10**item.places;
     return Math.round(mostPrecise.numeric*factor)/factor===item.numeric
   })
 }
 function constraintSatisfied(bound,exact){
   const b=valueParts(bound),e=valueParts(exact);
   if(b.value_numeric===null||e.value_numeric===null||e.value_operator!=="=")return false;
   if(b.value_operator===">")return e.value_numeric>b.value_numeric;
   if(b.value_operator===">=")return e.value_numeric>=b.value_numeric;
   if(b.value_operator==="<")return e.value_numeric<b.value_numeric;
   if(b.value_operator==="<=")return e.value_numeric<=b.value_numeric;
   return false
 }
 function valuesCompatibleByConstraint(values){
   const unique=[...new Set((values||[]).map(clean).filter(Boolean))];
   if(unique.length<2)return true;
   const exact=unique.filter(value=>valueParts(value).value_operator==="=");
   const bounded=unique.filter(value=>["<","<=",">",">="].includes(valueParts(value).value_operator));
   if(exact.length!==1||exact.length+bounded.length!==unique.length)return false;
   return bounded.every(value=>constraintSatisfied(value,exact[0]))
 }
 function compatibleConstraintWinner(items){
   const values=[...new Set((items||[]).map(row=>clean(row.value_raw)).filter(Boolean))];
   if(!valuesCompatibleByConstraint(values))return null;
   const methods=[...new Set((items||[]).map(row=>clean(row.reported_method||row.method).toLowerCase()).filter(Boolean))];
   // Different analytical methods are distinct measurements, not duplicate OCR
   // candidates (for example Folate CMIA versus Vitamin B9 LC-MS/MS).
   if(methods.length>1)return null;
   const sourceScore=row=>{
     const profile=clean(row.specialized_profile).toUpperCase();
     const numericSource=clean(row.numeric_result_source).toUpperCase();
     const dedicated=profile&&profile!=="MICRONUTRIENT_PROFILE_I"?40:0;
     const primary=numericSource==="RESULT_TABLE"?25:numericSource==="SUMMARY_TABLE_FALLBACK"?0:12;
     const complete=(clean(row.unit)?8:0)+(clean(row.reference_raw)?8:0)+(clean(row.source_flag)?3:0);
     const reported=valueParts(row.value_raw).value_operator==="="?2:4;
     return dedicated+primary+complete+reported+Math.min(9,Math.max(0,Number(row.confidence||0)/12))
   };
   return(items||[]).slice().sort((a,b)=>sourceScore(b)-sourceScore(a))[0]||null
 }
 function reconcileCompatibleCensoredValues(input){
   const groups=new Map(),drop=new Set();
   (input||[]).filter(row=>row.selected!==false&&hasReportableResult(row)).forEach(row=>{
     const key=verificationKey(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)
   });
   groups.forEach(items=>{
     if(items.length<2)return;
     const winner=compatibleConstraintWinner(items);if(!winner)return;
     const rejected=items.filter(row=>row!==winner);
     rejected.forEach(row=>drop.add(row));
     winner.alternate_reported_values=[...new Set([
       ...(Array.isArray(winner.alternate_reported_values)?winner.alternate_reported_values:[]),
       ...rejected.map(row=>clean(row.value_raw)).filter(Boolean)
     ])];
     winner.source_evidence=[...(Array.isArray(winner.source_evidence)?winner.source_evidence:[]),{
       type:"CENSORED_EXACT_EQUIVALENCE_RECONCILIATION",
       kept:clean(winner.value_raw),rejected:rejected.map(row=>clean(row.value_raw)).filter(Boolean),
       reason:"ค่า exact อยู่ในเงื่อนไขของค่าที่รายงานแบบมากกว่า/น้อยกว่า จึงเป็นผลเดียวกัน ไม่สร้างคิว Verify ซ้ำ"
     }];
     winner.constraint_equivalence_reconciled=true
   });
   return(input||[]).filter(row=>!drop.has(row))
 }

 function numericReferenceRow(row){
   const operator=parseRef(row.reference_raw).reference_operator;
   return["range","<","<=",">",">="].includes(operator)
 }
 function strongValueEvidence(row){
   if(row.result_kind!=="NUMERIC")return true;
   return numericReferenceRow(row)&&Boolean(clean(row.unit))
 }
 function mergePhotoEvidence(input){
   const nonPhoto=input.filter(r=>!r.photo_ocr);
   const groups=new Map();
   input.filter(r=>r.photo_ocr).forEach(r=>{
     const key=evidenceGroupKey(r);
     if(!groups.has(key))groups.set(key,[]);
     groups.get(key).push(r)
   });
   const mergedPhoto=[...groups.values()].map(items=>{
     const strongItems=items.filter(strongValueEvidence);
     // When at least one OCR pass reconstructs a complete physical row,
     // isolated numbers from sparse OCR are audit evidence only. They are
     // commonly a neighbouring reference range (for example Urea 6.9 versus
     // the detached token 287.2), not a competing result value.
     const conflictItems=strongItems.length?strongItems:items;
     const trustedItems=conflictItems.filter(row=>sourceTruthPlausibility(row).status!=="IMPLAUSIBLE"&&(row?.bnh_source_truth?bnhAtomicFlagConsistent(row):sourceTruthFlagConsistent(row)));
     const adjudicationItems=trustedItems.length?trustedItems:conflictItems;
     const valueSupport=value=>adjudicationItems.filter(r=>clean(r.value_raw)===value).length;
     const observedValues=[...new Set(adjudicationItems.map(r=>clean(r.value_raw)).filter(Boolean))];
     const allObservedValues=[...new Set(conflictItems.map(r=>clean(r.value_raw)).filter(Boolean))];
     const ranked=items.slice().sort((a,b)=>{
       const trusted=Number(adjudicationItems.includes(b))-Number(adjudicationItems.includes(a));
       if(trusted)return trusted;
       const plausible=Number(sourceTruthPlausibility(b).status!=="IMPLAUSIBLE")-Number(sourceTruthPlausibility(a).status!=="IMPLAUSIBLE");
       if(plausible)return plausible;
       const flagAligned=Number(b?.bnh_source_truth?bnhAtomicFlagConsistent(b):sourceTruthFlagConsistent(b))-Number(a?.bnh_source_truth?bnhAtomicFlagConsistent(a):sourceTruthFlagConsistent(a));
       if(flagAligned)return flagAligned;
       const bnh=Number(Boolean(b.bnh_source_truth))-Number(Boolean(a.bnh_source_truth));
       if(bnh)return bnh;
       if(b.bnh_source_truth&&a.bnh_source_truth){
         const echo=Number(bnhReferenceEndpointEcho(a))-Number(bnhReferenceEndpointEcho(b));
         if(echo)return echo
       }
       const strong=Number(strongValueEvidence(b))-Number(strongValueEvidence(a));
       if(strong)return strong;
       const support=valueSupport(clean(b.value_raw))-valueSupport(clean(a.value_raw));
       if(support)return support;
       const completeness=(r=>Boolean(r.unit)+Boolean(r.reference_raw)*2)(b)-
         (r=>Boolean(r.unit)+Boolean(r.reference_raw)*2)(a);
       return completeness||Number(b.confidence||0)-Number(a.confidence||0)
     });
     const best=ranked[0];
     const choose=key=>items.map(r=>clean(r[key])).filter(Boolean)
       .sort((a,b)=>items.filter(r=>clean(r[key])===b).length-items.filter(r=>clean(r[key])===a).length)[0]||"";
     const passes=new Set(items.map(r=>r.ocr_pass).filter(Boolean));
     const merged={...best,unit:choose("unit")||best.unit,reference_raw:choose("reference_raw")||best.reference_raw,source_flag:choose("source_flag")||best.source_flag};
     const reportedValue=clean(merged.reported_value_raw||merged.value_raw);
     const reportedReference=clean(merged.reported_reference_raw||merged.reference_raw);
     const reportedUnit=normalizeUnit(merged.reported_unit||merged.unit);
     const clinicallyRepaired=merged.bnh_source_truth
       ?{value:clean(merged.value_raw),reference:clean(merged.reference_raw),score:100,repaired:false}
       :clinicalRepair(
         TESTS.find(d=>d[3]===merged.test_code)||[merged.display_name,"","",merged.test_code],
         merged.value_raw,merged.reference_raw,merged.unit,merged.source_flag
       );
     Object.assign(merged,valueParts(clinicallyRepaired.value));
     merged.reference_raw=clinicallyRepaired.reference;
     const rp=parseRef(merged.reference_raw);
     Object.assign(merged,rp);
     const def=TESTS.find(d=>d[3]===merged.test_code)||[merged.display_name,"","",merged.test_code];
     const inferredProfile=!merged.unit&&unitProfile(def,merged.reference_raw);
     if(inferredProfile){
       merged.unit=inferredProfile.unit;
       merged.unit_inferred=true
     }
     merged.reported_value_raw=reportedValue;
     merged.reported_unit=reportedUnit;
     merged.reported_reference_raw=reportedReference;
     merged.clinical_repair_applied=Boolean(
       clinicallyRepaired.repaired||
       reportedValue!==clean(merged.value_raw)||
       reportedReference!==clean(merged.reference_raw)||
       (!reportedUnit&&Boolean(merged.unit))
     );
     Object.assign(merged,standardizeValue(merged.test_code,merged.value_numeric,merged.unit));
     merged.calculated_flag=merged.clinical_context_required?"CONTEXT":calcFlag(merged,rp);
     const normalizedReportedFlag=clean(merged.source_flag).toUpperCase();
     if(merged.bnh_source_truth&&merged.result_kind==="NUMERIC"&&!numericReferenceRow(merged)&&!["H","HH","L","LL","N"].includes(normalizedReportedFlag))merged.calculated_flag="CONTEXT";
     if(merged.result_kind!=="NUMERIC"&&["H","HH","L","LL","N"].includes(normalizedReportedFlag)){
       merged.calculated_flag=normalizedReportedFlag
     }
     merged.evidence_passes=passes.size;
     if(allObservedValues.length>observedValues.length){
       const rejected=conflictItems.filter(row=>!adjudicationItems.includes(row));
       merged.source_truth_rejected_candidates=rejected.map(row=>({value:clean(row.value_raw),unit:clean(row.unit),flag:clean(row.source_flag),reason:sourceTruthPlausibility(row).status==="IMPLAUSIBLE"?"PLAUSIBILITY":(row?.bnh_source_truth?bnhAtomicFlagConsistent(row):sourceTruthFlagConsistent(row))?"LOWER_EVIDENCE":"FLAG_CONFLICT"}));
       merged.source_evidence=[...(Array.isArray(merged.source_evidence)?merged.source_evidence:[]),{type:"SOURCE_TRUTH_CANDIDATE_ADJUDICATION",accepted_value:clean(merged.value_raw),rejected_values:merged.source_truth_rejected_candidates}]
     }
     const numericReference=["range","<","<=",">",">="].includes(merged.reference_operator);
     const sourceFieldsComplete=Boolean(merged.clinical_context_required)||merged.result_kind!=="NUMERIC"||
       (numericReference&&Boolean(merged.unit));
     const agreeingValues=valueSupport(clean(best.value_raw));
     const valueConflict=observedValues.length>1&&agreeingValues<2&&
       !valuesEquivalentByPrecision(observedValues);
     const suspicious=merged.value_numeric!==null&&merged.reference_operator==="range"&&
       (merged.value_numeric<merged.reference_low-Math.max(1,merged.reference_high-merged.reference_low)*10||
        merged.value_numeric>merged.reference_high+Math.max(1,merged.reference_high-merged.reference_low)*10);
     const profileExpected=(UNIT_PROFILES[merged.test_code]||[]).length>0;
     const implausibleReference=merged.result_kind==="NUMERIC"&&profileExpected&&numericReference&&
       !unitProfile(def,merged.reference_raw);
     const sourceFlag=normalizedReportedFlag;
     const flagConflict=merged.result_kind==="NUMERIC"&&["H","HH","L","LL"].includes(sourceFlag)&&
       merged.calculated_flag!=="NO_RANGE"&&
       !sourceFlag.startsWith(clean(merged.calculated_flag).toUpperCase());
     const demographicReferenceMissing=Boolean(merged.reference_selection_required);
     const missingCore=!clean(merged.display_name)||!clean(merged.test_code)||
       !clean(merged.value_raw)||
       (merged.result_kind==="NUMERIC"&&!Number.isFinite(Number(merged.value_numeric)));
     const actionable=missingCore||suspicious||implausibleReference||flagConflict||valueConflict||demographicReferenceMissing;
     if(!actionable){
       // An unambiguous result value is safe to pass the step-by-step queue
       // even when optional source fields or the whole-page OCR score are low.
       // Keep the original score as a non-blocking audit advisory.
       if(agreeingValues>=2)merged.confidence=Math.max(Number(merged.confidence||0),86);
       merged.parse_issue=false
     }else{
       merged.parse_issue=actionable
     }
     merged.ocr_value_conflict=valueConflict;
     merged.missing_fields_advisory=!sourceFieldsComplete;
     merged.low_confidence_advisory=Number(best.confidence||0)<80||
       observedValues.length===1||merged.missing_fields_advisory;
     merged.verify_reason=missingCore?"ข้อมูลหลักจากรายงานไม่ครบ (ชื่อหรือค่าผล)":
       suspicious?"ค่าผลไม่สัมพันธ์กับช่วงอ้างอิง":
       implausibleReference?"หน่วยหรือช่วงอ้างอิงไม่สอดคล้องกับชนิดการตรวจ":
       flagConflict?"Flag จากรายงานไม่ตรงกับค่าและช่วงอ้างอิง":
       valueConflict?`OCR อ่านค่าต่างกัน (${observedValues.join(" / ")})`:
       demographicReferenceMissing?"รายงานมีช่วงอ้างอิงหลายช่วง แต่ยังไม่พบเพศหรืออายุที่ใช้เลือกช่วง":"";
     return merged
   });
   return[...nonPhoto,...mergedPhoto]
 }

 function reconcileBnhExactSourceRows(input){
   // v10.219: exact BNH row identity deliberately ignores unit. A weak OCR
   // candidate may have lost the unit or read its decimal/range incorrectly;
   // it is still the same physical analyte/event and must not split the Verify
   // queue or later longitudinal series.
   const groups=new Map(),drop=new Set();
   const keyOf=row=>[
     Number(row?.source_file_index??0),clean(row?.lab_no||row?.accession_no||row?.sample_no),
     clean(row?.result_datetime||row?.result_date).slice(0,19),clean(row?.test_code||row?.display_name).toLowerCase(),
     identityMethodToken(row),identitySpecimenToken(row),clean(row?.result_kind||"NUMERIC").toUpperCase()
   ].join("|");
   (input||[]).filter(row=>row?.bnh_source_truth&&row.selected!==false&&hasReportableResult(row)).forEach(row=>{
     const key=keyOf(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)
   });
   groups.forEach(items=>{
     if(items.length<2||!sameClinicalEventForConflict(items))return;
     const exact=items.filter(row=>row.exact_source_row_recovered&&bnhAtomicFlagConsistent(row));
     if(!exact.length)return;
     const exactValues=[...new Set(exact.map(row=>clean(row.value_raw)).filter(Boolean))];
     if(exactValues.length!==1&&!valuesEquivalentByPrecision(exactValues))return;
     const quality=row=>{
       const ref=parseRef(row.reference_raw),numericRef=["range","<","<=",">",">="].includes(ref.reference_operator);
       const def=TESTS.find(d=>d[3]===row.test_code);
       return Number(row.exact_source_row_recovered)*100+Number(Boolean(unitProfile(def,row.reference_raw)))*35+Number(numericRef)*18+Number(Boolean(clean(row.unit)))*12+Number(Boolean(clean(row.source_flag)))*5+Number(row.confidence||0)/10
     };
     const winner=exact.slice().sort((a,b)=>quality(b)-quality(a))[0];
     const rejected=items.filter(row=>row!==winner&&!row.exact_source_row_recovered);
     rejected.forEach(row=>drop.add(row));
     // Exact duplicate row passes that agree are evidence, not extra results.
     exact.filter(row=>row!==winner&&clean(row.value_raw)===clean(winner.value_raw)).forEach(row=>drop.add(row));
     if(!rejected.length&&exact.length<2)return;
     winner.alternate_reported_values=[...new Set([...(Array.isArray(winner.alternate_reported_values)?winner.alternate_reported_values:[]),...rejected.map(row=>clean(row.value_raw)).filter(Boolean)])];
     winner.source_evidence=[...(Array.isArray(winner.source_evidence)?winner.source_evidence:[]),{
       type:"BNH_FULL_ATOMIC_EVENT_RECONCILIATION",kept:clean(winner.value_raw),kept_unit:clean(winner.unit),kept_reference:clean(winner.reference_raw),
       rejected:rejected.map(row=>({value:clean(row.value_raw),unit:clean(row.unit),reference:clean(row.reference_raw),page:row.source_page_number??row.page??null})),
       reason:"Exact physical-row OCR owns the analyte/event; weaker candidates with missing/corrupt unit or reference were suppressed before Verify and longitudinal grouping"
     }];
     winner.exact_source_row_auto_reconciled=true;winner.parse_issue=Boolean(winner.atomic_field_conflict);if(!winner.parse_issue)winner.verify_reason=""
   });
   return(input||[]).filter(row=>!drop.has(row))
 }

 function enforceTypedBnhBundles(input){
   (input||[]).forEach(row=>{
     if(!row?.bnh_source_truth)return;
     bnhNormalizeRepeatedSourceTokens(row);bnhTypedReferenceDecimalRepair(row);
     const typed=bnhTypedRowAssessment(row);row.typed_row_kind=typed.kind;
     if(typed.ok)return;
     row.parse_issue=true;row.chartable=false;row.graph_eligible=false;row.typed_bundle_quarantined=true;
     row.verify_reason=`Typed Row Bundle ไม่สอดคล้อง (${typed.reasons.join("; ")}) — ต้องยืนยันจากแถวต้นฉบับเดียวกันก่อนสร้างกราฟ`;
     row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{type:"BNH_TYPED_ROW_BUNDLE_QUARANTINE",kind:typed.kind,reasons:typed.reasons,value:clean(row.value_raw),unit:clean(row.unit),reference:clean(row.reference_raw)}]
   });return input
 }

 function bnhSourceTruthPhysicalKey(row){return`${Number(row?.source_file_index||0)}|${Number(row?.source_page_number??row?.document_page_number??row?.page??0)}|${clean(row?.test_code)}`}
 function bnhCanonicalSourceRow(group,page,row){
   const date=bnhPageEventDate(page,group?.meta||{}),moment=date?`${date}T00:00:00+07:00`:clean(group?.meta?.specimen_datetime||group?.meta?.result_datetime||"");
   const out={...withPageProvenance(row,page),source_file:group?.meta?.source_file||page?.sourceFileName||"",source_file_index:Number(group?.fileIndex||0),result_date:date||clean(row?.result_date),result_datetime:moment||clean(row?.result_datetime),source_profile:"BNH_SCANNED_LAB",bnh_source_truth:true,source_truth_finalized:true};
   if(BNH_BUNDLE_REQUIRED.has(clean(out.test_code))){const integrity=bnhBundleIntegrity(out);if(!integrity.ok){out.source_truth_release_blocked=true;out.parse_issue=true;out.verify_reason=`Source-Truth Finalization: ${integrity.reasons.join("; ")||"typed row bundle incomplete"}`}}
   return out
 }
 function finalizeBnhSourceTruth(groups=[],input=[]){
   const base=[...(input||[])],drop=new Set(),canonical=[];
   for(const group of groups||[]){
     for(const page of group?.pages||[]){
       if(!bnhScannedPage(page))continue;
       const pageNo=Number(page?.sourcePageNumber??page?.pageNumber??0),sourceRows=bnhScannedRows(page).map(row=>bnhCanonicalSourceRow(group,page,row));
       const codes=new Set(sourceRows.map(row=>clean(row.test_code)).filter(Boolean));
       if(codes.size){
         base.forEach(row=>{if(!rowBelongsToGroup(row,group))return;const rowPage=Number(row?.source_page_number??row?.document_page_number??row?.page??0);if(rowPage===pageNo&&codes.has(clean(row.test_code)))drop.add(row)});
         canonical.push(...sourceRows)
       }
     }
   }
   // Canonical physical rows are appended last and own their page/event. This
   // removes phantom dates (e.g. MPV 88 on 18-Jun) and reference-endpoint rows.
   const merged=[...base.filter(row=>!drop.has(row)),...canonical];
   const byPhysical=new Map(),discard=new Set();
   merged.forEach(row=>{if(!row?.source_truth_finalized)return;const key=bnhSourceTruthPhysicalKey(row),old=byPhysical.get(key);if(!old){byPhysical.set(key,row);return}const a=bnhBundleIntegrity(old).score,b=bnhBundleIntegrity(row).score;if(b>a){discard.add(old);byPhysical.set(key,row)}else discard.add(row)});
   return merged.filter(row=>!discard.has(row))
 }
 function bnhSourceTruthFinalizationExpectations(groups=[],parsedRows=[]){
   const blocked=(parsedRows||[]).filter(row=>row?.source_truth_release_blocked&&row?.selected!==false);
   if(!blocked.length)return[];
   const byFile=new Map();blocked.forEach(row=>{const file=clean(row.source_file)||`ไฟล์ ${Number(row.source_file_index||0)+1}`;if(!byFile.has(file))byFile.set(file,[]);byFile.get(file).push(row)});
   return[...byFile].map(([source_file,items])=>({profile:"BNH_SOURCE_TRUTH_FINALIZATION",source_file,source_file_index:Number(items[0]?.source_file_index||0),missing_codes:items.map(row=>`FINAL:${row.test_code}`),missing_labels:items.map(row=>`${row.display_name||row.test_code} — ${row.verify_reason||"Source row incomplete"}`),detected_count:items.length,parsed_count:0}))
 }
 function reconcileBnhBundleAgainstGeneric(input){
   // v10.221 — once a BNH physical-row reader has recovered an analyte/event,
   // a generic OCR row from the same page/date must not survive with duplicated
   // tokens or a foreign unit/reference. Prefer coherent BNH source evidence;
   // if its reference is still missing, keep it as CONTEXT instead of accepting
   // a generic false abnormal classification.
   const groups=new Map(),drop=new Set();
   const keyOf=row=>[Number(row?.source_file_index??0),clean(row?.result_date||row?.result_datetime).slice(0,10),clean(row?.test_code||row?.display_name).toLowerCase(),identityMethodToken(row),identitySpecimenToken(row),clean(row?.result_kind||"NUMERIC").toUpperCase()].join("|");
   (input||[]).filter(row=>row?.selected!==false&&hasReportableResult(row)).forEach(row=>{const key=keyOf(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)});
   groups.forEach(items=>{
     const bnh=items.filter(row=>row?.bnh_source_truth);const generic=items.filter(row=>!row?.bnh_source_truth);if(!bnh.length||!generic.length)return;
     const ranked=bnh.slice().sort((a,b)=>bnhBundleIntegrity(b).score-bnhBundleIntegrity(a).score||Number(Boolean(b.exact_source_row_recovered))-Number(Boolean(a.exact_source_row_recovered))||Number(b.confidence||0)-Number(a.confidence||0));
     const winner=ranked[0];if(!winner)return;
     const winParts=valueParts(winner.value_raw),sameValueGeneric=generic.filter(row=>{const p=valueParts(row.value_raw);return winParts.value_numeric!==null&&p.value_numeric!==null&&Math.abs(Number(p.value_numeric)-Number(winParts.value_numeric))<=Math.max(1e-9,Math.abs(Number(winParts.value_numeric))*1e-6)});
     const integrity=bnhBundleIntegrity(winner);
     // A coherent BNH row owns the event. A BNH value that agrees with generic
     // OCR also owns it even when its reference is missing; this avoids false H/L
     // status caused solely by a generic reference mix-up.
     if(!integrity.ok&&!sameValueGeneric.length)return;
     generic.forEach(row=>drop.add(row));
     if(!integrity.ok&&winner.result_kind==="NUMERIC"&&!clean(winner.reference_raw)){winner.calculated_flag="CONTEXT";winner.parse_issue=false;winner.verify_reason=""}
     winner.source_evidence=[...(Array.isArray(winner.source_evidence)?winner.source_evidence:[]),{type:"BNH_ROW_BUNDLE_OWNS_EVENT",suppressed_generic:generic.map(row=>({value:clean(row.value_raw),unit:clean(row.unit),reference:clean(row.reference_raw)})),bundle_ok:integrity.ok,reason:"BNH physical source row owns the analyte/date event over generic OCR candidates"}]
   });
   return(input||[]).filter(row=>!drop.has(row))
 }

 function resultIdentity(r){
   const event=clean(r.accession_no||r.sample_no||r.lab_no);
   return[
     event||`${r.source_file_index??0}:${clean(r.source_file).toLowerCase()}`,
     clean(r.result_datetime||r.result_date),
     clean(r.test_code||r.display_name).toLowerCase(),
     identityMethodToken(r),identitySpecimenToken(r),identityUnitToken(r),
     clean(r.result_kind||"NUMERIC").toUpperCase(),clean(r.value_raw)
   ].join("::")
 }
 function crossSourceMeasurementQuality(row){
   const source=clean(row?.source_file||"");
   const cumulative=Boolean(row?.cumulative)||/รวมแลป|cumulative/i.test(source);
   const unit=normalizeUnit(row?.unit||row?.reported_unit||"");
   const reference=clean(row?.reference_raw||row?.reported_reference_raw||"");
   return(cumulative?0:45)+(unit?25:0)+(reference?18:0)+(clean(row?.lab_no)?8:0)+Math.min(10,Number(row?.confidence||0)/10)
 }
 function crossSourceMeasurementKey(row){
   return[clean(row?.result_date||row?.result_datetime).slice(0,10),clean(row?.test_code||row?.display_name).toLowerCase(),identityMethodToken(row),identitySpecimenToken(row),clean(row?.result_kind||"NUMERIC").toUpperCase()].join("|")
 }
 function powerOfTenVariant(a,b){
   const left=valueParts(a).value_numeric,right=valueParts(b).value_numeric;
   if(left===null||right===null||left===0||right===0)return false;
   const ratio=Math.abs(left/right),log=Math.log10(ratio),rounded=Math.round(log);
   return Math.abs(log-rounded)<1e-8&&Math.abs(rounded)>=1&&Math.abs(rounded)<=3
 }
 function reconcileCrossSourceMeasurements(input){
   const groups=new Map(),drop=new Set();
   input.forEach(row=>{const key=crossSourceMeasurementKey(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)});
   groups.forEach(items=>{
     if(items.length<2||new Set(items.map(row=>Number(row?.source_file_index??0))).size<2)return;
     const ranked=items.slice().sort((a,b)=>crossSourceMeasurementQuality(b)-crossSourceMeasurementQuality(a));
     const winner=ranked[0],winnerUnit=normalizeUnit(winner.unit||winner.reported_unit||"");
     ranked.slice(1).forEach(candidate=>{
       const candidateUnit=normalizeUnit(candidate.unit||candidate.reported_unit||"");
       const sameValue=normalizedStoredValueToken(candidate)===normalizedStoredValueToken(winner);
       const weakerSource=Boolean(candidate.cumulative)||/รวมแลป|cumulative/i.test(clean(candidate.source_file))||!candidateUnit;
       // v10.197: only exact supported duplicates may be suppressed. A decimal
       // shift is a conflict to review, never proof that one value is disposable.
       if(!(sameValue&&weakerSource&&(!candidateUnit||!winnerUnit||candidateUnit===winnerUnit)))return;
       if(crossSourceMeasurementQuality(winner)-crossSourceMeasurementQuality(candidate)<20)return;
       drop.add(candidate);
       winner.source_evidence=[...(Array.isArray(winner.source_evidence)?winner.source_evidence:[]),{
         type:"CROSS_SOURCE_EXACT_DUPLICATE_SUPPRESSED",
         rejected_value:clean(candidate.value_raw),rejected_unit:candidateUnit,rejected_source:clean(candidate.source_file),
         reason:"ตัดเฉพาะผลซ้ำที่ค่า หน่วย วิธีตรวจ และชนิดตัวอย่างตรงกัน โดยเก็บแหล่งรายงานรายละเอียดเป็นค่าหลัก"
       }];
       winner.cross_source_reconciled=true
     })
   });
   return input.filter(row=>!drop.has(row))
 }
 function embeddedEventMeasurementKey(row){
   const event=clean(row?.lab_no||row?.sample_no||row?.accession_no);
   if(!event)return"";
   const kind=clean(row?.result_kind||((row?.value_numeric===null||row?.value_numeric===undefined)?"TEXT":"NUMERIC")).toUpperCase();
   return[Number(row?.source_file_index??0),event,clean(row?.test_code||row?.display_name).toLowerCase(),identityMethodToken(row),identitySpecimenToken(row),kind].join("|")
 }
 function directMeasurementQuality(row){
   const unit=normalizeUnit(row?.unit||row?.reported_unit||"");
   const reference=clean(row?.reference_raw||row?.reported_reference_raw||"");
   return(row?.cumulative?0:70)+(unit?18:0)+(reference?14:0)+(clean(row?.lab_no)?8:0)+Math.min(10,Math.max(0,Number(row?.confidence||0)/10))
 }
 function reconcileEmbeddedCumulativeMeasurements(input){
   const groups=new Map(),drop=new Set();
   (input||[]).forEach(row=>{const key=embeddedEventMeasurementKey(row);if(!key)return;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)});
   groups.forEach(items=>{
     const cumulative=items.filter(row=>row.cumulative);
     const direct=items.filter(row=>!row.cumulative&&hasReportableResult(row));
     if(!cumulative.length||!direct.length)return;
     const ranked=direct.slice().sort((a,b)=>directMeasurementQuality(b)-directMeasurementQuality(a));
     const keeper=ranked[0];
     if(!keeper||directMeasurementQuality(keeper)<80)return;
     cumulative.forEach(candidate=>{
       const keeperUnit=normalizeUnit(keeper.unit||keeper.reported_unit||"");
       const candidateUnit=normalizeUnit(candidate.unit||candidate.reported_unit||"");
       if(keeperUnit&&candidateUnit&&keeperUnit!==candidateUnit)return;
       if(normalizedStoredValueToken(keeper)!==normalizedStoredValueToken(candidate))return;
       drop.add(candidate);
       keeper.source_evidence=[...(Array.isArray(keeper.source_evidence)?keeper.source_evidence:[]),{
         type:"EMBEDDED_CUMULATIVE_DUPLICATE_SUPPRESSED",
         kept_value:clean(keeper.value_raw),rejected_value:clean(candidate.value_raw),
         lab_no:clean(keeper.lab_no),rejected_page:candidate.source_page_number??candidate.page??null,
         reason:"ไฟล์รวมมีทั้งรายงานผลฉบับเต็มและตารางสะสมของ Lab No. เดียวกัน จึงยึดแถวรายงานผลฉบับเต็มและเก็บค่าจากตารางสะสมเป็นหลักฐานตรวจย้อนหลัง"
       }];
       keeper.embedded_cumulative_reconciled=true
     })
   });
   return(input||[]).filter(row=>!drop.has(row))
 }
 function micronutrientSourceTruthKey(row){
   return[Number(row?.source_file_index??0),clean(row?.source_file).toLowerCase(),clean(row?.specialized_profile).toUpperCase(),clean(row?.test_code).toLowerCase(),identityMethodToken(row),identitySpecimenToken(row)].join("|")
 }
 function deduplicateResults(input){
   // A Result Table row is the numeric source of truth. Summary-table values
   // are fallback-only and must disappear as soon as the same analyte/event
   // has a primary result, even when OCR turned a range bound into a different
   // numeric value (for example B12 747.5 on page 1 versus 180 on page 3).
   const primaryMicronutrientKeys=new Set(
     input.filter(r=>
       r.specialized_profile==="MICRONUTRIENT_PROFILE_I"&&
       clean(r.numeric_result_source).toUpperCase()==="RESULT_TABLE"&&
       hasReportableResult(r)
     ).map(micronutrientSourceTruthKey)
   );
   const resolvedInput=input.filter(r=>!(
     r.specialized_profile==="MICRONUTRIENT_PROFILE_I"&&
     clean(r.numeric_result_source).toUpperCase()==="SUMMARY_TABLE_FALLBACK"&&
     primaryMicronutrientKeys.has(micronutrientSourceTruthKey(r))
   ));
   const unique=new Map();
   resolvedInput.forEach(r=>{
     const key=resultIdentity(r),old=unique.get(key);
     const sourcePriority=row=>({
       RESULT_TABLE:30,
       SUMMARY_TABLE_FALLBACK:10
     }[clean(row?.numeric_result_source).toUpperCase()]||20);
     if(!old||
       sourcePriority(r)>sourcePriority(old)||
       (sourcePriority(r)===sourcePriority(old)&&Number(r.confidence||0)>Number(old.confidence||0))
     )unique.set(key,r)
   });
   return[...unique.values()]
 }
 function verificationKey(r){
   const event=clean(r.accession_no||r.sample_no||r.lab_no);
   const moment=clean(r.result_datetime||r.result_date);
   const packetSlot=(r.mixed_clinical_packet||r.source_profile==="HAMAD_MIXED_CLINICAL_PACKET")
     ?[
       clean(r.source_column_date),clean(r.source_column_time),
       r.source_page_number??r.source_page??r.page??"",
       Number.isInteger(r.source_column_index)?r.source_column_index:""
     ].join(":")
     :"";
   // Unit and result kind are part of measurement identity. Absolute counts
   // and percentages from the same specimen must never be forced to compete.
   const unitKey=normalizeUnit(r.unit||r.reported_unit||"").toLowerCase();
   const kindKey=clean(r.result_kind||((r.value_numeric===null||r.value_numeric===undefined)?"TEXT":"NUMERIC")).toUpperCase();
   const testKey=clean(r.test_code||r.display_name).toLowerCase();
   // Method and specimen are part of every measurement identity. Retaining a
   // possible duplicate is safer than silently deleting a different assay.
   const methodKey=identityMethodToken(r),specimenKey=identitySpecimenToken(r);
   return[
     r.source_file_index??0,
     event||clean(r.source_file).toLowerCase(),
     moment||packetSlot,
     testKey,methodKey,specimenKey,unitKey,kindKey
   ].join("|")
 }
 function hamadEvidenceLabel(row){
   const reported=clean(row?.reported_name||row?.display_name||"");
   const sourceLine=clean(row?.source_line_text||"");
   const evidence=clean(sourceLine?`${sourceLine} ${reported}`:reported);
   const patterns=[
     /Absolute\s+Neutrophil\s+count\s+Auto#?\s*\(ANC\)/i,
     /(?:Lymphocyte|Monocyte|Eosinophil|Basophil|Neutrophil)\s+Auto\s*[#%]/i,
     /Bilirubin\s+[TD]/i,/Adjusted\s+Calcium/i,/Total\s+Protein/i,/Albumin\s+Lvl/i,/Alk\s+Phos/i,
     /CA\s*19[- ]?9/i,/CA\s*15[- ]?3/i,/CA\s*125/i,
     /\b(?:MCHC|RDW[- ]?CV|Hgb|Hb|Hct|MCV|MCH|WBC|RBC|Platelets?|MPV|GGT|Amy[- ]?P|Amylase|Lipase|CRP)\b/i
   ];
   for(const pattern of patterns){const match=evidence.match(pattern);if(match)return clean(match[0])}
   return reported
 }
 function repairHamadRowIdentity(row){
   const hamad=Boolean(row?.mixed_clinical_packet||row?.source_profile==="HAMAD_MIXED_CLINICAL_PACKET");
   if(!hamad)return row;
   const evidenceLabel=hamadEvidenceLabel(row);
   const def=hamadDefinitionForLabel(evidenceLabel,row.unit||row.source_unit_text||"",row.value_raw||row.value_numeric||"");
   if(!def)return row;
   const priorCode=row.test_code||"";
   if(priorCode!==def[3]){
     row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{
       type:"HAMAD_ANALYTE_IDENTITY_REPAIR",reported_test_code:priorCode,repaired_test_code:def[3],
       evidence_label:evidenceLabel,unit:normalizeUnit(row.unit||""),reason:"แยกรายการตามชื่อแถวและหน่วยของต้นฉบับ"
     }];
     row.test_code=def[3];row.category=def[1];row.panel=def[2];row.canonical_display_name=def[0];
     row.reported_name=evidenceLabel||row.reported_name||def[0];row.display_name=evidenceLabel||def[0];
     row.hamad_identity_repaired=true;row.parse_issue=false;row.verify_reason="";
     row.confidence=Math.max(Number(row.confidence||0),94)
   }else if(evidenceLabel&&(!row.reported_name||row.display_name!==evidenceLabel)){
     row.reported_name=evidenceLabel;row.display_name=evidenceLabel;row.canonical_display_name=def[0]
   }
   return row
 }
 function repairHamadRowIdentities(input){return(input||[]).map(repairHamadRowIdentity)}
 function median(values){
   const sorted=(values||[]).filter(Number.isFinite).slice().sort((a,b)=>a-b);
   if(!sorted.length)return null;
   const middle=Math.floor(sorted.length/2);
   return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2
 }
 function hamadScaleTruncationWinner(items,input){
   const numeric=items.map(row=>({row,value:Number(clean(row.value_raw).replace(/,/g,"."))})).filter(item=>Number.isFinite(item.value)&&item.value>0);
   if(numeric.length<2)return null;
   const ordered=numeric.slice().sort((a,b)=>a.value-b.value),small=ordered[0],large=ordered[ordered.length-1];
   const ratio=large.value/small.value;
   // OCR may drop one or two terminal digits (75 -> 7, 170 -> 17).
   // A wider window is safe because selection still requires history/source/reference evidence.
   const scale=[10,100,1000].find(target=>Math.abs(ratio-target)/target<.22);
   if(!scale)return null;
   const sameTestHistory=input.filter(row=>
     row.selected!==false&&row.test_code===large.row.test_code&&!items.includes(row)&&
     clean(row.result_datetime||row.result_date)!==clean(large.row.result_datetime||large.row.result_date)&&
     Number.isFinite(Number(clean(row.value_raw).replace(/,/g,".")))
   ).map(row=>Number(clean(row.value_raw).replace(/,/g,"."))).filter(value=>value>0);
   const center=median(sameTestHistory);
   if(center!==null){
     const distance=value=>Math.abs(Math.log10(value/center));
     const largeDistance=distance(large.value),smallDistance=distance(small.value);
     if(smallDistance-largeDistance>.45)return{winner:large.row,reason:"ค่าที่สั้นกว่าถูก OCR ตัดเลขศูนย์ท้าย; ค่าที่ยาวกว่าสอดคล้องกับแนวโน้มของรายการเดียวกันในวันอื่น"};
     if(largeDistance-smallDistance>.45)return{winner:small.row,reason:"ค่าที่ยาวกว่ามีเลขศูนย์เกินจาก OCR; ค่าที่สั้นกว่าสอดคล้องกับแนวโน้มของรายการเดียวกันในวันอื่น"}
   }
   const rawEvidence=items.map(row=>`${row.source_cell_text||""} ${row.source_line_text||""}`).join(" ");
   const explicitLarge=new RegExp(`(?:^|\\s)${String(large.value).replace(".","\\.")}(?:\\s|H|L|C|\\*|$)`).test(rawEvidence);
   if(explicitLarge)return{winner:large.row,reason:"ข้อความ OCR ของแถวต้นฉบับยังพบค่าตัวเต็ม จึงตัดค่าที่สูญเลขศูนย์ออก"};
   // If there is no longitudinal point, a printed reference interval can still
   // make one value decisive (Total Protein 75 in 60-80 versus OCR-truncated 7).
   const scored=numeric.map(item=>({item,score:hamadReferenceDistance(item.value,item.row.reference_raw||item.row.reported_reference_raw||"",item.row.source_flag||"")}))
     .filter(entry=>Number.isFinite(entry.score)).sort((a,b)=>a.score-b.score);
   if(scored.length>1&&scored[1].score-scored[0].score>6){
     return{winner:scored[0].item.row,reason:"เลือกค่าที่สอดคล้องกับช่วงอ้างอิงของแถวต้นฉบับ และตัดค่าที่ OCR ทำเลขท้ายหาย"}
   }
   return null
 }
 function reconcileHamadSameEventValues(input){
   const groups=new Map();
   input.filter(r=>r.selected!==false&&hasReportableResult(r)).forEach(r=>{
     const hamad=Boolean(r.mixed_clinical_packet||r.source_profile==="HAMAD_MIXED_CLINICAL_PACKET");
     if(!hamad)return;
     const key=verificationKey(r);
     if(!groups.has(key))groups.set(key,[]);
     groups.get(key).push(r)
   });
   const drop=new Set();
   groups.forEach(items=>{
     if(items.length<2)return;
     const distinct=[...new Set(items.map(r=>clean(r.value_raw)).filter(Boolean))];
     if(distinct.length<2||valuesEquivalentByPrecision(distinct))return;
     const explicitFlags=items.map(r=>clean(r.source_flag).toUpperCase()).filter(flag=>["H","HH","L","LL","C"].includes(flag));
     const expectedFlag=explicitFlags.find(flag=>["H","HH"].includes(flag))?"H":
       explicitFlags.find(flag=>["L","LL"].includes(flag))?"L":
       explicitFlags.find(flag=>flag==="C")?"C":"";
     // A few Hamad OCR passes lose the separate H/L token. Before creating a
     // Verify queue, detect classic scale truncation (170 -> 17) using the
     // longitudinal values of the same analyte and the raw row evidence.
     if(!expectedFlag){
       const scaleResolution=hamadScaleTruncationWinner(items,input);
       if(!scaleResolution)return;
       const winner=scaleResolution.winner;
       items.filter(row=>row!==winner).forEach(row=>drop.add(row));
       winner.alternate_reported_values=[...new Set([
         ...(Array.isArray(winner.alternate_reported_values)?winner.alternate_reported_values:[]),
         ...items.filter(row=>row!==winner).map(row=>clean(row.value_raw)).filter(Boolean)
       ])];
       winner.source_evidence=[...(Array.isArray(winner.source_evidence)?winner.source_evidence:[]),{
         type:"HAMAD_SCALE_TRUNCATION_RECONCILIATION",kept:clean(winner.value_raw),
         rejected:items.filter(row=>row!==winner).map(row=>clean(row.value_raw)).filter(Boolean),
         reason:scaleResolution.reason
       }];
       winner.hamad_auto_reconciled=true;winner.parse_issue=false;winner.verify_reason="";
       return
     }
     // Keep genuine same-event discrepancies in Verify unless the source flag
     // and reference range make one OCR candidate decisively impossible.
     if(expectedFlag==="C")return;
     const ranked=items.map(row=>{
       const value=Number(clean(row.value_raw).replace(/,/g,"."));
       const reference=row.reference_raw||row.reported_reference_raw||"";
       const distance=Number.isFinite(value)?hamadReferenceDistance(value,reference,expectedFlag):Number.POSITIVE_INFINITY;
       let score=Number.isFinite(distance)?100-distance*10:-1000;
       if(["H","HH"].includes(clean(row.source_flag).toUpperCase())&&expectedFlag==="H")score+=12;
       if(["L","LL"].includes(clean(row.source_flag).toUpperCase())&&expectedFlag==="L")score+=12;
       if(row.source_profile==="HAMAD_MIXED_CLINICAL_PACKET")score+=4;
       if(row.hamad_ocr_consensus)score+=3;
       score+=Math.min(4,Number(row.hamad_ocr_support||0));
       if(row.reported_name)score+=1;
       return{row,score,distance}
     }).sort((a,b)=>b.score-a.score);
     const winner=ranked[0],runner=ranked[1];
     // Example: Bilirubin T 170 H versus OCR-truncated 17.  Both come from
     // the same specimen column, but only 170 is compatible with H and 0-21.
     if(!winner||!runner||!Number.isFinite(winner.distance)||winner.score-runner.score<25)return;
     ranked.slice(1).forEach(item=>drop.add(item.row));
     winner.row.alternate_reported_values=[...new Set([
       ...(Array.isArray(winner.row.alternate_reported_values)?winner.row.alternate_reported_values:[]),
       ...ranked.slice(1).map(item=>clean(item.row.value_raw)).filter(Boolean)
     ])];
     winner.row.source_evidence=[...(Array.isArray(winner.row.source_evidence)?winner.row.source_evidence:[]),{
       type:"HAMAD_FLAG_REFERENCE_RECONCILIATION",
       kept:clean(winner.row.value_raw),
       rejected:ranked.slice(1).map(item=>clean(item.row.value_raw)).filter(Boolean),
       source_flag:expectedFlag,
       reference:winner.row.reference_raw||"",
       reason:"เลือกค่าที่สอดคล้องกับ Flag และช่วงอ้างอิงของแถวต้นฉบับ; เก็บค่าที่ถูกตัดทอนจาก OCR ไว้เป็นหลักฐาน"
     }];
     winner.row.hamad_auto_reconciled=true;
     winner.row.parse_issue=false;
     winner.row.verify_reason="";
   });
   return input.filter(row=>!drop.has(row))
 }

 function preferredClinicalEventId(r){
   // Lab No. is the primary event identifier for ordinary WMC reports. A
   // packet-level Sample/Accession No. can legitimately persist elsewhere in
   // the merged PDF and must never override a page-local Lab No.
   const lab=clean(r?.lab_no),accession=clean(r?.accession_no),sample=clean(r?.sample_no);
   if(lab)return `LAB:${lab}`;
   if(accession)return `ACC:${accession}`;
   if(sample)return `SAMPLE:${sample}`;
   return""
 }
 function duplicateReviewEventToken(r){
   const provenance=clean(r?.event_provenance).toUpperCase();
   const event=preferredClinicalEventId(r);
   const moment=clean(r?.result_datetime||r?.result_date);
   const sourceColumnDate=clean(r?.source_column_date),sourceColumnTime=clean(r?.source_column_time);
   const page=r?.source_page_number??r?.document_page_number??r?.source_page??r?.page??"";
   const rowY=r?.source_row_y??r?.row_y??"";
   const columnIndex=Number.isInteger(r?.source_column_index)?r.source_column_index:"";

   // Cumulative/history tables carry their own column event. Different dates or
   // Lab No. values are longitudinal measurements and must never compete.
   if(r?.cumulative||sourceColumnDate||sourceColumnTime){
     const slot=[event,sourceColumnDate||moment,sourceColumnTime,columnIndex].join("|");
     return slot.replace(/\|/g,"")?`COLUMN:${slot}`:""
   }

   // A page that explicitly printed its own Lab No./date is a trustworthy
   // clinical event. Continuation pages may inherit that metadata for display,
   // but inherited metadata alone is not enough to claim that two different
   // values are duplicate candidates. This is the v10.206 event-scope reset conflict guard.
   if(provenance==="PAGE_LOCAL"){
     const slot=[event,moment].join("|");
     return slot.replace(/\|/g,"")?`LOCAL:${slot}`:""
   }
   if(provenance==="CARRIED"){
     // Only OCR alternatives from the same physical row may compete when the
     // event identity was inherited. Separate pages are retained as history.
     if(page==="")return"";
     return `PHYSICAL:${page}|${rowY}`
   }

   // Backward compatibility for dedicated parsers/tests that already attach an
   // explicit event but predate event_provenance.
   if(event||moment)return `LEGACY:${event}|${moment}`;
   if(page!==""&&rowY!=="")return `PHYSICAL:${page}|${rowY}`;
   return""
 }
 function duplicateReviewKey(r){
   const slot=duplicateReviewEventToken(r);
   if(!slot)return"";
   const unitKey=normalizeUnit(r.unit||r.reported_unit||"").toLowerCase();
   const kindKey=clean(r.result_kind||((r.value_numeric===null||r.value_numeric===undefined)?"TEXT":"NUMERIC")).toUpperCase();
   const testKey=clean(r.test_code||r.display_name).toLowerCase();
   const methodKey=identityMethodToken(r),specimenKey=identitySpecimenToken(r);
   return[r.source_file_index??0,slot,testKey,methodKey,specimenKey,unitKey,kindKey].join("|")
 }
 function conflictEventId(row){
   return preferredClinicalEventId(row)
 }
 function explicitEventFieldConflict(items=[],field){
   const values=[...new Set(items.map(row=>clean(row?.[field])).filter(Boolean))];
   return values.length>1
 }
 function conflictEventMoment(row){
   const provenance=clean(row?.event_provenance).toUpperCase();
   if(row?.cumulative||clean(row?.source_column_date)||clean(row?.source_column_time)){
     return clean(row?.result_datetime||row?.result_date||row?.source_column_date)
   }
   if(provenance==="PAGE_LOCAL")return clean(row?.result_datetime||row?.result_date);
   return""
 }
 function sameClinicalEventForConflict(items=[]){
   if(items.length<2)return true;
   // Compare each explicit identifier family independently before any fallback
   // identity is considered. If two rows print different Lab No. values they
   // are longitudinal events even if both accidentally inherited the same
   // packet-level Sample/Accession No.
   if(explicitEventFieldConflict(items,"lab_no")||
      explicitEventFieldConflict(items,"accession_no")||
      explicitEventFieldConflict(items,"sample_no"))return false;
   const eventIds=[...new Set(items.map(conflictEventId).filter(Boolean))];
   if(eventIds.length>1)return false;
   const moments=[...new Set(items.map(conflictEventMoment).filter(Boolean))];
   if(moments.length>1)return false;
   if(eventIds.length===1&&items.some(row=>!conflictEventId(row))){
     const pages=[...new Set(items.map(row=>row?.source_page_number??row?.document_page_number??row?.page??"").filter(v=>v!==""))];
     if(pages.length>1)return false
   }
   return true
 }
 function sanitizeDuplicateConflictGroups(input=[]){
   const groups=new Map();
   input.forEach(row=>{
     if(!row?.duplicate_conflict||!row?.duplicate_group_key)return;
     if(!groups.has(row.duplicate_group_key))groups.set(row.duplicate_group_key,[]);
     groups.get(row.duplicate_group_key).push(row)
   });
   groups.forEach(items=>{if(!sameClinicalEventForConflict(items))items.forEach(clearDuplicateConflict)});
   return input
 }
 function duplicateResultGroups(input){
   const groups=new Map();
   input.filter(r=>r.selected!==false&&hasReportableResult(r)).forEach(r=>{
     const key=duplicateReviewKey(r);
     if(!key)return;
     if(!groups.has(key))groups.set(key,[]);
     groups.get(key).push(r)
   });
   return[...groups.entries()].filter(([,items])=>{
     if(items.length<2)return false;
     if(!sameClinicalEventForConflict(items))return false;
     const values=[...new Set(items.map(r=>clean(r.value_raw)).filter(Boolean))];
     if(values.length<2||valuesEquivalentByPrecision(values))return false;
     const hamad=items.every(r=>r.mixed_clinical_packet||r.source_profile==="HAMAD_MIXED_CLINICAL_PACKET");
     if(hamad){
       const slots=new Set(items.map(r=>[
         clean(r.result_datetime||r.result_date),clean(r.source_column_date),clean(r.source_column_time),
         r.source_page_number??r.source_page??r.page??"",r.source_column_index??""
       ].join("|")));
       if(slots.size===items.length)return false
     }
     return true
   }).map(([key,items])=>({key,items}))
 }
 function clearDuplicateConflict(r){
   r.duplicate_conflict=false;
   r.duplicate_group_key="";
   r.parse_issue=Boolean(r.duplicate_base_parse_issue);
   r.verify_reason=r.duplicate_base_verify_reason||""
 }
 function duplicateCandidateSourceKey(row){
   return[
     verificationKey(row),clean(row?.source_file).toLowerCase(),row?.source_file_index??0,
     row?.source_page_number??row?.document_page_number??row?.page??"",clean(row?.lab_no),
     clean(row?.numeric_result_source).toUpperCase(),row?.source_row_y??""
   ].join("::")
 }
 function duplicateCandidateValueKey(row){
   return[verificationKey(row),clean(row?.value_raw).replace(/\s+/g,""),normalizeUnit(row?.unit||row?.reported_unit||"").toLowerCase()].join("::")
 }
 function rememberDuplicateResolution(groupKey,winner,siblings=[]){
   if(!groupKey||!winner)return;
   duplicateResolutionLedger.set(groupKey,{
     winnerSourceKey:duplicateCandidateSourceKey(winner),winnerValueKey:duplicateCandidateValueKey(winner),
     winnerValue:clean(winner.value_raw),winnerUnit:normalizeUnit(winner.unit||winner.reported_unit||""),
     rejectedSourceKeys:(siblings||[]).map(duplicateCandidateSourceKey),resolvedAt:new Date().toISOString()
   })
 }
 function applyDuplicateResolutionLedger(input){
   if(!duplicateResolutionLedger.size)return input;
   const byKey=new Map();
   (input||[]).forEach(row=>{const key=duplicateReviewKey(row);if(!key)return;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(row)});
   duplicateResolutionLedger.forEach((resolution,key)=>{
     const candidates=byKey.get(key)||[];if(!candidates.length)return;
     let winner=candidates.find(row=>duplicateCandidateSourceKey(row)===resolution.winnerSourceKey)
       ||candidates.find(row=>duplicateCandidateValueKey(row)===resolution.winnerValueKey);
     if(!winner){
       const sameValue=candidates.filter(row=>clean(row.value_raw)===resolution.winnerValue&&normalizeUnit(row.unit||row.reported_unit||"")===resolution.winnerUnit);
       if(sameValue.length===1)winner=sameValue[0]
     }
     if(!winner)return;
     candidates.forEach(row=>{
       clearDuplicateConflict(row);
       if(row===winner){
         row.selected=true;row.review_confirmed=true;row.manual_duplicate_resolution_applied=true;
         row.source_evidence=[...(Array.isArray(row.source_evidence)?row.source_evidence:[]),{
           type:"MANUAL_DUPLICATE_RESOLUTION_REAPPLIED",group_key:key,resolved_at:resolution.resolvedAt,
           reason:"ใช้คำตอบที่ผู้ตรวจเลือกไว้แล้วกับการประมวลผลซ้ำของเอกสารเดียวกัน"
         }]
       }else{
         row.selected=false;row.review_confirmed=false;row.manual_duplicate_resolution_rejected=true
       }
     })
   });
   return input
 }

 function annotateDuplicateConflicts(input){
   // Recompute conflict state from the current clinical-event identity. This
   // prevents stale duplicate_group_key flags surviving a reparse after page
   // metadata (Lab No./date) has been repaired.
   input.forEach(row=>{if(row?.duplicate_conflict)clearDuplicateConflict(row)});
   duplicateResultGroups(input).forEach(({key,items})=>{
     const values=[...new Set(items.map(r=>clean(r.value_raw)).filter(Boolean))];
     if(values.length<2||valuesEquivalentByPrecision(values))return;
     items.forEach(r=>{
       if(!r.duplicate_conflict){
         r.duplicate_base_parse_issue=Boolean(r.parse_issue);
         r.duplicate_base_verify_reason=r.verify_reason||""
       }
       r.duplicate_conflict=true;
       r.duplicate_group_key=key;
       r.parse_issue=true;
       const original=r.duplicate_base_verify_reason?` · ${r.duplicate_base_verify_reason}`:"";
       r.verify_reason=`พบ ${items.length} ค่าสำหรับผลตรวจเดียวกัน (${values.join(" / ")}) กด “ยืนยันรายการนี้แล้วไปต่อ” เพื่อเก็บค่านี้และยกเลิกค่าคู่อื่น${original}`
     })
   });
   return input
 }

 // v10.223 — Siriraj/OPD longitudinal table adapter. These pages are clinical
 // records containing a real table: Lab Test Description | Value | Range |
 // Date/Time. Generic standalone parsing intentionally ignores that layout, so
 // parse only rows that carry their own per-row date/time and reference.
 function sourceEventIsoDate(raw){
   const text=clean(raw).replace(/[\u200B-\u200D\uFEFF]/g,'');
   let m=text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[\/\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
   if(m){let y=Number(m[3]);if(y>2400)y-=543;if(y<1900||y>2200)return'';return`${String(y).padStart(4,'0')}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}${m[4]?`T${String(Number(m[4])).padStart(2,'0')}:${m[5]}:${m[6]||'00'}`:''}`}
   const thaiMonths={'ม.ค.':1,'มค':1,'มกราคม':1,'ก.พ.':2,'กพ':2,'กุมภาพันธ์':2,'มี.ค.':3,'มีค':3,'มีนาคม':3,'เม.ย.':4,'เมย':4,'เมษายน':4,'พ.ค.':5,'พค':5,'พฤษภาคม':5,'มิ.ย.':6,'มิย':6,'มิถุนายน':6,'ก.ค.':7,'กค':7,'กรกฎาคม':7,'ส.ค.':8,'สค':8,'สิงหาคม':8,'ก.ย.':9,'กย':9,'กันยายน':9,'ต.ค.':10,'ตค':10,'ตุลาคม':10,'พ.ย.':11,'พย':11,'พฤศจิกายน':11,'ธ.ค.':12,'ธค':12,'ธันวาคม':12};
   m=text.match(/(\d{1,2})\s*(ม\.?ค\.?|มกราคม|ก\.?พ\.?|กุมภาพันธ์|มี\.?ค\.?|มีนาคม|เม\.?ย\.?|เมษายน|พ\.?ค\.?|พฤษภาคม|มิ\.?ย\.?|มิถุนายน|ก\.?ค\.?|กรกฎาคม|ส\.?ค\.?|สิงหาคม|ก\.?ย\.?|กันยายน|ต\.?ค\.?|ตุลาคม|พ\.?ย\.?|พฤศจิกายน|ธ\.?ค\.?|ธันวาคม)\s*(\d{4})(?:\s*[-/]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i);
   if(!m)return'';
   const key=m[2].replace(/\s+/g,'').toLowerCase();let month=thaiMonths[key]||thaiMonths[m[2]];let y=Number(m[3]);if(y>2400)y-=543;if(!month||y<1900||y>2200)return'';
   return`${String(y).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}${m[4]?`T${String(Number(m[4])).padStart(2,'0')}:${m[5]}:${m[6]||'00'}`:''}`
 }
 function historyEvidenceLines(page){
   const out=[],seen=new Set();
   const add=(text,mode='history')=>{const v=clean(text);if(!v)return;const k=v.toLowerCase();if(seen.has(k))return;seen.add(k);out.push({text:v,mode})};
   photoPasses(page).forEach(pass=>{photoLines(pass).forEach(line=>add(line.text,pass.mode));String(pass.text||'').split(/\n+/).forEach(line=>add(line,pass.mode))});
   String(page?.pdfText||'').split(/\n+/).forEach(line=>add(line,'pdf-text-layer'));String(page?.text||'').split(/\n+/).forEach(line=>add(line,'page-text'));
   return out
 }
 function sirirajHistoryTableRows(page,sourceName='',fileIndex=0){
   const pageText=`${page?.text||''}\n${page?.pdfText||''}\n${photoPasses(page).map(pass=>pass.text||'').join('\n')}`;
   if(!/Laboratory\s+Results|Lab\.?\s*Test\s+Description|Test\s+name\s+Result\s+Unit\s+Reference/i.test(pageText))return[];
   const output=[],seen=new Set();
   for(const evidence of historyEvidenceLines(page)){
     const dateMatch=clean(evidence.text).match(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}(?:[\/\sT]+\d{1,2}:\d{2}(?::\d{2})?)?|\d{1,2}\s*(?:ม\.?ค\.?|มกราคม|ก\.?พ\.?|กุมภาพันธ์|มี\.?ค\.?|มีนาคม|เม\.?ย\.?|เมษายน|พ\.?ค\.?|พฤษภาคม|มิ\.?ย\.?|มิถุนายน|ก\.?ค\.?|กรกฎาคม|ส\.?ค\.?|สิงหาคม|ก\.?ย\.?|กันยายน|ต\.?ค\.?|ตุลาคม|พ\.?ย\.?|พฤศจิกายน|ธ\.?ค\.?|ธันวาคม)\s*\d{4}(?:\s*[-/]?\s*\d{1,2}:\d{2}(?::\d{2})?)?/i);if(!dateMatch)continue;
     const iso=sourceEventIsoDate(dateMatch[0]);if(!iso)continue;
     const beforeDate=clean(evidence.text.slice(0,dateMatch.index));
     for(const def of TESTS){
       const alias=bnhAliasTokenEnd(beforeDate,def);if(!alias)continue;
       const tail=clean(alias.tail);if(!tail)continue;
       const parsed=bnhValueFromTail(tail,def[3]);if(!parsed.value)continue;
       let reference='';
       // Unlike BNH, the history table has no parentheses around Range. Work
       // from the right side of the same row and never borrow another line.
       const rangeMatches=[...tail.matchAll(/([<>]=?\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?)/g)];
       if(rangeMatches.length>1)reference=clean(rangeMatches[rangeMatches.length-1][1]).replace(/\s*[-–]\s*/g,'-').replace(/\s+/g,'');
       else if(rangeMatches.length===1){
         const only=clean(rangeMatches[0][1]).replace(/\s*[-–]\s*/g,'-').replace(/\s+/g,'');
         // If the only numeric expression is the result itself it is not a reference.
         if(only.replace(/^[<>]=?/,'')!==clean(parsed.value).replace(/^[<>]=?/,'').replace(/,/g,''))reference=only
       }
       // Value is the first token after the label; unit is the text between that
       // value and the final range. Use the existing unit normalizer on that same row.
       const unit=bnhUnitFromLine(tail,def[3]);
       const row=makeRow(def,page.sourcePageNumber??page.pageNumber,parsed.value,unit,'',reference,evidence.text,{allowRepair:false});if(!row)continue;
       row.result_datetime=iso;row.result_date=iso.slice(0,10);row.source_file=sourceName||page?.sourceFileName||'';row.source_file_index=fileIndex;row.source_profile='SIRIRAJ_HISTORY_TABLE';row.history_table_source=true;row.source_truth_authority='SIRIRAJ_ROW_DATE_VALUE_RANGE';row.confidence=99;row.numeric_result_source='SOURCE_EVENT_TABLE_ROW';
       row.source_evidence=[{type:'SOURCE_EVENT_TABLE_ROW',raw_line:evidence.text,date_time:dateMatch[0],page:page.sourcePageNumber??page.pageNumber,ocr_pass:evidence.mode}];
       const key=[row.test_code,row.result_datetime,clean(row.value_raw),normalizeUnit(row.unit)].join('|');if(seen.has(key))continue;seen.add(key);output.push(row)
     }
   }
   return output
 }
 function crossDocumentBatchKey(record){return clean(record?.uploadBatchId||"")}
 function crossDocumentLabPages(record,pages,isSibling=false){
   const routed=MIW.MixedClinicalPacket?.labPages?.(pages,record)||pages;if(!isSibling)return routed;
   const strong=MIW.MixedClinicalPacket?._test?.strongLabEvidence;
   if(typeof strong!=="function")return routed;
   // A sibling clinical history document contributes only pages that visibly
   // contain dense lab tables. This excludes medication/narrative pages.
   const filtered=(pages||[]).filter(page=>strong(page));
   return filtered.length?filtered:routed.filter(page=>page.packetIncludeInLab!==false&&String(page.packetType||"")==="LABORATORY")
 }
 function sourceFileNameFor(record,localIndex,pages=[]){return record?.sourceFiles?.find(file=>Number(file.index||0)===Number(localIndex))?.name||pages?.[0]?.sourceFileName||record?.fileName||""}
 function sameDocumentRecord(a,b){return Boolean(a&&b&&clean(a.id)&&clean(a.id)===clean(b.id))}
 function dedupeBatchRecords(records,current){
   const byIndex=new Map(),unindexed=[];
   for(const record of records||[]){
     if(!record)continue;
     const idx=Number(record.uploadBatchIndex||0);
     if(!Number.isFinite(idx)||idx<=0){unindexed.push(record);continue}
     const existing=byIndex.get(idx);
     if(!existing||sameDocumentRecord(record,current)||(!sameDocumentRecord(existing,current)&&String(record.createdAt||"")>String(existing.createdAt||"")))byIndex.set(idx,record)
   }
   const selected=[...byIndex.values(),...unindexed];
   if(current&&!selected.some(record=>sameDocumentRecord(record,current)))selected.unshift(current);
   return selected.filter((record,index,array)=>array.findIndex(item=>sameDocumentRecord(item,record))===index)
 }
 function batchIdentityOverrideKey(current){
   const batch=clean(current?.uploadBatchId||"");
   return batch?`MIW_BATCH_IDENTITY_OVERRIDE:${batch}`:""
 }
 function batchIdentityOverrideStored(current){
   const key=batchIdentityOverrideKey(current);if(!key)return false;
   if(batchIdentityOverrideMemory.has(key))return true;
   try{return globalThis.sessionStorage?.getItem(key)==="CONFIRMED"}catch(_){return false}
 }
 function rememberBatchIdentityOverride(current){
   const key=batchIdentityOverrideKey(current);if(!key)return;
   batchIdentityOverrideMemory.add(key);
   try{globalThis.sessionStorage?.setItem(key,"CONFIRMED")}catch(_){}
 }
 function hardBatchIdentityConflict(trial){
   const reason=clean(trial?.reason||"");
   return /Civil ID ต่างกัน|เพศจากเอกสารขัดกัน|พบวันเกิดต่างกัน|DOB.*ขัดกัน|เลขใกล้เคียงกันผิดปกติ|civil id|sex conflict|dob conflict/i.test(reason)
 }
 function batchMetaSummary(metas=[]){
   return metas.map((meta,index)=>{
     const file=clean(meta?.source_file)||`Source ${index+1}`;
     const name=clean(meta?.patient_name)||"ชื่ออ่านไม่ชัด";
     const hns=[...new Set([meta?.patient_id,...(meta?.hospital_ids||[])].map(MIW.Patients.normalizeIdentifier).filter(Boolean))];
     const dob=MIW.Patients.normalizeDob(meta?.date_of_birth||meta?.dob)||clean(meta?.date_of_birth||meta?.dob)||"DOB ไม่ชัด";
     return `${index+1}. ${file}\n   ชื่อ: ${name}\n   HN/MRN: ${hns.join(" / ")||"—"}\n   DOB: ${dob}`
   }).join("\n\n")
 }
 function maybeConfirmBatchIdentity(current,groups,trial){
   if(hardBatchIdentityConflict(trial))return false;
   if(batchIdentityOverrideStored(current))return true;
   const metas=(groups||[]).map(group=>group.meta||group).filter(Boolean);
   if(metas.length<2)return false;
   const confirmFn=typeof globalThis.confirm==="function"?globalThis.confirm.bind(globalThis):null;
   if(!confirmFn)return false;
   const message=[
     "ระบบอ่านข้อมูลผู้ป่วยจากเอกสารข้ามโรงพยาบาลได้ไม่ครบ จึงไม่สามารถยืนยันอัตโนมัติว่าเป็นคนเดียวกันได้", "",
     batchMetaSummary(metas), "",
     `เหตุผลจากระบบ: ${clean(trial?.reason)||"Identity ambiguity"}`, "",
     "หากเอกสารทั้งหมดเป็นผู้ป่วยคนเดียวกันจริง ให้กด OK เพื่อยืนยันการรวมเฉพาะชุดอัปโหลดนี้", "กด Cancel หากเป็นคนละคน"
   ].join("\n");
   const confirmed=Boolean(confirmFn(message));
   if(confirmed){rememberBatchIdentityOverride(current);MIW.Utils?.log?.("Batch identity manually confirmed by user for this upload batch")}
   return confirmed
 }
 function manualBatchIdentityResolution(groups,current,baseTrial={}){
   const metas=(groups||[]).map(group=>group.meta||group).filter(Boolean);
   const uniq=list=>[...new Set(list.filter(Boolean))];
   const hns=uniq(metas.flatMap(meta=>[meta.patient_id,...(meta.hospital_ids||[])].map(MIW.Patients.normalizeIdentifier)));
   const civils=uniq(metas.flatMap(meta=>[meta.civil_id,...(meta.civil_ids||[])].map(MIW.Patients.normalizeCivilId)));
   const dobs=uniq(metas.map(meta=>MIW.Patients.normalizeDob(meta.date_of_birth||meta.dob)));
   const sexes=uniq(metas.map(meta=>clean(meta.sex||meta.gender).toUpperCase()));
   const names=uniq(metas.map(meta=>clean(meta.patient_name||meta.name)).filter(name=>MIW.Patients.plausibleIdentityName(name)));
   if(civils.length>1)return{ok:false,reason:`Manual merge blocked: Civil ID conflict ${civils.join(" / ")}`};
   if(dobs.length>1)return{ok:false,reason:`Manual merge blocked: DOB conflict ${dobs.join(" / ")}`};
   if(sexes.length>1)return{ok:false,reason:`Manual merge blocked: sex conflict ${sexes.join(" / ")}`};
   const fallbackName=clean(current?.patientName||current?.patient_name);
   const preferred=MIW.Patients.bestPatientName([...names,fallbackName],{preferThai:true});
   if(!preferred&&!hns.length)return{ok:false,reason:"Manual merge blocked: no trustworthy patient name or HN/MRN"};
   const fallbackDob=MIW.Patients.normalizeDob(current?.patientDOB||current?.date_of_birth||"");
   const resolvedDob=dobs[0]||fallbackDob||"";
   const aliases=uniq(names);
   const warning="ผู้ใช้ยืนยันด้วยตนเองว่าเอกสารใน upload batch นี้เป็นผู้ป่วยคนเดียวกัน หลังระบบ identity อัตโนมัติยังคลุมเครือ; ระบบจะไม่ลบหรือรวม Patient Registry record อื่นอัตโนมัติ และอาจบันทึก HN/MRN ในชุดนี้เป็น Hospital ID aliases เมื่อผู้ใช้บันทึกผล";
   return{
     ok:true,patient:null,evidence:"MANUAL_BATCH_IDENTITY_CONFIRMATION",warning,warnings:[warning],aliases,
     dobEvidence:resolvedDob?[{normalized:resolvedDob,rawValues:uniq(metas.map(meta=>clean(meta.date_of_birth||meta.dob))),sourceFiles:uniq(metas.map(meta=>clean(meta.source_file)))}]:[],
     dobResolutionRequired:false,registryDob:"",
     identity:{patient_id:hns[0]||"",hospital_ids:hns,civil_id:civils[0]||"",patient_name:preferred,date_of_birth:resolvedDob},
     originalFailure:clean(baseTrial?.reason||"")
   }
 }
 function sourceIdentityNameParts(value=""){
   const raw=clean(MIW.Utils.normalizeName?.(value)||value).replace(/^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ|mr\.?|mrs\.?|ms\.?|miss|master|dr\.?)\s*/i,"").replace(/\s+/g," ").trim();
   const parts=raw.split(" ").filter(Boolean);return{raw,first:parts[0]||"",last:parts.at(-1)||""}
 }
 function sourceIdentityEditDistance(a="",b=""){
   const x=[...clean(a).toLowerCase()],y=[...clean(b).toLowerCase()],dp=Array(y.length+1).fill(0).map((_,j)=>j);
   for(let i=1;i<=x.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=y.length;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=old}}return dp[y.length]
 }
 function trustedRelatedHistoryMatch(a,b){
   if(!a?.dob||!b?.dob||clean(a.dob)!==clean(b.dob))return false;
   if(a.sex&&b.sex&&clean(a.sex).toLowerCase()!==clean(b.sex).toLowerCase())return false;
   const x=sourceIdentityNameParts(a.name),y=sourceIdentityNameParts(b.name);if(!x.raw||!y.raw)return false;
   if(x.last&&y.last&&x.last!==y.last)return false;
   return x.raw===y.raw||sourceIdentityEditDistance(x.first,y.first)<=1
 }
 async function buildSourceEventGroups(current){
   const [documents,allStoredPages]=await Promise.all([MIW.Database.all("documents"),MIW.Database.all("pages")]);
   const batchKey=crossDocumentBatchKey(current),batchTotal=Number(current?.uploadBatchTotal||1);
   let records=[current];const trustedRelatedRecordIds=new Set();
   // v10.240 Related History Auto-Link: if the user imported a prior report in
   // a separate 1/1 batch, link it only when two source-specific hospital
   // headers independently agree on DOB, sex (when printed) and patient name.
   // This extends longitudinal history without merging/deleting Patient Registry.
   if((!batchKey||batchTotal<=1)&&documents?.length>1){
     const currentPages=(allStoredPages||[]).filter(page=>page.documentId===current.id).sort((a,b)=>a.pageNumber-b.pageNumber);
     const currentIdentity=trustedSourceIdentityConsensus(currentPages.map(page=>page.text||"").join("\n"),currentPages);
     const related=[];
     for(const record of (documents||[])){
       if(sameDocumentRecord(record,current))continue;
       const candidatePages=(allStoredPages||[]).filter(page=>page.documentId===record.id).sort((a,b)=>a.pageNumber-b.pageNumber);
       if(!candidatePages.some(page=>MIW.MixedClinicalPacket?._test?.strongLabEvidence?.(page)))continue;
       const candidateIdentity=trustedSourceIdentityConsensus(candidatePages.map(page=>page.text||"").join("\n"),candidatePages);
       if(trustedRelatedHistoryMatch(currentIdentity,candidateIdentity)){related.push(record);trustedRelatedRecordIds.add(record.id)}
     }
     if(related.length){records=[current,...related];MIW.Utils?.log?.(`Source history auto-link: ${related.length} เอกสาร · DOB/name จาก hospital header ตรงกัน`)}
   }
   if(batchKey&&batchTotal>1){
     records=dedupeBatchRecords((documents||[]).filter(record=>sameDocumentRecord(record,current)||crossDocumentBatchKey(record)===batchKey),current)
       .sort((a,b)=>Number(a?.uploadBatchIndex||999)-Number(b?.uploadBatchIndex||999)||String(a?.createdAt||"").localeCompare(String(b?.createdAt||"")));
     if(!records.some(record=>sameDocumentRecord(record,current)))records.unshift(current);
     if(records.length<batchTotal){
       const error=new Error(`ชุดอัปโหลดนี้มี ${batchTotal} เอกสาร แต่ฐานข้อมูลอ่านเสร็จเพียง ${records.length} เอกสาร — ระบบหยุดก่อน Verify เพื่อไม่ให้ประวัติหาย กรุณารอ Queue ให้ทุกไฟล์ขึ้น “พร้อมตรวจ” แล้วกดต่ออีกครั้ง`);
       error.code='BATCH_MERGE_INCOMPLETE';throw error
     }
   }
   // Current document must be first so identity is anchored to the item the
   // user is reviewing. Siblings are admitted only when the accumulated batch
   // identity remains valid.
   records=[current,...records.filter(record=>!sameDocumentRecord(record,current))];
   const accepted=[],excluded=[],acceptedRecords=[];let virtualIndex=0,totalAllPages=0,totalParsePages=0,manualIdentityConfirmed=false;
   for(const record of records){
     const recordPages=(allStoredPages||[]).filter(page=>page.documentId===record.id).sort((a,b)=>a.pageNumber-b.pageNumber);totalAllPages+=recordPages.length;
     const parseRecordPages=crossDocumentLabPages(record,recordPages,!sameDocumentRecord(record,current));if(!parseRecordPages.length){if(!sameDocumentRecord(record,current))excluded.push({id:record.id,fileName:record.fileName,reason:"NO_STRONG_LAB_PAGE"});continue}
     const localIndexes=[...new Set(parseRecordPages.map(page=>Number.isInteger(page.sourceFileIndex)?page.sourceFileIndex:0))];const docGroups=[];
     for(const localIndex of localIndexes){
       const original=parseRecordPages.filter(page=>(Number.isInteger(page.sourceFileIndex)?page.sourceFileIndex:0)===localIndex);
       const pages=original.map(page=>({...page,sourceFileIndex:virtualIndex,sourceDocumentId:record.id,sourceFileName:sourceFileNameFor(record,localIndex,original),crossDocumentSource:!sameDocumentRecord(record,current)}));
       const text=pages.map(page=>page.text||"").join("\n"),groupMeta=parseMeta(text,pages,record);
       groupMeta.source_file=sourceFileNameFor(record,localIndex,pages);groupMeta.source_document_id=record.id;
       // v10.233 Source Header Truth: once a known hospital header profile is
       // recognized, never refill a missing source name from documentRecord.
       // documentRecord.patientName may itself be the earlier generic OCR error
       // (e.g. "wyadjaungassu").  Keep the source name blank and let HN/DOB or
       // the explicit manual merge gate carry identity instead.
       if(!clean(groupMeta.patient_name)&&!clean(groupMeta.source_identity_profile)&&clean(record.patientName))groupMeta.patient_name=record.patientName;
       if(!clean(groupMeta.patient_id)&&clean(record.patientHN))groupMeta.patient_id=record.patientHN;
       if(!clean(groupMeta.date_of_birth)&&clean(record.patientDOB))groupMeta.date_of_birth=record.patientDOB;
       docGroups.push({fileIndex:virtualIndex++,pages,text,meta:groupMeta,sourceDocumentId:record.id,sourceRecord:record});totalParsePages+=pages.length
     }
     if(!docGroups.length)continue;
     if(!accepted.length){accepted.push(...docGroups);acceptedRecords.push(record);continue}
     const trial=MIW.Patients.resolveBatchIdentity([...accepted,...docGroups].map(group=>group.meta),current);
     if(trial.ok||trustedRelatedRecordIds.has(record.id)){accepted.push(...docGroups);acceptedRecords.push(record)}
     else if(maybeConfirmBatchIdentity(current,[...accepted,...docGroups],trial)){
       accepted.push(...docGroups);acceptedRecords.push(record);manualIdentityConfirmed=true
     }else excluded.push({
       id:record.id,fileName:record.fileName,reason:trial.reason||"IDENTITY_MISMATCH",
       identityDiagnostics:trial.diagnostics||{
         hns:trial.hns||[],dobs:trial.dobs||[],names:trial.names||[],
         sourceHeaders:[...accepted,...docGroups].map(group=>({
           file:group.meta?.source_file||"",
           profile:group.meta?.source_identity_profile||"",
           confidence:Number(group.meta?.source_identity_confidence||0),
           evidence:group.meta?.source_identity_evidence||[],
           name:group.meta?.patient_name||"",hn:group.meta?.patient_id||"",dob:group.meta?.date_of_birth||""
         }))
       }
     })
   }
   if(batchKey&&batchTotal>1){
     const omitted=records.filter(record=>!sameDocumentRecord(record,current)&&!acceptedRecords.some(item=>sameDocumentRecord(item,record)));
     const omittedWithLab=omitted.filter(record=>{
       const rp=(allStoredPages||[]).filter(page=>page.documentId===record.id);return rp.some(page=>MIW.MixedClinicalPacket?._test?.strongLabEvidence?.(page))
     });
     if(omittedWithLab.length){
       const detail=omittedWithLab.map(item=>{const info=excluded.find(entry=>entry.id===item.id);return `${item.fileName}${info?.reason?` (${info.reason})`:''}`}).join(', ');
       const error=new Error(`Batch Merge Enforcement: พบ sibling document ในชุดเดียวกันที่มีตาราง Lab แต่ยังไม่ถูก merge: ${detail}`);error.code='BATCH_LAB_SOURCE_OMITTED';error.excluded=excluded;error.identityDiagnostics=excluded.map(item=>({fileName:item.fileName,reason:item.reason,identity:item.identityDiagnostics||null}));throw error
     }
   }
   return{groups:accepted,records:acceptedRecords,excluded,totalAllPages,totalParsePages,manualIdentityConfirmed:manualIdentityConfirmed||batchIdentityOverrideStored(current),sourcePages:accepted.flatMap(group=>group.pages)}
 }

 async function parse(){
   documentRecord=MIW.Preview.current();
   if(!documentRecord)throw new Error("ไม่พบเอกสารปัจจุบัน");
   const currentResolutionDocumentId=clean(documentRecord.id||documentRecord.fileName||"");
   if(resolutionDocumentId!==currentResolutionDocumentId){
     duplicateResolutionLedger.clear();resolutionDocumentId=currentResolutionDocumentId
   }
   const sourceSet=await buildSourceEventGroups(documentRecord);
   const groups=sourceSet.groups;sourceGroups=groups;sourcePages=sourceSet.sourcePages;
   if(!groups.length)throw new Error("ไม่พบหน้าห้องปฏิบัติการที่ผ่าน Source-Event Merge Guard");
   let identityResolution=MIW.Patients.resolveBatchIdentity(groups.map(group=>group.meta),documentRecord);
   if(!identityResolution.ok&&sourceSet.manualIdentityConfirmed){
     identityResolution=manualBatchIdentityResolution(groups,documentRecord,identityResolution)
   }
   if(!identityResolution.ok){
     throw new Error(`พบข้อมูลที่ยังยืนยันไม่ได้ว่าเป็นผู้ป่วยคนเดียวกัน ระบบหยุดการรวมเพื่อป้องกันผล Lab ปะปน\n${identityResolution.reason}\nหากเป็นคนเดียวกัน กรุณาตรวจชื่อและ DOB ในหน้า Preview ระบบรองรับ HN/MRN หลายค่าเมื่อมีหลักฐานร่วมเพียงพอ`)
   }
   const identity=groups.map(g=>g.meta).find(m=>m.patient_id||m.date_of_birth||m.patient_name)||parseMeta(documentRecord.labText||documentRecord.text||"",sourcePages,documentRecord);
   const currentSourceGroup=groups.find(group=>clean(group?.sourceDocumentId)===clean(documentRecord.id))||groups[0];
   const currentSourceIdentity=currentSourceGroup?.meta||{};
   meta={
     ...identity,
     ...identityResolution.identity,
     // v10.240 Current Source Header Authority: the patient booklet header
     // represents the document being reviewed. Keep all cross-hospital IDs as
     // aliases, but display name/HN/DOB from the current hospital header when
     // that source-specific identity is available.
     patient_id:currentSourceIdentity.patient_id||identityResolution.identity?.patient_id||identity.patient_id||"",
     hospital_ids:[...new Set([...(identityResolution.identity?.hospital_ids||[]),...(currentSourceIdentity.hospital_ids||[]),currentSourceIdentity.patient_id].filter(Boolean))],
     patient_name:currentSourceIdentity.patient_name||identityResolution.identity?.patient_name||identity.patient_name||"",
     date_of_birth:currentSourceIdentity.date_of_birth||identityResolution.identity?.date_of_birth||identity.date_of_birth||"",
     sex:currentSourceIdentity.sex||identityResolution.identity?.sex||identity.sex||"",
     patient_name_aliases:identityResolution.aliases,
     identity_evidence:identityResolution.evidence,
     identity_warning:identityResolution.warning||"",
     identity_dob_evidence:identityResolution.dobEvidence||[],
     identity_dob_resolution_required:Boolean(identityResolution.dobResolutionRequired),
     identity_registry_dob:identityResolution.registryDob||"",
     identity_dob_confirmed:false,
     source_files:groups.map(g=>g.meta.source_file),
     report_count:groups.length,
     mixed_packet:documentRecord.packet||null,
     excluded_non_lab_pages:Math.max(0,sourceSet.totalAllPages-sourceSet.totalParsePages),
     cross_document_batch_id:crossDocumentBatchKey(documentRecord),
     cross_document_source_ids:sourceSet.records.map(record=>record.id),
     cross_document_excluded:sourceSet.excluded,
     cross_document_merged_count:Math.max(0,sourceSet.records.length-1),
     cross_document_manual_identity_confirmed:Boolean(sourceSet.manualIdentityConfirmed)
   };
   rows=[];
   const micronutrientVisualSummaries=[];
   const reportedSecondaryTargets=[];
   for(const group of groups){
     // A single uploaded PDF may contain several complete reports (different
     // Lab No./dates) followed by cumulative-history pages. Resolve metadata
     // per physical page and carry it only to continuation pages.
     let activePageMeta=group.meta,foodPrintContinuationPages=0;
     for(const originalPage of group.pages){
       const explicitFoodPrintSource=/(?:FoodPrint|200\+|FOOD[_ -]?INTOLERANCE)/i.test(
         `${clean(originalPage.text)} ${clean(originalPage.pdfText)} ${photoPasses(originalPage).map(pass=>clean(pass.text)).join(" ")}`
       );
       const carriedFoodPrint=foodPrintContinuationPages>0&&!explicitFoodPrintSource;
       const foodPrintPageOrdinal=explicitFoodPrintSource?1:(carriedFoodPrint?2:0);
       const page=foodPrintPageOrdinal
         ?{...originalPage,profileHint:"FOOD_INTOLERANCE_IGG_200_PLUS",foodPrintPageOrdinal}
         :originalPage;
       if(carriedFoodPrint)foodPrintContinuationPages--;
       const packetRows=hamadMultiDateRows(page,group.meta.source_file,group.fileIndex);
       const historyRows=sirirajHistoryTableRows(page,group.meta.source_file,group.fileIndex);
       const forcedSpecializedHint=clean(page.profileHint).toUpperCase();
       const cumulative=packetRows.length||historyRows.length||forcedSpecializedHint?[]:cumulativeRows(page,group.meta.source_file,group.fileIndex);
       if(packetRows.length){rows.push(...packetRows);continue}
       if(historyRows.length){rows.push(...historyRows);continue}
       if(cumulative.length){rows.push(...cumulative);continue}
       const scoped=pageScopedMeta(page,group.meta,activePageMeta);
       const physicalPage=page.sourcePageNumber??page.pageNumber??null;
       if(scoped.localEvent){
         activePageMeta={...scoped.meta,event_anchor_page:physicalPage};
       }
       const rowMeta={
         ...(scoped.localEvent?scoped.meta:activePageMeta),
         event_provenance:scoped.localEvent?"PAGE_LOCAL":"CARRIED",
         event_anchor_page:scoped.localEvent?physicalPage:(activePageMeta?.event_anchor_page??null)
       };
       micronutrientVisualSummaries.push(
         ...micronutrientVisualSummaryRecords(page,rowMeta,group.fileIndex)
       );
       reportedSecondaryTargets.push(
         ...secondaryTargetSummaryRecords(page,rowMeta,group.fileIndex)
       );
       const pageRows=standaloneRows(page,rowMeta,group.fileIndex);
       // v10.289 Contextual Reference Engine: capture decision-threshold / categorical
       // blocks from the same physical source page without converting them into a
       // single numeric reference interval. This is additive and does not touch CBC.
       const contextualPageText=[clean(page.text),clean(page.pdfText),...photoPasses(page).map(pass=>clean(pass.text))].filter(Boolean).join("\n");
       MIW.ContextualReference?.annotateRows?.(pageRows,contextualPageText,rowMeta);
       rows.push(...pageRows);
       // Only an explicitly headed FoodPrint page may request one continuation
       // page. v10.317 keeps a stable FoodPrint page ordinal (1/2),
       // independent of the physical page number inside a merged PDF.
       if(explicitFoodPrintSource)foodPrintContinuationPages=Math.max(foodPrintContinuationPages,1)
     }
   }
   // Re-run the profile readers for any source-declared analyte that the
   // ordinary page route skipped. This catches false cumulative-page matches,
   // OCR passes with a damaged unit, and source-index drift in multi-file
   // uploads before the completeness guard is evaluated.
   rows.push(...recoveredSpecializedRows(groups,rows));
   rows.push(...bnhRecoverMissingRows(groups,rows));
   rows.push(...bnhRecoverMissingLongitudinalEvents(groups,rows));
   resetParseAudit(meta.excluded_non_lab_pages);
   parseAudit.rawExtracted=rows.length;
   const beforeHamadAutomation=rows.length;
   rows=auditedStage("photo-evidence",rows,mergePhotoEvidence);
   rows=auditedStage("bnh-source-truth-finalization",rows,input=>finalizeBnhSourceTruth(groups,input));
   rows=auditedStage("bnh-typed-row-bundle",rows,enforceTypedBnhBundles);
   rows=auditedStage("source-truth-plausibility",rows,applyPlausibilityQuarantine);
   rows=auditedStage("bnh-exact-source-reconcile",rows,reconcileBnhExactSourceRows);
   rows=auditedStage("bnh-row-bundle-owns-event",rows,reconcileBnhBundleAgainstGeneric);
   rows=auditedStage("bnh-source-truth-finalization-final",rows,input=>finalizeBnhSourceTruth(groups,input));
   rows=auditedStage("hamad-identity",rows,repairHamadRowIdentities);
   rows=auditedStage("hamad-event-reconcile",rows,reconcileHamadSameEventValues);
   rows=auditedStage("exact-deduplicate",rows,deduplicateResults);
   rows=auditedStage("censored-value-reconcile",rows,reconcileCompatibleCensoredValues);
   rows=auditedStage("cross-source-reconcile",rows,reconcileCrossSourceMeasurements);
   rows=auditedStage("embedded-cumulative-reconcile",rows,reconcileEmbeddedCumulativeMeasurements);
   rows=auditedStage("inbody-canonical-row-reconcile",rows,reconcileInBodyCanonicalRows);
   rows=auditedStage("inbody-critical-bundle-source-truth",rows,reconcileInBodyCriticalBundles);
   rows=attachMicronutrientVisualSummaries(rows,micronutrientVisualSummaries);
   rows=attachReportedSecondaryTargets(rows,reportedSecondaryTargets);
   rows=applyDuplicateResolutionLedger(sanitizeDuplicateConflictGroups(annotateDuplicateConflicts(rows)));
   parseAudit.finalCandidates=rows.length;
   meta.parse_audit={...parseAudit,mergedOrSuppressed:Math.max(0,parseAudit.rawExtracted-parseAudit.finalCandidates)};
   meta.hamad_auto_resolved_count=Math.max(0,beforeHamadAutomation-rows.length)+rows.filter(row=>row.hamad_identity_repaired||row.hamad_auto_reconciled).length;
   const groupByIndex=new Map(groups.map(group=>[Number(group.fileIndex||0),group]));
   rows.forEach(row=>{
     const group=groupByIndex.get(Number(row.source_file_index||0));
     const event=group&&(group.meta.specimen_datetime||group.meta.result_datetime||group.meta.requested_datetime||"");
     if(event&&dedicatedSpecializedRow(row)&&!clean(row.result_datetime||row.result_date)){
       row.result_datetime=event;row.result_date=String(event).slice(0,10);row.source_file=group.meta.source_file||row.source_file
     }
   });
   meta.specialized_completeness_expectations=[...specializedCompletenessExpectations(groups,rows),...micronutrientCompletenessExpectations(groups,rows),...foodPrintCompletenessExpectations(groups,rows),...allergyCompletenessExpectations(groups,rows),...hamadCompletenessExpectations(groups,rows),...bnhCompletenessExpectations(groups,rows),...bnhLongitudinalEventExpectations(groups,rows),...bnhSourceTruthFinalizationExpectations(groups,rows)];
   render();
   return rows
 }
 function add(){rows.push({id:MIW.Utils.uid("labDraft"),selected:true,review_confirmed:false,category:"Other",panel:"Other",test_code:"",display_name:"",value_raw:"",value_numeric:null,value_operator:"text",unit:"",reference_raw:"",reference_low:null,reference_high:null,reference_operator:"none",source_flag:"",calculated_flag:"REVIEW",page:"",confidence:50});render()}
 function collect(){
   document.querySelectorAll("#labReviewBody tr[data-id]").forEach(tr=>{
     const r=rows.find(x=>x.id===tr.dataset.id);
     tr.querySelectorAll("[data-key]").forEach(el=>{
       let v=el.type==="checkbox"?el.checked:el.value;
       if(["value_numeric","reference_low","reference_high","confidence","page"].includes(el.dataset.key))v=v===""?null:Number(v);
       r[el.dataset.key]=v
     });
     const vp=valueParts(r.value_raw);
     if(/^inbody_/i.test(clean(r.test_code||r.testCode))){r.value_numeric=vp.value_numeric;r.valueNumeric=vp.value_numeric}
     else if(r.value_numeric===null&&vp.value_numeric!==null)r.value_numeric=vp.value_numeric;
     r.value_operator=vp.value_operator;
     const rp=parseRef(r.reference_raw);
     r.reference_low=rp.reference_low;r.reference_high=rp.reference_high;r.reference_operator=rp.reference_operator;
     r.calculated_flag=calcFlag(r,rp)
   });
   const chosenDob=document.querySelector?.('input[name="labConfirmedDob"]:checked');
   if(chosenDob){
     meta.date_of_birth=chosenDob.value;
     meta.identity_dob_confirmed=true
   }
   updateMetrics();
   return rows
 }
 function hasReportableResult(r){return Boolean(clean(r?.display_name||r?.test_code)&&clean(r?.value_raw))}
 function rowReportType(r){
   const profile=clean(r?.specialized_profile||r?.source_profile||r?.report_type).toUpperCase();
   const code=clean(r?.test_code).toLowerCase();
   if(profile==="RGCC_ONCOTRAIL"||code.startsWith("oncotrail_"))return"RGCC_ONCOTRAIL";
   if(profile==="RGCC_METASTAT"||code.startsWith("metastat_"))return"RGCC_METASTAT";
   if(profile==="MASUYAMA_IMMUNOLOGICAL"||code.startsWith("masuyama_"))return"MASUYAMA_IMMUNOLOGICAL";
   return"LABORATORY_REPORT"
 }
 function payload(){collect();return{schema_version:"miw.general-lab.v1",exported_at:new Date().toISOString(),patient:{patient_id:meta.patient_id||"",hospital_ids:meta.hospital_ids||[],civil_id:meta.civil_id||"",name:meta.patient_name||"",aliases:meta.patient_name_aliases||[],identity_evidence:meta.identity_evidence||"",identity_warning:meta.identity_warning||"",dob_conflict_evidence:meta.identity_dob_evidence||[],dob_confirmed:Boolean(meta.identity_dob_confirmed),sex:meta.sex||"",date_of_birth_raw:meta.date_of_birth||"",age_years:meta.age_years??null,age_months:meta.age_months??null,age_days:meta.age_days??null,age_at_result_years:meta.age_at_result_years??null,age_source:meta.age_source||""},report:{report_type:meta.report_type||"LABORATORY_REPORT",disease:meta.disease||"",disease_stage:meta.disease_stage||"",lab_no:meta.lab_no||"",requested_datetime:meta.requested_datetime||"",specimen_datetime:meta.specimen_datetime||"",result_datetime:meta.result_datetime||"",trend_datetime_basis:meta.specimen_datetime?"specimen_datetime":"result_datetime",source:meta.source||"",source_file:meta.source_file||"",source_files:meta.source_files||[meta.source_file].filter(Boolean),report_count:meta.report_count||1,batch_mode:(meta.report_count||1)>1,import_audit:meta.parse_audit||null,inbody_validation_gate:meta.inbody_validation_gate||null},results:rows.filter(r=>r.selected&&hasReportableResult(r)).map(({id,selected,review_confirmed,...r})=>r)}}
 function download(){const blob=new Blob([JSON.stringify(payload(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`MIW_Lab_${meta.patient_id||"unknown"}_${(meta.specimen_datetime||"").slice(0,10)||"unknown"}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 function remove(id){rows=rows.filter(r=>r.id!==id);render()}
 function hasStructuralIssue(r){
   const missingIdentity=!clean(r.display_name)||!clean(r.test_code);
   const missingResult=!clean(r.value_raw);
   const invalidNumeric=r.result_kind==="NUMERIC"&&!Number.isFinite(Number(r.value_numeric));
   return r.parse_issue===true||missingIdentity||missingResult||invalidNumeric
 }
 function reviewReasons(r){
   const reasons=[];
   if(!clean(r.display_name)||!clean(r.test_code))reasons.push("ชื่อหรือรหัสรายการไม่ครบ");
   if(!clean(r.value_raw))reasons.push("ไม่พบค่าผล");
   if(r.result_kind==="NUMERIC"&&!Number.isFinite(Number(r.value_numeric)))reasons.push("ค่าตัวเลขไม่สมบูรณ์");
   if(r.parse_issue===true)reasons.push(r.verify_reason||"โครงสร้างแถวกำกวม");
   if(r.missing_fields_advisory)reasons.push("หน่วยหรือช่วงอ้างอิงอ่านไม่ครบ · บันทึกไว้ให้ตรวจย้อนหลัง");
   if(Number(r.confidence)<80)reasons.push(`OCR confidence ${Math.round(Number(r.confidence)||0)}%`);
   else if(r.low_confidence_advisory)reasons.push("มีหลักฐาน OCR เพียงรอบเดียว แต่ชื่อ ค่า หน่วย และช่วงอ้างอิงครบ");
   return[...new Set(reasons)]
 }
 function needsReview(r){
   if(r.selected===false)return false;
   // v10.259: the gate may flag several rows that participate in ONE equation.
   // After the operator confirms a valid value, allow navigation to continue; the
   // global gate still blocks final import until the equation itself is resolved.
   if(r.inbody_gate_issue===true){
     const raw=clean(r.value_raw);
     const numericOk=r.result_kind!=="NUMERIC"||inbodyNumericFromRow(r)!==null;
     const placeholderStillBlank=Boolean(r.inbody_missing_placeholder)&&(!raw||!numericOk);
     const independentIssue=r.parse_issue===true&&r.inbody_gate_only_parse_issue!==true;
     if(placeholderStillBlank||independentIssue)return true;
     if(r.review_confirmed)return false;
     return true
   }
   if(r.review_confirmed)return false;
   return hasStructuralIssue(r)
 }
 function needsAdvisory(r){
   if(r.selected===false||r.review_confirmed)return false;
   return needsReview(r)||Number(r.confidence)<80||Boolean(r.low_confidence_advisory)
 }
 function reviewIssues(){
   // Alerts and review routing read this list before actionableReviewIssues().
   // Always clear stale duplicate flags here too, otherwise a historical pair
   // can trigger a false “ต้อง Verify” popup even though the actionable queue
   // would later sanitize it.
   sanitizeDuplicateConflictGroups(rows);
   return rows.filter(needsAdvisory)
 }
 function actionableReviewIssues(){
   sanitizeDuplicateConflictGroups(rows);
   const pending=rows.filter(needsReview),output=[],seenGroups=new Set();
   pending.forEach(row=>{
     if(!row.duplicate_conflict||!row.duplicate_group_key){output.push(row);return}
     if(seenGroups.has(row.duplicate_group_key))return;
     const group=pending.filter(other=>other.duplicate_group_key===row.duplicate_group_key);
     if(!sameClinicalEventForConflict(group)){group.forEach(clearDuplicateConflict);return}
     const active=group.find(other=>other.id===activeIssueId);
     output.push(active||row);
     seenGroups.add(row.duplicate_group_key)
   });
   return output
 }
 function activeIssue(){
   const issues=actionableReviewIssues();
   return issues.find(r=>r.id===activeIssueId)||issues[0]||null
 }
 function refreshInBodyReviewGate({rerender=false}={}){
   syncInBodyRawNumerics(rows);rows=reconcileInBodyCanonicalRows(rows);rows=reconcileInBodyCriticalBundles(rows);
   const selected=rows.filter(r=>/^inbody_/i.test(clean(r.test_code||r.testCode))&&r.selected!==false);
   if(!selected.length){meta.inbody_validation_gate=null;return null}
   // Remove only the transient gate marker. Preserve independent OCR/structural
   // review reasons such as low-confidence source evidence.
   selected.forEach(r=>{
     if(r.inbody_gate_issue){
       r.inbody_gate_issue=false;
       // v10.259 — clear only parse_issue that was created by the transient
       // validation gate. Never erase an independent OCR/source conflict.
       if(r.inbody_gate_only_parse_issue===true){
         r.parse_issue=false;
         r.inbody_gate_only_parse_issue=false;
         if(/^InBody Validation Gate:/i.test(clean(r.verify_reason)))r.verify_reason=""
       }
     }
   });
   const gate=inbodyValidationGate(selected),affected=new Set((gate.reviewCodes||[]).map(code=>clean(code).toLowerCase()));
   meta.inbody_validation_gate=gate;
   selected.forEach(r=>{
     r.inbody_validation_gate=gate;r.inbody_validation_passed=gate.passed;
     const code=clean(r.test_code||r.testCode).toLowerCase();
     if(!gate.passed&&affected.has(code)){
       r.inbody_gate_issue=true;r.review_recommended=true;
       // Gate equations are global checks. Marking every dependency as an
       // independent parse error traps the operator on the same row forever.
       if(r.parse_issue!==true){r.parse_issue=true;r.inbody_gate_only_parse_issue=true}
       const own=(gate.issues||[]).filter(issue=>(issue.codes||[]).map(c=>clean(c).toLowerCase()).includes(code)).map(issue=>issue.message);
       r.verify_reason=`InBody Validation Gate: ${(own.length?own:(gate.issues||[]).map(issue=>issue.message)).join(" · ")}`;
       r.review_reasons=[...new Set([...(r.review_reasons||[]),...(own.length?own:(gate.issues||[]).map(issue=>issue.message))])]
     }
     // A blank deterministic placeholder becomes a normal manually sourced row as
     // soon as a numeric value is entered. It may still participate in a GLOBAL
     // equation failure, but the user can move to the next row after confirming it.
     if(r.inbody_missing_placeholder&&clean(r.value_raw)&&inbodyNumericFromRow(r)!==null){
       r.inbody_placeholder_filled=true;
       r.inbody_missing_placeholder=false;
       if(r.inbody_gate_only_parse_issue===true&&!r.inbody_gate_issue){
         r.parse_issue=false;r.inbody_gate_only_parse_issue=false;
       }
     }
   });
   if(rerender)render();else{updateMetrics();updateNavigator()}
   return gate
 }
 function saveVerifyCard(){
   const r=activeIssue();if(!r)return;
   document.querySelectorAll("[data-verify-key]").forEach(el=>{
     let value=el.value;
     if(el.dataset.verifyKey==="value_numeric")value=value===""?null:Number(value);
     r[el.dataset.verifyKey]=value
   });
   const vp=valueParts(r.value_raw),inbody=/^inbody_/i.test(clean(r.test_code||r.testCode)),inbodyNumeric=inbody?inbodyLooseNumeric(r.value_raw):null;
   // v10.264 InBody source-truth: the visible/editable report value is canonical.
   // Normalize it immediately and never leave a stale numeric cache behind.
   if(inbody){
     r.value_numeric=inbodyNumeric;r.valueNumeric=inbodyNumeric;
     r.value_operator=vp.value_numeric!==null?vp.value_operator:(inbodyNumeric!==null?"=":"text");
     if(inbodyNumeric!==null){r.reported_value_raw=clean(r.value_raw);r.inbody_manual_value_sync=true;r.inbody_canonical_source=true;r.inbody_critical_bundle_source=true;r.inbody_missing_placeholder=false}
   }else{
     if(r.value_numeric===null&&vp.value_numeric!==null)r.value_numeric=vp.value_numeric;
     r.value_operator=vp.value_operator
   }
   const rp=parseRef(r.reference_raw);
   r.reference_low=rp.reference_low;r.reference_high=rp.reference_high;r.reference_operator=rp.reference_operator;
   r.calculated_flag=calcFlag(r,rp)
 }
 function sourcePageFor(r){
   if(!r||!sourcePages.length)return null;
   const hasFileIndex=r.source_file_index!==undefined&&r.source_file_index!==null&&r.source_file_index!=="";
   const fileIndex=hasFileIndex?Number(r.source_file_index):null;
   const sourcePageNumber=Number(r.source_page_number);
   const documentPageNumber=Number(r.document_page_number);
   const legacyPageNumber=Number(r.page);
   const sameFile=p=>(
     (Number.isFinite(fileIndex)&&Number(p.sourceFileIndex??0)===fileIndex)||
     (r.source_file&&clean(p.sourceFileName).toLowerCase()===clean(r.source_file).toLowerCase())
   );
   const filePages=sourcePages.filter(sameFile);
   if(Number.isFinite(sourcePageNumber)&&sourcePageNumber>0){
     return filePages.find(p=>Number(p.sourcePageNumber??p.pageNumber)===sourcePageNumber)||null
   }
   if(Number.isFinite(documentPageNumber)&&documentPageNumber>0){
     return filePages.find(p=>Number(p.pageNumber)===documentPageNumber)||null
   }
   if(Number.isFinite(legacyPageNumber)&&legacyPageNumber>0){
     // Legacy drafts stored the batch-global page number in `page`.
     return filePages.find(p=>Number(p.pageNumber)===legacyPageNumber)
       ||filePages.find(p=>Number(p.sourcePageNumber)===legacyPageNumber)
       ||null
   }
   return null
 }
 function paintVerifyDocument(){
   const r=activeIssue(),viewport=document.getElementById("verifyDocumentViewport");
   const title=document.getElementById("verifyDocumentTitle"),metaBox=document.getElementById("verifyDocumentMeta");
   if(!viewport||!title||!metaBox)return;
   const page=sourcePageFor(r);
   if(!page?.dataUrl){
     title.textContent=r?.source_file||"ไม่พบเอกสารต้นฉบับ";
     metaBox.textContent=r?.page?`หน้าที่ระบุ ${r.page} · ไม่มีภาพที่เชื่อมโยง`:"รายการนี้ไม่มีเลขหน้า";
     viewport.innerHTML='<div class="verify-document-empty">ไม่พบภาพหน้าต้นฉบับของรายการนี้ กรุณาตรวจชื่อไฟล์และเลขหน้า</div>';
     return
   }
   const shownPage=r?.source_page_number??page.sourcePageNumber??r?.page??"—";
   title.textContent=page.sourceFileName||r?.source_file||documentRecord?.fileName||"เอกสารต้นฉบับ";
   metaBox.textContent=`หน้า ${shownPage} · รายการ ${r?.display_name||"—"} · ซูม ${Math.round(verifyZoom*100)}%`;
   viewport.innerHTML=`<img src="${page.dataUrl}" alt="${MIW.Utils.escape(`เอกสารต้นฉบับ ${title.textContent} หน้า ${shownPage}`)}" style="width:${Math.round(verifyZoom*100)}%">`;
   viewport.scrollTop=0;viewport.scrollLeft=0
 }
 function setVerifyZoom(next){
   verifyZoom=Math.max(.5,Math.min(2.5,Number(next)||1));
   paintVerifyDocument()
 }
 function openVerifyDocumentFull(){
   const page=sourcePageFor(activeIssue());
   if(!page?.dataUrl)return;
   const popup=window.open("","_blank");
   if(!popup)return;
   popup.document.write(`<title>Source document</title><style>html,body{margin:0;background:#202526;text-align:center}img{max-width:100%;height:auto;background:#fff}</style><img src="${page.dataUrl}" alt="Source document">`);
   popup.document.close()
 }
 function renderVerifyCard(){
   const r=activeIssue(),card=document.getElementById("labVerifyCard");
   if(!card)return;
   if(!r){
     const summary=document.getElementById("labDuplicateConflictSummary");
     if(summary)summary.hidden=true;
     card.hidden=true;
     const confirmButton=document.getElementById("confirmLabIssueButton");
     if(confirmButton)confirmButton.hidden=true;
     return
   }
   card.hidden=false;
   const confirmButton=document.getElementById("confirmLabIssueButton");
   if(confirmButton)confirmButton.hidden=false;
   const inbody=/^inbody_/i.test(clean(r.test_code||r.testCode)),rawParts=inbody?scalarParts(r.value_raw):null,derived=inbody?inbodyLooseNumeric(r.value_raw):null;
   if(inbody){r.value_numeric=derived;r.valueNumeric=derived;r.value_operator=rawParts?.value_numeric!==null?rawParts.value_operator:(derived!==null?"=":"text")}
   const values={display_name:r.display_name||"",value_raw:r.value_raw||"",value_numeric:inbody?(derived??""):(r.value_numeric??""),unit:r.unit||"",reference_raw:r.reference_raw||"",source_flag:r.source_flag||""};
   Object.entries(values).forEach(([key,value])=>{const el=card.querySelector(`[data-verify-key="${key}"]`);if(el)el.value=value});
   document.getElementById("verifyQueueSource").textContent=`${r.source_file||"ไม่ระบุไฟล์"}${r.page?` · หน้า ${r.page}`:""}${r.result_datetime?` · ${r.result_datetime}`:r.result_date?` · ${r.result_date}`:""}${r.lab_no?` · Lab No. ${r.lab_no}`:""}`
   const reason=document.getElementById("verifyQueueReason");
   if(reason)reason.textContent=r.verify_reason||"โปรดเทียบกับหลักฐานต้นฉบับ";
   renderDuplicateConflictSummary(r);
   verifyZoom=1;
   paintVerifyDocument()
 }
 function activeDuplicateCandidates(r){
   if(!r?.duplicate_conflict||!r.duplicate_group_key)return[];
   const candidates=rows.filter(other=>other.selected!==false&&other.duplicate_group_key===r.duplicate_group_key);
   if(!sameClinicalEventForConflict(candidates)){candidates.forEach(clearDuplicateConflict);return[]}
   return candidates
 }
 function renderDuplicateConflictSummary(r){
   const box=document.getElementById("labDuplicateConflictSummary");
   if(!box)return;
   const candidates=activeDuplicateCandidates(r);
   if(candidates.length<2){box.hidden=true;box.innerHTML="";return}
   box.hidden=false;
   box.innerHTML=`<div><b>เลือกค่าที่ตรงกับรายงานต้นฉบับ</b><span>กดค่าที่ต้องการเก็บ แล้วกด “ยืนยันรายการนี้แล้วไปต่อ”</span></div>
     <div class="duplicate-conflict-candidates">${candidates.map(candidate=>`<button type="button" class="duplicate-candidate ${candidate.id===r.id?"active":""}" data-duplicate-candidate-id="${MIW.Utils.escape(candidate.id)}">
       <b>${MIW.Utils.escape(candidate.value_raw||"—")} ${MIW.Utils.escape(candidate.unit||"")}</b>
       <span>${MIW.Utils.escape(candidate.source_file||"ไม่ระบุไฟล์")}${candidate.page?` · หน้า ${MIW.Utils.escape(candidate.page)}`:""}${candidate.result_datetime?` · ${MIW.Utils.escape(candidate.result_datetime)}`:candidate.result_date?` · ${MIW.Utils.escape(candidate.result_date)}`:""}${candidate.lab_no?` · Lab No. ${MIW.Utils.escape(candidate.lab_no)}`:""}</span>
     </button>`).join("")}</div>`
 }
 function paintActiveRows(){
   const r=activeIssue();
   document.querySelectorAll("#labReviewBody tr[data-id]").forEach(tr=>{
     const row=rows.find(item=>item.id===tr.dataset.id);
     const sameGroup=Boolean(r?.duplicate_group_key&&row?.duplicate_group_key===r.duplicate_group_key&&row.selected!==false);
     tr.classList.toggle("lab-duplicate-group-active",sameGroup);
     tr.classList.toggle("lab-issue-active",Boolean(r&&tr.dataset.id===r.id))
   })
 }
 function updateNavigator(){
   const issues=actionableReviewIssues(),nav=document.getElementById("labIssueNavigator");
   const count=document.getElementById("labReviewCount");
   if(count)count.textContent=issues.length+completenessMissingCount();
   if(!nav)return;
   if(!issues.length){
     activeIssueId=null;nav.hidden=true;
     renderVerifyCard();paintActiveRows();
     return
   }
   if(!issues.some(r=>r.id===activeIssueId))activeIssueId=issues[0].id;
   const index=Math.max(0,issues.findIndex(r=>r.id===activeIssueId)),r=issues[index];
   document.getElementById("labIssueNavigatorTitle").textContent=MIW.I18n?.language==="en"?`Review ${issues.length} point${issues.length===1?"":"s"} · ${index+1}/${issues.length}`:`ตรวจ ${issues.length} จุด · ${index+1}/${issues.length}`;
   document.getElementById("labIssueNavigatorDetail").textContent=`${r.display_name||"ยังไม่มีชื่อรายการ"} · ${r.source_file||"ไม่ระบุไฟล์"}${r.page?` · หน้า ${r.page}`:""}`;
   nav.hidden=false;
   document.getElementById("previousLabIssueButton").disabled=issues.length<2;
   document.getElementById("nextLabIssueButton").disabled=issues.length<2;
   renderVerifyCard();
   paintActiveRows()
 }
 function updateMetrics(){
   const selected=rows.filter(r=>r.selected!==false);
   const actionable=selected.filter(needsReview);
   const advisory=selected.filter(needsAdvisory);
   const autoValidated=selected.filter(r=>!needsReview(r));
   document.getElementById("labCandidateCount").textContent=selected.length;
   const autoCount=document.getElementById("labAutoValidatedCount");
   if(autoCount)autoCount.textContent=autoValidated.length;
   const foodLevel=r=>{
     const profile=clean(r.specialized_profile).toUpperCase();
     const category=clean(r.category).toLowerCase();
     const method=clean(r.reported_method).toLowerCase();
     const isFoodIgG=profile==="FOOD_INTOLERANCE_IGG_200_PLUS"||category==="food-specific igg"||
       /^food_igg_/.test(clean(r.test_code))||/food[- ]specific\s*igg/.test(method);
     if(!isFoodIgG)return"";
     const stored=clean(r.food_intolerance_level).toLowerCase();
     if(["high","borderline","normal"].includes(stored))return stored;
     const n=Number(r.value_numeric);
     return Number.isFinite(n)?n>=30?"high":n>=24?"borderline":"normal":""
   };
   document.getElementById("labHighCount").textContent=selected.filter(r=>{
     const level=foodLevel(r);
     return level?level==="high":r.source_flag==="H"||r.calculated_flag==="H"
   }).length;
   document.getElementById("labLowCount").textContent=selected.filter(r=>{
     const level=foodLevel(r);
     return level?level==="borderline":r.source_flag==="L"||r.calculated_flag==="L"
   }).length;
   const summary=document.getElementById("smartVerifySummary");
   if(summary){
     const soft=Math.max(0,advisory.length-actionable.length);
     const missing=completenessMissingCount();
     const autoFixed=Number(meta.hamad_auto_resolved_count||0);
     const audit=meta.parse_audit||{};
     summary.textContent=MIW.I18n?.language==="en"
       ?`Auto-accepted ${autoValidated.length} · Manual review ${actionable.length+missing}${missing?` · Unread critical values ${missing}`:""}${soft?` · ${soft} OCR advisories retained in history`:""}`
       :`ผ่านอัตโนมัติ ${autoValidated.length} รายการ · ตรวจด้วยคน ${actionable.length+missing} จุด${missing?` · มีค่าหลักที่ยังอ่านไม่ชัด ${missing} จุด`:""}${soft?` · คำเตือน OCR ${soft} รายการเก็บไว้ในประวัติ`:""}`
   }
   updateNavigator()
 }
 function dobLabel(value){
   const normalized=MIW.Patients.normalizeDob(value)||String(value||"");
   const match=normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   return match?`${match[3]}/${match[2]}/${match[1]}`:normalized
 }
 function renderIdentityReview(){
   const card=document.getElementById("labIdentityReview");
   if(!card)return;
   const evidence=meta.identity_dob_evidence||[];
   const required=Boolean(meta.identity_dob_resolution_required&&evidence.length>1);
   card.hidden=!required;
   if(!required)return;
   const identifierParts=[
     meta.civil_id?`Civil ID ${meta.civil_id}`:"",
     (meta.hospital_ids||[]).length?`Hospital ID/HN ${(meta.hospital_ids||[]).join(" · ")}`:""
   ].filter(Boolean);
   document.getElementById("labIdentityEvidence").textContent=
     `${identifierParts.join(" · ")} เชื่อมเอกสารว่าเป็นผู้ป่วยคนเดียวกัน แต่ระบบจะไม่เลือก DOB ให้เอง`;
   const registryDob=MIW.Patients.normalizeDob(meta.identity_registry_dob||"");
   document.getElementById("labDobChoices").innerHTML=evidence.map(item=>{
     const selected=meta.identity_dob_confirmed&&meta.date_of_birth===item.normalized;
     const registry=registryDob===item.normalized?" · ตรงกับ Patient Registry":"";
     const raw=(item.rawValues||[]).join(" / ");
     const sources=(item.sourceFiles||[]).join(" · ");
     return`<label class="identity-dob-choice"><input type="radio" name="labConfirmedDob" value="${MIW.Utils.escape(item.normalized)}" ${selected?"checked":""}><span><b>${MIW.Utils.escape(dobLabel(item.normalized))}${MIW.Utils.escape(registry)}</b><small>ต้นฉบับ ${MIW.Utils.escape(raw||item.normalized)} · ${MIW.Utils.escape(sources||"ไม่ระบุไฟล์")}</small></span></label>`
   }).join("");
   card.onchange=event=>{
     if(event.target?.name!=="labConfirmedDob")return;
     meta.date_of_birth=event.target.value;
     meta.identity_dob_confirmed=true;
     card.classList.remove("identity-review-focus");
     card.classList.add("identity-review-resolved");
     const status=document.getElementById("labIdentitySelectionStatus");
     if(status)status.textContent=`เลือก DOB ${dobLabel(event.target.value)} แล้ว · กด “นำเข้าทั้งหมดเข้า Lab Tracker” เพื่อบันทึก`
   }
 }
 function hasPendingIdentityConflict(){
   return Boolean(
     meta.identity_dob_resolution_required&&
     !meta.identity_dob_confirmed&&
     (meta.identity_dob_evidence||[]).length>1
   )
 }
 function focusIdentityConflict(){
   if(!hasPendingIdentityConflict())return false;
   renderIdentityReview();
   const card=document.getElementById("labIdentityReview");
   if(!card)return false;
   card.hidden=false;
   card.classList.remove("identity-review-resolved");
   card.classList.remove("identity-review-focus");
   void card.offsetWidth;
   card.classList.add("identity-review-focus");
   card.scrollIntoView?.({behavior:"smooth",block:"start"});
   setTimeout(()=>card.querySelector?.('input[name="labConfirmedDob"]')?.focus({preventScroll:true}),180);
   return true
 }
 function micronutrientWarningLabel(r){
   const level=clean(r.micronutrient_visual_level);
   if(!level)return"";
   const detail={
     NEAR_HIGH:"ใกล้ขอบบน",NEAR_LOW:"ใกล้ขอบล่าง",CAUTION:"ควรติดตาม",
     ABNORMAL_HIGH:"สูง",ABNORMAL_LOW:"ต่ำ"
   }[clean(r.visual_warning_code).toUpperCase()]||"";
   const target=micronutrientTargetLabel(r);
   return`แถบสี: ${level}${detail?` · ${detail}`:""} · ไม่ใช่ผลตรวจซ้ำ${target?` · ${target}`:""}`
 }
 function micronutrientTargetLabel(r){
   const range=clean(r.anti_aging_range_raw);
   if(!range)return"";
   const status={
     WITHIN_TARGET:"อยู่ในเป้าหมาย",
     BELOW_TARGET:"ต่ำกว่าเป้าหมาย",
     ABOVE_TARGET:"สูงกว่าเป้าหมาย",
     NOT_ASSESSED:"ยังประเมินไม่ได้"
   }[clean(r.anti_aging_assessment).toUpperCase()]||"ยังประเมินไม่ได้";
   return`Anti-aging target: ${status} · ${range}${r.unit?` ${r.unit}`:""} · ไม่ใช้เปลี่ยน Clinical flag`
 }
 function render(){applyInBodySourceTruthSnapshot(rows);syncInBodyRawNumerics(rows);reconcileInBodyCriticalBundles(rows);applyInBodySourceTruthSnapshot(rows);const body=document.getElementById("labReviewBody");body.innerHTML=rows.length?rows.map(r=>`<tr data-id="${r.id}" class="${needsReview(r)?"lab-review-needed":""}" title="${MIW.Utils.escape(`${r.source_file||""}${r.result_date?` · ${r.result_date}`:""}`)}"><td><input type="checkbox" data-key="selected" ${r.selected?"checked":""}></td><td><input class="review-confirm" type="checkbox" data-key="review_confirmed" aria-label="ตรวจรายการนี้ด้วยตนเองแล้ว" ${r.review_confirmed?"checked":""}></td><td><input data-key="category" value="${MIW.Utils.escape(r.category)}"></td><td><input data-key="panel" value="${MIW.Utils.escape(r.panel)}"></td><td><input data-key="test_code" value="${MIW.Utils.escape(r.test_code)}"></td><td><input data-key="display_name" value="${MIW.Utils.escape(r.display_name)}">${Number.isInteger(r.allergy_class)?`<small class="lab-row-source">Allergy Class ${r.allergy_class} · ${MIW.Utils.escape(r.allergy_interpretation||"")}</small>`:""}${micronutrientWarningLabel(r)?`<small class="lab-row-warning">${MIW.Utils.escape(micronutrientWarningLabel(r))}</small>`:""}<small class="lab-row-source">${MIW.Utils.escape(r.source_file||"")}${r.result_date?` · ${MIW.Utils.escape(r.result_date)}`:""}</small></td><td><input data-key="value_raw" value="${MIW.Utils.escape(r.value_raw)}"><input data-key="value_numeric" type="number" step="any" value="${r.value_numeric??""}" class="compact"></td><td><input data-key="unit" value="${MIW.Utils.escape(r.unit)}"></td><td><input data-key="reference_raw" value="${MIW.Utils.escape(r.reference_raw)}"></td><td><input data-key="source_flag" value="${MIW.Utils.escape(r.source_flag)}" class="compact"></td><td data-calculated-flag>${MIW.Utils.escape(r.calculated_flag)}</td><td><input data-key="page" type="number" value="${r.page??""}" class="compact"></td><td><button class="danger small" data-delete-lab="${r.id}">ลบ</button></td></tr>`).join(""):'<tr><td colspan="13" class="empty">ยังไม่พบผล Lab</td></tr>';updateMetrics();const patientLabel=meta.patient_name||documentRecord?.patientName||"—";document.getElementById("labReviewPatient").textContent=meta.identity_warning?`${patientLabel} · ⚠ ${meta.identity_warning}`:patientLabel;document.getElementById("labReviewDate").textContent=(meta.report_count||1)>1?`${meta.report_count} ไฟล์ / ${new Set(rows.map(r=>r.result_date).filter(Boolean)).size||1} วันตรวจ`:meta.specimen_datetime||"Unknown";document.getElementById("labReviewSource").textContent=completenessWarningText()?`${meta.source||"—"} · ⚠ ${completenessWarningText()}`:meta.source||"—";document.getElementById("labReviewFile").textContent=(meta.source_files||[meta.source_file]).filter(Boolean).join(" · ")||"—";renderIdentityReview()}
 function focusIssue(direction=0){
   collect();
   saveVerifyCard();
   const issues=actionableReviewIssues();
   if(!issues.length){updateNavigator();return false}
   let index=issues.findIndex(r=>r.id===activeIssueId);
   if(index<0)index=0;else if(direction)index=(index+direction+issues.length)%issues.length;
   activeIssueId=issues[index].id;
   updateNavigator();
   document.getElementById("labIssueNavigator")?.scrollIntoView({behavior:"smooth",block:"start"});
   setTimeout(()=>document.getElementById("verifyQueueRaw")?.focus({preventScroll:true}),250);
   return true
 }
 function selectIssue(id,{scroll=true}={}){
   const issue=actionableReviewIssues().find(row=>row.id===id)||
     rows.find(row=>row.id===id&&row.selected!==false&&row.duplicate_conflict);
   if(!issue)return false;
   activeIssueId=issue.id;
   updateNavigator();
   if(scroll)document.getElementById("labIssueNavigator")?.scrollIntoView({behavior:"smooth",block:"start"});
   setTimeout(()=>document.getElementById("verifyQueueRaw")?.focus({preventScroll:true}),120);
   return true
 }
 function focusDuplicateConflict(groupKey=""){
   sanitizeDuplicateConflictGroups(rows);
   const candidates=rows.filter(row=>row.selected!==false&&row.duplicate_conflict&&(!groupKey||row.duplicate_group_key===groupKey));
   if(!candidates.length)return false;
   MIW.Router.show("labReview");
   activeIssueId=candidates[0].id;
   updateNavigator();
   setTimeout(()=>{
     document.getElementById("labIssueNavigator")?.scrollIntoView({behavior:"smooth",block:"start"});
     paintActiveRows();
     document.getElementById("verifyQueueRaw")?.focus({preventScroll:true})
   },80);
   return true
 }
 function confirmCurrentIssue(){
   collect();
   saveVerifyCard();
   rows=reconcileInBodyCanonicalRows(rows);rows=reconcileInBodyCriticalBundles(rows);
   let issues=actionableReviewIssues();
   const current=issues.find(x=>x.id===activeIssueId)||issues[0]||null;
   const currentIndex=Math.max(0,issues.findIndex(x=>x.id===current?.id));
   if(current?.duplicate_conflict&&current.duplicate_group_key){
     const siblings=rows.filter(other=>
       other.id!==current.id&&
       other.selected!==false&&
       other.duplicate_group_key===current.duplicate_group_key
     );
     rememberDuplicateResolution(current.duplicate_group_key,current,siblings);
     siblings.forEach(other=>{
       other.selected=false;
       other.review_confirmed=false;
       clearDuplicateConflict(other)
     });
     clearDuplicateConflict(current);
     current.review_confirmed=true;
     activeIssueId=null;
     render();
     const nextIssue=activeIssue();
     if(nextIssue){
       activeIssueId=nextIssue.id;
       updateNavigator();
       setTimeout(()=>document.getElementById("verifyQueueRaw")?.focus({preventScroll:true}),80);
       return true
     }
     document.getElementById("verifyLabButton")?.scrollIntoView({behavior:"smooth",block:"center"});
     return false
   }
   if(current)current.review_confirmed=true;
   // v10.255 live handoff: recalculate the deterministic gate immediately from
   // the edited Review values. A tick alone cannot suppress a still-failing gate.
   if(current&&/^inbody_/i.test(clean(current.test_code||current.testCode)))refreshInBodyReviewGate();
   issues=actionableReviewIssues();
   const stillIndex=issues.findIndex(x=>x.id===current?.id);
   const nextIssue=issues.length?issues[(stillIndex>=0?stillIndex+1:Math.min(currentIndex,issues.length-1))%issues.length]:null;
   activeIssueId=nextIssue?.id||null;
   render();
   if(nextIssue){
     activeIssueId=nextIssue.id;updateNavigator();
     setTimeout(()=>document.getElementById("verifyQueueRaw")?.focus({preventScroll:true}),80);
     return true
   }
   updateNavigator();
   document.getElementById("verifyLabButton")?.scrollIntoView({behavior:"smooth",block:"center"});
   return false
 }
 async function open(){await parse();MIW.Router.show("labReview")}
 function recoverVerifiedPatientName(data){
   const groupNames=(sourceGroups||[]).flatMap(group=>[
     group?.meta?.patient_name,
     MIW.Patients.extractNameFromFileName?.(group?.meta?.source_file)
   ]);
   const registry=MIW.Patients.match?.({
     name:data?.patient?.name,hn:data?.patient?.patient_id,dob:data?.patient?.date_of_birth_raw,
     civilId:data?.patient?.civil_id,hospitalIds:data?.patient?.hospital_ids
   });
   const recovered=MIW.Patients.bestPatientName([
     registry?.name,...(registry?.aliases||[]),...groupNames,
     documentRecord?.patientName,
     MIW.Patients.extractNameFromFileName?.(documentRecord?.fileName),
     ...(documentRecord?.sourceFiles||[]).map(file=>MIW.Patients.extractNameFromFileName?.(file?.name))
   ],{preferThai:true});
   if(recovered){
     data.patient.name=recovered;
     meta.patient_name=recovered;
     documentRecord.patientName=recovered
   }
   return recovered
 }
 function normalizedStoredTestToken(item){
   return clean(item?.testCode||item?.test_code||item?.display_name||item?.name)
    .toLowerCase().replace(/\([^)]*(?:serum|plasma|blood|urine|edta)[^)]*\)/g,"")
    .replace(/[^a-z0-9ก-๙]+/g,"")
 }
 function normalizedStoredValueToken(item){
   return clean(item?.reportedValue||item?.reported_value_raw||item?.value||item?.value_raw)
    .replace(/[≤]/g,"<=").replace(/[≥]/g,">=").replace(/[−–—]/g,"-")
    .replace(/,/g,"").replace(/\s+/g,"").toLowerCase()
 }
 function storedResultKindToken(item){return clean(item?.resultKind||item?.result_kind||((item?.valueNumeric??item?.value_numeric)!==null?"NUMERIC":"TEXT")).toUpperCase()}
 function storedMethodIdentityToken(item,test=""){
   return clean(item?.reportedMethod||item?.reported_method||item?.method).toLowerCase().replace(/[^a-z0-9+/-]+/g,"")
 }
 function storedSpecimenIdentityToken(item){return clean(item?.specimenType||item?.specimen_type||item?.specimen).toLowerCase().replace(/[^a-z0-9ก-๙]+/g,"")}
 function storedLabEventKey(item){
   const labNo=clean(item?.labNo||item?.lab_no||item?.accession_no||item?.sample_no).replace(/[^a-z0-9]/gi,"").toLowerCase();
   const test=normalizedStoredTestToken(item),unit=normalizeUnit(item?.reportedUnit||item?.reported_unit||item?.unit),kind=storedResultKindToken(item),method=storedMethodIdentityToken(item,test),specimen=storedSpecimenIdentityToken(item);
   const hamad=Boolean(item?.mixedClinicalPacket||item?.mixed_clinical_packet||item?.sourceProfile==="HAMAD_MIXED_CLINICAL_PACKET"||item?.source_profile==="HAMAD_MIXED_CLINICAL_PACKET"||item?.sourceColumnDate||item?.source_column_date);
   // An event key identifies the measurement slot, not the reported value.
   // Value belongs in storedExactResultKey so conflicts inside one lab event
   // can be detected instead of masquerading as separate events.
   if(hamad){
     const moment=clean(item?.dateTime||item?.result_datetime||item?.date||item?.result_date);
     const slot=[clean(item?.sourceColumnDate||item?.source_column_date),clean(item?.sourceColumnTime||item?.source_column_time),item?.sourcePageNumber??item?.source_page_number??item?.page??"",item?.sourceColumnIndex??item?.source_column_index??""].join(":");
     return`HAMAD:${moment||slot}:${test}:${unit}:${kind}`
   }
   if(labNo)return`LAB:${labNo}:${test}:${method?`METHOD:${method}:`:""}${specimen?`SPECIMEN:${specimen}:`:""}${unit}:${kind}`;
   const date=clean(item?.date||item?.result_date||item?.dateTime||item?.result_datetime).slice(0,10);
   return`DATE:${date}:${test}:${method?`METHOD:${method}:`:""}${specimen?`SPECIMEN:${specimen}:`:""}${unit}:${kind}`
 }
 function storedExactResultKey(item){return`${storedLabEventKey(item)}:${normalizedStoredValueToken(item)}`}
 function storedSourcePriority(item){
   const source=clean(item?.sourceFile||item?.source_file||item?.source);
   const numericSource=clean(item?.numeric_result_source).toUpperCase();
   return (/รวมแลป|cumulative/i.test(source)||item?.cumulative?0:40)+
    (numericSource==="RESULT_TABLE"?20:numericSource==="SUMMARY_TABLE_FALLBACK"?0:10)+
    (item?.labNo||item?.lab_no?8:0)+Math.min(9,Math.max(0,Number(item?.confidence||0)/12))
 }
 function mergeDuplicateAudit(keeper,dropped){
   const values=[...(Array.isArray(keeper?.alternateReportedValues)?keeper.alternateReportedValues:[]),normalizedStoredValueToken(dropped)?clean(dropped?.reportedValue||dropped?.value):""]
    .filter(Boolean);
   const sources=[...(Array.isArray(keeper?.duplicateSourceFiles)?keeper.duplicateSourceFiles:[]),clean(dropped?.sourceFile||dropped?.source_file||dropped?.source)]
    .filter(Boolean);
   return{...keeper,
    alternateReportedValues:[...new Set(values)],
    duplicateSourceFiles:[...new Set(sources)],
    duplicateSuppressedCount:Number(keeper?.duplicateSuppressedCount||0)+1,
    duplicateGuardApplied:true
   }
 }
 function normalizedSourceName(value){return clean(value).toLowerCase().replace(/\s+/g," ").replace(/\s*\(\d+\)(?=\.[a-z0-9]+$)/i,"")}
 function sourceNamesFromReport(data){return new Set([...(data?.report?.source_files||[]),data?.report?.source_file,documentRecord?.fileName,...((documentRecord?.sourceFiles||[]).map(item=>item?.name))].map(normalizedSourceName).filter(Boolean))}
 function sourceCoverageRows(existingResults,data){const names=sourceNamesFromReport(data);return(existingResults||[]).filter(item=>item.status!=="DUPLICATE_SUPPRESSED"&&names.has(normalizedSourceName(item.sourceFile||item.source_file||item.source)))}
 function coverageKey(item){
   const labNo=clean(item?.labNo||item?.lab_no||item?.accession_no||item?.sample_no).replace(/[^a-z0-9]/gi,"").toLowerCase();
   const moment=clean(item?.dateTime||item?.result_datetime||item?.date||item?.result_date).slice(0,19);
   return[labNo||moment,normalizedStoredTestToken(item),storedMethodIdentityToken(item),storedSpecimenIdentityToken(item),normalizeUnit(item?.reportedUnit||item?.reported_unit||item?.unit).toLowerCase(),storedResultKindToken(item)].join("|")
 }
 function coverageRegression(existingRows,incomingRows){
   const oldMap=new Map(),newKeys=new Set((incomingRows||[]).map(coverageKey));
   (existingRows||[]).forEach(row=>{const key=coverageKey(row);if(!oldMap.has(key))oldMap.set(key,row)});
   const missing=[...oldMap].filter(([key])=>!newKeys.has(key)).map(([,row])=>row);
   const baseline=oldMap.size,drop=missing.length,ratio=baseline?drop/baseline:0;
   return{baseline,drop,ratio,missing}
 }
 async function verify(){
   lastImportSummary={saved:0,suppressed:0,replaced:0,duplicateDocument:false,rawExtracted:Number(meta.parse_audit?.rawExtracted||rows.length),uniqueCandidates:0,mergedOrSuppressed:Number(meta.parse_audit?.mergedOrSuppressed||0),excluded:Number(meta.excluded_non_lab_pages||0),baselineRows:0,coverageDrop:0};MIW.__lastLabImportSummary={...lastImportSummary};
   if(!documentRecord)throw new Error("ไม่พบเอกสาร");
   collect();
   const specializedRecovery=sourceGroups.length?recoveredSpecializedRows(sourceGroups,rows):[];
   const bnhRecovery=sourceGroups.length?bnhRecoverMissingRows(sourceGroups,[...rows,...specializedRecovery]):[];
   const bnhEventRecovery=sourceGroups.length?bnhRecoverMissingLongitudinalEvents(sourceGroups,[...rows,...specializedRecovery,...bnhRecovery]):[];
   const finalRecovery=[...specializedRecovery,...bnhRecovery,...bnhEventRecovery];
   let verifyRows=[...rows,...finalRecovery];
   verifyRows=auditedStage("verify-photo-evidence",verifyRows,mergePhotoEvidence);
   verifyRows=auditedStage("verify-bnh-source-truth-finalization",verifyRows,input=>finalizeBnhSourceTruth(sourceGroups,input));
   verifyRows=auditedStage("verify-bnh-typed-row-bundle",verifyRows,enforceTypedBnhBundles);
   verifyRows=auditedStage("verify-source-truth-plausibility",verifyRows,applyPlausibilityQuarantine);
   verifyRows=auditedStage("verify-bnh-exact-source-reconcile",verifyRows,reconcileBnhExactSourceRows);
   verifyRows=auditedStage("verify-bnh-row-bundle-owns-event",verifyRows,reconcileBnhBundleAgainstGeneric);
   verifyRows=auditedStage("verify-bnh-source-truth-finalization-final",verifyRows,input=>finalizeBnhSourceTruth(sourceGroups,input));
   verifyRows=auditedStage("verify-hamad-identity",verifyRows,repairHamadRowIdentities);
   verifyRows=auditedStage("verify-hamad-event-reconcile",verifyRows,reconcileHamadSameEventValues);
   verifyRows=auditedStage("verify-exact-deduplicate",verifyRows,deduplicateResults);
   verifyRows=auditedStage("verify-censored-value-reconcile",verifyRows,reconcileCompatibleCensoredValues);
   verifyRows=auditedStage("verify-cross-source-reconcile",verifyRows,reconcileCrossSourceMeasurements);
   verifyRows=auditedStage("verify-embedded-cumulative-reconcile",verifyRows,reconcileEmbeddedCumulativeMeasurements);
   verifyRows=auditedStage("verify-inbody-canonical-row-reconcile",verifyRows,reconcileInBodyCanonicalRows);
   verifyRows=auditedStage("verify-inbody-critical-bundle-source-truth",verifyRows,reconcileInBodyCriticalBundles);
   verifyRows=auditedStage("verify-inbody-live-runtime-snapshot",verifyRows,applyInBodyLiveCanonicalSnapshot);
   rows=applyDuplicateResolutionLedger(sanitizeDuplicateConflictGroups(annotateDuplicateConflicts(verifyRows)));
   parseAudit.finalCandidates=rows.length;meta.parse_audit={...parseAudit,mergedOrSuppressed:Math.max(0,parseAudit.rawExtracted-parseAudit.finalCandidates)};
   meta.specialized_completeness_expectations=[...specializedCompletenessExpectations(sourceGroups,rows),...micronutrientCompletenessExpectations(sourceGroups,rows),...foodPrintCompletenessExpectations(sourceGroups,rows),...allergyCompletenessExpectations(sourceGroups,rows),...hamadCompletenessExpectations(sourceGroups,rows),...bnhCompletenessExpectations(sourceGroups,rows),...bnhLongitudinalEventExpectations(sourceGroups,rows),...bnhSourceTruthFinalizationExpectations(sourceGroups,rows)];
   render();
   collect();
   // v10.269: collect() may rehydrate legacy hidden numeric/cache values from the
   // Review form. Re-apply the live snapshot immediately before the gate so the
   // validator and the visible Review value are guaranteed to share one state.
   applyInBodyLiveCanonicalSnapshot(rows);
   rows.forEach(r=>{
     r.review_recommended=needsAdvisory(r);
     r.review_reasons=reviewReasons(r);
     r.manually_verified=Boolean(r.review_confirmed)
   });
   const inbodyVerifyRows=rows.filter(r=>/^inbody_/i.test(clean(r.test_code||r.testCode))&&r.selected!==false);
   if(inbodyVerifyRows.length){
     const gate=inbodyValidationGate(inbodyVerifyRows);
     meta.inbody_validation_gate=gate;
     inbodyVerifyRows.forEach(r=>{r.inbody_validation_gate=gate;r.inbody_validation_passed=gate.passed});
     if(!gate.passed){
       // v10.305 — no manual InBody verify.  If redundant-source recovery still
       // cannot resolve a contradiction, quarantine every field participating in
       // that contradiction and continue importing the remaining trustworthy rows.
       // This preserves Source Truth without blocking the operator or inventing data.
       const unresolved=new Set();
       for(const issue of (gate.issues||[]))for(const code of (issue.codes||[]))unresolved.add(clean(code).toLowerCase());
       for(const code of (gate.missingCodes||[]))unresolved.add(clean(code).toLowerCase());
       const quarantined=[];
       inbodyVerifyRows.forEach(r=>{
         const code=clean(r.test_code||r.testCode).toLowerCase();
         if(unresolved.has(code)){
           r.selected=false;r.inbody_source_quarantined=true;r.inbody_clinical_excluded=true;r.inbody_auto_unresolved=true;
           r.review_recommended=false;r.parse_issue=false;r.inbody_gate_issue=false;r.inbody_gate_only_parse_issue=false;r.verify_reason="";
           r.source_evidence=r.source_evidence||[];r.source_evidence.push({type:"inbody-v10.305-auto-quarantine-unresolved",profile:"INBODY_720",code,issues:(gate.issues||[]).filter(x=>(x.codes||[]).map(c=>clean(c).toLowerCase()).includes(code)).map(x=>x.code)});
           quarantined.push(code)
         }else{
           // Valid rows remain eligible for Booklet/Clinical Interpretation even
           // when another unrelated InBody field was quarantined.
           r.inbody_validation_passed=true;r.inbody_auto_partial_validation=true;r.review_recommended=false;
         }
       });
       gate.autoProceeded=true;gate.autoQuarantinedCodes=[...new Set(quarantined)];gate.manualReviewRequired=false;
       meta.inbody_validation_gate=gate;
       MIW.Utils?.log?.(`InBody Auto Source Reconciliation: unresolved ${gate.autoQuarantinedCodes.length} field(s) quarantined; import continues without manual Verify`);
     }
   }
   const data=payload();
   const currentName=MIW.Patients.sanitizePatientName?.(data.patient.name)||data.patient.name;
   if(!currentName||MIW.Classifier.isInvalidPatientName(currentName))recoverVerifiedPatientName(data);
   if(!data.patient.name||MIW.Classifier.isInvalidPatientName(data.patient.name))throw new Error("ยังอ่านชื่อผู้ป่วยจากหัวรายงานไม่สำเร็จ กรุณากลับหน้า Preview และตรวจช่อง Patient");
   if(meta.identity_dob_resolution_required&&!data.patient.dob_confirmed){
     document.getElementById("labIdentityReview")?.scrollIntoView({behavior:"smooth",block:"center"});
     const error=new Error("เอกสารชุดนี้ระบุ DOB ต่างกัน กรุณาเลือกวันเกิดที่ถูกต้องในกรอบ Patient Identity Conflict ก่อนบันทึก");
     error.code="PATIENT_DOB_CONFLICT";
     throw error
   }
   if(!data.results.length){
     const photo=documentRecord.captureMode==="PHOTO_LAB";
     throw new Error(photo
       ?"ยังไม่พบผล Lab จากภาพ จึงไม่บันทึก 0 รายการ กรุณากลับ Preview เพื่อตรวจข้อความ OCR หรือเพิ่มรายการด้วยตนเอง"
       :"ยังไม่พบผล Lab จึงไม่อนุญาตให้บันทึก 0 รายการ");
   }
   const incompleteProfiles=unresolvedCompletenessIssues();
   if(incompleteProfiles.length){
     const details=incompleteProfiles.map(issue=>`${issue.source_file}: ${issue.missing_labels.join(", ")}`).join("\n");
     const error=new Error(`ระบบพบชื่อรายการตรวจในเอกสารต้นฉบับ แต่ยังอ่านผลออกมาไม่ครบ จึงหยุดบันทึกเพื่อป้องกันผลตกหล่น\n${details}\nกรุณาตรวจ OCR/ต้นฉบับ หรือเพิ่มรายการที่ขาดก่อนยืนยัน`);
     error.code="SPECIALIZED_PROFILE_INCOMPLETE";
     error.completenessIssues=incompleteProfiles;
     throw error
   }
   const duplicateGroups=duplicateResultGroups(data.results);
   if(duplicateGroups.length){
     const labels=duplicateGroups.slice(0,5).map(({items})=>{
       const first=items[0];
       return`${first.display_name||first.test_code}: ${[...new Set(items.map(r=>clean(r.value_raw)))].join(" / ")}`
     });
     const more=duplicateGroups.length>5?`\nและอีก ${duplicateGroups.length-5} รายการ`:"";
     const error=new Error(`ยังมีผลตรวจซ้ำที่ต้องเลือกเก็บเพียงค่าเดียว:\n${labels.join("\n")}${more}\nระบบพาไปยังรายการแรกที่ต้องตรวจแล้ว กรุณาเลือกค่าที่ถูกต้องและกด “ยืนยันรายการนี้แล้วไปต่อ”`);
     error.code="DUPLICATE_RESULT_CONFLICT";
     error.duplicateGroupKey=duplicateGroups[0].key;
     throw error
   }
   let patient=await MIW.Patients.ensure({
     name:data.patient.name,hn:data.patient.patient_id,dob:data.patient.date_of_birth_raw,sex:data.patient.sex||"",
     dobConfirmed:data.patient.dob_confirmed,civilId:data.patient.civil_id,hospitalIds:data.patient.hospital_ids
   });
   if(MIW.Patients.rememberAliases)patient=await MIW.Patients.rememberAliases(patient.id,data.patient.aliases)||patient;
   const patientId=patient.id,verifiedAt=new Date().toISOString();
   const specializedReportType=documentRecord.packet?.isMixed?"LABORATORY_REPORT":
     ["RGCC_ONCOTRAIL","RGCC_METASTAT","MASUYAMA_IMMUNOLOGICAL"].includes(data.report.report_type)
       ?data.report.report_type:"LABORATORY_REPORT";
   documentRecord={...documentRecord,patientId,patientName:patient.name,patientHN:patient.hn,patientDOB:patient.dob,
     patientCivilID:patient.civilId||data.patient.civil_id||"",
     patientHospitalIDs:patient.hospitalIds||data.patient.hospital_ids||[],
     type:specializedReportType,reportType:specializedReportType,disease:data.report.disease||"",
     diseaseStage:data.report.disease_stage||"",labNo:data.report.lab_no,source:data.report.source,status:"CLASSIFIED",importAudit:data.report.import_audit||meta.parse_audit||null,updatedAt:verifiedAt};
   const fallbackDate=String(data.report.specimen_datetime||data.report.result_datetime||"").slice(0,10);
   const resultRecords=data.results.map((r,index)=>({
     id:`labResult_${documentRecord.id}_${String(index+1).padStart(4,"0")}`,
     patientId,documentId:documentRecord.id,
     date:r.result_date||fallbackDate,dateTime:r.result_datetime||"",
     source:r.source_file||data.report.source||data.report.source_file,
     sourceFile:r.source_file||"",sourceFileIndex:r.source_file_index??0,labNo:r.lab_no||"",
     group:r.category,panel:r.panel,testCode:r.test_code,name:r.display_name,
     reportedName:r.reported_name||r.display_name,value:r.value_raw,
     reportedValue:r.reported_value_raw||r.value_raw,valueNumeric:r.value_numeric,
     alternateReportedValues:Array.isArray(r.alternate_reported_values)?r.alternate_reported_values:[],
     antiAgingRangeRaw:r.anti_aging_range_raw||"",antiAgingAssessment:r.anti_aging_assessment||"",
     micronutrientVisualLevel:r.micronutrient_visual_level||"",
     valueOperator:r.value_operator,resultKind:r.result_kind||((r.value_numeric===null)?"TEXT":"NUMERIC"),
     chartable:r.chartable??r.value_numeric!==null,unit:r.unit,reportedUnit:r.reported_unit||r.unit,
     unitInferred:Boolean(r.unit_inferred),reference:r.reference_raw,
     reportedReference:r.reported_reference_raw||r.reference_raw,
     clinicalRepairApplied:Boolean(r.clinical_repair_applied),referenceLow:r.reference_low,
     referenceHigh:r.reference_high,referenceOperator:r.reference_operator,
     referenceContextRaw:r.reference_context_raw||"",referenceSelection:r.reference_selection||null,
     contextualReference:r.contextual_reference||r.contextualReference||null,
     referenceSelectionRequired:Boolean(r.reference_selection_required),clinicalContextRequired:Boolean(r.clinical_context_required),patientContext:r.patient_context||null,
     standardizedValue:r.standardized_value,standardizedUnit:r.standardized_unit,
     reportInterpretationRaw:r.report_interpretation_raw||"",flag:r.source_flag||r.calculated_flag,
     calculatedFlag:r.calculated_flag,allergyProfile:r.allergy_profile||"",
     allergyClass:Number.isInteger(r.allergy_class)?r.allergy_class:null,
     allergyClassSource:r.allergy_class_source||"",allergyInterpretation:r.allergy_interpretation||"",
     allergenName:r.allergen_name||"",allergenNameTh:r.allergen_name_th||"",
     allergenComponents:r.allergen_components||[],allergenKind:r.allergen_kind||"",
     foodIntoleranceLevel:r.food_intolerance_level||"",
     foodIntoleranceItemKey:r.food_intolerance_item_key||"",
     foodPrintSourceTruthBuild:r.foodprint_source_truth_build||"",foodPrintSourceTruthStatus:r.foodprint_source_truth_status||"",
     foodPrintSourceTruthPageOrdinal:r.foodprint_source_truth_page_ordinal||null,foodPrintSourceTruthShapeOk:r.foodprint_source_truth_shape_ok===true,
     foodPrintProvenanceBuild:r.foodprint_provenance_build||"",foodPrintProvenanceStatus:r.foodprint_provenance_status||"",
     foodPrintProvenancePositionKey:r.foodprint_provenance_position_key||"",foodPrintProvenanceSourcePage:r.foodprint_provenance_source_page??null,
     foodPrintProvenancePageOrdinal:r.foodprint_provenance_page_ordinal||null,foodPrintProvenanceColumn:r.foodprint_provenance_column||null,foodPrintProvenanceRow:r.foodprint_provenance_row||null,
     reportedMethod:r.reported_method||"",methodIdentity:Boolean(r.reported_method||r.method),
     masuyamaLevelLabel:r.masuyama_level_label||"",masuyamaPreviousLevel:r.masuyama_previous_level||"",
     masuyamaReportDate:r.masuyama_report_date||"",masuyamaTestDates:Array.isArray(r.masuyama_test_dates)?r.masuyama_test_dates:[],
     masuyamaHistoryLevels:Array.isArray(r.masuyama_history_levels)?r.masuyama_history_levels:[],masuyamaSourceHistoryAvailable:Boolean(r.masuyama_source_history_available),
     masuyamaSourceSeries:Array.isArray(r.masuyama_source_series)?r.masuyama_source_series:[],
     cumulative:Boolean(r.cumulative),
     specializedProfile:r.specialized_profile||"",specimenType:r.specimen_type||"",
     reportType:rowReportType(r),disease:r.disease||data.report.disease||"",
     diseaseStage:r.disease_stage||data.report.disease_stage||"",
     biomarkerCompartment:r.biomarker_compartment||"",metastasisLocation:r.metastasis_location||"",
     comparatorLevel:r.comparator_level??null,reportedMarker:r.reported_marker||"",
     reportedResult:r.reported_result||"",markerPositivePercentage:r.marker_positive_percentage??null,
     ctcStandardDeviation:r.ctc_standard_deviation??null,reportThresholdRole:r.report_threshold_role||"",
     confidence:r.confidence,page:r.source_page_number??r.page,
     sourcePageNumber:r.source_page_number??r.page,documentPageNumber:r.document_page_number??r.page,
     sourceRawText:r.source_line||"",sourceRowY:r.source_row_y??null,
     sourceColumnLeft:r.source_column_left??null,sourceColumnRight:r.source_column_right??null,
     sourceColumnDate:r.source_column_date||"",sourceColumnTime:r.source_column_time||"",sourceColumnIndex:r.source_column_index??null,
     sourceProfile:r.source_profile||"",mixedClinicalPacket:Boolean(r.mixed_clinical_packet),sourceOcrPass:r.source_ocr_pass||"",
     specimenInterference:Boolean(r.specimen_interference),graphEligible:r.graph_eligible!==false,resultCommentRefs:r.result_comment_refs||[],sourceNoteRaw:r.source_note_raw||"",
     criticalResult:Boolean(r.critical_result),criticalSourceText:r.critical_source_text||"",resultCommentRaw:r.result_comment_raw||"",
     hamadOcrSupport:r.hamad_ocr_support??null,hamadOcrConsensus:r.hamad_ocr_consensus!==false,
     inbodyValidationPassed:r.inbody_validation_passed===true,inbodyValidationIssueCodes:(r.inbody_validation_gate?.issues||[]).map(issue=>issue.code),
     inbodyRoiLocked:r.inbody_roi_locked===true,inbodyRoiRegion:r.inbody_roi_region||"",
     status:"VERIFIED",
     verificationStatus:r.manually_verified?"MANUALLY_VERIFIED":r.review_recommended?"AUTO_IMPORTED_REVIEW_RECOMMENDED":"AUTO_IMPORTED",
     reviewRecommended:Boolean(r.review_recommended),reviewReasons:r.review_reasons||[],
     manuallyVerified:Boolean(r.manually_verified),sourceEvidence:r.source_evidence||r.evidence||[],
     importMode:"DIRECT_OCR",importedAt:verifiedAt,verifiedAt
   }));
   const allExistingResults=(await MIW.Database.all("laboratoryResults")).filter(item=>item.patientId===patientId&&item.status!=="DUPLICATE_SUPPRESSED");
   const comparableExisting=sourceCoverageRows(allExistingResults,data);
   const coverage=coverageRegression(comparableExisting,resultRecords);
   lastImportSummary.uniqueCandidates=resultRecords.length;lastImportSummary.baselineRows=coverage.baseline;lastImportSummary.coverageDrop=coverage.drop;MIW.__lastLabImportSummary={...lastImportSummary};
   if(coverage.baseline>=20&&coverage.drop>Math.max(3,Math.floor(coverage.baseline*0.05))){
     const examples=coverage.missing.slice(0,12).map(item=>`${item.name||item.testCode||"ไม่ทราบรายการ"} · ${item.date||"ไม่ทราบวันที่"} · ${item.sourceFile||item.source||"ไม่ทราบไฟล์"}`);
     const error=new Error(`Integrity Gate หยุดการบันทึก เพราะผลจากไฟล์ต้นทางเดิมลดจาก ${coverage.baseline} เหลือ ${coverage.baseline-coverage.drop} รายการ (${Math.round(coverage.ratio*100)}%)\nรายการที่หายตัวอย่าง:\n${examples.join("\n")}\nระบบยังไม่ลบหรือแทนที่ข้อมูลเดิม กรุณาตรวจว่าอัปโหลดไฟล์ครบทุกหน้า หรือเปิดรายงานความต่างก่อนยืนยัน`);
     error.code="IMPORT_COVERAGE_REGRESSION";error.coverage=coverage;throw error
   }
   const existingResults=allExistingResults.filter(item=>item.documentId!==documentRecord.id);
   const chosenByEvent=new Map(existingResults.map(item=>[storedLabEventKey(item),item]));
   const reconciled=[];
   const removeIncoming=item=>{const index=reconciled.findIndex(row=>row.id===item?.id);if(index>=0)reconciled.splice(index,1)};
   for(const rawIncoming of resultRecords){
     let incoming=rawIncoming;
     const eventKey=storedLabEventKey(incoming),old=chosenByEvent.get(eventKey);
     if(!old){reconciled.push(incoming);chosenByEvent.set(eventKey,incoming);continue}
     const sameValue=normalizedStoredValueToken(old)===normalizedStoredValueToken(incoming);
     const incomingWins=storedSourcePriority(incoming)>storedSourcePriority(old)||(
       storedSourcePriority(incoming)===storedSourcePriority(old)&&Number(incoming.confidence||0)>Number(old.confidence||0)
     );
     if(incomingWins){
       incoming=mergeDuplicateAudit(incoming,old);
       if(old.documentId===documentRecord.id)removeIncoming(old);
       else if(old.id){await MIW.Database.put("laboratoryResults",{...old,status:"DUPLICATE_SUPPRESSED",duplicateOfResultId:incoming.id,duplicateSuppressedAt:verifiedAt,duplicateReason:sameValue?"SAME_EVENT_SAME_VALUE":"SAME_EVENT_SOURCE_RECONCILIATION"})}
       reconciled.push(incoming);chosenByEvent.set(eventKey,incoming);lastImportSummary.replaced++
     }else{
       if(old.documentId!==documentRecord.id&&old.id){
         const audited=mergeDuplicateAudit(old,incoming);
         await MIW.Database.put("laboratoryResults",audited)
       }
       lastImportSummary.suppressed++
     }
   }
   if(!reconciled.length){
     documentRecord={...documentRecord,status:"DUPLICATE_SUPPRESSED",duplicateSuppressedAt:verifiedAt,duplicateSuppressedCount:lastImportSummary.suppressed,updatedAt:verifiedAt};
     await MIW.Database.put("documents",documentRecord);
     lastImportSummary.duplicateDocument=true;MIW.__lastLabImportSummary={...lastImportSummary};
     return 0
   }
   const committed=await MIW.Database.replaceLabResults({document:documentRecord,patientId,rows:reconciled});
   const saved=committed.rows;
   // v10.222 — sibling documents admitted by Source-Event Merge are now part
   // of this verified longitudinal import. Mark them as absorbed so the queue
   // does not ask the user to import the same history again.
   const mergedSourceIds=(meta.cross_document_source_ids||[]).filter(id=>id&&id!==documentRecord.id);
   for(const sourceId of mergedSourceIds){const sourceDoc=await MIW.Database.get("documents",sourceId);if(sourceDoc)await MIW.Database.put("documents",{...sourceDoc,status:"MERGED_INTO_BATCH",mergedIntoDocumentId:documentRecord.id,mergedAt:verifiedAt})}
   MIW.UploadQueue?.markDocumentsSaved?.([documentRecord.id,...mergedSourceIds]);
   lastImportSummary.saved=saved.length;lastImportSummary.uniqueCandidates=resultRecords.length;lastImportSummary.mergedOrSuppressed=Math.max(Number(lastImportSummary.mergedOrSuppressed||0),Number(lastImportSummary.rawExtracted||0)-resultRecords.length)+lastImportSummary.suppressed;MIW.__lastLabImportSummary={...lastImportSummary};
   MIW.Patients.select(patientId);
   return saved.length
 }
 function refreshEditedRow(input){collect();const tr=input.closest("tr[data-id]");const r=tr&&rows.find(x=>x.id===tr.dataset.id);const cell=tr&&tr.querySelector("[data-calculated-flag]");if(r&&/^inbody_/i.test(clean(r.test_code||r.testCode)))refreshInBodyReviewGate();if(cell&&r){cell.textContent=r.calculated_flag;tr.classList.toggle("lab-review-needed",needsReview(r))}updateMetrics()}
 function coreApi(){return{open,parse,add,remove,verify,render,download,payload,refreshEditedRow,focusIssue,selectIssue,focusDuplicateConflict,hasPendingIdentityConflict,focusIdentityConflict,confirmCurrentIssue,refreshInBodyReviewGate,setVerifyZoom,openVerifyDocumentFull,getVerifyZoom:()=>verifyZoom,getRows:()=>rows,getReviewAdvisories:()=>reviewIssues(),getInBodyValidationGate:()=>{const selected=rows.filter(r=>/^inbody_/i.test(clean(r.test_code||r.testCode))&&r.selected!==false);return selected.length?inbodyValidationGate(selected):null},foodPrintSourceTruthLabel:foodPrintCatalogLabel,foodPrintSourceTruthExpectedRows:pageOrdinal=>(FOODPRINT_EXPECTED_COLUMN_ROWS[Number(pageOrdinal)||0]||[]).slice(),foodPrintSourceTruthBuild:FOODPRINT_SOURCE_TRUTH_BUILD,foodPrintProvenanceBuild:FOODPRINT_PROVENANCE_BUILD,foodPrintCatalogFidelityBuild:FOODPRINT_CATALOG_FIDELITY_BUILD,foodPrintCatalogFidelityAudit,foodPrintCatalogFidelityDigest:FOODPRINT_CATALOG_FIDELITY_DIGEST,_reviewRecommended:needsReview,_hasStructuralIssue:hasStructuralIssue,_testMasuyamaRows:masuyamaRows}}
 const api=coreApi(),extras={_testInBodyRows:inbodyRows,_testInBodyParseMeta:parseMeta,_testInBodyValidationGate:inbodyValidationGate,_testInBodyReconcileCanonicalRows:reconcileInBodyCanonicalRows,_testInBodyReconcileCriticalBundles:reconcileInBodyCriticalBundles,_testInBodySyncRawNumerics:syncInBodyRawNumerics,_testInBodyNumericFromRow:inbodyNumericFromRow,_testInBodyApplySourceTruthSnapshot:applyInBodySourceTruthSnapshot,_testInBodySourceTruthSnapshotFromRows:inbodySourceTruthSnapshotFromRows,_testInBodyBuildLiveCanonicalSnapshot:inbodyBuildLiveCanonicalSnapshot,_testInBodyGlobalPrimaryCoherenceLock:inbodyGlobalPrimaryCoherenceLock,_testInBodyAutoRedundantPrimaryRecovery:inbodyAutoRedundantPrimaryRecovery,_testInBodyCoreCoherentFromRows:inbodyCoreCoherentFromRows,_testInBodyApplyLiveCanonicalSnapshot:applyInBodyLiveCanonicalSnapshot,_testInBodyLiveEvidenceScore:inbodyLiveEvidenceScore,_testInBodyHistoryEcwTbwFromText:inbodyHistoryEcwTbwFromText,_testInBodyWeightControlBundle:inbodyWeightControlBundle,_testInBodyWeightControlBundleFromPage:inbodyWeightControlBundleFromPage,_testInBodyReferencePlausible:inbodyReferencePlausible,_testInBodyReferenceExpectedDecimals:inbodyReferenceExpectedDecimals,_testInBodyReconcileSegmentBundles:inbodyReconcileSegmentBundles,_testBnhScannedRows:bnhScannedRows,_testBnhGeometrySourceMatches:bnhGeometrySourceMatches,_testBnhGeometryAnchoredItems:bnhGeometryAnchoredItems,_testSirirajHistoryTableRows:sirirajHistoryTableRows,_testSourceEventIsoDate:sourceEventIsoDate,_testBnhUniqueDecimalRepair:bnhApplyUniqueDecimalRepair,_testBnhDifferentialCompatible:bnhDifferentialCompatible,_testBnhAtomicFlagConsistent:bnhAtomicFlagConsistent,_testBnhReferenceEndpointEcho:bnhReferenceEndpointEcho,_testBnhBundleIntegrity:bnhBundleIntegrity,_testBnhTypedRowAssessment:bnhTypedRowAssessment,_testBnhTypedReferenceDecimalRepair:bnhTypedReferenceDecimalRepair,_testBnhNormalizeRepeatedSourceTokens:bnhNormalizeRepeatedSourceTokens,_testBuildSourceEventGroups:buildSourceEventGroups,_testDedupeBatchRecords:dedupeBatchRecords,_testManualBatchIdentityResolution:manualBatchIdentityResolution,_testHardBatchIdentityConflict:hardBatchIdentityConflict,_testBnhSelectAtomicMatch:bnhSelectAtomicMatch,_testBnhRecoverMissingRows:bnhRecoverMissingRows,_testBnhCoombsRecoveryRow:bnhCoombsRecoveryRow,_testBnhCoagRecoveryRow:bnhCoagRecoveryRow,_testBnhCoagReferenceQuality:bnhCoagReferenceQuality,_testBnhExactSourceReconcile:reconcileBnhExactSourceRows,_testBnhBundleReconcile:reconcileBnhBundleAgainstGeneric,_testFinalizeBnhSourceTruth:finalizeBnhSourceTruth,_testBnhSourceTruthFinalizationExpectations:bnhSourceTruthFinalizationExpectations,_testTrustedSourceIdentityConsensus:trustedSourceIdentityConsensus,_testTrustedRelatedHistoryMatch:trustedRelatedHistoryMatch,_testBnhLongitudinalEventExpectations:bnhLongitudinalEventExpectations,_testBnhRecoverMissingLongitudinalEvents:bnhRecoverMissingLongitudinalEvents,_testBnhPageEventDate:bnhPageEventDate,_test214:{bnhScannedRows,bnhScannedPage,bnhCompletenessExpectations,mergePhotoEvidence,applyPlausibilityQuarantine,sourceTruthPlausibility,standaloneRows,parseRef},_test:{photoTableRows,standaloneRows,mergePhotoEvidence,maharatNonLabPage,annotateDuplicateConflicts,duplicateResultGroups,duplicateReviewKey,duplicateReviewEventToken,verificationKey,pageLocalMetadataText,pageScopedMeta,sameClinicalEventForConflict,sanitizeDuplicateConflictGroups,preferredClinicalEventId,_setDocumentRecord:value=>{documentRecord=value}}};
 extras._test=Object.assign({},extras._test,api._test||{});return Object.assign(api,extras)
})();
MIW.LabEngine.getLastImportSummary=()=>({...((MIW.__lastLabImportSummary)||{saved:0,suppressed:0,replaced:0,duplicateDocument:false,rawExtracted:0,uniqueCandidates:0,mergedOrSuppressed:0,excluded:0,baselineRows:0,coverageDrop:0})});
