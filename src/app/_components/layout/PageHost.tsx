"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useEffect, useMemo, useState} from "react";
import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {Box, Button, Paper, Typography} from "@mui/material";
import Link from "next/link";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    LayoutItem,
    PageConfig,
    RGL_BREAKPOINTS,
    RGL_COLS,
    RGL_ROW_HEIGHT,
    RGLBreakpoint,
    WidgetInstance,
} from "@/lib/layout/PageConfigTypes";
import {
    removeWidget,
    selectEditModePageId,
    selectPageById,
    updateLayouts,
} from "@/lib/state/PageLayoutSlice";
import {WIDGET_REGISTRY} from "./WidgetRegistry";
import WidgetFrame from "./WidgetFrame";
import WidgetErrorBoundary from "./WidgetErrorBoundary";
import WidgetConfigDialog from "./WidgetConfigDialog";
import {useLanguage} from "@/app/contexts/LanguageContext";

const ResponsiveGridLayout = ReactGridLayout.WidthProvider(ReactGridLayout.Responsive);

interface PageHostProps {
    pageId: string;
}

/** Renders one configurable page: widgets laid out on a responsive grid. */
export default function PageHost({pageId}: PageHostProps) {
    const dispatch = useAppDispatch();
    const {t} = useLanguage();
    const page: PageConfig | undefined = useSelector(selectPageById(pageId));
    const editModePageId = useSelector(selectEditModePageId);
    const editMode = editModePageId === pageId;

    const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);

    // RGL measures the DOM — only render it after mount so the prerendered
    // static export doesn't bake in a bogus width.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const layouts: ReactGridLayout.Layouts = useMemo(() => {
        const result: ReactGridLayout.Layouts = {};
        (['lg', 'md', 'sm'] as RGLBreakpoint[]).forEach((bp) => {
            result[bp] = (page?.layouts?.[bp] ?? []).map((item: LayoutItem) => ({...item}));
        });
        return result;
    }, [page?.layouts]);

    if (!page) {
        return (
            <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2}}>
                <Typography variant="h6">{t('pageNotFound')}</Typography>
                <Link href="/" passHref>
                    <Button variant="contained">{t('dashboard')}</Button>
                </Link>
            </Box>
        );
    }

    if (!mounted) return null;

    const configWidget = configWidgetId
        ? page.widgets.find((w) => w.id === configWidgetId) ?? null
        : null;

    return (
        <Box sx={{width: '100%'}}>
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={RGL_BREAKPOINTS}
                cols={RGL_COLS}
                rowHeight={RGL_ROW_HEIGHT}
                margin={[8, 8]}
                draggableHandle=".widget-drag-handle"
                isDraggable={editMode}
                isResizable={editMode}
                compactType="vertical"
                onLayoutChange={(_current: ReactGridLayout.Layout[], allLayouts: ReactGridLayout.Layouts) => {
                    // Persist only user-driven changes; RGL also fires on mount
                    // and breakpoint switches, which must not dirty the config.
                    if (!editMode) return;
                    dispatch(updateLayouts({
                        pageId,
                        layouts: allLayouts as Partial<Record<RGLBreakpoint, LayoutItem[]>>,
                    }));
                }}
            >
                {page.widgets.map((widget: WidgetInstance) => {
                    const entry = WIDGET_REGISTRY[widget.type];
                    return (
                        <div key={widget.id}>
                            <WidgetFrame
                                widget={widget}
                                editMode={editMode}
                                onConfigure={() => setConfigWidgetId(widget.id)}
                                onRemove={() => dispatch(removeWidget({pageId, widgetId: widget.id}))}
                            >
                                <WidgetErrorBoundary widgetName={widget.title ?? widget.type}>
                                    {entry ? (
                                        <entry.component page={page} widget={widget}/>
                                    ) : (
                                        <Box sx={{p: 2}}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('unknownWidgetType')}: {widget.type}
                                            </Typography>
                                        </Box>
                                    )}
                                </WidgetErrorBoundary>
                            </WidgetFrame>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

            <WidgetConfigDialog
                page={page}
                widget={configWidget}
                onClose={() => setConfigWidgetId(null)}
            />

            {page.widgets.length === 0 && (
                <Paper variant="outlined" sx={{p: 4, textAlign: 'center', mt: 2}}>
                    <Typography color="text.secondary">{t('emptyPageHint')}</Typography>
                </Paper>
            )}
        </Box>
    );
}
