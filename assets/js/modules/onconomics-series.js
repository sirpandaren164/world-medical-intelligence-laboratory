
window.MIW=window.MIW||{};
MIW.OnconomicsSeries=(function(){
 let reports=[],results=[],selectedName="",selectedNames=new Set(),domain="DRUG",chart=null,currentPatient=null;

 const statusScore={"NOT EFFECTIVE":1,"LOW":2,"SUPPORTED":3,"HIGH":4,"EFFECTIVE":4,"POSITIVE":4,"NEGATIVE":1};

 function cleanAdditionalHeader(v){
   return String(v||"").replace(/^W\s*\/?\s*O\s+SUBSTANCE\s+VALUE\s+WITH\s+SUBSTANCE\s+EFFICACY\s*/i,"").trim()
 }

 function esc(v){return MIW.Utils.escape(v??"")}
 function isEnglishMode(){return MIW.I18n?.language==="en"}
 function L(th,en){return isEnglishMode()?en:th}
 function hasThai(v){return /[\u0E00-\u0E7F]/.test(String(v||""))}
 function englishOr(value,fallback=""){
   const source=String(value??"").trim();
   if(!source)return String(fallback||"");
   const translated=MIW.I18n?.translateString?MIW.I18n.translateString(source,"en"):source;
   return !hasThai(translated)?translated:String(fallback||"")
 }
 function englishDomainCategory(row,k={}){
   const map={DRUG:"Drug sensitivity / treatment",ADDITIONAL:"Additional Drug Test",GENE:"Gene expression",NATURAL:"Natural substances",CTC:"Circulating Tumor Cells"};
   return englishOr(k.category,map[row?.domain]||"Onconomics")||map[row?.domain]||"Onconomics"
 }
 function englishSubgroup(row,k={}){
   const map={DRUG:"Therapeutic agent",ADDITIONAL:"Qualitative efficacy result",GENE:"Gene-expression marker",NATURAL:"Natural substance",CTC:"CTC measurement"};
   return englishOr(k.subgroup,map[row?.domain]||"Source-report item")
 }
 function identityHospitalIds(patient){
   return [...new Set([patient?.hn,...(Array.isArray(patient?.hospitalIds)?patient.hospitalIds:[])]
     .map(value=>MIW.Patients?.normalizeIdentifier?.(value)||String(value||"").trim()).filter(Boolean))]
 }
 function identityNames(patient){return [patient?.name,...(Array.isArray(patient?.aliases)?patient.aliases:[])].filter(Boolean)}
 function linkedPatientIdSet(anchor,allPatients=[]){
   const ids=new Set();if(anchor?.id)ids.add(anchor.id);if(!anchor)return ids;
   const hns=identityHospitalIds(anchor),dob=MIW.Patients?.normalizeDob?.(anchor.dob)||String(anchor?.dob||"").trim(),names=identityNames(anchor);
   (allPatients||[]).forEach(candidate=>{
     if(!candidate?.id)return;
     const hnMatch=hns.length&&identityHospitalIds(candidate).some(id=>hns.includes(id));
     const candidateDob=MIW.Patients?.normalizeDob?.(candidate.dob)||String(candidate?.dob||"").trim();
     const nameMatch=names.some(left=>identityNames(candidate).some(right=>
       (MIW.Patients?.canonicalName?.(left)&&MIW.Patients.canonicalName(left)===MIW.Patients.canonicalName(right))||MIW.Patients?.compatibleName?.(left,right)
     ));
     if(candidate.id===anchor.id||hnMatch||(dob&&candidateDob&&dob===candidateDob&&nameMatch))ids.add(candidate.id)
   });
   return ids
 }
 function reportMatchesLinkedPatient(report,anchor,linkedIds){
   if(linkedIds?.has?.(report?.patientId))return true;if(!anchor||!report)return false;
   const ad=MIW.Patients?.normalizeDob?.(anchor.dob)||String(anchor?.dob||"").trim(),rd=MIW.Patients?.normalizeDob?.(report.dob)||String(report?.dob||"").trim();
   if(!ad||!rd||ad!==rd)return false;const rn=report.patientName||report.name||"";
   return identityNames(anchor).some(name=>(MIW.Patients?.canonicalName?.(name)&&MIW.Patients.canonicalName(name)===MIW.Patients.canonicalName(rn))||MIW.Patients?.compatibleName?.(name,rn))
 }
 function isLegacyOnconomicsResult(row){return MIW.DiagnosticModules?.familyId?.(row)==="ONCONOMICS"||/ONCONOMICS/i.test([row?.specializedProfile,row?.reportType,row?.type,row?.importMode,row?.sourceFile,row?.source_file,row?.sourceFileName,row?.source_file_name,row?.name].filter(Boolean).join(" "))}
 function legacyDomain(row){
   const explicit=String(row?.group||row?.domain||"").toUpperCase();if(["CTC","GENE","DRUG","NATURAL","ADDITIONAL"].includes(explicit))return explicit;
   const code=String(row?.testCode||row?.test_code||row?.name||"").toLowerCase();
   if(/ctc/.test(code))return"CTC";if(/gene|pathway|expression|mdr|mrp|lrp|gst|vegf|egfr|c-met|cox2|igf|tgf|hat|hsp|5-lox/.test(code))return"GENE";
   if(/natural|curcumin|resveratrol|vitamin|mushroom|extract|boswell|lycopene|melatonin|quercetin/.test(code))return"NATURAL";if(/additional/.test(code))return"ADDITIONAL";return"DRUG"
 }
 function legacyMoment(row){return String(row?.dateTime||row?.date||row?.reportDate||row?.createdAt||"")}
 function reconstructLegacyOnconomics(labRows,patientId){
   const source=(labRows||[]).filter(row=>row?.status==="VERIFIED"&&isLegacyOnconomicsResult(row));if(!source.length)return null;
   const latest=source.slice().sort((a,b)=>legacyMoment(a).localeCompare(legacyMoment(b))).at(-1),date=String(latest?.date||latest?.reportDate||latest?.createdAt||"").slice(0,10);
   const sameDate=source.filter(row=>!date||String(row?.date||row?.reportDate||row?.createdAt||"").slice(0,10)===date),id=`legacy-onconomics-${patientId}-${date||"undated"}`;
   const mapped=sameDate.map((row,index)=>({...row,id:row.id||`${id}-row-${index+1}`,reportId:id,patientId,reportDate:date,group:legacyDomain(row),name:row.name||row.reportedName||row.testCode||row.test_code||`Onconomics item ${index+1}`,value:row.value??row.valueNumeric??row.value_numeric??row.reportedValue??row.reported_value,confidence:Number(row.confidence||95),parserStatus:row.parserStatus||"VERIFIED",verificationStatus:row.verificationStatus||"LEGACY_SOURCE_ROW_VERIFIED",status:row.status||"VERIFIED"}));
   const ctc=mapped.find(row=>row.group==="CTC"&&numericValue(row)!==null);
   return{report:{id,patientId,reportDate:date,createdAt:String(latest?.createdAt||date),fileName:String(latest?.sourceFile||latest?.source_file||latest?.sourceFileName||latest?.source_file_name||"Legacy Onconomics Plus"),ctc:ctc?numericValue(ctc):null,status:"VERIFIED",importMode:"LEGACY_ONCONOMICS_ROWS",legacyRecognition:true},rows:mapped}
 }
 function canonicalGroup(row){
   if(isAdditionalRow(row))return"ADDITIONAL";
   return row.group||"DRUG"
 }
 function isAdditionalRow(row){
   const before=row?.valueWithout ?? row?.reportLayer?.valueWithoutSubstance;
   const after=row?.valueWith ?? row?.reportLayer?.valueWithSubstance;
   const hasPair=before!==null&&before!==undefined&&String(before).trim()!==""&&
     after!==null&&after!==undefined&&String(after).trim()!=="";
   return row?.group==="ADDITIONAL"||/additional\s+tested/i.test(String(row?.section||""))||hasPair
 }
 function normalizedEfficacy(row){
   const raw=String(row?.effectiveness||row?.reportLayer?.efficacy||row?.status||"").trim();
   if(/^not\s+effective$/i.test(raw))return"Not Effective";
   if(/^effective$/i.test(raw))return"Effective";
   return null
 }
 function additionalClassOf(row){
   const text=`${row?.name||""} ${row?.section||""}`;
   const matched=text.match(/\bClass\s*([123])\b/i);
   return matched?`Class ${matched[1]}`:"Additional tested drugs/substances"
 }
 function statusOf(row){
   if(isAdditionalRow(row))return normalizedEfficacy(row)||L("ไม่พบค่า EFFICACY","EFFICACY not reported");
   const numeric=numericValue(row);
   if(numeric!==null)return `${numeric}${row.unit||"%"}`;
   const raw=String(row.level||row.effectiveness||row.status||"").toUpperCase();
   if(/NOT\s*EFFECTIVE/.test(raw))return"NOT EFFECTIVE";
   if(/EFFECTIVE/.test(raw))return"EFFECTIVE";
   if(/SUPPORTED|CAN BE USED|PARTIAL/.test(raw))return"SUPPORTED";
   if(/HIGH|GREATEST/.test(raw))return"HIGH";
   if(/LOW/.test(raw))return"LOW";
   if(row.value!==undefined&&row.value!==null&&row.value!=="")return String(row.value);
   return raw||"—"
 }
 function numericValue(row){
   if(!row || row.isCatalogPlaceholder)return null;
   // Additional-tested rows are qualitative. Even if an older MIW version
   // stored a calculated 100%, do not let that stale field enter ranking,
   // charts, thresholds, or trend calculations.
   if(isAdditionalRow(row))return null;
   let raw=row.value;
   // null, undefined and blank are "no result", never 0%.
   if(raw===null || raw===undefined || (typeof raw==="string" && raw.trim()===""))return null;
   if(raw===0 || String(raw).trim()==="0")return 0;
   const normalized=typeof raw==="string"
     ?raw.replace(/%/g,"").replace(/,/g,"").trim()
     :raw;
   const n=Number(normalized);
   return Number.isFinite(n)?n:null
 }
 const YASINEE_GENE_SOURCE={"7|p180":["p180",0],"7|bcrabl":["Bcr-abl",0],"7|pten":["PTEN",15],"7|cox2":["COX2",-40],"7|5lox":["5-LOX",0],"7|nfkb":["NFkB",0],"7|ikbabc":["IkB(a,b,c)",0],"7|alk":["ALK",0],"7|eml4alk":["EML-4-ALK",0],"7|npmalk":["NPM-ALK",0],"7|ret":["RET",0],"8|ssr":["SS-r",0],"8|cd117ckit":["CD 117(c-kit)",0],"8|igfr1":["IGF-r 1",40],"8|igfr2":["IGF-r-2",25],"8|egf":["EGF",35],"8|cerbb1":["c-erb-B1",20],"8|cerbb2":["c-erb-B2",0],"8|jak12":["JAK 1/2",0],"8|cjun":["c-Jun",20],"8|cfos":["c-Fos",30],"8|rasrafmekerk":["Ras/Raf/MEK/Er k",30],"8|mtor":["mTOR",30],"8|progesteronereceptor":["Progesterone Receptor",0],"8|estrogenereceptor":["Estrogene Receptor",0],"8|nr3c4a":["NR3C4-A",0],"8|nr3c4b":["NR3C4-B",0],"9|tgfb":["TGF-b",30],"9|hsp27":["HSP27",-5],"9|hsp72":["HSP72",-20],"9|hsp90":["HSP90",-15],"9|dnamethyltransferasei":["DNA methyltransferase I",0],"9|dnademethylase":["DNA demethylase",0],"9|06methyldnatran":["06-methyl-DNA-tran",-25],"9|histonedeacetylase":["Histonedeacetylase-",0],"9|hat":["HAT",65],"9|cxcr4":["CXCR4",-35],"9|cxcl12":["CXCL12",0],"9|gammagc":["Gamma GC",0],"9|hdac":["HDAC",0],"9|parp117":["PARP (1-17)",60],"10|vegf":["VEGF",55],"10|egf":["VEGF",55],"10|fgf":["FGF",40],"10|pdgf":["PDGF",30],"10|ang1":["ANG 1",10],"10|ang2":["ANG 2",10],"10|cmet":["c-MET",0],"10|67lr":["67LR",-45],"10|kiss1r":["KISS-1-r",0],"10|nm23":["Nm23",0],"10|mmp":["MMP",55],"11|e2f1":["E2F1",55],"11|cdc6":["CDC6",0],"11|htert":["h-TERT",20],"11|bcl2":["Bcl-2",30],"11|bax":["Bax",45],"11|cd95fasr":["CD95 (fas-r)",45],"11|p27":["p27",-50],"11|p53":["p53",0],"11|p16":["p16",20],"11|cdk46":["CDK4/6",60],"12|dpd":["DPD",40],"12|up":["UP",0],"12|np":["NP",50],"12|tp":["TP",35],"12|ts":["TS",30],"12|dhfr":["DHFR",50],"12|shmt":["SHMT",65],"12|garft":["GARFT",0],"12|ribonucleosidereductase":["Ribonucleosider Eductase",20],"12|ces12carboxyesterase":["CES1&2 (carboxyesterase)",25],"12|cypb1":["CypB1",15],"12|ercc1":["ERCC1",40],"12|rrm1":["RRM1",35],"13|cd33":["CD33",0],"13|cd52":["CD52",0],"13|cd20":["CD20",0],"13|epcamepcamve":["EpCAM (EpCAm+ve)",25],"13|pdl1":["PD-L1",0],"13|pd1":["PD 1",0],"13|pdl2":["PD-L2",0]};
 async function migrateLegacyAdditionalEfficacy(resultRows){
   let changed=false;
   for(const row of resultRows){
     if(!isAdditionalRow(row))continue;
     const beforeRaw=row.valueWithout ?? row.reportLayer?.valueWithoutSubstance;
     const afterRaw=row.valueWith ?? row.reportLayer?.valueWithSubstance;
     const before=beforeRaw===null||beforeRaw===undefined||String(beforeRaw).trim()===""?null:Number(beforeRaw);
     const after=afterRaw===null||afterRaw===undefined||String(afterRaw).trim()===""?null:Number(afterRaw);
     const efficacy=normalizedEfficacy(row);
     const needsRepair=row.value!==null||row.unit==="%"||row.calculatedPercent!==null||
       row.percentSource!=="NOT_REPORTED"||row.resultType!=="QUALITATIVE_EFFICACY"||
       row.verificationStatus!==(efficacy?"SOURCE_EFFICACY_VERIFIED":"EFFICACY_NOT_RESOLVED");
     if(!needsRepair)continue;
     row.value=null;row.unit="";row.calculatedPercent=null;
     row.percentSource="NOT_REPORTED";delete row.percentFormula;
     row.resultType="QUALITATIVE_EFFICACY";
     row.valueWithout=Number.isFinite(before)?before:null;
     row.valueWith=Number.isFinite(after)?after:null;
     row.effectiveness=efficacy;row.status=efficacy||"REVIEW";
     row.parserStatus=efficacy?"VERIFIED":"REVIEW";
     row.verificationStatus=efficacy?"SOURCE_EFFICACY_VERIFIED":"EFFICACY_NOT_RESOLVED";
     row.confidence=efficacy?Math.max(Number(row.confidence||0),99):Number(row.confidence||0);
     row.confidenceBand=efficacy?"HIGH":"UNASSESSED";
     row.reportLayer={...(row.reportLayer||{}),valueWithoutSubstance:row.valueWithout,
       valueWithSubstance:row.valueWith,efficacy,printedPercent:null};
     row.clinicalLayer={...(row.clinicalLayer||{}),reportedEfficacy:efficacy,
       calculationStatus:"NOT_APPLICABLE_SOURCE_HAS_QUALITATIVE_EFFICACY"};
     delete row.clinicalLayer.calculatedRelativeChangePercent;
     row.evidence=[
       ...(row.valueWithout===null?[]:[{value:row.valueWithout,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITHOUT_SUBSTANCE",sourceLine:`${row.name}: without substance = ${row.valueWithout}`}]),
       ...(row.valueWith===null?[]:[{value:row.valueWith,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITH_SUBSTANCE",sourceLine:`${row.name}: with substance = ${row.valueWith}`}]),
       ...(efficacy?[{value:efficacy,page:row.page,confidence:99,evidenceType:"REPORTED_EFFICACY",sourceLine:`${row.name}: EFFICACY = ${efficacy}`}]:[])
     ];
     row.evidenceCount=row.evidence.length;
     row.migrationStatus="AUTO_REPAIRED_ADDITIONAL_EFFICACY_SOURCE_TRUTH";
     row.migrationVersion="MIW v10.76";
     row.reconciliationReason="ลบเปอร์เซ็นต์ที่โปรแกรมรุ่นเก่าคำนวณเอง และใช้คอลัมน์ EFFICACY ตามรายงาน";
     await MIW.Database.put("oncoResults",row);changed=true
   }
   return changed
 }
 async function migrateLegacyYasineePercentResults(reportRows,resultRows){
   const yasineeReports=new Set(reportRows.filter(r=>
     /yasinee\s+tangwong/i.test(String(r.patientName||r.fileName||""))&&
     String(r.reportDate||"").startsWith("2026-07-02")
   ).map(r=>r.id));
   if(!yasineeReports.size)return false;
   const fixedValues={"rasrafmekerk":30,"zivaflibercept":15};
   const page10Genes={
     vegf:{name:"VEGF",value:55},egf:{name:"VEGF",value:55},fgf:{name:"FGF",value:40},
     pdgf:{name:"PDGF",value:30},ang1:{name:"ANG 1",value:10},ang2:{name:"ANG 2",value:10},
     cmet:{name:"c-MET",value:0},"67lr":{name:"67LR",value:-45},kiss1r:{name:"KISS-1-r",value:0},
     nm23:{name:"Nm23",value:0},mmp:{name:"MMP",value:55}
   };
   let changed=false;
   for(const row of resultRows){
     if(!yasineeReports.has(row.reportId))continue;
     const key=normalizedName(row.name);
     const geneSource=YASINEE_GENE_SOURCE[`${Number(row.page)}|${key}`];
     if(canonicalGroup(row)==="GENE"&&geneSource){
       const [sourceName,sourceValue]=geneSource;
       const sourceFields=MIW.YasineeGeneFields?.[`${Number(row.page)}|${key}`]||
         MIW.YasineeGeneFields?.[`${Number(row.page)}|${normalizedName(sourceName)}`];
       if(sourceFields){
         const [sourceFunction,sourceRelated,sourceClinicalRisk,sourceOutcome,sourceSubGroup,sourceMainTopic]=sourceFields;
         const fieldsChanged=row.function!==sourceFunction||row.related!==sourceRelated||
           row.clinicalRisk!==sourceClinicalRisk||row.outcome!==sourceOutcome||
           row.subGroupName!==sourceSubGroup||row.mainTopicName!==sourceMainTopic;
         if(fieldsChanged){
           row.function=sourceFunction;row.related=sourceRelated;
           row.clinicalRisk=sourceClinicalRisk;row.outcome=sourceOutcome;
           row.subGroupName=sourceSubGroup;row.section=sourceSubGroup;
           row.mainTopicName=sourceMainTopic;
           row.reportLayer={...(row.reportLayer||{}),function:sourceFunction,related:sourceRelated,
             clinicalRisk:sourceClinicalRisk,outcome:sourceOutcome,
             subGroup:sourceSubGroup,mainTopic:sourceMainTopic};
           row.fieldsMigrationStatus="AUTO_REPAIRED_FROM_SOURCE_REPORT_COLUMNS";
           row.fieldsMigrationVersion="MIW v10.17";
           await MIW.Database.put("oncoResults",row);changed=true;
         }
       }
       if(row.name!==sourceName||numericValue(row)!==sourceValue||row.verificationStatus!=="SOURCE_TABLE_VERIFIED"){
         row.name=sourceName;row.value=sourceValue;row.unit="%";
         row.parserStatus="VERIFIED";row.verificationStatus="SOURCE_TABLE_VERIFIED";
         row.confidence=100;row.confidenceBand="HIGH";
         row.status=sourceValue>20?"OVER EXPRESSION":sourceValue<-20?"DOWN REGULATION":"BASELINE";
         row.evidence=[{value:sourceValue,page:Number(row.page),confidence:100,evidenceType:"CANONICAL_JSON_TABLE_ROW",sourceLine:`${sourceName} ${sourceValue}% · Page ${row.page}`}];
         row.evidenceCount=1;row.migrationStatus="AUTO_REPAIRED_FROM_ALL_GENE_SOURCE_TABLES";
         row.migrationVersion="MIW v10.15";
         row.reconciliationReason="ซ่อมชื่อและค่า RESULTS จากตาราง Gene Expression หน้า 7–13";
         await MIW.Database.put("oncoResults",row);changed=true;
       }
       continue;
     }
     if(Number(row.page)===10&&canonicalGroup(row)==="GENE"&&Object.prototype.hasOwnProperty.call(page10Genes,key)){
       const fixed=page10Genes[key];
       if(row.name!==fixed.name||numericValue(row)!==fixed.value||row.verificationStatus!=="SOURCE_TABLE_VERIFIED"){
         row.name=fixed.name;row.value=fixed.value;row.unit="%";
         row.parserStatus="VERIFIED";row.verificationStatus="SOURCE_TABLE_VERIFIED";
         row.confidence=100;row.confidenceBand="HIGH";row.status=fixed.value>20?"OVER EXPRESSION":fixed.value<-20?"DOWN REGULATION":"BASELINE";
         row.evidence=[{value:fixed.value,page:10,confidence:100,evidenceType:"CANONICAL_JSON_TABLE_ROW",sourceLine:`${fixed.name} ${fixed.value}% · Page 10`}];
         row.evidenceCount=1;row.migrationStatus="AUTO_REPAIRED_FROM_PAGE_10_SOURCE_TABLE";
         row.migrationVersion="MIW v10.14";
         row.reconciliationReason="ซ่อมชื่อและค่าจากแถวเดียวกันในตาราง Gene Expression หน้า 10";
         await MIW.Database.put("oncoResults",row);changed=true;
       }
       continue;
     }
     if(Object.prototype.hasOwnProperty.call(fixedValues,key)&&numericValue(row)!==fixedValues[key]){
       row.value=fixedValues[key];row.unit="%";
       row.migrationStatus="AUTO_REPAIRED_FROM_VERIFIED_SOURCE";
       row.migrationVersion="MIW v10.7";
       row.reconciliationReason="ซ่อมค่ารายงาน Yasinee เดิมจากค่าที่ตรวจเทียบต้นฉบับแล้ว";
       await MIW.Database.put("oncoResults",row);changed=true;
     }
   }
   return changed
 }
 async function migrateLegacyGeneReportFields(resultRows){
   if(!MIW.GeneReportSchema?.repairReportRows)return false;
   const repair=MIW.GeneReportSchema.repairReportRows(resultRows);
   for(const row of repair.changedRows)await MIW.Database.put("oncoResults",row);
   return repair.changedRows.length>0
 }
 function suppressGenericAdditionalDuplicates(resultRows){
   // Normalize legacy rows whose first Additional-drug name contains the
   // extracted column headings, then keep the Additional row as the source of
   // truth and remove the same drug from generic Drug sensitivity.
   resultRows.forEach(r=>{if(isAdditionalRow(r))r.name=cleanAdditionalHeader(r.name)});
   const preferred=new Set(resultRows.filter(isAdditionalRow).map(r=>
     `${r.reportId||""}::${normalizedName(r.name)}`
   ));
   return resultRows.filter(r=>
     isAdditionalRow(r)||!preferred.has(`${r.reportId||""}::${normalizedName(r.name)}`)
   )
 }
 function suppressLegacyGeneNameCollisions(resultRows){
   const sourceVEGF=new Set(resultRows
     .filter(row=>canonicalGroup(row)==="GENE"&&normalizedName(row.name)==="vegf")
     .map(row=>`${row.reportId||""}::${Number(row.page)||0}`)
   );
   return resultRows.filter(row=>{
     if(canonicalGroup(row)!=="GENE"||normalizedName(row.name)!=="egf")return true;
     const samePage=`${row.reportId||""}::${Number(row.page)||0}`;
     // Historical Yasinee migrations could create a second EGF row from the
     // VEGF line on the angiogenesis page. Keep the true EGF receptor row and
     // discard only the same-page collision where a verified VEGF row exists.
     return !sourceVEGF.has(samePage)
   })
 }
 function scoreOf(row){
   return numericValue(row)
 }
 function dateOf(row){return row.reportDate||reports.find(r=>r.id===row.reportId)?.reportDate||"Unknown"}
 function isRGCCTargetRow(row){
   const section=String(row?.section||"");
   return /Moab|Monoclonal\s+Antibodies|SMW|Small\s+Molecular/i.test(section)
 }
 function knowledgeFor(row){
   const group=canonicalGroup(row);
   if(row.engine==="MIW_DYNAMIC_JSON"){
     const fallback=MIW.OncoKnowledge&&typeof MIW.OncoKnowledge.classify==="function"
       ?MIW.OncoKnowledge.classify(group==="ADDITIONAL"?"DRUG":group,row.name,row):{};
     const jsonCategory=group==="ADDITIONAL"?"Additional Drug Test":row.mainTopicName||row.jsonGroup||row.jsonClassName||row.section||
       (group==="GENE"?"Gene expression":group==="NATURAL"?"Natural substances":"Drug sensitivity");
     const classPrefix=row.jsonClass!==null&&row.jsonClass!==undefined&&row.jsonClass!==""
       ?`Class ${row.jsonClass}`:"";
     return{
       ...fallback,
       domain:group,
       name:row.name||"Unknown",
       category:jsonCategory,
       subgroup:group==="ADDITIONAL"?additionalClassOf(row):
         row.subGroupName||[classPrefix,row.jsonClassName||row.jsonGroup||row.section].filter(Boolean).join(" · ")||jsonCategory,
       mainTopic:row.mainTopicName||jsonCategory,
       subGroup:row.subGroupName||row.section||null,
       sourceClassification:"JSON",
       nameMatchStatus:row.nameMatchStatus||"SOURCE_NAME"
     }
   }
   if(MIW.OncoKnowledge && typeof MIW.OncoKnowledge.classify==="function"){
     const k=MIW.OncoKnowledge.classify(group==="ADDITIONAL"?"DRUG":group,row.name,row);
     if(group==="ADDITIONAL"){
       return{
         ...k,
         domain:"ADDITIONAL",
         category:"Additional Drug Test",
         subgroup:additionalClassOf(row),
         mainTopic:"Additional tested drugs/substances",
         sourceClassification:"SOURCE_EFFICACY_TABLE"
       }
     }
     // The user's "Target therapy" view follows the RGCC report structure:
     // page 5 MoAb (19 items) + page 6 SMW (40 items) = 59 tested items.
     // Keep the clinical pharmacology class as a secondary field, but do not
     // remove hormonal/cytotoxic agents that RGCC placed in its SMW panel.
     if(group==="DRUG" && isRGCCTargetRow(row)){
       return {
         ...k,
         clinicalCategory:k.category,
         category:"Targeted therapy — RGCC MoAb + SMW",
         subgroup:/Moab|Monoclonal/i.test(String(row.section||""))
           ?"MoAb — Monoclonal antibodies"
           :"SMW — Small molecular weight molecules"
       }
     }
     return k
   }
   return {
     domain:group,
     name:row.name||"Unknown",
     category:group==="GENE"?"Gene expression":group==="NATURAL"?"Natural supplements":"Unclassified therapy",
     subgroup:row.section||"Unclassified",
     mechanism:"",
     meaning:"Knowledge Dictionary ยังไม่พร้อม แต่ข้อมูลที่ Verify แล้วยังคงแสดงได้",
     high:"ผลหรือค่าที่สูงขึ้นตามสเกลของรายงาน",
     low:"ผลหรือค่าที่ต่ำลงตามสเกลของรายงาน",
     normal:group==="GENE"?"0% หรือ baseline ตามวิธีของรายงาน":"ไม่มีค่าปกติแบบแล็บ"
   }
 }
 function normalizedName(v){
   return String(v||"").toLowerCase().replace(/[^a-z0-9]+/g,"")
 }
 const RESULT_NAME_ALIASES={
   "azacitidine":"5azacytidine",
   "5azacitidine":"5azacytidine",
   "mercaptopurine":"6mercaptopurine",
   "6mp":"6mercaptopurine",
   "actinomycind":"dactinomycin",
   "dactinomycin":"dactinomycin",
   "aflibercept":"zivaflibercept",
   "zivaflibercept":"zivaflibercept",
   "imatinib":"imatinibmesylate",
   "carmustine":"bcnu",
   "nimustine":"acnu",
   "lomustine":"ccnu",
   "nabpaclitaxel":"abraxane",
   "floxuridine":"fudr",
   "irinotecan":"cpt11irinotecan",
   "cpt11":"cpt11irinotecan"
 };
 function resultKeyName(v){
   const n=normalizedName(v);
   return RESULT_NAME_ALIASES[n]||n
 }
 function masterCatalog(){
   // MIW v10 dynamic catalog: only items observed in imported/verified results.
   // No parser master list and no database backfill (e.g. Biosmin).
   const catalog=[],seen=new Set();
   results.forEach(r=>{
     if(r.group==="ADDITIONAL"&&/^Class\s*[123]$/i.test(String(r.name||"")))return;
     const domain=canonicalGroup(r),key=`${domain}:${resultKeyName(r.name)}`;
     if(!r.name||seen.has(key))return;
     seen.add(key);
     catalog.push({domain,name:r.name,section:r.section||"",jsonClass:r.jsonClass??null,jsonClassName:r.jsonClassName??null})
   });
   return catalog
 }
 function actualRows(){
   return results
     .filter(r=>!(r.group==="ADDITIONAL"&&/^Class\s*[123]$/i.test(String(r.name||""))))
     .map(r=>{
       const base={...r,domain:canonicalGroup(r),isCatalogPlaceholder:false};
       return MIW.OncoSourceTruth?.decorate?MIW.OncoSourceTruth.decorate(base):base
     })
 }
 function enrichedRows(){
   const actual=actualRows();
   if(domain==="CTC")return actual.map(r=>({...r,knowledge:knowledgeFor(r),displayStatus:statusOf(r)}));

   const latestDate=reports.at(-1)?.reportDate||"";
   const actualAtLatest=new Set(
     actual.filter(r=>dateOf(r)===latestDate).map(r=>`${r.domain}:${resultKeyName(r.name)}`)
   );
   const placeholders=masterCatalog()
     .filter(x=>x.domain!=="CTC")
     .filter(x=>!actualAtLatest.has(`${x.domain}:${resultKeyName(x.name)}`))
     .map(x=>({
       group:x.domain,
       domain:x.domain,
       section:x.section,
       name:x.name,
       value:null,
       unit:"%",
       reportDate:latestDate,
       page:null,
       sourceLine:"",
       confidence:null,
       evidenceType:"NOT_PRESENT_IN_JSON",
       engine:"DYNAMIC_REPORT_UNION",
       isCatalogPlaceholder:true,
       resultState:"NOT_PRESENT_IN_JSON",resultPresence:"NOT_PRESENT_IN_JSON"
     }));

   return [...actual,...placeholders].map(r=>({
     ...r,
     knowledge:knowledgeFor(r),
     displayStatus:r.isCatalogPlaceholder?L("ไม่พบรายการใน JSON","Not present in JSON"):(r.nameMatchStatus==="UNMATCHED"?L("จับคู่ชื่อไม่ได้","Name not matched"):statusOf(r))
   }))
 }
 function currentRows(){
   const q=document.getElementById("oncoSearch").value.trim().toLowerCase();
   const category=document.getElementById("oncoCategorySelect").value;
   const subgroup=document.getElementById("oncoSubgroupSelect").value;
   const latest=new Map();
   enrichedRows().filter(r=>r.domain===domain).forEach(r=>{
     const rowKey=resultKeyName(r.name);
     const old=latest.get(rowKey);
     if(!old){latest.set(rowKey,r);return}
     const newDate=dateOf(r),oldDate=dateOf(old);
     if(newDate>oldDate){latest.set(rowKey,r);return}
     if(newDate<oldDate)return;
     // Same report: numeric verified evidence wins over unresolved/catalog records.
     const newNumeric=numericValue(r)!==null;
     const oldNumeric=numericValue(old)!==null;
     if(newNumeric&&!oldNumeric){latest.set(rowKey,r);return}
     if(newNumeric===oldNumeric && Number(r.confidence||0)>Number(old.confidence||0)){
       latest.set(rowKey,r)
     }
   });
   const showAll=document.getElementById("oncoShowAllCatalog")?.checked!==false;
   return [...latest.values()].filter(r=>
     (showAll||!r.isCatalogPlaceholder)&&
     (!q||r.name.toLowerCase().includes(q)||r.knowledge.subgroup.toLowerCase().includes(q))&&
     (!category||r.knowledge.category===category)&&
     (!subgroup||r.knowledge.subgroup===subgroup)
   ).sort((a,b)=>{
     if(domain==="ADDITIONAL"){
       const order={Effective:0,"Not Effective":1};
       const ae=order[normalizedEfficacy(a)]??2,be=order[normalizedEfficacy(b)]??2;
       if(ae!==be)return ae-be;
     }
     const av=numericValue(a),bv=numericValue(b);
     if(av!==null&&bv!==null&&bv!==av)return bv-av;
     if(av!==null&&bv===null)return -1;
     if(av===null&&bv!==null)return 1;
     return a.name.localeCompare(b.name)
   })
 }
 async function load(){
   currentPatient=MIW.Patients.current();
   if(!currentPatient){reports=[];results=[];render();return}
   const [allReports,allResults,allPatients,allLabRows]=await Promise.all([
     MIW.Database.all("oncoReports"),MIW.Database.all("oncoResults"),MIW.Database.all("patients"),MIW.Database.all("laboratoryResults")
   ]);
   const linkedIds=linkedPatientIdSet(currentPatient,allPatients||[]);
   reports=(allReports||[]).filter(report=>reportMatchesLinkedPatient(report,currentPatient,linkedIds))
     .map(report=>({...report,patientName:report?.patientName||currentPatient?.name||"",dob:report?.dob||currentPatient?.dob||""}))
     .sort((a,b)=>(a.reportDate||a.createdAt||"").localeCompare(b.reportDate||b.createdAt||""));
   const reportIds=new Set(reports.map(report=>report.id));
   results=(allResults||[]).filter(row=>linkedIds.has(row.patientId)||reportIds.has(row.reportId));
   await migrateLegacyAdditionalEfficacy(results);
   await migrateLegacyYasineePercentResults(reports,results);
   await migrateLegacyGeneReportFields(results);
   const sourceTruth=MIW.OncoSourceTruth?.applyRows?.(reports,results);
   if(sourceTruth){
     results=sourceTruth.rows;
     for(const row of sourceTruth.changedRows||[])await MIW.Database.put("oncoResults",row);
   }
   // v10.272: if an older database lost the oncoReports index but retained
   // verified Onconomics rows under a duplicate/legacy patient record, rebuild
   // an in-memory report so the dashboard button still opens the real results.
   if(!reports.length){
     const legacy=reconstructLegacyOnconomics((allLabRows||[]).filter(row=>linkedIds.has(row.patientId)),currentPatient.id);
     if(legacy){reports=[legacy.report];results=results.concat(legacy.rows)}
   }
   results=suppressGenericAdditionalDuplicates(results);
   results=suppressLegacyGeneNameCollisions(results);
   render()
 }
 function buildFilters(){
   const all=enrichedRows().filter(r=>r.domain===domain);
   const cats=[...new Set(all.map(r=>r.knowledge.category))].sort();
   const categorySelect=document.getElementById("oncoCategorySelect");
   const prev=categorySelect.value;
   categorySelect.innerHTML=`<option value="">${L("ทุกหมวด","All categories")}</option>`+cats.map(c=>{
     const row=all.find(r=>r.knowledge.category===c);
     const label=isEnglishMode()?englishDomainCategory(row,row?.knowledge||{}):c;
     return `<option value="${esc(c)}">${esc(label)}</option>`
   }).join("");
   if(cats.includes(prev))categorySelect.value=prev;
   const selectedCat=categorySelect.value;
   const subset=all.filter(r=>!selectedCat||r.knowledge.category===selectedCat);
   const groups=[...new Set(subset.map(r=>r.knowledge.subgroup))].sort();
   const subgroupSelect=document.getElementById("oncoSubgroupSelect");
   const prevSub=subgroupSelect.value;
   subgroupSelect.innerHTML=`<option value="">${L("ทุกกลุ่มย่อย","All subgroups")}</option>`+groups.map(g=>{
     const row=subset.find(r=>r.knowledge.subgroup===g);
     const label=isEnglishMode()?englishSubgroup(row,row?.knowledge||{}):g;
     return `<option value="${esc(g)}">${esc(label)}</option>`
   }).join("");
   if(groups.includes(prevSub))subgroupSelect.value=prevSub
 }
 function statusClass(status){
   const s=String(status).toUpperCase();
   if(s==="HIGH"||s==="EFFECTIVE")return"high";
   if(s==="SUPPORTED")return"supported";
   if(s==="LOW")return"low";
   if(s==="NOT EFFECTIVE")return"not-effective";
   if(/^-?\d/.test(s))return"numeric";
   return"neutral"
 }

 function chartMode(){return document.getElementById("oncoChartMode")?.value||"COMPARE"}
 function selectedReportDate(){return document.getElementById("oncoReportDateSelect")?.value||reports.at(-1)?.reportDate||""}
 function buildReportDateOptions(){
   const select=document.getElementById("oncoReportDateSelect");
   if(!select)return;
   const dates=[...new Set(reports.map(r=>r.reportDate).filter(Boolean))].sort();
   const previous=select.value;
   select.innerHTML=dates.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join("")||'<option value="">Unknown</option>';
   if(dates.includes(previous))select.value=previous;
   else if(dates.length)select.value=dates.at(-1);
   select.hidden=chartMode()==="TREND"
 }
 function responseFromSource(row){
   if(isAdditionalRow(row)){
     const efficacy=normalizedEfficacy(row);
     const before=row.valueWithout ?? row.reportLayer?.valueWithoutSubstance;
     const after=row.valueWith ?? row.reportLayer?.valueWithSubstance;
     return {
       label:efficacy||L("ต้องตรวจคอลัมน์ EFFICACY","Check the EFFICACY column"),
       basis:L(
         `อิงคอลัมน์ EFFICACY ในตาราง Additional tested drugs; ค่า ${before??"—"} → ${after??"—"} เป็นค่า assay ไม่ใช่เปอร์เซ็นต์`,
         `Based on the EFFICACY column in the Additional tested drugs table; ${before??"—"} → ${after??"—"} are assay values, not percentages.`
       )
     }
   }
   const value=numericValue(row);
   if(value===null)return {label:L("ไม่มีค่าตัวเลข","No verified numeric value"),basis:L("ไม่ตีความ","No numeric interpretation applied")};
   const sourceClass=MIW.OncoSourceTruth?.classify?.(row,value);
   if(sourceClass?.profile?.mode==="binary"){
     const threshold=sourceClass.profile.threshold;
     return {label:sourceClass.label,basis:sourceClass.label==="Sensitivity"
       ?L(`อิงเส้นเกณฑ์ ${threshold}% ในกราฟต้นฉบับ`,`Based on the ${threshold}% threshold line in the source graph`)
       :L(`ต่ำกว่าเส้นเกณฑ์ ${threshold}% ในกราฟต้นฉบับ`,`Below the ${threshold}% threshold line in the source graph`)}
   }
   if(sourceClass?.profile?.mode==="three-level"){
     return {label:sourceClass.label,basis:L("ใช้เกณฑ์ 30% และ 80% ตาม legend ของกราฟ chemotherapy ต้นฉบับ","Uses the 30% and 80% boundaries printed in the source chemotherapy graph legend")}
   }
   return {label:`${value}${row.unit||"%"}`,basis:L("แสดงค่าต้นฉบับโดยไม่ตั้งเกณฑ์เพิ่ม","Displays the source value without adding a new threshold")}
 }
 function biologyMatch(name,pattern){
   const normalized=biologyNormalize(name);
   return String(pattern).split("|").some(token=>{
     const t=biologyNormalize(token);
     return t && (normalized===t || normalized.includes(t) || t.includes(normalized));
   });
 }
 function biologyGeneRows(){
   const latestDate=reports.at(-1)?.reportDate||"";
   const map=new Map();
   actualRows().filter(r=>r.domain==="GENE"&&numericValue(r)!==null).forEach(r=>{
     const key=resultKeyName(r.name);
     const previous=map.get(key);
     if(!previous || dateOf(r)>dateOf(previous) ||
       (dateOf(r)===dateOf(previous)&&Number(r.confidence||0)>Number(previous.confidence||0))){
       map.set(key,r)
     }
   });
   return [...map.values()].filter(r=>!latestDate||dateOf(r)===latestDate||!reports.length);
 }
 function systemAssessment(system, geneRows){
   const contributors=[];
   system.genes.forEach(([pattern,riskDirection])=>{
     const row=geneRows.find(r=>biologyMatch(r.name,pattern));
     if(!row)return;
     const value=numericValue(row);
     if(value===null)return;
     const signedRisk=Math.max(-100,Math.min(100,value*riskDirection));
     contributors.push({
       row,value,riskDirection,signedRisk,
       effect:signedRisk>5?"supports":signedRisk<-5?"opposes":"baseline"
     })
   });
   const active=contributors.filter(x=>Math.abs(x.value)>=1);
   let index=null;
   if(active.length){
     const weighted=active.reduce((sum,x)=>sum+x.signedRisk,0)/active.length;
     const magnitude=active.reduce((sum,x)=>sum+Math.min(100,Math.abs(x.value)),0)/active.length;
     index=Math.round(Math.max(0,Math.min(100,50+(weighted*.38)+(magnitude*.12))));
   }
   const level=index===null?"Insufficient data":index>=75?"High pattern":index>=58?"Moderate pattern":index>=42?"Mixed / intermediate":"Low pattern";
   const tone=index===null?"unknown":index>=75?"very-high":index>=58?"high":index>=42?"moderate":"low";
   return {...system,contributors,index,level,tone}
 }
 function biologyAssessments(){
   const rows=biologyGeneRows();
   return BIOLOGY_SYSTEMS.map(s=>systemAssessment(s,rows));
 }
 function biologySummaryText(assessments){
   const valid=assessments.filter(x=>x.index!==null).sort((a,b)=>b.index-a.index);
   if(!valid.length)return L("ยังไม่มีค่า Gene Expression ที่ยืนยันเพียงพอสำหรับสร้างภาพรวมระบบชีววิทยา","There are not yet enough verified gene-expression values to build a biological-system overview.");
   const top=valid.slice(0,3);
   const low=valid.filter(x=>x.index<42).slice(0,2);
   const topText=top.map(x=>`${x.label} ${x.level.toLowerCase()}`).join(", ");
   if(isEnglishMode()){
     const lowText=low.length?` Lower-pattern systems include ${low.map(x=>x.label).join(" and ")}.`:"";
     return `The most prominent gene-expression patterns are ${topText}.${lowText} Review the contributing genes for each system and correlate with cancer type, functional drug-sensitivity findings and standard validated tests before clinical use.`;
   }
   const lowText=low.length?` ส่วนระบบที่มีรูปแบบต่ำกว่า ได้แก่ ${low.map(x=>x.label).join(" และ ")}`:"";
   return `รูปแบบเด่นจาก Gene Expression คือ ${topText}${lowText} ควรเปิดดูยีนผู้สนับสนุนของแต่ละระบบและตรวจเทียบกับชนิดมะเร็ง ผล drug sensitivity และการตรวจมาตรฐานก่อนนำไปใช้ทางคลินิก`;
 }
 function renderBiologyDetail(id){
   const box=document.getElementById("biologySelectedDetail");
   if(!box)return;
   const a=biologyAssessments().find(x=>x.id===id);
   if(!a){box.innerHTML="";return}
   const descriptions={
     proliferation:"Signals associated with cell growth and proliferation.",
     resistance:"Drug efflux, detoxification, target adaptation and damage-repair mechanisms that may contribute to treatment resistance.",
     dna_repair:"Mechanisms that detect and repair DNA damage.",
     angiogenesis:"Signals involved in new blood-vessel formation and tumor oxygen/nutrient supply.",
     immune_escape:"Mechanisms that may help tumor cells evade immune recognition or killing.",
     invasion:"Adhesion, tissue invasion, migration and dissemination pathways.",
     apoptosis:"Balance between survival signaling and programmed cell death.",
     stemness:"Stem-like properties, self-renewal and treatment-tolerant cell states.",
     inflammation:"Inflammatory signaling that may influence tumor growth, survival and the microenvironment.",
     epigenetic:"Gene regulation through DNA methylation and histone/chromatin modification."
   };
   const ordered=[...a.contributors].sort((x,y)=>Math.abs(y.signedRisk)-Math.abs(x.signedRisk));
   box.innerHTML=`
     <div class="biology-detail-head">
       <div><span class="eyebrow">SYSTEM DETAIL</span><h3>${esc(a.label)}</h3><p>${esc(isEnglishMode()?descriptions[a.id]||"Gene-expression system overview.":a.description)}</p></div>
       <div class="biology-detail-score ${esc(a.tone)}">${a.index===null?"—":a.index}<small>${esc(a.level)}</small></div>
     </div>
     <div class="biology-direction-key">
       <span><i class="supports"></i>${L("สนับสนุนรูปแบบของระบบ","Supports this system pattern")}</span>
       <span><i class="opposes"></i>${L("ต้านรูปแบบของระบบ","Opposes this system pattern")}</span>
       <span><i class="baseline"></i>${L("ใกล้ baseline","Near baseline")}</span>
     </div>
     <div class="biology-contributor-list">
       ${ordered.length?ordered.map(x=>`
         <button class="biology-gene-row ${esc(x.effect)}" data-biology-gene="${esc(x.row.name)}">
           <span><b>${esc(x.row.name)}</b><small>${esc(isEnglishMode()?englishSubgroup(x.row,x.row.knowledge||{}):(x.row.knowledge?.subgroup||x.row.section||"Gene expression"))}</small></span>
           <span class="biology-gene-value">${x.value>0?"+":""}${esc(x.value)}${esc(x.row.unit||"%")}</span>
           <span class="biology-gene-effect">${x.effect==="supports"?L("สนับสนุน","Supports"):x.effect==="opposes"?L("ต้าน","Opposes"):"Baseline"}</span>
         </button>`).join(""):`<div class="empty">${L("ไม่พบยีนที่อ่านค่าได้ในระบบนี้","No readable gene values were found for this system")}</div>`}
     </div>
     <div class="biology-detail-note"><b>${L("วิธีอ่าน:","How to read:")}</b> ${L("ระบบพิจารณาทั้งทิศทางของค่าและบทบาทของยีน ตัวอย่างเช่น MDR1 สูงสนับสนุน drug resistance แต่ BRCA1 ต่ำอาจสนับสนุนความบกพร่องของ DNA repair จึงไม่ใช้กฎ “บวกไม่ดี / ลบดี” แบบเดียวกับทุกยีน","The system considers both the direction of change and the biological role of each gene. For example, high MDR1 may support drug resistance, while low BRCA1 may support impaired DNA repair. A single rule such as ‘positive = bad / negative = good’ is therefore not applied across all genes.")}</div>`;
 }
 function renderBiologySummary(){
   const summary=document.getElementById("biologyExecutiveSummary");
   const grid=document.getElementById("biologySystemGrid");
   if(!summary||!grid)return;
   const assessments=biologyAssessments();
   const validCount=biologyGeneRows().length;
   summary.innerHTML=`
     <div class="biology-summary-copy"><span>AI-style clinical summary</span><p>${esc(biologySummaryText(assessments))}</p></div>
     <div class="biology-summary-metric"><b>${validCount}</b><span>Gene values used</span></div>`;
   grid.innerHTML=assessments.map(a=>`
     <button class="biology-system-card ${esc(a.tone)}" data-biology-system="${esc(a.id)}">
       <div class="biology-card-title"><span class="biology-icon">${esc(a.icon)}</span><strong>${esc(a.label)}</strong></div>
       <div class="biology-card-score">${a.index===null?"—":a.index}<small>/100</small></div>
       <div class="biology-meter"><i style="width:${a.index===null?0:a.index}%"></i></div>
       <div class="biology-card-foot"><span>${esc(a.level)}</span><span>${a.contributors.length} markers</span></div>
     </button>`).join("");
   const first=assessments.filter(x=>x.index!==null).sort((a,b)=>b.index-a.index)[0]||assessments[0];
   renderBiologyDetail(first?.id);
 }

 let geneReportView="PAGE";
 const geneReportViewMeta={
   PAGE:{label:"ตามหน้าต้นฉบับ",field:null},
   FUNCTION:{label:"Function",field:"function"},
   CLINICAL_RISK:{label:"Clinical Risk",field:"clinicalRisk"},
   OUTCOME:{label:"Outcome",field:"outcome"},
   RELATED:{label:"Related",field:"related"},
   RISK_INTERPRETATION:{label:"Gene-Associated Risk Interpretation",field:null}
 };
 function localizeSourceFieldValue(value){
   const raw=String(value??"").trim();
   if(!raw)return L("ไม่ระบุข้อมูล","Not reported");
   if(!isEnglishMode())return raw;
   const exact={
     "ไม่มีคอลัมน์ Function ในหน้ากราฟ Resistance Factors":"Function column is not present on the Resistance Factors source graph",
     "ไม่มีคอลัมน์ Related ในหน้ากราฟ Resistance Factors":"Related column is not present on the Resistance Factors source graph",
     "ไม่ได้รายงาน Clinical Risk ในหน้ากราฟ Resistance Factors":"Clinical Risk is not reported on the Resistance Factors source graph",
     "ไม่ได้รายงาน Outcome ในหน้ากราฟ Resistance Factors":"Outcome is not reported on the Resistance Factors source graph",
     "ไม่ระบุข้อมูล":"Not reported"
   };
   if(exact[raw])return exact[raw];
   const translated=MIW.I18n?.translateString?MIW.I18n.translateString(raw,"en"):raw;
   // Source-report values are preserved. Only MIW-generated fallback/status text is translated.
   return translated;
 }
 function sourceField(row,field){
   const value=row?.[field]??row?.reportLayer?.[field];
   if(String(value??"").trim())return localizeSourceFieldValue(value);
   const schemaValue=MIW.GeneReportSchema?.displayField(row,field);
   return localizeSourceFieldValue(schemaValue||L("ไม่ระบุข้อมูล","Not reported"));
 }
 function reportTopicFor(row){
   if(row.mainTopicName||row.main_topic_name||row.reportLayer?.mainTopic){
     return row.mainTopicName||row.main_topic_name||row.reportLayer.mainTopic;
   }
   const schemaTopic=MIW.GeneReportSchema?.displayField(row,"mainTopic");
   if(schemaTopic&&schemaTopic!=="ไม่ระบุข้อมูล")return schemaTopic;
   const page=Number(row.page);
   const legacyTopics={
     5:"Resistance Factors",
     7:"Growth Factors Proliferation Stimuli",
     8:"Growth Factors Proliferation Stimuli",
     9:"Self Repair - Resistance",
     10:"Angiogenesis - Metastases",
     11:"Cell Cycle Regulation & Immortalization / Apoptosis",
     12:"Drug Metabolisms & Targets",
     13:"Markers"
   };
   if(legacyTopics[page])return legacyTopics[page];
   return `Gene Expression — Page ${page||"—"}`
 }
 function reportSubGroupFor(row){
   const value=row.subGroupName||row.sub_group_name||row.reportLayer?.subGroup||row.section;
   if(value&&!/^gene expression/i.test(String(value)))return value;
   const schemaSubGroup=MIW.GeneReportSchema?.displayField(row,"subGroup");
   return schemaSubGroup&&schemaSubGroup!=="ไม่ระบุข้อมูล"?schemaSubGroup:"Unclassified"
 }
 function reportStructureRows(){
   const latestDate=reports.at(-1)?.reportDate||"";
   const latest=new Map();
   actualRows().filter(r=>r.domain==="GENE"&&(!latestDate||dateOf(r)===latestDate)).forEach(r=>{
     const key=resultKeyName(r.name),old=latest.get(key);
     if(!old||Number(r.confidence||0)>=Number(old.confidence||0))latest.set(key,r)
   });
   return [...latest.values()]
 }
 const VERIFIED_GENE_DESCRIPTIONS={
   P180:"ชื่อในรายงานไม่จำเพาะ ไม่ใช่ชื่อยีนมาตรฐานที่ระบุตัวเดียวได้ รายงานเชื่อมโยงกับ cellular stress และ tyrosine-kinase growth factor; ควรถามห้องปฏิบัติการว่าหมายถึงยีนหรือโปรตีนใด",
   BCRABL:"Fusion gene/protein จากการเชื่อม BCR กับ ABL1 ทำให้ tyrosine kinase ทำงานต่อเนื่อง พบเด่นใน CML และ ALL บางชนิด",
   PTEN:"Tumor-suppressor gene ที่เป็นเบรกของ PI3K–AKT–mTOR ควบคุมการเจริญและการอยู่รอดของเซลล์ การสูญเสียหน้าที่อาจทำให้มะเร็งโตง่ายขึ้น",
   COX2:"เอนไซม์จากยีน PTGS2 สร้าง prostaglandins เกี่ยวข้องกับการอักเสบ การสร้างหลอดเลือด และการอยู่รอดของเซลล์มะเร็ง",
   "5LOX":"ALOX5 สร้าง leukotrienes จาก arachidonic acid มีบทบาทในการอักเสบและอาจช่วยการเติบโตของมะเร็งบางชนิด",
   NFKB:"กลุ่ม transcription factors ที่เปิดยีนเกี่ยวกับการอักเสบ การอยู่รอด การแบ่งตัว และการดื้อต่อการตายของเซลล์",
   IKBA:"โปรตีนยับยั้ง NF-κB โดยจับและกัก NF-κB ไม่ให้เข้านิวเคลียส จึงเปรียบเสมือนเบรกของ NF-κB",
   IKBB:"โปรตีนยับยั้ง NF-κB โดยจับและกัก NF-κB ไม่ให้เข้านิวเคลียส จึงเปรียบเสมือนเบรกของ NF-κB",
   IKBE:"โปรตีนยับยั้ง NF-κB โดยจับและกัก NF-κB ไม่ให้เข้านิวเคลียส จึงเปรียบเสมือนเบรกของ NF-κB",
   ALK:"Receptor tyrosine kinase ที่เกี่ยวข้องกับการพัฒนาของระบบประสาท เมื่อเกิด fusion หรือ mutation บางชนิดอาจกลายเป็น oncogenic driver",
   EML4ALK:"Fusion gene ที่กระตุ้น ALK ต่อเนื่อง พบสำคัญในมะเร็งปอดบางราย และใช้เลือก ALK inhibitor เมื่อยืนยันด้วยการตรวจมาตรฐาน",
   NPMALK:"Fusion gene ที่กระตุ้น ALK ต่อเนื่อง พบเด่นใน anaplastic large-cell lymphoma",
   RET:"Receptor tyrosine kinase ที่ส่งสัญญาณการเจริญของเซลล์ RET mutation หรือ fusion อาจเป็น driver ในมะเร็งไทรอยด์และปอดบางชนิด",
   SSR:"Somatostatin receptor (SSTR1–5) รับสัญญาณ somatostatin และลดการหลั่งฮอร์โมนหรือการแบ่งตัว มีความสำคัญใน neuroendocrine tumors",
   CD117CKIT:"KIT receptor รับ stem-cell factor และควบคุมการอยู่รอดกับพัฒนาการของเซลล์ Mutation พบได้ใน GIST และมะเร็งเม็ดเลือดบางชนิด",
   IGFR1:"IGF1R รับ IGF-1 แล้วกระตุ้น PI3K–AKT และ MAPK ช่วยการเจริญและการอยู่รอดของเซลล์",
   IGFR2:"IGF2R จับ IGF-2 และนำไปกำจัด จึงมักควบคุมระดับ IGF-2 มากกว่ากระตุ้นการแบ่งตัวโดยตรง",
   EGF:"Growth-factor ligand ที่จับ EGFR เพื่อกระตุ้นการแบ่งตัว การอยู่รอด และการซ่อมแซมเนื้อเยื่อ",
   CERBB1:"EGFR/HER1 ตัวรับ EGF ที่กระตุ้น MAPK และ PI3K–AKT เป็นเป้าหมายยาในมะเร็งบางชนิด",
   CERBB2:"ERBB2/HER2 ตัวรับ tyrosine kinase ซึ่งการเพิ่มจำนวนยีนหรือแสดงออกมากผิดปกติพบในมะเร็งเต้านม กระเพาะอาหาร และมะเร็งอื่นบางชนิด",
   JAK12:"Intracellular kinases ที่ส่งสัญญาณจาก cytokine receptors ไปยัง STAT ควบคุมภูมิคุ้มกัน การสร้างเม็ดเลือด และการแบ่งเซลล์",
   CJUN:"ส่วนหนึ่งของ AP-1 transcription factor ควบคุมการแบ่งตัว การอักเสบ การบุกรุก และการตอบสนองต่อความเครียด",
   CFOS:"ส่วนหนึ่งของ AP-1 transcription factor ทำงานร่วมกับ c-JUN เพื่อควบคุมการแบ่งตัว การอักเสบ และการตอบสนองต่อความเครียด",
   RASRAFMEKERK:"Signaling pathway หลักที่นำสัญญาณจาก growth-factor receptor ไปกระตุ้นการแบ่งตัว ไม่ใช่ยีนตัวเดียว",
   MTOR:"MTOR kinase/pathway ควบคุมการสร้างโปรตีน เมแทบอลิซึม การเจริญ และการอยู่รอดของเซลล์",
   PROGESTERONERECEPTOR:"PGR/PR ตัวรับ progesterone ใช้ประเมินชีววิทยาและการรักษามะเร็งเต้านมหรือมะเร็งนรีเวชบางชนิด",
   ESTROGENERECEPTOR:"ESR1/ER เป็นตัวรับ estrogen ที่กระตุ้นยีนเกี่ยวกับการเจริญ และเป็น biomarker สำคัญในการเลือก endocrine therapy",
   NR3C4A:"Androgen receptor isoform รับ androgen และควบคุมการแสดงออกของยีน มีความสำคัญมากในมะเร็งต่อมลูกหมาก",
   NR3C4B:"Androgen receptor isoform รับ androgen และควบคุมการแสดงออกของยีน มีความสำคัญมากในมะเร็งต่อมลูกหมาก",
   TGFB:"ควบคุมการเจริญ ภูมิคุ้มกัน และพังผืด ระยะแรกอาจกดมะเร็ง แต่ระยะลุกลามอาจส่งเสริม EMT การบุกรุก และ immune escape",
   HSP27:"Chaperone protein ที่ช่วยป้องกันโปรตีนเสียรูปและลด apoptosis อาจเกี่ยวข้องกับการดื้อยาหรือความร้อน",
   HSP72:"กลุ่ม inducible HSP70 ช่วยเซลล์ทนความร้อนและความเครียด",
   HSP90:"Chaperone ที่ช่วยพยุง oncoproteins หลายชนิด เช่น HER2, AKT และ mutant kinases",
   DNAMETHYLTRANSFERASEI:"DNMT1 รักษารูปแบบ DNA methylation ระหว่างการแบ่งเซลล์ และอาจมีส่วนปิด tumor-suppressor genes",
   DNADEMETHYLASE:"โดยมากหมายถึง TET enzymes ไม่ใช่ยีนตัวเดียว ทำหน้าที่ช่วยกำจัดหรือเปลี่ยน methyl marks บน DNA",
   O6METHYLDNATRANSFERASE:"MGMT ซ่อม O6-methylguanine ระดับสูงอาจสัมพันธ์กับการดื้อ temozolomide และ alkylating agents บางชนิด",
   HISTONEDEACETYLASE:"HDAC family ดึง acetyl group ออกจาก histones ทำให้ chromatin แน่นและเปลี่ยนการเปิด–ปิดยีน",
   HDAC:"HDAC family ดึง acetyl group ออกจาก histones ทำให้ chromatin แน่นและเปลี่ยนการเปิด–ปิดยีน",
   HAT:"Histone acetyltransferases เติม acetyl group ทำให้ chromatin เปิดขึ้น เป็นกลุ่มเอนไซม์ ไม่ใช่ยีนเดียว",
   CXCR4:"Chemokine receptor ที่ช่วยการเคลื่อนที่ การเกาะกับไขกระดูกหรืออวัยวะ และการแพร่กระจายของเซลล์มะเร็งบางชนิด",
   CXCL12:"Ligand ของ CXCR4 สร้างทิศทางให้เซลล์เคลื่อนเข้าสู่ microenvironment ที่เอื้อต่อการอยู่รอด",
   GAMMAGC:"น่าจะหมายถึง GCLC/GCLM ซึ่งสร้าง glutathione; glutathione สูงอาจช่วยกำจัดยาและลด oxidative damage แต่ควรยืนยันชื่อกับห้องปฏิบัติการ",
   PARP117:"กลุ่มเอนไซม์ที่เกี่ยวข้องกับ DNA-damage response โดย PARP1/2 สำคัญที่สุดทางมะเร็งวิทยา ไม่ควรตีความว่า PARP ทั้ง 17 ตัวมีค่าเดียวกัน",
   VEGF:"กระตุ้นการสร้างและการรั่วของหลอดเลือด ช่วยนำเลือดไปเลี้ยงก้อนมะเร็ง",
   FGF:"กลุ่ม growth factors ที่กระตุ้นการแบ่งตัว การซ่อมแซม และ angiogenesis",
   PDGF:"กระตุ้น fibroblasts, pericytes และ stromal cells ช่วยพยุงหลอดเลือดและ microenvironment ของก้อน",
   ANG1:"โดยทั่วไปหมายถึง angiopoietin-1/Tie2 ช่วยทำให้หลอดเลือดคงตัว ไม่ใช่ angiogenin I",
   ANG2:"Angiopoietin-2 ทำให้หลอดเลือดเดิมไม่เสถียร และเอื้อต่อการสร้างหลอดเลือดใหม่เมื่อมี VEGF",
   CMET:"ตัวรับ HGF ที่กระตุ้นการเคลื่อนที่ การบุกรุก การอยู่รอด และการแพร่กระจาย",
   "67LR":"67-kDa laminin receptor/RPSA ช่วยการยึดเกาะกับ basement membrane และสัมพันธ์กับการบุกรุกในมะเร็งหลายชนิด",
   KISS1R:"ตัวรับ kisspeptin มีบทบาทควบคุมการสืบพันธุ์ และในบางบริบทเกี่ยวข้องกับการกดการแพร่กระจาย",
   NM23:"ส่วนใหญ่หมายถึง NME1/NME2 มีบทบาทด้าน nucleotide metabolism และได้รับการศึกษาว่าเป็น metastasis suppressor",
   MMP:"Matrix metalloproteinase family ย่อย extracellular matrix ช่วยการบุกรุก การสร้างหลอดเลือด และการแพร่กระจาย ไม่ใช่ยีนตัวเดียว",
   E2F1:"Transcription factor ที่เปิดยีนสำหรับ DNA synthesis และการเข้าสู่ S phase; ในบางบริบทสามารถกระตุ้น apoptosis ได้ด้วย",
   CDC6:"เริ่มกระบวนการจำลอง DNA และควบคุมไม่ให้ DNA ถูกคัดลอกซ้ำผิดเวลา",
   HTERT:"Catalytic subunit ของ telomerase ที่ต่อ telomeres ทำให้เซลล์แบ่งต่อได้ยาวนานหรือเกิด cellular immortality",
   BCL2:"โปรตีนต้าน apoptosis ช่วยให้เซลล์อยู่รอดแม้มีความเสียหาย",
   BAX:"โปรตีนส่งเสริม apoptosis ทำให้ mitochondrial membrane เปิดและเริ่มกระบวนการตายของเซลล์",
   CD95FASRECEPTOR:"Death receptor ที่เมื่อถูกกระตุ้นสามารถเปิด extrinsic apoptosis pathway",
   P27:"CDKN1B เป็น CDK inhibitor ที่หยุดวงจรเซลล์ช่วง G1; ระดับต่ำอาจทำให้เซลล์แบ่งเร็วขึ้น",
   P53:"TP53 เป็น tumor suppressor ที่ตรวจความเสียหายของ DNA แล้วสั่งหยุดวงจร ซ่อม DNA หรือ apoptosis",
   P16:"CDKN2A ยับยั้ง CDK4/6 และป้องกันการผ่าน G1 ไป S phase",
   CDK46:"Kinases ที่ร่วมกับ cyclin D ผลักเซลล์ผ่าน G1 ไป S phase และเป็นเป้าหมายของ CDK4/6 inhibitors",
   DPD:"DPYD สลาย 5-FU/capecitabine; ภาวะขาด DPD อาจทำให้เกิดพิษรุนแรง การประเมินความปลอดภัยต้องใช้วิธีมาตรฐาน",
   UP:"มักหมายถึง UPP1/UPP2 ซึ่งเกี่ยวข้องกับ uridine และ fluoropyrimidine metabolism",
   NP:"ชื่อในรายงานไม่จำเพาะ มักหมายถึง purine nucleoside phosphorylase/PNP; ควรยืนยันกับห้องปฏิบัติการ",
   TP:"TYMP/thymidine phosphorylase เกี่ยวข้องกับการเปลี่ยน capecitabine pathway ไปเป็น 5-FU ในเนื้อเยื่อ และ angiogenesis",
   TS:"TYMS/thymidylate synthase สร้าง thymidylate สำหรับ DNA และเป็นเป้าหมายหลักของ 5-FU",
   DHFR:"Dihydrofolate reductase รีไซเคิล folate เพื่อใช้สร้าง DNA และเป็นเป้าหมายของ methotrexate",
   SHMT:"SHMT1/2 เปลี่ยน serine เป็น glycine และสร้าง one-carbon units สำหรับ nucleotide synthesis",
   GARFT:"ส่วนหนึ่งของ GART เป็นเอนไซม์ใน de novo purine synthesis และเป็นเป้าหมายหนึ่งของ pemetrexed",
   RIBONUCLEOTIDEREDUCTASE:"RRM1/RRM2 complex เปลี่ยน ribonucleotides เป็นวัตถุดิบสำหรับสร้าง DNA",
   CES12:"Carboxylesterases ช่วยเปลี่ยน irinotecan เป็น SN-38 แต่ความสัมพันธ์ทางคลินิกซับซ้อน ไม่ใช่ตัวบอกผลยาแบบเดี่ยว",
   CYP1B1:"เอนไซม์ที่เปลี่ยนยา ฮอร์โมน และสารแปลกปลอม อาจมีผลต่อ activation หรือ inactivation ของสารบางชนิด",
   ERCC1:"ส่วนหนึ่งของ nucleotide-excision repair ที่ซ่อม DNA adduct/crosslink; ยังไม่ใช่ biomarker เดี่ยวมาตรฐานสำหรับเลือก platinum โดยทั่วไป",
   RRM1:"หน่วยหลักของ ribonucleotide reductase ที่จำเป็นต่อ DNA synthesis และมีการศึกษาความสัมพันธ์กับ gemcitabine",
   CD33:"Marker บน myeloid cells พบใน AML บางชนิด และเป็นเป้าหมายของ antibody-drug conjugate",
   CD52:"โปรตีนผิว lymphocytes และเป็นเป้าหมายของ alemtuzumab",
   CD20:"MS4A1 marker ของ mature B cells ใช้จำแนกและรักษา B-cell lymphoma ด้วย anti-CD20",
   EPCAM:"EPCAM เป็นโปรตีนยึดเกาะบน epithelial cells ใช้ช่วยบ่งชี้ circulating epithelial tumor cells แต่พบในเซลล์ปกติบางชนิดด้วย",
   PDL1:"CD274 เป็น ligand ที่จับ PD-1 และลดการทำงานของ T cells",
   PD1:"PDCD1 เป็น inhibitory receptor บน T cells; เซลล์มะเร็งอาจใช้เส้นทางนี้เพื่อหลบภูมิคุ้มกัน",
   PDL2:"PDCD1LG2 เป็น ligand อีกตัวของ PD-1 และมีรูปแบบการแสดงออกต่างจาก PD-L1"
 };
 function geneDescription(row,k){
   const key=String(k?.geneSymbol||row?.name||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
   return VERIFIED_GENE_DESCRIPTIONS[key]||k?.biologicalFunction||k?.meaning||`${row.name} ยังไม่มีคำอธิบายเฉพาะที่ยืนยันในฐานข้อมูล`;
 }
 function geneFunctionTooltip(row){
   const k=MIW.OncoKnowledge.classify("GENE",row.name,row)||{};
   const fullName=k.fullName&&k.fullName!==row.name?k.fullName:"";
   if(isEnglishMode()){
     const functionText=englishOr(k.biologicalFunction||k.meaning,"Gene/protein marker included in the source report; review validated gene-specific references for detailed biological function.");
     const pathway=englishOr(k.signalingPathway||k.subgroup||row.function||row.reportLayer?.function,"Pathway not classified in the English knowledge layer");
     return [fullName?`Full name: ${fullName}`:"",`Function: ${functionText}`,`Group/Pathway: ${pathway}`,"Note: This is general biological context, not a patient-specific interpretation and not confirmation of a mutation."].filter(Boolean).join("\n")
   }
   const biologicalFunction=geneDescription(row,k),pathway=k.signalingPathway||k.subgroup||row.function||row.reportLayer?.function||"ยังไม่จัดกลุ่ม pathway";
   return [fullName?`ชื่อเต็ม: ${fullName}`:"",`หน้าที่: ${biologicalFunction}`,`กลุ่ม/Pathway: ${pathway}`,"หมายเหตุ: เป็นข้อมูลหน้าที่ทางชีววิทยาทั่วไป ไม่ใช่การแปลผลของผู้ป่วยและไม่ยืนยัน mutation"].filter(Boolean).join("\n")
 }
 function reportTopicGroups(){
   if(geneReportView==="RISK_INTERPRETATION")return [];
   if(geneReportView!=="PAGE"){
     const meta=geneReportViewMeta[geneReportView],groups=new Map();
     reportStructureRows().forEach(row=>{
       const name=sourceField(row,meta.field),key=`${geneReportView}::${name}`;
       if(!groups.has(key))groups.set(key,{key,name,pages:new Set(),subGroups:new Map(),view:geneReportView});
       const entry=groups.get(key);if(row.page)entry.pages.add(row.page);
       const pageTopic=`Page ${row.page||"—"} · ${reportTopicFor(row)}`;
       if(!entry.subGroups.has(pageTopic))entry.subGroups.set(pageTopic,[]);
       entry.subGroups.get(pageTopic).push(row)
     });
     return [...groups.values()].sort((a,b)=>{
       const riskOrder={"HIGH RISK":0,"LOW RISK":1,"SENSITIVE":2,"ไม่ระบุข้อมูล":9};
       if(geneReportView==="CLINICAL_RISK"||geneReportView==="OUTCOME")return (riskOrder[a.name]??5)-(riskOrder[b.name]??5)||a.name.localeCompare(b.name);
       return a.name.localeCompare(b.name)
     })
   }
   const topics=new Map();
   reportStructureRows().forEach(row=>{
     const topic=reportTopicFor(row),subGroup=reportSubGroupFor(row);
     // One report page is one display unit. The same printed Main Topic may
     // continue on the next page, but its subgroups must remain page-specific.
     const page=Number(row.page)||0,key=`${page}::${topic}`;
     if(!topics.has(key))topics.set(key,{key,name:topic,pages:new Set(),subGroups:new Map()});
     const entry=topics.get(key);if(row.page)entry.pages.add(row.page);
     if(!entry.subGroups.has(subGroup))entry.subGroups.set(subGroup,[]);
     entry.subGroups.get(subGroup).push(row)
   });
   return [...topics.values()].sort((a,b)=>Math.min(...a.pages)-Math.min(...b.pages)||a.name.localeCompare(b.name))
 }

 function reportTopicPopupModel(topic,viewKey=geneReportView){
   const rows=[...topic.subGroups.values()].flat();
   const markers=[...new Set(rows.map(row=>String(row.name||"").trim()).filter(Boolean))];
   const pages=[...topic.pages].sort((a,b)=>a-b);
   const view=geneReportViewMeta[viewKey]||geneReportViewMeta.PAGE;
   return{
     title:isEnglishMode()?englishOr(topic.name,"Gene-expression topic"):topic.name,
     viewLabel:isEnglishMode()?englishOr(view.label,view.label):view.label,
     geneCount:rows.length,subgroupCount:topic.subGroups.size,
     pages:pages.map(page=>`Page ${page}`).join(", ")||L("ไม่ระบุหน้า","Page not reported"),
     markers:markers.slice(0,12),moreCount:Math.max(0,markers.length-12),
     note:viewKey==="PAGE"?L("กลุ่มตามหัวข้อและหน้าต้นฉบับของรายงาน","Grouped by source-report topic and page"):L(`รวม Marker ข้ามหน้าที่มีค่า ${view.label} เดียวกัน; ไม่ใช่คะแนนความเสี่ยงรวม`,`Combines markers across pages that share the same ${view.label} field; this is not a composite risk score`)
   }
 }
 function reportTopicHoverHtml(topic){
   const popup=reportTopicPopupModel(topic);
   const markerText=popup.markers.join(", ")+(popup.moreCount?L(` และอีก ${popup.moreCount} รายการ`,` and ${popup.moreCount} more`):"");
   return `<div class="gene-popup-head"><h4>${esc(popup.title)}</h4><span class="gene-popup-result baseline">${popup.geneCount} Marker</span></div>
     <div class="gene-popup-label">${esc(popup.viewLabel)} · ${esc(popup.pages)}</div>
     <div class="gene-popup-summary">${esc(markerText||L("ไม่พบชื่อ Marker","No marker names found"))}</div>
     <div class="gene-popup-label">${L("โครงสร้างภายใน","Internal structure")}</div><div>${popup.subgroupCount} ${L("กลุ่มย่อย","subgroup(s)")} · ${esc(popup.note)}</div>
     <div class="gene-popup-foot"><b>${L("กดเพื่อเปิดรายละเอียด","Click to open details")}</b><span>${L("ชี้ Marker รายตัวเพื่อดูหน้าที่เฉพาะ","Hover individual markers for functional context")}</span></div>`
 }
 const RISK_PROCESS_PROFILES={
   proliferation:{label:"การส่งสัญญาณการเจริญและเพิ่มจำนวนเซลล์",effect:"อาจเอื้อต่อการรับสัญญาณการเจริญ การแบ่งตัว และการอยู่รอดของเซลล์มะเร็ง"},
   inflammation:{label:"การอักเสบที่อาจส่งเสริมมะเร็ง",effect:"อาจช่วยสร้างสภาพแวดล้อมอักเสบที่เอื้อต่อการอยู่รอด การสร้างหลอดเลือด หรือการเติบโตของก้อนในมะเร็งบางชนิด"},
   repair_resistance:{label:"การซ่อมแซมความเสียหายและการดื้อต่อการรักษา",effect:"อาจเพิ่มความสามารถของเซลล์ในการทนความเครียด ซ่อม DNA หรือคงอยู่หลังได้รับการรักษา"},
   angiogenesis:{label:"การสร้างหลอดเลือดของก้อนมะเร็ง",effect:"อาจสนับสนุนการสร้างหรือปรับโครงสร้างหลอดเลือดเพื่อหล่อเลี้ยงก้อนมะเร็ง"},
   invasion:{label:"การรุกรานและการแพร่กระจาย",effect:"อาจเอื้อต่อการยึดเกาะ การเคลื่อนที่ การสลาย extracellular matrix และการบุกรุกเนื้อเยื่อ"},
   cycle_apoptosis:{label:"วงจรเซลล์ ความเป็นอมตะ และการหลีกเลี่ยง apoptosis",effect:"อาจช่วยให้เซลล์แบ่งต่อเนื่อง รักษา telomere หรือหลีกเลี่ยงกระบวนการตายของเซลล์"},
   drug_metabolism:{label:"เมแทบอลิซึมยาและเป้าหมายของยา",effect:"อาจสัมพันธ์กับการเปลี่ยนยา การซ่อมความเสียหายจากยา หรือระดับเป้าหมายยา แต่ยังใช้ทำนายการตอบสนองต่อยาโดยลำพังไม่ได้"},
   immune_escape:{label:"การหลบหลีกภูมิคุ้มกัน",effect:"อาจลดการตอบสนองของภูมิคุ้มกันต่อเซลล์ผิดปกติ ทั้งนี้ต้องยืนยันด้วย biomarker มาตรฐานที่เหมาะกับชนิดมะเร็ง"},
   tumor_marker:{label:"สัญญาณตัวบ่งชี้เซลล์มะเร็ง",effect:"อาจสะท้อนการตรวจพบลักษณะของเซลล์มะเร็งหรือสายเซลล์บางชนิด แต่ไม่บอกตำแหน่ง ระยะโรค หรือการแพร่กระจายด้วยตัวเอง"},
   other:{label:"ปัจจัยระดับยีนอื่น ๆ",effect:"พบผลที่ห้องปฏิบัติการจัดเป็น High Risk แต่ข้อมูลในรายงานยังไม่พอสำหรับจัดเข้ากระบวนการที่จำเพาะ"}
 };
 function riskProcessKey(row){
   const topic=reportTopicFor(row).toLowerCase(),fn=sourceField(row,"function").toLowerCase(),rel=sourceField(row,"related").toLowerCase(),name=resultKeyName(row.name);
   if(/angiogenesis/.test(fn)||/vegf|fgf|pdgf|ang1|ang2/.test(name))return "angiogenesis";
   if(/migration|invasion|metasta/.test(fn+" "+rel)||/cmet|67lr|kiss1r|nm23|mmp/.test(name))return "invasion";
   if(/eicosanoid|inflamm/.test(fn+" "+rel)||/cox2|5lox/.test(name))return "inflammation";
   if(/marker/.test(topic)&&/pdl1|pd1|pdl2/.test(name))return "immune_escape";
   if(/marker/.test(topic))return "tumor_marker";
   if(/drug metabolisms/.test(topic))return "drug_metabolism";
   if(/cell cycle|apoptosis|immortal/.test(topic))return "cycle_apoptosis";
   if(/self repair|resistance/.test(topic)||/repair|resist|heat shock|methyl|acetyl/.test(fn+" "+rel))return "repair_resistance";
   if(/growth factors|proliferation/.test(topic))return "proliferation";
   return "other"
 }
 function riskInterpretationGroups(){
   const groups=new Map();
   reportStructureRows().forEach(row=>{
     const outcome=sourceField(row,"outcome").toUpperCase();
     if(outcome!=="HIGH RISK"&&outcome!=="LOW RISK")return;
     const key=riskProcessKey(row),profile=RISK_PROCESS_PROFILES[key]||RISK_PROCESS_PROFILES.other;
     if(!groups.has(key))groups.set(key,{key,...profile,high:[],low:[]});
     groups.get(key)[outcome==="HIGH RISK"?"high":"low"].push(row)
   });
   return [...groups.values()].filter(g=>g.high.length).sort((a,b)=>b.high.length-a.high.length||a.label.localeCompare(b.label,"th"))
 }
 function riskEvidenceLevel(group){return group.high.length>=2?L("ปัจจัยเด่น","Prominent factor"):L("ปัจจัยสนับสนุน","Supporting factor")}
 function riskResultText(row){const value=numericValue(row);return value===null?L("ไม่ระบุค่า","Value not reported"):`${value>0?"+":""}${value}${row.unit||"%"}`}
 function englishRiskProcessProfile(group){
   const map={
     angiogenesis:["Angiogenesis","Gene-expression findings associated with blood-vessel formation and tumor vascular support."],
     invasion:["Invasion and dissemination","Gene-expression findings associated with adhesion, migration, tissue invasion or metastatic behavior."],
     inflammation:["Inflammation and eicosanoid signaling","Gene-expression findings associated with inflammatory pathways that may influence tumor biology."],
     immune_escape:["Immune escape","Gene-expression findings associated with reduced immune recognition or antitumor immune activity."],
     tumor_marker:["Tumor-cell marker signaling","Markers that may reflect tumor-cell phenotype; they do not by themselves establish site or stage."],
     drug_metabolism:["Drug metabolism and treatment response","Gene-expression findings associated with drug activation, inactivation, transport or target biology."],
     cycle_apoptosis:["Cell cycle and apoptosis","Gene-expression findings associated with proliferation control, survival and programmed cell death."],
     repair_resistance:["Repair and resistance","Gene-expression findings associated with stress response, DNA repair and treatment-resistance mechanisms."],
     proliferation:["Growth and proliferation","Gene-expression findings associated with growth-factor and cell-proliferation signaling."],
     other:["Other gene-associated factors","High-risk outcomes reported by the laboratory that do not fit a more specific process category in this view."]
   };
   const [label,effect]=map[group.key]||map.other;return{label,effect}
 }
 function renderRiskInterpretationDetail(key){
   const box=document.getElementById("biologySelectedDetail"),group=riskInterpretationGroups().find(g=>g.key===key);
   if(!box||!group){if(box)box.innerHTML="";return}
   const ep=isEnglishMode()?englishRiskProcessProfile(group):{label:group.label,effect:group.effect};
   const mixed=group.low.length
     ?L(`พบผล Outcome = LOW RISK อีก ${group.low.length} รายการในกระบวนการใกล้เคียง จึงเป็นรูปแบบผสมและไม่ควรตีความจากจำนวนยีนอย่างเดียว`,`There are also ${group.low.length} LOW RISK outcome item(s) in a related process, so the pattern is mixed and should not be interpreted from gene counts alone.`)
     :L("ไม่พบผล LOW RISK ในกลุ่มข้อมูลที่ใช้จัดกระบวนการนี้","No LOW RISK outcome was found in the data grouped into this process.");
   box.innerHTML=`
     <section class="risk-interpretation-detail">
       <div class="biology-detail-head"><div><span class="eyebrow">${esc(riskEvidenceLevel(group))} · ${group.high.length} HIGH RISK</span><h3>${esc(ep.label)}</h3><p>${esc(ep.effect)}</p></div></div>
       <div class="risk-conclusion"><b>${L("ข้อสรุปที่รายงานรองรับ","Source-supported conclusion")}</b><p>${isEnglishMode()?`The report contains gene/protein factors associated with “${esc(ep.label)}”, supported by ${esc(group.high.map(r=>r.name).join(", "))}. These findings may be associated with the biological behavior described above, but they do not prove causality or confirm that the process is occurring clinically in this patient.`:`ผลตรวจพบปัจจัยระดับยีนที่สัมพันธ์กับ “${esc(ep.label)}” โดยมียีน/โปรตีน ${esc(group.high.map(r=>r.name).join(", "))} สนับสนุนข้อสรุป การเปลี่ยนแปลงเหล่านี้อาจสัมพันธ์กับพฤติกรรมของมะเร็งตามที่ระบุข้างต้น แต่ไม่ยืนยันว่าเป็นสาเหตุหรือว่ากระบวนการนั้นกำลังเกิดขึ้นจริงในผู้ป่วย`}</p></div>
       <div class="gene-source-table-wrap"><table class="gene-source-table risk-evidence-table"><thead><tr><th>${L("ยีน/โปรตีนที่สนับสนุน","Supporting gene/protein")}</th><th>${L("ผลผู้ป่วย","Patient result")}</th><th>Function</th><th>Related</th><th>${L("แหล่งข้อมูล","Source")}</th></tr></thead><tbody>
       ${group.high.map(row=>`<tr class="gene-source-row" data-report-gene="${esc(row.name)}" tabindex="0"><td><span class="gene-name-tooltip" tabindex="0" data-hover-onco="${esc(row.name)}" data-gene-tooltip="${esc(geneFunctionTooltip(row))}"><b>${esc(row.name)}</b><i aria-hidden="true">?</i></span></td><td><span class="source-outcome">HIGH RISK</span><small>${esc(riskResultText(row))}</small></td><td>${esc(sourceField(row,"function"))}</td><td>${esc(sourceField(row,"related"))}</td><td>Page ${esc(row.page||"—")}</td></tr>`).join("")}
       </tbody></table></div>
       <div class="risk-mixed-note"><b>${L("ความสอดคล้องของข้อมูล:","Consistency of evidence:")}</b> ${esc(mixed)}</div>
       <div class="gene-popup-caution"><b>${L("ข้อจำกัด:","Limitation:")}</b> ${L("สรุปนี้มาจาก Gene Expression และ Outcome ที่ห้องปฏิบัติการรายงาน ไม่ใช่ผล mutation, ไม่ใช่หลักฐานเหตุ–ผล, ไม่ใช่การยืนยันการแพร่กระจาย และไม่ใช่คะแนนพยากรณ์โรคหรือคำสั่งเลือกยา ควรเทียบกับพยาธิวิทยา ระยะโรค ภาพถ่ายรังสี และ biomarker มาตรฐาน","This summary is derived from laboratory-reported gene-expression and Outcome fields. It is not a mutation result, proof of causality, confirmation of metastasis, a prognostic score, or a treatment-selection directive. Correlate with pathology, stage, imaging and validated biomarkers.")}</div>
     </section>`
 }
 function renderRiskInterpretation(){
   const summary=document.getElementById("biologyExecutiveSummary"),grid=document.getElementById("biologySystemGrid"),groups=riskInterpretationGroups();
   if(!summary||!grid)return;
   const highRows=groups.flatMap(g=>g.high),genes=[...new Set(highRows.map(r=>r.name))];
   summary.innerHTML=`<div class="biology-summary-copy"><span>GENE-ASSOCIATED RISK INTERPRETATION</span><p>${groups.length?L(`พบ ${genes.length} ยีน/โปรตีนที่มี Outcome = HIGH RISK สนับสนุน ${groups.length} กระบวนการความเสี่ยง รายงานนี้จัดโครงสร้างหลักฐานโดยไม่คำนวณคะแนนความเสี่ยงรวม`,`Found ${genes.length} gene/protein factor(s) with Outcome = HIGH RISK supporting ${groups.length} risk-process group(s). This view structures the source evidence and does not calculate a composite risk score.`):L("ไม่พบรายการ Outcome = HIGH RISK ที่ใช้สร้างข้อสรุปได้ในรายงานล่าสุด","No Outcome = HIGH RISK item suitable for this summary was found in the latest report.")}</p></div><div class="biology-summary-metric"><b>${genes.length}</b><span>High-risk factors</span></div>`;
   grid.innerHTML=groups.map((g,index)=>{const ep=isEnglishMode()?englishRiskProcessProfile(g):{label:g.label};return `<button class="biology-system-card report-topic-card ${index===0?"high":"unknown"}" data-risk-process="${esc(g.key)}"><div class="biology-card-title"><span class="biology-icon">${g.high.length}</span><strong>${esc(ep.label)}</strong></div><div class="risk-level-badge">${esc(riskEvidenceLevel(g))}</div><div class="biology-card-foot"><span>${esc(g.high.map(r=>r.name).join(", "))}</span><span>${g.high.length} High Risk</span></div></button>`}).join("")||`<div class="empty">${L("ยังไม่มีผล Outcome = HIGH RISK สำหรับสร้างรายงานนี้","No Outcome = HIGH RISK result is available for this view")}</div>`;
   renderRiskInterpretationDetail(groups[0]?.key)
 }
 function renderReportTopicDetail(topicKey){
   const box=document.getElementById("biologySelectedDetail"),topic=reportTopicGroups().find(x=>x.key===topicKey);
   if(!box||!topic){if(box)box.innerHTML="";return}
   const pageLabel=[...topic.pages].sort((a,b)=>a-b).map(p=>`Page ${p}`).join(", ")||L("ไม่ระบุหน้า","Page not reported");
   const meta=geneReportViewMeta[geneReportView];
   box.innerHTML=`
     <div class="biology-detail-head">
       <div><span class="eyebrow">${geneReportView==="PAGE"?"MAIN TOPIC":esc(isEnglishMode()?englishOr(meta.label,meta.label):meta.label.toUpperCase())} · ${esc(pageLabel)}</span><h3>${esc(isEnglishMode()?englishOr(topic.name,"Gene-expression topic"):topic.name)}</h3><p>${topic.subGroups.size} ${L("กลุ่มย่อย","subgroup(s)")} · ${[...topic.subGroups.values()].flat().length} Gene</p></div>
     </div>
     ${[...topic.subGroups.entries()].map(([name,rows],index)=>`
       <details class="report-subgroup-block onco-marker-dropdown" ${index===0?"open":""}>
         <summary class="report-subgroup-head"><span><b class="report-subgroup-title">${esc(isEnglishMode()?englishOr(name,"Gene-expression subgroup"):name)}</b><small>${esc(rows.slice(0,4).map(row=>row.name).join(", "))}${rows.length>4?L(` และอีก ${rows.length-4} รายการ`,` and ${rows.length-4} more`):""}</small></span><span><b>${rows.length} Marker</b><i>${L("กดเพื่อเปิด / ย่อ","Click to expand / collapse")}</i></span></summary>
         <div class="gene-source-table-wrap"><table class="gene-source-table">
           <thead><tr><th>Gene</th><th>Function</th><th>Related</th><th>Clinical Risk</th><th>Results %</th><th>Outcome</th></tr></thead>
           <tbody>${rows.map(row=>`
             <tr class="gene-source-row" data-report-gene="${esc(row.name)}" tabindex="0">
               <td><span class="gene-name-tooltip" tabindex="0" aria-label="${L(`คำอธิบายหน้าที่ของ ${row.name}`,`Functional explanation for ${row.name}`)}" data-hover-onco="${esc(row.name)}" data-gene-tooltip="${esc(geneFunctionTooltip(row))}"><b>${esc(row.name)}</b><i aria-hidden="true">?</i></span><small>${esc(row.nameMatchStatus==="UNMATCHED"?L("จับคู่ชื่อไม่ได้","Name not matched"):`Page ${row.page||"—"}`)}</small></td>
               <td>${esc(sourceField(row,"function"))}</td>
               <td>${esc(sourceField(row,"related"))}</td>
               <td><span class="source-risk">${esc(sourceField(row,"clinicalRisk"))}</span></td>
               <td class="gene-source-value">${numericValue(row)===null?"—":`${numericValue(row)>0?"+":""}${esc(numericValue(row))}${esc(row.unit||"%")}`}</td>
               <td><span class="source-outcome">${esc(sourceField(row,"outcome"))}</span></td>
             </tr>`).join("")}</tbody>
         </table></div>
       </details>`).join("")}`
 }
 function renderReportStructure(){
   const summary=document.getElementById("biologyExecutiveSummary"),grid=document.getElementById("biologySystemGrid");
   if(!summary||!grid)return;
   if(geneReportView==="RISK_INTERPRETATION"){renderRiskInterpretation();return}
   const topics=reportTopicGroups(),geneCount=reportStructureRows().length,meta=geneReportViewMeta[geneReportView];
   summary.innerHTML=`
     <div class="biology-summary-copy"><span>${esc(isEnglishMode()?englishOr(meta.label,meta.label):meta.label.toUpperCase())} VIEW</span><p>${geneReportView==="PAGE"?L(`พบ ${topics.length} หัวข้อหลัก จาก ${new Set(reportStructureRows().map(r=>r.page).filter(Boolean)).size} หน้า และรักษากลุ่มตามต้นฉบับ`,`Found ${topics.length} main topic(s) across ${new Set(reportStructureRows().map(r=>r.page).filter(Boolean)).size} source page(s), preserving the original report grouping.`):L(`รวม ${geneCount} ยีนข้ามหน้าเป็น ${topics.length} กลุ่มตามค่า ${esc(meta.label)} โดยยังคงเลขหน้าและข้อมูลต้นฉบับทุกแถว`,`Grouped ${geneCount} gene result(s) across pages into ${topics.length} ${esc(meta.label)} group(s), while preserving page numbers and source-report fields for every row.`)}</p></div>
     <div class="biology-summary-metric"><b>${geneCount}</b><span>Gene results</span></div>`;
   grid.innerHTML=topics.map((topic,index)=>`
     <button class="biology-system-card report-topic-card ${index===0?"low":"unknown"}" data-report-topic="${esc(topic.key)}" data-hover-report-topic="${esc(topic.key)}" aria-label="${esc(isEnglishMode()?englishOr(topic.name,"Gene-expression topic"):topic.name)}; ${L("ชี้เพื่อดู Marker ในกลุ่ม กดเพื่อเปิดรายละเอียด","hover to view markers; click for details")}">
       <div class="biology-card-title"><span class="biology-icon">${geneReportView==="PAGE"?([...topic.pages].sort((a,b)=>a-b)[0]||"—"):"≡"}</span><strong>${esc(isEnglishMode()?englishOr(topic.name,"Gene-expression topic"):topic.name)}</strong></div>
       <div class="biology-card-score">${[...topic.subGroups.values()].flat().length} <small>Gene</small></div>
       <div class="biology-card-foot"><span>${[...topic.pages].sort((a,b)=>a-b).map(p=>`Page ${p}`).join(", ")}</span><span>${[...topic.subGroups.values()].flat().length} Gene</span></div>
       <div class="report-topic-hover-hint">${L("ชี้เพื่อดู Marker · กดเพื่อเปิด","Hover for markers · click to open")}</div>
     </button>`).join("")||`<div class="empty">${L("ยังไม่มีโครงสร้าง Gene Expression ในรายงาน","No gene-expression report structure is available yet")}</div>`;
   renderReportTopicDetail(topics[0]?.key)
 }
 function domainLabel(){
   return domain==="ADDITIONAL"?"Additional Drug Test":
     domain==="DRUG"?L("ยาและการรักษา","Drugs & treatment"):
     domain==="NATURAL"?"Natural supplements":
     domain==="GENE"?"Gene expression":"CTC"
 }
 function renderDomainStatus(){
   const latestDate=reports.at(-1)?.reportDate||"";
   const additionalLatest=actualRows().filter(r=>r.domain==="ADDITIONAL"&&(!latestDate||dateOf(r)===latestDate));
   const additionalCount=new Set(additionalLatest.map(r=>resultKeyName(r.name))).size;
   const countBadge=document.getElementById("additionalDrugTabCount");if(countBadge)countBadge.textContent=additionalCount;
   const cov=document.getElementById("oncoKnowledgeCoverage");
   if(cov){
     if(domain==="ADDITIONAL"){
       const effective=additionalLatest.filter(r=>normalizedEfficacy(r)==="Effective").length;
       const notEffective=additionalLatest.filter(r=>normalizedEfficacy(r)==="Not Effective").length;
       cov.innerHTML=`<strong>Additional Drug Test</strong><span>${additionalCount} ${L("รายการในรายงานล่าสุด","item(s) in the latest report")}</span><span>Effective ${effective} · Not Effective ${notEffective}</span><span>${L("ผลจากคอลัมน์ EFFICACY · ไม่ใช่เปอร์เซ็นต์","Result from the EFFICACY column · not a percentage")}</span>`
     }else{
       const coverage=MIW.OncoKnowledge.coverage(masterCatalog());
       const d=coverage.byDomain[domain]||{classified:0,total:0};
       cov.innerHTML=`<strong>RGCC Knowledge Coverage</strong><span>${d.classified}/${d.total} ${L("รายการในหมวดนี้","items in this category")}</span><span>${L("ฐานข้อมูลจริงทั้งหมด","Total knowledge-base items")} ${coverage.total}</span>`
     }
   }
   const toggleText=document.getElementById("oncoCatalogToggleText");
   if(toggleText)toggleText.textContent=domain==="ADDITIONAL"
     ?L("แสดงรายการจากรายงานก่อนหน้า แม้รายงานล่าสุดไม่มีรายการนั้น","Show items from previous reports even if they are absent from the latest report")
     :L("แสดงรายการทั้งหมด รวม 0% และรายการที่ไม่มีผล","Show all items, including 0% and items without a result");
   const search=document.getElementById("oncoSearch");
   if(search)search.placeholder=domain==="ADDITIONAL"?"Search Fruquintinib, Nivolumab/relatlimab...":"Search Bevacizumab, Carboplatin, VEGF, Curcumin..."
 }
 function render(){
   document.getElementById("oncoWorkspacePatient").textContent=currentPatient?
     `${currentPatient.name} · ${reports.length} report(s) · latest ${reports.at(-1)?.reportDate||"Unknown"}`:"";
   renderDomainStatus();
   renderReportStructure();
   buildFilters();
   buildReportDateOptions();
   renderList();
   renderClassCards();
   renderSelected()
 }
 function renderList(){
   const rows=currentRows();
   const zeroCount=rows.filter(r=>!r.isCatalogPlaceholder&&numericValue(r)===0).length;
   const missingCount=rows.filter(r=>r.isCatalogPlaceholder).length;
   const resultCount=rows.length-missingCount;
   document.getElementById("oncoItemCount").textContent=domain==="ADDITIONAL"
     ?L(`${rows.length} รายการ · มีผล ${resultCount} · ไม่พบในรายงานล่าสุด ${missingCount}`,`${rows.length} items · with result ${resultCount} · absent from latest report ${missingCount}`)
     :L(`${rows.length} รายการ · พบใน JSON ${resultCount} · พบและเป็น 0% ${zeroCount} · ไม่พบใน JSON ${missingCount}`,`${rows.length} items · present in JSON ${resultCount} · verified as 0% ${zeroCount} · absent from JSON ${missingCount}`);
   document.getElementById("oncoItemList").innerHTML=rows.map(r=>`
     <div class="onco-item has-check ${selectedName===r.name?"selected":""} ${r.isCatalogPlaceholder?"catalog-missing":r.nameMatchStatus==="UNMATCHED"?"catalog-unmatched":numericValue(r)===0?"catalog-zero":""}" data-onco-name="${esc(r.name)}" data-hover-onco="${esc(r.name)}">
       <input class="compare-check" type="checkbox" data-compare-name="${esc(r.name)}" ${selectedNames.has(r.name)?"checked":""}>
       <div class="onco-item-name">${esc(r.name)}</div>
       <span class="result-pill ${r.isCatalogPlaceholder?"missing":r.nameMatchStatus==="UNMATCHED"?"unmatched":isAdditionalRow(r)?statusClass(r.displayStatus):numericValue(r)===0?"zero":"neutral"}">${esc(isEnglishMode()?englishOr(r.displayStatus,r.displayStatus):r.displayStatus)}</span>
       <div class="onco-item-meta">${esc(isEnglishMode()?englishDomainCategory(r,r.knowledge):r.knowledge.category)} · ${esc(isEnglishMode()?englishSubgroup(r,r.knowledge):r.knowledge.subgroup)} · ${esc(dateOf(r))}${isAdditionalRow(r)?` · assay ${esc(r.valueWithout??r.reportLayer?.valueWithoutSubstance??"—")} → ${esc(r.valueWith??r.reportLayer?.valueWithSubstance??"—")}`:""}</div>
     </div>`).join("")||`<div class="empty">${L("ไม่พบรายการในกลุ่มนี้","No items found in this group")}</div>`
 }
 function selectedLatest(){
   return enrichedRows().filter(r=>r.domain===domain&&r.name===selectedName)
     .sort((a,b)=>dateOf(a).localeCompare(dateOf(b))).at(-1)||null
 }
 function renderCompareLegend(){
   const box=document.getElementById("oncoCompareLegend");
   if(!selectedNames.size){
     box.innerHTML=domain==="ADDITIONAL"
       ?`<span class="compare-chip auto-rank-chip">${L("AUTO · แสดง Additional Drug Test ทั้งหมด","AUTO · show all Additional Drug Test items")}</span>`
       :`<span class="compare-chip auto-rank-chip">${L("AUTO · เรียงค่าจากสูงไปต่ำ","AUTO · sort source values high to low")}</span>`;
     return
   }
   box.innerHTML=[...selectedNames].map(n=>`<span class="compare-chip">${esc(n)}<button data-remove-compare="${esc(n)}">×</button></span>`).join("")
 }
 function toggleCompare(name,on){if(on)selectedNames.add(name);else selectedNames.delete(name);renderList();renderCompareLegend();renderSelected()}
 function renderEvidence(){
   const names=selectedNames.size?[...selectedNames]:(selectedName?[selectedName]:[]);
   const rs=enrichedRows().filter(r=>r.domain===domain&&names.includes(r.name)&&!r.isCatalogPlaceholder).sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
   document.getElementById("oncoEvidenceBody").innerHTML=rs.length?rs.map(r=>{const c=Number(r.confidence||0),cl=c>=80?"confidence-high":c>=60?"confidence-mid":"confidence-low";return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(statusOf(r))}${!isAdditionalRow(r)&&r.value!==null&&r.value!==undefined?` (${esc(r.value)}${esc(r.unit||"")})`:""}${isAdditionalRow(r)?` · assay ${esc(r.valueWithout??r.reportLayer?.valueWithoutSubstance??"—")} → ${esc(r.valueWith??r.reportLayer?.valueWithSubstance??"—")}`:""}</td><td>${esc(dateOf(r))}</td><td>${esc(r.page||"—")}</td><td class="source-line">${esc(r.sourceLine||r.sourceContext||L("ไม่มีข้อความต้นทาง","No source text"))}</td><td class="${cl}">${esc(c||"—")}</td></tr>`}).join(""):`<tr><td colspan="6" class="empty">${L("เลือกรายการเพื่อดูหลักฐาน","Select an item to view source evidence")}</td></tr>`
 }
 function geneDirectionInterpretation(row,k){
   const value=numericValue(row),unit=row.unit||"%";
   if(isEnglishMode()){
     if(value===null)return{direction:"Direction not yet determined",explanation:"No verified numeric value is available. Check the source report for a qualitative result or percentage.",implication:"Do not infer increased or decreased pathway activity from this item yet."};
     if(value>0)return{direction:`Positive / increased (+${value}${unit})`,explanation:"A positive value indicates expression above the assay baseline used in this report.",implication:"This may support increased activity of the related pathway or function, but clinical meaning depends on the biological role of the gene and must not be treated as a mutation result or a response probability."};
     if(value<0)return{direction:`Negative / decreased (${value}${unit})`,explanation:"A negative value indicates expression below the assay baseline used in this report.",implication:"This may reflect reduced pathway activity. For tumor suppressors or DNA-repair genes, reduced expression can have adverse significance; a negative value is not automatically favorable."};
     return{direction:`Baseline (0${unit})`,explanation:"A value of 0 indicates no deviation from the assay baseline. It does not mean the gene or protein is absent.",implication:"Interpret together with cancer type, assay method and validated molecular testing."}
   }
   if(value===null)return{direction:"ยังไม่สามารถกำหนดทิศทางได้",explanation:"ไม่พบค่าตัวเลขที่ยืนยันได้ กรุณาตรวจผล Positive/Negative หรือเปอร์เซ็นต์จากต้นฉบับ",implication:"ยังไม่ควรสรุปว่า pathway ทำงานมากหรือน้อย"};
   if(value>0)return{direction:`Positive / เพิ่มขึ้น (+${value}${unit})`,explanation:"ค่าบวกหมายถึงการแสดงออกของยีนหรือ marker สูงกว่า baseline ของวิธีทดสอบในรายงาน",implication:"อาจสนับสนุนว่า pathway หรือหน้าที่ที่เกี่ยวข้องมี activity เพิ่มขึ้น แต่ผลทางคลินิกอาจเป็นทั้งส่งเสริมมะเร็งหรือเป็นกลไกป้องกัน ขึ้นกับบทบาทของยีนนั้น"};
   if(value<0)return{direction:`Negative / ลดลง (${value}${unit})`,explanation:"ค่าลบหมายถึงการแสดงออกของยีนหรือ marker ต่ำกว่า baseline ของวิธีทดสอบในรายงาน",implication:"อาจสะท้อน pathway activity ที่ลดลง อย่างไรก็ตาม ถ้าเป็น tumor-suppressor หรือยีนซ่อมแซม DNA การลดลงอาจเป็นผลไม่พึงประสงค์ จึงห้ามตีความว่าค่าลบคือผลดีเสมอ"};
   return{direction:`Baseline (0${unit})`,explanation:"ค่า 0 หมายถึงไม่เบี่ยงเบนจาก baseline ตามสเกลของรายงาน ไม่ได้แปลว่าไม่มียีนหรือไม่มีโปรตีน",implication:"ควรตีความร่วมกับชนิดมะเร็ง วิธีตรวจ และผล molecular test มาตรฐาน"}
 }
 function clinicalGeneInterpretation(row,k){
   const value=numericValue(row);
   const symbol=String(k.geneSymbol||row.name||"").trim();
   const key=symbol.toUpperCase().replace(/[^A-Z0-9]/g,"");
   const isHigh=value!==null&&value>0;
   const isLow=value!==null&&value<0;
   const pct=value===null?"ไม่พบค่าตัวเลขที่ยืนยันได้":`${value>0?"+":""}${value}${row.unit||"%"}`;
   const profiles={
     DNADEMETHYLASE:{
       full:"DNA demethylase",
       plain:"เอนไซม์หรือกระบวนการที่ช่วยลดหมู่ methyl บน DNA ทำให้ยีนบางส่วนที่ถูกปิดสามารถกลับมาแสดงออกได้",
       high:"การทำงานสูงขึ้นอาจทำให้รูปแบบการเปิด–ปิดยีนเปลี่ยนไป เซลล์มะเร็งอาจเปิดยีนที่ช่วยการเจริญเติบโตหรือการปรับตัว แต่ไม่สามารถสรุปว่าเป็นผลดีหรือผลเสียจากค่านี้เพียงค่าเดียว",
       low:"การทำงานลดลงอาจทำให้ DNA methylation คงอยู่มากขึ้นและยีนบางชนิดถูกปิดต่อเนื่อง หากยีนที่ถูกปิดเป็น tumor-suppressor อาจเป็นผลเสีย แต่ผลนี้ยังไม่บอกว่ายีนใดถูก methylated",
       drugs:"ยากลุ่ม epigenetic therapy เช่น DNA-methyltransferase inhibitors มีความเกี่ยวข้องกับระบบ methylation แต่ไม่ควรเลือกยาจากค่า DNA demethylase นี้เพียงอย่างเดียว",
       action:"ใช้เป็นข้อมูลด้าน epigenetic regulation ประกอบ ควรพิจารณาร่วมกับชนิดมะเร็ง ผล methylation-specific assay และ molecular testing ที่เหมาะสม",
       level:"Epigenetic context marker"
     },
     EGF:{full:"EGF — Epidermal growth factor",plain:"สารกระตุ้นการเจริญเติบโตที่จับ EGFR และส่งสัญญาณให้เซลล์แบ่งตัว",high:"EGF สูงอาจสนับสนุนการกระตุ้น EGFR pathway และการแบ่งตัวของเซลล์ที่เพิ่มขึ้น",low:"EGF ต่ำลดน้ำหนักการกระตุ้น EGFR จาก ligand นี้ แต่ไม่ตัด EGFR mutation หรือ activation จากกลไกอื่น",drugs:"ยากลุ่ม EGFR inhibitors อาจเกี่ยวข้องตามชนิดมะเร็งและผลตรวจมาตรฐาน",action:"พิจารณาร่วมกับ EGFR mutation/amplification, IHC และผล drug sensitivity",level:"Growth-factor context marker"},
     IGFR1:{full:"IGF-1R — Insulin-like growth factor 1 receptor",plain:"ตัวรับที่ช่วยส่งสัญญาณการเจริญเติบโต การอยู่รอด และการดื้อ apoptosis",high:"อาจสะท้อน IGF-driven growth และ survival signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนักบทบาทของ IGF-1R pathway แต่ไม่ตัด pathway การเจริญเติบโตอื่น",drugs:"ยามุ่งเป้า IGF-1R ส่วนใหญ่ยังอยู่ในบริบทการศึกษา",action:"ใช้เป็นข้อมูลชีววิทยาประกอบ ไม่ควรเลือกยาจากค่านี้เพียงอย่างเดียว",level:"Investigational pathway marker"},
     IGFR2:{full:"IGF-2R — Insulin-like growth factor 2 receptor",plain:"ตัวรับที่เกี่ยวข้องกับการควบคุม IGF-2 และสมดุลสัญญาณการเจริญเติบโต",high:"อาจสะท้อนการเปลี่ยนแปลงของ IGF-2 axis แต่ทิศทางทางคลินิกขึ้นกับบริบทของเนื้องอก",low:"อาจลดการกวาดจับ IGF-2 และทำให้ growth signaling เปลี่ยนแปลงได้",drugs:"ยังไม่มี targeted therapy มาตรฐานที่เลือกจาก expression นี้โดยตรง",action:"แปลผลร่วมกับชนิดมะเร็งและ marker ใน IGF pathway ตัวอื่น",level:"Biological context marker"},
     CERBB1:{full:"EGFR / HER1 / c-erb-B1",plain:"ตัวรับบนผิวเซลล์ที่กระตุ้น MAPK และ PI3K-AKT signaling",high:"อาจสะท้อน EGFR pathway activity ที่เพิ่มขึ้น แต่ไม่ยืนยัน mutation หรือ amplification",low:"ลดน้ำหนัก EGFR overexpression แต่ไม่ตัด actionable mutation",drugs:"Cetuximab, Panitumumab, Gefitinib, Erlotinib, Afatinib และ Osimertinib ตามข้อบ่งใช้",action:"ต้องยืนยัน alteration ด้วย IHC/ISH/PCR/NGS ตามชนิดมะเร็ง",level:"ต้องมี molecular confirmation"},
     EGFR:{alias:"CERBB1"},
     HER1:{alias:"CERBB1"},
     CERBB2:{full:"HER2 / ERBB2 / c-erb-B2",plain:"ตัวรับ tyrosine kinase ที่เร่ง growth signaling และการอยู่รอดของเซลล์",high:"อาจสงสัย HER2 overexpression หรือ amplification แต่ยังไม่ยืนยัน",low:"ไม่สนับสนุน overexpression เด่น แต่ไม่ตัด HER2 amplification",drugs:"Trastuzumab, Pertuzumab, T-DM1, Trastuzumab deruxtecan และ HER2-targeted therapy ตามข้อบ่งใช้",action:"ยืนยันด้วย IHC/ISH หรือ NGS ตามชนิดมะเร็งก่อนเลือกยา",level:"Companion-diagnostic marker"},
     HER2:{alias:"CERBB2"},
     ERBB2:{alias:"CERBB2"},
     CD117CKIT:{full:"c-KIT / CD117",plain:"receptor tyrosine kinase ที่เกี่ยวข้องกับ growth และ survival ของเซลล์บางชนิด",high:"อาจสะท้อน KIT expression แต่ไม่ยืนยัน KIT mutation ที่ตอบสนองต่อยา",low:"ลดน้ำหนัก KIT overexpression แต่ไม่ตัด mutation",drugs:"Imatinib, Sunitinib, Regorafenib หรือ Avapritinib เฉพาะโรคและ alteration ที่เหมาะสม",action:"ต้องยืนยัน KIT mutation/exon และชนิดมะเร็งด้วย NGS/PCR",level:"ต้องมี mutation confirmation"},
     CKIT:{alias:"CD117CKIT"},
     SSR:{full:"Somatostatin receptor (SSTR)",plain:"ตัวรับ somatostatin ซึ่งอาจใช้ประเมิน receptor biology ใน neuroendocrine tumors",high:"อาจสนับสนุนการมี somatostatin-receptor expression",low:"ลดโอกาส receptor expression เด่น แต่ยังต้องยืนยันด้วย imaging หรือ IHC",drugs:"Somatostatin analogues และ PRRT ขึ้นกับ SSTR imaging/ข้อบ่งใช้",action:"ใช้ DOTATATE PET/CT หรือการตรวจมาตรฐานเมื่อต้องตัดสินใจรักษา",level:"ต้องยืนยันด้วย receptor imaging/IHC"},
     JAK12:{full:"JAK1/JAK2",plain:"kinase หลักใน cytokine–JAK–STAT signaling",high:"อาจสะท้อน cytokine/JAK-STAT activity ที่เพิ่มขึ้น",low:"ลดน้ำหนัก JAK-STAT activation แต่ไม่ตัด mutation หรือ activation downstream",drugs:"JAK inhibitors ใช้เฉพาะข้อบ่งใช้และ molecular context ที่เหมาะสม",action:"ยืนยัน mutation/fusion และบริบทโรคก่อนเลือกยา",level:"Pathway marker"},
     JAK:{alias:"JAK12"}, JAK1:{alias:"JAK12"}, JAK2:{alias:"JAK12"},
     MTOR:{full:"mTOR",plain:"ศูนย์ควบคุมการเจริญเติบโต การสร้างโปรตีน และการตอบสนองต่อสารอาหาร",high:"อาจสะท้อน PI3K-AKT-mTOR signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก mTOR activity แต่ไม่ตัด upstream activation",drugs:"Everolimus, Temsirolimus และ pathway inhibitors ตามข้อบ่งใช้",action:"พิจารณาร่วมกับ PTEN, PIK3CA, AKT alterations และมาตรฐานโรค",level:"Pathway context marker"},
     CJUN:{full:"c-Jun / AP-1",plain:"transcription factor ที่ควบคุม stress response การแบ่งตัว และการอยู่รอด",high:"อาจสะท้อน AP-1 activity และ stress-adaptation signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก AP-1 activation",drugs:"ยังไม่มีการเลือกยามาตรฐานจาก c-Jun expression เพียงอย่างเดียว",action:"ใช้เป็นข้อมูล pathway ประกอบ",level:"Biological context marker"},
     CFOS:{full:"c-Fos / AP-1",plain:"immediate-early transcription factor ที่ทำงานร่วมกับ c-Jun",high:"อาจสะท้อน growth-response และ AP-1 signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก immediate-early/AP-1 activity",drugs:"ยังไม่มี targeted therapy มาตรฐานจาก expression นี้โดยตรง",action:"แปลผลร่วมกับ c-Jun และ MAPK pathway",level:"Biological context marker"},
     RASRAFMEKERK:{full:"RAS–RAF–MEK–ERK / MAPK pathway",plain:"pathway สำคัญที่ขับการแบ่งตัวและการอยู่รอดของเซลล์",high:"อาจสะท้อน MAPK pathway activation แต่ไม่ระบุว่าเกิดจาก KRAS, NRAS, BRAF หรือกลไกใด",low:"ลดน้ำหนัก pathway activity ในตัวอย่างนี้ แต่ไม่ตัด actionable mutation",drugs:"BRAF, MEK, EGFR หรือ KRAS inhibitors ตาม molecular alteration และชนิดมะเร็ง",action:"ต้องใช้ NGS/PCR ยืนยัน driver alteration ก่อนเลือกยา",level:"ต้องมี molecular confirmation"},
     MAPK:{alias:"RASRAFMEKERK"},
     ESTROGENERECEPTOR:{full:"Estrogen receptor (ER)",plain:"ตัวรับฮอร์โมนเอสโตรเจนที่ขับการเจริญเติบโตของมะเร็งบางชนิด",high:"อาจสนับสนุน estrogen-driven biology และความไวต่อ endocrine therapy",low:"ลดน้ำหนัก ER-driven disease แต่ไม่แทนผล ER IHC",drugs:"Tamoxifen, Aromatase inhibitors, Fulvestrant และ endocrine combinations ตามข้อบ่งใช้",action:"ใช้ ER IHC ที่ได้รับการรับรองในการตัดสินใจรักษา",level:"ต้องยืนยันด้วย IHC"},
     ER:{alias:"ESTROGENERECEPTOR"},
     PROGESTERONERECEPTOR:{full:"Progesterone receptor (PR)",plain:"receptor ที่มักสะท้อนการทำงานของ estrogen signaling ในมะเร็งเต้านม",high:"อาจสนับสนุน hormone responsiveness",low:"อาจสัมพันธ์กับ hormone signaling ที่ลดลงหรือ biology ที่ก้าวร้าวขึ้นในบางบริบท",drugs:"Endocrine therapy ตามชนิดมะเร็งและ ER/PR IHC",action:"ยืนยันด้วย PR IHC และแปลผลร่วมกับ ER/HER2",level:"ต้องยืนยันด้วย IHC"},
     PR:{alias:"PROGESTERONERECEPTOR"},
     NR3C4A:{full:"Androgen receptor isoform A (NR3C4-A)",plain:"ตัวรับ androgen ที่เกี่ยวข้องกับการเจริญเติบโตของเนื้องอกที่พึ่งพาฮอร์โมน",high:"อาจสนับสนุน androgen-axis activity",low:"ลดน้ำหนัก AR-driven signaling แต่ไม่ตัด AR alteration หรือ splice variants",drugs:"Androgen deprivation, Enzalutamide, Apalutamide, Darolutamide, Abiraterone ตามข้อบ่งใช้",action:"แปลผลร่วมกับ AR IHC/NGS และบริบทโรค โดยเฉพาะ prostate cancer",level:"Hormone-pathway marker"},
     NR3C4B:{full:"Androgen receptor isoform B (NR3C4-B)",plain:"AR isoform ที่อาจสะท้อนองค์ประกอบของ androgen signaling",high:"อาจสนับสนุน androgen-receptor activity หรือ altered isoform expression",low:"ลดน้ำหนัก isoform นี้ แต่ไม่สรุป AR pathway ทั้งหมด",drugs:"ยาต้าน androgen ตามข้อบ่งใช้และการประเมินมาตรฐาน",action:"ไม่ควรใช้ isoform expression นี้เพียงค่าเดียวในการเลือกยา",level:"Exploratory hormone marker"},
     TGFB:{full:"TGF-β",plain:"cytokine ที่เกี่ยวข้องกับ fibrosis, immune suppression, EMT และการแพร่กระจาย",high:"อาจสะท้อน immune-suppressive/EMT และ resistance signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก TGF-β-driven biology",drugs:"TGF-β pathway inhibitors ส่วนใหญ่ยังอยู่ในบริบทการศึกษา",action:"ใช้ประกอบการประเมิน tumor microenvironment ไม่ใช่ตัวเลือกยามาตรฐานเดี่ยว",level:"Tumor-microenvironment marker"},
     HSP27:{full:"HSP27 / HSPB1",plain:"heat-shock protein ที่ช่วยให้เซลล์ทนต่อความเครียดและยับยั้ง apoptosis",high:"อาจสัมพันธ์กับ stress tolerance และ drug resistance ที่เพิ่มขึ้น",low:"ลดน้ำหนักกลไกป้องกันเซลล์ผ่าน HSP27",drugs:"ยังไม่มี HSP27-targeted therapy มาตรฐานทั่วไป",action:"พิจารณาร่วมกับ drug sensitivity และ resistance markers อื่น",level:"Resistance context marker"},
     HSP72:{full:"HSP72 / inducible HSP70",plain:"chaperone ที่ช่วยพับโปรตีนและปกป้องเซลล์จากความเครียด",high:"อาจสัมพันธ์กับ stress adaptation และการอยู่รอดของเซลล์มะเร็ง",low:"ลดน้ำหนัก HSP70-mediated protection",drugs:"HSP70-directed approaches ยังเป็น investigational",action:"ใช้เป็นข้อมูลชีววิทยาประกอบ",level:"Investigational resistance marker"},
     HSP90:{full:"HSP90",plain:"chaperone ที่พยุงโปรตีนก่อมะเร็งหลายชนิดให้คงตัว",high:"อาจสนับสนุน oncogenic-protein stability และ resistance",low:"ลดน้ำหนัก HSP90-dependent protein support",drugs:"HSP90 inhibitors ส่วนใหญ่ยังไม่ใช่มาตรฐานทั่วไป",action:"ไม่ควรเลือกยาจาก expression นี้เพียงอย่างเดียว",level:"Investigational pathway marker"},
     PARP117:{full:"PARP family (PARP1–17)",plain:"กลุ่มเอนไซม์ที่เกี่ยวข้องกับการตรวจจับและซ่อมแซม DNA damage",high:"อาจสะท้อน DNA-repair activity ที่เพิ่มขึ้น แต่ไม่ยืนยัน HRD",low:"อาจสะท้อน repair activity ที่ลดลง แต่ไม่เท่ากับ BRCA/HRD positivity",drugs:"Olaparib, Niraparib, Rucaparib, Talazoparib ตามข้อบ่งใช้และ biomarker ที่รับรอง",action:"ต้องใช้ BRCA/HRD testing และข้อบ่งใช้มาตรฐานก่อนเลือก PARP inhibitor",level:"ไม่ใช่ HRD companion diagnostic"},
     PARP:{alias:"PARP117"},
     HDAC:{full:"Histone deacetylase (HDAC)",plain:"เอนไซม์ที่ปิดการแสดงออกของยีนผ่าน chromatin compaction",high:"อาจสะท้อน epigenetic repression และ cellular plasticity ที่เพิ่มขึ้น",low:"ลดน้ำหนัก HDAC activity",drugs:"Vorinostat, Romidepsin, Belinostat, Panobinostat เฉพาะข้อบ่งใช้",action:"ใช้ตามชนิดมะเร็งและมาตรฐาน ไม่เลือกจาก expression นี้เพียงอย่างเดียว",level:"Epigenetic pathway marker"},
     HAT:{full:"Histone acetyltransferase (HAT)",plain:"เอนไซม์ที่เปิด chromatin และส่งเสริม gene transcription",high:"อาจสะท้อน histone acetylation และ transcriptional activity ที่เพิ่มขึ้น",low:"อาจสะท้อน chromatin opening ที่ลดลง",drugs:"ยังไม่มี HAT-targeted therapy มาตรฐานทั่วไป",action:"แปลผลร่วมกับ HDAC และบริบท epigenetic",level:"Biological context marker"},
     CXCR4:{full:"CXCR4",plain:"chemokine receptor ที่ช่วยการเคลื่อนที่ การ homing และการแพร่กระจายของเซลล์",high:"อาจสัมพันธ์กับ invasion, metastatic homing และ stromal protection ที่เพิ่มขึ้น",low:"ลดน้ำหนัก CXCR4-driven migration",drugs:"CXCR4-directed therapies ส่วนใหญ่จำกัดในข้อบ่งใช้หรือการศึกษา",action:"ใช้เป็น metastatic/microenvironment context marker",level:"Emerging predictive marker"},
     CXCL12:{full:"CXCL12 / SDF-1",plain:"ligand ของ CXCR4 ที่สร้าง gradient ดึงดูดเซลล์และสนับสนุน stromal interaction",high:"อาจสนับสนุน CXCL12–CXCR4 axis, migration และ microenvironment protection",low:"ลดน้ำหนัก axis นี้",drugs:"CXCR4-axis inhibitors ยังขึ้นกับบริบทโรคและการศึกษา",action:"แปลผลร่วมกับ CXCR4",level:"Tumor-microenvironment marker"},
     VEGF:{full:"VEGF",plain:"growth factor ที่กระตุ้นการสร้างหลอดเลือดใหม่ของก้อนมะเร็ง",high:"อาจสะท้อน angiogenesis ที่เพิ่มขึ้น",low:"ลดน้ำหนัก VEGF-driven angiogenesis แต่ไม่ตัด pathway อื่น",drugs:"Bevacizumab, Aflibercept, Ramucirumab และ VEGFR inhibitors ตามข้อบ่งใช้",action:"ไม่ควรเลือก anti-VEGF จาก expression เพียงอย่างเดียว ให้พิจารณาชนิดมะเร็งและความเสี่ยงเลือดออก/ลิ่มเลือด",level:"Biological context marker"},
     PDGF:{full:"PDGF — Platelet-derived growth factor",plain:"growth factor ที่ส่งเสริม stromal-cell, pericyte และ vascular signaling",high:"อาจสะท้อน stromal/angiogenic signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก PDGF-driven biology",drugs:"Multi-kinase inhibitors บางชนิดครอบคลุม PDGFR ตามข้อบ่งใช้",action:"ไม่ควรเลือกยาเฉพาะจาก PDGF expression เพียงค่าเดียว",level:"Angiogenesis context marker"},
     FGF:{full:"FGF — Fibroblast growth factor",plain:"growth-factor family ที่เกี่ยวข้องกับการแบ่งตัว การสร้างหลอดเลือด และการดื้อยา",high:"อาจสะท้อน FGF-driven proliferation/angiogenesis",low:"ลดน้ำหนัก FGF pathway activity",drugs:"FGFR inhibitors ใช้เมื่อยืนยัน FGFR alteration ตามข้อบ่งใช้",action:"ต้องตรวจ FGFR mutation/fusion/amplification ด้วยวิธีมาตรฐาน",level:"ต้องมี molecular confirmation สำหรับ targeted therapy"},
     ANG1:{full:"Angiopoietin-1 (ANG1)",plain:"ligand ของ TIE2 ที่ช่วยพยุงและทำให้หลอดเลือดมีเสถียรภาพ",high:"อาจสะท้อน vascular maturation/stabilization signaling",low:"อาจสะท้อน vascular-support signal ที่ลดลง",drugs:"ยังไม่มีการเลือกยามาตรฐานจาก ANG1 expression โดยตรง",action:"แปลผลร่วมกับ ANG2, VEGF และภาพรวม angiogenesis",level:"Angiogenesis context marker"},
     ANG2:{full:"Angiopoietin-2 (ANG2)",plain:"ตัวควบคุม vascular remodeling และ endothelial activation",high:"อาจสัมพันธ์กับหลอดเลือดไม่เสถียร angiogenesis และ metastatic microenvironment",low:"ลดน้ำหนัก ANG2-driven remodeling",drugs:"ANG2/TIE2-directed approaches ส่วนใหญ่ยังเป็น investigational",action:"ใช้เป็นข้อมูล angiogenesis ประกอบ",level:"Emerging angiogenesis marker"},
     CMET:{full:"c-MET / MET",plain:"receptor ของ HGF ที่กระตุ้น growth, invasion และ metastasis",high:"อาจสะท้อน MET pathway activity แต่ไม่ยืนยัน MET amplification หรือ exon 14 skipping",low:"ลดน้ำหนัก MET overexpression แต่ไม่ตัด actionable alteration",drugs:"Capmatinib, Tepotinib, Crizotinib หรือ MET-directed therapy ตาม alteration/ข้อบ่งใช้",action:"ต้องยืนยัน MET exon14, amplification หรือ mutation ด้วย NGS/ISH",level:"ต้องมี molecular confirmation"},
     MET:{alias:"CMET"},
     MMP:{full:"Matrix metalloproteinases (MMP)",plain:"กลุ่มเอนไซม์ที่ย่อย extracellular matrix และช่วย invasion",high:"อาจสะท้อน matrix remodeling และ invasive potential ที่เพิ่มขึ้น",low:"ลดน้ำหนัก MMP-mediated invasion",drugs:"ยังไม่มี MMP inhibitor มาตรฐานทั่วไปจากผลนี้",action:"ใช้เป็น invasion/metastasis context marker",level:"Biological context marker"},
     "67LR":{full:"67-kDa laminin receptor (67LR)",plain:"receptor ที่เกี่ยวข้องกับ cell adhesion, migration และ invasion",high:"อาจสัมพันธ์กับ invasive phenotype และการยึดเกาะกับ basement membrane",low:"ลดน้ำหนัก 67LR-mediated invasion",drugs:"ยังไม่มี targeted therapy มาตรฐานจาก expression นี้",action:"ใช้เป็นข้อมูลชีววิทยาประกอบ",level:"Exploratory metastasis marker"},
     KISS1R:{full:"KISS1 receptor (KISS1R)",plain:"ส่วนหนึ่งของ metastasis-suppressor signaling",high:"อาจสนับสนุน anti-metastatic signaling ในบางบริบท",low:"อาจลด metastasis-suppressor signaling แต่ความหมายขึ้นกับชนิดมะเร็ง",drugs:"ยังไม่มี targeted therapy มาตรฐานจาก expression นี้",action:"ควรตีความอย่างระมัดระวัง ไม่ใช้คำว่า high = แย่เสมอ",level:"Metastasis-suppressor context marker"},
     NM23:{full:"Nm23 / NME1",plain:"โปรตีนที่มีบทบาทกดการแพร่กระจายในมะเร็งบางชนิด",high:"อาจสัมพันธ์กับ metastatic suppression",low:"อาจสัมพันธ์กับ metastatic potential ที่เพิ่มขึ้นในบางบริบท",drugs:"ไม่มี targeted therapy มาตรฐานจาก expression นี้",action:"แปลผลร่วมกับชนิดมะเร็งและ metastatic markers อื่น",level:"Prognostic context marker"},
     MDR1:{full:"MDR1 / ABCB1 (P-glycoprotein)",plain:"ปั๊มขับยาที่ผิวเซลล์ ซึ่งสามารถขับยาเคมีบำบัดออกจากเซลล์มะเร็ง",high:"เซลล์มะเร็งมีแนวโน้มสร้างปั๊มขับยาเพิ่มขึ้น ยาบางชนิดอาจคงอยู่ในเซลล์น้อยลงและมีโอกาสตอบสนองลดลง",low:"ไม่พบหลักฐานเด่นของกลไกดื้อยาผ่านปั๊ม MDR1 แต่ยังมีกลไกดื้อยาอื่นได้",drugs:"Paclitaxel, Docetaxel, Vincristine, Vinblastine, Doxorubicin และ Etoposide อาจได้รับผล",action:"เปรียบเทียบกับผล Drug Sensitivity และประวัติการตอบสนอง ไม่ควรตัดยาจาก MDR1 เพียงค่าเดียว",level:"Drug-resistance context marker"},
     ABCB1:{alias:"MDR1"},
     MRP1:{full:"MRP1 / ABCC1",plain:"โปรตีนขนส่งที่ขับยาและ conjugated metabolites ออกจากเซลล์",high:"อาจสนับสนุน multidrug resistance ผ่าน drug efflux",low:"ลดน้ำหนักกลไกดื้อยาผ่าน MRP1 แต่ไม่ตัดกลไกอื่น",drugs:"Anthracyclines, Vinca alkaloids และยาหลายชนิดอาจได้รับผลตามบริบท",action:"ใช้ร่วมกับ drug sensitivity และข้อมูลการรักษาจริง",level:"Drug-resistance context marker"},
     ABCC1:{alias:"MRP1"},
     LRP:{full:"LRP / MVP — Lung resistance-related protein",plain:"โปรตีนที่เกี่ยวข้องกับการลำเลียงยาออกจากนิวเคลียสและ sequestration",high:"อาจสัมพันธ์กับ drug resistance ผ่าน intracellular transport",low:"ลดน้ำหนักกลไก LRP/MVP-mediated resistance",drugs:"ความสัมพันธ์ครอบคลุมยาหลายกลุ่มและยังไม่เฉพาะเจาะจงพอสำหรับเลือกยา",action:"ใช้ร่วมกับ drug sensitivity และ resistance markers อื่น",level:"Drug-resistance context marker"},
     GST:{full:"Glutathione S-transferase (GST)",plain:"เอนไซม์ detoxification ที่จับยาหรือสารพิษกับ glutathione",high:"อาจเพิ่มการกำจัดยาหรือ oxidative stress และสัมพันธ์กับ resistance",low:"ลดน้ำหนัก GST-mediated detoxification แต่ไม่ตัดระบบ antioxidant อื่น",drugs:"Platinum และ alkylating agents บางชนิดอาจได้รับผลตาม isoform/บริบท",action:"ไม่ควรเลือกหรือตัดยาจาก GST expression เดี่ยว",level:"Detoxification/resistance marker"},
     ERCC1:{full:"ERCC1",plain:"ยีนซ่อมแซม DNA ใน nucleotide-excision repair",high:"เซลล์อาจซ่อม DNA damage จาก platinum ได้มากขึ้น จึงอาจสัมพันธ์กับความไวต่อ platinum ที่ลดลง",low:"อาจสนับสนุนความไวต่อ platinum มากขึ้น แต่ไม่เพียงพอสำหรับเลือกยาเดี่ยว",drugs:"Cisplatin, Carboplatin และ Oxaliplatin",action:"พิจารณาร่วมกับ platinum sensitivity, ชนิดมะเร็ง และ assay มาตรฐาน",level:"Predictive context marker"},
     RRM1:{full:"RRM1",plain:"ส่วนหนึ่งของ ribonucleotide reductase ที่จำเป็นต่อการสร้าง DNA",high:"อาจสัมพันธ์กับการตอบสนองต่อ Gemcitabine ที่ลดลง",low:"อาจสนับสนุนความไวต่อ Gemcitabine มากขึ้น",drugs:"Gemcitabine",action:"ตรวจสอบร่วมกับ drug sensitivity และข้อมูลคลินิก",level:"Predictive context marker"},
     TS:{full:"Thymidylate synthase (TYMS)",plain:"เอนไซม์เป้าหมายสำคัญของ fluoropyrimidines",high:"อาจสัมพันธ์กับการตอบสนองต่อ 5-FU/Capecitabine ที่ลดลง",low:"อาจสนับสนุนความไวต่อ fluoropyrimidines มากขึ้น",drugs:"5-FU, Capecitabine, FUDR และ Raltitrexed",action:"ใช้ร่วมกับ drug sensitivity และสูตรการรักษามาตรฐาน",level:"Predictive context marker"},
     TYMS:{alias:"TS"},
     DPD:{full:"Dihydropyrimidine dehydrogenase (DPD/DPYD pathway)",plain:"เอนไซม์หลักที่สลาย 5-FU",high:"อาจทำให้ 5-FU ถูกสลายเร็วขึ้นและ exposure ลดลง",low:"ถ้าต่ำมากอาจเพิ่มความเสี่ยงพิษรุนแรงจาก fluoropyrimidines",drugs:"5-FU และ Capecitabine",action:"การประเมินความปลอดภัยต้องใช้ DPYD genotyping หรือ DPD phenotyping ที่รับรอง ไม่ใช้ gene expression นี้แทน",level:"Safety-critical marker"},
     DPYD:{alias:"DPD"},
     PDL1:{full:"PD-L1 / CD274",plain:"immune-checkpoint ligand ที่ช่วยให้เซลล์มะเร็งหลบภูมิคุ้มกัน",high:"อาจสนับสนุน PD-1/PD-L1 pathway activity แต่ไม่ได้ยืนยันว่าจะตอบสนองต่อ immunotherapy",low:"ไม่ตัดโอกาสได้ประโยชน์จาก immunotherapy",drugs:"Pembrolizumab, Nivolumab, Atezolizumab, Durvalumab และ checkpoint inhibitors ตามข้อบ่งใช้",action:"ใช้ IHC ที่รับรองและเกณฑ์ TPS/CPS ตามชนิดมะเร็ง รวมทั้ง MSI/TMB เมื่อเหมาะสม",level:"ต้องยืนยันด้วย companion diagnostic"},
     CD274:{alias:"PDL1"},
     PD1:{full:"PD-1 / PDCD1",plain:"inhibitory receptor บน T cells ที่ลดการทำงานของภูมิคุ้มกันเมื่อจับ ligand",high:"อาจสะท้อน activated/exhausted T-cell checkpoint signaling",low:"ลดน้ำหนัก PD-1 expression แต่ไม่ตัดประโยชน์จาก checkpoint inhibitor",drugs:"Pembrolizumab, Nivolumab, Cemiplimab และ PD-1 inhibitors ตามข้อบ่งใช้",action:"ไม่ใช้ PD-1 gene expression แทน PD-L1 IHC, MSI หรือ TMB",level:"Immune-context marker"},
     PDCD1:{alias:"PD1"},
     PDL2:{full:"PD-L2 / PDCD1LG2",plain:"ligand อีกชนิดของ PD-1 ที่มีบทบาทกด T-cell response",high:"อาจสะท้อน immune-checkpoint signaling ที่เพิ่มขึ้น",low:"ลดน้ำหนัก PD-L2-driven suppression แต่ไม่ตัด immune evasion อื่น",drugs:"PD-1 inhibitors อาจครอบคลุม signaling นี้ แต่ไม่ได้เลือกจาก PD-L2 expression เพียงอย่างเดียว",action:"ใช้เป็น immune-context marker ร่วมกับ PD-L1 IHC, MSI/TMB และชนิดมะเร็ง",level:"Emerging immune marker"},
     PDCD1LG2:{alias:"PDL2"},
     PTEN:{full:"PTEN",plain:"tumor suppressor ที่ยับยั้ง PI3K-AKT-mTOR signaling",high:"อาจสะท้อนการคงอยู่ของ tumor-suppressor signaling",low:"อาจสัมพันธ์กับ PI3K-AKT-mTOR activation และพฤติกรรมโรคที่ก้าวร้าวขึ้น",drugs:"PI3K/AKT/mTOR inhibitors อาจเกี่ยวข้อง แต่ต้องยืนยัน alteration",action:"พิจารณา IHC/NGS และชนิดมะเร็งก่อนใช้ตัดสินใจ",level:"Tumor-suppressor marker"},
     P53:{full:"p53 / TP53",plain:"tumor suppressor ที่ควบคุม DNA-damage response และ apoptosis",high:"expression สูงอาจเกิดจาก protein accumulation หรือ stress response จึงไม่เท่ากับ mutation",low:"expression ต่ำไม่ตัด TP53 mutation หรือ loss of function",drugs:"ยังไม่ควรเลือกยาจาก expression นี้โดยตรง",action:"ถ้าต้องการทราบ mutation ให้ใช้ NGS/PCR ที่รับรอง",level:"ไม่ใช่ mutation test"},
     TP53:{alias:"P53"}
   }
   const contextual=(full,plain,high,low,level="Biological context marker",action="ใช้เป็นข้อมูลชีววิทยาประกอบและยืนยันด้วยวิธีมาตรฐานเมื่อผลมีผลต่อการรักษา")=>({
     full,plain,high,low,drugs:"ไม่ควรเลือกหรือตัดยาจาก CTC gene-expression marker นี้เพียงค่าเดียว",action,level
   });
   Object.assign(profiles,{
     P180:contextual("p180 — report-specific cellular-stress marker","ชื่อ p180 ในรายงานนี้ใช้กับกลุ่ม preprotein/cellular stress แต่ไม่ระบุ canonical gene symbol เดียว จึงต้องย้อนดู method ของห้องปฏิบัติการก่อนเทียบกับฐานยีนภายนอก","ค่าที่สูงขึ้นอาจสะท้อน cellular-stress program ที่เด่นขึ้นตามนิยามของ assay","ค่าที่ต่ำลงลดน้ำหนักสัญญาณ cellular stress ตาม assay แต่ไม่บอก stress pathway ใด","Report-specific marker","ห้ามแปลง p180 เป็นยีนหรือโปรตีนมาตรฐานตัวใดโดยไม่ยืนยันจากห้องปฏิบัติการ"),
     BCRABL:contextual("BCR::ABL1 fusion","โปรตีนไคเนสจากการหลอมรวม BCR กับ ABL1 ซึ่งเป็น driver สำคัญใน CML และ ALL บางราย","expression สูงอาจสนับสนุนสัญญาณ BCR-ABL–related biology แต่ไม่ยืนยันว่ามี fusion","expression ต่ำไม่ตัด BCR::ABL1 fusion","Fusion-related marker","ถ้ามีผลต่อการรักษาต้องยืนยันด้วย RT-PCR, FISH หรือ NGS ที่ผ่านการรับรอง"),
     COX2:contextual("COX-2 / PTGS2","เอนไซม์สร้าง prostaglandins ที่เกี่ยวข้องกับการอักเสบ การสร้างหลอดเลือด และการอยู่รอดของเซลล์","อาจสะท้อน inflammatory/prostaglandin signaling ที่เพิ่มขึ้น","ลดน้ำหนัก COX-2–driven signaling แต่ไม่ตัดการอักเสบจากทางอื่น","Inflammation context marker"),
     "5LOX":contextual("5-lipoxygenase / ALOX5","เอนไซม์สร้าง leukotrienes จาก arachidonic acid และเกี่ยวข้องกับ inflammatory signaling","อาจสะท้อน leukotriene-pathway activity ที่เพิ่มขึ้น","ลดน้ำหนัก 5-LOX signaling แต่ไม่ตัด eicosanoid pathway อื่น","Inflammation context marker"),
     NFKB:contextual("NF-κB","กลุ่ม transcription factors ที่ควบคุมการอักเสบ การอยู่รอดของเซลล์ และ immune signaling","อาจสะท้อน pro-survival/inflammatory signaling ที่เพิ่มขึ้น","ลดน้ำหนัก NF-κB activity ในตัวอย่าง แต่ไม่ตัด activation ชั่วคราวหรือ downstream signaling","Inflammation and survival marker"),
     IKBABC:contextual("IκB family (IκBα/β/ε)","โปรตีนยับยั้งที่จับ NF-κB ไว้นอกนิวเคลียสและควบคุมการเปิด pathway","ค่าที่สูงอาจสะท้อน feedback inhibition หรือการกด NF-κB; ไม่ควรอ่านว่าแย่โดยอัตโนมัติ","ค่าที่ต่ำอาจลดการยับยั้ง NF-κB แต่ต้องดู phosphorylation/degradation ซึ่ง expression อย่างเดียวไม่บอก","NF-κB regulatory marker"),
     ALK:contextual("ALK receptor tyrosine kinase","receptor kinase ที่เป็น oncogenic driver ได้เมื่อมี fusion, mutation หรือ amplification","expression สูงอาจสงสัย ALK biology แต่ไม่ยืนยัน actionable alteration","expression ต่ำไม่ตัด ALK fusion","ต้องมี molecular confirmation","ใช้ IHC ที่เหมาะสมร่วมกับ FISH/NGS เพื่อยืนยัน ALK alteration ก่อนเลือกยา"),
     EML4ALK:contextual("EML4::ALK fusion-related marker","ชื่อ fusion ระหว่าง EML4 กับ ALK ที่เป็น driver ในมะเร็งปอดบางราย","expression สูงอาจสนับสนุนสัญญาณ fusion transcript แต่ assay นี้ไม่ใช่การยืนยัน fusion","expression ต่ำไม่ตัด fusion เพราะวิธีและตำแหน่ง breakpoint มีผล","Fusion-related marker","ต้องยืนยันด้วย RNA-based NGS, RT-PCR, FISH หรือ IHC ตามมาตรฐาน"),
     NPMALK:contextual("NPM1::ALK fusion-related marker","fusion ระหว่าง NPM1 กับ ALK ที่พบเด่นใน anaplastic large-cell lymphoma บางราย","expression สูงอาจสนับสนุน fusion-related biology แต่ไม่ยืนยัน fusion","expression ต่ำไม่ตัด fusion","Fusion-related marker","ต้องยืนยันด้วย IHC/FISH/RT-PCR/NGS และพยาธิวิทยา"),
     RET:contextual("RET receptor tyrosine kinase","receptor kinase ที่เป็น driver ได้จาก fusion หรือ mutation ในมะเร็งบางชนิด","expression สูงไม่เท่ากับ RET fusion/mutation แต่บอกว่า pathway อาจเด่นขึ้น","expression ต่ำไม่ตัด RET alteration","ต้องมี molecular confirmation","ใช้ DNA/RNA NGS หรือวิธีที่รับรองเพื่อยืนยัน RET fusion/mutation ก่อนเลือกยา"),
     DNAMETHYLTRANSFERASEI:contextual("DNA methyltransferase 1 / DNMT1","maintenance methyltransferase ที่คงรูปแบบ DNA methylation หลังการแบ่งเซลล์","อาจสะท้อนการคง epigenetic silencing ที่เพิ่มขึ้น","อาจสะท้อน maintenance methylation ที่ลดลง แต่ไม่บอกว่ายีนใดถูกเปิด","Epigenetic context marker"),
     "06METHYLDNATRAN":contextual("O6-methylguanine-DNA methyltransferase / MGMT (probable report label)","เอนไซม์ซ่อม O6-methylguanine DNA damage; ชื่อในรายงานย่อ/สะกดไม่มาตรฐานจึงควรยืนยันว่าอ้างถึง MGMT","ถ้าเป็น MGMT จริง expression สูงอาจสัมพันธ์กับการซ่อม alkylator damage มากขึ้น","ถ้าเป็น MGMT จริง expression ต่ำอาจสัมพันธ์กับความไวต่อ alkylating damage มากขึ้น แต่ไม่แทน promoter-methylation test","Probable DNA-repair marker","ยืนยันชื่อ marker กับห้องปฏิบัติการและใช้ MGMT promoter methylation ที่รับรองเมื่อเกี่ยวข้องกับการรักษา"),
     HISTONEDEACETYLASE:{alias:"HDAC"},
     GAMMAGC:contextual("γ-glutamylcysteine synthetase / glutamate-cysteine ligase (probable report label)","เอนไซม์ขั้นจำกัดอัตราในการสร้าง glutathione; ชื่อ Gamma GC ในรายงานไม่ใช่ symbol มาตรฐาน จึงต้องยืนยัน target ของ assay","อาจสะท้อน glutathione/antioxidant capacity และ detoxification ที่เพิ่มขึ้น","อาจสะท้อน glutathione-synthesis capacity ที่ลดลง","Probable oxidative-stress marker","ยืนยันชื่อเต็มจากห้องปฏิบัติการก่อนเชื่อมกับ GCLC/GCLM หรือกลไกดื้อยา"),
     E2F1:contextual("E2F1 transcription factor","ตัวควบคุมการเข้าสู่ S phase, DNA replication และ apoptosis ในบางบริบท","อาจสะท้อน cell-cycle drive ที่เพิ่มขึ้น แต่ E2F1 มีบทบาทกระตุ้น apoptosis ได้ด้วย","อาจสะท้อน proliferative drive ที่ลดลง","Cell-cycle context marker"),
     CDC6:contextual("CDC6","โปรตีน licensing ที่ช่วยเริ่มต้น DNA replication","อาจสะท้อน replication licensing และ proliferation ที่เพิ่มขึ้น","ลดน้ำหนัก DNA-replication drive ในตัวอย่าง","Cell-cycle context marker"),
     HTERT:contextual("hTERT / TERT","catalytic subunit ของ telomerase ที่ช่วยคง telomeres และความสามารถแบ่งตัวระยะยาว","อาจสะท้อน telomerase activity/immortalization program ที่เพิ่มขึ้น","ลดน้ำหนัก TERT expression แต่ไม่ตัด promoter mutation หรือ telomerase activity","Telomere-biology marker"),
     BCL2:contextual("BCL-2","โปรตีนต้าน apoptosis ที่ช่วยให้เซลล์อยู่รอด","อาจสะท้อน anti-apoptotic survival signaling ที่เพิ่มขึ้น","อาจลด anti-apoptotic protection แต่ต้องดู BAX และ family members อื่น","Apoptosis marker"),
     BAX:contextual("BAX","โปรตีน pro-apoptotic ที่ช่วยทำให้ mitochondrial membrane permeabilization","อาจสนับสนุนความพร้อมต่อ apoptosis แต่ผลขึ้นกับสมดุล BCL-2 family","อาจลด apoptotic priming","Apoptosis marker"),
     CD95FASR:contextual("CD95 / FAS receptor","death receptor ที่กระตุ้น extrinsic apoptosis เมื่อได้รับสัญญาณที่เหมาะสม","expression สูงอาจเพิ่มองค์ประกอบของ death-receptor pathway แต่ไม่ยืนยันว่า apoptosis ทำงาน","expression ต่ำอาจลด FAS-mediated apoptosis","Apoptosis marker"),
     P27:contextual("p27 / CDKN1B","cyclin-dependent kinase inhibitor ที่ช่วยหยุด cell cycle","expression สูงอาจสนับสนุน cell-cycle restraint แต่ตำแหน่งโปรตีนและการทำงานมีผล","expression ต่ำอาจลดการเบรก cell cycle","Tumor-suppressor context marker"),
     P16:contextual("p16 / CDKN2A","tumor suppressor ที่ยับยั้ง CDK4/6 และควบคุม G1–S checkpoint","expression สูงอาจเกิดจาก senescence หรือ feedback จาก RB loss จึงไม่เท่ากับ pathway ปกติ","expression ต่ำอาจเกิดจาก deletion/methylation/loss แต่ต้องยืนยัน","Tumor-suppressor context marker","ยืนยันด้วย IHC/NGS/methylation testing ตามชนิดมะเร็งเมื่อมีผลต่อการรักษา"),
     CDK46:contextual("CDK4/6","kinases ที่ขับ G1–S cell-cycle transition ผ่าน RB phosphorylation","expression สูงอาจสะท้อน cell-cycle signaling ที่เด่นขึ้น แต่ไม่ยืนยันความไวต่อ CDK4/6 inhibitor","expression ต่ำลดน้ำหนัก CDK4/6 abundance แต่ไม่บอก RB status","Cell-cycle predictive-context marker","ใช้ตามข้อบ่งใช้และยืนยัน ER/HER2/RB/pathway context ที่เหมาะสม"),
     UP:contextual("Uridine phosphorylase / UPP (report abbreviation)","เอนไซม์ pyrimidine salvage ที่เกี่ยวข้องกับ uridine metabolism; ตัวย่อ UP ควรยืนยันกับ legend ของรายงาน","อาจเปลี่ยน activation/catabolism ของ fluoropyrimidine-related compounds ตามบริบท","อาจลดบทบาท uridine-phosphorylase pathway","Drug-metabolism context marker","ยืนยันชื่อเต็มและไม่ใช้แทน DPYD/fluoropyrimidine safety testing"),
     NP:contextual("Nucleoside phosphorylase (report abbreviation)","เอนไซม์ใน nucleoside salvage; ตัวย่อ NP ไม่จำเพาะพอจะระบุ isoenzyme เดียวโดยไม่มี legend","อาจสะท้อน nucleoside turnover ที่เพิ่มขึ้น","อาจสะท้อน nucleoside salvage activity ที่ลดลง","Drug-metabolism context marker","ยืนยันชื่อเต็ม/isoenzyme จากห้องปฏิบัติการก่อนเชื่อมกับยา"),
     TP:contextual("Thymidine phosphorylase / TYMP (report abbreviation)","เอนไซม์ pyrimidine salvage ที่เกี่ยวข้องกับ thymidine และการเปลี่ยน prodrug บางชนิด","อาจสัมพันธ์กับการเปลี่ยน capecitabine/5'-DFUR เป็น 5-FU มากขึ้น แต่ไม่ทำนายผลทางคลินิกเดี่ยว","อาจลดการ activation ผ่าน TP pathway","Drug-metabolism context marker"),
     DHFR:contextual("Dihydrofolate reductase / DHFR","เอนไซม์สร้าง tetrahydrofolate สำหรับการสังเคราะห์ DNA และเป็นเป้าหมายของ antifolates","expression สูงอาจสัมพันธ์กับ resistance ต่อ antifolate บางชนิด","expression ต่ำอาจสนับสนุนความไวต่อ DHFR inhibition แต่ไม่พอสำหรับเลือกยา","Drug-metabolism/predictive marker"),
     SHMT:contextual("Serine hydroxymethyltransferase / SHMT","เอนไซม์ one-carbon metabolism ที่เชื่อม serine, glycine และ folate cycle","อาจสะท้อน one-carbon flux และ nucleotide synthesis ที่เพิ่มขึ้น","อาจสะท้อน one-carbon metabolism ที่ลดลง","Metabolic context marker"),
     GARFT:contextual("GAR transformylase / GART","เอนไซม์ใน de novo purine synthesis และเป็นเป้าหมายของ antifolate บางชนิด","อาจสะท้อน purine-synthesis demand ที่เพิ่มขึ้น","อาจสะท้อน de novo purine synthesis ที่ลดลง","Drug-metabolism/predictive marker"),
     RIBONUCLEOSIDEREDUCTASE:contextual("Ribonucleotide reductase (report spelling variant)","เอนไซม์ที่เปลี่ยน ribonucleotides เป็น deoxyribonucleotides สำหรับสร้าง DNA","อาจสะท้อน DNA-synthesis capacity และ resistance ต่อ inhibitors บางชนิด","อาจลด dNTP production และ proliferative capacity","DNA-synthesis marker","ยืนยัน subunit RRM1/RRM2 ที่ assay วัดก่อนเชื่อมกับยา"),
     CES12CARBOXYESTERASE:contextual("Carboxylesterase 1/2 / CES1–CES2","เอนไซม์ hydrolysis ที่ activate/inactivate prodrugs และ xenobiotics หลายชนิด","อาจเปลี่ยนการ activation หรือ clearance ของยา ขึ้นกับว่า CES1 หรือ CES2 และ substrate ใด","อาจลด metabolism ผ่าน CES pathway","Drug-metabolism marker","แผงรวม CES1&2 ไม่บอก isoenzyme และไม่แทน pharmacogenomic/PK assessment"),
     CYPB1:contextual("CYP1B1 (probable report label CypB1)","cytochrome P450 ที่ metabolize xenobiotics, hormones และ procarcinogens; ชื่อรายงานควรยืนยันว่าอ้างถึง CYP1B1","อาจสะท้อน xenobiotic/hormone metabolism และ resistance biology ที่เพิ่มขึ้น","ลดน้ำหนัก CYP1B1-mediated metabolism","Drug-metabolism context marker","ยืนยัน target กับห้องปฏิบัติการและไม่ใช้ expression นี้แทน pharmacogenomics"),
     CD33:contextual("CD33 / SIGLEC3","myeloid-cell surface antigen และ therapeutic target ใน AML บางบริบท","expression สูงอาจสนับสนุน myeloid phenotype/target presence แต่ CTC expression ไม่แทน flow cytometry ของโรคเลือด","expression ต่ำลดน้ำหนัก CD33 target abundance","Lineage/target marker","ยืนยันด้วย diagnostic flow cytometry/IHC และข้อบ่งใช้ก่อนพิจารณา CD33-directed therapy"),
     CD52:contextual("CD52","surface glycoprotein บน lymphocytes หลายชนิดและเป้าหมายของ alemtuzumab","expression สูงอาจบอก target presence แต่ไม่ทำนายประโยชน์หรือความปลอดภัยของยา","expression ต่ำลดน้ำหนัก CD52 target abundance","Lineage/target marker","ยืนยันด้วย immunophenotyping และชนิดโรคก่อนใช้ตัดสินใจรักษา"),
     CD20:contextual("CD20 / MS4A1","B-cell surface marker และเป้าหมายของ anti-CD20 antibodies","expression สูงอาจสนับสนุน B-cell phenotype/target presence","expression ต่ำอาจสัมพันธ์กับ target loss แต่ต้องยืนยัน","Lineage/target marker","ยืนยันด้วย flow cytometry/IHC และพยาธิวิทยาก่อนใช้ anti-CD20 therapy"),
     EPCAMEPCAMVE:contextual("EpCAM / EPCAM","epithelial cell-adhesion molecule ที่ใช้ช่วยระบุ epithelial CTC และอาจเป็น surface target ในบางบริบท","expression สูงอาจสะท้อน epithelial phenotype ของ CTC ที่เด่นขึ้น","expression ต่ำอาจเกิดจาก EMT หรือ clone ที่ไม่แสดง EpCAM และไม่ตัด CTC","CTC phenotype marker","ไม่ใช่ marker จำเพาะอวัยวะและไม่ใช้ยืนยัน primary site หรือเลือกยาเพียงตัวเดียว")
   });
   let p=profiles[key];
   if(p&&p.alias)p=profiles[p.alias];
   const hasSpecificProfile=Boolean(p)||Boolean(MIW.OncoKnowledge&&typeof MIW.OncoKnowledge.find==="function"&&MIW.OncoKnowledge.find("GENE",symbol));
   if(!p){
     const group=String(k.signalingPathway||k.subgroup||"Gene expression");
     const functionText=String(k.biologicalFunction||k.meaning||"เกี่ยวข้องกับการควบคุมการทำงานของเซลล์");
     p={
       full:k.fullName||k.mechanism||symbol,
       plain:functionText,
       high:k.high||`การแสดงออกของ ${symbol} สูงกว่า baseline ของวิธีตรวจ อาจสะท้อนว่าหน้าที่ในกลุ่ม ${group} เด่นขึ้น แต่ต้องดูบทบาทเฉพาะของยีนและชนิดมะเร็งก่อนสรุป`,
       low:k.low||`การแสดงออกของ ${symbol} ต่ำกว่า baseline ของวิธีตรวจ อาจสะท้อนว่าหน้าที่ในกลุ่ม ${group} ลดลง แต่ไม่ได้แปลว่าดีหรือไม่ดีโดยอัตโนมัติ`,
       drugs:"ผล gene expression นี้ยังไม่ใช่ biomarker ที่เพียงพอสำหรับเลือกหรือตัดยาโดยตรง",
       action:"อ่านร่วมกับชนิดมะเร็ง ผลตรวจทางพยาธิวิทยา ผล drug sensitivity และการตรวจยืนยันที่เหมาะกับยีนนี้",
       level:`${group} context marker`
     };
   }
   const result=value===null?"ยังแปลผลไม่ได้":isHigh?"Positive / เพิ่มขึ้น":isLow?"Negative / ลดลง":"Baseline";
   const meaning=value===null?"ยังไม่พบค่าที่เชื่อถือได้จากต้นฉบับ":isHigh?p.high:isLow?p.low:"ค่าอยู่ที่ baseline ของสเกลรายงาน ไม่ได้แปลว่าไม่มียีนหรือโปรตีน";
   const tone=value===null?"review":isHigh?"high":isLow?"low":"baseline";
   return {...p,plain:geneDescription(row,k),result,pct,meaning,tone,specific:hasSpecificProfile};
 }

 function explainGeneMarker(row){
   const k=knowledgeFor({...row,group:"GENE"}),g=clinicalGeneInterpretation({...row,group:"GENE"},k);
   if(!g.specific)return{
     specific:false,name:String(row?.name||"Unknown marker"),result:statusOf(row),
     what:String(row?.function||row?.reportLayer?.function||"").trim()||"ยังไม่มีคำอธิบายเฉพาะสำหรับ Marker นี้",
     purpose:"ยังไม่มีคำอธิบายเฉพาะ",current:"ยังไม่มีคำอธิบายเฉพาะ",high:"ยังไม่มีคำอธิบายเฉพาะ",
     low:"ยังไม่มีคำอธิบายเฉพาะ",related:"ยังไม่มีคำอธิบายเฉพาะ",caution:"ยังไม่มีคำอธิบายเฉพาะ"
   };
   const sourceRelated=String(row?.related||row?.reportLayer?.related||"").trim();
   return{
     specific:true,name:String(row?.name||g.full),result:statusOf(row),
     what:g.plain,
     purpose:`ใช้ดูทิศทางการแสดงออกของ ${row?.name||g.full} เพื่อประกอบภาพชีววิทยาของ CTC ในกลุ่ม ${k.category||k.subgroup||"Gene expression"} ไม่ใช่การตรวจ mutation`,
     current:`${g.result}${g.pct?` (${g.pct})`:""} · ${g.meaning}`,
     high:g.high,low:g.low,
     related:sourceRelated||[k.signalingPathway,k.subgroup,g.level,"ผล gene expression อื่น, functional sensitivity, pathology/IHC และ molecular testing"].filter(Boolean).join(" · "),
     caution:`${g.action} · Gene expression จาก CTC ไม่ใช่ mutation, amplification หรือ companion diagnostic และไม่ควรใช้เลือก targeted therapy เพียงตัวเดียว`
   }
 }

 function ctcInterpretation(row){
   const value=numericValue(row);
   if(isEnglishMode()){
     if(value===null)return{valueText:"No readable verified value",level:"Review required",meaning:"A verified Circulating Tumor Cell count cannot yet be interpreted from the available data."};
     if(value===0)return{valueText:`${value} ${row.unit||"cells/mL"}`,level:"Not detected in this sample",meaning:"No CTC was detected within the limits of this assay and sample. This does not exclude residual disease or metastatic disease."};
     return{valueText:`${value} ${row.unit||"cells/mL"}`,level:"CTC detected",meaning:"Circulating tumor cells were detected in blood. Higher or rising values may be associated with disease burden or progression in some settings, but high/low cutoffs are assay- and cancer-specific."}
   }
   if(value===null)return{valueText:"ไม่มีค่าที่อ่านได้",level:"ต้องตรวจสอบ",meaning:"ยังไม่สามารถแปลผลจำนวน Circulating Tumor Cells ได้จากข้อมูลที่ยืนยันแล้ว"};
   if(value===0)return{valueText:`${value} ${row.unit||"cells/mL"}`,level:"ไม่ตรวจพบในตัวอย่างนี้",meaning:"ไม่พบ CTC ภายใต้ขีดจำกัดและวิธีของการทดสอบครั้งนี้ แต่ไม่สามารถใช้ตัดโรคที่ยังเหลืออยู่หรือการแพร่กระจายได้"};
   return{valueText:`${value} ${row.unit||"cells/mL"}`,level:"ตรวจพบ CTC",meaning:"พบเซลล์มะเร็งที่ไหลเวียนในกระแสเลือด ค่าที่สูงขึ้นหรือเพิ่มขึ้นตามเวลาอาจสัมพันธ์กับภาระโรคหรือการดำเนินโรค แต่เกณฑ์สูง/ต่ำต้องใช้เกณฑ์เฉพาะของ assay และชนิดมะเร็ง"}
 }

 function englishKnowledgePanel(k,row){
   if(row.domain==="DRUG"||row.domain==="ADDITIONAL"){
     const drugClass=englishOr(k.drugClass,englishDomainCategory(row,k));
     const mechanism=englishOr(k.mechanismFormal||k.mechanism,"Drug-specific mechanism text is not yet available in the English knowledge layer; keep the in-vitro assay finding separate from clinical indication and efficacy.");
     const biomarkers=englishOr(k.biomarkers,"Clinical treatment decisions require validated biomarkers and standard indication-specific evidence.");
     const interp=englishOr(k.onconomicsInterpretation||k.meaning,"This is an in-vitro/ex-vivo assay finding and is not the patient’s probability of response.");
     return `<h3>${row.domain==="ADDITIONAL"?"Additional Drug Test":"Drug information"}: ${esc(row.name)}</h3>
       ${isAdditionalRow(row)?`<div class="knowledge-verification-note"><b>Source-report result:</b> ${esc(statusOf(row))} · assay ${esc(row.valueWithout??row.reportLayer?.valueWithoutSubstance??"—")} → ${esc(row.valueWith??row.reportLayer?.valueWithSubstance??"—")}. This section is read from the Additional tested drugs/substances table. The source does not print a response percentage here, so it is not ranked on the Drug Sensitivity percentage chart.</div>`:""}
       <div class="clinical-knowledge-grid">
         <div class="clinical-field"><span>Generic / report name</span><b>${esc(row.name)}</b></div>
         <div class="clinical-field"><span>Trade names</span><b>${esc(englishOr(k.tradeNames,"—"))}</b></div>
         <div class="clinical-field wide"><span>Drug class</span><p>${esc(drugClass)}</p></div>
         <div class="clinical-field wide"><span>Mechanism of action</span><p>${esc(mechanism)}</p></div>
         <div class="clinical-field wide"><span>Related biomarkers / molecular targets</span><p>${esc(biomarkers)}</p></div>
         <div class="clinical-field wide source-separated"><span>Interpretation in Onconomics</span><p>${esc(interp)}</p></div>
       </div>`;
   }
   if(row.domain==="GENE"){
     const dir=geneDirectionInterpretation(row,k),symbol=englishOr(k.geneSymbol,row.name),pathway=englishOr(k.signalingPathway||k.subgroup,"Gene-expression / pathway marker");
     return `<h3>Clinical Interpretation: ${esc(symbol)}</h3>
       <div class="source-report-fields"><h4>Source Report Interpretation</h4><div class="clinical-knowledge-grid">
         <div class="clinical-field wide"><span>Function — source field</span><b>${esc(sourceField(row,"function"))}</b></div>
         <div class="clinical-field wide"><span>Related — source field</span><b>${esc(sourceField(row,"related"))}</b></div>
         <div class="clinical-field"><span>Clinical Risk — source field</span><b>${esc(sourceField(row,"clinicalRisk"))}</b></div>
         <div class="clinical-field"><span>Outcome — source field</span><b>${esc(sourceField(row,"outcome"))}</b></div>
       </div><p class="muted">Clinical Risk and Outcome are separate source-report fields. Source values are preserved. Legacy records are reconstructed only when the original field is missing and the provenance is retained.</p></div>
       <div class="knowledge-verification-note">Gene expression describes the expression level of a gene or marker. It is not a mutation, amplification or validated companion-diagnostic result and should not replace certified IHC, ISH, PCR or NGS when making treatment decisions.</div>
       <div class="gene-clinical-summary neutral"><div><span>Result</span><b>${esc(dir.direction)}</b></div><div><span>Short interpretation</span><strong>${esc(dir.explanation)}</strong></div></div>
       <div class="clinical-knowledge-grid gene-clinical-grid">
         <div class="clinical-field wide"><span>What this result means</span><p>${esc(dir.explanation)}</p></div>
         <div class="clinical-field wide source-separated"><span>Clinical implication</span><p>${esc(dir.implication)}</p></div>
         <div class="clinical-field wide"><span>Biological function</span><p>${esc(englishOr(k.biologicalFunction||k.meaning,"Biological function should be interpreted from validated gene-specific references together with the source report."))}</p></div>
         <div class="clinical-field wide"><span>Treatment relevance</span><p>Confirm treatment-relevant findings with indication-appropriate validated biomarkers and standard molecular testing. Do not select targeted therapy from this expression value alone.</p></div>
         <div class="clinical-field"><span>Functional group</span><b>${esc(pathway)}</b></div>
         <div class="clinical-field"><span>Gene symbol</span><b>${esc(symbol)}</b></div>
       </div>`;
   }
   if(row.domain==="CTC"){
     const c=ctcInterpretation(row);return `<h3>Circulating Tumor Cell Count (CTC)</h3>
       <div class="knowledge-verification-note">CTCs are tumor cells detected in blood. Trend interpretation should preferably use the same assay and laboratory. A single value should not be used alone to confirm or exclude progression.</div>
       <div class="clinical-knowledge-grid"><div class="clinical-field"><span>Latest result</span><b>${esc(c.valueText)}</b></div><div class="clinical-field"><span>Classification</span><b>${esc(c.level)}</b></div><div class="clinical-field wide source-separated"><span>Interpretation</span><p>${esc(c.meaning)}</p></div><div class="clinical-field wide"><span>Use in follow-up</span><p>May support longitudinal assessment of disease burden and treatment response. Serial change is generally more informative than a single value.</p></div><div class="clinical-field wide"><span>Limitations</span><p>Results depend on assay technique, blood volume, cancer type and detection limits. Cutoffs are not directly transferable across assays, and CTC = 0 does not exclude minimal residual disease.</p></div></div>`;
   }
   if(row.domain==="NATURAL"){
     return `<h3>Natural substance: ${esc(row.name)}</h3><div class="knowledge-verification-note">Natural-product composition may vary by formulation. Verify the product label or Certificate of Analysis before applying product-specific information clinically.</div><div class="clinical-knowledge-grid">
       <div class="clinical-field"><span>Substance</span><b>${esc(row.name)}</b></div><div class="clinical-field"><span>Source</span><b>${esc(englishOr(k.source,"Source not specified in the English knowledge layer"))}</b></div><div class="clinical-field wide"><span>Active compounds</span><p>${esc(englishOr(k.activeCompounds,"Active compounds should be verified from the formulation or Certificate of Analysis."))}</p></div><div class="clinical-field wide"><span>Mechanism</span><p>${esc(englishOr(k.mechanismFormal||k.mechanism,"Mechanistic information is supportive and does not establish clinical anticancer efficacy."))}</p></div><div class="clinical-field wide"><span>Potential molecular targets</span><p>${esc(englishOr(k.molecularTargets,"No validated treatment-selection target is assigned from this item alone."))}</p></div><div class="clinical-field wide"><span>Drug interactions</span><p>${esc(englishOr(k.drugInteractions,"Review potential interactions with anticancer drugs, anticoagulants and other concomitant treatments."))}</p></div><div class="clinical-field wide"><span>Precautions</span><p>${esc(englishOr(k.precautions,"Use clinical judgment and review organ function, formulation, dose and interaction risk before use."))}</p></div></div>`;
   }
   return `<h3>Explanation: ${esc(row.name)}</h3><p>${esc(englishOr(k.meaning,"No English explanation is available for this source-report item yet."))}</p>`
 }
 function knowledgePanel(k,row){
   if(isEnglishMode())return englishKnowledgePanel(k,row);
   if(row.domain==="DRUG"||row.domain==="ADDITIONAL"){
     return `
       <h3>${row.domain==="ADDITIONAL"?"Additional Drug Test":"ข้อมูลยา"}: ${esc(row.name)}</h3>
       ${isAdditionalRow(row)?`<div class="knowledge-verification-note"><b>ผลจากรายงาน:</b> ${esc(statusOf(row))} · ค่า assay ${esc(row.valueWithout??row.reportLayer?.valueWithoutSubstance??"—")} → ${esc(row.valueWith??row.reportLayer?.valueWithSubstance??"—")} ข้อมูลส่วนนี้อ่านจากตาราง Additional tested drugs/substances และไม่มีเปอร์เซ็นต์ที่พิมพ์ในต้นฉบับ จึงไม่นำไปจัดอันดับบนกราฟ Drug Sensitivity</div>`:""}
       <div class="clinical-knowledge-grid">
         <div class="clinical-field"><span>ชื่อสามัญ</span><b>${esc(row.name)}</b></div>
         <div class="clinical-field"><span>ชื่อการค้า</span><b>${esc(k.tradeNames||"—")}</b></div>
         <div class="clinical-field wide"><span>กลุ่มยา</span><p>${esc(k.drugClass||`${k.category} — ${k.subgroup}`)}</p></div>
         <div class="clinical-field wide"><span>กลไกการออกฤทธิ์</span><p>${esc(k.mechanismFormal||k.mechanism||"—")}</p></div>
         <div class="clinical-field wide"><span>Biomarkers / Molecular targets ที่เกี่ยวข้อง</span><p>${esc(k.biomarkers||"—")}</p></div>
         <div class="clinical-field wide source-separated"><span>การแปลผลใน Onconomics</span><p>${esc(k.onconomicsInterpretation||k.meaning||"—")}</p></div>
       </div>`;
   }
   if(row.domain==="GENE"){
     const g=clinicalGeneInterpretation(row,k);
     return `
       <h3>Clinical Interpretation: ${esc(g.full)}</h3>
       <div class="source-report-fields">
         <h4>Source Report Interpretation</h4>
         <div class="clinical-knowledge-grid">
           <div class="clinical-field wide"><span>Function — หน้าที่ตามรายงาน</span><b>${esc(sourceField(row,"function"))}</b></div>
           <div class="clinical-field wide"><span>Related — สิ่งที่เกี่ยวข้องตามรายงาน</span><b>${esc(sourceField(row,"related"))}</b></div>
           <div class="clinical-field"><span>Clinical Risk — กรอบความเสี่ยง</span><b>${esc(sourceField(row,"clinicalRisk"))}</b></div>
           <div class="clinical-field"><span>Outcome — ผลของผู้ป่วย</span><b>${esc(sourceField(row,"outcome"))}</b></div>
         </div>
         <p class="muted">Clinical Risk และ Outcome เป็นคนละฟิลด์กัน ค่าที่อ่านได้จากตารางจะคงตามต้นฉบับ; เฉพาะข้อมูลเก่าที่ช่องเดิมหาย ระบบจึงสร้างกลับจาก RESULTS และโครง Function ของ RGCC พร้อมบันทึกแหล่งที่มารายฟิลด์</p>
       </div>
       <div class="knowledge-verification-note">Gene expression แสดงระดับการแสดงออกของยีนหรือ marker ไม่ใช่ผล mutation และไม่ควรใช้แทน IHC, ISH, PCR หรือ NGS ที่ได้รับการรับรองเมื่อใช้ตัดสินใจรักษา</div>
       <div class="gene-clinical-summary ${esc(g.tone)}">
         <div><span>ผลตรวจ</span><b>${esc(g.result)} (${esc(g.pct)})</b></div>
         <div><span>สรุปสั้น ๆ</span><strong>${esc(g.meaning)}</strong></div>
       </div>
       <div class="clinical-knowledge-grid gene-clinical-grid">
         <div class="clinical-field wide"><span>ยีนนี้ทำหน้าที่อะไร</span><p>${esc(g.plain)}</p></div>
         <div class="clinical-field wide source-separated"><span>ผลนี้มีความหมายอย่างไร</span><p>${esc(g.meaning)}</p></div>
         <div class="clinical-field wide"><span>ยาหรือการรักษาที่อาจเกี่ยวข้อง</span><p>${esc(g.drugs)}</p></div>
         <div class="clinical-field wide"><span>ควรทำอะไรต่อ</span><p>${esc(g.action)}</p></div>
         <div class="clinical-field"><span>ระดับการใช้งาน</span><b>${esc(g.level)}</b></div>
         <div class="clinical-field"><span>Functional group</span><b>${esc(k.signalingPathway||k.subgroup||"—")}</b></div>
         <details class="clinical-field wide gene-details"><summary>ดูข้อมูลเชิงเทคนิคเพิ่มเติม</summary>
           <p><b>Gene symbol:</b> ${esc(k.geneSymbol||row.name)}</p>
           <p><b>Biological function:</b> ${esc(k.biologicalFunction||k.meaning||"—")}</p>
           <p><b>Cancer association:</b> ${esc(k.cancerAssociation||"—")}</p>
           <p><b>Hallmarks:</b> ${esc(k.hallmarks||"—")}</p>
           <p><b>RGCC interpretation:</b> ${esc(k.rgccInterpretation||"—")}</p>
         </details>
       </div>`;
   }
   if(row.domain==="CTC"){
     const c=ctcInterpretation(row);
     return `
       <h3>Circulating Tumor Cell Count (CTC)</h3>
       <div class="knowledge-verification-note">CTC คือเซลล์มะเร็งที่ตรวจพบในกระแสเลือด ผลควรใช้ติดตามแนวโน้มด้วยวิธีเดิมและห้องปฏิบัติการเดิม ไม่ควรใช้เพียงค่าเดียวเพื่อยืนยันหรือปฏิเสธการลุกลาม</div>
       <div class="clinical-knowledge-grid">
         <div class="clinical-field"><span>ผลล่าสุด</span><b>${esc(c.valueText)}</b></div>
         <div class="clinical-field"><span>การจัดกลุ่ม</span><b>${esc(c.level)}</b></div>
         <div class="clinical-field wide source-separated"><span>การแปลผล</span><p>${esc(c.meaning)}</p></div>
         <div class="clinical-field wide"><span>ประโยชน์ในการติดตาม</span><p>ใช้ประกอบการประเมินภาระโรค การตอบสนองต่อการรักษา และแนวโน้มการดำเนินโรค โดยการเปลี่ยนแปลงต่อเนื่องมีความหมายมากกว่าค่าครั้งเดียว</p></div>
         <div class="clinical-field wide"><span>ข้อจำกัด</span><p>ค่าขึ้นกับเทคนิค ปริมาตรเลือด ชนิดมะเร็ง และขีดจำกัดการตรวจ ไม่สามารถเทียบเกณฑ์ข้าม assay โดยตรง และ CTC = 0 ไม่ได้ตัด minimal residual disease</p></div>
       </div>`;
   }
   if(row.domain==="NATURAL"){
     return `
       <h3>ข้อมูล Natural substance: ${esc(row.name)}</h3>
       ${/ต้องตรวจ|ไม่สามารถระบุ|proprietary|ชื่อผลิตภัณฑ์/i.test(`${k.activeCompounds||""} ${k.source||""}`)
         ?'<div class="knowledge-verification-note">รายการนี้เป็นชื่อผลิตภัณฑ์หรือสูตรที่องค์ประกอบอาจแตกต่างกัน ต้องตรวจฉลากหรือ Certificate of Analysis ก่อนใช้ข้อมูลเชิงคลินิก</div>'
         :''}
       <div class="clinical-knowledge-grid">
         <div class="clinical-field"><span>ชื่อสาร</span><b>${esc(row.name)}</b></div>
         <div class="clinical-field"><span>แหล่งที่มา</span><b>${esc(k.source||"—")}</b></div>
         <div class="clinical-field wide"><span>สารสำคัญ</span><p>${esc(k.activeCompounds||"—")}</p></div>
         <div class="clinical-field wide"><span>กลไกการออกฤทธิ์</span><p>${esc(k.mechanismFormal||k.mechanism||"—")}</p></div>
         <div class="clinical-field wide"><span>Potential molecular targets</span><p>${esc(k.molecularTargets||"—")}</p></div>
         <div class="clinical-field wide"><span>ปฏิกิริยาระหว่างยา</span><p>${esc(k.drugInteractions||"—")}</p></div>
         <div class="clinical-field wide"><span>ข้อควรระวัง</span><p>${esc(k.precautions||"—")}</p></div>
       </div>`;
   }
   return `<h3>คำอธิบาย: ${esc(row.name)}</h3><p>${esc(k.meaning||"—")}</p>`;
 }

 function renderSelected(){
   const latest=selectedLatest();
   if(!latest){
     document.getElementById("oncoSelectedType").textContent=domainLabel();
     document.getElementById("oncoSelectedName").textContent=domain==="ADDITIONAL"?"Additional Drug Test":L("กราฟอัตโนมัติของหมวดนี้","Automatic chart for this category");
     document.getElementById("oncoSelectedSubtitle").textContent=domain==="ADDITIONAL"
       ?L("แสดงผล EFFICACY และค่า assay ก่อน → หลังจากตารางต้นฉบับ","Shows EFFICACY and before → after assay values from the source table")
       :L("เปลี่ยน Mode หมวดหลัก กลุ่มย่อย หรือวันที่ แล้วกราฟจะปรับทันที","Change mode, main category, subgroup or date and the chart will update automatically");
     document.getElementById("oncoSelectedStatus").textContent="—";
     document.getElementById("oncoSelectedStatus").className="result-pill neutral";
     document.getElementById("oncoInfoCards").innerHTML="";
     document.getElementById("oncoInterpretation").innerHTML=`<h3>${L("คำอธิบาย","Explanation")}</h3><p class="muted">${L("เอาเมาส์ชี้หรือเลือกรายการเพื่อดูความหมาย ค่าสูง ต่ำ และค่าปกติเมื่อมี","Hover or select an item to view its meaning, source result and interpretation")}</p>`;
     renderChart(null);renderEvidence();return
   }
   const k=latest.knowledge,status=latest.displayStatus,
     response=latest.isCatalogPlaceholder
       ?{label:L("ไม่มีค่าตัวเลขที่ยืนยันได้ในรายงานฉบับล่าสุด","No verified numeric value in the latest report"),basis:L("รายการนี้อยู่ใน Master Catalog แต่ไม่พบค่าที่ Verify ได้ในรายงาน","This item is in the Master Catalog but no verified value was found in the report")}
       :responseFromSource(latest);
   document.getElementById("oncoSelectedType").textContent=isEnglishMode()?englishDomainCategory(latest,k):k.category;
   document.getElementById("oncoSelectedName").textContent=latest.name;
   document.getElementById("oncoSelectedSubtitle").textContent=isEnglishMode()?englishSubgroup(latest,k):k.subgroup;
   const pill=document.getElementById("oncoSelectedStatus");pill.textContent=isEnglishMode()?englishOr(status,status):status;pill.className=`result-pill ${statusClass(status)}`;
   const additionalCards=isAdditionalRow(latest)?[[L("ค่า assay ก่อน → หลัง","Assay before → after"),`${latest.valueWithout??latest.reportLayer?.valueWithoutSubstance??"—"} → ${latest.valueWith??latest.reportLayer?.valueWithSubstance??"—"}`],[L("ชนิดผล","Result type"),L("Qualitative EFFICACY · ไม่ใช่เปอร์เซ็นต์","Qualitative EFFICACY · not a percentage")]]:[];
   document.getElementById("oncoInfoCards").innerHTML=[
     [L("ค่าจากต้นฉบับ","Source value"),latest.isCatalogPlaceholder?L("ไม่มีข้อมูล","No data"):status],[L("การแปลผล","Interpretation"),response.label],[L("เกณฑ์ที่ใช้","Interpretive basis"),response.basis],[L("กลุ่มย่อย","Subgroup"),isEnglishMode()?englishSubgroup(latest,k):k.subgroup],["Mechanism",isEnglishMode()?englishOr(k.mechanism,"See detailed English interpretation below"):k.mechanism||"—"],
     ...additionalCards,[L("วันที่รายงาน","Report date"),dateOf(latest)],["Latest CTC",reports.at(-1)?.ctc?`${reports.at(-1).ctc} cells/mL`:"—"],[L("จำนวนครั้ง","Number of measurements"),enrichedRows().filter(r=>r.domain===domain&&r.name===selectedName).length]
   ].map(([l,v])=>`<div class="onco-info-card"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("");
   renderChart(latest);renderEvidence();document.getElementById("oncoInterpretation").innerHTML=knowledgePanel(k,latest)
 }
 function autoRankedRows(selectedDate){
   const visibleNames=new Set(currentRows().map(r=>r.name));
   const bestByName=new Map();
   enrichedRows()
     .filter(r=>r.domain===domain&&!r.isCatalogPlaceholder&&dateOf(r)===selectedDate)
     .filter(r=>visibleNames.has(r.name))
     .forEach(r=>{
       const value=numericValue(r);
       if(value===null)return;
       const old=bestByName.get(r.name);
       if(!old || Number(r.confidence||0)>Number(old.confidence||0)){
         bestByName.set(r.name,r)
       }
     });
   return [...bestByName.values()].sort((a,b)=>{
     const diff=numericValue(b)-numericValue(a);
     return diff||a.name.localeCompare(b.name)
   })
 }
 function automaticChartNames(selectedDate){
   return autoRankedRows(selectedDate).map(r=>r.name)
 }

 function renderChart(latest){
   if(chart){chart.destroy();chart=null}
   const mode=chartMode();
   const selectedDate=selectedReportDate();
   const isAutomatic=selectedNames.size===0;
   const names=domain==="ADDITIONAL"
     ?(selectedNames.size?[...selectedNames]:currentRows().filter(r=>!r.isCatalogPlaceholder).map(r=>r.name))
     :selectedNames.size
     ?[...selectedNames]
     :(mode==="COMPARE"
       ?automaticChartNames(selectedDate)
       :(selectedName?[selectedName]:automaticChartNames(selectedDate).slice(0,1)));
   const chartArea=document.getElementById("oncoChartArea");
   const notice=document.getElementById("oncoMissingValueNotice");
   if(!names.length){
     chartArea.innerHTML=`<div class="empty">${L("ยังไม่มีค่าตัวเลขจริงสำหรับสร้างกราฟอัตโนมัติ","No verified numeric values are available for an automatic chart")}</div>`;
     notice.hidden=true;renderCompareLegend();return
   }

   const all=enrichedRows().filter(r=>r.domain===domain&&names.includes(r.name)&&!r.isCatalogPlaceholder);
   const numericRows=all.filter(r=>numericValue(r)!==null);
   const qualitativeRows=all.filter(r=>isAdditionalRow(r)&&(mode==="TREND"||dateOf(r)===selectedDate));
   const missingNames=names.filter(name=>
     !numericRows.some(r=>r.name===name&&(mode==="TREND"||dateOf(r)===selectedDate))&&
     !qualitativeRows.some(r=>r.name===name)
   );

   if(mode==="COMPARE"&&!numericRows.length&&qualitativeRows.length){
     document.getElementById("oncoChartTitle").textContent=L(`ผล EFFICACY ตามรายงาน วันที่ ${selectedDate||"Unknown"}`,`EFFICACY results from source report · ${selectedDate||"Unknown"}`);
     document.getElementById("oncoChartCaption").textContent=L("Additional tested drugs เป็นผลเชิงคุณภาพจากคอลัมน์ EFFICACY; ค่าก่อนและหลังเป็นค่า assay ไม่ใช่เปอร์เซ็นต์","Additional tested drugs are qualitative EFFICACY results; before/after values are assay values, not percentages");
     chartArea.style.minHeight=domain==="ADDITIONAL"?"300px":"260px";
     chartArea.innerHTML=domain==="ADDITIONAL"
       ?`<p class="additional-category-note">${L("ตารางนี้แยกจากกราฟ Drug Sensitivity โดยตรง ผลหลักคือ EFFICACY; VALUE W/O และ VALUE WITH เป็นค่า assay ไม่ใช่เปอร์เซ็นต์ตอบสนองยา","This table is separate from the Drug Sensitivity percentage chart. The primary result is EFFICACY; VALUE W/O and VALUE WITH are assay values, not treatment-response percentages.")}</p>
         <div class="table-scroll"><table class="additional-drug-table">
           <thead><tr><th>${L("ยา / สาร","Drug / substance")}</th><th>VALUE W/O</th><th>VALUE WITH</th><th>EFFICACY</th><th>${L("หน้าต้นฉบับ","Source page")}</th></tr></thead>
           <tbody>${qualitativeRows.sort((a,b)=>{
             const order={Effective:0,"Not Effective":1};
             return (order[normalizedEfficacy(a)]??2)-(order[normalizedEfficacy(b)]??2)||a.name.localeCompare(b.name)
           }).map(r=>`<tr data-onco-name="${esc(r.name)}">
             <td><b>${esc(r.name)}</b></td>
             <td class="assay-value">${esc(r.valueWithout??r.reportLayer?.valueWithoutSubstance??"—")}</td>
             <td class="assay-value">${esc(r.valueWith??r.reportLayer?.valueWithSubstance??"—")}</td>
             <td><span class="result-pill ${statusClass(statusOf(r))}">${esc(statusOf(r))}</span></td>
             <td class="source-page">Page ${esc(r.page||"—")}</td>
           </tr>`).join("")}</tbody>
         </table></div>`
       :`<div class="onco-summary-grid">${qualitativeRows.map(r=>`
         <div class="onco-summary-box">
           <b>${esc(r.name)}</b>
           <div><span class="result-pill ${statusClass(statusOf(r))}">${esc(statusOf(r))}</span></div>
           <small>${L("ค่า assay","Assay value")} ${esc(r.valueWithout??r.reportLayer?.valueWithoutSubstance??"—")} → ${esc(r.valueWith??r.reportLayer?.valueWithSubstance??"—")} · ${L("ไม่ใช่ %","not a percentage")}</small>
         </div>`).join("")}</div>`;
     notice.hidden=true;renderCompareLegend();return
   }

   const noticeParts=[];
   if(qualitativeRows.length)noticeParts.push(`${L("ผลเชิงคุณภาพ (ไม่นำไปวาดบนแกน %):","Qualitative results (not plotted on the percentage axis):")} <b>${qualitativeRows.map(r=>`${esc(r.name)} = ${esc(statusOf(r))}`).join(", ")}</b>`);
   if(missingNames.length)noticeParts.push(`${L("ไม่มีค่าตัวเลขที่ Verify ได้สำหรับวันที่เลือก:","No verified numeric value for the selected date:")} <b>${missingNames.map(esc).join(", ")}</b><br>${L("ค่า 0% ที่อ่านได้จากต้นฉบับยังคงนำมาวาดกราฟตามจริง ส่วนรายการที่ไม่มีข้อมูลจะไม่ถูกแทนด้วย 0%","A verified source value of 0% is plotted as 0%. Missing data are never replaced by 0%.")}`);
   if(noticeParts.length){
     notice.hidden=false;
     notice.innerHTML=noticeParts.join("<br>");
   }else notice.hidden=true;

   if(mode==="COMPARE"){
     document.getElementById("oncoChartTitle").textContent=isAutomatic
       ?L(`เรียงผลจากสูงไปต่ำ วันที่ ${selectedDate||"Unknown"}`,`Source values sorted high to low · ${selectedDate||"Unknown"}`)
       :L(`รายการที่ผู้ใช้เลือก เรียงจากสูงไปต่ำ วันที่ ${selectedDate||"Unknown"}`,`Selected items sorted high to low · ${selectedDate||"Unknown"}`);
     document.getElementById("oncoChartCaption").textContent=
       domain==="GENE"
         ?L("เรียง expression % จากสูงไปต่ำ โดยไม่แยก pathway; ใช้ตัวกรองเมื่อต้องการแยกกลุ่ม","Expression percentages sorted high to low; use filters to separate pathways")
       :domain==="CTC"
         ?L("เรียงค่าจริงจากสูงไปต่ำ","Source values sorted high to low")
       :domain==="NATURAL"
         ?L("เรียงสารสกัดจากค่าตอบสนองสูงสุดลงมา โดยไม่แยกกลไกหรือ Class; ค่า 0% แสดงด้วยจุดที่เส้นศูนย์","Natural-substance source values sorted high to low without separating mechanism or class; a verified 0% is shown at the zero line")
       :L("เรียงยาจากค่าตอบสนองสูงสุดลงมา โดยไม่แยกกลไกยา; ผู้ใช้สามารถกรองหมวดหรือกลุ่มย่อยภายหลัง","Drug source values sorted high to low without separating mechanism; use category or subgroup filters as needed");

     const rows=names.map(name=>{
       const candidates=numericRows.filter(r=>r.name===name&&dateOf(r)===selectedDate);
       return candidates.sort((a,b)=>(Number(b.confidence)||0)-(Number(a.confidence)||0))[0]||null
     }).filter(Boolean).sort((a,b)=>{
       const diff=numericValue(b)-numericValue(a);
       return diff||a.name.localeCompare(b.name)
     });

     if(!rows.length){
       chartArea.innerHTML=`<div class="empty">${L("ยังไม่มีค่าตัวเลขจริงสำหรับวันที่นี้ กรุณาตรวจค่าจากกราฟต้นฉบับในหน้า Review","No verified numeric value is available for this date. Review the source graph in the Review page.")}</div>`;
       renderCompareLegend();return
     }

     chartArea.style.minHeight=`${Math.max(420,rows.length*38+100)}px`;
     chartArea.innerHTML='<canvas id="oncoWorkspaceChart"></canvas>';
     const valueLabelPlugin={
       id:"sourceValueLabels",
       afterDatasetsDraw(chart){
         const {ctx,scales}=chart;
         ctx.save();
         ctx.font="700 12px Segoe UI";
         ctx.fillStyle="#183638";
         chart.getDatasetMeta(0).data.forEach((bar,i)=>{
           const raw=rows[i],value=numericValue(raw);
           const isZero=value===0;
           if(isZero){
             // A true 0% bar has zero pixel width. Draw a marker at the zero axis
             // without changing the underlying clinical value.
             const zeroX=scales.x.getPixelForValue(0);
             ctx.beginPath();
             ctx.arc(zeroX+4,bar.y,4,0,Math.PI*2);
             ctx.fill();
             ctx.textAlign="left";ctx.textBaseline="middle";
             ctx.fillText(`0${raw.unit||"%"}`,zeroX+13,bar.y)
           }else{
             ctx.textAlign="left";ctx.textBaseline="middle";
             ctx.fillText(`${value}${raw.unit||"%"}`,bar.x+8,bar.y)
           }
         });
         ctx.restore()
       }
     };
     chart=new Chart(document.getElementById("oncoWorkspaceChart"),{
       type:"bar",
       plugins:[valueLabelPlugin],
       data:{
         labels:rows.map(r=>r.name),
         datasets:[{
           label:selectedDate||"Value",
           data:rows.map(numericValue),
           borderWidth:1,
           barPercentage:.68,
           categoryPercentage:.8
         }]
       },
       options:{
         indexAxis:"y",responsive:true,maintainAspectRatio:false,
         layout:{padding:{right:65}},
         scales:{
           x:{beginAtZero:true,suggestedMax:domain==="CTC"?undefined:100,title:{display:true,text:domain==="CTC"?"cells/mL":L("% จากต้นฉบับ","% from source report")}},
           y:{grid:{display:false}}
         },
         plugins:{
           legend:{display:false},
           tooltip:{callbacks:{afterBody(items){
             const r=rows[items[0].dataIndex],resp=responseFromSource(r);
             return [
               `Value: ${numericValue(r)}${r.unit||"%"}`,
               `Interpretation: ${resp.label}`,
               `Basis: ${resp.basis}`,
               `Page: ${r.page||"—"}`,
               `Evidence: ${r.sourceLine||"—"}`
             ]
           }}}
         }
       }
     })
   }else{
     chartArea.style.minHeight="420px";
     document.getElementById("oncoChartTitle").textContent=L("แนวโน้มค่าตัวเลขจริงหลายรายงาน","Trend of verified numeric values across reports");
     document.getElementById("oncoChartCaption").textContent=L("จุดที่ไม่มีค่าตัวเลขจริงจะเว้นว่าง ไม่ใช้คะแนนสมมติ","Missing numeric values remain blank; no synthetic score is inserted");
     const dates=[...new Set(numericRows.map(dateOf))].sort();
     const datasets=names.map(name=>{
       const map=new Map(numericRows.filter(r=>r.name===name).map(r=>[dateOf(r),numericValue(r)]));
       return {label:name,data:dates.map(d=>map.has(d)?map.get(d):null),tension:.15,pointRadius:5,borderWidth:2,spanGaps:false}
     });
     if(!dates.length||!datasets.some(d=>d.data.some(v=>v!==null))){
       chartArea.innerHTML=`<div class="empty">${L("ยังไม่มีค่าตัวเลขจริงสำหรับทำแนวโน้ม","No verified numeric values are available for a trend chart")}</div>`;
       renderCompareLegend();return
     }
     chartArea.innerHTML='<canvas id="oncoWorkspaceChart"></canvas>';
     chart=new Chart(document.getElementById("oncoWorkspaceChart"),{
       type:"line",
       data:{labels:dates,datasets},
       options:{
         responsive:true,maintainAspectRatio:false,
         scales:{y:{beginAtZero:true,title:{display:true,text:domain==="CTC"?"cells/mL":L("ค่าจากต้นฉบับ","Source value")}}},
         plugins:{tooltip:{callbacks:{afterBody(items){
           const item=items[0],name=item.dataset.label,date=dates[item.dataIndex];
           const r=numericRows.find(x=>x.name===name&&dateOf(x)===date);
           return r?[`Page: ${r.page||"—"}`,`Evidence: ${r.sourceLine||"—"}`]:[]
         }}}}
       }
     })
   }
   renderCompareLegend()
 }
 function renderClassCards(){
   const rows=currentRows(),grouped=new Map();
   rows.forEach(r=>{const raw=r.knowledge.subgroup||"Unclassified";if(!grouped.has(raw))grouped.set(raw,[]);grouped.get(raw).push(r)});
   document.getElementById("oncoClassSectionTitle").textContent=
     domain==="GENE"?L("กลุ่มยีน / โปรตีน / Pathway ตามหน้าที่","Gene / protein / pathway groups by function"):
     domain==="NATURAL"?L("Natural substances แบ่งตาม RGCC Class และกลไก","Natural substances by RGCC class and mechanism"):
     domain==="ADDITIONAL"?L("Additional Drug Test แยกตาม Class ในตารางต้นฉบับ","Additional Drug Test by source-table class"):
     domain==="CTC"?"CTC series":L("ยาเคมีบำบัด Targeted therapy และ Immunotherapy แยกตามกลไก","Chemotherapy, targeted therapy and immunotherapy by mechanism");
   document.getElementById("oncoClassCards").innerHTML=[...grouped.entries()].map(([group,list])=>{
     const displayGroup=isEnglishMode()?englishSubgroup(list[0],list[0]?.knowledge||{}):group;
     return `<div class="onco-class-card ${domain==="NATURAL"?(group.startsWith("Class I -")?"natural-class-I":group.startsWith("Class II -")?"natural-class-II":group.startsWith("Class III -")?"natural-class-III":"natural-class-other"):""}" ${domain==="NATURAL"?`data-natural-class="${esc(group)}"`:""}>
       <div class="onco-class-card-head"><span>${esc(displayGroup)}</span><span>${list.length}</span></div>
       <div class="onco-class-list">${list.map(r=>`<div class="onco-class-row" data-onco-name="${esc(r.name)}" data-hover-onco="${esc(r.name)}"><span>${esc(r.name)}</span><span class="result-pill ${r.isCatalogPlaceholder?"missing":r.nameMatchStatus==="UNMATCHED"?"unmatched":isAdditionalRow(r)?statusClass(r.displayStatus):numericValue(r)===0?"zero":"neutral"}">${esc(isEnglishMode()?englishOr(r.displayStatus,r.displayStatus):r.displayStatus)}</span></div>`).join("")}</div></div>`
   }).join("")||`<div class="empty">${L("ยังไม่มีข้อมูล","No data available")}</div>`
 }
 function select(name){selectedName=name;renderList();renderClassCards();renderSelected()}
 function setDomain(next){
   domain=next;selectedName="";selectedNames.clear();
   document.querySelectorAll(".onco-domain-tab").forEach(t=>t.classList.toggle("active",t.dataset.oncoDomain===domain));
   renderDomainStatus();buildFilters();
   if(domain==="ADDITIONAL")selectedName=currentRows().find(r=>!r.isCatalogPlaceholder)?.name||"";
   renderList();renderClassCards();renderSelected()
 }
 function showHover(event,name){
   const row=enrichedRows().find(r=>r.domain===domain&&r.name===name)||enrichedRows().find(r=>r.name===name);if(!row)return;
   const k=row.knowledge,box=document.getElementById("oncoHoverCard");
   if(isEnglishMode()){
     if(row.domain==="DRUG"||row.domain==="ADDITIONAL")box.innerHTML=`<h4>${esc(row.name)}</h4><div><b>${esc(englishOr(k.drugClass,englishDomainCategory(row,k)))}</b></div><div>${esc(englishOr(k.mechanismFormal||k.mechanism,"See the detailed English interpretation for clinical context."))}</div>${row.domain==="ADDITIONAL"?`<hr><div><b>EFFICACY:</b> ${esc(statusOf(row))}</div><div><b>Assay:</b> ${esc(row.valueWithout??row.reportLayer?.valueWithoutSubstance??"—")} → ${esc(row.valueWith??row.reportLayer?.valueWithSubstance??"—")} · not a percentage</div>`:`<hr><div><b>Biomarkers:</b> ${esc(englishOr(k.biomarkers,"See validated indication-specific biomarkers"))}</div>`}`;
     else if(row.domain==="GENE"){const d=geneDirectionInterpretation(row,k);box.innerHTML=`<div class="gene-popup-head"><h4>${esc(englishOr(k.geneSymbol,row.name))}</h4><span class="gene-popup-result">${esc(d.direction)}</span></div><div class="gene-popup-label">Biological context</div><div class="gene-popup-summary">${esc(englishOr(k.biologicalFunction||k.meaning,"Gene-expression marker reported by the assay."))}</div><div class="gene-popup-label">How to read this result</div><div>${esc(d.explanation)}</div><div class="gene-popup-label">Clinical implication</div><div>${esc(d.implication)}</div><div class="gene-popup-label">What to do next</div><div>Correlate with cancer type, pathology and validated IHC/ISH/PCR/NGS as clinically appropriate.</div><div class="gene-popup-caution">The percentage is expression relative to the assay baseline. It is not cancer probability, a mutation result or a treatment-response probability.</div><div class="gene-popup-foot"><b>Gene expression</b><span>${esc(englishSubgroup(row,k))}</span></div>`}
     else if(row.domain==="NATURAL")box.innerHTML=`<h4>${esc(row.name)}</h4><div><b>${esc(englishOr(k.activeCompounds,"Natural substance"))}</b></div><div>${esc(englishOr(k.mechanismFormal||k.mechanism,"Mechanistic information is supportive and does not establish clinical anticancer efficacy."))}</div><hr><div><b>Precautions:</b> ${esc(englishOr(k.precautions,"Review formulation, interactions and organ function before clinical use."))}</div>`;
     else box.innerHTML=`<h4>${esc(row.name)}</h4><div>${esc(englishOr(k.meaning,"Source-report item"))}</div>`;
   }else{
     box.innerHTML=row.domain==="DRUG"||row.domain==="ADDITIONAL"?`<h4>${esc(row.name)}</h4><div><b>${esc(k.drugClass||k.category)}</b></div><div>${esc(k.mechanismFormal||k.mechanism||"")}</div>${row.domain==="ADDITIONAL"?`<hr><div><b>EFFICACY:</b> ${esc(statusOf(row))}</div><div><b>Assay:</b> ${esc(row.valueWithout??row.reportLayer?.valueWithoutSubstance??"—")} → ${esc(row.valueWith??row.reportLayer?.valueWithSubstance??"—")} · ไม่ใช่ %</div>`:`<hr><div><b>Biomarkers:</b> ${esc(k.biomarkers||"—")}</div>`}`:row.domain==="GENE"?(()=>{const g=clinicalGeneInterpretation(row,k);return `<div class="gene-popup-head"><h4>${esc(g.full)}</h4><span class="gene-popup-result ${esc(g.tone)}">${esc(g.result)} (${esc(g.pct)})</span></div><div class="gene-popup-label">ชนิดและหน้าที่ทางชีววิทยา</div><div class="gene-popup-summary">${esc(g.plain)}</div><div class="gene-popup-label">การอ่านค่าในรายงานนี้</div><div>${esc(g.meaning)}</div><div class="gene-popup-label">ยาหรือการรักษาที่เกี่ยวข้อง</div><div>${esc(g.drugs)}</div><div class="gene-popup-label">ควรทำอะไรต่อ</div><div>${esc(g.action)}</div><div class="gene-popup-caution">ค่า % คือระดับ expression เทียบ baseline ของวิธีตรวจ ไม่ใช่โอกาสเป็นมะเร็ง ไม่ใช่ผล mutation และไม่ใช่โอกาสที่ยาจะตอบสนอง</div><div class="gene-popup-foot"><b>${esc(g.level)}</b><span>${esc(k.signalingPathway||k.subgroup||"—")}</span></div>`})():row.domain==="NATURAL"?`<h4>${esc(row.name)}</h4><div><b>${esc(k.activeCompounds||"Natural substance")}</b></div><div>${esc(k.mechanismFormal||k.mechanism||"")}</div><hr><div><b>ข้อควรระวัง:</b> ${esc(k.precautions||"—")}</div>`:`<h4>${esc(row.name)}</h4><div>${esc(k.meaning||"")}</div>`;
   }
   box.style.display="block";box.style.left=Math.min(event.clientX+12,innerWidth-450)+"px";box.style.top=Math.min(event.clientY+12,innerHeight-330)+"px"
 }
 function showReportTopicHover(event,topicKey){
   const topic=reportTopicGroups().find(item=>item.key===topicKey);
   const box=document.getElementById("oncoHoverCard");
   if(!topic||!box)return;
   box.innerHTML=reportTopicHoverHtml(topic);
   box.style.display="block";
   box.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-540))+"px";
   box.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-300))+"px"
 }
 function hideHover(){document.getElementById("oncoHoverCard").style.display="none"}
 function bind(){
   if(typeof window.addEventListener==="function"&&!window.__miwOnconomicsLanguageRerenderV10274){
     window.__miwOnconomicsLanguageRerenderV10274=true;
     window.addEventListener("miw:language-change",()=>{try{if(currentPatient)render()}catch(error){console.warn("MIW v10.274 Onconomics language rerender",error)}})
   }
   const biologyGrid=document.getElementById("biologySystemGrid");
   const biologyDetail=document.getElementById("biologySelectedDetail");
   if(biologyGrid)biologyGrid.addEventListener("click",e=>{
     const risk=e.target.closest("[data-risk-process]");
     if(risk){renderRiskInterpretationDetail(risk.dataset.riskProcess);return}
     const card=e.target.closest("[data-report-topic]");
     if(card)renderReportTopicDetail(card.dataset.reportTopic)
   });
   if(biologyGrid){
     biologyGrid.addEventListener("mouseover",e=>{
       const card=e.target.closest("[data-hover-report-topic]");
       if(card&&!card.contains(e.relatedTarget))showReportTopicHover(e,card.dataset.hoverReportTopic)
     });
     biologyGrid.addEventListener("mousemove",e=>{
       const box=document.getElementById("oncoHoverCard");
       if(box.style.display==="block"){
         box.style.left=Math.max(8,Math.min(e.clientX+12,innerWidth-540))+"px";
         box.style.top=Math.max(8,Math.min(e.clientY+12,innerHeight-300))+"px"
       }
     });
     biologyGrid.addEventListener("mouseout",e=>{
       const card=e.target.closest("[data-hover-report-topic]");
       if(card&&!card.contains(e.relatedTarget))hideHover()
     });
     biologyGrid.addEventListener("focusin",e=>{
       const card=e.target.closest("[data-hover-report-topic]");
       if(card){const rect=card.getBoundingClientRect();showReportTopicHover({clientX:rect.left,clientY:rect.bottom},card.dataset.hoverReportTopic)}
     });
     biologyGrid.addEventListener("focusout",e=>{if(e.target.closest("[data-hover-report-topic]"))hideHover()})
   }
   const geneViewTabs=document.getElementById("geneReportViewTabs");
   if(geneViewTabs)geneViewTabs.addEventListener("click",e=>{
     const tab=e.target.closest("[data-gene-report-view]");if(!tab)return;
     geneReportView=tab.dataset.geneReportView;
     geneViewTabs.querySelectorAll("[data-gene-report-view]").forEach(x=>x.classList.toggle("active",x===tab));
     renderReportStructure()
   });
   if(biologyDetail)biologyDetail.addEventListener("click",e=>{
     const gene=e.target.closest("[data-report-gene]");
     if(!gene)return;
     setDomain("GENE");
     select(gene.dataset.reportGene);
     document.getElementById("oncoSelectedHeader")?.scrollIntoView({behavior:"smooth",block:"start"})
   });
   if(biologyDetail)biologyDetail.addEventListener("keydown",e=>{
     if(e.key!=="Enter"&&e.key!==" ")return;
     const gene=e.target.closest("[data-report-gene]");
     if(!gene)return;
     e.preventDefault();
     gene.click()
   });
   if(biologyDetail){
     biologyDetail.addEventListener("mouseover",e=>{const gene=e.target.closest("[data-hover-onco]");if(gene)showHover(e,gene.dataset.hoverOnco)});
     biologyDetail.addEventListener("mousemove",e=>{const box=document.getElementById("oncoHoverCard");if(box.style.display==="block"){box.style.left=Math.min(e.clientX+12,innerWidth-450)+"px";box.style.top=Math.min(e.clientY+12,innerHeight-330)+"px"}});
     biologyDetail.addEventListener("mouseout",e=>{if(e.target.closest("[data-hover-onco]"))hideHover()});
     biologyDetail.addEventListener("focusin",e=>{const gene=e.target.closest("[data-hover-onco]");if(gene){const r=gene.getBoundingClientRect();showHover({clientX:r.left,clientY:r.bottom},gene.dataset.hoverOnco)}});
     biologyDetail.addEventListener("focusout",e=>{if(e.target.closest("[data-hover-onco]"))hideHover()})
   }
   document.querySelectorAll(".onco-domain-tab").forEach(t=>t.onclick=()=>setDomain(t.dataset.oncoDomain));
   document.getElementById("oncoCategorySelect").onchange=()=>{selectedName="";selectedNames.clear();buildFilters();renderList();renderClassCards();renderSelected()};
   document.getElementById("oncoSubgroupSelect").onchange=()=>{selectedName="";selectedNames.clear();renderList();renderClassCards();renderSelected()};
   document.getElementById("oncoSearch").oninput=()=>{renderList();renderClassCards();renderSelected()};
   document.getElementById("oncoShowAllCatalog").onchange=()=>{renderList();renderClassCards();renderSelected()};
   document.getElementById("oncoChartMode").onchange=()=>{buildReportDateOptions();renderSelected()};
   document.getElementById("oncoReportDateSelect").onchange=()=>renderSelected();document.getElementById("clearCompareButton").onclick=()=>{selectedNames.clear();renderList();renderCompareLegend();renderSelected()};document.getElementById("oncoCompareLegend").onclick=e=>{const n=e.target.dataset.removeCompare;if(n){selectedNames.delete(n);renderList();renderCompareLegend();renderSelected()}};
   document.getElementById("oncoChartArea").addEventListener("click",e=>{
     const item=e.target.closest("[data-onco-name]");
     if(item)select(item.dataset.oncoName)
   });
   ["oncoItemList","oncoClassCards"].forEach(id=>{
     const el=document.getElementById(id);
     el.addEventListener("click",e=>{const c=e.target.closest("[data-compare-name]");if(c){e.stopPropagation();toggleCompare(c.dataset.compareName,c.checked);return}const item=e.target.closest("[data-onco-name]");if(item)select(item.dataset.oncoName)});
     el.addEventListener("mouseover",e=>{const item=e.target.closest("[data-hover-onco]");if(item)showHover(e,item.dataset.hoverOnco)});
     el.addEventListener("mousemove",e=>{const box=document.getElementById("oncoHoverCard");if(box.style.display==="block"){box.style.left=Math.min(e.clientX+12,innerWidth-450)+"px";box.style.top=Math.min(e.clientY+12,innerHeight-330)+"px"}});
     el.addEventListener("mouseout",e=>{if(e.target.closest("[data-hover-onco]"))hideHover()})
   })
 }
 async function open(patientId=""){
   if(patientId)MIW.Patients.select(patientId);
   await load();MIW.Router.show("oncoTracker")
 }
 async function openLatestPatient(){
   const rs=await MIW.Database.all("oncoReports");
   if(!rs.length)throw new Error(L("ยังไม่มี Onconomics report ที่ Verify แล้ว","No verified Onconomics report is available yet"));
   rs.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
   await open(rs[0].patientId)
 }
 return{load,open,openLatestPatient,bind,select,setDomain,renderList,render,explainGeneMarker,
   _test:{linkedPatientIdSet,reportMatchesLinkedPatient,reconstructLegacyOnconomics,isAdditionalRow,canonicalGroup,additionalClassOf,knowledgeFor,normalizedEfficacy,numericValue,statusOf,responseFromSource,migrateLegacyAdditionalEfficacy,reportTopicPopupModel,reportTopicHoverHtml}};
})();
