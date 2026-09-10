import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('private-data/account.json');
const destination = resolve('data/account-summary.json');
const catalogPath = resolve('public/data/monster-catalog.json');

try {
  await access(source);
} catch {
  console.log('Nenhum private-data/account.json encontrado; mantendo o resumo atual.');
  process.exit(0);
}

const [raw, catalog] = await Promise.all([
  readFile(source, 'utf8').then(JSON.parse),
  readFile(catalogPath, 'utf8').then(JSON.parse),
]);
const previous = await readFile(destination, 'utf8').then(JSON.parse).catch(() => null);

const normalize = (unit) => {
  const monster = catalog[String(unit.unit_master_id)] ?? {};
  const usedSkillUps = (unit.skills ?? []).reduce((total, skill) => total + Math.max(0, Number(skill[1] ?? 1) - 1), 0);
  return {
    id: String(unit.unit_id),
    masterId: unit.unit_master_id,
    name: monster.name ?? `Monstro ${unit.unit_master_id}`,
    family: monster.family ?? 'Desconhecido',
    element: monster.element ?? 'Unknown',
    naturalStars: monster.naturalStars ?? 0,
    grade: unit.class ?? 0,
    level: unit.unit_level ?? 1,
    awakened: monster.awakened ?? false,
    secondAwakening: monster.secondAwakening ?? false,
    image: monster.image ?? null,
    runes: (unit.runes ?? []).length,
    runeDetails: (unit.runes ?? []).map((rune, index) => {
      const normalizeEffect = (effect = []) => ({
        type: Number(effect[0] ?? 0),
        value: Number(effect[1] ?? 0),
        enchanted: Boolean(effect[2]),
        grind: Number(effect[3] ?? 0),
      });
      const prefix = normalizeEffect(rune.prefix_eff);
      return {
        id: String(rune.rune_id ?? `${rune.slot_no ?? index}-${index}`),
        slot: Number(rune.slot_no ?? index + 1),
        setId: Number(rune.set_id ?? 0),
        stars: Number(rune.class ?? 0),
        rarity: Number(rune.rank ?? 0),
        level: Number(rune.upgrade_curr ?? 0),
        main: normalizeEffect(rune.pri_eff),
        prefix: prefix.type ? prefix : null,
        substats: (rune.sec_eff ?? []).map(normalizeEffect).filter((effect) => effect.type > 0),
      };
    }).sort((a, b) => a.slot - b.slot),
    artifacts: (unit.artifacts ?? []).length,
    skillUpsRemaining: Math.max(0, Number(monster.skillUps ?? 0) - usedSkillUps),
    stats: {
      hp: unit.con ?? 0,
      atk: unit.atk ?? 0,
      def: unit.def ?? 0,
      spd: unit.spd ?? 0,
    },
  };
};

const summary = {
  version: 1,
  generatedAt: new Date().toISOString(),
  profile: {
    name: raw.wizard_info?.wizard_name ?? 'Invocador',
    level: raw.wizard_info?.wizard_level ?? 0,
    lastLogin: raw.wizard_info?.wizard_last_login ?? null,
    country: raw.country ?? raw.wizard_info?.wizard_last_country ?? null,
  },
  units: (raw.unit_list ?? []).map(normalize),
  storage: (Array.isArray(raw.unit_storage_list) ? raw.unit_storage_list.map((item) => {
    const monster = catalog[String(item.unit_master_id)] ?? {};
    return {
      masterId: item.unit_master_id,
      name: monster.name ?? `Monstro ${item.unit_master_id}`,
      family: monster.family ?? 'Desconhecido',
      element: monster.element ?? 'Unknown',
      naturalStars: monster.naturalStars ?? 0,
      grade: item.class ?? monster.naturalStars ?? 0,
      quantity: item.quantity ?? 1,
      image: monster.image ?? null,
    };
  }) : previous?.profile?.name === (raw.wizard_info?.wizard_name ?? 'Invocador') ? previous.storage ?? [] : []),
  inventory: {
    runes: (raw.runes ?? []).length,
    artifacts: (raw.artifacts ?? []).length,
    equippedRunes: (raw.unit_list ?? []).reduce((total, unit) => total + (unit.runes ?? []).length, 0),
    equippedArtifacts: (raw.unit_list ?? []).reduce((total, unit) => total + (unit.artifacts ?? []).length, 0),
  },
};

await mkdir(resolve('data'), { recursive: true });
await writeFile(destination, JSON.stringify(summary));
console.log(`Resumo seguro atualizado para ${summary.profile.name}.`);
