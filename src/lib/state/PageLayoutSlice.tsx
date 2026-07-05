/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {REHYDRATE} from "redux-persist";
import {RootState} from "@/lib/state/Store";
import {
    LayoutItem,
    PAGE_CONFIG_SCHEMA_VERSION,
    PageConfig,
    PageLaneContext,
    PageLayoutState,
    RGL_COLS,
    RGLBreakpoint,
    SEEDED_PAGE_IDS,
    WIDGET_SIZES,
    WidgetConfig,
    WidgetInstance,
} from "@/lib/layout/PageConfigTypes";
import {buildDefaultPage, buildDefaultPages} from "@/lib/layout/DefaultPages";
import {rehydratePageLayoutState} from "@/lib/layout/ConfigValidation";

const initialState: PageLayoutState = {
    schemaVersion: PAGE_CONFIG_SCHEMA_VERSION,
    pages: buildDefaultPages(),
    removedSeededPageIds: [],
    editModePageId: null,
};

function findPage(state: PageLayoutState, pageId: string): PageConfig | undefined {
    return state.pages.find((p) => p.id === pageId);
}

function isSeededId(pageId: string): boolean {
    return (SEEDED_PAGE_IDS as readonly string[]).includes(pageId);
}

/** Append a layout item for a new widget at the bottom of every breakpoint. */
function appendLayoutItems(page: PageConfig, widget: WidgetInstance) {
    const {defaultSize, minSize} = WIDGET_SIZES[widget.type];
    (Object.keys(RGL_COLS) as RGLBreakpoint[]).forEach((bp) => {
        const cols = RGL_COLS[bp];
        const items = page.layouts[bp] ?? [];
        const bottom = items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
        const newItem: LayoutItem = {
            i: widget.id,
            x: 0,
            y: bottom,
            w: Math.min(defaultSize.w, cols),
            h: defaultSize.h,
            minW: Math.min(minSize.w, cols),
            minH: minSize.h,
        };
        page.layouts[bp] = [...items, newItem];
    });
}

