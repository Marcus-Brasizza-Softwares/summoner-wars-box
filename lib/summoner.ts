export type MonsterCatalogEntry = {
  name: string;
  family: string;
  element: string;
  naturalStars: number;
  awakened: boolean;
  secondAwakening: boolean;
  image: string | null;
  skillUps: number;
};

export type RuneEffect = {
  type: number;
  value: number;
  grind: number;
  enchanted: boolean;
};

export type RuneData = {
  id: string;
  slot: number;
  setId: number;
  stars: number;
  rarity: number;
  level: number;
  main: RuneEffect;
  prefix: RuneEffect | null;
  substats: RuneEffect[];
};

export type MonsterUnit = {
  id: string;
  masterId: number;
  name: string;
  family: string;
  element: string;
  naturalStars: number;
  grade: number;
  level: number;
  awakened: boolean;
  secondAwakening: boolean;
  image: string | null;
  runes: number;
  runeDetails: RuneData[];
  artifacts: number;
  skillUpsRemaining: number;
  stats: { hp: number; atk: number; def: number; spd: number };
};

export type StorageUnit = {
  masterId: number;
  name: string;
  family: string;
  element: string;
  naturalStars: number;
  grade: number;
  quantity: number;
  image: string | null;
};

export type AccountSummary = {
  version: number;
  generatedAt: string;
  profile: { name: string; level: number; lastLogin: string | null; country: string | null };
  units: MonsterUnit[];
  storage: StorageUnit[];
  inventory: { runes: number; artifacts: number; equippedRunes: number; equippedArtifacts: number };
};

export type FocusItem = {
  key: string;
  name: string;
  element: string;
  image: string | null;
  score: number;
  location: 'Ativo' | 'Armazenado';
  status: string;
  action: string;
  reason: string;
  area: string;
};

type RawUnit = {
  unit_id?: number | string;
  unit_master_id?: number;
  class?: number;
  unit_level?: number;
  runes?: RawRune[];
  artifacts?: unknown[];
  skills?: Array<[number, number]>;
  con?: number;
  atk?: number;
  def?: number;
  spd?: number;
};

type RawRune = {
  rune_id?: number | string;
  slot_no?: number;
  set_id?: number;
  class?: number;
  rank?: number;
  upgrade_curr?: number;
  pri_eff?: number[];
  prefix_eff?: number[];
  sec_eff?: number[][];
};

type RawAccount = {
  wizard_info?: Record<string, unknown>;
  country?: string;
  unit_list?: RawUnit[];
  unit_storage_list?: Array<{ unit_master_id?: number; class?: number; quantity?: number }>;
  runes?: unknown[];
  artifacts?: unknown[];
};

const priorityGuide: Record<string, { score: number; action: string; reason: string; area: string }> = {
  shamann: { score: 98, action: 'Levar ao nível 40 e equipar', reason: 'Já tem o segundo despertar e oferece dano forte contra chefes de elemento sombrio.', area: 'Necro / Chefes' },
  spectra: { score: 96, action: 'Finalizar as habilidades', reason: 'Controle de barra, redução de velocidade e dano por HP máximo ajudam muito em conteúdo difícil.', area: 'ToA / Dragões' },
  kro: { score: 94, action: 'Completar o último skill-up', reason: 'O investimento está praticamente concluído e melhora o dano nos chefes com debuffs.', area: 'Raid / Rift' },
  luna: { score: 92, action: 'Despertar e levar a 6★', reason: 'Causa dano proporcional ao HP máximo do alvo e complementa times rápidos de chefes.', area: 'Gigantes / Dragões' },
  miriam: { score: 88, action: 'Separar uma cópia e evoluir', reason: 'Amplifica buffs de ataque e defesa, oferecendo bom valor em times específicos.', area: 'R5 / Rift' },
  herne: { score: 86, action: 'Montar uma cópia de suporte', reason: 'O esquecimento neutraliza passivas problemáticas e abre opções no ToA Hell.', area: 'ToA Hell' },
  nora: { score: 84, action: 'Tirar do armazenamento e evoluir', reason: 'Remove buffs, provoca e aplica dano contínuo em área.', area: 'ToA / Labirinto' },
  lyn: { score: 80, action: 'Guardar uma cópia para dano em chefe', reason: 'O dano baseado no HP máximo do inimigo continua útil em composições específicas.', area: 'Gigantes / Dragões' },
};

const normalizeName = (name: string) => name.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');

