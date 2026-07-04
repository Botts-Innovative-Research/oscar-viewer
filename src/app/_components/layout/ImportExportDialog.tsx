"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useRef, useState} from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Typography,
} from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {PageConfig} from "@/lib/layout/PageConfigTypes";
import {exportPagesToFile, readConfigFile} from "@/lib/layout/ConfigIO";
import {validateExportedConfig} from "@/lib/layout/ConfigValidation";
import {importPages, selectPages} from "@/lib/state/PageLayoutSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface ImportExportDialogProps {
    open: boolean;
    onClose: () => void;
    /** Page whose single-page export is offered (usually the current page). */
    currentPage?: PageConfig;
}

export default function ImportExportDialog({open, onClose, currentPage}: ImportExportDialogProps) {
    const dispatch = useAppDispatch();
    const {t} = useLanguage();
    const pages = useSelector(selectPages);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [importMode, setImportMode] = useState<'merge' | 'replace-all'>('merge');
    const [errors, setErrors] = useState<string[]>([]);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const stamp = new Date().toISOString().slice(0, 10);

    const handleExportAll = () => {
        exportPagesToFile(pages, `oscar-pages-${stamp}.json`);
    };

    const handleExportCurrent = () => {
        if (currentPage) {
            exportPagesToFile([currentPage], `oscar-page-${currentPage.id}-${stamp}.json`);
        }
    };

    const handleImportFile = async (file: File) => {
        setErrors([]);
        setSuccessMsg(null);
        try {
            const raw = await readConfigFile(file);
            const result = validateExportedConfig(raw);
            if ('errors' in result) {
                setErrors(result.errors);
                return;
            }
            dispatch(importPages({pages: result.value.pages, mode: importMode}));
            setSuccessMsg(`${t('importSuccess')} (${result.value.pages.length})`);
        } catch (e: any) {
            setErrors([e?.message ?? 'Import failed']);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{t('importExport')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{pt: 1}}>
                    <Typography variant="subtitle2">{t('exportConfig')}</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadRoundedIcon/>}
                            onClick={handleExportAll}
                        >
                            {t('exportAllPages')}
                        </Button>
                        {currentPage && (
                            <Button
                                variant="outlined"
                                startIcon={<FileDownloadRoundedIcon/>}
                                onClick={handleExportCurrent}
                            >
                                {t('exportThisPage')}
                            </Button>
                        )}
                    </Stack>

                    <Divider/>

                    <Typography variant="subtitle2">{t('importConfig')}</Typography>
                    <FormControl>
                        <RadioGroup
                            value={importMode}
                            onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace-all')}
                        >
                            <FormControlLabel value="merge" control={<Radio size="small"/>} label={t('importMerge')}/>
                            <FormControlLabel value="replace-all" control={<Radio size="small"/>} label={t('importReplaceAll')}/>
                        </RadioGroup>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<FileUploadRoundedIcon/>}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {t('chooseFile')}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImportFile(file);
                            e.target.value = '';
                        }}
                    />

                    {successMsg && <Alert severity="success">{successMsg}</Alert>}
                    {errors.length > 0 && (
                        <Alert severity="error">
                            <Stack spacing={0.5}>
                                {errors.slice(0, 6).map((err, i) => (
                                    <Typography key={i} variant="caption">{err}</Typography>
                                ))}
                                {errors.length > 6 && (
                                    <Typography variant="caption">… {errors.length - 6} more</Typography>
                                )}
                            </Stack>
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
