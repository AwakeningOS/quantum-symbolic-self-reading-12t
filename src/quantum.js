export const BASIS = ["a0", "a1", "a2", "b0", "b1", "b2", "c0", "c1", "c2", "d0", "d1", "d2"];

export const digitsOf = (i) => ({ q1: Math.floor(i / 6), q2: Math.floor(i / 3) % 2, t3: i % 3 });

export const AXIS_LABELS = {
  general: {
    subject_axis: { "0": "当事 (a*,b*)", "1": "世界 (c*,d*)" },
    manifestation_axis: { "0": "潜在 (a*,c*)", "1": "顕在 (b*,d*)" },
    time_axis: { "0": "過去 (*0)", "1": "現在 (*1)", "2": "未来 (*2)" },
    components: { a0: "淵源", a1: "胸中", a2: "志向", b0: "来歴", b1: "所作", b2: "企図", c0: "慣性", c1: "気運", c2: "胎動", d0: "帰結", d1: "眼前", d2: "予兆" },
    definitions: {
      a0: "埋もれた願い・傷・記憶・原点",
      a1: "いま胸の内で動いている感触・想い",
      a2: "まだ形なき願いの向かう先・予感・憧れ",
      b0: "積み重ねてきた生き方・実績・習慣",
      b1: "いま現に行っているふるまい・対応",
      b2: "立ち上げつつある計画・宣言・次の一歩",
      c0: "世界を縛ってきた因習・規範・構造",
      c1: "いま場に働いている見えない流れ・空気",
      c2: "まだ見えない趨勢・新しい秩序の芽",
      d0: "過去から届いた出来事・結果・報い",
      d1: "いま目の前で起きている出来事・相手の言動",
      d2: "先から呼ぶ出来事・機会・招き",
    },
  },
  seeker: {
    subject_axis: { "0": "個我 (a*,b*)", "1": "超越 (c*,d*)" },
    manifestation_axis: { "0": "非顕現 (a*,c*)", "1": "顕現 (b*,d*)" },
    time_axis: { "0": "過去 (*0)", "1": "現在 (*1)", "2": "未来 (*2)" },
    components: { a0: "宿縁", a1: "観照", a2: "召命", b0: "遍歴", b1: "行持", b2: "新生", c0: "伝灯", c1: "臨在", c2: "黎明", d0: "加護", d1: "示現", d2: "来迎" },
    definitions: {
      a0: "魂が過去から携えてきた渇き・古い傷・因縁・未完の課題",
      a1: "いま気づいている・見つめている意識",
      a2: "魂が呼ばれている先・使命の予感・霊的な憧れ",
      b0: "これまで歩んできた世俗の道のり・生活・仕事・習い",
      b1: "いま行われている実践・祈り・営み",
      b2: "目覚めの後に立ち上がりつつある新しい生き方",
      c0: "先人から受け渡されてきた真理・教え・聖典・師",
      c1: "真理・神性がいまここに在るという感覚",
      c2: "まだ開示されていない真理の兆し",
      d0: "これまで与えられてきた導き・守り・巡り合わせ",
      d1: "いま現に現れている導き・徴・出来事",
      d2: "先から訪れる恩寵・光の体験・召しの出来事",
    },
  },
};

export function complex(re = 0, im = 0) {
  return { re, im };
}

export const add = (z1, z2) => complex(z1.re + z2.re, z1.im + z2.im);
export const sub = (z1, z2) => complex(z1.re - z2.re, z1.im - z2.im);
export const mul = (z1, z2) => complex(z1.re * z2.re - z1.im * z2.im, z1.re * z2.im + z1.im * z2.re);
export const scale = (z, s) => complex(z.re * s, z.im * s);
export const abs2 = (z) => z.re * z.re + z.im * z.im;
export const phase = (z) => (abs2(z) < 1e-30 ? null : Math.atan2(z.im, z.re));
export const expI = (phi) => complex(Math.cos(phi), Math.sin(phi));

export function basisIndex(label) {
  return BASIS.indexOf(label);
}

export function initialState(label) {
  const index = basisIndex(label);
  if (index < 0) throw new Error("initial は12T基底ラベルのいずれかにしてください。");
  return BASIS.map((_, i) => complex(i === index ? 1 : 0, 0));
}

