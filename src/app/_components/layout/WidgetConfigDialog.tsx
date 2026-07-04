"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useEffect, useState} from "react";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography} from "@mui/material";
import {useAppDispatch} from "@/lib/state/Hooks";
import {PageConfig, WidgetConfig, WidgetInstance} from "@/lib/layout/PageConfigTypes";
import {updateWidgetConfig, updateWidgetTitle} from "@/lib/state/PageLayoutSlice";
import {WIDGET_REGISTRY} from "./WidgetRegistry";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface WidgetConfigDialogProps {
    page: PageConfig;
    widget: WidgetInstance | null;
    onClose: () => void;
}

/** Generic dialog shell hosting a widget's registry ConfigForm on draft state. */
export default function WidgetConfigDialog({page, widget, onClose}: WidgetConfigDialogProps) {
    const dispatch = useAppDispatch();
    const {t} = useLanguage();

    const [draft, setDraft] = useState<WidgetConfig | null>(null);
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (widget) {
            setDraft(JSON.parse(JSON.stringify(widget.config ?? {})));
            setTitle(widget.title ?? '');
        }
    }, [widget]);

    if (!widget) return null;

    const entry = WIDGET_REGISTRY[widget.type];
    const ConfigForm = entry?.ConfigForm;

    const handleSave = () => {
        if (draft) {
            dispatch(updateWidgetConfig({pageId: page.id, widgetId: widget.id, config: draft}));
        }
        dispatch(updateWidgetTitle({pageId: page.id, widgetId: widget.id, title: title.trim() || undefined}));
        onClose();
    };

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('widgetSettings')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{pt: 1}}>
                    <TextField
                        label={t('widgetTitle')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t(entry?.titleKey ?? widget.type)}
                        size="small"
                        fullWidth
                    />
                    {ConfigForm && draft ? (
                        <ConfigForm
                            page={page}
                            widget={widget}
                            draft={draft}
                            onChange={setDraft}
                        />
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t('noWidgetOptions')}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSave} variant="contained">{t('save')}</Button>
            </DialogActions>
        </Dialog>
    );
}
