"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box, IconButton, Paper, Tooltip, Typography} from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import {WidgetInstance} from "@/lib/layout/PageConfigTypes";
import {WIDGET_REGISTRY} from "./WidgetRegistry";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface WidgetFrameProps {
    widget: WidgetInstance;
    editMode: boolean;
    onConfigure: () => void;
    onRemove: () => void;
    children: React.ReactNode;
}

/**
 * Chrome around every widget: title bar (drag handle in edit mode), settings
 * gear and remove button. The body is a flex column with minHeight 0 so
 * DataGrids/charts/maps can fill and scroll inside a resizable cell.
 */
export default function WidgetFrame({widget, editMode, onConfigure, onRemove, children}: WidgetFrameProps) {
    const {t} = useLanguage();
    const entry = WIDGET_REGISTRY[widget.type];
    const title = widget.title || t(entry?.titleKey ?? widget.type);

    return (
        <Paper
            variant="outlined"
            data-testid={`widget-${widget.type}`}
            sx={{height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}
        >
            <Box
                className={editMode ? 'widget-drag-handle' : undefined}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderBottom: 1,
                    borderColor: 'divider',
                    cursor: editMode ? 'move' : 'default',
                    userSelect: 'none',
                    minHeight: 34,
                    flexShrink: 0,
                }}
            >
                {editMode && <DragIndicatorRoundedIcon fontSize="small" color="disabled"/>}
                <Box sx={{color: 'text.secondary', display: 'flex', alignItems: 'center', '& svg': {fontSize: 18}}}>
                    {entry?.icon}
                </Box>
                <Typography variant="subtitle2" sx={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {title}
                </Typography>
                {editMode && (
                    <>
                        <Tooltip title={t('widgetSettings')}>
                            <IconButton
                                size="small"
                                onClick={onConfigure}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <SettingsRoundedIcon fontSize="inherit"/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t('removeWidget')}>
                            <IconButton
                                size="small"
                                onClick={onRemove}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <CloseRoundedIcon fontSize="inherit"/>
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Box>
            <Box sx={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 0.5}}>
                {children}
            </Box>
        </Paper>
    );
}
