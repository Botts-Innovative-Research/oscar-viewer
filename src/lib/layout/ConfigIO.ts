/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {ExportedConfig, PAGE_CONFIG_SCHEMA_VERSION, PageConfig} from "./PageConfigTypes";

/**
 * Download pages as a JSON file. A plain Blob + anchor works in both the
 * browser and Electron (Electron shows its native save dialog) — no IPC.
 */
export function exportPagesToFile(pages: PageConfig[], filename: string) {
    const payload: ExportedConfig = {
        kind: 'oscar-viewer-pages',
        schemaVersion: PAGE_CONFIG_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        pages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/** Read and parse a config file picked via <input type=file>. */
export function readConfigFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(String(reader.result)));
            } catch (e) {
                reject(new Error('File is not valid JSON'));
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
