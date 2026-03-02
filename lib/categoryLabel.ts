export function displayCategoryName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'СЂР°Р±РѕС‚Р°') return 'РџСЂРµРґРјРµС‚С‹';
  return name;
}