export function pairRotation(state, source, target, theta, phi) {
  const i = basisIndex(source);
  const j = basisIndex(target);
  if (i < 0 || j < 0) throw new Error("gate の source/target は12T基底ラベルにしてください。");
  if (i === j) throw new Error("gate の source と target は異なる成分にしてください。");
  const next = state.map((z) => complex(z.re, z.im));
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  next[i] = sub(scale(state[i], c), scale(mul(expI(-phi), state[j]), s));
  next[j] = add(scale(mul(expI(phi), state[i]), s), scale(state[j], c));
  return next;
}

export function applyGates(state, gates) {
  return gates.reduce(
    (current, gate) => pairRotation(current, gate.source, gate.target, gate.theta, gate.phi),
    state.map((z) => complex(z.re, z.im)),
  );
}

export function probabilities(state) {
  return Object.fromEntries(BASIS.map((label, i) => [label, abs2(state[i])]));
}

export function rankComponents(values) {
  return BASIS.map((label, index) => ({ label, index, value: values[label] }))
    .sort((left, right) => right.value - left.value || left.index - right.index)
    .map(({ label }) => label);
}

export function phases(state) {
  return Object.fromEntries(BASIS.map((label, i) => [label, phase(state[i])]));
}

export function relativePhases(state) {
  const componentPhases = phases(state);
  const result = {};
  for (let i = 0; i < BASIS.length; i += 1) {
    for (let j = i + 1; j < BASIS.length; j += 1) {
      const left = componentPhases[BASIS[i]];
      const right = componentPhases[BASIS[j]];
      result[`${BASIS[i]}-${BASIS[j]}`] = left === null || right === null ? null : wrapPhase(left - right);
    }
  }
  return result;
}

