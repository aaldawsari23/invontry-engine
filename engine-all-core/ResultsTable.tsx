import React, { useState, useMemo } from 'react';
import { AnalysisResult, SortConfig } from '../types';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';
import { useTranslation } from './I18n';
import { extractBaseIdentifier } from '../utils/deduplication';

interface ResultsTableProps {
    results: AnalysisResult[];
}

const decisionIcon: Record<AnalysisResult['Decision'], React.ReactNode> = {
    Accepted: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
    Review: <QuestionMarkCircleIcon className="w-6 h-6 text-yellow-400" />,
    Rejected: <XCircleIcon className="w-6 h-6 text-red-400" />,
};

const getBaseName = (itemName: string): string => {
    return extractBaseIdentifier(itemName || 'Unknown Item');
};


const TableRow: React.FC<{ item: AnalysisResult; isVariant?: boolean }> = ({ item, isVariant = false }) => {
    const renderCategory = () => {
        if (item.PT_Category === 'Uncategorized') {
            return <td className="p-4 text-slate-400 italic">{item.description || ''}</td>;
        }
        return (
            <td className="p-4 text-slate-300">
                {item.PT_Category}{item.PT_Subcategory !== 'General' ? ` > ${item.PT_Subcategory}` : ''}
            </td>
        );
    };

    return (
        <tr className={`border-b border-slate-700/50 ${isVariant ? 'bg-slate-800/30' : ''} hover:bg-slate-800/50`}>
            <td className="p-4 w-12">{isVariant ? <span className="w-4 h-px bg-slate-600 ms-6 block"></span> : null}</td>
            <td className="p-4">
                <div className="font-medium text-white">{item.item_name}</div>
                {(item.sku || (!isVariant && item.description && item.PT_Category !== 'Uncategorized')) && (
                     <div className="text-xs text-slate-400 mt-1 space-x-3">
                        {item.sku && <span>SKU: <span className="font-mono">{item.sku}</span></span>}
                        {!isVariant && item.description && item.PT_Category !== 'Uncategorized' && <span className="opacity-70 truncate">{item.description}</span>}
                    </div>
                )}
            </td>
            {renderCategory()}
            <td className="p-4 text-center font-mono text-lg">{item.Score}</td>
            <td className="p-4">
                 <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{decisionIcon[item.Decision]}</div>
                    <div className="flex flex-wrap gap-1">
                        {item.Matched_Keywords.slice(0, 4).map(kw => (
                            <span key={kw.canonical} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">
                                {kw.canonical}
                            </span>
                        ))}
                         {item.Matched_Keywords.length > 4 && (
                            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">
                                +{item.Matched_Keywords.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
};

const GroupRow: React.FC<{ group: AnalysisResult[]; baseName: string; }> = ({ group, baseName }) => {
    const { t } = useTranslation();
    const [isGroupExpanded, setGroupExpanded] = useState(false);
    const hasVariants = group.length > 1;

    if (!hasVariants) {
        return <TableRow item={group[0]} />;
    }
    
    const scores = group.map(i => i.Score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    return (
        <>
            <tr className="border-b border-slate-700 bg-slate-900/40 hover:bg-slate-800/60" style={{boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.05)'}}>
                 <td className="p-4 w-12">
                    <button onClick={() => setGroupExpanded(!isGroupExpanded)} className="p-1 text-slate-400 hover:text-white" aria-expanded={isGroupExpanded}>
                        {isGroupExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                    </button>
                </td>
                <td className="p-4 font-bold text-teal-300">
                    {baseName}
                    <span className="ms-2 text-xs font-medium text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{group.length} {t('table_variants')}</span>
                </td>
                <td className="p-4"></td>
                <td className="p-4 text-center font-mono text-lg">
                    {minScore === maxScore ? minScore : `${minScore}–${maxScore}`}
                </td>
                <td className="p-4"></td>
            </tr>
            {isGroupExpanded && group.map(variant => (
                <TableRow key={variant.id} item={variant} isVariant />
            ))}
        </>
    );
};

export const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
    const { t } = useTranslation();
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Score', direction: 'descending' });

    const groupedAndSortedResults = useMemo(() => {
        const groups = new Map<string, AnalysisResult[]>();
        results.forEach(item => {
            const baseName = getBaseName(item.item_name);
            if (!groups.has(baseName)) {
                groups.set(baseName, []);
            }
            groups.get(baseName)!.push(item);
        });

        let displayData = Array.from(groups.values());

        if (sortConfig !== null) {
            displayData.sort((groupA, groupB) => {
                const a = groupA[0];
                const b = groupB[0];
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return displayData;

    }, [results, sortConfig]);

    const requestSort = (key: keyof AnalysisResult) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof AnalysisResult) => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />;
    };

    return (
        <div className="space-y-6">
             <h2 className="text-3xl font-bold text-white">{t('table_title')}</h2>
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
                        <tr>
                            <th className="p-4 w-12"></th>
                            <th className="p-4">
                                <button onClick={() => requestSort('item_name')} className="flex items-center gap-2">{t('table_header_item')} {getSortIcon('item_name')}</button>
                            </th>
                            <th className="p-4">
                                <button onClick={() => requestSort('PT_Category')} className="flex items-center gap-2">{t('table_header_category')} {getSortIcon('PT_Category')}</button>
                            </th>
                            <th className="p-4 text-center">
                                <button onClick={() => requestSort('Score')} className="flex items-center gap-2 mx-auto">{t('table_header_score')} {getSortIcon('Score')}</button>
                            </th>
                            <th className="p-4">
                               <button onClick={() => requestSort('Decision')} className="flex items-center gap-2">{t('table_header_status')} {getSortIcon('Decision')}</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedAndSortedResults.map((group) => (
                           <GroupRow key={getBaseName(group[0].item_name)} baseName={getBaseName(group[0].item_name)} group={group} />
                        ))}
                    </tbody>
                </table>
                 {groupedAndSortedResults.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        {t('table_no_results')}
                    </div>
                )}
            </div>
        </div>
    );
};