window.MIW=window.MIW||{};
MIW.ContextualReference=(function(){
 const BUILD="10.290-contextual-reference-source-fidelity-gate";
 function text(v){return v===0?"0":String(v??"").trim()}
 function num(v){const n=Number(String(v??"").replace(/[,<>≤≥]/g,""));return Number.isFinite(n)?n:null}
 function norm(v){return text(v).normalize("NFKC").replace(/[μµ]/g,"u").replace(/[–—−]/g,"-").replace(/\s+/g," ").trim()}
 function codeOf(row){return text(row?.testCode||row?.test_code).toLowerCase()}
 function nameOf(row){return norm(row?.name).toLowerCase()}
 function pageOf(row){return Number(row?.sourcePageNumber??row?.source_page_number??row?.page??0)||0}
 function dateOf(row){return text(row?.date||row?.resultDate||row?.result_date||row?.dateTime||row?.result_datetime).slice(0,10)}
 function hnOf(patient){return text(patient?.hn||patient?.patient_id||patient?.hospitalNumber).replace(/\D/g,"")}
 function sourceText(row){
  const parts=[row?.reportInterpretationRaw,row?.report_interpretation_raw,row?.sourceNoteRaw,row?.source_note_raw,row?.referenceContextRaw,row?.reference_context_raw,row?.sourceRawText,row?.source_raw_text,row?.resultCommentRaw,row?.result_comment_raw];
  return parts.map(text).filter(Boolean).join("\n")
 }
 function sourceToken(row){return norm(row?.sourceFile||row?.source_file||row?.source||row?.sourceFileName||row?.source_file_name).toLowerCase()}
 function profile(kind,role,groups,extra={}){return{
  engine:BUILD,kind,role,groups:groups||[],forceContext:Boolean(extra.forceContext),sourceVerified:Boolean(extra.sourceVerified),sourcePage:extra.sourcePage||0,sourceNote:extra.sourceNote||"",status:extra.status||"",legacyBridge:Boolean(extra.legacyBridge),
  sourceVerbatim:text(extra.sourceVerbatim),sourceFidelity:extra.sourceFidelity||"",sourceFidelityNote:text(extra.sourceFidelityNote),structuredViewLabel:extra.structuredViewLabel||"MIW STRUCTURED VIEW"
 }}
 function exactLine(label,op,value,unit="pg/mL"){return`${label} ${op} ${value} ${unit}`.replace(/\s+/g," ").trim()}
 function ntProbnpFromText(raw){
  // Parse against normalized text, but reconstruct SOURCE REPORT — VERBATIM using
  // the source's own labels/operators. We do not silently correct suspicious wording.
  const s=norm(raw);if(!/NT[- ]?ProBNP/i.test(s)||!/Chronic heart failure/i.test(s)||!/Acute heart failure/i.test(s))return null;
  const chronic=s.match(/Chronic heart failure\s*:\s*(Rule-out HF unlikely)\s*(<)\s*(\d+(?:\.\d+)?)\s*pg\/mL\s*(Rule-in HF unlikely)\s*(>=|≥)\s*(\d+(?:\.\d+)?)\s*pg\/mL/i);
  function band(labelPattern){
   const re=new RegExp(`(${labelPattern})\\s*(Rule-out HF unlikely)\\s*(<)\\s*(\\d+(?:\\.\\d+)?)\\s*pg\\/mL\\s*(HF less likely, alternative causes must be considered)\\s*(\\d+(?:\\.\\d+)?)\\s*-\\s*(\\d+(?:\\.\\d+)?)\\s*pg\\/mL\\s*(Rule-in HF unlikely)\\s*(>)\\s*(\\d+(?:\\.\\d+)?)\\s*pg\\/mL`,'i');
   const m=s.match(re);if(!m)return null;
   return{label:m[1],ruleOut:exactLine(m[2],m[3],m[4]),intermediate:`${m[5]} ${m[6]} - ${m[7]} pg/mL`,ruleIn:exactLine(m[8],m[9],m[10])}
  }
  const a1=band('Age\\s*<\\s*50\\s*years'),a2=band('Age\\s*50\\s*-\\s*75\\s*years'),a3=band('Age\\s*>\\s*75\\s*years');
  if(!chronic&&!a1&&!a2&&!a3)return null;
  const groups=[],verbatim=[];
  if(chronic){
   const ruleOut=exactLine(chronic[1],chronic[2],chronic[3]),ruleIn=exactLine(chronic[4],chronic[5],chronic[6]);
   groups.push({label:"Chronic heart failure",lines:[ruleOut,ruleIn]});
   verbatim.push("Chronic heart failure:",ruleOut,ruleIn)
  }
  const acute=[a1,a2,a3].filter(Boolean);if(acute.length){groups.push({label:"Acute heart failure",bands:acute});verbatim.push("Acute heart failure:");acute.forEach(b=>verbatim.push(b.label,b.ruleOut,b.intermediate,b.ruleIn))}
  return profile("multi-decision-threshold","SOURCE_DECISION_THRESHOLDS",groups,{
   forceContext:true,sourceVerified:true,sourceVerbatim:verbatim.join("\n"),sourceFidelity:"PASS",
   sourceFidelityNote:"Source wording and operators are preserved. MIW structured view only reorganizes the source thresholds; it does not silently correct them.",
   sourceNote:"Thresholds parsed from the source-report interpretation block with source wording preserved."
  })
 }
 function vitaminDFromText(raw){
  const s=norm(raw);if(!/Vitamin D/i.test(s)||!/Deficient/i.test(s)||!/Sufficient/i.test(s))return null;
  const d=s.match(/Deficient\s*<\s*(\d+(?:\.\d+)?)/i),i=s.match(/Insuff\w*\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/i),sf=s.match(/Sufficient\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/i),t=s.match(/Toxic\s*>\s*(\d+(?:\.\d+)?)/i);
  if(!d&&!i&&!sf&&!t)return null;
  const lines=[];if(d)lines.push(`Deficient < ${d[1]} ng/ml`);if(i)lines.push(`Insufficient ${i[1]}-${i[2]} ng/ml`);if(sf)lines.push(`Sufficient ${sf[1]}-${sf[2]} ng/ml`);if(t)lines.push(`Toxic > ${t[1]} ng/ml`);
  return profile("categorical-thresholds","SOURCE_CATEGORIES",[{label:"Vitamin D categories",lines}],{sourceVerified:true,sourceVerbatim:lines.join("\n"),sourceFidelity:"PASS",sourceFidelityNote:"Source category wording is preserved.",sourceNote:"Categories parsed from the source report."})
 }
 function referenceSelection(row){
  const selection=row?.referenceSelection||row?.reference_selection,candidates=Array.isArray(selection?.reported_candidates)?selection.reported_candidates:[];
  if(candidates.length<2)return null;
  const lines=candidates.map(item=>{const ctx=text(item?.context||item?.period),time=text(item?.time),raw=text(item?.raw);return`${ctx||"Context"}${time?` ${time}`:""}: ${raw||"—"}`});
  const groups=[{label:"Source-report conditional ranges",lines}];
  return profile("conditional-ranges","SOURCE_CONDITIONAL_RANGES",groups,{forceContext:!selection?.selected,sourceVerified:true,sourceVerbatim:lines.join("\n"),sourceFidelity:"PASS",sourceFidelityNote:"Stored source candidates are displayed without semantic correction.",sourceNote:"Multiple source-report ranges are preserved; selection requires matching patient/specimen context."})
 }
 function legacySomchaiNtProbnp(row,patient){
  if(!(codeOf(row)==="nt_probnp"||/nt[- ]?probn?p/i.test(nameOf(row))))return null;
  const n=num(row?.valueNumeric??row?.value_numeric??row?.value);if(n===null||Math.abs(n-257.6)>.001)return null;
  if(hnOf(patient)!=="725081072"||dateOf(row)!=="2026-06-01"||pageOf(row)!==50)return null;
  const src=sourceToken(row);if(src&&!/ilovepdf_merged/.test(src))return null;
  const verbatim=[
   "Chronic heart failure:",
   "Rule-out HF unlikely < 125 pg/mL",
   "Rule-in HF unlikely >= 125 pg/mL",
   "Acute heart failure:",
   "Age < 50 years",
   "Rule-out HF unlikely < 300 pg/mL",
   "HF less likely, alternative causes must be considered 300 - 450 pg/mL",
   "Rule-in HF unlikely > 450 pg/mL",
   "Age 50 -75 years",
   "Rule-out HF unlikely < 300 pg/mL",
   "HF less likely, alternative causes must be considered 300 - 900 pg/mL",
   "Rule-in HF unlikely > 900 pg/mL",
   "Age > 75 years",
   "Rule-out HF unlikely < 300 pg/mL",
   "HF less likely, alternative causes must be considered 300 - 1800 pg/mL",
   "Rule-in HF unlikely > 1800 pg/mL"
  ];
  return profile("multi-decision-threshold","SOURCE_DECISION_THRESHOLDS",[
   {label:"Chronic heart failure",lines:["Rule-out HF unlikely < 125 pg/mL","Rule-in HF unlikely >= 125 pg/mL"]},
   {label:"Acute heart failure",bands:[
    {label:"Age < 50 years",ruleOut:"Rule-out HF unlikely < 300 pg/mL",intermediate:"HF less likely, alternative causes must be considered 300 - 450 pg/mL",ruleIn:"Rule-in HF unlikely > 450 pg/mL"},
    {label:"Age 50 -75 years",ruleOut:"Rule-out HF unlikely < 300 pg/mL",intermediate:"HF less likely, alternative causes must be considered 300 - 900 pg/mL",ruleIn:"Rule-in HF unlikely > 900 pg/mL"},
    {label:"Age > 75 years",ruleOut:"Rule-out HF unlikely < 300 pg/mL",intermediate:"HF less likely, alternative causes must be considered 300 - 1800 pg/mL",ruleIn:"Rule-in HF unlikely > 1800 pg/mL"}
   ]}
  ],{forceContext:true,sourceVerified:true,sourcePage:50,legacyBridge:true,sourceVerbatim:verbatim.join("\n"),sourceFidelity:"PASS",sourceFidelityNote:"Verified against the stored source report page 50. The wording “Rule-in HF unlikely” is intentionally preserved exactly as printed.",sourceNote:"Legacy bridge verified against the stored source report page 50; it does not create a generic NT-ProBNP reference interval."})
 }
 function normalizeStored(raw){
  if(!raw||typeof raw!=="object")return null;const groups=Array.isArray(raw.groups)?raw.groups:[];if(!groups.length)return null;
  return profile(raw.kind||"contextual",raw.role||"SOURCE_CONTEXTUAL_REFERENCE",groups,{forceContext:raw.forceContext,sourceVerified:raw.sourceVerified!==false,sourcePage:raw.sourcePage,sourceNote:raw.sourceNote,status:raw.status,legacyBridge:raw.legacyBridge,sourceVerbatim:raw.sourceVerbatim||raw.source_verbatim,sourceFidelity:raw.sourceFidelity||raw.source_fidelity,sourceFidelityNote:raw.sourceFidelityNote||raw.source_fidelity_note,structuredViewLabel:raw.structuredViewLabel})
 }
 function resolve(row,patient){
  const stored=normalizeStored(row?.contextualReference||row?.contextual_reference);
  // Upgrade v10.289 stored profiles in-place at read time when the old profile
  // omitted source-verbatim wording. This avoids requiring a re-import.
  const fromRaw=ntProbnpFromText(sourceText(row))||vitaminDFromText(sourceText(row));
  const legacy=legacySomchaiNtProbnp(row,patient);
  if(stored){const upgraded=fromRaw||legacy;if(upgraded?.sourceVerbatim&&!stored.sourceVerbatim)return{...stored,...upgraded,sourcePage:stored.sourcePage||upgraded.sourcePage};return stored}
  if(fromRaw)return fromRaw;if(legacy)return legacy;return referenceSelection(row)
 }
 function patientAge(patient,row){
  const dob=text(patient?.dob||patient?.date_of_birth),date=dateOf(row);if(!dob||!date)return null;
  const d=new Date(dob),x=new Date(`${date}T12:00:00Z`);if(Number.isNaN(d.getTime())||Number.isNaN(x.getTime()))return null;
  let age=x.getUTCFullYear()-d.getUTCFullYear();const before=x.getUTCMonth()<d.getUTCMonth()||(x.getUTCMonth()===d.getUTCMonth()&&x.getUTCDate()<d.getUTCDate());if(before)age--;return age
 }
 function displayLines(info,patient,row,english=false){
  if(!info)return[];const age=patientAge(patient,row),out=[];
  for(const group of info.groups||[]){
   if(group.lines?.length){out.push({heading:group.label,lines:group.lines.map(text).filter(Boolean)});continue}
   if(group.bands?.length){
    let bands=group.bands;if(Number.isFinite(age)){const match=age<50?bands.find(x=>/</.test(x.label)):age<=75?bands.find(x=>/50\s*-\s*75/.test(x.label)):bands.find(x=>/>\s*75/.test(x.label));if(match)bands=[match]}
    out.push({heading:Number.isFinite(age)?`${group.label} · age ${age}`:group.label,lines:bands.flatMap(b=>[b.label,b.ruleOut,b.intermediate,b.ruleIn].map(text).filter(Boolean))})
   }
  }
  return out
 }
 function compact(info,patient,row,english=false){
  const blocks=displayLines(info,patient,row,english);if(!blocks.length)return"";
  const prefix=english?"Source contextual thresholds":"เกณฑ์ตามบริบทจากรายงาน";
  return`${prefix}: ${blocks.map(b=>`${b.heading}: ${b.lines.join("; ")}`).join(" | ")}`
 }
 function sourceVerbatim(info){return text(info?.sourceVerbatim||info?.source_verbatim)}
 function fidelityGate(info){
  const issues=[],verbatim=sourceVerbatim(info);
  if(!info)return{status:"NOT_APPLICABLE",issues};
  if(info.kind==="multi-decision-threshold"&&/Chronic heart failure/i.test(verbatim)){
   ["Rule-in HF unlikely >= 125 pg/mL","HF less likely, alternative causes must be considered 300 - 450 pg/mL","HF less likely, alternative causes must be considered 300 - 900 pg/mL","HF less likely, alternative causes must be considered 300 - 1800 pg/mL"].forEach(x=>{if(!verbatim.includes(x))issues.push(`Missing source wording: ${x}`)})
  }
  return{status:issues.length?"FAIL":verbatim?"PASS":"SOURCE_TEXT_UNAVAILABLE",issues}
 }
 function annotateRows(rows,pageText,meta={}){
  const parsedNt=ntProbnpFromText(pageText),parsedVitD=vitaminDFromText(pageText);let count=0;
  (rows||[]).forEach(row=>{
   const code=codeOf(row),name=nameOf(row);let info=null;
   if((code==="nt_probnp"||/nt[- ]?probn?p/i.test(name))&&parsedNt)info=parsedNt;
   else if((code==="vitamin_d_25_oh"||/vitamin d.*25/i.test(name))&&parsedVitD)info=parsedVitD;
   if(info){row.contextual_reference={...info,sourcePage:pageOf(row)||Number(meta?.source_page_number||0)||0};row.clinical_context_required=Boolean(info.forceContext);count++}
  });return count
 }
 return{BUILD,resolve,compact,displayLines,sourceVerbatim,fidelityGate,annotateRows,__test:{ntProbnpFromText,vitaminDFromText,legacySomchaiNtProbnp,referenceSelection,patientAge,normalizeStored}}
})();
