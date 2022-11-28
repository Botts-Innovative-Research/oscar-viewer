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
import {Card, CardContent, CardHeader, Grid, Switch} from "@mui/material";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import {selectUseBuildingModels, setSettingsDialogOpen, setUseBuildingModels} from "../../state/Slice";
import DraggableDialog from "../decorators/DraggableDialog";

interface ISettingsProps {
    title: string,
    children?: any
}

const Settings = (props: ISettingsProps) => {

    const dispatch = useAppDispatch();

    let showBuildings = useAppSelector(selectUseBuildingModels);

    return (
        <DraggableDialog title={props.title} onClose={() => dispatch(setSettingsDialogOpen(false))}>
            <Card key={"DisplaySettings"} style={{margin: '.5em'}}>
                <CardHeader title={"Display Settings"}/>
                <CardContent>
                    <Grid container direction={"row"} spacing={0} alignItems={"center"}>
                        <Grid item xs={9}>
                            Show Buildings
                        </Grid>
                        <Grid item xs={3}>
                            <Switch
                                checked={showBuildings}
                                onChange={() => {
                                    dispatch(setUseBuildingModels(!showBuildings))
                                }}/>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </DraggableDialog>
    );
}

export default Settings;