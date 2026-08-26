window.MIW=window.MIW||{};
MIW.Events=(function(){
 const listeners=new Map();
 function on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}
 function emit(name,payload){(listeners.get(name)||[]).forEach(fn=>{try{fn(payload)}catch(e){MIW.Utils.log(`Event ${name} failed: ${e.message}`)}})}
 return{on,emit}
})();
