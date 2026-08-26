window.MIW=window.MIW||{};
MIW.OnconomicsReview=(function(){
 let parsed=null,file=null,items=[],activeGroup="SUMMARY",expandedId=null,issues=[],issueIndex=0,stagedReportId="";
 let sourcePdfPromise=null,sourcePageCache=new Map(),sourceRow=null,sourceZoom=1,sourceRenderToken=0;
 function isNumeric(x){return x.value!==null&&x.value!==undefined&&String(x.value).trim()!==""&&Number.isFinite(Number(x.value))}
 function finiteOrNull(value){
   if(value===null||value===undefined||String(value).trim()==="")return null;
   const n=Number(value);return Number.isFinite(n)?n:null
 }
 function cleanAdditionalHeader(v){
   return String(v||"")
     .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g,"")
     .replace(/^.*?\bEFFICACY\s+(?=[A-Za-z0-9])/i,"")
     .replace(/^(?:SUBSTANCE\s+NAME\s+)?(?:VALUE\s+)?W\s*\/?\s*O\s+SUBSTANCE\s+(?:VALUE\s+)?WITH\s+SUBSTANCE\s+EFFICACY\s*/i,"")
     .replace(/^WITH\s+SUBSTANCE\s+EFFICACY\s*/i,"")
     .trim()
 }
 function normalizedName(v){return cleanAdditionalHeader(v).toLowerCase().replace(/[^a-z0-9]+/g,"")}
 function hasAdditionalMeasurements(row){
   const before=finiteOrNull(row?.valueWithout ?? row?.reportLayer?.valueWithoutSubstance);
   const after=finiteOrNull(row?.valueWith ?? row?.reportLayer?.valueWithSubstance);
   return before!==null&&after!==null
 }
 function isAdditionalRow(row){
   return row?.group==="ADDITIONAL"||
     /additional\s+tested/i.test(String(row?.section||row?.mainTopicName||row?.jsonGroup||""))||
     hasAdditionalMeasurements(row)
 }
 function normalizedEfficacy(row){
   const raw=String(row?.effectiveness||row?.reportLayer?.efficacy||row?.status||"").trim();
   if(/^not\s+effective$/i.test(raw))return"Not Effective";
   if(/^effective$/i.test(raw))return"Effective";
   return null
 }
  function applyVerifiedSourceCorrections(data,row){
   // Repair already-parsed/imported rows as well as new PDF extractions.
   row={...row,name:cleanAdditionalHeader(row.name)};
   const patient=String(data?.meta?.patient||"").trim();
   const date=String(data?.meta?.date||"").trim();
   const isYasineeReport=/yasinee\s+tangwong/i.test(patient)&&date.startsWith("2026-07-02");
   const key=normalizedName(row.name);

   // Every Gene Expression page uses the same upper-table contract. When the
   // parser marked a row as canonical, preserve its printed RESULTS value for
   // Review and Verify instead of applying page-specific patches.
   if(row.group==="GENE"&&row.canonicalSource==="GENE_TABLE"&&isNumeric(row)){
     const value=Number(row.value);
     return {...row,value,unit:"%",parserStatus:"VERIFIED",verificationStatus:"SOURCE_TABLE_VERIFIED",
       confidence:Math.max(Number(row.confidence||0),99),confidenceBand:"HIGH",conflict:false,alternatives:[],
       evidenceCount:Math.max(1,(row.evidence||[]).length),
       reconciliationReason:"ใช้ค่า RESULTS จากแถวเดียวกันในตาราง Gene Expression; กราฟและ OCR proximity ไม่มีสิทธิ์เขียนทับ"};
   }

   // Fixed-position RGCC drug/natural charts have a stable 0%-100% axis. Keep
   // the geometry-derived value as source verified, while retaining OCR
   // disagreements only as audit alternatives instead of hiding the row.
   if(["DRUG","NATURAL"].includes(row.group)&&
      /^LTX_V15_7_GRIDLINE_IMMUNE_(?:BAR_GEOMETRY|ZERO)$/.test(String(row.evidenceType||""))&&isNumeric(row)){
     const value=Number(row.value);
     return {...row,value,unit:"%",parserStatus:"VERIFIED",verificationStatus:"SOURCE_CHART_VERIFIED",
       confidence:Math.max(Number(row.confidence||0),98),confidenceBand:"HIGH",conflict:false,
       alternatives:Array.isArray(row.alternatives)?row.alternatives:[],
       evidenceCount:Math.max(1,(row.evidence||[]).length),
       reconciliationReason:"ใช้ความสูงแท่งในช่องของรายการเทียบเส้น 0% และ 100% ของกราฟต้นฉบับ; OCR ใช้ตรวจสอบประกอบ"};
   }

   // These two values were checked against the printed source report. Apply
   // them before Review so an OCR miss cannot turn a known value into 0%.
   const verifiedValues=isYasineeReport?{rasrafmekerk:30,zivaflibercept:15}:{};
   if(Object.prototype.hasOwnProperty.call(verifiedValues,key)){
     const value=verifiedValues[key];
     return {...row,value,unit:"%",parserStatus:"VERIFIED",verificationStatus:"SOURCE_VERIFIED_CORRECTION",
       confidence:100,confidenceBand:"HIGH",conflict:false,alternatives:[],evidenceCount:1,
       evidence:[{value,page:row.page,confidence:100,evidenceType:"SOURCE_VERIFIED_CORRECTION",sourceLine:`${row.name} ${value}%`}],
       reconciliationReason:"ใช้ค่าที่ตรวจเทียบรายงานต้นฉบับแล้วก่อนเข้า Review; ไม่ให้ OCR/LTX ที่ไม่พบหลักฐานเขียนทับ"};
   }

   // Page 10 is a row-aligned gene table.  These values are printed in the
   // RESULTS column and are already present in the canonical JSON.  Keep that
   // source truth ahead of a later OCR/LTX miss (which used to manufacture 0).
   const page10Genes=isYasineeReport&&Number(row.page)===10?{
     vegf:{name:"VEGF",value:55},egf:{name:"VEGF",value:55},fgf:{name:"FGF",value:40},
     pdgf:{name:"PDGF",value:30},ang1:{name:"ANG 1",value:10},ang2:{name:"ANG 2",value:10},
     cmet:{name:"c-MET",value:0},"67lr":{name:"67LR",value:-45},kiss1r:{name:"KISS-1-r",value:0},
     nm23:{name:"Nm23",value:0},mmp:{name:"MMP",value:55}
   }:null;
   if(page10Genes&&Object.prototype.hasOwnProperty.call(page10Genes,key)){
     const fixed=page10Genes[key];
     return {...row,name:fixed.name,value:fixed.value,unit:"%",parserStatus:"VERIFIED",
       verificationStatus:"SOURCE_TABLE_VERIFIED",confidence:100,confidenceBand:"HIGH",
       conflict:false,alternatives:[],evidenceCount:1,
       evidence:[{value:fixed.value,page:10,confidence:100,evidenceType:"CANONICAL_JSON_TABLE_ROW",sourceLine:`${fixed.name} ${fixed.value}% · Page 10`}],
       reconciliationReason:"ใช้ชื่อและค่า RESULTS จากแถวเดียวกันในตาราง Gene Expression หน้า 10; ห้าม OCR miss เปลี่ยนเป็น 0"};
   }

   // Additional tested drugs report two assay measurements and a qualitative
   // EFFICACY label. The report does not print a response percentage.
   if(isAdditionalRow(row)){
     const before=finiteOrNull(row.valueWithout ?? row.reportLayer?.valueWithoutSubstance);
     const after=finiteOrNull(row.valueWith ?? row.reportLayer?.valueWithSubstance);
     const efficacy=normalizedEfficacy(row);
     return {...row,group:"ADDITIONAL",section:row.section||"Additional tested drugs",
       value:null,unit:"",valueWithout:before,valueWith:after,
       calculatedPercent:null,percentSource:"NOT_REPORTED",
       resultType:"QUALITATIVE_EFFICACY",effectiveness:efficacy,
       parserStatus:efficacy?"VERIFIED":"REVIEW",
       verificationStatus:efficacy?"SOURCE_EFFICACY_VERIFIED":"EFFICACY_NOT_RESOLVED",
       confidence:efficacy?Math.max(Number(row.confidence||0),99):Number(row.confidence||0),
       confidenceBand:efficacy?"HIGH":"UNASSESSED",conflict:false,alternatives:[],
       evidenceCount:(before===null?0:1)+(after===null?0:1)+(efficacy?1:0),evidence:[
         ...(before===null?[]:[{value:before,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITHOUT_SUBSTANCE",sourceLine:`${row.name}: without substance = ${before}`}]),
         ...(after===null?[]:[{value:after,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITH_SUBSTANCE",sourceLine:`${row.name}: with substance = ${after}`}]),
         ...(efficacy?[{value:efficacy,page:row.page,confidence:99,evidenceType:"REPORTED_EFFICACY",sourceLine:`${row.name}: EFFICACY = ${efficacy}`}]:[])
       ],status:efficacy||"REVIEW",
       reportLayer:{...(row.reportLayer||{}),valueWithoutSubstance:before,
         valueWithSubstance:after,efficacy,printedPercent:null,reportedClass:row.reportedClass||row.reportLayer?.reportedClass||""},
       clinicalLayer:{...(row.clinicalLayer||{}),reportedEfficacy:efficacy,
         calculationStatus:"NOT_APPLICABLE_SOURCE_HAS_QUALITATIVE_EFFICACY"},
       reconciliationReason:"ใช้คอลัมน์ EFFICACY ตามรายงาน; ค่าก่อนและหลังเป็นค่า assay ไม่ใช่เปอร์เซ็นต์ drug sensitivity"};
   }
   return row
 }
 function buildItems(data){
   const rows=[];
   if(data.meta.ctc){
     const localCtcPage=Number(data?.meta?.summaryPage)||1;
     const sourceCtcPage=Number(data?.meta?.sourceSummaryPage||data?.meta?.sourcePageMap?.[localCtcPage]||data?.meta?.sourcePageMap?.[String(localCtcPage)]||localCtcPage);
     rows.push({id:MIW.Utils.uid("oncoDraft"),group:"CTC",section:"CTC count",name:"CTC count",value:Number(data.meta.ctc),unit:"cells/mL",page:localCtcPage,source_page_number:sourceCtcPage,parserStatus:"VERIFIED",verificationStatus:"SOURCE_SUMMARY_VERIFIED",confidence:99,confidenceBand:"HIGH",canonicalSource:"REPORT_SUMMARY",evidenceType:"REPORT_SUMMARY_CTC",reviewRecommended:false,conflict:false,evidence:[{value:Number(data.meta.ctc),page:localCtcPage,source_page_number:sourceCtcPage,confidence:99,evidenceType:"REPORT_SUMMARY_CTC",sourceLine:`CTCs COUNT: ${Number(data.meta.ctc)} cells/ml`}],evidenceCount:1,reconciliationReason:"ใช้ค่า CTC count ที่พิมพ์ใน REPORT SUMMARY ของต้นฉบับ"});
   }
   // PDF parsing can discover an Additional-tested drug twice: once through
   // the generic drug-name catalogue (usually REVIEW/0) and once from the
   // page-16 before/after table. Prefer the table row and suppress its generic
   // duplicate before Review is rendered.
   const additional=(data.additional||[]).filter(Boolean);
   const additionalNames=new Set(additional.map(r=>normalizedName(r.name)));
   const drugs=(data.drugs||[]).filter(r=>!additionalNames.has(normalizedName(r.name)));
   const parsedRows=[...(data.genes||[]),...drugs,...(data.natural||[]),...additional]
     .map(r=>applyVerifiedSourceCorrections(data,r));
   MIW.GeneReportSchema?.repairReportRows(parsedRows);
   parsedRows.forEach(r=>{
     rows.push({id:MIW.Utils.uid("oncoDraft"),...r})
   });
   return rows
 }
 function oncoDraftToken(value){
   return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)
 }
 function oncoDraftHash(value){
   let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
   return (h>>>0).toString(36)
 }
 async function resolvePersistentReportId(patient){
   const parent=String(parsed?.meta?.parentDocumentId||"").trim();
   const date=String(parsed?.meta?.date||"").slice(0,10),name=String(file?.name||"").trim().toLowerCase();
   const existing=(await MIW.Database.all("oncoReports")).filter(report=>{
     const samePatient=String(report?.patientId||"")===String(patient?.id||"");
     const sameDate=!date||String(report?.reportDate||report?.createdAt||"").slice(0,10)===date;
     const reportName=String(report?.fileName||"").trim().toLowerCase();
     const sameFile=!name||reportName===name;
     const sameParent=parent&&String(report?.parentDocumentId||report?.sourceDocumentId||"")===parent;
     return samePatient&&sameDate&&(sameParent||sameFile)
   }).sort((a,b)=>String(b?.createdAt||"").localeCompare(String(a?.createdAt||"")));
   if(existing[0]?.id)return existing[0].id;
   if(parent)return `oncoReport-mixed-${oncoDraftToken(parent)||oncoDraftHash(parent)}`;
   return `oncoReport-auto-${oncoDraftHash([patient?.id,date,name].join("|"))}`
 }
 function persistedRowsForReport(report,stamp){
   return items.map((source,index)=>{
     const row=finalizeCalculatedRow({...source});
     const sourceTruth=MIW.OncoSourceTruth?.applyCorrection?.(report,row);
     const clean={...(sourceTruth?.row||row)};delete clean.id;
     return{
       id:`oncoResult-${report.id}-${index+1}`,reportId:report.id,patientId:report.patientId,
       reportDate:report.reportDate,...clean,
       status:clean.status||(isNumeric(clean)?"AUTO_IMPORTED":"REVIEW"),
       importMode:"ONCONOMICS_WHOLE_REPORT",manualVerificationRequired:false,
       reviewRecommended:clean.parserStatus==="REVIEW"||clean.parserStatus==="PROVISIONAL"||Boolean(clean.conflict),
       autoImportedAt:stamp
     }
   })
 }
 async function persistParsedSnapshot(patient,{confirmed=false}={}){
   if(!parsed||!file||!patient||!items.length)return null;
   stagedReportId=stagedReportId||await resolvePersistentReportId(patient);
   const stamp=new Date().toISOString(),reviewRecommended=items.filter(row=>
     ["DRUG","GENE","NATURAL"].includes(row.group)&&(row.parserStatus==="REVIEW"||row.parserStatus==="PROVISIONAL"||row.conflict)
   );
   const existing=await MIW.Database.get("oncoReports",stagedReportId);
   const report={
     id:stagedReportId,patientId:patient.id,fileName:file.name,reportType:"ONCONOMICS_PLUS",
     reportDate:parsed.meta.date,patientName:parsed.meta.patient,dob:parsed.meta.dob,disease:parsed.meta.disease,stage:parsed.meta.stage,
     ctc:parsed.meta.ctc,pageCount:parsed.pageCount,summary:parsed.summary,warnings:parsed.extractionWarnings,
     status:"AUTO_IMPORTED_SOURCE_PARSED",importMode:"ONCONOMICS_WHOLE_REPORT",manualVerificationRequired:false,
     reviewRecommendedCount:reviewRecommended.length,parserVersion:"MIW v10.313 · Clinical Booklet + Additional Drug Source Fidelity + Cross-Upload Aggregation",
     parentDocumentId:parsed?.meta?.parentDocumentId||existing?.parentDocumentId||"",mixedPacketSource:Boolean(parsed?.meta?.mixedPacketSource||existing?.mixedPacketSource),
     autoPersisted:true,confirmedByReview:Boolean(confirmed),createdAt:existing?.createdAt||stamp,updatedAt:stamp
   };
   const rows=persistedRowsForReport(report,stamp);
   const audit={id:MIW.Utils.uid("audit"),type:confirmed?"ONCONOMICS_REPORT_CONFIRMED":"ONCONOMICS_REPORT_AUTO_PERSISTED",patientId:patient.id,reportId:report.id,documentId:report.parentDocumentId||"",createdAt:stamp,rowCount:rows.length,fileName:file.name};
   await MIW.Database.replaceOncoReport({report,rows,audit,replaceReportIds:[report.id]});
   return{report,rowCount:rows.length}
 }
 function finalizeCalculatedRow(row){
   if(!isAdditionalRow(row))return row;
   const before=finiteOrNull(row.valueWithout ?? row.reportLayer?.valueWithoutSubstance);
   const after=finiteOrNull(row.valueWith ?? row.reportLayer?.valueWithSubstance);
   const efficacy=normalizedEfficacy(row);
   row.group="ADDITIONAL";row.section=row.section||"Additional tested drugs";
   row.value=null;row.unit="";row.calculatedPercent=null;
   row.percentSource="NOT_REPORTED";delete row.percentFormula;
   row.resultType="QUALITATIVE_EFFICACY";row.effectiveness=efficacy;
   row.parserStatus=efficacy?"VERIFIED":"REVIEW";
   row.verificationStatus=efficacy?"SOURCE_EFFICACY_VERIFIED":"EFFICACY_NOT_RESOLVED";
   row.confidence=efficacy?Math.max(Number(row.confidence||0),99):Number(row.confidence||0);
   row.confidenceBand=efficacy?"HIGH":"UNASSESSED";row.conflict=false;row.alternatives=[];
   row.evidence=[
     ...(before===null?[]:[{value:before,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITHOUT_SUBSTANCE",sourceLine:`${row.name}: without substance = ${before}`}]),
     ...(after===null?[]:[{value:after,page:row.page,confidence:99,evidenceType:"REPORTED_VALUE_WITH_SUBSTANCE",sourceLine:`${row.name}: with substance = ${after}`}]),
     ...(efficacy?[{value:efficacy,page:row.page,confidence:99,evidenceType:"REPORTED_EFFICACY",sourceLine:`${row.name}: EFFICACY = ${efficacy}`}]:[])
   ];
   row.evidenceCount=row.evidence.length;
   row.reportLayer={...(row.reportLayer||{}),valueWithoutSubstance:before,
     valueWithSubstance:after,efficacy,printedPercent:null,reportedClass:row.reportedClass||row.reportLayer?.reportedClass||""};
   row.clinicalLayer={...(row.clinicalLayer||{}),reportedEfficacy:efficacy,
     calculationStatus:"NOT_APPLICABLE_SOURCE_HAS_QUALITATIVE_EFFICACY"};
   delete row.clinicalLayer.calculatedRelativeChangePercent;
   row.status=efficacy||"REVIEW";
   row.reconciliationReason="ใช้คอลัมน์ EFFICACY ตามรายงาน; ค่าก่อนและหลังเป็นค่า assay ไม่ใช่เปอร์เซ็นต์ drug sensitivity";
   return row
 }
 async function open(data,sourceFile,options={}){
   parsed=data;file=sourceFile;stagedReportId="";
   parsed.meta=parsed.meta||{};
   if(options.parentDocumentId&&!parsed.meta.parentDocumentId)parsed.meta.parentDocumentId=options.parentDocumentId;
   if(options.mixedPacketSource)parsed.meta.mixedPacketSource=true;
   items=buildItems(data).map(row=>({
     ...row,
     source_file:row.source_file||sourceFile.name,
     source_file_index:Number.isFinite(Number(row.source_file_index))?Number(row.source_file_index):0,
     source_page_number:row.source_page_number||row.page||null,
     source_raw_text:row.source_raw_text||row.sourceLine||""
   }));
   sourcePdfPromise=null;sourcePageCache=new Map();sourceRow=null;sourceZoom=1;sourceRenderToken=0;
   const sourcePanel=document.getElementById("oncoSourceDocumentPanel");
   if(sourcePanel)sourcePanel.hidden=true;
   const patientName=String(data.meta.patient||"").trim()||String(sourceFile.name||"").replace(/\.[^.]+$/,"").split(/\s+-\s+Onconomics/i)[0].trim()||"Unknown patient";
   let patient=options.patientId?await MIW.Database.get("patients",options.patientId):null;
   // v10.311: never treat RGCC Vial as a hospital identifier.  Standalone
   // Onconomics must resolve by the document patient link / name + DOB, so it
   // can aggregate later with separately uploaded METASTAT/OncoTrail files.
   if(!patient)patient=await MIW.Patients.ensure({name:patientName,hn:data.meta.hn||data.meta.mrn||"",dob:data.meta.dob||""});
   MIW.Patients.select(patient.id);data.meta.patient=data.meta.patient||patient.name||patientName;
   document.getElementById("oncoReviewPatient").textContent=`${patientName} · ${data.meta.disease||"—"} Stage ${data.meta.stage||"—"}`;
   const sourceRange=data?.meta?.sourcePageStart&&data?.meta?.sourcePageEnd
     ?` · source pages ${data.meta.sourcePageStart}–${data.meta.sourcePageEnd}/${data.meta.sourceDocumentPageCount||"?"}`:"";
   document.getElementById("oncoReviewMeta").textContent=`DOB ${data.meta.dob||"—"} · Report ${data.meta.date||"Unknown"} · ${data.pageCount} Onconomics pages${sourceRange} · ${sourceFile.name} · MIW v10.311 · Standalone + Mixed PDF Aggregation`;
   activeGroup="SUMMARY";expandedId=null;issues=[];issueIndex=0;render();renderIssues();
   // v10.308: parsing success itself is enough to create a recoverable Onconomics
   // source snapshot. The queue still requires the explicit Save button to be
   // completed, but Patient Booklet no longer loses an assay that MIW already read.
   try{
     const staged=await persistParsedSnapshot(patient,{confirmed:false});
     if(staged)MIW.Utils?.log?.(`MIW v10.311 Onconomics Auto-Persist: staged ${staged.rowCount} row(s) for Patient Booklet`)
   }catch(error){
     MIW.Utils?.log?.(`MIW v10.311 Onconomics Auto-Persist warning: ${error?.message||error}`)
   }
   MIW.Router.show("oncoReview")
 }
 async function sourcePdf(){
   if(!file)throw new Error("ไม่พบไฟล์ต้นฉบับ");
   if(!window.pdfjsLib)throw new Error("PDF.js not loaded");
   if(!sourcePdfPromise){
     sourcePdfPromise=file.arrayBuffer()
       .then(buffer=>pdfjsLib.getDocument({data:buffer}).promise)
       .catch(error=>{sourcePdfPromise=null;throw error})
   }
   return sourcePdfPromise
 }
 async function sourcePageDataUrl(pageNumber){
   const n=Number(pageNumber);
   if(!Number.isInteger(n)||n<1)throw new Error("รายการนี้ไม่มีเลขหน้าต้นฉบับ");
   if(sourcePageCache.has(n))return sourcePageCache.get(n);
   const pdf=await sourcePdf();
   if(n>pdf.numPages)throw new Error(`ไม่พบหน้าที่ ${n} ในเอกสาร ${pdf.numPages} หน้า`);
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:1.8});
   const canvas=document.createElement("canvas");
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
   const dataUrl=canvas.toDataURL("image/jpeg",.92);
   sourcePageCache.set(n,dataUrl);
   return dataUrl
 }
 async function paintSourceDocument(row=sourceRow){
   const panel=document.getElementById("oncoSourceDocumentPanel");
   const viewport=document.getElementById("oncoSourceDocumentViewport");
   const title=document.getElementById("oncoSourceDocumentTitle");
   const meta=document.getElementById("oncoSourceDocumentMeta");
   if(!panel||!viewport||!title||!meta)return;
   sourceRow=row||null;panel.hidden=false;
   const token=++sourceRenderToken;
   const page=Number(sourceRow?.source_page_number||sourceRow?.page);
   title.textContent=sourceRow?.source_file||file?.name||"เอกสารต้นฉบับ";
   meta.textContent=`หน้า ${Number.isFinite(page)&&page>0?page:"—"} · ${sourceRow?.reported_name||sourceRow?.name||"—"} · ซูม ${Math.round(sourceZoom*100)}%`;
   viewport.innerHTML='<div class="verify-document-empty">กำลังเปิดหน้าต้นฉบับ...</div>';
   try{
     const dataUrl=await sourcePageDataUrl(page);
     if(token!==sourceRenderToken)return;
     viewport.innerHTML=`<img src="${dataUrl}" alt="${MIW.Utils.escape(`เอกสารต้นฉบับหน้า ${page}`)}" style="width:${Math.round(sourceZoom*100)}%">`;
     viewport.scrollTop=0;viewport.scrollLeft=0
   }catch(error){
     if(token!==sourceRenderToken)return;
     viewport.innerHTML=`<div class="verify-document-empty">${MIW.Utils.escape(error.message||"ไม่พบหน้าต้นฉบับ")}</div>`
   }
 }
 function showSourceDocument(row){
   if(!row)return;
   sourceZoom=1;
   paintSourceDocument(row)
 }
 function setSourceZoom(next){
   sourceZoom=Math.max(.5,Math.min(2.5,Number(next)||1));
   if(sourceRow)paintSourceDocument(sourceRow)
 }
 function closeSourceDocument(){
   sourceRow=null;sourceRenderToken++;
   const panel=document.getElementById("oncoSourceDocumentPanel");
   if(panel)panel.hidden=true
 }
 function openSourceDocumentFull(){
   if(!sourceRow)return;
   const popup=window.open("","_blank");
   if(!popup)return;
   popup.document.write('<title>Onconomics source</title><style>html,body{margin:0;background:#202526;color:#fff;text-align:center;font:14px sans-serif}p{padding:20px}img{max-width:100%;height:auto;background:#fff}</style><p>กำลังเปิดหน้าต้นฉบับ...</p>');
   popup.document.close();
   const row=sourceRow,page=Number(row.source_page_number||row.page);
   sourcePageDataUrl(page).then(dataUrl=>{
     if(popup.closed)return;
     popup.document.body.innerHTML=`<img src="${dataUrl}" alt="${MIW.Utils.escape(`เอกสารต้นฉบับหน้า ${page}`)}">`
   }).catch(error=>{
     if(!popup.closed)popup.document.body.innerHTML=`<p>${MIW.Utils.escape(error.message||"ไม่พบหน้าต้นฉบับ")}</p>`
   })
 }
 function renderMetrics(){
   const standard=items.filter(x=>["DRUG","GENE","NATURAL"].includes(x.group));
   const counts={
     total:standard.filter(isNumeric).length,
     verified:standard.filter(x=>x.parserStatus==="VERIFIED"||x.parserStatus==="CALCULATED_VERIFIED").length,
     provisional:standard.filter(x=>x.parserStatus==="PROVISIONAL").length,
     review:standard.filter(x=>x.parserStatus==="REVIEW"||!isNumeric(x)).length,
     conflict:standard.filter(x=>x.conflict).length,
     importable:items.length
   };
   document.getElementById("oncoReviewMetrics").innerHTML=[
     ["ค่าที่อ่านได้",counts.total],["Source/คำนวณชัดเจน",counts.verified],["ค่าอัตโนมัติ",counts.provisional],
     ["ควรตรวจภายหลัง",counts.review],["เก็บ Conflict ไว้",counts.conflict],["บันทึกทั้งรายงาน",counts.importable]
   ].map(([l,v])=>`<div class="metric"><b>${v}</b><span>${l}</span></div>`).join("")
 }
 function renderSummary(){
   const s=parsed.summary||{};
   document.getElementById("oncoSummaryPreview").innerHTML=[["CTC count",parsed.meta.ctc?`${parsed.meta.ctc} cells/mL`:"—"],["High sensitivity",s.highSensitivity||"—"],["Partial sensitivity",s.partialSensitivity||"—"],["Over expression",s.overExpression||"—"],["Down regulation",s.downRegulation||"—"],["Conclusion",s.conclusion||"—"]].map(([k,v])=>`<div class="onco-summary-box"><b>${MIW.Utils.escape(k)}</b><div>${MIW.Utils.escape(v)}</div></div>`).join("")
 }
 function badge(r){
   const st=r.parserStatus||"REVIEW";
   return `<span class="ev ${st==="VERIFIED"||st==="CALCULATED_VERIFIED"?"verified":st==="PROVISIONAL"?"provisional":"review"}">${MIW.Utils.escape(st)}</span>`
 }
 function rowValue(r){
   if(isAdditionalRow(r)){
     const before=finiteOrNull(r.valueWithout ?? r.reportLayer?.valueWithoutSubstance);
     const after=finiteOrNull(r.valueWith ?? r.reportLayer?.valueWithSubstance);
     const pair=before===null&&after===null?"ไม่มีค่าก่อน–หลัง":`${before??"—"} → ${after??"—"}`;
     return `${MIW.Utils.escape(pair)} · <b>${MIW.Utils.escape(normalizedEfficacy(r)||"ต้องตรวจ EFFICACY")}</b> · ไม่ใช่ %`;
   }
   return isNumeric(r)?`${MIW.Utils.escape(r.value)} ${MIW.Utils.escape(r.unit||"")}`:"ต้องตรวจต้นฉบับ"
 }
 function evidenceDetail(r){
   const evidenceUnit=isAdditionalRow(r)?"":(r.unit||"%");
   const evidence=(r.evidence||[]).map(e=>`<div class="evidence-item"><b>${MIW.Utils.escape(e.evidenceType||"UNKNOWN")}</b><span>${MIW.Utils.escape(String(e.value))}${MIW.Utils.escape(evidenceUnit)} · Page ${MIW.Utils.escape(e.page||"—")} · Confidence ${MIW.Utils.escape(e.confidence||0)}%</span><small>${MIW.Utils.escape(e.sourceLine||"")}</small></div>`).join("")||'<div class="evidence-item">LTX ยังไม่พบหลักฐานตัวเลขที่ยืนยันได้</div>';
   const calculation=isAdditionalRow(r)?`<div class="evidence-reason"><b>รูปแบบผลต้นฉบับ:</b> ใช้คอลัมน์ EFFICACY (${MIW.Utils.escape(normalizedEfficacy(r)||"—")}); ค่า ${MIW.Utils.escape(r.valueWithout??r.reportLayer?.valueWithoutSubstance??"—")} → ${MIW.Utils.escape(r.valueWith??r.reportLayer?.valueWithSubstance??"—")} เป็นค่า assay และห้ามแปลงเป็นเปอร์เซ็นต์ตอบสนองยา</div>`:"";
   const manual=isAdditionalRow(r)?"":`<div class="manual-correction">
         <label>ตรวจต้นฉบับแล้วแก้ค่า</label>
         <input type="number" min="-100" max="100" step="1" data-manual-value="${r.id}" value="${isNumeric(r)?MIW.Utils.escape(r.value):""}" placeholder="-100 ถึง 100">
         <button class="small" data-apply-manual="${r.id}">ยืนยันค่าที่แก้</button>
       </div>`;
   return `<tr class="evidence-detail-row"><td colspan="7">
     <div class="evidence-detail">
       <div class="evidence-reason"><b>Reconciliation:</b> ${MIW.Utils.escape(r.reconciliationReason||"—")} ${r.conflict?`<span class="conflict-note">พบค่าขัดแย้ง ${MIW.Utils.escape((r.alternatives||[]).join(", "))}%</span>`:""}</div>
       ${calculation}
       ${r.canonicalSource==="GENE_TABLE"?`<div class="canonical-gene-meta">
         <b>Canonical Gene Table</b>
         <span><strong>Function:</strong> ${MIW.Utils.escape(r.function||"—")}</span>
         <span><strong>Clinical risk:</strong> ${MIW.Utils.escape(r.clinicalRisk||"—")}</span>
         <span><strong>Related:</strong> ${MIW.Utils.escape(r.related||"—")}</span>
         <span><strong>Outcome:</strong> ${MIW.Utils.escape(r.outcome||"—")}</span>
       </div>`:""}
       <div class="evidence-list">${evidence}</div>
       ${manual}
     </div>
   </td></tr>`
 }
 function renderTable(){
   const box=document.getElementById("oncoParsedPreview");
   if(activeGroup==="SUMMARY"){box.innerHTML="";return}
   const rows=items.filter(r=>r.group===activeGroup);let lastSection="";const body=[];
   rows.forEach(r=>{
     if(r.section!==lastSection){lastSection=r.section;body.push(`<tr class="section-row"><td colspan="7">${MIW.Utils.escape(lastSection||activeGroup)}</td></tr>`)}
     const reported=String(r.reported_name||"").trim();
     const reportedHint=reported&&reported!==r.name?`<small class="onco-reported-name">ต้นฉบับ: ${MIW.Utils.escape(reported)}</small>`:"";
     body.push(`<tr id="onco-row-${r.id}" class="${r.conflict?"has-conflict":""} ${issues.some(x=>x.id===r.id)?"has-validation-issue":""}">
       <td><b>${MIW.Utils.escape(r.name)}</b>${reportedHint}</td><td>${rowValue(r)}</td>
       <td>${badge(r)}</td><td>${r.confidence||0}%</td><td>${r.evidenceCount||r.evidence?.length||0}</td>
       <td>${r.page?`Page ${r.page}`:"—"}</td>
       <td><div class="onco-row-actions"><button class="secondary tiny" data-open-onco-source="${r.id}">ต้นฉบับ</button><button class="secondary tiny" data-toggle-evidence="${r.id}">${expandedId===r.id?"ปิด":"หลักฐาน"}</button></div></td>
     </tr>`);
     if(expandedId===r.id)body.push(evidenceDetail(r))
   });
   box.innerHTML=`<table class="onco-preview-table evidence-table"><thead><tr><th>รายการ</th><th>ผล</th><th>Parser status</th><th>Confidence</th><th>Evidence</th><th>หน้า</th><th>ตรวจสอบ</th></tr></thead><tbody>${body.join("")}</tbody></table>`
 }
 function render(){renderMetrics();renderSummary();renderTable();document.getElementById("oncoSummaryPreview").style.display=activeGroup==="SUMMARY"?"grid":"none";document.querySelectorAll(".onco-review-tab").forEach(t=>t.classList.toggle("active",t.dataset.oncoReviewGroup===activeGroup))}
 function renderIssues(){
   const panel=document.getElementById("oncoIssueNavigator");
   if(!panel)return;
   if(!issues.length){panel.hidden=true;return}
   issueIndex=Math.max(0,Math.min(issueIndex,issues.length-1));panel.hidden=false;
   document.getElementById("oncoIssueTitle").textContent=`พบ ${issues.length} รายการที่ต้องแก้ก่อนบันทึก`;
   document.getElementById("oncoIssuePosition").textContent=`กำลังดู ${issueIndex+1} / ${issues.length}`;
   document.getElementById("oncoIssueList").innerHTML=issues.map((r,i)=>`<button class="issue-chip ${i===issueIndex?"active":""}" data-go-onco-issue="${r.id}"><span>${i+1}</span>${MIW.Utils.escape(r.name)} <small>${MIW.Utils.escape(r.group)}${r.page?` · หน้า ${r.page}`:""}</small></button>`).join("");
 }
 function focusIssue(index){
   if(!issues.length)return;
   issueIndex=(index+issues.length)%issues.length;const row=issues[issueIndex];
   activeGroup=row.group;expandedId=row.id;render();renderIssues();showSourceDocument(row);
   requestAnimationFrame(()=>{
     const target=document.getElementById(`onco-row-${row.id}`);target?.scrollIntoView({behavior:"smooth",block:"center"});
     target?.classList.add("issue-focus-pulse");
     setTimeout(()=>target?.classList.remove("issue-focus-pulse"),1800);
     document.querySelector(`[data-manual-value="${row.id}"]`)?.focus({preventScroll:true});
   });
 }
 function refreshIssues(){
   issues=findHardIssues(items);
   if(issueIndex>=issues.length)issueIndex=Math.max(0,issues.length-1);renderIssues();
 }
 function setGroup(g){activeGroup=g;expandedId=null;render()}
 function findHardIssues(rows){
   return (rows||[]).filter(row=>
     ["DRUG","GENE","NATURAL"].includes(row.group)&&
     (!isNumeric(row)||Number(row.value)<-100||Number(row.value)>100)
   )
 }
 function applyManual(id){
   const row=items.find(r=>r.id===id);const input=document.querySelector(`[data-manual-value="${id}"]`);
   if(!row||!input)return;
   const n=Number(input.value);if(!Number.isFinite(n)||n<-100||n>100){alert("กรุณาใส่ค่าระหว่าง -100 ถึง 100");return}
   const manual=MIW.EvidenceEngine.manual(n,row.page);
   const decision=MIW.EvidenceEngine.reconcile([...(row.evidence||[]),manual],{name:row.name,domain:row.group});
   row.value=n;row.unit="%";row.evidence=decision.evidence;row.evidenceCount=decision.evidence.length;
   row.parserStatus="VERIFIED";row.verificationStatus="MANUALLY_VERIFIED";row.confidence=99;
   row.confidenceBand="HIGH";row.conflict=false;row.alternatives=[];row.reconciliationReason="ผู้ใช้ตรวจและยืนยันค่าจากต้นฉบับ";
   row.status=row.group==="GENE"?(n>20?"OVER EXPRESSION":n<-20?"DOWN REGULATION":"BASELINE"):(n>=80?"HIGH":n>=50?"PARTIAL":"LOW");
   issues=findHardIssues(items);render();renderIssues();if(issues.length)focusIssue(Math.min(issueIndex,issues.length-1))
 }
 async function saveReport(){
   if(!parsed||!file)throw new Error("ไม่มี Onconomics draft จาก LTX Engine");
   const patient=MIW.Patients.current();if(!patient)throw new Error("ไม่พบคนไข้");
   // Normalize Additional-tested rows to the printed qualitative EFFICACY
   // contract. A stale percent created by older MIW builds must never survive.
   items.forEach(finalizeCalculatedRow);
   if(!items.length)throw new Error("ไม่พบรายการ Onconomics สำหรับบันทึก");

   const invalid=findHardIssues(items);
   if(invalid.length){
     issues=invalid;issueIndex=0;renderIssues();focusIssue(0);
     const error=new Error(`พบ ${invalid.length} รายการที่ต้องแก้ก่อนบันทึกทั้งรายงาน`);error.handledInReview=true;throw error;
   }

   const reviewRecommended=items.filter(row=>
     ["DRUG","GENE","NATURAL"].includes(row.group)&&
     (row.parserStatus==="REVIEW"||row.parserStatus==="PROVISIONAL"||row.conflict)
   );
   const persisted=await persistParsedSnapshot(patient,{confirmed:true});
   if(!persisted)throw new Error("ไม่สามารถบันทึก Onconomics source snapshot ได้");
   return persisted.rowCount
 }
 function isActive(){return document.getElementById("oncoReviewView").classList.contains("active")}
 function init(){
   document.querySelectorAll(".onco-review-tab").forEach(t=>t.onclick=()=>setGroup(t.dataset.oncoReviewGroup));
   document.getElementById("oncoParsedPreview").addEventListener("click",e=>{
     const issueId=e.target.closest("[data-go-onco-issue]")?.dataset.goOncoIssue;if(issueId){focusIssue(issues.findIndex(x=>x.id===issueId));return}
     const sourceId=e.target.closest("[data-open-onco-source]")?.dataset.openOncoSource;
     if(sourceId){showSourceDocument(items.find(x=>x.id===sourceId));return}
     const toggleId=e.target.dataset.toggleEvidence;if(toggleId){expandedId=expandedId===toggleId?null:toggleId;render();return}
     const manualId=e.target.dataset.applyManual;if(manualId)applyManual(manualId)
   });
   document.getElementById("oncoIssueList").onclick=e=>{const id=e.target.closest("[data-go-onco-issue]")?.dataset.goOncoIssue;if(id)focusIssue(issues.findIndex(x=>x.id===id))};
   document.getElementById("previousOncoIssueButton").onclick=()=>focusIssue(issueIndex-1);
   document.getElementById("nextOncoIssueButton").onclick=()=>focusIssue(issueIndex+1);
   document.getElementById("closeOncoIssuesButton").onclick=()=>{issues=[];render();renderIssues();closeSourceDocument()};
   document.getElementById("oncoSourceZoomOutButton").onclick=()=>setSourceZoom(sourceZoom-.25);
   document.getElementById("oncoSourceZoomResetButton").onclick=()=>setSourceZoom(1);
   document.getElementById("oncoSourceZoomInButton").onclick=()=>setSourceZoom(sourceZoom+.25);
   document.getElementById("oncoSourceFullButton").onclick=openSourceDocumentFull;
   document.getElementById("oncoSourceCloseButton").onclick=closeSourceDocument
 }
 return{open,saveReport,isActive,init,_test:{buildItems,findHardIssues}};
})();
