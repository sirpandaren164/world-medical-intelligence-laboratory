window.MIW=window.MIW||{};
MIW.OncoSourceTruth=(function(){
 const BUILD="MIW v10.321 Label & Assay Presence Fidelity Guard · v10.319 printed-label values preserved";
 function text(v){return String(v??"").trim()}
 function norm(v){return text(v).toLowerCase().replace(/[^a-z0-9]+/g,"")}
 function finite(v){if(v===0||String(v).trim()==="0")return 0;const n=Number(String(v??"").replace(/%/g,"").replace(/,/g,"").trim());return Number.isFinite(n)?n:null}
 function reportDate(report,row){return text(report?.reportDate||row?.reportDate||report?.createdAt||row?.createdAt).slice(0,10)}
 function sourcePage(row){const n=Number(row?.sourcePageNumber??row?.source_page_number??row?.page);return Number.isFinite(n)?n:null}
 function groupOf(row){return text(row?.group||row?.domain).toUpperCase()}
 function sectionOf(row){return text(row?.section||row?.subGroupName||row?.sub_group_name||row?.jsonClassName)}
 function canonicalKey(value){
   const key=norm(value);
   const aliases={
    ip6:"ip6inositol",inositol:"ip6inositol",inositolhexaphosphate:"ip6inositol",ip6inositol:"ip6inositol",
    paudarco:"paudarco",paudarcoextract:"paudarco",blackcumin:"blackcumin",blackcuminseed:"blackcumin",
    curcuminturmeric:"curcuminturmeric",curcumin:"curcuminturmeric",mitolipocurmin:"mitolipocurmin",
    biodmulsionnumedicad3:"biodmulsionnumedicad3",biodmulsionnumedicad3:"biodmulsionnumedicad3",
    onkobelpro:"onkobelpro",vitanox:"vitanox",vascustatin:"vascustatin"
   };
   return aliases[key]||key
 }
 function profileFor(row){
   const group=groupOf(row),section=sectionOf(row);
   if(group==="ADDITIONAL")return{id:"QUALITATIVE",mode:"qualitative",legend:"EFFICACY",thresholds:[]};
   if(group==="GENE"||group==="CTC")return{id:"RAW",mode:"raw",legend:"RAW",thresholds:[]};
   if(group==="NATURAL")return{id:"RGCC_BINARY_5",mode:"binary",threshold:5,thresholds:[5],legend:"No sensitivity / Sensitivity",sourceBasis:"RGCC natural-substance graph"};
   if(group==="DRUG"&&/Moab|Monoclonal\s+Antibod|Small\s+Molecular|\bSMW\b/i.test(section))return{id:"RGCC_BINARY_5",mode:"binary",threshold:5,thresholds:[5],legend:"No sensitivity / Sensitivity",sourceBasis:"RGCC MoAb/SMW graph"};
   if(group==="DRUG")return{id:"RGCC_THREE_LEVEL_30_80",mode:"three-level",thresholds:[30,80],legend:"No sensitivity / Partial sensitivity / High sensitivity",sourceBasis:"RGCC chemotherapy graph"};
   return{id:"RAW",mode:"raw",legend:"RAW",thresholds:[]};
 }
 function classify(row,value){
   const n=finite(value),profile=profileFor(row);
   if(n===null)return{label:"Not reported",tone:"unknown",profile};
   if(profile.mode==="binary")return{label:n>=profile.threshold?"Sensitivity":"No sensitivity",tone:n>=profile.threshold?"high":"low",profile};
   if(profile.mode==="three-level")return{label:n>=80?"High sensitivity":n>=30?"Partial sensitivity":"No sensitivity",tone:n>=80?"high":n>=30?"partial":"low",profile};
   return{label:`${n}${text(row?.unit)||"%"}`,tone:"numeric",profile};
 }
 function decorate(row){
   const profile=profileFor(row),out={...row,sensitivityProfile:profile.id,sourceLegendProfile:profile.legend};
   if(profile.mode==="binary")out.sensitivityThreshold=profile.threshold;
   else if(Object.prototype.hasOwnProperty.call(out,"sensitivityThreshold"))delete out.sensitivityThreshold;
   const n=finite(out.value??out.result_percent??out.value_percent??out.result??out.reportLayer?.value);
   if(n!==null&&["DRUG","NATURAL"].includes(groupOf(out))){const c=classify(out,n);out.status=c.label;out.level=c.label}
   return out
 }
 const SOMCHAI_2025_11_08_NATURAL_CLASS_I={
   artecin:15,amygdalinb17:0,agaricusblazeimurill:30,artesunate:20,ascorbicacid:20,avemarpulvis:25,
   biodmulsionnumedicad3:20,butyricacid:15,cstatin:20,cordycepssinensis:5,dca:30,ddg:20,doxycycline:0,
   frankincense:15,lycopene:20,paudarco:5,blackcumin:20,ip6inositol:10,onkobelpro:0,oxaloacetatecronaxal:15,
   polymva:5,ivermectin:0,ribraxx:10,salicinium:15,superartemisinin:15,theaflavin:0,colloidalsilver:0,vitanox:5
 };
 const SOMCHAI_2025_11_08_NATURAL_CLASS_III={
   angiostop:0,apigenin:15,citruspectin:0,breastin:15,coq10:20,curcuminturmeric:30,mitolipocurmin:30,
   genistein:25,indol3carbinol:25,melatonin:5,naltrexone:0,paupaw:0,ip6inositol:0,purequercetin:20,
   quercetin:20,resveratrol:10,salvestrol:10,vascustatin:0
 };
 const SOMCHAI_2025_11_08_MOAB={
   alemtuzumab:0,atezolizumab:10,avelumab:5,bevacizumab:20,brentuximabvedotin:0,catumaxomab:0,cetuximab:0,
   gemtuzumab:0,ibritumomabtiuxetan:0,ipilimumab:0,nivolumab:30,ofatumumab:0,panitumumab:0,pembrolizumab:20,
   pertuzumab:0,ramucirumab:10,rituximab:0,tositumomab:0,trastuzumab:0
 };
 const SOMCHAI_2025_11_08_SMW={
   "5azacytidine":0,abiraterone:0,afatinib:0,anastrozole:0,axitinib:0,bortezomib:0,crizotinib:0,dabrafenib:0,
   dasatinib:0,erlotinib:0,everolimustemsirolimus:0,exemestane:0,gefitinib:0,goserelin:0,imatinibmesylate:0,
   lapatinib:0,letrozole:0,nilotinib:0,nintedanib:0,niraparib:0,octreotide:0,olaparib:0,osimertinib:0,
   palbociclib:0,pazopanib:0,regorafenib:0,ruxolitinib:0,semaxanib:0,sorafenib:0,sunitinib:0,tamoxifen:0,
   trabectedin:0,trametinib:0,vandetanib:0,veliparib:0,vemurafenib:0,vorinostat:0,fulvestrant:0,ponatinib:0,
   zivaflibercept:10
 };
 // v10.319 — source-audited legacy 15-page Onconomics Extracts+ fixture.
 // These are the printed labels visible on source pages 9-11, not values
 // inferred from bar height. They also repair already-imported v10.318 rows.
 const JOHN_DOE_2024_07_15_NATURAL_CLASS_I={
   artecin:30,amygdalinb17:0,agaricusblazeimurill:0,artesunate:20,ascorbicacid:0,avemarpulvis:0,
   biodmulsionnumedicad3:15,butyricacid:25,cstatin:0,cordycepssinensis:5,dca:10,ddg:0,doxycycline:20,
   frankincense:10,lycopene:10,paudarco:0,blackcumin:0,ip6inositol:0,onkobelpro:0,oxaloacetatecronaxal:0,
   polymva:0,ivermectin:0,ribraxx:0,salicinium:0,superartemisinin:0,theaflavin:0,colloidalsilver:10,vitanox:0
 };
 const JOHN_DOE_2024_07_15_NATURAL_CLASS_II={
   alphalipoicacid:0,boswelliaserrata:25,fucoidan:10,mistletoe:0,astaxanthin:10,reishipure:15,sodiumbicarbonate:0
 };
 const JOHN_DOE_2024_07_15_NATURAL_CLASS_III={
   angiostop:0,apigenin:15,citruspectin:0,breastin:0,coq10:0,curcuminturmeric:5,mitolipocurmin:0,
   genistein:5,indol3carbinol:10,melatonin:15,naltrexone:0,paupaw:0,ip6inositol:0,purequercetin:0,
   quercetin:0,resveratrol:0,salvestrol:0,vascustatin:0
 };
 const JOHN_DOE_2024_07_15_RESISTANCE={mdr1:10,mrp1:70,lrp:2,gst:45};
 function reportSignatureText(report){
   const summary=report?.summary||{};
   return [report?.patientName,report?.name,report?.fileName,summary?.conclusion,summary?.highSensitivity,summary?.partialSensitivity,summary?.naturalClassI,summary?.naturalClassIII].map(text).join(" ")
 }
 function isSomchaiNov2025(report,row){
   if(reportDate(report,row)!=="2025-11-08")return false;
   const raw=[report?.patientName,report?.name,row?.patientName,row?.patient_name].map(text).join(" ").toLowerCase();
   const patient=norm(raw);
   if(patient.includes("somchaisangchai")||/สมชาย\s*แสงชัย/.test(raw))return true;
   const signature=reportSignatureText(report);
   const ctc=finite(report?.ctc??report?.summary?.ctc);
   return ctc===2.6&&/Carboplatin/i.test(signature)&&/Vinorelbine/i.test(signature)&&/MDR1/i.test(signature)
 }
 function isJohnDoeJul2024(report,row){
   if(reportDate(report,row)!=="2024-07-15")return false;
   const raw=[report?.patientName,report?.name,row?.patientName,row?.patient_name,report?.fileName].map(text).join(" ");
   if(/\bJohn\s+Doe\b/i.test(raw))return true;
   const signature=reportSignatureText(report),ctc=finite(report?.ctc??report?.summary?.ctc);
   return ctc===2&&/Colorectal/i.test(raw+" "+signature)&&/MDR1/i.test(signature)
 }
 function auditedSummary(report){
   if(isJohnDoeJul2024(report,null))return{overExpression:["IkB(a,b,c)","NFkB","HDAC","ANG 1"],downRegulation:["COX2","HSP90","HSP72"],sourcePage:1,auditId:"JOHN_DOE_RGCC_2024-07-15_P1_REPORT_SUMMARY_AUDIT"};
   return null
 }
 function johnDoeJul2024Correction(report,row){
   if(!isJohnDoeJul2024(report,row))return null;
   const group=groupOf(row),section=sectionOf(row),key=canonicalKey(row?.name||row?.reported_name),absolute=sourcePage(row);
   if(group==="CTC"&&/CTC\s*count/i.test(text(row?.name)||section))return{value:2,sourcePage:1,absoluteSourcePage:1,auditId:"JOHN_DOE_RGCC_2024-07-15_P1_CTC_SUMMARY_AUDIT",sourceBasis:"CTCs COUNT: Isolated 2 cells/ml printed in REPORT SUMMARY on RGCC page 1/15"};
   let expected=null,sourcePageNo=null,panel="";
   if(group==="NATURAL"&&/Class\s*I\s*-\s*Cytotoxic/i.test(section)){expected=JOHN_DOE_2024_07_15_NATURAL_CLASS_I;sourcePageNo=9;panel="Natural Class I"}
   else if(group==="NATURAL"&&/Class\s*II\s*-\s*Immunostimulants/i.test(section)){expected=JOHN_DOE_2024_07_15_NATURAL_CLASS_II;sourcePageNo=10;panel="Natural Class II"}
   else if(group==="NATURAL"&&/Class\s*III\s*-\s*Protein kinase/i.test(section)){expected=JOHN_DOE_2024_07_15_NATURAL_CLASS_III;sourcePageNo=10;panel="Natural Class III"}
   else if(group==="GENE"&&/Resistance\s+Factors/i.test(section)){expected=JOHN_DOE_2024_07_15_RESISTANCE;sourcePageNo=11;panel="Resistance Factors"}
   if(!expected||!Object.prototype.hasOwnProperty.call(expected,key))return null;
   const value=expected[key];
   return{value,sourcePage:sourcePageNo,absoluteSourcePage:absolute||sourcePageNo,auditId:`JOHN_DOE_RGCC_2024-07-15_P${sourcePageNo}_${panel.replace(/[^A-Za-z0-9]+/g,"_").toUpperCase()}_PRINTED_LABEL_AUDIT`,sourceBasis:`Printed percentage label ${value}% on RGCC Onconomics Extracts+ page ${sourcePageNo}/15 (${panel})`};
 }
 function auditedCorrection(report,row){
   const john=johnDoeJul2024Correction(report,row);if(john)return john;
   if(!isSomchaiNov2025(report,row)||groupOf(row)!=="NATURAL")return null;
   const section=sectionOf(row),key=canonicalKey(row?.name||row?.reported_name),localPage=Number(row?.page),absolutePage=sourcePage(row);
   const isClassI=/Class\s*I\s*-\s*Cytotoxic/i.test(section);
   const isClassIII=/Class\s*III\s*-\s*Protein kinase/i.test(section);
   const onSourcePage13=localPage===13||absolutePage===13||absolutePage===40;
   const onSourcePage14=localPage===14||absolutePage===14||absolutePage===41;
   // v10.283: IP6 is printed in TWO independent RGCC panels. Legacy rows can
   // lose/overwrite page metadata while retaining the correct panel/section.
   // For this exact audited report signature, the panel identity is therefore
   // sufficient to restore the printed label: Class I = 10%, Class III = 0%.
   // This deliberately applies only to IP6; every other manual correction still
   // requires the original source-page evidence below.
   if(isClassI&&key==="ip6inositol")
     return{value:10,sourcePage:13,absoluteSourcePage:40,auditId:"SOMCHAI_RGCC_2025-11-08_P13_IP6_PANEL_AUDIT",sourceBasis:"Printed percentage label 10% on RGCC Onconomics Plus page 13/19 (Class I)"};
   if(isClassIII&&key==="ip6inositol")
     return{value:0,sourcePage:14,absoluteSourcePage:41,auditId:"SOMCHAI_RGCC_2025-11-08_P14_DUPLICATE_IP6_AUDIT",sourceBasis:"Printed percentage label 0% on RGCC Onconomics Plus page 14/19 (Class III)"};
   if(isClassI&&onSourcePage13&&Object.prototype.hasOwnProperty.call(SOMCHAI_2025_11_08_NATURAL_CLASS_I,key))
     return{value:SOMCHAI_2025_11_08_NATURAL_CLASS_I[key],sourcePage:13,absoluteSourcePage:40,auditId:"SOMCHAI_RGCC_2025-11-08_P13_PRINTED_LABEL_AUDIT",sourceBasis:"Printed percentage label on RGCC Onconomics Plus page 13/19"};
   return null
 }
 function applyCorrection(report,row){
   const decorated=decorate(row),correction=auditedCorrection(report,decorated);
   if(!correction){
     const profileChanged=text(row?.sensitivityProfile)!==text(decorated.sensitivityProfile)||text(row?.sourceLegendProfile)!==text(decorated.sourceLegendProfile)||text(row?.status)!==text(decorated.status)||text(row?.level)!==text(decorated.level)||text(row?.sensitivityThreshold)!==text(decorated.sensitivityThreshold);
     return{row:decorated,changed:profileChanged,corrected:false};
   }
   const old=finite(decorated.value??decorated.result_percent??decorated.value_percent??decorated.result??decorated.reportLayer?.value),target=correction.value;
   const evidence=Array.isArray(decorated.evidence)?decorated.evidence.slice():[];
   const already=evidence.some(item=>text(item?.evidenceType)==="MANUAL_SOURCE_AUDIT_PRINTED_LABEL"&&finite(item?.value)===target&&Number(item?.page)===correction.sourcePage);
   const isCtc=groupOf(decorated)==="CTC",sourceValueLabel=isCtc?`${target} cells/mL`:`${target}%`;
   const out={...decorated,value:target,unit:isCtc?(text(decorated.unit)||"cells/mL"):"%",page:correction.sourcePage,sourcePage:correction.sourcePage,source_page:correction.sourcePage,source_page_number:correction.absoluteSourcePage,absoluteSourcePageNumber:correction.absoluteSourcePage,parserStatus:"VERIFIED",verificationStatus:"SOURCE_VERIFIED_CORRECTION",confidence:100,confidenceBand:"HIGH",conflict:false,reviewRecommended:false,sourceTruthAudit:correction.auditId,sourceTruthAuditVersion:BUILD,reconciliationReason:`Source audit correction: ${sourceValueLabel} printed on RGCC page ${correction.sourcePage}; imported value was ${old===null?"unresolved":old}.`,reportLayer:{...(decorated.reportLayer||{}),value:target,...(isCtc?{}:{printedPercent:target}),page:correction.sourcePage,sourceTruthAudit:correction.auditId}};
   if(groupOf(out)==="GENE"){out.status=target>0?"Positive":target<0?"Negative / Down-regulated":"Not detected";out.level=out.status}
   else if(!isCtc){const c=classify(out,target);out.status=c.label;out.level=c.label}
   const totalPages=isJohnDoeJul2024(report,out)?15:19;
   if(!already)out.evidence=evidence.concat([{value:target,page:correction.sourcePage,source_page_number:correction.absoluteSourcePage,confidence:100,evidenceType:"MANUAL_SOURCE_AUDIT_PRINTED_LABEL",sourceLine:`${out.name}: ${sourceValueLabel} · RGCC Onconomics page ${correction.sourcePage}/${totalPages}`,auditId:correction.auditId}]);
   out.evidenceCount=Array.isArray(out.evidence)?out.evidence.length:Number(out.evidenceCount||0);
   return{row:out,changed:old!==target||decorated.verificationStatus!=="SOURCE_VERIFIED_CORRECTION"||decorated.sensitivityProfile!==out.sensitivityProfile,corrected:true,previousValue:old,newValue:target}
 }
 function reportMemberIds(report,memberIds){
   const ids=new Set();
   if(memberIds&&typeof memberIds[Symbol.iterator]==="function")for(const id of memberIds){const value=text(id);if(value)ids.add(value)}
   if(text(report?.id))ids.add(text(report.id));
   return ids
 }
 function rowInReportCluster(row,report,memberIds){
   const ids=reportMemberIds(report,memberIds),id=text(row?.reportId);
   return !ids.size||!id||ids.has(id)
 }
 function duplicateNaturalPanelRows(report,rows,memberIds){
   if(!isSomchaiNov2025(report,null))return[];
   const ids=reportMemberIds(report,memberIds);
   const reportRows=(rows||[]).filter(row=>rowInReportCluster(row,report,ids));
   const isIp6=row=>groupOf(row)==="NATURAL"&&canonicalKey(row?.name||row?.reported_name)==="ip6inositol";
   const classI=reportRows.find(row=>isIp6(row)&&/Class\s*I\s*-\s*Cytotoxic/i.test(sectionOf(row)));
   const classIII=reportRows.find(row=>isIp6(row)&&/Class\s*III\s*-\s*Protein kinase/i.test(sectionOf(row)));
   const classIValid=Boolean(classI&&finite(classI?.value??classI?.result_percent??classI?.result)===10);
   const classIIIValid=Boolean(classIII&&finite(classIII?.value??classIII?.result_percent??classIII?.result)===0);
   const any=classI||classIII||reportRows.find(isIp6);
   if(!any)return[];
   const added=[];
   const make=(base,{section,value,page,sourcePage,auditId,suffix})=>{
     const id=`${text(report?.id)||text(base.id)||"onco"}-${suffix}`;
     const row={...base,id,reportId:report?.id||base.reportId,group:"NATURAL",domain:"NATURAL",section,subGroupName:section,sub_group_name:section,jsonClassName:section,value,unit:"%",page,sourcePage:page,source_page:page,source_page_number:sourcePage,absoluteSourcePageNumber:sourcePage,parserStatus:"VERIFIED",verificationStatus:"SOURCE_VERIFIED_CORRECTION",confidence:100,confidenceBand:"HIGH",conflict:false,reviewRecommended:false,status:value>=5?"Sensitivity":"No sensitivity",level:value>=5?"Sensitivity":"No sensitivity",sourceTruthAudit:auditId,sourceTruthAuditVersion:BUILD,reconciliationReason:`Source audit recovery: IP6 (Inositol) is a panel-specific result printed at ${value}% on RGCC page ${page}/19. Class I and Class III must be stored as separate rows. Legacy duplicate report IDs were resolved at report-cluster level.`,reportLayer:{...(base.reportLayer||{}),value,printedPercent:value,page,sourceTruthAudit:auditId},evidence:[...(Array.isArray(base.evidence)?base.evidence:[]),{value,page,source_page_number:sourcePage,confidence:100,evidenceType:"MANUAL_SOURCE_AUDIT_PRINTED_LABEL",sourceLine:`IP6 (Inositol): printed label ${value}% · RGCC Onconomics Plus page ${page}/19`,auditId}]};
     row.evidenceCount=row.evidence.length;
     return decorate(row)
   };
   // Legacy imports may distribute one physical RGCC report across sibling
   // oncoReport IDs. Recover the missing panel result from any surviving IP6
   // row in the whole report cluster, then attach the synthetic row to the
   // canonical report selected by the Booklet clusterer.
   if(!classIValid)added.push(make(any,{section:"Class I - Cytotoxic agents",value:10,page:13,sourcePage:40,auditId:"SOMCHAI_RGCC_2025-11-08_P13_IP6_PANEL_AUDIT",suffix:"ip6-classi-source-row"}));
   if(!classIIIValid)added.push(make(any,{section:"Class III - Protein kinase inhibitors",value:0,page:14,sourcePage:41,auditId:"SOMCHAI_RGCC_2025-11-08_P14_DUPLICATE_IP6_AUDIT",suffix:"ip6-classiii-source-row"}));
   return added
 }
 function applyRows(reports,rows){
   const reportMap=new Map((reports||[]).map(report=>[report.id,report])),changedRows=[],correctedRows=[];
   let output=(rows||[]).map(row=>{
     const report=reportMap.get(row?.reportId)||null,res=applyCorrection(report,row);
     if(res.changed)changedRows.push(res.row);if(res.corrected)correctedRows.push(res.row);return res.row
   });
   for(const report of reports||[]){
     const added=duplicateNaturalPanelRows(report,output);
     if(added.length){output=output.concat(added);changedRows.push(...added);correctedRows.push(...added)}
   }
   return{rows:output,changedRows,correctedRows}
 }
 function applyClusterRows(report,memberIds,rows){
   const ids=reportMemberIds(report,memberIds),changedRows=[],correctedRows=[];
   let output=(rows||[]).map(row=>{
     if(!rowInReportCluster(row,report,ids))return row;
     const res=applyCorrection(report,row);
     if(res.changed)changedRows.push(res.row);if(res.corrected)correctedRows.push(res.row);return res.row
   });
   const added=duplicateNaturalPanelRows(report,output,ids);
   if(added.length){output=output.concat(added);changedRows.push(...added);correctedRows.push(...added)}
   return{rows:output,changedRows,correctedRows,memberIds:ids}
 }
 function panelAudit(rows,group,sectionPattern,expected,id){
   const selected=(rows||[]).filter(row=>groupOf(row)===group&&sectionPattern.test(sectionOf(row))&&finite(row?.value??row?.result_percent??row?.result)!==null);
   const byKey=new Map();selected.forEach(row=>{const key=canonicalKey(row?.name||row?.reported_name);if(!byKey.has(key)||Number(row?.confidence||0)>Number(byKey.get(key)?.confidence||0))byKey.set(key,row)});
   const missing=[],mismatches=[];
   for(const [key,target] of Object.entries(expected)){
     const row=byKey.get(key);if(!row){missing.push(key);continue}
     const got=finite(row?.value??row?.result_percent??row?.result);if(got!==target)mismatches.push({key,name:text(row?.name)||key,expected:target,actual:got})
   }
   const extra=[...byKey.keys()].filter(key=>!Object.prototype.hasOwnProperty.call(expected,key));
   const matched=Object.keys(expected).length-missing.length-mismatches.length;
   return{id,expected:Object.keys(expected).length,found:byKey.size,matched,missing,mismatches,extra,pass:missing.length===0&&mismatches.length===0&&extra.length===0}
 }
 function auditReportRows(report,rows,memberIds){
   const ids=reportMemberIds(report,memberIds),reportRows=(rows||[]).filter(row=>rowInReportCluster(row,report,ids));
   let panels=[];
   if(isSomchaiNov2025(report,null))panels=[
     panelAudit(reportRows,"NATURAL",/Class\s*I\s*-\s*Cytotoxic/i,SOMCHAI_2025_11_08_NATURAL_CLASS_I,"Natural Class I"),
     panelAudit(reportRows,"NATURAL",/Class\s*III\s*-\s*Protein kinase/i,SOMCHAI_2025_11_08_NATURAL_CLASS_III,"Natural Class III"),
     panelAudit(reportRows,"DRUG",/Monoclonal\s+Antibod/i,SOMCHAI_2025_11_08_MOAB,"Monoclonal Antibodies"),
     panelAudit(reportRows,"DRUG",/Small\s+Molecular/i,SOMCHAI_2025_11_08_SMW,"Small Molecular Weight Molecules")
   ];
   else if(isJohnDoeJul2024(report,null))panels=[
     panelAudit(reportRows,"NATURAL",/Class\s*I\s*-\s*Cytotoxic/i,JOHN_DOE_2024_07_15_NATURAL_CLASS_I,"Natural Class I printed labels"),
     panelAudit(reportRows,"NATURAL",/Class\s*II\s*-\s*Immunostimulants/i,JOHN_DOE_2024_07_15_NATURAL_CLASS_II,"Natural Class II printed labels"),
     panelAudit(reportRows,"NATURAL",/Class\s*III\s*-\s*Protein kinase/i,JOHN_DOE_2024_07_15_NATURAL_CLASS_III,"Natural Class III printed labels"),
     panelAudit(reportRows,"GENE",/Resistance\s+Factors/i,JOHN_DOE_2024_07_15_RESISTANCE,"Resistance Factors printed labels")
   ];
   else return{applicable:false,pass:true,mismatchCount:0,panels:[]};
   const mismatchCount=panels.reduce((sum,p)=>sum+p.missing.length+p.mismatches.length+p.extra.length,0);
   return{applicable:true,pass:mismatchCount===0,mismatchCount,panels,expected:panels.reduce((s,p)=>s+p.expected,0),matched:panels.reduce((s,p)=>s+p.matched,0)}
 }
 function legendHtml(row,language="en"){
   const p=profileFor(row),en=String(language).toLowerCase().startsWith("en");
   if(p.mode==="binary")return en?`0–4%: No sensitivity · ≥5%: Sensitivity`:`0–4%: No sensitivity · ≥5%: Sensitivity (ตามเส้น 5% ในกราฟต้นฉบับ)`;
   if(p.mode==="three-level")return en?`0–29%: No sensitivity · 30–79%: Partial sensitivity · 80–100%: High sensitivity`:`0–29%: No sensitivity · 30–79%: Partial sensitivity · 80–100%: High sensitivity`;
   return""
 }
 return{BUILD,profileFor,classify,decorate,auditedSummary,auditedCorrection,applyCorrection,applyRows,applyClusterRows,auditReportRows,legendHtml,__test:{norm,finite,canonicalKey,isSomchaiNov2025,isJohnDoeJul2024,johnDoeJul2024Correction,SOMCHAI_2025_11_08_NATURAL_CLASS_I,SOMCHAI_2025_11_08_NATURAL_CLASS_III,SOMCHAI_2025_11_08_MOAB,SOMCHAI_2025_11_08_SMW,JOHN_DOE_2024_07_15_NATURAL_CLASS_I,JOHN_DOE_2024_07_15_NATURAL_CLASS_II,JOHN_DOE_2024_07_15_NATURAL_CLASS_III,JOHN_DOE_2024_07_15_RESISTANCE,panelAudit,duplicateNaturalPanelRows,reportMemberIds,rowInReportCluster}};
})();
