window.MIW=window.MIW||{};
MIW.PhotoCapture=(function(){
  const workerPromises=new Map();
  const supported=/\.(?:jpe?g|png|webp|bmp|heic|heif)$/i;
  function isPhoto(file){return String(file?.type||"").startsWith("image/")||supported.test(file?.name||"")}
  function progress(message,percent){
    const el=document.getElementById("systemStatus");
    if(el)el.textContent=percent==null?message:`${message} ${Math.round(percent)}%`
  }
  function getWorker(languages=["eng"]){
    if(!window.Tesseract)throw new Error("ไม่พบ OCR Engine — กรุณาเชื่อมต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลด Tesseract.js");
    const requested=[...new Set((Array.isArray(languages)?languages:[languages]).map(value=>String(value||"").trim()).filter(Boolean))];
    const key=(requested.length?requested:["eng"]).sort().join("+");
    if(!workerPromises.has(key))workerPromises.set(key,Tesseract.createWorker(requested.length===1?requested[0]:requested,1,{logger:m=>{
      if(m.status==="recognizing text")progress("PHOTO OCR",Number(m.progress||0)*100)
    }}));
    return workerPromises.get(key)
  }
  function imageFromUrl(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("เปิดภาพไม่สำเร็จ"));img.src=url})}
  function readUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
  function canvasOf(img,scale=1){
    const c=document.createElement("canvas"),max=3200;
    const fit=Math.min(scale,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    c.width=Math.max(1,Math.round((img.naturalWidth||img.width)*fit));
    c.height=Math.max(1,Math.round((img.naturalHeight||img.height)*fit));
    c.getContext("2d",{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);
    return c
  }
  function enhance(source,mode){
    const c=document.createElement("canvas");c.width=source.width;c.height=source.height;
    const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(source,0,0);
    if(mode==="color")return c;
    const d=x.getImageData(0,0,c.width,c.height),a=d.data;
    for(let i=0;i<a.length;i+=4){
      const gray=.299*a[i]+.587*a[i+1]+.114*a[i+2];
      // Blue pen and blue hospital stamps can cross a printed decimal or a
      // result cell. The blue channel keeps black print dark while making
      // most blue ink pale enough to remove with a threshold.
      let v=mode==="blue"?(a[i+2]>140?255:0):
        mode==="threshold-light"?(gray>220?255:0):
        mode==="threshold-mid"?(gray>200?255:0):
        mode==="threshold"?(gray>176?255:0):
        Math.max(0,Math.min(255,(gray-128)*1.42+138));
      a[i]=a[i+1]=a[i+2]=v
    }
    x.putImageData(d,0,0);return c
  }
  function normalizeText(s){return String(s||"").replace(/[|¦]/g,"I").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim()}
  function score(text,confidence){
    const lab=(String(text).match(/\b(?:INBODY|BODY\s+COMPOSITION|VISCERAL\s+FAT|ECW\/?TBW|FITNESS\s+SCORE|WBC|RBC|HGB|HB|HCT|MCV|MCH|PLT|CREATININE|GLUCOSE|ALBUMIN|PROTEIN|VITAMIN|ANA|EGFR|REFERENCE|ALLERGY|ALLERGEN|CONCENTRATION)\b/gi)||[]).length;
    const numbers=(String(text).match(/[<>]?\d+(?:\.\d+)?/g)||[]).length;
    return Number(confidence||0)+Math.min(35,lab*2)+Math.min(20,numbers/3)
  }
  function wordsToItems(words,height){
    return(words||[]).filter(w=>String(w.text||"").trim()).map(w=>({
      str:String(w.text).trim(),x:Number(w.bbox?.x0||0),y:height-Number(w.bbox?.y1||0),
      w:Number((w.bbox?.x1||0)-(w.bbox?.x0||0)),confidence:Number(w.confidence||0),
      bbox:w.bbox||null
    }))
  }
  function collectWords(data){
    if(Array.isArray(data?.words)&&data.words.length)return data.words;
    const out=[];
    function walk(node){
      if(!node)return;
      if(Array.isArray(node)){node.forEach(walk);return}
      if(typeof node!=="object")return;
      if(typeof node.text==="string"&&node.bbox&&
        !node.words&&!node.lines&&!node.paragraphs&&!node.blocks){
        out.push(node);return
      }
      ["blocks","paragraphs","lines","words","symbols"].forEach(key=>{
        if(Array.isArray(node[key]))walk(node[key])
      })
    }
    walk(data?.blocks);
    if(out.length)return out;
    const tsv=String(data?.tsv||"");
    if(!tsv.trim())return[];
    return tsv.split(/\r?\n/).slice(1).map(line=>{
      const c=line.split("\t");
      if(c.length<12||Number(c[0])!==5||!String(c[11]||"").trim())return null;
      const x=Number(c[6]),y=Number(c[7]),w=Number(c[8]),h=Number(c[9]);
      return{text:c[11],confidence:Number(c[10]||0),bbox:{x0:x,y0:y,x1:x+w,y1:y+h}}
    }).filter(Boolean)
  }
  function maharatTableDetected(results){
    const text=results.map(result=>String(result.text||"")).join("\n");
    const table=/Test\s*Name[\s\S]{0,120}Results?[\s\S]{0,120}Units?[\s\S]{0,160}Normal\s*Range/i.test(text);
    return table&&(/MAHARAT\s+NAKHONRATCHASIMA/i.test(text)||/Previous\s+result/i.test(text))
  }
  function focusResultColumn(source,mode){
    // Maharat result tables keep the current value in a narrow vertical
    // column. OCR this column separately so a pen circle crossing one cell
    // cannot destroy the value while preserving the whole-page evidence.
    const crop=mode==="blue"?{
      // Include the printed labels so PSM 6 can separate a value crossed by
      // pen ink from the neighbouring row.
      x:Math.round(source.width*.02),
      y:Math.round(source.height*.10),
      width:Math.round(source.width*.44),
      height:Math.round(source.height*.36)
    }:{
      x:Math.round(source.width*.18),
      y:Math.round(source.height*.10),
      width:Math.round(source.width*.25),
      height:Math.round(source.height*.36)
    };
    const preferredScale=mode==="blue"?2:3;
    const scale=Math.min(preferredScale,3200/Math.max(crop.width,crop.height));
    const raw=document.createElement("canvas");
    raw.width=Math.max(1,Math.round(crop.width*scale));
    raw.height=Math.max(1,Math.round(crop.height*scale));
    raw.getContext("2d",{willReadFrequently:true}).drawImage(
      source,crop.x,crop.y,crop.width,crop.height,0,0,raw.width,raw.height
    );
    return{canvas:enhance(raw,mode),crop,scale}
  }
  function bnhTableDetected(results){
    const text=results.map(result=>String(result.text||"")).join("\n");
    return /BNH\s+Hospital|9\s*\/\s*1\s+Convent\s+Road|Hospital\s+Number\s*:/i.test(text)&&
      /(?:Laboratory\s+Report|Complete\s+Blood\s+Count|Platelet\s+Count|Liver\s+Function|Electrolytes|Reticulocyte\s+Count|Thromboplastin|Prothrombin|Urine\s+Examination|D-?Dimer|Coombs|Glucose|Creatinine|Albumin|LDH|PSA)/i.test(text)
  }
  function focusBnhLabBody(source,mode){
    // BNH scan fonts are small.  Re-OCR the laboratory body at higher effective
    // resolution so 8.8 does not become 86.8 and 32.9 does not become 329.
    const crop={
      x:Math.round(source.width*.04),y:Math.round(source.height*.16),
      width:Math.round(source.width*.92),height:Math.round(source.height*.72)
    };
    const scale=Math.min(2.8,3600/Math.max(crop.width,crop.height));
    const raw=document.createElement("canvas");raw.width=Math.max(1,Math.round(crop.width*scale));raw.height=Math.max(1,Math.round(crop.height*scale));
    raw.getContext("2d",{willReadFrequently:true}).drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,raw.width,raw.height);
    return{canvas:enhance(raw,mode),crop,scale}
  }

  function bnhNamedRowAnchor(results,{primary=[],fallback=[]}={}){
    // v10.219: locate a *physical result row*, not merely one matching word.
    // Group OCR words by baseline, then prefer a matching line that also
    // contains a result token / unit / reference. This prevents section
    // headings such as "Albumin" or "Reticulocyte Count" from winning over
    // the actual laboratory row.
    const lineCandidates=[];
    (results||[]).forEach((result,resultIndex)=>{
      const words=(result.words||[]).filter(word=>String(word?.text||"").trim()&&word?.bbox);
      const lines=[];
      words.slice().sort((a,b)=>Number(a.bbox.y0||0)-Number(b.bbox.y0||0)||Number(a.bbox.x0||0)-Number(b.bbox.x0||0)).forEach(word=>{
        const box=word.bbox||{},cy=(Number(box.y0||0)+Number(box.y1||0))/2,h=Math.max(4,Number(box.y1||0)-Number(box.y0||0));
        let line=lines.find(item=>Math.abs(item.cy-cy)<=Math.max(5,h*.55));
        if(!line){line={cy,words:[]};lines.push(line)}
        line.words.push(word)
      });
      lines.forEach(line=>{
        line.words.sort((a,b)=>Number(a.bbox.x0||0)-Number(b.bbox.x0||0));
        const text=line.words.map(word=>String(word.text||"").trim()).join(" ").replace(/\s+/g," ").trim();if(!text)return;
        const xs=line.words.map(word=>Number(word.bbox.x0||0)),xe=line.words.map(word=>Number(word.bbox.x1||0)),ys=line.words.map(word=>Number(word.bbox.y0||0)),ye=line.words.map(word=>Number(word.bbox.y1||0));
        const confidence=line.words.reduce((sum,word)=>sum+Number(word.confidence||result.confidence||0),0)/Math.max(1,line.words.length);
        const evidence=(/[<>]?\d+(?:[.,]\d+)?/.test(text)?22:0)+(/\([^)]*\d[^)]*\)/.test(text)?10:0)+(/(?:mg\/dL|g\/dL|fL|pg|Secs?\.?|%|mm3|10\^?3|ug\/mL)/i.test(text)?8:0)+(/[:=]/.test(text)?4:0);
        lineCandidates.push({resultIndex,confidence,score:confidence+evidence,box:{x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xe),y1:Math.max(...ye)},text})
      })
    });
    const scanLines=patterns=>lineCandidates.filter(hit=>(patterns||[]).some(pattern=>pattern.test(hit.text))).sort((a,b)=>b.score-a.score)[0]||null;
    const direct=scanLines(primary);if(direct)return{...direct,fallback:false};
    const secondary=scanLines(fallback);if(secondary)return{...secondary,fallback:true};
    // Backward-compatible word fallback for damaged line grouping.
    const scanWords=patterns=>{
      const hits=[];
      (results||[]).forEach((result,resultIndex)=>{
        (result.words||[]).forEach(word=>{
          const text=String(word?.text||"").trim();if(!text||!(patterns||[]).some(pattern=>pattern.test(text)))return;
          const box=word.bbox||{},y0=Number(box.y0),y1=Number(box.y1);if(!Number.isFinite(y0)||!Number.isFinite(y1))return;
          hits.push({resultIndex,confidence:Number(word.confidence||result.confidence||0),score:Number(word.confidence||result.confidence||0),box:{x0:Number(box.x0||0),y0,x1:Number(box.x1||0),y1},text})
        })
      });
      return hits.sort((a,b)=>b.score-a.score)[0]||null
    };
    const wordDirect=scanWords(primary);if(wordDirect)return{...wordDirect,fallback:false};
    const wordSecondary=scanWords(fallback);return wordSecondary?{...wordSecondary,fallback:true}:null
  }
  function focusBnhNamedRow(source,results,mode,config={}){
    // v10.218: critical BNH rows deserve one narrow, high-resolution OCR pass.
    // Full-page/body OCR can preserve every digit but erase a tiny decimal dot
    // (e.g. >35.20 -> >3520).  Locate the printed row label first, then OCR the
    // horizontal source band itself.  This is image evidence, not a value guess.
    const anchor=bnhNamedRowAnchor(results,config);if(!anchor)return null;
    const pageH=source.height,pageW=source.width;
    const center=(anchor.box.y0+anchor.box.y1)/2+(anchor.fallback?Number(config.fallbackShiftY||pageH*.042):0);
    const anchorHeight=Math.max(10,Number(anchor.box.y1||0)-Number(anchor.box.y0||0));
    // v10.222 — a fourth single-line pass uses a much tighter vertical band.
    // It keeps the tiny final digit of reference endpoints (31.5, <0.5) and
    // prevents the Reticulocyte absolute row below from entering the % crop.
    const bandHeight=config.tightLine?Math.max(42,Math.min(Math.round(pageH*.048),Math.round(anchorHeight*3.2))):Math.max(72,Math.round(pageH*Number(config.heightRatio||.105)));
    const y=Math.max(0,Math.min(pageH-bandHeight,Math.round(center-bandHeight*.50)));
    const crop={x:Math.round(pageW*.015),y,width:Math.round(pageW*.97),height:bandHeight};
    const scale=config.tightLine?Math.min(6.0,6400/Math.max(crop.width,crop.height)):Math.min(4.4,4700/Math.max(crop.width,crop.height));
    const raw=document.createElement("canvas");raw.width=Math.max(1,Math.round(crop.width*scale));raw.height=Math.max(1,Math.round(crop.height*scale));
    raw.getContext("2d",{willReadFrequently:true}).drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,raw.width,raw.height);
    return{canvas:enhance(raw,mode),crop,scale,anchor}
  }
  function focusInBodyRegion(source,region,mode="gray"){
    const crop={x:Math.round(source.width*region.x),y:Math.round(source.height*region.y),width:Math.round(source.width*region.w),height:Math.round(source.height*region.h)};
    const scale=Math.min(region.scale||3.0,4200/Math.max(crop.width,crop.height));
    const raw=document.createElement("canvas");raw.width=Math.max(1,Math.round(crop.width*scale));raw.height=Math.max(1,Math.round(crop.height*scale));
    raw.getContext("2d",{willReadFrequently:true}).drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,raw.width,raw.height);
    // v10.299 — critical InBody cells also get a source-pixel pass.  Previous
    // releases always denoised/sharpened before every focused OCR call; on pale
    // 720 printouts this could turn 56.4 into 36.1, 2.27 into 7.27, or erase a
    // decimal/sign.  "source" preserves the physical crop unchanged and is used
    // only as additional evidence; it never replaces the retained original page.
    if(mode==="source")return{canvas:enhance(raw,"color"),crop,scale,enhancement:{nonGenerative:true,originalRetained:true,actions:["Source pixels · no enhancement"],sourcePixelPass:true}};
    const prepared=MIW.ImageEnhancement?.prepare?.(raw,{profileHint:"INBODY_720",denseDocument:true,highDetailScan:true,region:region.name})||{canvas:raw,meta:null};
    return{canvas:enhance(prepared.canvas,mode),crop,scale,enhancement:prepared.meta}
  }
  function focusAllergyTable(source,mode){
    // BCL Allergy profiles print 21 small rows in two columns. Full-page OCR can
    // read the names but lose the tiny Class/Concentration cells. Re-OCR only
    // the table at high resolution and map the words back to page coordinates.
    const crop={
      x:Math.round(source.width*.012),
      y:Math.round(source.height*.185),
      width:Math.round(source.width*.976),
      height:Math.round(source.height*.335)
    };
    const scale=Math.min(2.8,3200/Math.max(crop.width,crop.height));
    const raw=document.createElement("canvas");
    raw.width=Math.max(1,Math.round(crop.width*scale));
    raw.height=Math.max(1,Math.round(crop.height*scale));
    raw.getContext("2d",{willReadFrequently:true}).drawImage(
      source,crop.x,crop.y,crop.width,crop.height,0,0,raw.width,raw.height
    );
    return{canvas:enhance(raw,mode),crop,scale}
  }
  function mappedFocusItems(words,pageHeight,crop,scale){
    return(words||[]).filter(word=>String(word.text||"").trim()).map(word=>{
      const box=word.bbox||{};
      const x0=crop.x+Number(box.x0||0)/scale;
      const y0=crop.y+Number(box.y0||0)/scale;
      const x1=crop.x+Number(box.x1||0)/scale;
      const y1=crop.y+Number(box.y1||0)/scale;
      return{
        str:String(word.text).trim(),x:x0,y:pageHeight-y1,w:x1-x0,
        confidence:Number(word.confidence||0),
        bbox:{x0,y0,x1,y1}
      }
    })
  }
  function adaptiveOcrComplete(result,profileHint=""){
    const raw=String(result?.text||""),confidence=Number(result?.confidence||0);
    const compact=raw.replace(/\s+/g,"");
    const tokens=(raw.match(/[<>≤≥]?\d+(?:[.,]\d+)?/g)||[]).length;
    // Clear full-page laboratory scans normally need only one pass. A second
    // or third pass is reserved for pages that fail profile-specific evidence,
    // rather than being performed for every uploaded page.
    if(confidence<66||compact.length<55||tokens<1)return false;
    if(profileHint==="INBODY_720")return /InBody|Body\s+Composition|Visceral\s+Fat/i.test(raw)&&tokens>=12;
    if(profileHint==="MASUYAMA_IMMUNOLOGICAL")return [/Comprehensive\s+Immunity/i,/NLR|Neutrophil\s*\//i,/CD4\s*\/\s*CD8/i,/NK\s+Vue/i,/NKG2D/i].filter(p=>p.test(raw)).length>=3&&tokens>=5;
    if(profileHint==="FOOD_INTOLERANCE_IGG_200_PLUS")return /FoodPrint|Food\s*intolerance|Allergy\s+(?:Food|Inhalation)|Allergen/i.test(raw)&&tokens>=12;
    if(profileHint==="MICRONUTRIENT_PROFILE_I")return /Micronutrient|Vitamin\s+B9|Folic\s+Acid|Ferritin|Magnesium|Selenium|Zinc|Coenzyme\s*Q10/i.test(raw)&&tokens>=4;
    if(profileHint==="FOLATE_SERUM")return /Folate|Folic\s+Acid/i.test(raw)&&tokens>=2;
    if(profileHint==="ARSENIC_URINE")return /Arsenic\s+in\s+Urine/i.test(raw)&&tokens>=2;
    if(profileHint==="ALLERGY_PROFILE"){const labels=[/Egg\s*(?:white|yolk)/i,/Shrimp\s*[\/ ]\s*Prawn/i,/Mould\s*mix\s*1/i,/CCD\s*marker/i].filter(pattern=>pattern.test(raw)).length;return /Allergy|Allergen|Concentration|Class/i.test(raw)&&tokens>=18&&labels>=3;}
    if(profileHint==="AUTOIMMUNE_ANA")return /ANF|ANA|ANApatterns?|Fine\s*speckle|Cytoplasmic\s+staining/i.test(raw)&&tokens>=2;
    if(profileHint==="AUTOIMMUNE_ANTIBODY_PANEL")return /Anti[-\s]?(?:dsDNA|Sm|nRNP|SS\s*A|SS\s*B)/i.test(raw)&&/(?:Negative|Positive|<\s*1\s*:\s*10)/i.test(raw);
    if(profileHint==="COMPLEMENT_PANEL")return /(?:C3|C4|Beta\s*1\s*C).*Complement/i.test(raw)&&tokens>=2;
    if(profileHint==="MEDICA_HORMONE_METABOLIC_PANEL")return ["Insulin","Cortisol","Progesterone","Testosterone","Homocysteine","DHEA"].filter(name=>new RegExp(name,"i").test(raw)).length>=2&&tokens>=4;
    if(profileHint==="HAMAD_MULTI_DATE_TABLE"){
      const headers=[/Collected\s+Date/i,/Reference\s+Range/i,/(?:Chemistry|Hematology|Coagulation|Point\s+of\s+Care)/i]
        .filter(pattern=>pattern.test(raw)).length;
      return confidence>=72&&headers>=2&&tokens>=12&&compact.length>=180
    }
    return confidence>=77&&tokens>=5&&compact.length>=90
  }
  function conflictList(results){
    const values=new Map();
    results.forEach(r=>{
      (r.text.match(/[<>]?\d+(?:[.,]\d+)?/g)||[]).forEach(v=>values.set(v,(values.get(v)||0)+1))
    });
    const all=[...values.keys()];
    return all.filter(v=>results.some(r=>!r.text.includes(v))).slice(0,12)
  }
  async function process(file,documentId,options={}){
    if(/\.(?:heic|heif)$/i.test(file.name||"")&&!/^image\/(?:jpeg|png|webp|bmp)$/i.test(file.type||"")){
      throw new Error(`${file.name}: HEIC ของเบราว์เซอร์นี้เปิดไม่ได้ กรุณาเลือกภาพจาก Gallery เป็น JPG หรือ PNG`)
    }
    progress("กำลังปรับภาพ",0);
    const originalUrl=await readUrl(file),img=await imageFromUrl(originalUrl);
    const bnhProbeOnly=Boolean(options.bnhProbeOnly),bnhFastUpload=Boolean(options.bnhFastUpload);
    // v10.237 — true fast probe: one grayscale OCR pass on a smaller image.
    // v10.235 still allowed the adaptive loop to run 2–3 whole-page passes on
    // a low-resolution probe, which made a 27-page BNH scan slower rather than
    // faster.  Probe evidence is only used to decide whether a page needs the
    // high-resolution source-truth path; it is not the final authority for
    // sensitive rows.
    const hintedInBody=String(options.profileHint||"").toUpperCase()==="INBODY_720";
    const highDetailScan=Boolean(options.highDetailScan||hintedInBody);
    const probeMaxSide=bnhProbeOnly?1180:(highDetailScan?3200:2200);
    const base=canvasOf(img,Math.max(1,probeMaxSide/Math.max(1,img.naturalWidth||img.width)));
    const prepared=MIW.ImageEnhancement?.prepare?.(base,{profileHint:options.profileHint||"",highDetailScan,denseDocument:hintedInBody})||{canvas:base,meta:{nonGenerative:false,actions:[],qualityBefore:null,qualityAfter:null}};
    const ocrBase=prepared.canvas;
    const hamadFast=options.profileHint==="HAMAD_MULTI_DATE_TABLE";
    const allVariants=bnhProbeOnly
      ?[["gray",enhance(ocrBase,"gray")]]
      :hamadFast
        ?[["gray",enhance(ocrBase,"gray")],["threshold",enhance(ocrBase,"threshold")]]
        :[["gray",enhance(ocrBase,"gray")],["color",enhance(ocrBase,"color")],["threshold",enhance(ocrBase,"threshold")]];
    const languages=Array.isArray(options.languages)&&options.languages.length?options.languages:["eng"];
    const worker=await getWorker(languages),results=[];
    const fastMode=Boolean(options.fastMode),forceTablePasses=options.profileHint==="ALLERGY_PROFILE";
    for(let i=0;i<allVariants.length;i++){
      const [mode,canvas]=allVariants[i];
      if(bnhProbeOnly&&i>0)break;
      if(fastMode&&!forceTablePasses&&i>0&&adaptiveOcrComplete(results[0],options.profileHint||""))break;
      const planned=fastMode?"adaptive":"3";
      progress(`OCR ${i+1}/${planned}`,fastMode?Math.min(95,i*45):i/3*100);
      await worker.setParameters({
        tessedit_pageseg_mode:mode==="color"?"11":"6",
        preserve_interword_spaces:"1"
      });
      const result=await worker.recognize(canvas,{}, {
        text:true,blocks:true,tsv:true
      });
      results.push({
        mode,canvas,text:normalizeText(result.data.text),
        confidence:Number(result.data.confidence||0),
        words:collectWords(result.data)
      })
    }
    const focused=[];
    const maharatTable=Boolean(options.scannedPdf&&maharatTableDetected(results));
    const bnhTable=Boolean(options.scannedPdf&&(options.profileHint==="BNH_SCANNED_LAB"||bnhTableDetected(results)));
    const allergyTable=options.profileHint==="ALLERGY_PROFILE";
    const inbodyProfile=options.profileHint==="INBODY_720"||/InBody\s*720|Body\s+Composition\s+History|Visceral\s+Fat\s+Area/i.test(results.map(r=>r.text).join("\n"));
    if(maharatTable){
      for(const mode of ["gray","blue"]){
        const focus=focusResultColumn(base,mode);
        progress(`OCR ช่องผล ${mode==="gray"?"เทา":"ตัดหมึกน้ำเงิน"}`,90);
        await worker.setParameters({
          tessedit_pageseg_mode:mode==="blue"?"6":"11",
          preserve_interword_spaces:"1"
        });
        const result=await worker.recognize(focus.canvas,{},{
          text:true,blocks:true,tsv:true
        });
        const words=collectWords(result.data);
        focused.push({
          mode:`maharat-result-${mode}`,
          text:normalizeText(result.data.text),
          confidence:Number(result.data.confidence||0),
          textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),
          focusedResultColumn:true
        })
      }
    }
    if(bnhTable&&!bnhProbeOnly){
      // v10.217: use two focused high-resolution views of the BNH laboratory
      // body.  The gray pass preserves punctuation; threshold often recovers a
      // decimal point or a faint reference-range digit that gray misses.  The
      // Atomic Row guard adjudicates the two passes instead of blindly trusting
      // either one, so this remains evidence-bound rather than a numeric guess.
      for(const mode of (bnhFastUpload?["gray"]:["gray","threshold"])){
        const focus=focusBnhLabBody(base,mode);
        progress(`OCR ตาราง BNH ${mode==="gray"?"ความละเอียดสูง":"ยืนยันแถวผล/ช่วงอ้างอิง"}`,mode==="gray"?92:94);
        await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
        const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
        const words=collectWords(result.data);
        focused.push({mode:`bnh-body-${mode}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedBnhBody:true,atomicRowEvidence:true})
      }
      // v10.218 — exact critical-row recovery.  FDP is printed with a tiny
      // decimal point that can disappear in otherwise excellent full-page OCR.
      // Re-read the physical FDP row itself (or use D-Dimer as a nearby anchor)
      // with sparse-text segmentation so punctuation is preserved.
      const bnhPageText=results.map(result=>String(result.text||"")).join("\n");
      if(/(?:FDP\s*\(|Fibrin\s+Degradation|D-?Dimer)/i.test(bnhPageText)){
        const config={primary:[/^FDP/i,/^Fibrin/i],fallback:[/^D-?Dimer$/i,/^D-?Dimer/i],fallbackShiftY:base.height*.043,heightRatio:.11};
        for(const mode of ["color","gray","threshold","line"]){
          const visualMode=mode==="line"?"color":mode;
          const focus=focusBnhNamedRow(base,results,visualMode,mode==="line"?{...config,tightLine:true}:config);if(!focus)continue;
          progress(`OCR แถว Critical FDP ${mode==="color"?"รักษารูปตัวเลข":mode==="gray"?"อ่านจุดทศนิยม":mode==="threshold"?"ยืนยันค่า":"อ่านแถวเดียว"}`,mode==="color"?95:mode==="gray"?96:mode==="threshold"?97:98);
          if(mode==="line")await worker.setParameters({tessedit_pageseg_mode:"7",preserve_interword_spaces:"1"});
          else if(mode==="color")await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
          else await worker.setParameters({tessedit_pageseg_mode:"11",preserve_interword_spaces:"1"});
          const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
          const words=collectWords(result.data);
          focused.push({mode:`bnh-row-fdp-${mode}`,targetCode:"fdp",text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedBnhRow:true,exactSourceRowEvidence:true,atomicRowEvidence:true,tightSingleLine:mode==="line"})
        }
      }
      // v10.219 — Full Atomic Row pass for source-critical BNH analytes.
      // Run only for rows whose labels are visibly present on this page. Each
      // narrow pass preserves the physical Result + Flag + Unit + Reference
      // bundle and is later reconciled by test_code + clinical event.
      const atomicTargets=[
        {code:"reticulocyte_pct",primary:[/%\s*Reticulocyte\b/i,/Reticulocyte\s*%/i],heightRatio:.072},
        {code:"reticulocyte_abs",primary:[/(?:^|\s)Reticulocytes(?:\s|:|$)/i,/Absolute\s+Reticulocytes/i],heightRatio:.072},
        {code:"myelocyte_pct",primary:[/%\s*Myelocyte\b/i,/Myelocyte\s*%/i],heightRatio:.072},
        {code:"metamyelocyte_pct",primary:[/%\s*Metamyelocyte\b/i,/Metamyelocyte\s*%/i],heightRatio:.072},
        {code:"platelet_count",primary:[/Platelet\s+Count\b/i],heightRatio:.09},
        {code:"mpv",primary:[/(?:^|\s)MPV(?:\s|:|$)/i],heightRatio:.085},
        {code:"mcv",primary:[/(?:^|\s)MCV(?:\s|:|$)/i],heightRatio:.085},
        {code:"mchc",primary:[/(?:^|\s)MCHC(?:\s|:|$)/i],heightRatio:.085},
        {code:"rdw",primary:[/(?:^|\s)RDW(?:\s|:|$)/i],heightRatio:.085},
        {code:"albumin",primary:[/(?:^|\s)Albumin(?:\s|:|$)/i],heightRatio:.09},
        {code:"total_bilirubin",primary:[/Bilirubin\s*\(Total\)/i,/Total\s+Bilirubin/i],heightRatio:.09},
        {code:"direct_bilirubin",primary:[/Direct\s+Bilirubin/i,/Bilirubin\s*\(Direct\)/i],heightRatio:.09},
        {code:"chloride",primary:[/(?:^|\s)Chloride(?:\s|:|$)/i],heightRatio:.085},
        {code:"urine_ph",primary:[/(?:^|\s)pH(?:\s|:|$)/i],heightRatio:.085},
        {code:"aptt",primary:[/Activated\s+Partial\s+.*Thromb.*\s+Time/i,/\baPTT\b/i],heightRatio:.105},
        {code:"prothrombin_time",primary:[/Prothrombin\s+Time/i,/\bPT\b/i],heightRatio:.105},
        {code:"fasting_glucose",primary:[/Glucose\s*\(Fasting\)/i,/Glucose\s+Fasting/i],heightRatio:.09}
      ];
      for(const config of atomicTargets){
        const patterns=[...(config.primary||[]),...(config.fallback||[])];
        if(!patterns.some(pattern=>pattern.test(bnhPageText)))continue;
        for(const mode of (bnhFastUpload?["gray","line"]:["color","gray","threshold","line"])){
          const visualMode=mode==="line"?"color":mode;
          const focus=focusBnhNamedRow(base,results,visualMode,mode==="line"?{...config,tightLine:true}:config);if(!focus)continue;
          progress(`OCR แถว BNH ${config.code} ${mode==="color"?"รักษารูปตัวเลข":mode==="gray"?"อ่านต้นฉบับ":mode==="threshold"?"ยืนยันทศนิยม/ช่วง":"อ่านแถวเดียว"}`,mode==="color"?95:mode==="gray"?96:mode==="threshold"?97:98);
          if(mode==="line")await worker.setParameters({tessedit_pageseg_mode:"7",preserve_interword_spaces:"1"});
          else if(mode==="color")await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
          else await worker.setParameters({tessedit_pageseg_mode:"11",preserve_interword_spaces:"1"});
          const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
          const words=collectWords(result.data);
          focused.push({mode:`bnh-row-${config.code}-${mode}`,targetCode:config.code,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedBnhRow:true,exactSourceRowEvidence:true,atomicRowEvidence:true,tightSingleLine:mode==="line"})
        }
      }
    }
    if(inbodyProfile){
      const regions=[
        {name:"header",x:.00,y:.035,w:1.00,h:.105,scale:2.5,psm:"6"},
        {name:"composition",x:.00,y:.120,w:.675,h:.140,scale:3.0,psm:"6"},
        {name:"composition-threshold",x:.00,y:.120,w:.675,h:.140,scale:3.2,psm:"6",mode:"threshold"},
        {name:"muscle-fat",x:.00,y:.255,w:.675,h:.125,scale:3.3,psm:"6"},
        {name:"muscle-fat-threshold",x:.00,y:.255,w:.675,h:.125,scale:3.5,psm:"6",mode:"threshold"},
        {name:"obesity",x:.00,y:.365,w:.675,h:.135,scale:3.2,psm:"6"},
        {name:"obesity-threshold",x:.00,y:.365,w:.675,h:.135,scale:3.5,psm:"6",mode:"threshold"},
        {name:"reference-column",x:.555,y:.130,w:.125,h:.375,scale:4.0,psm:"6"},
        {name:"segmental",x:.00,y:.485,w:.675,h:.285,scale:3.0,psm:"6"},
        {name:"segmental-threshold",x:.00,y:.485,w:.675,h:.285,scale:3.1,psm:"6",mode:"threshold"},
        {name:"history",x:.00,y:.755,w:.675,h:.115,scale:3.4,psm:"6"},
        {name:"history-source",alias:"history",x:.00,y:.755,w:.675,h:.115,scale:3.8,psm:"6",mode:"source"},
        {name:"right-summary",x:.670,y:.110,w:.325,h:.755,scale:2.8,psm:"6"},
        {name:"right-summary-color",x:.670,y:.110,w:.325,h:.755,scale:3.0,psm:"6",mode:"color"},
        {name:"weight-control",x:.670,y:.755,w:.325,h:.105,scale:4.0,psm:"6"},
        {name:"weight-control-source",alias:"weight-control",x:.670,y:.755,w:.325,h:.105,scale:4.5,psm:"6",mode:"source"},
        {name:"impedance",x:.670,y:.825,w:.325,h:.155,scale:4.2,psm:"6",mode:"gray"},
        {name:"impedance-threshold",x:.670,y:.825,w:.325,h:.155,scale:4.4,psm:"6",mode:"threshold"}
      ];
      for(const region of regions){
        const focus=focusInBodyRegion(base,region,region.mode||"gray");
        progress(`OCR InBody · ${region.name}`,92);
        await worker.setParameters({tessedit_pageseg_mode:region.psm||"6",preserve_interword_spaces:"1"});
        const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
        const words=collectWords(result.data);
        focused.push({mode:`inbody-${region.name}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedInBody:true,inbodyRegion:region.alias||region.name,inbodyRegionPass:region.name,enhancement:focus.enhancement||null})
      }
      // v10.257 — deterministic Segmental row strips.  InBody prints Lean mass,
      // Lean/Ideal %, Fat mass (Fat %), ECF/TBF and ECW/TBW on the same physical
      // row.  Their horizontal position moves with the bar length, so fixed-x crops
      // overfit one patient.  Re-OCR each row as a narrow strip and let LabEngine
      // classify only explicitly visible numeric tokens by row + semantic field.
      const segmentRows=[
        {part:"right_arm",y:.539,h:.038},
        {part:"left_arm",y:.581,h:.038},
        {part:"trunk",y:.623,h:.038},
        {part:"right_leg",y:.665,h:.038},
        {part:"left_leg",y:.707,h:.038}
      ];
      for(const row of segmentRows){
        for(const mode of ["source","gray","threshold"]){
          // Include the whole semantic row from the moving Lean result through both
          // water ratios.  The parser classifies by visible decimal/parenthesis
          // structure rather than by a patient-specific x coordinate.
          const focus=focusInBodyRegion(base,{name:`segment-row-${row.part}`,x:.175,y:row.y,w:.405,h:row.h,scale:5.8},mode);
          progress(`OCR InBody Segmental · ${row.part} · ${mode}`,93);
          await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1",tessedit_char_whitelist:"0123456789.()%-+"});
          const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
          const words=collectWords(result.data);
          focused.push({mode:`inbody-segment-row-${row.part}-${mode}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedInBody:true,inbodyRegion:`segment-row-${row.part}`,inbodySegmentRow:row.part,inbodySegmentMode:mode,enhancement:focus.enhancement||null})
        }
      }
      // v10.260 — bottom Segmental water row contains left-leg ECF/TBF + ECW/TBW
      // followed by whole-body ECF/TBF + ECW/TBW. OCR the four values together
      // so column order is preserved and a damaged 0.378 cannot turn into 0.318.
      for(const mode of ["gray","threshold"]){
        const focus=focusInBodyRegion(base,{name:"segmental-water-bottom",x:.440,y:.705,w:.260,h:.050,scale:6.2},mode);
        progress(`OCR InBody Segmental water bottom · ${mode}`,93);
        await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1",tessedit_char_whitelist:"0123456789."});
        const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
        const words=collectWords(result.data);
        focused.push({mode:`inbody-segmental-water-bottom-${mode}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedInBody:true,inbodyRegion:"segmental-water-bottom",inbodyWaterBottom:true,inbodyWaterBottomMode:mode,enhancement:focus.enhancement||null})
      }
      // v10.257 — micro-ROI passes for cells that are commonly damaged by graph lines
      // or stepped table borders. These are OCR-only crops of the original pixels;
      // no value is generated or inferred. If a digit/decimal is not visible, the
      // field stays unresolved and Validation Gate routes it to Review.
      const microCells=[
        {code:"inbody_intracellular_water",x:.145,y:.142,w:.055,h:.020,psm:"8",modes:["gray","threshold"]},
        {code:"inbody_extracellular_water",x:.140,y:.164,w:.065,h:.017,psm:"8"},
        {code:"inbody_total_body_water",x:.220,y:.145,w:.090,h:.035,psm:"7"},
        {code:"inbody_minerals",x:.140,y:.207,w:.070,h:.030,psm:"11"},
        {code:"inbody_soft_lean_mass",x:.310,y:.165,w:.075,h:.030,psm:"7"},
        {code:"inbody_bmi",x:.325,y:.410,w:.070,h:.025,psm:"7",scale:6.6,modes:["gray","threshold"]},
        {code:"inbody_percent_body_fat",x:.435,y:.438,w:.075,h:.026,psm:"7",scale:6.6,modes:["gray","threshold"]},
        {code:"inbody_waist_hip_ratio",x:.315,y:.473,w:.075,h:.025,psm:"8",scale:6.6,modes:["gray","threshold"]},
        // v10.304 — Body Composition History is the cleanest printed source for
        // Weight / SMM / Fat / Score on InBody 720. Read each history column as a
        // dedicated source-pixel cell so graph ticks from the upper bar panels can
        // never become the only candidate when the history-row regex is damaged.
        {code:"inbody_weight",x:.145,y:.790,w:.052,h:.026,psm:"7",scale:7.4,modes:["gray","threshold-light"],sourceMode:true},
        {code:"inbody_skeletal_muscle_mass",x:.190,y:.790,w:.050,h:.026,psm:"7",scale:7.4,modes:["gray","threshold-light"],sourceMode:true},
        {code:"inbody_body_fat_mass",x:.232,y:.790,w:.052,h:.026,psm:"7",scale:7.4,modes:["gray","threshold-light"],sourceMode:true},
        {code:"inbody_fitness_score",x:.272,y:.790,w:.050,h:.026,psm:"7",scale:7.4,modes:["gray","threshold-light"],sourceMode:true},
        // v10.255: extra deterministic cells for the values that remained unresolved
        // in the real 600-dpi male scan. These are physical pixel crops only; no
        // number is inferred from neighboring values or equations.
        {code:"inbody_fat_free_mass",x:.405,y:.174,w:.065,h:.027,psm:"7",modes:["gray","threshold"]},
        // Whole-body water summary is to the RIGHT of the five segmental rows;
        // do not reuse the left-leg water cells as the whole-body values.
        {code:"inbody_ecf_tbf",x:.565,y:.716,w:.060,h:.045,psm:"7",modes:["gray","threshold"]},
        {code:"inbody_ecw_tbw",x:.625,y:.716,w:.060,h:.045,psm:"7",modes:["gray","threshold"]},

        // Segmental result cells.  Lean values can move horizontally with the bar,
        // therefore the row-strip OCR above remains the primary general solution;
        // these small cells are complementary evidence for the common low/normal
        // placement seen in the 600-dpi male calibration sheet.
        {code:"inbody_segment_right_arm_lean_mass",x:.225,y:.539,w:.070,h:.016,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_arm_lean_pct",x:.214,y:.552,w:.064,h:.013,psm:"6",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_arm_fat_mass",x:.405,y:.558,w:.047,h:.016,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_arm_fat_pct",x:.444,y:.558,w:.063,h:.017,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_arm_ecf_tbf",x:.455,y:.545,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_arm_ecw_tbw",x:.515,y:.545,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},

        {code:"inbody_segment_left_arm_lean_mass",x:.215,y:.580,w:.085,h:.019,psm:"7",scale:6.6,modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_arm_lean_pct",x:.208,y:.595,w:.067,h:.013,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_arm_fat_mass",x:.405,y:.600,w:.047,h:.016,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_arm_fat_pct",x:.444,y:.600,w:.063,h:.017,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_arm_ecf_tbf",x:.455,y:.588,w:.060,h:.019,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_arm_ecw_tbw",x:.515,y:.588,w:.060,h:.019,psm:"7",modes:["gray","threshold"],sourceMode:true},

        {code:"inbody_segment_trunk_lean_mass",x:.235,y:.623,w:.075,h:.017,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_trunk_lean_pct",x:.215,y:.637,w:.070,h:.014,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_trunk_fat_mass",x:.398,y:.642,w:.057,h:.017,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_trunk_fat_pct",x:.442,y:.642,w:.068,h:.017,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_trunk_ecf_tbf",x:.455,y:.630,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_trunk_ecw_tbw",x:.515,y:.630,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},

        {code:"inbody_segment_right_leg_lean_mass",x:.220,y:.665,w:.075,h:.019,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_leg_lean_pct",x:.205,y:.680,w:.067,h:.015,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_leg_fat_mass",x:.365,y:.680,w:.060,h:.021,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_leg_fat_pct",x:.410,y:.680,w:.072,h:.021,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_leg_ecf_tbf",x:.455,y:.673,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_right_leg_ecw_tbw",x:.515,y:.673,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},

        {code:"inbody_segment_left_leg_lean_mass",x:.205,y:.707,w:.090,h:.020,psm:"7",scale:6.6,modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_leg_lean_pct",x:.195,y:.720,w:.068,h:.016,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_leg_fat_mass",x:.365,y:.721,w:.060,h:.022,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_leg_fat_pct",x:.410,y:.721,w:.072,h:.022,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_leg_ecf_tbf",x:.455,y:.715,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_segment_left_leg_ecw_tbw",x:.515,y:.715,w:.060,h:.020,psm:"7",modes:["gray","threshold"],sourceMode:true},

        // v10.299 — Additional Data decimals are source-critical.  Dedicated
        // source/gray crops prevent AMC 24.7 from collapsing to 24 and keep the
        // printed decimal visible before any label-text reconciliation.
        {code:"inbody_arm_circumference",x:.425,y:.814,w:.105,h:.022,psm:"7",scale:7.2,modes:["gray","threshold-light"],sourceMode:true},
        {code:"inbody_arm_muscle_circumference",x:.425,y:.833,w:.105,h:.023,psm:"7",scale:7.2,modes:["gray","threshold-light"],sourceMode:true},
        {code:"inbody_history_ecw_tbw",x:.275,y:.774,w:.135,h:.044,psm:"7",scale:8.2,modes:["gray","threshold-light","threshold-mid"],sourceMode:true},
        // Weight-control cells are pale on some 720 printouts. Re-read each physical
        // cell independently so one damaged row cannot shift values into its neighbors.
        {code:"inbody_target_weight",x:.835,y:.758,w:.105,h:.021,psm:"7",modes:["gray","threshold"],sourceMode:true},
        {code:"inbody_weight_control",x:.805,y:.776,w:.145,h:.024,psm:"7",scale:8.2,signed:true,modes:["gray","threshold-light","threshold-mid"],sourceMode:true},
        {code:"inbody_fat_control",x:.805,y:.794,w:.145,h:.024,psm:"7",scale:8.2,signed:true,modes:["gray","threshold-light","threshold-mid"],sourceMode:true},
        {code:"inbody_muscle_control",x:.805,y:.811,w:.145,h:.024,psm:"7",scale:8.2,signed:true,modes:["gray","threshold-light","threshold-mid"],sourceMode:true}
      ];
      for(const cell of microCells){
        const cellModes=[...new Set([...(cell.sourceMode?["source"]:[]),...(cell.modes||["gray"])])];
        for(const mode of cellModes){
          const focus=focusInBodyRegion(base,{name:`field-${cell.code}`,x:cell.x,y:cell.y,w:cell.w,h:cell.h,scale:cell.scale||5.8},mode);
          progress(`OCR InBody ROI · ${cell.code} · ${mode}`,94);
          await worker.setParameters({tessedit_pageseg_mode:cell.psm||"8",preserve_interword_spaces:"1",tessedit_char_whitelist:"0123456789.()%-+"});
          const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
          const words=collectWords(result.data);
          focused.push({mode:`inbody-field-${cell.code}-${mode}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedInBody:true,inbodyRegion:"micro-roi",inbodyField:cell.code,inbodyMicroROI:true,inbodyMicroMode:mode,enhancement:focus.enhancement||null})
        }
      }
      // v10.257 — read printed normal intervals from their own reference-column cells.
      const referenceCells=[
        {code:"inbody_intracellular_water",x:.555,y:.138,w:.130,h:.026,psm:"7"},
        {code:"inbody_extracellular_water",x:.535,y:.159,w:.155,h:.030,psm:"7"},
        {code:"inbody_protein",x:.555,y:.184,w:.130,h:.027,psm:"7"},
        {code:"inbody_minerals",x:.545,y:.208,w:.145,h:.030,psm:"7"},
        {code:"inbody_weight",x:.545,y:.289,w:.145,h:.031,psm:"7"},
        {code:"inbody_skeletal_muscle_mass",x:.535,y:.315,w:.155,h:.035,psm:"6"},
        {code:"inbody_body_fat_mass",x:.545,y:.344,w:.145,h:.031,psm:"7"},
        {code:"inbody_bmi",x:.555,y:.411,w:.130,h:.026,psm:"7"},
        {code:"inbody_percent_body_fat",x:.555,y:.444,w:.130,h:.026,psm:"7"},
        {code:"inbody_waist_hip_ratio",x:.555,y:.475,w:.130,h:.026,psm:"7"}
      ];
      for(const cell of referenceCells){
        for(const mode of ["source","gray","threshold-light","threshold-mid"]){
          const focus=focusInBodyRegion(base,{name:`reference-${cell.code}`,x:cell.x,y:cell.y,w:cell.w,h:cell.h,scale:7.0},mode);
          progress(`OCR InBody Reference · ${cell.code} · ${mode}`,94);
          await worker.setParameters({tessedit_pageseg_mode:cell.psm||"7",preserve_interword_spaces:"1",tessedit_char_whitelist:"0123456789.-~"});
          const result=await worker.recognize(focus.canvas,{}, {text:true,blocks:true,tsv:true});
          const words=collectWords(result.data);
          focused.push({mode:`inbody-reference-${cell.code}-${mode}`,text:normalizeText(result.data.text),confidence:Number(result.data.confidence||0),textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),focusedInBody:true,inbodyRegion:"reference-micro-roi",inbodyReferenceFor:cell.code,inbodyReferenceMode:mode,enhancement:focus.enhancement||null});
        }
      }
      await worker.setParameters({tessedit_char_whitelist:"",tessedit_pageseg_mode:"6",preserve_interword_spaces:"1"});
    }
    if(allergyTable){      for(const mode of ["gray","threshold"]){
        const focus=focusAllergyTable(base,mode);
        progress(`OCR ตารางภูมิแพ้ ${mode==="gray"?"ความละเอียดสูง":"ตัดพื้นหลัง"}`,92);
        await worker.setParameters({
          tessedit_pageseg_mode:"6",
          preserve_interword_spaces:"1"
        });
        const result=await worker.recognize(focus.canvas,{}, {
          text:true,blocks:true,tsv:true
        });
        const words=collectWords(result.data);
        focused.push({
          mode:`allergy-table-${mode}`,
          text:normalizeText(result.data.text),
          confidence:Number(result.data.confidence||0),
          textItems:mappedFocusItems(words,base.height,focus.crop,focus.scale),
          focusedAllergyTable:true
        })
      }
    }
    results.sort((a,b)=>score(b.text,b.confidence)-score(a.text,a.confidence));
    // The Maharat adapter resolves values by physical column and OCR role.
    // Page-wide "number appears in only two of three passes" warnings would
    // duplicate that evidence and create a noisy document-review queue.
    const best=results[0],conflicts=maharatTable?[]:conflictList(results);
    const effectiveProfile=inbodyProfile?"INBODY_720":String(options.profileHint||"");
    const complete=adaptiveOcrComplete(best,effectiveProfile);
    const qualityGate=MIW.ImageEnhancement?.confidenceGate?.({confidence:best.confidence,profileHint:effectiveProfile,complete,conflicts:conflicts.length,qualityScore:prepared.meta?.qualityAfter?.score??prepared.meta?.qualityBefore?.score??100})||{needsVerify:Number(best.confidence||0)<78,reasons:[]};
    // Keep every OCR pass as evidence.  A pass that scores best for the page
    // header is not necessarily the pass that preserves the small table rows.
    const candidates=[...results.map(r=>({
      mode:r.mode,text:r.text,confidence:r.confidence,
      textItems:wordsToItems(r.words,r.canvas.height)
    })),...focused];
    const pageNumber=Number(options.pageNumber||1);
    const sourcePageNumber=Number(options.sourcePageNumber||1);
    const sourceFileName=options.sourceFileName||file.name;
    if(prepared.meta?.nonGenerative){
      MIW.Utils?.log?.(`Non-generative OCR ${sourceFileName} p${sourcePageNumber}: Q ${prepared.meta.qualityBefore?.score??"—"}→${prepared.meta.qualityAfter?.score??"—"} · ${prepared.meta.actions?.join(" → ")||"no-op"} · OCR ${Number(best.confidence||0).toFixed(1)}% · ${qualityGate.needsVerify?"VERIFY":"PASS"}`)
    }
    return{
      page:{id:MIW.Utils.uid("page"),documentId,pageNumber,sourcePageNumber,
        sourceFileName,sourceFileIndex:Number(options.fileIndex||0),
        dataUrl:best.canvas.toDataURL("image/jpeg",fastMode?.78:.9),originalDataUrl:originalUrl,
        width:best.canvas.width,height:best.canvas.height,text:best.text,
        textItems:wordsToItems(best.words,best.canvas.height),captureType:"PHOTO",
        imageCorrection:{rotation:0,perspective:"AUTO_DOCUMENT_BOUNDS",shadowReduction:true,variants:results.map(v=>v.mode),nonGenerative:true,originalPixelsRetained:true,pipeline:prepared.meta?.pipeline||[]},
        ocr:{engine:"Tesseract.js 5",languages,passes:results.length+focused.length,
          focusedPasses:focused.map(pass=>pass.mode),
          selectedPass:best.mode,confidence:best.confidence,detectedProfile:effectiveProfile||"",
          enhancement:prepared.meta||null,qualityGate,
          conflicts,candidates,wordEvidenceCount:candidates.reduce((n,r)=>n+r.textItems.length,0)}},
      text:best.text,confidence:best.confidence,conflicts
    }
  }
  return{isPhoto,process}
})();
