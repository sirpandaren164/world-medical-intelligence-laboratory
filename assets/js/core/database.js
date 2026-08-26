window.MIW=window.MIW||{};
MIW.Database=(function(){
 const NAME="MIW_V54_SOURCE_GROUNDED";
 const VERSION=4;
 const STORES=["patients","documents","pages","documentText","entities","reviewQueue","engineQueue","laboratoryDrafts","laboratoryResults","oncoReports","oncoResults","auditLog","settings"];
 let db;
 function req(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
 async function open(){
   db=await new Promise((resolve,reject)=>{
     const request=indexedDB.open(NAME,VERSION);
     request.onupgradeneeded=(event)=>{
       const upgradeDb=request.result;
       STORES.forEach(name=>{
         if(!upgradeDb.objectStoreNames.contains(name)){
           upgradeDb.createObjectStore(name,{keyPath:"id"});
         }
       });
       console.info(`MIW database upgraded from v${event.oldVersion} to v${event.newVersion}`);
     };
     request.onsuccess=()=>{
       const opened=request.result;
       opened.onversionchange=()=>{
         opened.close();
         console.warn("MIW database closed because a newer schema version is available.");
       };
       resolve(opened)
     };
     request.onblocked=()=>reject(new Error("ฐานข้อมูลถูกเปิดค้างในแท็บอื่น กรุณาปิดแท็บ MIW เก่าแล้วเปิดใหม่"));
     request.onerror=()=>reject(request.error)
   });
   MIW.Utils.log("Unified database ready")
 }
 function store(name,mode="readonly"){if(!db)throw new Error("Database not ready");return db.transaction(name,mode).objectStore(name)}
 async function replaceOncoReport({report,rows,audit,replaceReportIds=[]}){
   if(!db)throw new Error("Database not ready");
   const replaceIds=new Set(replaceReportIds.filter(Boolean));
   return new Promise((resolve,reject)=>{
     const tx=db.transaction(["oncoReports","oncoResults","auditLog"],"readwrite");
     const reportStore=tx.objectStore("oncoReports"),resultStore=tx.objectStore("oncoResults"),auditStore=tx.objectStore("auditLog");
     replaceIds.forEach(id=>reportStore.delete(id));
     const cursorRequest=resultStore.openCursor();
     cursorRequest.onsuccess=event=>{
       const cursor=event.target.result;
       if(!cursor){
         reportStore.put(report);
         rows.forEach(row=>resultStore.put(row));
         auditStore.put(audit);
         return
       }
       if(replaceIds.has(cursor.value.reportId))cursor.delete();
       cursor.continue()
     };
     cursorRequest.onerror=()=>tx.abort();
     tx.oncomplete=()=>resolve({report,rowCount:rows.length,replacedReportCount:replaceIds.size});
     tx.onerror=()=>reject(tx.error||new Error("ไม่สามารถบันทึกรายงานแบบ transaction ได้"));
     tx.onabort=()=>reject(tx.error||new Error("ยกเลิกการบันทึกเพื่อป้องกันข้อมูลไม่สมบูรณ์"))
   })
 }
 function labText(value){return String(value??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim()}
 function labToken(value){return labText(value).toLowerCase().replace(/[^a-z0-9ก-๙+/-]+/g,"")}
 function labValueToken(row){return labText(row.reportedValue??row.reported_value_raw??row.value??row.value_raw).replace(/[≤]/g,"<=").replace(/[≥]/g,">=").replace(/[−–—]/g,"-").replace(/,/g,"").replace(/\s+/g,"").toLowerCase()}
 function labReplacementKey(row){
   const testCode=labToken(row.testCode||row.test_code||row.name);
   const labNo=labToken(row.labNo||row.lab_no||row.accessionNo||row.accession_no||row.sampleNo||row.sample_no);
   const dateTime=labText(row.dateTime||row.result_datetime||row.date||row.result_date).slice(0,19);
   const method=labToken(row.reportedMethod||row.reported_method||row.method);
   const specimen=labToken(row.specimenType||row.specimen_type||row.specimen);
   const unit=labText(row.reportedUnit||row.reported_unit||row.unit).toLowerCase().replace(/μ/g,"µ").replace(/\s+/g,"");
   const kind=labText(row.resultKind||row.result_kind||"NUMERIC").toUpperCase();
   const value=labValueToken(row);
   // Replacement is intentionally exact. Different value, method, specimen,
   // unit or date is retained for review instead of being silently deleted.
   return[testCode,labNo||dateTime,dateTime,method,specimen,unit,kind,value].join("\u001f")
 }
 async function replaceLabResults({document,patientId,rows}){
   if(!db)throw new Error("Database not ready");
   if(!document?.id)throw new Error("ไม่พบ Document ID สำหรับบันทึกผล Lab");
   if(!Array.isArray(rows)||!rows.length)throw new Error("ไม่พบผล Lab สำหรับบันทึก");
   const expectedIds=new Set(rows.map(row=>String(row.id||"")));
   if(expectedIds.has("")||expectedIds.size!==rows.length){
     const error=new Error(`Verify invariant failed: พบ Storage ID ซ้ำใน ${rows.length} รายการก่อนบันทึก`);
     error.code="VERIFY_INVARIANT_FAILED";
     throw error
   }
   const replacementKeys=new Set(rows.map(labReplacementKey));
   return new Promise((resolve,reject)=>{
     const tx=db.transaction(["documents","laboratoryResults"],"readwrite");
     const documentStore=tx.objectStore("documents"),resultStore=tx.objectStore("laboratoryResults");
     let savedRows=[],invariantError=null;
     const cursorRequest=resultStore.openCursor();
     cursorRequest.onsuccess=event=>{
       const cursor=event.target.result;
       if(cursor){
         const old=cursor.value;
         if(old.documentId===document.id||(
           old.patientId===patientId&&replacementKeys.has(labReplacementKey(old))
         ))cursor.delete();
         cursor.continue();
         return
       }
       try{
         documentStore.put(document);
         rows.forEach(row=>resultStore.put(row));
         const verifyRequest=resultStore.getAll();
         verifyRequest.onsuccess=()=>{
           savedRows=verifyRequest.result.filter(row=>row.documentId===document.id&&row.status==="VERIFIED");
           const actualIds=new Set(savedRows.map(row=>String(row.id||"")));
           if(savedRows.length!==rows.length||actualIds.size!==expectedIds.size||[...expectedIds].some(id=>!actualIds.has(id))){
             invariantError=new Error(`Verify invariant failed: ก่อน ${rows.length} รายการ หลัง ${savedRows.length} รายการ`);
             invariantError.code="VERIFY_INVARIANT_FAILED";
             tx.abort()
           }
         };
         verifyRequest.onerror=()=>{
           invariantError=verifyRequest.error||new Error("ไม่สามารถตรวจจำนวนผล Lab หลังบันทึกได้");
           try{tx.abort()}catch{}
         }
       }catch(error){
         invariantError=error;
         try{tx.abort()}catch{}
       }
     };
     cursorRequest.onerror=()=>{
       invariantError=cursorRequest.error||new Error("ไม่สามารถตรวจข้อมูล Lab เดิมได้");
       try{tx.abort()}catch{}
     };
     tx.oncomplete=()=>resolve({rowCount:savedRows.length,rows:savedRows});
     tx.onerror=()=>reject(invariantError||tx.error||new Error("ไม่สามารถบันทึกผล Lab แบบ transaction ได้"));
     tx.onabort=()=>reject(invariantError||tx.error||new Error("ยกเลิกการบันทึกผล Lab เพื่อป้องกันข้อมูลไม่ครบ"))
   })
 }
 return{
   open,
   all:name=>req(store(name).getAll()),
   get:(name,id)=>req(store(name).get(id)),
   put:(name,value)=>req(store(name,"readwrite").put(value)),
   delete:(name,id)=>req(store(name,"readwrite").delete(id)),
   clear:name=>req(store(name,"readwrite").clear()),
   replaceOncoReport,
   replaceLabResults,
   async clearAll(){for(const name of STORES)await req(store(name,"readwrite").clear())}
 }
})();
