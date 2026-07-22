import { WeaponSubTypeName } from '../constants/weapon-type-mapper';
import { ClassName } from './_class-name';

type MainAspdEffect = 'base' | 'shield';
type X = {
  [key in WeaponSubTypeName | 'left-Dagger' | 'left-Sword']?: number;
};
type Y = {
  [key in MainAspdEffect]: number;
};
interface XX extends Y, X { }

export const AspdTable: Partial<Record<ClassName, XX>> = {
  [ClassName.RuneKnight]: { base: 156, shield: -5, Dagger: -10, Sword: -12, 'Two-Handed Sword': -15, Axe: -8, 'Two-Handed Axe': -12, Mace: -5, 'Two-Handed Mace': -12, Spear: -20, 'Two-Handed Spear': -18 },
  [ClassName.DragonKnight]: { base: 156, shield: -5, Dagger: -10, Sword: -12, 'Two-Handed Sword': -15, Axe: -8, 'Two-Handed Axe': -12, Mace: -5, 'Two-Handed Mace': -12, Spear: -20, 'Two-Handed Spear': -18 },
  [ClassName.RoyalGuard]: { base: 156, shield: -5, Dagger: -7, Sword: -5, 'Two-Handed Sword': -13, Axe: -8, 'Two-Handed Axe': -12, Mace: -4, 'Two-Handed Mace': -10, Spear: -10, 'Two-Handed Spear': -10 },
  [ClassName.ImperialGuard]: { base: 156, shield: -5, Dagger: -7, Sword: -5, 'Two-Handed Sword': -13, Axe: -8, 'Two-Handed Axe': -12, Mace: -4, 'Two-Handed Mace': -10, Spear: -10, 'Two-Handed Spear': -10 },

  [ClassName.Ranger]: { base: 156, shield: -8, Dagger: -10, Bow: -9 },
  [ClassName.Windhawk]: { base: 156, shield: -8, Dagger: -10, Bow: -9 },
  [ClassName.Minstrel]: { base: 156, shield: -7, Dagger: -12, Bow: -9, Instrument: -4 },
  [ClassName.Troubadour]: { base: 156, shield: -7, Dagger: -12, Bow: -9, Instrument: -4 },
  [ClassName.Wanderer]: { base: 156, shield: -7, Dagger: -12, Bow: -9, Whip: -5 },
  [ClassName.Trouvere]: { base: 156, shield: -7, Dagger: -12, Bow: -9, Whip: -5 },

  [ClassName.Mechanic]: { base: 156, shield: -6, Dagger: -20, Sword: -25, Axe: -5, 'Two-Handed Axe': -8, Mace: -8, 'Two-Handed Mace': -10 },
  [ClassName.Meister]: { base: 156, shield: -6, Dagger: -20, Sword: -25, Axe: -5, 'Two-Handed Axe': -8, Mace: -8, 'Two-Handed Mace': -10 },
  [ClassName.Genetic]: { base: 156, shield: -4, Dagger: -10, Sword: -4, Axe: -8, 'Two-Handed Axe': -11, Mace: -4, 'Two-Handed Mace': -8 },
  [ClassName.Biolo]: { base: 156, shield: -4, Dagger: -10, Sword: -4, Axe: -8, 'Two-Handed Axe': -11, Mace: -4, 'Two-Handed Mace': -8 },

  [ClassName.ArchBishop]: { base: 151, shield: -5, Mace: 0, 'Two-Handed Mace': 0, Rod: -15, 'Two-Handed Rod': -10, Book: 1, Fistweapon: -5 },
  [ClassName.Cardinal]: { base: 151, shield: -5, Mace: 0, 'Two-Handed Mace': 0, Rod: -15, 'Two-Handed Rod': -10, Book: 1, Fistweapon: -5 },
  [ClassName.Sura]: { base: 158, shield: -5, Mace: -5, 'Two-Handed Mace': -7, Rod: -10, 'Two-Handed Rod': -12, Fistweapon: -1 },
  // bROWiki's Inquisidor table is identical to Shura's.
  [ClassName.Inquisitor]: { base: 158, shield: -5, Mace: -5, 'Two-Handed Mace': -7, Rod: -10, 'Two-Handed Rod': -12, Fistweapon: -1 },

  [ClassName.GuillotineCross]: { base: 156, shield: -9, Dagger: -2, Sword: -25, Axe: -40, Katar: -2, 'left-Dagger': -10, 'left-Sword': -16 },
  [ClassName.ShadowCross]: { base: 156, shield: -9, Dagger: -2, Sword: -25, Axe: -40, Katar: -2, 'left-Dagger': -10, 'left-Sword': -16 },
  [ClassName.ShadowChaser]: { base: 156, shield: -4, Dagger: -3, Sword: -7, Bow: -7 },
  [ClassName.AbyssChaser]: { base: 156, shield: -4, Dagger: -3, Sword: -7, Bow: -7 },

  [ClassName.Sorcerer]: { base: 156, shield: -5, Dagger: -10, Sword: -10, Rod: -5, 'Two-Handed Rod': -15, Book: -5 },
  [ClassName.ElementalMaster]: { base: 156, shield: -4, Dagger: -10, Sword: -10, Rod: -5, 'Two-Handed Rod': -15, Book: -5 },
  [ClassName.Warlock]: { base: 151, shield: -5, Dagger: -7, Sword: -15, Rod: -5, 'Two-Handed Rod': -11 },
  [ClassName.ArchMage]: { base: 151, shield: -5, Dagger: -7, Sword: -15, Rod: -5, 'Two-Handed Rod': -11 },

  [ClassName.Doram]: { base: 156, shield: -7, Rod: -20 },
  [ClassName.SuperNovice]: { base: 156, shield: -10, Dagger: -15, Sword: -17, Mace: -10, Axe: -10, Rod: -25 },
  [ClassName.SoulReaper]: { base: 151, shield: -5, Dagger: -7, 'Two-Handed Rod': -11, Rod: -5 },
  [ClassName.SoulAscetic]: { base: 151, shield: -5, Dagger: -7, 'Two-Handed Rod': -11, Rod: -5 },

  // bROWiki only defines Livro (Book) and Escudo (Shield) for these — everything
  // else falls back to the unarmed base. The old blanket -10 was a placeholder.
  [ClassName.StarEmperor]: { base: 156, shield: -3, Book: -5 },
  [ClassName.SkyEmperor]: { base: 156, shield: -3, Book: -5 },

  // These held the Gunslinger (Justiceiro) table; bROWiki's Insurgente/Guerrilheiro.
  [ClassName.Rebellion]: { base: 151, shield: -10, Revolver: -5, Rifle: -10, 'Gatling Gun': -3, Shotgun: -30, 'Grenade Launcher': -35 },
  [ClassName.NightWatch]: { base: 151, shield: -10, Revolver: -5, Rifle: -10, 'Gatling Gun': -3, Shotgun: -30, 'Grenade Launcher': -35 },

  // bROWiki gives Adaga Esquerda (off-hand dagger) -11; it does not list an
  // off-hand sword, so `left-Sword` keeps the engine's existing estimate.
  [ClassName.Oboro]: { base: 156, shield: -3, Dagger: -5, Shuriken: -10, 'left-Dagger': -11, 'left-Sword': -10 },
  [ClassName.Kagerou]: { base: 156, shield: -3, Dagger: -5, Shuriken: -10, 'left-Dagger': -11, 'left-Sword': -10 },
  [ClassName.Shinkiro]: { base: 156, shield: -3, Dagger: -5, Shuriken: -10, 'left-Dagger': -11, 'left-Sword': -10 },
  [ClassName.Shiranui]: { base: 156, shield: -3, Dagger: -5, Shuriken: -10, 'left-Dagger': -11, 'left-Sword': -10 },
} as const;
