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
import {
    Alert,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow
} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {selectPhysicalSystems, setSystemsDialogOpen} from "../../state/Slice";
import DraggableDialog from "../decorators/DraggableDialog";
import SystemEntry from "./SystemEntry";
import {IPhysicalSystem} from "../../data/Models";

interface ISystemsProps {
    title: string,
    children?: any
}

const Systems = (props: ISystemsProps) => {

    const dispatch = useAppDispatch();

    let systems: Map<string, IPhysicalSystem> = useAppSelector<Map<string, IPhysicalSystem>>(selectPhysicalSystems);

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    let content: JSX.Element = (
        <Alert severity="warning" variant={"filled"}>
            No Systems Available, Verify or Configure Server(s)
        </Alert>
    );

    let systemEntries: JSX.Element[] = [];

    systems.forEach((system: IPhysicalSystem) => {

        systemEntries.push(<SystemEntry key={system.uuid} server={system.server} system={system}/>);
    })

    if (systemEntries.length) {

        content = (
            <Paper style={{margin: '.5em', padding: '.5em'}}>
                <TableContainer>
                    <Table size="small" aria-label="Server Entries">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Server Name</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {systemEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Divider/>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 15]}
                    component="div"
                    count={systemEntries.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        );
    }

    return (
        <DraggableDialog title={props.title} onClose={() => dispatch(setSystemsDialogOpen(false))}>
            {content}
        </DraggableDialog>
    );
}

export default Systems;