function wrapPhase(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

export function alignmentScores(state) {
  const componentPhases = phases(state);
  const magnitudes = state.map((z) => Math.sqrt(abs2(z)));
  const result = {};
  for (let i = 0; i < BASIS.length; i += 1) {
    for (let j = i + 1; j < BASIS.length; j += 1) {
      const key = `${BASIS[i]}-${BASIS[j]}`;
      result[key] = componentPhases[BASIS[i]] === null || componentPhases[BASIS[j]] === null
        ? 0
        : magnitudes[i] * magnitudes[j] * Math.cos(componentPhases[BASIS[i]] - componentPhases[BASIS[j]]);
    }
  }
  return result;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleCounts(values, shots, seed) {
  const counts = Object.fromEntries(BASIS.map((label) => [label, 0]));
  if (!Number.isInteger(shots) || shots <= 0) return counts;
  const random = mulberry32(Number.isInteger(seed) ? seed : 0);
  const cumulative = [];
  let sum = 0;
  for (const label of BASIS) {
    sum += values[label];
    cumulative.push(sum);
  }
  for (let shot = 0; shot < shots; shot += 1) {
    const draw = random();
    const index = cumulative.findIndex((limit) => draw < limit);
    counts[BASIS[index < 0 ? BASIS.length - 1 : index]] += 1;
  }
  return counts;
}

export function traceGateEffects(startState, gates) {
  const trace = [];
  let state = startState.map((z) => complex(z.re, z.im));
  gates.forEach((gate, index) => {
    const before = probabilities(state);
    state = pairRotation(state, gate.source, gate.target, gate.theta, gate.phi);
    const after = probabilities(state);
    trace.push({
      step: index + 1,
      gate: gate.name,
      source: gate.source,
      target: gate.target,
      before,
      after,
      time_entropy_after: analyzeEntanglement12(state).axis_entropies_bits.time,
      delta: Object.fromEntries(BASIS.map((label) => [label, after[label] - before[label]])),
    });
  });
  return trace;
}

function measureWithGates(config, gates) {
  const state = applyGates(initialState(config.initial), gates);
  const values = probabilities(state);
  const ranking = rankComponents(values);
  return { state, probabilities: values, ranking, primary: ranking[0], secondary: ranking[1] };
}

function maxProbabilityDelta(left, right) {
  return Math.max(...BASIS.map((label) => Math.abs(left[label] - right[label])));
}

function sensitivity(delta) {
  if (delta < 0.1) return "LOW";
  if (delta < 0.3) return "MEDIUM";
  return "HIGH";
}

function rankingMatchesExpected(observed, expected) {
  return expected.length > 0
    ? expected.every((label, index) => observed[index] === label)
    : null;
}

function top3SetMatches(observed, expected) {
  if (expected.length < 3) return null;
  const expectedTop3 = new Set(expected.slice(0, 3));
  return observed.slice(0, 3).every((label) => expectedTop3.has(label));
}

function probabilitiesFromCounts(counts, shots) {
  if (!counts || !Number.isInteger(shots) || shots <= 0) return null;
  return Object.fromEntries(BASIS.map((label) => [label, counts[label] / shots]));
}

function summarizeSourceText(sourceText, maxLength = 320) {
  if (typeof sourceText !== "string") return "";
  const compact = sourceText.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}…`;
}

export function runGateAblation(config) {
  const baseline = measureWithGates(config, config.gates);
  return config.gates.map((gate, removedIndex) => {
    const measured = measureWithGates(config, config.gates.filter((_, index) => index !== removedIndex));
    const l1Difference = BASIS.reduce(
      (sum, label) => sum + Math.abs(measured.probabilities[label] - baseline.probabilities[label]),
      0,
    );
    return {
      removed_index: removedIndex,
      removed_gate: gate.name,
      primary: measured.primary,
      secondary: measured.secondary,
      probabilities: measured.probabilities,
      time_entropy: analyzeEntanglement12(measured.state).axis_entropies_bits.time,
      l1_difference: l1Difference,
    };
  });
}

export function runOrderSensitivity(config) {
  const baseline = measureWithGates(config, config.gates);
  return config.gates.slice(0, -1).map((gate, index) => {
    const swapped = config.gates.slice();
    [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
    const measured = measureWithGates(config, swapped);
    const delta = maxProbabilityDelta(measured.probabilities, baseline.probabilities);
    return {
      swap_steps: [index + 1, index + 2],
      swapped_gates: [gate.name, config.gates[index + 1].name],
      primary: measured.primary,
      secondary: measured.secondary,
      probabilities: measured.probabilities,
      max_probability_delta: delta,
      sensitivity: sensitivity(delta),
    };
  });
}

export function runPhaseSensitivity(config) {
  const baseline = measureWithGates(config, config.gates);
  const testedPhases = [0, Math.PI / 2, Math.PI];
  return config.gates.flatMap((gate, gateIndex) => testedPhases.map((testedPhi) => {
    const changed = config.gates.map((item, index) => index === gateIndex ? { ...item, phi: testedPhi } : item);
    const measured = measureWithGates(config, changed);
    const delta = maxProbabilityDelta(measured.probabilities, baseline.probabilities);
    return {
      gate_index: gateIndex,
      gate: gate.name,
      original_phi: gate.phi,
      tested_phi: testedPhi,
      primary: measured.primary,
      secondary: measured.secondary,
      probabilities: measured.probabilities,
      max_probability_delta: delta,
      sensitivity: sensitivity(delta),
    };
  }));
}

export function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("config はJSONオブジェクトにしてください。");
  const legacyLabels = new Set(["a", "b", "c", "d"]);
  const labels = [config.initial, ...(config.gates ?? []).flatMap((gate) => [gate.source, gate.target])];
  if (labels.some((label) => legacyLabels.has(label))) throw new Error("この config は2ビット形式です。このリポジトリは12T専用です。");
  const labelFields = [config.initial, ...labels, ...Object.keys(config.component_meanings ?? {}), ...(config.expected_reading?.ranking ?? [])];
  const usesOnly3qLabels = labelFields.some(Boolean)
    && labelFields.every((label) => typeof label !== "string" || /^(a|b|c|d)[01]$/.test(label));
  if (usesOnly3qLabels && !labelFields.some((label) => typeof label === "string" && /^(a|b|c|d)2$/.test(label))) {
    throw new Error("これは3q(8状態)形式です。12t では時間相が3値(0=過去/1=現在/2=未来)です。");
  }
  if (config.schema_version !== "12t-1.0") throw new Error('schema_version は "12t-1.0" にしてください。');
  if (basisIndex(config.initial) < 0) throw new Error("initial は12T基底ラベルにしてください。");
  if (!Array.isArray(config.gates) || config.gates.length === 0) throw new Error("gates が空です。");
  if (config.shots !== undefined && (!Number.isInteger(config.shots) || config.shots <= 0)) throw new Error("shots は正の整数にしてください。");
  if (config.seed !== undefined && !Number.isInteger(config.seed)) throw new Error("seed は整数にしてください。");
  config.gates.forEach((gate, index) => {
    if (basisIndex(gate.source) < 0 || basisIndex(gate.target) < 0) throw new Error(`gate ${index + 1} の source/target は12T基底ラベルにしてください。`);
    if (gate.source === gate.target) throw new Error(`gate ${index + 1} の source と target は異なる成分にしてください。`);
    if (![gate.theta, gate.phi, gate.strength].every(Number.isFinite)) throw new Error(`gate ${index + 1} の theta/phi/strength は数値にしてください。`);
  });
  const ranking = config.expected_reading?.ranking;
  if (ranking !== undefined && (!Array.isArray(ranking) || ranking.length !== BASIS.length || new Set(ranking).size !== BASIS.length || ranking.some((label) => basisIndex(label) < 0))) {
    throw new Error("expected_reading.ranking は12ラベルの全順位にしてください。");
  }
  if (config.component_meanings !== undefined && (typeof config.component_meanings !== "object" || BASIS.some((label) => typeof config.component_meanings[label] !== "string"))) {
    throw new Error("component_meanings は12ラベル全ての文字列を含めてください。");
  }
  return true;
}

export function makeAiInterpretationJson(result, audit = {}) {
  const diagnosticSections = {
    gate_trace: Array.isArray(audit.gate_trace) ? audit.gate_trace : null,
    ablation: Array.isArray(audit.ablation) ? audit.ablation : null,
    order_sensitivity: Array.isArray(audit.order_sensitivity) ? audit.order_sensitivity : null,
    phase_sensitivity: Array.isArray(audit.phase_sensitivity) ? audit.phase_sensitivity : null,
    gate_resonance: Array.isArray(audit.gate_resonance) ? audit.gate_resonance : null,
    gate_flow: Array.isArray(audit.gate_flow) ? audit.gate_flow : null,
  };
  const sectionsPresent = Object.fromEntries(
    Object.entries(diagnosticSections).map(([key, value]) => [key, value !== null]),
  );
  return {
    input_type: "measurement_result",
    schema_version: "ai_interpretation_12t_v1",
    name: result.name,
    description: result.description,
    mode_profile: result.mode_profile,
    source_text_summary: result.source_text_summary ?? "",
    component_meanings: result.component_meanings ?? {},
    life_question: result.life_question,
    expected_reading_full: result.expected_reading_full,
    gates_summary: result.gates_summary,
    gate_resonance: Array.isArray(audit.gate_resonance) ? audit.gate_resonance : null,
    gate_flow: Array.isArray(audit.gate_flow) ? audit.gate_flow : null,
    encoding_health: audit.encoding_health ?? null,
    tensor_structure: result.tensor_structure,
    entanglement12: result.entanglement12,
    projected_2bit: result.projected_2bit,
    classical_controls: result.classical_controls,
    probability_source: result.probability_source,
    count_source: result.count_source,
    shots: result.shots,
    seed: result.seed,
    probabilities: result.probabilities,
    sampled_counts: result.sampled_counts,
    sampled_probabilities: result.sampled_probabilities,
    observed_ranking_from_probabilities: result.observed_ranking_from_probabilities,
    observed_ranking_from_counts: result.observed_ranking_from_counts,
    expected_ranking: result.expected_ranking,
    ranking_match_expected_from_probabilities: result.ranking_match_expected_from_probabilities,
    ranking_match_expected_from_counts: result.ranking_match_expected_from_counts,
    ranking_match_top3: result.ranking_match_top3,
    sections_present: sectionsPresent,
    ...Object.fromEntries(Object.entries(diagnosticSections).filter(([, value]) => value !== null)),
    anti_hallucination_instructions: [
      "Do not invent probabilities, counts, rankings, L1 distances, gate effects, or sensitivities.",
      "Use only values present in this JSON.",
      "expected_ranking is a hypothesis, not an observed result.",
      "probabilities and sampled_probabilities are different fields.",
      "If a section is absent, say 入力なし.",
      "binding_label / axis_entropies_bits / time_populations / presence_spectrum / projected_2bit はサイトが計算した値である。再計算・再分類しない。",
      "phase_dependence_level / interference_gap_level はサイトの閾値判定であり、AIが独自の閾値で再判定しない。",
      "phase_dependence と interference_gap が両方 LOW の場合、『この物語の量子的構造(位相・干渉)は結果に寄与していない』と明示的に述べること。",
      "gate_resonance の resonance_label と resonance_ratio はサイトが計算した値である。AIが即時効果と反実仮想重みから独自にラベルを再判定しない。",
      "gates_summary の meaning と phi_label はエンコーダとサイトが付与した意味情報である。存在しないゲートや意味を創作しない。",
      "gate_flow の flag と encoding_health はサイトの判定である。NO_OP / SOURCE_EMPTY のゲートの meaning を根拠に構造的主張を組み立てない。",
    ],
    safety_notice: "この結果は霊的真実・医学的事実・人生診断を証明するものではなく、象徴回路の出力を自己理解のために読むものです。",
  };
}

export function reducedDensityQubit(state, which) {
  const rho = [[complex(), complex()], [complex(), complex()]];
  for (let i = 0; i < 12; i += 1) {
    for (let j = 0; j < 12; j += 1) {
      const di = digitsOf(i), dj = digitsOf(j);
      const same = which === "subject"
        ? di.q2 === dj.q2 && di.t3 === dj.t3
        : di.q1 === dj.q1 && di.t3 === dj.t3;
      if (!same) continue;
      const x = which === "subject" ? di.q1 : di.q2;
      const y = which === "subject" ? dj.q1 : dj.q2;
      const re = state[i].re * state[j].re + state[i].im * state[j].im;
      const im = state[i].im * state[j].re - state[i].re * state[j].im;
      rho[x][y] = complex(rho[x][y].re + re, rho[x][y].im + im);
    }
  }
  return rho;
}

export function reducedDensityTime(state) {
  const rho = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => complex()));
  for (let i = 0; i < 12; i += 1) for (let j = 0; j < 12; j += 1) {
    const di = digitsOf(i), dj = digitsOf(j);
    if (di.q1 !== dj.q1 || di.q2 !== dj.q2) continue;
    const re = state[i].re * state[j].re + state[i].im * state[j].im;
    const im = state[i].im * state[j].re - state[i].re * state[j].im;
    rho[di.t3][dj.t3] = complex(rho[di.t3][dj.t3].re + re, rho[di.t3][dj.t3].im + im);
  }
  return rho;
}

export function eig3Hermitian(r) {
  const q = (r[0][0].re + r[1][1].re + r[2][2].re) / 3;
  const A = r.map((row, i) => row.map((x, j) => i === j ? sub(x, complex(q, 0)) : x));
  let p2 = 0;
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) p2 += abs2(A[i][j]);
  const p = Math.sqrt(p2 / 6);
  if (p < 1e-14) return [q, q, q];
  const B = A.map((row) => row.map((x) => complex(x.re / p, x.im / p)));
  const det = add(
    sub(mul(B[0][0], sub(mul(B[1][1], B[2][2]), mul(B[1][2], B[2][1]))), mul(B[0][1], sub(mul(B[1][0], B[2][2]), mul(B[1][2], B[2][0])))),
    mul(B[0][2], sub(mul(B[1][0], B[2][1]), mul(B[1][1], B[2][0]))),
  );
  const rawR = det.re / 2;
  const rr = Math.abs(Math.abs(rawR) - 1) < 1e-14 ? Math.sign(rawR) : Math.max(-1, Math.min(1, rawR));
  const phi = Math.acos(rr) / 3;
  return [q + 2 * p * Math.cos(phi), q + 2 * p * Math.cos(phi + 2 * Math.PI / 3), q + 2 * p * Math.cos(phi + 4 * Math.PI / 3)];
}

export const vnEntropy = (evs) => evs.reduce((s, l) => l > 1e-15 ? s - l * Math.log2(l) : s, 0);

export function analyzeEntanglement12(state) {
  const rS = reducedDensityQubit(state, "subject");
  const rM = reducedDensityQubit(state, "manifestation");
  const rT = reducedDensityTime(state);
  const eig2 = (r) => {
    const tr = r[0][0].re + r[1][1].re;
    const d = Math.sqrt(Math.max(0, (r[0][0].re - r[1][1].re) ** 2 / 4 + abs2(r[0][1])));
    return [tr / 2 + d, tr / 2 - d];
  };
  const sSubject = vnEntropy(eig2(rS));
  const sManifestation = vnEntropy(eig2(rM));
  const sTime = vnEntropy(eig3Hermitian(rT));
  const LOG2_3 = Math.log2(3);
  const bound = (sSubject + sManifestation + sTime / LOG2_3) / 3;
  const bindingLabel = bound < 0.1 ? "SEPARABLE_LIKE" : bound < 0.4 ? "WEAKLY_BOUND" : bound < 0.7 ? "STRONGLY_BOUND" : "NEAR_MAXIMAL_BOUND";
  return {
    axis_entropies_bits: { subject: sSubject, manifestation: sManifestation, time: sTime },
    axis_entropy_max: { subject: 1, manifestation: 1, time: LOG2_3 },
    binding_normalized: bound,
    binding_label: bindingLabel,
    time_populations: { past: rT[0][0].re, now: rT[1][1].re, future: rT[2][2].re },
    presence_spectrum: { past_now: 2 * Math.sqrt(abs2(rT[0][1])), now_future: 2 * Math.sqrt(abs2(rT[1][2])), past_future: 2 * Math.sqrt(abs2(rT[0][2])) },
    bloch_z: { subject: rS[0][0].re - rS[1][1].re, manifestation: rM[0][0].re - rM[1][1].re },
  };
}

function axisPopulations(values) {
  const sum = (labels) => labels.reduce((total, label) => total + values[label], 0);
  return {
    subject_side: sum(["a0", "a1", "a2", "b0", "b1", "b2"]),
    world_side: sum(["c0", "c1", "c2", "d0", "d1", "d2"]),
    latent_side: sum(["a0", "a1", "a2", "c0", "c1", "c2"]),
    manifest_side: sum(["b0", "b1", "b2", "d0", "d1", "d2"]),
    past_side: sum(["a0", "b0", "c0", "d0"]),
    now_side: sum(["a1", "b1", "c1", "d1"]),
    future_side: sum(["a2", "b2", "c2", "d2"]),
  };
}

function projected2bit(values) {
  const projected = Object.fromEntries(["a", "b", "c", "d"].map((label) => [label, values[`${label}0`] + values[`${label}1`] + values[`${label}2`]]));
  return {
    probabilities: projected,
    ranking: Object.entries(projected).sort((left, right) => right[1] - left[1]).map(([label]) => label),
    note: "時間軸を周辺化した2ビット視点。",
  };
}

export function runClassicalMarkov(config) {
  const p = Array(BASIS.length).fill(0);
  p[basisIndex(config.initial)] = 1;
  for (const gate of config.gates) {
    const i = basisIndex(gate.source);
    const j = basisIndex(gate.target);
    const c2 = Math.cos(gate.theta) ** 2;
    const s2 = Math.sin(gate.theta) ** 2;
    const pi = p[i];
    const pj = p[j];
    p[i] = c2 * pi + s2 * pj;
    p[j] = s2 * pi + c2 * pj;
  }
  return Object.fromEntries(BASIS.map((label, k) => [label, p[k]]));
}

function l1Distance(left, right) {
  return BASIS.reduce((sum, label) => sum + Math.abs(left[label] - right[label]), 0);
}

export function runClassicalControls(config, quantumProbabilities) {
  const phiZeroGates = config.gates.map((gate) => ({ ...gate, phi: 0 }));
  const phiZeroProbabilities = probabilities(applyGates(initialState(config.initial), phiZeroGates));
  const classicalProbabilities = runClassicalMarkov(config);
  const phaseDependence = l1Distance(quantumProbabilities, phiZeroProbabilities);
  const interferenceGap = l1Distance(quantumProbabilities, classicalProbabilities);
  return {
    phi_zero_probabilities: phiZeroProbabilities,
    classical_markov_probabilities: classicalProbabilities,
    phase_dependence: phaseDependence,
    phase_dependence_level: sensitivity(phaseDependence),
    interference_gap: interferenceGap,
    interference_gap_level: sensitivity(interferenceGap),
    note: "phase_dependence: 全ゲートphi=0との確率L1距離。interference_gap: 干渉なし古典マルコフ遷移との確率L1距離。両方LOWなら、このconfigに複素振幅を使う経験的正当性は弱い。",
  };
}

export function phiLabel(phi) {
  const wrapped = Math.atan2(Math.sin(phi), Math.cos(phi));
  const candidates = [
    [0, "同位相(受容・同調)"],
    [Math.PI / 2, "直交(葛藤・未統合)"],
    [-Math.PI / 2, "折返し(反転的気づき)"],
  ];
  let best = ["逆位相(反転・拒絶)", Math.min(Math.abs(wrapped - Math.PI), Math.abs(wrapped + Math.PI))];
  for (const [anchor, label] of candidates) {
    const distance = Math.abs(wrapped - anchor);
    if (distance < best[1]) best = [label, distance];
  }
  return best[1] <= 0.3 ? best[0] : "中間位相";
}

export function computeGateResonance(gateTrace, ablation, gatesSummary) {
  return gateTrace.map((step, index) => {
    const immediate = Object.values(step.delta).reduce((s, v) => s + Math.abs(v), 0);
    const weight = ablation[index].l1_difference;
    let ratio = null;
    let label;
    if (immediate < 0.02) {
      label = weight >= 0.1 ? "DORMANT_BUT_STRUCTURAL" : "NEGLIGIBLE";
    } else {
      ratio = weight / immediate;
      if (weight < 0.15) label = "MINOR";
      else if (ratio >= 1.5 && immediate < 0.4) label = "QUIET_SEED";
      else if (ratio >= 1.5) label = "AMPLIFIED";
      else if (ratio <= 0.6 && immediate >= 0.2) label = "WASHED_OUT";
      else label = "PROPORTIONATE";
    }
    return {
      gate: step.gate,
      meaning: gatesSummary[index]?.meaning ?? "",
      immediate_effect: immediate,
      counterfactual_weight: weight,
      resonance_ratio: ratio,
      resonance_label: label,
    };
  });
}

export function computeGateFlow(gateTrace, gatesSummary) {
  return gateTrace.map((step, index) => {
    const srcBefore = step.before[step.source];
    const tgtBefore = step.before[step.target];
    const immediate = Object.values(step.delta).reduce((sum, value) => sum + Math.abs(value), 0);
    let flag = "NORMAL";
    if (immediate < 1e-9) flag = "NO_OP";
    else if (srcBefore < 1e-6 && tgtBefore > 1e-6) flag = "SOURCE_EMPTY";
    return {
      gate: step.gate,
      meaning: gatesSummary[index]?.meaning ?? "",
      source_population_before: srcBefore,
      target_population_before: tgtBefore,
      flag,
    };
  });
}

export function encodingHealth(gateFlow) {
  const issues = gateFlow.filter((gate) => gate.flag !== "NORMAL").length;
  if (issues === 0) return "HEALTHY";
  if (issues <= 2) return "DEGRADED";
  return "COMPROMISED";
}

export function runFullMeasurement(config) {
  validateConfig(config);
  const start = initialState(config.initial);
  const finalState = applyGates(start, config.gates);
  const finalProbabilities = probabilities(finalState);
  const ranking = rankComponents(finalProbabilities);
  const expectedRanking = Array.isArray(config.expected_reading?.ranking)
    ? config.expected_reading.ranking
    : [config.expected_reading?.primary, config.expected_reading?.secondary].filter(Boolean);
  const sampledCounts = config.shots ? sampleCounts(finalProbabilities, config.shots, config.seed ?? 0) : null;
  const sampledProbabilities = probabilitiesFromCounts(sampledCounts, config.shots);
  const rankingFromCounts = sampledCounts ? rankComponents(sampledCounts) : null;
  const expectedMatch = rankingMatchesExpected(ranking, expectedRanking);
  const expectedMatchFromCounts = rankingFromCounts
    ? rankingMatchesExpected(rankingFromCounts, expectedRanking)
    : null;
  const componentPhases = phases(finalState);
  const entanglement12 = analyzeEntanglement12(finalState);
  entanglement12.axis_populations = axisPopulations(finalProbabilities);
  const projected = projected2bit(finalProbabilities);
  const classicalControls = runClassicalControls(config, finalProbabilities);
  const profile = config.mode_profile === "seeker" ? "seeker" : "general";
  const result = {
    schema_version: "12t-1.0",
    name: config.name ?? "unnamed",
    description: config.description ?? "",
    mode_profile: profile,
    source_text_summary: summarizeSourceText(config.source_text),
    mode: config.mode ?? "process",
    initial: config.initial,
    basis: BASIS,
    tensor_structure: {
      profile,
      subject_axis: AXIS_LABELS[profile].subject_axis,
      manifestation_axis: AXIS_LABELS[profile].manifestation_axis,
      time_axis: AXIS_LABELS[profile].time_axis,
      component_labels: AXIS_LABELS[profile].components,
      component_definitions: AXIS_LABELS[profile].definitions,
      mixed_radix_mapping: "index = 6*q1 + 3*q2 + t3",
    },
    entanglement12,
    projected_2bit: projected,
    classical_controls: classicalControls,
    expected_ranking: expectedRanking,
    observed_ranking: ranking,
    expected_match: expectedMatch,
    observed_ranking_from_probabilities: ranking,
    observed_ranking_from_counts: rankingFromCounts,
    ranking_match_expected_from_probabilities: expectedMatch,
    ranking_match_expected_from_counts: expectedMatchFromCounts,
    ranking_match_top3: top3SetMatches(ranking, expectedRanking),
    probability_source: "statevector",
    count_source: "seeded_sampling",
    probabilities: finalProbabilities,
    shots: config.shots ?? null,
    seed: config.seed ?? null,
    counts: sampledCounts,
    sampled_counts: sampledCounts,
    sampled_probabilities: sampledProbabilities,
    final_statevector: Object.fromEntries(BASIS.map((label, index) => [label, finalState[index]])),
    norm: finalState.reduce((sum, z) => sum + abs2(z), 0),
    phases: Object.fromEntries(BASIS.map((label) => [label, {
      radians: componentPhases[label],
      degrees: componentPhases[label] === null ? null : componentPhases[label] * 180 / Math.PI,
    }])),
    relative_phases: Object.fromEntries(Object.entries(relativePhases(finalState)).map(([key, radians]) => [key, {
      radians,
      degrees: radians === null ? null : radians * 180 / Math.PI,
    }])),
    alignment: alignmentScores(finalState),
    component_meanings: config.component_meanings ?? {},
    life_question: typeof config.life_question === "string" ? config.life_question : null,
    expected_reading_full: {
      ranking: expectedRanking,
      pattern: config.expected_reading?.pattern ?? null,
      notes: config.expected_reading?.notes ?? null,
    },
    gates_summary: config.gates.map((gate) => ({
      name: gate.name,
      source: gate.source,
      target: gate.target,
      strength: gate.strength,
      theta: gate.theta,
      phi: gate.phi,
      phi_label: phiLabel(gate.phi),
      meaning: typeof gate.meaning === "string" ? gate.meaning : "",
    })),
  };
  const auditGateTrace = traceGateEffects(start, config.gates);
  const auditAblation = runGateAblation(config);
  const gateResonance = computeGateResonance(auditGateTrace, auditAblation, result.gates_summary);
  const gateFlow = computeGateFlow(auditGateTrace, result.gates_summary);
  const audit = {
    schema_version: "12t-1.0",
    measurement: result,
    gate_trace: auditGateTrace,
    ablation: auditAblation,
    gate_resonance: gateResonance,
    gate_flow: gateFlow,
    encoding_health: encodingHealth(gateFlow),
    order_sensitivity: runOrderSensitivity(config),
    phase_sensitivity: runPhaseSensitivity(config),
    notice: "This is a mathematical expansion of a symbolic circuit configuration, not proof of spiritual truth, medical fact, or an absolute life diagnosis.",
  };
  const aiInterpretation = makeAiInterpretationJson(result, audit);
  return { result, audit, aiInterpretation };
}
