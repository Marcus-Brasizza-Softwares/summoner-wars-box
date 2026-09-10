'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Box, CheckCircle2, Database,
  Eye, Filter, Gem, Gauge, Lightbulb, PackageOpen, RefreshCw, Search, Shield,
  Sparkles, Swords, TrendingUp, Upload, Users, WandSparkles, X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type AccountSummary, type FocusItem, type MonsterCatalogEntry, type MonsterUnit,
  type RuneData, type RuneEffect, type StorageUnit, buildFocusItems, elementLabel, parseRawAccount,
} from '@/lib/summoner';
import { optimizeRunes, type RunePlan } from '@/lib/rune-optimizer';

const imageBase = 'https://swarfarm.com/static/herders/images/monsters/';
const elements = ['all', 'Water', 'Fire', 'Wind', 'Light', 'Dark'];

const elementStyles: Record<string, string> = {
  Water: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  Fire: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  Wind: 'border-amber-300/20 bg-amber-300/10 text-amber-200',
  Light: 'border-yellow-100/20 bg-yellow-100/10 text-yellow-50',
  Dark: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
  Unknown: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
};

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const formatAccountDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};
const stars = (value: number) => '★'.repeat(Math.max(0, value));
const runeSets: Record<number, string> = {
  1: 'Energy', 2: 'Guard', 3: 'Swift', 4: 'Blade', 5: 'Rage', 6: 'Focus',
  7: 'Endure', 8: 'Fatal', 10: 'Despair', 11: 'Vampire', 13: 'Violent',
  14: 'Nemesis', 15: 'Will', 16: 'Shield', 17: 'Revenge', 18: 'Destruction',
  19: 'Fight', 20: 'Determination', 21: 'Enhance', 22: 'Accuracy',
  23: 'Endure', 24: 'Seal', 25: 'Ethereal',
};
const runeStats: Record<number, { label: string; percent: boolean }> = {
  1: { label: 'HP', percent: false }, 2: { label: 'HP', percent: true },
  3: { label: 'ATQ', percent: false }, 4: { label: 'ATQ', percent: true },
  5: { label: 'DEF', percent: false }, 6: { label: 'DEF', percent: true },
  8: { label: 'VEL', percent: false }, 9: { label: 'Taxa CR', percent: true },
  10: { label: 'Dano CR', percent: true }, 11: { label: 'RES', percent: true },
  12: { label: 'PRE', percent: true },
};
const runeRarities: Record<number, string> = { 1: 'Normal', 2: 'Mágica', 3: 'Rara', 4: 'Herói', 5: 'Lendária' };

function formatRuneEffect(effect: RuneEffect) {
  const stat = runeStats[effect.type] ?? { label: `Atributo ${effect.type}`, percent: false };
  const total = effect.value + effect.grind;
  return `${stat.label} +${formatNumber(total)}${stat.percent ? '%' : ''}`;
}

type WebMCPDocument = Document & {
  modelContext?: {
    registerTool: (tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    }, options?: { signal: AbortSignal }) => void | Promise<void>;
  };
};

