import { sortObj } from './sort-obj';

export const toGradeList = (arr: string[]) => {
  return arr.map((val) => ({ label: `Grau ${val}`, value: `${val}`.toLowerCase() })).sort(sortObj('value', -1));
};

export const getGradeList = () => {
  return [
    { label: 'Sem Grau', value: '' },
    { label: 'Grau D', value: 'D' },
    { label: 'Grau C', value: 'C' },
    { label: 'Grau B', value: 'B' },
    { label: 'Grau A', value: 'A' },
  ];
};
