import React, { useState, useEffect } from 'react';

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  estimatedTime: number;
}

interface ProgressiveLoaderProps {
  progress: number;
  currentStep?: string;
  onCancel?: () => void;
}

const loadingSteps: LoadingStep[] = [
  {
    id: 'parsing',
    title: 'Parsing File',
    description: 'Reading and validating your inventory data',
    icon: '📄',
    estimatedTime: 2000
  },
  {
    id: 'analysis',
    title: 'Analyzing Items',
    description: 'Applying AI-powered classification rules',
    icon: '🧠',
    estimatedTime: 8000
  },
  {
    id: 'matching',
    title: 'Keyword Matching',
    description: 'Finding relevant physiotherapy terms',
    icon: '🔍',
    estimatedTime: 3000
  },
  {
    id: 'scoring',
    title: 'Scoring Items',
    description: 'Calculating relevance scores',
    icon: '📊',
    estimatedTime: 2000
  },
  {
    id: 'finalizing',
    title: 'Finalizing Results',
    description: 'Preparing your analysis report',
    icon: '✨',
    estimatedTime: 1000
  }
];

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  progress,
  currentStep = 'parsing',
  onCancel
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 100);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Mark steps as completed based on progress
    const newCompleted = new Set<string>();
    const progressPerStep = 100 / loadingSteps.length;
    
    loadingSteps.forEach((step, index) => {
      if (progress > (index + 1) * progressPerStep) {
        newCompleted.add(step.id);
      }
    });
    
    setCompletedSteps(newCompleted);
  }, [progress]);

  const getCurrentStepIndex = () => {
    return loadingSteps.findIndex(step => step.id === currentStep);
  };

  const getEstimatedTimeRemaining = () => {
    const currentStepIndex = getCurrentStepIndex();
    const remainingSteps = loadingSteps.slice(currentStepIndex);
    const totalEstimatedTime = remainingSteps.reduce((sum, step) => sum + step.estimatedTime, 0);
    
    const progressInCurrentStep = (progress % (100 / loadingSteps.length)) / (100 / loadingSteps.length);
    const timeRemainingInCurrentStep = remainingSteps[0]?.estimatedTime * (1 - progressInCurrentStep) || 0;
    
    return Math.max(0, totalEstimatedTime - timeRemainingInCurrentStep);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-2xl text-white shadow-2xl">
            {loadingSteps.find(step => step.id === currentStep)?.icon || '🔄'}
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
            {Math.round(progress)}%
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mt-4 mb-2">
          {loadingSteps.find(step => step.id === currentStep)?.title || 'Processing...'}
        </h2>
        
        <p className="text-slate-400">
          {loadingSteps.find(step => step.id === currentStep)?.description}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="h-3 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full transition-all duration-500 ease-out shadow-lg relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-sm text-slate-400">
          <span>Progress: {Math.round(progress)}%</span>
          <span>~{formatTime(getEstimatedTimeRemaining())} remaining</span>
        </div>
      </div>

      {/* Step Timeline */}
      <div className="space-y-3 mb-8">
        {loadingSteps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${
                isCurrent ? 'bg-teal-500/10 border border-teal-500/30' :
                isCompleted ? 'bg-green-500/10 border border-green-500/30' :
                'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300 ${
                isCurrent ? 'bg-teal-500 text-white animate-pulse' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {isCompleted ? '✓' : isCurrent ? step.icon : (index + 1)}
              </div>
              
              <div className="flex-1">
                <div className={`font-medium transition-colors ${
                  isCurrent ? 'text-teal-400' :
                  isCompleted ? 'text-green-400' :
                  'text-slate-400'
                }`}>
                  {step.title}
                </div>
                <div className="text-sm text-slate-500">
                  {step.description}
                </div>
              </div>
              
              {isCurrent && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                  <div className="text-xs text-slate-400">
                    {formatTime(timeElapsed)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        )}
        
        <div className="px-6 py-2 bg-slate-800/50 text-slate-400 rounded-lg text-sm">
          Processing {loadingSteps.length} steps...
        </div>
      </div>

      {/* Fun Facts */}
      <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="text-xs text-slate-400 text-center">
          💡 <strong>Did you know?</strong> Our AI analyzes over 50 physiotherapy-specific criteria to ensure accurate classification
        </div>
      </div>
    </div>
  );
};