function MonsterPortrait({ name, image, element, size = 'md' }: { name: string; image: string | null; element: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-9 rounded-xl' : 'size-11 rounded-2xl';
  return (
    <Avatar className={`${dimensions} border border-white/10 bg-slate-900`}>
      {image ? <AvatarImage src={`${imageBase}${image}`} alt={name} className="object-cover" /> : null}
      <AvatarFallback className={`font-semibold ${elementStyles[element] ?? elementStyles.Unknown}`}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function ElementBadge({ element }: { element: string }) {
  return <Badge variant="outline" className={`font-normal ${elementStyles[element] ?? elementStyles.Unknown}`}>{elementLabel(element)}</Badge>;
}

function FocusCard({ item, index }: { item: FocusItem; index: number }) {
  return (
    <div className="group grid gap-4 rounded-2xl border border-white/[.075] bg-black/10 p-4 transition-colors hover:border-amber-300/20 hover:bg-white/[.035] sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-xl bg-white/[.05] font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
        <MonsterPortrait name={item.name} image={item.image} element={item.element} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-100">{item.name}</p><ElementBadge element={item.element} /><Badge variant="outline" className="border-white/10 text-slate-400">{item.location}</Badge></div>
        <p className="mt-1 text-sm text-slate-400">{item.action}</p>
        <p className="mt-2 text-xs text-slate-500">{item.status}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <Badge className="bg-amber-300/10 text-amber-200 hover:bg-amber-300/10">{item.area}</Badge>
        <p className="mt-2 text-xs text-slate-500">Prioridade {Math.min(99, item.score)}</p>
      </div>
    </div>
  );
}

function MonsterTable({ units, onSelect }: { units: MonsterUnit[]; onSelect: (unit: MonsterUnit) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[.075]">
      <Table>
        <TableHeader><TableRow className="border-white/[.075] bg-white/[.025] hover:bg-white/[.025]"><TableHead>Monstro</TableHead><TableHead>Elemento</TableHead><TableHead>Progresso</TableHead><TableHead className="hidden lg:table-cell">Equipamento</TableHead><TableHead className="hidden xl:table-cell">Atributos base</TableHead><TableHead className="text-right">Estado</TableHead></TableRow></TableHeader>
        <TableBody>
          {units.slice(0, 100).map((unit) => {
            const complete = unit.grade === 6 && unit.level === 40 && unit.runes === 6;
            return <TableRow key={unit.id} className="border-white/[.065] hover:bg-white/[.03]">
              <TableCell><button type="button" onClick={() => onSelect(unit)} className="flex items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"><MonsterPortrait name={unit.name} image={unit.image} element={unit.element} /><div><p className="font-medium text-slate-100 transition-colors hover:text-amber-200">{unit.name}</p><p className="text-xs text-slate-500">{unit.secondAwakening ? '2º despertar' : unit.awakened ? 'Despertado' : unit.family}</p></div></button></TableCell>
              <TableCell><ElementBadge element={unit.element} /></TableCell>
              <TableCell><p className="font-medium">Nv. {unit.level} <span className="ml-1 text-amber-300">{stars(unit.grade)}</span></p><p className="mt-1 text-xs text-slate-500">Natural {unit.naturalStars}★</p></TableCell>
              <TableCell className="hidden lg:table-cell"><div className="flex gap-2"><Badge variant="outline" className={unit.runes === 6 ? 'border-cyan-400/20 text-cyan-200' : 'border-orange-400/20 text-orange-200'}>{unit.runes}/6 runas</Badge><Badge variant="outline" className="border-white/10 text-slate-400">{unit.artifacts}/2 artefatos</Badge></div></TableCell>
              <TableCell className="hidden xl:table-cell"><p className="text-xs text-slate-400">HP {formatNumber(unit.stats.hp)} · ATQ {formatNumber(unit.stats.atk)} · DEF {formatNumber(unit.stats.def)} · VEL {unit.stats.spd}</p></TableCell>
              <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><span className="hidden 2xl:inline">{complete ? <Badge className="bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10"><CheckCircle2 /> Pronto</Badge> : <Badge variant="outline" className="border-amber-300/20 text-amber-200"><RefreshCw /> Evoluir</Badge>}</span><Button variant="ghost" size="sm" className="text-cyan-200 hover:bg-cyan-300/10 hover:text-cyan-100" onClick={() => onSelect(unit)}><Eye /> Ver runas</Button></div></TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
      {units.length > 100 ? <p className="border-t border-white/[.075] px-4 py-3 text-center text-xs text-slate-500">Mostrando os primeiros 100 de {units.length} resultados. Refine a busca para encontrar um monstro.</p> : null}
    </div>
  );
}

function StorageGrid({ units }: { units: StorageUnit[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{units.slice(0, 120).map((unit) => <div key={unit.masterId} className="flex items-center gap-3 rounded-2xl border border-white/[.075] bg-white/[.025] p-3.5"><MonsterPortrait name={unit.name} image={unit.image} element={unit.element} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{unit.name}</p><div className="mt-1 flex items-center gap-2"><ElementBadge element={unit.element} /><span className="text-xs text-amber-300">{stars(unit.grade)}</span></div></div><div className="rounded-xl bg-white/[.055] px-2.5 py-1.5 text-sm font-semibold">×{unit.quantity}</div></div>)}</div>;
}

function RuneCard({ rune }: { rune: RuneData }) {
  return <div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-300/80">Slot {rune.slot}</p><h4 className="mt-1 text-lg font-semibold">{runeSets[rune.setId] ?? `Conjunto ${rune.setId}`}</h4></div><div className="text-right"><p className="text-sm font-semibold text-amber-300">+{rune.level}</p><p className="mt-1 text-xs text-slate-500">{stars(rune.stars)}</p></div></div>
    <div className="my-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[.055] px-3 py-2"><p className="text-xs text-slate-500">Atributo principal</p><p className="mt-0.5 font-semibold text-cyan-100">{formatRuneEffect(rune.main)}</p></div>
    <div className="space-y-1.5">
      {rune.prefix ? <p className="text-sm text-violet-200">{formatRuneEffect(rune.prefix)} <span className="text-xs text-slate-600">inato</span></p> : null}
      {rune.substats.map((effect, index) => <p key={`${effect.type}-${index}`} className="flex items-center justify-between text-sm text-slate-300"><span>{formatRuneEffect(effect)}</span>{effect.enchanted ? <span className="text-xs text-violet-300">gema</span> : effect.grind > 0 ? <span className="text-xs text-emerald-300">+{effect.grind}</span> : null}</p>)}
    </div>
    <p className="mt-3 border-t border-white/[.06] pt-2 text-xs text-slate-600">{runeRarities[rune.rarity] ?? 'Runa'} · ID {rune.id}</p>
  </div>;
}

function MonsterDetailSheet({ unit, onClose }: { unit: MonsterUnit | null; onClose: () => void }) {
  return <Sheet open={Boolean(unit)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side="right" className="data-[side=right]:w-[min(96vw,1100px)] data-[side=right]:sm:max-w-none overflow-y-auto border-white/10 bg-[#151b2a]/98 p-0">
      {unit ? <>
        <SheetHeader className="border-b border-white/[.08] p-5 sm:p-6"><div className="flex items-center gap-4 pr-10"><MonsterPortrait name={unit.name} image={unit.image} element={unit.element} size="lg" /><div><div className="flex flex-wrap items-center gap-2"><SheetTitle className="text-2xl font-semibold">{unit.name}</SheetTitle><ElementBadge element={unit.element} /></div><SheetDescription className="mt-1">Nível {unit.level} · {stars(unit.grade)} · {unit.secondAwakening ? '2º despertar' : unit.awakened ? 'Despertado' : unit.family}</SheetDescription></div></div></SheetHeader>
        <div className="space-y-6 p-5 sm:p-6">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
            ['HP', formatNumber(unit.stats.hp)], ['ATQ', formatNumber(unit.stats.atk)], ['DEF', formatNumber(unit.stats.def)], ['VEL', formatNumber(unit.stats.spd)],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[.07] bg-white/[.03] p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</section>
          <section><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Equipamento</p><h3 className="mt-1 text-xl font-semibold">Runas equipadas</h3></div><Badge variant="outline" className={unit.runes === 6 ? 'border-emerald-400/20 text-emerald-200' : 'border-orange-400/20 text-orange-200'}>{unit.runes}/6 runas</Badge></div>
            {unit.runeDetails.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{unit.runeDetails.map((rune) => <RuneCard key={rune.id} rune={rune} />)}</div> : <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center"><Gem className="mx-auto size-6 text-slate-600" /><p className="mt-3 font-medium text-slate-300">Nenhuma runa equipada</p><p className="mt-1 text-sm text-slate-500">Esse monstro está pronto para receber uma build.</p></div>}
          </section>
          <section className="flex flex-wrap gap-2"><Badge variant="outline" className="border-white/10 text-slate-400"><Gauge /> {unit.skillUpsRemaining ? `${unit.skillUpsRemaining} skill-ups faltando` : 'Habilidades completas'}</Badge><Badge variant="outline" className="border-white/10 text-slate-400"><Sparkles /> {unit.artifacts}/2 artefatos</Badge></section>
        </div>
      </> : null}
    </SheetContent>
  </Sheet>;
}

function StatChange({ label, before, after, suffix = '%' }: { label: string; before: number; after: number; suffix?: string }) {
  const delta = after - before;
  return <div className="rounded-xl border border-white/[.065] bg-black/10 px-3 py-2"><p className="text-xs text-slate-500">{label}</p><div className="mt-1 flex items-baseline gap-2"><span className="font-semibold">{after}{suffix}</span>{delta !== 0 ? <span className={`text-xs ${delta > 0 ? 'text-emerald-300' : 'text-orange-300'}`}>{delta > 0 ? '+' : ''}{delta}{suffix}</span> : <span className="text-xs text-slate-600">igual</span>}</div></div>;
}

function RunePlanView({ runePlan }: { runePlan: RunePlan }) {
  const changed = runePlan.recommendations.filter((item) => item.moves.length > 0);
  return <div className="space-y-4">
    <section className="grid gap-4 sm:grid-cols-3">
      {[{ icon: Database, value: runePlan.analyzedRuneCount, label: 'runas próprias analisadas' }, { icon: Users, value: runePlan.targetCount, label: 'monstros PvE revisados' }, { icon: TrendingUp, value: changed.length, label: 'builds com ganho encontrado' }].map(({ icon: Icon, value, label }) => <Card key={label} className="border-white/10 bg-white/[.045] shadow-none"><CardContent className="p-5"><Icon className="mb-4 size-5 text-cyan-300" /><p className="text-3xl font-semibold">{formatNumber(value)}</p><p className="mt-1 text-sm text-slate-400">{label}</p></CardContent></Card>)}
    </section>
    <Alert className="border-emerald-400/15 bg-emerald-400/[.055] text-emerald-100"><Shield /><AlertTitle>Otimização segura com suas runas</AlertTitle><AlertDescription className="text-emerald-100/65">Runas de outros monstros permanecem no lugar, bloqueios são respeitados e as builds da Arena Mundial não são alteradas. Cada runa aparece em apenas uma sugestão.</AlertDescription></Alert>
    <section className="grid gap-4 xl:grid-cols-2">
      {runePlan.recommendations.map((item) => <Card key={item.unitId} className="border-white/10 bg-white/[.04] shadow-none">
        <CardHeader className="flex-row items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl">{item.name}</CardTitle><Badge variant="outline" className="border-cyan-300/20 text-cyan-200">{item.area}</Badge></div><p className="mt-2 text-sm text-slate-500">{item.currentSets} <ArrowRight className="mx-1 inline size-3" /> <span className="text-slate-300">{item.suggestedSets}</span></p></div>{item.moves.length ? <Badge className="bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10">+{item.improvement}%</Badge> : <Badge variant="outline" className="border-white/10 text-slate-400"><CheckCircle2 /> Manter</Badge>}</CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2"><StatChange label="ATQ" before={item.currentStats.atkPct} after={item.suggestedStats.atkPct} /><StatChange label="Taxa CR" before={item.currentStats.critRate} after={item.suggestedStats.critRate} /><StatChange label="Dano CR" before={item.currentStats.critDamage} after={item.suggestedStats.critDamage} /><StatChange label="VEL" before={item.currentStats.speed} after={item.suggestedStats.speed} suffix="" /><StatChange label="HP" before={item.currentStats.hpPct} after={item.suggestedStats.hpPct} /><StatChange label="Precisão" before={item.currentStats.accuracy} after={item.suggestedStats.accuracy} /></div>
          {item.moves.length ? <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.13em] text-slate-500">Trocas sugeridas</p><div className="space-y-1.5">{item.moves.map((move) => <div key={`${item.unitId}-${move.slot}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/10 px-3 py-2 text-sm"><span><strong className="text-amber-300">Slot {move.slot}</strong> · {move.set} +{move.level}</span><span className="truncate text-xs text-slate-500">de {move.from}</span></div>)}</div></div> : <p className="rounded-xl border border-white/[.06] bg-black/10 px-3 py-2 text-sm text-slate-400">A build atual já superou as alternativas seguras disponíveis.</p>}
        </CardContent>
      </Card>)}
    </section>
    <Card className="border-white/10 bg-white/[.04] shadow-none"><CardHeader><p className="text-xs font-semibold uppercase tracking-[.13em] text-slate-500">Potencial no inventário</p><CardTitle className="text-xl">Runas que merecem ser aumentadas</CardTitle><p className="text-sm text-slate-400">Runas 6★ de qualidade Herói ou Lendária, com pelo menos três atributos úteis.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{runePlan.upgrades.map((rune) => <div key={rune.runeId} className="rounded-2xl border border-white/[.07] bg-black/10 p-4"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-amber-300">Slot {rune.slot}</p><p className="mt-1 font-semibold">{rune.set}</p></div><Badge variant="outline" className="border-white/10 text-slate-400">+{rune.level}</Badge></div><p className="mt-3 rounded-xl bg-cyan-300/[.06] px-3 py-2 text-sm font-medium text-cyan-100">{formatRuneEffect(rune.main)}</p><div className="mt-3 space-y-1">{rune.substats.map((effect, index) => <p key={`${rune.runeId}-${index}`} className="text-sm text-slate-400">{formatRuneEffect(effect)}</p>)}</div></div>)}</CardContent></Card>
  </div>;
}

export default function Home() {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [runePlan, setRunePlan] = useState<RunePlan | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [element, setElement] = useState('all');
  const [grade, setGrade] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState<MonsterUnit | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; title: string; message: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const focuses = useMemo(() => account ? buildFocusItems(account) : [], [account]);
  const runeChanges = useMemo(() => runePlan ? runePlan.recommendations.filter((item) => item.moves.length > 0) : [], [runePlan]);
  const storedFocuses = focuses.filter((item) => item.location === 'Armazenado');

  const filteredUnits = useMemo(() => (account?.units ?? []).filter((unit) => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return (!query || unit.name.toLocaleLowerCase('pt-BR').includes(query) || unit.family.toLocaleLowerCase('pt-BR').includes(query))
      && (element === 'all' || unit.element === element)
      && (grade === 'all' || unit.grade === Number(grade));
  }).sort((a, b) => b.grade - a.grade || b.level - a.level || a.name.localeCompare(b.name)), [account, search, element, grade]);

  const filteredStorage = useMemo(() => (account?.storage ?? []).filter((unit) => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return (!query || unit.name.toLocaleLowerCase('pt-BR').includes(query) || unit.family.toLocaleLowerCase('pt-BR').includes(query))
      && (element === 'all' || unit.element === element)
      && (grade === 'all' || unit.grade === Number(grade));
  }).sort((a, b) => b.quantity - a.quantity || b.naturalStars - a.naturalStars || a.name.localeCompare(b.name)), [account, search, element, grade]);

  const sixStars = account?.units.filter((unit) => unit.grade === 6).length ?? 0;
  const completed = account?.units.filter((unit) => unit.grade === 6 && unit.level === 40 && unit.runes === 6).length ?? 0;
  const storedCopies = account?.storage.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const elementCounts = useMemo(() => elements.slice(1).map((name) => ({ name, count: account?.units.filter((unit) => unit.element === name).length ?? 0 })), [account]);
  const maxElement = Math.max(...elementCounts.map((item) => item.count), 1);

  useEffect(() => {
    const context = (document as WebMCPDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'filter_monsters',
        title: 'Filtrar monstros',
        description: 'Abre a lista de monstros e aplica busca por nome e elemento.',
        inputSchema: { type: 'object', properties: { search: { type: 'string' }, element: { type: 'string', enum: elements } }, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const value = (input ?? {}) as { search?: string; element?: string };
          setSearch(typeof value.search === 'string' ? value.search : '');
          setElement(elements.includes(value.element ?? '') ? String(value.element) : 'all');
          setActiveTab('monsters');
          return { view: 'monsters', search: value.search ?? '', element: value.element ?? 'all' };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* Browser sem suporte ao WebMCP. */ }
    return () => lifecycle.abort();
  }, []);

  async function loadFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Parameters<typeof parseRawAccount>[0];
      const catalog = await fetch('/data/monster-catalog.json').then((response) => {
        if (!response.ok) throw new Error('O catálogo de monstros não pôde ser carregado.');
        return response.json() as Promise<Record<string, MonsterCatalogEntry>>;
      });
      const next = parseRawAccount(parsed, catalog);
      const nextRunePlan = optimizeRunes(parsed, catalog);
      setAccount(next);
      setRunePlan(nextRunePlan);
      setSelectedUnit(null);
      setActiveTab('overview');
      setNotice({ kind: 'success', title: 'Conta atualizada', message: `${next.profile.name}: ${next.units.length} monstros ativos analisados no navegador.` });
    } catch (error) {
      setNotice({ kind: 'error', title: 'Não consegui ler esse arquivo', message: error instanceof Error ? error.message : 'Escolha um export JSON válido.' });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function clearFilters() { setSearch(''); setElement('all'); setGrade('all'); }

  if (!account || !runePlan) {
    return (
      <main className="mx-auto grid min-h-screen max-w-[1100px] place-items-center px-4 py-12 sm:px-7">
        <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} />
        <Card className="w-full overflow-hidden border-white/10 bg-white/[.04] shadow-2xl shadow-black/20">
          <CardContent className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:p-14">
            <div className="flex flex-col justify-center">
              <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300"><Swords className="size-7" /></div>
              <Badge variant="outline" className="mb-4 w-fit border-cyan-300/20 bg-cyan-300/5 text-cyan-200">Nenhuma conta carregada</Badge>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-5xl">Sua análise começa com um <span className="text-amber-300">arquivo JSON.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">Este dashboard usa o arquivo JSON extraído pelo <strong className="font-semibold text-slate-200">Summoners War Exporter</strong>. Selecione esse arquivo para analisar monstros, armazenamento, progresso, runas e prioridades PvE.</p>
              <Button size="lg" className="mt-7 w-fit rounded-xl bg-amber-300 text-slate-950 hover:bg-amber-200" onClick={() => fileInput.current?.click()}><Upload className="size-5" /> Selecionar arquivo JSON</Button>
              <p className="mt-4 text-xs leading-5 text-slate-500">O arquivo é processado somente nesta página. Nada é salvo no navegador ou enviado para um servidor.</p>
              {notice ? <Alert className="mt-5 border-orange-400/15 bg-orange-400/[.07] text-orange-100"><AlertTriangle /><AlertTitle>{notice.title}</AlertTitle><AlertDescription className="text-current/70">{notice.message}</AlertDescription></Alert> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[['Monstros', 'Lista, níveis, evolução e equipamento'], ['Armazenamento', 'Cópias ordenadas por quantidade'], ['Insights', 'Prioridades calculadas a partir do export'], ['Runas', 'Trocas e melhorias usando apenas suas runas']].map(([title, description]) => <div key={title} className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5"><div className="mb-4 h-2 w-20 rounded-full bg-white/[.07]" /><p className="font-medium text-slate-300">{title}</p><p className="mt-1 text-sm text-slate-600">{description}</p></div>)}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-12 pt-5 sm:px-7 lg:px-10">
      <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} />

      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300 shadow-[0_0_30px_rgb(251_191_36/10%)]"><Swords className="size-5" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300/80">Summoner Lab</p><h1 className="text-lg font-semibold tracking-tight">{account.profile.name}</h1></div>
        </div>
        <div className="flex items-center gap-2"><Badge variant="outline" className="hidden border-white/10 text-slate-400 sm:flex">Atualizado {formatAccountDate(account.generatedAt)}</Badge><Button className="rounded-xl bg-amber-300 text-slate-950 hover:bg-amber-200" onClick={() => fileInput.current?.click()}><Upload className="size-4" /> Atualizar JSON</Button></div>
      </header>

      {notice ? <Alert className={`mb-5 border-white/10 ${notice.kind === 'success' ? 'bg-emerald-400/[.07] text-emerald-100' : 'bg-orange-400/[.07] text-orange-100'}`}>{notice.kind === 'success' ? <CheckCircle2 /> : <AlertTriangle />}<AlertTitle>{notice.title}</AlertTitle><AlertDescription className="text-current/70">{notice.message}</AlertDescription><Button variant="ghost" size="icon-sm" className="absolute right-2 top-2" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X /></Button></Alert> : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Badge variant="outline" className="mb-3 border-cyan-300/20 bg-cyan-300/5 text-cyan-200">Conta nível {account.profile.level}</Badge>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-5xl">Sua box, transformada em <span className="text-amber-300">próximas decisões.</span></h2>
          </div>
          <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-xl border border-white/[.075] bg-white/[.045] p-1 lg:w-auto">
            <TabsTrigger value="overview" className="px-3"><BarChart3 /> Visão geral</TabsTrigger>
            <TabsTrigger value="monsters" className="px-3"><Users /> Monstros</TabsTrigger>
            <TabsTrigger value="storage" className="px-3"><Box /> Armazenados</TabsTrigger>
            <TabsTrigger value="insights" className="px-3"><Lightbulb /> Insights</TabsTrigger>
            <TabsTrigger value="runes" className="px-3"><Gem /> Runas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Database, value: account.units.length, label: 'monstros ativos', note: `${storedCopies} cópias no armazenamento` },
              { icon: Shield, value: sixStars, label: 'monstros 6★', note: `${Math.round((sixStars / Math.max(account.units.length, 1)) * 100)}% da box ativa` },
              { icon: Activity, value: account.inventory.equippedRunes, label: 'runas equipadas', note: `${account.inventory.runes} no inventário` },
              { icon: Sparkles, value: focuses.length, label: 'focos encontrados', note: 'prioridade configurada para PvE' },
            ].map(({ icon: Icon, value, label, note }) => <Card key={label} className="border-white/10 bg-white/[.045] shadow-none backdrop-blur-xl"><CardContent className="p-5"><Icon className="mb-5 size-5 text-slate-400" /><p className="text-3xl font-semibold tracking-tight">{formatNumber(value)}</p><p className="mt-1 text-sm text-slate-300">{label}</p><p className="mt-4 text-xs text-slate-500">{note}</p></CardContent></Card>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
            <Card className="border-white/10 bg-white/[.045] shadow-none backdrop-blur-xl">
              <CardHeader className="flex-row items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[.15em] text-slate-500">Plano de evolução</p><CardTitle className="mt-1 text-xl">Próximos focos para PvE</CardTitle></div><Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setActiveTab('insights')}>Análise completa <ArrowRight /></Button></CardHeader>
              <CardContent className="space-y-3">{focuses.slice(0, 4).map((item, index) => <FocusCard key={item.key} item={item} index={index} />)}</CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="border-white/10 bg-gradient-to-br from-cyan-400/[.08] to-violet-400/[.04] shadow-none"><CardHeader><p className="text-xs font-medium uppercase tracking-[.15em] text-cyan-300/70">Insight principal</p><CardTitle className="text-2xl leading-tight">{focuses[0]?.action ?? 'Sua conta está pronta para uma revisão.'}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-400">{focuses[0]?.reason ?? 'Atualize o JSON para gerar novas recomendações.'}</p></CardContent></Card>
              <Card className="border-white/10 bg-white/[.045] shadow-none"><CardHeader><p className="text-xs font-medium uppercase tracking-[.15em] text-slate-500">Box por elemento</p><CardTitle className="text-xl">Distribuição</CardTitle></CardHeader><CardContent className="space-y-3">{elementCounts.map((item) => <div key={item.name} className="grid grid-cols-[54px_1fr_30px] items-center gap-3"><span className="text-xs text-slate-400">{elementLabel(item.name)}</span><Progress value={(item.count / maxElement) * 100} className="h-2 bg-white/[.06]" /><span className="text-right font-mono text-xs text-slate-500">{item.count}</span></div>)}</CardContent></Card>
            </div>
          </section>

          <Card className="border-white/10 bg-white/[.035] shadow-none"><CardHeader className="flex-row items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[.15em] text-slate-500">Saúde da box</p><CardTitle className="mt-1 text-xl">{completed} monstros prontos para entrar em campo</CardTitle></div><Badge variant="outline" className="border-emerald-400/20 text-emerald-200">{Math.round((completed / Math.max(account.units.length, 1)) * 100)}% completos</Badge></CardHeader><CardContent><Progress value={(completed / Math.max(account.units.length, 1)) * 100} className="h-2 bg-white/[.06]" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="monsters" className="space-y-4"><RosterHeader title="Monstros ativos" description={`${filteredUnits.length} de ${account.units.length} monstros · clique em um para ver as runas`} search={search} setSearch={setSearch} element={element} setElement={setElement} grade={grade} setGrade={setGrade} clear={clearFilters} /><MonsterTable units={filteredUnits} onSelect={setSelectedUnit} /></TabsContent>
        <TabsContent value="storage" className="space-y-4"><RosterHeader title="Armazenamento" description={`${filteredStorage.length} tipos · ${storedCopies} cópias no total`} search={search} setSearch={setSearch} element={element} setElement={setElement} grade={grade} setGrade={setGrade} clear={clearFilters} /><StorageGrid units={filteredStorage} /></TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, value: account.units.length, label: 'monstros ativos', note: `${account.storage.length} registros no armazenamento` },
              { icon: Lightbulb, value: focuses.length, label: 'prioridades encontradas', note: `${focuses.filter((item) => item.location === 'Armazenado').length} vieram do armazenamento` },
              { icon: Gem, value: runeChanges.length, label: 'builds com ganho', note: `${runePlan.analyzedRuneCount} runas do export analisadas` },
            ].map(({ icon: Icon, value, label, note }) => <Card key={label} className="border-white/10 bg-white/[.045] shadow-none"><CardContent className="p-5"><Icon className="mb-4 size-5 text-cyan-300" /><p className="text-3xl font-semibold">{formatNumber(value)}</p><p className="mt-1 text-sm text-slate-300">{label}</p><p className="mt-3 text-xs text-slate-500">{note}</p></CardContent></Card>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <Card className="border-white/10 bg-white/[.045] shadow-none"><CardHeader><p className="text-xs font-medium uppercase tracking-[.15em] text-slate-500">Roteiro deste export</p><CardTitle className="mt-1 text-2xl">Onde investir primeiro</CardTitle><p className="max-w-2xl text-sm leading-6 text-slate-400">A prioridade foi recalculada com {account.units.length} monstros ativos e {account.storage.length} registros armazenados. Ela cruza progresso, equipamento e utilidade em dungeons, ToA e raid.</p></CardHeader><CardContent className="space-y-3">{focuses.map((item, index) => <FocusCard key={item.key} item={item} index={index} />)}</CardContent></Card>
            <div className="space-y-4">
              <Card className="border-emerald-300/15 bg-emerald-300/[.055] shadow-none"><CardHeader><TrendingUp className="size-5 text-emerald-300" /><CardTitle className="text-xl">Ajustes de runas deste export</CardTitle><p className="text-sm text-slate-400">Somente ganhos encontrados com as runas que você já possui.</p></CardHeader><CardContent className="space-y-2">{runeChanges.length ? runeChanges.map((item) => <div key={item.unitId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-black/10 px-3 py-3"><div><p className="font-medium text-slate-200">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.moves.length} trocas · {item.area}</p></div><Badge className="bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10">+{item.improvement}%</Badge></div>) : <p className="rounded-xl border border-white/[.07] bg-black/10 px-3 py-3 text-sm text-slate-400">Nenhuma troca segura superou as builds atuais.</p>}</CardContent></Card>
              <Card className="border-amber-300/15 bg-amber-300/[.055] shadow-none"><CardHeader><WandSparkles className="size-5 text-amber-300" /><CardTitle className="text-xl">Como a ordem foi calculada</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-slate-400"><p>A pontuação agora considera evolução, nível, qualidade das runas, artefatos, habilidades e despertar da melhor cópia de cada monstro.</p><p>{storedFocuses.length ? `${storedFocuses.map((item) => item.name).join(', ')} vieram do armazenamento.` : 'As dez maiores prioridades deste export estão na box ativa.'}</p><p>A análise de runas encontrou ganho para {runeChanges.map((item) => item.name).join(' e ') || 'nenhuma build'}.</p></CardContent></Card>
              <Card className="border-white/10 bg-white/[.035] shadow-none"><CardHeader><PackageOpen className="size-5 text-cyan-300" /><CardTitle className="text-xl">Privacidade do arquivo</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-400">O resumo exibido exclui chaves de sessão e outros campos sensíveis do export.</p></CardContent></Card>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="runes"><RunePlanView runePlan={runePlan} /></TabsContent>
      </Tabs>
      <MonsterDetailSheet unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </main>
  );
}

function RosterHeader({ title, description, search, setSearch, element, setElement, grade, setGrade, clear }: { title: string; description: string; search: string; setSearch: (value: string) => void; element: string; setElement: (value: string) => void; grade: string; setGrade: (value: string) => void; clear: () => void }) {
  const dirty = search || element !== 'all' || grade !== 'all';
  return <Card className="border-white/10 bg-white/[.04] shadow-none"><CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center"><div className="mr-auto"><h3 className="text-xl font-semibold">{title}</h3><p className="text-sm text-slate-500">{description}</p></div><div className="relative min-w-0 flex-1 xl:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou família" className="h-10 border-white/10 bg-black/10 pl-9" /></div><div className="flex flex-wrap gap-2"><Select value={element} onValueChange={(value) => setElement(value ?? 'all')}><SelectTrigger className="h-10 min-w-32 border-white/10 bg-black/10"><SelectValue placeholder="Elemento" /></SelectTrigger><SelectContent>{elements.map((item) => <SelectItem key={item} value={item}>{item === 'all' ? 'Todos elementos' : elementLabel(item)}</SelectItem>)}</SelectContent></Select><Select value={grade} onValueChange={(value) => setGrade(value ?? 'all')}><SelectTrigger className="h-10 min-w-28 border-white/10 bg-black/10"><SelectValue placeholder="Estrelas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas estrelas</SelectItem>{[6, 5, 4, 3, 2, 1].map((item) => <SelectItem key={item} value={String(item)}>{item} estrelas</SelectItem>)}</SelectContent></Select>{dirty ? <Button variant="ghost" className="h-10 text-slate-400" onClick={clear}><Filter /> Limpar</Button> : null}</div></CardContent></Card>;
}