function normalizeRuneEffect(effect?: number[]): RuneEffect {
  return {
    type: Number(effect?.[0] ?? 0),
    value: Number(effect?.[1] ?? 0),
    enchanted: Boolean(effect?.[2]),
    grind: Number(effect?.[3] ?? 0),
  };
}

function normalizeRune(rune: RawRune, index: number): RuneData {
  const prefix = normalizeRuneEffect(rune.prefix_eff);
  return {
    id: String(rune.rune_id ?? `${rune.slot_no ?? index}-${index}`),
    slot: Number(rune.slot_no ?? index + 1),
    setId: Number(rune.set_id ?? 0),
    stars: Number(rune.class ?? 0),
    rarity: Number(rune.rank ?? 0),
    level: Number(rune.upgrade_curr ?? 0),
    main: normalizeRuneEffect(rune.pri_eff),
    prefix: prefix.type ? prefix : null,
    substats: (rune.sec_eff ?? []).map(normalizeRuneEffect).filter((effect) => effect.type > 0),
  };
}

export function parseRawAccount(raw: RawAccount, catalog: Record<string, MonsterCatalogEntry>): AccountSummary {
  if (!raw?.wizard_info || !Array.isArray(raw.unit_list)) {
    throw new Error('Este arquivo não parece ser um export válido do Summoners War Exporter.');
  }

  const units = raw.unit_list.map((unit, index): MonsterUnit => {
    const masterId = Number(unit.unit_master_id ?? 0);
    const monster = catalog[String(masterId)];
    const usedSkillUps = (unit.skills ?? []).reduce((total, skill) => total + Math.max(0, Number(skill?.[1] ?? 1) - 1), 0);
    return {
      id: String(unit.unit_id ?? `${masterId}-${index}`),
      masterId,
      name: monster?.name ?? `Monstro ${masterId}`,
      family: monster?.family ?? 'Desconhecido',
      element: monster?.element ?? 'Unknown',
      naturalStars: monster?.naturalStars ?? 0,
      grade: Number(unit.class ?? 0),
      level: Number(unit.unit_level ?? 1),
      awakened: monster?.awakened ?? false,
      secondAwakening: monster?.secondAwakening ?? false,
      image: monster?.image ?? null,
      runes: unit.runes?.length ?? 0,
      runeDetails: (unit.runes ?? []).map(normalizeRune).sort((a, b) => a.slot - b.slot),
      artifacts: unit.artifacts?.length ?? 0,
      skillUpsRemaining: Math.max(0, Number(monster?.skillUps ?? 0) - usedSkillUps),
      stats: { hp: Number(unit.con ?? 0), atk: Number(unit.atk ?? 0), def: Number(unit.def ?? 0), spd: Number(unit.spd ?? 0) },
    };
  });

  const storage = (raw.unit_storage_list ?? []).map((item): StorageUnit => {
    const masterId = Number(item.unit_master_id ?? 0);
    const monster = catalog[String(masterId)];
    return {
      masterId,
      name: monster?.name ?? `Monstro ${masterId}`,
      family: monster?.family ?? 'Desconhecido',
      element: monster?.element ?? 'Unknown',
      naturalStars: monster?.naturalStars ?? 0,
      grade: Number(item.class ?? monster?.naturalStars ?? 0),
      quantity: Number(item.quantity ?? 1),
      image: monster?.image ?? null,
    };
  });

  const info = raw.wizard_info;
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    profile: {
      name: String(info.wizard_name ?? 'Invocador'),
      level: Number(info.wizard_level ?? 0),
      lastLogin: typeof info.wizard_last_login === 'string' ? info.wizard_last_login : null,
      country: raw.country ?? (typeof info.wizard_last_country === 'string' ? info.wizard_last_country : null),
    },
    units,
    storage,
    inventory: {
      runes: raw.runes?.length ?? 0,
      artifacts: raw.artifacts?.length ?? 0,
      equippedRunes: units.reduce((total, unit) => total + unit.runes, 0),
      equippedArtifacts: units.reduce((total, unit) => total + unit.artifacts, 0),
    },
  };
}

