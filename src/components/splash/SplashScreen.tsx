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

import React, {useEffect} from "react";
import {Dialog} from "@mui/material";

// @ts-ignore
import Logo from "../../assets/logo/OpenSensorHub-Logo.png"

interface ISplashScreenProps {

    onEnded: () => void;
}

const SplashScreen = (props: ISplashScreenProps) => {

    useEffect(() => {

        setTimeout(() => props.onEnded(), 5000);

    }, []);

    return (
        <Dialog open={true} fullScreen={true}>
            <img src={Logo}
                 style={{
                     display: 'block',
                     marginLeft: 'auto',
                     marginRight: 'auto',
                     marginTop: 'auto',
                     marginBottom: 'auto',
                     width: '50%'
                 }} alt={'OpenSensorHub Logo'}/>
        </Dialog>
    );
}

export default SplashScreen;