/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

// Loosely based on ExifReader tags for type safety
export interface ImageMetadata {
    Make?: { description: string };
    Model?: { description: string };
    DateTimeOriginal?: { description: string };
    ImageWidth?: number;
    ImageLength?: number;
    FileSize?: number;
    FileName?: string;
}

interface MetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    metadata: ImageMetadata | null;
}

const MetadataModal: React.FC<MetadataModalProps> = ({ isOpen, onClose, metadata }) => {
    if (!isOpen) return null;

    const formatBytes = (bytes?: number, decimals = 2) => {
        if (bytes === undefined || !+bytes) return null;
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    const renderMetadataItem = (label: string, value: any) => {
        if (!value) return null;
        return (
            <div className="flex justify-between items-start py-3 border-b border-panel last:border-b-0">
                <dt className="text-sm font-medium text-subtle">{label}</dt>
                <dd className="text-sm text-main text-right break-all">{value.toString()}</dd>
            </div>
        );
    };

    const hasMetadata = metadata && Object.values(metadata).some(v => v !== undefined);

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-panel border rounded-xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-main">Image Information</h2>
                    <button onClick={onClose} className="text-subtle hover:text-main text-3xl leading-none font-bold">&times;</button>
                </div>
                {hasMetadata ? (
                    <dl>
                        {renderMetadataItem('File Name', metadata?.FileName)}
                        {renderMetadataItem('Resolution', metadata?.ImageWidth && metadata.ImageLength ? `${metadata.ImageWidth} x ${metadata.ImageLength}` : undefined)}
                        {renderMetadataItem('File Size', formatBytes(metadata?.FileSize))}
                        {renderMetadataItem('Camera Make', metadata?.Make?.description)}
                        {renderMetadataItem('Camera Model', metadata?.Model?.description)}
                        {renderMetadataItem('Date Taken', metadata?.DateTimeOriginal?.description)}
                    </dl>
                ) : (
                    <p className="text-subtle text-center py-4">No metadata available for this image.</p>
                )}
            </div>
        </div>
    );
};

export default MetadataModal;