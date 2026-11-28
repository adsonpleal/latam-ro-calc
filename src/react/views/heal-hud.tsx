import { createElement } from 'react';
import { DropdownModel } from '../../app/models/dropdown.model';
import { formatNumber } from '../../app/utils/format-number';
import { Card } from '../ui/primitives';
import { Input } from '../ui/primitives';
import { Select } from '../ui/select';
import { useTooltip } from '../ui/tooltip';
import { useText } from '../state/use-text';
import './heal-hud.css';
import './battle-hud.css';

/**
 * The **Cura** panel — card c3W2qySdAGV69qMOyM5w.
 *
 * Deliberately built out of the Batalha panel's own parts rather than beside them: the
 * root carries `ui-scope-app-battle-hud`, which is the scope every `.hud-card` / `.pstats`
 * / `.kv` rule in `battle-hud.css` is written against, so the cards, the label/value rows
 * and the cast table here are the same CSS the damage panel renders. Nothing was copied
 * and nothing was forked; adding a row to that stylesheet changes both panels.
 *
 * It renders what `Calculator.getHealSummary` returns and holds no arithmetic of its own —
 * the formula lives in `src/app/core/healing.ts`, with its sources.
 */

export interface HealHudProps {
  /** `Calculator.getHealSummary()`, or null when no healing skill is selected. */
  summary: any;
  skillOptions: DropdownModel[];
  levelOptions: DropdownModel[];
  healLevelOptions: DropdownModel[];
  skill: string;
  skillLevel: number;
  healLevel: number;
  partyMembers: number;
  targetEffectiveness: number;
  /** True while the chosen skill relays Curar at a level of its own — everything but Curar. */
  showHealLevel: boolean;
  /** True for Sopro Divino, the one skill whose amount reads the party size. */
  showPartyMembers: boolean;
  isInProcessingPreset?: boolean;
  onSkillChange?: (value: string) => void;
  onSkillLevelChange?: (value: number) => void;
  onHealLevelChange?: (value: number) => void;
  onPartyMembersChange?: (value: number) => void;
  onTargetEffectivenessChange?: (value: number) => void;
}

