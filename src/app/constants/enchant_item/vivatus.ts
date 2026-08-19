import { Acute, Adamatine, AttackDelay, Affection, EA, FS, MagicEess, MasterArc, Mettle, Sharp, SkillDelay, Spell, Tenacity } from "./_basic";

/**
 * Ziki's enchants for the Elmos da Fé (every `Viva_Adul_Hat_*`, 17 classes x 2).
 *
 * Both pools are the ones the encantador actually offers, taken from the item ids the
 * bROWiki table links each cell to — not from the enchant names, which abbreviate to
 * things that read like a different family ("E. Lutador" is *Espírito do Lutador*,
 * `Fighting_Spirit`, and not Expert Fighter).
 *
 * Every line rolls at its first tier and Ziki upgrades it twice, so the reachable set is
 * three consecutive tiers per family — starting at 3 for Espírito do Lutador and at 1 for
 * everything else.
 *
 * https://browiki.org/wiki/Encantamento (Ziki > Elmos da Fé)
 */

/** Slot 3 in the UI: six families, the wiki's "Slot 4". */
export const vivatusHead3 = [
  FS._3,
  FS._4,
  FS._5,
  Spell._1,
  Spell._2,
  Spell._3,
  Sharp._1,
  Sharp._2,
  Sharp._3,
  AttackDelay._1,
  AttackDelay._2,
  AttackDelay._3,
  EA._1,
  EA._2,
  EA._3,
  SkillDelay._1,
  SkillDelay._2,
  SkillDelay._3,
];

/** Slot 4 in the UI: the seven Insígnias, the wiki's "Slot 3". */
export const vivatusHead4 = [
  MagicEess._1,
  MagicEess._2,
  MagicEess._3,
  MasterArc._1,
  MasterArc._2,
  MasterArc._3,
  Adamatine._1,
  Adamatine._2,
  Adamatine._3,
  Tenacity._1,
  Tenacity._2,
  Tenacity._3,
  Mettle._1,
  Mettle._2,
  Mettle._3,
  Acute._1,
  Acute._2,
  Acute._3,
  Affection._1,
  Affection._2,
  Affection._3,
];
