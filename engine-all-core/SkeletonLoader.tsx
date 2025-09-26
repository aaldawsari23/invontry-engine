import React from 'react';

interface SkeletonLoaderProps {
    type?: 'card' | 'table' | 'dashboard' | 'list';
    count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'card', count = 3 }) => {
    const baseSkeletonClass = "animate-pulse bg-slate-700 rounded";
    
    if (type === 'dashboard') {
        return (
            <div className="space-y-8">
                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-800 p-6 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 ${baseSkeletonClass}`}></div>
                                <div className="space-y-2">
                                    <div className={`h-8 w-16 ${baseSkeletonClass}`}></div>
                                    <div className={`h-4 w-20 ${baseSkeletonClass}`}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Chart Skeleton */}
                <div className="bg-slate-800 p-6 rounded-lg">
                    <div className={`h-6 w-48 ${baseSkeletonClass} mb-4`}></div>
                    <div className={`h-64 w-full ${baseSkeletonClass} rounded-lg`}></div>
                </div>
            </div>
        );
    }
    
    if (type === 'table') {
        return (
            <div className="bg-slate-800 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="p-4 border-b border-slate-700">
                    <div className="grid grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`h-4 ${baseSkeletonClass}`}></div>
                        ))}
                    </div>
                </div>
                
                {/* Table Rows */}
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-slate-700/50 last:border-b-0">
                        <div className="grid grid-cols-5 gap-4">
                            {[...Array(5)].map((_, j) => (
                                <div key={j} className={`h-4 ${baseSkeletonClass}`} style={{
                                    width: j === 0 ? '100%' : `${60 + Math.random() * 40}%`
                                }}></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    if (type === 'list') {
        return (
            <div className="space-y-4">
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="bg-slate-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 ${baseSkeletonClass} rounded-full`}></div>
                            <div className="flex-1 space-y-2">
                                <div className={`h-4 ${baseSkeletonClass}`} style={{ width: `${60 + Math.random() * 40}%` }}></div>
                                <div className={`h-3 ${baseSkeletonClass}`} style={{ width: `${40 + Math.random() * 30}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    // Default card skeleton
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-4 border-l-4 border-slate-600">
                    <div className="space-y-3">
                        {/* Title */}
                        <div className="flex justify-between items-start">
                            <div className={`h-5 ${baseSkeletonClass}`} style={{ width: `${70 + Math.random() * 30}%` }}></div>
                            <div className={`h-4 w-12 ${baseSkeletonClass} rounded-full`}></div>
                        </div>
                        
                        {/* Description */}
                        <div className="space-y-2">
                            <div className={`h-3 ${baseSkeletonClass}`} style={{ width: '100%' }}></div>
                            <div className={`h-3 ${baseSkeletonClass}`} style={{ width: `${60 + Math.random() * 40}%` }}></div>
                        </div>
                        
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className={`h-3 w-16 ${baseSkeletonClass}`}></div>
                                <div className={`h-4 ${baseSkeletonClass}`} style={{ width: `${50 + Math.random() * 40}%` }}></div>
                            </div>
                            <div className="space-y-2">
                                <div className={`h-3 w-12 ${baseSkeletonClass}`}></div>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, j) => (
                                        <div key={j} className={`h-4 w-3 ${baseSkeletonClass}`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/50">
                            {[...Array(Math.floor(2 + Math.random() * 4))].map((_, j) => (
                                <div 
                                    key={j} 
                                    className={`h-6 ${baseSkeletonClass} rounded`} 
                                    style={{ width: `${40 + Math.random() * 60}px` }}
                                ></div>
                            ))}
                        </div>
                        
                        {/* Action Button */}
                        <div className="pt-3 mt-3 border-t border-slate-700/50 text-right">
                            <div className={`h-4 w-24 ${baseSkeletonClass} ml-auto`}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Specific skeleton components for different use cases
export const DashboardSkeleton: React.FC = () => <SkeletonLoader type="dashboard" />;
export const CardSkeleton: React.FC<{ count?: number }> = ({ count }) => <SkeletonLoader type="card" count={count} />;
export const TableSkeleton: React.FC<{ count?: number }> = ({ count }) => <SkeletonLoader type="table" count={count} />;
export const ListSkeleton: React.FC<{ count?: number }> = ({ count }) => <SkeletonLoader type="list" count={count} />;