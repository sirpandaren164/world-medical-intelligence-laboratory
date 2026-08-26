window.MIW=window.MIW||{};
MIW.Preview=(function(){
 let documentRecord=null,pages=[],index=0,showOriginal=false;
 async function open(record){
   MIW.UploadQueue?.markReviewing?.(record?.id);
   documentRecord=record;
   pages=(await MIW.Database.all("pages")).filter(p=>p.documentId===record.id).sort((a,b)=>a.pageNumber-b.pageNumber);
   const detected=MIW.Classifier.geometryHeader(pages);
   const extracted=MIW.Classifier.extractEntities?.(documentRecord.text||"",pages)||{};
   const currentRaw=MIW.Patients?.sanitizePatientName?.(documentRecord.patientName)||documentRecord.patientName||"";
   const currentName=currentRaw&&!MIW.Classifier.isInvalidPatientName(currentRaw)?currentRaw:"";
   const fileCandidates=[documentRecord.fileName,...(documentRecord.sourceFiles||[]).map(file=>file?.name)]
     .map(value=>MIW.Patients?.extractNameFromFileName?.(value)||"");
   const detectedName=MIW.Patients?.bestPatientName?.([
     detected.name,extracted.name,...fileCandidates,currentName
   ],{preferThai:true})||"";
   const candidateHN=detected.hn||extracted.hn||documentRecord.patientHN||"";
   const candidateDOB=detected.dob||extracted.dob||documentRecord.patientDOB||"";
   const registry=MIW.Patients?.match?.({
     name:detectedName||currentName,hn:candidateHN,dob:candidateDOB,
     civilId:extracted.civilId,hospitalIds:extracted.hospitalIds
   });
   const recoveredName=MIW.Patients?.bestPatientName?.([
     registry?.name,...(registry?.aliases||[]),detectedName,currentName
   ],{preferThai:true})||"";
   const identityChanged=
     documentRecord.patientName!==recoveredName ||
     (!documentRecord.patientHN&&candidateHN) ||
     (!documentRecord.patientDOB&&candidateDOB);
   if(identityChanged){
     documentRecord={
       ...documentRecord,
       patientName:recoveredName,
       patientHN:documentRecord.patientHN||candidateHN,
       patientDOB:documentRecord.patientDOB||candidateDOB,
       identitySource:currentName?"AUTO_SOURCE_RECONCILIATION":"AUTO_HEADER_AND_TEXT_RECOVERY",
       invalidPatientNameDiscarded:Boolean(currentRaw&&!currentName),
       updatedAt:new Date().toISOString()
     };
     if(documentRecord.patientName){
       const patient=await MIW.Patients.ensure({
         name:documentRecord.patientName,
         hn:documentRecord.patientHN,
         dob:documentRecord.patientDOB,
         hospitalIds:extracted.hospitalIds,
         civilId:extracted.civilId
       });
       documentRecord.patientId=patient.id;
       documentRecord.patientName=patient.name;
       documentRecord.patientHN=patient.hn||documentRecord.patientHN;
       documentRecord.patientDOB=patient.dob||documentRecord.patientDOB
     }
     await MIW.Database.put("documents",documentRecord)
   }
   index=0;showOriginal=false;render();MIW.Router.show("preview")
 }
 function render(){
   if(!documentRecord)return;
   document.getElementById("previewTitle").textContent=documentRecord.fileName;
   const currentPage=pages[index]||null;
   const enhancement=currentPage?.ocr?.enhancement||null;
   const enhanceMeta=enhancement?.nonGenerative
     ?` · OCR Enhance: ${enhancement.actions?.length?enhancement.actions.join(" → "):"quality pass"} · Q ${enhancement.qualityBefore?.score??"—"}→${enhancement.qualityAfter?.score??"—"}`:"";
   document.getElementById("previewMeta").textContent=`${documentRecord.sourceFiles?.length||1} ไฟล์ · ${documentRecord.pageCount||pages.length} หน้า · ${documentRecord.status}${enhanceMeta}`;
   document.getElementById("docPatientName").value=documentRecord.patientName||"";
   document.getElementById("docPatientHN").value=documentRecord.patientHN||"";
   document.getElementById("docPatientDOB").value=documentRecord.patientDOB||"";
   document.getElementById("docDate").value=documentRecord.documentDate||"";
   document.getElementById("docDateDisplay").textContent=documentRecord.documentDate||"Unknown";
   document.getElementById("docDateDisplay").classList.toggle("unknown",!documentRecord.documentDate);
   document.getElementById("docDateConfidence").textContent=documentRecord.documentDate?"AUTO DETECTED":"UNKNOWN";
   document.getElementById("docSource").value=documentRecord.source||"";
   document.getElementById("docType").value=documentRecord.type||"OTHER";
   const identityHint=document.getElementById("docPatientIdentityHint");
   if(identityHint){
     const deferred=String(documentRecord.type||"").toUpperCase()==="BODY_COMPOSITION"&&!documentRecord.patientName;
     identityHint.textContent=deferred?"ต้นฉบับ InBody ยังไม่มีชื่อผู้ป่วยที่เชื่อถือได้: ระบบอ่าน/Verify ค่าได้ แต่ต้องกรอกชื่อก่อนนำเข้า Lab Tracker":"";
   }
   document.getElementById("classificationConfidence").textContent=`${documentRecord.confidence||0}%`;
   document.getElementById("documentText").value=documentRecord.text||"";
   document.getElementById("pageIndicator").textContent=pages.length?`${index+1}/${pages.length}`:"0/0";
   const packetCard=document.getElementById("packetSummaryCard");
   const packet=documentRecord.packet;
   if(packetCard){
     packetCard.hidden=!packet?.isMixed;
     if(packet?.isMixed){
       const items=MIW.MixedClinicalPacket?.summaryItems?.(packet)||[];
       document.getElementById("packetLabPageCount").textContent=`${packet.labPageCount||0} LAB pages`;
       document.getElementById("packetSummaryText").textContent=MIW.MixedClinicalPacket?.summaryText?.(packet)||"";
       document.getElementById("packetSummaryItems").innerHTML=items.map(item=>`<div class="packet-summary-item ${item.className}"><b>${MIW.Utils.escape(item.short)}</b><span>${MIW.Utils.escape(item.label)}</span><em>${item.count} หน้า${item.range?` · ${MIW.Utils.escape(item.range)}`:""}</em></div>`).join("")
     }
   }

   const box=document.getElementById("documentPreview");
   if(!pages.length){box.innerHTML='<div class="muted">ไม่มี Preview</div>'}
   else{
     const page=pages[index];
     const imageUrl=showOriginal&&page.originalDataUrl?page.originalDataUrl:page.dataUrl;
     box.innerHTML=`<img src="${imageUrl}" alt="Page ${page.pageNumber}">`;
     const toggle=document.getElementById("toggleSourceImageButton");
     if(toggle){toggle.hidden=!page.originalDataUrl;toggle.textContent=showOriginal?"ดูภาพ OCR Enhance":"ดูต้นฉบับ"}
     const badge=document.getElementById("currentPacketPageBadge");
     if(badge){
       const meta=MIW.MixedClinicalPacket?.typeMeta?.(page.packetType||"OTHER");
       badge.hidden=!documentRecord.packet?.isMixed;
       badge.className=`current-packet-page-badge ${meta?.className||"packet-other"}`;
       const importText=page.packetIncludeInLab?" · จะนำเข้า Lab Tracker":page.packetType==="RGCC_ONCONOMICS"?" · แยกเข้า Onconomics Engine":" · เก็บเป็นหลักฐาน ไม่ปนกับผล Lab";
       badge.textContent=`${meta?.short||"PAGE"} · ${meta?.label||"Unclassified"}${importText}`
     }
   }

   document.getElementById("thumbnailList").innerHTML=pages.map((p,i)=>{
     const meta=MIW.MixedClinicalPacket?.typeMeta?.(p.packetType||"OTHER");
     return`<div class="thumbnail ${i===index?"active":""} ${documentRecord.packet?.isMixed?meta?.className||"packet-other":""}" data-page-index="${i}">
      <img src="${p.dataUrl}" alt="Page ${p.pageNumber}">
      <span>หน้า ${p.sourcePageNumber||p.pageNumber}</span>
      ${documentRecord.packet?.isMixed?`<b class="thumbnail-packet-badge">${MIW.Utils.escape(meta?.short||"OTHER")}</b>`:""}
    </div>`}).join("")
 }
 function next(){if(index<pages.length-1){index++;render()}}
 function previous(){if(index>0){index--;render()}}
 function go(i){if(i>=0&&i<pages.length){index=i;showOriginal=false;render()}}
 function toggleSource(){showOriginal=!showOriginal;render()}
 async function save(){
   if(!documentRecord)return;
   const updated={...documentRecord,
     patientName:document.getElementById("docPatientName").value.trim(),
     patientHN:document.getElementById("docPatientHN").value.trim(),
     patientDOB:document.getElementById("docPatientDOB").value.trim(),
     documentDate:document.getElementById("docDate").value||documentRecord.documentDate||"",
     source:document.getElementById("docSource").value.trim(),
     type:document.getElementById("docType").value,
     text:document.getElementById("documentText").value,
     status:"CLASSIFIED",
     updatedAt:new Date().toISOString()
   };
   let patient=null;
   const entered=MIW.Patients?.sanitizePatientName?.(updated.patientName)||updated.patientName;
   const validEntered=entered&&!MIW.Classifier.isInvalidPatientName(entered)?entered:"";
   const detected=MIW.Classifier.geometryHeader(pages);
   const extracted=MIW.Classifier.extractEntities?.(updated.text||documentRecord.text||"",pages)||{};
   const registry=MIW.Patients?.match?.({name:validEntered,hn:updated.patientHN||detected.hn||extracted.hn,dob:updated.patientDOB||detected.dob||extracted.dob});
   // v10.298: a name explicitly typed by the user is not OCR evidence.
   // OCR plausibility rules intentionally reject some single-token lowercase Latin
   // strings, but legitimate patients can have exactly that form.  Preserve a
   // strong Registry match when available; otherwise commit the valid manual name
   // before falling back to OCR/header/file-name recovery.
   updated.patientName=registry?.name||validEntered||MIW.Patients?.bestPatientName?.([
     ...(registry?.aliases||[]),detected.name,extracted.name,
     MIW.Patients?.extractNameFromFileName?.(updated.fileName)
   ],{preferThai:true})||"";
   if(validEntered)updated.identitySource=registry?.id?"MANUAL_ENTRY_REGISTRY_MATCH":"MANUAL_USER_ENTRY";
   const deferredIdentityAllowed=String(updated.type||"").toUpperCase()==="BODY_COMPOSITION";
   if(!updated.patientName&&!deferredIdentityAllowed){
     throw new Error("ยังอ่านชื่อผู้ป่วยที่เชื่อถือได้ไม่สำเร็จ กรุณากรอกชื่อจากหัวรายงานในช่อง Patient แล้วบันทึกอีกครั้ง")
   }
   if(updated.patientName){
     patient=await MIW.Patients.ensure({
       name:updated.patientName,hn:updated.patientHN||detected.hn||extracted.hn,dob:updated.patientDOB||detected.dob||extracted.dob,
       hospitalIds:extracted.hospitalIds,civilId:extracted.civilId
     });
     updated.patientId=patient.id;updated.patientName=patient.name;updated.patientHN=patient.hn||updated.patientHN;updated.patientDOB=patient.dob||updated.patientDOB;
     updated.identityDeferred=false
   }else{
     updated.patientId="";updated.identityDeferred=true;updated.status="REVIEW_REQUIRED";
     MIW.Utils.log("InBody identity deferred: source has no trustworthy patient name; OCR results retained for review")
   }
   await MIW.Database.put("documents",updated);
   documentRecord=updated;
   MIW.Utils.log(`Document confirmed: ${updated.fileName}`);
   await MIW.UploadQueue.refreshMetrics();
   return updated
 }
 function current(){return documentRecord}
 return{open,render,next,previous,go,toggleSource,save,current}
})();
