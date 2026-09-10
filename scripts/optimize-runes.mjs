import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('private-data/account.json');
const catalogPath = resolve('public/data/monster-catalog.json');
const destination = resolve('data/rune-plan.json');
const [raw, catalog] = await Promise.all([
  readFile(source, 'utf8').then(JSON.parse),
  readFile(catalogPath, 'utf8').then(JSON.parse),
]);

const setNames = {
  1: 'Energy', 2: 'Guard', 3: 'Swift', 4: 'Blade', 5: 'Rage', 6: 'Focus',
  7: 'Endure', 8: 'Fatal', 10: 'Despair', 11: 'Vampire', 13: 'Violent',
  14: 'Nemesis', 15: 'Will', 16: 'Shield', 17: 'Revenge', 18: 'Destruction',
  19: 'Fight', 20: 'Determination', 21: 'Enhance', 22: 'Accuracy',
  23: 'Endure', 24: 'Seal', 25: 'Ethereal',
};
const setSize = { 1: 2, 2: 2, 3: 4, 4: 2, 5: 4, 6: 2, 7: 2, 8: 4, 10: 4, 11: 4, 13: 4, 14: 2, 15: 2, 16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 25: 1 };
const setBonuses = {
  1: { 2: 15 }, 2: { 6: 15 }, 3: { 8: 25 }, 4: { 9: 12 }, 5: { 10: 40 },
  6: { 12: 20 }, 7: { 11: 20 }, 8: { 4: 35 },
};

const profiles = [
  { name: 'Teshar', area: 'Gigantes', role: 'damage', templates: [[5, 4], [8, 4]] },
  { name: 'Liam', area: 'Dragões', role: 'damage', templates: [[5, 4], [8, 4]] },
  { name: 'Brandia', area: 'R5 / Rift', role: 'damageAcc', templates: [[5, 4], [8, 4], [5, 6]] },
  { name: 'Shamann', area: 'Necro', role: 'damage', templates: [[5, 4], [8, 4]] },
  { name: 'Spectra', area: 'ToA / Dragões', role: 'fastHybrid', templates: [[3, 6], [13, 6]] },
  { name: 'Loren', area: 'Chefes / ToA', role: 'fastSupport', templates: [[3, 6], [13, 6], [13, 15]] },
  { name: 'Kro', area: 'R5 / Rift', role: 'damageAcc', templates: [[5, 4], [8, 4], [5, 6]] },
  { name: 'Riley', area: 'R5', role: 'support', templates: [[13, 15], [13, 6], [3, 6]] },
  { name: 'Fran', area: 'R5 / ToA', role: 'support', templates: [[13, 15], [13, 6], [3, 6]] },
  { name: 'Prilea', area: 'Gigantes', role: 'fastSupport', templates: [[3, 6], [19, 6], [3, 19]] },
];

const weights = {
  damage: { 2: 0.1, 3: 0.05, 4: 2.2, 6: 0.1, 8: 1.15, 9: 2.65, 10: 2.25, 12: 0.12 },
  damageAcc: { 2: 0.12, 3: 0.05, 4: 2, 6: 0.12, 8: 1.2, 9: 2.4, 10: 2, 12: 0.7 },
  fastHybrid: { 2: 0.75, 4: 0.3, 6: 0.5, 8: 3, 9: 1.7, 10: 1.25, 11: 0.15, 12: 1 },
  fastSupport: { 1: 0.004, 2: 1.15, 5: 0.03, 6: 0.85, 8: 3.3, 9: 0.1, 11: 0.25, 12: 1.25 },
  support: { 1: 0.005, 2: 1.35, 5: 0.035, 6: 1.05, 8: 2.6, 11: 0.6, 12: 0.55 },
};

