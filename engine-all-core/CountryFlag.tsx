import React from 'react';

interface CountryFlagProps {
  countryCode?: string;
  countryName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ 
  countryCode, 
  countryName, 
  size = 'sm' 
}) => {
  if (!countryCode && !countryName) return null;

  // Map common country names to flag emojis
  const countryFlags: Record<string, string> = {
    // By country code
    'US': '🇺🇸',
    'USA': '🇺🇸',
    'DE': '🇩🇪',
    'DEU': '🇩🇪',
    'JP': '🇯🇵',
    'JPN': '🇯🇵',
    'CN': '🇨🇳',
    'CHN': '🇨🇳',
    'GB': '🇬🇧',
    'UK': '🇬🇧',
    'FR': '🇫🇷',
    'FRA': '🇫🇷',
    'IT': '🇮🇹',
    'ITA': '🇮🇹',
    'CH': '🇨🇭',
    'CHE': '🇨🇭',
    'SE': '🇸🇪',
    'SWE': '🇸🇪',
    'NL': '🇳🇱',
    'NLD': '🇳🇱',
    'CA': '🇨🇦',
    'CAN': '🇨🇦',
    'AU': '🇦🇺',
    'AUS': '🇦🇺',
    'KR': '🇰🇷',
    'KOR': '🇰🇷',
    'IN': '🇮🇳',
    'IND': '🇮🇳',
    'BR': '🇧🇷',
    'BRA': '🇧🇷',
    'MX': '🇲🇽',
    'MEX': '🇲🇽',
    'ES': '🇪🇸',
    'ESP': '🇪🇸',
    'PT': '🇵🇹',
    'PRT': '🇵🇹',
    'FI': '🇫🇮',
    'FIN': '🇫🇮',
    'NO': '🇳🇴',
    'NOR': '🇳🇴',
    'DK': '🇩🇰',
    'DNK': '🇩🇰',
    'PL': '🇵🇱',
    'POL': '🇵🇱',
    'TR': '🇹🇷',
    'TUR': '🇹🇷',
    'IL': '🇮🇱',
    'ISR': '🇮🇱',
    'SG': '🇸🇬',
    'SGP': '🇸🇬',
    'TW': '🇹🇼',
    'TWN': '🇹🇼',

    // By country name
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'United Kingdom': '🇬🇧',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Switzerland': '🇨🇭',
    'Sweden': '🇸🇪',
    'Netherlands': '🇳🇱',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'South Korea': '🇰🇷',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Spain': '🇪🇸',
    'Portugal': '🇵🇹',
    'Finland': '🇫🇮',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Poland': '🇵🇱',
    'Turkey': '🇹🇷',
    'Israel': '🇮🇱',
    'Singapore': '🇸🇬',
    'Taiwan': '🇹🇼',
  };

  const key = countryCode?.toUpperCase() || countryName;
  const flag = key ? countryFlags[key] : null;

  if (!flag) {
    // Fallback for unknown countries
    return (
      <span 
        className={`inline-flex items-center justify-center rounded-full bg-slate-700 text-slate-400 ${
          size === 'sm' ? 'w-4 h-4 text-xs' : size === 'lg' ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs'
        }`}
        title={countryName || countryCode}
      >
        ?
      </span>
    );
  }

  return (
    <span 
      className={`inline-block ${
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
      }`}
      title={countryName || countryCode}
      role="img"
      aria-label={`Flag of ${countryName || countryCode}`}
    >
      {flag}
    </span>
  );
};