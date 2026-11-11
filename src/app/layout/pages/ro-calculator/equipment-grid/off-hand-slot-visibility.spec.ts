import { describe, expect, it } from 'vitest';
import { EquipmentSlotDescriptor, SLOTS_BY_KEY } from 'src/app/app-config/equipment-slots';
import { ItemTypeEnum } from 'src/app/constants/item-type.enum';
import { ItemModel } from 'src/app/models/item.model';
import { EquipmentGridComponent } from '../../../../../react/controllers/equipment-grid';
import { SlotListBag } from './slot-list-bag.model';
import { translate } from 'src/app/core/i18n';
import { DEFAULT_CATALOG } from 'src/app/i18n';

/**
 * Who sees the two rows that compete for the empty hand: the shield and the off-hand weapon.
 *
 * Both were read off the main build alone, so a two-handed weapon there took both of them
 * off the screen entirely — and the compare button with them, which is what card
 * `9lvALhlAS6Njj6z2pp6Q` (iukkeN) reported about the shield: there was nowhere to put the
 * compared build's shield. The off-hand weapon had exactly the same limitation, so
 * "two hands against one hand + a dagger in the left" could not be built either.
 *
 * Each build answers for itself (`isShieldShown`, `isCompareShieldShown`, `isLeftWeaponShown`
 * and `isCompareLeftWeaponShown`); what the grid does with the answers is what is pinned
 * here. The main half must not offer a picker when its own answer is no: a shield on a
 * two-handed build escapes the ASPD penalty but would still carry its script's bonuses into
 * the numbers.
 *
 * Card `JyzsGnX6LBTsVMnCW4d2` added the other half of the shield's story: the card stays on
 * screen while a two-handed weapon blocks it, so the slot reads as blocked rather than as
 * missing, and the tooltip says what to do about it.
 */

const TWO_HANDED = 2019;
const ONE_HANDED = 1623;

const item = (id: number, name: string, itemSubTypeId: number): ItemModel =>
  ({ id, name, aegisName: `Item_${id}`, itemLevel: 4, slots: 0, script: {}, itemSubTypeId }) as ItemModel;

const ITEMS: Record<number, ItemModel> = {
  // 266 is the two-handed rod; 265 the one-handed one.
  [TWO_HANDED]: item(TWO_HANDED, '[Aluguel] Cajado de Duas Mãos TE', 266),
  [ONE_HANDED]: item(ONE_HANDED, '[Aluguel] Cajado do Poder', 265),
};

function makeGrid(input: {
  weapon?: number; leftWeapon?: number; shield?: number;
  shieldShown?: boolean; compareShield?: boolean; leftWeaponShown?: boolean; compareLeftWeapon?: boolean;
  shieldBlockedByWeapon?: boolean;
}) {
  // No layout service, as in the grid's other specs: it only feeds the item search.
  const grid = new EquipmentGridComponent({ hintPending: false, labels: {} } as any,
    (key, params) => translate(DEFAULT_CATALOG, key, params));

  grid.items = ITEMS;
  grid.mapEnchant = new Map();
  grid.lists = { refineList: [], shadowRefineList: [] } as unknown as SlotListBag;
  grid.model = { rawOptionTxts: [], slotColors: {}, weapon: input.weapon, leftWeapon: input.leftWeapon, shield: input.shield };
  grid.model2 = { rawOptionTxts: [] };
  grid.compareItemNames = [];
  grid.showCompareItemMap = {};
  grid.isShieldShown = input.shieldShown ?? false;
  grid.isCompareShieldShown = input.compareShield ?? false;
  grid.isLeftWeaponShown = input.leftWeaponShown ?? false;
  grid.isCompareLeftWeaponShown = input.compareLeftWeapon ?? false;
  grid.isShieldBlockedByWeapon = input.shieldBlockedByWeapon ?? false;
  grid.refreshInputs();

  const slotKeys = grid.columns.flatMap((column) => column.flatMap((group) => group.slots.map((slot) => slot.key)));

  return {
    grid,
    shown: slotKeys.includes(ItemTypeEnum.shield),
    leftWeaponRowShown: slotKeys.includes(ItemTypeEnum.leftWeapon),
  };
}

const blockedNote = (grid: EquipmentGridComponent, slot: EquipmentSlotDescriptor) => grid.mainBlocked(slot)?.note ?? null;
const blockedTooltip = (grid: EquipmentGridComponent, slot: EquipmentSlotDescriptor) => grid.mainBlocked(slot)?.tooltip ?? null;

const shieldSlot = SLOTS_BY_KEY.get(ItemTypeEnum.shield)!;
const leftWeaponSlot = SLOTS_BY_KEY.get(ItemTypeEnum.leftWeapon)!;

