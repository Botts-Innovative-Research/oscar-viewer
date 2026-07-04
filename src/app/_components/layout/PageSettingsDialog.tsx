"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useEffect, useState} from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {useAppDispatch} from "@/lib/state/Hooks";
import {PageConfig} from "@/lib/layout/PageConfigTypes";
import {renamePage, setPageIcon} from "@/lib/state/PageLayoutSlice";
import {PAGE_ICONS} from "./WidgetRegistry";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface PageSettingsDialogProps {
    page: PageConfig;
    open: boolean;
    onClose: () => void;
}

export default function PageSettingsDialog({page, open, onClose}: PageSettingsDialogProps) {
    const dispatch = useAppDispatch();
    const {t} = useLanguage();

    const displayTitle = page.seededRoute ? t(page.title) : page.title;
    const [name, setName] = useState(displayTitle);
    const [icon, setIcon] = useState(page.icon ?? 'grid');

    useEffect(() => {
        if (open) {
            setName(page.seededRoute ? t(page.title) : page.title);
            setIcon(page.icon ?? 'grid');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page.id]);

    const handleSave = () => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== displayTitle) {
            dispatch(renamePage({pageId: page.id, title: trimmed}));
        }
        if (icon !== page.icon) {
            dispatch(setPageIcon({pageId: page.id, icon}));
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{t('pageSettings')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{pt: 1}}>
                    <TextField
                        label={t('pageName')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <ToggleButtonGroup
                        value={icon}
                        exclusive
                        onChange={(_e, next) => next && setIcon(next)}
                        size="small"
                        sx={{flexWrap: 'wrap'}}
                    >
                        {Object.entries(PAGE_ICONS).map(([key, node]) => (
                            <ToggleButton key={key} value={key} aria-label={key}>
                                {node}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>{t('save')}</Button>
            </DialogActions>
        </Dialog>
    );
}
