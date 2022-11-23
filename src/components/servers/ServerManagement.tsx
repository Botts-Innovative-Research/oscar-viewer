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
    Button,
    DialogActions, Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip
} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {
    removeObservable,
    removePhysicalSystem,
    removeSensorHubServer,
    selectServers,
    setAddServerDialogOpen,
    setServerManagementDialogOpen
} from "../../state/Slice";
import {AddCircle} from "@mui/icons-material";
import ServerEntry from "./ServerEntry";
import DraggableDialog from "../decorators/DraggableDialog";
import {deleteSensorHubServer} from "../../database/database";
import {ISensorHubServer} from "../../data/Models";
import ConfirmationDialog from "../decorators/ConfirmationDialog";

interface INodeManagementProps {
    title: string,
    children?: any
}

const ServerManagement = (props: INodeManagementProps) => {

    const dispatch = useAppDispatch();

    let servers = useAppSelector(selectServers);

    const [confirmationDialog, setConfirmationDialog] = useState<JSX.Element>(null)

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const addServer = () => {

        dispatch(setAddServerDialogOpen(true));
    }

    const confirmRemoveServer = (server: ISensorHubServer) => {

        setConfirmationDialog(
            <ConfirmationDialog title={"Delete Server?"}
                                confirm={() => {
                                    removeServer(server);
                                    setConfirmationDialog(null);
                                }}
                                cancel={() => {
                                    setConfirmationDialog(null);
                                }}>
                <Paper style={{margin: '.5em', padding: '.5em'}}>
                    {server.name} located at {server.address}
                </Paper>
            </ConfirmationDialog>
        );
    }
    const removeServer = (server: ISensorHubServer) => {
        for (let system of server.systems) {

            for (let observable of system.observables) {
                dispatch(removeObservable(observable));
            }

            dispatch(removePhysicalSystem(system))
        }
        deleteSensorHubServer(server.uniqueId).then();
        dispatch(removeSensorHubServer(server));
    }

    let content: JSX.Element = (
        <Alert severity="warning" variant={"filled"}>
            No Servers Configured
        </Alert>
    );

    let serverEntries: JSX.Element[] = servers.map(server => {

        return <ServerEntry key={server.uniqueId} server={server} deleteAction={confirmRemoveServer}/>
    });

    if (serverEntries.length) {

        content = (
            <Paper style={{margin: '.5em', padding: '.5em'}}>
                <TableContainer>
                    <Table size="small" aria-label="Server Entries">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Address</TableCell>
                                <TableCell align="center" colSpan={2}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {serverEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Divider/>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 15]}
                    component="div"
                    count={serverEntries.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        );
    }

    return (
        <div>
            <DraggableDialog title={props.title}
                             onClose={() => dispatch(setServerManagementDialogOpen(false))}
                             actions={
                                 <DialogActions>
                                     <Tooltip title={"Add Server"}>
                                         <Button variant={"contained"} startIcon={<AddCircle/>} onClick={addServer}>
                                             Add Server
                                         </Button>
                                     </Tooltip>
                                 </DialogActions>
                             }
            >
                {content}
            </DraggableDialog>
            {confirmationDialog}
        </div>
    );
}

export default ServerManagement;