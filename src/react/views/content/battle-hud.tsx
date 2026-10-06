import { Fragment } from 'react';
import { Render, displayPipe, interpolate, classNames, parseStyle, normalizeStyle, identityKey } from '../render';
import { sanitizeHtml } from '../../ui/sanitize-html';
export function Content({vm, services}: {vm: any; services: any}) {
return <>{(() => { const kvPair = (context: any) => { const label = context["label"];
const cur = context["cur"];
const sim = context["sim"];
const unit = context["unit"];
const hidden = context["hidden"];
const fmt = context["fmt"];
const bdLabel = context["bdLabel"];
const bdKeys = context["bdKeys"];
const bdNote = context["bdNote"];
const tip = context["tip"];
const panel = context["panel"];
const curMax = context["curMax"];
const simMax = context["simMax"]; return <>{(() => { const __condition1 = !(hidden);  return __condition1 ? <><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["",""], [label])}</Render>
<Render tag="span" props={{}}>{(() => { const plainValue = (context: any) => {  return <>{interpolate(["",""], [displayPipe("number", cur, [fmt], services)])}
{(() => { const __condition2 = ((curMax != null) && (curMax !== cur));  return __condition2 ? <><>{interpolate([" – ",""], [displayPipe("number", curMax, [fmt], services)])}</></> : null; })()}
{interpolate(["",""], [((cur != null) ? unit : "")])}</>; }; return <>{(() => { const __condition3 = (bdKeys || panel);  return __condition3 ? <><Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; (panel ? panel.toggle($event) : vm.openBreakdown((bdLabel || label),bdKeys,"summary_stat_atk",undefined,undefined,false,bdNote)) }),
"className": ["v",((panel || vm.isBreakdownClickable(bdKeys)) ? "bonus_clickable" : '')].filter(Boolean).join(' '),
"tooltip": {text: (tip || ""), position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", cur, [fmt], services)])}
{(() => { const __condition4 = ((curMax != null) && (curMax !== cur));  return __condition4 ? <><>{interpolate([" – ",""], [displayPipe("number", curMax, [fmt], services)])}</></> : null; })()}
{interpolate(["",""], [((cur != null) ? unit : "")])}</Render></> : plainValue({}); })()}

{(() => { const __condition5 = vm.isComparing;  return __condition5 ? <><>{(() => { const plainSim = (context: any) => {  return <><Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", sim, [fmt], services)])}
{(() => { const __condition6 = ((simMax != null) && (simMax !== sim));  return __condition6 ? <><>{interpolate([" – ",""], [displayPipe("number", simMax, [fmt], services)])}</></> : null; })()}
{interpolate(["",""], [((sim != null) ? unit : "")])}</Render></>; }; return <><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
{(() => { const __condition7 = (bdKeys || panel);  return __condition7 ? <><Render tag="span" props={{"click": (event: any) => vm.action(() => { const $event = event; (panel ? panel.toggle($event) : vm.openBreakdownCompare((bdLabel || label),bdKeys,bdNote)) }),
"className": ["sim",((panel || vm.isBreakdownClickable(bdKeys)) ? "bonus_clickable" : '')].filter(Boolean).join(' '),
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", sim, [fmt], services)])}
{(() => { const __condition8 = ((simMax != null) && (simMax !== sim));  return __condition8 ? <><>{interpolate([" – ",""], [displayPipe("number", simMax, [fmt], services)])}</></> : null; })()}
{interpolate(["",""], [((sim != null) ? unit : "")])}</Render></> : plainSim({}); })()}
</>; })()}</></> : null; })()}</>; })()}</Render></Render></> : null; })()}</>; };
const castTimingsRaw = (context: any) => {  return <><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Conj. Variável"}</Render>
<Render tag="span" props={{}}>{interpolate([""," → ",""], [displayPipe("number", vm.calcSkill?.vct, ["1.0-3"], services),displayPipe("number", vm.calcSkill?.reducedVct, ["1.0-3"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Conj. Fixa"}</Render>
<Render tag="span" props={{}}>{interpolate([""," → ",""], [displayPipe("number", vm.calcSkill?.fct, ["1.0-3"], services),displayPipe("number", vm.calcSkill?.reducedFct, ["1.0-3"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Recarga"}</Render>
<Render tag="span" props={{}}>{interpolate([""," → ",""], [displayPipe("number", vm.calcSkill?.cd, ["1.0-3"], services),displayPipe("number", vm.calcSkill?.reducedCd, ["1.0-3"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Pós-conj."}</Render>
<Render tag="span" props={{}}>{interpolate([""," → ",""], [displayPipe("number", vm.calcSkill?.acd, ["1.0-3"], services),displayPipe("number", vm.calcSkill?.reducedAcd, ["1.0-3"], services)])}</Render></Render></>; };
const statRow = (context: any) => { const label = context["label"];
const cur = context["cur"];
const sim = context["sim"];
const unit = context["unit"];
const hidden = context["hidden"]; return <>{(() => { const __condition9 = !(hidden);  return __condition9 ? <><Render tag="tr" props={{}}><Render tag="th" props={{"scope": "row"}}>{interpolate(["",""], [label])}</Render>
<Render tag="td" props={{}}>{interpolate(["","",""], [displayPipe("number", cur, [], services),((cur != null) ? unit : "")])}</Render>
{(() => { const __condition10 = vm.isComparing;  return __condition10 ? <><Render tag="td" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["","",""], [displayPipe("number", sim, [], services),((sim != null) ? unit : "")])}</Render></> : null; })()}</Render></> : null; })()}</>; };
const castRow = (context: any) => { const lv = context["lv"];
const fct = context["fct"];
const vct = context["vct"];
const acd = context["acd"];
const cd = context["cd"];
const cls = context["cls"]; return <><Render tag="tr" props={{"className": [classNames(cls)].filter(Boolean).join(' ')}}><Render tag="th" props={{"scope": "row"}}>{interpolate(["",""], [lv])}</Render>
<Render tag="td" props={{}}>{interpolate(["","s"], [displayPipe("number", fct, ["1.0-3"], services)])}</Render>
<Render tag="td" props={{}}>{interpolate(["","s"], [displayPipe("number", vct, ["1.0-3"], services)])}</Render>
<Render tag="td" props={{}}>{interpolate(["","s"], [displayPipe("number", acd, ["1.0-3"], services)])}</Render>
<Render tag="td" props={{}}>{interpolate(["","s"], [displayPipe("number", cd, ["1.0-3"], services)])}</Render></Render></>; };
const castHead = (context: any) => {  return <><Render tag="tr" props={{}}><Render tag="td" props={{"className": ["corner"].filter(Boolean).join(' ')}}></Render>
<Render tag="th" props={{"colSpan": "2",
"scope": "colgroup"}}>{"Conjuração"}</Render>
<Render tag="th" props={{"colSpan": "2",
"scope": "colgroup"}}>{"Espera"}</Render></Render>
<Render tag="tr" props={{"className": ["cols"].filter(Boolean).join(' ')}}><Render tag="th" props={{"scope": "col"}}>{"Nv."}</Render>
<Render tag="th" props={{"scope": "col"}}>{"Fixa"}</Render>
<Render tag="th" props={{"scope": "col"}}>{"Variável"}</Render>
<Render tag="th" props={{"scope": "col"}}>{"Pós"}</Render>
<Render tag="th" props={{"scope": "col"}}>{"Recarga"}</Render></Render></>; }; return <>




<Render tag="div" props={{"className": ["hud"].filter(Boolean).join(' ')}}>{(() => { let firstCyclePanel: any = vm["firstCyclePanel"];
let aspdLimitPanel: any = vm["aspdLimitPanel"];
let castHelpPanel: any = vm["castHelpPanel"];
let optimizePanel: any = vm["optimizePanel"];
let dpsStepsPanel: any = vm["dpsStepsPanel"];
const formulaGraphCluster = (context: any) => { const c = context["c"];
const sim = context["sim"]; return <><Render tag="div" props={{"className": ["graph-col"].filter(Boolean).join(' ')}}>{(() => { const __condition11 = c.inputs.length;  return __condition11 ? <><Render tag="div" props={{"className": ["graph-inputs"].filter(Boolean).join(' ')}}>{(c.inputs ?? []).map((__entry12: any, __index12: number, __array12: any[]) => { const inp = __entry12; return <Fragment key={identityKey(__entry12)}><Render tag="div" props={{"pointerdown": (event: any) => vm.action(() => { const $event = event; vm.openFormulaDetailOnPointerDown(inp,!(!(sim)),$event) }),
"click": (event: any) => vm.action(() => { const $event = event; vm.openFormulaNode(inp,!(!(sim))) }),
"className": ["graph-input",(vm.isNodeClickable(inp) ? "bonus_clickable" : '')].filter(Boolean).join(' '),
"activateWithKeys": vm.isNodeClickable(inp)}}><Render tag="span" props={{}}>{interpolate(["",""], [inp.label])}</Render>
<Render tag="span" props={{"className": [(sim ? "sim" : '')].filter(Boolean).join(' ')}}>{interpolate(["","","",""], [((inp.showSign && (inp.value > 0)) ? "+" : ""),displayPipe("number", inp.value, [], services),((inp.unit === "percent") ? "%" : "")])}</Render></Render></Fragment>; })}</Render></> : null; })()}
<Render tag="div" props={{"pointerdown": (event: any) => vm.action(() => { const $event = event; vm.openFormulaDetailOnPointerDown(c.stage,!(!(sim)),$event) }),
"click": (event: any) => vm.action(() => { const $event = event; vm.openFormulaNode(c.stage,!(!(sim))) }),
"className": ["graph-stage",(vm.isNodeClickable(c.stage) ? "bonus_clickable" : '')].filter(Boolean).join(' '),
"activateWithKeys": vm.isNodeClickable(c.stage)}}><Render tag="span" props={{}}>{interpolate(["",""], [c.stage.label])}</Render>
<Render tag="span" props={{"className": [(sim ? "sim" : '')].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", c.stage.value, [], services)])}</Render></Render></Render></>; };
const formulaGraphRow = (context: any) => { const clusters = context["clusters"];
const sim = context["sim"]; return <><Render tag="div" props={{"className": ["graph-row"].filter(Boolean).join(' ')}}>{(clusters ?? []).map((__entry13: any, __index13: number, __array13: any[]) => { const c = __entry13;
const last = __index13 === __array13.length - 1; return <Fragment key={identityKey(__entry13)}><>{formulaGraphCluster({"c": c,"sim": sim})}
{(() => { const __condition14 = !(last);  return __condition14 ? <><Render tag="div" props={{"className": ["graph-arrow"].filter(Boolean).join(' ')}}>{"→"}</Render></> : null; })()}</></Fragment>; })}</Render></>; };
const formulaBranch = (context: any) => { const graph = context["graph"];
const graphSim = context["graphSim"];
const flat = context["flat"];
const compare = context["compare"]; return <>{(() => { const flatBranch = (context: any) => {  return <><Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Dano"}</Render>
{formulaGraphRow({"clusters": graph.max,"sim": compare})}
{(() => { const __condition15 = (vm.isComparing && graphSim?.max?.length);  return __condition15 ? <><><Render tag="div" props={{"className": ["cmp-castbar-label"].filter(Boolean).join(' ')}}>{"⇄ Comparação"}</Render>
{formulaGraphRow({"clusters": graphSim.max,"sim": true})}</></> : null; })()}</>; }; return <>{(() => { const __condition16 = !(flat);  return __condition16 ? <><><Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Dano mínimo"}</Render>
{formulaGraphRow({"clusters": graph.min,"sim": compare})}
{(() => { const __condition17 = (vm.isComparing && graphSim?.min?.length);  return __condition17 ? <><><Render tag="div" props={{"className": ["cmp-castbar-label"].filter(Boolean).join(' ')}}>{"⇄ Comparação"}</Render>
{formulaGraphRow({"clusters": graphSim.min,"sim": true})}</></> : null; })()}
<Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Dano máximo"}</Render>
{formulaGraphRow({"clusters": graph.max,"sim": compare})}
{(() => { const __condition18 = (vm.isComparing && graphSim?.max?.length);  return __condition18 ? <><><Render tag="div" props={{"className": ["cmp-castbar-label"].filter(Boolean).join(' ')}}>{"⇄ Comparação"}</Render>
{formulaGraphRow({"clusters": graphSim.max,"sim": true})}</></> : null; })()}</></> : flatBranch({}); })()}
</>; })()}</>; };
let damageFormulaPanel: any = vm["damageFormulaPanel"];
let damageFormulaNoCriPanel: any = vm["damageFormulaNoCriPanel"];
let critMeanPanel: any = vm["critMeanPanel"];
let critRatePanel: any = vm["critRatePanel"];
let detailsPanel: any = vm["detailsPanel"];
let basicPanel: any = vm["basicPanel"];
let sharedSkillDetails: any = vm["sharedSkillDetails"];
let sharedDamagePopovers: any = vm["sharedDamagePopovers"]; return <>{(() => { const __condition19 = vm.isCalculating;  return __condition19 ? <><Render tag="div" props={{"className": ["loading_block"].filter(Boolean).join(' ')}}><Render tag="app-icon" props={{"name": "spinner",
"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 2rem")))}}></Render></Render></> : null; })()}
{(() => { const __condition20 = vm.isComparing;  return __condition20 ? <><Render tag="div" props={{"className": ["hud-cmp-ribbon"].filter(Boolean).join(' ')}}>{interpolate(["⇄ Comparando: ",""], [vm.compareRibbonText])}</Render></> : null; })()}
<Render tag="div" props={{"className": ["hud-efeitos-row"].filter(Boolean).join(' ')}}><Render tag="app-battle-effects" props={{"chanceList": vm.chanceList,
"selectedChances": vm.selectedChances,
"chanceList2": vm.chanceList2,
"selectedChances2": vm.selectedChances2,
"isComparing": vm.isComparing,
"selectedChancesChange": (event: any) => vm.action(() => { const $event = event; vm.selectedChancesChange.emit($event) }),
"selectedChances2Change": (event: any) => vm.action(() => { const $event = event; vm.selectedChances2Change.emit($event) })}}></Render>
{(() => { const __condition21 = (((vm.dmg?.requireTxt || (vm.showLeftWeapon && vm.model?.leftWeapon)) || vm.isAutoSpell) || vm.hasFlashCombo);  return __condition21 ? <><Render tag="div" props={{"className": ["hud-flags"].filter(Boolean).join(' ')}}>{(() => { const __condition22 = vm.dmg?.requireTxt;  return __condition22 ? <><Render tag="app-ui-tag" props={{"severity": "danger",
"value": "⚠ Requer",
"tooltipPosition": "top",
"tooltip": {text: vm.dmg?.requireTxt, position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render></> : null; })()}
{(() => { const __condition23 = vm.hasFlashCombo;  return __condition23 ? <><Render tag="app-ui-tag" props={{"severity": "info",
"value": "Combo Rápido",
"tooltipPosition": "top",
"tooltip": {text: "Conjura Punho do Dragão, Ruína e Garra de Tigre no maior nível aprendido. Selecione os níveis em Aprenda para incluir o dano de cada habilidade.", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render></> : null; })()}
{(() => { const __condition24 = (vm.showLeftWeapon && vm.model?.leftWeapon);  return __condition24 ? <><Render tag="app-ui-tag" props={{"severity": "danger",
"value": "⚠ Mão esq.",
"tooltipPosition": "top",
"tooltip": {text: "ATK da mão esquerda ainda não calculado", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render></> : null; })()}
{(() => { const __condition25 = vm.isAutoSpell;  return __condition25 ? <><Render tag="app-ui-tag" props={{"severity": "warning",
"value": "Autospell",
"tooltipPosition": "top",
"tooltip": {text: "DPS não exibido para autospell", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render></> : null; })()}</Render></> : null; })()}</Render>
<Render tag="div" props={{"className": ["hud-cards"].filter(Boolean).join(' ')}}><Render tag="app-battle-monster-card" props={{"totalSummary": vm.totalSummary,
"selectedMonster": vm.selectedMonster,
"selectedMonsterName": vm.selectedMonsterName,
"isInProcessingPreset": vm.isInProcessingPreset,
"isRelieveTarget": vm.isRelieveTarget,
"relieveLevelOptions": vm.relieveLevelOptions,
"relieveLevel": vm.relieveLevel,
"betelgeuseHp": vm.betelgeuseHp,
"betelgeuseHpOptions": vm.betelgeuseHpOptions,
"betelgeuseHpChange": (value: number) => vm.action(() => { vm.betelgeuseHpChange.emit(value) }),
"spriteUrlOverride": vm.spriteUrlOverride,
"spriteFallbackUrl": vm.spriteFallbackUrl,
"reductionCategories": vm.reductionCategories,
"reductionSources": vm.reductionSources,
"relieveLevelChange": (event: any) => vm.action(() => { const $event = event; vm.relieveLevelChange.emit($event) }),
"reductionRowClick": (event: any) => vm.action(() => { const $event = event; vm.reductionRowClick.emit($event) }),
"showElementTableClick": (event: any) => vm.action(() => { const $event = event; vm.onShowElementalTableClick() })}}></Render>
<Render tag="div" props={{"className": ["hud-card-col hud-card-col--skill"].filter(Boolean).join(' ')}}><Render tag="app-ui-card" props={{"styleClass": "hud-card"}}><Render tag="div" props={{"className": ["hud-rot-layout"].filter(Boolean).join(' ')}}><Render tag="app-rotation-list" props={{"entries": (vm.rotationView?.entries || []),
"entries2": (vm.rotationView2?.entries || null),
"isComparing": vm.isComparing,
"rotation": vm.rotation,
"atkSkills": vm.atkSkills,
"isShowSelectableSkillLevel": vm.isShowSelectableSkillLevel,
"isInProcessingPreset": vm.isInProcessingPreset,
"damagePerCycle": (vm.cycle?.damagePerCycle || 0),
"rotationChange": (event: any) => vm.action(() => { const $event = event; vm.rotationChange.emit($event) }),
"stackChange": (event: any) => vm.action(() => { const $event = event; vm.stackChange.emit($event) }),
"optimizeClick": (event: any) => vm.action(() => { const $event = event; vm.optimizeClick.emit() }),
"clearClick": (event: any) => vm.action(() => { const $event = event; vm.rotationChange.emit({"rotation": [],"stacks": []}) }),
"detailsClick": (event: any) => vm.action(() => { const $event = event; vm.openSharedDetails($event,sharedSkillDetails) }),
"elementTableClick": (event: any) => vm.action(() => { const $event = event; vm.onShowElementalTableClick() }),
"critBreakdownClick": (event: any) => vm.action(() => { const $event = event; vm.openStepCritRate($event,critRatePanel) }),
"damageClick": (event: any) => vm.action(() => { const $event = event; vm.openSharedDamage($event,sharedDamagePopovers) }),
"className": ["hud-rot-col"].filter(Boolean).join(' ')}}></Render>
{(() => { const __condition26 = vm.cycle; const c = __condition26; return __condition26 ? <><Render tag="div" props={{"className": ["hud-dps-col",(!(vm.rotation.length) ? "hud-dps-col--empty" : '')].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["hud-hero-strip"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["hud-hero-fig"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["cap2"].filter(Boolean).join(' ')}}>{interpolate(["",""], [(vm.isSingleEntryRotation ? "DPS" : "DPS DO COMBO")])}</Render>
<Render tag="div" props={{"className": ["hud-hero-nums"].filter(Boolean).join(' ')}}><Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; dpsStepsPanel.toggle($event) }),
"className": ["pnum clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Como a taxa de DPS é calculada", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", c.sustainedDps, ["1.0-0"], services)])}</Render>
{(() => { const __condition27 = (vm.isComparing && vm.cycle2); const c2 = __condition27; return __condition27 ? <><><Render tag="span" props={{"className": ["vsarrow"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; dpsStepsPanel.toggle($event) }),
"className": ["pnum sim clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Como a taxa de DPS é calculada", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", c2.sustainedDps, ["1.0-0"], services)])}</Render>
{(() => { const __condition28 = (vm.dpsDeltaPercent !== null);  return __condition28 ? <><Render tag="span" props={{"className": ["pdelta",((vm.dpsDeltaPercent > 0) ? "pos" : ''),((vm.dpsDeltaPercent < 0) ? "neg" : '')].filter(Boolean).join(' ')}}>{interpolate(["","","%"], [((vm.dpsDeltaPercent > 0) ? "+" : ""),displayPipe("number", vm.dpsDeltaPercent, ["1.1-1"], services)])}</Render></> : null; })()}</></> : null; })()}</Render></Render>
<Render tag="div" props={{"className": ["hud-hero-fig"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["cap2 cap2--plain"].filter(Boolean).join(' ')}}>{interpolate(["",""], [(vm.isSingleEntryRotation ? "Por uso" : "Por ciclo")])}</Render>
<Render tag="div" props={{"className": ["hud-hero-nums"].filter(Boolean).join(' ')}}><Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; dpsStepsPanel.toggle($event) }),
"className": ["hud-percycle clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Como a taxa de DPS é calculada", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", c.damagePerCycle, ["1.0-0"], services)])}</Render>
{(() => { const __condition29 = (vm.isComparing && vm.cycle2); const c2 = __condition29; return __condition29 ? <><><Render tag="span" props={{"className": ["vsarrow"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; dpsStepsPanel.toggle($event) }),
"className": ["hud-percycle sim clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Como a taxa de DPS é calculada", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", c2.damagePerCycle, ["1.0-0"], services)])}</Render>
{(() => { const __condition30 = (vm.perCycleDeltaPercent !== null);  return __condition30 ? <><Render tag="span" props={{"className": ["pdelta",((vm.perCycleDeltaPercent > 0) ? "pos" : ''),((vm.perCycleDeltaPercent < 0) ? "neg" : '')].filter(Boolean).join(' ')}}>{interpolate(["","","%"], [((vm.perCycleDeltaPercent > 0) ? "+" : ""),displayPipe("number", vm.perCycleDeltaPercent, ["1.1-1"], services)])}</Render></> : null; })()}</></> : null; })()}</Render></Render>
<Render tag="div" props={{"className": ["hud-hero-divider"].filter(Boolean).join(' ')}}></Render>
<Render tag="div" props={{"className": ["hud-hero-meta"].filter(Boolean).join(' ')}}>{(() => { const cycleLen = (context: any) => {  return <><Render tag="div" props={{"className": ["hud-meta"].filter(Boolean).join(' ')}}><Render tag="span" props={{"className": ["hud-cycle-len"].filter(Boolean).join(' ')}}>{interpolate(["Ciclo ","s"], [displayPipe("number", c.cycleDuration, ["1.2-2"], services)])}</Render>
{(() => { const __condition31 = (vm.isComparing && vm.cycle2); const c2 = __condition31; return __condition31 ? <><><Render tag="span" props={{"className": ["vsarrow"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["","s"], [displayPipe("number", c2.cycleDuration, ["1.2-2"], services)])}</Render></></> : null; })()}</Render></>; }; return <>{(() => { const __condition32 = vm.isSingleEntryRotation;  return __condition32 ? <><Render tag="div" props={{"className": ["hud-meta"].filter(Boolean).join(' ')}}><Render tag="span" props={{"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; castHelpPanel.toggle($event) }),
"className": ["habps clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Habilidades por segundo — clique para ver o cálculo", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["Hab./s ",""], [displayPipe("number", vm.heroHitsPerSec, ["1.0-2"], services)])}
{(() => { const __condition33 = (vm.heroHitsPerSecSim !== null);  return __condition33 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", vm.heroHitsPerSecSim, ["1.0-2"], services)])}</Render></></> : null; })()}</Render></Render></> : cycleLen({}); })()}

{(() => { const __condition34 = vm.rotationView?.ttk; const ttk = __condition34; return __condition34 ? <><Render tag="div" props={{"className": ["hud-meta"].filter(Boolean).join(' ')}}>{" Morre em "}
<Render tag="b" props={{}}>{interpolate(["",""], [ttk.text])}</Render>
<Render tag="span" props={{"className": ["hud-sep"].filter(Boolean).join(' ')}}>{"·"}</Render>
<Render tag="span" props={{}}>{interpolate([""," ",""], [displayPipe("number", vm.rotationView.cyclesToKill, ["1.0-0"], services),vm.killCountLabel])}</Render></Render></> : null; })()}
{(() => { const __condition35 = !(vm.rotationView?.ttk);  return __condition35 ? <><Render tag="div" props={{"className": ["hud-meta"].filter(Boolean).join(' ')}}>{"Morre em "}
<Render tag="b" props={{}}>{"—"}</Render></Render></> : null; })()}
{(() => { const __condition36 = vm.showsFirstCycle;  return __condition36 ? <><Render tag="div" props={{"click": (event: any) => vm.action(() => { const $event = event; firstCyclePanel.toggle($event) }),
"className": ["hud-meta clickable dotted"].filter(Boolean).join(' '),
"activateWithKeys": true}}>{" 1º ciclo "}
<Render tag="b" props={{}}>{interpolate(["","s"], [displayPipe("number", c.firstCycleDuration, ["1.2-2"], services)])}</Render>
<Render tag="span" props={{"className": ["hud-sep"].filter(Boolean).join(' ')}}>{"·"}</Render>
{" DPS "}
<Render tag="b" props={{}}>{interpolate(["",""], [displayPipe("number", c.firstCycleDps, ["1.0-0"], services)])}</Render></Render></> : null; })()}</>; })()}</Render></Render>
<Render tag="div" props={{"className": ["hud-tl-head"].filter(Boolean).join(' ')}}><Render tag="span" props={{"className": ["cap2"].filter(Boolean).join(' ')}}>{"LINHA DO TEMPO DO CICLO"}</Render>
<Render tag="app-icon" props={{"role": "button",
"tabIndex": "0",
"label": "Como a conjuração e a espera funcionam",
"name": "question-circle",
"click": (event: any) => vm.action(() => { const $event = event; castHelpPanel.toggle($event) }),
"className": ["hud-help"].filter(Boolean).join(' '),
"activateWithKeys": true}}></Render>
{(() => { const __condition37 = c.isAspdLimited;  return __condition37 ? <><Render tag="button" props={{"type": "button",
"label": "⚠ Vel.Atq limita a rotação",
"click": (event: any) => vm.action(() => { const $event = event; aspdLimitPanel.toggle($event) }),
"className": ["hud-warn-chip"].filter(Boolean).join(' '),
"button": true}}></Render></> : null; })()}
{(() => { const __condition38 = c.isEstimate;  return __condition38 ? <><Render tag="span" props={{"className": ["hud-invalid-chip"].filter(Boolean).join(' ')}}>{"⚠ Recarga não fecha"}</Render></> : null; })()}</Render>
<Render tag="app-rotation-timeline" props={{"cycle": c,
"entries": (vm.rotationView?.entries || []),
"cycle2": (vm.isComparing ? vm.cycle2 : null),
"entries2": (vm.rotationView2?.entries || null),
"iconClick": (event: any) => vm.action(() => { const $event = event; vm.openStepDetails($event,detailsPanel,basicPanel) })}}></Render></Render></> : null; })()}</Render></Render></Render></Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { firstCyclePanel = value; vm["firstCyclePanel"] = value; },
"handle": vm["firstCyclePanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Primeiro ciclo"}</Render>
{(() => { const __condition39 = vm.cycle; const c = __condition39; return __condition39 ? <><Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 11.5px; max-width: 280px; line-height: 1.5")))}}>{" Começando com todas as recargas zeradas, nada segura a rotação: o ciclo fecha em "}
<Render tag="b" props={{}}>{interpolate(["","s"], [displayPipe("number", c.firstCycleDuration, ["1.2-2"], services)])}</Render>
{" e o mesmo dano rende mais. A partir do segundo ciclo as recargas já estão correndo e o ciclo passa a "}
<Render tag="b" props={{}}>{interpolate(["","s"], [displayPipe("number", c.cycleDuration, ["1.2-2"], services)])}</Render>
{". "}
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("margin-top: 6px")))}}>{"O número grande é o DPS sustentado, que é o que vale numa luta longa."}</Render></Render></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { aspdLimitPanel = value; vm["aspdLimitPanel"] = value; },
"handle": vm["aspdLimitPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Vel.Atq limita a rotação"}</Render>
{(() => { const __condition40 = vm.cycle; const c = __condition40; return __condition40 ? <><Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 11.5px; max-width: 280px; line-height: 1.5")))}}>{" A Vel.Atq impõe um piso de "}
<Render tag="b" props={{}}>{interpolate(["","s"], [displayPipe("number", vm.rotationView?.aspdPeriod, ["1.2-2"], services)])}</Render>
{" entre uma ação e a seguinte. Quando a pós-conjuração acaba antes disso, a próxima habilidade espera — é a faixa hachurada na linha do tempo. "}
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("margin-top: 6px")))}}>{" Espera acumulada no ciclo: "}
<Render tag="b" props={{}}>{interpolate(["","s"], [displayPipe("number", c.aspdWaitTotal, ["1.2-2"], services)])}</Render>
{interpolate([" de ","s. "], [displayPipe("number", c.cycleDuration, ["1.2-2"], services)])}</Render>
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("margin-top: 6px")))}}>{"Sobe com AGI e com Vel.Atq (%) em equipamentos."}</Render></Render></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { castHelpPanel = value; vm["castHelpPanel"] = value; },
"handle": vm["castHelpPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Conjuração/Espera da habilidade"}</Render>
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 11.5px; max-width: 260px; line-height: 1.5")))}}>{" Fixa e variável correm "}
<Render tag="b" props={{}}>{"em sequência"}</Render>
{". Depois, pós-conjuração e recarga contam "}
<Render tag="b" props={{}}>{"ao mesmo tempo"}</Render>
{" — a maior define o bloqueio. "}</Render>
{(() => { const __condition41 = vm.castbar; const cb = __condition41; return __condition41 ? <><>{(() => { const __condition42 = (cb.mode === "sequential");  return __condition42 ? <><Render tag="div" props={{"className": ["blegend"].filter(Boolean).join(' ')}}>{interpolate([" fixa "," "], [displayPipe("number", cb.fixed?.seconds, ["1.0-3"], services)])}
<Render tag="span" props={{"className": ["op"].filter(Boolean).join(' ')}}>{"+"}</Render>
{interpolate([" variável "," "], [displayPipe("number", cb.variable?.seconds, ["1.0-3"], services)])}
<Render tag="span" props={{"className": ["op"].filter(Boolean).join(' ')}}>{"+"}</Render>
{interpolate([" ( pós "," "], [displayPipe("number", cb.parallel?.posSeconds, ["1.0-3"], services)])}
<Render tag="span" props={{"className": ["op"].filter(Boolean).join(' ')}}>{"∥"}</Render>
{interpolate([" recarga "," ) "], [displayPipe("number", cb.parallel?.recSeconds, ["1.0-3"], services)])}
<Render tag="span" props={{"className": ["op"].filter(Boolean).join(' ')}}>{"="}</Render>
{interpolate([" ","s/uso · "," usos/s "], [displayPipe("number", cb.hitPeriod, ["1.0-3"], services),displayPipe("number", cb.totalHitPerSec, ["1.0-2"], services)])}</Render></> : null; })()}
{(() => { const __condition43 = (cb.mode !== "sequential");  return __condition43 ? <><Render tag="div" props={{"className": ["blegend"].filter(Boolean).join(' ')}}>{interpolate([" ","s/uso (canalizado) "], [displayPipe("number", cb.single?.seconds, ["1.0-3"], services)])}
<Render tag="span" props={{"className": ["op"].filter(Boolean).join(' ')}}>{"="}</Render>
{interpolate([" "," usos/s "], [displayPipe("number", cb.totalHitPerSec, ["1.0-2"], services)])}</Render></> : null; })()}
{(() => { const __condition44 = vm.isAspdLimited;  return __condition44 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{" ⚠ Vel.Atq (ASPD) limita o Hab./s real a "}
<Render tag="b" props={{}}>{interpolate(["",""], [displayPipe("number", vm.heroHitsPerSec, ["1.0-2"], services)])}</Render>
{interpolate([" — a conjuração sozinha permitiria "," usos/s. "], [displayPipe("number", cb.totalHitPerSec, ["1.0-2"], services)])}</Render></> : null; })()}</></> : null; })()}
<Render tag="div" props={{"className": ["pstats"].filter(Boolean).join(' ')}}>{castTimingsRaw(undefined)}</Render></Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { optimizePanel = value; vm["optimizePanel"] = value; },
"handle": vm["optimizePanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"O que dá para melhorar"}</Render>
{(() => { const __condition45 = vm.optimizeInfo; const info = __condition45; return __condition45 ? <><><Render tag="div" props={{"className": ["optimize-bottleneck",(info.isOptimized ? "is-optimized" : '')].filter(Boolean).join(' ')}}>{interpolate(["",""], [info.headline])}</Render>
{(info.components ?? []).map((__entry46: any, __index46: number, __array46: any[]) => { const c = __entry46; return <Fragment key={identityKey(__entry46)}><Render tag="div" props={{"className": ["optimize-component",((!(info.isOptimized) && (c.key === info.bottleneck)) ? "is-bottleneck" : '')].filter(Boolean).join(' ')}}>{(() => { const showHint = (context: any) => {  return <>{interpolate(["",""], [c.hint])}</>; }; return <><Render tag="b" props={{}}>{interpolate(["",""], [c.label])}
{(() => { const __condition47 = !(c.hideSeconds);  return __condition47 ? <><Render tag="span" props={{}}>{interpolate([" ","s"], [displayPipe("number", c.seconds, ["1.0-3"], services)])}</Render></> : null; })()}</Render>
{" — "}
{(() => { const __condition48 = c.doneText;  return __condition48 ? <><Render tag="span" props={{"className": ["optimize-done"].filter(Boolean).join(' ')}}>{interpolate(["",""], [c.doneText])}</Render></> : showHint({}); })()}
</>; })()}</Render></Fragment>; })}
{(() => { const __condition49 = info.whatIf; const w = __condition49; return __condition49 ? <><Render tag="div" props={{"className": ["optimize-whatif"].filter(Boolean).join(' ')}}>{" Zerando a pós-conjuração: DPS iria a "}
<Render tag="b" props={{}}>{interpolate(["",""], [displayPipe("number", w.newDps, ["1.0-0"], services)])}</Render>
{interpolate([" (","","%) "], [((w.gainPercent >= 0) ? "+" : ""),displayPipe("number", w.gainPercent, ["1.0-1"], services)])}</Render></> : null; })()}</></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { dpsStepsPanel = value; vm["dpsStepsPanel"] = value; },
"handle": vm["dpsStepsPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Como a taxa de DPS é calculada"}</Render>
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 11.5px; color: var(--text-color-secondary); max-width: 300px; margin-bottom: 6px")))}}>{" DPS sustentado = dano somado de um ciclo ÷ duração do ciclo. O ciclo é a rotação inteira, repetida. "}</Render>
{(() => { const __condition50 = vm.cycle; const c = __condition50; return __condition50 ? <><><Render tag="div" props={{"className": ["pstats one tight"].filter(Boolean).join(' ')}}>{(vm.rotationView?.entries ?? []).map((__entry51: any, __index51: number, __array51: any[]) => { const entry = __entry51;
const i = __index51; return <Fragment key={identityKey(vm.trackByIndex(__index51, __entry51))}><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["",""], [entry.name])}
{(() => { const __condition52 = (entry.occurrence > 0);  return __condition52 ? <><Render tag="span" props={{"className": ["mut"].filter(Boolean).join(' ')}}>{interpolate([" (","ª)"], [(entry.occurrence + 1)])}</Render></> : null; })()}</Render>
<Render tag="span" props={{"role": "button",
"tabIndex": "0",
"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; vm.openSharedDamage({"index": i,"event": $event,"branch": "mean"},sharedDamagePopovers) }),
"className": ["v bonus_clickable"].filter(Boolean).join(' '),
"tooltip": {text: (entry.critWeighted ? "Ver como a média por crítico é calculada" : "Ver a fórmula do dano"), position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", entry.damage, ["1.0-0"], services)])}</Render></Render></Fragment>; })}</Render>
<Render tag="div" props={{"className": ["pstats one"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv total"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"= Dano por ciclo"}</Render>
<Render tag="span" props={{"className": ["teal"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", c.damagePerCycle, ["1.0-0"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"÷ Ciclo"}</Render>
<Render tag="span" props={{}}>{interpolate(["","s"], [displayPipe("number", c.cycleDuration, ["1.2-2"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv total"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"= DPS sustentado"}</Render>
<Render tag="span" props={{"className": ["orange"].filter(Boolean).join(' ')}}>{interpolate([" "," "], [displayPipe("number", c.sustainedDps, ["1.0-0"], services)])}
{(() => { const __condition53 = (vm.isComparing && vm.cycle2); const c2 = __condition53; return __condition53 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", c2.sustainedDps, ["1.0-0"], services)])}</Render></></> : null; })()}</Render></Render></Render>
{(() => { const __condition54 = c.isAspdLimited;  return __condition54 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{interpolate([" ⚠ A Vel.Atq atrasa parte da rotação — ","s do ciclo são espera. "], [displayPipe("number", c.aspdWaitTotal, ["1.2-2"], services)])}</Render></> : null; })()}
{(() => { const __condition55 = vm.showsFirstCycle;  return __condition55 ? <><><Render tag="div" props={{"className": ["cap2"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("margin-top: 8px")))}}>{"PRIMEIRO CICLO"}</Render>
<Render tag="div" props={{"style": normalizeStyle(Object.assign({}, parseStyle("font-size: 11.5px; color: var(--text-color-secondary); max-width: 300px; margin-bottom: 4px")))}}>{interpolate([" Começando com todas as recargas zeradas, nada segura a rotação: o ciclo fecha em ","s e o mesmo dano rende mais. "], [displayPipe("number", c.firstCycleDuration, ["1.2-2"], services)])}</Render>
<Render tag="div" props={{"className": ["pstats one tight"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Ciclo 1"}</Render>
<Render tag="span" props={{}}>{interpolate(["","s"], [displayPipe("number", c.firstCycleDuration, ["1.2-2"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Ciclos seguintes"}</Render>
<Render tag="span" props={{}}>{interpolate(["","s"], [displayPipe("number", c.cycleDuration, ["1.2-2"], services)])}</Render></Render></Render>
<Render tag="div" props={{"className": ["pstats one"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv total"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"= DPS do 1º ciclo"}</Render>
<Render tag="span" props={{"className": ["orange"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", c.firstCycleDps, ["1.0-0"], services)])}</Render></Render></Render></></> : null; })()}</></> : null; })()}</Render>



<Render tag="app-ui-popover" props={{"reference": (value: any) => { damageFormulaPanel = value; vm["damageFormulaPanel"] = value; },
"handle": vm["damageFormulaPanel"]}}>{(() => { const combinedFormula = (context: any) => {  return <><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Como o dano é calculado"}</Render>
<Render tag="div" props={{"className": ["graph-hint"].filter(Boolean).join(' ')}}>{"Clique em qualquer valor para ver de onde ele vem."}</Render>
{(() => { const __condition56 = vm.hero?.showsEffected;  return __condition56 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{"Fórmula da rolagem com os efeitos acionados."}</Render></> : null; })()}
{(() => { const __condition57 = vm.formulaGraph;  return __condition57 ? <><><Render tag="div" props={{"className": ["formula-trace-scroll"].filter(Boolean).join(' ')}}>{formulaBranch({"graph": vm.formulaGraph,"graphSim": vm.formulaGraphSim,"flat": vm.damageIsFlat})}</Render></></> : noFormulaTrace({}); })()}</>; };
const noFormulaTrace = (context: any) => {  return <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{"Fórmula passo a passo indisponível para esta habilidade (usa cálculo especial)."}</Render></>; }; return <>{(() => { const __condition58 = vm.formulaPart; const part = __condition58; return __condition58 ? <><><Render tag="button" props={{"type": "button",
"click": (event: any) => vm.action(() => { const $event = event; (vm.formulaPart = null) }),
"className": ["graph-back"].filter(Boolean).join(' ')}}>{"← Voltar à soma"}</Render>
<Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{interpolate(["",""], [part.label])}</Render>
<Render tag="div" props={{"className": ["graph-hint"].filter(Boolean).join(' ')}}>{"Clique em qualquer valor para ver de onde ele vem."}</Render>
{(() => { const __condition59 = (part.hits > 1);  return __condition59 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{interpolate([" "," golpes × dano por golpe = ",""], [part.hits,displayPipe("number", part.min, [], services)])}
{(() => { const __condition60 = (part.max !== part.min);  return __condition60 ? <><>{interpolate([" – ",""], [displayPipe("number", part.max, [], services)])}</></> : null; })()}
{" de dano total. "}</Render></> : null; })()}
<Render tag="div" props={{"className": ["formula-trace-scroll"].filter(Boolean).join(' ')}}>{formulaBranch({"graph": part.graph,"flat": (part.min === part.max),"compare": part.compare})}</Render></></> : combinedFormula({}); })()}

</>; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { damageFormulaNoCriPanel = value; vm["damageFormulaNoCriPanel"] = value; },
"handle": vm["damageFormulaNoCriPanel"]}}>{(() => { const noFormulaTraceNoCri = (context: any) => {  return <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{"Fórmula passo a passo indisponível para esta habilidade (usa cálculo especial)."}</Render></>; }; return <><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Como o dano sem crítico é calculado"}</Render>
<Render tag="div" props={{"className": ["graph-hint"].filter(Boolean).join(' ')}}>{"Clique em qualquer valor para ver de onde ele vem."}</Render>
{(() => { const __condition61 = vm.formulaGraphNoCri;  return __condition61 ? <><><Render tag="div" props={{"className": ["formula-trace-scroll"].filter(Boolean).join(' ')}}>{formulaBranch({"graph": vm.formulaGraphNoCri,"graphSim": vm.formulaGraphNoCriSim,"flat": vm.damageNoCriIsFlat})}</Render></></> : noFormulaTraceNoCri({}); })()}
</>; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { critMeanPanel = value; vm["critMeanPanel"] = value; },
"handle": vm["critMeanPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{interpolate(["",""], [vm.meanPanelTitle])}</Render>
<Render tag="div" props={{"className": ["graph-hint"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("max-width: 320px")))}}>{(() => { const plainMeanHint = (context: any) => {  return <>{" Cada golpe rola entre um mínimo e um máximo. O dano da rotação é a média dos dois. "}</>; }; return <>{(() => { const __condition62 = vm.isCritWeighted;  return __condition62 ? <><>{" Cada uso rola crítico com a taxa da habilidade. O dano da rotação é a média dos dois desfechos, pesada por essa taxa — não é o dano crítico, nem o dano sem crítico. "}</></> : plainMeanHint({}); })()}
</>; })()}</Render>
{(() => { const __condition63 = vm.critMean; const m = __condition63; return __condition63 ? <><><Render tag="div" props={{"className": ["pstats one tight"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["",""], [(vm.isCritWeighted ? "Dano sem crít. (média mín–máx)" : "Média entre o mínimo e o máximo")])}</Render>
<Render tag="span" props={{"className": ["v"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", m.avgBasicDamage, ["1.0-0"], services)])}</Render></Render>
{(() => { const __condition64 = vm.isCritWeighted;  return __condition64 ? <><><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Dano crít."}</Render>
<Render tag="span" props={{"className": ["v"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", m.criDmg, ["1.0-0"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Tx. Crít."}</Render>
<Render tag="span" props={{"className": ["v"].filter(Boolean).join(' ')}}>{interpolate(["","%"], [displayPipe("number", m.criRate, ["1.0-1"], services)])}</Render></Render></></> : null; })()}
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["",""], [(vm.isCritWeighted ? "Precisão (só sem crít.)" : "Precisão")])}</Render>
<Render tag="span" props={{"className": ["v"].filter(Boolean).join(' ')}}>{interpolate(["","%"], [displayPipe("number", m.accuracy, ["1.0-1"], services)])}</Render></Render></Render>
<Render tag="div" props={{"className": ["pstats one"].filter(Boolean).join(' ')}}>{(() => { const plainMeanParts = (context: any) => {  return <><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"× Precisão"}</Render>
<Render tag="span" props={{}}>{interpolate(["","%"], [displayPipe("number", m.accuracy, ["1.0-1"], services)])}</Render></Render></>; }; return <>{(() => { const __condition65 = vm.isCritWeighted;  return __condition65 ? <><><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["Parte com crít. — dano crít. × ","%"], [displayPipe("number", m.criRate, ["1.0-1"], services)])}</Render>
<Render tag="span" props={{}}>{interpolate(["",""], [displayPipe("number", m.criPart, ["1.0-0"], services)])}</Render></Render>
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{interpolate(["Parte sem crít. — dano sem crít. × ","% × precisão"], [displayPipe("number", (100 - m.criRate), ["1.0-1"], services)])}</Render>
<Render tag="span" props={{}}>{interpolate(["",""], [displayPipe("number", m.noCriPart, ["1.0-0"], services)])}</Render></Render></></> : plainMeanParts({}); })()}

<Render tag="div" props={{"className": ["kv total"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"= Dano médio por golpe"}</Render>
<Render tag="span" props={{"className": ["teal"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", m.avgDamagePerHit, ["1.0-0"], services)])}</Render></Render>
{(() => { const __condition66 = (m.totalHit > 1);  return __condition66 ? <><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"× Golpes"}</Render>
<Render tag="span" props={{}}>{interpolate(["",""], [displayPipe("number", m.totalHit, ["1.0-0"], services)])}</Render></Render></> : null; })()}
<Render tag="div" props={{"className": ["kv total"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"= Dano médio por uso"}</Render>
<Render tag="span" props={{"className": ["orange"].filter(Boolean).join(' ')}}>{interpolate([" "," "], [displayPipe("number", m.damagePerUse, ["1.0-0"], services)])}
{(() => { const __condition67 = vm.critMeanSim; const sim = __condition67; return __condition67 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["",""], [displayPipe("number", sim.damagePerUse, ["1.0-0"], services)])}</Render></></> : null; })()}</Render></Render></>; })()}</Render>
{(() => { const __condition68 = vm.isCritWeighted;  return __condition68 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{" O jogo arredonda o dano médio por golpe para baixo, então as duas partes podem somar alguns pontos a mais. "}</Render></> : null; })()}</></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"reference": (value: any) => { critRatePanel = value; vm["critRatePanel"] = value; },
"handle": vm["critRatePanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Como a Tx. Crítico é calculada"}</Render>
<Render tag="div" props={{"className": ["graph-hint"].filter(Boolean).join(' '),
"style": normalizeStyle(Object.assign({}, parseStyle("max-width: 330px")))}}>{" O CRIT do personagem vem do SOR e dos equipamentos; a habilidade pode somar um valor fixo e aplicar só uma parte dele; e o alvo desconta o próprio escudo de crítico. "}</Render>
{(() => { const __condition69 = vm.critRate; const c = __condition69; return __condition69 ? <><><Render tag="div" props={{"className": ["pstats one tight"].filter(Boolean).join(' ')}}>{(vm.critRateRows ?? []).map((__entry70: any, __index70: number, __array70: any[]) => { const row = __entry70; return <Fragment key={identityKey(vm.trackByCritStep(__index70, __entry70))}><Render tag="div" props={{"className": ["kv",((row.step.kind === "total") ? "total" : ''),((row.step.kind === "subtotal") ? "crit-sub" : '')].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{(() => { const __condition71 = (row.step.kind === "add");  return __condition71 ? <><Render tag="span" props={{"className": ["crit-op"].filter(Boolean).join(' ')}}>{"+"}</Render></> : null; })()}
{(() => { const __condition72 = (row.step.kind === "subtract");  return __condition72 ? <><Render tag="span" props={{"className": ["crit-op"].filter(Boolean).join(' ')}}>{"−"}</Render></> : null; })()}
{(() => { const __condition73 = (row.step.kind === "multiply");  return __condition73 ? <><Render tag="span" props={{"className": ["crit-op"].filter(Boolean).join(' ')}}>{"×"}</Render></> : null; })()}
{(() => { const __condition74 = ((row.step.kind === "subtotal") || (row.step.kind === "total"));  return __condition74 ? <><Render tag="span" props={{"className": ["crit-op"].filter(Boolean).join(' ')}}>{"="}</Render></> : null; })()}
{interpolate([" "," "], [row.step.label])}
{(() => { const __condition75 = row.step.detail;  return __condition75 ? <><Render tag="span" props={{"className": ["crit-detail"].filter(Boolean).join(' ')}}>{interpolate(["",""], [row.step.detail])}</Render></> : null; })()}</Render>
<Render tag="span" props={{}}>{(() => { const critPlain = (context: any) => {  return <><Render tag="span" props={{"className": ["v"].filter(Boolean).join(' ')}}>{interpolate(["",""], [vm.critStepText(row.step,row.step.value)])}</Render></>; }; return <>{(() => { const __condition76 = (row.step.keys && vm.isBreakdownClickable(row.step.keys));  return __condition76 ? <><Render tag="span" props={{"role": "button",
"tabIndex": "0",
"tooltipPosition": "top",
"click": (event: any) => vm.action(() => { const $event = event; vm.openBreakdown(row.step.label,row.step.keys,"summary_stat_atk") }),
"className": ["v bonus_clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Ver de quais itens vem", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false},
"activateWithKeys": true}}>{interpolate(["",""], [vm.critStepText(row.step,row.step.value)])}</Render></> : critPlain({}); })()}

{(() => { const __condition77 = (row.sim !== null);  return __condition77 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate(["",""], [vm.critStepText(row.step,row.sim)])}</Render></></> : null; })()}</>; })()}</Render></Render></Fragment>; })}</Render>
{(() => { const __condition78 = c.isCapped;  return __condition78 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{interpolate([" ⚠ A taxa passa de 100%: todo uso já acerta crítico, e o excedente (",") não rende nada. "], [displayPipe("number", (c.total - 100), ["1.0-0"], services)])}</Render></> : null; })()}
{(() => { const __condition79 = vm.isCritRateBasic;  return __condition79 ? <><Render tag="div" props={{"className": ["mut-note"].filter(Boolean).join(' ')}}>{" CRIT à distância e o CRIT por raça/elemento/tamanho só entram no ataque básico — nenhuma habilidade os recebe. "}</Render></> : null; })()}</></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"styleClass": "rot-details-panel",
"reference": (value: any) => { detailsPanel = value; vm["detailsPanel"] = value; },
"handle": vm["detailsPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Detalhes da habilidade"}</Render>
{(() => { const __condition80 = vm.activeEntry; const e = __condition80; return __condition80 ? <><Render tag="div" props={{"className": ["pd-head"].filter(Boolean).join(' ')}}><Render tag="img" props={{"alt": "",
"src": displayPipe("iconUrl", e.icon, ["skill"], services),
"className": ["pd-icon"].filter(Boolean).join(' '),
"missingIcon": true}}></Render>
<Render tag="span" props={{"className": ["pd-name"].filter(Boolean).join(' ')}}>{interpolate(["",""], [e.name])}
{(() => { const __condition81 = e.levelLabel;  return __condition81 ? <><Render tag="span" props={{}}>{interpolate([" ",""], [e.levelLabel])}</Render></> : null; })()}</Render>
<Render tag="span" props={{"className": ["pd-sep"].filter(Boolean).join(' ')}}>{"·"}</Render>
<Render tag="span" props={{}}>{interpolate(["",""], [e.dmgTypeLabel])}</Render>
<Render tag="span" props={{"className": ["pd-sep"].filter(Boolean).join(' ')}}>{"·"}</Render>
<Render tag="app-ui-tag" props={{"icon": "search",
"tooltipPosition": "top",
"value": displayPipe("monsterTerm", e.element, ["element"], services),
"styleClass": vm.elementTagClass(e.element),
"click": (event: any) => vm.action(() => { const $event = event; (vm.isInProcessingPreset ? null : vm.onShowElementalTableClick()) }),
"className": ["el-tag-clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Ver tabela elemental", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render>
<Render tag="span" props={{}}>{interpolate(["×",""], [displayPipe("number", e.propertyMultiplier, ["1.2-2"], services)])}</Render></Render></> : null; })()}
{(() => { const __condition82 = vm.activeEntryDesc; const desc = __condition82; return __condition82 ? <><><Render tag="div" props={{"role": "button",
"tabIndex": "0",
"aria-expanded": vm.isDescExpanded,
"click": (event: any) => vm.action(() => { const $event = event; (vm.isDescExpanded = !(vm.isDescExpanded)) }),
"className": ["pd-desc-toggle"].filter(Boolean).join(' '),
"activateWithKeys": true}}><Render tag="app-icon" props={{"aria-hidden": "true",
"name": (vm.isDescExpanded ? "chevron-down" : "chevron-right")}}></Render>
<Render tag="span" props={{}}>{"Descrição da habilidade"}</Render></Render>
{(() => { const __condition83 = vm.isDescExpanded;  return __condition83 ? <><Render tag="div" props={{"dangerouslySetInnerHTML": {__html: sanitizeHtml(desc ?? '')},
"className": ["pd-desc"].filter(Boolean).join(' ')}}></Render></> : null; })()}</></> : null; })()}
{(() => { const __condition84 = vm.hero; const h = __condition84; return __condition84 ? <><><Render tag="div" props={{"className": ["cap2 pd-cap"].filter(Boolean).join(' ')}}>{"DANO"}</Render>
<Render tag="div" props={{"className": ["pd-dmg"].filter(Boolean).join(' ')}}><Render tag="span" props={{"role": "button",
"tabIndex": "0",
"click": (event: any) => vm.action(() => { const $event = event; vm.openHeroDamageFormula($event,damageFormulaPanel) }),
"className": ["pd-dmg-val"].filter(Boolean).join(' '),
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", h.current.min, ["1.0-0"], services)])}
{(() => { const __condition85 = (h.current.max !== h.current.min);  return __condition85 ? <><Render tag="span" props={{}}>{interpolate([" – ",""], [displayPipe("number", h.current.max, ["1.0-0"], services)])}</Render></> : null; })()}</Render>
{(() => { const __condition86 = h.simulated; const s = __condition86; return __condition86 ? <><><Render tag="span" props={{"className": ["pd-dmg-arrow"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"role": "button",
"tabIndex": "0",
"click": (event: any) => vm.action(() => { const $event = event; vm.openHeroDamageFormula($event,damageFormulaPanel) }),
"className": ["pd-dmg-val pd-dmg-sim"].filter(Boolean).join(' '),
"activateWithKeys": true}}>{interpolate(["",""], [displayPipe("number", s.min, ["1.0-0"], services)])}
{(() => { const __condition87 = (s.max !== s.min);  return __condition87 ? <><Render tag="span" props={{}}>{interpolate([" – ",""], [displayPipe("number", s.max, ["1.0-0"], services)])}</Render></> : null; })()}</Render></></> : null; })()}</Render>
{(() => { const __condition88 = vm.isCritWeighted;  return __condition88 ? <><Render tag="div" props={{"className": ["pd-dmg-cap"].filter(Boolean).join(' ')}}>{"com crítico"}</Render></> : null; })()}
{(() => { const __condition89 = vm.activePerHit; const ph = __condition89; return __condition89 ? <><Render tag="div" props={{"className": ["pd-perhit"].filter(Boolean).join(' ')}}>{interpolate([" soma de "," golpes · "," – "," cada "], [ph.hits,displayPipe("number", ph.min, ["1.0-0"], services),displayPipe("number", ph.max, ["1.0-0"], services)])}</Render></> : null; })()}
<Render tag="div" props={{"className": ["pstats one tight"].filter(Boolean).join(' ')}}>{kvPair({"label": "Dano sem crít.","cur": vm.dmg?.skillMinDamageNoCri,"curMax": vm.dmg?.skillMaxDamageNoCri,"sim": vm.dmg2?.skillMinDamageNoCri,"simMax": vm.dmg2?.skillMaxDamageNoCri,"hidden": !(vm.dmg?.skillCanCri),"panel": damageFormulaNoCriPanel})}
{kvPair({"label": "Dano médio","cur": vm.critMean?.damagePerUse,"sim": vm.critMeanSim?.damagePerUse,"hidden": !(vm.isCritWeighted),"panel": critMeanPanel,"tip": "Média entre o dano sem crítico e o dano crítico, pesada pela taxa de crítico — o valor usado na rotação e no DPS."})}
{kvPair({"label": "Tx. Crít.","cur": vm.dmg?.skillCriRateToMonster,"sim": vm.dmg2?.skillCriRateToMonster,"unit": "%","fmt": "1.0-1","hidden": !(vm.dmg?.skillCanCri),"panel": critRatePanel,"tip": "Ver como a taxa de crítico é calculada"})}
{kvPair({"label": "Dano Crít.","cur": vm.dmg?.skillCriDmgToMonster,"sim": vm.dmg2?.skillCriDmgToMonster,"unit": "%","fmt": "1.0-1","hidden": !(vm.dmg?.skillCanCri),"bdLabel": "Dano crítico","bdKeys": ["criDmg"],"tip": vm.criDmgPercentageTooltip(vm.dmg)})}
{kvPair({"label": "Sem efeitos","cur": vm.dmg?.skillMinDamage,"sim": vm.dmg2?.skillMinDamage,"hidden": !(vm.selectedChances?.length)})}
{kvPair({"label": vm.dmg?.skillPart2Label,"cur": vm.dmg?.skillMinDamage2,"sim": vm.dmg2?.skillMinDamage2,"hidden": !(vm.dmg?.skillPart2Label)})}</Render>
{(() => { const __condition90 = vm.activeEntry?.critConditional;  return __condition90 ? <><Render tag="div" props={{"className": ["pd-note"].filter(Boolean).join(' ')}}>{"O crítico desta habilidade depende do estado atual do personagem."}</Render></> : null; })()}</></> : null; })()}
<Render tag="div" props={{"className": ["cap2 pd-cap"].filter(Boolean).join(' ')}}>{"HABILIDADE"}</Render>
<Render tag="table" props={{"className": ["ptable"].filter(Boolean).join(' ')}}>{(() => { const __condition91 = vm.isComparing;  return __condition91 ? <><Render tag="thead" props={{}}><Render tag="tr" props={{}}><Render tag="td" props={{"className": ["corner"].filter(Boolean).join(' ')}}></Render>
<Render tag="th" props={{"scope": "col"}}>{"Atual"}</Render>
<Render tag="th" props={{"scope": "col",
"className": ["sim"].filter(Boolean).join(' ')}}>{"Simulado"}</Render></Render></Render></> : null; })()}
<Render tag="tbody" props={{}}>{statRow({"label": "Hab. Base","cur": vm.calcSkill?.baseSkillDamage,"sim": vm.totalSummary2?.calcSkill?.baseSkillDamage,"unit": "%"})}
{statRow({"label": "Bônus Hab.","cur": vm.dmg?.skillBonusFromEquipment,"sim": vm.dmg2?.skillBonusFromEquipment,"unit": "%"})}
{statRow({"label": (vm.dmg?.skillTotalPeneLabel || "Pen."),"cur": vm.dmg?.skillTotalPene,"sim": vm.dmg2?.skillTotalPene,"unit": "%"})}
{statRow({"label": (vm.dmg?.skillTotalPeneResLabel || "Pen. Res."),"cur": vm.dmg?.skillTotalPeneRes,"sim": vm.dmg2?.skillTotalPeneRes,"unit": "%"})}
{statRow({"label": "Vel.Atq","cur": vm.totalSummary?.calc?.hitPerSecs,"sim": vm.totalSummary2?.calc?.hitPerSecs,"unit": " Hits/s"})}
{statRow({"label": "Penal. Tam.","cur": vm.dmg?.skillSizePenalty,"sim": vm.dmg2?.skillSizePenalty,"unit": "%","hidden": (vm.calcSkill?.dmgType === "Magical")})}
{statRow({"label": "Prec.","cur": vm.dmg?.skillAccuracy,"sim": vm.dmg2?.skillAccuracy,"unit": "%","hidden": (vm.calcSkill?.dmgType === "Magical")})}</Render></Render>
<Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Conjuração/Espera"}</Render>
<Render tag="table" props={{"className": ["ptable cast"].filter(Boolean).join(' ')}}><Render tag="thead" props={{}}>{castHead(undefined)}</Render>
<Render tag="tbody" props={{}}>{castRow({"lv": vm.calcSkill?.skillLevel,"fct": vm.calcSkill?.reducedFct,"vct": vm.calcSkill?.reducedVct,"acd": vm.calcSkill?.reducedAcd,"cd": vm.calcSkill?.reducedCd})}
{(() => { const __condition92 = vm.isComparing;  return __condition92 ? <>{castRow({"lv": vm.totalSummary2?.calcSkill?.skillLevel,"fct": vm.totalSummary2?.calcSkill?.reducedFct,"vct": vm.totalSummary2?.calcSkill?.reducedVct,"acd": vm.totalSummary2?.calcSkill?.reducedAcd,"cd": vm.totalSummary2?.calcSkill?.reducedCd,"cls": "sim"})}</> : null; })()}</Render></Render>
<Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Conjuração/Espera - Base"}</Render>
<Render tag="table" props={{"className": ["ptable cast"].filter(Boolean).join(' ')}}><Render tag="thead" props={{}}>{castHead(undefined)}</Render>
<Render tag="tbody" props={{}}>{castRow({"lv": vm.calcSkill?.skillLevel,"fct": vm.calcSkill?.clientFct,"vct": vm.calcSkill?.clientVct,"acd": vm.calcSkill?.clientAcd,"cd": vm.calcSkill?.clientCd,"cls": "base"})}</Render></Render>
{(() => { const __condition93 = (vm.dmg?.isUsedCurrentHP || vm.dmg?.isUsedCurrentSP);  return __condition93 ? <><><Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Consumo"}</Render>
<Render tag="table" props={{"className": ["ptable"].filter(Boolean).join(' ')}}><Render tag="tbody" props={{}}>{statRow({"label": "HP Atual","cur": vm.dmg?.currentHp,"sim": vm.dmg2?.currentHp,"hidden": !(vm.dmg?.isUsedCurrentHP)})}
{statRow({"label": "SP Atual","cur": vm.dmg?.currentSp,"sim": vm.dmg2?.currentSp,"hidden": !(vm.dmg?.isUsedCurrentSP)})}</Render></Render></></> : null; })()}
{(() => { const __condition94 = vm.optimizeInfo; const info = __condition94; return __condition94 ? <><><Render tag="div" props={{"className": ["cap2 pd-cap"].filter(Boolean).join(' ')}}>{"O QUE DÁ PARA MELHORAR"}</Render>
<Render tag="div" props={{"className": ["optimize-bottleneck",(info.isOptimized ? "is-optimized" : '')].filter(Boolean).join(' ')}}>{interpolate(["",""], [info.headline])}</Render>
{(info.components ?? []).map((__entry95: any, __index95: number, __array95: any[]) => { const c = __entry95; return <Fragment key={identityKey(__entry95)}><Render tag="div" props={{"className": ["optimize-component",((!(info.isOptimized) && (c.key === info.bottleneck)) ? "is-bottleneck" : '')].filter(Boolean).join(' ')}}>{(() => { const showHint2 = (context: any) => {  return <>{interpolate(["",""], [c.hint])}</>; }; return <><Render tag="b" props={{}}>{interpolate(["",""], [c.label])}
{(() => { const __condition96 = !(c.hideSeconds);  return __condition96 ? <><Render tag="span" props={{}}>{interpolate([" ","s"], [displayPipe("number", c.seconds, ["1.0-3"], services)])}</Render></> : null; })()}</Render>
{" — "}
{(() => { const __condition97 = c.doneText;  return __condition97 ? <><Render tag="span" props={{"className": ["optimize-done"].filter(Boolean).join(' ')}}>{interpolate(["",""], [c.doneText])}</Render></> : showHint2({}); })()}
</>; })()}</Render></Fragment>; })}
{(() => { const __condition98 = info.whatIf; const w = __condition98; return __condition98 ? <><Render tag="div" props={{"className": ["optimize-whatif"].filter(Boolean).join(' ')}}>{" Zerando a pós-conjuração: DPS iria a "}
<Render tag="b" props={{}}>{interpolate(["",""], [displayPipe("number", w.newDps, ["1.0-0"], services)])}</Render>
{interpolate([" (","","%) "], [((w.gainPercent >= 0) ? "+" : ""),displayPipe("number", w.gainPercent, ["1.0-1"], services)])}</Render></> : null; })()}</></> : null; })()}</Render>
<Render tag="app-ui-popover" props={{"styleClass": "rot-details-panel",
"reference": (value: any) => { basicPanel = value; vm["basicPanel"] = value; },
"handle": vm["basicPanel"]}}><Render tag="div" props={{"className": ["ptitle"].filter(Boolean).join(' ')}}>{"Ataque básico"}</Render>
<Render tag="div" props={{"className": ["pstats"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Elemento"}</Render>
<Render tag="span" props={{}}><Render tag="app-ui-tag" props={{"icon": "search",
"tooltipPosition": "top",
"value": displayPipe("monsterTerm", vm.totalSummary?.propertyAtk, ["element"], services),
"styleClass": vm.elementTagClass(vm.totalSummary?.propertyAtk),
"click": (event: any) => vm.action(() => { const $event = event; (vm.isInProcessingPreset ? null : vm.onShowElementalTableClick()) }),
"className": ["el-tag-clickable"].filter(Boolean).join(' '),
"tooltip": {text: "Ver tabela elemental", position: "top", className: '', showDelay: 0, hideDelay: 0, escape: true, disabled: false}}}></Render>
{interpolate([" ×"," "], [displayPipe("number", vm.dmg?.propertyMultiplier, ["1.0-2"], services)])}</Render></Render>
{kvPair({"label": "Pen.","cur": vm.dmg?.totalPene,"sim": vm.dmg2?.totalPene,"unit": "%","hidden": (vm.dmg?.totalPene === vm.dmg?.skillTotalPene)})}
{kvPair({"label": "Prec.","cur": vm.dmg?.accuracy,"sim": vm.dmg2?.accuracy,"unit": "%","hidden": (vm.dmg?.accuracy === vm.dmg?.skillAccuracy)})}</Render>
<Render tag="div" props={{"className": ["psec"].filter(Boolean).join(' ')}}>{"Dano"}</Render>
<Render tag="div" props={{"className": ["pstats one"].filter(Boolean).join(' ')}}><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Básico"}</Render>
<Render tag="span" props={{}}>{interpolate([" "," – "," "], [displayPipe("number", vm.dmg?.basicMinDamage, [], services),displayPipe("number", vm.dmg?.basicMaxDamage, [], services)])}
{(() => { const __condition99 = vm.isComparing;  return __condition99 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate([""," – ",""], [displayPipe("number", vm.dmg2?.basicMinDamage, [], services),displayPipe("number", vm.dmg2?.basicMaxDamage, [], services)])}</Render></></> : null; })()}</Render></Render>
{kvPair({"label": "Tx. Crít.","cur": vm.dmg?.criRateToMonster,"sim": vm.dmg2?.criRateToMonster,"unit": "%","panel": critRatePanel,"tip": "Ver como a taxa de crítico é calculada"})}
<Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Dano Crít."}</Render>
<Render tag="span" props={{}}>{interpolate([" "," – "," "], [displayPipe("number", vm.dmg?.criMinDamage, [], services),displayPipe("number", vm.dmg?.criMaxDamage, [], services)])}
{(() => { const __condition100 = vm.isComparing;  return __condition100 ? <><><Render tag="span" props={{"className": ["arr"].filter(Boolean).join(' ')}}>{"→"}</Render>
<Render tag="span" props={{"className": ["sim"].filter(Boolean).join(' ')}}>{interpolate([""," – ",""], [displayPipe("number", vm.dmg2?.criMinDamage, [], services),displayPipe("number", vm.dmg2?.criMaxDamage, [], services)])}</Render></></> : null; })()}</Render></Render>
{kvPair({"label": "DPS","cur": vm.dmg?.basicDps,"sim": vm.dmg2?.basicDps})}
{(() => { const __condition101 = ((vm.dmg?.effectedBasicDamageMin > 0) && vm.selectedChances?.length);  return __condition101 ? <><><Render tag="div" props={{"className": ["kv"].filter(Boolean).join(' ')}}><Render tag="span" props={{}}>{"Acionado Crít."}</Render>
<Render tag="span" props={{}}>{interpolate([""," – ",""], [displayPipe("number", vm.dmg?.effectedBasicCriDamageMin, [], services),displayPipe("number", vm.dmg?.effectedBasicCriDamageMax, [], services)])}</Render></Render>
{kvPair({"label": "DPS acionado","cur": vm.dmg?.effectedBasicDps,"sim": (vm.dmg2?.effectedBasicDps || vm.dmg2?.basicDps)})}</></> : null; })()}</Render>
{(() => { const __condition102 = (vm.showLeftWeapon && vm.model?.leftWeapon);  return __condition102 ? <><Render tag="div" props={{"className": ["hud-left-weapon-warn"].filter(Boolean).join(' ')}}>{"*** ATK da mão esquerda ainda não calculado"}</Render></> : null; })()}</Render>
<Render tag="app-battle-skill-details" props={{"breakdownClick": (event: any) => vm.action(() => { const $event = event; vm.showBonusBreakdownClick.emit($event) }),
"elementTableClick": (event: any) => vm.action(() => { const $event = event; vm.onShowElementalTableClick() }),
"reference": (value: any) => { sharedSkillDetails = value; vm["sharedSkillDetails"] = value; }}}></Render>
<Render tag="app-battle-damage-popovers" props={{"breakdownClick": (event: any) => vm.action(() => { const $event = event; vm.showBonusBreakdownClick.emit($event) }),
"reference": (value: any) => { sharedDamagePopovers = value; vm["sharedDamagePopovers"] = value; }}}></Render></>; })()}</Render></>; })()}</>;
}
