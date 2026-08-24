window.MIW=window.MIW||{};
MIW.InBodyInterpretation=(function(){
 const BUILD="10.307-patient-friendly-inbody-language";
 const PARTS=[
  {key:"right_arm",th:"แขนขวา",en:"Right arm"},
  {key:"left_arm",th:"แขนซ้าย",en:"Left arm"},
  {key:"trunk",th:"ลำตัว",en:"Trunk"},
  {key:"right_leg",th:"ขาขวา",en:"Right leg"},
  {key:"left_leg",th:"ขาซ้าย",en:"Left leg"}
 ];
 function txt(v){return String(v??"").trim()}
 function num(v){const n=parseFloat(txt(v).replace(/,/g,"").replace(/[<>≈=]/g,""));return Number.isFinite(n)?n:null}
 function codeOf(r){return txt(r?.testCode||r?.test_code).toLowerCase()}
 function dateOf(r){return txt(r?.date||r?.resultDate||r?.result_date||r?.specimenDate||r?.specimen_date)}
 function valueOf(r){return num(r?.valueNumeric??r?.value_numeric??r?.value)}
 function refRaw(r){return txt(r?.reference||r?.referenceRaw||r?.reference_raw||r?.reported_reference_raw)}
 function unitOf(r){return txt(r?.unit||r?.reportedUnit||r?.reported_unit)}
 function tr(lang,th,en){return /^en/i.test(lang)?en:th}
 function format(n,digits=1){return Number.isFinite(n)?Number(n.toFixed(digits)).toString():"—"}
 function close(a,b,tol=.15){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol}
 function mapLatest(rows){
  const m=new Map();
  (rows||[]).forEach(r=>{if(r?.selected===false||r?.inbody_clinical_excluded||r?.inbody_source_quarantined)return;const c=codeOf(r);if(!c)return;const old=m.get(c);if(!old||dateOf(r)>=dateOf(old))m.set(c,r)});
  return m
 }
 function parseReference(raw){
  const s=txt(raw).replace(/[−–—~～]/g,"-").replace(/,/g,".");
  if(!s)return{low:null,high:null,raw:""};
  let m=s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to|–|—|~)\s*(-?\d+(?:\.\d+)?)/i);
  if(m)return{low:Number(m[1]),high:Number(m[2]),raw:s};
  m=s.match(/(?:<=|≤|<)\s*(-?\d+(?:\.\d+)?)/);if(m)return{low:null,high:Number(m[1]),raw:s};
  m=s.match(/(?:>=|≥|>)\s*(-?\d+(?:\.\d+)?)/);if(m)return{low:Number(m[1]),high:null,raw:s};
  return{low:null,high:null,raw:s}
 }
 function sourceClass(row){
  if(!row)return"missing";const n=valueOf(row),ref=parseReference(refRaw(row));if(n===null)return"context";
  if(Number.isFinite(ref.low)&&n<ref.low)return"low";
  if(Number.isFinite(ref.high)&&n>ref.high)return"high";
  if(Number.isFinite(ref.low)||Number.isFinite(ref.high))return"within";
  return"context"
 }
 function valueLabel(row){if(!row)return"—";const v=txt(row.value??row.value_raw??row.valueNumeric??row.value_numeric),u=unitOf(row);return`${v||"—"}${u?` ${u}`:""}`}
 function referenceLabel(row,lang){const raw=refRaw(row);return raw?tr(lang,`ช่วงอ้างอิงจากต้นฉบับ ${raw}`,`Source-report reference ${raw}`):tr(lang,"ต้นฉบับไม่พิมพ์ช่วงอ้างอิงเป็นตัวเลข","No numeric reference interval printed in the source")}
 function partLabel(part,lang){return tr(lang,part.th,part.en)}
 function segmentRows(latest,suffix){return PARTS.map(part=>({part,row:latest.get(`inbody_segment_${part.key}_${suffix}`)})).filter(x=>x.row&&valueOf(x.row)!==null)}
 function segmentStats(latest,suffix){
  const rows=segmentRows(latest,suffix),values=rows.map(x=>valueOf(x.row)).filter(Number.isFinite);
  if(!values.length)return{rows,values,min:null,max:null,lowest:null,highest:null};
  const low=Math.min(...values),high=Math.max(...values);
  return{rows,values,min:low,max:high,lowest:rows.find(x=>valueOf(x.row)===low)||null,highest:rows.find(x=>valueOf(x.row)===high)||null}
 }
 function buildTrend(rows,codes,lang){
  const cards=[];
  for(const code of codes){
   const arr=(rows||[]).filter(r=>codeOf(r)===code&&valueOf(r)!==null).sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
   const unique=[];const seen=new Set();for(const r of arr){const k=`${dateOf(r)}|${valueOf(r)}`;if(!seen.has(k)){seen.add(k);unique.push(r)}}
   if(unique.length<2)continue;
   const a=unique.at(-2),b=unique.at(-1),av=valueOf(a),bv=valueOf(b),delta=bv-av;
   const names={inbody_weight:["น้ำหนัก","Weight"],inbody_skeletal_muscle_mass:["มวลกล้ามเนื้อลาย","Skeletal muscle mass"],inbody_body_fat_mass:["มวลไขมัน","Body fat mass"],inbody_percent_body_fat:["ไขมันร้อยละ","Percent body fat"],inbody_visceral_fat_area:["ไขมันช่องท้อง","Visceral fat area"],inbody_ecw_tbw:["ECW/TBW","ECW/TBW"]};
   const name=(names[code]||[code,code])[/^en/i.test(lang)?1:0];
   cards.push({code,name,previous:valueLabel(a),latest:valueLabel(b),previousDate:dateOf(a),latestDate:dateOf(b),direction:Math.abs(delta)<1e-9?"stable":delta>0?"up":"down",delta})
  }
  return{available:cards.length>0,cards}
 }
 function build(rows,options={}){
  const lang=options.lang||"th",latest=mapLatest(options.latestRows?.length?options.latestRows:rows),allRows=rows||[];
  if(![...latest.keys()].some(c=>c.startsWith("inbody_")))return{available:false,build:BUILD};
  const get=c=>latest.get(c);
  const adiposityCodes=["inbody_body_fat_mass","inbody_percent_body_fat","inbody_bmi","inbody_obesity_degree"];
  const adiposityRows=adiposityCodes.map(get).filter(Boolean),adiposityHigh=adiposityRows.filter(r=>sourceClass(r)==="high").length,adiposityMeasured=adiposityRows.filter(r=>["high","low","within"].includes(sourceClass(r))).length;
  const smm=get("inbody_skeletal_muscle_mass"),smmClass=sourceClass(smm),pbf=get("inbody_percent_body_fat"),bfm=get("inbody_body_fat_mass"),bmi=get("inbody_bmi"),vfa=get("inbody_visceral_fat_area"),ecw=get("inbody_ecw_tbw"),bmr=get("inbody_bmr"),weight=get("inbody_weight"),target=get("inbody_target_weight"),wc=get("inbody_weight_control"),fc=get("inbody_fat_control"),mc=get("inbody_muscle_control");
  const coreRows=[weight,smm,bfm,bmi,pbf],coreReady=coreRows.every(r=>r&&valueOf(r)!==null&&!r.inbody_source_quarantined&&!r.inbody_clinical_excluded);
  if(!coreReady)return{available:false,build:BUILD,reason:"INBODY_SOURCE_CORE_INCOMPLETE",missing:["inbody_weight","inbody_skeletal_muscle_mass","inbody_body_fat_mass","inbody_bmi","inbody_percent_body_fat"].filter(c=>!get(c)||valueOf(get(c))===null||get(c)?.inbody_source_quarantined||get(c)?.inbody_clinical_excluded)};
  const highAdiposity=adiposityHigh>=2||(sourceClass(pbf)==="high"&&sourceClass(bfm)==="high");

  // v10.301: Global SMM and segmental lean are deliberately interpreted as separate layers.
  const segLean=segmentStats(latest,"lean_pct"),segBelow=segLean.rows.filter(x=>valueOf(x.row)<100),segBelowIdeal=segBelow.length,allSegmentalLeanBelow=segLean.rows.length>=3&&segBelowIdeal===segLean.rows.length;
  const segFatMass=segmentStats(latest,"fat_mass"),segFatPct=segmentStats(latest,"fat_pct"),segEcw=segmentStats(latest,"ecw_tbw"),segEcf=segmentStats(latest,"ecf_tbf");
  const lowestLean=segLean.lowest;

  let patternTone="context",patternTitle=tr(lang,"ข้อมูลยังไม่พอสำหรับจัดรูปแบบองค์ประกอบร่างกาย","Insufficient source data for a body-composition pattern"),patternSummary=tr(lang,"MIW จะแสดงเฉพาะข้อสรุปที่รองรับด้วยค่าจาก InBody และช่วงอ้างอิงที่พิมพ์ในต้นฉบับ","MIW only summarizes patterns supported by InBody values and source-printed reference intervals");
  if(highAdiposity&&smmClass==="within"&&allSegmentalLeanBelow){
   patternTone="attention";
   patternTitle=tr(lang,"ไขมันสูง โดยมวลกล้ามเนื้อรวมยังอยู่ในช่วง แต่กล้ามเนื้อรายส่วนต่ำกว่าเป้าหมายของเครื่องทุกส่วน","High adiposity with preserved total SMM but segmental lean below device ideal in all measured regions");
   patternSummary=tr(lang,`ภาพรวมเด่นด้วยไขมันเกินช่วงที่ต้นฉบับรายงาน ขณะที่ SMM รวมยังอยู่ในช่วงอ้างอิง แต่ Lean / Ideal Lean ต่ำกว่า 100% ครบ ${segLean.rows.length} ส่วน${lowestLean?` โดยต่ำสุดที่${partLabel(lowestLean.part,lang)} ${format(valueOf(lowestLean.row))}% ideal`:""} จึงควรอ่านเป็น body-recomposition pattern ไม่ใช่สรุปว่า “กล้ามเนื้อปกติทั้งหมด”`,`The dominant pattern is excess adiposity by source-reported ranges while total SMM remains within range; however, Lean / Ideal Lean is below 100% in all ${segLean.rows.length} measured regions${lowestLean?`, lowest at ${partLabel(lowestLean.part,lang)} ${format(valueOf(lowestLean.row))}% ideal`:""}. This supports a body-recomposition pattern rather than labeling muscle status as globally normal`)
  }else if(highAdiposity&&smmClass==="within"){
   patternTone="attention";patternTitle=tr(lang,"ไขมันสูงร่วมกับมวลกล้ามเนื้อรวมยังอยู่ในช่วงอ้างอิง","High adiposity with preserved overall skeletal muscle mass");
   patternSummary=tr(lang,`รูปแบบเด่นคือไขมันเกินช่วงที่เครื่องรายงาน ขณะที่ SMM โดยรวมยังอยู่ในช่วงอ้างอิง${segLean.rows.length?` และ Segmental Lean ต่ำกว่า ideal ${segBelowIdeal}/${segLean.rows.length} ส่วน`:""} จึงควรติดตามการลดไขมันโดยรักษาหรือเพิ่มกล้ามเนื้อ มากกว่าดูน้ำหนักอย่างเดียว`,`The dominant pattern is excess adiposity by source-reported ranges while overall SMM remains within range${segLean.rows.length?`; segmental lean is below device ideal in ${segBelowIdeal}/${segLean.rows.length} regions`:""}. Follow fat reduction while preserving or improving muscle rather than weight alone`)
  }else if(highAdiposity&&smmClass==="low"){
   patternTone="attention";patternTitle=tr(lang,"ไขมันสูงร่วมกับมวลกล้ามเนื้อรวมต่ำกว่าช่วงอ้างอิง","High adiposity with low overall skeletal muscle mass");
   patternSummary=tr(lang,"ทั้งองค์ประกอบไขมันและมวลกล้ามเนื้อควรถูกติดตามร่วมกัน ไม่ควรตั้งเป้าลดน้ำหนักโดยไม่คำนึงถึงการรักษากล้ามเนื้อ","Both adiposity and muscle mass warrant follow-up; weight reduction should not be pursued without attention to muscle preservation")
  }else if(adiposityMeasured>=2&&adiposityHigh===0&&smmClass==="within"){
   patternTone="good";patternTitle=tr(lang,"องค์ประกอบร่างกายหลักอยู่ในช่วงที่ต้นฉบับรายงาน","Major body-composition measures are within source-reported ranges");
   patternSummary=tr(lang,segLean.rows.length?`SMM รวมอยู่ในช่วงอ้างอิง และควรตรวจ Segmental Lean แยกต่อเพื่อไม่ให้ค่าเฉลี่ยรวมบดบังความแตกต่างรายส่วน`:`ยังควรใช้แนวโน้มหลายครั้งและสภาวะการวัดที่ใกล้เคียงกันในการติดตาม`,segLean.rows.length?`Total SMM is within range; segmental lean should still be reviewed separately so the global value does not obscure regional differences`:`Serial trends under comparable measurement conditions remain more informative than a single measurement`)
  }

  const domains=[];
  domains.push({id:"fat",tone:highAdiposity?"attention":adiposityMeasured?"good":"context",title:tr(lang,"ไขมันในร่างกาย","Body fat / adiposity"),headline:highAdiposity?tr(lang,"มีหลายค่าที่สูงกว่าช่วงอ้างอิงจากต้นฉบับ","Multiple measures exceed source-reported ranges"):tr(lang,"อ่านร่วมกันหลายค่า","Interpret multiple measures together"),detail:tr(lang,`ประเมินจาก PBF, มวลไขมัน, BMI และ Obesity Degree โดยใช้เฉพาะช่วงที่พิมพ์ในต้นฉบับ; พบ ${adiposityHigh} จาก ${adiposityMeasured||adiposityRows.length} ค่าที่จัดได้ว่าเกินช่วง`,`Based on PBF, body fat mass, BMI and obesity degree using only source-printed ranges; ${adiposityHigh} of ${adiposityMeasured||adiposityRows.length} classifiable measures are above range`),evidence:[pbf,bfm,bmi].filter(Boolean).map(r=>`${r.name||codeOf(r)}: ${valueLabel(r)} · ${referenceLabel(r,lang)}`)});

  let muscleHeadline=smm?`${tr(lang,"SMM","SMM")} ${valueLabel(smm)} · ${smmClass==="within"?tr(lang,"อยู่ในช่วงอ้างอิง","within source range"):smmClass==="low"?tr(lang,"ต่ำกว่าช่วงอ้างอิง","below source range"):smmClass==="high"?tr(lang,"สูงกว่าช่วงอ้างอิง","above source range"):tr(lang,"ต้องอาศัยบริบท","context required")}`:tr(lang,"ยังไม่มี SMM ที่ยืนยัน","No verified SMM");
  if(segLean.rows.length)muscleHeadline+=tr(lang,` · Segmental Lean ต่ำกว่า ideal ${segBelowIdeal}/${segLean.rows.length} ส่วน`,` · Segmental lean below device ideal in ${segBelowIdeal}/${segLean.rows.length} regions`);
  let muscleDetail=tr(lang,"ควรดู SMM ร่วมกับ segmental lean และสมรรถภาพจริง","Review SMM together with segmental lean and functional performance");
  if(segLean.rows.length){
   const range=`${format(segLean.min)}–${format(segLean.max)}% ideal`;
   muscleDetail=tr(lang,`SMM รวมและ Segmental Lean เป็นคนละชั้นข้อมูล: ค่า Segmental Lean / Ideal Lean อยู่ที่ ${range}${allSegmentalLeanBelow?" และต่ำกว่า 100% ทุกส่วน":""}${lowestLean?` โดยต่ำสุดคือ${partLabel(lowestLean.part,lang)} ${format(valueOf(lowestLean.row))}% ideal`:""}. 100% เป็น ideal ของเครื่อง ไม่ใช่เกณฑ์วินิจฉัย sarcopenia; หากต้องการวินิจฉัยต้องใช้ strength / physical performance และเกณฑ์ที่เหมาะสมร่วม`,`Total SMM and segmental lean are separate information layers: Segmental Lean / Ideal Lean spans ${range}${allSegmentalLeanBelow?" and is below 100% in every measured region":""}${lowestLean?`, lowest at ${partLabel(lowestLean.part,lang)} ${format(valueOf(lowestLean.row))}% ideal`:""}. The 100% value is a device ideal, not a sarcopenia diagnostic cutoff; diagnosis requires appropriate strength/physical-performance criteria`)
  }
  domains.push({id:"muscle",tone:smmClass==="low"||segBelowIdeal?"followup":smmClass==="within"?"good":"context",title:tr(lang,"มวลกล้ามเนื้อ","Muscle mass"),headline:muscleHeadline,detail:muscleDetail,evidence:[smm,...segLean.rows.map(x=>x.row)].filter(Boolean).slice(0,6).map(r=>`${r.name||codeOf(r)}: ${valueLabel(r)}`)});

  domains.push({id:"visceral",tone:sourceClass(vfa)==="high"?"attention":"context",title:tr(lang,"ไขมันช่องท้อง","Visceral fat"),headline:vfa?`VFA ${valueLabel(vfa)}`:tr(lang,"ยังไม่มี VFA ที่ยืนยัน","No verified VFA"),detail:vfa?tr(lang,`${referenceLabel(vfa,lang)}. ถ้าต้นฉบับมีเพียงกราฟแต่ไม่ได้เก็บ cutoff เป็นตัวเลขที่ยืนยัน MIW จะไม่เปลี่ยนกราฟให้เป็น diagnostic threshold เอง; ควรดูร่วมกับ glucose/HbA1c, lipid, WHR และภาวะไขมันพอกตับเมื่อมีข้อมูล`,`${referenceLabel(vfa,lang)}. If the source provides only a graph and no verified numeric cutoff is stored, MIW does not convert that graph into a diagnostic threshold; correlate with glucose/HbA1c, lipids, WHR and fatty-liver context when available`):tr(lang,"ไม่มีข้อมูลเพียงพอ","Insufficient data"),evidence:vfa?[`${vfa.name||"VFA"}: ${valueLabel(vfa)}`]:[]});

  const bmrClass=sourceClass(bmr);
  domains.push({id:"metabolic",tone:bmrClass==="low"||bmrClass==="high"?"followup":"context",title:tr(lang,"อัตราการเผาผลาญพื้นฐาน (BMR)","BMR / energy context"),headline:bmr?`${tr(lang,"BMR","BMR")} ${valueLabel(bmr)} · ${bmrClass==="low"?tr(lang,"ต่ำกว่าช่วงที่ต้นฉบับพิมพ์","below source-reported range"):bmrClass==="high"?tr(lang,"สูงกว่าช่วงที่ต้นฉบับพิมพ์","above source-reported range"):bmrClass==="within"?tr(lang,"อยู่ในช่วงที่ต้นฉบับพิมพ์","within source-reported range"):tr(lang,"ไม่มีช่วงตัวเลขที่ยืนยัน","no verified numeric interval")}`:tr(lang,"ยังไม่มี BMR ที่ยืนยัน","No verified BMR"),detail:bmr?tr(lang,`${referenceLabel(bmr,lang)}. BMR จาก InBody เป็นค่าประมาณจากแบบจำลองของเครื่อง ใช้ประกอบการติดตามองค์ประกอบร่างกายได้ แต่ไม่ควรนำไปเป็น calorie prescription โดยอัตโนมัติ`,`${referenceLabel(bmr,lang)}. InBody BMR is a device-derived estimate useful for body-composition context, but it should not automatically become a calorie prescription`):tr(lang,"ไม่มีข้อมูลเพียงพอ","Insufficient data"),evidence:bmr?[`${bmr.name||"BMR"}: ${valueLabel(bmr)}`]:[]});

  let fluidHeadline=ecw?`ECW/TBW ${valueLabel(ecw)}`:tr(lang,"ยังไม่มี ECW/TBW ที่ยืนยัน","No verified ECW/TBW");
  if(segEcw.values.length)fluidHeadline+=tr(lang,` · รายส่วน ${format(segEcw.min,3)}–${format(segEcw.max,3)}`,` · segmental ${format(segEcw.min,3)}–${format(segEcw.max,3)}`);
  domains.push({id:"fluid",tone:"context",title:tr(lang,"สมดุลน้ำในร่างกาย","Fluid balance"),headline:fluidHeadline,detail:tr(lang,"อ่าน whole-body และ segmental ECW/TBW แยกกันและดูแนวโน้มภายใต้สภาวะการวัดใกล้เคียงกัน ไม่วินิจฉัยภาวะบวมหรือคั่งน้ำจาก BIA ค่าเดียว; ควรดูอาการ น้ำหนัก ไต หัวใจ ตับ และ albumin ร่วมเมื่อมีข้อบ่งชี้","Read whole-body and segmental ECW/TBW as separate layers and follow trends under comparable measurement conditions. Do not diagnose edema or fluid overload from a single BIA value; correlate with symptoms, weight, renal/cardiac/hepatic status and albumin when indicated"),evidence:[ecw,...segEcw.rows.map(x=>x.row)].filter(Boolean).slice(0,6).map(r=>`${r.name||codeOf(r)}: ${valueLabel(r)}`)});

  const segmentSummary=[];
  const armR=get("inbody_segment_right_arm_lean_pct"),armL=get("inbody_segment_left_arm_lean_pct"),legR=get("inbody_segment_right_leg_lean_pct"),legL=get("inbody_segment_left_leg_lean_pct");
  if(valueOf(armR)!==null&&valueOf(armL)!==null)segmentSummary.push(tr(lang,`แขนขวา ${format(valueOf(armR))}% vs แขนซ้าย ${format(valueOf(armL))}% ideal`,`Right arm ${format(valueOf(armR))}% vs left arm ${format(valueOf(armL))}% ideal`));
  if(valueOf(legR)!==null&&valueOf(legL)!==null)segmentSummary.push(tr(lang,`ขาขวา ${format(valueOf(legR))}% vs ขาซ้าย ${format(valueOf(legL))}% ideal`,`Right leg ${format(valueOf(legR))}% vs left leg ${format(valueOf(legL))}% ideal`));
  let segmentDetail=segmentSummary.join(" · ")||tr(lang,"เปรียบเทียบซ้าย-ขวาและแขน-ขาโดยไม่สร้าง cutoff ความไม่สมดุลขึ้นเอง","Compare left-right and upper-lower distribution without inventing an asymmetry cutoff");
  if(segFatMass.rows.length||segFatPct.rows.length)segmentDetail+=tr(lang," · ต้นฉบับ InBody ระบุว่า Segmental fat is estimated จึงควรใช้เป็นค่าประมาณของเครื่อง ไม่ใช่การวัดไขมันรายส่วนโดยตรง"," · The InBody source states that segmental fat is estimated; treat it as a device estimate rather than a direct regional-fat measurement");
  domains.push({id:"segmental",tone:segBelowIdeal?"followup":"context",title:tr(lang,"กล้ามเนื้อและไขมันรายส่วน","Segmental balance"),headline:segLean.rows.length?tr(lang,`Lean / Ideal Lean ${format(segLean.min)}–${format(segLean.max)}% · ต่ำกว่า ideal ${segBelowIdeal}/${segLean.rows.length} ส่วน`,`Lean / Ideal Lean ${format(segLean.min)}–${format(segLean.max)}% · below device ideal in ${segBelowIdeal}/${segLean.rows.length} regions`):tr(lang,"ข้อมูลรายส่วนยังไม่ครบ","Segmental data incomplete"),detail:segmentDetail,evidence:[...segLean.rows.map(x=>x.row),...segFatMass.rows.map(x=>x.row)].filter(Boolean).slice(0,6).map(r=>`${r.name||codeOf(r)}: ${valueLabel(r)}`)});

  const wv=valueOf(weight),targetv=valueOf(target),wcv=valueOf(wc),fcv=valueOf(fc),mcv=valueOf(mc);
  const controlEq1=wv!==null&&wcv!==null&&targetv!==null&&close(wv+wcv,targetv,.15),controlEq2=fcv!==null&&mcv!==null&&wcv!==null&&close(fcv+mcv,wcv,.15),controlConsistent=controlEq1&&controlEq2;
  let weightDetail=tr(lang,"Weight Control เป็นเป้าหมายจากอัลกอริทึมของเครื่อง ไม่ใช่คำสั่งลดน้ำหนักทางการแพทย์","Weight Control is a device-derived target, not an automatic medical weight-loss prescription");
  if(wcv!==null||fcv!==null||mcv!==null){
   const parts=[];if(targetv!==null)parts.push(tr(lang,`น้ำหนักเป้าหมาย ${format(targetv)} kg`,`target weight ${format(targetv)} kg`));if(wcv!==null)parts.push(tr(lang,`ปรับน้ำหนัก ${wcv>0?"+":""}${format(wcv)} kg`,`weight control ${wcv>0?"+":""}${format(wcv)} kg`));if(fcv!==null)parts.push(tr(lang,`ไขมัน ${fcv>0?"+":""}${format(fcv)} kg`,`fat ${fcv>0?"+":""}${format(fcv)} kg`));if(mcv!==null)parts.push(tr(lang,`กล้ามเนื้อ ${mcv>0?"+":""}${format(mcv)} kg`,`muscle ${mcv>0?"+":""}${format(mcv)} kg`));
   weightDetail=`${parts.join(" · ")}. ${tr(lang,"ควรใช้เป็นแนวทาง body recomposition และทบทวนความเหมาะสมกับภาวะทางคลินิก ไม่ใช่ prescription อัตโนมัติ","Use as a body-recomposition planning signal and review against the clinical context; it is not an automatic prescription")}`;
   if(controlConsistent)weightDetail+=tr(lang,` · Source bundle สอดคล้องภายใน: ${format(wv)} + (${format(wcv)}) = ${format(targetv)} kg และ ${format(fcv)} + ${format(mcv)} = ${format(wcv)} kg`,` · Source bundle is internally consistent: ${format(wv)} + (${format(wcv)}) = ${format(targetv)} kg and ${format(fcv)} + ${format(mcv)} = ${format(wcv)} kg`)
  }
  domains.push({id:"weight",tone:"context",title:tr(lang,"เป้าหมายการปรับองค์ประกอบร่างกายจากเครื่อง","Device-derived Weight Control"),headline:(fcv!==null&&mcv!==null&&fcv<0&&mcv>0)?tr(lang,"เป้าหมายของเครื่องคือ ลดไขมันพร้อมเพิ่มกล้ามเนื้อ","Device target is body recomposition: fat reduction with muscle gain"):tr(lang,"อ่านเป้าหมายการลดไขมันและการปรับกล้ามเนื้อร่วมกัน","Read Fat Control and Muscle Control together"),detail:weightDetail,evidence:[target,wc,fc,mc].filter(Boolean).map(r=>`${r.name||codeOf(r)}: ${valueLabel(r)}`)});

  const priorities=[];
  if(highAdiposity)priorities.push({tone:"attention",title:tr(lang,"ลดไขมันส่วนเกินโดยไม่ดูน้ำหนักอย่างเดียว","Reduce excess adiposity without focusing on weight alone"),detail:tr(lang,"ติดตามร้อยละไขมัน มวลไขมัน อัตราส่วนเอวต่อสะโพก และไขมันช่องท้องเมื่อมีข้อมูล โดยดูแนวโน้มหลายครั้งมากกว่าค่าครั้งเดียว","Track PBF, body fat mass, WHR/VFA when available and prioritize serial trends over a single reading")});
  if(segBelowIdeal)priorities.push({tone:"followup",title:tr(lang,"รักษา/เพิ่มกล้ามเนื้อ โดยดูมวลกล้ามเนื้อรายส่วนแยกจากมวลกล้ามเนื้อรวม","Preserve/improve muscle using segmental lean separately from total SMM"),detail:tr(lang,lowestLean?`Segmental Lean ต่ำสุดที่${partLabel(lowestLean.part,lang)} ${format(valueOf(lowestLean.row))}% ideal; ควรเชื่อมกับ strength และ physical performance เมื่อมีข้อบ่งชี้`:`ทบทวนรายส่วนร่วมกับ strength และ physical performance เมื่อมีข้อบ่งชี้`,lowestLean?`Lowest segmental lean is ${partLabel(lowestLean.part,lang)} at ${format(valueOf(lowestLean.row))}% ideal; correlate with strength and physical performance when indicated`:`Review regional lean together with strength and physical performance when indicated`)});
  else priorities.push({tone:"good",title:tr(lang,"รักษาหรือพัฒนามวลกล้ามเนื้อ","Preserve or improve muscle mass"),detail:tr(lang,"ติดตาม SMM และ segmental lean ควบคู่กับสมรรถภาพ/กำลังกล้ามเนื้อเมื่อเหมาะสม","Track SMM and segmental lean together with functional/strength assessment when appropriate")});
  if(vfa)priorities.push({tone:"context",title:tr(lang,"ติดตามไขมันช่องท้อง","Monitor visceral fat"),detail:tr(lang,"ดูแนวโน้ม VFA ร่วมกับปัจจัยเสี่ยงเมตาบอลิก โดยไม่สร้าง cutoff เพิ่มหากต้นฉบับไม่ได้ระบุเป็นตัวเลขที่ยืนยัน","Trend VFA with metabolic risk factors without inventing a cutoff when the source does not provide a verified numeric threshold")});
  if(bmr&&["low","high"].includes(bmrClass))priorities.push({tone:"followup",title:tr(lang,"ทบทวน BMR เป็นบริบท ไม่ใช่ calorie prescription","Use BMR as context, not a calorie prescription"),detail:tr(lang,"ติดตามร่วมกับน้ำหนัก มวลกล้ามเนื้อ อาหาร กิจกรรม และเป้าหมายทางคลินิก","Review alongside weight, muscle mass, nutrition, activity and clinical goals")});
  if(ecw||segEcw.values.length)priorities.push({tone:"context",title:tr(lang,"ติดตามสมดุลน้ำในร่างกายเมื่อมีบริบททางคลินิก","Monitor fluid balance when clinically relevant"),detail:tr(lang,"ตรวจซ้ำภายใต้ภาวะน้ำในร่างกาย อาหาร และกิจกรรมที่ใกล้เคียงกัน เพื่อให้เปรียบเทียบแนวโน้มได้","Repeat under similar hydration, food and activity conditions for comparable trends")});

  const sourceNotes=[];
  if(segFatMass.rows.length||segFatPct.rows.length)sourceNotes.push(tr(lang,"ต้นฉบับ InBody ระบุ “Segmental fat is estimated” — ค่ารายส่วนของไขมันจึงเป็นค่าประมาณจากอัลกอริทึมของเครื่อง","The InBody source states “Segmental fat is estimated” — regional fat values are device-estimated rather than directly measured"));
  if(segLean.rows.length)sourceNotes.push(tr(lang,"Lean / Ideal Lean ×100 (%) เป็นค่าร้อยละเทียบ Ideal Lean ของเครื่อง ไม่ใช่เกณฑ์วินิจฉัย sarcopenia","Lean / Ideal Lean ×100 (%) is relative to the device's Ideal Lean and is not a sarcopenia diagnostic cutoff"));
  if(bmr)sourceNotes.push(tr(lang,"อัตราการเผาผลาญพื้นฐาน (BMR) เป็นค่าประมาณจากเครื่อง ไม่ใช่ปริมาณพลังงานที่ควรรับประทานต่อวันโดยอัตโนมัติ","BMR is a device-derived estimate and is not automatically the recommended daily caloric intake"));

  const trend=buildTrend(allRows,["inbody_weight","inbody_skeletal_muscle_mass","inbody_body_fat_mass","inbody_percent_body_fat","inbody_visceral_fat_area","inbody_ecw_tbw"],lang);
  return{available:true,build:BUILD,lang,pattern:{tone:patternTone,title:patternTitle,summary:patternSummary},domains,priorities,sourceNotes,trend,sourceRule:tr(lang,"Source Truth: ตัวเลขและช่วงอ้างอิงมาจาก InBody ที่ยืนยันแล้ว; Clinical Interpretation เป็นชั้นคำอธิบายของ MIW และจะไม่เขียนทับค่าต้นฉบับ","Source Truth: values and reference intervals come from verified InBody data; Clinical Interpretation is an MIW explanatory layer and never overwrites source values"),diagnosticCaution:tr(lang,"การแปลผลนี้ไม่ใช่การวินิจฉัย sarcopenia, edema, metabolic syndrome หรือคำสั่งลดน้ำหนักโดยอัตโนมัติ ต้องใช้ร่วมกับอาการ การตรวจร่างกาย สมรรถภาพ และข้อมูลทางคลินิก","This interpretation is not an automatic diagnosis of sarcopenia, edema or metabolic syndrome and is not a weight-loss prescription; correlate with symptoms, examination, functional assessment and clinical data")}
 }
 return{build,parseReference,sourceClass,valueLabel,buildId:BUILD,__test:{mapLatest,buildTrend,segmentStats}}
})();
