window.MIW=window.MIW||{};
MIW.Classifier=(function(){
 const rules=[
   {type:"BODY_COMPOSITION",score:0,terms:[["INBODY 720",75],["BODY COMPOSITION HISTORY",35],["VISCERAL FAT AREA",25],["ECW/TBW",20],["SKELETAL MUSCLE MASS",15],["FITNESS SCORE",12]]},
   {type:"RGCC_ONCOTRAIL",score:0,terms:[["ONCOTRAIL",75],["CTCS COUNT",25],["INDEX OF CIRCULATING CELLS",20],["MARKERS",8],["RGCC",20]]},
   {type:"RGCC_METASTAT",score:0,terms:[["METASTAT",75],["METASTASIS LOCATION",25],["SAMPLE LEVELS",15],["NORMAL LEVELS",15],["UP REGULATED",10],["RGCC",20]]},
   {type:"RGCC_ONCONOMICS",score:0,terms:[["ONCONOMICS PLUS",45],["ONCONOMICS",30],["RGCC",20],["CTCS COUNT",20],["CTC COUNT",20],["NATURAL SUBSTANCES SENSITIVITY",20],["GENE EXPRESSION",15],["ADDITIONAL TESTED DRUGS",15],["DRUG SENSITIVITY",15],["REPORT SUMMARY",8]]},
   {type:"PATHOLOGY",score:0,terms:[["PATHOLOGY",35],["HISTOPATHOLOGY",40],["MICROSCOPIC DESCRIPTION",25],["SPECIMEN",15],["DIAGNOSIS",10],["IMMUNOHISTOCHEMISTRY",30],["GROSS DESCRIPTION",25],["FINAL DIAGNOSIS",25]]},
   {type:"RADIOLOGY",score:0,terms:[["RADIOLOGY",30],["CT SCAN",30],["MRI",30],["PET/CT",40],["ULTRASOUND",25],["FINDINGS",15],["IMPRESSION",15]]},
   {type:"LABORATORY",score:0,terms:[["LABORATORY",25],["LABORATORY RESULTS REPORT",55],["LABORATORY RESULT REPORT",45],["TEST NAME",15],["TEST RESULT UNIT REFERENCE RANGE",40],["RESULT UNIT REFERENCE RANGE",32],["NORMAL RANGE",20],["REFERENCE RANGE",20],["GAAD SCORE",45],["PIVKA II",45],["PIVKA-II",45],["AFP",18],["CBC",15],["WBC",10],["HGB",10],["HEMOGLOBIN",20],["HEMOGLOBIN TYPING",45],["HB A2",20],["ALPHA-THALASSEMIA",30],["HEMATOCRIT",20],["CREATININE",15],["GLUCOSE",15],["REFERENCE RANGE",20],["PLATELET",15],["ALLERGY REPORT",25],["ALLERGY FOOD PROFILE",20],["ALLERGY INHALATION PROFILE",20],["ALLERGEN",15],["CONCENTRATION",10],["ANF",30],["ANA PATTERNS",30],["ANAPATTERNS",30],["ANTI-DSDNA",40],["ANTI-SM",25],["ANTI-NRNP",25],["ANTI-SS A",20],["ANTI-SSA",20],["BETA 1 C",20],["C3 COMPLEMENT",25],["C4 COMPLEMENT",25],["ARSENIC IN URINE",30],["ARSENIC IN BLOOD",25],["ALUMINIUM IN BLOOD",25],["CADMIUM IN BLOOD",25],["LEAD IN BLOOD",25],["MERCURY IN BLOOD",25],["INSULIN",15],["CORTISOL",15],["PROGESTERONE",15],["TESTOSTERONE",15],["HOMOCYSTEINE",20],["DHEA-SULPHATE",20],["DHEA-SULFATE",20],["FOLATE SERUM",30],["FOLATE (SERUM)",30],["MICRONUTRIENT",35],["FOOD INTOLERANCE",35],["FOODPRINT",35],["200+",15],["ICP-MS",15],["ECLIA",10],["ELISA",10],["IFA",10]]},
   {type:"PRESCRIPTION",score:0,terms:[["PRESCRIPTION",35],["MEDICATION",20],["TABLET",10],["CAPSULE",10],["TAKE",10],["DAILY",5]]},
   {type:"CLINICAL_NOTE",score:0,terms:[["PROGRESS NOTE",35],["HISTORY OF PRESENT ILLNESS",30],["PHYSICAL EXAMINATION",20],["ASSESSMENT",15],["PLAN",10]]},
   {type:"RGCC_OTHER",score:0,terms:[["ONCOTRACE",45],["ONCOTRAIL",45],["METASTAT",45],["ONCOCOUNT",45],["RGCC",20]]}
 ];
 function strongGeneralLabEvidence(raw=""){
   const source=String(raw||"").toUpperCase().replace(/\s+/g," ");
   const structural=[
     /LABORATORY\s+RESULTS?\s+REPORT/,
     /LABORATORY\s+REPORT/,
     /TEST\s+(?:NAME\s+)?RESULT[\s\S]{0,80}(?:UNIT|REFERENCE\s+RANGE)/,
     /RESULT[\s\S]{0,50}UNIT[\s\S]{0,50}REFERENCE\s+RANGE/
   ].some(re=>re.test(source));
   const analyteHits=[/\bGAAD\s*SCORE\b/,/\bPIVKA[\s-]*(?:II|2)\b/,/\bAFP\b/,/ALPHA\s*FETOPROTEIN/,/CA\s*19[- ]?9/,/\bCEA\b/,/\bPSA\b/].filter(re=>re.test(source)).length;
   const workflow=/COLLECTED\s+SPECIMEN\s+DATE|RECEIVED\s+DATE|LAB\s*NO\.?|ACCESS(?:ION)?\s*NO\.?/.test(source);
   return structural||(analyteHits>=2&&workflow)||analyteHits>=3
 }
 function truePathologyEvidence(raw=""){
   const source=String(raw||"").toUpperCase().replace(/\s+/g," ");
   return /HISTOPATHOLOGY|PATHOLOGY\s+REPORT|MICROSCOPIC\s+DESCRIPTION|GROSS\s+DESCRIPTION|IMMUNOHISTOCHEMISTRY|FINAL\s+DIAGNOSIS|TISSUE\s+BIOPSY|CYTOLOG(?:Y|ICAL)/.test(source)
 }
 function pathologyClinicHeaderOnly(raw=""){
   const source=String(raw||"").toUpperCase().replace(/\s+/g," ");
   return /LABORATORY\s+(?:AND|&)\s+PATHOLOGY\s+CLINIC/.test(source)&&!truePathologyEvidence(source)
 }
 function classify(text,fileName=""){
   const raw=`${fileName}\n${text}`.toUpperCase();
   const source=raw
     .replace(/[\u00A0\t\r\n]+/g," ")
     .replace(/[^A-Z0-9+\-\/ ]+/g," ")
     .replace(/\s+/g," ")
     .trim();

   const scored=rules.map(rule=>{
     let score=0,hits=[];
     rule.terms.forEach(([term,weight])=>{
       const normalized=String(term).toUpperCase().replace(/\s+/g," ").trim();
       if(source.includes(normalized)){score+=weight;hits.push(term)}
     });

     if(rule.type==="RGCC_ONCONOMICS"){
       const fn=String(fileName).toUpperCase();
       if(/ONCONOMICS/.test(fn)){score+=35;hits.push("FILENAME: ONCONOMICS")}
       if(/RGCC/.test(fn)){score+=15;hits.push("FILENAME: RGCC")}
       const signatureHits=[
         /ONCONOMICS/,
         /\bRGCC\b/,
         /CTC[S]?\s+COUNT/,
         /NATURAL\s+SUBSTANCES/,
         /GENE\s+EXPRESSION/,
         /ADDITIONAL\s+TESTED\s+DRUGS/,
         /DRUG\s+SENSITIVITY/
       ].filter(re=>re.test(source)).length;
       if(signatureHits>=2){score+=25;hits.push(`RGCC SIGNATURES: ${signatureHits}`)}
       if(signatureHits>=4)score+=25;
     }
     return{type:rule.type,score,hits}
   }).sort((a,b)=>b.score-a.score);

   let best=scored[0];
   // v10.318 — "Bangkok Chain Laboratory and Pathology Clinic" is an
   // organization name, not proof that the document is a pathology report.
   // When a clean laboratory table / GAAD-AFP-PIVKA signature is present and
   // there is no tissue-pathology structure, prefer Laboratory even if OCR
   // also sees the word PATHOLOGY in the header.
   if((best?.type==="PATHOLOGY"||pathologyClinicHeaderOnly(raw))&&strongGeneralLabEvidence(raw)&&!truePathologyEvidence(raw)){
     const lab=scored.find(item=>item.type==="LABORATORY")||{type:"LABORATORY",score:0,hits:[]};
     best={...lab,score:Math.max(Number(lab.score||0),92),hits:[...(lab.hits||[]),"FALSE_PATHOLOGY_HEADER_GUARD","STRONG_GENERAL_LAB_EVIDENCE"]};
   }
   const confidence=Math.max(5,Math.min(99,best.score));
   return{type:best.score>0?best.type:"OTHER",confidence,hits:best.hits,allScores:scored}
 }
 function hasOnconomicsEvidence(documentRecord={}){
   const type=String(documentRecord.type||"").toUpperCase();
   if(type==="RGCC_ONCONOMICS")return true;
   const fileNames=[
     documentRecord.fileName,
     ...(documentRecord.sourceFiles||[]).map(file=>file?.name)
   ].filter(Boolean).join("\n");
   const fileSource=fileNames.toUpperCase().replace(/\s+/g," ");
   if(/\bONCONOMICS(?:\s+PLUS)?\b/.test(fileSource))return true;
   const source=`${fileNames}\n${documentRecord.text||""}`
     .toUpperCase()
     .replace(/[\u00a0\t\r\n]+/g," ")
     .replace(/\s+/g," ");
   const signatures=[
     /\bONCONOMICS(?:\s+PLUS)?\b/,
     /\bRGCC\b/,
     /CTC[S]?\s+COUNT/,
     /NATURAL\s+SUBSTANCES(?:\s+SENSITIVITY)?/,
     /GENE\s+EXPRESSION/,
     /ADDITIONAL\s+TESTED\s+DRUGS/,
     /DRUG\s+SENSITIVITY/
   ];
   const hits=signatures.filter(pattern=>pattern.test(source)).length;
   return(/\bRGCC\b/.test(source)&&hits>=3)||hits>=4
 }
 function resolveReviewRoute(documentRecord={}){
   const type=String(documentRecord.type||"OTHER").toUpperCase();
   const routeSource=`${documentRecord.fileName||""}\n${documentRecord.text||""}`;
   // Repair already-cached v10.317 documents without requiring a re-upload.
   // A document that was labelled PATHOLOGY only because the laboratory's
   // organization name contains "Pathology Clinic" is allowed through the
   // Lab probe when the page has strong lab-table evidence and no true tissue
   // pathology signature.
   if(type==="PATHOLOGY"&&strongGeneralLabEvidence(routeSource)&&!truePathologyEvidence(routeSource))return"LABORATORY_PROBE";
   // Mixed packets must be resolved page-by-page before any whole-file
   // specialized signature is allowed to take over the route.  Otherwise one
   // Onconomics section inside a merged PDF swallows Allergy, FoodPrint,
   // OncoTrail, METASTAT, Masuyama and General Lab pages.
   if(type==="MIXED_CLINICAL_PACKET"||documentRecord?.packet?.isMixed)return"MIXED_PACKET";
   if(hasOnconomicsEvidence(documentRecord))return"ONCONOMICS";
   if(type==="RGCC_ONCOTRAIL"||type==="RGCC_METASTAT"||type==="BODY_COMPOSITION")return"LABORATORY";
   if(type==="LABORATORY"||type==="LABORATORY_REPORT"||type==="MIXED_CLINICAL_PACKET")return"LABORATORY";
   // OTHER is deliberately a probe, not proof. The Lab Engine must still find
   // at least two reportable rows before direct import is allowed.
   if(type==="OTHER"||!type)return"LABORATORY_PROBE";
   return"UNSUPPORTED"
 }
 function parseMonthDate(raw){
   const text=String(raw||"").replace(/\./g," ").replace(/\s+/g," ").trim();
   const months={jan:"01",january:"01",feb:"02",february:"02",mar:"03",march:"03",apr:"04",april:"04",may:"05",jun:"06",june:"06",juni:"06",jul:"07",july:"07",aug:"08",august:"08",sep:"09",sept:"09",september:"09",oct:"10",october:"10",nov:"11",november:"11",dec:"12",december:"12"};
   let m=text.match(/\b(20\d{2})\s+([A-Za-z]+)\s+(\d{1,2})\b/i);
   if(m&&months[m[2].toLowerCase()])return`${m[1]}-${months[m[2].toLowerCase()]}-${m[3].padStart(2,"0")}`;
   m=text.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/i);
   if(m&&months[m[2].toLowerCase()])return`${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2,"0")}`;
   return""
 }
 function patientNameQuality(value){
   const original=MIW.Utils.normalizeName(value||"");
   if(!original)return-1000;
   const identityLeak=/\b(?:HN|MRN|HOSPITAL\s*(?:ID|NO\.?|NUMBER)|PATIENT\s*ID|DOB|DATE\s*OF\s*BIRTH|AGE|SEX|GENDER|WARD|LAB\s*NO\.?)\b/i.test(original);
   const name=MIW.Utils.normalizeName(original.replace(/\b(?:HN|MRN|HOSPITAL\s*(?:ID|NO\.?|NUMBER)|PATIENT\s*ID|DOB|DATE\s*OF\s*BIRTH|AGE|SEX|GENDER|WARD|LAB\s*NO\.?)\b[\s\S]*$/i,"").trim());
   if(!name)return-1000;
   if(/^(?:location|doctor|ward|room(?:\/bed)?|patient(?:\s*name)?|hospital(?:\s*number)?|requested(?:\s*by)?|passport(?:\s*number)?|sex|age|dob|unknown(?:\s*patient)?|LABORATORY REPORT|WORLD MEDICAL HOSPITAL)$/i.test(name))return-1000;
   const compact=name.replace(/\s+/g,"");
   const thai=(compact.match(/[ก-๙]/g)||[]).length;
   const ascii=(compact.match(/[A-Za-z]/g)||[]).length;
   const controls=(compact.match(/[\u0000-\u001f\u007f-\u009f]/g)||[]).length;
   const extended=(compact.match(/[\u00c0-\u02ff]/g)||[]).length;
   const classicMojibake=/(?:à¸|à¹|Ã.|Â.|îć|Öø|ÿĀ|đÖ|ǰ|ðŨ|ÙŠ)/i.test(name);
   let score=Math.min(40,compact.length);
   if(thai){
     score+=140+Math.min(50,thai*2);
     if(/^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*/.test(name))score+=30
   }else if(ascii){
     score+=45+Math.min(30,ascii);
     if(/^(?:Mr|Mrs|Ms|Miss|Master|Dr)\.?\s+/i.test(name))score+=15;
     const tokens=name.split(/\s+/).filter(Boolean);
     if(name===name.toLowerCase()&&tokens.length>=3)score-=150;
     if(tokens.length>=3&&tokens.every(token=>token.length<=7)&&name===name.toLowerCase())score-=80
   }
   if(identityLeak)score-=350;
   if(/\d/.test(name))score-=260;
   if(/[@#$%^&*_=+<>?\\|{}\[\]~`]/.test(name))score-=420;
   if(controls)score-=300;
   if(classicMojibake)score-=400;
   if(!thai&&extended>=Math.max(4,compact.length*.28))score-=300;
   if(!thai&&!ascii)score-=100;
   return score
 }
 function isInvalidPatientName(value){
   return patientNameQuality(value)<0
 }
 function geometryHeader(pages){
   const result={name:"",hn:"",dob:"",sex:"",profile:"",civilId:"",hospitalIds:[]};
   for(const page of pages||[]){
     const items=(page.textItems||[]).map(item=>({
       str:String(item.str||"").replace(/\u00a0/g," ").trim(),
       x:Number(item.x||0),y:Number(item.y||0),w:Number(item.w||0)
     })).filter(item=>item.str);
     const lines=[];
     items.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
       // Header labels in exported WMC PDFs can differ by about 2 pt on the
       // same visual row (for example Patient Name and Sex).
       let line=lines.find(entry=>Math.abs(entry.y-item.y)<=3.5);
       if(!line){line={y:item.y,items:[]};lines.push(line)}
       line.items.push(item)
     });
     for(const line of lines){
       const ordered=line.items.sort((a,b)=>a.x-b.x);
       const row=ordered.map(item=>item.str).join(" ").replace(/\s+/g," ").trim();
       let m;
       if(!result.profile&&/(?:Piyamaharajkarun|SIRIRAJ|ปิยมหาราชการุณย์|ศิริราช)/i.test(row))result.profile="SIRIRAJ";
       if(!result.profile&&/(?:BNH\s*Hospital|HOSPITAL\s+SINCE\s+1898)/i.test(row))result.profile="BNH";
       // Siriraj/Piyamaharajkarun uses Name / Patient No. / Birthdate rather
       // than the BNH-style Patient Name / Hospital Number / DOB labels.
       if(!result.name&&/(?:^|\s)Name\s*:/i.test(row)&&/Patient\s*No\.?/i.test(row)){
         const m=row.match(/(?:^|\s)Name\s*:\s*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*[ก-๙]{2,}(?:\s+[ก-๙]{2,}){1,3})(?=\s+Patient\s*No\.?)/i);
         if(m)result.name=MIW.Utils.normalizeName(m[1])
       }
       if(!result.hn&&(m=row.match(/Patient\s*No\.?\s*:\s*([A-Z0-9-]{4,20})/i)))result.hn=normalizeHospitalId(m[1]);
       if(!result.dob&&(m=row.match(/Birthdate\s*:\s*(\d{1,2}\s*(?:[ก-๙.]{2,12}|[A-Za-z]{3,9})\s*(?:24|25|19|20)\d{2})/i)))result.dob=normalizeTrustedSourceDob(m[1]);
       if(!result.sex&&(m=row.match(/\bSex\s*:\s*(ชาย|หญิง|Male|Female)(?=\s|$)/i)))result.sex=/ชาย|male/i.test(m[1])?"Male":"Female";
       if(!result.name&&/Patient\s*Name/i.test(row)){
         const patientAnchor=ordered.findIndex(item=>/Patient\s*Name/i.test(item.str));
         const sexAnchor=ordered.findIndex((item,i)=>i>patientAnchor&&/^Sex\b/i.test(item.str));
         const candidateItems=ordered.slice(patientAnchor+1,sexAnchor>patientAnchor?sexAnchor:ordered.length)
           .map(item=>item.str)
           .filter(value=>value!==":");
         const candidate=MIW.Utils.normalizeName(candidateItems.join(" ").replace(/^:\s*/,""));
         if(!isInvalidPatientName(candidate))result.name=candidate
       }
       if(!result.name&&(m=row.match(/Patient\s*Name\s*:?\s*(.*?)\s+Sex\s*:/i))){
         const candidate=MIW.Utils.normalizeName(m[1].replace(/^:\s*/,""));
         if(!isInvalidPatientName(candidate))result.name=candidate
       }
       if(!result.hn&&(m=row.match(/Hospital\s*Number\s*:?\s*([A-Z0-9-]{4,20})/i))){
         result.hn=normalizeHospitalId(m[1])
       }
       if(!result.dob&&(m=row.match(/\bDOB\s*:?\s*(\d{1,2}\s*[A-Za-z]{3}\s*\d{4}(?:\(\d{4}\))?)/i)))result.dob=m[1].replace(/\s+/g,"");
     }
     if(result.name&&result.hn&&result.dob)break
   }
   if(!result.profile){
     const pageText=(pages||[]).map(page=>String(page?.text||"")).join("\n");
     if(/Patient\s*No\.?[\s\S]{0,100}Birthdate|Birthdate[\s\S]{0,100}Patient\s*No\.?/i.test(pageText))result.profile="SIRIRAJ";
     else if(/Hospital\s*Number[\s\S]{0,120}\bDOB\b|\bDOB\b[\s\S]{0,120}Hospital\s*Number/i.test(pageText))result.profile="BNH";
   }
   const typed=extractTypedIdentifiers("",pages);
   result.civilId=typed.civilId;
   result.hospitalIds=[...new Set([result.hn,...typed.hospitalIds].map(normalizeHospitalId).filter(Boolean))];
   if(!result.hn)result.hn=result.hospitalIds[0]||"";
   return result
 }
 function identityTexts(text,pages=[]){
   const values=[String(text||"")];
   for(const page of pages||[]){
     values.push(String(page?.text||""));
     for(const candidate of page?.ocr?.candidates||[])values.push(String(candidate?.text||""))
   }
   return[...new Set(values.map(value=>value.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim()).filter(Boolean))]
 }
 function normalizeTrustedSourceDob(value){
   const raw=String(value||"").normalize("NFKC").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
   if(!raw)return"";
   const englishMonths={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
   const thaiMonths={"มค":1,"มกราคม":1,"กพ":2,"กุมภาพันธ์":2,"มีค":3,"มีนาคม":3,"เมย":4,"เมษายน":4,"พค":5,"พฤษภาคม":5,"มิย":6,"มิถุนายน":6,"กค":7,"กรกฎาคม":7,"สค":8,"สิงหาคม":8,"กย":9,"กันยายน":9,"ตค":10,"ตุลาคม":10,"พย":11,"พฤศจิกายน":11,"ธค":12,"ธันวาคม":12};
   const iso=(y,m,d)=>{
     y=Number(y);m=Number(m);d=Number(d);if(y>2400)y-=543;
     if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1800||y>2200||m<1||m>12||d<1||d>31)return"";
     const dt=new Date(Date.UTC(y,m-1,d));
     return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`:""
   };
   let m=raw.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);if(m)return iso(m[3],m[2],m[1]);
   m=raw.match(/\b(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/);if(m)return iso(m[1],m[2],m[3]);
   m=raw.match(/\b(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})\b/i);
   if(m&&englishMonths[m[2].toLowerCase()])return iso(m[3],englishMonths[m[2].toLowerCase()],m[1]);
   // Thai Buddhist date, e.g. 15 ธ.ค. 2495.  Remove punctuation only from the
   // month token so the surrounding label remains intact for diagnostics.
   m=raw.match(/(\d{1,2})\s*([ก-๙.]{2,12})\s*(25\d{2}|24\d{2})/);
   if(m){const key=m[2].replace(/[.\s]/g,"");if(thaiMonths[key])return iso(m[3],thaiMonths[key],m[1])}
   return""
 }
 function trustedSourceIdentity(text,pages=[]){
   const sources=identityTexts(text,pages);
   const joined=sources.join("\n");
   const profile=/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area|ECW\s*\/\s*TBW/i.test(joined)?"INBODY_720":/Piyamaharajkarun|SIRIRAJ|ปิยมหาราชการุณย์|ศิริราช/i.test(joined)?"SIRIRAJ":/BNH\s*Hospital|HOSPITAL\s+SINCE\s+1898/i.test(joined)?"BNH":"";
   const result={profile,name:"",hn:"",dob:"",sex:"",confidence:0,evidence:[]};
   if(!profile)return result;
   const add=(field,value,label)=>{if(!value||result[field])return;result[field]=value;result.evidence.push(`${label}:${value}`)};
   for(const source of sources){
     for(const rawLine of String(source||"").split(/\r?\n/)){
       const line=rawLine.replace(/\u00a0/g," ").replace(/[\u200B-\u200F\u2060\uFEFF]/g,"").replace(/\s+/g," ").trim();if(!line)continue;
       let m;
       if(profile==="INBODY_720"){
         if(!result.hn&&(m=line.match(/\bHN\s*[:#.-]?\s*([0-9][0-9-]{5,20})/i)))add("hn",normalizeHospitalId(m[1]),"INBODY_HN");
         if(!result.dob&&(m=line.match(/\bDOB\s*[:#.-]?\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*(?:19|20)\d{2}(?:\(25\d{2}\))?)/i)))add("dob",normalizeTrustedSourceDob(m[1]),"INBODY_DOB");
         if(!result.name&&(m=line.match(/\b(?:MISS|MR|MRS|MS)\.?\s+([A-Z][A-Z.'-]{1,}(?:\s+[A-Z][A-Z.'-]{1,}){1,4})\b/))){
           add("name",MIW.Utils.normalizeName(m[0]),"INBODY_HEADER_NAME")
         }
         if(!result.sex&&(m=line.match(/\b(?:GENDER|SEX)\s*[:#.-]?\s*(Male|Female)\b|\((Male|Female)\)/i)))add("sex",/^male$/i.test(m[1]||m[2])?"Male":"Female","INBODY_SEX")
       }else if(profile==="SIRIRAJ"){
         if(!result.hn&&(m=line.match(/Patient\s*No\.?\s*[:#.-]?\s*([A-Z0-9-]{4,20})/i)))add("hn",normalizeHospitalId(m[1]),"SIRIRAJ_PATIENT_NO");
         if(!result.dob&&(m=line.match(/Birthdate\s*[:#.-]?\s*(.+?)(?=\s+(?:Age|Patient\s*No|Case\s*No|Clinic|Ward|Sex)\b|$)/i)))add("dob",normalizeTrustedSourceDob(m[1]),"SIRIRAJ_BIRTHDATE");
         if(!result.name&&(m=line.match(/(?:Patient\s*name|\bName)\s*[:#.-]?\s*(.+?)(?=\s+(?:Birthdate|Patient\s*No|Case\s*No|Clinic|Ward|Sex|Age)\b|$)/i))){
           // The Siriraj source is Thai. Never trust a letters-only OCR token
           // after Name: (the real failure was "wyadjaungassu"). Require a
           // Thai honorific + at least two Thai name tokens from the header.
           const thai=String(m[1]||"").match(/((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*[ก-๙]{2,}(?:\s+[ก-๙]{2,}){1,3})/);
           if(thai)add("name",MIW.Utils.normalizeName(thai[1].replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)(?=[ก-๙])/,'$1 ')),"SIRIRAJ_HEADER_NAME")
         }
         if(!result.sex&&(m=line.match(/\bSex\s*[:#.-]?\s*(ชาย|หญิง|Male|Female)(?=\s|$)/i)))add("sex",/ชาย|male/i.test(m[1])?"Male":"Female","SIRIRAJ_SEX")
       }else if(profile==="BNH"){
         if(!result.hn&&(m=line.match(/Hospital\s*Number\s*[:#.-]?\s*([A-Z0-9-]{4,20})/i)))add("hn",normalizeHospitalId(m[1]),"BNH_HOSPITAL_NUMBER");
         if(!result.dob&&(m=line.match(/\bDOB\s*[:#.-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i)))add("dob",normalizeTrustedSourceDob(m[1]),"BNH_DOB");
         if(!result.name&&(m=line.match(/Patient\s*Name\s*[:#.-]?\s*(.+?)(?=\s+(?:Hospital\s*Number|Lab\s*Episode|Age\s*On|DOB|Sex)\b|$)/i))){
           const thai=String(m[1]||"").match(/((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*[ก-๙]{2,}(?:\s+[ก-๙]{2,}){1,3})/);
           const latin=String(m[1]||"").match(/((?:Mr|Mrs|Ms|Miss|Master|Dr)\.?\s+)?([A-Z][A-Za-z.'-]{1,}(?:\s+[A-Z][A-Za-z.'-]{1,}){1,3})/);
           if(thai)add("name",MIW.Utils.normalizeName(thai[1]),"BNH_HEADER_NAME");else if(latin)add("name",MIW.Utils.normalizeName(latin[0]),"BNH_HEADER_NAME")
         }
         if(!result.sex&&(m=line.match(/\bSex\s*[:#.-]?\s*(Male|Female)\b/i)))add("sex",/^male$/i.test(m[1])?"Male":"Female","BNH_SEX")
       }
     }
   }
   // Header labels and values are sometimes emitted on separate OCR lines.
   // Re-scan the whole source text after the line pass so a clean hospital
   // header can still become the identity source of truth.  These expressions
   // are intentionally source-profile specific; generic OCR prose must never
   // create patient identity here.
   if(profile==="INBODY_720"){
     let m;
     if(!result.hn&&(m=joined.match(/\bHN\s*[:#.-]?\s*([0-9][0-9-]{5,20})/i)))add("hn",normalizeHospitalId(m[1]),"INBODY_HN_JOINED");
     if(!result.dob&&(m=joined.match(/\bDOB\s*[:#.-]?\s*(\d{1,2}\s*[A-Za-z]{3,9}\s*(?:19|20)\d{2}(?:\(25\d{2}\))?)/i)))add("dob",normalizeTrustedSourceDob(m[1]),"INBODY_DOB_JOINED");
     if(!result.name&&(m=joined.match(/\b(?:MISS|MR|MRS|MS)\.?\s+([A-Z][A-Z.'-]{1,}(?:\s+[A-Z][A-Z.'-]{1,}){1,4})\b/)))add("name",MIW.Utils.normalizeName(m[0]),"INBODY_HEADER_NAME_JOINED");
     if(!result.sex&&(m=joined.match(/\b(?:GENDER|SEX)\s*[:#.-]?\s*(Male|Female)\b|\((Male|Female)\)/i)))add("sex",/^male$/i.test(m[1]||m[2])?"Male":"Female","INBODY_SEX_JOINED");
   }else if(profile==="SIRIRAJ"){
     let m;
     if(!result.hn&&(m=joined.match(/Patient\s*No\.?\s*[:#.-]?\s*([0-9][0-9 -]{4,20})/i)))add("hn",normalizeHospitalId(m[1]),"SIRIRAJ_PATIENT_NO_JOINED");
     if(!result.dob&&(m=joined.match(/Birthdate\s*[:#.-]?\s*(\d{1,2}\s*(?:[ก-๙.]{2,12}|[A-Za-z]{3,9})\s*(?:24|25|19|20)\d{2})/i)))add("dob",normalizeTrustedSourceDob(m[1]),"SIRIRAJ_BIRTHDATE_JOINED");
     if(!result.name&&(m=joined.match(/(?:Patient\s*name|(?:^|\n)\s*Name)\s*[:#.-]?\s*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*[ก-๙]{2,}(?:\s+[ก-๙]{2,}){1,3})/im)))add("name",MIW.Utils.normalizeName(m[1]),"SIRIRAJ_HEADER_NAME_JOINED");
     if(!result.sex&&(m=joined.match(/\bSex\s*[:#.-]?\s*(ชาย|หญิง|Male|Female)(?=\s|$)/i)))add("sex",/ชาย|male/i.test(m[1])?"Male":"Female","SIRIRAJ_SEX_JOINED");
   }else if(profile==="BNH"){
     let m;
     if(!result.hn&&(m=joined.match(/Hospital\s*Number\s*[:#.-]?\s*([0-9][0-9 -]{4,20})/i)))add("hn",normalizeHospitalId(m[1]),"BNH_HOSPITAL_NUMBER_JOINED");
     if(!result.dob&&(m=joined.match(/\bDOB\s*[:#.-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i)))add("dob",normalizeTrustedSourceDob(m[1]),"BNH_DOB_JOINED");
     if(!result.name&&(m=joined.match(/Patient\s*Name\s*[:#.-]?\s*((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*[ก-๙]{2,}(?:\s+[ก-๙]{2,}){1,3})/i)))add("name",MIW.Utils.normalizeName(m[1]),"BNH_HEADER_NAME_JOINED");
     if(!result.sex&&(m=joined.match(/\bSex\s*[:#.-]?\s*(Male|Female)(?=\s|$)/i)))add("sex",/^male$/i.test(m[1])?"Male":"Female","BNH_SEX_JOINED");
   }

   // A source-specific HN/DOB is more valuable than an unanchored generic OCR
   // name. Confidence is diagnostic only; parseMeta still applies normal guards.
   result.confidence=(result.hn?40:0)+(result.dob?35:0)+(result.name?25:0);
   return result
 }
 function normalizeCivilId(value){
   const digits=String(value||"").replace(/\D/g,"");
   return digits.length===12?digits:""
 }
 function normalizeHospitalId(value){
   const normalized=String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
   // A hospital identifier must contain a digit.  Header words such as
   // DOCTOR can appear immediately after an empty Hospital Number field when
   // OCR collapses rows; they are layout evidence, never patient identity.
   if(!normalized||normalized.length<4||normalized.length>20||!/\d/.test(normalized)||/^\d{12}$/.test(normalized))return"";
   if(/^(?:DOCTOR|CLINICIAN|REQUESTEDBY|LOCATION|WARD|ROOMBED|ROOM|SEX|MALE|FEMALE|AGE|DOB|PASSPORT|SPECIMEN|LABNO|RECEIVED|REPORTED|APPROVED|PATIENTNAME|HOSPITALNUMBER|UNKNOWNPATIENT)\d*$/.test(normalized))return"";
   return normalized
 }
 function extractTypedIdentifiers(text,pages=[]){
   const civilIds=[],hospitalIds=[];
   const addCivil=value=>{
     const normalized=normalizeCivilId(value);
     if(normalized&&!civilIds.includes(normalized))civilIds.push(normalized)
   };
   const addHospital=value=>{
     const normalized=normalizeHospitalId(value);
     if(normalized&&!hospitalIds.includes(normalized))hospitalIds.push(normalized)
   };
   for(const source of identityTexts(text,pages)){
     let match;
     const civilLabel=/(?:CIVIL|CIVIL\s*NO|CIVI\s*L|CIILI?D)\s*(?:ID|1D|NO\.?)?\s*[:.]?\s*([0-9][0-9\s-]{10,16})/ig;
     while((match=civilLabel.exec(source)))addCivil(match[1]);
     const twelveDigits=/\b(\d{12})\b/g;
     while((match=twelveDigits.exec(source))){
       const prefix=source.slice(Math.max(0,match.index-45),match.index);
       // Twelve-digit laboratory/request numbers are common in Thai LIS
       // headers and are not national identifiers.
       if(/(?:LAB|REQUEST|ACCESSION|SAMPLE|BARCODE)\s*(?:NO\.?|NUMBER)?\s*[:#.-]?\s*$/i.test(prefix))continue;
       addCivil(match[1])
     }
     // Keep identifier labels and values on the same OCR line.  Using \s*
     // here allowed an empty "Hospital Number" field to jump across a newline
     // and consume the next label (most visibly DOCTOR) as the HN/MRN.
     for(const line of source.split(/\r?\n/)){
       const hospitalLabel=/(?:\bHN\b|\bMRN\b|HOSP(?:ITAL)?[ \t]*(?:ID|1D|NO\.?|NUMBER)|PATIENT[ \t]*(?:ID|1D|NO\.?))[ \t]*[:#.-]?[ \t]*([A-Z0-9][A-Z0-9-]{3,19})/ig;
       while((match=hospitalLabel.exec(line)))addHospital(match[1])
     }
   }
   return{civilId:civilIds[0]||"",civilIds,hospitalIds}
 }
 function extractEntities(text,pages=[]){
   const clean=String(text||"").replace(/\u00a0/g," ");
   const positioned=geometryHeader(pages);
   const typed=extractTypedIdentifiers(clean,pages);
   const trusted=trustedSourceIdentity(clean,pages);
   let name=trusted.name||positioned.name,dob=trusted.dob||positioned.dob,hn=trusted.hn||positioned.hn||typed.hospitalIds[0]||"",date="",hospital="";
   const thaiFileName=clean.match(/---\s*FILE\s*:[^\n]*?(นาย|นางสาว|นาง|คุณ)\s*([ก-๙]{2,})\s+([ก-๙]{2,})(?=\s*(?:\(\d+\))?\.(?:jpe?g|png|webp|bmp|pdf)\b)/i);
   // The report header is primary identity evidence.  A filename may use the
   // generic honorific "คุณ" even when the laboratory header reports "นาย"
   // or "นาง".  Use the filename only when no valid positioned header was
   // recovered, otherwise a convenient upload label would overwrite source
   // truth (the Folate Serum attachment is the concrete regression case).
   if(!name&&thaiFileName)name=MIW.Utils.normalizeName(`${thaiFileName[1]} ${thaiFileName[2]} ${thaiFileName[3]}`);

   // Scanned Maharat documents can put the patient's identity on a clinical
   // note page while the reportable laboratory rows start on the next page.
   // Identity OCR is evidence-only: read every retained OCR pass, but never
   // let the clinical-note page create a laboratory result.
   if(!name){
     const candidates=[];
     for(const source of identityTexts(clean,pages)){
       for(const line of source.split(/\r?\n/)){
         const match=line.match(/^\s*NAME\s*:?\s*(.+?)(?=\s+(?:HN|WARD|GENDER|SEX|DOB|AGE|VN|PID|LAB\s*NO)\b|$)/i)||
           line.match(/ชื่อ\s*[-:]?\s*สกุล\s*:?\s*(.+?)(?=\s*(?:อายุ|วันเกิด|HN|VN|PID|$))/i);
         if(!match)continue;
         const raw=String(match[1]||"").replace(/[._]+/g," ").trim();
         const thaiTokens=(raw.match(/[ก-๙]+/g)||[]).filter(Boolean);
         let candidate="";
         if(thaiTokens.length){
           // Preserve ordinary Thai word boundaries. If OCR separated nearly
           // every glyph, compact the run and retain the honorific boundary.
           const substantial=thaiTokens.filter(token=>token.length>1).length;
           const thaiName=substantial>=2?thaiTokens.join(" "):thaiTokens.join("")
             .replace(/^(นางสาว|นาย|นาง|คุณ)(?=[ก-๙])/,"$1 ");
           candidate=MIW.Utils.normalizeName(thaiName)
         }else{
           candidate=MIW.Utils.normalizeName(raw
             .replace(/\b(?:MR|MRS|MS|MISS)\.?\s*/i,"")
             .replace(/\s+\d[\d\s()/.-]*$/,""))
         }
         const thai=/[ก-๙]{3,}/.test(candidate);
         const english=/^[A-Za-z][A-Za-z.'-]{1,}(?:\s+[A-Za-z][A-Za-z.'-]{1,})+$/.test(candidate);
         if(!isInvalidPatientName(candidate)&&(thai||english))candidates.push({
           name:candidate,
           score:(thai?100:0)+(/^(?:นางสาว|นาย|นาง|คุณ)\s/.test(candidate)?25:0)+
             Math.min(20,candidate.replace(/\s/g,"").length)+
             Math.min(12,Math.max(0,candidate.split(/\s+/).length-1)*4)
         })
       }
     }
     name=candidates.sort((a,b)=>b.score-a.score)[0]?.name||""
   }

   // RGCC summary table: Patient <name> <DOB> <disease> <stage>
   const rgccPatterns=[
     /Patient\s+([A-Z][A-Za-z .'-]{3,}?)\s+(\d{4}-[A-Za-z]{3}-\d{2})\s+[A-Za-z]/i,
     /NAME\s+DATE OF BIRTH\s+DISEASE\s+STAGE\s+([A-Z][A-Za-z .'-]{3,}?)\s+(\d{4}-[A-Za-z]{3}-\d{2})\s+[A-Za-z]/i,
     /Patient\s+NAME\s+DATE OF BIRTH[\s\S]{0,180}?([A-Z][A-Za-z .'-]{3,}?)\s+(\d{4}-[A-Za-z]{3}-\d{2})/i
   ];
   for(const pattern of rgccPatterns){
     const m=clean.match(pattern);
     if(m&& !/DATE OF BIRTH|DISEASE|STAGE/i.test(m[1])){
       name=MIW.Utils.normalizeName(m[1]);
       dob=m[2]||"";
       break
     }
   }

   if(!name){
     const metastatPatient=clean.match(/Results\s+Analysis\s+Report\s+on\s+a\s+patient\s+([A-Z][A-Za-z .'-]{3,}?)\s+suffering\s+from/i);
     if(metastatPatient&&!isInvalidPatientName(metastatPatient[1]))name=MIW.Utils.normalizeName(metastatPatient[1])
   }

   if(!name&&!trusted.profile){
     // Generic Name:/Patient: extraction is only a fallback for unknown source
     // formats.  Once a hospital profile is recognized, identity must come from
     // that hospital's trusted header schema (or the explicit manual merge gate).
     // This prevents OCR prose such as "wyadjaungassu Patient No." from becoming
     // a patient name merely because it follows a generic Name label.
     const standardPatterns=[
       /Patient\s*Name\s*[:\-]?\s*(?:MR\.?|MRS\.?|MS\.?|MISS)?\s*([A-Z][A-Z ,.'-]{5,}?)(?=\s{2,}|\n|HN|MRN|DOB|Date of Birth)/i,
       /(?:Name|Patient)\s*[:\-]\s*(?:MR\.?|MRS\.?|MS\.?|MISS)?\s*([A-Za-z][A-Za-z .'-]{4,})/i
     ];
     for(const pattern of standardPatterns){
       const m=clean.match(pattern);if(!m)continue;
       const candidate=MIW.Utils.normalizeName(m[1]);
       if(!/DATE OF BIRTH|DISEASE|STAGE/i.test(candidate)&&!isInvalidPatientName(candidate)){name=candidate;break}
     }
   }

   if(!hn)hn=(clean.match(/(?:HN|MRN|Hospital[ \t]*(?:ID|No\.?|Number)|Patient[ \t]*ID)[ \t]*[:\-]?[ \t]*([A-Z0-9\-]{4,20})/i)||[])[1]||"";
   if(!dob){
     dob=(clean.match(/(?:DOB|Date of Birth)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-](?:19|20|25)\d{2}|\d{4}-[A-Za-z]{3}-\d{2})/i)||[])[1]||""
   }

   const numericDate=(clean.match(/(?:Report Date|Document Date|Visit Date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-](?:20|25)\d{2})/i)||[])[1]||"";
   date=MIW.Utils.dateToISO(numericDate);
   if(!date){
     const textual=(clean.match(/(?:Report Date|REPORT DATE)\s*[:\-]?\s*((?:20\d{2}\s+[A-Za-z.]+\s+\d{1,2})|(?:\d{1,2}\s+[A-Za-z.]+\s+20\d{2}))/i)||[])[1]||"";
     date=parseMonthDate(textual)
   }
   if(!date){
     const rgccFooterDate=(clean.match(/Patient\s+Name\s*:[^\n]{2,120}?\bDate\s*:\s*(\d{1,2}\s+[A-Za-z.]+\s+20\d{2})/i)||[])[1]||"";
     date=parseMonthDate(rgccFooterDate)
   }

   hospital=(clean.match(/\b(Bangkok Hospital|Bumrungrad|Samitivej|MedPark|RGCC International|World Medical Hospital|Maharat Nakhon Ratchasima Hospital)\b/i)||[])[1]||"";
   if(!hospital&&/(?:\bRGCC\b|ONCONOMICS\s*PLUS|ONCONOMICS|ONCOTRAIL|METASTAT)/i.test(clean))hospital="RGCC International";

   // Reject header leakage.
   if(/DATE OF BIRTH|DISEASE|STAGE|REPORT SUMMARY/i.test(name)||isInvalidPatientName(name))name="";

   const hospitalIds=[...new Set([trusted.hn,hn,...positioned.hospitalIds,...typed.hospitalIds].map(normalizeHospitalId).filter(Boolean))];
   return{name,hn:hospitalIds[0]||"",hospitalIds,civilId:typed.civilId||positioned.civilId||"",civilIds:typed.civilIds,dob:trusted.dob||dob,date,hospital,sourceIdentityProfile:trusted.profile||"",sourceIdentityEvidence:trusted.evidence||[],sourceIdentityConfidence:trusted.confidence||0,sex:trusted.sex||""}
 }
 return{classify,extractEntities,extractTypedIdentifiers,isInvalidPatientName,patientNameQuality,geometryHeader,trustedSourceIdentity,normalizeTrustedSourceDob,hasOnconomicsEvidence,strongGeneralLabEvidence,truePathologyEvidence,pathologyClinicHeaderOnly,resolveReviewRoute}
})();
