window.MIW=window.MIW||{};
MIW.MixedClinicalPacket=(function(){
  const TYPE_META={
    LABORATORY:{label:"Laboratory / General Lab",short:"LAB",className:"packet-lab"},
    ALLERGY_PROFILE:{label:"Allergy / Specific IgE",short:"IgE",className:"packet-lab"},
    FOOD_INTOLERANCE_IGG_200_PLUS:{label:"FoodPrint 200+",short:"IgG",className:"packet-lab"},
    MICRONUTRIENT_PROFILE_I:{label:"Micronutrient Profile",short:"MICRO",className:"packet-lab"},
    MASUYAMA_IMMUNOLOGICAL:{label:"Masuyama / Osaki Immunity",short:"MASU",className:"packet-lab"},
    RGCC_ONCOTRAIL:{label:"RGCC OncoTrail",short:"OT",className:"packet-lab"},
    RGCC_METASTAT:{label:"RGCC METASTAT",short:"META",className:"packet-lab"},
    RGCC_ONCONOMICS:{label:"RGCC Onconomics Plus",short:"ONCO",className:"packet-note"},
    ECHOCARDIOGRAPHY:{label:"Echocardiography",short:"ECHO",className:"packet-echo"},
    RADIOLOGY:{label:"Radiology / Imaging",short:"IMG",className:"packet-radiology"},
    PROCEDURE:{label:"Procedure / Intervention",short:"PROC",className:"packet-procedure"},
    PATHOLOGY:{label:"Pathology",short:"PATH",className:"packet-pathology"},
    CLINICAL_NOTE:{label:"Clinical note",short:"NOTE",className:"packet-note"},
    OTHER:{label:"Other / Unclassified",short:"OTHER",className:"packet-other"}
  };
  // These report families are parsed by LabEngine.  Onconomics is intentionally
  // excluded because it has its own whole-report parser/review workflow.
  const LAB_IMPORT_TYPES=new Set([
    "LABORATORY","ALLERGY_PROFILE","FOOD_INTOLERANCE_IGG_200_PLUS",
    "MICRONUTRIENT_PROFILE_I","MASUYAMA_IMMUNOLOGICAL",
    "RGCC_ONCOTRAIL","RGCC_METASTAT"
  ]);
  const PROFILE_HINT_BY_TYPE={
    ALLERGY_PROFILE:"ALLERGY_PROFILE",
    FOOD_INTOLERANCE_IGG_200_PLUS:"FOOD_INTOLERANCE_IGG_200_PLUS",
    MICRONUTRIENT_PROFILE_I:"MICRONUTRIENT_PROFILE_I",
    MASUYAMA_IMMUNOLOGICAL:"MASUYAMA_IMMUNOLOGICAL",
    RGCC_ONCOTRAIL:"RGCC_ONCOTRAIL",
    RGCC_METASTAT:"RGCC_METASTAT"
  };
  const RULES=[
    {type:"LABORATORY",terms:[
      [/\bCHEMISTRY\b/i,42],[/\bHEMATOLOGY\b/i,42],[/\bCOAGULATION\b/i,38],
      [/BLOOD\s+CHEMISTRY/i,30],[/GENERAL\s+HEMATOLOGY/i,30],[/TUMOU?R\s+MARKERS/i,28],
      [/COLLECTED\s+DATE/i,22],[/REFERENCE\s+RANGE/i,18],[/\bUNITS?\b/i,8],[/LABORATORY\s+REPORT/i,28],[/LABORATORY\s+RESULTS?\s+REPORT/i,55],
      [/GAAD\s*SCORE/i,45],[/PIVKA[\s-]*(?:II|2)/i,45],[/\bAFP\b/i,18],
      [/ALLERGY\s+(?:FOOD|INHALATION)\s+PROFILE|ALLERGY\s+REPORT/i,42],
      [/\bANF\b|ANA\s*PATTERNS?|ANAPATTERNS/i,38],[/ANTI[-\s]*DSDNA/i,42],
      [/ANTI[-\s]*(?:SM|NRNP|SS\s*A|SS\s*B)/i,34],[/(?:C3|C4)\s+COMPLEMENT|BETA\s*1\s*C/i,34],
      [/ARSENIC\s+IN\s+URINE/i,36],[/FOLATE\s*\(\s*SERUM\s*\)/i,36],
      [/\b(?:WBC|RBC|HGB|HCT|MCV|MCH|MCHC|RDW|PLATELET|CREATININE|BILIRUBIN|ALBUMIN|ALK\s*PHOS|ALT|AST|GGT|CRP|CA\s*19[- ]?9|CA\s*15[- ]?3|CA\s*125|CEA|INR|APTT)\b/i,7]
    ]},
    {type:"ECHOCARDIOGRAPHY",terms:[
      [/ECHOCARDIOGRAPH/i,60],[/TRANSTHORACIC/i,35],[/\bLVEF\b/i,28],[/AUTO[- ]?BIPLANE/i,20],
      [/LEFT\s+VENTRIC/i,14],[/RIGHT\s+VENTRIC/i,12],[/MITRAL\s+VALVE/i,12],[/AORTIC\s+VALVE/i,12],
      [/\bTAPSE\b/i,18],[/DIASTOLIC\s+DYSFUNCTION/i,20],[/REGIONAL\s+WALL\s+MOTION/i,16]
    ]},
    {type:"PROCEDURE",terms:[
      [/PERCUTANEOUS\s+TRANSHEPATIC/i,55],[/BILIARY\s+(?:EXTERNAL\s+)?DRAINAGE/i,48],
      [/CHOLANGIOGRAM/i,35],[/DRAIN\s+INSERTION/i,28],[/POST\s*OP\s+CARE/i,28],
      [/CATHETER/i,10],[/PUNCTURE\s+SITE/i,12],[/INTERVENTION/i,12],[/TUBE\s+CARE/i,20]
    ]},
    {type:"RADIOLOGY",terms:[
      [/CLINICAL\s+IMAGING/i,45],[/\bMRI\b/i,30],[/\bMRCP\b/i,32],[/\bCT\s+(?:THORAX|CHEST|ABDOMEN|PELVIS)/i,32],
      [/CONTRAST\s+MEDIA/i,18],[/RESIDENT\s+RADIOLOGIST/i,20],[/\bIMPRESSION\s*:/i,20],
      [/HEPATOBILIARY\s+SYSTEM/i,18],[/LYMPHADENOPATHY/i,12],[/MOTION\s+ARTIFACT/i,10]
    ]},
    {type:"PATHOLOGY",terms:[
      [/HISTOPATHOLOGY/i,50],[/PATHOLOGY\s+REPORT/i,45],[/MICROSCOPIC\s+DESCRIPTION/i,28],
      [/IMMUNOHISTOCHEMISTRY/i,35],[/FINAL\s+DIAGNOSIS/i,20],[/SPECIMEN\s+TYPE/i,15]
    ]},
    {type:"CLINICAL_NOTE",terms:[
      [/DISCHARGE\s+SUMMARY/i,45],[/PROGRESS\s+NOTE/i,40],[/HISTORY\s+OF\s+PRESENT\s+ILLNESS/i,30],
      [/ASSESSMENT\s*(?:AND|&)\s*PLAN/i,25],[/MEDICATION\s+LIST/i,16],[/PHYSICAL\s+EXAMINATION/i,20]
    ]}
  ];
  function normalize(text){
    return String(text||"").replace(/[\u00a0\t\r]+/g," ").replace(/\s+/g," ").trim()
  }
  function specializedPageType(page={},fileName=""){
    const hint=String(page?.profileHint||"").trim().toUpperCase();
    if(hint==="RGCC_ONCOTRAIL")return"RGCC_ONCOTRAIL";
    if(hint==="RGCC_METASTAT")return"RGCC_METASTAT";
    if(hint==="MASUYAMA_IMMUNOLOGICAL")return"MASUYAMA_IMMUNOLOGICAL";
    if(hint==="FOOD_INTOLERANCE_IGG_200_PLUS")return"FOOD_INTOLERANCE_IGG_200_PLUS";
    if(hint==="MICRONUTRIENT_PROFILE_I")return"MICRONUTRIENT_PROFILE_I";
    if(hint==="ALLERGY_PROFILE")return"ALLERGY_PROFILE";

    const raw=normalize(`${fileName}\n${page.text||page.pdfText||""}`);
    // Strong report-family signatures.  Use page-level evidence so a 110-page
    // merged PDF cannot be collapsed into one Onconomics report merely because
    // one section contains RGCC/GENE EXPRESSION text.
    if(/\bMETASTAT\b/i.test(raw)||(/METASTASIS\s+LOCATION/i.test(raw)&&/SAMPLE\s+LEVELS/i.test(raw)))
      return"RGCC_METASTAT";
    if(/NK\s+ACTIVITY\s*&\s*IMMUNOLOGICAL\s+TEST\s+BY\s+OSAKI|COMPREHENSIVE\s+IMMUNITY\s+LEVEL|COMPREHENSIVE\s+IMMUNOLOGICAL/i.test(raw))
      return"MASUYAMA_IMMUNOLOGICAL";
    if(/FoodPrint|Food\s*intolerance|รายงานการทดสอบ\s*:\s*ลำดับปฏิกิริยา|\b200\+\b/i.test(raw))
      return"FOOD_INTOLERANCE_IGG_200_PLUS";
    if(/Micronutrients?\s+Profile\s+I/i.test(raw))return"MICRONUTRIENT_PROFILE_I";
    if(/Allergy\s+(?:Food|Inhalation)\s+Profile|Allergy\s+Report/i.test(raw))return"ALLERGY_PROFILE";

    const rgcc=/\bRGCC\b|RGCC\s+INTERNATIONAL/i.test(raw);
    // OncoTrail commonly exposes only the RGCC footer and "x | 6" on later
    // pages.  This is a report-level page-number signature, not a generic lab
    // number, and is therefore safe when combined with RGCC.
    if(/\bONCOTRAIL\b/i.test(raw)||
       (rgcc&&/\b(?:[1-6])\s*\|\s*6\b/i.test(raw))||
       (/INDEX\s+OF\s+CIRCULATING\s+CELLS/i.test(raw)&&/CTC/i.test(raw)))
      return"RGCC_ONCOTRAIL";
    // Legacy/current Onconomics layouts are 19 or 20 pages.  The RGCC footer
    // preserves that denominator on every page, including graph-only pages.
    if(/\bONCONOMICS(?:\s+PLUS)?\b/i.test(raw)||
       (rgcc&&/\b(?:\d{1,2})\s*\|\s*(?:19|20)\b/i.test(raw))||
       /NATURAL\s+SUBSTANCES\s+SENSITIVITY|ADDITIONAL\s+TESTED\s+DRUGS|GROWTH\s+FACTORS\s+PROLIFERATION\s+STIMULI|SELF\s+REPAIR\s*-\s*RESISTANCE/i.test(raw))
      return"RGCC_ONCONOMICS";
    return""
  }
  function classifyPage(page={},fileName=""){
    const specialized=specializedPageType(page,fileName);
    if(specialized){
      return{type:specialized,confidence:99,score:120,hits:[`SPECIALIZED:${specialized}`],allScores:[],textLength:normalize(page.text||page.pdfText||"").length}
    }
    const raw=normalize(`${fileName}\n${page.text||page.pdfText||""}`);
    const scores=RULES.map(rule=>{
      let score=0;const hits=[];
      rule.terms.forEach(([pattern,weight])=>{if(pattern.test(raw)){score+=weight;hits.push(pattern.source)}});
      return{type:rule.type,score,hits}
    }).sort((a,b)=>b.score-a.score);
    let best=scores[0]||{type:"OTHER",score:0,hits:[]};
    const strongLab=MIW.Classifier?.strongGeneralLabEvidence?.(raw)||/LABORATORY\s+RESULTS?\s+REPORT|GAAD\s*SCORE|PIVKA[\s-]*(?:II|2)/i.test(raw);
    const truePath=MIW.Classifier?.truePathologyEvidence?.(raw)||/HISTOPATHOLOGY|PATHOLOGY\s+REPORT|MICROSCOPIC\s+DESCRIPTION|IMMUNOHISTOCHEMISTRY|FINAL\s+DIAGNOSIS/i.test(raw);
    if(best.type==="PATHOLOGY"&&strongLab&&!truePath){
      const lab=scores.find(item=>item.type==="LABORATORY")||{type:"LABORATORY",score:0,hits:[]};
      best={...lab,score:Math.max(Number(lab.score||0),92),hits:[...(lab.hits||[]),"FALSE_PATHOLOGY_HEADER_GUARD"]}
    }
    const clinicalNoteHeader=/\b(?:DISCHARGE\s+SUMMARY|PROGRESS\s+NOTE|HISTORY\s+OF\s+PRESENT\s+ILLNESS|HOSPITAL\s+COURSE)\b/i.test(raw);
    if(clinicalNoteHeader){
      const noteScore=scores.find(item=>item.type==="CLINICAL_NOTE")?.score||45;
      best={type:"CLINICAL_NOTE",score:Math.max(noteScore,70),hits:["clinical-note-header"]};
    }
    const second=scores.find(item=>item.type!==best.type)||{score:0};
    const confidence=best.score<=0?5:Math.max(10,Math.min(99,Math.round(best.score/(best.score+Math.max(10,second.score))*100)));
    return{
      type:best.score>=18?best.type:"OTHER",
      confidence,score:best.score,hits:best.hits,allScores:scores,textLength:raw.length
    }
  }
  function continuationHint(text,type){
    const raw=normalize(text);
    if(type==="ECHOCARDIOGRAPHY")return /TECHNICALLY\s+DIFFICULT\s+STUDY|ELECTRONICALLY\s+SIGNED|PERICARDIUM|PULMONIC\s+VALVE/i.test(raw);
    if(type==="RADIOLOGY")return /PAGE\s*2\s*\/\s*2|OTHER\s+FINDINGS|FOR\s+CLINICAL\s+CORRELATION|INITIALLY\s+DICTATED/i.test(raw);
    if(type==="PROCEDURE")return /POST\s*OP\s+CARE|OPERATORS?|NON\s+DRAINING|CATHETER\s+OUTPUT|PAGE\s*2\s*\/\s*2/i.test(raw);
    if(LAB_IMPORT_TYPES.has(type))return /RESULT\s+COMMENTS|INTERPRETIVE\s+DATA|PERFORMING\s+LOCATIONS|LEGEND\s*:|LABORATORY\s+REPORT/i.test(raw);
    if(type==="RGCC_ONCONOMICS")return /\bRGCC\b|REPORT\s+DATE|PATIENT\s+NAME/i.test(raw);
    return false
  }
  function smoothClassifications(classified){
    const out=classified.map(item=>({...item}));
    for(let i=0;i<out.length;i++){
      const current=out[i],prev=out[i-1],next=out[i+1];
      const weak=current.type==="OTHER"||current.score<24||(current.textLength<80&&current.score<35);
      if(!weak)continue;
      if(prev&&prev.type!=="OTHER"&&continuationHint(current.page?.text||"",prev.type)){
        current.type=prev.type;current.confidence=Math.max(70,prev.confidence-8);current.inheritedFrom="previous";continue
      }
      if(prev&&next&&prev.type===next.type&&prev.type!=="OTHER"){
        current.type=prev.type;current.confidence=Math.max(66,Math.min(prev.confidence,next.confidence)-10);current.inheritedFrom="sandwich";continue
      }
      const nextIsSpecial=next&&[
        "RGCC_ONCOTRAIL","RGCC_METASTAT","RGCC_ONCONOMICS","MASUYAMA_IMMUNOLOGICAL",
        "FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I","ALLERGY_PROFILE"
      ].includes(next.type);
      // Scanned cover/title pages can have almost no text layer.  If such a
      // page sits immediately before a strong specialized page and after a
      // different family, attach it forward rather than silently to the prior
      // report.
      if(nextIsSpecial&&current.textLength<55&&(!prev||prev.type!==next.type)){
        current.type=next.type;current.confidence=Math.max(62,next.confidence-14);current.inheritedFrom="next-specialized-cover";continue
      }
      if(prev&&prev.type!=="OTHER"&&current.textLength<80){
        current.type=prev.type;current.confidence=Math.max(58,prev.confidence-18);current.inheritedFrom="sparse-continuation"
      }
    }
    return out
  }
  function pageRange(numbers){
    const sorted=[...new Set(numbers.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
    if(!sorted.length)return"";
    const groups=[];let start=sorted[0],end=sorted[0];
    for(let i=1;i<sorted.length;i++){
      if(sorted[i]===end+1){end=sorted[i];continue}
      groups.push(start===end?`${start}`:`${start}–${end}`);start=end=sorted[i]
    }
    groups.push(start===end?`${start}`:`${start}–${end}`);
    return groups.join(", ")
  }
  function analyze(pages=[],fileName=""){
    const raw=pages.map((page,index)=>({...classifyPage(page,fileName),page,index}));
    const classified=smoothClassifications(raw);
    const counts={},pageNumbers={};
    classified.forEach(item=>{
      counts[item.type]=(counts[item.type]||0)+1;
      (pageNumbers[item.type]||(pageNumbers[item.type]=[])).push(item.page.sourcePageNumber||item.page.pageNumber||item.index+1)
    });
    const meaningfulTypes=Object.keys(counts).filter(type=>type!=="OTHER"&&counts[type]>0);
    const labPages=classified.filter(item=>LAB_IMPORT_TYPES.has(item.type));
    const specializedTypes=meaningfulTypes.filter(type=>[
      "RGCC_ONCOTRAIL","RGCC_METASTAT","RGCC_ONCONOMICS","MASUYAMA_IMMUNOLOGICAL",
      "FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I","ALLERGY_PROFILE"
    ].includes(type));
    // A packet is mixed whenever more than one report family is present.  The
    // previous implementation required one "generic LABORATORY" plus one
    // non-lab family, which missed merged packets made solely of specialized
    // laboratory reports.
    const isMixed=meaningfulTypes.length>1;
    const segments=[];
    classified.forEach(item=>{
      const pageNo=Number(item.page.sourcePageNumber||item.page.pageNumber||item.index+1);
      const last=segments[segments.length-1];
      if(last&&last.type===item.type&&pageNo===last.end+1){last.end=pageNo;last.pages.push(pageNo);last.confidence=Math.round((last.confidence*(last.pages.length-1)+item.confidence)/last.pages.length)}
      else segments.push({type:item.type,start:pageNo,end:pageNo,pages:[pageNo],confidence:item.confidence})
    });
    return{
      isMixed,counts,pageNumbers,segments,meaningfulTypes,specializedTypes,
      totalPages:pages.length,labPageCount:labPages.length,
      labPageNumbers:labPages.map(item=>Number(item.page.sourcePageNumber||item.page.pageNumber||item.index+1)),
      onconomicsPageNumbers:(pageNumbers.RGCC_ONCONOMICS||[]).map(Number),
      classified
    }
  }
  function apply(pages=[],fileName=""){
    const packet=analyze(pages,fileName);
    packet.classified.forEach(item=>{
      const profileHint=PROFILE_HINT_BY_TYPE[item.type]||"";
      Object.assign(item.page,{
        packetType:item.type,
        packetConfidence:item.confidence,
        packetIncludeInLab:LAB_IMPORT_TYPES.has(item.type),
        packetClassificationHits:item.hits||[],
        packetInheritedFrom:item.inheritedFrom||"",
        packetSpecializedType:item.type.startsWith("RGCC_")||item.type==="MASUYAMA_IMMUNOLOGICAL"?item.type:""
      });
      if(profileHint&&!String(item.page.profileHint||"").trim())item.page.profileHint=profileHint
    });
    return packet
  }
  function strongLabEvidence(page={}){
    const raw=normalize(`${page?.text||""} ${page?.pdfText||""} ${(page?.ocr?.candidates||[]).map(item=>item?.text||"").join(" ")}`);
    if(/LABORATORY\s+(?:RESULTS?\s+)?REPORT|COMPLETE\s+BLOOD\s+COUNT|BLOOD\s+CHEMISTRY|HEMATOLOGY|COAGULATION|GAAD\s*SCORE|PIVKA[\s-]*(?:II|2)/i.test(raw))return true;
    // v10.223 — OPD/clinical-history documents may contain a real laboratory
    // table even though the page header still says OPD Clinical Record.
    if(/LABORATORY\s+RESULTS/i.test(raw)&&/LAB\.?\s*TEST\s+DESCRIPTION/i.test(raw)&&/(?:VALUE|RESULT)/i.test(raw)&&/(?:RANGE|REFERENCE)/i.test(raw))return true;
    if(/TEST\s+NAME/i.test(raw)&&/RESULT/i.test(raw)&&/REFERENCE\s+RANGE/i.test(raw)&&/(?:PSA|CREATININE|PLATELET|ALBUMIN|WBC|AFP|PIVKA)/i.test(raw))return true;
    const signatures=[/\bWBC\b/i,/\bRBC\b/i,/HEMOGLOBIN|\bHGB\b|\bHB\b/i,/PLATELET/i,/\bMPV\b/i,/CREATININE/i,/ALBUMIN/i,/BILIRUBIN/i,/\bAST\b/i,/\bALT\b/i,/GLUCOSE/i,/\bPSA\b/i,/\bLDH\b/i];
    const count=signatures.reduce((sum,pattern)=>sum+Number(pattern.test(raw)),0);
    const numericRows=(raw.match(/(?:^|\s)[<>]?\d+(?:\.\d+)?\s+(?:H|L)?\s*(?:mg\/dL|g\/dL|fL|pg|mmol\/L|ng\/mL|10\^?3\/mm3|%)/gi)||[]).length;
    return(count>=4&&numericRows>=2)||(count>=3&&/LABORATORY\s+RESULTS/i.test(raw)&&numericRows>=1)
  }
  function labPages(pages=[],documentRecord={}){
    const hasConfirmedMixedPacket=Boolean(
      documentRecord?.packet?.isMixed||
      String(documentRecord?.type||"").toUpperCase()==="MIXED_CLINICAL_PACKET"||
      String(documentRecord?.captureMode||"").toUpperCase()==="MIXED_CLINICAL_PACKET"
    );
    if(!hasConfirmedMixedPacket)return pages;
    // v10.221 — a scanned prior-history PDF can be classified as CLINICAL_NOTE
    // at file level even when individual pages visibly contain CBC/chemistry
    // tables. Rescue only pages with strong laboratory evidence; do not pull
    // narrative notes into LabEngine merely because they mention one lab value.
    return pages.filter(page=>(page.packetIncludeInLab!==false&&LAB_IMPORT_TYPES.has(String(page.packetType||"LABORATORY")))||strongLabEvidence(page))
  }
  function typeMeta(type){return TYPE_META[type]||TYPE_META.OTHER}
  function summaryItems(packet={}){
    const priority=["LABORATORY","ALLERGY_PROFILE","FOOD_INTOLERANCE_IGG_200_PLUS","MICRONUTRIENT_PROFILE_I","RGCC_ONCOTRAIL","RGCC_METASTAT","RGCC_ONCONOMICS","MASUYAMA_IMMUNOLOGICAL"];
    return Object.entries(packet.counts||{}).filter(([,count])=>count>0).sort((a,b)=>{
      const ai=priority.indexOf(a[0]),bi=priority.indexOf(b[0]);
      if(ai>=0||bi>=0)return(ai<0?999:ai)-(bi<0?999:bi);
      return b[1]-a[1]
    }).map(([type,count])=>({
      type,count,label:typeMeta(type).label,short:typeMeta(type).short,className:typeMeta(type).className,
      range:pageRange(packet.pageNumbers?.[type]||[])
    }))
  }
  function summaryText(packet={}){
    return summaryItems(packet).map(item=>`${item.label} ${item.count} หน้า${item.range?` (หน้า ${item.range})`:""}`).join(" · ")
  }
  return{classifyPage,analyze,apply,labPages,typeMeta,summaryItems,summaryText,pageRange,
    _test:{normalize,smoothClassifications,continuationHint,specializedPageType,strongLabEvidence,LAB_IMPORT_TYPES}}
})();
