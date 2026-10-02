import { ReactNode } from 'react';
import { optionLabel, optionValue, chooseSelection } from './selection';

export interface SelectButtonProps {
  options: any[];
  value: any;
  onChange: (value: any, event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  multiple?: boolean;
  optionLabel?: string;
  optionValue?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  renderItem?: (option: any) => ReactNode;
}
export function SelectButton({ options, value, onChange, disabled, multiple, optionLabel: labelKey,
  optionValue: valueKey, ariaLabel, ariaLabelledBy, className = '', renderItem }: SelectButtonProps) {
  return <div className={`ui-selectbutton ui-buttonset ui-component ${className}`} role="group"
    aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
    {options.map((option, index) => {
      const selectedValue = optionValue(option, valueKey, labelKey);
      const selected = multiple ? (value ?? []).includes(selectedValue) : value === selectedValue;
      return <button key={index} type="button" className={`ui-button ui-component ${selected ? 'ui-highlight' : ''}`}
        aria-pressed={selected} disabled={disabled || option?.disabled} onClick={event => {
          onChange(chooseSelection(value, option, !!multiple, true, disabled, valueKey, labelKey), event);
        }}>{renderItem ? renderItem(option) : <span className="ui-button-label">{optionLabel(option, labelKey)}</span>}</button>;
    })}
  </div>;
}
