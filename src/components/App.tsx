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

import React, {useEffect, useState} from "react";

// @ts-ignore
import {appStore} from "../state/Store";

import CesiumMap from "./map/CesiumMap";
import Settings from "./settings/Settings";
import ContextMenu from "./menus/ContextMenu";
import {
    addObservable,
    addPhysicalSystem,
    addSensorHubServer,
    selectAddServerDialogOpen,
    selectAppInitialized,
    selectObservablesDialogOpen,
    selectServerManagementDialogOpen,
    selectSettingsDialogOpen,
    selectSystemsDialogOpen,
    selectTimeControllerDialogOpen,
    setAddServerDialogOpen,
    setAppInitialized,
    setObservablesDialogOpen,
    setServerManagementDialogOpen,
    setSettingsDialogOpen,
    setSystemsDialogOpen,
    setTimeControllerDialogOpen,
    updateContextMenuState
} from "../state/Slice";
import {useAppDispatch, useAppSelector} from "../state/Hooks";
import {
    Alert,
    AlertTitle,
    CircularProgress,
    Divider,
    ListItemIcon,
    ListItemText,
    MenuItem,
    MenuList,
    Paper
} from "@mui/material";
import {Hub, Lan, Schedule, SettingsApplications, Storage, Visibility} from "@mui/icons-material";
import ServerManagement from "./servers/ServerManagement";
import AddServer from "./servers/AddServer";
import Observables from "./observables/Observables";
import {initDb, readSensorHubServers} from "../database/database";
import {ISensorHubServer} from "../data/Models";
import {fetchPhysicalSystems} from "../net/SystemRequest";
import {discoverObservables} from "../discovery/DiscoveryUtils";
import CenteredPopover from "./decorators/CenteredPopover";
import Systems from "./systems/Systems";

const App = () => {
    const dispatch = useAppDispatch();

    let appInitialized = useAppSelector(selectAppInitialized);

    let showSettingsDialog = useAppSelector(selectSettingsDialogOpen);
    let showServerManagementDialog = useAppSelector(selectServerManagementDialogOpen);
    let showObservablesDialog = useAppSelector(selectObservablesDialogOpen);
    let showAddServerDialog = useAppSelector(selectAddServerDialogOpen);
    let showTimeControllerDialog = useAppSelector(selectTimeControllerDialogOpen);
    let showSystemsDialog = useAppSelector(selectSystemsDialogOpen);

    let [showConfirmation, setShowConfirmation] = useState(false);
    let [showError, setShowError] = useState(false);
    let [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {

        const loader = async () => {

            await initDb();

            let sensorHubServers: ISensorHubServer[] = await readSensorHubServers();

            for (let sensorHubServer of sensorHubServers) {

                dispatch(addSensorHubServer(sensorHubServer));

                await fetchPhysicalSystems(sensorHubServer, true).then(async physicalSystems => {

                    for (let system of physicalSystems) {

                        dispatch(addPhysicalSystem(system))
                    }

                    await discoverObservables(sensorHubServer, true).then(visualizations => {

                        for (let visualization of visualizations) {

                            dispatch(addObservable(visualization))
                        }

                    }).catch(() => popupError(sensorHubServer.name));

                }).catch(() => popupError(sensorHubServer.name));
            }
        }

        if (!appInitialized) {

            loader().then(() => {
                    if (!showError) {
                        dispatch(setAppInitialized(true));
                        setShowConfirmation(true);
                        setTimeout(() => {
                            setShowConfirmation(false);
                        }, 5000)
                    }
                }
            );
        }
    }, [])

    const popupError = (msg: string) => {

        setErrorMsg(msg);
        setShowError(true);
        setTimeout(() => {
            setErrorMsg(null);
            setShowError(false);
        }, 5000)
    }

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

    const openTimeController = () => {
        dispatch(updateContextMenuState({showMenu: false}));
        dispatch(setTimeControllerDialogOpen(true));
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
        <div>
            <ContextMenu>
                <Paper sx={{width: 230}} elevation={0}>
                    <MenuList>
                        <MenuItem onClick={openObservables}>
                            <ListItemIcon>
                                <Visibility color={"primary"} fontSize="medium"/>
                            </ListItemIcon>
                            <ListItemText>Observables</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={openTimeController}>
                            <ListItemIcon>
                                <Schedule color={"primary"} fontSize="medium"/>
                            </ListItemIcon>
                            <ListItemText>Time Controller</ListItemText>
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
            </ContextMenu>

            {showServerManagementDialog ? <ServerManagement title={"Servers"}/> : null}
            {showSettingsDialog ? <Settings title={"Settings"}/> : null}
            {showAddServerDialog ? <AddServer title={"Configure New Server"}/> : null}
            {showObservablesDialog ? <Observables title={"Observables"}/> : null}
            {showTimeControllerDialog ? null : null}
            {showSystemsDialog ? <Systems title={"Systems"}/> : null}

            <CesiumMap/>

            {!appInitialized ?
                <CenteredPopover anchorEl={document.getElementById('root')} >
                    <Alert severity="info" style={{background: "transparent"}}>
                        <AlertTitle>Initializing...</AlertTitle>
                    </Alert>
                    <CircularProgress size={100} thickness={2} style={{margin: "2em"}}/>
                </CenteredPopover>
                : null
            }
            {showConfirmation ?
                <CenteredPopover anchorEl={document.getElementById('root')}>
                    <Alert severity="success">
                        <AlertTitle>Initialization Complete!</AlertTitle>
                    </Alert>
                </CenteredPopover>
                : null
            }
            {showError ?
                <CenteredPopover anchorEl={document.getElementById('root')}>
                    <Alert severity="warning">
                        <AlertTitle>{errorMsg} : Invalid Server Configuration or Server Not Responding</AlertTitle>
                    </Alert>
                </CenteredPopover>
                : null
            }
        </div>
    );
};

export default App;