describe('the shield row', () => {
  it('stays on screen against a two-handed weapon, blocked rather than missing', () => {
    const { grid, shown } = makeGrid({ weapon: TWO_HANDED, shieldBlockedByWeapon: true });

    expect(shown).toBe(true);
    expect(blockedNote(grid, shieldSlot)).toBe('[Aluguel] Cajado de Duas Mãos TE ocupa as duas mãos');
    expect(blockedTooltip(grid, shieldSlot))
      .toBe('Armas de duas mãos ocupam as duas mãos, então não sobra mão para o escudo. Equipe uma arma de uma mão para voltar a usar escudo.');
  });

  it('is off the screen when the off-hand weapon holds the hand and no comparison asks for it', () => {
    expect(makeGrid({ weapon: ONE_HANDED, leftWeapon: ONE_HANDED }).shown).toBe(false);
  });

  it('shows up for the compared build, with the main one saying what holds the hand', () => {
    const { grid, shown } = makeGrid({ weapon: TWO_HANDED, compareShield: true });

    expect(shown).toBe(true);
    expect(blockedNote(grid, shieldSlot)).toBe('[Aluguel] Cajado de Duas Mãos TE ocupa as duas mãos');
  });

  it('leaves no note at all when the main build can use a shield itself', () => {
    const { grid, shown } = makeGrid({ weapon: ONE_HANDED, shieldShown: true });

    expect(shown).toBe(true);
    expect(blockedNote(grid, shieldSlot)).toBeNull();
    expect(blockedTooltip(grid, shieldSlot)).toBeNull();
  });

  /** With no weapon the hand is free, so the row is the ordinary pickable one. */
  it('is pickable with no weapon equipped at all', () => {
    const { grid, shown } = makeGrid({ shieldShown: true });

    expect(shown).toBe(true);
    expect(blockedNote(grid, shieldSlot)).toBeNull();
  });

  it('explains the off-hand weapon, which competes for the same hand', () => {
    const { grid, shown } = makeGrid({ weapon: ONE_HANDED, leftWeapon: ONE_HANDED, compareShield: true });

    expect(shown).toBe(true);
    expect(blockedNote(grid, shieldSlot)).toBe('[Aluguel] Cajado do Poder ocupa a outra mão');
    expect(blockedTooltip(grid, shieldSlot))
      .toBe('A mão esquerda já está com uma arma, e é nela que vai o escudo. Remova a arma da mão esquerda para equipar um escudo.');
  });

  it('touches no slot outside the two rows that share the empty hand', () => {
    const { grid } = makeGrid({ weapon: TWO_HANDED, compareShield: true });

    expect(blockedNote(grid, SLOTS_BY_KEY.get(ItemTypeEnum.armor)!)).toBeNull();
    expect(blockedTooltip(grid, SLOTS_BY_KEY.get(ItemTypeEnum.armor)!)).toBeNull();
  });
});

describe('the off-hand weapon row in the comparison', () => {
  it('is off the screen when neither build can use the other hand', () => {
    expect(makeGrid({ weapon: TWO_HANDED }).leftWeaponRowShown).toBe(false);
  });

  it('shows up for the compared build, with the main one saying what holds both hands', () => {
    const { grid, leftWeaponRowShown } = makeGrid({ weapon: TWO_HANDED, compareLeftWeapon: true });

    expect(leftWeaponRowShown).toBe(true);
    expect(blockedNote(grid, leftWeaponSlot)).toBe('[Aluguel] Cajado de Duas Mãos TE ocupa as duas mãos');
    expect(blockedTooltip(grid, leftWeaponSlot))
      .toBe('Armas de duas mãos ocupam as duas mãos, então não sobra mão para uma segunda arma. Equipe uma arma de uma mão para empunhar duas.');
  });

  it('leaves no note at all when the main build dual wields itself', () => {
    const { grid, leftWeaponRowShown } = makeGrid({ weapon: ONE_HANDED, leftWeaponShown: true });

    expect(leftWeaponRowShown).toBe(true);
    expect(blockedNote(grid, leftWeaponSlot)).toBeNull();
  });

  it('explains the shield, which competes for the same hand', () => {
    const { grid } = makeGrid({ weapon: ONE_HANDED, shield: ONE_HANDED, compareLeftWeapon: true });

    expect(blockedNote(grid, leftWeaponSlot)).toBe('[Aluguel] Cajado do Poder ocupa a outra mão');
    expect(blockedTooltip(grid, leftWeaponSlot))
      .toBe('A mão esquerda já está com o escudo, e é nela que vai a segunda arma. Remova o escudo para empunhar duas armas.');
  });

  /** A second weapon needs a first one — the one term the shield's question does not have. */
  it('asks for a weapon when there is none', () => {
    const { grid } = makeGrid({ compareLeftWeapon: true });

    expect(blockedNote(grid, leftWeaponSlot)).toBe('Equipe uma arma para poder usar outra arma');
    expect(blockedTooltip(grid, leftWeaponSlot))
      .toBe('A segunda arma vai para a mão esquerda, então primeiro é preciso equipar a arma da mão direita.');
  });
});
