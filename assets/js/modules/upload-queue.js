window.MIW=window.MIW||{};
MIW.UploadQueue=(function(){
 let queue=[];
 function isSpecializedName(file){
   return/(?:ONCONOMICS(?:\s+PLUS)?|ONCOTRACE|ONCOTRAIL|METASTAT|ONCOCOUNT)/i.test(String(file?.name||""))
 }
 function partitionFiles(files){
   const selected=[...files],groups=[],photoPages=[];
   // v10.149 fast-upload mode: every PDF remains independent; readable PDF text layers bypass OCR.
   // Combining unrelated PDFs into one draft allowed one report profile or
   // parser route to suppress rows belonging to another report. Photos remain
   // grouped because users commonly select several photographed pages from the
   // same laboratory report.
   selected.forEach(file=>{
     if(MIW.PhotoCapture?.isPhoto?.(file))photoPages.push(file);
     else groups.push([file])
   });
   if(photoPages.length)groups.push(photoPages);
   return groups
 }
 function makeQueueItem(files,batch={}){
   const invalid=files.filter(file=>!(file.type==="application/pdf"||/\.pdf$/i.test(file.name)||MIW.PhotoCapture?.isPhoto(file)));
   return{
     id:MIW.Utils.uid("batch"),
     files,
     file:files[0],
     status:invalid.length?"ERROR":"WAITING",
     reviewStatus:invalid.length?"BLOCKED":"PENDING",
     error:invalid.length?`Unsupported: ${invalid.map(f=>f.name).join(", ")}`:"",
     progress:0,
     documentId:null,
     batchId:batch.id||"",
     batchIndex:Number(batch.index||0),
     batchTotal:Number(batch.total||1)
   }
 }
 function reviewDisplayState(item){
   if(item.status==="ERROR")return"อ่านไม่สำเร็จ";
   if(item.status==="WAITING")return"รออ่าน";
   if(item.status==="RUNNING")return"กำลังอ่าน";
   if(item.reviewStatus==="SAVED")return"บันทึกแล้ว";
   if(item.reviewStatus==="REVIEWING")return"กำลังตรวจ";
   if(item.status==="DONE"&&item.documentId)return"พร้อมตรวจ";
   return String(item.status||"รอดำเนินการ")
 }
 function findNextReady(items=queue){
   return items.find(item=>
     item.status==="DONE"&&
     item.documentId&&
     !["REVIEWING","SAVED"].includes(item.reviewStatus)
   )||null
 }
 function markReviewing(documentId){
   if(!documentId)return null;
   const item=queue.find(entry=>entry.documentId===documentId);
   if(!item||item.status!=="DONE"||item.reviewStatus==="SAVED")return item||null;
   queue.forEach(item=>{
     if(item.documentId!==documentId&&item.reviewStatus==="REVIEWING"){
       item.reviewStatus="READY"
     }
   });
   item.reviewStatus="REVIEWING";
   render();
   return item
 }
 function markSaved(documentId){
   const item=queue.find(entry=>entry.documentId===documentId);
   if(item){
     item.reviewStatus="SAVED";
     render();
     MIW.Utils.log(`Queue saved: ${item.files.length===1?item.file.name:`Combined upload (${item.files.length} files)`}`)
   }
   return item||null
 }
 function markDocumentsSaved(documentIds=[]){
   const ids=new Set((documentIds||[]).filter(Boolean));let changed=0;
   queue.forEach(item=>{if(item.documentId&&ids.has(item.documentId)&&item.reviewStatus!=="SAVED"){item.reviewStatus="SAVED";changed++}});
   if(changed)render();return changed
 }
 function hasActiveReview(){
   return queue.some(item=>item.reviewStatus==="REVIEWING")
 }
 function peekNextReady(){
   const item=findNextReady();
   return item?{
     id:item.id,
     documentId:item.documentId,
     fileName:item.files.length===1?item.file.name:`Combined upload (${item.files.length} files)`,
     type:isSpecializedName(item.file)?"SPECIALIZED":"GENERAL"
   }:null
 }
 async function openNextReady(){
   const item=findNextReady();
   if(!item)return null;
   // Reserve the item before the asynchronous database read. A specialized
   // report finishing in the background must not open over the current review.
   markReviewing(item.documentId);
   const record=await MIW.Database.get("documents",item.documentId);
   if(!record){
     item.reviewStatus="READY";
     render();
     throw new Error("ไม่พบเอกสารที่พร้อมตรวจในฐานข้อมูล")
   }
   await MIW.Preview.open(record);
   MIW.Utils.log(`Queue review opened: ${record.fileName} · ${record.type}`);
   return record
 }
 function addFiles(files){
   const selected=[...files];
   if(!selected.length)return;
   const groups=partitionFiles(selected),batchId=MIW.Utils.uid("uploadBatch");
   groups.forEach((group,index)=>queue.push(makeQueueItem(group,{id:batchId,index:index+1,total:groups.length})));
   const pdfDocuments=groups.filter(group=>group.length===1&&!MIW.PhotoCapture?.isPhoto?.(group[0])).length;
   const photoPages=groups.filter(group=>group.some(file=>MIW.PhotoCapture?.isPhoto?.(file))).reduce((sum,group)=>sum+group.length,0);
   if(groups.length>1||selected.length>1)MIW.Utils.log(`Batch-safe upload: PDF ${pdfDocuments} ฉบับแยกอิสระ${photoPages?` · รูปภาพ ${photoPages} หน้าเป็น 1 ชุด` : ""} · ไม่มีไฟล์ใดถูกซ่อนหลัง Combined upload`);
   render();setTimeout(()=>processAll(),0)
 }
 function render(){
   const list=document.getElementById("queueList");
   list.innerHTML=queue.length?queue.map(item=>`
    <div class="queue-item ${item.status.toLowerCase()} ${String(item.reviewStatus||"").toLowerCase()}">
      <div>
        <div class="queue-name">${item.batchTotal>1?`<small>ชุดเดียวกัน ${item.batchIndex}/${item.batchTotal}</small>`:""}${item.files.length===1?MIW.Utils.escape(item.file.name):`ชุดภาพ ${item.files.length} หน้า`}</div>
        <div class="queue-files">${item.files.map(f=>`<span>${MIW.Utils.escape(f.name)}</span>`).join("")}</div>
        <div class="queue-meta">${MIW.Utils.formatBytes(item.files.reduce((sum,f)=>sum+f.size,0))} · ${MIW.Utils.escape(reviewDisplayState(item))}${item.error?` · ${MIW.Utils.escape(item.error)}`:""}</div>
      </div>
      <div class="queue-actions">
        ${item.status==="WAITING"?`<button class="small" data-process-id="${item.id}">Process</button>`:""}
        ${item.documentId&&item.reviewStatus!=="SAVED"?`<button class="secondary small" data-open-document="${item.documentId}">${item.reviewStatus==="REVIEWING"?"กลับไปหน้าตรวจ":"เปิดตรวจ / Review"}</button>`:""}
        <button class="danger small" data-remove-id="${item.id}">ลบ</button>
      </div>
    </div>`).join(""):'<div class="muted">ยังไม่มีไฟล์ใน Queue</div>'
 }
 async function processAll(){
   // Keep OCR tasks sequential because Tesseract workers are stateful. The
   // speed gain in this build comes from avoiding unnecessary OCR passes and
   // low-resolution rendering of born-digital pages, not unsafe worker races.
   for(const item of queue.filter(x=>x.status==="WAITING"))await process(item.id)
 }
 function uploadFingerprint(files){
   return `10.270-diagnostic-module-architecture|${(files||[]).map(file=>[file.name,file.size,file.lastModified||0].join(":" )).join("|")}`
 }
 async function process(id){
   const item=queue.find(x=>x.id===id);if(!item||item.status!=="WAITING")return;
   const processStarted=Date.now();
   item.status="RUNNING";render();
   try{
     const fingerprint=uploadFingerprint(item.files);
     const existing=(await MIW.Database.all("documents")).find(record=>record.uploadFingerprint===fingerprint);
     if(existing){
       item.status="DONE";item.reviewStatus="READY";item.documentId=existing.id;render();
       MIW.Utils.log(`Fast cache: ใช้ผลอ่านเดิมของ ${existing.fileName}`);
       await refreshMetrics();
       return
     }
     const documentId=MIW.Utils.uid("document");
     let pages=[],texts=[],pageOffset=0;
     for(let fileIndex=0;fileIndex<item.files.length;fileIndex++){
       const file=item.files[fileIndex];
       if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){
         const result=await readPdf(file,documentId,{fileIndex,pageOffset});
         pages.push(...result.pages);texts.push(result.text);pageOffset=pages.length
       }else{
         const profileHint=reportProfileHint(file,"");
         const captured=await MIW.PhotoCapture.process(file,documentId,{
           fileIndex,pageNumber:++pageOffset,profileHint,fastMode:true,
           languages:["eng","tha"]
         });
         pages.push(captured.page);
         texts.push(captured.text)
       }
     }
     if(item.files.length>1){
       const specializedIndexes=texts.map((value,index)=>{
         const file=item.files[index];
         const detected=MIW.Classifier.classify(value,file.name);
         const record={type:detected.type,fileName:file.name,sourceFiles:[{name:file.name}],text:value};
         return /^(?:RGCC_OTHER|RGCC_ONCOTRAIL|RGCC_METASTAT)$/.test(detected.type)||MIW.Classifier.hasOnconomicsEvidence(record)?index:-1
       }).filter(index=>index>=0);
       if(specializedIndexes.length){
         const specializedSet=new Set(specializedIndexes);
         const general=item.files.filter((file,index)=>!specializedSet.has(index));
         const replacements=[
           ...(general.length?[makeQueueItem(general)]:[]),
           ...specializedIndexes.map(index=>makeQueueItem([item.files[index]]))
         ];
         queue=queue.filter(entry=>entry.id!==item.id);
         queue.push(...replacements);
         MIW.Utils.log(`แยกจากเนื้อหาอัตโนมัติ: ${specializedIndexes.length} RGCC report · ${general.length} General file`);
         render();
         setTimeout(()=>processAll(),0);
         return
       }
     }
     const packet=MIW.MixedClinicalPacket?.apply?.(pages,item.file.name)||null;
     const text=texts.map((value,i)=>`--- FILE: ${item.files[i].name} ---\n${value}`).join("\n\n");
     const baseClassification=MIW.Classifier.classify(text,item.file.name);
     const detectedInBody=pages.some(page=>String(page?.ocr?.detectedProfile||page?.profileHint||"").toUpperCase()==="INBODY_720");
     const sourceClassification=detectedInBody
       ?{type:"BODY_COMPOSITION",confidence:Math.max(88,Number(baseClassification.confidence||0)),hits:[...(baseClassification.hits||[]),"INBODY_720 OCR PROFILE"]}
       :baseClassification;
     const classification=packet?.isMixed&&packet.labPageCount>0
       ?{type:"MIXED_CLINICAL_PACKET",confidence:Math.max(88,Math.min(99,Math.round(90+packet.labPageCount/Math.max(1,packet.totalPages)*9))),hits:["PAGE-LEVEL PACKET CLASSIFICATION",...MIW.MixedClinicalPacket.summaryItems(packet).map(item=>`${item.type}:${item.count}`)]}
       :sourceClassification;
     const entities=MIW.Classifier.extractEntities(text,pages);
     let patient=null;
     const safeEntityName=MIW.Patients?.sanitizePatientName?.(entities.name)||entities.name;
     const validatedEntityName=safeEntityName&&!MIW.Classifier.isInvalidPatientName(safeEntityName)?safeEntityName:"";
     if(validatedEntityName){
       patient=await MIW.Patients.ensure({
         name:validatedEntityName,hn:entities.hn,dob:entities.dob,
         civilId:entities.civilId,civilIds:entities.civilIds,hospitalIds:entities.hospitalIds
       })
     }
     const photoPages=pages.filter(p=>p.captureType==="PHOTO");
     const photoIssues=photoPages.flatMap(p=>(p.ocr?.conflicts||[]).map(value=>({page:p.pageNumber,value})));
     const lowPhotoConfidence=photoPages.some(p=>Number(p.ocr?.confidence||0)<78);
     const enhancementNeedsVerify=photoPages.some(p=>Boolean(p.ocr?.qualityGate?.needsVerify));
     const duplicateKeys=new Map(),duplicatePages=[];
     photoPages.forEach(p=>{
       const key=String(p.text||"").toLowerCase().replace(/\s+/g," ").replace(/\d{1,2}[:/.-]\d{1,2}[:/.-]\d{2,4}/g,"").slice(0,800);
       if(key.length>120&&duplicateKeys.has(key))duplicatePages.push({page:p.pageNumber,duplicateOf:duplicateKeys.get(key)});
       else if(key.length>120)duplicateKeys.set(key,p.pageNumber)
     });
     const needsReview=!validatedEntityName||classification.confidence<65||lowPhotoConfidence||enhancementNeedsVerify||photoIssues.length||duplicatePages.length||Boolean(packet?.isMixed);
     const documentRecord={
       id:documentId,
       fileName:item.files.length===1?item.file.name:`Combined upload (${item.files.length} files)`,
       sourceFiles:item.files.map((f,i)=>({index:i,name:f.name,type:f.type,size:f.size,lastModified:f.lastModified||0})),
       uploadFingerprint:fingerprint,
       // v10.229 — persist the upload-batch relationship. PDFs still remain
       // independent documents, but LabEngine can safely reconstruct a
       // cross-document longitudinal set after patient identity validation.
       uploadBatchId:item.batchId||"",uploadBatchIndex:Number(item.batchIndex||1),uploadBatchTotal:Number(item.batchTotal||1),
       batchMode:item.files.length>1,
       fileType:item.files.length===1?item.file.type:"application/x-miw-batch",
       fileSize:item.files.reduce((sum,f)=>sum+f.size,0),
       pageCount:pages.length,text,type:classification.type,confidence:classification.confidence,
       classificationHits:classification.hits,
       packet:packet?{
         isMixed:packet.isMixed,totalPages:packet.totalPages,
         labPageCount:packet.labPageCount,labPageNumbers:packet.labPageNumbers,
         onconomicsPageNumbers:packet.onconomicsPageNumbers||[],
         counts:packet.counts,pageNumbers:packet.pageNumbers,segments:packet.segments,
         meaningfulTypes:packet.meaningfulTypes||[],specializedTypes:packet.specializedTypes||[]
       }:null,
       labText:packet?.isMixed?pages.filter(page=>page.packetIncludeInLab).map(page=>page.text||"").join("\n\n--- LAB PAGE ---\n\n"):"",
       patientId:patient?.id||"",patientName:patient?.name||validatedEntityName,
       patientHN:patient?.hn||entities.hn,patientDOB:patient?.dob||entities.dob,
       patientCivilID:patient?.civilId||entities.civilId||"",
       patientHospitalIDs:patient?.hospitalIds||entities.hospitalIds||[],
       documentDate:entities.date,source:entities.hospital,status:needsReview?"REVIEW_REQUIRED":"CLASSIFIED",
       captureMode:packet?.isMixed?"MIXED_CLINICAL_PACKET":photoPages.length?"PHOTO_LAB":"PDF",ocrState:photoPages.length?"IMPORTED":"NOT_APPLICABLE",
       photoCapture:{pageCount:photoPages.length,lowConfidence:lowPhotoConfidence,enhancementNeedsVerify,ocrConflicts:photoIssues,duplicatePages,nonGenerativeEnhancement:true},
       createdAt:new Date().toISOString()
     };
     await MIW.Database.put("documents",documentRecord);
     for(const page of pages)await MIW.Database.put("pages",page);
     await MIW.Database.put("documentText",{id:MIW.Utils.uid("text"),documentId,text,createdAt:new Date().toISOString()});
     if(needsReview){
       const reason=!validatedEntityName?"PATIENT_NOT_FOUND":duplicatePages.length?"DUPLICATE_PHOTO":photoIssues.length?"OCR_CONFLICT":enhancementNeedsVerify?"IMAGE_ENHANCEMENT_VERIFY":lowPhotoConfidence?"LOW_OCR_CONFIDENCE":"LOW_CONFIDENCE";
       await MIW.Database.put("reviewQueue",{id:MIW.Utils.uid("review"),documentId,reason,status:"OPEN",details:{photoIssues,duplicatePages},createdAt:new Date().toISOString()})
     }
     item.status="DONE";item.reviewStatus="READY";item.documentId=documentId;render();
     const elapsedSec=((Date.now()-processStarted)/1000).toFixed(1);
     MIW.Utils.log(`Processed queue item ${item.batchIndex||1}/${item.batchTotal||1}: ${item.files.length} file(s) · ${classification.type} ${classification.confidence}% · ${elapsedSec}s${packet?.isMixed?` · ${MIW.MixedClinicalPacket.summaryText(packet)}`:""}`);
     await refreshMetrics();
     MIW.Events.emit("document:processed",documentRecord)
   }catch(error){
     item.status="ERROR";item.error=error.message;render();MIW.Utils.log(`Process failed: ${error.message}`)
   }
 }
 function reportProfileHint(file,text=""){
   const source=`${String(file?.name||"")} ${String(text||"")}`;
   if(/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area|ECW\s*\/\s*TBW|\bInBody\b/i.test(source))return"INBODY_720";
   if(/Masuyama|Comprehensive\s+Immunological|NK\s+Activity\s*&\s*Immunological\s+Test\s+by\s+Osaki/i.test(source))return"MASUYAMA_IMMUNOLOGICAL";
   if(/ONCOTRAIL/i.test(source))return"RGCC_ONCOTRAIL";
   if(/METASTAT/i.test(source))return"RGCC_METASTAT";
   if(/Food\s*intolerance|FoodPrint|200\+/i.test(source))return"FOOD_INTOLERANCE_IGG_200_PLUS";
   if(/Micronutrient/i.test(source))return"MICRONUTRIENT_PROFILE_I";
   if(/Folate\s*(?:serum|\(\s*serum\s*\))|Folic\s+Acid/i.test(source))return"FOLATE_SERUM";
   if(/Arsenic\s+in\s+Urine|Asenic\s+in\s+Urine/i.test(source))return"ARSENIC_URINE";
   if(/Allergy\s+(?:Food|Inhalation)\s+Profile|Allergy\s+Report/i.test(source))return"ALLERGY_PROFILE";
   if(/(?:ผล\s*)?ANF|ANF\s*\[?ANA\]?|ANApatterns?/i.test(source))return"AUTOIMMUNE_ANA";
   if(/Anti\s*ds\s*DNA|Anti\s*Sm|anti\s*nRNP|anti\s*ssa|anti\s*ssb/i.test(source))return"AUTOIMMUNE_ANTIBODY_PANEL";
   if(/Beta\s*1\s*C|C3\s*C4\s*complement|C3\s*Complement|C4\s*complement/i.test(source))return"COMPLEMENT_PANEL";
   if(/Hemoglobin\s+Typing|Hb\s*typing|alpha[-\s]*thalassemia/i.test(source))return"HEMOGLOBIN_TYPING";
   if(/Alumin(?:ium|um)[\s\S]{0,140}(?:Arsenic|Cadmium|Lead|Mercury)|(?:Arsenic|Cadmium|Lead|Mercury)[\s\S]{0,140}Alumin(?:ium|um)/i.test(source))return"HEAVY_METALS_BLOOD";
   const medicaPanelSignatures=[/\bInsulin\b/i,/\bCortisol\b/i,/\bProgesterone\b/i,/\bTestosterone\b/i,/\bHomocysteine\b/i,/DHEA[-\s]*sul(?:ph|f)ate|\bDHEA\b/i]
     .filter(pattern=>pattern.test(source)).length;
   if(medicaPanelSignatures>=2)return"MEDICA_HORMONE_METABOLIC_PANEL";
   return""
 }
 function strongTextLayer(profileHint,text,textItems){
   const raw=String(text||""),compact=raw.replace(/\s+/g," ").trim();
   const letters=(raw.match(/[A-Za-zก-๙]/g)||[]).length;
   const numericTokens=(raw.match(/[<>≤≥]?\d+(?:[.,]\d+)?/g)||[]).length;
   if(textItems.length<8||compact.length<120||letters<45||numericTokens<3)return false;
   if(profileHint==="INBODY_720")return /InBody|Body\s+Composition|Visceral\s+Fat/i.test(raw)&&numericTokens>=12;
   if(profileHint==="MASUYAMA_IMMUNOLOGICAL"){
     const signatures=[/Comprehensive\s+Immunity\s+Level/i,/Neutrophil\s*\/\s*Lymphocyte|\bNLR\b/i,/Number\s+of\s+Lymphocyte/i,/CD4\s*\/\s*CD8/i,/Number\s+of\s+NK\s+Cells/i,/NK\s+Vue/i,/NKG2D\+?\s*Cells/i];
     return signatures.filter(pattern=>pattern.test(raw)).length>=5&&numericTokens>=7
   }
   if(profileHint==="FOLATE_SERUM")return /Folate/i.test(raw)&&/Reference/i.test(raw)&&numericTokens>=2;
   if(profileHint==="HEMOGLOBIN_TYPING")return /Hb\s*A2|Hemoglobin\s+Typing/i.test(raw)&&numericTokens>=6;
   if(profileHint==="HEAVY_METALS_BLOOD")return ["Aluminium","Arsenic","Cadmium","Lead","Mercury"].filter(name=>new RegExp(name,"i").test(raw)).length>=4&&numericTokens>=5;
   if(profileHint==="MEDICA_HORMONE_METABOLIC_PANEL")return ["Insulin","Cortisol","Progesterone","Testosterone","Homocysteine","DHEA"].filter(name=>new RegExp(name,"i").test(raw)).length>=4&&numericTokens>=8;
   // FoodPrint and micronutrient reports often have a readable text layer even
   // when column order is visually complex.  Keep OCR only when the layer is
   // genuinely sparse; dedicated adapters still use x/y text items.
   if(profileHint==="FOOD_INTOLERANCE_IGG_200_PLUS"){
     const labelTokens=(raw.match(/[ก-๙]{2,}|Egg\s+white|Egg\s+yolk|Buckwheat|Barley|Almond|Cranberry|Soybean|Wheat|Rice/gi)||[]).length;
     // FoodPrint result values can be present in a hidden text layer while the
     // food names are rendered as glyphs/images. Do not call that layer
     // "strong" unless it also contains a substantial number of real labels.
     return /FoodPrint|Food\s*intolerance|Food[- ]specific\s*IgG/i.test(raw)&&
       textItems.length>120&&numericTokens>60&&labelTokens>40
   }
   if(profileHint==="MICRONUTRIENT_PROFILE_I")return /Micronutrient/i.test(raw)&&textItems.length>45&&numericTokens>12;
   return compact.length>260&&textItems.length>18
 }
 function needsVisualProfileOcr(file,text,textItems){
   const profileHint=reportProfileHint(file,text);
   if(strongTextLayer(profileHint,text,textItems))return false;
   const letters=(String(text||"").match(/[A-Za-zก-๙]/g)||[]).length;
   const numbers=(String(text||"").match(/\d/g)||[]).length;
   if(["INBODY_720","FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I","FOLATE_SERUM","ARSENIC_URINE","ALLERGY_PROFILE","AUTOIMMUNE_ANA","AUTOIMMUNE_ANTIBODY_PANEL","COMPLEMENT_PANEL","MEDICA_HORMONE_METABOLIC_PANEL","MASUYAMA_IMMUNOLOGICAL"].includes(profileHint))return true;
   return textItems.length<3||text.replace(/\s+/g,"").length<20||
     (numbers>40&&letters<20)
 }
 function shouldOcrPdfPage(profileHint,pageNumber,pageCount){
   // Medica single-analyte reports repeat the same result on page 2 as a
   // coloured explanatory sheet. Page 1 is the source table and is sufficient
   // for structured extraction; page 2 remains available as a lightweight
   // preview without another expensive OCR pass.
   if(["FOLATE_SERUM","ARSENIC_URINE"].includes(profileHint)&&pageNumber>1)return false;
   return true
 }
 function bornDigitalPreviewScale(pageNumber,pageCount,profileHint){
   if(pageNumber===1)return pageCount>=10?.52:.62;
   if(pageCount>=40)return .24;
   if(pageCount>=15)return .32;
   if(["RGCC_ONCOTRAIL","RGCC_METASTAT"].includes(profileHint))return .46;
   return .50
 }
 function bnhHeaderEvidence(text=""){
   return /BNH\s+Hospital|9\s*\/\s*1\s+Convent\s+Road|Hospital\s+Number\s*:/i.test(String(text||""))
 }
 function bnhSensitiveEvidence(text=""){
   const raw=String(text||"");
   // Pages that historically needed exact-row recovery are selectively
   // re-rendered at full resolution. Sparse microbiology/culture/blood-bank
   // pages stay on the fast probe path.
   return /FDP\s*\(|Fibrin\s+Degradation|D-?Dimer|Reticulocyte|Platelet\s+Count|\bMPV\b|\bMCV\b|\bMCHC\b|\bRDW\b|\bAlbumin\b|Bilirubin|\bChloride\b|(?:^|\n)\s*pH\s*[:=]?|aPTT|Activated\s+Partial|Prothrombin|\bINR\b|Coombs|Glucose\s*\(Fasting\)|Urine\s+Examination/i.test(raw)
 }
 function bnhProbeNeedsRefine(captured){
   const text=String(captured?.text||"");
   const confidence=Number(captured?.confidence??captured?.page?.ocr?.confidence??0);
   const numeric=(text.match(/[<>≤≥]?\d+(?:[.,]\d+)?/g)||[]).length;
   const denseStructure=/Complete\s+Blood\s+Count|Reticulocyte\s+Count|D-?Dimer|Electrolytes|Liver\s+Function|Urine\s+Examination|POCT\s+Glucose|Prostatic\s+Specific\s+Antigen|Creatinine|Albumin/i.test(text);
   // v10.240 Fast OCR Gate v3: confidence by itself is not a reason to run a
   // second full-resolution OCR pass. Refine only source-truth-sensitive rows,
   // or a genuinely dense laboratory page whose probe is very weak.
   return bnhSensitiveEvidence(text)||(denseStructure&&confidence<52&&numeric>=5)||(numeric>=22&&/Complete\s+Blood\s+Count|Electrolytes|Liver\s+Function|Chemistry/i.test(text))
 }
 function longScanProbeScale(pageCount){
   // v10.240: probe only needs enough detail for page/analyte detection.
   // Sensitive values are re-read through the source-truth path.
   if(pageCount>=40)return .90;
   if(pageCount>=20)return 1.00;
   return 1.12
 }
 async function readPdf(file,documentId,{fileIndex=0,pageOffset=0}={}){
   const pdfReadStarted=Date.now();
   if(!window.pdfjsLib)throw new Error("PDF.js not loaded");
   pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
   // HP Scan and similar devices can leave a recoverable XRef/stream-length
   // mismatch. PDF.js should scan the file leniently instead of rejecting a
   // visually readable report before OCR starts.
   const pdf=await pdfjsLib.getDocument({
     data:await file.arrayBuffer(),
     stopAtErrors:false
   }).promise,pages=[],texts=[];
   let scannedPageCount=0,packetProbeMode=false,foodPrintOcrContinuation=0,bnhFastMode=false,bnhProbePages=0,bnhRefinedPages=0;
   const packetProbeEligible=pdf.numPages>=12;
   for(let n=1;n<=pdf.numPages;n++){
     const statusEl=document.getElementById("systemStatus");
     if(statusEl)statusEl.textContent=`กำลังอ่าน ${file.name} · หน้า ${n}/${pdf.numPages}${bnhFastMode?" · Fast OCR":""}`;
     const page=await pdf.getPage(n),pdfViewport=page.getViewport({scale:1});
     const content=await page.getTextContent();
     const textItems=content.items
       .filter(i=>String(i.str||"").trim())
       .map(i=>({str:String(i.str).trim(),x:Number(i.transform?.[4]||0),y:Number(i.transform?.[5]||0),w:Number(i.width||0)}));
     const text=textItems.map(i=>i.str).join("\n");
     const textOnlyHint=reportProfileHint({name:""},text);
     const isFoodPrintContinuation=foodPrintOcrContinuation>0&&!textOnlyHint;
     const foodPrintPageOrdinal=textOnlyHint==="FOOD_INTOLERANCE_IGG_200_PLUS"?1:isFoodPrintContinuation?2:0;
     let profileHint=reportProfileHint(file,text);
     if(bnhFastMode&&!profileHint)profileHint="BNH_SCANNED_LAB";
     if(isFoodPrintContinuation)profileHint="FOOD_INTOLERANCE_IGG_200_PLUS";
     if(foodPrintOcrContinuation>0)foodPrintOcrContinuation-=1;
     // Only a page that explicitly identifies itself as FoodPrint can request
     // one OCR continuation page. The carried hint itself never extends the
     // chain into following Micronutrient pages.
     if(textOnlyHint==="FOOD_INTOLERANCE_IGG_200_PLUS")foodPrintOcrContinuation=1;
     const visualOcr=needsVisualProfileOcr({name:profileHint==="FOOD_INTOLERANCE_IGG_200_PLUS"?"FoodPrint.pdf":file.name},text,textItems);
     const runOcr=visualOcr&&shouldOcrPdfPage(profileHint,n,pdf.numPages);
     // Born-digital reports already contain exact text and x/y coordinates.
     // Their page images are only previews, so long PDFs use lightweight
     // rendering. Scans keep 2.20x only on pages that genuinely require OCR.
     const previewScale=bornDigitalPreviewScale(n,pdf.numPages,profileHint);
     // A mixed scanned packet can contain dozens of non-laboratory pages.
     // After the first page identifies an Echo/Radiology/clinical packet, use
     // lightweight OCR to classify the remaining pages, then re-OCR only the
     // Laboratory pages at full resolution below.
     // v10.240: the first page of an unknown long scanned PDF is also a cheap
     // single-pass probe. This lets a BNH packet enter fast mode before the
     // expensive full-page/focused OCR that v10.235 performed on page 1.
     const firstLongScanProbe=Boolean(runOcr&&!bnhFastMode&&n===1&&pdf.numPages>=12&&!profileHint);
     const bnhProbe=Boolean(runOcr&&pdf.numPages>=12&&(bnhFastMode||firstLongScanProbe));
     // v10.249: a one-page scanned form can contain a very high-resolution
     // embedded image even though the PDF page itself is only ~A4 points. The
     // old fixed 2.20x render discarded most source pixels before OCR. Render
     // single-page scans at 4x, then let the non-generative pipeline decide
     // whether any additional upscale is useful.
     const highDetailSingleScan=Boolean(runOcr&&pdf.numPages===1&&textItems.length<8);
     const ocrScale=runOcr?(bnhProbe?longScanProbeScale(pdf.numPages):(packetProbeMode?1.10:(profileHint==="INBODY_720"?4.20:highDetailSingleScan?4.00:2.20))):previewScale;
     const viewport=page.getViewport({scale:ocrScale});
     const canvas=document.createElement("canvas");
     canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
     await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
     if(runOcr){
       scannedPageCount+=1;
       const blob=await new Promise((resolve,reject)=>canvas.toBlob(
         value=>value?resolve(value):reject(new Error(`${file.name} หน้า ${n}: แปลงภาพ PDF เพื่อ OCR ไม่สำเร็จ`)),
         "image/png"
       ));
       const pageFile=new File([blob],`${file.name}.page-${n}.png`,{type:"image/png"});
       const captured=await MIW.PhotoCapture.process(pageFile,documentId,{
         fileIndex,pageNumber:pageOffset+n,sourcePageNumber:n,sourceFileName:file.name,
         scannedPdf:true,fastMode:true,profileHint,highDetailScan:highDetailSingleScan||profileHint==="INBODY_720",
         bnhProbeOnly:bnhProbe,bnhFastUpload:bnhFastMode,
         languages:profileHint==="FOOD_INTOLERANCE_IGG_200_PLUS"||scannedPageCount<=2
           ?["eng","tha"]:["eng"]
       });
       Object.assign(captured.page,{
         profileHint:captured.page?.ocr?.detectedProfile||profileHint,foodPrintPageOrdinal,pdfText:text,pdfTextItems:textItems,
         pdfPageWidth:pdfViewport.width,pdfPageHeight:pdfViewport.height,
         packetProbeOcr:Boolean(packetProbeMode),packetOcrScale:ocrScale
       });
       // v10.240 — once the first scanned page establishes BNH, subsequent
       // pages use a low-cost probe OCR. Only pages with sensitive/dense
       // numeric evidence are re-rendered at 2.20x and receive focused row OCR.
       const detectedBnh=Boolean(bnhFastMode||bnhHeaderEvidence(captured.text));
       if(!bnhFastMode&&pdf.numPages>=12&&detectedBnh)bnhFastMode=true;
       let finalCaptured=captured;
       let firstProbeType="",firstProbeSpecializedHint="";
       // v10.240 — a long scanned PDF used to OCR page 1 only as a cheap
       // classification probe.  That was safe for BNH because sensitive BNH
       // rows are selectively refined, but unsafe when page 1 itself is a
       // specialized table (notably BCL Food/Inhalation Specific IgE).  The
       // classifier could still recognise "Allergy Food Profile" at low
       // resolution while the table parser lost every Class/Concentration
       // cell, causing SPECIALIZED_PROFILE_INCOMPLETE at Verify.
       //
       // Once the probe identifies a specialized report family, re-render the
       // same source page at 2.20x before storing it.  This preserves the fast
       // first-page probe for unknown long packets without sacrificing the
       // source table that the specialized parser/verifier must consume.
       if(firstLongScanProbe&&MIW.MixedClinicalPacket?.classifyPage){
         firstProbeType=String(MIW.MixedClinicalPacket.classifyPage(captured.page,file.name)?.type||"").toUpperCase();
         const firstProbeTextHint=reportProfileHint({name:""},captured.text);
         const specializedProbeMap={
           ALLERGY_PROFILE:"ALLERGY_PROFILE",
           FOOD_INTOLERANCE_IGG_200_PLUS:"FOOD_INTOLERANCE_IGG_200_PLUS",
           MICRONUTRIENT_PROFILE_I:"MICRONUTRIENT_PROFILE_I",
           MASUYAMA_IMMUNOLOGICAL:"MASUYAMA_IMMUNOLOGICAL",
           RGCC_ONCOTRAIL:"RGCC_ONCOTRAIL",
           RGCC_METASTAT:"RGCC_METASTAT",
           BODY_COMPOSITION:"INBODY_720",
           INBODY_720:"INBODY_720"
         };
         // Use both the page classifier and the literal report-family hint.
         // The latter is a safety net when the low-resolution probe reads the
         // heading correctly but the mixed-packet classifier is conservative.
         firstProbeSpecializedHint=specializedProbeMap[firstProbeType]||specializedProbeMap[firstProbeTextHint]||"";
         if(firstProbeSpecializedHint&&!detectedBnh){
           const hiViewport=page.getViewport({scale:2.20});
           const hiCanvas=document.createElement("canvas");
           hiCanvas.width=Math.max(1,Math.round(hiViewport.width));hiCanvas.height=Math.max(1,Math.round(hiViewport.height));
           await page.render({canvasContext:hiCanvas.getContext("2d"),viewport:hiViewport}).promise;
           const hiBlob=await new Promise((resolve,reject)=>hiCanvas.toBlob(
             value=>value?resolve(value):reject(new Error(`${file.name} หน้า ${n}: แปลงภาพ specialized profile แบบละเอียดไม่สำเร็จ`)),
             "image/png"
           ));
           const hiFile=new File([hiBlob],`${file.name}.page-${n}.specialized-refine.png`,{type:"image/png"});
           finalCaptured=await MIW.PhotoCapture.process(hiFile,documentId,{
             fileIndex,pageNumber:pageOffset+n,sourcePageNumber:n,sourceFileName:file.name,
             scannedPdf:true,fastMode:true,profileHint:firstProbeSpecializedHint,
             languages:["ALLERGY_PROFILE","FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I"].includes(firstProbeSpecializedHint)?["eng","tha"]:["eng"]
           });
           MIW.Utils.log?.(`Specialized first-page refine v10.240: ${firstProbeType} · หน้า ${n} · 2.20x`)
         }
       }
       if(bnhProbe&&detectedBnh){
         bnhProbePages+=1;
         if(bnhProbeNeedsRefine(captured)){
           const hiViewport=page.getViewport({scale:2.20});
           const hiCanvas=document.createElement("canvas");
           hiCanvas.width=Math.max(1,Math.round(hiViewport.width));hiCanvas.height=Math.max(1,Math.round(hiViewport.height));
           await page.render({canvasContext:hiCanvas.getContext("2d"),viewport:hiViewport}).promise;
           const hiBlob=await new Promise((resolve,reject)=>hiCanvas.toBlob(
             value=>value?resolve(value):reject(new Error(`${file.name} หน้า ${n}: แปลงภาพ PDF แบบละเอียดไม่สำเร็จ`)),"image/png"
           ));
           const hiFile=new File([hiBlob],`${file.name}.page-${n}.refine.png`,{type:"image/png"});
           finalCaptured=await MIW.PhotoCapture.process(hiFile,documentId,{
             fileIndex,pageNumber:pageOffset+n,sourcePageNumber:n,sourceFileName:file.name,
             scannedPdf:true,fastMode:true,profileHint:"BNH_SCANNED_LAB",bnhFastUpload:true,languages:n<=2?["eng","tha"]:["eng"]
           });
           bnhRefinedPages+=1;
         }
       }
       Object.assign(finalCaptured.page,{
         profileHint:finalCaptured.page?.ocr?.detectedProfile||firstProbeSpecializedHint|| (bnhFastMode?"BNH_SCANNED_LAB":profileHint),foodPrintPageOrdinal,pdfText:text,pdfTextItems:textItems,
         pdfPageWidth:pdfViewport.width,pdfPageHeight:pdfViewport.height,
         packetProbeOcr:Boolean(packetProbeMode),packetOcrScale:bnhProbe&&finalCaptured===captured?ocrScale:2.20,
         // Probe/refine describes how OCR was executed, not what hospital the
         // page belongs to.  Persist an explicit BNH detection bit so a long
         // non-BNH packet can never be routed into the BNH parser merely
         // because its first page used the fast probe path.
         bnhDetected:Boolean(detectedBnh),
         bnhFastProbe:Boolean(detectedBnh&&bnhProbe&&finalCaptured===captured),
         bnhSelectiveRefine:Boolean(detectedBnh&&bnhProbe&&finalCaptured!==captured),
         specializedFirstPageRefine:Boolean(firstProbeSpecializedHint&&finalCaptured!==captured)
       });
       pages.push(finalCaptured.page);
       texts.push(finalCaptured.text);
       if(n===1&&packetProbeEligible&&MIW.MixedClinicalPacket?.classifyPage){
         const firstType=firstProbeType||MIW.MixedClinicalPacket.classifyPage(finalCaptured.page,file.name).type;
         packetProbeMode=![
           "LABORATORY","ALLERGY_PROFILE","FOOD_INTOLERANCE_IGG_200_PLUS",
           "MICRONUTRIENT_PROFILE_I","MASUYAMA_IMMUNOLOGICAL",
           "RGCC_ONCOTRAIL","RGCC_METASTAT","PATHOLOGY"
         ].includes(firstType)
       }
       continue
     }
     texts.push(text);
     const longTextPdf=pdf.numPages>=10&&!visualOcr;
     pages.push({id:MIW.Utils.uid("page"),documentId,pageNumber:pageOffset+n,sourcePageNumber:n,sourceFileName:file.name,sourceFileIndex:fileIndex,dataUrl:canvas.toDataURL("image/jpeg",longTextPdf?.52:.68),width:canvas.width,height:canvas.height,text,textItems,profileHint,foodPrintPageOrdinal,pdfText:text,pdfTextItems:textItems,pdfPageWidth:pdfViewport.width,pdfPageHeight:pdfViewport.height,previewMode:runOcr?"OCR":"LIGHTWEIGHT_TEXT_PDF",ocrSkipped:Boolean(visualOcr&&!runOcr)})
   }
   if(packetProbeMode&&MIW.MixedClinicalPacket?.apply){
     let packet=MIW.MixedClinicalPacket.apply(pages,file.name);
     const strongLabEvidence=MIW.MixedClinicalPacket?._test?.strongLabEvidence;
     const labIndexes=packet.classified
       .filter(item=>item.page.packetProbeOcr&&(item.page.packetIncludeInLab||typeof strongLabEvidence==="function"&&strongLabEvidence(item.page)))
       .map(item=>item.index);
     for(const index of labIndexes){
       const existing=pages[index],sourcePageNumber=Number(existing.sourcePageNumber||index+1);
       const page=await pdf.getPage(sourcePageNumber),pdfViewport=page.getViewport({scale:1});
       const viewport=page.getViewport({scale:2.20});
       const canvas=document.createElement("canvas");
       canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
       await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
       const blob=await new Promise((resolve,reject)=>canvas.toBlob(
         value=>value?resolve(value):reject(new Error(`${file.name} หน้า ${sourcePageNumber}: แปลงภาพ PDF เพื่อ OCR ไม่สำเร็จ`)),
         "image/png"
       ));
       const pageFile=new File([blob],`${file.name}.page-${sourcePageNumber}.lab.png`,{type:"image/png"});
       // Preserve the page-level report family discovered by MixedClinicalPacket.
       // The old fast-scan recovery forced every re-OCR page to HAMAD, which
       // could turn Allergy/FoodPrint/Micronutrient pages into the wrong parser.
       const packetType=String(existing.packetType||"").toUpperCase();
       const refinedHint=String(existing.profileHint||({
         ALLERGY_PROFILE:"ALLERGY_PROFILE",
         FOOD_INTOLERANCE_IGG_200_PLUS:"FOOD_INTOLERANCE_IGG_200_PLUS",
         MICRONUTRIENT_PROFILE_I:"MICRONUTRIENT_PROFILE_I",
         MASUYAMA_IMMUNOLOGICAL:"MASUYAMA_IMMUNOLOGICAL",
         RGCC_ONCOTRAIL:"RGCC_ONCOTRAIL",
         RGCC_METASTAT:"RGCC_METASTAT"
       }[packetType]||"")).toUpperCase();
       const captured=await MIW.PhotoCapture.process(pageFile,documentId,{
         fileIndex,pageNumber:pageOffset+sourcePageNumber,sourcePageNumber,sourceFileName:file.name,
         scannedPdf:true,fastMode:true,profileHint:refinedHint,
         languages:["ALLERGY_PROFILE","FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I"].includes(refinedHint)?["eng","tha"]:["eng"]
       });
       Object.assign(captured.page,{
         profileHint:refinedHint,pdfText:existing.pdfText||"",pdfTextItems:existing.pdfTextItems||[],
         pdfPageWidth:pdfViewport.width,pdfPageHeight:pdfViewport.height,
         packetProbeOcr:false,packetHighResolutionOcr:true,packetOcrScale:2.20
       });
       pages[index]=captured.page;texts[index]=captured.text
     }
     if(labIndexes.length){
       packet=MIW.MixedClinicalPacket.apply(pages,file.name);
       MIW.Utils.log?.(`Mixed packet fast scan: OCR แบบละเอียดเฉพาะหน้า Lab ${labIndexes.length} จาก ${pages.length} หน้า`)
     }
   }
   if(bnhFastMode){
     const elapsed=((Date.now()-pdfReadStarted)/1000).toFixed(1);
     MIW.Utils.log?.(`Fast BNH OCR v10.240: single-pass probe ${bnhProbePages} หน้า · refine ${bnhRefinedPages} หน้า · รวม ${elapsed}s`);
   }
   return{pages,text:texts.join("\n\n--- PAGE ---\n\n")}
 }
 function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}
 function remove(id){queue=queue.filter(x=>x.id!==id);render()}
 async function refreshMetrics(){
   const [documents,reviews,patients]=await Promise.all([MIW.Database.all("documents"),MIW.Database.all("reviewQueue"),MIW.Database.all("patients")]);
   document.getElementById("metricDocuments").textContent=documents.length;
   document.getElementById("metricReview").textContent=reviews.filter(r=>r.status==="OPEN").length;
   document.getElementById("metricPatients").textContent=patients.length;
   document.getElementById("metricClassified").textContent=documents.filter(d=>d.status==="CLASSIFIED").length;
   document.getElementById("metricRouted").textContent=documents.filter(d=>d.status==="ROUTED").length
 }
 function getQueue(){return queue.slice()}
 function batchStatusForDocument(documentId){
   const current=queue.find(item=>item.documentId===documentId);if(!current)return{known:false,complete:true,total:1,done:1,items:[]};
   const batchId=current.batchId||"";const items=batchId?queue.filter(item=>item.batchId===batchId):[current];
   const done=items.filter(item=>item.status==="DONE"&&item.documentId).length;
   return{known:true,batchId,total:Number(current.batchTotal||items.length||1),done,complete:done>=Number(current.batchTotal||items.length||1),items}
 }
 return{
   addFiles,render,process,processAll,remove,refreshMetrics,getQueue,batchStatusForDocument,
   markReviewing,markSaved,markDocumentsSaved,hasActiveReview,peekNextReady,openNextReady,
   _partitionFiles:partitionFiles,
   _test:{reviewDisplayState,findNextReady},
   _perfTest:{bnhHeaderEvidence,bnhSensitiveEvidence,bnhProbeNeedsRefine,longScanProbeScale}
 }
})();
