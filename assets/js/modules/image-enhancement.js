window.MIW=window.MIW||{};
MIW.ImageEnhancement=(function(){
  const clamp=v=>Math.max(0,Math.min(255,v));
  function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
  function copy(source,filter='none'){
    const c=makeCanvas(source.width,source.height),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.filter=filter;ctx.drawImage(source,0,0);ctx.filter='none';return c
  }
  function scaled(source,maxSide){
    const factor=Math.min(1,Number(maxSide||640)/Math.max(1,source.width,source.height));
    if(factor>=.999)return copy(source);
    const c=makeCanvas(source.width*factor,source.height*factor),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,c.width,c.height);return c
  }
  function detectQuality(source){
    const sample=scaled(source,640),ctx=sample.getContext('2d',{willReadFrequently:true});
    const data=ctx.getImageData(0,0,sample.width,sample.height).data;
    const gray=new Float32Array(sample.width*sample.height);let sum=0,sum2=0,dark=0,bright=0;
    for(let i=0,j=0;i<data.length;i+=4,j++){
      const v=.299*data[i]+.587*data[i+1]+.114*data[i+2];gray[j]=v;sum+=v;sum2+=v*v;if(v<90)dark++;if(v>235)bright++
    }
    const n=Math.max(1,gray.length),mean=sum/n,std=Math.sqrt(Math.max(0,sum2/n-mean*mean));
    let lap=0,edgeCount=0;
    for(let y=1;y<sample.height-1;y+=2){
      for(let x=1;x<sample.width-1;x+=2){
        const i=y*sample.width+x,c=gray[i];
        const l=Math.abs(4*c-gray[i-1]-gray[i+1]-gray[i-sample.width]-gray[i+sample.width]);
        lap+=l;edgeCount++
      }
    }
    const sharpness=lap/Math.max(1,edgeCount);
    const maxSide=Math.max(source.width,source.height),minSide=Math.min(source.width,source.height);
    const lowContrast=std<48,soft=sharpness<34,small=maxSide<2300,verySmall=maxSide<1500;
    const backgroundHeavy=bright/n>.58;
    const score=Math.round(Math.max(0,Math.min(100,
      100-(lowContrast?18:0)-(soft?24:0)-(small?12:0)-(verySmall?14:0)-(std<34?12:0)+(backgroundHeavy?3:0)
    )));
    return{width:source.width,height:source.height,maxSide,minSide,mean:Number(mean.toFixed(1)),contrastStd:Number(std.toFixed(1)),sharpness:Number(sharpness.toFixed(1)),darkFraction:Number((dark/n).toFixed(4)),brightFraction:Number((bright/n).toFixed(4)),lowContrast,soft,small,verySmall,score}
  }
  function decidePlan(metrics={},options={}){
    const profile=String(options.profileHint||'').toUpperCase();
    const dense=profile==='INBODY_720'||Boolean(options.denseDocument)||Boolean(options.highDetailScan);
    const targetMax=dense?3200:metrics.verySmall?3000:metrics.small?2800:2600;
    const scale=Math.min(2.25,Math.max(1,targetMax/Math.max(1,metrics.maxSide||1)));
    return{
      denoise:true,
      localContrast:true,
      sharpen:true,
      upscale:scale>1.04,
      scale:Number(scale.toFixed(3)),
      targetMax,
      localAmount:metrics.lowContrast?.34:.24,
      sharpenAmount:metrics.soft?.72:.52,
      denoiseRadius:metrics.sharpness>72?.34:.22
    }
  }
  function blendHighPass(source,blurRadius,amount){
    if(!amount)return copy(source);
    const blur=copy(source,`blur(${Math.max(.1,blurRadius)}px)`),out=copy(source);
    const a=out.getContext('2d',{willReadFrequently:true}),b=blur.getContext('2d',{willReadFrequently:true});
    const od=a.getImageData(0,0,out.width,out.height),bd=b.getImageData(0,0,blur.width,blur.height),x=od.data,y=bd.data;
    for(let i=0;i<x.length;i+=4){
      x[i]=clamp(x[i]+amount*(x[i]-y[i]));
      x[i+1]=clamp(x[i+1]+amount*(x[i+1]-y[i+1]));
      x[i+2]=clamp(x[i+2]+amount*(x[i+2]-y[i+2]));
    }
    a.putImageData(od,0,0);return out
  }
  function upscale(source,scale){
    if(scale<=1.04)return copy(source);
    const c=makeCanvas(source.width*scale,source.height*scale),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,c.width,c.height);return c
  }
  function prepare(source,options={}){
    const before=detectQuality(source),plan=decidePlan(before,options),actions=[];
    // Never mutate source. Every stage writes to a fresh canvas; the original
    // data URL remains stored separately by PhotoCapture for source audit.
    let work=copy(source);
    if(plan.denoise){work=copy(work,`blur(${plan.denoiseRadius}px)`);actions.push(`Denoise ${plan.denoiseRadius}px`)}
    if(plan.localContrast){work=blendHighPass(work,6,plan.localAmount);actions.push(`Local contrast ${plan.localAmount}`)}
    if(plan.sharpen){work=blendHighPass(work,.9,plan.sharpenAmount);actions.push(`Sharpen ${plan.sharpenAmount}`)}
    if(plan.upscale){work=upscale(work,plan.scale);actions.push(`Upscale ${plan.scale}x`)}
    const after=detectQuality(work);
    return{canvas:work,meta:{nonGenerative:true,originalRetained:true,pipeline:['Detect quality','Denoise','Local contrast','Sharpen','Upscale','OCR','Confidence check','Verify if needed'],actions,qualityBefore:before,qualityAfter:after,plan}}
  }
  function confidenceGate({confidence=0,profileHint='',complete=true,conflicts=0,qualityScore=100}={}){
    const profile=String(profileHint||'').toUpperCase();
    const threshold=profile==='INBODY_720'?74:76;
    const needsVerify=Number(confidence)<threshold||!complete||Number(conflicts)>0||Number(qualityScore)<48;
    const reasons=[];
    if(Number(confidence)<threshold)reasons.push(`OCR confidence ${Number(confidence).toFixed(1)} < ${threshold}`);
    if(!complete)reasons.push('profile completeness not confirmed');
    if(Number(conflicts)>0)reasons.push(`${conflicts} OCR conflict(s)`);
    if(Number(qualityScore)<48)reasons.push(`image quality score ${qualityScore}`);
    return{threshold,needsVerify,reasons}
  }
  return{detectQuality,decidePlan,prepare,confidenceGate,_test:{decidePlan,confidenceGate}}
})();
