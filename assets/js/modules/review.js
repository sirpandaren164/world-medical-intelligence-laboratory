window.MIW=window.MIW||{};
MIW.Review=(function(){
 async function render(){
   const [reviews,documents]=await Promise.all([MIW.Database.all("reviewQueue"),MIW.Database.all("documents")]);
   const open=reviews.filter(r=>r.status==="OPEN");
   document.getElementById("reviewQueueList").innerHTML=open.length?open.map(r=>{
     const d=documents.find(x=>x.id===r.documentId);
     if(!d)return"";
     return`<div class="review-item">
       <div>
         <h3>${MIW.Utils.escape(d.fileName)}</h3>
         <div class="review-badges">
           <span class="badge warn">${MIW.Utils.escape(r.reason)}</span>
           <span class="badge">${MIW.Utils.escape(d.type)}</span>
           <span class="badge">${d.confidence}%</span>
         </div>
         <div class="muted">Patient ${MIW.Utils.escape(d.patientName||"ไม่พบ")} · ${MIW.Utils.escape(d.documentDate||"ไม่พบวันที่")}</div>
       </div>
       <button class="secondary" data-review-document="${d.id}">เปิดตรวจและแก้ไข</button>
     </div>`
   }).join(""):'<div class="muted">ไม่มีเอกสารรอตรวจ</div>'
 }
 async function sendCurrent(){
   const d=MIW.Preview.current();if(!d)return;
   const existing=(await MIW.Database.all("reviewQueue")).find(r=>r.documentId===d.id&&r.status==="OPEN");
   if(!existing)await MIW.Database.put("reviewQueue",{id:MIW.Utils.uid("review"),documentId:d.id,reason:"MANUAL_REVIEW",status:"OPEN",createdAt:new Date().toISOString()});
   await render();await MIW.UploadQueue.refreshMetrics();alert("ส่งเข้า Review Queue แล้ว")
 }
 async function complete(documentId){
   const reviews=(await MIW.Database.all("reviewQueue")).filter(r=>r.documentId===documentId&&r.status==="OPEN");
   for(const review of reviews){
     await MIW.Database.put("reviewQueue",{...review,status:"COMPLETED",completedAt:new Date().toISOString()})
   }
   await render();await MIW.UploadQueue.refreshMetrics()
 }
 return{render,sendCurrent,complete}
})();
