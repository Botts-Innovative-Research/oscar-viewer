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
import {DeleteOutline, InfoOutlined} from "@mui/icons-material";
import {ISensorHubServer} from "../../data/Models";
import {getCapabilities} from "../../net/CapabilitiesRequest";

interface ServerEntryProps {

    server: ISensorHubServer
    deleteAction: (server: ISensorHubServer) => void
}

const ServerEntry = (props: ServerEntryProps) => {

    return (
        <TableRow
            key={props.server.uniqueId}
            sx={{'&:last-child td, &:last-child th': {border: 0}}}
        >
            <TableCell component="th" scope="row">
                {props.server.name}
            </TableCell>
            <TableCell component="th" scope="row">
                {props.server.address}
            </TableCell>
            <TableCell>
                <Tooltip title={"Server Capabilities"} placement={"left"}>
                    <IconButton color={"info"} onClick={()=> {getCapabilities(props.server)}}>
                        <InfoOutlined/>
                    </IconButton>
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title={"Delete Server"} placement={"right"}>
                    <IconButton color={"error"} onClick={() => {
                        props.deleteAction(props.server)
                    }}>
                        <DeleteOutline/>
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
}

export default ServerEntry;