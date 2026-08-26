
window.addEventListener("DOMContentLoaded",async()=>{
 try{
   await MIW.Database.open();
   await MIW.Patients.load();
   await MIW.UploadQueue.refreshMetrics();
   MIW.BugReporter?.init?.();
   MIW.LabTracker.bind();MIW.PatientBooklet.bind();MIW.OnconomicsReview.init();MIW.OnconomicsSeries.bind();
   if(!MIW.OncoKnowledge || typeof MIW.OncoKnowledge.classify!=="function"){
     MIW.Utils.log("WARNING: OncoKnowledge unavailable; safe fallback enabled")
   }else{
     MIW.Utils.log("OncoKnowledge dictionary ready");
     MIW.Utils.log("Onconomics OCR Engine: "+(MIW.OnconomicsParser.engineVersion||"unknown"))
   }
   const appVersion=document.body?.dataset?.miwVersion||"10.142";
   document.getElementById("systemStatus").textContent=`MIW v${appVersion} พร้อมใช้งาน`;

   const input=document.getElementById("fileInput");
   const drop=document.getElementById("dropzone");

   input.addEventListener("change",e=>{
     MIW.UploadQueue.addFiles(e.target.files);
     input.value=""
   });
   drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
   drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
   drop.addEventListener("drop",e=>{
     e.preventDefault();
     drop.classList.remove("drag");
     MIW.UploadQueue.addFiles(e.dataTransfer.files)
   });

   document.getElementById("processAllButton").style.display="none";

   document.getElementById("queueList").onclick=e=>{
     const removeId=e.target.dataset.removeId;
     const openId=e.target.dataset.openDocument;
     if(removeId)MIW.UploadQueue.remove(removeId);
     if(openId)MIW.Database.get("documents",openId).then(MIW.Preview.open)
   };

   document.querySelectorAll("[data-view]").forEach(btn=>{
     const allowed=["inbox","preview","review","labReview","labTracker","patientBooklet","patients"];
     if(!allowed.includes(btn.dataset.view))return;
     btn.onclick=()=>{
       if(btn.dataset.view==="labTracker"){
         MIW.LabTracker.openLatestPatient().catch(e=>alert(e.message));
         return
       }
       MIW.Router.show(btn.dataset.view)
     }
   });

   document.getElementById("openPatientsButton").onclick=()=>MIW.Router.show("patients");
   document.getElementById("openLabTrackerButton").onclick=()=>MIW.LabTracker.openLatestPatient().catch(e=>alert(e.message));
   document.getElementById("openReviewQueueButton").onclick=async()=>{await MIW.Review.render();MIW.Router.show("review")};
   document.getElementById("refreshReviewButton").onclick=MIW.Review.render;
   document.getElementById("backToInboxFromReviewButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("reviewQueueList").onclick=async e=>{
     const button=e.target.closest("[data-review-document]");
     if(!button)return;
     const record=await MIW.Database.get("documents",button.dataset.reviewDocument);
     if(record)await MIW.Preview.open(record)
   };
   document.getElementById("backToInboxButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("previousPageButton").onclick=MIW.Preview.previous;
   document.getElementById("nextPageButton").onclick=MIW.Preview.next;
   document.getElementById("toggleSourceImageButton").onclick=MIW.Preview.toggleSource;
   document.getElementById("thumbnailList").onclick=e=>{
     const el=e.target.closest("[data-page-index]");
     if(el)MIW.Preview.go(Number(el.dataset.pageIndex))
   };

   document.getElementById("editDocumentDateButton").onclick=()=>{
     const box=document.getElementById("docDateFallback");
     box.hidden=!box.hidden;
     if(!box.hidden)document.getElementById("docDate").focus()
   };

   document.getElementById("saveClassificationButton").onclick=async()=>{
     await MIW.Preview.save();
     alert("บันทึกข้อมูลเอกสารแล้ว")
   };

   document.getElementById("continueToVerifyButton").onclick=async()=>{
     const button=document.getElementById("continueToVerifyButton");
     const originalText=button.textContent;
     const setProgress=message=>{
       button.textContent=message;
       document.getElementById("systemStatus").textContent="READING";
       MIW.Utils.log(message)
     };
     try{
       button.disabled=true;
       setProgress("กำลังเตรียมเอกสาร...");

       const saved=await MIW.Preview.save();

       const reviewRoute=MIW.Classifier.resolveReviewRoute(saved);

       if((reviewRoute==="LABORATORY"||reviewRoute==="LABORATORY_PROBE"||reviewRoute==="MIXED_PACKET")&&
          !saved.patientName&&String(saved.type||"").toUpperCase()==="BODY_COMPOSITION"){
         document.getElementById("systemStatus").textContent="IDENTITY REQUIRED · OCR READY";
         MIW.Utils.log("InBody OCR complete; patient identity is absent from source and must be entered manually before import");
         const patientInput=document.getElementById("docPatientName");
         patientInput?.focus();
         alert("อ่าน InBody และเก็บผล OCR/ภาพ Enhanced ไว้แล้ว แต่ต้นฉบับใบนี้ไม่มีชื่อผู้ป่วยที่เชื่อถือได้\n\nระบบจะไม่สร้างชื่อขึ้นเอง กรุณากรอกชื่อในช่อง Patient แล้วกดดำเนินการต่ออีกครั้ง");
         return
       }

       if(reviewRoute==="LABORATORY"||reviewRoute==="LABORATORY_PROBE"||reviewRoute==="MIXED_PACKET"){
         const batchStatus=MIW.UploadQueue.batchStatusForDocument?.(saved.id);
         if(batchStatus&&batchStatus.known&&!batchStatus.complete){
           throw new Error(`Batch Merge Enforcement: ชุดนี้มี ${batchStatus.total} เอกสาร แต่ Queue อ่านเสร็จ ${batchStatus.done} เอกสาร กรุณารอให้ทุกไฟล์ขึ้น “พร้อมตรวจ” ก่อนนำเข้า Lab Tracker`)
         }
         setProgress("กำลังอ่านและรวม Source Event ทั้งชุด...");
         const parsedRows=await MIW.LabEngine.parse();
         if(reviewRoute==="LABORATORY_PROBE"&&parsedRows.length<2){
           throw new Error("เอกสารถูกจัดเป็น Other และยังพบผล Lab จริงไม่เพียงพอ จึงไม่บันทึกอัตโนมัติ กรุณาตรวจ Document type หรือข้อความ OCR")
         }
         if(!saved.patientName){
           throw new Error("ระบบยังอ่านชื่อคนไข้จากผล Lab ไม่ได้ กรุณากรอกชื่อก่อนนำเข้า")
         }
         if(MIW.LabEngine.hasPendingIdentityConflict()){
           document.getElementById("systemStatus").textContent="IDENTITY REVIEW REQUIRED";
           MIW.Router.show("labReview");
           MIW.LabEngine.focusIdentityConflict();
           alert("พบ DOB ในเอกสารไม่ตรงกัน\n\nระบบเปิดกรอบสีเหลือง Patient Identity Conflict ให้แล้ว กรุณาเลือกวันเกิดที่ถูกต้อง จากนั้นกด “นำเข้าทั้งหมดเข้า Lab Tracker”");
           MIW.LabEngine.focusIdentityConflict();
           return
         }
         const advisories=MIW.LabEngine.getReviewAdvisories();
         const duplicateRows=advisories.filter(row=>row.duplicate_conflict);
         const duplicateGroups=[...new Set(duplicateRows.map(row=>row.duplicate_group_key).filter(Boolean))];
         if(duplicateGroups.length){
           const labels=[...new Set(duplicateRows.map(row=>row.display_name||row.test_code).filter(Boolean))];
           document.getElementById("systemStatus").textContent="REVIEW REQUIRED";
           MIW.Router.show("labReview");
           MIW.LabEngine.focusDuplicateConflict(duplicateGroups[0]);
           alert(`พบ ${duplicateGroups.length} เหตุการณ์ตรวจเดียวกันที่มีค่าขัดแย้ง\n\n${labels.slice(0,5).join("\n")}${labels.length>5?`\nและอีก ${labels.length-5} รายการ`:""}\n\nผลคนละวัน/คนละ Lab No. จะเก็บเป็นประวัติอัตโนมัติและไม่ต้อง Verify\nระบบพาไปยัง conflict จริงรายการแรกแล้ว กรุณาเลือกค่าที่ตรงกับต้นฉบับและกด “ยืนยันรายการนี้แล้วไปต่อ”`);
           MIW.LabEngine.focusDuplicateConflict(duplicateGroups[0]);
           return
         }
         let inbodyGate=MIW.LabEngine.getInBodyValidationGate?.();
         if(inbodyGate&&!inbodyGate.passed){
           // v10.306 — fully automatic mode.  Do not stop at the Review screen.
           // verify() will run redundant-source recovery, quarantine only unresolved
           // contradictory fields, and continue with the trustworthy remainder.
           MIW.Utils?.log?.(`InBody Auto Source Reconciliation: pre-import gate has ${(inbodyGate.issues||[]).length} issue(s); automatic recovery will run during import`);
           document.getElementById("systemStatus").textContent="INBODY AUTO";
           setProgress("InBody: กำลังแก้ความขัดแย้งจากข้อมูลซ้ำในแผ่นเดียวกันอัตโนมัติ...")
         }
         const advisoryCount=advisories.length;
         setProgress("กำลังนำเข้า Lab Tracker...");
         const count=await MIW.LabEngine.verify();
         const importSummary=MIW.LabEngine.getLastImportSummary?.()||{saved:count,suppressed:0,replaced:0,duplicateDocument:false};
         if(count<1&&!importSummary.duplicateDocument)throw new Error("ไม่พบรายการที่นำเข้า ระบบจะไม่แสดงว่าสำเร็จเมื่อมี 0 รายการ");
         const duplicateMessage=importSummary.duplicateDocument
           ?`รายงานส่วน Lab ซ้ำกับผลที่มีอยู่แล้ว ระบบตรวจสอบแล้วและไม่สร้างผลแล็บซ้ำ\nตัดรายการซ้ำ ${importSummary.suppressed} รายการ`
           :`อ่านและนำเข้า Lab Tracker แล้ว ${count} รายการ\nRaw extracted ${importSummary.rawExtracted||count} · Unique ${importSummary.uniqueCandidates||count} · Merged/Suppressed ${importSummary.mergedOrSuppressed||importSummary.suppressed||0} · Excluded ${importSummary.excluded||0}${importSummary.baselineRows?`\nเทียบฐานเดิม ${importSummary.baselineRows} รายการ · ผลที่หาย ${importSummary.coverageDrop||0}`:""}${importSummary.replaced?`\nแทนที่เฉพาะผลซ้ำที่มีหลักฐานดีกว่า ${importSummary.replaced} รายการ`:""}`;

         if(reviewRoute==="MIXED_PACKET"){
           const oncoPages=[...new Set((saved?.packet?.onconomicsPageNumbers||saved?.packet?.pageNumbers?.RGCC_ONCONOMICS||[]).map(Number).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
           if(oncoPages.length){
             const queueItems=typeof MIW.UploadQueue.getQueue==="function"?MIW.UploadQueue.getQueue():[];
             const mixedFileItem=queueItems.find(x=>x.documentId===saved.id);
             if(!mixedFileItem?.files?.length||mixedFileItem.files.length!==1){
               throw new Error("Mixed PDF พบ Onconomics แต่ไม่พบไฟล์ต้นฉบับเดี่ยวสำหรับเปิดช่วงหน้า Onconomics กรุณา Upload PDF รวมนี้ใหม่โดยไม่ Refresh หน้าเว็บ")
             }
             setProgress(`นำเข้า Lab สำเร็จ · กำลังอ่าน Onconomics เฉพาะหน้า ${oncoPages[0]}–${oncoPages[oncoPages.length-1]}...`);
             const parsed=await MIW.OnconomicsParser.extractPdf(mixedFileItem.file,{
               onProgress:setProgress,
               pageNumbers:oncoPages
             });
             parsed.meta=parsed.meta||{};
             parsed.meta.mixedPacketSource=true;
             parsed.meta.parentDocumentId=saved.id;
             parsed.meta.packetSummary=saved.packet||null;
             document.getElementById("systemStatus").textContent="MIXED PACKET · ONCONOMICS REVIEW";
             const verifiedParent=await MIW.Database.get("documents",saved.id);
             await MIW.OnconomicsReview.open(parsed,mixedFileItem.file,{
               patientId:verifiedParent?.patientId||"",
               parentDocumentId:saved.id,
               mixedPacketSource:true
             });
             alert(`${duplicateMessage}${advisoryCount?`\nเก็บคำเตือน OCR ไว้ ${advisoryCount} รายการเพื่อการตรวจสอบย้อนหลัง`:""}\n\nตรวจพบ PDF รวมหลายรายงาน ระบบนำเข้า Allergy/FoodPrint/Micronutrient/OncoTrail/METASTAT/Masuyama/General Lab แล้ว และแยก Onconomics ${oncoPages.length} หน้าออกมาให้ตรวจต่อโดยอัตโนมัติ\n\nระบบ v10.308 บันทึก Onconomics source snapshot ให้อัตโนมัติสำหรับ Patient Booklet แล้ว; เมื่อกด “บันทึก Onconomics ทั้งรายงาน” Queue นี้จึงจะถือว่าเสร็จสมบูรณ์`);
             return
           }
         }

         await MIW.Review.complete(saved.id);
         MIW.UploadQueue.markSaved(saved.id);
         const nextQueued=MIW.UploadQueue.peekNextReady();
         alert(`${duplicateMessage}${advisoryCount?`\nเก็บคำเตือน OCR ไว้ ${advisoryCount} รายการเพื่อการตรวจสอบย้อนหลัง โดยไม่ต้องกดยืนยันทีละรายการ`:""}${nextQueued?`\n\nยังมี ${nextQueued.fileName} รอตรวจ ระบบจะเปิดรายงานนี้ต่อทันที`:""}`);
         if(nextQueued){
           await MIW.UploadQueue.openNextReady();
           return
         }
         await MIW.LabTracker.openLatestPatient();
         return
       }

       const queueItems=typeof MIW.UploadQueue.getQueue==="function"?MIW.UploadQueue.getQueue():[];
       const fileItem=queueItems.find(x=>x.documentId===saved.id);

       if(!fileItem?.files?.length){
         throw new Error("ไม่พบไฟล์ต้นฉบับในหน่วยความจำ กรุณากลับไป Upload ไฟล์นี้ใหม่ โดยไม่ Refresh หน้าเว็บ")
       }

       if(reviewRoute==="ONCONOMICS"){
         if(fileItem.files.length>1){
           throw new Error("ตรวจพบโครงสร้าง RGCC Onconomics จริง และรายงานชนิดนี้ยังประมวลผลทีละไฟล์ กรุณาเลือกเฉพาะไฟล์ Onconomics หนึ่งไฟล์ ส่วน General Lab หลายไฟล์จะไม่ถูกส่งเข้ากฎนี้")
         }
         const parsed=await MIW.OnconomicsParser.extractPdf(fileItem.file,{
           onProgress:setProgress
         });

         const parsedName=String(parsed?.meta?.patient||"").trim();
         // v10.311: RGCC "Vial" is a specimen/vial identifier, NOT HN/MRN.
         // Using it as patientHN created a second Patient Registry row when
         // Onconomics and METASTAT were uploaded as separate PDFs.  A merged PDF
         // worked only because the mixed-packet parent forced one patientId.
         const parsedHN=String(parsed?.meta?.hn||parsed?.meta?.mrn||"").trim();
         const parsedDOB=String(parsed?.meta?.dob||"").trim();
         const parsedDate=String(parsed?.meta?.date||"").trim();

         const updated={
           ...saved,
           type:"RGCC_ONCONOMICS",
           confidence:Math.max(Number(saved.confidence)||0,90),
           patientName:parsedName||saved.patientName||"Unknown patient",
           patientHN:parsedHN||saved.patientHN||"",
           patientDOB:parsedDOB||saved.patientDOB||"",
           documentDate:parsedDate||saved.documentDate||"",
           source:saved.source||"RGCC International GmbH",
           specimenVial:String(parsed?.meta?.vial||saved?.specimenVial||"").trim(),
           status:"CLASSIFIED",
           updatedAt:new Date().toISOString()
         };

         // Preserve the patient already assigned when the standalone document
         // was classified.  Only create/resolve a patient when that link is absent.
         let patient=updated.patientId?await MIW.Database.get("patients",updated.patientId):null;
         if(!patient&&updated.patientName&&updated.patientName!=="Unknown patient"){
           patient=await MIW.Patients.ensure({
             name:updated.patientName,
             hn:updated.patientHN,
             dob:updated.patientDOB
           });
           updated.patientId=patient.id
         }

         await MIW.Database.put("documents",updated);
         setProgress("กำลังสร้างหน้า Review...");
         await MIW.OnconomicsReview.open(parsed,fileItem.file,{
           patientId:updated.patientId||"",
           parentDocumentId:updated.id,
           mixedPacketSource:false
         });
         document.getElementById("systemStatus").textContent="REVIEW READY";
         return
       }

       throw new Error(`เอกสารชนิด ${saved.type} ยังไม่มี Specialized Engine และไม่พบหลักฐานเพียงพอว่าเป็น General Lab หรือ RGCC Onconomics`)
     }catch(error){
       document.getElementById("systemStatus").textContent="ERROR";
       MIW.Utils.log(`Preview-to-Review failed: ${error.stack||error.message}`);
       MIW.BugReporter?.capture?.(error,{
         action:"Preview-to-Review",
         documentId:MIW.Preview?.current?.()?.id||"",
         fileName:MIW.Preview?.current?.()?.fileName||"",
         reviewRoute:typeof reviewRoute!=="undefined"?reviewRoute:"unknown"
       });
       alert(`ไม่สามารถตรวจและนำเข้าผล Lab ได้\n\n${error.message}\n\nกดปุ่ม “🐞 รายงาน Bug” ด้านบนเพื่อ Copy รายละเอียด Error + Log ได้ทันที`)
     }finally{
       button.disabled=false;
       button.textContent=originalText
     }
   };

   document.getElementById("addLabRowButton").onclick=MIW.LabEngine.add;
   document.getElementById("labReviewBody").onclick=e=>{
     const id=e.target.dataset.deleteLab;
     if(id)MIW.LabEngine.remove(id)
   };
   document.getElementById("labReviewBody").addEventListener("change",e=>{
     if(e.target.matches("[data-key]"))MIW.LabEngine.refreshEditedRow(e.target)
   });
   document.getElementById("previousLabIssueButton").onclick=()=>MIW.LabEngine.focusIssue(-1);
   document.getElementById("nextLabIssueButton").onclick=()=>MIW.LabEngine.focusIssue(1);
   document.getElementById("confirmLabIssueButton").onclick=()=>MIW.LabEngine.confirmCurrentIssue();
   document.getElementById("labDuplicateConflictSummary").onclick=e=>{
     const candidate=e.target.closest("[data-duplicate-candidate-id]");
     if(candidate)MIW.LabEngine.selectIssue(candidate.dataset.duplicateCandidateId,{scroll:false})
   };
   document.getElementById("verifyDocumentZoomOutButton").onclick=()=>MIW.LabEngine.setVerifyZoom(MIW.LabEngine.getVerifyZoom()-.25);
   document.getElementById("verifyDocumentZoomResetButton").onclick=()=>MIW.LabEngine.setVerifyZoom(1);
   document.getElementById("verifyDocumentZoomInButton").onclick=()=>MIW.LabEngine.setVerifyZoom(MIW.LabEngine.getVerifyZoom()+.25);
   document.getElementById("verifyDocumentFullButton").onclick=()=>MIW.LabEngine.openVerifyDocumentFull();

   async function verifyLab(){
     try{
       if(!MIW.LabEngine.getRows().some(row=>row.selected!==false)){
         throw new Error("ยังไม่มีผล Lab ที่เลือกบันทึก ระบบจะไม่แสดงว่าสำเร็จเมื่อมี 0 รายการ");
       }
       const advisoryCount=MIW.LabEngine.getReviewAdvisories().length;
       const count=await MIW.LabEngine.verify();
       if(count<1)throw new Error("ไม่พบรายการที่นำเข้า การบันทึกถูกยกเลิก");
       const current=MIW.Preview.current();
       if(current)await MIW.Review.complete(current.id);
       if(current)MIW.UploadQueue.markSaved(current.id);
       const nextQueued=MIW.UploadQueue.peekNextReady();
       alert(`นำเข้า ${count} รายการเข้า Lab Tracker แล้ว${advisoryCount?`\nเก็บคำเตือน OCR ไว้ ${advisoryCount} รายการเพื่อการตรวจสอบย้อนหลัง โดยไม่ต้องกดยืนยันทีละรายการ`:""}${nextQueued?`\n\nยังมี ${nextQueued.fileName} รอตรวจ ระบบจะเปิดรายงานนี้ต่อทันที`:""}`);
       if(nextQueued){
         await MIW.UploadQueue.openNextReady();
         return
       }
       await MIW.LabTracker.openLatestPatient()
     }catch(error){
       if(error.code==="DUPLICATE_RESULT_CONFLICT"){
         document.getElementById("systemStatus").textContent="REVIEW REQUIRED";
         MIW.Router.show("labReview");
         MIW.LabEngine.focusDuplicateConflict(error.duplicateGroupKey||"");
         alert(error.message);
         MIW.LabEngine.focusDuplicateConflict(error.duplicateGroupKey||"");
         return
       }
       if(error.code==="INBODY_VALIDATION_GATE_FAILED"){
         // Compatibility fallback for stale cached engine code. Never trap the user
         // in a manual InBody Verify loop in v10.306.
         document.getElementById("systemStatus").textContent="INBODY AUTO · CACHE RETRY";
         MIW.Utils?.log?.("InBody legacy validation error intercepted; reload v10.308 assets before retrying import");
         alert("ตรวจพบ cache ของ InBody engine รุ่นเก่า กรุณากด Ctrl+F5 หนึ่งครั้ง แล้วอัปโหลดเอกสารใหม่ ระบบ v10.308 ไม่ต้อง Verify InBody ด้วยตนเอง");
         return
       }
       if(error.code==="PATIENT_DOB_CONFLICT"){
         document.getElementById("systemStatus").textContent="IDENTITY REVIEW REQUIRED";
         MIW.Router.show("labReview");
         MIW.LabEngine.focusIdentityConflict();
         alert("กรุณาเลือก DOB ที่ถูกต้องในกรอบสีเหลือง Patient Identity Conflict ก่อนบันทึก");
         MIW.LabEngine.focusIdentityConflict();
         return
       }
       if(!error.handledInReview)alert(error.message)
     }
   }
   document.getElementById("verifyLabButton").onclick=verifyLab;
   document.getElementById("verifyLabBottomButton").onclick=verifyLab;
   document.getElementById("labReviewCount").closest(".metric").title="เฉพาะชื่อหรือค่าผลที่หาย ค่าจากหลักฐานที่น่าเชื่อถือขัดกัน หรือ Flag/สเกลผิดความสัมพันธ์จริง";
   document.getElementById("backToPreviewFromLabButton").onclick=()=>MIW.Router.show("preview");
   document.getElementById("backToInboxFromTrackerButton").onclick=()=>MIW.Router.show("inbox");

   document.getElementById("addPatientButton").onclick=async()=>{
     await MIW.Patients.add({
       name:document.getElementById("newPatientName").value,
       hn:document.getElementById("newPatientHN").value,
       dob:document.getElementById("newPatientDOB").value
     });
     document.getElementById("newPatientName").value="";
     document.getElementById("newPatientHN").value="";
     document.getElementById("newPatientDOB").value="";
     await MIW.UploadQueue.refreshMetrics()
   };
   document.getElementById("patientList").onclick=e=>{
     const id=e.target.dataset.deletePatient;
     if(id&&confirm("ลบ Patient นี้?"))MIW.Patients.remove(id).then(MIW.UploadQueue.refreshMetrics)
   };

   
   async function saveOncoReport(){
     try{
       const count=await MIW.OnconomicsReview.saveReport();
       const current=MIW.Preview.current();
       if(current)await MIW.Review.complete(current.id);
       if(current)MIW.UploadQueue.markSaved(current.id);
       const nextQueued=MIW.UploadQueue.peekNextReady();
       alert(`บันทึก Onconomics ทั้งรายงาน ${count} รายการแล้ว${nextQueued?`\n\nยังมี ${nextQueued.fileName} รอตรวจ ระบบจะเปิดรายงานนี้ต่อทันที`:""}`);
       if(nextQueued){
         await MIW.UploadQueue.openNextReady();
         return
       }
       const patient=MIW.Patients.current();
       await MIW.OnconomicsSeries.open(patient?.id||"")
     }catch(error){alert(error.message)}
   }
   document.getElementById("saveOncoButton").onclick=saveOncoReport;
   document.getElementById("saveOncoBottomButton").onclick=saveOncoReport;
   document.getElementById("backToPreviewFromOncoButton").onclick=()=>MIW.Router.show("preview");
   document.getElementById("backToInboxFromOncoTrackerButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("openCtcTrackerButton").onclick=()=>MIW.LabTracker.openLatestCtc().catch(e=>alert(e.message));

   document.getElementById("clearDatabaseButton").onclick=async()=>{
     if(confirm("ล้างข้อมูล MIW v5 ทั้งหมด?")){
       await MIW.Database.clearAll();
       location.reload()
     }
   };

   MIW.Events.on("document:processed",documentRecord=>{
     MIW.Utils.log(`Document ready: ${documentRecord.fileName} · ${documentRecord.type}`);
     // Reserve and open the first ready item. A specialized report that
     // finishes later remains visibly READY until the current review is saved.
     if(!MIW.UploadQueue.hasActiveReview()){
       MIW.UploadQueue.openNextReady().catch(error=>{
         MIW.Utils.log(`Queue auto-open failed: ${error.message}`);
         MIW.BugReporter?.capture?.(error,{action:"Queue auto-open"})
       })
     }
   });

   MIW.Utils.log("MIW v10.270 application initialized")
 }catch(error){
   document.getElementById("systemStatus").textContent="ERROR";
   MIW.Utils.log(`BOOT ERROR: ${error.stack||error.message}`);
   MIW.BugReporter?.capture?.(error,{action:"Application boot"});
   alert(`${error.message}\n\nกดปุ่ม “🐞 รายงาน Bug” เพื่อ Copy รายละเอียดได้ทันที`)
 }
});
