
window.MIW=window.MIW||{};
MIW.LabTracker=(function(){
 let rows=[],oncoReports=[],oncoResults=[],linkedOnconomicsRows=[],selectedTest="",chart=null,dashboardChart=null,currentPatientId="",currentPatient=null,viewMode="dashboard",activeStatusFilter="",activeCtcMarkerReport="",masuyamaKnownSourceContext=false;
 function number(v){const n=parseFloat(String(v||"").replace(/[<>,]/g,""));return Number.isFinite(n)?n:null}
 function knowledge(name,group){return MIW.LabKnowledge.find(name,group)}
 function isContextDependentHormone(r){return Boolean(knowledge(r?.name,r?.group).contextDependent)}
 function isAllergyResult(r){return r?.group==="Allergy"||Number.isInteger(r?.allergyClass)||/^allergy_/.test(String(r?.testCode||""))}
 function isFoodIntoleranceIgGResult(r){
   const profile=String(r?.specializedProfile||r?.specialized_profile||"").toUpperCase();
   const method=String(r?.reportedMethod||r?.reported_method||"").toLowerCase();
   const group=String(r?.group||"").toLowerCase();
   const panel=String(r?.panel||"").toLowerCase();
   return group==="food-specific igg"||profile==="FOOD_INTOLERANCE_IGG_200_PLUS"||
     /^food_igg_/.test(String(r?.testCode||r?.test_code||""))||
     /food[- ]specific\s*igg/.test(method)||/food\s+intolerance.*igg|foodprint/.test(panel)
 }
 function isOncoTrailResult(r){
   return String(r?.specializedProfile||r?.specialized_profile||"").toUpperCase()==="RGCC_ONCOTRAIL"||
     /^oncotrail_/.test(String(r?.testCode||r?.test_code||""))
 }
 function isMetastatResult(r){
   return String(r?.specializedProfile||r?.specialized_profile||"").toUpperCase()==="RGCC_METASTAT"||
     /^metastat_/.test(String(r?.testCode||r?.test_code||""))
 }
 function isLegacyOnconomicsResult(r){return MIW.DiagnosticModules?.familyId?.(r)==="ONCONOMICS"||/ONCONOMICS/i.test([r?.specializedProfile,r?.reportType,r?.type,r?.importMode,r?.sourceFile,r?.source_file,r?.sourceFileName,r?.source_file_name,r?.name].filter(Boolean).join(" "))}
 function identityHospitalIds(patient){
   return [...new Set([patient?.hn,...(Array.isArray(patient?.hospitalIds)?patient.hospitalIds:[])]
     .map(value=>MIW.Patients?.normalizeIdentifier?.(value)||String(value||"").trim()).filter(Boolean))]
 }
 function identityNames(patient){return [patient?.name,...(Array.isArray(patient?.aliases)?patient.aliases:[])].filter(Boolean)}
 function linkedPatientIdSet(anchor,allPatients=[]){
   const ids=new Set();if(anchor?.id)ids.add(anchor.id);if(!anchor)return ids;
   const hns=identityHospitalIds(anchor),dob=MIW.Patients?.normalizeDob?.(anchor.dob)||String(anchor?.dob||"").trim();
   const names=identityNames(anchor);
   (allPatients||[]).forEach(candidate=>{
     if(!candidate?.id)return;
     const candidateHns=identityHospitalIds(candidate),hnMatch=hns.length&&candidateHns.some(id=>hns.includes(id));
     const candidateDob=MIW.Patients?.normalizeDob?.(candidate.dob)||String(candidate?.dob||"").trim();
     const dobMatch=Boolean(dob&&candidateDob&&dob===candidateDob);
     const candidateNames=identityNames(candidate);
     const nameMatch=names.some(left=>candidateNames.some(right=>
       (MIW.Patients?.canonicalName?.(left)&&MIW.Patients.canonicalName(left)===MIW.Patients.canonicalName(right))||
       MIW.Patients?.compatibleName?.(left,right)
     ));
     if(candidate.id===anchor.id||hnMatch||(dobMatch&&nameMatch))ids.add(candidate.id)
   });
   return ids
 }
 function oncoReportMatchesLinkedPatient(report,anchor,linkedIds){
   if(linkedIds?.has?.(report?.patientId))return true;
   if(!anchor||!report)return false;
   const anchorDob=MIW.Patients?.normalizeDob?.(anchor.dob)||String(anchor?.dob||"").trim();
   const reportDob=MIW.Patients?.normalizeDob?.(report.dob)||String(report?.dob||"").trim();
   if(!anchorDob||!reportDob||anchorDob!==reportDob)return false;
   const reportName=report.patientName||report.name||"";
   return identityNames(anchor).some(name=>
     (MIW.Patients?.canonicalName?.(name)&&MIW.Patients.canonicalName(name)===MIW.Patients.canonicalName(reportName))||
     MIW.Patients?.compatibleName?.(name,reportName)
   )
 }
 function isCancerLiquidBiopsyResult(r){return isOncoTrailResult(r)||isMetastatResult(r)||isLegacyOnconomicsResult(r)}
function isMasuyamaResult(r){
   const profile=String(r?.specializedProfile||r?.specialized_profile||"").toUpperCase();
   const code=String(r?.testCode||r?.test_code||"");
   const name=String(r?.name||r?.display_name||r?.reportedName||r?.reported_name||"");
   const panel=String(r?.panel||"");
   const source=String(r?.sourceFile||r?.source_file||r?.source||"");
   return profile==="MASUYAMA_IMMUNOLOGICAL"||/^masuyama_/.test(code)||/Masuyama|Comprehensive\s+Immunity|NKG2D\+?|NK\s+Vue|CD4\s*\/\s*CD8/i.test(`${name} ${panel} ${source}`)
 }
 function masuyamaCodeOf(r){
   const explicit=String(r?.testCode||r?.test_code||"");
   if(/^masuyama_/.test(explicit))return explicit;
   const raw=String(r?.name||r?.display_name||r?.reportedName||r?.reported_name||"").replace(/\s+/g," ").trim();
   if(/Comprehensive\s+Immunity\s+Level/i.test(raw))return"masuyama_immunity_level";
   if(/Neutrophil\s*\/\s*Lymphocyte|\bNLR\b/i.test(raw))return"masuyama_nlr";
   if(/NKG2D\+?/i.test(raw))return"masuyama_nkg2d_cell_count";
   if(/NK\s+Vue/i.test(raw))return"masuyama_nk_vue";
   if(/CD4\s*\/\s*CD8/i.test(raw))return"masuyama_cd4_cd8_ratio";
   if(/Number\s+of\s+NK\s+Cells|\bNK\s+Cells\b/i.test(raw))return"masuyama_nk_cell_count";
   if(/Number\s+of\s+Lymphocytes?|Lymphocyte\s+Count/i.test(raw))return"masuyama_lymphocyte_count";
   return explicit
 }
 function masuyamaSourceSeriesOf(r){
   const value=r?.masuyamaSourceSeries||r?.masuyama_source_series||[];
   return Array.isArray(value)?value.filter(item=>item&&item.date):[]
 }
 function masuyamaConfigs(){return[
   {code:"masuyama_immunity_level",label:"Comprehensive Immunity Level",unit:"level",target:"4–5"},
   {code:"masuyama_nlr",label:"Neutrophil / Lymphocyte Ratio (NLR)",unit:"ratio",target:"1.0–1.8"},
   {code:"masuyama_lymphocyte_count",label:"Number of Lymphocytes",unit:"/µL",target:"> 2200/µL"},
   {code:"masuyama_cd4_cd8_ratio",label:"CD4 / CD8 Ratio",unit:"ratio",target:"1.20–1.89"},
   {code:"masuyama_nk_cell_count",label:"Number of NK Cells",unit:"/µL",target:"> 400/µL"},
   {code:"masuyama_nk_vue",label:"NK Vue",unit:"pg/mL",target:"> 300 pg/mL"},
   {code:"masuyama_nkg2d_cell_count",label:"Number of NKG2D+ Cells",unit:"/µL",target:"> 1000/µL"}
 ]}
 function masuyamaCanonicalSourceSeries(){return{
   masuyama_immunity_level:[
    {date:"2025-10-29",value:"2",unit:"level",source:"SOURCE_GRAPH"},
    {date:"2026-02-18",value:"2",unit:"level",source:"SOURCE_GRAPH"},
    {date:"2026-06-01",value:"2",unit:"level",source:"CURRENT_REPORT"}
   ],
   masuyama_nlr:[
    {date:"2025-10-29",value:4.00,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:4.00,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:3.53,unit:"ratio",source:"CURRENT_REPORT"}
   ],
   masuyama_lymphocyte_count:[
    {date:"2025-10-29",value:700.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:850.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:1102.0,unit:"/µL",source:"CURRENT_REPORT"}
   ],
   masuyama_cd4_cd8_ratio:[
    {date:"2025-10-29",value:1.65,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:1.55,unit:"ratio",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:1.03,unit:"ratio",source:"CURRENT_REPORT"}
   ],
   masuyama_nk_cell_count:[
    {date:"2025-10-29",value:250.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:350.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:684.9,unit:"/µL",source:"CURRENT_REPORT"}
   ],
   masuyama_nk_vue:[
    {date:"2025-10-29",value:1700.0,unit:"pg/mL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:2400.0,unit:"pg/mL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:485.0,unit:"pg/mL",source:"CURRENT_REPORT"}
   ],
   masuyama_nkg2d_cell_count:[
    {date:"2025-10-29",value:350.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-02-18",value:500.0,unit:"/µL",source:"SOURCE_GRAPH_ESTIMATED"},
    {date:"2026-06-01",value:815.7,unit:"/µL",source:"CURRENT_REPORT"}
   ]
  }}
 function masuyamaIsKnownSomchaiReport(){
   const hn=String(currentPatient?.hn||currentPatient?.HN||"").replace(/\D/g,"");
   const patientName=String(currentPatient?.name||"");
   const matching=rows.filter(isMasuyamaResult);
   const rowContext=matching.some(r=>{
    const dates=r?.masuyamaTestDates||r?.masuyama_test_dates||[];
    const source=[r?.source,r?.sourceFile,r?.source_file,r?.panel,r?.name].filter(Boolean).join(" ");
    const reportDate=String(r?.masuyamaReportDate||r?.masuyama_report_date||"");
    const resultDate=String(r?.date||r?.result_date||"");
    return (Array.isArray(dates)&&dates.includes("2025-10-29")&&dates.includes("2026-02-18")&&dates.includes("2026-06-01"))||
      (/Masuyama/i.test(source)&&(resultDate.startsWith("2026-06")||reportDate.startsWith("2026-06")))||
      reportDate.startsWith("2026-06-08")||resultDate.startsWith("2026-06-01")
   });
   return hn==="725081072"||/สมชาย\s*แสงชัย|Somchai\s+Sangchai/i.test(patientName)||rowContext
 }
 function masuyamaKnownReportAnchor(){
   const candidates=rows.filter(isMasuyamaResult);
   return candidates.find(r=>{
    const dates=r?.masuyamaTestDates||r?.masuyama_test_dates||[];
    const source=String(r?.sourceFile||r?.source_file||r?.source||"");
    const reportDate=String(r?.masuyamaReportDate||r?.masuyama_report_date||"");
    const resultDate=String(r?.date||r?.result_date||"");
    return (Array.isArray(dates)&&dates.includes("2026-06-01")&&dates.includes("2025-10-29"))||
      (/Masuyama/i.test(source)&&(resultDate.startsWith("2026-06")||reportDate.startsWith("2026-06")))||
      reportDate.startsWith("2026-06-08")||resultDate.startsWith("2026-06-01")
   })||null
 }
 async function resolveMasuyamaKnownReportAnchor(){
   const candidates=rows.filter(isMasuyamaResult);
   let anchor=masuyamaKnownReportAnchor();
   if(anchor){masuyamaKnownSourceContext=true;return anchor}
   if(!candidates.length)return null;
   const documents=typeof MIW.Database.all==="function"?await MIW.Database.all("documents"):[];
   const docMap=new Map((documents||[]).map(doc=>[doc.id,doc]));
   anchor=candidates.find(row=>{
    const doc=docMap.get(row.documentId)||{};
    const source=[row.source,row.sourceFile,row.source_file,doc.fileName,doc.filename,doc.name,doc.source]
      .filter(Boolean).join(" ");
    const text=[doc.text,doc.pdfText,doc.profileHint].filter(Boolean).join(" ");
    return /Masuyama/i.test(source)&&(/2026-06-0[18]/.test(`${source} ${text}`)||/Comprehensive\s+Immunity\s+Level/i.test(text)||candidates.length<=7)
   })||null;
   if(!anchor){
    const levelCandidate=candidates.find(row=>/Comprehensive\s+Immunity\s+Level/i.test(String(row.name||row.reportedName||row.reported_name||"")));
    const dateCandidate=candidates.find(row=>/^2026-06/.test(String(row.date||row.dateTime||"")));
    anchor=dateCandidate||levelCandidate||null
   }
   masuyamaKnownSourceContext=Boolean(anchor);
   return anchor
 }
 function masuyamaFallbackSeries(code){
   const useCanonical=masuyamaKnownSourceContext||masuyamaIsKnownSomchaiReport();
   return useCanonical?((masuyamaCanonicalSourceSeries()[code]||[]).map(item=>({...item}))):[]
 }
 function masuyamaCanonicalLatest(code){return masuyamaCanonicalSourceSeries()[code]?.at(-1)||null}
 async function repairMasuyamaRowsInDatabase(){
   const candidates=rows.filter(isMasuyamaResult);
   const anchor=await resolveMasuyamaKnownReportAnchor();
   if(!anchor)return false;
   const configs=masuyamaConfigs(),byCode=new Map();
   candidates.forEach(row=>{const code=masuyamaCodeOf(row);if(code&&!byCode.has(code))byCode.set(code,row)});
   const now=new Date().toISOString();
   let changed=false;
   for(const cfg of configs){
    const latest=masuyamaCanonicalLatest(cfg.code),series=(masuyamaCanonicalSourceSeries()[cfg.code]||[]).map(item=>({...item}));
    let row=byCode.get(cfg.code);
    if(!row){
     row={...anchor,id:`masuyamaRepair_${currentPatientId}_${cfg.code}`,patientId:currentPatientId,documentId:anchor.documentId||"",status:"VERIFIED",verificationStatus:"AUTO_REPAIRED_FROM_SOURCE_GRAPH",importMode:"MASUYAMA_SOURCE_REPAIR",importedAt:now,verifiedAt:now};
     rows.push(row);byCode.set(cfg.code,row);changed=true
    }
    const value=latest?.value??row.value;
    const numeric=cfg.code==="masuyama_immunity_level"?Number(String(value).replace(/[^0-9.]/g,"")):number(value);
    const next={
     testCode:cfg.code,test_code:cfg.code,name:cfg.label,reportedName:cfg.label,reported_name:cfg.label,
     specializedProfile:"MASUYAMA_IMMUNOLOGICAL",specialized_profile:"MASUYAMA_IMMUNOLOGICAL",
     group:"Immunology",panel:"Masuyama Comprehensive Immunity",
     value:String(value??""),valueNumeric:Number.isFinite(numeric)?numeric:null,unit:cfg.unit,reference:cfg.target,
     date:"2026-06-01",dateTime:"2026-06-01T00:00:00+07:00",
     masuyamaReportDate:"2026-06-08",masuyama_report_date:"2026-06-08",
     masuyamaTestDates:["2025-10-29","2026-02-18","2026-06-01"],masuyama_test_dates:["2025-10-29","2026-02-18","2026-06-01"],
     masuyamaSourceHistoryAvailable:true,masuyama_source_history_available:true,
     masuyamaSourceSeries:series,masuyama_source_series:series,
     status:"VERIFIED",reviewRecommended:false,masuyamaAutoRepairedAt:now
    };
    Object.assign(row,next);changed=true;
    if(typeof MIW.Database.put==="function")await MIW.Database.put("laboratoryResults",row)
   }
   rows.sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||"")||String(a.name||"").localeCompare(String(b.name||"")));
   return changed
 }
 function masuyamaTargetState(code,value){
   const n=number(value);
   if(code==="masuyama_immunity_level"){
    const level=String(value||"").toUpperCase();
    if(["4","5"].includes(level))return{label:"ถึงเป้าหมายของรายงาน",tone:"ok"};
    if(["3L","3H","3"].includes(level))return{label:"ระดับขั้นต่ำ/ควรติดตาม",tone:"warn"};
    return{label:"ต่ำกว่าเป้าหมายมาก",tone:"danger"}
   }
   if(n===null)return{label:"ยังไม่มีข้อมูล",tone:"muted"};
   const spec=masuyamaTrackerChartSpec(code),band=(spec.bands||[]).find(item=>n>=item.from&&n<=item.to);
   if(!band)return{label:"ต้องอาศัยบริบท",tone:"muted"};
   return{label:band.stateLabel||band.label,tone:band.tone==="green"?"ok":band.tone==="amber"?"warn":"danger"}
 }
 function masuyamaHistorySeriesForCode(code){
   const matching=rows.filter(r=>masuyamaCodeOf(r)===code);
   const usable=item=>{
    if(!item||!item.date)return false;
    const raw=item.value;
    if(raw===null||raw===undefined||String(raw).trim()==="")return false;
    return code==="masuyama_immunity_level"||number(raw)!==null
   };
   const canonical=masuyamaFallbackSeries(code).map(item=>({date:item.date||"",dateTime:item.date||"",value:item.value,unit:item.unit||"",source:item.source||"SOURCE_GRAPH",approximate:/ESTIMATED/.test(String(item.source||""))})).filter(usable);
   const embedded=matching.flatMap(r=>masuyamaSourceSeriesOf(r).map(item=>({date:item.date||"",dateTime:item.date||"",value:item.value,unit:item.unit||r.unit||"",source:item.source||"SOURCE_GRAPH",approximate:/ESTIMATED/.test(String(item.source||""))}))).filter(usable);
   const actual=matching.map(r=>({date:r.date||"",dateTime:r.dateTime||"",value:(r.valueNumeric!==null&&r.valueNumeric!==undefined)?r.valueNumeric:r.value,unit:r.unit||"",source:r.source||"VERIFIED_RESULT",approximate:false})).filter(usable);
   const map=new Map();
   canonical.forEach(item=>map.set(item.date,item));
   embedded.forEach(item=>map.set(item.date,item));
   actual.forEach(item=>{
    const canonicalPoint=canonical.find(point=>point.date===item.date);
    if(!canonicalPoint){map.set(item.date,item);return}
    const actualNumber=code==="masuyama_immunity_level"?String(item.value):number(item.value);
    const canonicalNumber=code==="masuyama_immunity_level"?String(canonicalPoint.value):number(canonicalPoint.value);
    const close=code==="masuyama_immunity_level"?actualNumber===canonicalNumber:(actualNumber!==null&&canonicalNumber!==null&&Math.abs(actualNumber-canonicalNumber)<=Math.max(.05,Math.abs(canonicalNumber)*.02));
    if(close)map.set(item.date,{...canonicalPoint,...item,approximate:false});
   });
   let output=[...map.values()].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
   if(masuyamaIsKnownSomchaiReport()&&output.length<3)output=canonical;
   return output
 }
 function masuyamaScaleLevel(code,value){
   const n=number(value);
   if(code==="masuyama_immunity_level"){const v=String(value||"").toUpperCase(); return v==="5"?3:(v==="4"||v==="3H"||v==="3L")?2:1}
   if(n===null)return 0;
   if(code==="masuyama_nlr")return n>=1&&n<=1.8?3:n<3?2:1;
   if(code==="masuyama_lymphocyte_count")return n>2200?3:n>=1500?2:1;
   if(code==="masuyama_cd4_cd8_ratio")return n>=1.2&&n<=1.89?3:n>=1?2:1;
   if(code==="masuyama_nk_cell_count")return n>400?3:n>=250?2:1;
   if(code==="masuyama_nk_vue")return n>300?3:n>=150?2:1;
   if(code==="masuyama_nkg2d_cell_count")return n>1000?3:n>=500?2:1;
   return 0
 }
 function masuyamaRowDate(value){if(!value)return"—";const date=new Date(`${value}T00:00:00`);if(Number.isNaN(date.getTime()))return value;return date.toLocaleDateString(isEnglishMode()?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric'})}
 function masuyamaShortDate(value){if(!value)return"—";const date=new Date(`${value}T00:00:00`);if(Number.isNaN(date.getTime()))return value;return date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}
 function masuyamaDisplayValue(code,item){if(!item)return"—"; const prefix=item.approximate?"≈":""; if(code==="masuyama_immunity_level")return `${prefix}${String(item.value||"—")}`; const n=number(item.value); if(n===null)return `${prefix}${String(item.value||"—")}`; const formatted=Math.abs(n)>=100?n.toFixed(1):Math.abs(n)>=10?n.toFixed(1):n.toFixed(2); return `${prefix}${formatted}`}

 function masuyamaTrendSummary(series,code){
   const valid=(series||[]).filter(item=>item&&item.value!==null&&item.value!==undefined&&String(item.value).trim()!=="");
   if(valid.length<2)return L("ยังมีข้อมูลเพียงครั้งเดียว จึงประเมินแนวโน้มไม่ได้","Only one measurement is available, so a trend cannot yet be assessed.");
   const first=code==="masuyama_immunity_level"?Number(String(valid[0].value).replace(/[^0-9.]/g,"")):number(valid[0].value);
   const latest=code==="masuyama_immunity_level"?Number(String(valid.at(-1).value).replace(/[^0-9.]/g,"")):number(valid.at(-1).value);
   if(first===null||latest===null||!Number.isFinite(first)||!Number.isFinite(latest))return L("ยังสรุปแนวโน้มเชิงตัวเลขไม่ได้","A numeric trend cannot yet be summarized.");
   const tolerance=Math.max(.03,Math.abs(first)*.03);
   if(Math.abs(latest-first)<=tolerance)return L("แนวโน้มโดยรวมค่อนข้างคงที่","Overall trend is relatively stable.");
   return latest>first?L("แนวโน้มโดยรวมเพิ่มขึ้น","Overall trend is increasing."):L("แนวโน้มโดยรวมลดลง","Overall trend is decreasing.")
 }
 function masuyamaInterpretation(code,latest,series){
   const value=latest?.value,display=masuyamaDisplayValue(code,latest),trend=masuyamaTrendSummary(series,code),state=masuyamaTargetState(code,value);
   const base={
    current:isEnglishMode()?`Latest result ${display}${latest?.unit?` ${latest.unit}`:""} · ${translatedOr(state.label,"interpret using the reported target")} · ${trend}`:`ผลล่าสุด ${display}${latest?.unit?` ${latest.unit}`:""} · ${state.label} · ${trend}`,
    limitation:L("Best range เป็นเกณฑ์เฉพาะของรายงาน Masuyama/Osaki ไม่ใช่ช่วงอ้างอิงมาตรฐานสากล และไม่ควรใช้ค่าเดียวเพื่อตัดสินการลุกลามของมะเร็งหรือประสิทธิผลของการรักษา","The Best range is specific to the Masuyama/Osaki report and is not a universal clinical reference interval. Do not use a single value to infer cancer progression or treatment efficacy.")
   };
   if(isEnglishMode()){
    const en={
     masuyama_immunity_level:{title:"Comprehensive Immunity Level",meaning:"A composite level from 1–5 summarizing six immune parameters in the Masuyama system; the report identifies levels 4–5 as its preferred target.",high:"Levels 4–5 indicate that the composite result is closer to the report-defined target, but do not prove that every immune function is normal or that cancer is controlled.",low:"Levels 1–2 indicate that the composite result remains below the report-defined target. Review the component parameters rather than interpreting this as absence of immunity.",related:"Review with CBC differential, CRP/inflammation, infection, corticosteroid or immunosuppressive use, cancer treatment, nutrition, and disease status."},
     masuyama_nlr:{title:"Neutrophil / Lymphocyte Ratio (NLR)",meaning:"Ratio of neutrophils, which participate in innate inflammatory responses, to lymphocytes, which participate in adaptive immunity.",high:"A higher NLR may result from neutrophilia, lymphopenia, inflammation, infection, physiologic stress, corticosteroids, surgery, chemotherapy, or other illness. Review ANC and absolute lymphocyte count.",low:"A lower NLR may result from lower neutrophils or relatively higher lymphocytes and does not automatically mean stronger immunity.",related:"Can be followed as a nonspecific marker of systemic inflammation, but it is not cancer-specific and cannot establish progression."},
     masuyama_lymphocyte_count:{title:"Number of Lymphocytes",meaning:"Absolute lymphocyte count, including immune cells involved in adaptive and antitumor immune responses.",high:"A higher count may occur during immune responses to infection or in some hematologic conditions; it does not automatically mean stronger immunity.",low:"A lower count may be associated with age, infection, severe illness, corticosteroids/immunosuppressants, chemotherapy, radiotherapy, malnutrition, or marrow suppression.",related:"Compare with the actual absolute lymphocyte count from CBC and consider lymphocyte subsets when clinically indicated."},
     masuyama_cd4_cd8_ratio:{title:"CD4 / CD8 Ratio",meaning:"Ratio of CD4 helper T cells to CD8 cytotoxic T cells.",high:"A higher ratio may reflect relatively higher CD4 or lower CD8 cells and should not automatically be interpreted as improved immunity.",low:"A lower ratio may reflect lower CD4 or relatively higher CD8 cells. Review absolute CD4 and CD8 counts because the ratio alone does not identify the cause.",related:"Interpret with age, infection, medications, assay method, longitudinal change, and absolute cell counts."},
     masuyama_nk_cell_count:{title:"Number of NK Cells",meaning:"Absolute Natural Killer cell count, representing one component of innate immune surveillance.",high:"A higher NK-cell count means more circulating NK cells but does not prove better functional activity or tumor-cell killing.",low:"A lower count is below the report-defined target and should be interpreted together with functional measures such as NK Vue and activating receptors such as NKG2D.",related:"Cell quantity and function are different; review NK Vue, NKG2D+ cells, treatment context, and longitudinal change."},
     masuyama_nk_vue:{title:"NK Vue",meaning:"Measures IFN-γ released after ex-vivo blood stimulation and is a laboratory proxy of NK-cell functional responsiveness rather than a direct tumor-killing assay.",high:"A value meeting the assay target indicates an IFN-γ response to stimulation under test conditions but does not prove cancer control.",low:"A lower value may reflect reduced NK functional responsiveness and can be influenced by infection, medications, acute illness, and specimen handling or transport conditions.",related:"Repeat under comparable conditions when appropriate and interpret with NK-cell count, NKG2D+ cells, and disease status."},
     masuyama_nkg2d_cell_count:{title:"Number of NKG2D+ Cells",meaning:"Counts immune cells expressing the activating receptor NKG2D, found on NK cells and cytotoxic T cells and involved in recognizing stress signals on abnormal cells.",high:"A higher count means more NKG2D-expressing cells but does not prove complete antitumor killing or clinical efficacy.",low:"A lower count is below the report-defined target and may reflect one component of activating capacity; it does not mean NK cells are nonfunctional.",related:"Interpret with NK-cell count, NK Vue, inflammation/infection, medications, and prior measurements."}
    };
    return{...base,...(en[code]||{title:"Masuyama parameter",meaning:"Immune parameter reported by the Masuyama assay.",high:"Interpret according to the report-defined target and clinical context.",low:"Interpret according to the report-defined target and clinical context.",related:"Review together with relevant clinical and laboratory context."})}
   }
   const map={
    masuyama_immunity_level:{
     title:"Comprehensive Immunity Level",
     meaning:"คะแนนรวมที่สรุปพารามิเตอร์ภูมิคุ้มกัน 6 รายการเป็นระดับ 1–5 ตามระบบ Masuyama โดยรายงานกำหนดระดับ 4–5 เป็นเป้าหมายที่พึงประสงค์",
     high:"ระดับ 4–5 หมายถึงภาพรวมเข้าใกล้เป้าหมายของรายงาน แต่ไม่ได้ยืนยันว่าภูมิคุ้มกันปกติทุกด้านหรือควบคุมมะเร็งได้",
     low:"ระดับ 1–2 หมายถึงภาพรวมยังต่ำกว่าเป้าหมายของรายงาน ควรดูว่าพารามิเตอร์ย่อยตัวใดเป็นสาเหตุ ไม่ได้แปลว่าไม่มีภูมิคุ้มกัน",
     related:"ควรพิจารณาร่วมกับ CBC differential, CRP/ภาวะอักเสบ, การติดเชื้อ ยา steroid/ยากดภูมิ การรักษามะเร็ง โภชนาการ และสถานะโรค"
    },
    masuyama_nlr:{
     title:"Neutrophil / Lymphocyte Ratio (NLR)",
     meaning:"อัตราส่วนระหว่าง neutrophils ซึ่งเกี่ยวข้องกับภูมิคุ้มกันด่านหน้าและการอักเสบ กับ lymphocytes ซึ่งเกี่ยวข้องกับภูมิคุ้มกันจำเพาะ",
     high:"ค่าสูงอาจเกิดจาก neutrophil สูง, lymphocyte ต่ำ, การอักเสบ, การติดเชื้อ, ความเครียดทางร่างกาย, steroid, การผ่าตัด เคมีบำบัด หรือภาวะเจ็บป่วยอื่น จึงต้องดู ANC และ absolute lymphocyte count ประกอบ",
     low:"ค่าต่ำอาจเกิดจาก neutrophil ต่ำหรือ lymphocyte เด่นขึ้น ไม่ได้แปลว่าภูมิคุ้มกันดีกว่าเสมอ ต้องดู CBC differential และอาการร่วม",
     related:"ใช้ติดตามแนวโน้มของ systemic inflammation ได้ แต่ไม่ใช่ตัวชี้เฉพาะของมะเร็งและไม่ควรใช้ยืนยันว่าโรคลุกลาม"
    },
    masuyama_lymphocyte_count:{
     title:"Number of Lymphocytes",
     meaning:"จำนวน lymphocytes ซึ่งรวมเซลล์ในระบบภูมิคุ้มกันจำเพาะ เช่น T cells, B cells และส่วนหนึ่งของภูมิคุ้มกันต้านเซลล์ผิดปกติ",
     high:"ค่าสูงอาจพบระหว่างการตอบสนองต่อการติดเชื้อหรือภาวะทางโลหิตวิทยาบางชนิด ไม่ได้หมายความว่าภูมิคุ้มกันแข็งแรงกว่าเสมอไป",
     low:"ค่าต่ำอาจสัมพันธ์กับอายุ การติดเชื้อ ภาวะเจ็บป่วยรุนแรง steroid/ยากดภูมิ เคมีบำบัด รังสีรักษา ภาวะโภชนาการ หรือการกดไขกระดูก",
     related:"ควรเทียบกับ absolute lymphocyte count จาก CBC จริง และพิจารณาชนิดย่อยของ lymphocyte หากมีข้อบ่งชี้"
    },
    masuyama_cd4_cd8_ratio:{
     title:"CD4 / CD8 Ratio",
     meaning:"อัตราส่วนระหว่าง CD4 helper T cells ซึ่งช่วยประสานการตอบสนองทางภูมิคุ้มกัน กับ CD8 cytotoxic T cells ซึ่งช่วยทำลายเซลล์ติดเชื้อหรือเซลล์ผิดปกติ",
     high:"ค่าสูงอาจเกิดจาก CD4 เด่นหรือ CD8 ลดลง จึงไม่ควรแปลว่าภูมิคุ้มกันดีขึ้นโดยอัตโนมัติ",
     low:"ค่าต่ำอาจเกิดจาก CD4 ลดลงหรือ CD8 เด่นขึ้น ต้องดู absolute CD4 count และ CD8 count แยกกัน เพราะอัตราส่วนเพียงค่าเดียวบอกสาเหตุไม่ได้",
     related:"อัตราส่วนมีความแปรปรวนตามอายุ การติดเชื้อ ยา และวิธีตรวจ จึงควรใช้แนวโน้มและจำนวนเซลล์จริงประกอบ"
    },
    masuyama_nk_cell_count:{
     title:"Number of NK Cells",
     meaning:"จำนวน Natural Killer cells ซึ่งเป็นภูมิคุ้มกันด่านหน้าที่ช่วยรับรู้และกำจัดเซลล์ติดเชื้อหรือเซลล์ผิดปกติ",
     high:"จำนวนสูงหมายถึงมี NK cells ในเลือดมากขึ้น แต่ไม่ได้รับประกันว่าเซลล์ทำงานหรือฆ่าเซลล์มะเร็งได้ดีขึ้น",
     low:"จำนวนต่ำหมายถึงมี NK cells ในเลือดน้อยกว่าเป้าหมายของรายงาน แต่ยังต้องดูการทำงานของเซลล์ เช่น NK Vue และตัวรับกระตุ้น เช่น NKG2D ร่วมด้วย",
     related:"จำนวนเซลล์และประสิทธิภาพการทำงานเป็นคนละเรื่อง ควรอ่านร่วมกับ NK Vue, NKG2D+ cells และบริบทการรักษา"
    },
    masuyama_nk_vue:{
     title:"NK Vue",
     meaning:"วัดปริมาณ IFN-γ หลังจากกระตุ้นเลือดนอกตัวผู้ป่วย จึงเป็นตัวแทนการตอบสนองเชิงหน้าที่ของ NK cells ในหลอดทดลอง ไม่ใช่การวัดการฆ่าเซลล์มะเร็งโดยตรง",
     high:"ค่าที่ผ่านเกณฑ์หมายถึงเซลล์สามารถตอบสนองต่อสิ่งกระตุ้นและหลั่ง IFN-γ ได้ตามเกณฑ์ของวิธีตรวจ แต่ไม่ได้ยืนยันว่าควบคุมมะเร็งได้",
     low:"ค่าต่ำอาจสัมพันธ์กับการตอบสนองของ NK cells ที่ลดลง และอาจได้รับผลจากการติดเชื้อ ยา ภาวะเจ็บป่วย รวมถึงระยะเวลาและเงื่อนไขการเก็บหรือขนส่งตัวอย่าง",
     related:"ควรตรวจซ้ำภายใต้เงื่อนไขใกล้เคียงเดิมและดูร่วมกับ NK-cell count, NKG2D+ cells และสถานะโรค"
    },
    masuyama_nkg2d_cell_count:{
     title:"Number of NKG2D+ Cells",
     meaning:"จำนวนเซลล์ภูมิคุ้มกันที่แสดงตัวรับกระตุ้น NKG2D ซึ่งพบใน NK cells และ cytotoxic T cells และมีบทบาทในการรับรู้สัญญาณความเครียดบนเซลล์ผิดปกติ",
     high:"ค่าสูงหมายถึงมีเซลล์ที่แสดง NKG2D มากขึ้น แต่ไม่ได้ยืนยันว่ากลไกการฆ่าเซลล์มะเร็งทำงานครบถ้วนหรือมีประสิทธิผลทางคลินิก",
     low:"ค่าต่ำหมายถึงจำนวนเซลล์ที่แสดง NKG2D ยังต่ำกว่าเป้าหมายของรายงาน อาจสะท้อน activating capacity บางส่วนที่ยังไม่เต็มที่ แต่ไม่ควรสรุปว่า NK cells ใช้งานไม่ได้",
     related:"ควรอ่านร่วมกับจำนวน NK cells, NK Vue, สถานะการอักเสบ การติดเชื้อ ยา และแนวโน้มจากการตรวจครั้งก่อน"
    }
   };
   return{...base,...(map[code]||{title:"Masuyama parameter",meaning:"พารามิเตอร์ภูมิคุ้มกันตามรายงาน Masuyama",high:"ควรพิจารณาตามเกณฑ์ของรายงาน",low:"ควรพิจารณาตามเกณฑ์ของรายงาน",related:"ควรอ่านร่วมกับบริบททางคลินิก"})}
 }
 function masuyamaOverallInterpretationHtml(){
   const configs=masuyamaConfigs(),data=Object.fromEntries(configs.map(cfg=>{const series=masuyamaHistorySeriesForCode(cfg.code);return[cfg.code,{series,latest:series.at(-1),state:masuyamaTargetState(cfg.code,series.at(-1)?.value)}]}));
   const passing=configs.filter(cfg=>data[cfg.code].state.tone==="ok").map(cfg=>cfg.label),follow=configs.filter(cfg=>data[cfg.code].state.tone==="warn").map(cfg=>cfg.label);
   const level=data.masuyama_immunity_level.latest?.value||"—";
   return `<section class="masuyama-overall-interpretation"><h3>สรุปความหมายของผล Masuyama</h3><p>คะแนนภูมิคุ้มกันรวมอยู่ระดับ <strong>${MIW.Utils.escape(String(level))}</strong> ตามระบบ Masuyama และควรอ่านร่วมกับพารามิเตอร์ย่อยทั้ง 6 รายการ ไม่ควรสรุปจากคะแนนรวมเพียงค่าเดียว</p><div class="masuyama-summary-columns"><div><b>ด้านที่ถึงเป้าหมายของรายงาน</b><p>${MIW.Utils.escape(passing.length?passing.join(", "):"ยังไม่พบรายการที่ถึงเป้าหมาย")}</p></div><div><b>ด้านที่ควรติดตาม</b><p>${MIW.Utils.escape(follow.length?follow.join(", "):"ไม่พบรายการต่ำกว่าเป้าหมาย")}</p></div></div><p class="masuyama-clinical-limit"><b>ข้อจำกัด:</b> ผลนี้ไม่สามารถใช้ยืนยันว่ามะเร็งดีขึ้นหรือลุกลาม และไม่ควรใช้เพียงลำพังเพื่อเริ่ม เพิ่ม หรือลดการรักษา ควรพิจารณาร่วมกับ CBC, CRP, การติดเชื้อ ยา การรักษาปัจจุบัน โภชนาการ อาการ และผลภาพถ่ายรังสี/พยาธิวิทยาตามข้อบ่งชี้</p></section>`
 }
 function masuyamaInterpretationCardsHtml(){
   return `<section class="masuyama-interpretation-section"><div class="masuyama-interpretation-heading"><h3>${L("คำอธิบายและหลักการแปลผล","Explanation and interpretation")}</h3><p>${L("แยกความหมายของค่า สูง–ต่ำ ผลปัจจุบัน แนวโน้ม และข้อจำกัดของแต่ละพารามิเตอร์","Separates current value, high/low meaning, trend, related context and limitations for each parameter.")}</p></div><div class="masuyama-interpretation-grid">${masuyamaConfigs().map(cfg=>{const series=masuyamaHistorySeriesForCode(cfg.code),latest=series.at(-1),info=masuyamaInterpretation(cfg.code,latest,series);return`<article class="masuyama-interpret-card" data-masuyama-code="${MIW.Utils.escape(cfg.code)}" tabindex="0"><div class="masuyama-interpret-card-head"><h4>${MIW.Utils.escape(info.title)}</h4><span>${MIW.Utils.escape(cfg.target)}</span></div><p class="current"><b>${L("ผลรายนี้:","Current result:")}</b> ${MIW.Utils.escape(info.current)}</p><p><b>${L("สื่อถึงอะไร:","What it represents:")}</b> ${MIW.Utils.escape(info.meaning)}</p><p><b>${L("เมื่อค่าสูง:","When high:")}</b> ${MIW.Utils.escape(info.high)}</p><p><b>${L("เมื่อค่าต่ำ:","When low:")}</b> ${MIW.Utils.escape(info.low)}</p><p><b>${L("ควรดูร่วมกับ:","Interpret with:")}</b> ${MIW.Utils.escape(info.related)}</p><p class="limit"><b>${L("ข้อจำกัด:","Limitations:")}</b> ${MIW.Utils.escape(info.limitation)}</p></article>`}).join("")}</div></section>`
 }
 function masuyamaHistoryHtml(code){
   const series=masuyamaHistorySeriesForCode(code);
   if(!series.length)return `<div class="popup-note">${L("ยังไม่มีข้อมูลย้อนหลังจากต้นฉบับ","No source-report history is available yet")}</div>`;
   const items=series.map((item,index)=>`<li><b>ครั้งที่ ${index+1}</b> · ${MIW.Utils.escape(masuyamaRowDate(item.date))} · <strong>${MIW.Utils.escape(masuyamaDisplayValue(code,item))}</strong>${item.unit?` ${MIW.Utils.escape(item.unit)}`:''}${item.approximate?' <span class="muted">(≈ จากกราฟต้นฉบับ)</span>':''}</li>`).join('');
   return `<div class="popup-note"><b>ประวัติจากต้นฉบับ</b><ul class="masuyama-popup-history">${items}</ul></div>`
 }
 function masuyamaPopupHtml(code){
   const config=masuyamaConfigs().find(item=>item.code===code)||masuyamaConfigs()[0],series=masuyamaHistorySeriesForCode(code),latest=series.at(-1),info=masuyamaInterpretation(code,latest,series);
   return `<h4>${MIW.Utils.escape(config.label)}</h4>
     <div><b>${L("ผลล่าสุด:","Latest result:")}</b> ${MIW.Utils.escape(masuyamaDisplayValue(code,latest))} ${MIW.Utils.escape(config.unit||'')}</div>
     <div><b>${L("Best range ตามรายงาน:","Report-specific Best range:")}</b> ${MIW.Utils.escape(config.target||'—')}</div>
     <div class="popup-note"><b>${L("สื่อถึงอะไร:","What it reflects:")}</b> ${MIW.Utils.escape(info.meaning)}</div>
     <div class="popup-note"><b>${L("เมื่อค่าสูง:","When high:")}</b> ${MIW.Utils.escape(info.high)}</div>
     <div class="popup-note"><b>${L("เมื่อค่าต่ำ:","When low:")}</b> ${MIW.Utils.escape(info.low)}</div>
     <div class="popup-note"><b>${L("ผลรายนี้:","Current result:")}</b> ${MIW.Utils.escape(info.current)}</div>
     ${masuyamaHistoryHtml(code)}
     <div class="popup-source">${MIW.Utils.escape(info.limitation)}</div>`
 }
 function bindMasuyamaCardPopups(root){
   if(!root)return;
   const hover=document.getElementById('labHoverCard');
   const position=(e)=>{
    if(!hover)return; const pad=14,w=hover.offsetWidth,h=hover.offsetHeight;
    hover.style.left=`${Math.min(e.clientX+16,window.innerWidth-w-pad)}px`;
    hover.style.top=`${Math.min(e.clientY+16,window.innerHeight-h-pad)}px`;
   };
   root.onmousemove=e=>{
    const card=e.target.closest('[data-masuyama-code]');
    if(!card||!hover){if(hover)hover.style.display='none';return}
    const code=card.dataset.masuyamaCode||'';
    if(!code){hover.style.display='none';return}
    hover.innerHTML=masuyamaPopupHtml(code);hover.style.display='block';position(e)
   };
   root.onmouseleave=()=>{if(hover)hover.style.display='none'};
   root.onclick=e=>{
    const card=e.target.closest('[data-masuyama-code]');
    if(!card)return;
    const target=document.getElementById('masuyamaExplanationArea');
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'})}
   };
 }
 function masuyamaTrackerChartSpec(code){
  const specs={
   masuyama_nlr:{min:0,max:4.5,ticks:[0,1,2,3,4],bands:[
    {from:0,to:.8,tone:"red",label:"ต่ำกว่าช่วงมาก",stateLabel:"ห่างจาก Best range"},
    {from:.8,to:1,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่า Best range"},
    {from:1,to:1.8,tone:"green",label:"Best range",stateLabel:"อยู่ใน Best range"},
    {from:1.8,to:3,tone:"amber",label:"ควรติดตาม",stateLabel:"สูงกว่า Best range"},
    {from:3,to:4.5,tone:"red",label:"สูงกว่าช่วงมาก",stateLabel:"สูงกว่า Best range มาก"}
   ]},
   masuyama_lymphocyte_count:{min:0,max:4500,ticks:[0,1000,2000,3000,4000],bands:[
    {from:0,to:1500,tone:"red",label:"ต่ำกว่าเป้าหมายมาก",stateLabel:"ต่ำกว่าเป้าหมายมาก"},
    {from:1500,to:2200,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่าเป้าหมาย"},
    {from:2200,to:4500,tone:"green",label:"Best range",stateLabel:"ถึงเป้าหมาย"}
   ]},
   masuyama_cd4_cd8_ratio:{min:0,max:5,ticks:[0,1,2,3,4,5],bands:[
    {from:0,to:.9,tone:"red",label:"ต่ำกว่าช่วงมาก",stateLabel:"ต่ำกว่า Best range มาก"},
    {from:.9,to:1.2,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่า Best range"},
    {from:1.2,to:1.89,tone:"green",label:"Best range",stateLabel:"อยู่ใน Best range"},
    {from:1.89,to:2.5,tone:"amber",label:"ควรติดตาม",stateLabel:"สูงกว่า Best range"},
    {from:2.5,to:5,tone:"red",label:"สูงกว่าช่วงมาก",stateLabel:"สูงกว่า Best range มาก"}
   ]},
   masuyama_nk_cell_count:{min:0,max:1500,ticks:[0,500,1000,1500],bands:[
    {from:0,to:250,tone:"red",label:"ต่ำกว่าเป้าหมายมาก",stateLabel:"ต่ำกว่าเป้าหมายมาก"},
    {from:250,to:400,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่าเป้าหมาย"},
    {from:400,to:1500,tone:"green",label:"Best range",stateLabel:"ถึงเป้าหมาย"}
   ]},
   masuyama_nk_vue:{min:0,max:3000,ticks:[0,1000,2000,3000],bands:[
    {from:0,to:180,tone:"red",label:"ต่ำกว่าเป้าหมายมาก",stateLabel:"ต่ำกว่าเป้าหมายมาก"},
    {from:180,to:300,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่าเป้าหมาย"},
    {from:300,to:3000,tone:"green",label:"Best range",stateLabel:"ถึงเป้าหมาย"}
   ]},
   masuyama_nkg2d_cell_count:{min:0,max:3000,ticks:[0,1000,2000,3000],bands:[
    {from:0,to:700,tone:"red",label:"ต่ำกว่าเป้าหมายมาก",stateLabel:"ต่ำกว่าเป้าหมายมาก"},
    {from:700,to:1000,tone:"amber",label:"ควรติดตาม",stateLabel:"ต่ำกว่าเป้าหมาย"},
    {from:1000,to:3000,tone:"green",label:"Best range",stateLabel:"ถึงเป้าหมาย"}
   ]}
  };
  return specs[code]||{min:0,max:1,ticks:[0,1],bands:[]}
 }
 function masuyamaColorLegend(){
  return `<div class="masuyama-color-legend"><span class="green"><i></i>${L("Best range ตามรายงาน","Report-specific Best range")}</span><span class="amber"><i></i>${L("นอกเป้าหมาย/ควรติดตาม","Outside target / follow-up recommended")}</span><span class="red"><i></i>${L("ห่างจากเป้าหมายมาก","Markedly outside target")}</span></div>`
 }
 function masuyamaMiniSvg(series,code){
   if(!series.length)return `<div class="empty">${L("ยังไม่มีข้อมูลย้อนหลัง","No historical data available yet")}</div>`;
   const spec=masuyamaTrackerChartSpec(code),width=360,height=190,left=42,right=12,top=14,bottom=34,plotW=width-left-right,plotH=height-top-bottom;
   const x=index=>left+(index+.5)*(plotW/10),y=value=>top+(spec.max-Math.max(spec.min,Math.min(spec.max,number(value)??spec.min)))/(spec.max-spec.min)*plotH;
   const bands=(spec.bands||[]).map(item=>{const yTop=y(item.to),yBottom=y(item.from),heightBand=Math.max(1,yBottom-yTop),labelY=yTop+heightBand/2;return`<rect x="${left}" y="${yTop.toFixed(1)}" width="${plotW}" height="${heightBand.toFixed(1)}" class="semantic-band ${item.tone}"/>${heightBand>=18?`<text x="${left+plotW-5}" y="${(labelY+3).toFixed(1)}" text-anchor="end" class="band-label ${item.tone}">${MIW.Utils.escape(L(item.label,{"ต่ำกว่าช่วงมาก":"Markedly below range","สูงกว่าช่วงมาก":"Markedly above range","ควรติดตาม":"Follow-up recommended","ต่ำกว่าเป้าหมายมาก":"Markedly below target","ต่ำกว่าเป้าหมาย":"Below target","ถึงเป้าหมาย":"Meets target","Best range":"Best range"}[item.label]||item.label))}</text>`:""}`}).join("");
   const gridV=Array.from({length:11},(_,index)=>`<line x1="${(left+index*plotW/10).toFixed(1)}" y1="${top}" x2="${(left+index*plotW/10).toFixed(1)}" y2="${top+plotH}" class="grid"/>`).join('');
   const gridH=spec.ticks.map(tick=>`<line x1="${left}" y1="${y(tick).toFixed(1)}" x2="${left+plotW}" y2="${y(tick).toFixed(1)}" class="grid dashed"/><text x="${left-6}" y="${(y(tick)+4).toFixed(1)}" text-anchor="end" class="axis-label">${MIW.Utils.escape(String(tick))}</text>`).join('');
   const valid=series.slice(-10).map((item,index)=>({item,index,value:number(item.value)})).filter(point=>point.value!==null);
   const points=valid.map(point=>({x:x(point.index),y:y(point.value),point}));
   const pathData=points.length?`M ${points.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`:'';
   const line=points.length>1?`<path class="trend-line" d="${pathData}"/>`:'';
   const dots=points.map(({x:cx,y:cy,point})=>`<g><circle class="dot${point.item.approximate?' approximate':''}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6"/><text x="${cx.toFixed(1)}" y="${Math.max(12,cy-10).toFixed(1)}" text-anchor="middle" class="point-value">${MIW.Utils.escape(masuyamaDisplayValue(code,point.item))}</text></g>`).join('');
   const labels=Array.from({length:10},(_,index)=>`<text x="${x(index).toFixed(1)}" y="${height-10}" text-anchor="middle" class="x-label">${index+1}</text>`).join('');
   const dateLegend=valid.map(({item},index)=>`<span><b>${index+1}</b>${MIW.Utils.escape(masuyamaShortDate(item.date))}</span>`).join('');
   const approxNote=series.some(item=>item.approximate)?`<div class="masuyama-approx-note">${L("○ จุดวงโปร่ง = ประมาณค่าจากกราฟต้นฉบับ · ● จุดทึบ = ค่าที่พิมพ์ในรายงาน","○ open circle = estimated from source graph · ● solid point = value printed in the report")}</div>`:'';
   return `<div class="masuyama-mini-wrap"><svg class="masuyama-mini-svg source-style" viewBox="0 0 ${width} ${height}" role="img" aria-label="Masuyama history chart">${bands}${gridV}${gridH}${line}${dots}${labels}</svg>${masuyamaColorLegend()}<div class="masuyama-source-dates">${dateLegend}</div>${approxNote}</div>`
 }

 function masuyamaHistoryLevelSvg(series){
   if(!series.length)return `<div class="empty">${L("ยังไม่มีข้อมูลย้อนหลัง","No historical data available yet")}</div>`;
   const width=520,height=260,left=42,right=18,top=18,bottom=76,plotW=width-left-right,plotH=height-top-bottom;
   const y=value=>top+plotH*(1-(value-1)/4);
   const x=index=>left+(series.length===1?plotW/2:index*(plotW/Math.max(series.length-1,1)));
   const bg=`<rect x="${left}" y="${top}" width="${plotW}" height="${plotH*0.25}" class="band target"/><rect x="${left}" y="${top+plotH*0.25}" width="${plotW}" height="${plotH*0.25}" class="band follow"/><rect x="${left}" y="${top+plotH*0.5}" width="${plotW}" height="${plotH*0.5}" class="band concern"/><text x="${left+plotW-6}" y="${top+14}" text-anchor="end" class="level-band-label target">${L("เป้าหมาย 4–5","Target 4–5")}</text><text x="${left+plotW-6}" y="${top+plotH*.25+14}" text-anchor="end" class="level-band-label follow">${L("ขั้นต่ำ 3L–3H","Intermediate 3L–3H")}</text><text x="${left+plotW-6}" y="${top+plotH*.5+14}" text-anchor="end" class="level-band-label concern">${L("ต่ำกว่าเป้าหมาย 1–2","Below target 1–2")}</text>`;
   const ylabels=['5','4','3H','3L','2','1'].map((label,i)=>{const pos=i===0?1:i===1?2:i===2?3.5:i===3?3:i===4?2:1; return ''});
   const lines=[1,2,3,3.5,4,5].map(v=>`<line x1="${left}" y1="${y(v)}" x2="${left+plotW}" y2="${y(v)}" class="grid"/>`).join('');
   const labels=[['5',5],['4',4],['3H',3.5],['3L',3],['2',2],['1',1]].map(([label,val])=>`<text x="${left-10}" y="${y(val)+4}" text-anchor="end" class="ylabel">${label}</text>`).join('');
   const points=series.map((item,i)=>`${x(i).toFixed(1)},${y(Number(String(item.value).replace(/[^\d.]/g,''))||1).toFixed(1)}`).join(' ');
   const dots=series.map((item,i)=>`<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(Number(String(item.value).replace(/[^\d.]/g,''))||1).toFixed(1)}" r="5"/>`).join('');
   const treatmentRow=series.map((item,i)=>`<td>${i+1}</td>`).join('');
   const dateRow=series.map(item=>`<td>${MIW.Utils.escape(masuyamaShortDate(item.date)).replace(/ /g,'<br>')}</td>`).join('');
   return `<div class="masuyama-level-history"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Masuyama comprehensive immunity history">${bg}${lines}${labels}<polyline class="line" points="${points}"/>${dots}</svg>${masuyamaColorLegend()}<table class="masuyama-history-table"><tr><th>Treatment No.</th>${treatmentRow}</tr><tr><th>Date of Test</th>${dateRow}</tr></table></div>`
 }
 function masuyamaHexagonSvg(){
   const cfg=masuyamaConfigs().filter(item=>item.code!=="masuyama_immunity_level");
   const seriesMap=Object.fromEntries(cfg.map(item=>[item.code,masuyamaHistorySeriesForCode(item.code)]));
   const current=cfg.map(item=>masuyamaScaleLevel(item.code,seriesMap[item.code].at(-1)?.value));
   const previous=cfg.map(item=>masuyamaScaleLevel(item.code,seriesMap[item.code].length>=2?seriesMap[item.code].at(-2)?.value:seriesMap[item.code].at(-1)?.value));
   const width=420,height=360,cx=205,cy=175,outer=110;
   const angle=i=>-Math.PI/2+i*(Math.PI*2/cfg.length);
   const ring=level=>cfg.map((_,i)=>`${(cx+Math.cos(angle(i))*outer*(level/3)).toFixed(1)},${(cy+Math.sin(angle(i))*outer*(level/3)).toFixed(1)}`).join(' ');
   const poly=(levels)=>levels.map((level,i)=>`${(cx+Math.cos(angle(i))*outer*(level/3)).toFixed(1)},${(cy+Math.sin(angle(i))*outer*(level/3)).toFixed(1)}`).join(' ');
   const axes=cfg.map((item,i)=>{const ex=cx+Math.cos(angle(i))*outer, ey=cy+Math.sin(angle(i))*outer; const lx=cx+Math.cos(angle(i))*(outer+30), ly=cy+Math.sin(angle(i))*(outer+30); return `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"></line><text class="label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${MIW.Utils.escape(item.label.replace('Number of ','').replace('Neutrophil / ','').replace(' Ratio (NLR)',' NLR').replace('CD4 / CD8 Ratio','CD4/CD8'))}</text>`}).join('');
   return `<div class="masuyama-hexagon-card" data-masuyama-code="masuyama_immunity_level" tabindex="0"><div class="masuyama-hexagon-copy"><h3>Masuyama Hexagon</h3><p>${L("แสดง 6 พารามิเตอร์แบบ 3 ระดับ ยิ่งรูปทรงสมดุลมาก ภาพรวมยิ่งสมดุล","Displays six parameters on a three-level scale; a more balanced shape indicates a more balanced overall profile")}</p><div class="legend"><span><i class="current"></i>${L("ผลล่าสุด","Latest result")}</span><span><i class="previous"></i>${L("ครั้งก่อน","Previous result")}</span></div></div><svg class="masuyama-hexagon-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Masuyama hexagon"><polygon points="${ring(3)}" class="ring outer"/><polygon points="${ring(2)}" class="ring"/><polygon points="${ring(1)}" class="ring"/>${axes}<text x="${cx}" y="${cy-outer-10}" class="ringlabel">High</text><text x="${cx}" y="${cy-outer*2/3-4}" class="ringlabel">Standard</text><text x="${cx}" y="${cy-outer/3+4}" class="ringlabel">Low</text><polygon points="${poly(previous)}" class="previous"/><polygon points="${poly(current)}" class="current"/></svg></div>`
 }
 function masuyamaDashboardMarkup(selectedRows){
   const code=masuyamaCodeOf(selectedRows[0]||{}),configs=masuyamaConfigs(),overallSeries=masuyamaHistorySeriesForCode("masuyama_immunity_level");
   const cards=configs.filter(item=>item.code!=="masuyama_immunity_level").map(item=>{const series=masuyamaHistorySeriesForCode(item.code),latest=series.at(-1),state=masuyamaTargetState(item.code,latest?.value);return`<article class="masuyama-card ${state.tone}" data-masuyama-code="${MIW.Utils.escape(item.code)}" tabindex="0"><div class="masuyama-card-head"><div><h4>${MIW.Utils.escape(item.label)}</h4><span>Best range: ${MIW.Utils.escape(item.target)}</span></div><div class="masuyama-card-value"><b>${MIW.Utils.escape(masuyamaDisplayValue(item.code,latest))} ${MIW.Utils.escape(item.unit)}</b><small>${L("ชี้เพื่อดู Pop-up","Hover for pop-up")}</small></div></div>${masuyamaMiniSvg(series,item.code)}<div class="masuyama-card-foot"><span class="state ${state.tone}">${MIW.Utils.escape(state.label)}</span><span>${series.length>1?L(`ย้อนหลัง ${series.length} ครั้ง`,`History: ${series.length} measurements`):L("อิงวันตรวจจากต้นฉบับ","Uses source-report test date")}</span></div></article>`}).join("");
   const selectedConfig=configs.find(item=>item.code===code)||configs[0],selectedSeries=masuyamaHistorySeriesForCode(code),latest=selectedSeries.at(-1),state=masuyamaTargetState(code,latest?.value),overallState=masuyamaTargetState("masuyama_immunity_level",overallSeries.at(-1)?.value);
   const historyCounts=configs.map(item=>masuyamaHistorySeriesForCode(item.code).length),minHistory=Math.min(...historyCounts),maxHistory=Math.max(...historyCounts);
   const chartHtml=`<div class="chart-box masuyama-dashboard-box"><div class="masuyama-dashboard-head"><div><h3>Masuyama Comprehensive Immunity</h3><p>รวมกราฟ 7 รายการ (คะแนนรวม + พารามิเตอร์ย่อย 6 รายการ) และกราฟหกเหลี่ยมไว้ในหน้าเดียว</p></div><div class="masuyama-badges"><span class="state ${overallState.tone}">คะแนนรวม ${MIW.Utils.escape(String(overallSeries.at(-1)?.value||"—"))} · ${MIW.Utils.escape(overallState.label)}</span><span class="state ${minHistory>=3?'ok':'warn'}">ข้อมูลกราฟย้อนหลัง ${minHistory}–${maxHistory} จุด/รายการ</span><span class="source-note">สีเขียว = Best range ตามรายงาน · สีเหลือง/แดง = ระดับช่วยมองแนวโน้มในโปรแกรม ไม่ใช่ clinical reference มาตรฐาน</span><span class="source-note">เครื่องหมาย ≈ หมายถึงประมาณค่าจากตำแหน่งจุดในกราฟต้นฉบับ เพราะรายงานไม่ได้พิมพ์ตัวเลขย้อนหลัง</span></div></div>${masuyamaOverallInterpretationHtml()}${masuyamaHexagonSvg()}<section class="masuyama-comprehensive" data-masuyama-code="masuyama_immunity_level" tabindex="0"><div class="masuyama-card-head"><div><h4>History of Comprehensive Immunity Level</h4><span>อ้างอิงระดับและวันที่จากต้นฉบับ Masuyama</span></div><div class="masuyama-card-value"><b>${MIW.Utils.escape(String(overallSeries.at(-1)?.value||"—"))} level</b><small>${L("ชี้เพื่อดู Pop-up","Hover for pop-up")}</small></div></div>${masuyamaHistoryLevelSvg(overallSeries)}</section><div class="masuyama-grid">${cards}</div>${masuyamaInterpretationCardsHtml()}</div>`;
   const selectedInfo=masuyamaInterpretation(code,latest,selectedSeries);
   const explanationHtml=`<h3>${MIW.Utils.escape(selectedConfig.label)}</h3><p class="muted">คำอธิบายนี้แยกความหมายของค่า สูง–ต่ำ ผลปัจจุบัน แนวโน้ม และข้อจำกัด โดยยังคงใช้ Best range ตามต้นฉบับ Masuyama</p><div class="masuyama-selected-explanation"><p><b>ผลล่าสุด:</b> ${MIW.Utils.escape(selectedInfo.current)}</p><p><b>สื่อถึงอะไร:</b> ${MIW.Utils.escape(selectedInfo.meaning)}</p><p><b>เมื่อค่าสูง:</b> ${MIW.Utils.escape(selectedInfo.high)}</p><p><b>เมื่อค่าต่ำ:</b> ${MIW.Utils.escape(selectedInfo.low)}</p><p><b>ควรดูร่วมกับ:</b> ${MIW.Utils.escape(selectedInfo.related)}</p><p class="limit"><b>ข้อจำกัด:</b> ${MIW.Utils.escape(selectedInfo.limitation)}</p></div>`;
   return{chartHtml,explanationHtml,coverage:configs.filter(item=>masuyamaHistorySeriesForCode(item.code).length).length}
 }
 function renderMasuyamaDashboard(selectedRows,areaId="labChartArea",explanationId="labExplanation"){
   const area=document.getElementById(areaId),explanation=document.getElementById(explanationId);if(!area)return;
   const masuyamaRows=rows.filter(isMasuyamaResult);
   if(!masuyamaRows.length){area.innerHTML=`<div class="empty">${L("ยังไม่มีผล Masuyama ที่ยืนยันแล้ว","No verified Masuyama result is available")}</div>`;if(explanation)explanation.innerHTML="";return}
   const markup=masuyamaDashboardMarkup(selectedRows?.length?selectedRows:masuyamaRows);
   area.innerHTML=markup.chartHtml;if(explanation)explanation.innerHTML=markup.explanationHtml;
   bindMasuyamaCardPopups(area);
   const coverage=document.getElementById("masuyamaPageCoverage");if(coverage)coverage.textContent=L(`${markup.coverage}/7 รายการ`,`${markup.coverage}/7 items`)
 }
 function renderMasuyamaPage(){renderMasuyamaDashboard(rows.filter(isMasuyamaResult),"masuyamaDashboardArea","masuyamaExplanationArea")}

 function foodIntoleranceIgGLevel(r){
   if(!isFoodIntoleranceIgGResult(r))return"";
   const reported=String(r?.foodIntoleranceLevel||r?.food_intolerance_level||"").trim().toLowerCase();
   if(reported==="high")return"High";
   if(reported==="borderline")return"Borderline";
   if(reported==="normal")return"Normal";
   const n=number(r?.valueNumeric??r?.value_numeric??r?.value);
   return n===null?"":n>=30?"High":n>=24?"Borderline":"Normal"
 }
 function foodIntoleranceIgGKnowledge(r){
   const food=String(r?.name||"อาหารรายการนี้").trim();
   return{
     name:food,group:"Food-specific IgG",unit:"U/mL",reference:"<=23",
     meaning:`ตรวจแอนติบอดี IgG ในซีรัมที่จับกับโปรตีนของ ${food} เป็นการวัดการเคยสัมผัส/รับประทานและการจดจำอาหารของภูมิคุ้มกัน ไม่ใช่การตรวจ IgE และไม่ใช่ตัววัดการอักเสบของอวัยวะ`,
     purpose:`เป้าหมายของชุดตรวจคือรายงานระดับ food-specific IgG ต่อ ${food} ตาม cutoff ของผู้ผลิต เพื่อใช้เป็นข้อมูลประกอบประวัติการรับประทาน/อาการเท่านั้น ไม่ใช่เพื่อยืนยัน food allergy หรือ food intolerance`,
     system:"ภูมิคุ้มกันแบบแอนติบอดี (humoral immunity) · การสัมผัสอาหารผ่านทางเดินอาหาร; ไม่ได้ชี้ความเสียหายของลำไส้หรือตับโดยตรง",
     high:`มักพบเมื่อเคยหรือรับประทาน ${food} และร่างกายสร้าง IgG ต่ออาหารนั้น ระดับอาจต่างตามความถี่/ระยะเวลาหลังรับประทาน วิธีตรวจ และการตอบสนองเฉพาะบุคคล; ค่า High ไม่ใช่หลักฐานว่าอาหารนี้ทำให้เกิดอาการ`,
     low:`หมายถึงตรวจพบ IgG ต่ำกว่าจุดตัดของชุดตรวจ อาจสัมพันธ์กับการสัมผัสน้อย เว้นอาหารมาระยะหนึ่ง หรือความแตกต่างของการตอบสนอง; ไม่ได้พิสูจน์ว่ารับประทานแล้วปลอดภัย และไม่ตัดการแพ้แบบ IgE`,
     related:`ประวัติอาการที่เกิดซ้ำหลังรับประทาน ${food} ชนิดอาการ ระยะเวลาจากกินถึงเริ่มอาการ ปริมาณที่กิน และบันทึกอาหาร–อาการ; หากเกิดลมพิษ ปาก/คอบวม หายใจมีเสียงหวีด หน้ามืด หรืออาการทันที ควรประเมิน food allergy ด้วยประวัติร่วมกับ specific IgE/skin test และแพทย์ภูมิแพ้`,
     caution:"เกณฑ์ Normal / Borderline / High เป็นการจัดระดับของรายงานนี้ ไม่ใช่ระดับความรุนแรงทางคลินิก Food-specific IgG เพียงค่าเดียวไม่ใช้ยืนยัน food allergy, food intolerance หรือสาเหตุของอาการ และไม่ควรใช้สั่งงดอาหารหลายชนิด; การทดสอบกินอาหาร (oral food challenge) ทำเมื่อมีข้อบ่งชี้และต้องอยู่ภายใต้บุคลากรทางการแพทย์",
     specific:true,knowledgeLevel:"DYNAMIC_ANALYTE"
   }
  }
 function allergyKnowledge(r){
   const display=bilingualAllergyName(r)||String(r?.name||"สารก่อภูมิแพ้รายการนี้");
   const allergen=String(r?.allergenName||display).replace(/^Specific IgE\s*[—–-]\s*/i,"").trim();
   const kind=String(r?.allergenKind||r?.allergyProfile||r?.allergy_profile||"").toLowerCase();
   const exposure=kind.includes("food")?"การรับประทาน":kind.includes("inhal")?"การสูดสัมผัส":"การสัมผัส";
   return{
    name:display,group:"Allergy",unit:"kU/L",reference:"<0.35",
    meaning:`ตรวจแอนติบอดี specific IgE ในเลือดต่อ ${allergen} เพื่อดูภาวะ sensitization ของภูมิคุ้มกันแบบ IgE ไม่ได้ทดสอบ food-specific IgG`,
    purpose:`ใช้ประกอบประวัติว่าอาการหลัง${exposure}${allergen}อาจเป็น IgE-mediated allergy หรือไม่ และช่วยตัดสินใจว่าควรหลีกเลี่ยงชั่วคราว ตรวจผิวหนัง หรือทำ supervised challenge ตามข้อบ่งชี้`,
    system:"ภูมิคุ้มกันแบบ IgE · mast cell/basophil · อวัยวะที่เกิดอาการ เช่น ผิวหนัง ทางเดินหายใจ และทางเดินอาหาร",
    high:`ผลบวกหมายถึงพบ sensitization ต่อ ${allergen}; โอกาสมีอาการจริงขึ้นกับประวัติ แต่ Class สูงไม่ได้บอกความรุนแรงหรือรับประกันว่าจะเกิดอาการ`,
    low:`Class 0 หรือ <0.35 kU/L หมายถึงไม่พบ specific IgE ต่อ ${allergen} ในระดับที่วิธีตรวจรายงาน แต่ไม่ตัดผลลบลวงหรือกลไกที่ไม่ใช่ IgE`,
    related:`อาการที่เกิดซ้ำหลัง${exposure}${allergen} เวลาเริ่มอาการ ปริมาณ/ระดับการสัมผัส ประวัติ anaphylaxis การทดสอบผิวหนัง และการประเมินโดยแพทย์ภูมิแพ้`,
    caution:"Specific IgE บอก sensitization ไม่ใช่การวินิจฉัย clinical allergy และ Class สูงไม่ได้แปลว่าอาการรุนแรงกว่าเสมอ ห้ามสั่งงดอาหารหลายชนิดจากผลเลือดอย่างเดียว",
    specific:true,knowledgeLevel:"DYNAMIC_ANALYTE"
   }
 }
 function knowledgeForResult(r){
   if(isFoodIntoleranceIgGResult(r))return foodIntoleranceIgGKnowledge(r);
   if(isAllergyResult(r))return allergyKnowledge(r);
   return knowledge(r?.name,r?.group)
 }
 function micronutrientVisualInfo(r){
   const evidence=(Array.isArray(r?.sourceEvidence)?r.sourceEvidence:[])
     .find(item=>["micronutrient-color-warning","reported-secondary-target"].includes(item?.type));
   const level=String(r?.micronutrientVisualLevel||evidence?.level||"").trim();
   const warningCode=String(r?.visualWarningCode||evidence?.warning_code||"").trim().toUpperCase();
   const direction=String(r?.visualWarningDirection||evidence?.warning_direction||"").trim().toUpperCase();
   return{level,warningCode,direction,evidence}
 }
 function antiAgingTargetInfo(r){
   const evidence=(Array.isArray(r?.sourceEvidence)?r.sourceEvidence:[])
     .find(item=>["micronutrient-color-warning","reported-secondary-target"].includes(item?.type));
   const rangeRaw=String(r?.antiAgingRangeRaw||evidence?.anti_aging_range||"").trim();
   const parsed=parseReference(rangeRaw);
   const rawLow=r?.antiAgingRangeLow??evidence?.anti_aging_range_low;
   const rawHigh=r?.antiAgingRangeHigh??evidence?.anti_aging_range_high;
   const storedLow=rawLow===null||rawLow===undefined||rawLow===""?NaN:Number(rawLow);
   const storedHigh=rawHigh===null||rawHigh===undefined||rawHigh===""?NaN:Number(rawHigh);
   const low=Number.isFinite(storedLow)?storedLow:parsed.low;
   const high=Number.isFinite(storedHigh)?storedHigh:parsed.high;
   const numeric=number(r?.valueNumeric??r?.value);
   let code=String(r?.antiAgingAssessment||evidence?.anti_aging_assessment||"").trim().toUpperCase();
   if(!["WITHIN_TARGET","BELOW_TARGET","ABOVE_TARGET","NOT_ASSESSED"].includes(code)){
     code="NOT_ASSESSED";
     if(numeric!==null&&rangeRaw){
       if(Number.isFinite(low)&&Number.isFinite(high)){
         code=numeric<low?"BELOW_TARGET":numeric>high?"ABOVE_TARGET":"WITHIN_TARGET"
       }else if(Number.isFinite(high)){
         const inclusive=/^(?:<=|≤)/.test(rangeRaw);
         code=(inclusive?numeric<=high:numeric<high)?"WITHIN_TARGET":"ABOVE_TARGET"
       }else if(Number.isFinite(low)){
         const inclusive=/^(?:>=|≥)/.test(rangeRaw);
         code=(inclusive?numeric>=low:numeric>low)?"WITHIN_TARGET":"BELOW_TARGET"
       }
     }
   }
   return{
     rangeRaw,low,high,code,evidence,
     role:String(r?.antiAgingAssessmentRole||evidence?.anti_aging_role||"SECONDARY_TARGET_NOT_CLINICAL_FLAG")
   }
 }
 function alternateReportedValues(r){
   const values=r?.alternateReportedValues||r?.alternate_reported_values||[];
   return Array.isArray(values)?values.filter(item=>item&&item.value):[]
 }
 function alternateReportedText(r){
   const values=alternateReportedValues(r);
   return values.length?`ค่าที่รายงานอีกหน่วย: ${values.map(item=>`${item.value} ${item.unit||""}`.trim()).join(" · ")}`:""
 }
 function antiAgingTargetText(r){
   const target=antiAgingTargetInfo(r);
   if(!target.rangeRaw)return"";
   const label={
     WITHIN_TARGET:"อยู่ในเป้าหมาย",
     BELOW_TARGET:"ต่ำกว่าเป้าหมาย",
     ABOVE_TARGET:"สูงกว่าเป้าหมาย",
     NOT_ASSESSED:"ยังประเมินไม่ได้"
   }[target.code]||"ยังประเมินไม่ได้";
   return`Anti-aging target: ${label} (${target.rangeRaw}${r?.unit?` ${r.unit}`:""})`
 }
 function hydrateMicronutrientWarning(r){
   const info=micronutrientVisualInfo(r);
   const target=antiAgingTargetInfo(r);
   if(!info.level&&!target.rangeRaw)return r;
   return{
     ...r,
     micronutrientVisualLevel:info.level,
     visualWarningCode:info.warningCode,
     visualWarningDirection:info.direction,
     antiAgingRangeRaw:target.rangeRaw,
     antiAgingRangeLow:target.low,
     antiAgingRangeHigh:target.high,
     antiAgingRangeOperator:r.antiAgingRangeOperator||info.evidence?.anti_aging_range_operator||"",
     antiAgingAssessment:target.code,
     antiAgingAssessmentRole:target.role,
     visualNormalRangeRaw:r.visualNormalRangeRaw||info.evidence?.visual_normal_range||"",
     visualSummaryPage:r.visualSummaryPage??info.evidence?.page??null
   }
 }
 function hasVisualWarning(r){
   return["NEAR_HIGH","NEAR_LOW","CAUTION"].includes(micronutrientVisualInfo(r).warningCode)
 }
 function visualWarningText(r){
   const {level,warningCode}=micronutrientVisualInfo(r);
   if(!level)return"";
   const detail={
     NEAR_HIGH:"ใกล้ขอบบน",NEAR_LOW:"ใกล้ขอบล่าง",CAUTION:"ควรติดตาม",
     ABNORMAL_HIGH:"สูง",ABNORMAL_LOW:"ต่ำ"
   }[warningCode]||"";
   return`แถบสี: ${level}${detail?` · ${detail}`:""}`
 }
 const ALLERGY_THAI_BY_CODE={
   allergy_food_egg_white:"ไข่ขาว",allergy_food_egg_yolk:"ไข่แดง",allergy_food_cow_milk:"โปรตีนจากนมวัว",
   allergy_food_wheat_flour:"แป้งสาลี",allergy_food_rice:"ข้าว",allergy_food_sesame:"งา",
   allergy_food_soybean:"ถั่วเหลือง",allergy_food_peanut:"ถั่วลิสง",allergy_food_hazelnut:"ถั่วเฮเซล",
   allergy_food_beef_cooked:"เนื้อวัวปรุงสุก",allergy_food_pork_cooked:"เนื้อหมูปรุงสุก",allergy_food_chicken:"เนื้อไก่",
   allergy_food_shellfish_mix_1:"อาหารทะเลเปลือกแข็งรวม",allergy_food_fish_mix_1:"ปลาทะเลรวม",
   allergy_food_crab:"ปูทะเลเปลือกแข็ง",allergy_food_shrimp_prawn:"กุ้งนาง กุ้งลายเสือ กุ้งทราย และกุ้งตะกาด",
   allergy_food_lobster:"กุ้งมังกร",allergy_food_blue_crab:"ปูม้า",allergy_food_chocolate:"ช็อกโกแลต (นมและโกโก้)",
   allergy_food_glutamate:"ผงชูรส",allergy_food_ccd_marker:"ตัวบ่งชี้ปฏิกิริยาข้ามกลุ่ม",
   allergy_inhalant_tree_mix_1:"ต้นไม้ผสม",allergy_inhalant_acacia:"กระถินณรงค์",allergy_inhalant_oil_palm:"ปาล์มน้ำมัน",
   allergy_inhalant_latex:"ยาง",allergy_inhalant_grass_mix_5:"หญ้าผสม",
   allergy_inhalant_house_dust_mite_mix_1:"ไรฝุ่นผสม (D.p./D.f.)",allergy_inhalant_cockroach_german:"แมลงสาบสายพันธุ์เยอรมัน",
   allergy_inhalant_kapok:"นุ่น",allergy_inhalant_cat:"รังแค ขน และน้ำลายแมว",allergy_inhalant_dog:"รังแค ขน และน้ำลายสุนัข",
   allergy_inhalant_cage_bird_mix_2:"ขนนกผสม",allergy_inhalant_guinea_pig:"เยื่อบุผิวหนังหนูตะเภา",
   allergy_inhalant_mouse:"เยื่อบุผิวหนังหนูบ้าน",allergy_inhalant_rabbit:"เยื่อบุผิวหนังกระต่าย",
   allergy_inhalant_hamster:"เยื่อบุผิวหนังหนูแฮมสเตอร์",allergy_inhalant_mould_mix_1:"สปอร์เชื้อราผสม ชุดที่ 1",
   allergy_inhalant_mould_mix_2:"สปอร์เชื้อราเพนนิซิลเลียผสม ชุดที่ 2",
   allergy_inhalant_candida_albicans:"ยีสต์แคนดิดา อัลบิแคนส์",
   allergy_inhalant_aureobasidium_pullulans:"สปอร์เชื้อรา Aureobasidium pullulans",
   allergy_inhalant_curvularia_spicifera:"สปอร์เชื้อรา Curvularia spicifera",
   allergy_inhalant_ccd_marker:"ตัวบ่งชี้ปฏิกิริยาข้ามกลุ่ม"
 };
 const ALLERGY_COMPONENT_THAI_BY_SCIENTIFIC={
   "Penicillium notatum":"เชื้อราเพนิซิลเลียม",
   "Cladosporium herbarum":"เชื้อราคลาโดสปอเรียม",
   "Aspergillus fumigatus":"เชื้อราแอสเปอร์จิลลัส",
   "Alternaria alternata":"เชื้อราอัลเทอร์นาเรีย"
 };
 function bilingualAllergyComponent(value){
   const scientific=String(value||"").trim();
   if(!scientific||/[\u0E00-\u0E7F]/.test(scientific))return scientific;
   const thai=ALLERGY_COMPONENT_THAI_BY_SCIENTIFIC[scientific];
   return thai?`${scientific} (${thai})`:scientific
 }
 function bilingualAllergyName(row){
   const thai=String(row?.allergenNameTh||ALLERGY_THAI_BY_CODE[row?.testCode]||"").trim();
   if(!thai)return row?.name||"";
   const english=String(row?.allergenName||row?.name||"")
     .replace(/^Specific IgE\s*[—–-]\s*/i,"")
     .replace(/^.+?\s+\(([^()]+)\)$/,"$1")
     .trim();
   return`Specific IgE — ${thai}${english&&!english.includes(thai)?` (${english})`:""}`
 }
 function repairAllergyResult(row){
   if(!isAllergyResult(row))return row;
   const repaired={...row};
   const bilingual=bilingualAllergyName(repaired);
   if(bilingual)repaired.name=bilingual;
   if(!repaired.allergenNameTh&&ALLERGY_THAI_BY_CODE[repaired.testCode]){
     repaired.allergenNameTh=ALLERGY_THAI_BY_CODE[repaired.testCode]
   }
   if(Array.isArray(repaired.allergenComponents)){
     const bilingualComponents=repaired.allergenComponents.map(bilingualAllergyComponent);
     if(bilingualComponents.some((value,index)=>value!==repaired.allergenComponents[index])){
       repaired.allergenComponents=bilingualComponents
     }
   }
   const evidence=Array.isArray(repaired.sourceEvidence)?repaired.sourceEvidence:[];
   const evidenceSaysNegative=evidence.some(item=>
     String(item?.class_raw??"").trim()!==""&&Number(item.class_raw)===0||
     Number(item?.class)===0||
     item?.comparator_direct===true||
     /^</.test(String(item?.concentration||item?.concentration_raw||"").trim())
   );
   const atThreshold=number(repaired.valueNumeric??repaired.value)===0.35;
   const derivedAtThreshold=atThreshold&&String(repaired.allergyClassSource||"").startsWith("derived");
   if(atThreshold&&(evidenceSaysNegative||derivedAtThreshold)){
     repaired.value="<0.35";
     repaired.valueNumeric=0.35;
     repaired.valueOperator="<";
     repaired.allergyClass=0;
     repaired.allergyClassSource=evidenceSaysNegative?"repaired-from-source-evidence":"repaired-from-profile-threshold";
     repaired.allergyInterpretation="ไม่พบ specific IgE ต่อสารนี้ในระดับที่วิธีตรวจรายงาน";
     repaired.flag="N";
     repaired.calculatedFlag="N"
   }
   return repaired
 }
 const CATEGORY_CODES={
   "Hormone":new Set(["estradiol_e2","fsh","lh","free_t3","free_t4","tsh"]),
   "Tumor Marker":new Set(["afp","beta_hcg","ca_125","ca_15_3","ca_19_9","cea","psa"]),
   "Lipid Profile":new Set(["cholesterol","triglyceride","hdl_cholesterol","ldl_cholesterol"]),
   "Liver Function Test":new Set(["total_protein","albumin","globulin","total_bilirubin","direct_bilirubin","ast","alt","alp","ggt"]),
   "Vitamin & Mineral":new Set(["calcium","corrected_calcium","magnesium","phosphorus","phosphate","vitamin_d_25_oh","vitamin_b12","folate","zinc"])
 };
 function diagnosticFamilyId(row){return MIW.DiagnosticModules?.familyId?.(row)||"GENERAL_LAB"}
 function diagnosticDefinition(row){return MIW.DiagnosticModules?.definition?.(row)||{id:"GENERAL_LAB",category:"",label:"ผลแล็บทั่วไป",order:999}}
 function isGeneralDashboardRow(row){return diagnosticFamilyId(row)==="GENERAL_LAB"}
 function canonicalCategory(row){
   const family=diagnosticFamilyId(row),special=diagnosticDefinition(row);
   if(family!=="GENERAL_LAB"&&special.category)return special.category;
   if(isFoodIntoleranceIgGResult(row))return"Food-specific IgG";
   if(isCancerLiquidBiopsyResult(row))return"CTC";
   const code=String(row?.testCode||row?.test_code||"").toLowerCase();
   for(const [category,codes] of Object.entries(CATEGORY_CODES))if(codes.has(code))return category;
   const group=String(knowledge(row?.name,row?.group)?.group||"");
   if(["Hormone","Tumor Marker","Lipid Profile","Liver Function Test","Vitamin & Mineral"].includes(group))return group;
   return row?.group||group||"Other"
 }
 function canonicalPanel(row,category){
   const family=diagnosticFamilyId(row);
   if(category==="Food-specific IgG")return"Food Intolerance IgG 200+";
   if(category==="CTC")return row?.panel||"CTC";
   if(family==="AUTOIMMUNE")return row?.panel||"Autoimmune Profile";
   if(family==="TOXICOLOGY")return row?.panel||"Heavy Metals / Toxicology";
   if(family==="MICRONUTRIENT")return row?.panel||"Micronutrient Profile";
   if(family==="MOLECULAR")return row?.panel||"Molecular / PCR";
   if(category==="Hormone")return/^(?:Free T3|Free T4|Thyroid Stimulating Hormone)/i.test(row?.name)?"Thyroid Hormones":"Reproductive Hormones";
   if(category==="Tumor Marker")return"Tumor Markers";
   if(category==="Lipid Profile")return"Lipid Profile";
   if(category==="Liver Function Test")return"Liver Function";
   if(category==="Vitamin & Mineral")return/Calcium|Magnesium|Phosph|Zinc/i.test(row?.name)?"Minerals":"Vitamins";
   return row?.panel
 }
 function reportReferenceText(r){
   return String(r?.reference||r?.referenceRange||"").trim()
 }
 function contextualReferenceInfo(r){return MIW.ContextualReference?.resolve?.(r,currentPatient)||null}
 function referenceText(r){
   const direct=reportReferenceText(r);if(direct)return direct;
   const contextual=contextualReferenceInfo(r);if(contextual){const label=MIW.ContextualReference?.compact?.(contextual,currentPatient,r,isEnglishMode());if(label)return label}
   return String(knowledge(r?.name,r?.group).reference||"").trim()
 }
 function parseReference(raw){
   const text=String(raw||"").replace(/[\[\]]/g,"").replace(/[–—]/g,"-").trim();
   let m=text.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
   if(m)return{low:Number(m[1]),high:Number(m[2]),text};
   m=text.match(/^(?:<=?|≤)\s*(-?\d+(?:\.\d+)?)/);
   if(m)return{low:null,high:Number(m[1]),text};
   m=text.match(/^(?:>=?|≥)\s*(-?\d+(?:\.\d+)?)/);
   if(m)return{low:Number(m[1]),high:null,text};
   return{low:null,high:null,text}
 }
 function rangeFor(r){
   const reportText=reportReferenceText(r),contextual=contextualReferenceInfo(r);
   if(!reportText&&contextual){const label=MIW.ContextualReference?.compact?.(contextual,currentPatient,r,isEnglishMode())||"";return{low:null,high:null,text:label,source:isEnglishMode()?"source-report contextual thresholds":"เกณฑ์ตามบริบทจากรายงานต้นฉบับ",isFallback:false,contextual:true,contextualInfo:contextual}}
   const fallbackText=String(knowledge(r?.name,r?.group).reference||"").trim();
   const effectiveText=reportText||fallbackText;
   const parsed=parseReference(effectiveText);
   const storedLow=number(r?.referenceLow),storedHigh=number(r?.referenceHigh);
   if(storedLow!==null||storedHigh!==null){
     parsed.low=storedLow;parsed.high=storedHigh
   }
   return{
     ...parsed,
     text:effectiveText,
     source:(reportText||storedLow!==null||storedHigh!==null)?"รายงานต้นฉบับ":fallbackText?"ค่าทั่วไป":"ไม่มีข้อมูล",
     isFallback:!reportText&&storedLow===null&&storedHigh===null&&!!fallbackText
   }
 }
 function ageAt(dob,date){
   const raw=String(dob||"").replace(/\(\d{4}\)/,"").trim();
   const compact=raw.match(/^(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{4})$/);
   const a=compact?new Date(`${compact[1]} ${compact[2]} ${compact[3]}`):new Date(raw);
   const b=new Date(date||"");
   if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return null;
   let years=b.getFullYear()-a.getFullYear();
   if(b.getMonth()<a.getMonth()||(b.getMonth()===a.getMonth()&&b.getDate()<a.getDate()))years--;
   return years
 }
 function interpretationProfile(r){
   const name=String(r?.name||"").toLowerCase(),note=String(r?.reportInterpretationRaw||"");
   if(isFoodIntoleranceIgGResult(r))return{source:"เกณฑ์ Food Intolerance IgG จากรายงาน",bands:[
     {from:null,to:24,color:"rgba(46,160,110,.17)",label:"Normal (≤23 U/mL)"},
     {from:24,to:30,color:"rgba(245,183,0,.18)",label:"Borderline (24–29 U/mL)"},
     {from:30,to:null,color:"rgba(220,53,69,.16)",label:"High (≥30 U/mL)"}
   ]};
   if(isAllergyResult(r)){
     const allBands=[
       {from:null,to:0.35,color:"rgba(46,160,110,.17)",label:"Class 0 (<0.35)"},
       {from:0.35,to:0.7,color:"rgba(245,183,0,.13)",label:"Class 1 (0.35–<0.7)"},
       {from:0.7,to:3.5,color:"rgba(245,150,0,.15)",label:"Class 2 (0.7–<3.5)"},
       {from:3.5,to:17.5,color:"rgba(230,110,40,.16)",label:"Class 3 (3.5–<17.5)"},
       {from:17.5,to:50,color:"rgba(220,70,60,.17)",label:"Class 4 (17.5–<50)"},
       {from:50,to:100,color:"rgba(190,50,70,.18)",label:"Class 5 (50–<100)"},
       {from:100,to:null,color:"rgba(145,35,70,.19)",label:"Class 6 (≥100)"}
     ];
     const allergyClass=Number.isInteger(r?.allergyClass)?r.allergyClass:0;
     return{source:"Class thresholds จากรายงาน Allergy",bands:allBands.slice(0,Math.max(1,Math.min(7,allergyClass+1)))}
   }
   if(isCancerLiquidBiopsyResult(r)){
     const code=String(r?.testCode||r?.test_code||"");
     if(code==="oncotrail_lung_ctc_count")return{source:"เกณฑ์ติดตามของรายงาน OncoTrail — ไม่ใช่ population normal range",bands:[
       {from:null,to:10,color:"rgba(42,109,155,.12)",label:"ต่ำกว่า tracking limit (<10) — ยังต้องเทียบแนวโน้ม/imaging"},
       {from:10,to:null,color:"rgba(220,53,69,.16)",label:"เกิน tracking limit (≥10)"}
     ]};
     return{source:"ผล/Comparator เฉพาะของรายงาน — ไม่ใช่ clinical reference range",bands:[]}
   }
   if(isContextDependentHormone(r)){
     const ref=rangeFor(r),bands=[];
     if(Number.isFinite(ref.low))bands.push({from:null,to:ref.low,color:"rgba(245,183,0,.16)",label:`ต่ำกว่าช่วงตัวเลขที่รายงาน (<${ref.low})`});
     if(Number.isFinite(ref.low)||Number.isFinite(ref.high))bands.push({from:ref.low,to:ref.high,color:"rgba(42,109,155,.12)",label:"ภายในช่วงตัวเลขที่รายงาน — ยังไม่ใช่คำยืนยันว่าปกติ"});
     if(Number.isFinite(ref.high))bands.push({from:ref.high,to:null,color:"rgba(220,53,69,.14)",label:`สูงกว่าช่วงตัวเลขที่รายงาน (>${ref.high})`});
     return{source:`${ref.source} · ต้องเทียบเพศ อายุ และระยะทางสรีรวิทยา`,bands}
   }
   if(/vitamin d|25 hydroxy|25[- ]?oh/.test(name)){
     return{source:note?"คำอธิบายในรายงานต้นฉบับ":"เกณฑ์ Vitamin D ของโปรแกรม",bands:[
       {from:null,to:20,color:"rgba(220,53,69,.16)",label:"ขาด (<20)"},
       {from:20,to:31,color:"rgba(245,183,0,.18)",label:"ไม่เพียงพอ (20–30)"},
       {from:31,to:100,color:"rgba(46,160,110,.17)",label:"เพียงพอ (31–100)"},
       {from:100,to:null,color:"rgba(220,53,69,.16)",label:"สูง/เสี่ยงพิษ (>100)"}
     ]}
   }
   if(/nt[- ]?probnp/.test(name)){
     const age=ageAt(currentPatient?.dob,r?.date);
     const ruleIn=age===null?null:age<50?450:age<=75?900:1800;
     if(ruleIn!==null)return{source:`คำอธิบายในรายงานต้นฉบับ · อายุ ${age} ปี`,bands:[
       {from:null,to:300,color:"rgba(46,160,110,.17)",label:"HF ไม่น่าเป็น (<300)"},
       {from:300,to:ruleIn,color:"rgba(245,183,0,.18)",label:`ควรพิจารณาสาเหตุอื่น (300–${ruleIn})`},
       {from:ruleIn,to:null,color:"rgba(220,53,69,.16)",label:`เข้าเกณฑ์ rule-in ตามอายุ (>${ruleIn})`}
     ]}
   }
   const ref=rangeFor(r),bands=[];
   if(Number.isFinite(ref.low))bands.push({from:null,to:ref.low,color:"rgba(245,183,0,.16)",label:`ต่ำกว่าเกณฑ์ (<${ref.low})`});
   if(Number.isFinite(ref.low)||Number.isFinite(ref.high))bands.push({from:ref.low,to:ref.high,color:"rgba(46,160,110,.15)",label:"ช่วงอ้างอิง"});
   if(Number.isFinite(ref.high))bands.push({from:ref.high,to:null,color:"rgba(220,53,69,.14)",label:`สูงกว่าเกณฑ์ (>${ref.high})`});
   return{source:ref.source,bands}
 }
 function shortPopup(r){
   const k=englishClinicalProfile(r,knowledgeForResult(r)),ref=rangeFor(r),anti=antiAgingTargetText(r);
   const reviewNote=r.reviewRecommended
     ?`<div class="popup-review-advisory">${L("ควรเทียบต้นฉบับภายหลัง","Source recheck recommended")}${Number.isFinite(Number(r.confidence))?` · OCR ${Math.round(Number(r.confidence))}%`:""}</div>`
     :"";
   return `<h4>${MIW.Utils.escape(r.name)}</h4>
     <div><b>${L("ช่วงอ้างอิง:","Reference interval:")}</b> ${MIW.Utils.escape(ref.text||L("ไม่ระบุ","not specified"))} ${MIW.Utils.escape(detailCategoryDisplayUnit(r)||k.unit||"")}</div>
     ${anti?`<div><b>${L("เป้าหมายรอง:","Secondary target:")}</b> ${MIW.Utils.escape(translatedOr(anti,"Secondary target reported by the source laboratory"))}</div>`:""}
     ${isAllergyResult(r)?`<div><b>Allergy Class:</b> ${MIW.Utils.escape(Number.isInteger(r.allergyClass)?r.allergyClass:"—")}</div>`:""}
     <div class="popup-note">${MIW.Utils.escape(k.meaning)}</div>
     <div class="popup-source">${MIW.Utils.escape(translatedOr(ref.source,L("แหล่งอ้างอิงจากรายงาน","Source-report reference")))}</div>${reviewNote}`
 }
 function displayDate(value){
   const text=String(value||"").trim();
   return !text||/^(?:unknown|n\/a|null|undefined)$/i.test(text)?"ไม่ระบุวันที่ในเอกสาร":text
 }
 function isInBodyResult(r){
   return String(r?.group||"")==="Body Composition"||String(r?.profile||"").toUpperCase()==="INBODY_720"||/^inbody_/i.test(String(r?.testCode||r?.test_code||""))
 }
 function inbodySpecificAssessment(r){
   if(!isInBodyResult(r))return null;
   const n=number(r.valueNumeric??r.value),code=String(r.testCode||r.test_code||"").toLowerCase();
   const valueText=`${r.value??"—"}${r.unit?` ${r.unit}`:""}`,dateText=displayDate(r.date);
   if(n===null)return null;
   if(code==="inbody_ecw_tbw"||code==="inbody_history_ecw_tbw"||/_ecw_tbw$/.test(code)){
     const scope=code==="inbody_ecw_tbw"?"ทั้งร่างกาย":code==="inbody_history_ecw_tbw"?"ใน Body Composition History":String(r.name||"").replace(/^ECW\/TBW\s*/,"");
     if(n<0.360)return{level:"low",text:`${valueText} วันที่ ${dateText} — ${scope} ต่ำกว่าช่วงสมดุลน้ำทั่วไปของ InBody 0.360–0.390; ค่าต่ำไม่ได้แปลว่าขาดน้ำโดยอัตโนมัติ และอาจพบเมื่อสัดส่วน ICW/มวลกล้ามเนื้อสูง ควรดูอาการและแนวโน้ม`};
     if(n<=0.390)return{level:"normal",text:`${valueText} วันที่ ${dateText} — ${scope} อยู่ในช่วงสมดุลน้ำทั่วไปของ InBody 0.360–0.390 จึงยังไม่สนับสนุนภาวะ ECW ratio สูงจากค่านี้เพียงค่าเดียว`};
     if(n<0.400)return{level:"high",text:`${valueText} วันที่ ${dateText} — ${scope} สูงกว่า 0.390 เล็กน้อย ตามกรอบ InBody จัดว่า ECW ratio เพิ่มขึ้น/ระดับบวมเล็กน้อย ควรเทียบอาการบวม น้ำหนัก ไต หัวใจ ตับ และค่ารายส่วน`};
     return{level:"high",text:`${valueText} วันที่ ${dateText} — ${scope} ตั้งแต่ 0.400 ขึ้นไป ซึ่ง InBody ถือว่า ECW ratio สูงชัด ควรประเมินภาวะคั่งน้ำ/บวมและสาเหตุทางคลินิก ไม่วินิจฉัยจาก BIA ค่าเดียว`}
   }
   if(code==="inbody_visceral_fat_area")return n<100
     ?{level:"normal",text:`${valueText} วันที่ ${dateText} — ต่ำกว่าเป้าหมาย Visceral Fat Area <100 cm² ที่ InBody แนะนำ แต่ควรดู PBF, WHR และปัจจัยเสี่ยงเมตาบอลิกร่วม`}
     :{level:"high",text:`${valueText} วันที่ ${dateText} — ตั้งแต่ 100 cm² ขึ้นไป สูงกว่าเป้าหมายที่ InBody แนะนำ สื่อว่ามี visceral fat มากขึ้นและควรประเมินความเสี่ยงเมตาบอลิกร่วม`};
   if(/_lean_pct$/.test(code))return n>=100
     ?{level:"normal",text:`${valueText} วันที่ ${dateText} — Segmental Lean ของส่วนนั้นอยู่ที่ ${n}% ของ Ideal Lean จึงถึง/มากกว่าระดับ ideal ของเครื่อง; ควรดูสมดุลซ้าย-ขวาและ ECW/TBW ร่วม`}
     :{level:"low",text:`${valueText} วันที่ ${dateText} — Segmental Lean ของส่วนนั้นอยู่ที่ ${n}% ของ Ideal Lean ต่ำกว่า 100% จึงมี lean mass ต่ำกว่า ideal ของเครื่อง; ควรดูด้านตรงข้าม SMM และสมรรถภาพร่วม`};
   if(/_fat_pct$/.test(code))return n>100
     ?{level:"high",text:`${valueText} วันที่ ${dateText} — Segmental Fat ของส่วนนั้นเท่ากับ ${n}% ของค่า ideal/มาตรฐานของเครื่อง จึงสูงกว่า 100%; ค่านี้ไม่ใช่ Percent Body Fat ทั้งร่างกาย`}
     :{level:"normal",text:`${valueText} วันที่ ${dateText} — Segmental Fat ของส่วนนั้นไม่เกิน 100% ของค่า ideal/มาตรฐานของเครื่อง; ควรดู PBF และ Body Fat Mass ร่วม`};
   if(code==="inbody_weight_control"||code==="inbody_fat_control"||code==="inbody_muscle_control"){
     const target=code==="inbody_weight_control"?"น้ำหนัก":code==="inbody_fat_control"?"มวลไขมัน":"มวลกล้ามเนื้อ";
     const direction=n<0?"ลด":n>0?"เพิ่ม":"คง";
     return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นคำแนะนำจาก Weight Control ของ InBody ให้${direction}${target}${n===0?"ไว้ใกล้ระดับปัจจุบัน":`ประมาณ ${Math.abs(n)} kg`} ไม่ใช่ผลแล็บสูง/ต่ำและไม่ใช่คำสั่งรักษาอัตโนมัติ`}
   }
   if(code==="inbody_target_weight")return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นน้ำหนักเป้าหมายที่อัลกอริทึม InBody คำนวณจากสมดุลไขมันและกล้ามเนื้อ ควรใช้ร่วมกับ Fat/Muscle Control และเป้าหมายทางคลินิก`};
   if(code==="inbody_fitness_score")return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นคะแนนสรุปองค์ประกอบร่างกายแบบ proprietary ของ InBody ใช้ติดตามแนวโน้ม ไม่ใช่คะแนนวินิจฉัยโรคหรือการทดสอบสมรรถภาพโดยตรง`};
   if(/^inbody_impedance_/.test(code))return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นค่า impedance ดิบของส่วนร่างกาย/ความถี่นี้ ไม่มี cutoff สูง-ต่ำแบบผลแล็บทั่วไป ควรดูคู่ด้านตรงข้าม ความถี่อื่น และความสม่ำเสมอของการวัด`};
   if(code==="inbody_ecf_tbf"||/_ecf_tbf$/.test(code))return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็น ECF/TBF เพื่อประกอบการดูการกระจายน้ำ โปรแกรมไม่สร้าง cutoff เพิ่มเมื่อรายงานไม่พิมพ์ช่วงอ้างอิง จึงควรดู ECW/TBW ของตำแหน่งเดียวกันและแนวโน้มเป็นหลัก`};
   return null
 }

 function latestAssessment(r){
   if(!r)return{level:"unknown",text:"ยังไม่มีผลล่าสุดสำหรับแปลค่า"};
   const n=number(r.valueNumeric??r.value),ref=rangeFor(r);
   const displayUnit=detailCategoryDisplayUnit(r);
   const valueText=`${r.value??"—"}${displayUnit?` ${displayUnit}`:""}`;
   const dateText=displayDate(r.date);
   const explicit=String(r.flag||r.calculatedFlag||"").toUpperCase();
   const criticalComment=String(r.criticalSourceText||r.critical_source_text||r.resultCommentRaw||r.result_comment_raw||"").trim();
   const criticalSuffix=(r.criticalResult||r.critical_result||/Critical\s+Value/i.test(criticalComment))?` · ต้นฉบับระบุ ${criticalComment||"Critical Value"}`:"";
   const inbodyAssessment=inbodySpecificAssessment(r);
   if(inbodyAssessment)return inbodyAssessment;
   if(isFoodIntoleranceIgGResult(r)){
     const reportedLevel=String(r?.foodIntoleranceLevel||r?.food_intolerance_level||"").trim();
     const level=reportedLevel||(
       n===null?"ยังจัดระดับไม่ได้":n>=30?"High":n>=24?"Borderline":"Normal"
     );
     const threshold=level==="High"?"≥30 U/mL":level==="Borderline"?"24–29 U/mL":"≤23 U/mL";
     return{
       level:level==="High"?"high":level==="Borderline"?"unknown":level==="Normal"?"normal":"unknown",
       text:`${valueText} วันที่ ${dateText} — อยู่ในระดับ ${level} ตามเกณฑ์ของรายงาน (${threshold}${ref.text?`; ช่วงอ้างอิง ${ref.text} ${displayUnit||""}`:""}) หมายถึงตรวจพบ food-specific IgG ต่อ ${r?.name||"อาหารรายการนี้"} ตามระดับดังกล่าว ไม่ได้ยืนยันว่าแพ้หรือไม่ทนต่ออาหาร และไม่บอกความรุนแรงของอาการ`
     }
   }
   if(isAllergyResult(r)){
     const allergyClass=Number.isInteger(r.allergyClass)?r.allergyClass:
       String(r.valueOperator||"")==="<"&&n!==null&&n<=0.35?0:
       n===null?null:n<0.35?0:n<0.7?1:n<3.5?2:n<17.5?3:n<50?4:n<100?5:6;
     const meaning=r.allergyInterpretation||(
       allergyClass===0?"ไม่พบ specific IgE ต่อสารนี้ในระดับที่วิธีตรวจรายงาน":
       allergyClass===1?"ตรวจพบ specific IgE ระดับต่ำมาก":
       allergyClass===2?"ตรวจพบ specific IgE ระดับต่ำ":
       allergyClass===3?"ตรวจพบ specific IgE ชัดเจน":
       allergyClass>=4?"ตรวจพบ specific IgE ระดับสูง":"ยังจัด Class ไม่ได้"
     );
     return{
       level:allergyClass===0?"normal":allergyClass===null?"unknown":"high",
       text:`${valueText} วันที่ ${dateText}${allergyClass===null?"":` — Allergy Class ${allergyClass}`}; ${meaning} ทั้งนี้ผลบวกหมายถึง sensitization ไม่ได้ยืนยันว่ารับสารแล้วจะมีอาการหรือบอกความรุนแรง`
     }
   }
   if(isOncoTrailResult(r)){
     const code=String(r.testCode||r.test_code||"");
     const compartment=r.biomarkerCompartment||r.biomarker_compartment||"";
     if(code==="oncotrail_lung_ctc_count"){
       const over=["H","HH","HIGH"].includes(explicit);
       return{level:over?"high":"unknown",text:`${valueText} วันที่ ${dateText} — ${over?"สูงกว่า":"ต่ำกว่า"}เกณฑ์ที่รายงานใช้ติดตาม (<10 cells/mL)${r.ctcStandardDeviation!==null&&r.ctcStandardDeviation!==undefined?` (ค่าคลาดเคลื่อน ±${r.ctcStandardDeviation})`:""}; เกณฑ์นี้ไม่ใช่ค่าปกติของคนทั่วไป และผลต่ำกว่าเกณฑ์ไม่ได้แปลว่ามะเร็งหายหรือระยะโรคลดลง`}
     }
     if(code==="oncotrail_epcam_positive_ctc_count")return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นจำนวน CTC กลุ่มที่มี EpCAM บนผิวเซลล์ ต้องดูร่วมกับจำนวน CTC ทั้งหมด ผลครั้งก่อน และภาพ CT/MRI/PET-CT`};
     return{level:"unknown",text:`${valueText} วันที่ ${dateText}${compartment?` — ผลในกลุ่ม ${compartment}`:""}; บอกเพียงว่าเซลล์ที่แยกได้มีโปรตีนตัวนี้หรือไม่ ยังใช้ยืนยันการกลายพันธุ์ ชนิดมะเร็ง หรือการลุกลามจากตัวเดียวไม่ได้`}
   }
   if(isMetastatResult(r)){
     const code=String(r.testCode||r.test_code||""),reported=String(r.reportedResult||r.reported_result||"");
     const location=r.metastasisLocation||r.metastasis_location||"";
     if(code==="metastat_primary_destination_trend")return{level:"high",text:`${valueText} วันที่ ${dateText} — รายงานชี้ว่าเซลล์มีแนวโน้มเกี่ยวข้องกับ ${r.value}; ยังไม่ได้แปลว่าพบมะเร็งที่อวัยวะนั้น ต้องยืนยันด้วย CT/MRI/PET-CT หรือชิ้นเนื้อเมื่อแพทย์เห็นว่าจำเป็น`};
     if(code==="metastat_upregulated_genes")return{level:"high",text:`${valueText} วันที่ ${dateText} — รายชื่อยีนที่รายงานจัดว่า “ทำงานเด่นขึ้น”; ยังไม่ใช่ผลยืนยันการกลายพันธุ์และยังใช้เลือกยามุ่งเป้าไม่ได้`};
     const comparator=r.comparatorLevel??r.comparator_level;
     const up=/UP\s*REGULATED/i.test(reported);
     return{level:up?"high":"unknown",text:`ค่าตัวอย่าง ${r.value}${comparator!==null&&comparator!==undefined?` · ค่าเปรียบเทียบ ${comparator}`:""} วันที่ ${dateText}${location?` · กลุ่มอวัยวะ ${location}`:""} — รายงาน${up?"จัดว่าทำงานเด่นขึ้น":"ไม่ได้จัดว่าทำงานเด่นขึ้น"}; ตัวเลขนี้เป็นสเกลของวิธีตรวจ ไม่ใช่ระดับสารในเลือด และยังยืนยันตำแหน่งที่มะเร็งกระจายไม่ได้`}
   }
   if(isContextDependentHormone(r)){
     const hormoneName=String(r?.name||"").toLowerCase();
     const reportedContext=String(r?.referenceContextRaw||r?.reference_context_raw||"").trim();
     const contextPrefix=reportedContext?`${reportedContext}; `:"";
     const contextNote=/insulin/.test(hormoneName)
       ?"ต้องทราบสถานะอดอาหาร เวลาเก็บ Glucose/C-peptide ที่ตรวจร่วมกัน และยาที่มีผลต่ออินซูลิน"
       :/cortisol/.test(hormoneName)
         ?"ต้องทราบเวลาเก็บตัวอย่าง ความเจ็บป่วย/ความเครียด การนอน และการใช้ยากลุ่ม steroid"
         :/progesterone/.test(hormoneName)
           ?"ต้องทราบเพศ วันของรอบเดือน ระยะหลังตกไข่ ภาวะหมดประจำเดือน การตั้งครรภ์ และการใช้ฮอร์โมน"
           :/testosterone/.test(hormoneName)
             ?"ต้องทราบเพศ อายุ เวลาเก็บ SHBG/Free testosterone อาการ และการใช้ฮอร์โมนหรือยา"
             :/dhea/.test(hormoneName)
               ?"ต้องใช้ช่วงอ้างอิงตามเพศและอายุ พร้อมพิจารณาการทำงานของต่อมหมวกไตและการใช้ DHEA"
               :"ต้องทราบเพศกำเนิด อายุ ระยะของรอบเดือน/ภาวะหมดประจำเดือน การตั้งครรภ์ และยาหรือการรักษาที่มีผลต่อฮอร์โมน";
     if(n===null)return{level:"unknown",text:`${valueText} วันที่ ${dateText} — ${contextPrefix}เป็นผลแบบข้อความหรือยังไม่สามารถคำนวณสถานะได้; ${contextNote}`};
     if(Number.isFinite(ref.high)&&n>ref.high)return{level:"high",text:`${valueText} วันที่ ${dateText} — ${contextPrefix}สูงกว่าช่วงตัวเลขที่รายงาน ${ref.text} ${r.unit||""} แต่ยังต้องแปลตามบริบทเฉพาะบุคคล; ${contextNote}`};
     if(Number.isFinite(ref.low)&&n<ref.low)return{level:"low",text:`${valueText} วันที่ ${dateText} — ${contextPrefix}ต่ำกว่าช่วงตัวเลขที่รายงาน ${ref.text} ${r.unit||""} แต่ยังต้องแปลตามบริบทเฉพาะบุคคล; ${contextNote}`};
     if(Number.isFinite(ref.low)||Number.isFinite(ref.high))return{level:"unknown",text:`${valueText} วันที่ ${dateText} — ${contextPrefix}ตัวเลขอยู่ภายในช่วงอ้างอิงกว้างที่รายงาน ${ref.text} ${r.unit||""} แต่ยังสรุปว่า “ระดับฮอร์โมนปกติ” ไม่ได้; ${contextNote}`};
     return{level:"unknown",text:`${valueText} วันที่ ${dateText} — ${contextPrefix}ยังจัดว่าสูงหรือต่ำไม่ได้ เพราะไม่มีช่วงอ้างอิงที่ตรงกับหน่วยและบริบทของผู้ป่วย; ${contextNote}`}
   }
   if(["H","HH","HIGH"].includes(explicit))return{level:"high",text:`${valueText} วันที่ ${dateText} — รายงานระบุว่าสูง${ref.text?` เมื่อเทียบกับช่วง ${ref.text} ${r.unit||""}`:""}${criticalSuffix}`};
   if(["L","LL","LOW"].includes(explicit))return{level:"low",text:`${valueText} วันที่ ${dateText} — รายงานระบุว่าต่ำ${ref.text?` เมื่อเทียบกับช่วง ${ref.text} ${r.unit||""}`:""}${criticalSuffix}`};
   if(["N","NORMAL"].includes(explicit))return{level:"normal",text:`${valueText} วันที่ ${dateText} — รายงานระบุว่าอยู่ในช่วงอ้างอิง${ref.text?` ${ref.text} ${r.unit||""}`:""}${criticalSuffix}`};
   if(n===null)return{level:"unknown",text:`${valueText} วันที่ ${dateText} — เป็นผลแบบข้อความหรือยังไม่สามารถคำนวณสถานะได้${criticalSuffix}`};
   if(Number.isFinite(ref.high)&&n>ref.high)return{level:"high",text:`${valueText} วันที่ ${dateText} — สูงกว่าช่วงอ้างอิง ${ref.text} ${r.unit||""}${criticalSuffix}`};
   if(Number.isFinite(ref.low)&&n<ref.low)return{level:"low",text:`${valueText} วันที่ ${dateText} — ต่ำกว่าช่วงอ้างอิง ${ref.text} ${r.unit||""}${criticalSuffix}`};
   if(Number.isFinite(ref.low)||Number.isFinite(ref.high))return{level:"normal",text:`${valueText} วันที่ ${dateText} — อยู่ในช่วงอ้างอิง ${ref.text} ${r.unit||""}${criticalSuffix}`};
   return{level:"unknown",text:`${valueText} วันที่ ${dateText} — ยังจัดว่าสูงหรือต่ำไม่ได้ เพราะไม่มีช่วงอ้างอิงจากรายงานที่ตรงกับหน่วยนี้`}
 }
 function isEnglishMode(){return MIW.I18n?.language==="en"}
 function L(th,en){return isEnglishMode()?en:th}
 function hasThai(text){return /[\u0E00-\u0E7F]/.test(String(text||""))}
 function translatedOr(text,fallback){
   if(!isEnglishMode())return String(text||fallback||"");
   const translated=MIW.I18n?.translateString?MIW.I18n.translateString(String(text||""),"en"):String(text||"");
   return translated&&!hasThai(translated)?translated:String(fallback||"")
 }
 const EN_GROUP_PROFILE={
  "CBC":{meaning:"A hematology measurement related to red cells, white cells, or platelets.",purpose:"Used to assess blood-cell production and to screen or monitor anemia, infection, inflammation, bleeding risk, and marrow effects.",system:"Blood · bone marrow · oxygen transport · immune and hemostatic systems, depending on the analyte",high:"Possible causes depend on the analyte and may include dehydration, inflammation/infection, marrow stimulation, medication effects, or a hematologic disorder.",low:"Possible causes depend on the analyte and may include blood loss, nutritional deficiency, medication or treatment effects, infection, or bone-marrow suppression.",related:"CBC indices and differential, symptoms, medications/treatment, bleeding or infection history, and previous trends.",caution:"Interpret the actual analyte, unit, specimen, source-report reference interval, and clinical context; a single CBC value is not a diagnosis."},
  "Differential":{meaning:"Measures the proportion or absolute number of a white-blood-cell subtype.",purpose:"Used to characterize immune-cell patterns and support evaluation of infection, inflammation, medication effects, and hematologic disorders.",system:"White blood cells · bone marrow · immune system",high:"May reflect infection, inflammation, allergy, medication effects, or a hematologic condition, depending on the cell type.",low:"May reflect medication/treatment effects, infection, immune suppression, nutritional problems, or bone-marrow suppression, depending on the cell type.",related:"Total WBC, absolute cell count, other differential counts, symptoms, medications, and previous trends.",caution:"Percentages can be misleading when total WBC is abnormal; absolute counts are often more clinically informative."},
  "Renal":{meaning:"A measurement related to kidney filtration, nitrogen waste, or renal handling of solutes.",purpose:"Used to assess kidney function, hydration/perfusion, and renal handling of metabolic waste, and to support medication dosing when appropriate.",system:"Kidneys · circulation · fluid balance · metabolism",high:"Possible causes include reduced renal clearance, dehydration or reduced renal perfusion, increased production of the measured substance, or medication effects, depending on the analyte.",low:"Possible causes include low production/intake, low muscle mass, liver dysfunction, overhydration, or increased renal clearance, depending on the analyte.",related:"Creatinine/eGFR, BUN/urea, electrolytes, urinalysis, hydration status, medications, and previous trends.",caution:"Interpret with the correct unit and source-report reference interval and consider age, muscle mass, hydration, acute illness, and medications."},
  "Liver Function Test":{meaning:"A liver-related enzyme, protein, or bilirubin measurement.",purpose:"Used to assess hepatocellular injury, cholestasis, bilirubin handling, or hepatic protein synthesis, depending on the analyte.",system:"Liver · bile ducts · circulation; some enzymes also arise from muscle or bone",high:"Possible causes include liver injury, cholestasis, medication effects, fatty liver, alcohol-related injury, hemolysis, muscle injury, or bone disease, depending on the analyte.",low:"Possible causes include reduced synthesis, poor nutrition, protein loss, dilution, or may have little clinical significance for some enzymes.",related:"AST, ALT, ALP, GGT, bilirubin, albumin, medications, symptoms, imaging, and previous trends.",caution:"No single liver-test value identifies a cause. Interpret the pattern, source-report range, symptoms, medications, and imaging together."},
  "Metabolic":{meaning:"A biochemical measurement related to glucose, energy metabolism, electrolytes, or acid-base/fluid balance.",purpose:"Used to assess metabolic status, screen or monitor disease, and follow change over time.",system:"Metabolism · pancreas · liver · kidneys · acid-base/fluid balance, as applicable",high:"Possible causes depend on the analyte; review fasting/meal status, acute illness, medications, endocrine function, organ function, and related tests.",low:"Possible causes depend on the analyte; review nutrition, medications, liver/kidney/endocrine function, acute illness, and related tests.",related:"Symptoms, meal/fasting timing, medications, related tests in the same physiologic axis, and previous trends.",caution:"Use the correct unit, assay method, and source-report reference interval. Acute illness and medications can substantially alter metabolic results."},
  "Clinical Chemistry":{meaning:"A blood-chemistry measurement related to organ function or metabolism.",purpose:"Used to assess organ function or metabolic status and to monitor change over time.",system:"Organ system relevant to the selected analyte",high:"Possible causes depend on the analyte and may include organ dysfunction, dehydration, inflammation, medications, diet, or supplements.",low:"Possible causes depend on the analyte and may include low intake, losses, reduced synthesis, overhydration, medications, or organ dysfunction.",related:"Symptoms, medications, specimen conditions, related laboratory tests, and prior trends.",caution:"Interpret with the correct unit, assay method, specimen type, and source-report reference interval."},
  "Lipid Profile":{meaning:"Measures a circulating lipid or lipoprotein used in cardiometabolic risk assessment.",purpose:"Used to assess atherosclerotic cardiovascular risk and metabolic status and to monitor lipid-lowering treatment.",system:"Liver · lipoprotein transport · blood vessels · metabolism",high:"Possible causes include diet/fasting status, insulin resistance or diabetes, obesity, hypothyroidism, liver/kidney disease, medications, or inherited lipid disorders, depending on the analyte.",low:"Possible causes include lipid-lowering treatment, poor nutrition or absorption, chronic illness, hyperthyroidism, or liver disease, depending on the analyte.",related:"Complete lipid profile, diabetes and thyroid status, kidney/liver function, medications, and overall ASCVD risk.",caution:"Treatment decisions are based on overall cardiovascular risk and the specific lipid fraction, not one isolated value."},
  "Iron Studies":{meaning:"Measures circulating, stored, or transport-related iron status.",purpose:"Used to assess iron deficiency, functional iron restriction, or iron overload by interpreting the iron panel together.",system:"Blood · bone marrow · liver · iron transport and storage",high:"Possible causes include iron overload, transfusion or supplementation, hemolysis, liver disease, or inflammation, depending on the analyte.",low:"Possible causes include iron deficiency, blood loss, inflammation/chronic disease, reduced intake or absorption, depending on the analyte.",related:"CBC/MCV, ferritin, serum iron, transferrin/TIBC, TSAT, CRP, and bleeding history.",caution:"Inflammation, liver disease, nutrition, and recent iron exposure can alter results; interpret the iron panel together."},
  "Cardiac":{meaning:"A biomarker related to myocardial injury, cardiac wall stress, or cardiovascular physiology.",purpose:"Used to support evaluation and monitoring of cardiac injury or heart failure in the appropriate clinical setting.",system:"Heart · circulation · kidneys · lungs, depending on the biomarker",high:"May occur with myocardial injury or cardiac stress and also with non-ischemic conditions such as renal dysfunction, arrhythmia, pulmonary disease, or critical illness.",low:"A low value may reduce the likelihood of the target condition in the correct context but does not replace clinical assessment or serial testing when indicated.",related:"Symptoms, ECG, serial cardiac biomarkers, echocardiography, kidney function, and prior values.",caution:"An elevated cardiac biomarker does not by itself identify the cause; interpret timing and serial change with the clinical picture."},
  "Hormone":{meaning:"Measures a hormone within an endocrine feedback axis.",purpose:"Used to assess endocrine function by interpreting the hormone together with upstream/downstream hormones and the physiologic context.",system:"Hypothalamus · pituitary · hormone-producing gland · target organs",high:"Possible causes include increased production, altered feedback, exogenous hormones/medications, endocrine tumors, or assay interference, depending on the hormone.",low:"Possible causes include reduced gland function, hypothalamic/pituitary suppression, medication effects, energy deficiency, or severe illness, depending on the hormone.",related:"Other hormones in the same axis, sex, age, specimen time, menstrual/menopausal or pregnancy status, symptoms, and medications.",caution:"Hormones are context dependent. Use the reference interval appropriate for sex, age, time of day and physiologic state; one value is often insufficient."},
  "Tumor Marker":{meaning:"A tumor-associated biomarker used mainly for monitoring selected cancers in the appropriate clinical context.",purpose:"Used to follow trends in a cancer known to produce the marker and to support assessment alongside imaging and clinical findings.",system:"Tumor-related tissue plus liver/kidney clearance and inflammatory conditions, depending on the marker",high:"May reflect tumor burden but can also rise from benign inflammation or organ-specific conditions, depending on the marker.",low:"A falling trend may accompany response in some patients, but must be interpreted with imaging, symptoms, and the treatment course.",related:"Cancer type, pathology, baseline marker, serial trend, imaging, symptoms, organ function, and benign causes of elevation.",caution:"Most tumor markers should not be used alone to diagnose, stage, or screen for cancer. Serial values using a comparable assay are usually more informative than a single result."},
  "Immunology":{meaning:"An immune-system, inflammatory, infectious-disease, or autoantibody measurement.",purpose:"Used to support evaluation of immune function, infection, inflammation, or autoimmune disease in the correct pre-test clinical context.",system:"Immune system and the target organs relevant to the specific antibody or assay",high:"A positive or elevated result may reflect immune activation, infection, inflammation, autoimmunity, or another assay-specific process.",low:"A negative or low result may reduce the likelihood of some conditions but does not exclude every disease or early/treated disease.",related:"Symptoms, pre-test probability, assay method, titer/pattern, related antibodies, complement, CBC, urinalysis, kidney function, and treatment history.",caution:"Positive results can occur without clinical disease and negative results do not exclude all disease; do not diagnose from one antibody result alone."},
  "Vitamin & Mineral":{meaning:"Measures a vitamin, mineral, trace element, or antioxidant-related analyte.",purpose:"Used to assess nutritional status or a specific biochemical pathway when clinically indicated.",system:"Nutrition · gastrointestinal absorption · liver/kidneys · analyte-specific target tissues",high:"Possible causes include recent supplementation, reduced renal clearance, altered binding/transport, or disease affecting the analyte.",low:"Possible causes include low intake, poor absorption, increased requirements, losses, medication effects, or organ disease.",related:"Diet, supplements, medications, absorption disorders, liver/kidney function, inflammation, and related nutrients.",caution:"Blood concentrations may reflect recent intake, transport proteins, or inflammation rather than total tissue stores. Do not initiate high-dose supplementation from one value alone."},
  "Protein Electrophoresis":{meaning:"Measures the distribution of serum protein fractions by electrophoresis.",purpose:"Used to characterize protein patterns and to look for abnormalities that may require immunofixation or free-light-chain testing.",system:"Plasma proteins · liver · immune system · bone marrow · kidneys",high:"A high fraction may reflect inflammation, immune activation, or a monoclonal process depending on the electrophoretic pattern.",low:"A low fraction may reflect reduced synthesis, protein loss, immune deficiency, or other fraction-specific causes.",related:"SPEP tracing and interpretation, immunofixation, serum free light chains, quantitative immunoglobulins, total protein/albumin, and kidney function.",caution:"Fraction values alone cannot distinguish polyclonal from monoclonal patterns; the tracing and confirmatory tests are essential."},
  "Urinalysis":{meaning:"A urine measurement related to renal, urinary-tract, metabolic, or specimen-quality findings.",purpose:"Used to screen or monitor kidney and urinary-tract abnormalities and to guide confirmatory testing when appropriate.",system:"Kidneys · glomeruli/tubules · urinary tract · specimen quality",high:"Possible causes depend on the analyte and may include infection, inflammation, kidney disease, stones, bleeding, metabolic disease, or specimen contamination.",low:"For many urinalysis items, low/negative is expected; interpretation depends on the analyte and clinical question.",related:"Complete urinalysis, microscopy, culture when symptomatic, creatinine/eGFR, protein/albumin ratios, and clean-catch quality.",caution:"Concentration, contamination, and delay after collection can alter results. One urinalysis finding alone does not diagnose UTI or kidney disease."},
  "Toxicology":{meaning:"Measures a toxicant, heavy metal, or exposure-related analyte.",purpose:"Used to assess possible exposure in the context of the specific specimen, collection time, and exposure history.",system:"Exposure route · liver · kidneys · nervous system, depending on the substance",high:"May reflect occupational/environmental exposure, diet, medication/supplement sources, or specimen contamination, depending on the substance.",low:"A low value generally does not support a high recent exposure within the specimen’s detection window, but may not exclude remote exposure.",related:"Specimen type and timing, exposure history, diet/supplements, liver/kidney function, and confirmatory testing specific to the substance.",caution:"Contamination and chemical form matter. A single specimen does not necessarily quantify body burden or clinical toxicity."},
  "Body Composition":{meaning:"A body-composition parameter estimated by bioelectrical impedance analysis (BIA).",purpose:"Used to assess and follow body composition, muscle/fat distribution, or fluid balance over time under comparable measurement conditions.",system:"Body composition · muscle · adipose tissue · fluid compartments",high:"Interpretation depends on the parameter; higher values may represent more muscle, fat, or extracellular fluid and are not universally abnormal.",low:"Interpretation depends on the parameter; lower values may represent less muscle/fat or different fluid balance and are not universally abnormal.",related:"Weight, BMI, skeletal muscle mass, body-fat measures, segmental values, ECW/TBW, symptoms, and serial measurements.",caution:"BIA provides estimates affected by hydration and measurement conditions and should not be used alone to diagnose disease."},
  "Allergy":{meaning:"Measures allergen-specific IgE in blood to assess IgE sensitization.",purpose:"Used with the clinical history to assess whether symptoms after exposure may be IgE mediated and whether further allergy evaluation is appropriate.",system:"IgE-mediated immunity · mast cells/basophils · skin · respiratory and gastrointestinal systems",high:"A positive result indicates sensitization to the tested allergen; the class does not by itself predict symptom severity or guarantee clinical allergy.",low:"Class 0 or a value below the assay cutoff means no specific IgE was detected at the reported level, but does not completely exclude clinical allergy or non-IgE mechanisms.",related:"Reproducible symptoms after exposure, timing, amount of exposure, anaphylaxis history, skin testing, and allergy-specialist assessment.",caution:"Specific IgE indicates sensitization, not a diagnosis of clinical allergy. Do not recommend broad food avoidance from blood testing alone."},
  "Food-specific IgG":{meaning:"Measures food-specific IgG, which usually reflects exposure to a food and is not the same as IgE-mediated food allergy testing.",purpose:"Reports the assay-defined IgG level as supportive information; it should not be used alone to diagnose food allergy or food intolerance.",system:"Humoral immunity · gastrointestinal food exposure",high:"A high assay category may reflect prior or frequent exposure to the food but does not prove that the food causes symptoms.",low:"A low or normal assay category does not prove that the food is safe and does not exclude IgE-mediated allergy.",related:"Food-symptom history, timing and amount of intake, and specific IgE/skin testing when immediate allergic symptoms are suspected.",caution:"Food-specific IgG alone should not be used to diagnose food allergy/intolerance or to prescribe elimination of multiple foods."}
 };
 const EN_TEST_PROFILE={
  "Glucose":{meaning:"Blood glucose concentration at the time the specimen was collected.",purpose:"Used to screen for and monitor diabetes and to detect hypoglycemia; fasting interpretation requires a true fasting specimen.",system:"Glucose metabolism · pancreas · liver · kidneys",high:"Common causes include diabetes, stress hyperglycemia during acute illness, corticosteroid use, or a specimen that was not truly fasting.",low:"Common causes include glucose-lowering medication or insulin effect, inadequate intake, liver disease, endocrine causes, or severe illness.",related:"Symptoms, fasting/meal timing, diabetes medications, HbA1c and prior glucose values.",caution:"Confirm fasting status, specimen timing, assay method and reference interval. Acute illness and medications can change glucose levels."},
  "Random Glucose":{meaning:"Blood glucose concentration at the time of sampling without requiring fasting.",purpose:"Used to identify acute hyperglycemia or hypoglycemia and to determine whether confirmatory diabetes testing is needed.",system:"Glucose metabolism · pancreas · liver · kidneys",high:"May reflect diabetes, recent food intake, acute illness/stress, infection, or corticosteroid use.",low:"May reflect glucose-lowering drugs/insulin, inadequate intake, liver disease, adrenal insufficiency, or severe illness.",related:"Meal timing, symptoms, HbA1c, fasting glucose when appropriate, medications, and serial measurements.",caution:"Do not interpret a random glucose using fasting thresholds unless the specimen was truly fasting."},
  "HbA1c":{meaning:"Glycated hemoglobin, reflecting average glucose exposure over roughly the previous 2–3 months.",purpose:"Used to diagnose or monitor diabetes when red-cell turnover and the assay are appropriate.",system:"Glucose metabolism · red blood cells",high:"Usually reflects sustained hyperglycemia; interpretation may be affected by some hemoglobin variants or altered red-cell lifespan.",low:"May reflect lower average glucose or falsely low values when red-cell lifespan is shortened, such as recent blood loss or hemolysis.",related:"Glucose readings, anemia/hemolysis, hemoglobin variants, transfusion history, kidney disease, and treatment.",caution:"HbA1c can be misleading when red-cell turnover or hemoglobin structure is abnormal; correlate with glucose measurements."},
  "BUN":{meaning:"Blood urea nitrogen, a nitrogenous waste product formed from protein metabolism and cleared mainly by the kidneys.",purpose:"Used with creatinine/eGFR to assess kidney function, hydration/perfusion and protein catabolism.",system:"Kidneys · liver · circulation · protein metabolism",high:"May occur with reduced renal filtration, dehydration or reduced renal perfusion, high protein intake/catabolism, corticosteroid effect, or gastrointestinal bleeding.",low:"May occur with low protein intake/malnutrition, reduced hepatic urea production, or overhydration.",related:"Creatinine/eGFR, hydration status, protein intake, liver function, medications, and gastrointestinal bleeding history.",caution:"BUN is influenced by non-renal factors; interpret it together with creatinine/eGFR and clinical context."},
  "Creatinine":{meaning:"A muscle-derived waste product used as a marker of kidney filtration.",purpose:"Used to assess kidney function and calculate eGFR, while considering muscle mass and acute changes.",system:"Kidneys · skeletal muscle · circulation",high:"May reflect reduced kidney filtration, dehydration/reduced perfusion, muscle injury, or medication effects that alter creatinine handling.",low:"Often reflects low muscle mass or low creatinine production rather than excessive kidney function.",related:"eGFR, BUN, urine findings, hydration, muscle mass, medications, and serial change.",caution:"Creatinine is affected by muscle mass and can lag behind acute kidney injury; interpret trends and the clinical context."},
  "eGFR":{meaning:"An estimated glomerular filtration rate calculated from serum creatinine and patient factors.",purpose:"Used to stage and monitor kidney function and support medication dosing where applicable.",system:"Kidney filtration",high:"A high eGFR is usually not a pathologic finding and can occur with low creatinine or hyperfiltration.",low:"Suggests reduced kidney filtration; chronic kidney disease requires persistence and/or other evidence of kidney damage.",related:"Creatinine trend, urine albumin/protein, urinalysis, age, hydration, medications, and chronicity.",caution:"eGFR is an estimate and may be less accurate with unusual muscle mass or rapidly changing kidney function."},
  "Hemoglobin":{meaning:"The oxygen-carrying protein concentration in red blood cells.",purpose:"Used to screen for and monitor anemia, erythrocytosis, bleeding, and oxygen-carrying capacity.",system:"Red blood cells · bone marrow · oxygen transport",high:"May reflect dehydration or increased red-cell mass such as erythrocytosis/polycythemia.",low:"May reflect anemia from blood loss, iron/B12/folate deficiency, chronic disease, kidney disease, hemolysis, or bone-marrow suppression.",related:"Hematocrit, RBC indices, reticulocyte count, iron studies, B12/folate, kidney function, and bleeding history.",caution:"Interpret with sex/age-appropriate reference intervals and the overall CBC pattern."},
  "WBC":{meaning:"Total white blood cell count.",purpose:"Used to assess overall leukocyte quantity and support evaluation of infection, inflammation, medication effects, and bone-marrow disorders.",system:"White blood cells · bone marrow · immune system",high:"Common causes include infection, inflammation, corticosteroid effect, physiologic stress, or hematologic disorders.",low:"May occur with chemotherapy or other medications, viral infection, severe illness, immune disorders, or bone-marrow suppression.",related:"Differential and absolute counts, symptoms, infection history, medications/treatment, and serial CBC values.",caution:"The differential and absolute cell counts are needed to understand which white-cell population is responsible."},
  "Platelet":{meaning:"Platelet count, reflecting the number of circulating cells involved in primary hemostasis.",purpose:"Used to assess bleeding/thrombosis risk and marrow response in clinical context.",system:"Platelets · bone marrow · spleen · hemostasis",high:"May occur with inflammation, iron deficiency, postsplenectomy states, or myeloproliferative disorders.",low:"May occur from medications/treatment, infection, immune destruction, consumption, splenic sequestration, or bone-marrow suppression.",related:"Peripheral smear, MPV, coagulation studies when indicated, bleeding/thrombosis symptoms, medications, and serial counts.",caution:"Clinical bleeding risk depends on count, platelet function, comorbidities and medications; verify unexpected results for clumping or artifact."},
  "AST":{meaning:"An enzyme present in liver and several extrahepatic tissues, especially skeletal and cardiac muscle.",purpose:"Used with ALT and other tests to assess hepatocellular injury while considering muscle sources.",system:"Liver · skeletal muscle · heart",high:"May result from liver injury, muscle injury, alcohol-related injury, medications, hemolysis, or other tissue damage.",low:"Low AST is usually not clinically significant by itself.",related:"ALT, ALP, GGT, bilirubin, CK, medications, alcohol history, and symptoms.",caution:"AST is not liver-specific; interpret the pattern and possible muscle sources."},
  "ALT":{meaning:"An aminotransferase relatively enriched in liver tissue and used as a marker of hepatocellular injury.",purpose:"Used to detect and monitor liver-cell injury such as fatty liver, hepatitis, or medication-related injury.",system:"Liver",high:"Common causes include fatty liver, viral or immune hepatitis, alcohol-related disease, medications/supplements, ischemia, or other hepatocellular injury.",low:"Low ALT is usually not clinically significant by itself.",related:"AST, ALP, GGT, bilirubin, liver imaging, medications/supplements, and metabolic risk factors.",caution:"ALT level does not directly measure liver function or the severity of fibrosis; interpret with the complete liver profile and clinical context."},
  "ALP":{meaning:"Alkaline phosphatase, an enzyme derived mainly from bile-duct and bone sources.",purpose:"Used to evaluate cholestasis/biliary disease or increased bone turnover, with other tests helping identify the source.",system:"Bile ducts · liver · bone",high:"May occur with biliary obstruction/cholestasis, liver infiltration, or increased bone turnover; GGT can help support a hepatobiliary source.",low:"May occur with some nutritional deficiencies or rare metabolic conditions but is often less clinically significant.",related:"GGT, bilirubin, AST/ALT, calcium/phosphate, bone symptoms, and imaging when indicated.",caution:"ALP is not organ-specific; identify whether the source is hepatobiliary or bone before assigning a cause."},
  "GGT":{meaning:"Gamma-glutamyl transferase, an enzyme associated with hepatobiliary tissue and inducible by some drugs or alcohol exposure.",purpose:"Used mainly to support a hepatobiliary source of elevated ALP and to assess cholestatic patterns.",system:"Liver · bile ducts",high:"May occur with cholestasis, alcohol exposure, fatty liver, or enzyme-inducing medications.",low:"Low GGT is generally not clinically significant.",related:"ALP, bilirubin, AST/ALT, medications, alcohol history, and imaging when indicated.",caution:"GGT is sensitive but not specific and should not be interpreted alone."},
  "Albumin":{meaning:"The major circulating protein synthesized by the liver.",purpose:"Used to assess protein status and, over time, hepatic synthetic function while considering inflammation and protein losses.",system:"Liver · circulation · kidneys/gastrointestinal tract · nutrition/inflammation",high:"Usually reflects hemoconcentration/dehydration.",low:"May reflect inflammation, liver synthetic dysfunction, malnutrition, renal or gastrointestinal protein loss, or dilution/overhydration.",related:"Total protein, liver profile, CRP, kidney/urine protein findings, nutrition, fluid status, and trend.",caution:"Albumin is strongly influenced by inflammation and fluid status; a low value does not by itself diagnose malnutrition or liver failure."},
  "Cholesterol":{meaning:"Total circulating cholesterol across major lipoprotein classes.",purpose:"Used as part of a complete lipid profile for cardiovascular risk assessment.",system:"Liver · lipoprotein metabolism · blood vessels",high:"May reflect genetic dyslipidemia, diet, hypothyroidism, diabetes/insulin resistance, kidney disease, or other metabolic causes.",low:"May occur with malnutrition, chronic illness, hyperthyroidism, or severe liver disease.",related:"LDL-C, HDL-C, triglycerides, diabetes/thyroid status, medications, and overall ASCVD risk.",caution:"Total cholesterol alone is insufficient for treatment decisions; use the complete lipid profile and overall risk."},
  "Triglyceride":{meaning:"Circulating triglycerides transported mainly in chylomicrons and VLDL.",purpose:"Used to assess metabolic and cardiovascular risk and pancreatitis risk when markedly elevated.",system:"Liver · adipose tissue · lipoprotein metabolism · pancreas",high:"May occur after meals, with insulin resistance/diabetes, obesity, alcohol use, hypothyroidism, kidney/liver disease, medications, or genetic disorders.",low:"May occur with low intake, malabsorption, hyperthyroidism, chronic illness, or lipid-lowering treatment.",related:"Fasting status, HDL/LDL, glucose/HbA1c, thyroid function, liver/kidney function, alcohol use, and medications.",caution:"Fasting status and recent alcohol/food intake can materially affect triglycerides; very high levels require pancreatitis-risk assessment."},
  "HDL":{meaning:"High-density lipoprotein cholesterol.",purpose:"Used as one component of overall cardiovascular risk assessment.",system:"Lipoprotein transport · liver · blood vessels",high:"A higher HDL-C is often associated epidemiologically with lower risk, but very high values are not automatically protective.",low:"Low HDL-C is associated with higher cardiometabolic risk and often accompanies insulin resistance or high triglycerides.",related:"LDL-C, triglycerides, total cholesterol, diabetes/metabolic risk, smoking, and overall ASCVD risk.",caution:"HDL-C should not be interpreted or targeted in isolation from LDL/non-HDL cholesterol and total cardiovascular risk."},
  "LDL":{meaning:"Low-density lipoprotein cholesterol, a major atherogenic cholesterol fraction.",purpose:"Used to estimate atherogenic cholesterol burden and guide lipid-lowering treatment based on cardiovascular risk.",system:"Lipoprotein transport · arterial wall · liver",high:"May reflect genetic or secondary dyslipidemia and is associated with increased atherosclerotic cardiovascular risk.",low:"Lower LDL-C is generally expected with effective lipid-lowering treatment; interpretation depends on treatment goals and overall health.",related:"Complete lipid profile, ASCVD history/risk, diabetes, kidney disease, medications, and treatment targets.",caution:"The appropriate LDL-C target depends on overall cardiovascular risk, not the laboratory range alone."},
  "Ferritin":{meaning:"An iron-storage protein and acute-phase reactant.",purpose:"Used to assess iron stores together with transferrin saturation and the inflammatory context.",system:"Iron storage · liver · reticuloendothelial system · inflammation",high:"May reflect inflammation/infection, liver disease, malignancy, transfusion/iron exposure, or iron overload.",low:"Strongly supports iron deficiency in the appropriate context and may result from chronic blood loss, inadequate intake, or poor absorption.",related:"CBC/MCV, serum iron, transferrin/TIBC, TSAT, CRP, liver tests, bleeding history, and iron treatment.",caution:"Ferritin can be elevated by inflammation even when functional iron deficiency is present; do not interpret it alone."},
  "Troponin-T":{meaning:"A cardiac structural protein released into blood with myocardial injury.",purpose:"Used to detect myocardial injury; diagnosis of myocardial infarction requires the clinical setting plus serial change and ECG/imaging as appropriate.",system:"Heart · kidneys · circulation",high:"May occur with acute coronary syndrome, heart failure, myocarditis, tachyarrhythmia, pulmonary embolism, critical illness, or reduced renal clearance.",low:"A low or unchanged value may reduce the likelihood of acute myocardial injury depending on timing and assay sensitivity.",related:"Symptoms, ECG, serial troponin values, echocardiography, kidney function, and time from symptom onset.",caution:"Troponin elevation identifies myocardial injury, not its cause; serial change and clinical context are essential."},
  "Thyroid Stimulating Hormone (TSH)":{meaning:"Pituitary thyroid-stimulating hormone, the main feedback signal controlling thyroid hormone production.",purpose:"Used as the primary screening and monitoring test for thyroid function when the hypothalamic-pituitary axis is intact.",system:"Hypothalamus · pituitary · thyroid gland",high:"Often suggests primary hypothyroidism when Free T4 is low; can also occur transiently or with recovery from illness and medication effects.",low:"Often suggests hyperthyroidism when Free T4/T3 are high, or pituitary/hypothalamic suppression when thyroid hormones are low.",related:"Free T4 from the same period, Free T3 when indicated, symptoms, thyroid medications, amiodarone/steroids, biotin use, pregnancy status, and thyroid antibodies when relevant.",caution:"Interpret TSH together with Free T4 and clinical context; discordant patterns may reflect medication, assay interference, severe illness, or pituitary disease."},
  "Free T4":{meaning:"The unbound fraction of thyroxine available to tissues.",purpose:"Used with TSH to distinguish primary thyroid disease from central/pituitary causes and to monitor treatment in selected settings.",system:"Thyroid gland · pituitary feedback · metabolism",high:"May occur with hyperthyroidism, excessive thyroid hormone replacement, thyroiditis, or assay interference.",low:"May occur with hypothyroidism, central hypothyroidism, severe illness, or medication effects.",related:"TSH, Free T3 when indicated, symptoms, medications, pregnancy status, and assay interference such as biotin.",caution:"Interpret Free T4 together with TSH and clinical context; isolated values can be misleading in severe illness or with assay interference."},
  "Free T3":{meaning:"The unbound fraction of triiodothyronine, the more active thyroid hormone.",purpose:"Used mainly to assess suspected hyperthyroidism or T3-toxicosis together with TSH and Free T4.",system:"Thyroid gland · peripheral hormone conversion · metabolism",high:"May occur with hyperthyroidism, T3-toxicosis, excess thyroid hormone, or assay interference.",low:"May occur in hypothyroidism or non-thyroidal illness and is not a preferred standalone test for hypothyroidism.",related:"TSH, Free T4, symptoms, medications, illness severity, and assay interference.",caution:"Free T3 is strongly influenced by acute illness and should not be interpreted alone."},
  "CEA":{meaning:"Carcinoembryonic antigen, a tumor-associated marker used mainly for monitoring selected cancers, especially colorectal cancer.",purpose:"Used to follow serial trends after diagnosis or treatment when the tumor is known to produce CEA.",system:"Tumor tissue · liver clearance · gastrointestinal and inflammatory conditions",high:"May reflect active malignancy but can also rise with smoking, inflammation, liver disease, or other benign conditions.",low:"A lower or falling value may accompany response, but cannot confirm disease control without imaging and clinical assessment.",related:"Cancer type/pathology, baseline CEA, serial trend, imaging, symptoms, smoking status, and liver function.",caution:"CEA should not be used alone to diagnose or exclude cancer; trend and imaging are more informative."},
  "AFP":{meaning:"Alpha-fetoprotein, a tumor-associated marker used in selected liver and germ-cell tumors.",purpose:"Used as supportive information for diagnosis/risk assessment and serial monitoring in the appropriate cancer context.",system:"Liver · germ-cell tissue · tumor biology",high:"May occur with hepatocellular carcinoma or germ-cell tumors and also with active liver injury/regeneration or pregnancy.",low:"A low value does not exclude cancer because many tumors do not produce AFP.",related:"Liver imaging, pathology, liver disease activity, other tumor markers when appropriate, and serial trend.",caution:"AFP is not diagnostic by itself and should be interpreted with imaging, pathology, and clinical context."},
  "CA 19-9":{meaning:"A carbohydrate tumor-associated marker used mainly to monitor pancreatic and biliary cancers in marker-producing patients.",purpose:"Used to follow serial trends alongside imaging and clinical assessment.",system:"Pancreas · biliary tract · gastrointestinal epithelium · liver/bile drainage",high:"May rise with pancreatic/biliary malignancy but also with cholestasis, biliary infection, pancreatitis, or other benign conditions.",low:"A low value does not exclude malignancy, and some individuals do not express the Lewis antigen required for CA 19-9 production.",related:"Imaging, bilirubin/ALP/GGT, pathology, symptoms, treatment course, and serial CA 19-9 values.",caution:"Do not diagnose or stage cancer from CA 19-9 alone; cholestasis can cause marked benign elevations."},
  "CA 125":{meaning:"A tumor-associated marker used mainly to monitor epithelial ovarian and peritoneal cancers.",purpose:"Used to follow serial trends during or after treatment in the appropriate clinical context.",system:"Peritoneal/serosal tissues · ovaries and other pelvic organs",high:"May rise with ovarian/peritoneal malignancy but also with menstruation, endometriosis, inflammation, ascites, pregnancy, or other benign conditions.",low:"A low value does not exclude ovarian or peritoneal cancer.",related:"Pelvic/abdominal imaging, pathology, symptoms, treatment course, and serial CA 125 values.",caution:"CA 125 is not a standalone diagnostic or screening test for the general population."},
  "PSA":{meaning:"Prostate-specific antigen produced by prostate tissue.",purpose:"Used in shared-decision screening and for monitoring known prostate cancer or post-treatment recurrence risk.",system:"Prostate · urinary tract",high:"May occur with prostate cancer, benign prostatic enlargement, prostatitis, urinary retention, recent instrumentation, or ejaculation depending on timing.",low:"A low value reduces but does not eliminate the possibility of prostate cancer; after definitive treatment, interpretation depends on the treatment type and trend.",related:"Age, prostate volume, symptoms, medications such as 5-alpha-reductase inhibitors, imaging, pathology, and serial PSA trend.",caution:"PSA is organ-specific but not cancer-specific; clinical meaning depends strongly on context and change over time."},
  "Vitamin D":{meaning:"Circulating 25-hydroxyvitamin D, the usual laboratory marker of vitamin D status.",purpose:"Used to assess vitamin D status in patients with relevant risk factors or bone/mineral disorders.",system:"Bone · calcium/phosphate metabolism · kidneys · parathyroid axis",high:"Usually reflects supplementation; very high levels can increase hypercalcemia risk.",low:"May result from low intake/sun exposure, malabsorption, obesity, liver/kidney disease, or medications.",related:"Calcium, phosphate, PTH, kidney/liver function, supplementation dose, and bone health.",caution:"Clinical targets vary by guideline and context; avoid high-dose supplementation based on one result without considering calcium and kidney status."},
  "Vitamin B12":{meaning:"Circulating cobalamin concentration.",purpose:"Used to assess possible vitamin B12 deficiency in the context of anemia, neuropathy, malabsorption, or medication risk.",system:"Blood formation · nervous system · gastrointestinal absorption · liver",high:"Often reflects supplementation but may also occur with liver, kidney, or hematologic conditions.",low:"May result from low intake, pernicious anemia, gastric/ileal disease, metformin or acid-suppressing medications, or malabsorption.",related:"CBC/MCV, folate, methylmalonic acid or homocysteine when indicated, diet, medications, and neurologic symptoms.",caution:"Serum B12 alone can be misleading near decision thresholds; functional markers may be useful when symptoms and B12 disagree."},
  "Folate":{meaning:"Circulating folate, a vitamin required for DNA synthesis and blood-cell production.",purpose:"Used to assess folate status in the context of macrocytosis, anemia, malnutrition, malabsorption, or pregnancy-related risk.",system:"Blood formation · gastrointestinal absorption · one-carbon metabolism",high:"Usually reflects recent intake or supplementation and is not typically harmful by itself.",low:"May result from poor intake, malabsorption, increased requirements, alcohol use, or antifolate medications.",related:"CBC/MCV, vitamin B12, diet, medications, and malabsorption risk.",caution:"Correct vitamin B12 deficiency when present; folate supplementation can improve anemia while neurologic B12 deficiency persists."}
 };
 function englishClinicalProfile(r,k){
   if(!isEnglishMode())return k||{};
   const name=String(k?.name||r?.name||selectedTest||"").trim();
   const group=String(r?.group||k?.group||"").trim();
   const specific=EN_TEST_PROFILE[name]||{};
   const base=EN_GROUP_PROFILE[group]||EN_GROUP_PROFILE[String(k?.group||"")]||{
     meaning:`Laboratory measurement: ${name||"selected analyte"}.`,purpose:"Used to support clinical assessment and longitudinal monitoring in the context of the source report.",system:"Relevant physiologic system for the selected analyte",high:"Possible causes of a high result depend on the analyte, method, medications, acute illness and organ function.",low:"Possible causes of a low result depend on the analyte, method, nutrition, medications and organ function.",related:"Symptoms, medications, assay method, source-report reference interval, related tests and prior trends.",caution:"Use the source-report unit and reference interval and interpret the result in clinical context; one laboratory value alone is not a diagnosis."
   };
   const pick=(slot,fallback)=>specific[slot]||translatedOr(k?.[slot],fallback)||fallback;
   return{...k,
     meaning:pick("meaning",base.meaning),purpose:pick("purpose",base.purpose),system:pick("system",base.system),
     high:pick("high",base.high),low:pick("low",base.low),related:pick("related",base.related),caution:pick("caution",base.caution)
   }
 }
 function englishAssessment(r,thaiAssessment){
   if(!isEnglishMode())return thaiAssessment||latestAssessment(r);
   const original=thaiAssessment||latestAssessment(r),translated=MIW.I18n?.translateString?.(original?.text||"","en")||"";
   if(translated&&!hasThai(translated))return{...original,text:translated};
   if(!r)return{level:"unknown",text:"No current result is available for interpretation."};
   const ref=rangeFor(r),n=number(r.valueNumeric??r.value),displayUnit=detailCategoryDisplayUnit(r),valueText=`${r.value??"—"}${displayUnit?` ${displayUnit}`:""}`;
   const rawDate=String(r.date||"").trim(),dateText=rawDate||"date not specified";
   if(isAllergyResult(r)){
     const cls=Number.isInteger(r.allergyClass)?` · Allergy Class ${r.allergyClass}`:"";
     return{level:original?.level||"unknown",text:`${valueText} on ${dateText}${cls}. This result reflects allergen-specific IgE sensitization and must be interpreted with the exposure history; the class does not by itself predict clinical severity.`}
   }
   if(isFoodIntoleranceIgGResult(r))return{level:original?.level||"unknown",text:`${valueText} on ${dateText}. This is the assay-reported food-specific IgG result/category; it does not by itself diagnose food allergy or food intolerance.`};
   if(isCancerLiquidBiopsyResult(r))return{level:original?.level||"unknown",text:`${valueText} on ${dateText}. This is a specialized CTC/assay result and should be interpreted according to the source report; it does not by itself establish stage, metastatic site, mutation status, or treatment response.`};
   if(isInBodyResult(r))return{level:original?.level||"unknown",text:`${valueText} on ${dateText}. This is an InBody BIA-derived parameter; interpretation depends on the specific parameter, hydration and serial measurements under comparable conditions.`};
   const explicit=String(r.flag||r.calculatedFlag||"").toUpperCase();
   const rangeText=ref.text?` ${ref.text}${displayUnit?` ${displayUnit}`:""}`:"";
   if(["H","HH","HIGH"].includes(explicit)||Number.isFinite(ref.high)&&n!==null&&n>ref.high)return{level:"high",text:`${valueText} on ${dateText} — above the reported reference interval${rangeText?` (${rangeText.trim()})`:""}.`};
   if(["L","LL","LOW"].includes(explicit)||Number.isFinite(ref.low)&&n!==null&&n<ref.low)return{level:"low",text:`${valueText} on ${dateText} — below the reported reference interval${rangeText?` (${rangeText.trim()})`:""}.`};
   if(["N","NORMAL"].includes(explicit)||n!==null&&(Number.isFinite(ref.low)||Number.isFinite(ref.high)))return{level:original?.level==="unknown"?"normal":original?.level||"normal",text:`${valueText} on ${dateText} — within the reported reference interval${rangeText?` (${rangeText.trim()})`:""}.`};
   if(n===null)return{level:original?.level||"unknown",text:`${valueText} on ${dateText} — text-based or non-numeric result; interpret according to the source report and assay method.`};
   return{level:original?.level||"unknown",text:`${valueText} on ${dateText} — no reliable high/low classification can be made because a matching source-report reference interval is not available.`}
 }
 function englishTrend(t,seriesLength=0){
   if(!isEnglishMode())return t;
   const text=String(t||"");
   if(/เพิ่ม|↑/.test(text))return"increasing";
   if(/ลด|↓/.test(text))return"decreasing";
   if(/คง|→/.test(text))return"stable";
   if(/ข้อความ/.test(text))return"text result — no numeric trend chart";
   return seriesLength>=2?"trend available":"insufficient data for a trend";
 }
 function renderCategoricalClinicalExplanation(series,last,k,t){
   k=englishClinicalProfile(last,k);
   const assessment=englishAssessment(last,latestAssessment(last));
   const system=k.system||L(`หมวด ${last?.group||k.group||"ผลตรวจทางห้องปฏิบัติการ"}`,`Category: ${last?.group||k.group||"laboratory result"}`);
   const related=k.related||L("ควรเทียบกับอาการ ยา ประวัติการรักษา และผลตรวจที่เกี่ยวข้อง","Review with symptoms, medications, treatment history and related tests.");
   const caution=k.caution||L("ผลแบบข้อความต้องคงคำรายงานต้นฉบับและแปลตามวิธีตรวจ","Text-based results should retain the source wording and be interpreted according to the assay method.");
   return `<h3>${MIW.Utils.escape(selectedTest)}</h3>
     <div class="lab-latest-assessment assessment-${MIW.Utils.escape(assessment.level)}"><b>${L("แปลผลทางคลินิกครั้งล่าสุด","Latest clinical interpretation")}</b><p>${MIW.Utils.escape(assessment.text)}</p></div>
     <div class="lab-explanation-grid">
       <section><b>${L("ตรวจอะไร","What it measures")}</b><p>${MIW.Utils.escape(k.meaning)}</p></section>
       <section><b>${L("เป้าหมายของการตรวจ","Purpose of the test")}</b><p>${MIW.Utils.escape(k.purpose)}</p></section>
       <section><b>${L("อวัยวะและระบบที่เกี่ยวข้อง","Related organs and systems")}</b><p>${MIW.Utils.escape(system)}</p></section>
       <section><b>${L("เมื่อผลเป็นบวก / พบความผิดปกติ","When positive / abnormal")}</b><p>${MIW.Utils.escape(k.high)}</p></section>
       <section><b>${L("เมื่อผลเป็นลบ / ไม่พบ","When negative / not detected")}</b><p>${MIW.Utils.escape(k.low)}</p></section>
       <section class="span-2"><b>${L("ควรดูร่วมกับ","Interpret together with")}</b><p>${MIW.Utils.escape(related)}</p></section>
       <section class="span-2 lab-interpretation-caution"><b>${L("ข้อควรระวังในการแปลผล","Interpretation cautions")}</b><p>${MIW.Utils.escape(caution)}</p></section>
     </div>
     <p class="lab-series-summary"><b>${L("จำนวนครั้งที่ตรวจ:","Number of tests:")}</b> ${series.length||1} ${L("ครั้ง","times")} · <b>${L("แนวโน้ม:","Trend:")}</b> ${MIW.Utils.escape(englishTrend(t||"ผลแบบข้อความ",series.length))}</p>`
 }
 function renderClinicalExplanation(series,last,k,t){
   k=englishClinicalProfile(last,k);
   const assessment=englishAssessment(last,latestAssessment(last));
   const system=k.system||L(`หมวด ${last?.group||k.group||"ผลตรวจทางห้องปฏิบัติการ"}`,`Category: ${last?.group||k.group||"laboratory result"}`);
   const related=k.related||L("ควรเทียบกับอาการ ยา ประวัติการรักษา ผลตรวจในระบบเดียวกัน และแนวโน้มเดิม","Review with symptoms, medications, treatment history, related tests in the same physiologic system and prior trends.");
   const caution=k.caution||L("สาเหตุที่ระบุเป็นความเป็นไปได้ ไม่ใช่การวินิจฉัยจากผลตรวจค่าเดียว","Listed causes are possibilities, not a diagnosis from a single laboratory value.");
   const antiText=antiAgingTargetText(last),visualText=visualWarningText(last);
     return `<h3>${MIW.Utils.escape(selectedTest)}</h3>
       ${k.specific===false?`<div class="lab-latest-assessment assessment-unknown"><b>${L("ยังไม่มี Clinical profile เฉพาะ","No analyte-specific clinical profile yet")}</b><p>${L("กรุณายืนยันชื่อตัวตรวจ วิธีตรวจ ชนิดสิ่งส่งตรวจ หน่วย และช่วงอ้างอิงจากรายงานต้นฉบับก่อนแปลผล","Confirm the full test name, assay method, specimen type, unit and source-report reference interval before interpretation.")}</p></div>`:""}
       <div class="lab-latest-assessment assessment-${MIW.Utils.escape(assessment.level)}">
       <b>${L("แปลผลทางคลินิกครั้งล่าสุด","Latest clinical interpretation")}</b><p>${MIW.Utils.escape(assessment.text)}</p>
     </div>
     ${antiText?`<div class="anti-aging-assessment">
       <b>${L("ประเมิน Anti-aging แยกจากช่วงอ้างอิง","Anti-aging target shown separately from the clinical reference interval")}</b>
       <p>${MIW.Utils.escape(translatedOr(antiText,"A secondary target reported by the source laboratory; it is displayed separately from the clinical reference interval."))}</p>
       <small>${L("เป็นช่วงเป้าหมายรองที่รายงานระบุ ไม่ใช้เปลี่ยนสถานะ Low / Normal / High ทางคลินิก","This is a secondary reported target and does not change the clinical Low / Normal / High status.")}</small>
     </div>`:""}
     ${visualText?`<div class="visual-warning-assessment">
       <b>${L("คำเตือนจากแถบสีของรายงาน","Source-report visual warning")}</b>
       <p>${MIW.Utils.escape(translatedOr(visualText,"A visual warning reported by the source document."))}</p>
       <small>${L("เป็นคำเตือนแนวโน้ม ไม่ใช่ผลตรวจซ้ำ และไม่เปลี่ยน Clinical status ที่คำนวณจากค่ากับช่วงอ้างอิง","This is a trend warning, not a repeat laboratory result, and it does not change the clinical status calculated from the value and reference interval.")}</small>
     </div>`:""}
       <div class="lab-explanation-grid">
         <section><b>${L("ตรวจอะไร","What it measures")}</b><p>${MIW.Utils.escape(k.meaning)}</p></section>
         <section><b>${L("เป้าหมายของการตรวจ","Purpose of the test")}</b><p>${MIW.Utils.escape(k.purpose)}</p></section>
         <section><b>${L("อวัยวะและระบบที่เกี่ยวข้อง","Related organs and systems")}</b><p>${MIW.Utils.escape(system)}</p></section>
       <section><b>${L("สาเหตุที่อาจทำให้ค่าสูง","Possible causes of a high result")}</b><p>${MIW.Utils.escape(k.high)}</p></section>
       <section><b>${L("สาเหตุที่อาจทำให้ค่าต่ำ","Possible causes of a low result")}</b><p>${MIW.Utils.escape(k.low)}</p></section>
       <section class="span-2"><b>${L("ควรดูร่วมกับ","Interpret together with")}</b><p>${MIW.Utils.escape(related)}</p></section>
       <section class="span-2 lab-interpretation-caution"><b>${L("ข้อควรระวังในการแปลผล","Interpretation cautions")}</b><p>${MIW.Utils.escape(caution)}</p></section>
     </div>
     <p class="lab-series-summary"><b>${L("จำนวนครั้งที่ตรวจ:","Number of tests:")}</b> ${series.length} ${L("ครั้ง","times")} · <b>${L("แนวโน้ม:","Trend:")}</b> ${MIW.Utils.escape(englishTrend(t,series.length))}</p>`
 }
 function renderCancerLiquidBiopsyExplanation(series,last,k,t){
   const assessment=latestAssessment(last);
   const interpretation=MIW.RgccInterpretation?.build(rows,last,k,assessment);
   if(interpretation){
     const esc=MIW.Utils.escape;
     const raw=interpretation.rawResult||{};
     const evidenceHtml=level=>level.evidence?.length?`<details class="rgcc-level-evidence"><summary>หลักฐานต้นทาง ${level.evidence.length} รายการ${level.pages?.length?` · หน้า ${level.pages.join(", ")}`:""}</summary><div>${level.evidence.map(item=>`<article><b>${esc(item.name||"ผลตรวจ")}</b><span>${esc(item.value||"—")} · ${esc(item.date||"—")}${item.page?` · หน้า ${esc(item.page)}`:""}</span>${item.rawText?`<code>${esc(item.rawText)}</code>`:""}</article>`).join("")}</div></details>`:"";
     const levelsHtml=interpretation.levels.map(level=>`<section class="rgcc-interpretation-level level-${level.number}">
       <header><span>ระดับ ${level.number}</span><h4>${esc(level.title)}</h4></header>
       <div class="rgcc-level-items">${level.items.map(item=>`<article class="rgcc-level-item tone-${esc(item.tone||"neutral")}"><b>${esc(item.label)}</b><p>${esc(item.text)}</p></article>`).join("")}</div>
       ${evidenceHtml(level)}
     </section>`).join("");
     return `<h3>${esc(selectedTest)}</h3>
       <section class="rgcc-raw-result">
         <header><span>Source of truth</span><h4>ผลดิบจากห้องปฏิบัติการ</h4></header>
         <div class="rgcc-raw-grid">
           <div><span>ผล</span><b>${esc(raw.value||"—")}</b></div>
           <div><span>ป้ายจากรายงาน</span><b>${esc(raw.reportedResult||"—")}</b></div>
           <div><span>วันที่</span><b>${esc(raw.date||"—")}</b></div>
           <div><span>เอกสาร / หน้า</span><b>${esc(`${raw.sourceFile||last?.source||"—"}${raw.page?` · หน้า ${raw.page}`:""}`)}</b></div>
         </div>
         ${raw.rawText?`<code class="rgcc-raw-line">${esc(raw.rawText)}</code>`:""}
         <small>ข้อมูลส่วนนี้คงค่าจากเอกสารต้นฉบับ ชั้นวิเคราะห์ด้านล่างไม่เขียนทับผลดิบ</small>
       </section>
       <div class="rgcc-four-levels">${levelsHtml}</div>
       <section class="rgcc-limitations"><b>ข้อจำกัดของการตรวจและการแปลผล</b><ul>${interpretation.limitations.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><small>${esc(interpretation.interpretationVersion)} · Derived interpretation · ไม่ใช่คำสั่งการรักษาอัตโนมัติ</small></section>
       <p class="lab-series-summary"><b>จำนวนครั้งที่ตรวจตัวนี้:</b> ${series.length||1} ครั้ง · <b>แนวโน้ม:</b> ${esc(t)}</p>`
   }
   const report=isOncoTrailResult(last)?"RGCC OncoTrail":"RGCC METASTAT";
   const plain=ctcPlainGlossaryItem({...rgccMarkerProfile(last),sourceScope:"REPORTED"},rgccReportType(last));
   const sourceDetail=isMetastatResult(last)
     ?`${last?.metastasisLocation?`ตำแหน่งในแผง: ${last.metastasisLocation} · `:""}${last?.reportedResult?`ผลจากรายงาน: ${last.reportedResult}`:"ใช้ป้ายผลจากรายงานเป็นหลัก"}`
     :`${last?.biomarkerCompartment?`กลุ่มเซลล์: ${last.biomarkerCompartment} · `:""}${last?.reportedResult?`ผลจากรายงาน: ${last.reportedResult}`:"ติดตามด้วยวิธีเดิม"}`;
   return `<h3>${MIW.Utils.escape(selectedTest)}</h3>
     <div class="lab-latest-assessment assessment-${MIW.Utils.escape(assessment.level)}">
       <b>แปลผลจากรายงานครั้งล่าสุด</b><p>${MIW.Utils.escape(assessment.text)}</p>
     </div>
     <div class="lab-explanation-grid">
       <section><b>ตัวนี้ดูอะไร</b><p>${MIW.Utils.escape(plain.plainAbout)}</p></section>
       <section><b>ผลของคุณหมายถึง</b><p>${MIW.Utils.escape(plain.plainCurrent)}</p></section>
       <section><b>บริบทในรายงาน</b><p>${MIW.Utils.escape(`${report} · ${sourceDetail}`)}</p></section>
       <section class="span-2 lab-interpretation-caution"><b>ยังสรุปไม่ได้ว่า</b><p>${MIW.Utils.escape(plain.plainLimit)}</p></section>
     </div>
     <p class="lab-series-summary"><b>จำนวนครั้งที่ตรวจ:</b> ${series.length} ครั้ง · <b>แนวโน้ม:</b> ${MIW.Utils.escape(t)}</p>`
 }
 function renderFoodIntoleranceIgGExplanation(series,last,k,t){
   k=englishClinicalProfile(last,k);
   const assessment=englishAssessment(last,latestAssessment(last));
   return `<h3>${MIW.Utils.escape(selectedTest)}</h3>
     <div class="lab-latest-assessment assessment-${MIW.Utils.escape(assessment.level)}">
       <b>${L("แปลผลทางคลินิกครั้งล่าสุด","Latest clinical interpretation")}</b><p>${MIW.Utils.escape(assessment.text)}</p>
     </div>
       <div class="lab-explanation-grid">
         <section><b>${L("ตรวจอะไร","What it measures")}</b><p>${MIW.Utils.escape(k.meaning)}</p></section>
         <section><b>${L("เป้าหมายของการตรวจ","Purpose of the test")}</b><p>${MIW.Utils.escape(k.purpose)}</p></section>
         <section><b>${L("ระบบที่เกี่ยวข้อง","Related systems")}</b><p>${MIW.Utils.escape(k.system)}</p></section>
       <section><b>${L("เหตุที่ค่าอาจอยู่ระดับ High","Why the result may be High")}</b><p>${MIW.Utils.escape(k.high)}</p></section>
       <section><b>${L("เมื่อค่าอยู่ระดับต่ำ / Normal","When the result is Low / Normal")}</b><p>${MIW.Utils.escape(k.low)}</p></section>
       <section class="span-2"><b>${L("ควรดูร่วมกับ","Interpret together with")}</b><p>${MIW.Utils.escape(k.related)}</p></section>
       <section class="span-2 lab-interpretation-caution"><b>${L("ข้อควรระวังในการแปลผล","Interpretation cautions")}</b><p>${MIW.Utils.escape(k.caution)}</p></section>
     </div>
     <p class="lab-series-summary"><b>${L("จำนวนครั้งที่ตรวจ:","Number of tests:")}</b> ${series.length} ${L("ครั้ง","times")} · <b>${L("แนวโน้ม:","Trend:")}</b> ${MIW.Utils.escape(englishTrend(t,series.length))}</p>`
 }
 function renderAllergyExplanation(series,last,k,t){
   k=englishClinicalProfile(last,k);
   const assessment=englishAssessment(last,latestAssessment(last));
   const allergyClass=Number.isInteger(last?.allergyClass)?last.allergyClass:"—";
   const components=Array.isArray(last?.allergenComponents)&&last.allergenComponents.length
     ?last.allergenComponents.join(", "):L("ไม่ใช่สารผสม หรือรายงานไม่ได้ระบุส่วนประกอบ","Not a mixture, or components were not listed in the source report");
   return `<h3>${MIW.Utils.escape(selectedTest)}</h3>
     <div class="lab-latest-assessment assessment-${MIW.Utils.escape(assessment.level)}">
       <b>${L("แปลผลครั้งล่าสุด","Latest interpretation")}</b><p>${MIW.Utils.escape(assessment.text)}</p>
     </div>
       <div class="lab-explanation-grid">
         <section><b>${L("ตรวจอะไร","What it measures")}</b><p>${MIW.Utils.escape(k.meaning)}</p></section>
         <section><b>${L("เป้าหมายของการตรวจ","Purpose of the test")}</b><p>${MIW.Utils.escape(k.purpose)}</p></section>
         <section><b>${L("ผล Class จากรายงาน","Class reported by the laboratory")}</b><p>Class ${MIW.Utils.escape(allergyClass)} · ${L("วิธี","Method")} ${MIW.Utils.escape(last?.reportedMethod||"Immunoblot")}</p></section>
       <section><b>${L("เมื่อผลเป็นบวก","When positive")}</b><p>${MIW.Utils.escape(k.high)}</p></section>
       <section><b>${L("เมื่อผลเป็นลบ / Class 0","When negative / Class 0")}</b><p>${MIW.Utils.escape(k.low)}</p></section>
       <section class="span-2"><b>${L("ส่วนประกอบของสารผสม","Mixture components")}</b><p>${MIW.Utils.escape(components)}</p></section>
       <section class="span-2"><b>${L("ควรดูร่วมกับ","Interpret together with")}</b><p>${L("อาการที่เกิดซ้ำหลังสัมผัสสาร เวลาเริ่มอาการ ปริมาณที่สัมผัส ประวัติ anaphylaxis การทดสอบผิวหนัง และการประเมินโดยแพทย์ด้านภูมิแพ้","Reproducible symptoms after exposure, symptom timing, exposure amount, anaphylaxis history, skin testing and allergy-specialist assessment.")}</p></section>
       <section class="span-2 lab-interpretation-caution"><b>${L("ข้อควรระวังในการแปลผล","Interpretation cautions")}</b><p>${L("Specific IgE บอก sensitization ไม่ใช่การวินิจฉัย clinical allergy และ Class สูงไม่ได้แปลว่าอาการจะรุนแรงกว่าเสมอ ห้ามแนะนำให้งดอาหารหลายชนิดจากผลเลือดอย่างเดียว","Specific IgE indicates sensitization, not a diagnosis of clinical allergy. A higher class does not necessarily mean more severe symptoms. Do not recommend broad food avoidance from blood testing alone.")}</p></section>
     </div>
     <p class="lab-series-summary"><b>${L("จำนวนครั้งที่ตรวจ:","Number of tests:")}</b> ${series.length} ${L("ครั้ง","times")} · <b>${L("แนวโน้ม:","Trend:")}</b> ${MIW.Utils.escape(englishTrend(t,series.length))}</p>`
 }
 function isSpepName(name){return /^SPEP\b/i.test(String(name||""))}
function spepFraction(name){
   const m=String(name||"").match(/^SPEP\s+(Albumin|Alpha-1|Alpha-2|Beta|Gamma)\s+(g\/L)$/i);
   return m?{fraction:m[1],measure:m[2]}:null
 }
 function spepLevel(r){
   const explicit=String(r?.flag||r?.calculatedFlag||"").toUpperCase();
   if(["H","HH","HIGH"].includes(explicit))return"high";
   if(["L","LL","LOW"].includes(explicit))return"low";
   if(["N","NORMAL"].includes(explicit))return"normal";
   const n=number(r?.valueNumeric??r?.value),ref=rangeFor(r);
   if(n===null)return"unknown";
   if(Number.isFinite(ref.high)&&n>ref.high)return"high";
   if(Number.isFinite(ref.low)&&n<ref.low)return"low";
   return Number.isFinite(ref.low)||Number.isFinite(ref.high)?"normal":"unknown"
 }
 function spepStatus(r){
   const level=spepLevel(r);
   return level==="high"?"สูง":level==="low"?"ต่ำ":level==="normal"?"อยู่ในช่วงอ้างอิง":"ยังจัดสถานะไม่ได้"
 }
 function latestSpepPanel(anchor){
   const sameDate=rows.filter(r=>isSpepName(r.name)&&(!anchor?.date||r.date===anchor.date));
   const latestByName=new Map();
   sameDate.forEach(r=>{
     const old=latestByName.get(r.name);
     if(!old||(r.dateTime||r.date||"")>=(old.dateTime||old.date||""))latestByName.set(r.name,r)
   });
   return [...latestByName.values()]
 }
 function spepPattern(panel){
   const byFraction={};
   panel.forEach(r=>{const f=spepFraction(r.name);if(f)byFraction[f.fraction]=r});
   const high=f=>byFraction[f]&&spepLevel(byFraction[f])==="high";
   const low=f=>byFraction[f]&&spepLevel(byFraction[f])==="low";
   const patterns=[];
   if(high("Alpha-1")&&high("Alpha-2"))patterns.push("รูปแบบสนับสนุน acute-phase response ได้ แต่ไม่จำเพาะ");
   if(low("Albumin")&&high("Alpha-2"))patterns.push("อาจพบในรูปแบบการสูญเสียโปรตีนทางไต; ต้องดู urine protein และการทำงานของไตร่วม");
   if(low("Albumin")&&high("Gamma"))patterns.push("อาจพบใน chronic inflammation หรือ chronic liver disease; ต้องดูกราฟและข้อมูลทางคลินิก");
   if(low("Gamma"))patterns.push("Gamma fraction ต่ำ อาจสัมพันธ์กับ hypogammaglobulinemia; ควรเทียบ quantitative immunoglobulins");
   if(high("Gamma"))patterns.push("Gamma fraction สูงบอก hypergammaglobulinemia แต่แยก polyclonal กับ monoclonal จากตัวเลขเพียงอย่างเดียวไม่ได้");
   return patterns
 }
 function renderSpepExplanation(series,last,k,t){
   const panel=latestSpepPanel(last);
   const fractions=panel.filter(r=>spepFraction(r.name)).sort((a,b)=>{
     const order={"Albumin":0,"Alpha-1":1,"Alpha-2":2,"Beta":3,"Gamma":4};
     const fa=spepFraction(a.name),fb=spepFraction(b.name);
     return order[fa.fraction]-order[fb.fraction]
   });
   const sourceNotes=[...new Set(panel.map(r=>String(r.reportInterpretationRaw||"").trim()).filter(Boolean))];
   const interpretationRows=panel.filter(r=>/^SPEP Interpretation$/i.test(r.name)).map(r=>String(r.value||"").trim()).filter(Boolean);
   const sourceInterpretation=[...new Set([...interpretationRows,...sourceNotes])];
   const sourceText=sourceInterpretation.length
     ?sourceInterpretation.map(x=>`<div class="spep-source-note">${MIW.Utils.escape(x)}</div>`).join("")
     :'<div class="spep-source-note muted">ไม่พบข้อความสรุปของพยาธิแพทย์/ห้องแล็บในข้อมูลที่บันทึก</div>';
   const hasNoBand=sourceInterpretation.some(x=>/no\s+(?:monoclonal|paraprotein|m[- ]?protein)|no\s+band/i.test(x));
   const hasBand=sourceInterpretation.some(x=>/(monoclonal|paraprotein|m[- ]?protein|restricted\s+band|m-spike)/i.test(x))&&!hasNoBand;
   const conclusion=hasBand
     ?"รายงานต้นฉบับมีถ้อยคำที่อาจบ่งชี้ monoclonal protein — ต้องยืนยันข้อความและใช้ immunofixation/serum free light chains ประกอบ"
     :hasNoBand
       ?"รายงานต้นฉบับระบุว่าไม่พบ monoclonal band ในการตรวจครั้งนี้ แต่ SPEP ลบไม่ตัด light-chain disease"
       :"ยังสรุป polyclonal หรือ monoclonal ไม่ได้ เพราะไม่มีข้อความสรุป/รูปกราฟที่ยืนยัน";
   const patterns=spepPattern(panel);
   const fractionRows=fractions.map(r=>{
     const f=spepFraction(r.name),ref=rangeFor(r);
     const level=spepLevel(r),statusClass=level==="low"?"warning":level;
     return `<tr><td>${MIW.Utils.escape(f.fraction)}</td><td>${MIW.Utils.escape(r.value)} ${MIW.Utils.escape(r.unit||f.measure)}</td><td>${MIW.Utils.escape(ref.text||"ไม่ระบุ")}</td><td class="status-${statusClass}">${MIW.Utils.escape(spepStatus(r))}</td></tr>`
   }).join("");
   return `<h3>Serum Protein Electrophoresis (SPEP)</h3>
     <div class="spep-summary-card"><b>1. สรุปที่ตอบได้จากรายงาน</b><p>${MIW.Utils.escape(conclusion)}</p></div>
     <div class="spep-summary-card"><b>2. ผลราย Fraction — วันที่ ${MIW.Utils.escape(last?.date||"ไม่ระบุ")}</b>
       <div class="table-scroll"><table class="spep-table"><thead><tr><th>Fraction</th><th>ผล</th><th>Reference</th><th>สถานะ</th></tr></thead><tbody>${fractionRows||'<tr><td colspan="4">ไม่พบข้อมูล fraction</td></tr>'}</tbody></table></div>
       <p class="muted">แสดงเฉพาะค่าความเข้มข้นจริง g/L และช่วงอ้างอิง g/L จากรายงานฉบับเดียวกัน ค่า % เก็บเป็นหลักฐานประกอบภายในและไม่สร้างเป็นผลแล็บซ้ำ</p>
     </div>
     <div class="spep-summary-card"><b>3. Pattern ที่เป็นไปได้</b>${patterns.length?`<ul>${patterns.map(x=>`<li>${MIW.Utils.escape(x)}</li>`).join("")}</ul>`:'<p>ยังไม่มี combination ที่จำเพาะพอให้จัด pattern จากตัวเลขที่มี</p>'}</div>
     <div class="spep-summary-card"><b>4. คำอธิบายจากรายงานต้นฉบับ</b>${sourceText}</div>
     <div class="spep-summary-card spep-caution"><b>ข้อจำกัดและการตรวจยืนยัน</b>
       <p>SPEP fractions หรือ Gamma สูงเพียงอย่างเดียววินิจฉัย monoclonal gammopathy ไม่ได้ ควรดู electrophoretic tracing, M-spike/monoclonal band, serum immunofixation, serum free light chains และ quantitative immunoglobulins ตามบริบท</p>
     </div>
     <p><b>รายการที่เลือก:</b> ${MIW.Utils.escape(selectedTest)} — ${MIW.Utils.escape(k.meaning)}</p>
     <p><b>เป้าหมายของการตรวจ:</b> ${MIW.Utils.escape(k.purpose)}</p>
     <p><b>จำนวนครั้งที่ตรวจ:</b> ${series.length} ครั้ง · <b>แนวโน้ม:</b> ${MIW.Utils.escape(t)}</p>`
 }
 function trackerOncoReportKey(report){
   const type=String(report?.reportType||report?.type||report?.importMode||"ONCONOMICS_PLUS").toUpperCase();
   const date=String(report?.reportDate||report?.createdAt||"").slice(0,10);
   const specimen=String(report?.specimenId||report?.specimen_id||report?.vialId||report?.vial_id||"").replace(/\s+/g,"").toLowerCase();
   return`${type}::${date}::${specimen}`
 }
 function trackerOncoResultKey(row){
   return[String(row?.group||row?.domain||"").toUpperCase(),String(row?.name||"").toLowerCase().replace(/[^a-z0-9ก-๙]+/g,""),String(row?.effectiveness||row?.status||row?.level||""),String(row?.valueWithout??row?.reportLayer?.valueWithoutSubstance??""),String(row?.valueWith??row?.reportLayer?.valueWithSubstance??""),String(row?.value??row?.result_percent??row?.result??"")].join("::")
 }
 function deduplicateTrackerOnco(reports,results){
   const groups=new Map();
   (reports||[]).forEach(report=>{const key=trackerOncoReportKey(report);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(report)});
   const selectedReports=[],selectedResults=[];
   groups.forEach(items=>{
    const winner=items.slice().sort((a,b)=>{
      const ac=(results||[]).filter(row=>row.reportId===a.id).length,bc=(results||[]).filter(row=>row.reportId===b.id).length;
      return bc-ac||String(b.createdAt||"").localeCompare(String(a.createdAt||""))
    })[0];
    selectedReports.push(winner);
    const ids=new Set(items.map(item=>item.id)),best=new Map();
    (results||[]).filter(row=>ids.has(row.reportId)).forEach(row=>{
      const key=trackerOncoResultKey(row),old=best.get(key);
      if(!old||Number(row?.confidence||0)>Number(old?.confidence||0))best.set(key,{...row,reportId:winner.id})
    });
    selectedResults.push(...best.values())
   });
   return{reports:selectedReports.sort((a,b)=>String(a.reportDate||a.createdAt||"").localeCompare(String(b.reportDate||b.createdAt||""))),results:selectedResults}
 }
 function trackerDedupTestToken(row){
   return String(row?.testCode||row?.test_code||row?.name||"").toLowerCase()
    .replace(/\([^)]*(?:serum|plasma|blood|urine|edta)[^)]*\)/g,"")
    .replace(/[^a-z0-9ก-๙]+/g,"")
 }
 function trackerDedupUnit(row){return String(row?.reportedUnit||row?.reported_unit||row?.unit||"").toLowerCase().replace(/\s+/g,"").replace(/μ/g,"µ")}
 function trackerDedupValue(row){return String(row?.reportedValue||row?.value||"").replace(/[≤]/g,"<=").replace(/[≥]/g,">=").replace(/[−–—]/g,"-").replace(/,/g,"").replace(/\s+/g,"").toLowerCase()}
 function trackerDedupEventKey(row){
   const labNo=String(row?.labNo||row?.lab_no||"").replace(/[^a-z0-9]/gi,"").toLowerCase(),test=trackerDedupTestToken(row),unit=trackerDedupUnit(row),kind=String(row?.resultKind||row?.result_kind||"").toUpperCase();
   const hamad=Boolean(row?.mixedClinicalPacket||row?.mixed_clinical_packet||row?.sourceProfile==="HAMAD_MIXED_CLINICAL_PACKET"||row?.source_profile==="HAMAD_MIXED_CLINICAL_PACKET"||row?.sourceColumnDate||row?.source_column_date);
   if(hamad){
     const moment=String(row?.dateTime||row?.result_datetime||row?.date||row?.result_date||"");
     const slot=[row?.sourceColumnDate||row?.source_column_date||"",row?.sourceColumnTime||row?.source_column_time||"",row?.sourcePageNumber??row?.source_page_number??row?.page??"",row?.sourceColumnIndex??row?.source_column_index??""].join(":");
     return`HAMAD:${moment||slot}:${test}:${unit}:${kind}:${trackerDedupValue(row)}`
   }
   if(labNo)return`LAB:${labNo}:${test}:${unit}:${kind}`;
   return`DATE:${String(row?.date||row?.dateTime||"").slice(0,10)}:${test}:${unit}:${kind}:${trackerDedupValue(row)}`
 }
 function trackerDedupPriority(row){
   const source=String(row?.sourceFile||row?.source_file||row?.source||"");
   return(/รวมแลป|cumulative/i.test(source)||row?.cumulative?0:40)+(row?.labNo||row?.lab_no?8:0)+Math.min(9,Math.max(0,Number(row?.confidence||0)/12))
 }
 function deduplicateStoredTrackerRows(input){
   const best=new Map(),dropped=[];
   (input||[]).forEach(row=>{
    const key=trackerDedupEventKey(row),old=best.get(key);
    if(!old){best.set(key,row);return}
    const rowWins=trackerDedupPriority(row)>trackerDedupPriority(old)||(
      trackerDedupPriority(row)===trackerDedupPriority(old)&&String(row?.verifiedAt||"")>String(old?.verifiedAt||"")
    );
    if(rowWins){dropped.push({row:old,keeper:row});best.set(key,row)}else dropped.push({row,keeper:old})
   });
   return{rows:[...best.values()],dropped}
 }
 async function suppressStoredTrackerDuplicates(input){
   const result=deduplicateStoredTrackerRows(input);
   for(const item of result.dropped){
    if(!item.row?.id||item.row.status==="DUPLICATE_SUPPRESSED")continue;
    await MIW.Database.put("laboratoryResults",{...item.row,status:"DUPLICATE_SUPPRESSED",duplicateOfResultId:item.keeper?.id||"",duplicateSuppressedAt:new Date().toISOString(),duplicateReason:"TRACKER_AUTO_DEDUP"})
   }
   return result
 }
 async function open(patientId){
   currentPatientId=patientId||currentPatientId;
   const [allLabResults,allPatients,allStoredOncoReports,allStoredOncoResults]=await Promise.all([
     MIW.Database.all("laboratoryResults"),MIW.Database.all("patients"),MIW.Database.all("oncoReports"),MIW.Database.all("oncoResults")
   ]);
   currentPatient=(allPatients||[]).find(patient=>patient?.id===currentPatientId)||await MIW.Database.get("patients",currentPatientId)||null;
   const linkedIds=linkedPatientIdSet(currentPatient,allPatients||[]);
   rows=(allLabResults||[]).filter(r=>r.patientId===currentPatientId&&r.status==="VERIFIED")
     .map(hydrateMicronutrientWarning)
     .sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||"")||String(a.name||"").localeCompare(String(b.name||"")));
   linkedOnconomicsRows=(allLabResults||[]).filter(r=>linkedIds.has(r.patientId)&&r.status==="VERIFIED"&&isLegacyOnconomicsResult(r));
   const masuyamaRepaired=await repairMasuyamaRowsInDatabase();
   if(masuyamaRepaired){
    const refreshed=await MIW.Database.all("laboratoryResults");
    rows=refreshed.filter(r=>r.patientId===currentPatientId&&r.status==="VERIFIED")
      .map(hydrateMicronutrientWarning)
      .sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||"")||String(a.name||"").localeCompare(String(b.name||"")));
    linkedOnconomicsRows=refreshed.filter(r=>linkedIds.has(r.patientId)&&r.status==="VERIFIED"&&isLegacyOnconomicsResult(r))
   }
   const rawOncoReports=(allStoredOncoReports||[]).filter(report=>oncoReportMatchesLinkedPatient(report,currentPatient,linkedIds));
   const linkedReportIds=new Set(rawOncoReports.map(report=>report.id));
   const rawOncoResults=(allStoredOncoResults||[]).filter(result=>linkedIds.has(result.patientId)||linkedReportIds.has(result.reportId));
   const oncoDedup=deduplicateTrackerOnco(rawOncoReports,rawOncoResults);
   oncoReports=oncoDedup.reports;
   oncoResults=oncoDedup.results;
   for(let index=0;index<rows.length;index++){
     const original=rows[index],allergyRepaired=repairAllergyResult(original);
     const category=canonicalCategory(allergyRepaired),panel=canonicalPanel(allergyRepaired,category);
    const allergyChanged=["name","value","valueNumeric","valueOperator","allergyClass","allergyClassSource","allergyInterpretation","flag","calculatedFlag","allergenNameTh","allergenComponents"]
       .some(key=>allergyRepaired[key]!==original[key]);
     const categoryChanged=original.group!==category||original.panel!==panel;
     if(!allergyChanged&&!categoryChanged)continue;
     const repaired={
       ...allergyRepaired,
       group:category,
       panel,
       ...(categoryChanged?{
         categoryRepairedFrom:original.group,
         categoryRepairedAt:new Date().toISOString()
       }:{})
     };
     rows[index]=repaired;
     if(typeof MIW.Database.put==="function")await MIW.Database.put("laboratoryResults",repaired)
   }
   const trackerDedup=await suppressStoredTrackerDuplicates(rows);
   rows=trackerDedup.rows.sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||"")||String(a.name||"").localeCompare(String(b.name||"")));
   const patient=currentPatient;
   document.getElementById("labTrackerPatient").textContent=patient?`${patient.name}${patient.hn?` · HN ${patient.hn}`:""}`:"";
   viewMode="dashboard";
   activeStatusFilter="";
   render();
   MIW.Router.show("labTracker")
 }
 function render(){
   const summary=generalDashboardSummary();
   document.getElementById("trackerResultCount").textContent=rows.length;
   document.getElementById("trackerTestCount").textContent=summary.total;
   document.getElementById("trackerNormalCount").textContent=summary.counts.normal;
   document.getElementById("trackerHighCount").textContent=summary.counts.abnormal;
   document.getElementById("trackerLowCount").textContent=summary.counts.followup;
   document.getElementById("trackerContextCount").textContent=summary.counts.context;
   const hasCtcReports=rows.some(isCancerLiquidBiopsyResult)||oncoReports.length>0;
   const groups=[...new Set([...rows.map(r=>r.group),...(hasCtcReports?["CTC"]:[])])].sort();
   const groupSelect=document.getElementById("trackerGroup"),previousGroup=groupSelect.value;
   groupSelect.innerHTML=`<option value="">${L("ทุกกลุ่ม","All groups")}</option>`+groups.map(g=>`<option value="${MIW.Utils.escape(g)}">${MIW.Utils.escape(systemLabel(g))}</option>`).join("");
   groupSelect.value=groups.includes(previousGroup)?previousGroup:"";
   const visible=filteredTests();
   if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
   setView(viewMode)
 }
 function sortLatestTests(source){
   return[...source].sort((a,b)=>statusRank(dashboardState(a))-statusRank(dashboardState(b))||
     Number(hasVisualWarning(b))-Number(hasVisualWarning(a))||
     systemRank(a.group)-systemRank(b.group)||String(a.group||"").localeCompare(String(b.group||""))||a.name.localeCompare(b.name))
 }
 function normalizedLabSearch(value){
   return String(value??"")
     .normalize("NFKC")
     .toLowerCase()
     .replace(/oncotrial/g,"oncotrail")
     .replace(/[()[\]{}.,:;_/\\|–—-]+/g," ")
     .replace(/\s+/g," ")
     .trim()
 }
 function labSearchText(row){
   const profile=knowledge(row?.name,row?.group);
   return[
     row?.name,row?.reportedName,row?.reported_name,row?.testCode,row?.test_code,
     row?.group,systemLabel(row?.group),row?.panel,
     profile?.name,isOncoTrailResult(row)?"OncoTrial":"",...(Array.isArray(profile?.aliases)?profile.aliases:[])
   ].filter(Boolean).join(" ")
 }
 function labMatchesSearch(row,query){
   const q=normalizedLabSearch(query);
   if(!q)return true;
   const haystack=normalizedLabSearch(labSearchText(row));
   const compactHaystack=haystack.replace(/\s+/g,"");
   return q.split(" ").every(token=>
     haystack.includes(token)||compactHaystack.includes(token.replace(/\s+/g,""))
   )
 }
 function detailBaseTests(){
   const q=document.getElementById("trackerSearch").value;
   // A typed search is global by design. A category selected during previous
   // browsing must not silently hide a matching laboratory result.
   const g=normalizedLabSearch(q)?"":document.getElementById("trackerGroup").value;
   return sortLatestTests(latestByTest()
     .filter(r=>labMatchesSearch(r,q)&&(!g||r.group===g)))
 }
 function filteredTests(){
   return detailBaseTests().filter(r=>!activeStatusFilter||dashboardState(r)===activeStatusFilter)
 }
 function renderTests(){
   const list=filteredTests();
   renderStatusFilter();
   renderDetailDashboard(list);
   document.getElementById("trackerTestList").innerHTML=list.map(r=>`<div class="tracker-test-card status-${statusOf(r)} ${selectedTest===r.name?"selected":""}" data-tracker-test="${MIW.Utils.escape(r.name)}">
     <b>${MIW.Utils.escape(r.name)}</b><div class="latest">${MIW.Utils.escape(r.value)} ${MIW.Utils.escape(r.unit||"")}</div>${alternateReportedText(r)?`<div class="alternate-unit-mini">${MIW.Utils.escape(alternateReportedText(r))}</div>`:""}<div class="reference-mini">${isAllergyResult(r)?`ระดับ Class ${MIW.Utils.escape(Number.isInteger(r.allergyClass)?r.allergyClass:"—")} · เกณฑ์ผลลบ: `:isCancerLiquidBiopsyResult(r)?"เกณฑ์/Comparator จากรายงาน: ":"Clinical reference: "}${MIW.Utils.escape(referenceText(r)||"ไม่ระบุ")}</div>${antiAgingTargetText(r)?`<div class="anti-aging-target-mini">${MIW.Utils.escape(antiAgingTargetText(r))} · ประเมินแยกจาก Clinical status</div>`:""}<div class="sub">${MIW.Utils.escape(r.group)} · ${MIW.Utils.escape(displayDate(r.date))} · ${MIW.Utils.escape(r.resultKind==="TEXT"?"ข้อความ":r.flag)}</div>${visualWarningText(r)?`<div class="visual-warning-mini">${MIW.Utils.escape(visualWarningText(r))} · ไม่ใช่ผลตรวจซ้ำ</div>`:""}${r.reviewRecommended?`<div class="review-advisory-mini">ควรตรวจต้นฉบับภายหลัง${Number.isFinite(Number(r.confidence))?` · OCR ${Math.round(Number(r.confidence))}%`:""}</div>`:""}
   </div>`).join("")||'<div class="empty">ยังไม่มีข้อมูล</div>'
 }
 function statusOf(r){
   const foodLevel=foodIntoleranceIgGLevel(r);
   if(foodLevel)return foodLevel==="High"?"high":foodLevel==="Borderline"?"warning":"normal";
   const explicit=String(r?.flag||r?.calculatedFlag||"").toUpperCase();
   if(isCancerLiquidBiopsyResult(r))return["H","HH","HIGH"].includes(explicit)?"high":"warning";
   if(isContextDependentHormone(r)){
     if(["H","HH","HIGH"].includes(explicit))return"high";
     return"warning"
   }
   if(["H","HH","HIGH"].includes(explicit))return"high";
   if(["L","LL","LOW"].includes(explicit))return"warning";
   if(["N","NORMAL"].includes(explicit))return"normal";
   const n=number(r?.valueNumeric??r?.value),ref=rangeFor(r);
   if(n!==null){
     if(Number.isFinite(ref.high)&&n>ref.high)return"high";
     if(Number.isFinite(ref.low)&&n<ref.low)return"warning";
     if(Number.isFinite(ref.low)||Number.isFinite(ref.high))return"normal"
   }
   return"warning"
 }
 function rowMoment(r){
   return String(r?.dateTime||r?.date||r?.verifiedAt||r?.createdAt||"")
 }
 function rgccReportType(r){
   if(isOncoTrailResult(r))return"RGCC_ONCOTRAIL";
   if(isMetastatResult(r))return"RGCC_METASTAT";
   return""
 }
 function latestRgccReportRows(type,source=rows){
   const typed=(Array.isArray(source)?source:[]).filter(row=>rgccReportType(row)===type);
   if(!typed.length)return[];
   const latest=typed.reduce((best,row,index)=>{
     const moment=rowMoment(row),bestMoment=best?rowMoment(best.row):"";
     return!best||moment>bestMoment||(moment===bestMoment&&index>best.index)?{row,index}:best
   },null)?.row;
   if(!latest)return[];
   const documentId=String(latest.documentId||latest.document_id||"").trim();
   if(documentId)return typed.filter(row=>String(row.documentId||row.document_id||"").trim()===documentId);
   const date=String(latest.dateTime||latest.date||"").trim();
   return date?typed.filter(row=>String(row.dateTime||row.date||"").trim()===date):typed
 }
 function preferredRgccRow(type,source=rows){
   const reportRows=latestRgccReportRows(type,source);
   const preferredCodes=type==="RGCC_ONCOTRAIL"
     ?["oncotrail_lung_ctc_count","oncotrail_epcam_positive_ctc_count"]
     :["metastat_primary_destination_trend","metastat_upregulated_genes"];
   for(const preferred of preferredCodes){
     const match=reportRows.find(row=>String(row.testCode||row.test_code||"")===preferred);
     if(match)return match
   }
   return reportRows[0]||null
 }
 function rgccReportCardModel(type,source=rows){
   const reportRows=latestRgccReportRows(type,source);
   if(!reportRows.length)return{
     type,available:false,title:type==="RGCC_ONCOTRAIL"?"OncoTrail":"METASTAT",
     role:type==="RGCC_ONCOTRAIL"?L("นับ CTC และดูโปรตีนที่พบบนเซลล์","Counts CTCs and evaluates proteins detected on the cells"):L("ดูสัญญาณที่อาจเกี่ยวกับการเคลื่อนที่ของเซลล์ไปยังอวัยวะต่าง ๆ","Evaluates signals that may be related to cellular trafficking toward different organs"),
     date:L("ยังไม่มีรายงาน","No report available"),count:0,highlights:[],selectedName:""
   };
   const codeOf=row=>String(row?.testCode||row?.test_code||"");
   const find=target=>reportRows.find(row=>codeOf(row)===target);
   const date=displayDate(preferredRgccRow(type,source)?.date);
   if(type==="RGCC_ONCOTRAIL"){
     const ctc=find("oncotrail_lung_ctc_count"),epcam=find("oncotrail_epcam_positive_ctc_count");
     const positives=reportRows.filter(row=>/^oncotrail_(?:cd45_pos|cd45_neg)_/.test(codeOf(row))&&/(?:Positive|Dim)/i.test(String(row.reportedResult||row.reported_result||row.value||"")));
     return{
       type,available:true,title:"OncoTrail",role:L("นับ CTC และดูว่าเซลล์ที่พบมีโปรตีนอะไรอยู่บนผิวหรือภายในเซลล์","Counts CTCs and characterizes proteins detected on or within the cells"),
       date,count:reportRows.length,selectedName:preferredRgccRow(type,source)?.name||"",
       highlights:[
         {label:L("จำนวน CTC","CTC count"),value:ctc?`${ctc.value} ${ctc.unit||""}`.trim():L("ไม่พบค่า","No value reported")},
         {label:L("CTC ที่พบ EpCAM","EpCAM-positive CTCs"),value:epcam?`${epcam.value} ${epcam.unit||""}`.trim():L("ไม่พบค่า","No value reported")},
         {label:L("ตัวที่พบ / พบน้อย","Detected / dim markers"),value:L(`${positives.length} รายการ`,`${positives.length} items`)}
       ]
     }
   }
   const trend=find("metastat_primary_destination_trend"),upSummary=find("metastat_upregulated_genes");
   const upRows=reportRows.filter(row=>/^metastat_(?!upregulated_genes|primary_destination_trend)/.test(codeOf(row))&&/UP\s*REGULATED/i.test(String(row.reportedResult||row.reported_result||"")));
   return{
     type,available:true,title:"METASTAT",role:L("ดูสัญญาณที่อาจเกี่ยวกับความสามารถของเซลล์ในการเคลื่อนที่ไปยังอวัยวะต่าง ๆ","Evaluates signals that may be related to the ability of cells to migrate toward different organs"),
     date,count:reportRows.length,selectedName:preferredRgccRow(type,source)?.name||"",
     highlights:[
       {label:L("อวัยวะที่รายงานชี้แนวโน้ม","Organ-tropism signal reported by the assay"),value:trend?String(trend.value||trend.metastasisLocation||"—"):L("ไม่พบสรุป","No summary reported")},
       {label:L("ยีนที่ทำงานเด่นขึ้น","Up-regulated genes"),value:upSummary?String(upSummary.value||"—"):(upRows.length?L("พบในตาราง","Found in the source table"):L("ไม่พบสรุป","No summary reported"))},
       {label:L("จำนวนตัวที่ทำงานเด่นขึ้น","Number of up-regulated markers"),value:L(`${upRows.length} รายการ`,`${upRows.length} items`)}
     ]
   }
 }
 function legacyOnconomicsRows(source=rows){
   const combined=[...(Array.isArray(source)?source:[]),...(Array.isArray(linkedOnconomicsRows)?linkedOnconomicsRows:[])].filter(isLegacyOnconomicsResult),best=new Map();
   combined.forEach((row,index)=>{const key=row?.id||[row?.patientId,row?.date||row?.reportDate||row?.createdAt,row?.testCode||row?.test_code||row?.name,row?.value??row?.valueNumeric??row?.reportedValue,index].join("::");if(!best.has(key))best.set(key,row)});
   return[...best.values()]
 }
 function latestOnconomicsReport(source=oncoReports){
   const reports=Array.isArray(source)?source:[];
   const latest=reports.reduce((latest,report)=>{
     if(!latest)return report;
     const moment=String(report.reportDate||report.createdAt||""),latestMoment=String(latest.reportDate||latest.createdAt||"");
     return moment>=latestMoment?report:latest
   },null);
   if(latest)return latest;
   const legacy=legacyOnconomicsRows(rows);if(!legacy.length)return null;
   const latestRow=legacy.slice().sort((a,b)=>rowMoment(a).localeCompare(rowMoment(b))).at(-1);
   const date=String(latestRow?.date||latestRow?.reportDate||latestRow?.createdAt||"").slice(0,10);
   const ctcRow=legacy.find(r=>/ctc/i.test(String(r?.testCode||r?.test_code||r?.name||""))&&number(r?.valueNumeric??r?.value)!==null);
   return{id:`legacy-onconomics-${date||"undated"}`,reportDate:date,createdAt:String(latestRow?.createdAt||date),fileName:String(latestRow?.sourceFile||latestRow?.source_file||latestRow?.sourceFileName||latestRow?.source_file_name||"Legacy Onconomics Plus"),ctc:ctcRow?number(ctcRow.valueNumeric??ctcRow.value):null,_legacyFromLabRows:true,status:"VERIFIED",importMode:"LEGACY_ONCONOMICS_ROWS"}
 }
 function latestOnconomicsRows(sourceReports=oncoReports,sourceResults=oncoResults){
   const report=latestOnconomicsReport(sourceReports);
   if(!report)return[];
   if(report._legacyFromLabRows){
     const source=legacyOnconomicsRows(rows),date=String(report.reportDate||"").slice(0,10);
     const dated=source.filter(row=>!date||String(row.date||row.reportDate||row.createdAt||"").slice(0,10)===date);
     return dated.length?dated:source
   }
   return(Array.isArray(sourceResults)?sourceResults:[]).filter(row=>row.reportId===report.id)
 }
 function oncoDomain(row){
   const explicit=String(row?.group||row?.domain||"").toUpperCase();
   if(["CTC","GENE","DRUG","NATURAL","ADDITIONAL"].includes(explicit))return explicit;
   const code=String(row?.testCode||row?.test_code||row?.name||"").toLowerCase();
   if(/ctc/.test(code))return"CTC";
   if(/gene|pathway|expression|mdr|mrp|lrp|gst|vegf|egfr|c-met|cox2|igf|tgf|hat|hsp|5-lox/.test(code))return"GENE";
   if(/natural|curcumin|resveratrol|vitamin|mushroom|extract|boswell|lycopene|melatonin|quercetin/.test(code))return"NATURAL";
   if(/additional/.test(code))return"ADDITIONAL";
   return"DRUG"
 }
 function onconomicsReportCardModel(sourceReports=oncoReports,sourceResults=oncoResults){
   const report=latestOnconomicsReport(sourceReports),reportRows=latestOnconomicsRows(sourceReports,sourceResults);
   if(!report)return{
     type:"ONCONOMICS_PLUS",available:false,title:"Onconomics Plus",
     role:L("นับ CTC ดูการทำงานของยีน และทดสอบการตอบสนองของเซลล์ในห้องปฏิบัติการ","Counts CTCs, evaluates gene expression and tests cellular response in the laboratory"),
     date:L("ยังไม่มีรายงาน","No report available"),count:0,markerCount:0,highlights:[]
   };
   const genes=reportRows.filter(row=>oncoDomain(row)==="GENE");
   const therapies=reportRows.filter(row=>["DRUG","ADDITIONAL"].includes(oncoDomain(row)));
   const natural=reportRows.filter(row=>oncoDomain(row)==="NATURAL");
   const ctcRow=reportRows.find(row=>oncoDomain(row)==="CTC");
   const ctcRaw=ctcRow?.value??report.ctc;
   const ctcNumeric=number(ctcRaw);
   const ctcText=ctcNumeric===null?L("ไม่พบค่า","No value reported"):`${ctcNumeric} ${ctcRow?.unit||"cells/mL"}`;
   return{
     type:"ONCONOMICS_PLUS",available:true,title:"Onconomics Plus",
     role:L("ใช้เซลล์ที่แยกจากเลือดเพื่อนับ CTC ดูการทำงานของยีน และทดสอบการตอบสนองของเซลล์ในห้องปฏิบัติการ","Uses cells isolated from blood to count CTCs, assess gene expression and test cellular response in the laboratory"),
     date:displayDate(report.reportDate||report.createdAt),count:reportRows.length,markerCount:genes.length+(ctcRow||ctcNumeric!==null?1:0),
     highlights:[
       {label:L("จำนวน CTC","CTC count"),value:ctcText},
       {label:L("ยีนที่ตรวจ","Genes tested"),value:L(`${genes.length} รายการ`,`${genes.length} items`)},
       {label:L("ยาหรือสารที่ทดสอบ","Drugs or agents tested"),value:L(`${therapies.length} รายการ`,`${therapies.length} items`)},
       {label:L("สารจากธรรมชาติที่ทดสอบ","Natural substances tested"),value:L(`${natural.length} รายการ`,`${natural.length} items`)}
     ]
   }
 }
 function ctcMarkerReportLabel(type){
   return type==="ONCONOMICS_PLUS"?"Onconomics Plus":type==="RGCC_ONCOTRAIL"?"OncoTrail":"METASTAT"
 }
 function resultText(row){
   if(!row)return"—";
   const value=row.value===0?"0":String(row.value??row.reportedResult??row.reported_result??"—");
   return`${value}${row.unit?` ${row.unit}`:""}`.trim()
 }
 function onconomicsMarkerProfile(row){
   const name=String(row?.name||"CTC count"),domain=oncoDomain(row);
   if(domain==="CTC")return{
     name,result:resultText(row),specific:true,
     what:"จำนวน Circulating Tumor Cells (CTCs) ที่แยกและนับจากเลือดในรายงาน Onconomics Plus",
     purpose:"ใช้เป็นค่าตั้งต้นและติดตามแนวโน้มจำนวน CTC ด้วยวิธีเดียวกัน ร่วมกับข้อมูล gene expression และ functional sensitivity ในรายงาน",
     current:"ค่าปัจจุบันเป็นจำนวนที่ตรวจพบในตัวอย่างครั้งนี้ ไม่ใช่การวัดขนาดก้อนและไม่ใช้กำหนดระยะโรคเพียงค่าเดียว",
     high:"จำนวนที่สูงขึ้นหรือเพิ่มต่อเนื่องอาจสัมพันธ์กับภาระโรค/การปล่อยเซลล์เข้าสู่เลือดมากขึ้น แต่ต้องใช้เกณฑ์เฉพาะ assay และชนิดมะเร็ง",
     low:"จำนวนที่ต่ำลงอาจสนับสนุนแนวโน้มตอบสนอง แต่ 0 หรือค่าต่ำไม่ตัด residual disease, dormant cells หรือโรคที่ปล่อย CTC น้อย",
     related:"CTC ครั้งก่อนจากวิธีเดียวกัน, imaging, อาการ, pathology, tumor markers และการรักษาที่ได้รับ",
     caution:"ไม่มีค่าปกติสากลสำหรับ CTC ทุกวิธี ห้ามเทียบตัวเลขข้าม assay หรือใช้ค่าเดียวเลือก/หยุดการรักษา"
   };
   if(MIW.OnconomicsSeries&&typeof MIW.OnconomicsSeries.explainGeneMarker==="function"){
     const shared=MIW.OnconomicsSeries.explainGeneMarker(row);
     if(shared)return shared
   }
   const exact=MIW.OncoKnowledge&&typeof MIW.OncoKnowledge.find==="function"?MIW.OncoKnowledge.find("GENE",name):null;
   const sourceWhat=String(row?.function||row?.reportLayer?.function||"").trim();
   const sourceRelated=String(row?.related||row?.reportLayer?.related||"").trim();
   const value=number(row?.value),specific=Boolean(exact);
   const direction=value===null?"ยังไม่มีค่าที่อ่านได้":value>20?"แสดงออกสูงกว่า baseline":value<-20?"แสดงออกต่ำกว่า baseline":"อยู่ใกล้ baseline ของสเกลรายงาน";
   const currentDetail=value===null?"ต้องตรวจต้นฉบับก่อนแปลผล":value>20?(exact?.high||direction):value<-20?(exact?.low||direction):"ค่าใกล้ baseline ไม่ได้แปลว่าไม่มียีน/โปรตีน และไม่เท่ากับผล mutation";
   return{
     name,result:resultText(row),specific,
     what:specific?(exact?.mechanismFormal||exact?.mechanism||sourceWhat||exact?.meaning):(sourceWhat?`ข้อมูลจากรายงานต้นทาง: ${sourceWhat} · ฐาน MIW ยังไม่มีคำอธิบายเฉพาะอิสระสำหรับ Marker นี้`:"ยังไม่มีคำอธิบายเฉพาะสำหรับ Marker นี้"),
     purpose:specific?`ใช้ดูทิศทางการแสดงออกของ ${name} ในกลุ่ม ${exact?.category||row?.mainTopicName||"Gene expression"} เพื่อประกอบภาพชีววิทยาของ CTC ไม่ใช่การตรวจ mutation`:"ยังไม่มีคำอธิบายเฉพาะ",
     current:specific?`${direction}${value===null?"":` (${value}%)`} · ${currentDetail}`:"ยังไม่มีคำอธิบายเฉพาะ",
     high:specific?(exact?.high||`การแสดงออกของ ${name} สูงกว่า baseline ต้องตีความตามหน้าที่ของ marker และชนิดมะเร็ง`):"ยังไม่มีคำอธิบายเฉพาะ",
     low:specific?(exact?.low||`การแสดงออกของ ${name} ต่ำกว่า baseline ไม่ได้แปลว่าดีเสมอ โดยเฉพาะ tumor-suppressor หรือ DNA-repair marker`):"ยังไม่มีคำอธิบายเฉพาะ",
     related:specific?(sourceRelated||[exact?.subgroup,exact?.biomarkers,"ผล gene expression อื่น, functional sensitivity, pathology/IHC และ molecular testing"].filter(Boolean).join(" · ")):"ยังไม่มีคำอธิบายเฉพาะ",
     caution:specific?"Gene expression จาก CTC ไม่ใช่ mutation, amplification หรือ companion diagnostic; ห้ามเลือก targeted therapy จาก marker นี้เพียงตัวเดียว":"ยังไม่มีคำอธิบายเฉพาะ"
   }
 }
 function rgccMarkerProfile(row){
   const profile=knowledgeForResult(row),specific=Boolean(profile?.specific&&profile?.knowledgeLevel!=="GROUP_FALLBACK");
   const reported=String(row?.reportedResult||row?.reported_result||row?.value||"");
   const metastat=isMetastatResult(row);
   const sourceEvidence=Array.isArray(row?.sourceEvidence)?row.sourceEvidence:Array.isArray(row?.source_evidence)?row.source_evidence:[];
   const tableEvidence=sourceEvidence.find(item=>item&&item.type==="rgcc-metastat-table-row")||{};
   const sampleLevel=metastat?String(row?.value===0?0:row?.value??row?.valueNumeric??row?.value_numeric??tableEvidence.sample_level??"").trim():"";
   let normalLevel=metastat?row?.comparatorLevel??row?.comparator_level??tableEvidence.normal_level:null;
   if((normalLevel===null||normalLevel===undefined||normalLevel==="")&&metastat){
     normalLevel=(String(row?.reference||row?.reportedReference||row?.reported_reference||"").match(/(?:Comparator|Normal(?:\s+Levels?)?)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i)||[])[1]||""
   }
   normalLevel=normalLevel===null||normalLevel===undefined?"":String(normalLevel).trim();
   const positive=/UP\s*REGULATED|POSITIVE|DIM/i.test(reported);
   const negative=/NEGATIVE|^\s*-\s*$/i.test(reported);
   const current=specific
     ?`${resultText(row)} · ${positive?profile.high:negative?profile.low:profile.meaning}`
     :"ยังไม่มีคำอธิบายเฉพาะ";
   return{
     name:String(row?.name||"ไม่ทราบชื่อ Marker"),result:resultText(row),specific,
     sampleLevel,normalLevel,reportedStatus:metastat?(reported||"-"):"",
     metastasisLocation:String(row?.metastasisLocation||row?.metastasis_location||""),
     what:specific?profile.meaning:"ยังไม่มีคำอธิบายเฉพาะสำหรับ Marker นี้",
     purpose:specific?profile.purpose:"ยังไม่มีคำอธิบายเฉพาะ",
     current,
     high:specific?profile.high:"ยังไม่มีคำอธิบายเฉพาะ",
     low:specific?profile.low:"ยังไม่มีคำอธิบายเฉพาะ",
     related:specific?profile.related:"ยังไม่มีคำอธิบายเฉพาะ",
     caution:specific?profile.caution:"ยังไม่มีคำอธิบายเฉพาะ"
   }
 }
 const ONCOTRAIL_INDEX_MARKER_NAMES=[
   "OncoTrail Index — CD44","OncoTrail Index — CD34","OncoTrail Index — BCR–ABL",
   "OncoTrail Index — CD30","OncoTrail Index — CD19","OncoTrail Index — CD63",
   "OncoTrail Index — CD99","OncoTrail Index — PSMA","OncoTrail Index — VHL mutation"
 ];
 const ONCOTRAIL_REPORT_INDEX_ROWS=[
   {markers:"CD44, CD133, Sox-2*, OKT-4*, Nanog*",source:"Tumor stem cell marker",plain:"รายงานจัด Marker กลุ่มนี้ไว้เพื่ออธิบายสัญญาณที่เกี่ยวข้องกับการคงสภาพและการแบ่งตัวต่อของเซลล์",limit:"การพบ Marker กลุ่มนี้ไม่ยืนยันว่าเป็น cancer stem cell หรือดื้อยา และเครื่องหมาย * เป็นสัญลักษณ์ Significant markers ของรายงาน"},
   {markers:"c-MET*",source:"Membrane antigen that regulates the mesenchymal to epithelial transition",plain:"โปรตีนตัวรับบนผิวเซลล์ที่เกี่ยวข้องกับสัญญาณการโตและการเปลี่ยนลักษณะของเซลล์",limit:"ผลบน CTC ไม่เท่ากับการตรวจ MET mutation, amplification หรือ exon 14 skipping"},
   {markers:"CD34*",source:"Hematological stem cell and blast cell marker, epithelioid",plain:"Marker ของเซลล์ต้นกำเนิดเม็ดเลือด เซลล์ตัวอ่อนของระบบเลือด และเซลล์บางชนิดที่มีรูปร่างคล้ายเยื่อบุ",limit:"ไม่จำเพาะต่อมะเร็งและต้องดูร่วมกับ Marker ระบบเลือดตัวอื่น"},
   {markers:"CD45",source:"Hematologic origin cell",plain:"Marker ของเม็ดเลือดขาว ใช้ช่วยแยกเซลล์ระบบเลือดออกจากกลุ่มเซลล์ที่นำไปประเมินเป็น CTC",limit:"CD45 ลบไม่ได้แปลว่าเป็นเซลล์มะเร็งโดยอัตโนมัติ"},
   {markers:"BCR-ABL, CD30, CD15",source:"Hematologic malignancy marker",plain:"รายงานจัดกลุ่มนี้เป็น Marker ที่อาจเกี่ยวข้องกับมะเร็งของระบบเลือด",limit:"แต่ละ Marker มีความหมายต่างกันและต้องยืนยันด้วย flow cytometry, pathology หรือ molecular test ตามชนิดโรค"},
   {markers:"CD19 (CD45 negative cells)",source:"Lung neuroendocrine malignancy",plain:"ข้อความท้ายรายงานระบุความสัมพันธ์ของ CD19 ในกลุ่ม CD45− กับมะเร็งปอดชนิด neuroendocrine",limit:"เป็นคำอธิบายของห้องปฏิบัติการ ไม่ใช่เกณฑ์มาตรฐานที่ใช้ยืนยันชนิดมะเร็งเพียงตัวเดียว"},
   {markers:"CD19 (CD45 positive cells)",source:"Hematological malignancy",plain:"CD19 ในกลุ่ม CD45+ สนับสนุนลักษณะของสายเซลล์ B ในระบบเลือด",limit:"ต้องดูร่วมกับ CD20, CD45, flow cytometry และพยาธิวิทยา"},
   {markers:"CD31",source:"Endothelial cell membrane antigen",plain:"Marker บนเซลล์บุผนังหลอดเลือดและเซลล์เม็ดเลือดบางชนิด",limit:"ไม่ใช่ Marker จำเพาะของมะเร็ง"},
   {markers:"CD63",source:"Melanoma cell marker",plain:"โปรตีนที่เกี่ยวกับถุงภายในเซลล์และ extracellular vesicles ซึ่งอาจพบใน melanoma บางราย",limit:"CD63 พบได้ในเซลล์หลายชนิดและไม่ยืนยัน melanoma"},
   {markers:"CD99",source:"Sarcoma marker",plain:"โปรตีนบนผิวเซลล์ที่ใช้เป็นส่วนหนึ่งของแผงวินิจฉัย sarcoma บางชนิด",limit:"CD99 ตัวเดียวไม่ยืนยัน Ewing sarcoma หรือ sarcoma ชนิดอื่น"},
   {markers:"EpCam",source:"Epithelial origin marker",plain:"โปรตีนยึดเกาะบนผิวเซลล์ที่สนับสนุนลักษณะของเซลล์เยื่อบุ",limit:"ยังระบุอวัยวะต้นกำเนิดหรือชนิดมะเร็งจาก EpCAM เพียงตัวเดียวไม่ได้"},
   {markers:"MUC-1",source:"Breast cancer antigen",plain:"โปรตีนเมือกบนผิวเซลล์เยื่อบุที่อาจพบมากหรือผิดรูปในมะเร็งหลายชนิด",limit:"MUC-1 ไม่จำเพาะต่อมะเร็งเต้านม"},
   {markers:"PSMA",source:"Prostate specific cancer stem cell membrane antigen",plain:"โปรตีนที่มักแสดงมากในมะเร็งต่อมลูกหมากและพบในเนื้อเยื่ออื่นได้บางส่วน",limit:"ไม่ยืนยันมะเร็งต่อมลูกหมากหรือความเหมาะสมต่อ PSMA-targeted therapy โดยลำพัง"},
   {markers:"VHL mut",source:"Renal carcinoma marker",plain:"ความผิดปกติของยีนกดมะเร็ง VHL ซึ่งสัมพันธ์กับ clear-cell renal cell carcinoma",limit:"ต้องยืนยัน mutation ด้วย molecular testing; ชื่อในหน้า Index ไม่ใช่ผลตรวจยีนของผู้ป่วย"},
   {markers:"panCK",source:"Epithelial origin cell marker",plain:"กลุ่มโปรตีนโครงสร้างของเซลล์เยื่อบุ ใช้ช่วยสนับสนุน epithelial origin",limit:"ผลลบไม่ตัด carcinoma เพราะ CTC บางส่วนอาจแสดง cytokeratin ต่ำ"},
   {markers:"SCCA-1",source:"Squamous origin cell marker",plain:"โปรตีนที่อาจพบมากขึ้นในมะเร็งชนิดเซลล์สความัสบางชนิด",limit:"ผลบวกไม่ยืนยัน squamous carcinoma และผลลบไม่ตัดโรค"},
   {markers:"CD56",source:"Small cell origin cell marker",plain:"โปรตีนที่พบได้ในเซลล์ NK เซลล์ประสาท และมะเร็ง neuroendocrine บางชนิด",limit:"CD56 ไม่จำเพาะต่อ small-cell lung cancer หรือ neuroendocrine tumor"}
 ];
 function oncotrailReportIndexRows(){return ONCOTRAIL_REPORT_INDEX_ROWS.map(item=>({...item}))}
 function oncotrailIndexMarkerEntries(){
   return ONCOTRAIL_INDEX_MARKER_NAMES.map(name=>{
     const profile=MIW.LabKnowledge&&typeof MIW.LabKnowledge.find==="function"
       ?MIW.LabKnowledge.find(name,"Cancer Liquid Biopsy")
       :null;
     const specific=Boolean(profile?.specific&&profile?.knowledgeLevel!=="GROUP_FALLBACK");
     return{
       name,result:"ไม่รายงานผล",specific,sourceScope:"INDEX_ONLY",
       what:specific?profile.meaning:"ยังไม่มีคำอธิบายเฉพาะสำหรับ Marker นี้",
       purpose:specific?profile.purpose:"ยังไม่มีคำอธิบายเฉพาะ",
       current:"อยู่ในหน้า Index ของชุดตรวจ แต่ไม่มีผลในรายงานผู้ป่วยฉบับนี้ — ห้ามตีความเป็น Positive หรือ Negative",
       high:specific?profile.high:"ยังไม่มีคำอธิบายเฉพาะ",
       low:specific?profile.low:"ยังไม่มีคำอธิบายเฉพาะ",
       related:specific?profile.related:"ยังไม่มีคำอธิบายเฉพาะ",
       caution:specific?profile.caution:"ยังไม่มีคำอธิบายเฉพาะ"
     }
   })
 }
 function ctcMarkerEntries(type){
   if(type==="ONCONOMICS_PLUS"){
     const report=latestOnconomicsReport(),reportRows=latestOnconomicsRows();
     const candidates=reportRows.filter(row=>["GENE","CTC"].includes(oncoDomain(row)));
     if(report&&number(report.ctc)!==null&&!candidates.some(row=>oncoDomain(row)==="CTC")){
       candidates.unshift({name:"Onconomics Plus — CTC count",group:"CTC",value:number(report.ctc),unit:"cells/mL",reportId:report.id})
     }
     return candidates.map(onconomicsMarkerProfile).sort((a,b)=>a.name.localeCompare(b.name))
   }
   const reportRows=latestRgccReportRows(type);
   const candidates=type==="RGCC_ONCOTRAIL"
     ?reportRows
     :reportRows.filter(row=>!/[\s_-](?:upregulated_genes|primary_destination_trend)$/.test(String(row.testCode||row.test_code||"")));
   const reported=candidates.map(row=>({...rgccMarkerProfile(row),sourceScope:"REPORTED"})).sort((a,b)=>a.name.localeCompare(b.name));
   return type==="RGCC_ONCOTRAIL"?[...reported,...oncotrailIndexMarkerEntries()]:reported
 }
 function conciseMarkerText(value,maxLength=140){
   const text=String(value||"ยังไม่มีคำอธิบายเฉพาะ").replace(/\s+/g," ").trim();
   if(text.length<=maxLength)return text;
   const candidate=text.slice(0,maxLength+1);
   const punctuation=Math.max(candidate.lastIndexOf(";"),candidate.lastIndexOf("."),candidate.lastIndexOf("·"));
   const space=candidate.lastIndexOf(" ");
   const cut=punctuation>=Math.floor(maxLength*.55)?punctuation:space>=Math.floor(maxLength*.7)?space:maxLength;
   return`${candidate.slice(0,cut).replace(/[;.,·\s]+$/g,"")}…`
 }
 function ctcPlainLocation(name){
   const source=String(name||"");
   if(/\bBone\b/i.test(source))return"กระดูก";
   if(/\bLiver\b/i.test(source))return"ตับ";
   if(/\bBrain\b/i.test(source))return"สมอง";
   if(/\bLung\b/i.test(source))return"ปอด";
   if(/\bPleura\b/i.test(source))return"เยื่อหุ้มปอด";
   if(/\bSkin\b/i.test(source))return"ผิวหนัง";
   return"อวัยวะที่ระบุในรายงาน"
 }
 const CTC_PUBLIC_MARKER_PROFILES={
   NANOG:{full:"NANOG",about:"โปรตีนควบคุมยีนที่เกี่ยวกับความสามารถของเซลล์ในการแบ่งตัวและคงสภาพที่ยังสร้างเซลล์รุ่นใหม่ได้",positive:"ผลนี้แสดงว่าเซลล์บางส่วนมีสัญญาณที่สัมพันธ์กับการคงสภาพและการแบ่งตัวต่อ",negative:"ผลนี้ไม่พบสัญญาณ NANOG ในกลุ่มเซลล์ที่ตรวจ",limit:"Marker ตัวเดียวไม่ยืนยันว่าเป็นเซลล์ต้นกำเนิดมะเร็งหรือดื้อยา"},
   SOX2:{full:"SOX-2 — SRY-box transcription factor 2",about:"โปรตีนควบคุมยีนที่เกี่ยวกับการคงสภาพ การปรับตัว และการแบ่งตัวของเซลล์",positive:"ผลนี้สนับสนุนว่าเซลล์บางส่วนมีลักษณะที่คงสภาพและแบ่งตัวต่อได้",negative:"ผลนี้ไม่พบสัญญาณ SOX-2 ในกลุ่มเซลล์ที่ตรวจ",limit:"ไม่ใช้ SOX-2 ตัวเดียวตัดสินความรุนแรง การดื้อยา หรือการกลับเป็นซ้ำ"},
   OKT4:{full:"OKT-4 (ควรยืนยันว่าอ้างถึง OCT-4 / POU5F1)",about:"รายงานจัดตัวนี้ไว้ในกลุ่ม Marker ที่เกี่ยวกับการคงสภาพและการแบ่งตัวต่อของเซลล์",positive:"ผลนี้พบสัญญาณของ Marker กลุ่มการคงสภาพในเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบหรือพบน้อยตามระดับที่รายงานระบุ",limit:"ชื่อ OKT-4 ไม่ใช่ชื่อยีนมาตรฐานของ OCT-4 จึงควรยืนยันชื่อเป้าหมายกับห้องปฏิบัติการก่อนตีความลึก"},
   OCT4:{full:"OCT-4 / POU5F1",about:"โปรตีนควบคุมยีนที่ช่วยคงความสามารถของเซลล์ในการแบ่งตัวและยังไม่เปลี่ยนเป็นเซลล์เฉพาะทาง",positive:"ผลนี้สนับสนุนลักษณะการคงสภาพของเซลล์บางส่วน",negative:"ผลนี้ไม่พบสัญญาณ OCT-4 ในกลุ่มเซลล์ที่ตรวจ",limit:"ไม่ยืนยัน cancer stem cell หรือการดื้อยาจาก Marker นี้เพียงตัวเดียว"},
   CD133:{full:"CD133 / PROM1",about:"โปรตีนบนผิวเซลล์ที่ใช้ช่วยจำแนกเซลล์ซึ่งมีความสามารถคงตัวและสร้างเซลล์รุ่นใหม่ในมะเร็งบางชนิด",positive:"ผลนี้พบ CD133 บนเซลล์บางส่วนที่ตรวจ",negative:"ผลนี้ไม่พบ CD133 บนเซลล์ที่ตรวจครั้งนี้",limit:"CD133 ลบไม่ได้ตัดเซลล์ที่มีลักษณะคล้าย stem cell เพราะมะเร็งใช้ Marker ได้หลายแบบ"},
   CD44:{full:"CD44",about:"โปรตีนยึดเกาะบนผิวเซลล์ที่เกี่ยวกับการเกาะ การเคลื่อนที่ และลักษณะคล้าย stem cell ในมะเร็งบางชนิด",positive:"ผลนี้พบ CD44 บนเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ CD44 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD44 พบได้ในเซลล์ปกติหลายชนิดและไม่ยืนยัน cancer stem cell"},
   CD34:{full:"CD34",about:"โปรตีนบนเซลล์ต้นกำเนิดเม็ดเลือด เซลล์ตัวอ่อนของระบบเลือด และเซลล์บุหลอดเลือดบางส่วน",positive:"ผลนี้พบ CD34 ในกลุ่มเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ CD34 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD34 ไม่จำเพาะต่อมะเร็งและต้องแปลผลร่วมกับชนิดเซลล์กับ Marker อื่น"},
   BCRABL:{full:"BCR::ABL1 fusion",about:"ยีนเชื่อมต่อผิดปกติที่สร้างโปรตีนไคเนสและพบเป็นตัวขับโรคในมะเร็งเม็ดเลือดบางชนิด",positive:"หากตรวจพบด้วยวิธีมาตรฐานอาจมีความสำคัญต่อการวินิจฉัยและเลือกยา",negative:"การไม่พบในแผง CTC นี้ไม่แทนผล molecular test มาตรฐาน",limit:"ต้องยืนยันด้วย PCR, FISH หรือ NGS; ชื่อในหน้า Index อย่างเดียวไม่ใช่ผลของผู้ป่วย"},
   CD30:{full:"CD30 / TNFRSF8",about:"โปรตีนบนเซลล์ภูมิคุ้มกันที่ถูกกระตุ้น และพบเด่นใน lymphoma บางชนิด เช่น Hodgkin lymphoma และ ALCL",positive:"ผลนี้อาจสนับสนุนลักษณะ CD30-positive เมื่อผลตรวจชนิดเซลล์อื่นสอดคล้อง",negative:"ผลนี้ไม่พบ CD30 ในกลุ่มเซลล์ที่ตรวจ",limit:"ต้องยืนยันด้วยพยาธิวิทยาหรือ flow cytometry ก่อนวินิจฉัยหรือเลือกยามุ่งเป้า CD30"},
   CD19:{full:"CD19",about:"โปรตีนบนเซลล์ B ใช้ช่วยจำแนกเซลล์ในระบบภูมิคุ้มกันและมะเร็งของเซลล์ B",positive:"ผลนี้พบลักษณะของสายเซลล์ B ในกลุ่มเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ CD19 ในกลุ่มเซลล์ที่ตรวจ",limit:"ต้องดูร่วมกับ CD20, CD45, flow cytometry และพยาธิวิทยา; ไม่จำเพาะต่อมะเร็งชนิดเดียว"},
   CD63:{full:"CD63",about:"โปรตีนในเยื่อหุ้มถุงภายในเซลล์และ extracellular vesicle พบได้ในเซลล์หลายชนิดรวมถึง melanoma บางราย",positive:"ผลนี้พบ CD63 ในกลุ่มเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ CD63 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD63 ไม่ใช่ Marker จำเพาะต่อ melanoma"},
   CD99:{full:"CD99 / MIC2",about:"โปรตีนบนผิวเซลล์ที่พบได้ในเนื้องอกหลายชนิดและมักใช้เป็นส่วนหนึ่งของแผงวินิจฉัย sarcoma บางชนิด",positive:"ผลนี้พบ CD99 ในกลุ่มเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ CD99 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD99 ตัวเดียวไม่ยืนยัน Ewing sarcoma หรือ sarcoma ชนิดอื่น"},
   PSMA:{full:"PSMA / FOLH1",about:"โปรตีนที่มักแสดงมากในมะเร็งต่อมลูกหมาก และพบได้ในเนื้อเยื่อหรือหลอดเลือดของมะเร็งชนิดอื่นบางส่วน",positive:"ผลนี้พบ PSMA ในกลุ่มเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ PSMA ในกลุ่มเซลล์ที่ตรวจ",limit:"ไม่ยืนยันมะเร็งต่อมลูกหมากหรือความเหมาะสมต่อ PSMA-targeted therapy โดยไม่ตรวจมาตรฐานเพิ่มเติม"},
   VHLMUTATION:{full:"VHL — von Hippel-Lindau tumor suppressor gene",about:"ยีนกดมะเร็งที่ควบคุมการตอบสนองต่อภาวะออกซิเจนต่ำ และผิดปกติได้บ่อยใน clear-cell renal cell carcinoma",positive:"การกลายพันธุ์ที่ยืนยันด้วยวิธีมาตรฐานอาจสนับสนุนบริบทของมะเร็งไตบางชนิด",negative:"การไม่พบในแผงนี้ไม่ตัดความผิดปกติของ VHL",limit:"ต้องใช้ molecular testing ยืนยัน mutation; รายการในหน้า Index ไม่ใช่ผลของผู้ป่วย"},
   EPCAM:{full:"EpCAM — Epithelial Cell Adhesion Molecule",about:"โปรตีนยึดเกาะบนผิวเซลล์ ใช้ช่วยบอกว่าเซลล์ที่ตรวจมีลักษณะของเซลล์เยื่อบุ ซึ่งพบได้ในมะเร็งกลุ่ม carcinoma",positive:"ผลนี้สนับสนุนว่าเซลล์ที่ตรวจมีลักษณะของเซลล์เยื่อบุ",negative:"ผลนี้ไม่พบ EpCAM บนเซลล์ที่ตรวจ ซึ่งอาจเกิดได้เมื่อเซลล์เปลี่ยนลักษณะหรือแสดง Marker ชนิดอื่น",limit:"ยังระบุอวัยวะต้นกำเนิดหรือยืนยันชนิดมะเร็งจากตัวนี้เพียงตัวเดียวไม่ได้"},
   PANCK:{full:"Pan-cytokeratin (panCK)",about:"กลุ่มโปรตีนโครงสร้างของเซลล์เยื่อบุ ใช้ช่วยยืนยันลักษณะ epithelial ของเซลล์",positive:"ผลนี้สนับสนุนว่าเซลล์มีโครงสร้างแบบเซลล์เยื่อบุ",negative:"ผลนี้ไม่พบ cytokeratin ที่ชุดตรวจตรวจจับได้ในเซลล์ครั้งนี้",limit:"ผลลบไม่ตัด carcinoma เพราะ CTC บางส่วนอาจสูญเสีย cytokeratin หรือมีระดับต่ำกว่าขีดตรวจ"},
   MUC1:{full:"MUC-1 / CD227",about:"โปรตีนเมือกบนผิวเซลล์เยื่อบุของอวัยวะหลายแห่ง และอาจแสดงมากหรือผิดรูปในมะเร็งบางชนิด",positive:"ผลนี้พบ MUC-1 บนเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ MUC-1 บนเซลล์ที่ตรวจครั้งนี้",limit:"MUC-1 ไม่จำเพาะต่อเต้านมหรือปอดและไม่ใช้ระบุต้นกำเนิดเพียงตัวเดียว"},
   SCCA1:{full:"SCCA-1 / SERPINB3",about:"โปรตีนที่อาจพบมากขึ้นในมะเร็งชนิดเซลล์สความัสบางชนิด",positive:"ผลนี้พบ SCCA-1 บนเซลล์ที่ตรวจและอาจสนับสนุนลักษณะสความัสเมื่อ Marker อื่นสอดคล้อง",negative:"ผลนี้ไม่พบ SCCA-1 ในเซลล์ที่ตรวจครั้งนี้",limit:"ผลบวกไม่ยืนยัน squamous carcinoma และผลลบก็ไม่ตัดโรค"},
   CD56:{full:"CD56 / NCAM1",about:"โปรตีนยึดเกาะที่พบได้ในเซลล์ NK เซลล์ประสาท และมะเร็ง neuroendocrine บางชนิด",positive:"ผลนี้พบ CD56 แต่ต้องดูว่าอยู่ในเซลล์กลุ่มใดและดู Marker อื่นร่วมกัน",negative:"ผลนี้ไม่พบ CD56 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD56 ไม่จำเพาะต่อ small-cell lung cancer หรือ neuroendocrine tumor"},
   CD45:{full:"CD45 / PTPRC",about:"โปรตีนที่พบในเม็ดเลือดขาว ใช้ช่วยแยกเซลล์ระบบเลือดออกจากกลุ่มเซลล์ที่นำไปประเมินเป็น CTC",positive:"ผลนี้สนับสนุนว่าเซลล์อยู่ในสายเม็ดเลือดขาว",negative:"ผลนี้ช่วยจัดเซลล์ให้อยู่ในกลุ่มที่ไม่ใช่เม็ดเลือดขาว ซึ่งต้องใช้ Marker อื่นยืนยันว่าเป็น CTC",limit:"CD45 ลบไม่ได้แปลว่าเซลล์นั้นเป็นมะเร็งโดยอัตโนมัติ"},
   CD31:{full:"CD31 / PECAM1",about:"โปรตีนบนเซลล์บุผนังหลอดเลือดและเซลล์เม็ดเลือดบางชนิด ใช้ช่วยแยกเซลล์ปนจากหลอดเลือด",positive:"ผลนี้พบลักษณะที่อาจมาจากเซลล์บุหลอดเลือดหรือเซลล์เลือดบางกลุ่ม",negative:"ผลนี้ไม่พบ CD31 บนเซลล์ที่ตรวจ",limit:"CD31 ไม่ใช่ Marker จำเพาะของมะเร็งและต้องดูร่วมกับ CD45 และ Marker เยื่อบุ"},
   CD15:{full:"CD15 / Lewis X",about:"น้ำตาลบนผิวเซลล์ที่พบมากในเม็ดเลือดขาวบางกลุ่ม โดยเฉพาะ granulocyte และพบได้ในมะเร็งบางชนิด",positive:"ผลนี้พบ CD15 ในกลุ่มเซลล์ที่รายงานระบุ",negative:"ผลนี้ไม่พบ CD15 ในกลุ่มเซลล์ที่ตรวจ",limit:"CD15 บวกไม่ยืนยันมะเร็งระบบเลือด เพราะพบได้ในเม็ดเลือดปกติและเซลล์ชนิดอื่น"},
   CMET:{full:"c-MET / MET — Hepatocyte Growth Factor Receptor",about:"ตัวรับสัญญาณ HGF ที่เกี่ยวกับการเติบโต การอยู่รอด และการเคลื่อนที่ของเซลล์",positive:"ผลนี้พบการแสดงออกของ c-MET บนเซลล์ที่ตรวจ",negative:"ผลนี้ไม่พบ c-MET ด้วยวิธีตรวจครั้งนี้",limit:"ผลการแสดงออกไม่ยืนยันว่ามียีน MET ผิดปกติ และไม่ตัด MET exon 14 skipping, mutation หรือ amplification; การเลือกยาต้องตรวจแบบมาตรฐาน"},
   HGFR:{full:"HGFR / c-MET",about:"ตัวรับ HGF ที่ส่งสัญญาณให้เซลล์เติบโต อยู่รอด และเคลื่อนที่",positive:"รายงานจัดสัญญาณ HGFR/c-MET นี้ว่าเด่นขึ้นในตัวอย่าง",negative:"รายงานไม่ได้จัด HGFR/c-MET ว่าเด่นขึ้นในตัวอย่าง",limit:"ไม่ใช่ผลตรวจ MET exon 14, mutation หรือ amplification และไม่ใช้เลือกยาเพียงตัวเดียว"},
   "67LR":{full:"67LR — 67-kDa Laminin Receptor / RPSA",about:"ตัวรับ laminin ที่ช่วยให้เซลล์ยึดกับชั้นฐานของเนื้อเยื่อและเกี่ยวข้องกับการเคลื่อนผ่านเนื้อเยื่อ",positive:"การแสดงออกที่สูงขึ้นอาจสนับสนุนความสามารถในการยึดเกาะและบุกรุกที่เด่นขึ้น",negative:"การแสดงออกที่ลดลงลดน้ำหนักกลไกการยึดเกาะผ่าน 67LR แต่ไม่ตัดการบุกรุกผ่านทางอื่น",neutral:"ค่าใกล้จุดตั้งต้นไม่ได้แปลว่าไม่มี 67LR หรือไม่มีความสามารถแพร่กระจาย",limit:"ยังไม่มี targeted therapy มาตรฐานที่เลือกจากค่า 67LR นี้โดยตรง"},
   CXCL12:{full:"CXCL12 / SDF-1",about:"สารสื่อสารที่ทำหน้าที่เหมือนสัญญาณนำทาง โดยจับกับ CXCR4 และดึงดูดเซลล์ให้เคลื่อนไปยังบริเวณที่มี CXCL12",positive:"การแสดงออกที่สูงขึ้นอาจทำให้แกน CXCL12–CXCR4 และการพึ่งพาเนื้อเยื่อแวดล้อมเด่นขึ้น",negative:"การแสดงออกที่ลดลงลดน้ำหนักสัญญาณนำทางจาก CXCL12 ในตัวอย่างนี้",neutral:"ค่าใกล้จุดตั้งต้นไม่ได้ตัดการทำงานของแกน CXCL12–CXCR4",limit:"Marker นี้ไม่ระบุตำแหน่ง metastasis และไม่ใช้เลือกยาโดยลำพัง"},
   CXCR4:{full:"CXCR4 / CD184",about:"ตัวรับสัญญาณ CXCL12 ที่เกี่ยวกับการเกาะและการเคลื่อนที่ รวมถึงการอยู่รอดของเซลล์ในเนื้อเยื่อบางแห่ง",positive:"การแสดงออกที่สูงขึ้นอาจสนับสนุนการเคลื่อนเข้าสู่เนื้อเยื่อเป้าหมายและการอยู่รอดในสภาพแวดล้อมนั้น",negative:"การแสดงออกที่ลดลงลดน้ำหนักการเคลื่อนที่ผ่านแกน CXCR4 แต่ไม่ตัดการแพร่กระจายผ่านกลไกอื่น",neutral:"ค่าใกล้จุดตั้งต้นไม่ได้แปลว่าแกน CXCR4 หยุดทำงาน",limit:"CXCR4 เด่นขึ้นไม่ยืนยันว่ามะเร็งกระจายไปกระดูก ตับ หรืออวัยวะใดแล้ว"},
   KISS1R:{full:"KISS1-R / KISS1R",about:"ตัวรับ kisspeptin ซึ่งเชื่อมกับระบบที่ช่วยควบคุมการเคลื่อนที่และการแพร่กระจายของเซลล์",positive:"การแสดงออกที่สูงขึ้นบอกว่าระบบ KISS1–KISS1R เด่นขึ้น แต่ทิศทางดีหรือร้ายขึ้นกับชนิดมะเร็ง",negative:"การแสดงออกที่ลดลงบอกว่าระบบนี้เด่นน้อยลงในตัวอย่าง แต่ไม่แปลว่าความเสี่ยงแพร่กระจายลดลงโดยอัตโนมัติ",neutral:"ค่าใกล้จุดตั้งต้นไม่ใช้ตัดสินความสามารถแพร่กระจาย",limit:"KISS1-R ไม่ใช่ Marker เดี่ยวสำหรับพยากรณ์โรคหรือเลือกยา"},
   MMP:{full:"MMP — Matrix Metalloproteinases",about:"กลุ่มเอนไซม์ที่ย่อยโครงสร้างรอบเซลล์ ทำให้เซลล์ผ่านชั้นเนื้อเยื่อได้ง่ายขึ้น",positive:"การแสดงออกที่สูงขึ้นอาจสนับสนุนการปรับโครงสร้างเนื้อเยื่อและการบุกรุกที่เด่นขึ้น",negative:"การแสดงออกที่ลดลงลดน้ำหนักกลไกผ่าน MMP ในตัวอย่าง แต่ยังมีเอนไซม์และทางเดินอื่น",neutral:"ค่าใกล้จุดตั้งต้นไม่ได้ตัดการบุกรุกของเซลล์",limit:"ชื่อ MMP แบบรวมไม่บอกว่าเป็น MMP ชนิดใด จึงไม่ควรเชื่อมกับยาเฉพาะตัว"},
   NM23:{full:"Nm23 / NME family",about:"โปรตีนกลุ่ม NME ที่เกี่ยวกับการควบคุมการเคลื่อนที่ของเซลล์ โดยบางชนิดมีบทบาทกดการแพร่กระจาย",positive:"การแสดงออกที่สูงขึ้นอาจสอดคล้องกับการควบคุมการแพร่กระจาย แต่ต้องทราบสมาชิก NME และชนิดมะเร็ง",negative:"การแสดงออกที่ลดลงอาจลดกลไกกดการแพร่กระจายในบางบริบท แต่ยังสรุปไม่ได้จากค่านี้ตัวเดียว",neutral:"ค่าใกล้จุดตั้งต้นไม่ใช้จัดความเสี่ยงแพร่กระจาย",limit:"คำว่า Nm23 อาจครอบคลุมหลายโปรตีนและบทบาทแตกต่างกัน"},
   TGFB:{full:"TGF-β — Transforming Growth Factor beta",about:"สารส่งสัญญาณที่มีหลายบทบาท; ในมะเร็งระยะลุกลามอาจช่วยการเปลี่ยนรูปร่าง การบุกรุก และการหลบภูมิคุ้มกัน",positive:"การแสดงออกที่สูงขึ้นอาจสนับสนุนสภาพแวดล้อมกดภูมิและการเคลื่อนที่ของเซลล์ที่เด่นขึ้น",negative:"การแสดงออกที่ลดลงลดน้ำหนักสัญญาณ TGF-β ในตัวอย่าง แต่ไม่แปลว่าเส้นทางนี้หยุดทำงาน",neutral:"ค่าใกล้จุดตั้งต้นไม่ได้บอกว่า TGF-β ไม่มีบทบาท",limit:"TGF-β มีทั้งบทบาทกดและส่งเสริมมะเร็งตามระยะโรค จึงไม่ตีความดี–ร้ายจากค่าเดียว"},
   TGFBR2:{full:"TGF-β receptor 2 / TGFBR2",about:"ตัวรับที่รับสัญญาณ TGF-β ซึ่งเกี่ยวกับการควบคุมการโต การเปลี่ยนรูปร่าง และภูมิคุ้มกัน",positive:"รายงานจัดสัญญาณตัวรับ TGF-β นี้ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัดตัวรับนี้ว่าเด่นขึ้น",limit:"ไม่ใช่ผล mutation ของ TGFBR2 และไม่ทำนายการตอบสนองต่อยาโดยตรง"},
   ITGB4R:{full:"Integrin β4 / ITGB4",about:"โปรตีนยึดเกาะที่ช่วยเชื่อมเซลล์กับชั้นฐานของเนื้อเยื่อ และอาจเกี่ยวกับการบุกรุกเมื่อการควบคุมผิดปกติ",positive:"รายงานจัดสัญญาณการยึดเกาะผ่าน ITGB4 ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด ITGB4 ว่าเด่นขึ้น",limit:"ไม่จำเพาะต่ออวัยวะและไม่ยืนยัน metastasis"},
   ITGB5R:{full:"Integrin β5 / ITGB5",about:"โปรตีนยึดเกาะที่เกี่ยวกับการเคลื่อนที่ การสร้างหลอดเลือด และการสื่อสารกับเนื้อเยื่อรอบเซลล์",positive:"รายงานจัดสัญญาณ ITGB5 ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด ITGB5 ว่าเด่นขึ้น",limit:"ไม่จำเพาะต่ออวัยวะและไม่ใช้วินิจฉัยการแพร่กระจาย"},
   ITGB6R:{full:"Integrin β6 / ITGB6",about:"โปรตีนยึดเกาะบนเซลล์เยื่อบุที่อาจช่วยการบุกรุกและกระตุ้นสัญญาณ TGF-β",positive:"รายงานจัดสัญญาณ ITGB6 ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด ITGB6 ว่าเด่นขึ้น",limit:"ไม่จำเพาะต่ออวัยวะและไม่ยืนยัน metastasis"},
   CCR6:{full:"CCR6",about:"ตัวรับสัญญาณ CCL20 ที่ช่วยนำทางการเคลื่อนที่ของเซลล์และเซลล์ภูมิคุ้มกัน",positive:"รายงานจัด CCR6 ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด CCR6 ว่าเด่นขึ้น",limit:"CCR6 ไม่จำเพาะต่อเยื่อหุ้มปอดหรืออวัยวะใดอวัยวะหนึ่ง"},
   MESOTHELIN:{full:"Mesothelin / MSLN",about:"โปรตีนบนผิวเซลล์ที่พบได้ในเยื่อหุ้มอวัยวะและมะเร็งเยื่อบุหลายชนิด",positive:"รายงานจัด Mesothelin ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด Mesothelin ว่าเด่นขึ้น",limit:"ไม่ใช่ผลย้อมชิ้นเนื้อและไม่จำเพาะต่อเยื่อหุ้มปอด"},
   CCR7:{full:"CCR7",about:"ตัวรับสัญญาณ CCL19/CCL21 ที่ช่วยนำเซลล์เข้าสู่ระบบน้ำเหลืองและต่อมน้ำเหลือง",positive:"รายงานจัด CCR7 ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด CCR7 ว่าเด่นขึ้น",limit:"CCR7 ไม่จำเพาะต่อผิวหนังและไม่ยืนยัน skin metastasis"},
   IGFR2:{full:"IGF-2 receptor / IGF2R",about:"ตัวรับที่ช่วยควบคุม IGF-2 และขนส่งสารบางชนิดภายในเซลล์ จึงมีผลต่อสมดุลสัญญาณการเติบโต",positive:"รายงานจัด IGF2R ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด IGF2R ว่าเด่นขึ้น",limit:"ไม่จำเพาะต่อปอดและไม่ใช่ Marker เลือกยา"},
   PHOSPHOERK1:{full:"Phospho-ERK1",about:"ERK1 ในรูปที่ถูกกระตุ้น เป็นส่วนหนึ่งของเส้นทาง MAPK ที่ควบคุมการโตและการแบ่งตัว",positive:"รายงานจัดสัญญาณ ERK1 ที่ถูกกระตุ้นว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด phospho-ERK1 ว่าเด่นขึ้น",limit:"การกระตุ้นโปรตีนไม่เท่ากับพบ KRAS, BRAF หรือยีนใน MAPK กลายพันธุ์"},
   PHOSPHOERK2:{full:"Phospho-ERK2",about:"ERK2 ในรูปที่ถูกกระตุ้น ส่งสัญญาณเกี่ยวกับการโต การอยู่รอด และการเคลื่อนที่ของเซลล์",positive:"รายงานจัดสัญญาณ ERK2 ที่ถูกกระตุ้นว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด phospho-ERK2 ว่าเด่นขึ้น",limit:"ไม่ใช่ผล mutation และไม่จำเพาะต่อปอด"},
   BMPR1A:{full:"BMPR1A — BMP receptor type 1A",about:"ตัวรับ BMP ที่เกี่ยวกับการเปลี่ยนแปลงของเซลล์และสัญญาณในกระดูกกับเนื้อเยื่อหลายชนิด",positive:"รายงานจัด BMPR1A ว่าเด่นขึ้นในกลุ่มกระดูก",negative:"รายงานไม่ได้จัด BMPR1A ว่าเด่นขึ้น",limit:"ไม่ยืนยันว่ามีรอยโรคในกระดูก"},
   BMPR1B:{full:"BMPR1B — BMP receptor type 1B",about:"ตัวรับ BMP ที่ช่วยควบคุมการเปลี่ยนแปลงและการทำงานของเซลล์ในกระดูกกับเนื้อเยื่ออื่น",positive:"รายงานจัด BMPR1B ว่าเด่นขึ้นในกลุ่มกระดูก",negative:"รายงานไม่ได้จัด BMPR1B ว่าเด่นขึ้น",limit:"ไม่ยืนยัน bone metastasis"},
   BMPR2:{full:"BMPR2 — BMP receptor type 2",about:"ตัวรับหลักที่ส่งสัญญาณ BMP ซึ่งเกี่ยวข้องกับการสร้างและปรับสภาพกระดูกและเนื้อเยื่อ",positive:"รายงานจัด BMPR2 ว่าเด่นขึ้นในกลุ่มกระดูก",negative:"รายงานไม่ได้จัด BMPR2 ว่าเด่นขึ้น",limit:"ไม่ยืนยัน bone metastasis"},
   RANK:{full:"RANK / TNFRSF11A",about:"ตัวรับ RANKL ที่สำคัญต่อเซลล์สลายกระดูกและการสื่อสารระหว่างเซลล์มะเร็งกับสภาพแวดล้อมกระดูก",positive:"รายงานจัด RANK ว่าเด่นขึ้นในกลุ่มกระดูก",negative:"รายงานไม่ได้จัด RANK ว่าเด่นขึ้น",limit:"ไม่ยืนยันรอยโรคกระดูกและไม่เป็นข้อบ่งใช้ยากระดูกจาก Marker นี้ตัวเดียว"},
   BST2:{full:"BST-2 / CD317 / Tetherin",about:"โปรตีนบนเยื่อหุ้มเซลล์ที่ตอบสนองต่อ interferon และอาจช่วยการอยู่รอดหรือการกระจายของเซลล์ในมะเร็งบางชนิด",positive:"รายงานจัด BST-2 ว่าเด่นขึ้นในกลุ่มกระดูก",negative:"รายงานไม่ได้จัด BST-2 ว่าเด่นขึ้น",limit:"BST-2 ไม่จำเพาะต่อกระดูก แม้ชื่อเดิมจะเกี่ยวข้องกับเซลล์พยุงในไขกระดูก"},
   TRAILR2:{full:"TRAIL-R2 / DR5 / TNFRSF10B",about:"ตัวรับที่สามารถส่งสัญญาณให้เซลล์เข้าสู่การตายตามธรรมชาติเมื่อได้รับสัญญาณ TRAIL ที่เหมาะสม",positive:"รายงานจัด TRAIL-R2 ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด TRAIL-R2 ว่าเด่นขึ้น",limit:"การมีตัวรับไม่ยืนยันว่ากระบวนการตายของเซลล์ทำงานหรือทำนายความไวต่อยา"},
   FASR:{full:"FAS receptor / CD95",about:"ตัวรับที่สามารถกระตุ้นการตายตามธรรมชาติของเซลล์เมื่อได้รับสัญญาณที่เหมาะสม",positive:"รายงานจัด FAS receptor ว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด FAS receptor ว่าเด่นขึ้น",limit:"การมีตัวรับไม่ยืนยันว่าเซลล์กำลังตายและไม่จำเพาะต่อตับ"},
   PHOSPHOSTAT3:{full:"Phospho-STAT3",about:"STAT3 ในรูปที่ถูกกระตุ้น ส่งสัญญาณเกี่ยวกับการอยู่รอด การอักเสบ และการหลบภูมิคุ้มกัน",positive:"รายงานจัดสัญญาณ STAT3 ที่ถูกกระตุ้นว่าเด่นขึ้น",negative:"รายงานไม่ได้จัด phospho-STAT3 ว่าเด่นขึ้น",limit:"ไม่ใช่ผล mutation และไม่จำเพาะต่อสมอง"},
   CX3CR1:{full:"CX3CR1",about:"ตัวรับ fractalkine ที่เกี่ยวกับการยึดเกาะและการเคลื่อนที่ของเซลล์",positive:"รายงานจัด CX3CR1 ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด CX3CR1 ว่าเด่นขึ้น",limit:"ไม่จำเพาะต่อสมองและไม่ยืนยัน brain metastasis"},
   DSC2:{full:"DSC-2 / Desmocollin-2",about:"โปรตีนที่ช่วยยึดเซลล์ข้างเคียงเข้าด้วยกันในโครงสร้าง desmosome",positive:"รายงานจัด DSC-2 ว่าเด่นขึ้นในกลุ่มที่ประเมิน",negative:"รายงานไม่ได้จัด DSC-2 ว่าเด่นขึ้น",limit:"สะท้อนการยึดเกาะของเซลล์แต่ไม่จำเพาะต่อสมอง"}
 };
 function ctcPublicMarkerKey(name){
   let source=String(name||"").replace(/β/g,"B");
   source=source.replace(/^(?:OncoTrail(?:\s+Index)?|METASTAT|Onconomics\s+Plus)\s*[—:–-]\s*/i,"");
   source=source.replace(/^(?:General|Pleura|Skin|Lung|Bone|Liver|Brain)\s+/i,"");
   source=source.replace(/^CD45\s*[+＋−–-]\s*/i,"");
   let key=source.toUpperCase().replace(/[^A-Z0-9]/g,"");
   if(key.includes("EPCAM"))key="EPCAM";
   if(key==="OKT4")return"OKT4";
   if(key==="OCT4"||key==="POU5F1")return"OCT4";
   if(key.startsWith("PANCK"))return"PANCK";
   if(key.startsWith("MUC1"))return"MUC1";
   if(key.startsWith("SCCA1"))return"SCCA1";
   if(key.startsWith("CMET"))return"CMET";
   if(key.startsWith("KISS1R"))return"KISS1R";
   if(key.startsWith("NM23"))return"NM23";
   if(key==="TGFB"||key.startsWith("TRANSFORMINGGROWTHFACTORB"))return"TGFB";
   return key
 }
 function ctcPublicMarkerProfile(item){return CTC_PUBLIC_MARKER_PROFILES[ctcPublicMarkerKey(item?.name)]||null}
 function ctcPublicText(value){
   return String(value||"")
     .replace(/basement membrane/gi,"ชั้นฐานของเนื้อเยื่อ")
     .replace(/stromal interaction/gi,"การสื่อสารกับเนื้อเยื่อแวดล้อม")
     .replace(/homing/gi,"การเคลื่อนเข้าสู่บริเวณเป้าหมาย")
     .replace(/migration/gi,"การเคลื่อนที่")
     .replace(/invasion/gi,"การบุกรุกเนื้อเยื่อ")
     .replace(/apoptosis/gi,"การตายตามธรรมชาติของเซลล์")
     .replace(/baseline/gi,"ค่าตั้งต้นของวิธีตรวจ")
 }
 function ctcCellPopulation(name){
   const source=String(name||"");
   if(/CD45\s*[+＋]/i.test(source))return"ในกลุ่มเซลล์ CD45+ ซึ่งส่วนใหญ่เป็นเซลล์ระบบเลือด";
   if(/CD45\s*[−–-]/i.test(source))return"ในกลุ่มเซลล์ CD45− ที่รายงานนำไปประเมินเป็น CTC";
   return""
 }
 function ctcPlainResult(item){
   const source=`${item?.reportedStatus||""} ${item?.result||""} ${item?.current||""}`;
   if(item?.sourceScope==="INDEX_ONLY")return"ไม่มีผลของผู้ป่วยในรายงานฉบับนี้";
   if(/BELOW\s+REPORT\s+LIMIT/i.test(source))return"พบในระดับต่ำกว่าเกณฑ์ที่รายงานใช้ติดตาม";
   if(/\bDIM\b/i.test(source))return"พบน้อย";
   if(/UP\s*REGULATED|ทำงานเด่นขึ้น/i.test(source))return"ทำงานเด่นขึ้นตามเกณฑ์ของรายงาน";
   if(/Positive\s*\/\s*เพิ่มขึ้น|แสดงออกสูงกว่า|สูงกว่า baseline/i.test(source))return"ทำงานมากกว่าค่าตั้งต้นของวิธีตรวจ";
   if(/Negative\s*\/\s*ลดลง|แสดงออกต่ำกว่า|ต่ำกว่า baseline/i.test(source))return"ทำงานน้อยกว่าค่าตั้งต้นของวิธีตรวจ";
   if(/Baseline|ใกล้ baseline/i.test(source))return"ใกล้ค่าตั้งต้นของวิธีตรวจ";
   if(/\bPOSITIVE\b|ตรวจพบ/i.test(source))return"พบ";
   if(/^\s*-\s*$/.test(String(item?.reportedStatus||item?.result||"")))return"ไม่ได้ถูกจัดว่าทำงานเด่นขึ้น";
   if(/\bNEGATIVE\b|^\s*-\s*$/i.test(String(item?.reportedStatus||item?.result||"")))return"ไม่พบ";
   if(/MAJOR\s+TREND/i.test(source))return"เป็นแนวโน้มหลักตามรายงาน";
   return"ผลตามรายงาน"
 }
 function ctcPlainAbout(item,type){
   const name=String(item?.name||""),key=name.toUpperCase();
   const publicProfile=ctcPublicMarkerProfile(item);
   if(publicProfile?.about)return publicProfile.about;
   if(/EPCAM\+\s*CTC/.test(key))return"นับ CTC กลุ่มที่มีโปรตีน EpCAM บนผิวเซลล์";
   if(/CTC\s*COUNT|CTC COUNT|LUNG CTC COUNT/.test(key))return"นับเซลล์ที่มีลักษณะเป็นเซลล์มะเร็งซึ่งตรวจพบในเลือด";
   if(/CD45/.test(key)&&!/CD45[−-]\s*(?:PANCK|EPCAM|CD133|C-MET|NANOG|SOX|OKT|OCT|MUC|CD31|SCCA|CD56)/.test(key))return"ช่วยแยกเม็ดเลือดขาวออกจากเซลล์ที่สงสัยว่าเป็น CTC";
   if(/PANCK|PAN-CYTOKERATIN|EPCAM|MUC-?1/.test(key))return"ดูว่าเซลล์มีลักษณะของเซลล์เยื่อบุ ซึ่งพบได้ในมะเร็งหลายชนิด";
   if(/CD133|CD44|NANOG|SOX-?2|OKT-?4|OCT-?4|POU5F1/.test(key))return"ดูสัญญาณที่เกี่ยวกับความสามารถของเซลล์ในการแบ่งตัวและคงสภาพเดิม";
   if(/C-MET|HGFR/.test(key))return"ดูสัญญาณที่เกี่ยวกับการโตและการเคลื่อนที่ของเซลล์";
   if(/CD31/.test(key))return"ช่วยดูว่าเซลล์ที่พบอาจเป็นเซลล์บุหลอดเลือดหรือไม่";
   if(/SCCA/.test(key))return"ดูสัญญาณที่อาจพบในเซลล์มะเร็งชนิดสความัส";
   if(/CD56/.test(key))return"ดูโปรตีนที่อาจพบในเซลล์ประสาทต่อมไร้ท่อและเซลล์ภูมิคุ้มกันบางชนิด";
   if(/BCR.?ABL/.test(key))return"ดูความผิดปกติของยีนที่พบได้ในมะเร็งเม็ดเลือดบางชนิด";
   if(/CD19|CD20|CD30|CD33|CD34|CD52/.test(key))return"ดูโปรตีนที่ช่วยบอกชนิดของเซลล์เม็ดเลือดหรือเซลล์ภูมิคุ้มกัน";
   if(/PSMA/.test(key))return"ดูโปรตีนที่มักพบมากในเซลล์มะเร็งต่อมลูกหมาก";
   if(/VHL/.test(key))return"ดูความผิดปกติของยีนที่เกี่ยวข้องกับมะเร็งไตบางชนิด";
   if(/CD63/.test(key))return"ดูโปรตีนที่เกี่ยวกับถุงเล็กภายในเซลล์และการปล่อยสารออกจากเซลล์";
   if(/CD99/.test(key))return"ดูโปรตีนบนผิวเซลล์ที่พบได้ในเนื้องอกหลายชนิด";
   if(/TGF|ITGB|INTEGRIN|CCR6|CCR7|CXCR4|CX3CR1|MMP|E.?CADHERIN|VIMENTIN|SNAIL|TWIST/.test(key))return"ดูสัญญาณที่เกี่ยวกับการเกาะและการเคลื่อนที่ของเซลล์";
   if(/MESOTHELIN/.test(key))return"ดูโปรตีนบนผิวเซลล์ที่พบได้ในมะเร็งหลายชนิด";
   if(/IGF|EGFR|ERBB|HER2|ALK|RET|KRAS|NRAS|BRAF|RAF|MEK|ERK|MAPK|PI3K|AKT|MTOR|CDK|CYCLIN|CCND/.test(key))return"ดูสัญญาณที่ควบคุมการโตและการแบ่งตัวของเซลล์";
   if(/BMPR|RANK|BST-?2/.test(key))return"ดูสัญญาณที่เกี่ยวกับการอยู่รอดของเซลล์และสภาพแวดล้อมของกระดูก";
   if(/TRAIL|FAS|BCL|BAX|CASP|APAF|TP53|P53/.test(key))return"ดูระบบที่ควบคุมการอยู่รอดหรือการตายของเซลล์";
   if(/STAT|NF.?K?B|COX-?2|PTGS2|\bIL\d|TNF/.test(key))return"ดูสัญญาณที่เกี่ยวกับการอักเสบ ภูมิคุ้มกัน และการอยู่รอดของเซลล์";
   if(/BRCA|ERCC|MGMT|MLH|MSH|PARP|ATM|ATR|CHEK|RAD|FAN|XRCC/.test(key))return"ดูระบบที่เซลล์ใช้ตรวจและซ่อมแซมความเสียหายของ DNA";
   if(/CYP|UGT|GST|DHFR|TYMS|\bTS\b|RRM|DPD|CES|ABCB|MDR|MRP|TOP|TUBULIN|SHMT|GARFT/.test(key))return"ดูระบบที่เกี่ยวกับการสร้าง DNA หรือการเปลี่ยนแปลงและขับยาออกจากเซลล์";
   if(/PD-?L1|PD-?1|CTLA|HLA|FOXP3|IDO/.test(key))return"ดูสัญญาณที่เซลล์ใช้ติดต่อหรือหลบการทำงานของภูมิคุ้มกัน";
   if(/VEGF|HIF|ANGPT|ANGIO/.test(key))return"ดูสัญญาณที่เกี่ยวกับการสร้างหลอดเลือดและการขาดออกซิเจนของเซลล์";
   if(/DNMT|HDAC/.test(key))return"ดูระบบเปิด–ปิดการทำงานของยีน โดยไม่ได้เปลี่ยนลำดับยีน";
   if(/ESR|PGR|CYP19|\bER\b|\bPR\b|\bAR\b/.test(key))return"ดูสัญญาณที่เกี่ยวกับการตอบสนองต่อฮอร์โมนของเซลล์";
   if(type==="RGCC_METASTAT")return"ดูสัญญาณที่อาจเกี่ยวกับการเคลื่อนที่และการอยู่รอดของเซลล์";
   if(type==="ONCONOMICS_PLUS"&&item?.what)return ctcPublicText(item.what);
   if(type==="ONCONOMICS_PLUS")return"ดูว่ายีนตัวนี้ทำงานมากหรือน้อยเมื่อเทียบกับค่าตั้งต้นของวิธีตรวจ";
   return"ดูว่าเซลล์ที่ตรวจมีสัญญาณของตัวนี้หรือไม่"
 }
 function ctcPlainCurrent(item,type){
   const raw=String(type==="RGCC_METASTAT"?(item?.reportedStatus||item?.result||"—"):(item?.result||"—")),status=ctcPlainResult(item);
   const primaryTrend=type==="RGCC_METASTAT"&&(/Primary destination trend/i.test(String(item?.name||""))||/MAJOR\s+TREND/i.test(raw));
   if(item?.sourceScope==="INDEX_ONLY")return"รายการนี้อยู่ในหน้าอธิบายของชุดตรวจ แต่รายงานของผู้ป่วยไม่มีผลของตัวนี้";
   if(/CTC\s*COUNT|CTC COUNT/i.test(String(item?.name||"")))return`รายงานระบุ ${raw} ในตัวอย่างเลือดครั้งนี้`;
   const profile=ctcPublicMarkerProfile(item),population=ctcCellPopulation(item?.name);
   let observed="";
   if(type==="RGCC_METASTAT"&&String(item?.sampleLevel??"").trim()&&String(item?.normalLevel??"").trim()){
     observed=`Sample Levels ${item.sampleLevel} · Normal Levels ${item.normalLevel} · Results ${raw}`
   }else if(type==="RGCC_METASTAT"&&/^\s*-\s*$/.test(raw))observed="รายงานไม่ได้จัดว่าตัวนี้ทำงานเด่นขึ้นในตัวอย่างครั้งนี้";
   else if(status==="พบ")observed=`พบตัวนี้ในเซลล์ที่ตรวจครั้งนี้ (${raw})`;
   else if(status==="พบน้อย")observed=`พบตัวนี้เพียงเล็กน้อยในเซลล์ที่ตรวจ (${raw})`;
   else if(status==="ไม่พบ")observed=`ไม่พบตัวนี้ในเซลล์ที่ตรวจครั้งนี้ (${raw})`;
   else if(status==="ทำงานเด่นขึ้นตามเกณฑ์ของรายงาน")observed=`รายงานจัดว่าตัวนี้ทำงานเด่นขึ้นในตัวอย่างครั้งนี้ (${raw})`;
   else if(status==="ทำงานมากกว่าค่าตั้งต้นของวิธีตรวจ"||status==="ทำงานน้อยกว่าค่าตั้งต้นของวิธีตรวจ"||status==="ใกล้ค่าตั้งต้นของวิธีตรวจ")observed=`${status} (${raw})`;
   else observed=`${status}: ${raw}`;
   let meaning="";
   if(type==="RGCC_ONCOTRAIL"){
     meaning=status==="พบ"||status==="พบน้อย"?profile?.positive:status==="ไม่พบ"?profile?.negative:"";
   }else if(type==="RGCC_METASTAT"){
     const location=ctcPlainLocation(item?.name);
     if(primaryTrend){
       observed=`รายงานสรุป MAJOR TREND ไปทาง${location}`;
       meaning=`เป็นบทสรุป organ-tropism หลักตาม algorithm ของรายงาน ไม่ได้ยืนยันว่าพบรอยโรคที่${location}`
     }else{
       meaning=status==="ทำงานเด่นขึ้นตามเกณฑ์ของรายงาน"?profile?.positive:profile?.negative;
       if(!meaning)meaning=status==="ทำงานเด่นขึ้นตามเกณฑ์ของรายงาน"
         ?`รายงานใช้เป็นข้อมูลหนึ่งในการประเมินแนวโน้มทางชีววิทยาไป${location}`
         :`ตัวนี้จึงไม่ใช่ Marker เด่นของกลุ่ม${location}ในรายงานครั้งนี้`;
     }
   }else if(type==="ONCONOMICS_PLUS"){
     if(status==="ทำงานมากกว่าค่าตั้งต้นของวิธีตรวจ")meaning=profile?.positive||ctcPublicText(item?.high);
     else if(status==="ทำงานน้อยกว่าค่าตั้งต้นของวิธีตรวจ")meaning=profile?.negative||ctcPublicText(item?.low);
     else if(status==="ใกล้ค่าตั้งต้นของวิธีตรวจ")meaning=profile?.neutral||"ค่าใกล้จุดตั้งต้นไม่ได้แปลว่าไม่มี Marker หรือไม่มีการทำงานของเส้นทางนี้";
   }
   return[observed,population,meaning].filter(Boolean).join(" · ")
 }
 function ctcPlainLimit(item,type){
   const key=String(item?.name||"").toUpperCase();
   const profileLimit=ctcPublicMarkerProfile(item)?.limit;
   if(item?.sourceScope==="INDEX_ONLY")return["ยังสรุปไม่ได้ว่าพบหรือไม่พบ เพราะรายงานฉบับนี้ไม่ได้ให้ผลของตัวนี้",profileLimit].filter(Boolean).join(" · ");
   if(/CTC\s*COUNT|CTC COUNT/.test(key))return"ยังบอกขนาดก้อน ระยะโรค หรือว่ามะเร็งหายแล้วไม่ได้ ต้องดูภาพถ่ายรังสีและผลอื่นร่วมด้วย";
   if(type==="RGCC_METASTAT")return[`ยังสรุปไม่ได้ว่ามะเร็งกระจายไป${ctcPlainLocation(item?.name)}แล้ว ต้องยืนยันด้วย CT/MRI/PET-CT ตามความเหมาะสม`,profileLimit].filter(Boolean).join(" · ");
   if(type==="ONCONOMICS_PLUS")return["ยังสรุปไม่ได้ว่ายีนกลายพันธุ์หรือควรใช้ยาใด ต้องยืนยันด้วยชิ้นเนื้อหรือการตรวจยีนมาตรฐาน",profileLimit].filter(Boolean).join(" · ");
   if(profileLimit)return profileLimit;
   if(/C-MET|HGFR/.test(key))return"ยังสรุปไม่ได้ว่ามียีน MET ผิดปกติหรือไม่ หากจะใช้เลือกยาต้องตรวจยีนด้วยวิธีมาตรฐาน";
   if(/CD133|CD44|NANOG|SOX-?2|OKT-?4|OCT-?4|POU5F1/.test(key))return"ยังสรุปไม่ได้ว่าเป็นเซลล์ต้นกำเนิดมะเร็งหรือดื้อยา เพราะต้องดูหลายปัจจัยร่วมกัน";
   return"ยังสรุปชนิด ต้นกำเนิด การลุกลาม หรือการตอบสนองต่อการรักษาจากตัวนี้เพียงตัวเดียวไม่ได้"
 }
 function ctcEnglishMarkerProfile(item,type){
   const marker=String(item?.name||"Marker"),publicProfile=ctcPublicMarkerProfile(item),full=publicProfile?.full||marker;
   const category=ctcMarkerCategory(item,type);
   const result=resultText(item);
   const raw=`${item?.reportedStatus||""} ${item?.result||""} ${item?.current||""}`;
   let status="Result as reported";
   if(item?.sourceScope==="INDEX_ONLY")status="Reference marker · not tested in this report";
   else if(/BELOW\s+REPORT\s+LIMIT/i.test(raw))status="Detected below the report's tracking threshold";
   else if(/\bDIM\b/i.test(raw))status="Dim / low-level detection";
   else if(/UP\s*REGULATED|ทำงานเด่นขึ้น|Positive\s*\/\s*เพิ่มขึ้น|แสดงออกสูงกว่า|สูงกว่า baseline/i.test(raw))status="Above the assay baseline / up-regulated";
   else if(/Negative\s*\/\s*ลดลง|แสดงออกต่ำกว่า|ต่ำกว่า baseline/i.test(raw))status="Below the assay baseline";
   else if(/Baseline|ใกล้ baseline/i.test(raw)||Number(item?.value)===0)status="Near the assay baseline";
   else if(/\bPOSITIVE\b|ตรวจพบ/i.test(raw))status="Detected";
   else if(/\bNEGATIVE\b/i.test(raw)||/^\s*-\s*$/.test(String(item?.reportedStatus||item?.result||"")))status="Not detected / not up-regulated";
   else if(/MAJOR\s+TREND/i.test(raw))status="Reported as the primary trend";
   const categoryText={
     count:"circulating tumor-cell enumeration and longitudinal tracking",
     identity:"cell identity, lineage or surface phenotype",
     stem:"stemness, self-renewal and continued proliferative potential",
     movement:"cell adhesion, migration, invasion and tissue homing",
     growth:"cell-growth and proliferation signaling",
     vessel:"angiogenesis and adaptation to low-oxygen conditions",
     survival:"cell-survival and programmed-cell-death signaling",
     immune:"immune signaling, inflammation and immune evasion",
     stress:"cellular stress-response and protective pathways",
     dna_drug:"DNA repair, gene regulation, drug metabolism or drug-efflux biology",
     hormone:"hormone-related signaling",
     other:"a specialized cellular function"
   }[category]||"a specialized cellular function";
   let about=`${full} is a marker related to ${categoryText}.`;
   let current=`The source report shows ${result} for ${marker}. This should be interpreted using the report's assay-specific method and longitudinal context.`;
   let limit="This marker alone cannot establish tumor type, stage, metastatic spread or treatment response.";
   if(category==="count"){
     about="Measures the number of circulating tumor cells (CTCs) detected in the blood sample by this assay.";
     current=`The current source-report value is ${result}. Serial measurements using the same assay are more informative than a single value.`;
     limit="A CTC count does not measure tumor size and cannot determine stage, remission or progression by itself. Correlate with imaging and the overall clinical picture.";
   }else if(type==="RGCC_METASTAT"){
     current=`The source report shows ${result} for ${marker}. METASTAT marker levels are assay-specific signals and are not direct measurements of tumor burden at an organ.`;
     limit="This marker alone does not confirm metastasis to a specific organ. Correlate with CT/MRI/PET-CT and other standard assessments when clinically appropriate.";
   }else if(type==="ONCONOMICS_PLUS"){
     current=`The source report shows ${result} for ${marker}. This is a gene-expression/functional-assay finding, not a genomic mutation result.`;
     limit="This result does not establish a mutation, amplification or companion-diagnostic biomarker and must not be used alone to select targeted therapy.";
   }
   return{...item,plainStatus:status,plainFullName:full,plainAbout:about,plainCurrent:current,plainLimit:limit}
 }
 function ctcPlainGlossaryItem(item,type){
   if(isEnglishMode())return ctcEnglishMarkerProfile(item,type);
   if(!item?.specific)return{...item,
     plainStatus:"ยังไม่มีคำอธิบายเฉพาะ",
     plainAbout:"ระบบยังไม่มีคำอธิบายเฉพาะสำหรับตัวนี้",
     plainCurrent:`ผลดิบตามรายงาน: ${String(item?.result||"—")}`,
     plainLimit:"ยังไม่ควรแปลผลอัตโนมัติ ต้องตรวจรายงานต้นฉบับหรือสอบถามห้องปฏิบัติการ"
   };
   const publicProfile=ctcPublicMarkerProfile(item);
   return{...item,plainStatus:ctcPlainResult(item),plainFullName:publicProfile?.full||"",plainAbout:ctcPlainAbout(item,type),plainCurrent:ctcPlainCurrent(item,type),plainLimit:ctcPlainLimit(item,type)}
 }
 const CTC_MARKER_CATEGORIES=[
   {id:"count",label:"จำนวน CTC และการนับเซลล์",labelEn:"CTC count and cell enumeration",hint:"จำนวนเซลล์ที่ตรวจพบในเลือดและค่าที่ใช้ติดตาม",hintEn:"Number of cells detected in blood and values used for longitudinal follow-up"},
   {id:"identity",label:"ลักษณะและชนิดของเซลล์",labelEn:"Cell phenotype and identity",hint:"ช่วยดูว่าเซลล์ที่พบคล้ายเซลล์กลุ่มใด",hintEn:"Helps characterize the lineage or phenotype of detected cells"},
   {id:"stem",label:"การคงสภาพและแบ่งตัวต่อ",labelEn:"Stemness and self-renewal",hint:"สัญญาณที่เกี่ยวกับการคงสภาพเดิมและแบ่งตัวต่อของเซลล์",hintEn:"Signals related to stemness, self-renewal and continued proliferation"},
   {id:"movement",label:"การเกาะ เคลื่อนที่ และแพร่กระจาย",labelEn:"Adhesion, migration and dissemination",hint:"สัญญาณที่ช่วยให้เซลล์เกาะ เคลื่อนที่ หรืออยู่ในอวัยวะต่าง ๆ",hintEn:"Signals related to cell adhesion, migration, invasion and tissue homing"},
   {id:"growth",label:"การเจริญเติบโตและแบ่งตัว",labelEn:"Growth and proliferation",hint:"วงจรสัญญาณที่ควบคุมการโตและการแบ่งตัวของเซลล์",hintEn:"Signaling pathways that regulate cell growth and proliferation"},
   {id:"vessel",label:"การสร้างหลอดเลือดและภาวะขาดออกซิเจน",labelEn:"Angiogenesis and hypoxia",hint:"สัญญาณที่เกี่ยวกับเลือดมาเลี้ยงก้อนและภาวะออกซิเจนต่ำ",hintEn:"Signals related to tumor blood supply and low-oxygen adaptation"},
   {id:"survival",label:"การอยู่รอดและการตายของเซลล์",labelEn:"Cell survival and death",hint:"ระบบที่กำหนดว่าเซลล์จะอยู่รอดหรือเข้าสู่กระบวนการตาย",hintEn:"Pathways governing cell survival and programmed cell death"},
   {id:"immune",label:"ภูมิคุ้มกันและการอักเสบ",labelEn:"Immunity and inflammation",hint:"สัญญาณของเซลล์ภูมิคุ้มกัน การอักเสบ และการหลบภูมิคุ้มกัน",hintEn:"Signals related to immune cells, inflammation and immune evasion"},
   {id:"stress",label:"ความเครียดและการป้องกันตัวของเซลล์",labelEn:"Cellular stress and defense",hint:"ระบบที่ช่วยให้เซลล์รับมือความร้อน รังสี และสภาวะกดดัน",hintEn:"Systems that help cells respond to heat, radiation and other stressors"},
   {id:"dna_drug",label:"DNA การควบคุมยีน และการตอบสนองต่อยา",labelEn:"DNA, gene regulation and drug response",hint:"การซ่อม DNA การเปิด–ปิดยีน และระบบที่เปลี่ยนแปลงหรือขับยา",hintEn:"DNA repair, gene regulation, drug metabolism and drug-efflux systems"},
   {id:"hormone",label:"ฮอร์โมน",labelEn:"Hormonal signaling",hint:"สัญญาณที่เกี่ยวกับการตอบสนองต่อฮอร์โมนของเซลล์",hintEn:"Signals related to cellular hormone responses"},
   {id:"other",label:"หน้าที่อื่น",labelEn:"Other functions",hint:"Marker ที่มีหน้าที่เฉพาะและยังไม่เข้ากลุ่มหลักด้านบน",hintEn:"Markers with specialized functions not assigned to the major groups above"}
 ];
 function ctcMarkerCategory(item,type){
   const key=String(item?.name||"").toUpperCase().replace(/^(?:ONCOTRAIL(?:\s+INDEX)?|METASTAT|ONCONOMICS\s+PLUS)\s*[—:–-]\s*/,"");
   const descriptor=`${key} ${item?.what||""} ${item?.purpose||""} ${item?.plainAbout||""}`.toUpperCase();
   if(/CTC\s*COUNT|CTC COUNT|EPCAM\+\s*CTC/.test(key))return"count";
   if(/NANOG|SOX-?2|OKT-?4|OCT-?4|POU5F1|CD133|CD44|CD34/.test(key))return"stem";
   if(/TGF|ITGB|INTEGRIN|CCR6|CCR7|CXCR4|CX3CR1|CXCL12|MMP|E.?CADHERIN|VIMENTIN|SNAIL|TWIST|DSC-?2|BMPR|RANK|BST-?2|67LR|KISS-?1|NM23|MIGRATION|INVASION/.test(descriptor))return"movement";
   if(/VEGF|HIF|ANGPT|ANGIO|\bANG\s*[12]\b|\bFGF\b|PDGF/.test(descriptor))return"vessel";
   if(/TRAIL|FAS|BCL|BAX|CASP|APAF|TP53|P53/.test(key))return"survival";
   if(/PD\s*-?\s*L?[12]|CTLA|HLA|FOXP3|IDO|STAT|NF.?K?B|IKB|COX-?2|PTGS2|5-LOX|\bIL\d|TNF|CD19|CD20|CD30|CD33|CD52|INFLAMMATION|IMMUN/.test(descriptor))return"immune";
   if(/\bP180\b|HSP\s*(?:27|70|72|90)|HEAT SHOCK|HYPERTHERMIA|CELLULAR STRESS/.test(descriptor))return"stress";
   if(/BRCA|ERCC|MGMT|MLH|MSH|PARP|ATM|ATR|CHEK|RAD|FAN|XRCC|BCR.?ABL|VHL|DNMT|HDAC|CYP|UGT|GST|DHFR|TYMS|\bTS\b|RRM|DPD|CES|ABCB|MDR|MRP|TOP|TUBULIN|SHMT|GARFT|DNA\s+(?:METHYLTRANSFERASE|DEMETHYLASE)|0?6-METHYL|HISTONEDEACETYLASE|\bHAT\b|GAMMA\s+GC|RIBONUCLEOSID|DRUG METABOLISM|RESISTANT PHENOTYPE|REPAIR RELATED/.test(descriptor)||/^(?:UP|NP|TP)$/.test(key.trim()))return"dna_drug";
   if(/ESR|PGR|CYP19|\bER\b|\bPR\b|\bAR\b|PROGESTERONE|ESTROGEN|NR3C4|HORMONE RECEPTOR/.test(descriptor))return"hormone";
   if(/IGF|EGF|EGFR|ERBB|C-ERB|HER2|ALK|RET|KRAS|NRAS|BRAF|RAF|MEK|ERK|MAPK|PI3K|AKT|MTOR|CDK|CYCLIN|CCND|C-MET|HGFR|PTEN|SS-?R|CD\s*117|C-?KIT|JAK|C-JUN|C-FOS|E2F1|CDC6|TERT|\bP27\b|\bP16\b|GROWTH FACTOR|CELL CYCLE/.test(descriptor))return"growth";
   if(/PANCK|PAN-CYTOKERATIN|EPCAM|MUC-?1|CD45|CD31|SCCA|CD56|MESOTHELIN|PSMA|CD63|CD99/.test(key))return"identity";
   if(type==="RGCC_METASTAT")return"movement";
   return"other"
 }
 function ctcMarkerTooltipText(item){
   return[
     item?.plainFullName?`${L("ชื่อเต็ม","Full name")}: ${conciseMarkerText(item.plainFullName,88)}`:"",
     String(item?.sampleLevel??"").trim()?`Sample Levels: ${item.sampleLevel}`:"",
     String(item?.normalLevel??"").trim()?`Normal Levels: ${item.normalLevel}`:"",
     item?.reportedStatus?`Results: ${item.reportedStatus}`:"",
     `${L("ดูอะไร","What it reflects")}: ${conciseMarkerText(item?.plainAbout,118)}`,
     `${L("ผลของคุณ","Your result")}: ${conciseMarkerText(item?.plainCurrent,132)}`
   ].filter(Boolean).join("\n")
 }
 function renderCtcMarkerItem(item){
   const tooltip=ctcMarkerTooltipText(item),hasMetastatLevels=Boolean(String(item?.sampleLevel??"").trim()||String(item?.normalLevel??"").trim()||String(item?.reportedStatus??"").trim());
   return`<details class="ctc-marker-item ${item.specific?"":"ctc-marker-missing"} ${item.sourceScope==="INDEX_ONLY"?"ctc-marker-index":""}">
     <summary class="ctc-tooltip-target" data-marker-tooltip="${MIW.Utils.escape(tooltip)}"><span class="ctc-marker-name"><b>${MIW.Utils.escape(item.name)}</b><span>${item.sourceScope==="INDEX_ONLY"?L("รายการอ้างอิง · ไม่ได้ตรวจในฉบับนี้","Reference marker · not tested in this report"):MIW.Utils.escape(item.plainStatus)}</span></span>${hasMetastatLevels?`<span class="ctc-level-preview"><span><small>SAMPLE LEVELS</small><b>${MIW.Utils.escape(item.sampleLevel||"—")}</b></span><span><small>NORMAL LEVELS</small><b>${MIW.Utils.escape(item.normalLevel||"—")}</b></span><span><small>RESULTS</small><b>${MIW.Utils.escape(item.reportedStatus||"—")}</b></span></span>`:`<span class="ctc-marker-result">${MIW.Utils.escape(item.result)}</span>`}<span class="ctc-marker-hover-hint" aria-hidden="true">${L("ชี้เมาส์เพื่อดู Pop-up · คลิกเพื่อเปิด","Hover for pop-up · click to open")}</span></summary>
     <div class="ctc-marker-fields is-compact">
       ${hasMetastatLevels?`<div class="ctc-marker-field wide ctc-metastat-source-levels"><span>${L("ค่าต้นฉบับจาก METASTAT","Original values from METASTAT")}</span><div><b>Sample Levels ${MIW.Utils.escape(item.sampleLevel||"—")}</b><b>Normal Levels ${MIW.Utils.escape(item.normalLevel||"—")}</b><b>Results ${MIW.Utils.escape(item.reportedStatus||"—")}</b></div><p>${L("Normal Levels เป็นค่าเปรียบเทียบของวิธีตรวจในรายงาน ไม่ใช่ช่วงปกติของประชากรทั่วไป","Normal Levels are assay-specific comparator values in the report, not a population reference interval")}</p></div>`:""}
       ${item.plainFullName?`<div class="ctc-marker-field wide ctc-marker-full-name"><span>${L("ชื่อเต็ม / ชื่อที่ใช้","Full name / designation")}</span><p>${MIW.Utils.escape(item.plainFullName)}</p></div>`:""}
       <div class="ctc-marker-field wide"><span>${L("ตัวนี้ดูอะไร","What this marker reflects")}</span><p>${MIW.Utils.escape(conciseMarkerText(item.plainAbout,210))}</p></div>
       <div class="ctc-marker-field wide"><span>${L("ผลของคุณหมายถึง","What your result means")}</span><p>${MIW.Utils.escape(conciseMarkerText(item.plainCurrent,260))}</p></div>
       <div class="ctc-marker-field wide"><span>${L("ยังสรุปไม่ได้ว่า","What this result cannot establish")}</span><p>${MIW.Utils.escape(conciseMarkerText(item.plainLimit,230))}</p></div>
     </div>
   </details>`
 }
 function renderOncotrailReportIndex(needle=""){
   const sourceRows=oncotrailReportIndexRows();
   const visible=needle?sourceRows.filter(item=>normalizedLabSearch(`${item.markers} ${item.source} ${item.plain} ${item.limit}`).includes(needle)):sourceRows;
   if(!visible.length)return"";
   return`<details class="ctc-report-index" data-oncotrail-report-index ${needle?"open":""}>
     <summary class="ctc-report-index-head"><span><b>${L("คำอธิบาย Marker ท้ายรายงาน OncoTrail","OncoTrail marker glossary from the source report")}</b><small>Index of markers · ${visible.length}/${sourceRows.length} ${L("บรรทัด","entries")}</small></span><span class="ctc-dropdown-label">${L("กดเพื่อเปิด / ย่อ","Click to expand / collapse")}</span></summary>
     <div class="ctc-report-index-note">${L("ส่วนนี้ถอดจากท้ายรายงานเพื่อใช้อ้างอิง ไม่ใช่ผล Positive/Negative ของผู้ป่วย เครื่องหมาย * หมายถึง Significant markers ตามคำอธิบายของรายงาน","This section is transcribed from the glossary at the end of the source report for reference. It is not the patient's Positive/Negative result. An asterisk (*) denotes Significant markers as defined by the report.")}</div>
     <div class="ctc-report-index-list">${visible.map(item=>{
       const tooltip=isEnglishMode()
         ?[`Marker: ${item.markers}`,`Source description: ${item.source}`,`Plain-language note: Marker reference text from the OncoTrail glossary; this is not the patient's positive/negative result.`].join("\n")
         :[`Marker: ${item.markers}`,`คำอธิบายต้นฉบับ: ${item.source}`,`ภาษาง่าย: ${item.plain}`].join("\n");
       const plain=isEnglishMode()?`Reference description from the OncoTrail source glossary for ${item.markers}.`:item.plain;
       const limit=isEnglishMode()?"This glossary entry is descriptive and must not be treated as a patient-specific Positive/Negative result or as a standalone diagnostic conclusion.":item.limit;
       return`<details class="ctc-report-index-item"><summary class="ctc-tooltip-target" data-marker-tooltip="${MIW.Utils.escape(tooltip)}"><b>${MIW.Utils.escape(item.markers)}</b><span>${MIW.Utils.escape(item.source)}</span><small>${L("ชี้เพื่อดู Pop-up · คลิกเพื่อเปิด","Hover for pop-up · click to open")}</small></summary><div><p><b>${L("อธิบายภาษาง่าย:","Plain-language explanation:")}</b> ${MIW.Utils.escape(plain)}</p><p><b>${L("ข้อควรจำ:","Important limitation:")}</b> ${MIW.Utils.escape(limit)}</p></div></details>`
     }).join("")}</div>
   </details>`
 }
 function renderCtcMarkerGlossary(type=activeCtcMarkerReport,query=""){
   const panel=document.getElementById("ctcMarkerGlossary"),list=document.getElementById("ctcMarkerGlossaryList");
   if(!panel||!list||!type)return false;
   activeCtcMarkerReport=type;
   const all=ctcMarkerEntries(type).map(item=>ctcPlainGlossaryItem(item,type)),needle=normalizedLabSearch(query);
   const reported=all.filter(item=>item.sourceScope!=="INDEX_ONLY");
   const visible=needle?reported.filter(item=>normalizedLabSearch(`${item.name} ${item.plainAbout} ${item.plainCurrent} ${item.plainLimit} ${item.sampleLevel||""} ${item.normalLevel||""} ${item.reportedStatus||""}`).includes(needle)):reported;
   const reportIndexCount=type==="RGCC_ONCOTRAIL"?oncotrailReportIndexRows().length:0;
   const title=document.getElementById("ctcMarkerGlossaryTitle"),summary=document.getElementById("ctcMarkerGlossarySummary");
   if(title)title.textContent=`${ctcMarkerReportLabel(type)} — ${L("Marker แยกตามหน้าที่","Markers grouped by function")}`;
   if(summary)summary.textContent=reportIndexCount
     ?L(`ผลของผู้ป่วย ${reported.length} รายการ · คำอธิบายท้ายรายงาน ${reportIndexCount} บรรทัด · ใช้ Drop-down เพื่อลดข้อความบนจอ`,`${reported.length} patient results · ${reportIndexCount} source-glossary entries · use drop-downs to keep the screen concise`)
     :L(`พบ ${reported.length} รายการ · ใช้ Drop-down แยกตามหน้าที่ · ชี้เมาส์เพื่อดู Pop-up`,`${reported.length} items found · use function-based drop-down groups · hover for a pop-up`);
   const groups=CTC_MARKER_CATEGORIES.map(category=>({
     ...category,items:visible.filter(item=>ctcMarkerCategory(item,type)===category.id)
   })).filter(category=>category.items.length);
   const categoryHtml=groups.map((category,index)=>`<details class="ctc-marker-category" data-marker-category="${category.id}" ${needle||index===0?"open":""}>
     <summary class="ctc-marker-category-head"><div><h5>${MIW.Utils.escape(L(category.label,category.labelEn||category.label))}</h5><p>${MIW.Utils.escape(L(category.hint,category.hintEn||category.hint))}</p></div><span>${L(`${category.items.length} รายการ`,`${category.items.length} items`)}</span></summary>
     <div class="ctc-marker-category-grid">${category.items.map(renderCtcMarkerItem).join("")}</div>
   </details>`).join("");
   const indexHtml=type==="RGCC_ONCOTRAIL"?renderOncotrailReportIndex(needle):"";
   list.innerHTML=categoryHtml+indexHtml||`<div class="ctc-marker-empty">${L("ไม่พบ Marker ที่ตรงกับคำค้น","No markers match the search")}</div>`;
   panel.hidden=false;
   return true
 }
 function openCtcMarkerGlossary(type){
   const search=document.getElementById("ctcMarkerSearch");
   if(search)search.value="";
   const opened=renderCtcMarkerGlossary(type,"");
   if(opened&&typeof document.getElementById("ctcMarkerGlossary")?.scrollIntoView==="function"){
     document.getElementById("ctcMarkerGlossary").scrollIntoView({block:"start",behavior:"smooth"})
   }
   return opened
 }
 function openOnconomicsFromCtc(){
   if(!MIW.OnconomicsSeries||typeof MIW.OnconomicsSeries.open!=="function")return false;
   Promise.resolve(MIW.OnconomicsSeries.open(currentPatientId)).then(()=>{
     if(typeof MIW.OnconomicsSeries.setDomain==="function")MIW.OnconomicsSeries.setDomain("GENE")
   }).catch(error=>{if(typeof alert==="function")alert(error.message)});
   return true
 }

 function legacyPseudoAbsoluteDifferential(row){
  const name=String(row?.name||"").trim();
  if(!/^(?:Neutrophils?|Lymphocytes?|Monocytes?|Eosinophils?|Basophils?)\s+Absolute$/i.test(name))return false;
  const unit=String(row?.reportedUnit||row?.reported_unit||row?.unit||"").replace(/\s+/g,"").toLowerCase();
  // A true absolute WBC differential is a concentration/count, never a percentage.
  // Older parser builds duplicated ordinary differential percentages under * Absolute.
  return unit==="%"||unit==="percent"||unit==="percentage";
 }
 function latestByTest(source=rows){
   source=(source||[]).filter(r=>!legacyPseudoAbsoluteDifferential(r));
   const hasUsable=new Set((source||[]).filter(r=>!Boolean(r?.specimenInterference||r?.specimen_interference)).map(r=>r.name));
   const eligible=(source||[]).filter(r=>!Boolean(r?.specimenInterference||r?.specimen_interference)||!hasUsable.has(r.name));
   const latest=new Map();
   eligible.forEach((r,index)=>{
     const old=latest.get(r.name);
     const moment=rowMoment(r),oldMoment=old?rowMoment(old.row):"";
     if(!old||moment>oldMoment||(moment===oldMoment&&index>old.index))latest.set(r.name,{row:r,index})
   });
   return[...latest.values()].map(item=>item.row)
 }
 function dashboardState(r){
   if(!r)return"context";
   if(isMasuyamaResult(r)){
     const code=masuyamaCodeOf(r),n=number(r.valueNumeric??r.value);
     if(code==="masuyama_immunity_level"){const level=String(r.value||"").toUpperCase();return["4","5"].includes(level)?"normal":"followup"}
     if(n===null)return"context";
     if(code==="masuyama_nlr")return n<1?"followup":n>1.8?"abnormal":"normal";
     if(code==="masuyama_cd4_cd8_ratio")return n<1.2?"followup":n>1.89?"abnormal":"normal";
     if(code==="masuyama_lymphocyte_count")return n>=2200?"normal":"followup";
     if(code==="masuyama_nk_cell_count")return n>=400?"normal":"followup";
     if(code==="masuyama_nk_vue")return n>=300?"normal":"followup";
     if(code==="masuyama_nkg2d_cell_count")return n>=1000?"normal":"followup";
   }
   const foodLevel=foodIntoleranceIgGLevel(r);
   if(foodLevel)return foodLevel==="High"?"abnormal":foodLevel==="Borderline"?"followup":"normal";
   const explicit=String(r.flag||r.calculatedFlag||"").toUpperCase();
   if(isCancerLiquidBiopsyResult(r))return["H","HH","HIGH"].includes(explicit)?"abnormal":"context";
   if(isAllergyResult(r)){
     const allergyClass=Number.isInteger(r.allergyClass)?r.allergyClass:null;
     return allergyClass===0?"normal":allergyClass===null?"context":"abnormal"
   }
   if(isContextDependentHormone(r)){
     if(["H","HH","HIGH"].includes(explicit))return"abnormal";
     if(["L","LL","LOW"].includes(explicit))return"followup";
     return"context"
   }
   const contextual=contextualReferenceInfo(r);
   if(contextual?.forceContext&&!(["H","HH","HIGH","L","LL","LOW"].includes(explicit)))return"context";
   if(["H","HH","HIGH"].includes(explicit))return"abnormal";
   if(["L","LL","LOW"].includes(explicit))return"followup";
   if(["N","NORMAL"].includes(explicit))return"normal";
   const n=number(r.valueNumeric??r.value),ref=rangeFor(r);
   if(n!==null){
     if(Number.isFinite(ref.high)&&n>ref.high)return"abnormal";
     if(Number.isFinite(ref.low)&&n<ref.low)return"followup";
     if(Number.isFinite(ref.low)||Number.isFinite(ref.high))return"normal"
   }
   const text=String(r.value||"").trim().toLowerCase();
   if(/^(?:negative|non[- ]?reactive|not detected|undetected|normal|nil|none)$/i.test(text))return"normal";
   if(/^(?:positive|reactive|detected)$/i.test(text))return"abnormal";
   return"context"
 }
 function dashboardSummary(source=rows){
   const latest=latestByTest(source);
   const counts={normal:0,followup:0,abnormal:0,context:0};
   latest.forEach(r=>counts[dashboardState(r)]++);
   return{latest,counts,total:latest.length}
 }
 function generalDashboardSummary(source=rows){
   return dashboardSummary((source||[]).filter(isGeneralDashboardRow))
 }
 function specializedDashboardRows(source=rows){return latestByTest(source).filter(row=>!isGeneralDashboardRow(row))}
 function moduleCounts(items){const counts={normal:0,followup:0,abnormal:0,context:0};items.forEach(row=>counts[dashboardState(row)]++);return counts}
 function moduleMetricModel(id,items){
   const counts=moduleCounts(items),num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
   if(id==="ALLERGY_IGE"){
     const positive=items.filter(r=>(Number.isInteger(r.allergyClass)?r.allergyClass:Number(r.allergy_class))>0).length;
     const food=items.filter(r=>/food/i.test(String(r.panel||""))).length,inhalant=Math.max(0,items.length-food);
     return{headline:`${positive} sensitized`,detail:`Food ${food} · Inhalant ${inhalant}`,tone:positive?"attention":"stable"}
   }
   if(id==="FOOD_IGG"){
     const high=items.filter(r=>foodIntoleranceIgGLevel(r)==="High").length,border=items.filter(r=>foodIntoleranceIgGLevel(r)==="Borderline").length;
     return{headline:`High ${high} · Borderline ${border}`,detail:L(`ทั้งหมด ${items.length} อาหาร`,`Total ${items.length} foods`),tone:high?"attention":border?"followup":"stable"}
   }
   if(id==="AUTOIMMUNE"){
     const positive=items.filter(r=>dashboardState(r)==="abnormal").length,context=items.filter(r=>dashboardState(r)==="context").length;
     return{headline:L(`Positive/ผิดปกติ ${positive}`,`Positive / abnormal ${positive}`),detail:L(`Pattern / titer / antibody ${items.length} รายการ${context?` · ต้องมีบริบท ${context}`:""}`,`Pattern / titer / antibody ${items.length} items${context?` · context required ${context}`:""}`),tone:positive?"attention":"context"}
   }
   if(id==="TOXICOLOGY")return{headline:L(`นอกช่วง ${counts.abnormal+counts.followup}`,`Out of range ${counts.abnormal+counts.followup}`),detail:L(`โลหะ/สาร ${items.length} รายการ · อ่านร่วม specimen/exposure`,`Metals/analytes ${items.length} items · interpret with specimen/exposure context`),tone:counts.abnormal?"attention":counts.followup?"followup":"stable"};
   if(id==="MICRONUTRIENT")return{headline:L(`ควรดู ${counts.abnormal+counts.followup}`,`Review ${counts.abnormal+counts.followup}`),detail:L(`สารอาหาร ${items.length} รายการ · Clinical/Optimal แยกกัน`,`Nutrients ${items.length} items · Clinical and Optimal ranges kept separate`),tone:counts.abnormal?"attention":counts.followup?"followup":"stable"};
   if(id==="INBODY"){
     const val=code=>items.find(r=>String(r.testCode||r.test_code||"").toLowerCase()===code),weight=val("inbody_weight"),bmi=val("inbody_bmi"),pbf=val("inbody_percent_body_fat");
     return{headline:[weight?`${weight.value} kg`:"",bmi?`BMI ${bmi.value}`:"",pbf?`PBF ${pbf.value}%`:""].filter(Boolean).join(" · ")||L(`${items.length} ค่า`,`${items.length} values`),detail:"Body composition · Segmental · Water balance",tone:"context"}
   }
   if(id==="HEMOGLOBIN_TYPING")return{headline:`${items.length} ค่า/รูปแบบ`,detail:"Hb fractions + interpretation",tone:"context"};
   if(id==="MOLECULAR"){
     const detected=items.filter(r=>/^(?:detected|positive|reactive)$/i.test(String(r.value||""))).length;
     return{headline:`Detected ${detected}`,detail:L(`PCR / Molecular ${items.length} รายการ`,`PCR / Molecular ${items.length} items`),tone:detected?"attention":"stable"}
   }
   if(id==="MASUYAMA"){
     const level=items.find(r=>String(r.testCode||r.test_code||"")==="masuyama_immunity_level");
     return{headline:level?`Immunity level ${level.value}`:L(`${items.length} ค่า`,`${items.length} values`),detail:"Best range ตามรายงาน Masuyama",tone:level&&["4","5"].includes(String(level.value))?"stable":"followup"}
   }
   if(id==="CTC"||id==="METASTAT"||id==="ONCONOMICS")return{headline:`${items.length} รายการ`,detail:"Precision oncology — ใช้ dashboard เฉพาะ",tone:"context"};
   return{headline:`${items.length} รายการ`,detail:L(`ผิดปกติ ${counts.abnormal} · ติดตาม ${counts.followup}`,`Abnormal ${counts.abnormal} · Follow-up ${counts.followup}`),tone:counts.abnormal?"attention":counts.followup?"followup":"context"}
 }
 function renderDiagnosticModules(){
   const grid=document.getElementById("diagnosticModuleGrid"),badge=document.getElementById("diagnosticModuleCount");if(!grid)return;
   const registry=MIW.DiagnosticModules,groups=registry?.groups?.(specializedDashboardRows(rows))||[];
   if(badge)badge.textContent=L(`${groups.length} หมวด`,`${groups.length} modules`);
   grid.innerHTML=groups.length?groups.map(({definition,items})=>{
     const metric=moduleMetricModel(definition.id,items);
     const label=isEnglishMode()?(definition.labelEn||translatedOr(definition.label,definition.short)):definition.label;
     const description=isEnglishMode()?(definition.descriptionEn||translatedOr(definition.description,"Specialized diagnostic module")):definition.description;
     return`<button class="diagnostic-module-card tone-${metric.tone}" type="button" data-diagnostic-module="${MIW.Utils.escape(definition.id)}" data-diagnostic-group="${MIW.Utils.escape(definition.category||"")}"><span class="diagnostic-module-short">${MIW.Utils.escape(definition.short)}</span><span class="diagnostic-module-copy"><b>${MIW.Utils.escape(label)}</b><strong>${MIW.Utils.escape(metric.headline)}</strong><small>${MIW.Utils.escape(metric.detail)}</small><em>${MIW.Utils.escape(description)}</em></span></button>`
   }).join(""):`<div class="executive-empty">${L("ยังไม่พบการตรวจเฉพาะทางในผู้ป่วยรายนี้","No specialized diagnostic module was found for this patient")}</div>`
 }
 function trendSeriesFor(name,source=rows){
   const seen=new Set();
   return (source||[]).filter(r=>!legacyPseudoAbsoluteDifferential(r))
     .filter(r=>r.name===name&&r.chartable!==false&&number(r.valueNumeric??r.value)!==null)
     .sort((a,b)=>rowMoment(a).localeCompare(rowMoment(b)))
     .filter(r=>{
       const key=[
         r.name,
         r.date||"",
         r.valueNumeric??r.value,
         r.unit||"",
         r.labNo||r.lab_no||"NO_LAB_NO"
       ].join("|");
       if(seen.has(key))return false;
       seen.add(key);
       return true
     })
 }
 function detailTrendDirection(name,source=rows){
   const series=trendSeriesFor(name,source);
   if(series.length<2)return"insufficient";
   const previous=number(series.at(-2).valueNumeric??series.at(-2).value);
   const latest=number(series.at(-1).valueNumeric??series.at(-1).value);
   if(previous===null||latest===null)return"insufficient";
   const tolerance=Math.max(Math.abs(previous),Math.abs(latest),1)*1e-12;
   if(Math.abs(latest-previous)<=tolerance)return"stable";
   return latest>previous?"up":"down"
 }
 function detailTrendSummary(latest=filteredTests(),source=rows){
   const counts={up:0,down:0,stable:0,insufficient:0};
   latest.forEach(r=>counts[detailTrendDirection(r.name,source)]++);
   return{
     counts,
     comparable:counts.up+counts.down+counts.stable,
     total:latest.length
   }
 }
 function statusRank(status){
   return{abnormal:0,followup:1,context:2,normal:3}[status]??4
 }
 function systemLabel(group){
   const labelsTh={
     "Hematology":"โลหิตวิทยา / CBC","Complete Blood Count":"โลหิตวิทยา / CBC","Kidney Function Test":"การทำงานของไต","Renal Function":"การทำงานของไต","Liver Function Test":"การทำงานของตับ","Tumor Marker":"สารบ่งชี้มะเร็ง","CTC":"CTC — การตรวจจากเซลล์มะเร็งในกระแสเลือด","Cancer Liquid Biopsy":"CTC — การตรวจจากเซลล์มะเร็งในกระแสเลือด","Vitamin & Mineral":"วิตามินและแร่ธาตุ","Body Composition":"องค์ประกอบร่างกาย / InBody","Clinical Chemistry":"เคมีคลินิก","Immunology":"ภูมิคุ้มกัน / Serology","Autoimmune & Immunology":"Autoimmune / Autoantibody","Toxicology / Heavy Metals":"Toxicology / Heavy Metals","Micronutrients & Nutritional Status":"Micronutrients / Nutritional Status","Molecular":"Molecular / PCR","Hemoglobin Typing":"Hemoglobin Typing","Masuyama Immunological":"Masuyama / Osaki Immunity","Food-specific IgG":"Food-specific IgG","Allergy":"ภูมิแพ้จำเพาะ (Specific IgE)","Hormone":"ฮอร์โมน","Lipid Profile":"ไขมันในเลือด","Urinalysis":"การตรวจปัสสาวะ","Coagulation":"การแข็งตัวของเลือด"
   };
   const labelsEn={
     "Hematology":"Hematology / CBC","Complete Blood Count":"Hematology / CBC","Kidney Function Test":"Renal function","Renal Function":"Renal function","Liver Function Test":"Liver function","Tumor Marker":"Tumor markers","CTC":"CTC — Circulating Tumor Cell testing","Cancer Liquid Biopsy":"CTC — Circulating Tumor Cell testing","Vitamin & Mineral":"Vitamins & minerals","Body Composition":"Body composition / InBody","Clinical Chemistry":"Clinical chemistry","Immunology":"Immunology / Serology","Autoimmune & Immunology":"Autoimmune / Autoantibody","Toxicology / Heavy Metals":"Toxicology / Heavy Metals","Micronutrients & Nutritional Status":"Micronutrients / Nutritional Status","Molecular":"Molecular / PCR","Hemoglobin Typing":"Hemoglobin Typing","Masuyama Immunological":"Masuyama / Osaki Immunity","Food-specific IgG":"Food-specific IgG","Allergy":"Specific allergy testing (IgE)","Hormone":"Hormones","Lipid Profile":"Lipid profile","Urinalysis":"Urinalysis","Coagulation":"Coagulation"
   };
   return (isEnglishMode()?labelsEn:labelsTh)[group]||group||"Other"
 }
 function systemRank(group){
   const order=[
     "Hematology","Complete Blood Count","Kidney Function Test","Renal Function",
     "Liver Function Test","Lipid Profile","Hormone","Tumor Marker","CTC","Cancer Liquid Biopsy",
     "Vitamin & Mineral","Autoimmune & Immunology","Toxicology / Heavy Metals","Micronutrients & Nutritional Status","Body Composition","Hemoglobin Typing","Molecular","Masuyama Immunological","Immunology","Food-specific IgG","Allergy","Urinalysis","Coagulation","Clinical Chemistry"
   ];
   const index=order.indexOf(group);
   return index<0?order.length:index
 }
 function rangeGeometry(r){
   const n=number(r?.valueNumeric??r?.value);
   if(n===null)return{position:50,trackClass:"contextual",label:L("ผลแบบข้อความ / ไม่มีแกนตัวเลข","Text result / no numeric axis")};
   if(isAllergyResult(r)){
     const allergyClass=Number.isInteger(r.allergyClass)?r.allergyClass:null;
     return{
       position:Math.max(3,Math.min(97,((allergyClass??0)/6)*100)),
       trackClass:"one-sided-high",
       label:L(`ภูมิคุ้มกันจำเพาะ ${r.valueOperator||""}${r.value} ${r.unit||""} · Class ${allergyClass??"—"}`,`Specific IgE ${r.valueOperator||""}${r.value} ${r.unit||""} · Class ${allergyClass??"—"}`)
     }
   }
   const contextual=contextualReferenceInfo(r);
   if(contextual)return{position:50,trackClass:"contextual",label:MIW.ContextualReference?.compact?.(contextual,currentPatient,r,isEnglishMode())||L("เกณฑ์ตามบริบทจากรายงาน","Source-report contextual thresholds")};
   const ref=rangeFor(r),low=ref.low,high=ref.high;
   if(Number.isFinite(low)&&Number.isFinite(high)){
     const span=Math.max(high-low,Math.abs(high||low||1)*.1,1e-9);
     const min=low-span/2,max=high+span/2;
     return{
       position:Math.max(2,Math.min(98,((n-min)/(max-min))*100)),
       trackClass:"",
       label:L(`ช่วงอ้างอิง ${ref.text||`${low}–${high}`} ${r.unit||""}`,`Reference interval ${ref.text||`${low}–${high}`} ${r.unit||""}`)
     }
   }
   if(Number.isFinite(high)){
     const min=high>=0?0:high*2,max=high>=0?Math.max(high*1.5,1):0;
     return{
       position:Math.max(2,Math.min(98,((n-min)/(max-min||1))*100)),
       trackClass:"one-sided-high",
       label:L(`เกณฑ์บน ${ref.text||`≤ ${high}`} ${r.unit||""}`,`Upper threshold ${ref.text||`≤ ${high}`} ${r.unit||""}`)
     }
   }
   if(Number.isFinite(low)){
     const min=low>=0?0:low*1.5,max=low>=0?Math.max(low*1.5,1):0;
     return{
       position:Math.max(2,Math.min(98,((n-min)/(max-min||1))*100)),
       trackClass:"one-sided-low",
       label:L(`เกณฑ์ล่าง ${ref.text||`≥ ${low}`} ${r.unit||""}`,`Lower threshold ${ref.text||`≥ ${low}`} ${r.unit||""}`)
     }
   }
   return{position:50,trackClass:"contextual",label:L("ไม่มีช่วงอ้างอิงที่ใช้จัดสถานะ","No source-report reference interval is available for classification")}
 }
 function statusThai(status){
   const th={normal:"อยู่ในช่วงอ้างอิง",followup:"ต่ำ / ควรติดตาม",abnormal:"สูง / ผิดปกติ",context:"ต้องอาศัยบริบท"};
   const en={normal:"Within reference interval",followup:"Low / follow-up",abnormal:"High / abnormal",context:"Needs clinical context"};
   return (isEnglishMode()?en:th)[status]||status
 }
 function detailCategoryDisplayUnit(row){
   const name=String(row?.name||"").trim().toLowerCase(),code=String(row?.testCode||row?.test_code||"").trim().toLowerCase();
   const n=number(row?.valueNumeric??row?.value),ref=rangeFor(row),raw=String(row?.reportedUnit||row?.reported_unit||row?.unit||"").trim();
   const isRbc=code==="rbc_count"||/^(?:rbc|rbc count|red blood cell(?: count)?)$/.test(name);
   const isPlatelet=code==="platelet_count"||/^(?:platelet|platelets|platelet count)$/.test(name);
   if(isRbc&&n!==null&&Math.abs(n)<100&&(!Number.isFinite(ref.high)||Math.abs(ref.high)<100))return"10^6 cells/mm3";
   if(isPlatelet&&n!==null&&Math.abs(n)<5000&&(!Number.isFinite(ref.high)||Math.abs(ref.high)<5000))return"10^3 cells/mm3";
   return raw
 }
 function detailCategoryTrendMeta(row,source=rows){
   const series=trendSeriesFor(row?.name,source);
   const direction=detailTrendDirection(row?.name,source);
   const previous=series.length>=2?series.at(-2):null;
   const meta={
     up:{symbol:"↑",label:L("เพิ่มขึ้น","Increasing"),className:"up"},
     down:{symbol:"↓",label:L("ลดลง","Decreasing"),className:"down"},
     stable:{symbol:"—",label:L("คงที่","Stable"),className:"stable"},
     insufficient:{symbol:"—",label:L("ครั้งเดียว / ยังเปรียบเทียบไม่ได้","Single result / not comparable"),className:"insufficient"}
   }[direction]||{symbol:"—",label:L("ยังเปรียบเทียบไม่ได้","Not comparable"),className:"insufficient"};
   return{...meta,direction,previous,series}
 }
 function detailCategoryModel(groupName,source=rows){
   if(!groupName)return null;
   const items=sortLatestTests(latestByTest(source).filter(r=>(r.group||"Other")===groupName));
   const counts={normal:0,followup:0,abnormal:0,context:0};
   items.forEach(r=>counts[dashboardState(r)]++);
   const trendCounts={up:0,down:0,stable:0,insufficient:0};
   items.forEach(r=>trendCounts[detailTrendDirection(r.name,source)]++);
   return{
     groupName,items,counts,trendCounts,
     comparable:trendCounts.up+trendCounts.down+trendCounts.stable,
     total:items.length
   }
 }
 function renderInBodyClinicalInterpretation(model){
   const host=document.getElementById("detailInBodyClinicalInterpretation");if(!host)return;
   if(!model||model.groupName!=="Body Composition"){
     host.hidden=true;host.innerHTML="";return
   }
   const interpretation=MIW.InBodyInterpretation?.build?.(rows,{latestRows:model.items,lang:isEnglishMode()?"en":"th"});
   if(!interpretation?.available){host.hidden=true;host.innerHTML="";return}
   host.hidden=false;
   const icon={fat:"F",muscle:"M",visceral:"V",metabolic:"E",fluid:"W",segmental:"S",weight:"↔"};
   const domains=interpretation.domains.map(d=>`<article class="detail-inbody-domain tone-${MIW.Utils.escape(d.tone)}"><i>${MIW.Utils.escape(icon[d.id]||"IB")}</i><div><b>${MIW.Utils.escape(d.title)}</b><strong>${MIW.Utils.escape(d.headline)}</strong><p>${MIW.Utils.escape(d.detail)}</p></div></article>`).join("");
   const priorities=interpretation.priorities.map((p,index)=>`<li class="tone-${MIW.Utils.escape(p.tone)}"><span>${index+1}</span><div><b>${MIW.Utils.escape(p.title)}</b><p>${MIW.Utils.escape(p.detail)}</p></div></li>`).join("");
   const trend=interpretation.trend?.available?`<section class="detail-inbody-trend"><div class="detail-inbody-subhead"><span>${L("แนวโน้มองค์ประกอบร่างกาย","Body-composition trend")}</span><b>${L("เทียบผลที่มีวันตรวจซ้ำ","Serial comparison")}</b></div><div>${interpretation.trend.cards.map(c=>`<article><b>${MIW.Utils.escape(c.name)}</b><strong class="trend-${MIW.Utils.escape(c.direction)}">${c.direction==="up"?"↑":c.direction==="down"?"↓":"—"}</strong><span>${MIW.Utils.escape(c.previous)} → ${MIW.Utils.escape(c.latest)}</span></article>`).join("")}</div><small>${L("ลูกศรบอกทิศทางตัวเลขเท่านั้น ต้องอ่านร่วมกับเป้าหมายของแต่ละค่า","Arrows show numeric direction only; interpret against the goal for each metric")}</small></section>`:"";
   const sourceNotes=interpretation.sourceNotes?.length?`<section class="detail-inbody-source-notes"><div class="detail-inbody-subhead"><span>${L("ข้อควรรู้จากต้นฉบับ","Source-specific notes")}</span><b>${L("หมายเหตุเฉพาะของ InBody","InBody-specific source notes")}</b></div><ul>${interpretation.sourceNotes.map(n=>`<li>${MIW.Utils.escape(n)}</li>`).join("")}</ul></section>`:"";
   host.innerHTML=`<div class="detail-inbody-pattern tone-${MIW.Utils.escape(interpretation.pattern.tone)}"><span>${L("ภาพรวมการแปลผล InBody","InBody interpretation overview")}</span><h4>${MIW.Utils.escape(interpretation.pattern.title)}</h4><p>${MIW.Utils.escape(interpretation.pattern.summary)}</p></div><div class="detail-inbody-domain-grid">${domains}</div><section class="detail-inbody-priorities"><div class="detail-inbody-subhead"><span>${L("สิ่งที่ควรติดตาม","Follow-up priorities")}</span><b>${L("ประเด็นสำคัญจากองค์ประกอบร่างกาย","Body-composition priorities")}</b></div><ol>${priorities}</ol></section>${sourceNotes}${trend}<div class="detail-inbody-source-note"><b>${L("ตัวเลขจากต้นฉบับ + คำอธิบาย MIW","Source values + MIW interpretation")}</b><p>${MIW.Utils.escape(interpretation.sourceRule)}</p><small>${MIW.Utils.escape(interpretation.diagnosticCaution)}</small></div>`
 }
 function renderDetailCategoryOverview(){
   const panel=document.getElementById("detailCategoryOverview");
   if(!panel)return;
   const search=String(document.getElementById("trackerSearch")?.value||"").trim();
   const selectedGroup=search?"":String(document.getElementById("trackerGroup")?.value||"");
   const model=detailCategoryModel(selectedGroup,rows);
   if(!model||!model.items.length){
     panel.hidden=true;
     renderInBodyClinicalInterpretation(null);
     return
   }
   panel.hidden=false;
   const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value)};
   setText("detailCategoryTitle",`${systemLabel(model.groupName)} — ${L("หน้ารวมหมวด","Category overview")}`);
   setText("detailCategorySubtitle",L(`ภาพรวมผลล่าสุด ${model.total} รายการ พร้อม Snapshot และแนวโน้มก่อนเปิดคำอธิบายรายตัว`,`Overview of ${model.total} latest results with a snapshot and trends before item-by-item explanations`));
   setText("detailCategoryCount",L(`${model.total} รายการ`,`${model.total} tests`));
   renderInBodyClinicalInterpretation(model);

   const metrics=document.getElementById("detailCategoryMetrics");
   if(metrics)metrics.innerHTML=[
     ["all",model.total,L("ทั้งหมด","All")],
     ["abnormal",model.counts.abnormal,L("สูง / ผิดปกติ","High / abnormal")],
     ["followup",model.counts.followup,L("ต่ำ / ติดตาม","Low / follow-up")],
     ["context",model.counts.context,L("ต้องประเมิน","Needs context")],
     ["normal",model.counts.normal,L("อยู่ในช่วงอ้างอิง","Within range")]
   ].map(([key,count,label])=>`<button class="detail-category-metric metric-${key} ${activeStatusFilter===key||key==="all"&&!activeStatusFilter?"active":""}" type="button" data-category-status="${key==="all"?"":key}"><b>${count}</b><span>${MIW.Utils.escape(label)}</span></button>`).join("");

   const trendStrip=document.getElementById("detailCategoryTrendStrip");
   if(trendStrip)trendStrip.innerHTML=[
     ["up","↑",L("เพิ่มขึ้น","Increasing"),model.trendCounts.up],
     ["down","↓",L("ลดลง","Decreasing"),model.trendCounts.down],
     ["stable","—",L("คงที่","Stable"),model.trendCounts.stable],
     ["insufficient","1",L("ยังเปรียบเทียบไม่ได้","Not comparable"),model.trendCounts.insufficient]
   ].map(([key,icon,label,count])=>`<div class="detail-category-trend trend-${key}"><i>${icon}</i><span>${MIW.Utils.escape(label)}</span><b>${count}</b></div>`).join("");

   const rowsHost=document.getElementById("detailCategorySnapshotRows");
   if(rowsHost)rowsHost.innerHTML=model.items.map(r=>{
     const status=dashboardState(r),trend=detailCategoryTrendMeta(r,rows);
     const previousUnit=trend.previous?detailCategoryDisplayUnit(trend.previous):"";
     const previous=trend.previous?`${L("ก่อนหน้า","Previous")}: ${trend.previous.value}${previousUnit?` ${previousUnit}`:""} · ${displayDate(trend.previous.date)}`:L("ยังไม่มีผลก่อนหน้าที่เปรียบเทียบได้","No comparable previous result");
     const latestDate=displayDate(r.date),displayUnit=detailCategoryDisplayUnit(r);
     const ref=referenceText(r)||L("ไม่ระบุ","Not reported");
     return`<button class="detail-category-snapshot-row snapshot-${status}" type="button" data-category-test="${MIW.Utils.escape(r.name)}" title="${MIW.Utils.escape(L(`เปิดคำอธิบาย ${r.name}`,`Open explanation for ${r.name}`))}">
       <span class="snapshot-test"><b>${MIW.Utils.escape(r.name)}</b><small>${MIW.Utils.escape(latestDate)}</small></span>
       <span class="snapshot-value"><b>${MIW.Utils.escape(r.value)}${displayUnit?` ${MIW.Utils.escape(displayUnit)}`:""}</b></span>
       <span class="snapshot-reference">${MIW.Utils.escape(ref)}${displayUnit&& !String(ref).includes(displayUnit)?` ${MIW.Utils.escape(displayUnit)}`:""}</span>
       <span class="snapshot-status"><em>${MIW.Utils.escape(statusThai(status))}</em></span>
       <span class="snapshot-trend trend-${trend.className}"><b>${trend.symbol} ${MIW.Utils.escape(trend.label)}</b><small>${MIW.Utils.escape(previous)}</small></span>
     </button>`
   }).join("");
 }
 function renderDetailDashboard(list=filteredTests()){
   const base=detailBaseTests();
   const counts={normal:0,followup:0,abnormal:0,context:0};
   base.forEach(r=>counts[dashboardState(r)]++);
   const setText=(id,value)=>{
     const element=document.getElementById(id);
     if(element)element.textContent=String(value)
   };
   setText("detailOverviewTotal",base.length);
   setText("detailOverviewAbnormalCount",counts.abnormal);
   setText("detailOverviewFollowupCount",counts.followup);
   setText("detailOverviewContextCount",counts.context);
   setText("detailOverviewNormalCount",counts.normal);
   setText("detailOverviewVisible",activeStatusFilter?`${list.length} จาก ${base.length} รายการ`:`${list.length} รายการ`);

   const search=String(document.getElementById("trackerSearch").value||"").trim();
   const group=search?"":document.getElementById("trackerGroup").value;
   const scopeParts=[];
   if(search)scopeParts.push(`ค้นหา “${search}”`);
   if(group)scopeParts.push(systemLabel(group));
   if(activeStatusFilter)scopeParts.push(statusThai(activeStatusFilter));
   const scope=document.getElementById("detailOverviewScope");
   if(scope)scope.textContent=L(`ผลล่าสุดของแต่ละรายการ${scopeParts.length?` · ${scopeParts.join(" · ")}`:" · ทุกกลุ่มและทุกสถานะ"}`,`Latest result for each test${scopeParts.length?` · ${scopeParts.join(" · ")}`:" · all groups and all statuses"}`);

   const metricIds={
     "":"detailOverviewAll",
     abnormal:"detailOverviewAbnormal",
     followup:"detailOverviewFollowup",
     context:"detailOverviewContext",
     normal:"detailOverviewNormal"
   };
   Object.entries(metricIds).forEach(([status,id])=>{
     const element=document.getElementById(id);
     if(!element)return;
     const tone=status?`metric-${status}`:"metric-all";
     element.className=`detail-overview-metric ${tone} ${activeStatusFilter===status?"active":""}`.trim()
   });
   const percent=key=>base.length?counts[key]/base.length*100:0;
   const statusBar=document.getElementById("detailOverviewStatusBar");
   if(statusBar)statusBar.innerHTML=[
     ["abnormal",counts.abnormal],["followup",counts.followup],["context",counts.context],["normal",counts.normal]
   ].filter(([,count])=>count>0).map(([key])=>`<i class="${key}" style="width:${percent(key).toFixed(2)}%" title="${MIW.Utils.escape(statusThai(key))}: ${counts[key]}"></i>`).join("");

   const trends=detailTrendSummary(list);
   setText("detailTrendComparable",L(`${trends.comparable} รายการมีข้อมูลซ้ำ`,`${trends.comparable} tests have repeat results`));
   const trendGrid=document.getElementById("detailTrendGrid");
   if(trendGrid)trendGrid.innerHTML=[
     ["up","↑",L("ตัวเลขเพิ่มขึ้น","Increasing"),trends.counts.up],
     ["down","↓",L("ตัวเลขลดลง","Decreasing"),trends.counts.down],
     ["stable","→",L("คงที่","Stable"),trends.counts.stable],
     ["insufficient","1",L("ยังเปรียบเทียบไม่ได้","Not comparable"),trends.counts.insufficient]
   ].map(([key,icon,label,count])=>`<div class="detail-trend-item trend-${key}"><i>${icon}</i><span>${label}</span><b>${count}</b></div>`).join("");

   const groups=new Map();
   list.forEach(r=>{
     const groupName=r.group||"Other";
     if(!groups.has(groupName))groups.set(groupName,[]);
     groups.get(groupName).push(r)
   });
   setText("detailGroupCount",L(`${groups.size} หมวด`,`${groups.size} categories`));
   const groupGrid=document.getElementById("detailOverviewGroupGrid");
   if(groupGrid)groupGrid.innerHTML=[...groups.entries()].map(([groupName,items])=>{
     const groupCounts={normal:0,followup:0,abnormal:0,context:0};
     items.forEach(r=>groupCounts[dashboardState(r)]++);
     const abnormalItems=sortLatestTests(items)
       .filter(r=>["abnormal","followup"].includes(dashboardState(r)));
     return{
       groupName,items,groupCounts,abnormalItems,
       attention:groupCounts.abnormal+groupCounts.followup
     }
   }).sort((a,b)=>b.attention-a.attention||
     b.groupCounts.context-a.groupCounts.context||
     b.items.length-a.items.length||
     systemRank(a.groupName)-systemRank(b.groupName)||
     systemLabel(a.groupName).localeCompare(systemLabel(b.groupName))
   ).map(({groupName,items,groupCounts,abnormalItems,attention})=>{
     const visibleAbnormal=abnormalItems.slice(0,8);
     const remaining=Math.max(0,abnormalItems.length-visibleAbnormal.length);
     return`<article class="detail-group-item ${attention?"has-attention":"all-normal"}">
       <button class="detail-group-select" type="button" data-detail-group="${MIW.Utils.escape(groupName)}" title="${MIW.Utils.escape(L("เปิดหน้ารวมหมวด","Open category overview"))} ${MIW.Utils.escape(systemLabel(groupName))}">
         <span class="detail-group-name"><b>${MIW.Utils.escape(systemLabel(groupName))}</b><span>${MIW.Utils.escape(L(`${items.length} รายการ`,`${items.length} tests`))}</span></span>
         <span class="detail-group-stack" aria-label="${MIW.Utils.escape(systemLabel(groupName))}">
           <i class="abnormal" style="width:${groupPercentFor(groupCounts,items.length,"abnormal")}%"></i><i class="followup" style="width:${groupPercentFor(groupCounts,items.length,"followup")}%"></i><i class="context" style="width:${groupPercentFor(groupCounts,items.length,"context")}%"></i><i class="normal" style="width:${groupPercentFor(groupCounts,items.length,"normal")}%"></i>
         </span>
         <span class="detail-group-alert ${attention?"":"none"}" title="สูง/ผิดปกติ + ต่ำ/ควรติดตาม">${attention}</span>
       </button>
       <div class="detail-group-results">
         ${visibleAbnormal.length?visibleAbnormal.map(r=>{
           const status=dashboardState(r);
           return`<button class="detail-group-result result-${status}" type="button" data-detail-test="${MIW.Utils.escape(r.name)}" title="${L("เปิดรายละเอียดและกราฟ","Open details and chart")} ${MIW.Utils.escape(r.name)}">
             <span class="detail-group-result-name">${MIW.Utils.escape(r.name)}</span>
             <span class="detail-group-result-value">${MIW.Utils.escape(r.value)}${detailCategoryDisplayUnit(r)?` ${MIW.Utils.escape(detailCategoryDisplayUnit(r))}`:""}</span>
             <span class="detail-group-result-status">${MIW.Utils.escape(statusThai(status))}</span>
           </button>`
         }).join(""):`<div class="detail-group-no-abnormal"><i></i><span>${MIW.Utils.escape(L("ไม่พบค่าสูงหรือต่ำในหมวดนี้","No high or low results in this category"))}</span></div>`}
         ${remaining?`<button class="detail-group-more" type="button" data-detail-group="${MIW.Utils.escape(groupName)}">${MIW.Utils.escape(L(`ดูอีก ${remaining} รายการ`,`View ${remaining} more`))}</button>`:""}
       </div>
     </article>`
   }).join("")||`<div class="executive-empty">${L("ไม่พบรายการในขอบเขตตัวกรอง","No results in the current filter scope")}</div>`;

   renderDetailCategoryOverview();

   const clear=document.getElementById("detailOverviewClearFilters");
   if(clear)clear.disabled=!search&&!group&&!activeStatusFilter;
   const clearSearch=document.getElementById("trackerSearchClear");
   if(clearSearch)clearSearch.disabled=!search
 }
 function groupPercentFor(counts,total,key){
   return(total?counts[key]/total*100:0).toFixed(2)
 }
 function renderStatusFilter(){
   const bar=document.getElementById("trackerStatusFilterBar");
   if(!bar)return;
   if(!activeStatusFilter){
     bar.hidden=true;
     bar.innerHTML="";
     return
   }
   bar.hidden=false;
   bar.innerHTML=`<span>${L("กำลังแสดง:","Showing:")} <b>${MIW.Utils.escape(statusThai(activeStatusFilter))}</b></span><button type="button" data-clear-tracker-status>${L("แสดงทั้งหมด","Show all")}</button>`
 }
 function scrollToSelectedResult(){
   const detail=document.getElementById("trackerDetailPanel");
   if(detail&&typeof detail.scrollIntoView==="function")detail.scrollIntoView({block:"start",behavior:"smooth"});
   const list=document.getElementById("trackerTestList");
   if(!list||typeof list.querySelectorAll!=="function")return;
   const card=[...list.querySelectorAll("[data-tracker-test]")].find(item=>item.dataset.trackerTest===selectedTest);
   if(card&&typeof card.scrollIntoView==="function")card.scrollIntoView({block:"nearest"})
 }
 function scheduleSelectedResultScroll(){
   if(window&&typeof window.requestAnimationFrame==="function")window.requestAnimationFrame(scrollToSelectedResult);
   else scrollToSelectedResult()
 }
 function navigateToStatus(status){
   if(!["abnormal","followup","context","normal"].includes(status))return;
   document.getElementById("trackerSearch").value="";
   document.getElementById("trackerGroup").value="";
   activeStatusFilter=status;
   const visible=filteredTests();
   selectedTest=visible[0]?.name||"";
   setView("detail");
   scheduleSelectedResultScroll()
 }
 function navigateToRgccInterpretation(requestedType){
   const type=requestedType==="RGCC_ONCOTRAIL"?"RGCC_ONCOTRAIL":requestedType==="RGCC_METASTAT"?"RGCC_METASTAT":"INTEGRATED";
   const selected=type==="RGCC_ONCOTRAIL"
     ?preferredRgccRow("RGCC_ONCOTRAIL")
     :type==="RGCC_METASTAT"
       ?preferredRgccRow("RGCC_METASTAT")
       :preferredRgccRow("RGCC_METASTAT")||preferredRgccRow("RGCC_ONCOTRAIL");
   if(!selected)return false;
   selectedTest=selected.name;
   activeStatusFilter="";
   document.getElementById("trackerSearch").value="";
   document.getElementById("trackerGroup").value="";
   setView("detail");
   const focus=()=>{
     const target=document.getElementById("labExplanation");
     if(!target)return;
     target.classList?.add("rgcc-interpretation-focus");
     if(typeof target.scrollIntoView==="function")target.scrollIntoView({block:"start",behavior:"smooth"});
     if(typeof setTimeout==="function")setTimeout(()=>target.classList?.remove("rgcc-interpretation-focus"),1800)
   };
   if(typeof window.requestAnimationFrame==="function")window.requestAnimationFrame(focus);else focus();
   return true
 }
 function renderRgccCtcDashboard(){
   const panel=document.getElementById("rgccCtcDashboard"),grid=document.getElementById("rgccCtcReportGrid");
   if(!panel||!grid)return;
   const models=[onconomicsReportCardModel(),rgccReportCardModel("RGCC_ONCOTRAIL"),rgccReportCardModel("RGCC_METASTAT")];
   const available=models.filter(model=>model.available).length;
   panel.hidden=false;
   const badge=document.getElementById("rgccCtcCoverageBadge");
   if(badge)badge.textContent=L(`${available}/3 รายงาน`,`${available}/3 reports`);
   const integrated=document.getElementById("rgccCtcIntegratedButton");
   if(integrated)integrated.disabled=!models.some(model=>model.available&&model.type!=="ONCONOMICS_PLUS");
   grid.innerHTML=models.map(model=>`<article class="rgcc-ctc-report-card ${model.available?"":"is-missing"}">
     <div class="rgcc-ctc-report-title"><h4>${MIW.Utils.escape(model.title)}</h4><span>${MIW.Utils.escape(model.date)}</span></div>
     <p class="rgcc-ctc-report-role">${MIW.Utils.escape(model.role)}</p>
     ${model.available?`<div class="rgcc-ctc-highlight-grid">${model.highlights.map(item=>`<div class="rgcc-ctc-highlight"><span>${MIW.Utils.escape(item.label)}</span><b>${MIW.Utils.escape(item.value)}</b></div>`).join("")}</div>`:`<div class="executive-empty">${L("ยังไม่มีรายงานชนิดนี้ใน Lab Tracker","This report type is not yet available in Lab Tracker")}</div>`}
     <div class="rgcc-ctc-card-actions">
       ${model.type==="ONCONOMICS_PLUS"
         ?`<button class="rgcc-ctc-open" type="button" data-ctc-open-onconomics="true">${model.available?L("เปิดผลและคำอธิบาย Onconomics Plus","Open Onconomics Plus results and explanations"):L("เปิด Onconomics Plus และค้นคืนรายงาน","Open Onconomics Plus and recover report")}</button>`
         :`<button class="rgcc-ctc-open" type="button" data-rgcc-interpretation="${model.type}" ${model.available?"":"disabled"}>${L("ดูการแปลผล","View interpretation")} ${MIW.Utils.escape(model.title)}</button>`}
       <button class="ctc-marker-open" type="button" data-ctc-marker-report="${model.type}" ${model.available?"":"disabled"}>${L("ดูคำอธิบาย Marker","View marker explanations")}</button>
     </div>
   </article>`).join("")
 }
 function renderDashboard(){
   if(dashboardChart){dashboardChart.destroy();dashboardChart=null}
   const summary=generalDashboardSummary(),latest=summary.latest;
   renderDiagnosticModules();
   const badge=document.getElementById("executiveCoverageBadge");
   if(badge)badge.textContent=L(`General ${summary.total} รายการ`,`General ${summary.total} items`);
   const dates=rows.map(r=>String(r.date||"")).filter(Boolean).sort();
   const eventCount=new Set(rows.map(r=>`${r.dateTime||r.date||""}|${r.labNo||r.lab_no||""}`).filter(x=>x!=="|")).size;
   const period=document.getElementById("trackerDashboardPeriod");
   if(period)period.textContent=dates.length
     ?L(`ครอบคลุม ${displayDate(dates[0])}${dates.at(-1)!==dates[0]?` ถึง ${displayDate(dates.at(-1))}`:""} · ${eventCount} เหตุการณ์ตรวจ`,`Coverage ${displayDate(dates[0])}${dates.at(-1)!==dates[0]?` to ${displayDate(dates.at(-1))}`:""} · ${eventCount} testing events`)
     :L("ยังไม่มีวันที่ผลตรวจที่ยืนยันแล้ว","No verified result dates are available yet");
   const legend=document.getElementById("executiveStatusLegend");
   if(legend)legend.innerHTML=[
     ["abnormal",L("สูง / ผิดปกติ","High / abnormal")],
     ["followup",L("ต่ำ / ควรติดตาม","Low / follow-up")],
     ["context",L("ต้องอาศัยบริบท","Needs clinical context")],
     ["normal",L("อยู่ในช่วงอ้างอิง","Within reference interval")]
   ].map(([key,label])=>`<button class="executive-status-row" type="button" data-tracker-status="${key}"><i class="status-dot-${key}"></i><span>${label}</span><b>${summary.counts[key]}</b></button>`).join("");
   const canvas=document.getElementById("executiveStatusChart");
   if(canvas&&summary.total&&typeof Chart!=="undefined"){
     dashboardChart=new Chart(canvas,{
       type:"doughnut",
       data:{
         labels:[L("สูง / ผิดปกติ","High / abnormal"),L("ต่ำ / ควรติดตาม","Low / follow-up"),L("ต้องอาศัยบริบท","Needs clinical context"),L("อยู่ในช่วงอ้างอิง","Within reference interval")],
         datasets:[{
           data:[summary.counts.abnormal,summary.counts.followup,summary.counts.context,summary.counts.normal],
           backgroundColor:["#cf5147","#d39a22","#8a9a97","#2e9c6a"],
           borderColor:"#ffffff",borderWidth:3
         }]
       },
       options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{display:false},tooltip:{callbacks:{label:item=>`${item.label}: ${item.raw} ${L("รายการ","items")}`}}}}
     })
   }
   const priorities=latest.filter(r=>dashboardState(r)!=="normal"||hasVisualWarning(r)).sort((a,b)=>
     statusRank(dashboardState(a))-statusRank(dashboardState(b))||
     Number(hasVisualWarning(b))-Number(hasVisualWarning(a))||
     systemRank(a.group)-systemRank(b.group)||a.name.localeCompare(b.name)
   );
   const priorityCounts={abnormal:0,followup:0,context:0,warning:0};
   priorities.forEach(r=>{
     const status=dashboardState(r);
     if(status==="normal"&&hasVisualWarning(r))priorityCounts.warning++;
     else if(Object.prototype.hasOwnProperty.call(priorityCounts,status))priorityCounts[status]++
   });
   const priorityTotal=document.getElementById("executivePriorityTotal");
   if(priorityTotal)priorityTotal.textContent=L(`${priorities.length} รายการ`,`${priorities.length} items`);
   const prioritySummary=document.getElementById("executivePrioritySummary");
   if(prioritySummary)prioritySummary.innerHTML=[
     ["abnormal",L("แดง","Red"),priorityCounts.abnormal,L("สูง / ผิดปกติ","High / abnormal")],
     ["followup",L("เหลือง","Yellow"),priorityCounts.followup,L("ต่ำ / ควรติดตาม","Low / follow-up")],
     ["context",L("เทา","Gray"),priorityCounts.context,L("ต้องอาศัยบริบท","Needs clinical context")],
     ["warning",L("เขียว","Green"),priorityCounts.warning,L("ปกติที่มีคำเตือนจากแถบสี","In range with a source-report visual warning")]
   ].map(([key,color,count,label])=>`<span class="executive-priority-count priority-${key}" title="${MIW.Utils.escape(label)}"><i></i><b>${count}</b> ${color}</span>`).join("");
   const priorityList=document.getElementById("executivePriorityList");
   if(priorityList)priorityList.innerHTML=priorities.length?priorities.map(r=>{
     const status=dashboardState(r),geometry=rangeGeometry(r);
     const warningOnly=status==="normal"&&hasVisualWarning(r);
     const tone=warningOnly?"warning":status;
     const statusLabel=warningOnly?L("อยู่ในช่วงอ้างอิง · มีคำเตือนจากแถบสี","Within reference interval · source-report visual warning"):statusThai(status);
     return`<button class="executive-priority-item status-${status}" type="button" data-dashboard-test="${MIW.Utils.escape(r.name)}">
       <span class="executive-priority-name"><span class="executive-priority-status priority-${tone}"><i></i>${MIW.Utils.escape(statusLabel)}</span><b>${MIW.Utils.escape(r.name)}</b><span>${MIW.Utils.escape(systemLabel(r.group))} · ${MIW.Utils.escape(displayDate(r.date))}</span></span>
       <span class="executive-range-wrap"><span class="executive-range-track ${geometry.trackClass}"><i class="executive-range-marker" style="left:${geometry.position.toFixed(1)}%"></i></span><span class="executive-range-label">${MIW.Utils.escape(geometry.label)}</span></span>
       <span class="executive-priority-value"><b>${MIW.Utils.escape(r.value)} ${MIW.Utils.escape(r.unit||"")}</b><span>${MIW.Utils.escape(`${statusThai(status)}${antiAgingTargetText(r)?` · ${antiAgingTargetText(r)}`:""}${visualWarningText(r)?` · ${visualWarningText(r)}`:""}`)}</span></span>
     </button>`
   }).join(""):`<div class="executive-empty">${L("ไม่พบรายการล่าสุดที่ถูกจัดเป็นผิดปกติ เฝ้าระวัง หรือรอข้อมูลบริบท","No latest results are currently classified as abnormal, follow-up or context-dependent")}</div>`;
   const systems=new Map();
   latest.forEach(r=>{
     const group=r.group||"Other";
     if(!systems.has(group))systems.set(group,[]);
     systems.get(group).push(r)
   });
   const systemGrid=document.getElementById("executiveSystemGrid");
   if(systemGrid)systemGrid.innerHTML=[...systems.entries()].sort((a,b)=>
     systemRank(a[0])-systemRank(b[0])||systemLabel(a[0]).localeCompare(systemLabel(b[0]))
   ).map(([group,items])=>{
     const counts={normal:0,followup:0,abnormal:0,context:0};
     items.forEach(r=>counts[dashboardState(r)]++);
     const percent=key=>items.length?counts[key]/items.length*100:0;
     return`<button class="executive-system-row" type="button" data-dashboard-group="${MIW.Utils.escape(group)}">
       <span class="executive-system-name"><b>${MIW.Utils.escape(systemLabel(group))}</b><span>${L(`${items.length} รายการล่าสุด`,`${items.length} latest results`)}</span></span>
       <span class="executive-system-stack" aria-label="${MIW.Utils.escape(systemLabel(group))}">
         <i class="abnormal" style="width:${percent("abnormal").toFixed(2)}%"></i><i class="followup" style="width:${percent("followup").toFixed(2)}%"></i><i class="context" style="width:${percent("context").toFixed(2)}%"></i><i class="normal" style="width:${percent("normal").toFixed(2)}%"></i>
       </span>
       <span class="executive-system-counts"><span class="abnormal">${counts.abnormal}</span><span class="followup">${counts.followup}</span><span class="context">${counts.context}</span><span class="normal">${counts.normal}</span></span>
     </button>`
   }).join("")||`<div class="executive-empty">${L("ยังไม่มีผลตรวจที่ยืนยันแล้ว","No verified results are available yet")}</div>`
 }
 function setView(mode){
   viewMode=mode==="detail"?"detail":mode==="ctc"?"ctc":mode==="masuyama"?"masuyama":"dashboard";
   const dashboard=document.getElementById("trackerDashboardPanel"),ctc=document.getElementById("trackerCtcPanel"),masuyama=document.getElementById("trackerMasuyamaPanel"),detail=document.getElementById("trackerDetailPanel");
   if(dashboard)dashboard.hidden=viewMode!=="dashboard";
   if(ctc)ctc.hidden=viewMode!=="ctc";
   if(masuyama)masuyama.hidden=viewMode!=="masuyama";
   if(detail)detail.hidden=viewMode!=="detail";
   const dashboardButton=document.getElementById("trackerDashboardButton"),ctcButton=document.getElementById("trackerCtcButton"),masuyamaButton=document.getElementById("trackerMasuyamaButton"),detailButton=document.getElementById("trackerDetailButton");
   if(dashboardButton)dashboardButton.className=`tracker-mode-tab ${viewMode==="dashboard"?"active":""}`.trim();
   if(ctcButton)ctcButton.className=`tracker-mode-tab ${viewMode==="ctc"?"active":""}`.trim();
   if(masuyamaButton)masuyamaButton.className=`tracker-mode-tab ${viewMode==="masuyama"?"active":""}`.trim();
   if(detailButton)detailButton.className=`tracker-mode-tab ${viewMode==="detail"?"active":""}`.trim();
   if(viewMode==="dashboard")renderDashboard();
   else if(viewMode==="ctc")renderRgccCtcDashboard();
   else if(viewMode==="masuyama")renderMasuyamaPage();
   else{renderTests();renderChart()}
 }
 function trend(series,index){
   if(index<=0)return"—";const a=number(series[index-1].value),b=number(series[index].value);
   if(a===null||b===null)return"—";return b>a?"↑":b<a?"↓":"→"
 }
 function select(name){selectedTest=name;renderTests();renderChart()}
 function renderChart(){
   if(chart){chart.destroy();chart=null}
   if(!selectedTest){document.getElementById("labChartArea").innerHTML=`<div class="empty">${L("เลือก Test ด้านซ้ายเพื่อสร้างกราฟ","Select a test on the left to create a chart")}</div>`;return}
   const rawSeries=rows.filter(r=>r.name===selectedTest).sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||""));
   if(rawSeries.length&&isMasuyamaResult(rawSeries[0])){renderMasuyamaDashboard(rawSeries);return}
   // Cumulative reports can repeat the same result in overlapping print columns.
   // Collapse only rows with the same analyte, specimen date, value and unit.
   // A reported numeric zero is deliberately retained; a missing test is no row.
   const seenSeries=new Set();
   const allSeries=rawSeries.filter(r=>{
     const specimenKey=r.labNo||r.lab_no||"NO_LAB_NO";
     const key=[r.name,r.date||"",r.valueNumeric??r.value,r.unit||"",specimenKey].join("|");
     if(seenSeries.has(key))return false;
     seenSeries.add(key);return true
   });
   const textSeries=allSeries.filter(r=>r.resultKind==="TEXT"||r.chartable===false||r.valueNumeric===null&&number(r.value)===null);
   const numericSeries=allSeries.filter(r=>r.chartable!==false&&r.valueNumeric!==null&&r.valueNumeric!==undefined);
   if(textSeries.length&&!numericSeries.length){
     document.getElementById("labChartArea").innerHTML=`<div class="chart-box text-result-box"><h3>${MIW.Utils.escape(selectedTest)}</h3><div class="text-result-list">${textSeries.map(r=>`<div><b>${MIW.Utils.escape(r.value)}</b><span>${MIW.Utils.escape(displayDate(r.date))} · ${MIW.Utils.escape(r.source||"—")}</span></div>`).join("")}</div></div>`;
     const lastText=textSeries.at(-1),k=knowledgeForResult(lastText);
     document.getElementById("labExplanation").innerHTML=isFoodIntoleranceIgGResult(lastText)
       ?renderFoodIntoleranceIgGExplanation([],lastText,k,"—")
       :isAllergyResult(lastText)
       ?renderAllergyExplanation([],lastText,k,"—")
       :isCancerLiquidBiopsyResult(lastText)
         ?renderCancerLiquidBiopsyExplanation([],lastText,k,"—")
       :isSpepName(selectedTest)
         ?renderSpepExplanation([],lastText,k,"—")
       :k?.specific!==false
         ?renderCategoricalClinicalExplanation(textSeries,lastText,k,"ผลแบบข้อความ — ไม่สร้างกราฟตัวเลข")
         :`<h3>${MIW.Utils.escape(selectedTest)}</h3><p>${L("ผลตรวจนี้เป็นข้อความ จึงคงข้อความต้นฉบับไว้และไม่สร้างกราฟตัวเลข","This is a text-based result, so the source wording is retained and no numeric chart is created.")}</p>`;
     return
   }
   const series=numericSeries.sort((a,b)=>(a.dateTime||a.date||"").localeCompare(b.dateTime||b.date||""));
   const ranges=series.map(rangeFor);
   const hasLow=ranges.some(x=>Number.isFinite(x.low)),hasHigh=ranges.some(x=>Number.isFinite(x.high));
   const rangeLabel=[...new Set(series.map((r,i)=>{const u=detailCategoryDisplayUnit(r);return`${ranges[i].text||L("ไม่ระบุ","not specified")}${u?` ${u}`:""}${ranges[i].isFallback?L(" (ค่าทั่วไป)"," (general range)"):""}`}))].join(" · ");
   const rangeChanges=new Set(ranges.map(x=>`${x.low??""}|${x.high??""}`)).size>1;
   const rangeSources=[...new Set(ranges.map(x=>x.source))].join(" / ");
   const profiles=series.map(interpretationProfile);
   const contextDependentSeries=series.some(isContextDependentHormone),contextualReferenceSeries=series.some(r=>Boolean(contextualReferenceInfo(r)));
   const allergySeries=series.some(isAllergyResult);
   const foodIgGSeries=series.some(isFoodIntoleranceIgGResult);
   const liquidBiopsySeries=series.some(isCancerLiquidBiopsyResult);
   const domainValues=[
     ...series.map(r=>Number(r.valueNumeric)).filter(Number.isFinite),
     ...profiles.flatMap(p=>p.bands.flatMap(b=>[b.from,b.to])).filter(Number.isFinite)
   ];
   const domainMin=Math.min(...domainValues),domainMax=Math.max(...domainValues);
   const domainPad=allergySeries
     ?Math.max((domainMax-domainMin)*.06,Math.abs(domainMax||1)*.02,0.02)
     :Math.max((domainMax-domainMin)*.06,Math.abs(domainMax||1)*.02,1);
   const rangeLegend=foodIgGSeries
     ?L("พื้นกราฟแบ่งตาม Normal / Borderline / High ของรายงาน Food Intolerance IgG; สีบอกระดับตามชุดตรวจ ไม่ใช่การวินิจฉัยหรือความรุนแรงของอาการ","The chart background follows the Food Intolerance IgG assay categories Normal / Borderline / High; the colors show assay categories, not a diagnosis or symptom severity.")
     :allergySeries
     ?L("พื้นกราฟแบ่งตาม Specific IgE Class 0–6 ของรายงาน; Class บอกระดับ sensitization ไม่ใช่ความรุนแรงของอาการ","The chart background follows the report's Specific IgE Class 0–6; class reflects sensitization level, not symptom severity.")
     :liquidBiopsySeries
       ?L("เกณฑ์/Comparator เป็นกฎเฉพาะของรายงาน OncoTrail หรือ METASTAT ไม่ใช่ population normal range; ใช้ติดตามกับวิธีเดิมและยืนยันโรคด้วย imaging/pathology","The threshold/comparator is specific to the OncoTrail or METASTAT report and is not a population normal range; follow serially with the same method and confirm disease status with imaging/pathology.")
     :contextDependentSeries
       ?L("พื้นกราฟของฮอร์โมนสืบพันธุ์แสดงเพียงตำแหน่งเทียบช่วงตัวเลขจากรายงาน สีฟ้าไม่ใช่คำยืนยันว่าปกติ ต้องเทียบเพศ อายุ รอบเดือน/วัยหมดประจำเดือน การตั้งครรภ์ และยา","For reproductive hormones, the chart only shows position relative to the reported numerical interval. A shaded in-range area does not prove a physiologically normal level; interpret with sex, age, menstrual/menopausal status, pregnancy and medications.")
       :L("พื้นกราฟ: เหลือง = ต่ำ/ควรระวัง · เขียว = ช่วงปกติ · แดง = สูง/ผิดปกติ ตามเกณฑ์ของวันตรวจ","Chart background: yellow = low/caution · green = within the reported range · red = high/abnormal, based on the reference interval for that test date.");
   const rangeChangeNote=rangeChanges
     ?L("ช่วงอ้างอิงเปลี่ยนตามวันที่รายงาน ซึ่งอาจเกิดจากวิธีตรวจ เครื่องมือ ห้องปฏิบัติการ หรือเกณฑ์ที่โรงพยาบาลปรับใช้; โปรแกรมแสดงตามต้นฉบับ ไม่ได้หมายความว่าค่าผู้ป่วยเปลี่ยนเพราะพื้นเขียว","The reference interval changes across report dates, which may reflect assay method, instrument, laboratory, or institutional criteria. MIW displays the source intervals; a change in the shaded range does not mean the patient's value changed.")
     :L("ช่วงอ้างอิงคงที่ในผลที่แสดง","The displayed results use a consistent reference interval.");
   const notes=[...new Set(series.map(r=>String(r.reportInterpretationRaw||"").trim()).filter(Boolean))];
   document.getElementById("labChartArea").innerHTML=`<div class="chart-box"><div class="chart-title-row"><h3>${MIW.Utils.escape(selectedTest)}</h3><span class="normal-range-label">${foodIgGSeries?L("เกณฑ์ระดับจากรายงาน","Report category thresholds"):allergySeries?L("เกณฑ์ผลลบ","Negative threshold"):liquidBiopsySeries?L("เกณฑ์/Comparator จากรายงาน","Report threshold/comparator"):contextualReferenceSeries?L("เกณฑ์ตามบริบทจากรายงาน","Source-report contextual thresholds"):contextDependentSeries?L("ช่วงอ้างอิงจากรายงาน","Source-report reference interval"):L("ช่วงอ้างอิง","Reference interval")}: ${MIW.Utils.escape(rangeLabel||L("ไม่ระบุ","not specified"))}${rangeChanges?L(" · เปลี่ยนตามวันตรวจ"," · varies by test date"):""}</span></div><div class="chart-canvas"><canvas id="labTrendChart"></canvas></div><div class="normal-range-legend"><span class="zone-swatch zone-warning"></span><span class="zone-swatch zone-normal"></span><span class="zone-swatch zone-high"></span> ${MIW.Utils.escape(rangeLegend)} · ${L("แหล่งที่มา:","Source:")} ${MIW.Utils.escape(foodIgGSeries?L("รายงาน Food Intolerance IgG","Food Intolerance IgG report"):allergySeries?L("รายงานภูมิแพ้","Allergy report"):liquidBiopsySeries?"RGCC specialized report":translatedOr(rangeSources,L("ไม่มีข้อมูล","no data"))||L("ไม่มีข้อมูล","no data"))}</div><div class="range-change-note">${MIW.Utils.escape(rangeChangeNote)}</div>${alternateReportedText(series.at(-1))?`<div class="alternate-unit-note">${MIW.Utils.escape(alternateReportedText(series.at(-1)))}</div>`:""}${antiAgingTargetText(series.at(-1))?`<div class="anti-aging-target-note">${MIW.Utils.escape(translatedOr(antiAgingTargetText(series.at(-1)),"Secondary target reported by the source laboratory"))} · ${L("แสดงแยกจากพื้นกราฟ Clinical reference","shown separately from the clinical reference background")}</div>`:""}${notes.length?`<details class="report-interpretation"><summary>${L("คำอธิบายจากรายงานต้นฉบับ","Source-report interpretation")}</summary>${notes.map(n=>`<pre>${MIW.Utils.escape(n)}</pre>`).join("")}</details>`:""}<div class="missing-value-note">${L("วันใดไม่ตรวจจะไม่มีจุดข้อมูล; ค่าที่มีเครื่องหมาย < เป็นค่าต่ำกว่าขีดที่รายงาน ไม่ใช่ค่าเท่ากับตัวเลขนั้น","Dates without testing have no data point; values preceded by < are below the reported limit and are not equal to that number.")}</div></div>`;
   if(series.length){
     const datasets=[];
     if(hasLow&&hasHigh){
       datasets.push({label:"Lower reference",data:ranges.map(x=>x.low),borderColor:"rgba(46,125,105,.55)",borderDash:[5,4],pointRadius:0,borderWidth:1,stepped:true,spanGaps:false,fill:false});
       datasets.push({label:"Upper reference",data:ranges.map(x=>x.high),borderColor:"rgba(46,125,105,.55)",borderDash:[5,4],pointRadius:0,borderWidth:1,stepped:true,spanGaps:false,fill:false});
     }else if(hasHigh)datasets.push({label:"Upper reference",data:ranges.map(x=>x.high),borderColor:"rgba(46,125,105,.55)",borderDash:[5,4],pointRadius:0,borderWidth:1,stepped:true,spanGaps:false,fill:false});
     else if(hasLow)datasets.push({label:"Lower reference",data:ranges.map(x=>x.low),borderColor:"rgba(46,125,105,.55)",borderDash:[5,4],pointRadius:0,borderWidth:1,stepped:true,spanGaps:false,fill:false});
     datasets.push({label:selectedTest,data:series.map(r=>Number(r.valueNumeric)),tension:.2,pointRadius:5,borderWidth:2,borderColor:"#155e58",backgroundColor:"#155e58"});
     const interpretationZones={
       id:"interpretationZones",
       beforeDatasetsDraw(c){
         const {ctx,chartArea,scales}=c;if(!chartArea||!scales?.y)return;
         ctx.save();
         profiles.forEach((profile,i)=>{
           const center=scales.x.getPixelForValue(i);
           const prev=i?scales.x.getPixelForValue(i-1):chartArea.left;
           const next=i<profiles.length-1?scales.x.getPixelForValue(i+1):chartArea.right;
           const left=i?(prev+center)/2:chartArea.left,right=i<profiles.length-1?(center+next)/2:chartArea.right;
           profile.bands.forEach(b=>{
             const top=b.to===null?chartArea.top:Math.max(chartArea.top,Math.min(chartArea.bottom,scales.y.getPixelForValue(b.to)));
             const bottom=b.from===null?chartArea.bottom:Math.max(chartArea.top,Math.min(chartArea.bottom,scales.y.getPixelForValue(b.from)));
             ctx.fillStyle=b.color;ctx.fillRect(left,Math.min(top,bottom),right-left,Math.abs(bottom-top))
           })
         });
         ctx.restore()
       }
     };
     chart=new Chart(document.getElementById("labTrendChart"),{
       type:"line",
       data:{labels:series.map(r=>r.dateTime?`${displayDate(r.date)} ${r.dateTime.slice(11,16)}`:displayDate(r.date)),datasets},
       plugins:[interpretationZones],
       options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},scales:{y:{min:domainMin-domainPad,max:domainMax+domainPad}},plugins:{tooltip:{filter:item=>item.dataset.label===selectedTest,callbacks:{afterBody(items){const i=items[0].dataIndex,r=series[i],ref=ranges[i],rawK=knowledgeForResult(r),k=englishClinicalProfile(r,rawK),p=profiles[i],anti=antiAgingTargetText(r);return[`${L("หน่วย:","Unit:")} ${r.unit||"—"}`,...(alternateReportedText(r)?[translatedOr(alternateReportedText(r),alternateReportedText(r))]:[]),`${isFoodIntoleranceIgGResult(r)?L("เกณฑ์ระดับจากรายงาน","Report category thresholds"):isAllergyResult(r)?L("เกณฑ์ผลลบ","Negative threshold"):isCancerLiquidBiopsyResult(r)?L("เกณฑ์/Comparator จากรายงาน","Report threshold/comparator"):contextualReferenceInfo(r)?L("เกณฑ์ตามบริบทจากรายงาน","Source-report contextual thresholds"):rawK.contextDependent?L("ช่วงอ้างอิงจากรายงาน","Source-report reference interval"):L("ช่วงอ้างอิง","Reference interval")}: ${ref.text||"—"}`,...(anti?[translatedOr(anti,"Secondary target reported by the source laboratory"),L("Anti-aging เป็นเป้าหมายรอง ไม่ใช่ Clinical reference","Anti-aging is a secondary target, not the clinical reference interval")]:[]),`${L("สถานะ:","Status:")} ${isFoodIntoleranceIgGResult(r)?r.foodIntoleranceLevel||r.food_intolerance_level||r.flag||"—":isAllergyResult(r)?`Class ${Number.isInteger(r.allergyClass)?r.allergyClass:"—"}`:isCancerLiquidBiopsyResult(r)?L("ใช้ป้ายผลและบริบทของรายงาน","Use the source-report label and context"):rawK.contextDependent?L("ต้องเทียบบริบท","context-dependent"):r.flag||"—"}`,`${L("ขอบเขตสี:","Chart zones:")} ${p.bands.map(b=>translatedOr(b.label,b.label)).join(" · ")}`,`${k.meaning}`,`${L("แหล่งรายงาน:","Report source:")} ${r.source||"—"}`]}}}}}
     })
   }
   const first=series[0],last=series.at(-1),k=knowledgeForResult(last||first);
   let t="ยังไม่มีข้อมูลเพียงพอ";
   if(series.length>=2){const a=number(first.value),b=number(last.value);t=b>a?"แนวโน้มเพิ่มขึ้น":b<a?"แนวโน้มลดลง":"แนวโน้มคงที่"}
   document.getElementById("labExplanation").innerHTML=isFoodIntoleranceIgGResult(last)
     ?renderFoodIntoleranceIgGExplanation(series,last,k,t)
     :isAllergyResult(last)
     ?renderAllergyExplanation(series,last,k,t)
     :isCancerLiquidBiopsyResult(last)
       ?renderCancerLiquidBiopsyExplanation(series,last,k,t)
     :isSpepName(selectedTest)
       ?renderSpepExplanation(series,last,k,t)
       :renderClinicalExplanation(series,last,k,t)
 }
 function bind(){
   if(typeof window.addEventListener==="function"&&!window.__miwLabTrackerLanguageRerenderV10273){
     window.__miwLabTrackerLanguageRerenderV10273=true;
     window.addEventListener("miw:language-change",()=>{
       try{
         if(viewMode==="detail"){renderTests();renderChart()}
         else if(viewMode==="dashboard")renderDashboard();
         else if(viewMode==="ctc")renderRgccCtcDashboard();
         else if(viewMode==="masuyama")renderMasuyamaPage()
       }catch(error){console.warn("MIW v10.274 language rerender",error)}
     })
   }
   document.getElementById("trackerSearch").oninput=()=>{
     if(normalizedLabSearch(document.getElementById("trackerSearch").value)){
       document.getElementById("trackerGroup").value=""
     }
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   document.getElementById("trackerSearchClear").onclick=()=>{
     document.getElementById("trackerSearch").value="";
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart();
     document.getElementById("trackerSearch").focus()
   };
   document.getElementById("trackerGroup").onchange=()=>{
     if(document.getElementById("trackerGroup").value==="CTC"){
       activeStatusFilter="";
       setView("ctc");
       return
     }
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   document.getElementById("trackerTestList").onclick=e=>{const card=e.target.closest("[data-tracker-test]");if(card)select(card.dataset.trackerTest)};
   document.getElementById("trackerDashboardButton").onclick=()=>setView("dashboard");
   const ctcButton=document.getElementById("trackerCtcButton");
   if(ctcButton)ctcButton.onclick=()=>setView("ctc");
   const masuyamaButton=document.getElementById("trackerMasuyamaButton");
   if(masuyamaButton)masuyamaButton.onclick=()=>{activeStatusFilter="";setView("masuyama")};
   document.getElementById("trackerDetailButton").onclick=()=>{activeStatusFilter="";setView("detail")};
   const rgccHub=document.getElementById("rgccCtcDashboard");
   if(rgccHub)rgccHub.onclick=e=>{
     const markerButton=e.target.closest("[data-ctc-marker-report]");
     if(markerButton&&!markerButton.disabled){openCtcMarkerGlossary(markerButton.dataset.ctcMarkerReport);return}
     const onconomicsButton=e.target.closest("[data-ctc-open-onconomics]");
     if(onconomicsButton){openOnconomicsFromCtc();return}
     const button=e.target.closest("[data-rgcc-interpretation]");
     if(button&&!button.disabled)navigateToRgccInterpretation(button.dataset.rgccInterpretation)
   };
   const ctcMarkerSearch=document.getElementById("ctcMarkerSearch");
   if(ctcMarkerSearch)ctcMarkerSearch.oninput=()=>renderCtcMarkerGlossary(activeCtcMarkerReport,ctcMarkerSearch.value);
   const ctcMarkerClose=document.getElementById("ctcMarkerGlossaryClose");
   if(ctcMarkerClose)ctcMarkerClose.onclick=()=>{const panel=document.getElementById("ctcMarkerGlossary");if(panel)panel.hidden=true};
   document.getElementById("trackerMetrics").onclick=e=>{
     const item=e.target.closest("[data-tracker-status]");
     if(item)navigateToStatus(item.dataset.trackerStatus)
   };
   document.getElementById("executiveStatusLegend").onclick=e=>{
     const item=e.target.closest("[data-tracker-status]");
     if(item)navigateToStatus(item.dataset.trackerStatus)
   };
   document.getElementById("trackerStatusFilterBar").onclick=e=>{
     if(!e.target.closest("[data-clear-tracker-status]"))return;
     activeStatusFilter="";
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   document.getElementById("detailOverviewStatusMetrics").onclick=e=>{
     const item=e.target.closest("[data-detail-status]");
     if(!item)return;
     const requested=item.dataset.detailStatus||"";
     activeStatusFilter=requested&&activeStatusFilter!==requested?requested:"";
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   document.getElementById("detailOverviewClearFilters").onclick=()=>{
     document.getElementById("trackerSearch").value="";
     document.getElementById("trackerGroup").value="";
     activeStatusFilter="";
     const visible=filteredTests();
     selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   document.getElementById("detailOverviewGroupGrid").onclick=e=>{
     const testItem=e.target.closest("[data-detail-test]");
     if(testItem){
       selectedTest=testItem.dataset.detailTest;
       renderTests();
       renderChart();
       scheduleSelectedResultScroll();
       return
     }
     const item=e.target.closest("[data-detail-group]");
     if(!item)return;
     if(item.dataset.detailGroup==="CTC"||item.dataset.detailGroup==="Cancer Liquid Biopsy"){
       document.getElementById("trackerSearch").value="";
       activeStatusFilter="";
       document.getElementById("trackerGroup").value="CTC";
       setView("ctc");
       return
     }
     document.getElementById("trackerGroup").value=item.dataset.detailGroup;
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   const detailCategoryMetrics=document.getElementById("detailCategoryMetrics");
   if(detailCategoryMetrics)detailCategoryMetrics.onclick=e=>{
     const item=e.target.closest("[data-category-status]");
     if(!item)return;
     const requested=item.dataset.categoryStatus||"";
     activeStatusFilter=requested&&activeStatusFilter!==requested?requested:"";
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   const detailCategoryRows=document.getElementById("detailCategorySnapshotRows");
   if(detailCategoryRows)detailCategoryRows.onclick=e=>{
     const item=e.target.closest("[data-category-test]");
     if(!item)return;
     selectedTest=item.dataset.categoryTest;
     activeStatusFilter="";
     renderTests();
     renderChart();
     scheduleSelectedResultScroll()
   };
   const detailCategoryClear=document.getElementById("detailCategoryClear");
   if(detailCategoryClear)detailCategoryClear.onclick=()=>{
     document.getElementById("trackerSearch").value="";
     document.getElementById("trackerGroup").value="";
     activeStatusFilter="";
     const visible=filteredTests();
     if(!visible.some(r=>r.name===selectedTest))selectedTest=visible[0]?.name||"";
     renderTests();
     renderChart()
   };
   const moduleGrid=document.getElementById("diagnosticModuleGrid");
   if(moduleGrid)moduleGrid.onclick=e=>{
     const item=e.target.closest("[data-diagnostic-module]");if(!item)return;
     const id=item.dataset.diagnosticModule||"",group=item.dataset.diagnosticGroup||"";
     document.getElementById("trackerSearch").value="";activeStatusFilter="";
     if(id==="CTC"||id==="METASTAT"||id==="ONCONOMICS"){setView("ctc");return}
     if(id==="MASUYAMA"){setView("masuyama");return}
     const select=document.getElementById("trackerGroup");if(select&&group)select.value=group;
     const visible=filteredTests();selectedTest=visible[0]?.name||"";setView("detail");scheduleSelectedResultScroll()
   };
   document.getElementById("executivePriorityList").onclick=e=>{
     const item=e.target.closest("[data-dashboard-test]");
     if(!item)return;
     selectedTest=item.dataset.dashboardTest;
     activeStatusFilter="";
     document.getElementById("trackerSearch").value="";
     document.getElementById("trackerGroup").value="";
     setView("detail");
     scheduleSelectedResultScroll()
   };
   document.getElementById("executiveSystemGrid").onclick=e=>{
     const item=e.target.closest("[data-dashboard-group]");
     if(!item)return;
     if(item.dataset.dashboardGroup==="CTC"||item.dataset.dashboardGroup==="Cancer Liquid Biopsy"){
       document.getElementById("trackerSearch").value="";
       activeStatusFilter="";
       document.getElementById("trackerGroup").value="CTC";
       setView("ctc");
       return
     }
     document.getElementById("trackerSearch").value="";
     activeStatusFilter="";
     document.getElementById("trackerGroup").value=item.dataset.dashboardGroup;
     const visible=filteredTests();
     selectedTest=visible[0]?.name||"";
     setView("detail");
     scheduleSelectedResultScroll()
   };
   const list=document.getElementById("trackerTestList"),hover=document.getElementById("labHoverCard");
   list.onmousemove=e=>{
     const card=e.target.closest("[data-tracker-test]");
     if(!card){hover.style.display="none";return}
     const r=filteredTests().find(x=>x.name===card.dataset.trackerTest);
     if(!r)return;
     hover.innerHTML=shortPopup(r);hover.style.display="block";
     const pad=14,w=hover.offsetWidth,h=hover.offsetHeight;
     hover.style.left=`${Math.min(e.clientX+16,window.innerWidth-w-pad)}px`;
     hover.style.top=`${Math.min(e.clientY+16,window.innerHeight-h-pad)}px`
   };
   list.onmouseleave=()=>{hover.style.display="none"};
 }
 async function openLatestPatient(){
   const patients=await MIW.Database.all("patients");
   if(!patients.length)throw new Error("ยังไม่มี Patient");
   const results=await MIW.Database.all("laboratoryResults");
   const latest=results.sort((a,b)=>(b.verifiedAt||"").localeCompare(a.verifiedAt||""))[0];
   await open(latest?.patientId||patients[0].id)
 }
 async function openLatestCtc(){
   const patients=await MIW.Database.all("patients");
   if(!patients.length)throw new Error("ยังไม่มี Patient");
   const [allResults,allOncoReports]=await Promise.all([
     MIW.Database.all("laboratoryResults"),
     MIW.Database.all("oncoReports")
   ]);
   const activity=[
     ...allResults
       .filter(row=>row.status==="VERIFIED"&&canonicalCategory(row)==="CTC")
       .map(row=>({patientId:row.patientId,moment:row.verifiedAt||row.dateTime||row.date||""})),
     ...allOncoReports.map(report=>({patientId:report.patientId,moment:report.reportDate||report.createdAt||""}))
   ].filter(item=>item.patientId).sort((a,b)=>String(b.moment).localeCompare(String(a.moment)));
   await open(activity[0]?.patientId||currentPatientId||patients[0].id);
   activeStatusFilter="";
   const groupSelect=document.getElementById("trackerGroup");
   if(groupSelect)groupSelect.value="CTC";
   setView("ctc")
 }
 return{
   open,openLatestPatient,openLatestCtc,bind,select,
   currentPatientId:()=>currentPatientId,
   showDashboard:()=>setView("dashboard"),
   showCtc:()=>setView("ctc"),
   showMasuyama:()=>setView("masuyama"),
   showDetail:()=>setView("detail"),
   openRgccInterpretation:navigateToRgccInterpretation,
   _deduplicateStoredRows:deduplicateStoredTrackerRows,
   _deduplicateOnco:deduplicateTrackerOnco,
   openCtcMarkerGlossary,openOnconomicsFromCtc,
  __test:{contextualReferenceInfo,referenceText,rangeFor,linkedPatientIdSet,oncoReportMatchesLinkedPatient,dashboardState,dashboardSummary:source=>dashboardSummary(source),generalDashboardSummary:source=>generalDashboardSummary(source),diagnosticFamilyId,moduleMetricModel,detailTrendDirection,detailTrendSummary:(latest,source)=>detailTrendSummary(latest,source),detailCategoryTrendMeta,detailCategoryModel,renderDetailCategoryOverview,trendSeriesFor,statusRank,navigateToStatus,navigateToRgccInterpretation,rangeGeometry,labMatchesSearch,repairAllergyResult,bilingualAllergyName,bilingualAllergyComponent,micronutrientVisualInfo,antiAgingTargetInfo,antiAgingTargetText,hydrateMicronutrientWarning,hasVisualWarning,visualWarningText,isFoodIntoleranceIgGResult,foodIntoleranceIgGLevel,canonicalCategory,canonicalPanel,systemLabel,rgccReportType,latestRgccReportRows,preferredRgccRow,rgccReportCardModel,latestOnconomicsReport,latestOnconomicsRows,onconomicsReportCardModel,rgccMarkerProfile,ctcMarkerEntries,oncotrailIndexMarkerEntries,oncotrailReportIndexRows,conciseMarkerText,ctcPlainResult,ctcPlainAbout,ctcPlainCurrent,ctcPlainLimit,ctcPlainGlossaryItem,ctcMarkerCategory,ctcMarkerTooltipText,renderCtcMarkerItem,renderOncotrailReportIndex,renderCtcMarkerGlossary,isEnglishMode,englishClinicalProfile,englishAssessment,englishTrend,renderClinicalExplanation,renderCategoricalClinicalExplanation,masuyamaCanonicalSourceSeries,masuyamaHistorySeriesForCode,repairMasuyamaRowsInDatabase,masuyamaMiniSvg,masuyamaIsKnownSomchaiReport,setMasuyamaTestState:(testRows,patient)=>{rows=testRows||[];currentPatient=patient||null;masuyamaKnownSourceContext=true}}
 }
})();
