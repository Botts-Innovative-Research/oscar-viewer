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
import {Switch, TableCell, TableRow, Tooltip} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {IObservable, IPhysicalSystem} from "../../data/Models";
import ObservableIcon from "./ObservableIcon";
import {
    connectObservable, disconnectObservable,
    hideObservable,
    selectConnectedObservables,
    selectPhysicalSystems,
    showObservable
} from "../../state/Slice";

interface ObservableEntryProps {

    observable: IObservable
}

const ObservableEntry = (props: ObservableEntryProps) => {

    const dispatch = useAppDispatch();

    let physicalSystems = useAppSelector(selectPhysicalSystems)
    let connectedObservables = useAppSelector(selectConnectedObservables);

    let system: IPhysicalSystem = null;

    for (let physicalSystem of physicalSystems) {

        for (let observable of physicalSystem.observables) {

            if (props.observable.uuid === observable.uuid) {

                system = physicalSystem;
            }
        }
    }

    return (
        <TableRow
            key={props.observable.uuid}
            sx={{'&:last-child td, &:last-child th': {border: 0}}}
        >
            <Tooltip title={props.observable.type} placement={"left"}>
                <TableCell>
                    <ObservableIcon type={props.observable.type}/>
                </TableCell>
            </Tooltip>
            {/*<TableCell>*/}
            {/*    {props.observable.name}*/}
            {/*</TableCell>*/}
            <TableCell>
                {system.name}
            </TableCell>
            <TableCell>
                <Switch
                    checked={connectedObservables.get(props.observable.uuid) ? connectedObservables.get(props.observable.uuid) : false}
                    onChange={() => {
                        if (!connectedObservables.get(props.observable.uuid)) {
                            dispatch(showObservable(props.observable));
                            dispatch(connectObservable(props.observable));
                        } else {
                            dispatch(hideObservable(props.observable));
                            dispatch(disconnectObservable(props.observable));
                        }
                    }}/>
            </TableCell>
        </TableRow>
    );
}

export default ObservableEntry;