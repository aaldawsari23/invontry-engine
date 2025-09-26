import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FilterState, FilterOptions, AnalysisResult } from '../types';
import { useTranslation } from './I18n';
import { Button, Card } from './VisualDesignSystem';

interface AdvancedFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState | ((f: FilterState) => FilterState)) => void;
  results?: AnalysisResult[];
  language?: 'en' | 'ar';
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ 
  filters, 
  setFilters, 
  results = [],
  language = 'en'
}) => {
  const { t } = useTranslation();
  const isRTL = language === 'ar';

  // ---------- Multi-select Infrastructure ----------
  
  const getSet = useCallback((field: keyof FilterState): Set<string> => {
    const multi = (filters as any)[`${field}_multi`] as string[] | undefined;
    if (Array.isArray(multi) && multi.length) return new Set(multi);
    const single = (filters as any)[field] as string | undefined;
    return single && single !== 'All' ? new Set([single]) : new Set();
  }, [filters]);

  const setToggle = useCallback((field: keyof FilterState, value: string) => {
    const key = `${field}_multi` as keyof FilterState;
    const arr = Array.isArray((filters as any)[key]) ? [...((filters as any)[key] as string[])] : [];
    const index = arr.indexOf(value);
    if (index >= 0) {
      arr.splice(index, 1);
    } else {
      arr.push(value);
    }
    setFilters({ ...(filters as any), [key]: arr });
  }, [filters, setFilters]);

  // ---------- Smart Count System (Hide Zero-Result Options) ----------
  
  const countWith = useCallback((field: keyof FilterState, value: string) => {
    const must = getSet(field);
    must.add(value);
    const has = (set: Set<string>, val?: string) => !set.size || (val && set.has(val));
    const lowerText = filters.text.toLowerCase();
    
    return results.filter(item => {
      if (item.Decision !== 'Accepted') return false; // locked
      
      if (!has(field === 'category' ? must : getSet('category'), item.PT_Category)) return false;
      if (!has(field === 'manufacturer' ? must : getSet('manufacturer'), item.manufacturer)) return false;
      if (!has(field === 'country' ? must : getSet('country'), item.manufacturer_country)) return false;
      if (!has(field === 'supplier' ? must : getSet('supplier'), item.supplier)) return false;
      if (!has(field === 'specialty' ? must : getSet('specialty'), item.specialty)) return false;
      if (!has(field === 'region' ? must : getSet('region'), item.region)) return false;
      if (!has(field === 'area' ? must : getSet('area'), item.area)) return false;
      if (!has(field === 'type' ? must : getSet('type'), item.type)) return false;
      
      // Model filtering
      if (field === 'model' && must.size) {
        const modelMatch = item.item_name.match(/model\s+([\w\d-]+)/i);
        const itemModel = modelMatch ? modelMatch[1] : item.item_name;
        if (!must.has(itemModel)) return false;
      }
      
      if (item.Score < filters.scoreRange.min || item.Score > filters.scoreRange.max) return false;
      
      if (filters.text) {
        const searchText = [
          item.item_name || '',
          item.sku || '',
          item.PT_Category || '',
          item.PT_Subcategory || '',
          item.manufacturer || '',
          item.description || ''
        ].join(' ').toLowerCase();
        if (!searchText.includes(lowerText)) return false;
      }
      
      return true;
    }).length;
  }, [results, filters, getSet]);

  // ---------- Generate Filter Options ----------
  
  const filterOptions = useMemo((): FilterOptions => {
    // Use predefined options like the working HTML version
    const predefinedOptions = {
      categories: [
        'Equipment & Devices', 'Modalities', 'Consumables', 'Assessment Tools',
        'Orthotics & Prosthetics', 'Exercise Equipment', 'Mobility Aids',
        'Therapeutic Equipment', 'Diagnostic Tools', 'Rehabilitation Equipment'
      ],
      specialties: [
        'Physical Therapy', 'Occupational Therapy', 'Prosthetics', 'Sports Medicine',
        'Pediatric Therapy', 'Geriatric Therapy', 'Neurological Therapy',
        'Cardiopulmonary Therapy', 'Orthopedic Therapy'
      ],
      areas: [
        'Neck', 'Shoulder', 'Back', 'Chest', 'Upper Limb', 'Lower Limb',
        'Knee', 'Ankle', 'Foot', 'Hand', 'Wrist', 'Hip', 'Spine', 'Full Body'
      ],
      regions: [
        'Head & Neck', 'Upper Extremity', 'Lower Extremity', 'Trunk',
        'Cardiovascular', 'Respiratory', 'Neurological', 'Musculoskeletal'
      ],
      types: [
        'Manual Therapy', 'Electrotherapy', 'Exercise Therapy', 'Hydrotherapy',
        'Heat Therapy', 'Cold Therapy', 'Compression Therapy', 'Traction Therapy'
      ]
    };

    // If we have results, also add dynamic options from the data
    if (results.length > 0) {
      const dynamicCategories = new Set<string>();
      const dynamicSpecialties = new Set<string>();
      const dynamicAreas = new Set<string>();
      const dynamicRegions = new Set<string>();
      const dynamicTypes = new Set<string>();
      const manufacturers = new Set<string>();
      const countries = new Set<string>();
      const suppliers = new Set<string>();
      const models = new Set<string>();

      results.forEach(result => {
        // Include ALL categories, even generic ones
        if (result.PT_Category) dynamicCategories.add(result.PT_Category);
        if (result.PT_Subcategory) dynamicCategories.add(result.PT_Subcategory);
        
        if (result.manufacturer) manufacturers.add(result.manufacturer);
        if (result.specialty) {
          dynamicSpecialties.add(result.specialty);
        }
        if (result.supplier) suppliers.add(result.supplier);
        if (result.region) dynamicRegions.add(result.region);
        if (result.area) dynamicAreas.add(result.area);
        if (result.type) dynamicTypes.add(result.type);
        if (result.manufacturer_country) countries.add(result.manufacturer_country);

        // Extract models
        const modelMatch = result.item_name.match(/model\s+([\w\d-]+)/i);
        if (modelMatch) models.add(modelMatch[1]);
      });

      return {
        categories: [...predefinedOptions.categories, ...Array.from(dynamicCategories)],
        specialties: [...predefinedOptions.specialties, ...Array.from(dynamicSpecialties)],
        areas: [...predefinedOptions.areas, ...Array.from(dynamicAreas)],
        regions: [...predefinedOptions.regions, ...Array.from(dynamicRegions)],
        types: [...predefinedOptions.types, ...Array.from(dynamicTypes)],
        manufacturers: Array.from(manufacturers).sort((a, b) => a.localeCompare(b, language)),
        countries: Array.from(countries).sort((a, b) => a.localeCompare(b, language)),
        suppliers: Array.from(suppliers).sort((a, b) => a.localeCompare(b, language)),
        models: Array.from(models).sort((a, b) => a.localeCompare(b, language))
      };
    }

    return {
      categories: predefinedOptions.categories,
      specialties: predefinedOptions.specialties,
      areas: predefinedOptions.areas,
      regions: predefinedOptions.regions,
      types: predefinedOptions.types,
      manufacturers: [],
      countries: [],
      suppliers: [],
      models: []
    };
  }, [results]);

  // ---------- Multi-Select Chip Group Component ----------
  
  const FilterChipGroup: React.FC<{
    label: string;
    field: keyof FilterState;
    options: string[];
    rtl?: boolean;
    maxVisible?: number;
  }> = ({ label, field, options, rtl = false, maxVisible = 8 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const selected = getSet(field);
    
    // Show all predefined options, plus any that have hits
    const visibleOptions = options.filter(opt => {
      // Always show if selected
      if (selected.has(opt)) return true;
      
      // For predefined options, show them even if no hits (like old HTML version)
      const predefinedCategories = ['Equipment & Devices', 'Modalities', 'Consumables', 'Assessment Tools', 'Orthotics & Prosthetics'];
      const predefinedSpecialties = ['Physical Therapy', 'Occupational Therapy', 'Prosthetics', 'Sports Medicine'];
      const predefinedAreas = ['Neck', 'Shoulder', 'Back', 'Chest', 'Upper Limb', 'Lower Limb'];
      
      if (field === 'category' && predefinedCategories.includes(opt)) return true;
      if (field === 'specialty' && predefinedSpecialties.includes(opt)) return true;
      if (field === 'area' && predefinedAreas.includes(opt)) return true;
      if (field === 'region' || field === 'type') return true; // Always show predefined regions/types
      
      // For dynamic options, only show if they have hits
      return countWith(field, opt) > 0;
    });
    
    // Always show if we have predefined options, don't hide empty groups
    if (visibleOptions.length === 0) return null;
    
    const displayOptions = isExpanded ? visibleOptions : visibleOptions.slice(0, maxVisible);
    const hasMore = visibleOptions.length > maxVisible;

    return (
      <div className={`space-y-3 ${rtl ? 'rtl' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            {label}
            {selected.size > 0 && (
              <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded-full">
                {selected.size}
              </span>
            )}
          </label>
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              {isExpanded 
                ? (isRTL ? 'عرض أقل' : 'Show Less')
                : `+${visibleOptions.length - maxVisible} ${isRTL ? 'أكثر' : 'more'}`
              }
            </button>
          )}
        </div>

        {/* Selected chips display */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
            {Array.from(selected).map(item => {
              const count = countWith(field, item);
              return (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg border border-teal-500 animate-scaleIn"
                >
                  <span>{item}</span>
                  <span className="text-teal-200">({count})</span>
                  <button
                    onClick={() => setToggle(field, item)}
                    className="ml-1 text-teal-200 hover:text-white transition-colors"
                    title={isRTL ? 'إزالة' : 'Remove'}
                    aria-label={`${isRTL ? 'إزالة' : 'Remove'} ${item}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Available options */}
        <div className="flex flex-wrap gap-2">
          {displayOptions.map(option => {
            const count = countWith(field, option);
            const isSelected = selected.has(option);
            const disabled = !isSelected && count === 0;
            
            return (
              <button
                key={option}
                onClick={() => !disabled && setToggle(field, option)}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'bg-teal-600/20 border-teal-500 text-teal-400 hover:bg-teal-600/30'
                    : disabled
                    ? 'bg-slate-800 border-slate-600 text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }`}
                title={`${option} - ${count} ${isRTL ? 'عنصر' : 'items'}`}
              >
                <span>{option}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Clear button */}
        {selected.size > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setFilters({ ...(filters as any), [`${field}_multi`]: [] })}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              {isRTL ? `مسح ${label}` : `Clear ${label}`}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ---------- Advanced Modal State ----------
  
  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [modalSearchTerms, setModalSearchTerms] = useState({
    manufacturer: '',
    country: '',
    supplier: '',
    model: ''
  });

  const advancedFilterKeys = ['manufacturer', 'country', 'supplier', 'model'] as const;
  const hasAdvancedFilters = advancedFilterKeys.some(key => getSet(key).size > 0);

  // ---------- Active Filters Count ----------
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.text) count++;
    if (filters.scoreRange.min !== -100 || filters.scoreRange.max !== 100) count++;
    
    const filterKeys: (keyof FilterState)[] = [
      'category', 'specialty', 'region', 'area', 'type', 
      'manufacturer', 'country', 'supplier', 'model'
    ];
    
    for (const key of filterKeys) {
      const set = getSet(key);
      if (set.size > 0) count++;
    }
    
    return count;
  }, [filters, getSet]);

  // ---------- Clear All Filters ----------
  
  const clearAllFilters = useCallback(() => {
    setFilters({
      text: filters.text, // Keep search text
      decision: 'All',
      category: 'All',
      manufacturer: 'All',
      specialty: 'All',
      region: 'All',
      area: 'All',
      type: 'All',
      scoreRange: { min: -100, max: 100 },
      // Clear all multi arrays
      category_multi: [],
      manufacturer_multi: [],
      specialty_multi: [],
      region_multi: [],
      area_multi: [],
      type_multi: [],
      country_multi: [],
      supplier_multi: [],
      model_multi: []
    });
  }, [filters.text, setFilters]);

  // ---------- Score Range Handlers ----------
  
  const handleScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? (name === 'min' ? -100 : 100) : parseInt(value, 10);
    setFilters(prev => ({
      ...prev,
      scoreRange: { ...prev.scoreRange, [name]: numValue },
    }));
  }, [setFilters]);

  // ---------- LocalStorage Persistence ----------
  
  useEffect(() => {
    const savedFilters = localStorage.getItem('ptAnalyzer_multiFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Only restore multi arrays, keep existing single values
        const multiKeys = [
          'category_multi', 'manufacturer_multi', 'specialty_multi',
          'region_multi', 'area_multi', 'type_multi',
          'country_multi', 'supplier_multi', 'model_multi'
        ];
        
        const hasMultiFilters = multiKeys.some(key => 
          Array.isArray(parsed[key]) && parsed[key].length > 0
        );
        
        if (hasMultiFilters) {
          setFilters(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn('Failed to restore filters from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    const filterData = {
      category_multi: (filters as any).category_multi || [],
      manufacturer_multi: (filters as any).manufacturer_multi || [],
      specialty_multi: (filters as any).specialty_multi || [],
      region_multi: (filters as any).region_multi || [],
      area_multi: (filters as any).area_multi || [],
      type_multi: (filters as any).type_multi || [],
      country_multi: (filters as any).country_multi || [],
      supplier_multi: (filters as any).supplier_multi || [],
      model_multi: (filters as any).model_multi || []
    };
    
    localStorage.setItem('ptAnalyzer_multiFilters', JSON.stringify(filterData));
  }, [filters]);

  // ---------- Render Advanced Modal ----------
  
  const renderAdvancedModal = () => {
    if (!advModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className={`bg-slate-800 border border-slate-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              🔧 {isRTL ? 'فلترة متقدمة للبائعين' : 'Advanced Vendor Filters'}
            </h2>
            <button
              onClick={() => setAdvModalOpen(false)}
              className="text-slate-400 hover:text-white text-xl font-bold transition-colors"
              aria-label={isRTL ? 'إغلاق' : 'Close'}
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {advancedFilterKeys.map((field) => {
                // Fix the field mapping for advanced modal
                const fieldMap = {
                  manufacturer: 'manufacturers',
                  country: 'countries', 
                  supplier: 'suppliers',
                  model: 'models'
                } as const;
                
                const options = filterOptions[fieldMap[field]] as string[] || [];
                const selected = getSet(field);
                const searchTerm = modalSearchTerms[field].toLowerCase();
                const filteredOptions = options.filter(opt => 
                  opt.toLowerCase().includes(searchTerm)
                );

                const fieldLabels = {
                  manufacturer: isRTL ? 'الشركات المصنعة' : 'Manufacturers',
                  country: isRTL ? 'البلدان' : 'Countries',
                  supplier: isRTL ? 'الموردون' : 'Suppliers', 
                  model: isRTL ? 'الموديلات' : 'Models'
                };

                return (
                  <div key={field} className="border border-slate-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-slate-300 mb-3 flex items-center justify-between">
                      {fieldLabels[field]}
                      {selected.size > 0 && (
                        <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded-full">
                          {selected.size}
                        </span>
                      )}
                    </div>
                    
                    {/* Search input */}
                    <input
                      type="text"
                      placeholder={isRTL ? 'بحث...' : 'Search...'}
                      value={modalSearchTerms[field]}
                      onChange={(e) => setModalSearchTerms(prev => ({
                        ...prev,
                        [field]: e.target.value
                      }))}
                      className={`w-full mb-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                    
                    {/* Options list */}
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredOptions.map(opt => {
                        const count = countWith(field, opt);
                        const isSelected = selected.has(opt);
                        const disabled = !isSelected && count === 0;
                        
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              disabled 
                                ? 'opacity-40 cursor-not-allowed' 
                                : 'hover:bg-slate-700'
                            } ${isSelected ? 'bg-teal-600/20' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disabled}
                              onChange={() => !disabled && setToggle(field, opt)}
                              className="rounded border-slate-600 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-slate-200 text-sm flex-1">{opt}</span>
                            {count > 0 && (
                              <span className="text-slate-400 text-xs">({count})</span>
                            )}
                          </label>
                        );
                      })}
                      
                      {filteredOptions.length === 0 && (
                        <div className="text-slate-400 text-sm text-center py-4">
                          {isRTL ? 'لا توجد نتائج' : 'No results'}
                        </div>
                      )}
                    </div>
                    
                    {/* Clear button */}
                    {selected.size > 0 && (
                      <div className="pt-3 border-t border-slate-700 mt-3">
                        <button
                          onClick={() => setFilters({ ...(filters as any), [`${field}_multi`]: [] })}
                          className="text-xs text-slate-400 hover:text-slate-200 underline"
                        >
                          {isRTL ? 'مسح' : 'Clear'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700">
            <button
              onClick={() => {
                advancedFilterKeys.forEach(key => {
                  setFilters(prev => ({ ...(prev as any), [`${key}_multi`]: [] }));
                });
              }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              {isRTL ? 'مسح فلاتر البائعين' : 'Clear Vendor Filters'}
            </button>
            
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setAdvModalOpen(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={() => setAdvModalOpen(false)}
              >
                {isRTL ? 'تطبيق الفلاتر' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------- Main Render ----------
  
  return (
    <Card variant="default" padding="lg" className={`space-y-6 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          {isRTL ? "🎯 نظام الترشيح الذكي" : "🎯 Smart Filter System"}
        </h3>
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {isRTL ? "فلاتر نشطة:" : "Active:"}
            </span>
            <span className="px-2 py-1 bg-teal-600 text-white text-sm font-medium rounded-full">
              {activeFiltersCount}
            </span>
          </div>
        )}
      </div>

      {/* Row 1: Search + Score Range + Advanced Button */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {/* Smart Search */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-slate-300">
              {isRTL ? "🔍 البحث الذكي" : "🔍 Smart Search"}
            </label>
            {filters.text && (
              <span className="px-2 py-1 bg-teal-600/20 text-teal-400 text-xs rounded-full border border-teal-500/30">
                {isRTL ? 'نشط' : 'Active'}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder={isRTL ? "بحث في الأصناف، الشركات، الفئات..." : "Search items, manufacturers, categories..."}
            value={filters.text}
            onChange={(e) => setFilters(prev => ({ ...prev, text: e.target.value }))}
            className={`w-full p-3 rounded-lg bg-slate-900 border border-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
            autoComplete="off"
          />
        </div>

        {/* Score Range */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-slate-300">
              {isRTL ? "🎯 نطاق النقاط" : "🎯 Score Range"}
            </label>
            {(filters.scoreRange.min !== -100 || filters.scoreRange.max !== 100) && (
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                {filters.scoreRange.min}-{filters.scoreRange.max}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="min"
              value={filters.scoreRange.min}
              onChange={handleScoreChange}
              className="w-full p-2 rounded-lg bg-slate-900 border border-slate-600 text-center text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Min"
              min="-100"
              max="100"
            />
            <span className="text-slate-500 text-sm">{isRTL ? "إلى" : "to"}</span>
            <input
              type="number"
              name="max"
              value={filters.scoreRange.max}
              onChange={handleScoreChange}
              className="w-full p-2 rounded-lg bg-slate-900 border border-slate-600 text-center text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Max"
              min="-100"
              max="100"
            />
          </div>
        </div>

        {/* Advanced Button */}
        <div className="lg:col-span-1 flex flex-col justify-end">
          <Button
            variant="outline"
            size="md"
            onClick={() => setAdvModalOpen(true)}
            className="w-full"
            icon={<span>🔧</span>}
            iconPosition="left"
          >
            {isRTL ? "متقدم" : "Advanced"}
            {hasAdvancedFilters && (
              <span className="ml-2 px-1.5 py-0.5 bg-teal-600 text-white text-xs rounded-full">
                •
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Row 2: Main Filter Chips (≤2 rows total layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories */}
        <FilterChipGroup
          label={isRTL ? "🎓 التخصصات الطبية" : "🎓 PT Categories"}
          field="category"
          options={filterOptions.categories}
          rtl={isRTL}
        />

        {/* Specialties */}
        <FilterChipGroup
          label={isRTL ? "🏥 المعدات الطبية" : "🏥 Medical Equipment"}
          field="specialty"
          options={filterOptions.specialties}
          rtl={isRTL}
        />

        {/* Body Areas */}
        <FilterChipGroup
          label={isRTL ? "🫁 مناطق الجسم" : "🫁 Body Regions"}
          field="area"
          options={filterOptions.areas}
          rtl={isRTL}
        />
      </div>

      {/* Row 3: Secondary Filters (Collapsible on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions */}
        <FilterChipGroup
          label={isRTL ? "🌍 المناطق" : "🌍 Regions"}
          field="region"
          options={filterOptions.regions}
          rtl={isRTL}
          maxVisible={6}
        />

        {/* Types */}
        <FilterChipGroup
          label={isRTL ? "📝 الأنواع" : "📝 Types"}
          field="type"
          options={filterOptions.types}
          rtl={isRTL}
          maxVisible={6}
        />
      </div>

      {/* Clear All Button */}
      {activeFiltersCount > 0 && (
        <div className="flex justify-center pt-4 border-t border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-slate-400 hover:text-white"
          >
            {isRTL ? "مسح جميع الفلاتر" : "Clear All Filters"} ({activeFiltersCount})
          </Button>
        </div>
      )}

      {/* Advanced Modal */}
      {renderAdvancedModal()}
    </Card>
  );
};
