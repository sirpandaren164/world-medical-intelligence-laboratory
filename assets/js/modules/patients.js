window.MIW=window.MIW||{};
MIW.Patients=(function(){
 let patients=[],selectedId="";
 const THAI_TITLES=/^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s*/;
 const ENGLISH_TITLES=/^(?:mr|mrs|ms|miss|master|dr)\.?\s+/i;
 const MONTHS={jan:"01",january:"01",feb:"02",february:"02",mar:"03",march:"03",apr:"04",april:"04",may:"05",jun:"06",june:"06",jul:"07",july:"07",aug:"08",august:"08",sep:"09",sept:"09",september:"09",oct:"10",october:"10",nov:"11",november:"11",dec:"12",december:"12"};
 const IDENTITY_LABELS=/\b(?:HN|MRN|HOSPITAL\s*(?:ID|NO\.?|NUMBER)|PATIENT\s*ID|DOB|DATE\s*OF\s*BIRTH|AGE|SEX|GENDER|WARD|ROOM(?:\/BED)?|LAB\s*NO\.?)\b/i;
 function sanitizePatientName(value){
   // v10.231: remove invisible Unicode format/control characters before any
   // identity decision. OCR can insert zero-width characters inside a noise
   // token (e.g. "wyad\u200bjaungassu"). It renders as the same visible string
   // but bypasses a plain /^[a-z]+$/ guard unless stripped first.
   const raw=String(value||"")
     .normalize("NFKC")
     .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,"")
     .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,"");
   let name=MIW.Utils.normalizeName(raw.replace(/[_]+/g," "));
   if(!name)return"";
   name=name.replace(/^(?:PATIENT(?:\s*NAME)?|NAME|ชื่อผู้ป่วย)\s*[:：-]?\s*/i,"");
   const leak=name.search(IDENTITY_LABELS);
   if(leak>0)name=name.slice(0,leak);
   name=name.replace(/\s+\d{6,}(?:\s.*)?$/," ").replace(/\.(?:pdf|jpe?g|png|html?)$/i,"").trim();
   name=name.replace(/\s+(?:เพพ|เหพ|ebook|e-book|laboratory|ctc)(?:\s+report)?$/i,"").trim();
   name=name.replace(/^((?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s+[ก-๙]{2,}\s+[ก-๙]{2,})\s+(?:เพพ|เหพ)$/,"$1").trim();
   return MIW.Utils.normalizeName(name)
 }
 function extractNameFromFileName(value){
   const base=String(value||"").replace(/^.*[\\/]/,"").replace(/\.[^.]+$/," ").replace(/[_]+/g," ").replace(/\(\d+\)\s*$/," ").replace(/\s+/g," ").trim();
   if(!base)return"";
   const thai=base.match(/(?:^|\s)((?:นาย|นางสาว|นาง|คุณ)\s*[ก-๙]+(?:\s+[ก-๙]+){1,3})(?=\s*$|\s*\d|\s*\()/);
   if(thai)return sanitizePatientName(thai[1].replace(/^(นาย|นางสาว|นาง|คุณ)(?=[ก-๙])/,'$1 '));
   const rgcc=base.split(/\s+-\s+(?:Onconomics|(?:Lung\s+)?Oncotrail|METASTAT)\b/i)[0].trim();
   if(/^[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){1,3}$/.test(rgcc))return sanitizePatientName(rgcc);
   return""
 }
 function suspiciousLowercaseLatin(value){
   const name=sanitizePatientName(value),tokens=name.split(/\s+/).filter(Boolean);
   return Boolean(tokens.length>=3&&/^[a-z .'-]+$/.test(name)&&tokens.every(token=>token.length<=7))
 }
 function normalizeIdentifier(value){
   const normalized=String(value||"").toUpperCase()
     .replace(/^(?:HN|MRN|HOSPITAL\s*NUMBER)\s*[:#-]*/,"")
     .replace(/[^A-Z0-9]/g,"");
   if(!normalized||normalized.length<4||normalized.length>20||!/\d/.test(normalized)||/^\d{12}$/.test(normalized))return"";
   if(/^(?:DOCTOR|CLINICIAN|REQUESTEDBY|LOCATION|WARD|ROOMBED|ROOM|SEX|MALE|FEMALE|AGE|DOB|PASSPORT|SPECIMEN|LABNO|RECEIVED|REPORTED|APPROVED|PATIENTNAME|HOSPITALNUMBER|UNKNOWNPATIENT)\d*$/.test(normalized))return"";
   return normalized
 }
 function normalizeCivilId(value){
   const digits=String(value||"").replace(/\D/g,"");
   return digits.length===12?digits:""
 }
 function normalizeYear(primary,secondary=""){
   const toGregorian=value=>{
     const year=Number(value);
     if(!Number.isInteger(year))return null;
     return year>2400?year-543:year
   };
   const year=toGregorian(primary);
   if(year===null||year<1800||year>new Date().getFullYear())return null;
   if(secondary){
     const paired=toGregorian(secondary);
     if(paired===null||paired!==year)return null
   }
   return year
 }
 function validIsoDob(year,month,day){
   if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day))return"";
   const date=new Date(Date.UTC(year,month-1,day));
   if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return"";
   return`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`
 }
 function normalizedDobParts(day,month,primaryYear,secondaryYear=""){
   const year=normalizeYear(primaryYear,secondaryYear);
   return year===null?"":validIsoDob(year,Number(month),Number(day))
 }
 function normalizeDob(value){
   const raw=String(value||"").replace(/[().,]/g," ").replace(/\s+/g," ").trim();
   if(!raw)return"";
   let m=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{4}))?$/);
   if(m){
     return normalizedDobParts(m[3],m[2],m[1],m[4])
   }
   m=raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{4}))?$/);
   if(m){
     return normalizedDobParts(m[1],m[2],m[3],m[4])
   }
   m=raw.match(/^(\d{4})[-\s]*([A-Za-z]+)[-\s]*(\d{1,2})(?:\s*(\d{4}))?$/);
   if(m&&MONTHS[m[2].toLowerCase()]){
     return normalizedDobParts(m[3],MONTHS[m[2].toLowerCase()],m[1],m[4])
   }
   m=raw.match(/^(\d{1,2})[-\s]*([A-Za-z]+)[-\s]*(\d{4})(?:\s*(\d{4}))?$/);
   if(m&&MONTHS[m[2].toLowerCase()]){
     return normalizedDobParts(m[1],MONTHS[m[2].toLowerCase()],m[3],m[4])
   }
   // Unknown OCR fragments must not become identity evidence.  Keep the raw
   // value in the source record, but exclude it from patient matching.
   return""
 }
 function canonicalName(value){
   return sanitizePatientName(value)
     .replace(THAI_TITLES,"")
     .replace(ENGLISH_TITLES,"")
     .replace(/[\s.,'’\-–—]+/g,"")
     .toLocaleLowerCase()
 }
 function nameScript(value){
   const text=String(value||"");
   const thai=/[ก-๙]/.test(text),latin=/[A-Za-z]/.test(text);
   return thai&&latin?"MIXED":thai?"THAI":latin?"LATIN":"OTHER"
 }
 function nameTokens(value){
   return sanitizePatientName(value)
     .replace(THAI_TITLES,"")
     .replace(ENGLISH_TITLES,"")
     .toLocaleLowerCase()
     .split(/[^a-z0-9ก-๙]+/)
     .filter(token=>token.length>=2)
 }
 function compatibleName(left,right){
   const a=nameTokens(left),b=nameTokens(right);
   if(!a.length||!b.length)return false;
   if(canonicalName(left)===canonicalName(right))return true;
   if(nameScript(left)!==nameScript(right)||a.length<2||b.length<2)return false;
   const shorter=a.length<=b.length?a:b,longer=a.length<=b.length?b:a;
   let exact=false,cursor=0;
   for(const token of shorter){
     const index=longer.findIndex((candidate,i)=>i>=cursor&&(
       candidate===token||
       (candidate.slice(0,3)===token.slice(0,3)&&Math.abs(candidate.length-token.length)<=2)
     ));
     if(index<0)return false;
     if(longer[index]===token)exact=true;
     cursor=index+1
   }
   return exact
 }
 function nameQuality(value){
   const name=sanitizePatientName(value);
   if(!name)return-1000;
   let score=MIW.Classifier?.patientNameQuality?Number(MIW.Classifier.patientNameQuality(name)):0;
   const thai=/[ก-๙]/.test(name),latin=/[A-Za-z]/.test(name),tokens=name.split(/\s+/).filter(Boolean);
   if(thai)score+=120;
   if(/^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)\s+/.test(name))score+=90;
   else if(/^คุณ\s+/.test(name))score+=25;
   if(latin&&tokens.length>=2&&tokens.every(token=>/^[A-Z][A-Za-z.'-]*$/.test(token)))score+=35;
   if(suspiciousLowercaseLatin(name))score-=180;
   if(/^(?:นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|คุณ)\s+[ก-๙]{2,}\s+[ก-๙]{2,}\s+(?:เพพ|เหพ)$/.test(name))score-=500;
   if(IDENTITY_LABELS.test(String(value||"")))score-=320;
   return score
 }
 function plausibleIdentityName(value){
   const name=sanitizePatientName(value);
   if(!name||nameQuality(name)<0||MIW.Classifier?.isInvalidPatientName?.(name))return false;
   // Patient names should not contain OCR control glyphs or embedded digits.
   // These fragments (for example "wy @d1") are common scan-header noise and
   // must not veto an otherwise strong source/Registry identity consensus.
   if(/\d/.test(name)||/[@#$%^&*_=+<>?\\|{}\[\]~`]/.test(name))return false;
   // v10.231: OCR header fragments may be normalized into a letters-only token
   // (real report example: "wyadjaungassu"). A single all-lowercase Latin token
   // is not sufficient patient-name evidence in this medical workflow because it
   // has no first/last-name boundary and commonly comes from scan-header noise.
   // Keep title/name pairs and multi-token Latin names; exact HN/DOB Registry
   // evidence can still anchor a source even when its OCR name is discarded.
   if(/^[a-z]{5,}$/.test(name))return false;
   return true
 }
 function bestPatientName(values=[],options={}){
   const preferThai=Boolean(options.preferThai);
   return values.map(value=>sanitizePatientName(value)).filter(Boolean)
     .filter(value=>plausibleIdentityName(value))
     .sort((a,b)=>{
       const thaiA=/[ก-๙]/.test(a),thaiB=/[ก-๙]/.test(b);
       const preferredA=preferThai&&thaiA?180:0,preferredB=preferThai&&thaiB?180:0;
       return (nameQuality(b)+preferredB)-(nameQuality(a)+preferredA)||b.length-a.length
     })[0]||""
 }
 function patientNames(patient){
   return[patient?.name,...(Array.isArray(patient?.aliases)?patient.aliases:[])]
     .map(value=>sanitizePatientName(value))
     .filter(Boolean)
 }
 function patientHospitalIds(patient){
   return[patient?.hn,...(Array.isArray(patient?.hospitalIds)?patient.hospitalIds:[])]
     .map(normalizeIdentifier)
     .filter(Boolean)
 }
 function suspiciousNearHospitalId(left,right){
   const a=normalizeIdentifier(left),b=normalizeIdentifier(right);
   if(!a||!b||a===b||a.length!==b.length)return false;
   let differences=0;
   for(let i=0;i<a.length;i++){
     if(a[i]!==b[i]&&++differences>1)return false
   }
   return differences===1
 }
 function hospitalIdEditDistance(left,right){
   const a=normalizeIdentifier(left),b=normalizeIdentifier(right);if(!a||!b)return 99;
   const dp=Array.from({length:b.length+1},(_,i)=>i);
   for(let i=1;i<=a.length;i++){
     let previous=dp[0];dp[0]=i;
     for(let j=1;j<=b.length;j++){
       const saved=dp[j];
       dp[j]=Math.min(dp[j]+1,dp[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
       previous=saved
     }
   }
   return dp[b.length]
 }
 function likelyOcrHospitalIdVariant(candidate,anchor){
   const id=normalizeIdentifier(candidate),base=normalizeIdentifier(anchor);
   if(!id||!base||id===base)return id===base;
   if(id.length>=4&&base.startsWith(id)&&base.length-id.length>=2)return true;
   if(base.length>=4&&id.startsWith(base)&&id.length-base.length>=2)return true;
   if(Math.abs(id.length-base.length)<=1&&hospitalIdEditDistance(id,base)<=1)return true;
   return false
 }
 function canonicalHospitalIds(valuesInput=[],preferred=""){
   const ids=[...new Set(values(valuesInput).map(normalizeIdentifier).filter(Boolean))];
   const anchorId=normalizeIdentifier(preferred)||ids[0]||"";if(!anchorId)return[];
   return[anchorId,...ids.filter(id=>id!==anchorId&&!likelyOcrHospitalIdVariant(id,anchorId))]
 }
 function patientCivilIds(patient){
   return[patient?.civilId,...(Array.isArray(patient?.civilIds)?patient.civilIds:[])]
     .map(normalizeCivilId)
     .filter(Boolean)
 }
 function values(value){
   return Array.isArray(value)?value:value?[value]:[]
 }
 function candidateIdentifiers(candidate={}){
   const civilIds=[
     ...values(candidate.civilId),
     ...values(candidate.civil_id),
     ...values(candidate.civilIds),
     ...values(candidate.civil_ids)
   ].map(normalizeCivilId).filter(Boolean);
   const rawHospitalIds=[
     candidate.hn,
     candidate.patient_id,
     ...values(candidate.hospitalIds),
     ...values(candidate.hospital_ids)
   ].map(normalizeIdentifier).filter(id=>id&&!civilIds.includes(id));
   // v10.228: OCR variants of one physical-source HN are aliases, not
   // independent identity requirements. Genuinely distinct IDs remain.
   const preferredHospitalId=normalizeIdentifier(candidate.hn||candidate.patient_id||"");
   const hospitalIds=canonicalHospitalIds(rawHospitalIds,preferredHospitalId);
   return{civilIds:[...new Set(civilIds)],hospitalIds}
 }
 function mergedAliases(patient,incomingName){
   const names=[...patientNames(patient),sanitizePatientName(incomingName)].filter(Boolean);
   const seen=new Set();
   return names.filter(name=>{
     const key=canonicalName(name);
     if(!key||seen.has(key))return false;
     seen.add(key);return true
   })
 }
 async function load(){
   const [stored,documents,oncoReports]=await Promise.all([
     MIW.Database.all("patients"),
     MIW.Database.all("documents").catch(()=>[]),
     MIW.Database.all("oncoReports").catch(()=>[])
   ]);
   patients=[];
   for(const record of stored){
     const hospitalIds=[...new Set([record?.hn,...(Array.isArray(record?.hospitalIds)?record.hospitalIds:[])]
       .map(normalizeIdentifier).filter(Boolean))];
     const relatedDocuments=(documents||[]).filter(doc=>{
       if(doc?.patientId&&doc.patientId===record.id)return true;
       const docIds=candidateIdentifiers({hn:doc?.patientHN,hospitalIds:doc?.patientHospitalIDs}).hospitalIds;
       return hospitalIds.length&&docIds.some(id=>hospitalIds.includes(id))
     });
     const relatedOnco=(oncoReports||[]).filter(report=>report?.patientId===record.id||(
       normalizeDob(report?.dob)&&normalizeDob(record?.dob)&&normalizeDob(report.dob)===normalizeDob(record.dob)
     ));
     const sourceNameCandidates=[];
     for(const doc of relatedDocuments){
       sourceNameCandidates.push(doc?.patientName,extractNameFromFileName(doc?.fileName));
       for(const file of doc?.sourceFiles||[])sourceNameCandidates.push(extractNameFromFileName(file?.name))
     }
     for(const report of relatedOnco)sourceNameCandidates.push(report?.patientName,extractNameFromFileName(report?.fileName));
     const allCandidates=[record?.name,...(Array.isArray(record?.aliases)?record.aliases:[]),...sourceNameCandidates];
     const repairedName=bestPatientName(allCandidates,{preferThai:Boolean(hospitalIds.length)})||sanitizePatientName(record?.name)||"Unknown patient";
     const aliasMap=new Map();
     for(const candidate of allCandidates){
       const clean=sanitizePatientName(candidate),key=canonicalName(clean);
       if(!clean||!key||nameQuality(clean)<0||MIW.Classifier?.isInvalidPatientName?.(clean))continue;
       aliasMap.set(key,clean)
     }
     aliasMap.set(canonicalName(repairedName),repairedName);
     const aliases=[...aliasMap.values()];
     const sanitized={...record,name:repairedName,aliases,hn:hospitalIds[0]||"",hospitalIds};
     const changed=sanitized.name!==String(record?.name||"")||JSON.stringify(sanitized.aliases)!==JSON.stringify(record?.aliases||[])||sanitized.hn!==String(record?.hn||"")||JSON.stringify(sanitized.hospitalIds)!==JSON.stringify(record?.hospitalIds||[]);
     if(changed){
       sanitized.updatedAt=new Date().toISOString();
       sanitized.identityRepair="SOURCE_PRIORITY_PATIENT_NAME_REPAIR_V10174";
       await MIW.Database.put("patients",sanitized)
     }
     for(const doc of relatedDocuments){
       const existingDocName=sanitizePatientName(doc?.patientName);
       if(repairedName&&existingDocName!==repairedName&&(!existingDocName||nameQuality(existingDocName)<nameQuality(repairedName)||suspiciousLowercaseLatin(existingDocName))){
         await MIW.Database.put("documents",{...doc,patientName:repairedName,patientHN:sanitized.hn||doc.patientHN||"",updatedAt:new Date().toISOString(),identityRepair:"PATIENT_NAME_SOURCE_PRIORITY_V10174"})
       }
     }
     patients.push(sanitized)
   }
   patients.sort((a,b)=>a.name.localeCompare(b.name));if(!selectedId&&patients.length)selectedId=patients[0].id;
   render();return patients
 }
 function render(){
   document.getElementById("patientList").innerHTML=patients.length?patients.map(p=>`
    <div class="patient-item">
      <div><h3>${MIW.Utils.escape(p.name)}</h3><div class="muted">Civil ID ${MIW.Utils.escape(patientCivilIds(p).join(" · ")||"—")} · HN/MRN ${MIW.Utils.escape(patientHospitalIds(p).join(" · ")||"—")} · DOB ${MIW.Utils.escape(p.dob||"—")} · ${MIW.Utils.escape(p.createdBy||"MANUAL")}</div>${patientNames(p).filter(name=>canonicalName(name)!==canonicalName(p.name)).length?`<div class="muted">ชื่ออื่น: ${patientNames(p).filter(name=>canonicalName(name)!==canonicalName(p.name)).map(MIW.Utils.escape).join(" · ")}</div>`:""}</div>
      <button class="danger small" data-delete-patient="${p.id}">ลบ</button>
    </div>`).join(""):'<div class="muted">ยังไม่มี Patient</div>'
 }
 async function add({name,hn="",dob="",sex="",civilId="",civilIds=[],hospitalIds=[],createdBy="MANUAL"}){
   const clean=sanitizePatientName(name);
   if(!clean)throw new Error("กรุณากรอกชื่อ Patient");
   if(MIW.Classifier?.isInvalidPatientName?.(clean))throw new Error(`"${clean}" เป็นหัวข้อเอกสาร ไม่ใช่ชื่อผู้ป่วย`);
   const identifiers=candidateIdentifiers({hn,civilId,civilIds,hospitalIds});
   const existing=match({name:clean,hn,dob,...identifiers});
   if(existing)return existing;
   const patient={id:MIW.Utils.uid("patient"),name:clean,aliases:[clean],
     hn:identifiers.hospitalIds[0]||"",
     hospitalIds:identifiers.hospitalIds,
     civilId:identifiers.civilIds[0]||"",
     civilIds:identifiers.civilIds,
     dob:String(dob||"").trim(),sex:String(sex||"").trim(),createdBy,createdAt:new Date().toISOString()};
   await MIW.Database.put("patients",patient);await load();return patient
 }
 function match(candidate){
   const identifiers=candidateIdentifiers(candidate);
   const dob=normalizeDob(candidate.dob),name=canonicalName(candidate.name);
   const direct=patients.find(p=>
     (identifiers.civilIds.length&&identifiers.civilIds.some(id=>patientCivilIds(p).includes(id))) ||
     (identifiers.hospitalIds.length&&identifiers.hospitalIds.some(id=>patientHospitalIds(p).includes(id))) ||
     (name&&patientNames(p).some(alias=>canonicalName(alias)===name)&&(!dob||!normalizeDob(p.dob)||normalizeDob(p.dob)===dob))
   );
   if(direct)return direct;
   // A DOB by itself must never make an arbitrary cross-script name an alias
   // of an existing patient.  Exact/compatible known aliases may still match;
   // new Thai-English pairs are resolved at batch level where both source names
   // are visible together and can be surfaced for review.
   if(dob&&name&&!identifiers.civilIds.length&&!identifiers.hospitalIds.length){
     const dobMatches=patients.filter(p=>normalizeDob(p.dob)===dob);
     if(dobMatches.length===1){
       const only=dobMatches[0],aliases=patientNames(only);
       if(aliases.some(alias=>canonicalName(alias)===name||compatibleName(alias,candidate.name)))return only
     }
   }
   return null
 }

 function cleanIdentitySourceFile(value){
   return String(value||"").replace(/\s+/g," ").trim().toLocaleLowerCase()
 }
 function resolveBatchIdentity(inputMetas=[],fallback={}){
   const metas=inputMetas.map((meta,index)=>{
     const rawName=sanitizePatientName(meta?.patient_name||meta?.name||"");
     const name=plausibleIdentityName(rawName)?rawName:"";
     return{
       index,sourceFile:meta?.source_file||meta?.sourceFile||`ไฟล์ ${index+1}`,
       raw:meta||{},invalidNameDiscarded:Boolean(rawName&&!name),
       ...candidateIdentifiers(meta||{}),
       dob:normalizeDob(meta?.date_of_birth||meta?.dob),
       sex:String(meta?.sex||meta?.gender||"").trim().toUpperCase(),
       name,
       nameKey:canonicalName(name),
       script:nameScript(name)
     }
   });
   metas.forEach(item=>{
     item.hn=item.hospitalIds[0]||"";
     item.civilId=item.civilIds[0]||""
   });
   const identified=metas.filter(item=>item.hospitalIds.length||item.civilIds.length||item.dob||item.nameKey);
   const hns=[...new Set(identified.flatMap(item=>item.hospitalIds))];
   const civils=[...new Set(identified.flatMap(item=>item.civilIds))];
   const dobs=[...new Set(identified.map(item=>item.dob).filter(Boolean))];
   const sexes=[...new Set(identified.map(item=>item.sex).filter(Boolean))];
   const names=[...new Set(identified.map(item=>item.nameKey).filter(Boolean))];
   const matchedPatients=[...new Map(identified.map(item=>match({
     name:item.name,dob:item.dob,civilIds:item.civilIds,hospitalIds:item.hospitalIds
   })).filter(Boolean).map(patient=>[patient.id,patient])).values()];
   // Strict HN/MRN registry matches are collected separately because match()
   // may prefer an exact name+DOB match before another hospital's HN.  For
   // cross-hospital reconciliation we need to know whether different source
   // HNs are already stored as separate Registry rows.
   const strictRegistryPatients=[...new Map(identified.flatMap(item=>item.hospitalIds.flatMap(id=>
     patients.filter(patient=>patientHospitalIds(patient).includes(id))
   )).map(patient=>[patient.id,patient])).values()];
   const registryCandidatePatients=[...new Map([...matchedPatients,...strictRegistryPatients].map(patient=>[patient.id,patient])).values()];
   const fail=reason=>({ok:false,reason,metas,hns,civils,dobs,names});
   const allFilesShareHn=identified.length>0&&hns.length===1&&identified.every(item=>item.hospitalIds.includes(hns[0]));
   const warnings=[];
   const discardedNames=metas.filter(item=>item.invalidNameDiscarded).map(item=>item.sourceFile);
   if(discardedNames.length)warnings.push(`ตัดข้อความ OCR ที่ไม่ใช่ชื่อผู้ป่วยออกจาก ${discardedNames.join(", ")} และใช้ชื่อจากหัวรายงาน/ทะเบียนแทน`);
   if(civils.length>1)return fail(`พบ Civil ID ต่างกัน ${civils.join(" กับ ")}`);
   if(sexes.length>1)return fail(`พบเพศจากเอกสารขัดกัน ${sexes.join(" กับ ")}`);

   // v10.228: A single person can have separate Patient Registry rows because
   // each hospital assigns its own HN/MRN.  Reconcile multiple Registry
   // candidates only when at least two distinct source files independently
   // provide compatible patient names and the same normalized DOB.  The
   // reconciliation is batch-scoped; Registry rows are never silently merged.
   const registryNamed=identified.filter(item=>item.nameKey);
   const registryAnchorName=registryNamed[0]?.name||"";
   const registryNamesCompatible=Boolean(registryAnchorName)&&registryNamed.every(item=>
     canonicalName(item.name)===canonicalName(registryAnchorName)||compatibleName(item.name,registryAnchorName)
   );
   const registryDobSources=new Set(identified.filter(item=>item.dob).map(item=>item.sourceFile));

   // v10.228: Perform cross-hospital reconciliation before the ambiguous-
   // Registry failure.  In real scanned batches one sibling may fail to emit
   // DOB into groupMeta even though its HN points to a Registry row carrying
   // the same patient DOB.  Requiring two OCR DOB sources therefore caused a
   // false "more than one patient" block.  Admit the batch when source names
   // and Registry rows independently form one identity consensus.
   const registryPatientNames=registryCandidatePatients.map(patient=>patientNames(patient)[0]||patient?.name||"").filter(Boolean);
   const registryPatientAnchor=registryPatientNames[0]||"";
   const registryPatientNamesCompatible=Boolean(registryPatientAnchor)&&registryPatientNames.every(name=>
     canonicalName(name)===canonicalName(registryPatientAnchor)||compatibleName(name,registryPatientAnchor)
   );
   const registryDobs=[...new Set(registryCandidatePatients.map(patient=>normalizeDob(patient?.dob)).filter(Boolean))];
   const registryHospitalIds=new Set(registryCandidatePatients.flatMap(patient=>patientHospitalIds(patient)));
   const sourceHnsCovered=Boolean(hns.length)&&hns.every(id=>registryHospitalIds.has(id));
   const sourceRegistryDobCompatible=!(dobs.length===1&&registryDobs.length===1&&dobs[0]!==registryDobs[0]);
   const hasStableDobAnchor=dobs.length===1||registryDobs.length===1;
   const registryMultiMatchSourceLinked=registryCandidatePatients.length>1&&dobs.length===1&&registryDobSources.size>=2&&registryNamesCompatible;
   const registryMultiMatchConsensusLinked=registryCandidatePatients.length>1&&
     registryNamesCompatible&&registryPatientNamesCompatible&&
     registryDobs.length<=1&&sourceRegistryDobCompatible&&hasStableDobAnchor&&sourceHnsCovered;

   // v10.228 — Batch Source Fingerprint Override Guard.  A stale/duplicated
   // Patient Registry row must not veto a batch when the *source documents
   // themselves* form one strong patient identity.  This is intentionally
   // batch-scoped: Registry rows are never merged or rewritten here.  Require
   // two distinct source files, compatible source names from both files, one
   // non-conflicting DOB anchor, and no Civil-ID conflict.  HN/MRN may differ
   // across hospitals.  A true multi-patient batch (different source names or
   // DOBs) therefore remains blocked.
   const sourceFiles=[...new Set(identified.map(item=>cleanIdentitySourceFile(item.sourceFile)).filter(Boolean))];
   const sourceNamedByFile=new Map();
   identified.forEach(item=>{
     const key=cleanIdentitySourceFile(item.sourceFile);
     if(key&&item.nameKey&&!sourceNamedByFile.has(key))sourceNamedByFile.set(key,item.name)
   });
   const sourceNames=[...sourceNamedByFile.values()].filter(Boolean);
   const sourceAnchorName=sourceNames[0]||"";
   const sourceNamesCompatible=Boolean(sourceAnchorName)&&sourceNames.length>=2&&sourceNames.every(name=>
     canonicalName(name)===canonicalName(sourceAnchorName)||compatibleName(name,sourceAnchorName)
   );
   const sourceDobAnchor=dobs.length===1?dobs[0]:"";
   const sourceDobFileCount=new Set(identified.filter(item=>item.dob===sourceDobAnchor).map(item=>cleanIdentitySourceFile(item.sourceFile)).filter(Boolean)).size;
   const sourceHnRegistrySupported=Boolean(sourceDobAnchor&&hns.length)&&hns.every(id=>{
     const candidates=registryCandidatePatients.filter(patient=>patientHospitalIds(patient).includes(id));
     return candidates.some(patient=>{
       const patientDob=normalizeDob(patient?.dob);
       const patientNameList=patientNames(patient);
       const nameOk=!patientNameList.length||patientNameList.some(name=>
         canonicalName(name)===canonicalName(sourceAnchorName)||compatibleName(name,sourceAnchorName)
       );
       // Exact HN + matching DOB is a stronger anchor than a stale Registry
       // display name.  When Registry DOB is absent, require the name instead.
       return patientDob?patientDob===sourceDobAnchor:nameOk
     })
   });
   // Two independent source DOBs are sufficient by themselves.  If only one
   // source emitted DOB, every HN must still have at least one Registry row
   // supporting that same DOB/name.  This ignores extra stale duplicates while
   // preserving the hard block when an HN points only to a conflicting DOB.
   const sourceIdentityIndependentlyConfirmed=sourceDobFileCount>=2||sourceHnRegistrySupported;
   const sourceBatchStrongLinked=registryCandidatePatients.length>1&&
     sourceFiles.length>=2&&sourceNamedByFile.size>=2&&sourceNamesCompatible&&
     Boolean(sourceDobAnchor)&&sourceIdentityIndependentlyConfirmed&&civils.length<=1;

   // v10.228 — user-selected same-batch source evidence can bridge an incomplete
   // Registry when one hospital HN has never been stored there.  This is more
   // restrictive than fuzzy name matching: every source must emit the exact
   // same canonical patient name, there must be one non-conflicting DOB anchor,
   // sex must not conflict, and distinct source HNs must not be near-collision
   // OCR variants. The Registry is not mutated by this decision.
   const exactSourceNameKeys=[...new Set(identified.map(item=>item.nameKey).filter(Boolean))];
   const eachSourceHasName=sourceFiles.length>=2&&sourceNamedByFile.size===sourceFiles.length;
   const eachSourceHasCanonicalHn=sourceFiles.every(file=>{
     const rows=identified.filter(item=>cleanIdentitySourceFile(item.sourceFile)===file);
     return rows.some(item=>item.hospitalIds.length===1)
   });
   const sourceHnNearCollision=hns.some((id,index)=>hns.slice(index+1).some(other=>suspiciousNearHospitalId(id,other)));
   const sourceRegistryHardDobConflict=Boolean(sourceDobAnchor)&&hns.some(id=>{
     const exact=patients.filter(patient=>patientHospitalIds(patient).includes(id));
     const known=exact.map(patient=>normalizeDob(patient?.dob)).filter(Boolean);
     return known.length>0&&!known.includes(sourceDobAnchor)
   });
   const sourceOnlyExactLinked=registryCandidatePatients.length>1&&
     eachSourceHasName&&exactSourceNameKeys.length===1&&Boolean(sourceDobAnchor)&&
     eachSourceHasCanonicalHn&&!sourceHnNearCollision&&!sourceRegistryHardDobConflict&&
     civils.length<=1&&sexes.length<=1;

   // v10.229 — Batch Identity Authority Guard. A mixed clinical/history PDF can
   // have an unreadable OCR patient-name fragment while its HN is already known
   // in Registry; the sibling laboratory PDF can simultaneously carry the clean
   // name + DOB but a hospital HN that has never been stored in Registry. Treat
   // each source as satisfied by EITHER (a) its own clean name+DOB anchor, OR
   // (b) an exact-HN Registry row with the same DOB/name family. This decision is
   // batch-scoped only; it never writes/merges Patient Registry records.
   const registryNamesAtDob=registryCandidatePatients
     .filter(patient=>!sourceDobAnchor||!normalizeDob(patient?.dob)||normalizeDob(patient?.dob)===sourceDobAnchor)
     .flatMap(patient=>patientNames(patient)).filter(plausibleIdentityName);
   const hybridAnchorName=bestPatientName([
     ...identified.map(item=>item.name).filter(plausibleIdentityName),
     ...registryNamesAtDob
   ],{preferThai:true});
   const compatibleWithHybridAnchor=name=>!hybridAnchorName||!name||
     canonicalName(name)===canonicalName(hybridAnchorName)||compatibleName(name,hybridAnchorName);
   const exactRegistrySupportForItem=item=>item.hospitalIds.some(id=>{
     const exact=patients.filter(patient=>patientHospitalIds(patient).includes(id));
     return exact.some(patient=>{
       const pd=normalizeDob(patient?.dob);
       if(sourceDobAnchor&&pd&&pd!==sourceDobAnchor)return false;
       const names=patientNames(patient).filter(plausibleIdentityName);
       return !names.length||names.some(compatibleWithHybridAnchor)
     })
   });
   const sourceSelfSupportForItem=item=>Boolean(
     sourceDobAnchor&&item.dob===sourceDobAnchor&&item.name&&plausibleIdentityName(item.name)&&compatibleWithHybridAnchor(item.name)
   );
   const sourceRegistryHybridFilesSupported=sourceFiles.length>=2&&sourceFiles.every(file=>{
     const rows=identified.filter(item=>cleanIdentitySourceFile(item.sourceFile)===file);
     return rows.length>0&&rows.some(item=>sourceSelfSupportForItem(item)||exactRegistrySupportForItem(item))
   });
   const sourceRegistryHybridLinked=registryCandidatePatients.length>1&&Boolean(sourceDobAnchor)&&
     Boolean(hybridAnchorName)&&sourceRegistryHybridFilesSupported&&!sourceHnNearCollision&&
     !sourceRegistryHardDobConflict&&civils.length<=1&&sexes.length<=1;

   const registryMultiMatchLinked=registryMultiMatchSourceLinked||registryMultiMatchConsensusLinked||sourceBatchStrongLinked||sourceOnlyExactLinked||sourceRegistryHybridLinked;
   if(registryCandidatePatients.length>1&&!registryMultiMatchLinked){
     const unsupportedHns=hns.filter(id=>{
       const candidates=registryCandidatePatients.filter(patient=>patientHospitalIds(patient).includes(id));
       return !candidates.some(patient=>{
         const patientDob=normalizeDob(patient?.dob);
         const dobOk=!sourceDobAnchor||!patientDob||patientDob===sourceDobAnchor;
         const list=patientNames(patient);
         const nameOk=!sourceAnchorName||!list.length||list.some(name=>canonicalName(name)===canonicalName(sourceAnchorName)||compatibleName(name,sourceAnchorName));
         return dobOk&&nameOk
       })
     });
     const sourceDiag=`Source fingerprint: ${sourceNames.join(" / ")||"ไม่มีชื่อ"}${sourceDobAnchor?` · DOB ${sourceDobAnchor}`:" · DOB ไม่ครบ"}${hns.length?` · HN ${hns.join(" / ")}`:""}`;
     const registryDiag=unsupportedHns.length?` · HN ที่ยังไม่มี Registry support ตรง source: ${unsupportedHns.join(" / ")}`:"";
     return fail(`ข้อมูลตรงกับระเบียนผู้ป่วยมากกว่า 1 คน · ${sourceDiag}${registryDiag}`)
   }
   if(registryMultiMatchLinked){
     const basis=registryMultiMatchSourceLinked
       ?"เอกสารต้นฉบับอย่างน้อย 2 แหล่งมีชื่อและ DOB ตรงกัน"
       :registryMultiMatchConsensusLinked
         ?"ชื่อจากเอกสารเข้ากันได้ และ HN/MRN ของแต่ละแหล่งชี้ไปยัง Registry ที่มีชื่อ/DOB สอดคล้องกัน"
         :sourceBatchStrongLinked
           ?"เอกสารอย่างน้อย 2 แหล่งมีชื่อผู้ป่วยตรงกันและมี DOB จาก source ที่ไม่ขัดกัน แม้ Registry จะมี stale/duplicate records"
           :sourceOnlyExactLinked
             ?"เอกสารที่ผู้ใช้เลือกใน batch เดียวกันมีชื่อ canonical ตรงกัน, DOB ไม่ขัดกัน และ HN ของแต่ละ source ผ่าน canonicalization แม้ Registry ของอีกโรงพยาบาลยังไม่เคยบันทึก HN นั้น"
             :"แต่ละ source มีหลักฐานยืนยันตัวตนอย่างอิสระ: source name+DOB หรือ exact-HN Registry ที่สอดคล้องกับ DOB เดียวกัน";
     warnings.push(`พบ Patient Registry มากกว่า 1 ระเบียนที่ใช้ HN/MRN ต่างกัน แต่${basis} ระบบจึงเชื่อมเฉพาะ batch นี้โดยไม่รวมระเบียน Registry อัตโนมัติ`)
   }

   let linked=true,evidence="";
   const anchored=identified.filter(item=>item.hospitalIds.length);
   if(civils.length===1){
     const civilId=civils[0];
     const civilAnchors=identified.filter(item=>item.civilIds.includes(civilId));
     const anchorHospitals=new Set(civilAnchors.flatMap(item=>item.hospitalIds));
     const anchorDobs=new Set(civilAnchors.map(item=>item.dob).filter(Boolean));
     const anchorNames=civilAnchors.map(item=>item.name).filter(Boolean);
     const matchedId=matchedPatients[0]?.id||"";
     linked=identified.every(item=>{
       if(item.civilIds.length)return item.civilIds.includes(civilId);
       if(item.hospitalIds.some(id=>anchorHospitals.has(id)))return true;
       const itemPatient=match({name:item.name,dob:item.dob,hospitalIds:item.hospitalIds});
       if(matchedId&&itemPatient?.id===matchedId)return true;
       const nameLinked=anchorNames.some(anchor=>compatibleName(item.name,anchor));
       const dobLinked=!item.dob||!anchorDobs.size||anchorDobs.has(item.dob);
       return !item.hospitalIds.length&&nameLinked&&dobLinked
     });
     evidence=linked
       ?`Civil ID ${civilId} เชื่อมรายงานข้ามโรงพยาบาล ร่วมกับ Hospital ID/ชื่อผู้ป่วย`
       :"";
     if(linked&&hns.length>1){
       warnings.push(`พบ Hospital ID/HN หลายค่า (${hns.join(" กับ ")}) แต่เชื่อมถึง Civil ID ${civilId} เดียวกัน`)
     }
   }else if(hns.length>1){
     // v10.209 safety guard: near-identical HN/MRN values are more likely to
     // represent OCR/transcription collision or a different patient than a
     // legitimate cross-hospital identifier.  Do not auto-link a new near
     // collision unless every identifier is already an explicit alias on the
     // same known Patient Registry record.
     const registryHospitalIds=new Set(registryCandidatePatients.flatMap(patient=>patientHospitalIds(patient)));
     const nearCollision=hns.some((id,index)=>hns.slice(index+1).some(other=>suspiciousNearHospitalId(id,other)));
     const everyHnPrelinked=Boolean(registryCandidatePatients.length)&&hns.every(id=>registryHospitalIds.has(id));
     if(nearCollision&&!everyHnPrelinked){
       return fail(`พบ HN/MRN ต่างกัน ${hns.join(" กับ ")} และเลขใกล้เคียงกันผิดปกติ ระบบหยุดการรวมเพื่อป้องกัน OCR/HN collision; กรุณายืนยัน Civil ID หรือบันทึก Hospital ID alias ใน Patient Registry ก่อนรวมรายงาน`)
     }
     // Different hospitals/laboratories may assign different HN/MRN values to
     // the same person.  Do not reject the whole batch when the source files
     // provide a second, independent identity anchor: one DOB plus compatible
     // names, or one already-known patient record.  Keep every HN as a
     // hospital-ID alias and surface a warning in Review instead of silently
     // choosing one value.
     const named=identified.filter(item=>item.nameKey);
     const anchorName=named[0]?.name||"";
     const sameNameFamily=Boolean(anchorName)&&named.every(item=>
       canonicalName(item.name)===canonicalName(anchorName)||compatibleName(item.name,anchorName)
     );
     const thaiNames=new Set(named.filter(item=>item.script==="THAI").map(item=>item.nameKey));
     const latinNames=new Set(named.filter(item=>item.script==="LATIN").map(item=>item.nameKey));
     const otherNames=named.filter(item=>item.nameKey&&!['THAI','LATIN'].includes(item.script));
     const bilingualPair=dobs.length===1&&thaiNames.size<=1&&latinNames.size<=1&&!otherNames.length&&
       thaiNames.size+latinNames.size>=1&&names.length<=2;
     const sourceNameLinked=sameNameFamily||bilingualPair;
     const sharedDob=dobs.length===1?dobs[0]:"";
     const matchedId=matchedPatients[0]?.id||"";
     const registryLinked=Boolean(matchedId)&&identified.every(item=>{
       const found=match({name:item.name,dob:item.dob,hospitalIds:item.hospitalIds});
       if(found?.id===matchedId)return true;
       const knownDob=normalizeDob(matchedPatients[0]?.dob);
       const dobLinked=!item.dob||!knownDob||item.dob===knownDob;
       const nameLinked=!item.nameKey||patientNames(matchedPatients[0]).some(alias=>
         canonicalName(alias)===item.nameKey||compatibleName(alias,item.name)
       );
       return dobLinked&&nameLinked
     });
     const sourceLinked=Boolean(sharedDob&&sourceNameLinked)&&identified.every(item=>{
       if(item.dob&&item.dob!==sharedDob)return false;
       if(item.nameKey&&!sourceNameLinked)return false;
       return Boolean(item.dob||item.nameKey)
     });
     linked=registryLinked||sourceLinked||sourceRegistryHybridLinked;
     if(!linked){
       return fail(`พบ HN/MRN ต่างกัน ${hns.join(" กับ ")} และยังไม่มีหลักฐานร่วมที่เพียงพอ กรุณาตรวจให้ชื่อและ DOB ตรงกัน หรือเชื่อม Civil ID ก่อนรวมรายงาน`)
     }
     evidence=registryLinked
       ?`HN/MRN หลายค่าเชื่อมถึงระเบียนผู้ป่วยเดียวกันจาก Patient Registry`
       :sourceLinked
         ?`HN/MRN หลายค่า แต่ชื่อและ DOB ตรงกันในเอกสารต้นฉบับ`
         :`HN/MRN หลายค่า โดยแต่ละ source ผ่าน Batch Identity Authority จาก source name+DOB หรือ exact-HN Registry ที่มี DOB เดียวกัน`;
     warnings.push(`พบ HN/MRN หลายค่า (${hns.join(" กับ ")}) ระบบเก็บทั้งหมดเป็น Hospital ID alias ของผู้ป่วยรายเดียวกัน กรุณาตรวจชื่อและ DOB ในหน้า Review ก่อนบันทึก`)
   }else if(hns.length===1){
     const anchoredNames=new Set(anchored.map(item=>item.nameKey).filter(Boolean));
     const anchoredScripts=new Set(anchored.map(item=>item.script).filter(value=>value==="THAI"||value==="LATIN"));
     const anchoredDob=dobs.length===1?(anchored.map(item=>item.dob).find(Boolean)||dobs[0]||""):"";
     const matchedId=matchedPatients[0]?.id||"";
     linked=identified.every(item=>{
       if(item.hospitalIds.length)return item.hospitalIds.includes(hns[0]);
       if(!item.nameKey&&!item.dob)return true;
       const itemPatient=match({name:item.name,dob:item.dob});
       if(matchedId&&itemPatient?.id===matchedId)return true;
       if(item.nameKey&&(anchoredNames.has(item.nameKey)||anchored.some(anchor=>compatibleName(item.name,anchor.name))))return true;
       const bilingual=Boolean(item.nameKey)&&(
         (item.script==="THAI"&&anchoredScripts.has("LATIN"))||
         (item.script==="LATIN"&&anchoredScripts.has("THAI"))
       );
       return Boolean(item.dob&&anchoredDob&&item.dob===anchoredDob&&bilingual)
     });
     evidence=anchored.length===identified.length?"HN/MRN ตรงกันทุกไฟล์":"HN/MRN ร่วมกับชื่อหรือวันเกิดตรงกัน"
   }else if(names.length<=1){
     evidence=dobs.length===1?"ชื่อและวันเกิดตรงกัน":"ชื่อตรงกัน"
   }else if(matchedPatients.length===1&&identified.every(item=>{
     const found=match({name:item.name,hn:item.hn,dob:item.dob});
     return !item.nameKey||found?.id===matchedPatients[0].id
   })){
     evidence="ชื่อทั้งหมดเป็น alias ของผู้ป่วยระเบียนเดียวกัน"
   }else{
     const thaiNames=new Set(identified.filter(item=>item.script==="THAI").map(item=>item.nameKey));
     const latinNames=new Set(identified.filter(item=>item.script==="LATIN").map(item=>item.nameKey));
     const otherNames=identified.filter(item=>item.nameKey&&!["THAI","LATIN"].includes(item.script));
     const bilingualPair=dobs.length===1&&thaiNames.size===1&&latinNames.size===1&&!otherNames.length&&names.length===2;
     linked=bilingualPair;
     evidence=bilingualPair?"วันเกิดตรงกันและเป็นชื่อไทย–อังกฤษคู่เดียวกัน":""
   }
   if(!linked)return fail("ชื่อไม่ตรงกันและยังไม่มี HN/MRN, Civil ID, วันเกิด หรือ alias ที่เชื่อมโยงได้อย่างปลอดภัย");
   if(dobs.length>1&&!(civils.length===1||allFilesShareHn)){
     return fail(`พบวันเกิดต่างกัน ${dobs.join(" กับ ")} และไม่มีเลขประจำตัวชนิดเดียวกันเชื่อมโยง`)
   }
   if(dobs.length>1){
     warnings.push(`DOB ในเอกสารไม่ตรงกัน (${dobs.join(" กับ ")}) กรุณาเลือกวันที่ถูกต้องในหน้า Review ก่อนบันทึก`)
   }

   const fallbackCandidate={
     name:fallback.patientName||fallback.patient_name||"",
     dob:fallback.patientDOB||fallback.date_of_birth||fallback.dob||"",
     hospitalIds:[fallback.patientHN,...(Array.isArray(fallback.patientHospitalIDs)?fallback.patientHospitalIDs:[])].filter(Boolean)
   };
   const fallbackKnown=match(fallbackCandidate);
   const known=registryCandidatePatients.length===1
     ?registryCandidatePatients[0]
     :(fallbackKnown&&registryCandidatePatients.some(patient=>patient.id===fallbackKnown.id)?fallbackKnown:null);
   const fallbackName=MIW.Utils.normalizeName(fallback.patientName||fallback.patient_name||"");
   const preferred=bestPatientName([
     known?.name,fallbackName,...identified.map(item=>item.name)
   ]);
   const aliases=[...new Map(identified.map(item=>item.name).filter(Boolean).map(name=>[canonicalName(name),name])).values()];
   const resolvedDob=dobs.length>1
     ?""
     :known?.dob||fallback.patientDOB||fallback.date_of_birth||identified.find(item=>item.dob)?.raw.date_of_birth||"";
   const dobEvidence=dobs.map(normalized=>({
     normalized,
     rawValues:[...new Set(metas.filter(item=>item.dob===normalized).map(item=>item.raw.date_of_birth||item.raw.dob||normalized))],
     sourceFiles:[...new Set(metas.filter(item=>item.dob===normalized).map(item=>item.sourceFile))]
   }));
   const civilId=civils[0]||patientCivilIds(known)[0]||normalizeCivilId(fallback.patientCivilID||fallback.civil_id)||"";
   const hospitalIds=[...new Set([
     ...patientHospitalIds(known),
     ...hns,
     ...candidateIdentifiers({hn:fallback.patientHN,hospitalIds:fallback.patientHospitalIDs}).hospitalIds
   ])];
   return{
     ok:true,
     patient:known,
     evidence,
     warning:warnings.join(" · "),
     warnings,
     aliases,
     dobEvidence,
     dobResolutionRequired:dobs.length>1,
     registryDob:known?.dob||"",
     identity:{
       patient_id:hospitalIds[0]||"",
       hospital_ids:hospitalIds,
       civil_id:civilId,
       patient_name:preferred,
       date_of_birth:resolvedDob
     }
   }
 }
 async function ensure(candidate,legacyHN=""){
   const raw=typeof candidate==="string"?{name:candidate,hn:legacyHN,dob:""}:(candidate||{});
   const sanitizedName=sanitizePatientName(raw.name),invalidName=Boolean(sanitizedName&&MIW.Classifier?.isInvalidPatientName?.(sanitizedName));
   const normalized={...raw,name:invalidName?"":sanitizedName};
   const identifiers=candidateIdentifiers(normalized);
   const existing=match(normalized);
   if(existing){
     const hospitalIds=[...new Set([...patientHospitalIds(existing),...identifiers.hospitalIds])];
     const civilIds=[...new Set([...patientCivilIds(existing),...identifiers.civilIds])];
     const confirmedDob=String(normalized.dob||"").trim();
     const incomingName=sanitizePatientName(normalized.name);
     const candidateAliases=mergedAliases(existing,incomingName);
     const preferredPrimary=bestPatientName(candidateAliases,{preferThai:Boolean(hospitalIds.length)})||sanitizePatientName(existing.name);
     const enriched={...existing,
       name:preferredPrimary,
       aliases:mergedAliases(existing,incomingName),
       hn:hospitalIds[0]||"",
       hospitalIds,
       civilId:existing.civilId||civilIds[0]||"",
       civilIds,
       dob:normalized.dobConfirmed&&confirmedDob?confirmedDob:existing.dob||confirmedDob,
       sex:existing.sex||String(normalized.sex||"").trim()
     };
     if(enriched.name!==existing.name||enriched.hn!==existing.hn||enriched.dob!==existing.dob||enriched.civilId!==existing.civilId||
       JSON.stringify(enriched.hospitalIds)!==JSON.stringify(existing.hospitalIds||[])||
       JSON.stringify(enriched.civilIds)!==JSON.stringify(existing.civilIds||[])||
       JSON.stringify(enriched.aliases)!==JSON.stringify(existing.aliases||[])){
       await MIW.Database.put("patients",enriched);
       await load();
       return enriched
     }
     return existing
   }
   if(invalidName&&!existing)throw new Error(`"${sanitizedName}" ไม่ใช่ชื่อผู้ป่วยที่เชื่อถือได้ กรุณาใช้ชื่อจากหัวรายงาน`);
   if(!normalized.name&&!existing)throw new Error("ไม่พบชื่อผู้ป่วยที่เชื่อถือได้จากหัวรายงานหรือทะเบียนผู้ป่วย");
   const candidateDob=String(normalized.dob||"").replace(/\s+/g,"").toLowerCase();
   const invalidExisting=patients.find(p=>
     MIW.Classifier?.isInvalidPatientName?.(p.name) &&
     candidateDob && String(p.dob||"").replace(/\s+/g,"").toLowerCase()===candidateDob
   );
   if(invalidExisting){
     const hospitalIds=[...new Set([...patientHospitalIds(invalidExisting),...identifiers.hospitalIds])];
     const civilIds=[...new Set([...patientCivilIds(invalidExisting),...identifiers.civilIds])];
     const repaired={...invalidExisting,name:sanitizePatientName(normalized.name),aliases:mergedAliases(invalidExisting,normalized.name),
       hn:hospitalIds[0]||"",hospitalIds,
       civilId:invalidExisting.civilId||civilIds[0]||"",civilIds,
       dob:String(normalized.dob||invalidExisting.dob||"").trim(),sex:invalidExisting.sex||String(normalized.sex||"").trim(),createdBy:"AUTO_DOCUMENT_REPAIRED",updatedAt:new Date().toISOString()};
     await MIW.Database.put("patients",repaired);
     await load();
     return repaired
   }
   return add({...normalized,...identifiers,createdBy:"AUTO_DOCUMENT"})
 }
 async function rememberAliases(patientId,aliases=[]){
   const existing=patients.find(patient=>patient.id===patientId);
   if(!existing)return null;
   let nextAliases=patientNames(existing);
   for(const alias of aliases)nextAliases=mergedAliases({...existing,aliases:nextAliases},alias);
   if(JSON.stringify(nextAliases)!==JSON.stringify(existing.aliases||[])){
     const updated={...existing,aliases:nextAliases,updatedAt:new Date().toISOString()};
     await MIW.Database.put("patients",updated);
     await load();
     return patients.find(patient=>patient.id===patientId)||updated
   }
   return existing
 }
 async function remove(id){await MIW.Database.delete("patients",id);await load()}
 function select(id){selectedId=id}
 function current(){return patients.find(p=>p.id===selectedId)||patients[0]||null}
 function displayName(patient){
   return bestPatientName(patientNames(patient),{preferThai:Boolean(patientHospitalIds(patient).length)})||sanitizePatientName(patient?.name)||"ไม่ระบุชื่อ"
 }
 return{load,add,match,ensure,rememberAliases,remove,select,current,displayName,sanitizePatientName,extractNameFromFileName,bestPatientName,resolveBatchIdentity,normalizeIdentifier,normalizeCivilId,normalizeDob,canonicalName,compatibleName,canonicalHospitalIds,plausibleIdentityName,all:()=>patients.slice()}
})();
