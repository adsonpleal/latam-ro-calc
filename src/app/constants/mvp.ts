// MVP monster ids sourced from the browiki MVP list (https://browiki.org/wiki/MVP).
// Drives the dedicated "MVPs" picker group (see ro-calculator.component setMonsterDropdownList)
// and, for the red-aura subset, the 99.9% final-damage reduction applied in
// damage-calculator. Kept as an id list (not a per-record flag) so the monster.json
// data file stays untouched and the wiki list is auditable in one place.

/** All 163 MVPs from the browiki MVP list. */
export const MVP_IDS: ReadonlySet<number> = new Set([
  3505, 1087, 1147, 1190, 1086, 1115, 1038, 1511, 1159, 1389, 1046, 1059,
  1150, 1688, 1039, 1157, 1980, 1112, 1251, 2068, 2156, 1373, 1272, 1885,
  1630, 1252, 1779, 2442, 2441, 1623, 1492, 1418, 1583, 1312, 3633, 1785,
  3758, 2202, 1734, 1685, 1719, 3796, 1871, 1768, 3757, 2087, 2165, 1658,
  1751, 2249, 2253, 2255, 2362, 2251, 1832, 1874, 2483, 1917, 3741, 1647,
  1649, 1650, 1651, 1648, 1646, 20260, 3804, 20648, 20273, 20277, 3074, 20381,
  21395, 20520, 3241, 3245, 3246, 3221, 3223, 3224, 3240, 3242, 3243, 3244,
  3220, 3222, 3225, 20419, 20422, 20421, 20601, 20811, 20843, 20611, 20610, 20618,
  20934, 20928, 20943, 3810, 3901, 1957, 2194, 1929, 1956, 1708, 2187, 2188,
  3658, 3426, 3427, 3428, 3429, 3430, 3621, 3628, 20386, 3450, 2317, 20346,
  2022, 20340, 3181, 2131, 20620, 20659, 20642, 3073, 3124, 20667, 2475, 2476,
  2319, 2942, 2189, 2190, 2529, 2322, 3000, 3029, 3659, 2564, 3473, 2241,
  2240, 2237, 2236, 2235, 2239, 2238, 3190, 2996, 3254, 3097, 20387, 3151,
  3150, 20536, 20621, 20573, 20572, 20668, 20785,
  // Synthetic "Miragem de Amdarais" per-level targets (levels 1-9; level 10 is
  // the real mob 20573 above). Not from the browiki list — grouped under "MVPs"
  // so all ten Mirage levels sit together. See miragem-amdarais-levels.
  205731, 205732, 205733, 205734, 205735, 205736, 205737, 205738, 205739,
]);

/**
 * The 64 MVPs that spawn with a red aura. The red aura reduces the final
 * damage dealt to the monster by 99.9% (i.e. only 0.1% lands). Applied in
 * DamageCalculator via Monster.isRedAura.
 */
export const RED_AURA_MVP_IDS: ReadonlySet<number> = new Set([
  1087, 1147, 1190, 1086, 1115, 1038, 1511, 1159, 1389, 1046, 1059, 1150,
  1688, 1039, 1157, 1112, 1251, 2068, 2156, 1373, 1272, 1885, 1630, 1252,
  1779, 1623, 1492, 1418, 1583, 1312, 3633, 1785, 2202, 1734, 1685, 1719,
  3796, 1871, 1768, 2087, 2165, 1751, 2249, 2253, 2255, 2362, 2251, 1832,
  1874, 1917, 3741, 20648, 3074, 20381, 20419, 20422, 20421, 20601, 20611, 20610,
  20618, 20934, 20928, 20943,
]);