const normalizeEffect = (effect = []) => ({ type: Number(effect[0] ?? 0), value: Number(effect[1] ?? 0), enchanted: Boolean(effect[2]), grind: Number(effect[3] ?? 0) });
const normalizeRune = (rune, owner) => ({
  id: String(rune.rune_id), slot: Number(rune.slot_no), setId: Number(rune.set_id), stars: Number(rune.class),
  rarity: Number(rune.rank), level: Number(rune.upgrade_curr), main: normalizeEffect(rune.pri_eff),
  prefix: normalizeEffect(rune.prefix_eff), substats: (rune.sec_eff ?? []).map(normalizeEffect), owner,
});

function scoreRune(rune, role) {
  const roleWeights = weights[role];
  const effects = [rune.main, rune.prefix, ...rune.substats];
  return effects.reduce((score, effect) => score + (roleWeights[effect.type] ?? 0) * (effect.value + effect.grind), 0)
    + rune.rarity * 0.25 + rune.level * 0.08;
}

function buildScore(runes, role) {
  const stats = buildStats(runes);
  if (role === 'damage' || role === 'damageAcc') {
    const accuracyValue = role === 'damageAcc' ? Math.min(stats.accuracy, 65) * 0.8 : Math.min(stats.accuracy, 35) * 0.2;
    return Math.min(stats.atkPct, 190) * 2.1
      + Math.min(stats.critRate, 85) * 3.2
      + Math.min(stats.critDamage, 190) * 2.2
      + Math.min(stats.speed, 105) * 1.05
      + accuracyValue
      + Math.min(stats.hpPct + stats.defPct, 80) * 0.12;
  }
  if (role === 'fastHybrid') {
    return Math.min(stats.speed, 130) * 3
      + Math.min(stats.hpPct, 150) * 0.75
      + Math.min(stats.defPct, 100) * 0.55
      + Math.min(stats.accuracy, 85)
      + Math.min(stats.critRate, 85) * 1.7
      + Math.min(stats.critDamage, 180) * 1.25;
  }
  const speedWeight = role === 'fastSupport' ? 3.4 : 2.7;
  const accuracyWeight = role === 'fastSupport' ? 1.25 : 0.55;
  return Math.min(stats.speed, 130) * speedWeight
    + Math.min(stats.hpPct, 180) * 1.1
    + Math.min(stats.defPct, 130) * 0.9
    + Math.min(stats.accuracy, 85) * accuracyWeight
    + Math.min(stats.resistance, 100) * 0.45;
}

function meetsFloors(candidate, current, role) {
  const next = buildStats(candidate);
  if (!current.length) {
    if (role === 'damage' || role === 'damageAcc') return next.atkPct >= 90 && next.critRate >= 65 && next.critDamage >= 45;
    return true;
  }
  const before = buildStats(current);
  if (role === 'damage' || role === 'damageAcc') {
    if (next.critRate < Math.min(before.critRate, 70)) return false;
    if (next.critDamage < Math.min(before.critDamage, 100)) return false;
    if (next.atkPct < before.atkPct * 0.78) return false;
    if (next.speed < before.speed - 18) return false;
    if (role === 'damageAcc' && next.accuracy < Math.min(before.accuracy, 35)) return false;
    return true;
  }
  if (role === 'fastHybrid') {
    return next.speed >= before.speed - 8
      && next.accuracy >= Math.max(35, Math.min(before.accuracy, 55) - 5)
      && next.critRate >= before.critRate * 0.75
      && next.critDamage >= before.critDamage * 0.8;
  }
  if (next.speed < before.speed - 10) return false;
  if (next.hpPct + next.defPct < (before.hpPct + before.defPct) * 0.75) return false;
  if (role === 'fastSupport' && next.accuracy < Math.max(35, Math.min(before.accuracy, 55) - 8)) return false;
  return true;
}

function templateValid(runes, template) {
  const counts = runes.reduce((all, rune) => ({ ...all, [rune.setId]: (all[rune.setId] ?? 0) + 1 }), {});
  let intangible = counts[25] ?? 0;
  for (const setId of template) {
    const required = setSize[setId] ?? 2;
    const available = counts[setId] ?? 0;
    const deficit = Math.max(0, required - available);
    intangible -= deficit;
    if (intangible < 0) return false;
  }
  return true;
}

