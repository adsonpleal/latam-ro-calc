import { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, createElement, useId } from 'react';
import { IconName } from '../../app/ui/icon-names';
import { useTouchInput } from './input-capabilities';

export interface IconProps extends HTMLAttributes<HTMLElement> { name: IconName; label?: string; ref?: React.Ref<HTMLElement>; }
export function Icon({ name, label, className = '', style, ...props }: IconProps) {
  const touch = useTouchInput();
  if (touch && props.role === 'button') return createElement('button', {
    ...props, type: 'button', className: `ui-icon-button ${className}`, style,
    'aria-label': label || props['aria-label'],
  }, createElement('app-icon', { className: `ui-icon ${name === 'spinner' ? 'ui-spin' : ''}`, 'aria-hidden': true,
    style: { '--ui-icon': `url("assets/icons/ui/${name}.svg")` } as CSSProperties }));
  return createElement('app-icon', { ...props, className: `ui-icon ${name === 'spinner' ? 'ui-spin' : ''} ${className}`,
    role: props.role ?? (label ? 'img' : undefined), 'aria-label': label || props['aria-label'], 'aria-hidden': props['aria-hidden'] ?? (label || props.role ? undefined : true),
    style: { ...style, '--ui-icon': `url("assets/icons/ui/${name}.svg")` } as CSSProperties });
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: IconName;
  iconPos?: 'left' | 'right';
}
export function Button({ label, icon, iconPos = 'left', className = '', children, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={`ui-button ui-component ${icon && !label && !children ? 'ui-button-icon-only' : ''} ${className}`}>
    {icon && <Icon name={icon} className={`ui-button-icon ui-button-icon-${iconPos}`} />}
    {children}{label && <span className="ui-button-label">{label}</span>}
  </button>;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-inputtext ui-component ${className}`} />;
}

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inputId?: string;
  ariaLabel?: string;
  label?: string;
  onBlur?: () => void;
}
export function Checkbox({ value, onChange, disabled, inputId, ariaLabel, label, onBlur }: ToggleProps) {
  const id = useId();
  return <label className={`ui-checkbox-label ${disabled ? 'ui-disabled' : ''}`}>
    <span className="ui-checkbox ui-component">
      <input type="checkbox" id={inputId || id} disabled={disabled} checked={value}
        aria-label={ariaLabel || label || undefined} onBlur={onBlur} onChange={event => onChange(event.target.checked, event)} />
      <span className={`ui-checkbox-box ${value ? 'ui-highlight' : ''}`}>{value && <Icon name="check" />}</span>
    </span>{label && <span>{label}</span>}
  </label>;
}
export function Switch({ value, onChange, disabled, inputId, ariaLabel, onBlur }: ToggleProps) {
  const id = useId();
  return <span className={`ui-inputswitch ui-component ${value ? 'ui-inputswitch-checked' : ''} ${disabled ? 'ui-disabled' : ''}`}>
    <input type="checkbox" role="switch" id={inputId || id} disabled={disabled} checked={value}
      aria-label={ariaLabel || undefined} onBlur={onBlur} onChange={event => onChange(event.target.checked, event)} />
    <span className="ui-inputswitch-slider" />
  </span>;
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return createElement('app-ui-card', null, <div className={`ui-card ui-component ${className}`}><div className="ui-card-body"><div className="ui-card-content">{children}</div></div></div>);
}
export function Tag({ value, severity = '', icon, className = '', children, ...props }: {
  value: ReactNode; severity?: string; icon?: IconName; className?: string; children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return createElement('app-ui-tag', props, <span className={`ui-tag ui-component ui-tag-${severity} ${className}`}>
    {icon && <Icon name={icon} className="ui-tag-icon" />}<span className="ui-tag-value">{value}</span>{children}
  </span>);
}
export function Chip({ label, icon, className = '' }: { label: string; icon?: IconName; className?: string }) {
  return <span className={`ui-chip ui-component ${className}`}>
    {icon && <Icon name={icon} className="ui-chip-icon" />}<span className="ui-chip-text">{label}</span>
  </span>;
}
