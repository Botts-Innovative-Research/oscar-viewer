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
import {IconButton, TableCell, TableRow, Tooltip} from "@mui/material";
import {useAppDispatch} from "../../state/Hooks";
import {Description} from "@mui/icons-material";
import {IPhysicalSystem, ISensorHubServer} from "../../data/Models";
import {describeSystem} from "../../net/DescribeSystemRequest";

interface SystemEntryProps {

    server: ISensorHubServer,
    system: IPhysicalSystem
}

const SystemEntry = (props: SystemEntryProps) => {

    const dispatch = useAppDispatch();

    return (
        <TableRow
            key={props.system.uuid}
            sx={{'&:last-child td, &:last-child th': {border: 0}}}
        >
            <TableCell component="th" scope="row">
                {props.system.name}
            </TableCell>
            <TableCell component="th" scope="row">
                {props.server.name}
            </TableCell>
            <TableCell>
                <IconButton color={"info"} onClick={() => describeSystem(props.server, props.system)}>
                    <Tooltip title={"Describe System"} placement={"right"}>
                        <Description/>
                    </Tooltip>
                </IconButton>
            </TableCell>
        </TableRow>
    );
}

export default SystemEntry;