function bestBuild(pool, profile, current) {
  let best = null;
  for (const template of profile.templates) {
    const allowed = new Set([...template, 25]);
    const bySlot = [1, 2, 3, 4, 5, 6].map((slot) => pool
      .filter((rune) => rune.slot === slot && rune.stars === 6 && rune.level >= 12 && allowed.has(rune.setId))
      .sort((a, b) => scoreRune(b, profile.role) - scoreRune(a, profile.role)).slice(0, 55));
    if (bySlot.some((items) => items.length === 0)) continue;
    let beam = [{ runes: [], score: 0 }];
    for (const choices of bySlot) {
      const next = [];
      for (const state of beam) for (const rune of choices) {
        if (state.runes.some((item) => item.id === rune.id)) continue;
        next.push({ runes: [...state.runes, rune], score: state.score + scoreRune(rune, profile.role) });
      }
      beam = next.sort((a, b) => b.score - a.score).slice(0, 6000);
    }
    const candidate = beam.filter((state) => templateValid(state.runes, template) && meetsFloors(state.runes, current, profile.role))
      .map((state) => ({ ...state, score: buildScore(state.runes, profile.role) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!candidate) continue;
    candidate.template = template;
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}

function buildStats(runes) {
  const result = { hpPct: 0, atkPct: 0, defPct: 0, speed: 0, critRate: 0, critDamage: 0, accuracy: 0, resistance: 0 };
  const keys = { 2: 'hpPct', 4: 'atkPct', 6: 'defPct', 8: 'speed', 9: 'critRate', 10: 'critDamage', 11: 'resistance', 12: 'accuracy' };
  for (const rune of runes) for (const effect of [rune.main, rune.prefix, ...rune.substats]) {
    const key = keys[effect.type];
    if (key) result[key] += effect.value + effect.grind;
  }
  const counts = runes.reduce((all, rune) => ({ ...all, [rune.setId]: (all[rune.setId] ?? 0) + 1 }), {});
  for (const [setId, count] of Object.entries(counts)) {
    if (!setBonuses[setId] || Number(setId) === 25) continue;
    const activations = Math.floor(count / (setSize[setId] ?? 2));
    for (const [type, value] of Object.entries(setBonuses[setId])) {
      const key = keys[type]; if (key) result[key] += value * activations;
    }
  }
  return result;
}

function describeSets(runes) {
  const counts = runes.reduce((all, rune) => ({ ...all, [rune.setId]: (all[rune.setId] ?? 0) + 1 }), {});
  return Object.entries(counts).flatMap(([setId, count]) => {
    const activations = Number(setId) === 25 ? count : Math.floor(count / (setSize[setId] ?? 2));
    if (!activations) return [];
    const name = setNames[setId] ?? `Conjunto ${setId}`;
    return [activations > 1 ? `${name} ×${activations}` : name];
  }).join(' + ') || 'Conjuntos incompletos';
}

const unitsWithNames = (raw.unit_list ?? []).map((unit) => ({ ...unit, name: catalog[String(unit.unit_master_id)]?.name ?? `Monstro ${unit.unit_master_id}` }));
const chosenUnits = profiles.map((profile) => {
  const matches = unitsWithNames.filter((unit) => unit.name === profile.name && unit.class === 6 && unit.unit_level >= 35);
  matches.sort((a, b) => (b.skills ?? []).reduce((n, s) => n + s[1], 0) - (a.skills ?? []).reduce((n, s) => n + s[1], 0) || (b.runes ?? []).length - (a.runes ?? []).length);
  return matches[0] ? { profile, unit: matches[0] } : null;
}).filter(Boolean);

const locked = new Set((raw.rune_lock_list ?? []).map((item) => String(item.rune_id ?? item)));
let availableInventory = (raw.runes ?? []).map((rune) => normalizeRune(rune, { type: 'inventory', name: 'Inventário' })).filter((rune) => !locked.has(rune.id));
const recommendations = [];

for (const { profile, unit } of chosenUnits) {
  const current = (unit.runes ?? []).map((rune) => normalizeRune(rune, { type: 'monster', id: String(unit.unit_id), name: unit.name }));
  const pool = [...availableInventory, ...current.filter((rune) => !locked.has(rune.id))];
  const candidate = bestBuild(pool, profile, current);
  const currentScore = buildScore(current, profile.role);
  const useCandidate = Boolean(candidate) && (!current.length || candidate.score > currentScore * 1.03);
  const selected = useCandidate ? candidate : { runes: current, score: currentScore, template: [] };
  const improvement = currentScore > 0 ? Math.round(((selected.score - currentScore) / currentScore) * 100) : 100;
  const currentBySlot = new Map(current.map((rune) => [rune.slot, rune]));
  recommendations.push({
    unitId: String(unit.unit_id), name: unit.name, area: profile.area, role: profile.role,
    currentScore: Math.round(currentScore), suggestedScore: Math.round(selected.score), improvement: Math.max(0, improvement),
    currentSets: describeSets(current), suggestedSets: describeSets(selected.runes),
    currentStats: buildStats(current), suggestedStats: buildStats(selected.runes),
    moves: selected.runes.map((rune) => ({
      slot: rune.slot, runeId: rune.id, set: setNames[rune.setId] ?? `Conjunto ${rune.setId}`, level: rune.level,
      replacesRuneId: currentBySlot.get(rune.slot)?.id ?? null,
      from: rune.owner.type === 'inventory' ? 'Inventário' : rune.owner.name,
    })).filter((move) => move.runeId !== move.replacesRuneId),
  });
  if (useCandidate) {
    const selectedInventoryIds = new Set(selected.runes.filter((rune) => rune.owner.type === 'inventory').map((rune) => rune.id));
    availableInventory = availableInventory.filter((rune) => !selectedInventoryIds.has(rune.id));
  }
}

const relevantTypes = new Set([2, 4, 6, 8, 9, 10, 11, 12]);
const upgrades = (raw.runes ?? []).map((rune) => normalizeRune(rune, { type: 'inventory', name: 'Inventário' }))
  .filter((rune) => rune.stars === 6 && rune.rarity >= 4 && rune.level < 15 && rune.substats.filter((effect) => relevantTypes.has(effect.type)).length >= 3)
  .map((rune) => {
    const scores = Object.keys(weights).map((role) => ({ role, score: scoreRune(rune, role) }));
    const best = scores.sort((a, b) => b.score - a.score)[0];
    return { runeId: rune.id, slot: rune.slot, set: setNames[rune.setId] ?? `Conjunto ${rune.setId}`, level: rune.level, rarity: rune.rarity, main: rune.main, substats: rune.substats, suggestedRole: best.role, score: Math.round(best.score) };
  }).sort((a, b) => b.score - a.score).slice(0, 12);

const plan = {
  version: 1,
  generatedAt: new Date().toISOString(),
  account: raw.wizard_info?.wizard_name ?? 'Invocador',
  mode: 'PvE seguro',
  constraints: { ownedRunesOnly: true, uniqueAssignment: true, lockedRunesPreserved: true, nonTargetMonstersPreserved: true, worldArenaUntouched: true },
  analyzedRuneCount: (raw.runes ?? []).length + chosenUnits.reduce((total, { unit }) => total + (unit.runes ?? []).length, 0),
  targetCount: chosenUnits.length,
  recommendations,
  upgrades,
};

await mkdir(resolve('data'), { recursive: true });
await writeFile(destination, JSON.stringify(plan));
console.log(`Plano de runas: ${recommendations.length} monstros e ${upgrades.length} candidatas a melhoria.`);
