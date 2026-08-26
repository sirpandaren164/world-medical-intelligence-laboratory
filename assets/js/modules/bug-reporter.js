window.MIW=window.MIW||{};
MIW.BugReporter=(function(){
  let lastFailure=null,lastContext={};
  const VERSION=()=>document.body?.dataset?.miwVersion||"unknown";
  const text=value=>String(value??"").trim();
  const safeId=value=>{const v=text(value);return v?v.slice(0,18):"—"};
  function activeView(){return document.querySelector('.view.active')?.id||'unknown'}
  function currentDocument(){try{return MIW.Preview?.current?.()||null}catch{return null}}
  function queueSnapshot(){
    try{return (MIW.UploadQueue?.getQueue?.()||[]).map((item,index)=>({
      index:index+1,fileName:item.fileName||item.file?.name||item.files?.[0]?.name||`file-${index+1}`,
      status:item.status||"",documentId:item.documentId||"",batchId:item.batchId||"",
      batchIndex:Number(item.batchIndex||0)||null,batchTotal:Number(item.batchTotal||0)||null,
      error:item.error?.message||item.error||""
    }))}catch{return[]}
  }
  function knownPhi(doc,queue){
    const values=[doc?.patientName,doc?.patientHN,doc?.patientDOB,document.getElementById('docPatientName')?.value,
      document.getElementById('docPatientHN')?.value,document.getElementById('docPatientDOB')?.value];
    queue.forEach(item=>values.push(item.fileName));
    return [...new Set(values.map(text).filter(v=>v.length>=3))].sort((a,b)=>b.length-a.length)
  }
  function redact(value,doc,queue){
    let out=String(value??'');
    knownPhi(doc,queue).forEach((needle,index)=>{out=out.split(needle).join(`[REDACTED_${index+1}]`)});
    out=out.replace(/file:\/\/\/[A-Za-z]:\/Users\/[^/\s]+/gi,'file:///C:/Users/[REDACTED_USER]');
    out=out.replace(/C:\\Users\\[^\\\s]+/gi,'C:\\Users\\[REDACTED_USER]');
    return out
  }
  async function databaseCounts(){
    const result={};
    for(const store of ['documents','pages','patients','labResults','reviewQueue']){
      try{result[store]=(await MIW.Database.all(store)).length}catch{result[store]='n/a'}
    }
    return result
  }
  function capture(error,context={}){
    const err=error instanceof Error?error:new Error(text(error)||'Unknown error');
    lastFailure={time:new Date().toISOString(),name:err.name||'Error',message:err.message||text(error),stack:err.stack||'',code:err.code||'',details:err.identityDiagnostics||err.details||err.excluded||null};
    lastContext={...context};
    MIW.Utils?.log?.(`BUG CAPTURED: ${lastFailure.code?`[${lastFailure.code}] `:''}${lastFailure.message}`);
    return lastFailure
  }
  async function build({includePatientData=false}={}){
    const doc=currentDocument(),queue=queueSnapshot(),counts=await databaseCounts();
    let docPages=[];try{if(doc?.id)docPages=(await MIW.Database.all('pages')).filter(page=>page.documentId===doc.id)}catch{}
    const enhancedPage=docPages.find(page=>page?.ocr?.enhancement)||null;
    let inbodyGate=null;try{inbodyGate=MIW.LabEngine?.getInBodyValidationGate?.()||null}catch{}
    const logs=MIW.Utils?.getLogs?.()||[];
    const status=document.getElementById('systemStatus')?.textContent||'';
    const folder=decodeURIComponent(location.pathname||'').split('/').filter(Boolean).slice(-2).join('/');
    const report=[
      '=== MIW BUG REPORT ===',
      `Bug ID: MIW-${VERSION()}-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`,
      `Generated: ${new Date().toISOString()}`,
      `MIW version: ${VERSION()}`,
      `System status: ${status||'—'}`,
      `Active view: ${activeView()}`,
      `Build folder: ${folder||'local-file'}`,
      `Browser: ${navigator.userAgent}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      '',
      '--- LAST FAILURE ---',
      lastFailure?`${lastFailure.name}${lastFailure.code?` [${lastFailure.code}]`:''}: ${lastFailure.message}\n${lastFailure.stack||'(no stack)'}`:'(ยังไม่มี error ที่ Bug Reporter จับไว้)',
      '',
      '--- ERROR DIAGNOSTICS ---',
      lastFailure?.details?JSON.stringify(lastFailure.details,null,2):'(none)',
      '',
      '--- FAILURE CONTEXT ---',
      Object.keys(lastContext||{}).length?JSON.stringify(lastContext,null,2):'(none)',
      '',
      '--- CURRENT DOCUMENT ---',
      doc?[
        `file: ${doc.fileName||'—'}`,
        `documentId: ${safeId(doc.id)}`,
        `type: ${doc.type||'—'} / status: ${doc.status||'—'}`,
        `patient: ${doc.patientName||'—'}`,
        `HN/MRN: ${doc.patientHN||'—'}`,
        `DOB: ${doc.patientDOB||'—'}`,
        `identityDeferred: ${doc.identityDeferred?'yes':'no'}`,
        `batch: ${doc.uploadBatchId||'—'} index=${doc.uploadBatchIndex||'—'}/${doc.uploadBatchTotal||'—'}`
      ].join('\n'):'(none)',
      '',
      '--- OCR ENHANCEMENT ---',
      enhancedPage?[
        `page: ${enhancedPage.sourcePageNumber||enhancedPage.pageNumber||'—'}`,
        `profile: ${enhancedPage.ocr?.detectedProfile||enhancedPage.profileHint||'—'}`,
        `nonGenerative: ${enhancedPage.ocr?.enhancement?.nonGenerative?'yes':'no'}`,
        `quality: ${enhancedPage.ocr?.enhancement?.qualityBefore?.score??'—'} -> ${enhancedPage.ocr?.enhancement?.qualityAfter?.score??'—'}`,
        `actions: ${(enhancedPage.ocr?.enhancement?.actions||[]).join(' -> ')||'—'}`,
        `ocrConfidence: ${enhancedPage.ocr?.confidence??'—'}`,
        `confidenceGate: ${enhancedPage.ocr?.qualityGate?.needsVerify?'VERIFY':'PASS'}`,
        `gateReasons: ${(enhancedPage.ocr?.qualityGate?.reasons||[]).join('; ')||'—'}`
      ].join('\n'):'(none)',
      '',
      '--- INBODY VALIDATION GATE ---',
      inbodyGate?[
        `passed: ${inbodyGate.passed?'yes':'no'}`,
        `required: ${inbodyGate.detectedCount??'—'}/${inbodyGate.requiredCount??'—'}`,
        `missing: ${(inbodyGate.missingCodes||[]).length}`,
        `impedance: ${inbodyGate.impedanceCount??0}/30`,
        `issues: ${(inbodyGate.issues||[]).length}`,
        `canonicalSnapshot: ${inbodyGate.canonicalSnapshot?JSON.stringify(inbodyGate.canonicalSnapshot):'—'}`,
        ...(inbodyGate.issues||[]).slice(0,12).map((issue,index)=>`${index+1}. ${issue.code}: ${issue.message}`),
        ...((inbodyGate.missingCodes||[]).length?[`missingCodes: ${(inbodyGate.missingCodes||[]).slice(0,30).join(', ')}`]:[])
      ].join('\n'):'(none)',
      '',
      '--- UPLOAD QUEUE ---',
      queue.length?queue.map(item=>`#${item.index} ${item.fileName} | status=${item.status||'—'} | doc=${safeId(item.documentId)} | batch=${safeId(item.batchId)} ${item.batchIndex||'—'}/${item.batchTotal||'—'}${item.error?` | error=${item.error}`:''}`).join('\n'):'(empty)',
      '',
      '--- DATABASE COUNTS ---',
      Object.entries(counts).map(([k,v])=>`${k}: ${v}`).join('\n'),
      '',
      '--- RECENT DIAGNOSTIC LOG ---',
      logs.slice(-250).join('\n')||document.getElementById('diagnosticLog')?.textContent||'(empty)',
      '',
      '=== END BUG REPORT ==='
    ].join('\n');
    return includePatientData?report:redact(report,doc,queue)
  }
  async function refresh(){
    const area=document.getElementById('bugReportText');if(!area)return'';
    const includePatientData=Boolean(document.getElementById('bugIncludePatientData')?.checked);
    area.value='กำลังสร้าง Bug Report...';
    const report=await build({includePatientData});area.value=report;
    const status=document.getElementById('bugCopyStatus');if(status)status.textContent=includePatientData?'รวมข้อมูลผู้ป่วย':'ปิดบังข้อมูลผู้ป่วย';
    return report
  }
  async function copy(){
    const report=await refresh();let ok=false;
    try{await navigator.clipboard.writeText(report);ok=true}catch{}
    if(!ok){
      const area=document.getElementById('bugReportText');area?.focus();area?.select();
      try{ok=document.execCommand('copy')}catch{ok=false}
    }
    const status=document.getElementById('bugCopyStatus');if(status)status.textContent=ok?'คัดลอกแล้ว ✓':'Copy ไม่สำเร็จ — กด Ctrl+C';
    return ok
  }
  async function download(){
    const report=await refresh(),blob=new Blob([report],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`MIW_v${VERSION()}_BugReport_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  async function open(){
    const dialog=document.getElementById('bugReportDialog');if(!dialog)return;
    await refresh();if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal()}else dialog.setAttribute('open','')
  }
  function init(){
    document.getElementById('openBugReportButton')?.addEventListener('click',open);
    document.getElementById('diagnosticBugReportButton')?.addEventListener('click',open);
    document.getElementById('copyBugReportButton')?.addEventListener('click',copy);
    document.getElementById('downloadBugReportButton')?.addEventListener('click',download);
    document.getElementById('refreshBugReportButton')?.addEventListener('click',refresh);
    document.getElementById('bugIncludePatientData')?.addEventListener('change',refresh);
    document.getElementById('clearDiagnosticLogButton')?.addEventListener('click',()=>{MIW.Utils?.clearLogs?.();lastFailure=null;lastContext={}});
  }
  window.addEventListener('error',event=>{if(event.error)capture(event.error,{source:'window.error',file:event.filename||'',line:event.lineno||0,column:event.colno||0})});
  window.addEventListener('unhandledrejection',event=>capture(event.reason||'Unhandled promise rejection',{source:'unhandledrejection'}));
  return{init,capture,build,open,copy,download,refresh,getLastFailure:()=>lastFailure}
})();
