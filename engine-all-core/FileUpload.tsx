
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, DocumentTextIcon, XCircleIcon } from './Icons';
import { useTranslation } from './I18n';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearProgressTimer = () => {
        if (progressTimerRef.current !== null) {
            clearTimeout(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            clearProgressTimer();
        };
    }, []);

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };
    
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const allowedExtensions = ['.json', '.csv', '.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const maxSizeInMB = 50;
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        
        if (!allowedExtensions.includes(fileExtension)) {
            return {
                valid: false,
                error: `Invalid file type. Please select a ${allowedExtensions.join(', ')} file.`
            };
        }
        
        if (file.size > maxSizeInBytes) {
            return {
                valid: false,
                error: `File size too large. Please select a file smaller than ${maxSizeInMB}MB.`
            };
        }
        
        if (file.size === 0) {
            return {
                valid: false,
                error: 'File appears to be empty. Please select a valid file.'
            };
        }
        
        return { valid: true };
    };

    const handleFile = (file: File) => {
        setFileError(null);
        const validation = validateFile(file);
        
        if (!validation.valid) {
            setFileError(validation.error || 'Invalid file');
            return;
        }
        
        setSelectedFile(file);

        // Simulate file reading progress for visual feedback without blocking analysis
        setUploadProgress(0);
        clearProgressTimer();

        const progressSteps = [15, 42, 68, 88, 100];
        const scheduleStep = (index: number) => {
            setUploadProgress(progressSteps[index]);
            if (index < progressSteps.length - 1) {
                const delay = index < progressSteps.length - 2 ? 90 : 160;
                progressTimerRef.current = setTimeout(() => scheduleStep(index + 1), delay);
            } else {
                progressTimerRef.current = null;
            }
        };

        progressTimerRef.current = setTimeout(() => scheduleStep(0), 60);
    };

    const handleAnalyzeClick = () => {
        if (selectedFile) {
           onFileSelect(selectedFile);
        }
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
        setFileError(null);
        clearProgressTimer();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
                {!selectedFile ? (
                    <div 
                        onClick={triggerFileSelect}
                        onDragEnter={handleDrag} 
                        onDragLeave={handleDrag} 
                        onDragOver={handleDrag} 
                        onDrop={handleDrop} 
                        className={`relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                            dragActive 
                                ? 'border-teal-400 bg-teal-400/5 scale-105 shadow-lg' 
                                : 'border-slate-600 hover:border-teal-400 hover:bg-slate-800/50 hover:shadow-md bg-slate-900'
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && triggerFileSelect()}
                        aria-label="Upload file area"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleChange}
                            accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            disabled={disabled}
                        />
                        
                        <div className={`text-center transition-all duration-300 ${dragActive ? 'scale-110' : ''}`}>
                            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                                dragActive ? 'bg-teal-400 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                                <UploadIcon className="w-8 h-8" />
                            </div>
                            
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {dragActive ? 'Drop your file here' : 'Upload Inventory File'}
                            </h3>
                            
                            <p className="text-slate-400 mb-2">
                                <span className="font-medium text-teal-400">Click to browse</span> or drag and drop
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-500">
                                <span className="px-2 py-1 bg-slate-800 rounded-full">CSV</span>
                                <span className="px-2 py-1 bg-slate-800 rounded-full">Excel</span>
                                <span className="px-2 py-1 bg-slate-800 rounded-full">JSON</span>
                            </div>
                            
                            <p className="text-xs text-slate-600 mt-2">Maximum file size: 50MB</p>
                        </div>
                    </div>
            ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    {/* File Header */}
                    <div className="p-6 border-b border-slate-700">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                                <DocumentTextIcon className="w-6 h-6 text-teal-600" />
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <h3 className="font-semibold text-white truncate">{selectedFile.name}</h3>
                                <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button 
                                onClick={handleClearFile} 
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" 
                                disabled={disabled}
                                aria-label="Remove file"
                            >
                                <XCircleIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress < 100 && uploadProgress > 0 && (
                        <div className="px-6 py-3 bg-slate-900">
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>Processing file...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                    className="bg-teal-500 h-2 rounded-full transition-all duration-300 ease-out" 
                                    style={{width: `${uploadProgress}%`}}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="p-6">
                        <button
                            onClick={handleAnalyzeClick}
                            disabled={disabled || uploadProgress < 100}
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-teal-500 hover:to-teal-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-teal-500/25"
                        >
                            {disabled ? 'Analyzing...' : uploadProgress < 100 ? 'Processing...' : 'Start Analysis'}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Error Message */}
            {fileError && (
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-300 text-sm">{fileError}</p>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};
