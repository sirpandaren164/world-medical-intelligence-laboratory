window.MIW=window.MIW||{};
MIW.Utils={
  _uidSequence:0,
  _logEntries:[],
  uid(prefix="id"){
    this._uidSequence=(Number(this._uidSequence)||0)+1;
    const cryptoId=globalThis.crypto&&typeof globalThis.crypto.randomUUID==="function"
      ?globalThis.crypto.randomUUID()
      :`${Date.now().toString(36)}_${this._uidSequence.toString(36)}_${Math.random().toString(36).slice(2,10)}`;
    return`${prefix}_${cryptoId}`
  },
  escape(value=""){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))},
  log(message){
    const entry=`[${new Date().toLocaleTimeString()}] ${String(message??"")}`;
    this._logEntries.push(entry);
    if(this._logEntries.length>500)this._logEntries.splice(0,this._logEntries.length-500);
    const box=document.getElementById("diagnosticLog");
    if(box)box.textContent+=`\n${entry}`;
  },
  getLogs(){return this._logEntries.slice()},
  clearLogs(){
    this._logEntries.length=0;
    const box=document.getElementById("diagnosticLog");
    if(box)box.textContent=`MIW v${document.body?.dataset?.miwVersion||""} diagnostic log cleared`;
  },
  formatBytes(bytes){
    if(bytes<1024)return`${bytes} B`;
    if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;
    return`${(bytes/1024/1024).toFixed(1)} MB`
  },
  normalizeName(name){
    return String(name||"").replace(/\b(MR|MRS|MS|MISS|MASTER|NAME)\b[:.]?/gi," ").replace(/\s+/g," ").trim()
  },
  dateToISO(value){
    const m=String(value||"").match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|25\d{2})\b/);
    if(!m)return"";
    let year=Number(m[3]);if(year>2400)year-=543;
    return`${year}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`
  }
};
