window.MIW=window.MIW||{};
MIW.RgccInterpretation=(function(){
 const VERSION="MIW_RGCC_4L_1.2";
 function text(value){return String(value??"").trim()}
 function code(row){return text(row?.testCode??row?.test_code)}
 function reportType(row){
   if(/ONCOTRAIL/.test(text(row?.reportType??row?.specializedProfile??row?.specialized_profile).toUpperCase())||/^oncotrail_/.test(code(row)))return"RGCC_ONCOTRAIL";
   if(/METASTAT/.test(text(row?.reportType??row?.specializedProfile??row?.specialized_profile).toUpperCase())||/^metastat_/.test(code(row)))return"RGCC_METASTAT";
   return""
 }
 function numeric(value){
   const n=parseFloat(text(value).replace(/[<>,]/g,""));
   return Number.isFinite(n)?n:null
 }
 function valueLabel(row){
   const value=row?.value??row?.reportedValue??row?.reported_value_raw??"—";
   return`${value}${row?.unit?` ${row.unit}`:""}`
 }
 function dateLabel(row){return text(row?.date??row?.result_date)||(isEnglishMode()?"Date not specified":"ไม่ระบุวันที่")}
 function rowPage(row){
   const page=row?.sourcePageNumber??row?.source_page_number??row?.page;
   return page===null||page===undefined||page===""?null:Number(page)
 }
 function sourceRaw(row){
   return text(row?.sourceRawText??row?.source_raw_text??row?.sourceLine??row?.source_line)||
     text((Array.isArray(row?.sourceEvidence)?row.sourceEvidence:[]).find(item=>text(item?.raw_line))?.raw_line)
 }
 function evidence(row){
   if(!row)return null;
   return{
     resultId:text(row.id),documentId:text(row.documentId??row.document_id),reportType:reportType(row),
     date:dateLabel(row),page:rowPage(row),name:text(row.name??row.display_name),value:valueLabel(row),
     reportedResult:text(row.reportedResult??row.reported_result??row.flag),rawText:sourceRaw(row),
     sourceFile:text(row.sourceFile??row.source_file??row.source)
   }
 }
 function uniqueEvidence(source){
   const seen=new Set();
   return source.map(item=>item&&item.name?item:evidence(item)).filter(Boolean).filter(item=>{
     const key=[item.resultId,item.documentId,item.page,item.name,item.value].join("|");
     if(seen.has(key))return false;seen.add(key);return true
   })
 }
 function samePatientRows(allRows,selected){
   const patientId=text(selected?.patientId??selected?.patient_id);
   return (Array.isArray(allRows)?allRows:[]).filter(row=>!patientId||text(row?.patientId??row?.patient_id)===patientId)
 }
 function latestDate(rows){return rows.map(row=>text(row?.date)).filter(Boolean).sort().at(-1)||""}
 function latestReportRows(rows,type,preferredDate){
   const typed=rows.filter(row=>reportType(row)===type);
   if(!typed.length)return[];
   const date=preferredDate&&typed.some(row=>text(row?.date)===preferredDate)?preferredDate:latestDate(typed);
   const dated=date?typed.filter(row=>text(row?.date)===date):typed;
   const documentIds=[...new Set(dated.map(row=>text(row?.documentId??row?.document_id)).filter(Boolean))];
   if(documentIds.length){
     const latestId=documentIds.at(-1);
     return dated.filter(row=>text(row?.documentId??row?.document_id)===latestId)
   }
   return dated
 }
 function currentReportRows(patientRows,selected){
   const selectedType=reportType(selected),documentId=text(selected?.documentId??selected?.document_id);
   if(documentId){
     const exact=patientRows.filter(row=>text(row?.documentId??row?.document_id)===documentId);
     if(exact.length)return exact
   }
   return patientRows.filter(row=>reportType(row)===selectedType&&(!text(selected?.date)||text(row?.date)===text(selected.date)))
 }
 function findCode(rows,target){return rows.find(row=>code(row)===target)}
 function reported(row){return text(row?.reportedResult??row?.reported_result??row?.value)}
 function positiveOncoMarkers(rows){
   return rows.filter(row=>/^oncotrail_(?:cd45_pos|cd45_neg)_/.test(code(row))&&/(?:Positive|Dim)/i.test(reported(row)))
 }
 function positiveOrDim(row){return Boolean(row&&/(?:Positive|Dim)/i.test(reported(row)))}
 function negativeResult(row){return Boolean(row&&/Negative/i.test(reported(row)))}
 function oncotrailPhenotypeSignals(rows){
   const epithelial=["oncotrail_cd45_neg_panck","oncotrail_cd45_neg_epcam"].map(target=>findCode(rows,target)).filter(positiveOrDim);
   const stemLike=["oncotrail_cd45_neg_cd133","oncotrail_cd45_neg_nanog","oncotrail_cd45_neg_sox2","oncotrail_cd45_neg_okt4"].map(target=>findCode(rows,target)).filter(positiveOrDim);
   const cmet=findCode(rows,"oncotrail_cd45_neg_cmet");
   return{epithelial,stemLike,cmetNegative:negativeResult(cmet)?cmet:null}
 }
 function upregulatedMetastatRows(rows){
   return rows.filter(row=>/^metastat_(?!upregulated_genes|primary_destination_trend)/.test(code(row))&&/UP\s*REGULATED/i.test(reported(row)))
 }
 function sourcePages(rows){
   return[...new Set(rows.map(rowPage).filter(Number.isFinite))].sort((a,b)=>a-b)
 }
 function reportOverview(type,reportRows){
   const items=[],evidenceRows=[];
   if(type==="RGCC_ONCOTRAIL"){
     const ctc=findCode(reportRows,"oncotrail_lung_ctc_count");
     const epcam=findCode(reportRows,"oncotrail_epcam_positive_ctc_count");
     const positives=positiveOncoMarkers(reportRows);
     if(ctc){
       const below=/BELOW/i.test(reported(ctc))||(!/OVER/i.test(reported(ctc))&&numeric(ctc.value)<numeric(ctc.reference));
       items.push({label:"จำนวน CTC",text:`${valueLabel(ctc)} ${below?"ต่ำกว่า":"สูงกว่าหรือเท่ากับ"}เกณฑ์ที่รายงานใช้ติดตาม ${text(ctc.reference)||""}; เกณฑ์นี้ไม่ใช่ค่าปกติของคนทั่วไป`,tone:below?"context":"attention"});
       evidenceRows.push(ctc)
     }
     if(epcam){items.push({label:"CTC ที่พบ EpCAM",text:`รายงาน ${valueLabel(epcam)} เป็นจำนวน CTC กลุ่มที่มี EpCAM บนผิวเซลล์ ไม่ใช่จำนวน CTC ทั้งหมด`,tone:"context"});evidenceRows.push(epcam)}
     const signals=oncotrailPhenotypeSignals(reportRows);
     if(signals.epithelial.length){
       const labels=signals.epithelial.map(row=>`${text(row.name).split(" ").at(-1)} ${reported(row)}`).join(", ");
       items.push({label:"ลักษณะคล้ายเซลล์เยื่อบุ",text:`พบ ${labels} ซึ่งเป็นลักษณะที่พบได้ใน CTC จากมะเร็งหลายชนิด แต่ยังบอกไม่ได้ว่าเซลล์มาจากอวัยวะใด`,tone:"context"});
       evidenceRows.push(...signals.epithelial)
     }
     if(signals.stemLike.length){
       const labels=signals.stemLike.map(row=>`${text(row.name).split(" ").at(-1)} ${reported(row)}`).join(", ");
       items.push({label:"สัญญาณเกี่ยวกับการแบ่งตัวของเซลล์",text:`พบ ${labels}; บอกเพียงว่าเซลล์บางส่วนมีสัญญาณเกี่ยวกับการแบ่งตัวและคงสภาพเดิม ยังยืนยันไม่ได้ว่าเป็นเซลล์ต้นกำเนิดมะเร็งหรือดื้อยา`,tone:"attention"});
       evidenceRows.push(...signals.stemLike)
     }
     if(signals.cmetNegative){
       items.push({label:"เมื่อไม่พบ c-MET",text:"การไม่พบ c-MET บน CTC ยังไม่ได้แปลว่ายีน MET ปกติ หากจะใช้เลือกยาต้องตรวจยีนจากชิ้นเนื้อหรือเลือดด้วยวิธีมาตรฐาน",tone:"guardrail"});
       evidenceRows.push(signals.cmetNegative)
     }
     if(positives.length){
       const names=positives.slice(0,6).map(row=>text(row.name).replace(/^OncoTrail\s*[—–-]\s*/,"")).join(", ");
       items.push({label:"โปรตีนที่พบบนเซลล์",text:`พบหรือพบน้อย ${positives.length} ตัว${names?`: ${names}${positives.length>6?" …":""}`:""}; ผลนี้บอกลักษณะของเซลล์ที่พบในเลือด แต่ยังไม่ใช่ผลยืนยันการกลายพันธุ์หรือผลจากชิ้นเนื้อ`,tone:"context"});
       evidenceRows.push(...positives)
     }
   }else{
     const upSummary=findCode(reportRows,"metastat_upregulated_genes");
     const trend=findCode(reportRows,"metastat_primary_destination_trend");
     const upRows=upregulatedMetastatRows(reportRows);
     if(upSummary){items.push({label:"ยีนที่ทำงานเด่นขึ้น",text:`รายงานระบุ ${valueLabel(upSummary)} ว่าทำงานเด่นขึ้นในตัวอย่างครั้งนี้ แต่ยังไม่ใช่ผลยืนยันการกลายพันธุ์`,tone:"attention"});evidenceRows.push(upSummary)}
     if(upRows.length){
       const labels=upRows.map(row=>`${text(row.reportedMarker??row.reported_marker)||text(row.name).split(" ").at(-1)} (${text(row.metastasisLocation??row.metastasis_location)||"General"})`);
       items.push({label:"รายการที่รายงานเน้น",text:`พบ ${upRows.length} รายการที่ถูกจัดว่าทำงานเด่นขึ้น: ${[...new Set(labels)].join(", ")}`,tone:"attention"});evidenceRows.push(...upRows)
       const cxcr4Rows=upRows.filter(row=>/CXCR4/i.test(text(row.reportedMarker??row.reported_marker??row.name)));
       if(cxcr4Rows.length){
         items.push({label:"CXCR4",text:"CXCR4 เกี่ยวข้องกับการเดินทางของเซลล์ตามสัญญาณเคมี ผลที่เด่นขึ้นอาจชี้แนวโน้ม แต่ยังยืนยันไม่ได้ว่ามะเร็งกระจายไปกระดูกหรือตับแล้ว",tone:"guardrail"});
         evidenceRows.push(...cxcr4Rows)
       }
       const scaleRows=upRows.filter(row=>numeric(row.value)!==null&&numeric(row.comparatorLevel??row.comparator_level??row.reference)!==null&&!text(row.unit));
       if(scaleRows.length){
         items.push({label:"วิธีอ่านตัวเลข",text:"ค่า Sample/Normal เป็นสเกลของห้องปฏิบัติการ ไม่ใช่ระดับสารในเลือด จึงให้ยึดคำว่า UP REGULATED หรือ “ทำงานเด่นขึ้น” ที่รายงานระบุ",tone:"source"});
         evidenceRows.push(...scaleRows)
       }
     }
     if(trend){items.push({label:"อวัยวะที่รายงานชี้แนวโน้ม",text:`รายงานชี้แนวโน้มไปทาง ${valueLabel(trend)} จากรูปแบบของสัญญาณที่ตรวจพบ แต่ยังไม่ได้แปลว่าพบรอยโรคที่อวัยวะนั้น`,tone:"attention"});evidenceRows.push(trend)}
   }
   if(!items.length)items.push({label:"ภาพรวม",text:"ยังไม่มีข้อมูลสำคัญเพียงพอสำหรับสร้างภาพรวมอัตโนมัติ โปรดอ่านผลดิบและรายงานต้นฉบับ",tone:"context"});
   return{number:1,key:"REPORT_OVERVIEW",title:"สรุปภาพรวมรายงาน",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages(reportRows)}
 }
 function selectedMeaning(selected,knowledge,assessment){
   const type=reportType(selected),location=text(selected?.metastasisLocation??selected?.metastasis_location);
   const compartment=text(selected?.biomarkerCompartment??selected?.biomarker_compartment);
   const plainHelper=MIW.LabTracker?.__test?.ctcPlainGlossaryItem;
   const plain=typeof plainHelper==="function"?plainHelper({
     name:`${text(selected?.name)}${location?` ${location}`:""}`,result:valueLabel(selected),current:text(assessment?.text),specific:true,sourceScope:"REPORTED"
   },type):null;
   const context=type==="RGCC_METASTAT"
     ?`RGCC METASTAT${location?` · กลุ่มตำแหน่ง ${location}`:""} · ผลตามรายงาน ${reported(selected)||"—"}`
     :`RGCC OncoTrail${compartment?` · กลุ่มเซลล์ ${compartment}`:""} · ผลตามรายงาน ${reported(selected)||"—"}`;
   return{
     number:2,key:"SELECTED_RESULT",title:"แปลผลรายตัว",items:[
       {label:"ผลของคุณหมายถึง",text:text(plain?.plainCurrent)||text(assessment?.text)||`ผล ${valueLabel(selected)} วันที่ ${dateLabel(selected)}`,tone:text(assessment?.level)==="high"?"attention":"context"},
       {label:"ตัวนี้ดูอะไร",text:text(plain?.plainAbout)||text(knowledge?.meaning)||"ยังไม่มีคำอธิบายเฉพาะของตัวตรวจนี้",tone:"neutral"},
       {label:"ยังสรุปไม่ได้ว่า",text:text(plain?.plainLimit)||"ยังใช้ผลตัวเดียววินิจฉัยการลุกลามหรือเลือกการรักษาไม่ได้",tone:"guardrail"},
       {label:"บริบทต้นทาง",text:context,tone:"source"}
     ],evidence:uniqueEvidence([selected]),pages:sourcePages([selected])
   }
 }
 function integratedMeaning(patientRows,selected){
   const preferredDate=text(selected?.date);
   const oncoRows=latestReportRows(patientRows,"RGCC_ONCOTRAIL",preferredDate);
   const metastatRows=latestReportRows(patientRows,"RGCC_METASTAT",preferredDate);
   const ctc=findCode(oncoRows,"oncotrail_lung_ctc_count");
   const trend=findCode(metastatRows,"metastat_primary_destination_trend");
   const upSummary=findCode(metastatRows,"metastat_upregulated_genes");
   const upRows=upregulatedMetastatRows(metastatRows);
   const items=[],evidenceRows=[];
   if(oncoRows.length&&metastatRows.length){
     const dates=[...new Set([...oncoRows,...metastatRows].map(dateLabel))].join(" และ ");
     items.push({label:"สองรายงานบอกคนละเรื่อง",text:`OncoTrail บอกจำนวน CTC และโปรตีนที่พบในเซลล์ ส่วน METASTAT ดูสัญญาณที่อาจเกี่ยวกับการเคลื่อนที่ไปยังอวัยวะต่าง ๆ${dates?` (รายงานวันที่ ${dates})`:""}`,tone:"context"});
     if(ctc&&(trend||upSummary||upRows.length)){
       const metaText=[upSummary?`${valueLabel(upSummary)} ถูกจัดว่าทำงานเด่นขึ้น`:"",trend?`รายงานชี้แนวโน้มไปทาง ${valueLabel(trend)}`:""].filter(Boolean).join(" และ ");
       items.push({label:"ข้อสรุปร่วม",text:`จำนวน CTC ${valueLabel(ctc)} ที่ต่ำกว่าเกณฑ์ติดตาม ไม่ขัดกับ METASTAT ที่${metaText||"พบสัญญาณเด่นขึ้น"} เพราะผลหนึ่งบอกจำนวนเซลล์ ส่วนอีกผลบอกลักษณะการทำงานของเซลล์`,tone:"attention"});
       evidenceRows.push(ctc,trend,upSummary,...upRows)
     }
     const stage=text([...oncoRows,...metastatRows].find(row=>text(row?.diseaseStage??row?.disease_stage))?.diseaseStage??[...oncoRows,...metastatRows].find(row=>text(row?.diseaseStage??row?.disease_stage))?.disease_stage);
     if(stage)items.push({label:"ระยะโรค",text:`ผลตรวจเลือดชุดนี้ไม่เปลี่ยนระยะโรคเดิม ${stage} และยังใช้ยืนยันว่าโรคดีขึ้น แย่ลง หรือสงบแล้วไม่ได้`,tone:"guardrail"});
   }else{
     const missing=oncoRows.length?"METASTAT":"OncoTrail";
     items.push({label:"ข้อมูลสำหรับเชื่อมผล",text:`ยังไม่มี ${missing} ในวันที่เดียวกันภายใน Lab Tracker จึงแปลได้เฉพาะรายงานที่มี โดยไม่อนุมานผลของอีกการตรวจ`,tone:"context"});
     evidenceRows.push(...oncoRows,...metastatRows)
   }
   items.push({label:"ต้องยืนยันด้วยอะไร",text:"ตำแหน่งและขนาดของโรคต้องดูจาก CT/MRI/PET-CT ตามความเหมาะสม ส่วนชนิดมะเร็งและยามุ่งเป้าต้องอิงผลชิ้นเนื้อและการตรวจยีนมาตรฐาน",tone:"guardrail"});
   return{number:3,key:"INTEGRATED_INTERPRETATION",title:"การแปลผลร่วมกัน",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages([...oncoRows,...metastatRows])}
 }
 function followUp(patientRows,selected){
   const preferredDate=text(selected?.date);
   const oncoRows=latestReportRows(patientRows,"RGCC_ONCOTRAIL",preferredDate);
   const metastatRows=latestReportRows(patientRows,"RGCC_METASTAT",preferredDate);
   const ctcHistory=patientRows.filter(row=>code(row)==="oncotrail_lung_ctc_count");
   const trend=findCode(metastatRows,"metastat_primary_destination_trend");
   const trendLocation=text(trend?.value??trend?.metastasisLocation??trend?.metastasis_location);
   const items=[],evidenceRows=[];
   if(oncoRows.length){
     const dates=[...new Set(ctcHistory.map(row=>text(row?.date)).filter(Boolean))];
     items.push({label:"ติดตาม CTC",text:dates.length<2
       ?"มีผล CTC เพียงครั้งเดียว จึงยังบอกแนวโน้มไม่ได้ หากใช้ติดตามควรเทียบซ้ำด้วยวิธีและห้องปฏิบัติการเดิมตามจังหวะประเมินโรคของทีมรักษา"
       :`มีผล CTC ${dates.length} วันตรวจ ควรดูแนวโน้มร่วมกับการรักษาที่ได้รับ อาการ และภาพ CT/MRI/PET-CT ในช่วงเวลาเดียวกัน ไม่ควรตัดสินจากการเพิ่มหรือลดเพียงเล็กน้อย`,tone:"action"});
     evidenceRows.push(...ctcHistory)
   }
   if(metastatRows.length){
     if(/^bone$/i.test(trendLocation))items.push({label:"ตรวจเรื่องกระดูกเพิ่มเติม",text:"ควรถามอาการปวดกระดูก กระดูกหัก อ่อนแรงหรือชาที่เกิดใหม่ และให้แพทย์พิจารณา ALP, แคลเซียม และภาพถ่ายรังสีที่เหมาะสม เพราะ METASTAT ตัวเดียวไม่ได้ยืนยันว่ามะเร็งไปกระดูก",tone:"action"});
     else items.push({label:"ตรวจตำแหน่งเพิ่มเติม",text:`หากรายงานชี้แนวโน้มไปทาง ${trendLocation||"อวัยวะใดอวัยวะหนึ่ง"} ต้องเทียบกับอาการ การตรวจร่างกาย และภาพ CT/MRI/PET-CT ที่เหมาะสม ไม่ใช้ METASTAT ยืนยันตำแหน่งเพียงอย่างเดียว`,tone:"action"});
     evidenceRows.push(trend,...upregulatedMetastatRows(metastatRows))
   }
   items.push({label:"การเลือกการรักษา",text:"ยังเลือกยามุ่งเป้า ยาภูมิคุ้มกัน หรือเปลี่ยนสูตรยาจาก OncoTrail/METASTAT เพียงชุดเดียวไม่ได้ ต้องดูผลมาตรฐาน ประวัติการรักษา และสภาพผู้ป่วยร่วมกัน",tone:"guardrail"});
   if(/^bone$/i.test(trendLocation))items.push({label:"ประเมินเร่งด่วนเมื่อมีอาการ",text:"หากมีอ่อนแรงหรือชารวดเร็ว เดินแย่ลง กลั้นปัสสาวะ/อุจจาระไม่ได้ หรือปวดหลังรุนแรงใหม่ ควรประเมินภาวะกดไขสันหลังเร่งด่วนตามอาการ ไม่ต้องรอผลตรวจซ้ำ",tone:"urgent"});
   return{number:4,key:"CLINICAL_FOLLOW_UP",title:"แนวทางติดตามที่ควรพิจารณา",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages([...oncoRows,...metastatRows])}
 }

 function isEnglishMode(){return MIW.I18n?.language==="en"}
 function reportOverviewEn(type,reportRows){
   const items=[],evidenceRows=[];
   if(type==="RGCC_ONCOTRAIL"){
     const ctc=findCode(reportRows,"oncotrail_lung_ctc_count"),epcam=findCode(reportRows,"oncotrail_epcam_positive_ctc_count"),positives=positiveOncoMarkers(reportRows);
     if(ctc){
       const below=/BELOW/i.test(reported(ctc))||(!/OVER/i.test(reported(ctc))&&numeric(ctc.value)<numeric(ctc.reference));
       items.push({label:"CTC count",text:`${valueLabel(ctc)} ${below?"is below":"is at or above"} the report tracking threshold ${text(ctc.reference)||""}. This threshold is assay-specific and is not a population reference interval.`,tone:below?"context":"attention"});evidenceRows.push(ctc)
     }
     if(epcam){items.push({label:"EpCAM-positive CTCs",text:`The report lists ${valueLabel(epcam)} EpCAM-positive CTCs. This is a subset of the detected CTC population, not the total CTC count.`,tone:"context"});evidenceRows.push(epcam)}
     const signals=oncotrailPhenotypeSignals(reportRows);
     if(signals.epithelial.length){const labels=signals.epithelial.map(row=>`${text(row.name).split(" ").at(-1)} ${reported(row)}`).join(", ");items.push({label:"Epithelial-like phenotype",text:`Detected ${labels}. These features may occur in circulating tumor cells from several cancer types and do not identify the tissue of origin by themselves.`,tone:"context"});evidenceRows.push(...signals.epithelial)}
     if(signals.stemLike.length){const labels=signals.stemLike.map(row=>`${text(row.name).split(" ").at(-1)} ${reported(row)}`).join(", ");items.push({label:"Cell-proliferation / stemness signals",text:`Detected ${labels}. These markers suggest that some cells express proliferation or stemness-associated signals, but they do not by themselves prove a cancer-stem-cell phenotype or treatment resistance.`,tone:"attention"});evidenceRows.push(...signals.stemLike)}
     if(signals.cmetNegative){items.push({label:"When c-MET is not detected",text:"Absence of c-MET on CTCs does not establish a normal MET gene. Treatment-relevant MET status should be confirmed with validated tissue or blood molecular testing when clinically indicated.",tone:"guardrail"});evidenceRows.push(signals.cmetNegative)}
     if(positives.length){const names=positives.slice(0,6).map(row=>text(row.name).replace(/^OncoTrail\s*[—–-]\s*/,"")).join(", ");items.push({label:"Proteins detected on cells",text:`${positives.length} marker(s) were reported as Positive or Dim${names?`: ${names}${positives.length>6?" …":""}`:""}. These findings characterize cells detected in blood; they are not mutation results or tissue-pathology confirmation.`,tone:"context"});evidenceRows.push(...positives)}
   }else{
     const upSummary=findCode(reportRows,"metastat_upregulated_genes"),trend=findCode(reportRows,"metastat_primary_destination_trend"),upRows=upregulatedMetastatRows(reportRows);
     if(upSummary){items.push({label:"Up-regulated genes",text:`The report lists ${valueLabel(upSummary)} as up-regulated in this sample. This is an expression result and does not establish a gene mutation.`,tone:"attention"});evidenceRows.push(upSummary)}
     if(upRows.length){const labels=upRows.map(row=>`${text(row.reportedMarker??row.reported_marker)||text(row.name).split(" ").at(-1)} (${text(row.metastasisLocation??row.metastasis_location)||"General"})`);items.push({label:"Highlighted source-report items",text:`${upRows.length} item(s) were classified as up-regulated: ${[...new Set(labels)].join(", ")}.`,tone:"attention"});evidenceRows.push(...upRows);
       const cxcr4Rows=upRows.filter(row=>/CXCR4/i.test(text(row.reportedMarker??row.reported_marker??row.name)));if(cxcr4Rows.length){items.push({label:"CXCR4",text:"CXCR4 is involved in chemokine-directed cellular trafficking. Increased expression may support a biological tendency, but it does not prove that cancer has metastasized to bone, liver, or any other site.",tone:"guardrail"});evidenceRows.push(...cxcr4Rows)}
       const scaleRows=upRows.filter(row=>numeric(row.value)!==null&&numeric(row.comparatorLevel??row.comparator_level??row.reference)!==null&&!text(row.unit));if(scaleRows.length){items.push({label:"How to read the numeric values",text:"Sample/Normal values are assay-scale comparators rather than blood concentrations. The source-report label UP REGULATED should remain the primary interpretation of this field.",tone:"source"});evidenceRows.push(...scaleRows)}
     }
     if(trend){items.push({label:"Reported organ-tropism signal",text:`The report points toward ${valueLabel(trend)} based on the detected signal pattern. This does not mean that a lesion has been demonstrated in that organ.`,tone:"attention"});evidenceRows.push(trend)}
   }
   if(!items.length)items.push({label:"Overview",text:"There is not yet enough verified information to generate an automated overview. Review the raw results and source report.",tone:"context"});
   return{number:1,key:"REPORT_OVERVIEW",title:"Report overview",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages(reportRows)}
 }
 function selectedMeaningEn(selected,knowledge,assessment){
   const type=reportType(selected),location=text(selected?.metastasisLocation??selected?.metastasis_location),compartment=text(selected?.biomarkerCompartment??selected?.biomarker_compartment);
   const plainHelper=MIW.LabTracker?.__test?.ctcPlainGlossaryItem;
   const plain=typeof plainHelper==="function"?plainHelper({name:`${text(selected?.name)}${location?` ${location}`:""}`,result:valueLabel(selected),current:text(assessment?.text),specific:true,sourceScope:"REPORTED"},type):null;
   const translated=x=>{const v=text(x);if(!v)return"";const t=MIW.I18n?.translateString?.(v,"en")||v;return /[\u0E00-\u0E7F]/.test(t)?"":t};
   const context=type==="RGCC_METASTAT"?`RGCC METASTAT${location?` · site group ${location}`:""} · source-reported result ${reported(selected)||"—"}`:`RGCC OncoTrail${compartment?` · cell compartment ${compartment}`:""} · source-reported result ${reported(selected)||"—"}`;
   return{number:2,key:"SELECTED_RESULT",title:"Selected-result interpretation",items:[
     {label:"What your result means",text:translated(plain?.plainCurrent)||translated(assessment?.text)||`Result ${valueLabel(selected)} on ${dateLabel(selected)}.`,tone:text(assessment?.level)==="high"?"attention":"context"},
     {label:"What this marker reflects",text:translated(plain?.plainAbout)||translated(knowledge?.meaning)||"A marker measured by this specialized circulating-tumor-cell assay.",tone:"neutral"},
     {label:"What this result cannot establish",text:translated(plain?.plainLimit)||"This result alone cannot diagnose progression, identify a metastatic site, establish mutation status, or select treatment.",tone:"guardrail"},
     {label:"Source-report context",text:context,tone:"source"}
   ],evidence:uniqueEvidence([selected]),pages:sourcePages([selected])}
 }
 function integratedMeaningEn(patientRows,selected){
   const preferredDate=text(selected?.date),oncoRows=latestReportRows(patientRows,"RGCC_ONCOTRAIL",preferredDate),metastatRows=latestReportRows(patientRows,"RGCC_METASTAT",preferredDate),ctc=findCode(oncoRows,"oncotrail_lung_ctc_count"),trend=findCode(metastatRows,"metastat_primary_destination_trend"),upSummary=findCode(metastatRows,"metastat_upregulated_genes"),upRows=upregulatedMetastatRows(metastatRows),items=[],evidenceRows=[];
   if(oncoRows.length&&metastatRows.length){
     const dates=[...new Set([...oncoRows,...metastatRows].map(row=>{const d=dateLabel(row);return d==="ไม่ระบุวันที่"?"date not specified":d}))].join(" and ");
     items.push({label:"The two reports answer different questions",text:`OncoTrail reports CTC quantity and cell-surface/intracellular markers, whereas METASTAT evaluates signals that may relate to cellular trafficking toward different organs${dates?` (reports dated ${dates})`:""}.`,tone:"context"});
     if(ctc&&(trend||upSummary||upRows.length)){const metaText=[upSummary?`${valueLabel(upSummary)} was reported as up-regulated`:"",trend?`the report points toward ${valueLabel(trend)}`:""].filter(Boolean).join(" and ");items.push({label:"Integrated conclusion",text:`A CTC count of ${valueLabel(ctc)} below the report tracking threshold is not inconsistent with the METASTAT finding (${metaText||"increased signals reported"}), because one test measures cell quantity while the other characterizes cellular signaling.`,tone:"attention"});evidenceRows.push(ctc,trend,upSummary,...upRows)}
     const stageRow=[...oncoRows,...metastatRows].find(row=>text(row?.diseaseStage??row?.disease_stage)),stage=text(stageRow?.diseaseStage??stageRow?.disease_stage);if(stage)items.push({label:"Disease stage",text:`These blood-test findings do not change the previously documented stage (${stage}) and cannot by themselves establish improvement, progression, or remission.`,tone:"guardrail"})
   }else{const missing=oncoRows.length?"METASTAT":"OncoTrail";items.push({label:"Information available for cross-report integration",text:`A same-date ${missing} report is not currently available in Lab Tracker, so only the available report can be interpreted without inferring the missing test.`,tone:"context"});evidenceRows.push(...oncoRows,...metastatRows)}
   items.push({label:"What requires confirmation",text:"Disease location and size require appropriate imaging such as CT, MRI or PET/CT. Cancer type and treatment-relevant molecular findings require validated pathology and molecular testing.",tone:"guardrail"});
   return{number:3,key:"INTEGRATED_INTERPRETATION",title:"Integrated interpretation",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages([...oncoRows,...metastatRows])}
 }
 function followUpEn(patientRows,selected){
   const preferredDate=text(selected?.date),oncoRows=latestReportRows(patientRows,"RGCC_ONCOTRAIL",preferredDate),metastatRows=latestReportRows(patientRows,"RGCC_METASTAT",preferredDate),ctcHistory=patientRows.filter(row=>code(row)==="oncotrail_lung_ctc_count"),trend=findCode(metastatRows,"metastat_primary_destination_trend"),trendLocation=text(trend?.value??trend?.metastasisLocation??trend?.metastasis_location),items=[],evidenceRows=[];
   if(oncoRows.length){const dates=[...new Set(ctcHistory.map(row=>text(row?.date)).filter(Boolean))];items.push({label:"CTC follow-up",text:dates.length<2?"Only one CTC measurement is available, so a trend cannot yet be determined. If CTCs are used for follow-up, repeat testing should preferably use the same assay and laboratory and be timed with the treating team's disease assessments.":`CTC results are available on ${dates.length} test dates. Review the trend together with treatment exposure, symptoms and imaging from the same period; small isolated changes should not be interpreted on their own.`,tone:"action"});evidenceRows.push(...ctcHistory)}
   if(metastatRows.length){if(/^bone$/i.test(trendLocation))items.push({label:"Further bone evaluation",text:"Review new bone pain, fracture, weakness or numbness. The clinician may consider ALP, calcium and appropriate imaging because METASTAT alone does not confirm bone metastasis.",tone:"action"});else items.push({label:"Further site-specific evaluation",text:`If the report points toward ${trendLocation||"a specific organ"}, correlate with symptoms, examination and appropriate CT/MRI/PET-CT. Do not use METASTAT alone to confirm a metastatic site.`,tone:"action"});evidenceRows.push(trend,...upregulatedMetastatRows(metastatRows))}
   items.push({label:"Treatment selection",text:"Do not select targeted therapy, immunotherapy, or change a regimen from OncoTrail/METASTAT alone. Use validated biomarkers, treatment history and the patient's clinical condition.",tone:"guardrail"});
   if(/^bone$/i.test(trendLocation))items.push({label:"Urgent assessment when symptoms occur",text:"Rapidly developing weakness/numbness, worsening gait, new bladder/bowel dysfunction, or severe new back pain requires urgent assessment for possible spinal cord compression rather than waiting for repeat testing.",tone:"urgent"});
   return{number:4,key:"CLINICAL_FOLLOW_UP",title:"Suggested follow-up considerations",items,evidence:uniqueEvidence(evidenceRows),pages:sourcePages([...oncoRows,...metastatRows])}
 }
 function build(allRows,selected,knowledge,assessment){
   if(!selected||!reportType(selected))return null;
   const patientRows=samePatientRows(allRows,selected),reportRows=currentReportRows(patientRows,selected);
   const type=reportType(selected);
   const levels=isEnglishMode()?[
     reportOverviewEn(type,reportRows),
     selectedMeaningEn(selected,knowledge,assessment),
     integratedMeaningEn(patientRows,selected),
     followUpEn(patientRows,selected)
   ]:[
     reportOverview(type,reportRows),
     selectedMeaning(selected,knowledge,assessment),
     integratedMeaning(patientRows,selected),
     followUp(patientRows,selected)
   ];
   return{
     schemaVersion:"1.0",interpretationVersion:VERSION,derived:true,mutatesRawResult:false,
     patientId:text(selected.patientId??selected.patient_id),reportType:type,
     documentIds:[...new Set(reportRows.map(row=>text(row?.documentId??row?.document_id)).filter(Boolean))],
     rawResult:evidence(selected),levels,
     limitations:isEnglishMode()?[
       "This interpretation is generated from verified MIW results and does not modify raw values, flags, Clinical Risk or Outcome fields from the source document.",
       "OncoTrail/METASTAT are specialized blood-based assays and should be interpreted with symptoms, examination, pathology and appropriate CT/MRI/PET-CT imaging.",
       "A single result cannot by itself confirm diagnosis, treatment response or treatment selection."
     ]:[
       "การแปลผลนี้สร้างจากผลที่ยืนยันแล้วใน MIW และไม่แก้ไขผลดิบ flag, Clinical Risk หรือ Outcome จากเอกสารต้นฉบับ",
       "OncoTrail/METASTAT เป็นการตรวจเฉพาะทางจากเลือด ต้องดูร่วมกับอาการ การตรวจร่างกาย ผลชิ้นเนื้อ และภาพ CT/MRI/PET-CT",
       "ผลครั้งเดียวใช้ยืนยันการวินิจฉัย การตอบสนอง หรือการเลือกยาไม่ได้"
     ],
     provenance:uniqueEvidence(levels.flatMap(level=>level.evidence))
   }
 }
 return{build,version:VERSION,__test:{reportType,evidence,currentReportRows,latestReportRows,positiveOncoMarkers,oncotrailPhenotypeSignals,upregulatedMetastatRows}}
})();
