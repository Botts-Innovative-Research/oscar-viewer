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

import React, {useState} from "react";
import {
    Alert,
    AlertTitle,
    Button,
    CircularProgress,
    DialogActions,
    FormControl,
    Grid,
    InputLabel,
    OutlinedInput,
    Paper,
    Tooltip
} from "@mui/material";
import {useAppDispatch} from "../../state/Hooks";
import {addObservable, addPhysicalSystem, addSensorHubServer, setAddServerDialogOpen} from "../../state/Slice";
import {Cancel, Done} from "@mui/icons-material";
import {ISensorHubServer, SensorHubServer} from "../../data/Models";
import {fetchPhysicalSystems, fetchSubsystems} from "../../net/SystemRequest";
import {storeSensorHubServer} from "../../database/database";
import {getObservables} from "../../observables/ObservableUtils";
import DraggableDialog from "../decorators/DraggableDialog";
import CenteredPopover from "../decorators/CenteredPopover";
import {DEFAULT_API_ENDPOINT, DEFAULT_SOS_ENDPOINT, DEFAULT_SPS_ENDPOINT} from "../../data/Constants";
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

interface IAddServerProps {
    title: string,
}

const AddServer = (props: IAddServerProps) => {

    const dispatch = useAppDispatch();

    let [serverName, setServerName] = useState("");
    let [serverAddress, setServerAddress] = useState("");
    let [userName, setUserName] = useState("");
    let [password, setPassword] = useState("");

    let [serverNameError, setServerNameError] = useState(false);
    let [serverAddressError, setServerAddressError] = useState(false);
    let [userNameError, setUserNameError] = useState(false);
    let [passwordError, setPasswordError] = useState(false);
    let [addingServer, setAddingServer] = useState(false);
    let [showConfirmation, setShowConfirmation] = useState(false);
    let [showError, setShowError] = useState(false);
    const [anchorEl, setAnchorEl] = useState<Element | null>(null);

    const isValidUrl = (urlString: string): boolean => {

        try {

            return Boolean(new URL(urlString));

        } catch (e) {

            return false;
        }
    }

    const createAuthToken = (username: string, password: string): string => {

        return btoa(`${username}:${password}`);
    }

    const addServer = (event: React.MouseEvent) => {

        setAnchorEl(event.currentTarget.parentElement.parentElement);

        let hasErrors: boolean = false;

        if (userName.length <= 0) {

            hasErrors = true;
            setUserNameError(true);
        }

        if (password.length <= 0) {

            hasErrors = true;
            setPasswordError(true);
        }

        if (serverName.length <= 0) {

            hasErrors = true;
            setServerNameError(true);
        }

        if (!isValidUrl(serverAddress)) {

            hasErrors = true;
            setServerAddressError(true);
        }

        if (!hasErrors) {

            setAddingServer(true);

            let server: ISensorHubServer = new SensorHubServer({
                address: serverAddress,
                name: serverName,
                uuid: randomUUID(),
                sosEndpoint: DEFAULT_SOS_ENDPOINT,
                spsEndpoint: DEFAULT_SPS_ENDPOINT,
                apiEndpoint: DEFAULT_API_ENDPOINT,
                authToken: createAuthToken(userName, password),
                secure: false,
                systems: [],
            });

            fetchPhysicalSystems(server, true).then(async physicalSystems => {

                dispatch(addSensorHubServer(server));

                for (let system of physicalSystems) {

                    await fetchSubsystems(server, true, system).then(async physicalSystems =>{

                        for(let system of physicalSystems) {

                            dispatch(addPhysicalSystem(system))
                        }
                    });

                    dispatch(addPhysicalSystem(system))
                }

                await getObservables(server as SensorHubServer, true).then(observables => {

                    for (let observable of observables) {

                        dispatch(addObservable(observable))
                    }

                    storeSensorHubServer(server);

                    setServerName("");
                    setServerAddress("");
                    setUserName("");
                    setPassword("");
                    setAddingServer(false);
                    setShowConfirmation(true);
                    setTimeout(() => {
                        setShowConfirmation(false)
                        dispatch(setAddServerDialogOpen(false));
                    }, 5000);

                }).catch((reason) => {
                    console.error(reason);
                    popupError()
                });

            }).catch((reason) => {
                console.error(reason);
                popupError()
            });
        }
    }

    const popupError = () => {

        setAddingServer(false);
        setShowError(true);
        setTimeout(() => {
            setShowError(false);
        }, 5000)
    }

    const cancel = () => {

        dispatch(setAddServerDialogOpen(false));
    }

    return (
        <DraggableDialog title={props.title}
                         onClose={() => cancel()}
                         actions={
                             <DialogActions>
                                 <Tooltip title={"Add Server"}>
                                     <Button variant={"contained"} startIcon={<Done/>}
                                             onClick={event => addServer(event)}>
                                         Add Server
                                     </Button>
                                 </Tooltip>
                                 <Tooltip title={"Add Server"}>
                                     <Button variant={"contained"} startIcon={<Cancel/>} onClick={cancel}>
                                         Cancel
                                     </Button>
                                 </Tooltip>
                             </DialogActions>
                         }
        >
            <Paper style={{margin: '.5em', padding: '.5em', pointerEvents: 'auto'}}>
                <Grid container direction={"column"} spacing={2}>
                    <Grid item>
                        <FormControl fullWidth>
                            <InputLabel htmlFor="serverName">Friendly Name</InputLabel>
                            <OutlinedInput
                                error={serverNameError}
                                id="serverName"
                                label="Friendly Name"
                                inputMode={"text"}
                                required
                                onChange={(event) => {
                                    setServerNameError(false);
                                    setServerName(event.target.value);
                                }}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item>
                        <FormControl fullWidth>
                            <InputLabel htmlFor="serverAddress">Server Address</InputLabel>
                            <OutlinedInput
                                error={serverAddressError}
                                id="serverAddress"
                                label="Server URL"
                                inputMode={"url"}
                                required
                                onChange={(event) => {
                                    setServerAddressError(false);
                                    setServerAddress(event.target.value);
                                }}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item>
                        <FormControl fullWidth>
                            <InputLabel htmlFor="userName">User Name</InputLabel>
                            <OutlinedInput
                                error={userNameError}
                                id="userName"
                                label="User Name"
                                inputMode={"text"}
                                required
                                onChange={(event) => {
                                    setUserNameError(false);
                                    setUserName(event.target.value);
                                }}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item>
                        <FormControl fullWidth>
                            <InputLabel htmlFor="password">Password</InputLabel>
                            <OutlinedInput
                                error={passwordError}
                                id="password"
                                label="Password"
                                inputMode={"text"}
                                type={"password"}
                                required
                                onChange={(event) => {
                                    setPasswordError(false);
                                    setPassword(event.target.value);
                                }}
                            />
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>
            {addingServer ?
                <CenteredPopover anchorEl={anchorEl}>
                    <CircularProgress style={{margin: "2em"}}/>
                </CenteredPopover>
                : null
            }
            {showConfirmation ?
                <CenteredPopover anchorEl={anchorEl}>
                    <Alert severity="success">
                        <AlertTitle>Success</AlertTitle>
                        <strong>Server Configured</strong>
                    </Alert>
                </CenteredPopover>
                : null
            }
            {showError ?
                <CenteredPopover anchorEl={anchorEl}>
                    <Alert severity="error">
                        <AlertTitle>Failed</AlertTitle>
                        <strong>Invalid Server Configuration or Server not Responding</strong>
                    </Alert>
                </CenteredPopover>
                : null
            }
        </DraggableDialog>
    );
}

export default AddServer;