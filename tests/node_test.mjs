import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BASIS, analyzeEntanglement12, applyGates, initialState, probabilities,
  runFullMeasurement, validateConfig,
} from "../src/quantum.js";
import { GENERAL_ENCODER_PROMPT, SEEKER_ENCODER_PROMPT, interpretationPrompt } from "../src/prompts.js";

const close = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
const meanings = Object.fromEntries(BASIS.map((x) => [x, x]));
const config = (initial, gates) => ({ schema_version: "12t-1.0", mode_profile: "general", initial, shots: 1000, seed: 1, component_meanings: meanings, expected_reading: { ranking: BASIS }, gates });

assert.deepEqual(BASIS, ["a0","a1","a2","b0","b1","b2","c0","c1","c2","d0","d1","d2"]);

// A1: qubit-qutrit maximally entangled.
const a1state = applyGates(initialState("a0"), [{ source: "a0", target: "c1", theta: Math.PI / 4, phi: 0 }]);
const a1 = analyzeEntanglement12(a1state);
close(a1.axis_entropies_bits.subject, 1, 1e-10, "A1 subject entropy");
close(a1.axis_entropies_bits.manifestation, 0, 1e-10, "A1 manifestation entropy");
close(a1.axis_entropies_bits.time, 1, 1e-10, "A1 time entropy");
assert.equal(a1.binding_label, "STRONGLY_BOUND");
close(a1.time_populations.past, .5, 1e-10, "A1 past");
close(a1.time_populations.now, .5, 1e-10, "A1 now");
Object.values(a1.presence_spectrum).forEach((x) => close(x, 0, 1e-10, "A1 presence"));

// A2: uniform time superposition is a product state.
const a2state = applyGates(initialState("a0"), [
  { source: "a0", target: "a1", theta: Math.asin(1 / Math.sqrt(3)), phi: 0 },
  { source: "a0", target: "a2", theta: Math.PI / 4, phi: 0 },
]);
const a2 = analyzeEntanglement12(a2state);
Object.values(a2.axis_entropies_bits).forEach((x) => close(x, 0, 1e-10, "A2 entropy"));
assert.equal(a2.binding_label, "SEPARABLE_LIKE");
Object.values(a2.time_populations).forEach((x) => close(x, 1 / 3, 1e-10, "A2 population"));
Object.values(a2.presence_spectrum).forEach((x) => close(x, 2 / 3, 1e-10, "A2 presence"));

// A3: frozen mini-circuit regression.
const a3gates = [
  { name:"g1", source:"b0", target:"a0", theta:.9425, phi:Math.PI/2, strength:3 },
  { name:"g2", source:"a0", target:"a1", theta:1.2566, phi:0, strength:4 },
  { name:"g3", source:"a1", target:"a2", theta:.9425, phi:0, strength:3 },
  { name:"g4", source:"a0", target:"a2", theta:.6283, phi:0, strength:2 },
];
const a3state = applyGates(initialState("b0"), a3gates);
const a3 = analyzeEntanglement12(a3state);
close(a3state.reduce((s,z)=>s+z.re*z.re+z.im*z.im,0), 1, 1e-10, "A3 norm");
close(a3.axis_entropies_bits.time, .902, 1e-3, "A3 time entropy");
close(a3.presence_spectrum.past_now, .148, 1e-3, "A3 past-now");
close(a3.presence_spectrum.now_future, .588, 1e-3, "A3 now-future");
close(a3.presence_spectrum.past_future, .213, 1e-3, "A3 past-future");
close(a3.time_populations.past, .372, 1e-3, "A3 past");
close(a3.time_populations.now, .205, 1e-3, "A3 now");
close(a3.time_populations.future, .423, 1e-3, "A3 future");

// A4: reject an 8-state 3Q config with the corrected state count.
assert.throws(() => validateConfig({ ...config("a0", [{ source:"a0", target:"a1", theta:1, phi:0, strength:1 }]), schema_version:"3q-1.0", component_meanings:Object.fromEntries(["a0","a1","b0","b1","c0","c1","d0","d1"].map(x=>[x,x])), expected_reading:{ranking:["a0","a1","b0","b1","c0","c1","d0","d1"]} }), /3q\(8状態\)形式/);

// A5: prompt vocabulary and interpretation discipline.
const promptText = GENERAL_ENCODER_PROMPT + SEEKER_ENCODER_PROMPT + interpretationPrompt;
for (const word of ["胸中","眼前","観照","臨在","示現","跳越","いまの生々しさ","混同"]) assert.ok(promptText.includes(word), word);

// A6: projected 2-bit marginal and full result schemas.
const full = runFullMeasurement(config("b0", a3gates));
const p = probabilities(a3state);
close(full.result.projected_2bit.probabilities.a, p.a0 + p.a1 + p.a2, 1e-12, "A6 projected a");
assert.equal(full.result.schema_version, "12t-1.0");
assert.equal(full.audit.schema_version, "12t-1.0");
assert.equal(full.aiInterpretation.schema_version, "ai_interpretation_12t_v1");
assert.ok(full.result.entanglement12);
assert.equal(full.audit.gate_trace[0].three_tangle_after, undefined);
assert.ok(Number.isFinite(full.audit.gate_trace[0].time_entropy_after));

for (const file of ["../README.md", "../index.html", "../src/quantum.js", "../src/prompts.js", "../src/ui.js"]) {
  const text = await readFile(new URL(file, import.meta.url), "utf8");
  assert.equal(text.includes("3q=16系"), false, `${file}: stale 3q state count`);
}

const story = JSON.parse(await readFile(new URL("../examples/mini_story_12t_v1.json", import.meta.url), "utf8"));
const storyRun = runFullMeasurement(story);
close(storyRun.result.norm, 1, 1e-10, "story norm");
assert.equal(storyRun.audit.encoding_health, "HEALTHY");
assert.match(story.encoder_notes.flow_check, /全6本/);

console.log("All 12T tests passed.");
