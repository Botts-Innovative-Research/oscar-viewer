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
import {useAppDispatch} from "../../state/Hooks";
import {CardContent, CardHeader, Grid, IconButton, Paper, Tooltip} from "@mui/material";
import {ObservableType} from "../../data/Constants";
import ObservableIcon from "./ObservableIcon";

interface IObservablesControlsProps {

}

const ObservableControls = (props: IObservablesControlsProps) => {

    const dispatch = useAppDispatch();

    const toggleDataStreamConnection = (type: ObservableType) => {

    };

    let controls: JSX.Element[] = [];

    for (let value of Object.values(ObservableType)) {

        let type: ObservableType = ObservableType[value];

        controls.push(
            <Grid key={type} item xs={3}>
                <IconButton onClick={() => toggleDataStreamConnection(type)}>
                    <Tooltip title={type.toString()}>
                        <ObservableIcon type={type} color={'#FF0000'}></ObservableIcon>
                    </Tooltip>
                </IconButton>
            </Grid>
        );
    }

    let step: number = controls.length % 2 === 0 ? Math.floor(controls.length / 2) : Math.floor(controls.length / 3);

    return (
        <Paper style={{margin: '.5em', padding: '.5em'}}>
            <CardHeader subheader={"Connect/Disconnect Streams by Type"}/>
            <CardContent>
                {controls.length % 2 === 0 ?
                    <Grid container justifyContent={"space-evenly"} direction={"row"}>
                        <Grid>
                            {controls.slice(0, step)}
                        </Grid>
                        <Grid>
                            {controls.slice(step + 1, controls.length)}
                        </Grid>
                    </Grid>
                    :
                    <Grid container justifyContent={"space-evenly"} direction={"row"}>
                        <Grid>
                            {controls.slice(0, step)}
                        </Grid>
                        <Grid>
                            {controls.slice(step, 2 * step)}
                        </Grid>
                        <Grid>
                            {controls.slice(2 * step, controls.length)}
                        </Grid>
                    </Grid>
                }
            </CardContent>
        </Paper>
    );
}

export default ObservableControls;