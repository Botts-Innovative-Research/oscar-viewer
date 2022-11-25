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
import {selectMasterTime, selectPlaybackMode} from "../../state/Slice";
import {useAppSelector} from "../../state/Hooks";

import * as noUiSlider from 'nouislider';
import {PipsMode} from 'nouislider';
import 'nouislider/dist/nouislider.min.css';
// @ts-ignore
import * as wNumb from 'wnumb';
import {IMasterTime, TimePeriod} from "../../data/Models";
import {Box} from "@mui/material";

interface ITimeControllerProps {

    children?: any,
    style?: React.CSSProperties
}

const TimeController = (props: ITimeControllerProps) => {

    let masterTime: IMasterTime = useAppSelector(selectMasterTime);

    let inPlaybackMode: boolean = useAppSelector(selectPlaybackMode);

    useEffect(() => {

        let slider = document.getElementById('TimeController');

        let startTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition);
        let endTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.endPosition);

        noUiSlider.create(slider, {
            start: [startTime, endTime],
            range: {
                min: startTime,
                max: endTime
            },
            format: wNumb({
                decimals: 0
            }),
            behaviour: 'drag',
            connect: true,
            animate: false,
            pips: {
                mode: PipsMode.Positions,
                values: [5, 25, 50, 75],
                density: 1,
                format: wNumb({
                    edit: function (value: string) {
                        return new Date(parseInt(value)).toISOString().replace(".000Z", "Z")
                            .split("T")[1].split("Z")[0].split(".")[0];
                    }
                })
            },
        });

    }, []);

    useEffect(() => {

        document.getElementById('TimeController').setAttribute('disabled', String(inPlaybackMode));

    }, [inPlaybackMode]);

    return (
        <Box>
            <Box id="TimeController" style={{height: '1vh', position: 'relative', ...props.style}}></Box>
            <Box style={{height: '4vh', position: 'relative'}}>

            </Box>
        </Box>
    );
}

export default TimeController;