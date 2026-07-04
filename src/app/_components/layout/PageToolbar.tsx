"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useState} from "react";
import {
    Box,
    Button,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImportExportRoundedIcon from "@mui/icons-material/ImportExportRounded";
import {useSelector} from "react-redux";
import {useRouter} from "next/dist/client/components/navigation";
import {useAppDispatch} from "@/lib/state/Hooks";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {selectCurrentLane, setCurrentLane} from "@/lib/state/LaneViewSlice";
import {PageConfig, SEEDED_PAGE_IDS} from "@/lib/layout/PageConfigTypes";
import {
    removePage,
    resetPageToDefault,
    selectEditModePageId,
    selectPageById,
    setEditMode,
    setPageLaneContext,
} from "@/lib/state/PageLayoutSlice";
import AddWidgetDialog from "./AddWidgetDialog";
import PageSettingsDialog from "./PageSettingsDialog";
import ImportExportDialog from "./ImportExportDialog";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface PageToolbarProps {
    pageId: string;
    /** Extra element rendered before the title (e.g. lane-view BackButton). */
    leading?: React.ReactNode;
}

/** Title row of a widget page: lane selector, edit-mode toggle, page menu. */
export default function PageToolbar({pageId, leading}: PageToolbarProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {t} = useLanguage();

    const page: PageConfig | undefined = useSelector(selectPageById(pageId));
    const editMode = useSelector(selectEditModePageId) === pageId;
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const globalCurrentLane = useSelector(selectCurrentLane);

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [addWidgetOpen, setAddWidgetOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [importExportOpen, setImportExportOpen] = useState(false);

    if (!page) return null;

    const title = page.seededRoute ? t(page.title) : page.title;
    const isSeeded = (SEEDED_PAGE_IDS as readonly string[]).includes(page.id);

    const laneNames: string[] = laneMap instanceof Map
        ? [...laneMap.keys()].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
        : [];
    const selectedLane = page.laneContext?.mode === 'fixed'
        ? page.laneContext.lane
        : (globalCurrentLane ?? '');

    const handleLaneChange = (lane: string) => {
        if (page.laneContext?.mode === 'fixed') {
            dispatch(setPageLaneContext({pageId, laneContext: {mode: 'fixed', lane}}));
        } else {
            dispatch(setCurrentLane(lane));
        }
    };

    const handleDeletePage = () => {
        setMenuAnchor(null);
        dispatch(removePage(pageId));
        router.push('/');
    };

    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap'}}>
            {leading}
            <Typography variant="h5" sx={{fontWeight: 500}}>{title}</Typography>

            {page.laneContext && laneNames.length > 0 && (
                <FormControl size="small" sx={{minWidth: 180}}>
                    <InputLabel id={`lane-ctx-${pageId}`}>{t('laneId')}</InputLabel>
                    <Select
                        labelId={`lane-ctx-${pageId}`}
                        label={t('laneId')}
                        value={laneNames.includes(selectedLane) ? selectedLane : ''}
                        onChange={(e) => handleLaneChange(e.target.value)}
                    >
                        {laneNames.map((lane) => (
                            <MenuItem key={lane} value={lane}>{lane}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            <Box sx={{flex: 1}}/>

            {editMode && (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddRoundedIcon/>}
                    onClick={() => setAddWidgetOpen(true)}
                    data-testid="add-widget-button"
                >
                    {t('addWidget')}
                </Button>
            )}

            <Tooltip title={editMode ? t('lockLayout') : t('editLayout')}>
                <Button
                    variant={editMode ? 'contained' : 'outlined'}
                    size="small"
                    color={editMode ? 'primary' : 'inherit'}
                    startIcon={editMode ? <LockRoundedIcon/> : <EditRoundedIcon/>}
                    onClick={() => dispatch(setEditMode(editMode ? null : pageId))}
                    data-testid="edit-mode-toggle"
                >
                    {editMode ? t('done') : t('editLayout')}
                </Button>
            </Tooltip>

            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} data-testid="page-menu-button">
                <MoreVertRoundedIcon/>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => { setMenuAnchor(null); setSettingsOpen(true); }}>
                    <ListItemIcon><SettingsRoundedIcon fontSize="small"/></ListItemIcon>
                    <ListItemText>{t('pageSettings')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); setImportExportOpen(true); }}>
                    <ListItemIcon><ImportExportRoundedIcon fontSize="small"/></ListItemIcon>
                    <ListItemText>{t('importExport')}</ListItemText>
                </MenuItem>
                {isSeeded && (
                    <MenuItem onClick={() => { setMenuAnchor(null); dispatch(resetPageToDefault(pageId)); }}>
                        <ListItemIcon><RestartAltRoundedIcon fontSize="small"/></ListItemIcon>
                        <ListItemText>{t('resetPage')}</ListItemText>
                    </MenuItem>
                )}
                <Divider/>
                <MenuItem onClick={handleDeletePage} disabled={page.id === 'dashboard'}>
                    <ListItemIcon><DeleteOutlineRoundedIcon fontSize="small"/></ListItemIcon>
                    <ListItemText>{t('deletePage')}</ListItemText>
                </MenuItem>
            </Menu>

            <AddWidgetDialog pageId={pageId} open={addWidgetOpen} onClose={() => setAddWidgetOpen(false)}/>
            <PageSettingsDialog page={page} open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
            <ImportExportDialog open={importExportOpen} onClose={() => setImportExportOpen(false)} currentPage={page}/>
        </Box>
    );
}
