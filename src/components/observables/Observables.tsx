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
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {selectObservables, setObservablesDialogOpen} from "../../state/Slice";
import DraggableDialog from "../decorators/DraggableDialog";
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
import ObservableEntry from "./ObservableEntry";
import {IObservable} from "../../data/Models";

interface IObservablesProps {
    title: string
}

const Observables = (props: IObservablesProps) => {

    const dispatch = useAppDispatch();

    let observables: Map<string, IObservable> = useAppSelector<Map<string, IObservable>>(selectObservables);

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
        <Alert severity="warning">
            No Observables found for System
        </Alert>
    );

    let observableEntries: JSX.Element[] = [];

    observables.forEach((observable: IObservable) => {

        observableEntries.push(<ObservableEntry key={observable.uuid} observable={observable}/>);
    });

    if (observableEntries.length) {

        content = (
            <div>
                <Paper style={{margin: '.5em', padding: '.5em'}}>
                    <TableContainer>
                        <Table size="small" aria-label="Server Entries">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type</TableCell>
                                    {/*<TableCell>Name</TableCell>*/}
                                    <TableCell>System Name</TableCell>
                                    <TableCell>Connect</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {observableEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Divider/>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 15]}
                        component="div"
                        count={observableEntries.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
            </div>
        );
    }

    return (
        <DraggableDialog title={props.title} onClose={() => dispatch(setObservablesDialogOpen(false))}>
            {content}
        </DraggableDialog>
    );
}

export default Observables;