export function HealHud({
  summary, skillOptions, levelOptions, healLevelOptions, skill, skillLevel, healLevel,
  partyMembers, targetEffectiveness, showHealLevel, showPartyMembers, isInProcessingPreset = false,
  onSkillChange, onSkillLevelChange, onHealLevelChange, onPartyMembersChange, onTargetEffectivenessChange,
}: HealHudProps) {
  const t = useText();
  const healLevelTip = useTooltip({ text: t('heal.healLevelTip'), position: 'top' });
  const partyTip = useTooltip({ text: t('heal.partyMembersTip'), position: 'top' });
  const targetTip = useTooltip({ text: t('heal.targetEffectivenessTip'), position: 'top' });

  const number = (value: number | null | undefined) => (value == null ? '' : formatNumber(value));
  /** Three decimals, as the Batalha panel prints its own cast and delay seconds. */
  const seconds = (value: number | null | undefined) => (value == null ? '' : `${formatNumber(value, 0, 3)}s`);
  const row = (label: string, value: string, className = '') => (
    <div className={['kv', className].filter(Boolean).join(' ')} key={label}>
      <span>{label}</span><span className="v">{value}</span>
    </div>
  );

  const frequency = summary?.frequency;

  return createElement('app-heal-hud', null, (
    <div className="hud ui-scope-app-battle-hud">
      <div className="hud-selectors-row heal-selectors">
        <div className="heal-field">
          <label htmlFor="healSkill">{t('heal.skill')}</label>
          <Select inputId="healSkill" options={skillOptions} optionLabel="label" optionValue="value"
            disabled={isInProcessingPreset} value={skill} onChange={value => onSkillChange?.(value)} />
        </div>
        <div className="heal-field heal-field--narrow">
          <label htmlFor="healSkillLevel">{t('heal.level')}</label>
          <Select inputId="healSkillLevel" options={levelOptions} optionLabel="label" optionValue="value"
            disabled={isInProcessingPreset} value={skillLevel} onChange={value => onSkillLevelChange?.(value)} />
        </div>
        {showHealLevel && <div className="heal-field heal-field--narrow">
          <label htmlFor="healBaseLevel" {...healLevelTip.triggerProps} tabIndex={0}>{t('heal.healLevel')}</label>
          <Select inputId="healBaseLevel" options={healLevelOptions} optionLabel="label" optionValue="value"
            disabled={isInProcessingPreset} value={healLevel} onChange={value => onHealLevelChange?.(value)} />
        </div>}
        {showPartyMembers && <div className="heal-field heal-field--narrow">
          <label htmlFor="healParty" {...partyTip.triggerProps} tabIndex={0}>{t('heal.partyMembers')}</label>
          <Input id="healParty" type="number" min={0} max={11} value={partyMembers}
            onChange={event => onPartyMembersChange?.(Number(event.target.value) || 0)} />
        </div>}
        <div className="heal-field heal-field--narrow">
          <label htmlFor="healTarget" {...targetTip.triggerProps} tabIndex={0}>{t('heal.targetEffectiveness')}</label>
          <Input id="healTarget" type="number" min={0} value={targetEffectiveness}
            onChange={event => onTargetEffectivenessChange?.(Number(event.target.value) || 0)} />
        </div>
      </div>

      {!summary ? <div className="heal-empty">{t('heal.empty')}</div> : <>
        <div className="hud-cards heal-cards">
          <div className="hud-card-col"><Card className="hud-card">
            <div className="psec">{t('heal.breakdown')}</div>
            <div className="pstats one tight">
              {row(t('heal.curaA'), number(summary.healA))}
              {row(t('heal.curaB'), number(summary.healB))}
              {row(t('heal.baseHeal'), number(summary.baseHeal))}
              {row(t('heal.withHealPower'), `${number(summary.withHealPower)} (+${number(summary.healPower)}%)`)}
              {row(t('heal.withSkillEffectiveness'), `${number(summary.withSkillEffectiveness)} (${number(summary.skillEffectiveness)}%)`)}
              {row(t('heal.total'), number(summary.total), 'total')}
            </div>
          </Card></div>

          <div className="hud-card-col"><Card className="hud-card">
            <div className="psec">{t('heal.perCast')}</div>
            <div className="pstats one tight">
              {row(t('heal.perCast'), number(summary.total), 'total')}
              {row(t('heal.perSecond'), number(summary.healPerSecond), 'total')}
            </div>
            <div className="psec">{t('heal.healPowerSources')}</div>
            <div className="pstats one tight">
              {(summary.healPowerSources ?? []).map((source: any) => row(
                source.key === 'equipment' ? t('heal.sourceEquipment') : `${source.key} ${t('heal.level')} ${source.level}`,
                `+${number(source.value)}%`,
              ))}
              {row(t('heal.ownHealReceived'), `+${number(summary.ownHealReceived)}%`)}
            </div>
          </Card></div>

          <div className="hud-card-col"><Card className="hud-card">
            <div className="psec">{t('heal.timings')}</div>
            <div className="pstats one tight">
              {row(t('hud.castFixed'), `${seconds(frequency?.fct)} → ${seconds(frequency?.reducedFct)}`)}
              {row(t('hud.castVariable'), `${seconds(frequency?.vct)} → ${seconds(frequency?.reducedVct)}`)}
              {row(t('hud.afterCastShort'), `${seconds(frequency?.acd)} → ${seconds(frequency?.reducedAcd)}`)}
              {row(t('skd.cooldown'), `${seconds(frequency?.cd)} → ${seconds(frequency?.reducedCd)}`)}
            </div>
          </Card></div>
        </div>

        <p className="heal-note">{t('heal.note')}</p>
      </>}
    </div>
  ));
}
