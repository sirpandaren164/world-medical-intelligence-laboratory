window.MIW=window.MIW||{};
MIW.EvidenceEngine=(function(){
 "use strict";
 const VERSION="MIW_EVIDENCE_V1.0";
 const TRUST={
   MANUAL_CORRECTION:100,
   LAB_TRACKER_V15_1_TEMPLATE:92,
   LTX_V15_1_1_SAME_SLOT:92,
   LTX_V15_1_2_SIGNED_GENE_ROW:97,
   LTX_V15_2_CANONICAL_GENE_TABLE:99,
   LTX_V15_7_GRIDLINE_IMMUNE_BAR_GEOMETRY:99,
   LTX_V15_7_GRIDLINE_IMMUNE_ZERO:98,
   LAB_TRACKER_V15_1_TEXT:88,
   LAB_TRACKER_V15_1_ZERO_BAR:86,
   LAB_TRACKER_V15_1_PROXIMITY:58,
   V15_2_UNRESOLVED:0
 };
 function numeric(v){const n=Number(v);return Number.isFinite(n)&&n>=-100&&n<=100?n:null}
 function candidate(rec){
   if(!rec)return null;
   const value=numeric(rec.value);
   if(value===null)return null;
   return {
     value,
     page:rec.page||null,
     confidence:Number(rec.confidence||0),
     evidenceType:rec.evidenceType||"UNKNOWN",
     sourceLine:rec.sourceLine||"",
     sourceMethod:rec.sourceMethod||rec.evidenceType||"UNKNOWN"
   }
 }
 function unique(list){
   const seen=new Set();
   return (list||[]).map(candidate).filter(Boolean).filter(x=>{
     const key=[x.value,x.page,x.evidenceType,x.sourceLine].join("|");
     if(seen.has(key))return false;seen.add(key);return true
   })
 }
 function independentType(t){
   if(/CANONICAL_GENE_TABLE/i.test(t))return"CANONICAL_GENE_TABLE";
   if(/SIGNED_GENE_ROW/i.test(t))return"SIGNED_GENE_ROW";
   if(/GRIDLINE_IMMUNE_BAR_GEOMETRY/i.test(t))return"VISUAL_BAR_GEOMETRY";
   if(/GRIDLINE_IMMUNE_ZERO/i.test(t))return"VISUAL_BAR";
   if(/TEMPLATE/i.test(t))return"OCR_TEMPLATE";
   if(/ZERO_BAR/i.test(t))return"VISUAL_BAR";
   if(/TEXT/i.test(t))return"PDF_TEXT";
   if(/PROXIMITY/i.test(t))return"TEXT_PROXIMITY";
   if(/MANUAL/i.test(t))return"MANUAL";
   return t||"UNKNOWN"
 }
 function reconcile(list,context={}){
   const candidates=unique(list);
   if(!candidates.length)return{
     value:null,status:"REVIEW",verificationStatus:"UNRESOLVED",
     confidence:0,confidenceBand:"LOW",evidence:candidates,
     conflict:false,reason:"ไม่พบหลักฐานตัวเลขที่ยืนยันได้",parserVersion:VERSION
   };
   const groups=new Map();
   for(const c of candidates){
     if(!groups.has(c.value))groups.set(c.value,[]);
     groups.get(c.value).push(c)
   }
   const ranked=[...groups.entries()].map(([value,items])=>{
     const methods=new Set(items.map(x=>independentType(x.evidenceType)));
     const score=items.reduce((s,x)=>s+(TRUST[x.evidenceType]??x.confidence??40),0)+Math.max(0,methods.size-1)*35;
     return{value:Number(value),items,methods,score,maxConf:Math.max(...items.map(x=>x.confidence||0))}
   }).sort((a,b)=>b.score-a.score||b.methods.size-a.methods.size||b.maxConf-a.maxConf);
   const best=ranked[0], runner=ranked[1];
   const conflict=ranked.length>1;
   const strongAgreement=best.methods.size>=2;
   const manual=best.methods.has("MANUAL");
   const explicitZero=best.value===0&&best.methods.has("VISUAL_BAR");
   const highSingle=best.items.some(x=>(TRUST[x.evidenceType]||0)>=90);
   let verificationStatus="REVIEW_REQUIRED",status="REVIEW";
   if(manual){verificationStatus="MANUALLY_VERIFIED";status="VERIFIED"}
   else if(strongAgreement&&!runner){verificationStatus="MULTI_SOURCE_VERIFIED";status="VERIFIED"}
   else if(strongAgreement&&runner&&best.score-runner.score>=45){verificationStatus="MULTI_SOURCE_VERIFIED";status="VERIFIED"}
   else if(explicitZero&&!runner){verificationStatus="VISUAL_ZERO_VERIFIED";status="VERIFIED"}
   else if(highSingle&&!runner){verificationStatus="SINGLE_SOURCE_HIGH_CONFIDENCE";status="PROVISIONAL"}
   const confidence=Math.max(0,Math.min(99,
     manual?99:
     status==="VERIFIED"?Math.round(Math.min(98,78+best.methods.size*8)):
     status==="PROVISIONAL"?Math.round(Math.min(92,best.maxConf||82)):
     Math.round(Math.min(69,best.maxConf||45))
   ));
   const reason=conflict
     ?`พบค่าขัดแย้ง: ${ranked.map(x=>`${x.value}%`).join(" เทียบกับ ")}`
     :verificationStatus==="MULTI_SOURCE_VERIFIED"?"หลักฐานอิสระอย่างน้อย 2 วิธีให้ค่าตรงกัน"
     :verificationStatus==="VISUAL_ZERO_VERIFIED"?"ตรวจไม่พบแท่งเหนือ baseline และไม่มีหลักฐานค่าขัดแย้ง"
     :verificationStatus==="SINGLE_SOURCE_HIGH_CONFIDENCE"?"มีหลักฐานคุณภาพสูงเพียงแหล่งเดียว จึงยังเป็น Provisional"
     :verificationStatus==="MANUALLY_VERIFIED"?"ผู้ใช้ตรวจและแก้ไขจากต้นฉบับ"
     :"หลักฐานยังไม่เพียงพอ ต้องตรวจต้นฉบับ";
   return{
     value:best.value,status,verificationStatus,confidence,
     confidenceBand:confidence>=85?"HIGH":confidence>=70?"MEDIUM":"LOW",
     evidence:candidates,conflict,alternatives:ranked.slice(1).map(x=>x.value),
     reason,parserVersion:VERSION
   }
 }
 function manual(value,page,sourceLine="ผู้ใช้ตรวจแก้จากต้นฉบับ"){
   return{value:Number(value),page:page||null,confidence:100,evidenceType:"MANUAL_CORRECTION",sourceLine,sourceMethod:"MANUAL"}
 }
 return{VERSION,reconcile,manual};
})();
