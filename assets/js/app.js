window.addEventListener("DOMContentLoaded",async()=>{
 try{
   await MIW.Database.open();
   await MIW.Patients.load();
   await MIW.UploadQueue.refreshMetrics();
   document.getElementById("systemStatus").textContent="LAB ENGINE READY";
   MIW.LabTracker.bind();

   const input=document.getElementById("fileInput"),drop=document.getElementById("dropzone");
   input.addEventListener("change",e=>{MIW.UploadQueue.addFiles(e.target.files);input.value=""});
   drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag")});
   drop.addEventListener("dragleave",()=>drop.classList.remove("drag"));
   drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag");MIW.UploadQueue.addFiles(e.dataTransfer.files)});
   document.getElementById("processAllButton").onclick=MIW.UploadQueue.processAll;
   document.getElementById("queueList").onclick=e=>{
     const processId=e.target.dataset.processId,removeId=e.target.dataset.removeId,openId=e.target.dataset.openDocument;
     if(processId)MIW.UploadQueue.process(processId);
     if(removeId)MIW.UploadQueue.remove(removeId);
     if(openId)MIW.Database.get("documents",openId).then(MIW.Preview.open)
   };

   document.querySelectorAll("[data-view]").forEach(btn=>btn.onclick=()=>MIW.Router.show(btn.dataset.view));
   document.getElementById("openPatientsButton").onclick=()=>MIW.Router.show("patients");
   document.getElementById("openReviewQueueButton").onclick=()=>MIW.Router.show("review");
   document.getElementById("backToInboxButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("previousPageButton").onclick=MIW.Preview.previous;
   document.getElementById("nextPageButton").onclick=MIW.Preview.next;
   document.getElementById("thumbnailList").onclick=e=>{const el=e.target.closest("[data-page-index]");if(el)MIW.Preview.go(Number(el.dataset.pageIndex))};
   document.getElementById("editDocumentDateButton").onclick=()=>{
     const box=document.getElementById("docDateFallback");
     box.hidden=!box.hidden;
     if(!box.hidden)document.getElementById("docDate").focus()
   };
   document.getElementById("saveClassificationButton").onclick=async()=>{await MIW.Preview.save();alert("บันทึกข้อมูลเอกสารแล้ว แต่ยังไม่ Route")};
   document.getElementById("confirmAndRouteButton").onclick=async()=>{
     try{await MIW.Routing.routeCurrent()}catch(error){alert(error.message)}
   };
   document.getElementById("sendToReviewButton").onclick=MIW.Review.sendCurrent;
   document.getElementById("refreshReviewButton").onclick=MIW.Review.render;
   document.getElementById("reviewQueueList").onclick=e=>{const id=e.target.dataset.reviewDocument;if(id)MIW.Database.get("documents",id).then(MIW.Preview.open)};

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
   document.getElementById("patientList").onclick=e=>{const id=e.target.dataset.deletePatient;if(id&&confirm("ลบ Patient นี้?"))MIW.Patients.remove(id).then(MIW.UploadQueue.refreshMetrics)};
   document.getElementById("backToInboxAfterRouteButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("openReviewAfterRouteButton").onclick=()=>MIW.Router.show("review");
   document.getElementById("openRoutedDocumentButton").onclick=()=>{const d=MIW.Routing.current();if(d)MIW.Preview.open(d)};
   document.getElementById("addLabRowButton").onclick=MIW.LabEngine.add;
   document.getElementById("downloadLabJsonButton").onclick=MIW.LabEngine.download;
   document.getElementById("labReviewBody").onclick=e=>{const id=e.target.dataset.deleteLab;if(id)MIW.LabEngine.remove(id)};
   async function verifyLab(){
     try{
       const count=await MIW.LabEngine.verify();
       alert(`บันทึก ${count} รายการเข้า Lab Tracker แล้ว`)
     }catch(error){alert(error.message)}
   }
   document.getElementById("verifyLabButton").onclick=verifyLab;
   document.getElementById("verifyLabBottomButton").onclick=verifyLab;
   document.getElementById("backToPreviewFromLabButton").onclick=()=>MIW.Router.show("preview");
   document.getElementById("backToInboxFromTrackerButton").onclick=()=>MIW.Router.show("inbox");
   document.getElementById("openLabTrackerButton").onclick=()=>MIW.LabTracker.openLatestPatient().catch(e=>alert(e.message));
   document.getElementById("clearDatabaseButton").onclick=async()=>{
     if(confirm("ล้างฐานข้อมูล MIW v4 Phase 1 ทั้งหมด?")){await MIW.Database.clearAll();location.reload()}
   };

   MIW.Events.on("document:processed",documentRecord=>{
     if(documentRecord.status==="REVIEW_REQUIRED")MIW.Utils.log(`Review required: ${documentRecord.fileName}`)
   });

   MIW.Utils.log("All Phase 1 modules initialized")
 }catch(error){
   document.getElementById("systemStatus").textContent="ERROR";
   MIW.Utils.log(`BOOT ERROR: ${error.message}`);
   alert(error.message)
 }
});
