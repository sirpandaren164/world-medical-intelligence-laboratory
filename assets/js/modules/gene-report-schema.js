window.MIW=window.MIW||{};
MIW.GeneReportSchema=(function(){
  "use strict";

  const NO_REPORT_FUNCTION="ไม่มีคอลัมน์ Function ในหน้ากราฟ Resistance Factors";
  const NO_REPORT_RELATED="ไม่มีคอลัมน์ Related ในหน้ากราฟ Resistance Factors";
  const NO_REPORT_RISK="ไม่ได้รายงาน Clinical Risk ในหน้ากราฟ Resistance Factors";
  const NO_REPORT_OUTCOME="ไม่ได้รายงาน Outcome ในหน้ากราฟ Resistance Factors";

  function normalize(value){
    return String(value||"")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"");
  }

  function text(value){
    return String(value??"").trim();
  }

  function missing(value){
    const valueText=text(value);
    return !valueText||
      /^(?:—|-|ไม่ระบุข้อมูล|unclassified|unknown|null)$/i.test(valueText)||
      /^gene expression(?:\s+—\s+page.*)?$/i.test(valueText);
  }

  function numeric(value){
    if(value===null||value===undefined||String(value).trim()==="")return null;
    const parsed=Number(String(value).replace(/%/g,"").replace(/,/g,"").trim());
    return Number.isFinite(parsed)?parsed:null;
  }

  const aliases={
    o6methyldnatransferase:"06methyldnatran",
    o6methyldnatran:"06methyldnatran",
    histonedeacetylasedipeptide:"histonedeacetylase",
    histonedeacetylase:"histonedeacetylase",
    ribonucleosidereductase:"ribonucleosidereductase",
    ribonucleosidereductase:"ribonucleosidereductase",
    ces12:"ces12carboxyesterase",
    ces12carboxyesterase:"ces12carboxyesterase",
    epcam:"epcamepcamve",
    epcamepcamve:"epcamepcamve",
    ikbabc:"ikbabc",
    rasrafmekerk:"rasrafmekerk",
    cd95fasr:"cd95fasr"
  };

  const functionOverrides={
    e2f1:"Increase Protein Synthesis",
    cdc6:"Rapid Cell Cycle",
    htert:"Immortalization",
    bcl2:"Regulation of Apoptosis",
    bax:"Regulation of Apoptosis",
    cd95fasr:"Regulation of Apoptosis",
    p27:"Cell Cycle Rate",
    p53:"Cell Cycle Rate",
    p16:"Cell Cycle Rate",
    cdk46:"Cell cycle regulator",
    dpd:"Nucleoside Import Transformation",
    up:"Nucleoside Import Transformation",
    np:"Nucleoside Import Transformation",
    tp:"Nucleoside Import Transformation",
    ts:"Nucleoside Import Transformation",
    dhfr:"Nucleoside Import Transformation",
    shmt:"Nucleoside Import Transformation",
    garft:"Nucleoside Import Transformation",
    ribonucleosidereductase:"Nucleoside Import Transformation",
    ces12carboxyesterase:"Activation of Camptothecin",
    cypb1:"Xenobiotic",
    ercc1:"DNA Repair Related Gene",
    rrm1:"DNA Repair Related Gene",
    cd33:"Immune system regulation",
    cd52:"Immune system regulation",
    cd20:"Development and differentiation of B cells into plasma cells",
    epcamepcamve:"Cell-cell adhesion",
    pdl1:"Immune system regulation",
    pd1:"Immune system regulation",
    pdl2:"Immune system regulation"
  };

  const resistanceFactors={
    mdr1:{name:"MDR1"},
    mrp1:{name:"MRP1"},
    lrp:{name:"LRP"},
    gst:{name:"GST"}
  };

  function legacyTemplates(){
    const byGene=new Map();
    Object.entries(MIW.YasineeGeneFields||{}).forEach(([pageAndName,fields])=>{
      const rawKey=pageAndName.split("|").at(-1);
      const key=aliases[rawKey]||rawKey;
      const [sourceFunction,sourceRelated,clinicalRisk,outcome,sourceSubGroup,sourceMainTopic]=fields||[];
      const resolvedFunction=functionOverrides[key]||sourceFunction||sourceSubGroup||"";
      const related=String(sourceRelated||"")
        .replace(/\(\s*\d+(?:\.\d+)?\s*cells?\s*\/\s*ml\s*\)/ig,"")
        .replace(/\s+/g," ")
        .trim();
      byGene.set(key,{
        key,
        function:resolvedFunction,
        related,
        clinicalRisk:clinicalRisk||"",
        outcome:outcome||"",
        subGroup:resolvedFunction||sourceSubGroup||"",
        riskGroup:sourceSubGroup||sourceFunction||resolvedFunction||"",
        mainTopic:sourceMainTopic||"",
        sourceColumnsAvailable:true
      });
    });
    Object.entries(resistanceFactors).forEach(([key,item])=>byGene.set(key,{
      key,
      name:item.name,
      function:NO_REPORT_FUNCTION,
      related:NO_REPORT_RELATED,
      clinicalRisk:NO_REPORT_RISK,
      outcome:NO_REPORT_OUTCOME,
      subGroup:"Resistance Factors",
      mainTopic:"Resistance Factors",
      sourceColumnsAvailable:false
    }));
    return byGene;
  }

  function templateMap(){
    return legacyTemplates();
  }

  function resolve(name){
    const normalized=normalize(name);
    const key=aliases[normalized]||normalized;
    const template=templateMap().get(key);
    return template?{...template}:null;
  }

  function isGene(row){
    return String(row?.group||row?.domain||"").toUpperCase()==="GENE";
  }

  function fieldValue(row,field){
    const aliasesByField={
      clinicalRisk:["clinicalRisk","clinical_risk"],
      mainTopic:["mainTopicName","main_topic_name"],
      subGroup:["subGroupName","sub_group_name"]
    };
    const candidates=aliasesByField[field]||[field];
    for(const key of candidates){
      if(!missing(row?.[key]))return text(row[key]);
    }
    for(const key of candidates){
      if(!missing(row?.reportLayer?.[key]))return text(row.reportLayer[key]);
    }
    return "";
  }

  function fieldSource(row,field){
    return text(row?.fieldSources?.[field]||row?.reportLayer?.fieldSources?.[field]);
  }

  function syntheticSource(source){
    return /^(?:RECONSTRUCTED_|INFERRED_|RGCC_CROSS_VERSION_GENE_SCHEMA|RGCC_FUNCTION_GROUP|PERCENT_RULE)/i.test(text(source));
  }

  function canonicalColumns(row){
    const lines=[
      row?.sourceLine,row?.sourceContext,row?.source_raw_text,
      ...(Array.isArray(row?.evidence)?row.evidence.flatMap(item=>[
        item?.sourceLine,item?.sourceContext,item?.source_raw_text
      ]):[])
    ].filter(Boolean);
    for(const line of lines){
      const source=text(line);
      if(!/Canonical gene table:/i.test(source))continue;
      const body=source.replace(/^.*?Canonical gene table:\s*/i,"");
      const parts=body.split("|").map(part=>text(part));
      if(parts.length<6)continue;
      return{
        name:parts[0],
        function:parts[1],
        clinicalRisk:parts[2],
        related:parts[3],
        result:parts[4],
        outcome:parts.slice(5).join(" | ")
      };
    }
    return null;
  }

  function directSourceField(row,field){
    const columns=canonicalColumns(row);
    if(columns)return text(columns[field]);
    if(syntheticSource(fieldSource(row,field)))return "";
    return fieldValue(row,field);
  }

  function inferredOutcome(row,template){
    const value=numeric(row?.value);
    if(value===null)return "";
    if(/^Radiotherapy\s*\/\s*Hyperthermia/i.test(template?.subGroup||"")&&value<0)return"SENSITIVE";
    return value===0?"LOW RISK":"HIGH RISK";
  }

  function outcomeDecision(row,template){
    if(!template?.sourceColumnsAvailable)return{
      value:NO_REPORT_OUTCOME,
      source:"SOURCE_COLUMN_NOT_PRESENT"
    };
    const direct=directSourceField(row,"outcome");
    if(direct)return{value:direct,source:"SOURCE_TABLE_OUTCOME_EXACT"};
    const inferred=inferredOutcome(row,template);
    return{
      value:inferred,
      source:inferred?"INFERRED_FROM_RESULT_ONLY_WHEN_SOURCE_OUTCOME_UNAVAILABLE":""
    };
  }

  function riskDecision(row,template){
    if(!template?.sourceColumnsAvailable)return{
      value:NO_REPORT_RISK,
      source:"SOURCE_COLUMN_NOT_PRESENT"
    };
    const direct=directSourceField(row,"clinicalRisk");
    if(direct)return{value:direct,source:"SOURCE_TABLE_CLINICAL_RISK_EXACT"};
    if(template.clinicalRisk)return{
      value:template.clinicalRisk,
      source:"SOURCE_LAYOUT_CLINICAL_RISK_FALLBACK"
    };
    return{value:"",source:""};
  }

  function outcomeFor(row,template){
    return outcomeDecision(row,template).value;
  }

  function riskFor(row,template){
    return riskDecision(row,template).value;
  }

  function reportKey(row){
    return text(row?.reportId)||text(row?.reportDate)||"CURRENT_REPORT";
  }

  function detectReportVersion(reportGenes){
    const sourcePages=reportGenes
      .filter(row=>resolve(row.name||row.normalized_name||row.reported_name)?.sourceColumnsAvailable)
      .map(row=>Number(row.page))
      .filter(Number.isFinite);
    const resistancePages=reportGenes
      .filter(row=>!resolve(row.name||row.normalized_name||row.reported_name)?.sourceColumnsAvailable)
      .map(row=>Number(row.page))
      .filter(Number.isFinite);
    const firstSourcePage=sourcePages.length?Math.min(...sourcePages):null;
    const resistancePage=resistancePages.length?Math.min(...resistancePages):null;
    if(firstSourcePage===6||resistancePage===4)return"RGCC_LEGACY_19_PAGE";
    if(firstSourcePage===7||resistancePage===5)return"RGCC_CURRENT_20_PAGE";
    return"RGCC_STRUCTURE_DETECTED_BY_GENE_NAME";
  }

  function setField(row,field,value,source,fieldSources,{authoritative=false}={}){
    if(!value)return false;
    const current=fieldValue(row,field);
    const replaceable=missing(current)||syntheticSource(fieldSource(row,field));
    if(!replaceable&&!authoritative)return false;
    if(current===value&&fieldSource(row,field)===source)return false;
    if(field==="mainTopic"){
      row.mainTopicName=value;
      row.main_topic_name=value;
    }else if(field==="subGroup"){
      row.subGroupName=value;
      row.sub_group_name=value;
    }else if(field==="clinicalRisk"){
      row.clinicalRisk=value;
      row.clinical_risk=value;
    }else{
      row[field]=value;
    }
    fieldSources[field]=source;
    return true;
  }

  function repairReportRows(rows){
    const genes=(rows||[]).filter(isGene);
    const reports=new Map();
    genes.forEach(row=>{
      const key=reportKey(row);
      if(!reports.has(key))reports.set(key,[]);
      reports.get(key).push(row);
    });
    const changedRows=[];
    let reconstructedFields=0;
    let sourceUnavailableRows=0;

    for(const row of genes){
      const template=resolve(row.name||row.normalized_name||row.reported_name);
      if(!template)continue;
      const before=JSON.stringify({
        function:row.function,related:row.related,clinicalRisk:row.clinicalRisk,
        outcome:row.outcome,section:row.section,mainTopicName:row.mainTopicName,
        subGroupName:row.subGroupName,reportLayer:row.reportLayer
      });
      const fieldSources={...(row.fieldSources||row.reportLayer?.fieldSources||{})};
      const schemaSource=template.sourceColumnsAvailable
        ?"RGCC_SOURCE_COLUMN_SCHEMA"
        :"RGCC_SOURCE_PAGE_HAS_NO_SIX_COLUMN_TABLE";
      const reportGenes=reports.get(reportKey(row))||genes;
      const reportVersion=detectReportVersion(reportGenes);

      if(template.mainTopic&&fieldValue(row,"mainTopic")!==template.mainTopic){
        row.mainTopicName=template.mainTopic;
        row.main_topic_name=template.mainTopic;
        fieldSources.mainTopic=schemaSource;
      }
      if(template.subGroup&&fieldValue(row,"subGroup")!==template.subGroup){
        row.subGroupName=template.subGroup;
        row.sub_group_name=template.subGroup;
        fieldSources.subGroup=schemaSource;
      }
      const currentFunction=fieldValue(row,"function");
      if(template.function&&/^(?:Cell cycle\s*\/\s*apoptosis|Drug Metabolisms\s*&\s*Targets|Markers)$/i.test(currentFunction)){
        row.function=template.function;
        fieldSources.function="RGCC_FUNCTION_SCHEMA_PRECISION_UPGRADE";
      }
      const evidenceFunction=text(canonicalColumns(row)?.function);
      const evidenceRelated=text(canonicalColumns(row)?.related);
      setField(row,"function",evidenceFunction||template.function,
        evidenceFunction?"SOURCE_TABLE_FUNCTION_EXACT":schemaSource,fieldSources,
        {authoritative:Boolean(evidenceFunction)});
      setField(row,"related",evidenceRelated||template.related,
        evidenceRelated?"SOURCE_TABLE_RELATED_EXACT":schemaSource,fieldSources,
        {authoritative:Boolean(evidenceRelated)});
      const outcome=outcomeDecision(row,template);
      const clinicalRisk=riskDecision(row,template);
      setField(row,"outcome",outcome.value,outcome.source,fieldSources,
        {authoritative:/SOURCE_TABLE_/.test(outcome.source)});
      setField(row,"clinicalRisk",clinicalRisk.value,clinicalRisk.source,fieldSources,
        {authoritative:/SOURCE_TABLE_/.test(clinicalRisk.source)||
          (clinicalRisk.source==="SOURCE_LAYOUT_CLINICAL_RISK_FALLBACK"&&Boolean(canonicalColumns(row)))});

      if(template.subGroup)row.section=fieldValue(row,"subGroup")||template.subGroup;
      row.reportLayer={
        ...(row.reportLayer||{}),
        function:fieldValue(row,"function"),
        related:fieldValue(row,"related"),
        clinicalRisk:fieldValue(row,"clinicalRisk"),
        outcome:fieldValue(row,"outcome"),
        mainTopic:fieldValue(row,"mainTopic"),
        subGroup:fieldValue(row,"subGroup"),
        fieldSources
      };
      row.fieldSources=fieldSources;
      row.reportSchemaVersion=reportVersion;
      row.geneSchemaVersion="MIW v10.59 · RGCC source-column schema 2";
      row.fieldsMigrationStatus=template.sourceColumnsAvailable
        ?"SOURCE_COLUMNS_PRESERVED_OR_RECOVERED"
        :"SOURCE_COLUMNS_NOT_AVAILABLE_ON_RESISTANCE_GRAPH";

      const after=JSON.stringify({
        function:row.function,related:row.related,clinicalRisk:row.clinicalRisk,
        outcome:row.outcome,section:row.section,mainTopicName:row.mainTopicName,
        subGroupName:row.subGroupName,reportLayer:row.reportLayer
      });
      if(before!==after){
        changedRows.push(row);
        reconstructedFields+=Object.keys(fieldSources).length;
      }
      if(!template.sourceColumnsAvailable)sourceUnavailableRows++;
    }

    return{
      rows,
      changedRows,
      geneCount:genes.length,
      mappedCount:genes.filter(row=>resolve(row.name||row.normalized_name||row.reported_name)).length,
      reconstructedFields,
      sourceUnavailableRows
    };
  }

  function displayLocal(value){
    const raw=text(value);
    if(MIW.I18n?.language!=="en")return raw;
    const map={
      [NO_REPORT_FUNCTION]:"Function column is not present on the Resistance Factors source graph",
      [NO_REPORT_RELATED]:"Related column is not present on the Resistance Factors source graph",
      [NO_REPORT_RISK]:"Clinical Risk is not reported on the Resistance Factors source graph",
      [NO_REPORT_OUTCOME]:"Outcome is not reported on the Resistance Factors source graph",
      "ไม่ระบุข้อมูล":"Not reported"
    };
    return map[raw]||raw;
  }

  function displayField(row,field){
    const existing=fieldValue(row,field);
    if(existing)return displayLocal(existing);
    const template=resolve(row?.name||row?.normalized_name||row?.reported_name);
    if(!template)return displayLocal("ไม่ระบุข้อมูล");
    if(field==="mainTopic")return displayLocal(template.mainTopic||"ไม่ระบุข้อมูล");
    if(field==="subGroup")return displayLocal(template.subGroup||"ไม่ระบุข้อมูล");
    if(field==="function")return displayLocal(template.function||"ไม่ระบุข้อมูล");
    if(field==="related")return displayLocal(template.related||"ไม่ระบุข้อมูล");
    if(field==="outcome")return displayLocal(outcomeFor(row,template)||"ไม่ระบุข้อมูล");
    if(field==="clinicalRisk")return displayLocal(riskFor(row,template)||"ไม่ระบุข้อมูล");
    return displayLocal("ไม่ระบุข้อมูล");
  }

  return{
    normalize,
    resolve,
    detectReportVersion,
    repairReportRows,
    displayField,
    labels:{
      NO_REPORT_FUNCTION,
      NO_REPORT_RELATED,
      NO_REPORT_RISK,
      NO_REPORT_OUTCOME
    },
    version:"MIW v10.59 · RGCC source-column schema 2"
  };
})();
