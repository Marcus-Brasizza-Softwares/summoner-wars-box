import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve(process.env.SWARFARM_CATALOG ?? '/tmp/sw-bestiary.json');
const destination = resolve('public/data/monster-catalog.json');
const rows = JSON.parse(await readFile(source, 'utf8'));
const byId = new Map(rows.map((monster) => [monster.id, monster]));

const catalog = Object.fromEntries(
  rows.map((monster) => {
    const awakened = monster.awakens_to ? byId.get(monster.awakens_to) : null;
    return [
      String(monster.com2us_id),
      {
        name: awakened?.name ?? monster.name,
        family: monster.name,
        element: monster.element,
        naturalStars: monster.natural_stars,
        awakened: monster.awaken_level > 0,
        secondAwakening: monster.awaken_level === 2,
        image: (awakened ?? monster).image_filename,
        skillUps: (awakened ?? monster).skill_ups_to_max ?? 0,
      },
    ];
  }),
);

await mkdir(resolve('public/data'), { recursive: true });
await writeFile(destination, JSON.stringify(catalog));
console.log(`Catálogo preparado: ${Object.keys(catalog).length} monstros.`);
