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
import {Menu} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {selectContextMenuState, updateContextMenuState} from "../../state/Slice";

interface IMenuProps {
    children: any
}

const ContextMenu = (props: IMenuProps) => {

    const dispatch = useAppDispatch();
    let menuState = useAppSelector(selectContextMenuState);

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
            {props.children}
        </Menu>
    );
}

export default ContextMenu;