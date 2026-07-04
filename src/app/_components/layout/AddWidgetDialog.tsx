"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {
    Card,
    CardActionArea,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {useAppDispatch} from "@/lib/state/Hooks";
import {buildDefaultWidgetConfig, WidgetInstance, WidgetType} from "@/lib/layout/PageConfigTypes";
import {addWidget} from "@/lib/state/PageLayoutSlice";
import {WIDGET_REGISTRY} from "./WidgetRegistry";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface AddWidgetDialogProps {
    pageId: string;
    open: boolean;
    onClose: () => void;
}

/** Palette of available widget types; picking one appends it to the page. */
export default function AddWidgetDialog({pageId, open, onClose}: AddWidgetDialogProps) {
    const dispatch = useAppDispatch();
    const {t} = useLanguage();

    const handleAdd = (type: WidgetType) => {
        const widget: WidgetInstance = {
            id: `w-${randomUUID()}`,
            type,
            config: buildDefaultWidgetConfig(type),
        };
        dispatch(addWidget({pageId, widget}));
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t('addWidget')}</DialogTitle>
            <DialogContent>
                <Grid container spacing={1.5} sx={{pt: 0.5}}>
                    {(Object.keys(WIDGET_REGISTRY) as WidgetType[]).map((type) => {
                        const entry = WIDGET_REGISTRY[type];
                        return (
                            <Grid item xs={6} sm={4} md={3} key={type}>
                                <Card variant="outlined" sx={{height: '100%'}}>
                                    <CardActionArea onClick={() => handleAdd(type)} sx={{height: '100%'}}
                                                    data-testid={`add-widget-${type}`}>
                                        <CardContent>
                                            <Stack alignItems="center" spacing={1}>
                                                {entry.icon}
                                                <Typography variant="body2" align="center">
                                                    {t(entry.titleKey)}
                                                </Typography>
                                            </Stack>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            </DialogContent>
        </Dialog>
    );
}