export const Slice = createSlice({
    name: 'pageLayoutSlice',
    initialState,
    reducers: {
        addPage: (state, action: PayloadAction<PageConfig>) => {
            if (findPage(state, action.payload.id)) return;
            state.pages.push(action.payload);
            state.removedSeededPageIds = state.removedSeededPageIds.filter((id) => id !== action.payload.id);
        },
        removePage: (state, action: PayloadAction<string>) => {
            state.pages = state.pages.filter((p) => p.id !== action.payload);
            if (isSeededId(action.payload) && !state.removedSeededPageIds.includes(action.payload)) {
                state.removedSeededPageIds.push(action.payload);
            }
            if (state.editModePageId === action.payload) state.editModePageId = null;
        },
        renamePage: (state, action: PayloadAction<{ pageId: string; title: string }>) => {
            const page = findPage(state, action.payload.pageId);
            if (page) page.title = action.payload.title;
        },
        setPageIcon: (state, action: PayloadAction<{ pageId: string; icon: string }>) => {
            const page = findPage(state, action.payload.pageId);
            if (page) page.icon = action.payload.icon;
        },
        reorderPages: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
            const {fromIndex, toIndex} = action.payload;
            if (fromIndex < 0 || fromIndex >= state.pages.length || toIndex < 0 || toIndex >= state.pages.length) return;
            const [moved] = state.pages.splice(fromIndex, 1);
            state.pages.splice(toIndex, 0, moved);
        },
        setPageLaneContext: (state, action: PayloadAction<{ pageId: string; laneContext: PageLaneContext | undefined }>) => {
            const page = findPage(state, action.payload.pageId);
            if (page) page.laneContext = action.payload.laneContext;
        },
        addWidget: (state, action: PayloadAction<{ pageId: string; widget: WidgetInstance }>) => {
            const page = findPage(state, action.payload.pageId);
            if (!page || page.widgets.some((w) => w.id === action.payload.widget.id)) return;
            page.widgets.push(action.payload.widget);
            appendLayoutItems(page, action.payload.widget);
        },
        removeWidget: (state, action: PayloadAction<{ pageId: string; widgetId: string }>) => {
            const page = findPage(state, action.payload.pageId);
            if (!page) return;
            page.widgets = page.widgets.filter((w) => w.id !== action.payload.widgetId);
            (Object.keys(page.layouts) as RGLBreakpoint[]).forEach((bp) => {
                page.layouts[bp] = (page.layouts[bp] ?? []).filter((it) => it.i !== action.payload.widgetId);
            });
        },
        updateWidgetConfig: (state, action: PayloadAction<{ pageId: string; widgetId: string; config: WidgetConfig }>) => {
            const page = findPage(state, action.payload.pageId);
            const widget = page?.widgets.find((w) => w.id === action.payload.widgetId);
            if (widget) widget.config = action.payload.config;
        },
        updateWidgetTitle: (state, action: PayloadAction<{ pageId: string; widgetId: string; title: string | undefined }>) => {
            const page = findPage(state, action.payload.pageId);
            const widget = page?.widgets.find((w) => w.id === action.payload.widgetId);
            if (widget) widget.title = action.payload.title;
        },
        updateLayouts: (state, action: PayloadAction<{
            pageId: string;
            layouts: Partial<Record<RGLBreakpoint, LayoutItem[]>>
        }>) => {
            const page = findPage(state, action.payload.pageId);
            if (!page) return;
            // Keep only entries for widgets that still exist, and strip RGL
            // runtime fields. Min sizes are NOT persisted — PageHost stamps
            // them from WIDGET_SIZES on render so code stays the source of truth.
            const widgetIds = new Set(page.widgets.map((w) => w.id));
            const cleaned: Partial<Record<RGLBreakpoint, LayoutItem[]>> = {};
            (['lg', 'md', 'sm'] as RGLBreakpoint[]).forEach((bp) => {
                const items = action.payload.layouts[bp];
                if (!items) return;
                cleaned[bp] = items
                    .filter((it) => widgetIds.has(it.i))
                    .map(({i, x, y, w, h}) => ({i, x, y, w, h}));
            });
            page.layouts = cleaned;
        },
        setEditMode: (state, action: PayloadAction<string | null>) => {
            state.editModePageId = action.payload;
        },
        resetPageToDefault: (state, action: PayloadAction<string>) => {
            const def = buildDefaultPage(action.payload);
            if (!def) return;
            const idx = state.pages.findIndex((p) => p.id === action.payload);
            if (idx >= 0) state.pages[idx] = def;
            else state.pages.push(def);
            state.removedSeededPageIds = state.removedSeededPageIds.filter((id) => id !== action.payload);
        },
        resetAllToDefault: (state) => {
            const userPages = state.pages.filter((p) => !isSeededId(p.id));
            state.pages = [...buildDefaultPages(), ...userPages];
            state.removedSeededPageIds = [];
        },
        importPages: (state, action: PayloadAction<{ pages: PageConfig[]; mode: 'replace-all' | 'merge' }>) => {
            const {pages, mode} = action.payload;
            if (mode === 'replace-all') {
                state.pages = pages;
                // Seeded pages absent from the import stay absent until reset.
                state.removedSeededPageIds = (SEEDED_PAGE_IDS as readonly string[])
                    .filter((id) => !pages.some((p) => p.id === id));
            } else {
                const existingTitles = new Set(state.pages.map((p) => p.title));
                for (const incoming of pages) {
                    const idx = state.pages.findIndex((p) => p.id === incoming.id);
                    if (idx >= 0) {
                        state.pages[idx] = incoming;
                    } else {
                        let page = incoming;
                        if (existingTitles.has(page.title) && !page.seededRoute) {
                            let n = 2;
                            while (existingTitles.has(`${incoming.title} (${n})`)) n++;
                            page = {...incoming, title: `${incoming.title} (${n})`};
                        }
                        existingTitles.add(page.title);
                        state.pages.push(page);
                    }
                    state.removedSeededPageIds = state.removedSeededPageIds.filter((id) => id !== incoming.id);
                }
            }
            state.editModePageId = null;
        },
    },
    extraReducers: (builder) => {
        builder.addMatcher(
            (action): action is PayloadAction<any> => action.type === REHYDRATE,
            (state, action: any) => {
                const inbound = action.payload?.pageLayoutSlice;
                if (!inbound) return state;
                // Return a NEW object: redux-persist's autoMergeLevel1 then sees
                // this key as reducer-modified and keeps our migrated state
                // instead of overwriting it with the raw persisted value.
                return rehydratePageLayoutState(inbound);
            }
        );
    },
});

export const {
    addPage,
    removePage,
    renamePage,
    setPageIcon,
    reorderPages,
    setPageLaneContext,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    updateWidgetTitle,
    updateLayouts,
    setEditMode,
    resetPageToDefault,
    resetAllToDefault,
    importPages,
} = Slice.actions;

export const selectPages = (state: RootState) => state.pageLayoutSlice.pages;
export const selectNavPages = (state: RootState) =>
    state.pageLayoutSlice.pages.filter((p: PageConfig) => p.showInNav !== false);
export const selectPageById = (pageId: string) => (state: RootState) =>
    state.pageLayoutSlice.pages.find((p: PageConfig) => p.id === pageId);
export const selectEditModePageId = (state: RootState) => state.pageLayoutSlice.editModePageId;

export default Slice.reducer;
