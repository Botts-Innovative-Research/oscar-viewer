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

import {Dialog, DialogContent, DialogTitle, IconButton, Tooltip} from "@mui/material";
import React from "react";
import DraggablePaperComponent from "./DraggablePaperComponent";
import CloseIcon from "@mui/icons-material/Close";

interface IDraggableDialogProps {

    title: string,
    children?: any,
    actions?: any,
    onClose?: () => void,
    style?: React.CSSProperties,
}

const DraggableDialog = (props: IDraggableDialogProps) => {

    let closeIcon: JSX.Element = null;

    if (props.onClose) {

        closeIcon =
            <IconButton
                aria-label="close"
                onClick={() => {
                    props.onClose()
                }}
                sx={{
                    position: 'absolute',
                    right: 10,
                    top: 10,
                    color: 'rgba(0, 0, 0, 1)',
                }}
            >
                <Tooltip title={"Close"}>
                    <CloseIcon/>
                </Tooltip>
            </IconButton>
    }

    return (
        <Dialog open={true}
                PaperComponent={DraggablePaperComponent}
                hideBackdrop
                disableEnforceFocus
                aria-labelledby="draggable-dialog-title"
                style={{pointerEvents: 'none', ...props.style}}
                PaperProps={{style: {borderStyle:"ridge", pointerEvents: 'auto'}}}>
            <DialogTitle bgcolor={"lightblue"} style={{borderBottomStyle:"ridge", cursor: 'move'}} id="draggable-dialog-title">
                {props.title}
                {closeIcon}
            </DialogTitle>
            <DialogContent style={{padding: '.5em'}}>
                {props.children}
            </DialogContent>
            {props.actions ? props.actions : null}
        </Dialog>
    );
}

export default DraggableDialog;