
window.MIW=window.MIW||{};
MIW.Routing=(function(){
 let routedDocument=null;
 const engineMap={
   LABORATORY:"LAB_ENGINE",
   RADIOLOGY:"RADIOLOGY_ENGINE",
   PATHOLOGY:"PATHOLOGY_ENGINE",
   RGCC_ONCONOMICS:"RGCC_ONCONOMICS_ENGINE",
   RGCC_OTHER:"RGCC_ENGINE",
   PRESCRIPTION:"MEDICATION_ENGINE",
   CLINICAL_NOTE:"CLINICAL_NOTE_ENGINE",
   OTHER:"GENERAL_DOCUMENT_ENGINE"
 };
 async function routeCurrent(){
   const saved=await MIW.Preview.save();
   if(saved.type==="LABORATORY"){
     await MIW.LabEngine.open();
     return saved
   }
   if(!saved.patientName)throw new Error("กรุณาตรวจและกรอกชื่อ Patient ก่อน Route");
   

   if(!saved.documentDate)saved.documentDate="";
   const destination=engineMap[saved.type]||"GENERAL_DOCUMENT_ENGINE";
   const routedAt=new Date().toISOString();
   const updated={...saved,status:"ROUTED",destinationEngine:destination,reviewedAt:routedAt,routedAt};
   await MIW.Database.put("documents",updated);
   await MIW.Database.put("engineQueue",{
     id:MIW.Utils.uid("engineJob"),
     documentId:updated.id,
     patientId:updated.patientId,
     documentType:updated.type,
     destinationEngine:destination,
     status:"WAITING_ENGINE",
     createdAt:routedAt
   });
   await MIW.Review.complete(updated.id);
   routedDocument=updated;
   render(updated);
   MIW.Router.show("route");
   MIW.Utils.log(`Routed ${updated.fileName} → ${destination}`);
   await MIW.UploadQueue.refreshMetrics();
   return updated
 }
 function render(d){
   if(!d)return;
   document.getElementById("routeTitle").textContent=`${d.fileName} ถูกส่งต่อแล้ว`;
   document.getElementById("routeDescription").textContent="Review เสร็จสมบูรณ์และเอกสารออกจาก Review Queue แล้ว";
   document.getElementById("routePatient").textContent=d.patientName||"—";
   document.getElementById("routeType").textContent=d.type||"—";
   document.getElementById("routeDate").textContent=d.documentDate||"—";
   document.getElementById("routeEngine").textContent=d.destinationEngine||"—";
   document.getElementById("routeStatus").textContent=d.status||"ROUTED";
   document.getElementById("routeReviewedAt").textContent=new Date(d.reviewedAt).toLocaleString()
 }
 function current(){return routedDocument}
 return{routeCurrent,render,current}
})();
