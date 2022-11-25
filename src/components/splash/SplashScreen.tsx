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
import {Dialog} from "@mui/material";

interface ISplashScreenProps {

    onEnded: () => void;
}

const SplashScreen = (props: ISplashScreenProps) => {

    return (
        <Dialog open={true} fullScreen={true}>
            <video id="SplashScreen"
                   style={{
                       position: "absolute",
                       top: 0,
                       left: 0
                   }}
                   height={'100%'}
                   width={'100%'}
                   autoPlay={true}
                   onEnded={props.onEnded}>
                <source src="../../assets/videos/osh-intro.mp4" type="video/mp4"/>
            </video>
        </Dialog>
    );
}

export default SplashScreen;