window.MIW=window.MIW||{};
MIW.Router=(function(){
 function show(name){
   document.querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===`${name}View`));
   document.querySelectorAll("[data-view]").forEach(step=>step.classList.toggle("active",step.dataset.view===name));
   if(name==="patients")MIW.Patients.load()
 }
 return{show}
})();
