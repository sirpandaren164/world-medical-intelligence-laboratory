window.MIW=window.MIW||{};
MIW.CategoryGuidance=(function(){
 const VERSION="10.270";
 const text=v=>v===0?"0":String(v??"").trim();
 const num=v=>{if(v===null||v===undefined||v==="")return null;const n=Number(String(v).replace(/[,<>≤≥]/g,""));return Number.isFinite(n)?n:null};
 const cleanGroup=v=>text(v).toLowerCase().replace(/[_/]+/g," ").replace(/\s+/g," ").trim();
 const statusRank={critical:-1,abnormal:0,followup:1,context:2,normal:3};
 const normaliseStatus=v=>["abnormal","followup","context","normal"].includes(v)?v:"context";
 const contains=(v,re)=>re.test(text(v));
 function groupType(group,label=""){
  const key=cleanGroup(`${group} ${label}`);
  if(/coag|แข็งตัว|thrombo|prothrombin|inr|fibrin/.test(key))return"coagulation";
  if(/hemat|blood count|cbc|โลหิต/.test(key))return"hematology";
  if(/kidney|renal|ไต/.test(key))return"renal";
  if(/liver|hepatic|ตับ/.test(key))return"liver";
  if(/lipid|cholesterol|ไขมัน/.test(key))return"lipid";
  if(/urinal|urine|ปัสสาวะ/.test(key))return"urinalysis";
  if(/tumor marker|tumour marker|สารบ่งชี้มะเร็ง/.test(key))return"tumor-marker";
  if(/hormone|thyroid|ฮอร์โมน/.test(key))return"hormone";
  if(/vitamin|mineral|วิตามิน|แร่ธาตุ/.test(key))return"vitamin-mineral";
  if(/autoimmune|autoantibody|ana|dsdna|ena/.test(key))return"autoimmune";
  if(/toxicolog|heavy metal|arsenic|cadmium|mercury|lead/.test(key))return"toxicology";
  if(/micronutrient|nutritional status|antioxidant profile/.test(key))return"micronutrient";
  if(/molecular|pcr|pathogen/.test(key))return"molecular";
  if(/immun|serology|ภูมิคุ้ม/.test(key))return"immunology";
  if(/allergy|specific ige|ภูมิแพ้/.test(key))return"allergy";
  if(/food.*igg|food-specific/.test(key))return"food-igg";
  if(/body composition|inbody|องค์ประกอบร่างกาย/.test(key))return"body-composition";
  if(/chemistry|glucose|electroly|เคมีคลินิก/.test(key))return"chemistry";
  if(/hemoglobin typing|ฮีโมโกลบิน/.test(key))return"hemoglobin-typing";
  return"general";
 }
 function itemCritical(item){
  const hay=[item?.flag,item?.calculatedFlag,item?.comment,item?.resultComment,item?.sourceLine,item?.criticalText,item?.reportedResult].map(text).join(" ");
  return item?.critical===true||/\b(?:HH|LL|CRITICAL)\b/i.test(hay)||/critical\s+value/i.test(hay)
 }
 function trendOf(item){
  const series=Array.isArray(item?.series)?item.series:[];
  const numeric=series.map(point=>({value:num(point?.value),unit:text(point?.unit),date:text(point?.date)})).filter(point=>point.value!==null);
  if(numeric.length<2)return null;
  const a=numeric.at(-2),b=numeric.at(-1);
  if(a.unit&&b.unit&&a.unit!==b.unit)return null;
  const span=Math.max(Math.abs(a.value),Math.abs(b.value),1),delta=b.value-a.value;
  if(Math.abs(delta)<=span*0.01)return{direction:"stable",delta};
  return{direction:delta>0?"up":"down",delta}
 }
 function displayFinding(item,lang="th"){
  const value=[text(item?.value),text(item?.unit)].filter(Boolean).join(" ")||"—";
  const ref=text(item?.reference);
  const trend=trendOf(item);
  const trendText=trend?(lang==="en"?(trend.direction==="up"?"increasing":trend.direction==="down"?"decreasing":"stable"):(trend.direction==="up"?"แนวโน้มเพิ่มขึ้น":trend.direction==="down"?"แนวโน้มลดลง":"ค่อนข้างคงที่")):"";
  if(lang==="en")return `${text(item?.name)||"Unnamed test"}: ${value}${ref?` (reported reference ${ref})`:""}${trendText?` · ${trendText}`:""}`;
  return `${text(item?.name)||"ไม่ระบุรายการ"}: ${value}${ref?` (อ้างอิง ${ref})`:""}${trendText?` · ${trendText}`:""}`
 }
 function overviewText(type,counts,criticalCount,lang){
  const abnormal=counts.abnormal||0,followup=counts.followup||0,context=counts.context||0,normal=counts.normal||0,total=abnormal+followup+context+normal;
  const lead=criticalCount? (lang==="en"?`The source report marks ${criticalCount} result(s) as critical.`:`ต้นฉบับระบุผลระดับ Critical ${criticalCount} รายการ`)
   :abnormal? (lang==="en"?`${abnormal} latest result(s) are outside the reported range on the high/abnormal side.`:`มีผลล่าสุดสูง/ผิดปกติ ${abnormal} รายการ`)
   :followup? (lang==="en"?`${followup} latest result(s) are low or need follow-up.`:`มีผลล่าสุดต่ำ/ควรติดตาม ${followup} รายการ`)
   :context? (lang==="en"?`${context} result(s) need clinical context before interpretation.`:`มี ${context} รายการที่ยังต้องอาศัยบริบทก่อนสรุป`)
   :(lang==="en"?`All ${total} latest result(s) are within their reported reference range.`:`ผลล่าสุดทั้ง ${total} รายการอยู่ในช่วงอ้างอิงที่รายงาน`);
  const suffix={
   hematology:["CBC ควรอ่าน Hb/Hct/RBC indices เม็ดเลือดขาวและเกล็ดเลือดร่วมกัน ไม่สรุปจากค่าเดียว","CBC is best interpreted by reviewing hemoglobin/hematocrit, red-cell indices, white-cell differential and platelets together."],
   coagulation:["ควรอ่าน PT/INR, APTT, fibrin-related markers และเกล็ดเลือดร่วมกัน พร้อมดูยาที่มีผลต่อการแข็งตัวของเลือด","Interpret PT/INR, APTT, fibrin-related markers and platelets together, including medicines that affect coagulation."],
   renal:["ควรดู creatinine/eGFR, BUN และเกลือแร่เป็นชุดและเทียบแนวโน้มด้วยวิธีตรวจเดิมเมื่อทำได้","Review creatinine/eGFR, BUN and electrolytes together and compare trends using the same method when possible."],
   liver:["ควรดู AST/ALT, ALP, bilirubin, albumin และบริบทของยา/โรคอื่นร่วมกัน ไม่ใช้ค่าเดียวแทนสมรรถภาพตับทั้งหมด","Interpret AST/ALT, ALP, bilirubin and albumin together with medicines and other conditions rather than using one value as total liver function."],
   lipid:["ควรดู LDL, HDL, triglyceride และความเสี่ยงหัวใจและหลอดเลือดโดยรวมร่วมกัน","Interpret LDL, HDL and triglycerides together with overall cardiovascular risk."],
   urinalysis:["ควรอ่าน dipstick, microscopy, อาการทางเดินปัสสาวะ และ culture ร่วมกันเมื่อมี","Interpret dipstick, microscopy, urinary symptoms and culture together when available."],
   "tumor-marker":["สารบ่งชี้มะเร็งเหมาะกับการติดตามแนวโน้มในบริบทของโรค ไม่ใช้ตัวเลขเดียววินิจฉัยหรือสรุปการตอบสนอง","Tumor markers are mainly trend/context markers and should not be used alone to diagnose disease or declare treatment response."],
   hormone:["ฮอร์โมนต้องอ่านตามเพศ อายุ เวลาเก็บตัวอย่าง ยา และภาวะทางคลินิก","Hormone results depend on sex, age, collection time, medicines and clinical context."],
   "vitamin-mineral":["ควรยืนยันภาวะขาด/เกินและดูหน่วยกับช่วงอ้างอิงก่อนใช้อาหารเสริมขนาดสูง","Confirm deficiency/excess and verify units/reference ranges before using high-dose supplements."],
   immunology:["ผลภูมิคุ้มกันและ serology ต้องอ่านตามชนิดการตรวจ เวลาเก็บตัวอย่าง และบริบทของการติดเชื้อ/ภูมิคุ้มกัน","Immunology and serology results require test-specific timing and clinical context."],
   allergy:["ผลภูมิแพ้ควรสัมพันธ์กับประวัติอาการและการสัมผัสจริง ไม่ใช้ค่าตรวจเพียงอย่างเดียวกำหนดการหลีกเลี่ยงทั้งหมด","Allergy tests should be correlated with real-world symptoms and exposure rather than used alone to define all avoidance."],
   "food-igg":["ควรเชื่อมผลกับอาการและโภชนาการ และหลีกเลี่ยงการตัดอาหารหลายกลุ่มโดยไม่มีแผนทดแทนสารอาหาร","Relate results to symptoms and nutrition, and avoid broad elimination without a plan to replace nutrients."],
   "body-composition":["ควรอ่านน้ำหนัก มวลกล้ามเนื้อลาย มวลไขมัน BMI ร้อยละไขมัน WHR, Visceral Fat Area และสมดุลน้ำร่วมกัน พร้อมเทียบการตรวจครั้งต่อไปภายใต้เงื่อนไขใกล้เคียงเดิม","Interpret weight, skeletal muscle mass, fat mass, BMI, percent body fat, WHR, visceral fat area and fluid balance together and compare serial studies under similar conditions."],
   chemistry:["ควรอ่านน้ำตาล เกลือแร่ กรด-ด่าง และ chemistry อื่นตามภาวะอดอาหาร น้ำในร่างกาย ยา และโรคประจำตัว","Interpret glucose, electrolytes and other chemistry in the context of fasting, hydration, medicines and chronic conditions."],
   "hemoglobin-typing":["การแปลผลชนิดฮีโมโกลบินควรดูร่วมกับ CBC, MCV/MCH และประวัติครอบครัว/การตรวจยืนยันตามข้อบ่งชี้","Hemoglobin typing should be interpreted with CBC/indices, family history and confirmatory testing when indicated."],
   general:["ควรดูผลเป็นชุดตามหมวดและยึดช่วงอ้างอิงของต้นฉบับ ไม่สรุปโรคจากค่าเดียว","Review results as a category using source-report reference ranges rather than diagnosing from a single value."]
  }[type];
  return `${lead}${suffix?` · ${lang==="en"?suffix[1]:suffix[0]}`:""}`
 }
 function categoryHealth(type,lang){
  const th={
   hematology:["รับประทานอาหารให้เพียงพอและหลากหลาย โดยมีแหล่งโปรตีน ธาตุเหล็ก วิตามิน B12 และโฟเลตตามความเหมาะสม","ไม่ควรเริ่มธาตุเหล็ก/B12/โฟเลตขนาดสูงจาก CBC เพียงอย่างเดียว ควรยืนยันสาเหตุก่อน","ปรับกิจกรรมตามอาการและแผนการรักษา โดยเฉพาะเมื่อมีอ่อนเพลีย ซีด หรือเกล็ดเลือดต่ำ"],
   coagulation:["ทบทวนยาประจำ ยาแก้ปวด OTC และอาหารเสริมที่อาจเพิ่มความเสี่ยงเลือดออกกับแพทย์/เภสัชกร และไม่หยุดยาที่สั่งเอง","หลีกเลี่ยงกิจกรรมเสี่ยงต่อการบาดเจ็บเมื่อมีเกล็ดเลือดต่ำหรือผลการแข็งตัวผิดปกติจนกว่าจะได้รับคำแนะนำเฉพาะ","หากมีเลือดออกมากหรืออาการเฉียบพลันรุนแรง ควรรับการประเมินฉุกเฉิน"],
   renal:["ดื่มน้ำให้เหมาะสมหากทีมรักษาไม่ได้จำกัดน้ำ และหลีกเลี่ยงภาวะขาดน้ำ","ทบทวนการใช้ NSAIDs/ยา OTC และอาหารเสริมกับแพทย์หรือเภสัชกร โดยเฉพาะเมื่อการทำงานของไตผิดปกติ","ควบคุมความดันและน้ำตาลตามแผนรักษา และติดตาม creatinine/eGFR ตามนัด"],
   liver:["หลีกเลี่ยงหรือจำกัดแอลกอฮอล์ และทบทวนยา สมุนไพร และอาหารเสริมทั้งหมดกับทีมรักษา","เลือกรูปแบบอาหารสมดุล เน้นผัก ผลไม้ ธัญพืชไม่ขัดสี และโปรตีนที่เหมาะสมตามภาวะโภชนาการ","หากมีน้ำหนักเกิน การลดน้ำหนักแบบค่อยเป็นค่อยไปและกิจกรรมที่ปลอดภัยอาจเป็นประโยชน์ แต่ควรปรับตามโรคและการรักษา"],
   lipid:["เน้นผัก ผลไม้ ธัญพืชไม่ขัดสี ถั่ว โปรตีนไขมันต่ำ และไขมันไม่อิ่มตัว พร้อมลดอาหารแปรรูป ไขมันอิ่มตัว น้ำตาลเติม และโซเดียม","มีกิจกรรมทางกายสม่ำเสมอตามความสามารถและความปลอดภัย; ผู้มีโรคเรื้อรังควรปรึกษาทีมรักษาก่อนเพิ่มความหนัก","หลีกเลี่ยงยาสูบและติดตามความดัน น้ำตาล ไขมัน และน้ำหนักร่วมกัน"],
   urinalysis:["ดื่มน้ำให้เหมาะสมหากไม่ได้ถูกจำกัดน้ำ","หากมีปัสสาวะแสบขัด ไข้ ปวดสีข้าง ปัสสาวะเป็นเลือด หรืออาการใหม่ ควรแจ้งทีมรักษา","ผลปัสสาวะผิดปกติบางอย่างควรยืนยันด้วยตัวอย่างที่เก็บถูกวิธีและ culture ตามข้อบ่งชี้"],
   "tumor-marker":["ไม่ควรพยายามลดตัวเลข tumor marker ด้วยอาหารเสริมหรือการเปลี่ยนการรักษาเอง","ติดตาม marker ด้วยวิธีเดียวกันเมื่อทำได้ และดูร่วมกับอาการ ภาพถ่ายรังสี พยาธิวิทยา และแผนของทีมมะเร็ง","รักษาโภชนาการ การนอน การเคลื่อนไหว และการควบคุมอาการตามแผนรักษาโดยไม่ใช้ marker ตัวเดียวกำหนดพฤติกรรม"],
   hormone:["ไม่เริ่ม/หยุดฮอร์โมนหรืออาหารเสริมที่มีผลต่อฮอร์โมนจากผลตรวจครั้งเดียว","บันทึกเวลาเก็บตัวอย่าง ยา และอาการเพื่อช่วยแปลผลครั้งถัดไป","ติดตามตามแผนของแพทย์ โดยใช้ช่วงอ้างอิงที่เหมาะกับเพศ อายุ และบริบท"],
   "vitamin-mineral":["เน้นอาหารหลากหลายและใช้ food-first approach เมื่อทำได้","ไม่ใช้ megadose หรือเพิ่มหลายผลิตภัณฑ์พร้อมกันโดยไม่มีหลักฐานภาวะขาดและการทบทวนปฏิกิริยากับยา","ตรวจซ้ำตามแผนเมื่อมีการเสริม เพื่อหลีกเลี่ยงทั้งภาวะขาดและเกิน"],
   immunology:["หลีกเลี่ยงการใช้คำว่า “เพิ่มภูมิ” จากผลตัวเดียว; ให้ยึดชนิดการตรวจและบริบทของผู้ป่วย","ทบทวนวัคซีน ยากด/กระตุ้นภูมิ และการติดเชื้อกับทีมรักษาตามข้อบ่งชี้","หากเป็น serology ให้คำนึงถึงช่วงเวลาหลังสัมผัส/วัคซีนและการตรวจยืนยันตามวิธีนั้น"],
   allergy:["เชื่อมผลตรวจกับอาการจริงและประวัติการสัมผัส","หลีกเลี่ยงสารที่เคยทำให้เกิดอาการรุนแรงตามแผนแพทย์ และควรมีแผนฉุกเฉินหากเคยมี anaphylaxis","ไม่ตัดอาหารหรือสิ่งแวดล้อมหลายรายการจากค่าตรวจเพียงอย่างเดียวโดยไม่มี clinical correlation"],
   "food-igg":["ใช้บันทึกอาหาร-อาการเพื่อหาความสัมพันธ์ที่สม่ำเสมอ","หากต้องทดลองงดอาหาร ควรจำกัดระยะเวลาและมีแผน re-challenge/ทดแทนสารอาหารกับผู้เชี่ยวชาญ","หลีกเลี่ยงการตัดอาหารหลายกลุ่มพร้อมกันโดยไม่มีการประเมินโภชนาการ"],
   "body-composition":["ใช้แนวโน้ม InBody มากกว่าค่าครั้งเดียว และตรวจซ้ำภายใต้ภาวะน้ำ อาหาร และกิจกรรมใกล้เคียงกันเมื่อทำได้","เมื่อเครื่องแนะนำการปรับน้ำหนัก ให้ดู Fat Control และ Muscle Control ร่วมกัน ไม่สรุปว่าเป้าหมายคือการลดกล้ามเนื้อ","ค่าบวมน้ำและองค์ประกอบร่างกายจาก BIA เป็นข้อมูลประกอบ ควรเชื่อมกับอาการ การตรวจร่างกาย และบริบททางคลินิก"],
   chemistry:["รับประทานอาหารสมดุล ลดเครื่องดื่มหวาน/น้ำตาลเติม และมีกิจกรรมตามความสามารถเมื่อปลอดภัย","ไม่ปรับเกลือแร่หรือใช้ sodium/potassium supplement เองจากค่าครั้งเดียว","ดูภาวะอดอาหาร น้ำในร่างกาย ยา และความเจ็บป่วยเฉียบพลันก่อนสรุปค่า glucose/electrolytes"],
   "hemoglobin-typing":["ไม่ใช้ผล typing เพียงอย่างเดียวสรุปพาหะหรือชนิดโรคที่ไม่สามารถตรวจพบด้วยวิธีนั้น","หากมี MCV/MCH ต่ำหรือประวัติครอบครัว ควรหารือเรื่องการตรวจยืนยันตามข้อบ่งชี้","การวางแผนครอบครัวควรใช้ผลยืนยันของทั้งคู่เมื่อมีความเสี่ยงโรคฮีโมโกลบินทางพันธุกรรม"],
   general:["รับประทานอาหารสมดุล นอนให้เพียงพอ ไม่สูบบุหรี่ และมีกิจกรรมทางกายตามความสามารถและข้อจำกัดทางการแพทย์","ทบทวนยา OTC สมุนไพร และอาหารเสริมกับทีมรักษาเมื่อผลแล็บเปลี่ยน","ติดตามผลซ้ำตามแผนและพยายามใช้ห้องปฏิบัติการ/วิธีตรวจเดิมเมื่อเปรียบเทียบแนวโน้ม"]
  };
  const en={
   hematology:["Maintain adequate, varied nutrition with appropriate protein, iron, vitamin B12 and folate sources.","Do not start high-dose iron/B12/folate from CBC results alone; confirm the cause first.","Adjust activity to symptoms and the care plan, especially with fatigue, anemia or low platelets."],
   coagulation:["Review prescription drugs, OTC pain medicines and supplements that may affect bleeding with the care team; do not stop prescribed treatment on your own.","Reduce injury risk when platelets are low or coagulation is abnormal until individualized advice is available.","Seek emergency assessment for major bleeding or other severe acute symptoms."],
   renal:["Maintain appropriate hydration unless your care team has prescribed fluid restriction.","Review NSAIDs, OTC medicines and supplements with a clinician or pharmacist when kidney function is abnormal.","Manage blood pressure and glucose as prescribed and follow creatinine/eGFR trends."],
   liver:["Avoid or minimize alcohol and review all medicines, herbs and supplements with the care team.","Use a balanced eating pattern with vegetables, fruit, whole grains and protein appropriate to nutritional needs.","If overweight, gradual weight management and safe physical activity may help, individualized to disease and treatment."],
   lipid:["Emphasize vegetables, fruit, whole grains, legumes, lean proteins and unsaturated fats while limiting ultraprocessed foods, saturated fat, added sugars and sodium.","Use regular physical activity as safely tolerated; people with chronic conditions should individualize activity with their care team.","Avoid tobacco and manage blood pressure, glucose, lipids and weight together."],
   urinalysis:["Maintain appropriate hydration unless fluid-restricted.","Report dysuria, fever, flank pain, visible blood or new urinary symptoms.","Some urine abnormalities need confirmation with a properly collected sample and culture when indicated."],
   "tumor-marker":["Do not try to lower a tumor-marker number by changing supplements or treatment on your own.","Follow trends using the same method when possible and interpret with symptoms, imaging, pathology and the oncology plan.","Support nutrition, sleep, mobility and symptom control without using one marker alone to drive behavior."],
   hormone:["Do not start or stop hormones or hormone-active supplements from a single result.","Record collection time, medicines and symptoms for future interpretation.","Use reference ranges appropriate to sex, age and clinical context."],
   "vitamin-mineral":["Use a varied, food-first approach when possible.","Avoid megadoses or multiple new supplements without confirmed need and interaction review.","Recheck levels according to the care plan when supplementing."],
   immunology:["Do not interpret one immune result as a generic measure of 'boosted immunity'; use test-specific context.","Review vaccination, immune-active medicines and infection history when relevant.","For serology, consider timing after exposure/vaccination and confirmatory testing for that method."],
   allergy:["Correlate testing with actual symptoms and exposure history.","Avoid triggers that previously caused severe reactions according to the clinician's plan and maintain an emergency plan if there is a history of anaphylaxis.","Do not broadly eliminate foods or exposures from test values alone without clinical correlation."],
   "food-igg":["Use a food-and-symptom record to look for reproducible relationships.","If an elimination trial is used, keep it time-limited with a re-challenge/nutrient-replacement plan supervised by an appropriate professional.","Avoid eliminating many food groups at once without nutritional assessment."],
   "body-composition":["Use serial InBody trends rather than a single measurement and repeat under similar hydration, food and activity conditions when practical.","When the device proposes weight change, review Fat Control and Muscle Control together rather than assuming muscle should be lost.","BIA fluid and body-composition values are supportive data and should be correlated with symptoms, examination and clinical context."],
   chemistry:["Use a balanced eating pattern, reduce sugar-sweetened drinks/added sugars, and be active as safely tolerated.","Do not self-correct sodium or potassium with supplements from one value alone.","Consider fasting state, hydration, medicines and acute illness when interpreting glucose/electrolytes."],
   "hemoglobin-typing":["Do not use typing alone to exclude carrier states or disorders not detectable by that method.","If MCV/MCH are low or family history is relevant, discuss confirmatory testing when indicated.","For reproductive planning, use confirmed results for both partners when inherited hemoglobin disease is a concern."],
   general:["Use balanced nutrition, adequate sleep, tobacco avoidance and physical activity appropriate to medical limitations.","Review OTC medicines, herbs and supplements with the care team when laboratory results change.","Repeat testing as planned and use the same laboratory/method when trend comparison matters."]
  };
  return (lang==="en"?en:th)[type]||(lang==="en"?en.general:th.general)
 }
 function actions(level,lang){
  const mapTh={
   critical:["ผลอย่างน้อยหนึ่งรายการมี Critical/HH/LL จากต้นฉบับ ควรแจ้งทีมรักษาและให้แพทย์ทบทวนโดยเร็วตามระบบของสถานพยาบาล","ตรวจความสอดคล้องกับอาการ ยา การรักษา และผลที่สัมพันธ์กันก่อนตัดสินใจ","หากมีอาการเฉียบพลันรุนแรง ให้รับการประเมินฉุกเฉิน"],
   review:["ให้แพทย์ทบทวนค่าที่อยู่นอกช่วงอ้างอิงร่วมกับอาการ โรคประจำตัว ยา และการรักษา","พิจารณาตรวจซ้ำตามความเหมาะสม โดยใช้วิธีตรวจ/ห้องปฏิบัติการเดิมเมื่อการเทียบแนวโน้มสำคัญ","ไม่เริ่มยา หยุดยา หรือใช้ megadose supplement จากผลหมวดนี้โดยลำพัง"],
   followup:["ติดตามผลตามนัดและดูแนวโน้มมากกว่าค่าครั้งเดียว","ทบทวนปัจจัยชั่วคราว เช่น การอดอาหาร น้ำในร่างกาย ยา การติดเชื้อ หรือการรักษา","หากมีอาการใหม่หรือผลลดลง/ผิดปกติต่อเนื่อง ให้หารือทีมรักษาเร็วขึ้น"],
   context:["ยืนยันชื่อรายการ วิธีตรวจ หน่วย และช่วงอ้างอิงจากต้นฉบับก่อนสรุป","เชื่อมผลกับอาการและผลตรวจที่เกี่ยวข้อง","หากข้อมูลยังไม่ครบ ให้ระบุว่า 'ยังไม่เพียงพอสำหรับคำแนะนำเฉพาะ' แทนการเดา"],
   stable:["ติดตามตามรอบที่ทีมรักษากำหนด","รักษาพฤติกรรมสุขภาพที่เหมาะสมกับโรคประจำตัวและการรักษา","หากผลเปลี่ยนจาก baseline หรือมีอาการใหม่ ให้ประเมินใหม่แม้ค่าปัจจุบันอยู่ในช่วงอ้างอิง"]
  };
  const mapEn={
   critical:["At least one source result is marked Critical/HH/LL; alert the care team and obtain prompt clinical review according to local workflow.","Check symptoms, medicines, treatment and related laboratory results before decisions.","Seek emergency assessment for severe acute symptoms."],
   review:["Review out-of-range results with a clinician together with symptoms, chronic conditions, medicines and treatment.","Repeat testing when appropriate, using the same method/laboratory when trend comparison matters.","Do not start/stop medicines or use megadose supplements from this category alone."],
   followup:["Follow results over time rather than relying on one value.","Review temporary factors such as fasting, hydration, medicines, infection or treatment.","Seek earlier review if symptoms develop or abnormalities persist/worsen."],
   context:["Confirm the test name, method, unit and source-report reference range before interpretation.","Relate the result to symptoms and connected laboratory findings.","When data remain incomplete, state that there is insufficient information for specific guidance rather than guessing."],
   stable:["Continue follow-up at the interval set by the care team.","Maintain health behaviors appropriate to chronic conditions and treatment.","Reassess if results change from baseline or new symptoms occur even when the current value is within range."]
  };
  return (lang==="en"?mapEn:mapTh)[level]
 }
 function levelFor(items){
  const criticalCount=(items||[]).filter(itemCritical).length;
  if(criticalCount)return{level:"critical",criticalCount};
  const statuses=(items||[]).map(item=>normaliseStatus(item?.status));
  if(statuses.includes("abnormal"))return{level:"review",criticalCount:0};
  if(statuses.includes("followup"))return{level:"followup",criticalCount:0};
  if(statuses.includes("context"))return{level:"context",criticalCount:0};
  return{level:"stable",criticalCount:0}
 }
 function levelMeta(level,lang){
  const th={critical:["Critical / ควรประเมินโดยเร็ว","critical"],review:["ควรพบแพทย์และทบทวน","review"],followup:["ควรติดตาม","followup"],context:["ต้องมีบริบทเพิ่มเติม","context"],stable:["คงที่ / อยู่ในช่วงอ้างอิง","stable"]};
  const en={critical:["Critical / prompt review","critical"],review:["Clinical review recommended","review"],followup:["Follow-up recommended","followup"],context:["More context needed","context"],stable:["Stable / within reported range","stable"]};
  const pair=(lang==="en"?en:th)[level]|| (lang==="en"?en.context:th.context);
  return{label:pair[0],tone:pair[1]}
 }
 function summarize(group,items=[],options={}){
  const lang=options.language==="en"?"en":"th",label=text(options.label)||text(group)||"Other";
  const safe=(items||[]).map(item=>({...item,status:normaliseStatus(item?.status)}));
  const counts={abnormal:0,followup:0,context:0,normal:0};safe.forEach(item=>counts[item.status]++);
  const {level,criticalCount}=levelFor(safe),meta=levelMeta(level,lang),type=groupType(group,label);
  const ordered=[...safe].sort((a,b)=>{
   const ca=itemCritical(a)?-1:statusRank[a.status]??9,cb=itemCritical(b)?-1:statusRank[b.status]??9;
   if(ca!==cb)return ca-cb;return text(a.name).localeCompare(text(b.name))
  });
  const findings=ordered.slice(0,3).map(item=>displayFinding(item,lang));
  const health=categoryHealth(type,lang).slice(0,3),next=actions(level,lang).slice(0,3);
  return{version:VERSION,type,level,tone:meta.tone,label:meta.label,counts,criticalCount,headline:overviewText(type,counts,criticalCount,lang),findings,health,next,evidenceNote:lang==="en"?"Generated only from VERIFIED latest results, source-report flags/reference ranges and available trends. This is general health guidance, not a diagnosis or treatment order.":"สร้างจากผลล่าสุดที่ VERIFIED, flag/ช่วงอ้างอิงในต้นฉบับ และแนวโน้มที่มีอยู่เท่านั้น เป็นคำแนะนำสุขภาพทั่วไป ไม่ใช่การวินิจฉัยหรือคำสั่งการรักษา"}
 }
 return{version:VERSION,summarize,__test:{groupType,itemCritical,trendOf,levelFor,categoryHealth,actions}}
})();
