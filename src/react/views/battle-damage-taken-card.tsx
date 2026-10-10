import { useId, useState } from 'react';
import { ElementType } from '../../app/constants/element-type.const';
import { getMonsterOffensiveSkills } from '../../app/constants/monster-offensive-skills';
import { calculateMonsterDamageTaken, IncomingDamageProfile, IncomingDamageStep } from '../../app/core/monster-damage-taken';
import { ELE_PT } from '../../app/core/pvp';
import { formatNumber } from '../../app/utils/format-number';
import { Card, Icon } from '../ui/primitives';
import { Select } from '../ui/select';
import './battle-damage-taken-card.css';

interface Props {
  profile: IncomingDamageProfile;
  disabled?: boolean;
  onReductionClick?: (step: IncomingDamageStep) => void;
}

export function BattleDamageTakenCard({ profile, disabled = false, onReductionClick }: Props) {
  const id = useId();
  const skills = getMonsterOffensiveSkills(profile.attacker.id);
  const [open, setOpen] = useState(false);
  const [skillId, setSkillId] = useState(skills[0]?.id);
  const [cometDistance, setCometDistance] = useState(0);
  const [earthquakeTargets, setEarthquakeTargets] = useState(1);
  const [meteors, setMeteors] = useState(1);
  const [attackerDistance, setAttackerDistance] = useState(1);
  const [armor, setArmor] = useState<ElementType | 'auto'>('auto');
  const result = calculateMonsterDamageTaken(profile, skillId, { cometDistance, earthquakeTargets, meteors, attackerDistance,
    armorElement: armor === 'auto' ? undefined : armor });
  if (!result) return null;
  const range = (min: number, max: number) => min === max ? formatNumber(min) : `${formatNumber(min)} – ${formatNumber(max)}`;
  const skillOptions = skills.map(skill => ({ label: `${skill.name} · Nv. ${skill.level}`, value: skill.id }));
  const numbers = (max: number, suffix = '') => Array.from({ length: max }, (_, index) => ({ label: `${index + 1}${suffix}`, value: index + 1 }));
  const armorOptions = [{ label: `Equipamento (${ELE_PT[profile.defender.armorElement.toLowerCase()]})`, value: 'auto' },
    ...Object.values(ElementType).map(value => ({ label: `${ELE_PT[value.toLowerCase()]} 1`, value }))];
  return <Card className="damage-taken-card">
    <button type="button" className="damage-taken-toggle" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
      <Icon name="shield" /><span>Dano recebido</span><Icon name={open ? 'chevron-down' : 'chevron-right'} />
    </button>
    <div id={`${id}-content`} hidden={!open} role="region" aria-label="Dano recebido" className="damage-taken-content">
      <label className="damage-taken-field"><span>Habilidade do monstro</span>
        <Select ariaLabel="Habilidade do monstro" options={skillOptions} optionLabel="label" optionValue="value" value={skillId} disabled={disabled} onChange={setSkillId} />
      </label>
      <div className="damage-taken-badges"><span>{result.skill.damageType === 'physical' ? 'Físico' : result.skill.damageType === 'fixed' ? 'Fixo' : 'Mágico'}</span>
        <span>{ELE_PT[result.skill.element.toLowerCase()]}</span><span>Nv. {result.skill.level}</span></div>
      {result.skill.formula !== 'killing-aura' && <label className="damage-taken-field"><span>Elemento da armadura</span>
        <Select ariaLabel="Elemento da armadura" options={armorOptions} optionLabel="label" optionValue="value" value={armor} disabled={disabled} onChange={setArmor} />
      </label>}
      {result.skill.formula === 'npc-comet' && <label className="damage-taken-field"><span>Distância ao centro do Cometa</span>
        <Select ariaLabel="Distância ao centro do Cometa" options={Array.from({ length: 10 }, (_, value) => ({ label: `${value} células`, value }))}
          optionLabel="label" optionValue="value" value={cometDistance} disabled={disabled} onChange={setCometDistance} />
      </label>}
      {result.skill.formula === 'earthquake' && <label className="damage-taken-field"><span>Alvos vivos na área</span>
        <Select ariaLabel="Alvos vivos na área" options={numbers(30)} optionLabel="label" optionValue="value" value={earthquakeTargets} disabled={disabled} onChange={setEarthquakeTargets} />
      </label>}
      {result.skill.formula === 'meteor-storm' && <label className="damage-taken-field"><span>Meteoros que acertam</span>
        <Select ariaLabel="Meteoros que acertam" options={numbers(7)} optionLabel="label" optionValue="value" value={meteors} disabled={disabled} onChange={setMeteors} />
      </label>}
      {result.skill.formula === 'hell-judgement' && <label className="damage-taken-field"><span>Distância ao monstro</span>
        <Select ariaLabel="Distância ao monstro" options={numbers(14, ' células')} optionLabel="label" optionValue="value" value={attackerDistance} disabled={disabled} onChange={setAttackerDistance} />
      </label>}
      <div className="damage-taken-result" aria-live="polite">
        <span>{result.skill.damageType === 'fixed' ? 'Dano por segundo' : 'Dano total recebido'}</span>
        <strong>{range(result.min, result.max)}</strong>
        {result.hpPercent && <span>{range(Math.round(result.hpPercent.min * 10) / 10, Math.round(result.hpPercent.max * 10) / 10)}% do HP máximo</span>}
        {result.hits > 1 && <span>{range(result.perHit.min, result.perHit.max)} por {result.skill.formula === 'earthquake' ? 'onda' : 'golpe'} · {result.hits} {result.skill.formula === 'earthquake' ? 'ondas' : 'golpes'}</span>}
      </div>
      <p className="damage-taken-note">{result.skill.note}</p>
      <p className="damage-taken-note">Estimativa com todos os golpes acertando a build atual. Bloqueios, esquiva, efeitos negativos e habilidades defensivas não são simulados. ATQ e ATQM usam os valores de referência; aumentos de ataque por dificuldade ainda não são incluídos.</p>
      <details className="damage-taken-formula"><summary>Fórmula e reduções</summary>
        <dl>{result.steps.map((step, index) => <div key={index}>
          <dt>{step.keys.length && onReductionClick ? <button type="button" onClick={() => onReductionClick(step)}>{step.label}</button> : step.label}
            {step.factor != null && <small> ×{formatNumber(Math.round(step.factor * 10000) / 10000)}</small>}</dt>
          <dd>{range(step.min, step.max)}</dd>
        </div>)}</dl>
      </details>
      <a className="damage-taken-source" href={`https://www.divine-pride.net/database/skill/${result.skill.id}`} target="_blank" rel="noopener noreferrer">Ver habilidade no Divine Pride <Icon name="external-link" /></a>
    </div>
  </Card>;
}
