import { runFullMeasurement, validateConfig } from "./quantum.js";

const THRESHOLD = 1e-6;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatNumber(value, digits = 6) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "undefined";
  const rounded = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return rounded.toFixed(digits);
}

function simpleTable(headers, rows) {
  const wrapper = element("div", "table-wrap");
  const table = element("table");
  const thead = element("thead");
  const headRow = element("tr");
  headers.forEach((header) => headRow.append(element("th", null, header)));
  thead.append(headRow);
  const tbody = element("tbody");
  rows.forEach((row) => {
    const tr = element("tr");
    row.forEach((cell) => tr.append(element("td", null, String(cell))));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrapper.append(table);
  return wrapper;
}

function card(title, notes = []) {
  const section = element("section", "result-card");
  section.dataset.diagnosticAddon = "true";
  section.append(element("h3", null, title));
  notes.filter(Boolean).forEach((note) => section.append(element("p", "data-source-note", note)));
  return section;
}

function parseConfigInput() {
  const input = document.querySelector("#config-input");
  const raw = input?.value?.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") ?? "";
  if (!raw) return null;
  return JSON.parse(raw);
}

function findGateFlow(audit, gateName) {
  return (audit?.gate_flow ?? []).find((item) => item.gate === gateName);
}

function normalizeMergeCheck(config) {
  const checks = config?.encoder_notes?.merge_check;
  return Array.isArray(checks) ? checks : [];
}

function mergeStatus(claim, flow) {
  if (!flow) return "NO_GATE_FLOW";
  const sourceOk = flow.source_population_before > THRESHOLD;
  const targetOk = flow.target_population_before > THRESHOLD;
  return sourceOk && targetOk && flow.is_merge ? "MATCH" : sourceOk && !targetOk ? "TARGET_NOT_REACHED" : !sourceOk && targetOk ? "SOURCE_NOT_REACHED" : "BOTH_NOT_REACHED";
}

function renderMergeAudit(config, audit) {
  const claims = normalizeMergeCheck(config);
  const actualMerges = (audit?.gate_flow ?? []).filter((item) => item.is_merge);
  const section = card("K2. merge_check 照合 / 申告合流 vs 実測 gate_flow", [
    "AIが encoder_notes.merge_check で申告した合流点と、サイトが gate_flow で実測した合流点を照合します。",
    `判定閾値: source_population_before と target_population_before の両方が ${THRESHOLD} より大きい場合だけ、実測合流です。`,
  ]);

  section.append(simpleTable(
    ["申告gate", "source", "target", "source到達根拠", "target到達根拠", "実測source before", "実測target before", "照合"],
    claims.map((claim) => {
      const flow = findGateFlow(audit, claim.gate);
      return [
        claim.gate ?? "入力なし",
        claim.source ?? "入力なし",
        claim.target ?? "入力なし",
        claim.source_previously_reached_by ?? "入力なし",
        claim.target_previously_reached_by ?? "入力なし",
        formatNumber(flow?.source_population_before, 8),
        formatNumber(flow?.target_population_before, 8),
        mergeStatus(claim, flow),
      ];
    }),
  ));

  section.append(simpleTable(
    ["実測merge gate", "source", "target", "source before", "target before", "flag"],
    actualMerges.map((flow) => [
      flow.gate,
      flow.source ?? "入力なし",
      flow.target ?? "入力なし",
      formatNumber(flow.source_population_before, 8),
      formatNumber(flow.target_population_before, 8),
      flow.flag,
    ]),
  ));

  const claimCount = claims.length;
  const actualCount = actualMerges.length;
  const verdict = element("div", claimCount === actualCount && claims.every((claim) => mergeStatus(claim, findGateFlow(audit, claim.gate)) === "MATCH") ? "notice privacy" : "notice warning");
  verdict.append(element("strong", null, claimCount === actualCount ? "merge_check 照合" : "merge_check 不一致"));
  verdict.append(element("p", null, `申告 ${claimCount} 箇所 / 実測 ${actualCount} 箇所。MATCH 以外がある場合、その合流は意味上の統合であって、回路上の合流ではありません。`));
  section.append(verdict);

  return section;
}

function strengthLabel(strength) {
  if (!Number.isFinite(strength)) return "UNKNOWN";
  if (strength < 1) return "TOO_WEAK";
  if (strength < 2) return "AUXILIARY";
  if (strength <= 5) return "MAIN_RANGE";
  return "VERY_STRONG";
}

function strengthGuidance(label) {
  return {
    TOO_WEAK: "補助枝向け。全体をこの強度にすると初期成分に残りやすい。",
    AUXILIARY: "弱めの補助流。主経路だけで使うと後半が細りやすい。",
    MAIN_RANGE: "主要な流れに使いやすい範囲。",
    VERY_STRONG: "強い転換。sourceを使い切りやすいので同じsourceからの後続分岐に注意。",
    UNKNOWN: "数値なし。",
  }[label] ?? "";
}

function renderStrengthAudit(config, result, audit) {
  const gates = Array.isArray(config?.gates) ? config.gates : [];
  const flowByGate = new Map((audit?.gate_flow ?? []).map((item) => [item.gate, item]));
  const maxProb = Math.max(...Object.values(result?.probabilities ?? { x: 0 }));
  const topLabel = Object.entries(result?.probabilities ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "入力なし";
  const initialResidue = result?.probabilities?.[config?.initial] ?? null;
  const initialDominates = Number.isFinite(initialResidue) && initialResidue >= 0.7 && initialResidue === maxProb;

  const section = card("K3. 強度設計監査 / strength design", [
    "strength は物語上の重要度ではなく、回路上の流量を決めます。弱すぎると後半に届かず、強すぎるとsourceを使い切ります。",
    "目安: 主要流は strength 2〜5、補助枝は 0.5〜1.5、強い転換は 5超。ただし実測 gate_flow と最終確率で必ず確認します。",
  ]);

  section.append(simpleTable(
    ["gate", "strength", "theta", "分類", "source before", "target before", "flag", "注意"],
    gates.map((gate) => {
      const flow = flowByGate.get(gate.name);
      const label = strengthLabel(gate.strength);
      return [
        gate.name,
        formatNumber(gate.strength, 3),
        formatNumber(gate.theta, 4),
        label,
        formatNumber(flow?.source_population_before, 8),
        formatNumber(flow?.target_population_before, 8),
        flow?.flag ?? "入力なし",
        strengthGuidance(label),
      ];
    }),
  ));

  const verdict = element("div", initialDominates ? "notice warning" : "notice privacy");
  verdict.append(element("strong", null, initialDominates ? "初期成分に残りすぎています" : "強度設計メモ"));
  verdict.append(element(
    "p",
    null,
    initialDominates
      ? `最終確率の最大が initial (${config.initial}) = ${formatNumber(initialResidue, 4)} です。主経路が弱く、後半の物語が測定結果に出にくい可能性があります。主要ゲートを strength 2〜5 に上げるか、前半の流量配分を見直してください。`
      : `最終トップは ${topLabel}、initial 残留は ${formatNumber(initialResidue, 4)} です。弱すぎ/強すぎは K. Gate flow と合わせて確認してください。`,
  ));
  section.append(verdict);

  return section;
}

function injectDiagnostics() {
  const output = document.querySelector("#result-content");
  if (!output || !output.children.length) return;
  output.querySelectorAll('[data-diagnostic-addon="true"]').forEach((node) => node.remove());

  let config;
  try {
    config = parseConfigInput();
    if (!config) return;
    validateConfig(config);
  } catch {
    return;
  }

  const measurement = runFullMeasurement(config);
  const { result, audit } = measurement;
  const flowCard = Array.from(output.querySelectorAll("section.result-card")).find((section) => section.textContent.includes("K. Gate flow"));
  const insertAfter = flowCard ?? output.querySelector("section.result-card:last-of-type");
  if (!insertAfter) return;

  const mergeAudit = renderMergeAudit(config, audit);
  const strengthAudit = renderStrengthAudit(config, result, audit);
  insertAfter.after(mergeAudit, strengthAudit);
}

const measureButton = document.querySelector("#measure-button");
if (measureButton) {
  measureButton.addEventListener("click", () => setTimeout(injectDiagnostics, 0));
}
