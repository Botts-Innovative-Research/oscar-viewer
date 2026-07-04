/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    ExportedConfig,
    KNOWN_WIDGET_TYPES,
    LayoutItem,
    PAGE_CONFIG_SCHEMA_VERSION,
    PageConfig,
    PageLayoutState,
    WidgetType,
} from './PageConfigTypes';
import {buildDefaultPages} from './DefaultPages';

export type ValidationResult =
    | { ok: true; value: ExportedConfig }
    | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, any> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
}

function validateLayoutItem(raw: unknown, where: string, errors: string[]): raw is LayoutItem {
    if (!isObject(raw)) {
        errors.push(`${where}: layout entry is not an object`);
        return false;
    }
    if (typeof raw.i !== 'string' || raw.i.length === 0) {
        errors.push(`${where}: layout entry is missing widget id 'i'`);
        return false;
    }
    for (const k of ['x', 'y', 'w', 'h']) {
        if (!isFiniteNumber(raw[k])) {
            errors.push(`${where}: layout entry '${raw.i}' has non-numeric '${k}'`);
            return false;
        }
    }
    return true;
}

export function validatePageConfig(raw: unknown, where: string, errors: string[]): raw is PageConfig {
    if (!isObject(raw)) {
        errors.push(`${where}: page is not an object`);
        return false;
    }
    if (typeof raw.id !== 'string' || raw.id.length === 0) {
        errors.push(`${where}: page is missing 'id'`);
        return false;
    }
    if (typeof raw.title !== 'string' || raw.title.length === 0) {
        errors.push(`${where} (${raw.id}): page is missing 'title'`);
        return false;
    }
    if (!Array.isArray(raw.widgets)) {
        errors.push(`${where} (${raw.id}): 'widgets' is not an array`);
        return false;
    }
    for (const w of raw.widgets) {
        if (!isObject(w) || typeof w.id !== 'string' || typeof w.type !== 'string') {
            errors.push(`${where} (${raw.id}): widget entry malformed`);
            return false;
        }
        if (!KNOWN_WIDGET_TYPES.includes(w.type as WidgetType)) {
            errors.push(`${where} (${raw.id}): unknown widget type '${w.type}'`);
            return false;
        }
        if (!isObject(w.config)) {
            errors.push(`${where} (${raw.id}): widget '${w.id}' is missing 'config'`);
            return false;
        }
    }
    if (!isObject(raw.layouts)) {
        errors.push(`${where} (${raw.id}): 'layouts' is not an object`);
        return false;
    }
    for (const [bp, items] of Object.entries(raw.layouts)) {
        if (!['lg', 'md', 'sm'].includes(bp)) continue; // unknown breakpoints are dropped later
        if (!Array.isArray(items)) {
            errors.push(`${where} (${raw.id}): layouts.${bp} is not an array`);
            return false;
        }
        for (const it of items) {
            if (!validateLayoutItem(it, `${where} (${raw.id}) layouts.${bp}`, errors)) return false;
        }
    }
    return true;
}

/** Validate a parsed JSON export file. */
export function validateExportedConfig(raw: unknown): ValidationResult {
    const errors: string[] = [];
    if (!isObject(raw)) {
        return {ok: false, errors: ['File is not a JSON object']};
    }
    if (raw.kind !== 'oscar-viewer-pages') {
        return {ok: false, errors: [`Unrecognized file kind '${String(raw.kind)}' (expected 'oscar-viewer-pages')`]};
    }
    if (!isFiniteNumber(raw.schemaVersion)) {
        return {ok: false, errors: ['Missing or invalid schemaVersion']};
    }
    if (raw.schemaVersion > PAGE_CONFIG_SCHEMA_VERSION) {
        return {
            ok: false,
            errors: [`File schemaVersion ${raw.schemaVersion} is newer than this app supports (${PAGE_CONFIG_SCHEMA_VERSION})`]
        };
    }
    if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
        return {ok: false, errors: ['File contains no pages']};
    }
    raw.pages.forEach((p: unknown, idx: number) => validatePageConfig(p, `pages[${idx}]`, errors));
    if (errors.length > 0) return {ok: false, errors};

    const migratedPages = migratePages(raw.pages as PageConfig[], raw.schemaVersion);
    return {
        ok: true,
        value: {
            kind: 'oscar-viewer-pages',
            schemaVersion: PAGE_CONFIG_SCHEMA_VERSION,
            exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
            pages: migratedPages,
        },
    };
}

/**
 * Upgrade pages from an older schemaVersion to the current one. Single
 * migration path for both persisted state (REHYDRATE) and imported files.
 */
export function migratePages(pages: PageConfig[], fromVersion: number): PageConfig[] {
    let migrated = pages;
    // Future: if (fromVersion < 2) { migrated = migrated.map(v1ToV2); }
    void fromVersion;
    return migrated;
}

/**
 * Sanitize + migrate persisted slice state on rehydrate. Drops malformed
 * pages/widgets rather than failing, and re-seeds any missing seeded pages so
 * app upgrades that introduce new seeded pages self-heal.
 */
export function rehydratePageLayoutState(inbound: unknown): PageLayoutState {
    const defaults = buildDefaultPages();
    const fallback: PageLayoutState = {
        schemaVersion: PAGE_CONFIG_SCHEMA_VERSION,
        pages: defaults,
        removedSeededPageIds: [],
        editModePageId: null,
    };
    if (!isObject(inbound) || !Array.isArray(inbound.pages)) return fallback;

    const errors: string[] = [];
    const validPages = inbound.pages.filter((p: unknown, idx: number) => {
        const e: string[] = [];
        const ok = validatePageConfig(p, `persisted pages[${idx}]`, e);
        if (!ok) errors.push(...e);
        return ok;
    }) as PageConfig[];
    if (errors.length > 0) {
        console.warn('[pageLayout] dropped invalid persisted pages:', errors);
    }

    const fromVersion = isFiniteNumber(inbound.schemaVersion) ? inbound.schemaVersion : 1;
    const pages = migratePages(validPages, fromVersion);

    // Re-seed seeded pages that are missing (app upgrades introducing new
    // seeded pages self-heal) unless the user explicitly deleted them.
    const removedSeededPageIds: string[] = Array.isArray(inbound.removedSeededPageIds)
        ? inbound.removedSeededPageIds.filter((id: unknown) => typeof id === 'string')
        : [];
    const presentIds = new Set(pages.map((p) => p.id));
    const missingSeeded = defaults.filter((d) => !presentIds.has(d.id) && !removedSeededPageIds.includes(d.id));

    return {
        schemaVersion: PAGE_CONFIG_SCHEMA_VERSION,
        pages: [...pages, ...missingSeeded],
        removedSeededPageIds,
        editModePageId: null,
    };
}