export function buildFocusItems(account: AccountSummary): FocusItem[] {
  const found: FocusItem[] = [];
  const activeNames = new Set(account.units.map((unit) => normalizeName(unit.name)));
  const bestActiveByName = new Map<string, MonsterUnit>();

  const progressScore = (unit: MonsterUnit) =>
    (unit.secondAwakening ? 1_000_000 : 0)
    + (unit.awakened ? 100_000 : 0)
    + unit.grade * 10_000
    + unit.level * 100
    + unit.runes * 10
    + unit.artifacts * 3
    - unit.skillUpsRemaining;

  account.units.forEach((unit) => {
    const name = normalizeName(unit.name);
    const current = bestActiveByName.get(name);
    if (!current || progressScore(unit) > progressScore(current)) bestActiveByName.set(name, unit);
  });

  bestActiveByName.forEach((unit) => {
    const guide = priorityGuide[normalizeName(unit.name)];
    if (unit.grade < 6 && !guide) return;

    const missing: string[] = [];
    const actions: string[] = [];
    if (unit.grade < 6) actions.push('evoluir para 6★');
    if (unit.level < 40) {
      missing.push(`nível ${unit.level}`);
      actions.push(`levar do nível ${unit.level} ao 40`);
    }
    if (unit.runes < 6) missing.push(`${unit.runes}/6 runas`);
    if (unit.artifacts < 2) missing.push(`${unit.artifacts}/2 artefatos`);
    if (unit.skillUpsRemaining > 0) missing.push(`${unit.skillUpsRemaining} ${unit.skillUpsRemaining === 1 ? 'skill-up' : 'skill-ups'}`);
    if (unit.runes < 6) actions.push(`equipar ${6 - unit.runes} ${6 - unit.runes === 1 ? 'runa' : 'runas'}`);
    if (unit.artifacts < 2) actions.push(`equipar ${2 - unit.artifacts} ${2 - unit.artifacts === 1 ? 'artefato' : 'artefatos'}`);
    if (unit.skillUpsRemaining > 0) actions.push(`completar ${unit.skillUpsRemaining} ${unit.skillUpsRemaining === 1 ? 'skill-up' : 'skill-ups'}`);
    if (missing.length === 0) return;

    const runeQuality = unit.runeDetails.reduce((total, rune) => total
      + (rune.stars / 6) * 0.3
      + (rune.rarity / 5) * 0.25
      + (rune.level / 15) * 0.45, 0) / 6;
    const score = Math.round(
      (unit.grade / 6) * 18
      + (Math.min(unit.level, 40) / 40) * 18
      + runeQuality * 25
      + (Math.min(unit.artifacts, 2) / 2) * 8
      + Math.max(0, 12 - unit.skillUpsRemaining * 1.5)
      + (unit.secondAwakening ? 8 : unit.awakened ? 4 : 0)
      + (unit.naturalStars / 5) * 8,
    );

    found.push({
      key: `active-${unit.id}`,
      name: unit.name,
      element: unit.element,
      image: unit.image,
      score,
      location: 'Ativo',
      status: missing.join(' · '),
      action: actions.join(' · '),
      reason: guide?.reason ?? 'Esta é uma das builds mais avançadas da conta que ainda possui etapas objetivas para concluir.',
      area: guide?.area ?? 'Revisar uso',
    });
  });

  account.storage.forEach((unit) => {
    const name = normalizeName(unit.name);
    const guide = priorityGuide[name];
    if (activeNames.has(name) || unit.naturalStars < 4) return;
    const score = Math.round(
      (unit.naturalStars / 5) * 40
      + (unit.grade / 6) * 15
      + (Math.min(unit.quantity, 5) / 5) * 5
      + (guide ? 8 : 0),
    );
    found.push({
      key: `storage-${unit.masterId}`,
      name: unit.name,
      element: unit.element,
      image: unit.image,
      score,
      location: 'Armazenado',
      status: `${unit.quantity} ${unit.quantity === 1 ? 'cópia' : 'cópias'} · ${unit.grade}★`,
      action: 'Retirar do armazenamento e avaliar uma build',
      reason: guide?.reason ?? `É um monstro natural ${unit.naturalStars}★ ainda sem uma cópia ativa na sua box.`,
      area: guide?.area ?? 'Potencial da box',
    });
  });

  const unique = new Map<string, FocusItem>();
  found.sort((a, b) => b.score - a.score).forEach((item) => {
    const key = normalizeName(item.name);
    if (!unique.has(key)) unique.set(key, item);
  });
  return [...unique.values()].slice(0, 10);
}

export function elementLabel(element: string) {
  return ({ Water: 'Água', Fire: 'Fogo', Wind: 'Vento', Light: 'Luz', Dark: 'Trevas' } as Record<string, string>)[element] ?? element;
}
