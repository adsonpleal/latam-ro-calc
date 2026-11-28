import { createElement, useId, useState } from 'react';
import { DropdownModel } from '../../app/models/dropdown.model';
import { HealReceivedExample } from '../../app/core/healing';
import { resolveSkillMeta } from '../../app/skills';
import { formatNumber } from '../../app/utils/format-number';
import { Card, Icon, Input } from '../ui/primitives';
import { Popover } from '../ui/popover';
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
 * / `.kv` / `.joined_field` / `.hud-help` rule in `battle-hud.css` is written against. The
 * selector row is the same `hud-selectors-row` > `hud-selectors-col` > `joined_field` +
 * `joined_caption` pill the Batalha row and the status inputs use, and the help button is
 * the same `hud-help` circle the cast-time help uses. Nothing was copied and nothing was
 * forked; adding a row to that stylesheet changes both panels, and
 * `heal-hud-ui.spec.ts` fails if this panel starts inventing its own.
 *
 * It renders what `Calculator.getHealSummary` returns and holds no arithmetic of its own —
 * the formula lives in `src/app/core/healing.ts`, with its sources.
 */

export interface HealHudProps {
  /** `Calculator.getHealSummary()`, or null when no healing skill is selected. */
  summary: any;
  skillOptions: DropdownModel[];
  levelOptions: DropdownModel[];
  skill: string;
  skillLevel: number;
  partyMembers: number;
  targetEffectiveness: number;
  /** True for Sopro Divino, the one skill whose amount reads the party size. */
  showPartyMembers: boolean;
  /** Real items carrying the bonus, for the "Cura recebida" help popover. */
  healReceivedExamples?: HealReceivedExample[];
  isInProcessingPreset?: boolean;
  onSkillChange?: (value: string) => void;
  onSkillLevelChange?: (value: number) => void;
  onPartyMembersChange?: (value: number) => void;
  onTargetEffectivenessChange?: (value: number) => void;
  /** Opens the item search with the "Cura recebida" bonus already picked. */
  onSearchHealReceived?: () => void;
}

export function HealHud({
  summary, skillOptions, levelOptions, skill, skillLevel,
  partyMembers, targetEffectiveness, showPartyMembers, healReceivedExamples = [],
  isInProcessingPreset = false, onSkillChange, onSkillLevelChange, onPartyMembersChange,
  onTargetEffectivenessChange, onSearchHealReceived,
}: HealHudProps) {
  const t = useText();
  const id = useId();
  const [infoAnchor, setInfoAnchor] = useState<HTMLButtonElement | null>(null);
  const healLevelTip = useTooltip({ text: t('heal.healLevelTip'), position: 'top' });
  const partyTip = useTooltip({ text: t('heal.partyMembersTip'), position: 'top' });

  const number = (value: number | null | undefined) => (value == null ? '' : formatNumber(value));
  /** Three decimals, as the Batalha panel prints its own cast and delay seconds. */
  const seconds = (value: number | null | undefined) => (value == null ? '' : `${formatNumber(value, 0, 3)}s`);
  const row = (label: string, value: string, className = '') => (
    <div className={['kv', className].filter(Boolean).join(' ')} key={label}>
      <span>{label}</span><span className="v">{value}</span>
    </div>
  );
  /** The Batalha row's own pill: a caption chip welded to the control beside it. */
  const field = (caption: string, control: any, inputId?: string, captionProps: any = {}) => (
    <div className="hud-selectors-col">
      <div className="joined_field heal-field">
        <label className="joined_caption heal-caption" htmlFor={inputId} {...captionProps}>{caption}</label>
        {control}
      </div>
    </div>
  );

  const frequency = summary?.frequency;

  return createElement('app-heal-hud', null, (
    <div className="hud ui-scope-app-battle-hud">
      <div className="hud-selectors-row heal-selectors">
        {field(t('misc.skill'), (
          <Select inputId="healSkill" options={skillOptions} optionLabel="label" optionValue="value"
            disabled={isInProcessingPreset} value={skill} onChange={value => onSkillChange?.(value)} />
        ), 'healSkill')}

        {field(t('heal.level'), (
          <Select inputId="healSkillLevel" options={levelOptions} optionLabel="label" optionValue="value"
            disabled={isInProcessingPreset} value={skillLevel} onChange={value => onSkillLevelChange?.(value)} />
        ), 'healSkillLevel')}

        {/* Reported, not edited: the level is the build's own Curar, set under Habilidades. */}
        {field(t('heal.healLevel'), (
          <span className="heal-read">{summary?.healLevel ? `${t('heal.level')} ${summary.healLevel}` : t('heal.healLevelUnset')}</span>
        ), undefined, { ...healLevelTip.triggerProps, tabIndex: 0 })}

        {showPartyMembers && field(t('heal.partyMembers'), (
          <Input id="healParty" type="number" min={0} max={11} value={partyMembers}
            onChange={event => onPartyMembersChange?.(Number(event.target.value) || 0)} />
        ), 'healParty', { ...partyTip.triggerProps, tabIndex: 0 })}

        <div className="hud-selectors-col heal-col--target">
          <div className="joined_field heal-field">
            <label className="joined_caption heal-caption" htmlFor="healTarget">{t('heal.targetEffectiveness')}</label>
            <Input id="healTarget" type="number" min={0} value={targetEffectiveness}
              onChange={event => onTargetEffectivenessChange?.(Number(event.target.value) || 0)} />
            <button type="button" className="hud-help" aria-label={t('heal.targetEffectivenessHelp')}
              aria-expanded={!!infoAnchor} aria-controls={`${id}-target-info`}
              onClick={event => setInfoAnchor(infoAnchor ? null : event.currentTarget)}>
              <Icon name="question-circle" />
            </button>
          </div>
        </div>
      </div>

      <div className="hud-cards">
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
            {row(t('heal.perSecond'), number(summary.healPerSecond), 'total')}
          </div>
          <div className="psec">{t('heal.healPowerSources')}</div>
          <div className="pstats one tight">
            {(summary.healPowerSources ?? []).map((source: any) => row(
              source.key === 'equipment'
                ? t('calc.equipments')
                : `${resolveSkillMeta(source.key)?.label ?? source.key} ${t('heal.level')} ${source.level}`,
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

      <Popover anchor={infoAnchor} onClose={() => setInfoAnchor(null)}
        ariaLabel={t('heal.targetEffectivenessHelp')} className="heal-info-panel">
        <div id={`${id}-target-info`}>
          <div className="ptitle">{t('heal.targetEffectiveness')}</div>
          <p className="heal-info-note">{t('heal.targetEffectivenessTip')}</p>
          {healReceivedExamples.length > 0 && <>
            <div className="psec">{t('heal.targetExamples')}</div>
            <div className="pstats one tight">
              {healReceivedExamples.map((example) => row(example.name, `+${number(example.value)}%`))}
            </div>
          </>}
          {onSearchHealReceived && <button type="button" className="heal-info-search"
            onClick={() => { setInfoAnchor(null); onSearchHealReceived(); }}>
            {t('heal.targetSearchItems')}
          </button>}
        </div>
      </Popover>
    </div>
  ));
}
