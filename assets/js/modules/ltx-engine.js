window.MIW=window.MIW||{};
MIW.LTXEngine=Object.freeze({
  name:"Lab Tracker v15.1 Extraction Core",
  shortName:"LTX Engine",
  version:"15.2-GENE-TABLE",
  pipelineVersion:"MIW v8.0 Phase 1.2",
  principles:Object.freeze([
    "PDF text first",
    "Template-aware coordinate extraction",
    "OCR fallback for chart pages",
    "Canonical upper-table parsing for Gene Expression",
    "Zero-line detection and line-occluded 0% recovery",
    "Unknown is never coerced to zero",
    "Evidence retained for every accepted value"
  ]),
  resultContract:Object.freeze({
    numericRange:"-100..100",
    zeroMeaning:"Confirmed numeric result of 0%",
    unresolvedMeaning:"Parser must re-read or request source review",
    finalReportRule:"Only numeric verified results may enter the final report"
  })
});