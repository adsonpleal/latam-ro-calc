import { ElementType } from './element-type.const';

/** Monster skill IDs, listed levels and unique entries from Divine Pride's Skills tab.
 * Formula references and the differences from player skills are in docs/damage-taken.md. */
export interface MonsterOffensiveSkill {
  id: number;
  name: string;
  level: number;
  damageType: 'physical' | 'magical' | 'fixed';
  element: ElementType;
  formula: 'npc-comet' | 'tetra-vortex' | 'hell-judgement' | 'dark-strike' | 'meteor-storm' | 'killing-aura' | 'earthquake';
  /** NPC variants can use a different hit count than the listed player-skill level. */
  hitsPerMeteor?: number;
  note: string;
}

const BETELGEUSE_SKILLS: readonly MonsterOffensiveSkill[] = [
  { id: 708, name: 'Cometa', level: 4, damageType: 'magical', element: ElementType.Neutral, formula: 'npc-comet',
    note: 'Versão de monstro (NPC_COMET): o dano diminui com a distância ao centro. Os 20 golpes exibidos dividem um único dano.' },
  { id: 2217, name: 'Tetra Vortex', level: 5, damageType: 'magical', element: ElementType.Neutral, formula: 'tetra-vortex',
    note: '4 golpes de 2.800% de ATQM. Quando usado por monstros, o elemento é Neutro.' },
  { id: 768, name: 'Julgamento Infernal', level: 5, damageType: 'physical', element: ElementType.Neutral, formula: 'hell-judgement',
    note: 'Versão NPC_HELLJUDGEMENT2: 500% de ATQ. A distância ao monstro determina a redução física à distância.' },
  { id: 340, name: 'Ataque Sombrio', level: 10, damageType: 'magical', element: ElementType.Dark, formula: 'dark-strike',
    note: '5 golpes de 100% de ATQM, de propriedade Sombrio.' },
  { id: 83, name: 'Chuva de Meteoros', level: 10, damageType: 'magical', element: ElementType.Fire, formula: 'meteor-storm', hitsPerMeteor: 15,
    note: 'A versão usada pelo Betelgeuse exibe 15 golpes por impacto nos replays LATAM. Cada golpe usa 125% de ATQM; a posição determina quantos meteoros acertam.' },
  { id: 783, name: 'Aura Assassina', level: 4, damageType: 'fixed', element: ElementType.Neutral, formula: 'killing-aura',
    note: '10.000 de dano fixo por segundo. Ignora as defesas e resistências de equipamento; bloqueios e habilidades defensivas não são simulados.' },
  { id: 750, name: 'Terremoto', level: 4, damageType: 'magical', element: ElementType.Neutral, formula: 'earthquake',
    note: '3 ondas de 800% de ATQ, divididas entre os alvos vivos na área. Ignora DEF, DEFM, TEN, TENM e resistências de raça, elemento, tamanho e chefe. O elemento da armadura e a redução mágica geral se aplicam.' },
];

/** Add another monster here without changing the calculation or the card. */
const MONSTER_SKILLS: Readonly<Record<number, readonly MonsterOffensiveSkill[]>> = { 20994: BETELGEUSE_SKILLS };

export function getMonsterOffensiveSkills(monsterId: number): readonly MonsterOffensiveSkill[] {
  return MONSTER_SKILLS[monsterId] ?? [];
}
