/*
 * Copyright (c) 2022.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

import React from "react";
import {Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Paper} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {
    selectContextMenuState,
    setAddServerDialogOpen,
    setObservablesDialogOpen,
    setServerManagementDialogOpen,
    setSettingsDialogOpen,
    setSystemsDialogOpen,
    updateContextMenuState
} from "../../state/Slice";
import {Hub, Lan, SettingsApplications, Storage, Visibility} from "@mui/icons-material";

const ContextMenu = () => {

    const dispatch = useAppDispatch();
    let menuState = useAppSelector(selectContextMenuState);

    const openSettings = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setSettingsDialogOpen(true));
    }

    const openServerManagement = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setServerManagementDialogOpen(true));
    }

    const openObservables = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setObservablesDialogOpen(true));
    }

    const openSystems = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setSystemsDialogOpen(true));
    }

    const openAddServer = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setAddServerDialogOpen(true));
    }

    return (
        <Menu
            style={{zIndex: '1000'}}
            open={menuState.showMenu}
            onClose={() => dispatch(updateContextMenuState({showMenu: false}))}
            anchorReference={"anchorPosition"}
            anchorPosition={
                menuState.showMenu
                    ? {top: menuState.top, left: menuState.left}
                    : undefined
            }
            variant={"menu"}
        >
            <Paper sx={{width: 230}} elevation={0}>
                <MenuList>
                    <MenuItem onClick={openObservables}>
                        <ListItemIcon>
                            <Visibility color={"primary"} fontSize="medium"/>
                        </ListItemIcon>
                        <ListItemText>Observables</ListItemText>
                    </MenuItem>
                    <Divider orientation={"horizontal"}/>
                    <MenuItem onClick={openSystems}>
                        <ListItemIcon>
                            <Hub color={"primary"} fontSize="medium"/>
                        </ListItemIcon>
                        <ListItemText>Systems</ListItemText>
                    </MenuItem>
                    <Divider orientation={"horizontal"}/>
                    <MenuItem onClick={openAddServer}>
                        <ListItemIcon>
                            <Lan color={"primary"} fontSize="medium"/>
                        </ListItemIcon>
                        <ListItemText>Add Server</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={openServerManagement}>
                        <ListItemIcon>
                            <Storage color={"primary"} fontSize="medium"/>
                        </ListItemIcon>
                        <ListItemText>Server Management</ListItemText>
                    </MenuItem>
                    <Divider orientation={"horizontal"}/>
                    <MenuItem onClick={openSettings}>
                        <ListItemIcon>
                            <SettingsApplications color={"primary"} fontSize="medium"/>
                        </ListItemIcon>
                        <ListItemText>Settings</ListItemText>
                    </MenuItem>
                </MenuList>
            </Paper>
        </Menu>
    );
}

export default ContextMenu;