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
import {ObservableType} from "../../data/Constants";
import {
    CameraRoll,
    CellTower,
    Explore,
    Layers,
    Navigation,
    PictureInPicture,
    Radar,
    ShowChart,
    Videocam
} from "@mui/icons-material";

interface IObservableTypeProp {

    type: ObservableType
    color?: string
}

const ObservableIcon = (props: IObservableTypeProp) => {

    let icon: JSX.Element = null;

    if (props.color) {
        switch (props.type) {
            case ObservableType.PLI:
                icon = <Navigation sx={{color: props.color}}/>
                break;
            case ObservableType.IMAGE:
                icon = <CameraRoll sx={{color: props.color}}/>;
                break;
            case  ObservableType.VIDEO:
                icon = <Videocam sx={{color: props.color}}/>;
                break;
            case ObservableType.DRAPING:
                icon = <Layers sx={{color: props.color}}/>;
                break
            default:
                break;
        }
    } else {
        switch (props.type) {
            case ObservableType.PLI:
                icon = <Navigation color={"primary"}/>
                break;
            case  ObservableType.VIDEO:
                icon = <Videocam color={"primary"}/>;
                break;
            case ObservableType.DRAPING:
                icon = <Layers color={"primary"}/>;
                break
            default:
                break;
        }
    }

    return (
        <div>
            {icon}
        </div>
    );
}

export default ObservableIcon;