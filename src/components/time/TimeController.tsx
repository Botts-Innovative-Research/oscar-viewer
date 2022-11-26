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
import {
    pausePlayback,
    selectDataSynchronizer,
    selectMasterTime,
    selectPlaybackMode,
    selectPlaybackSpeed,
    setPlaybackMode,
    startPlayback,
    updatePlaybackSpeed,
    updatePlaybackTimePeriod
} from "../../state/Slice";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";

import * as noUiSlider from 'nouislider';
import {PipsMode} from 'nouislider';
import 'nouislider/dist/nouislider.min.css';
// @ts-ignore
import * as wNumb from 'wnumb';
import {IMasterTime, TimePeriod} from "../../data/Models";
import {Box} from "@mui/material";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer"
// @ts-ignore
import {EventType} from "osh-js/source/core/event/EventType";
import PlaybackTimeControls from "./PlaybackTimeControls";
import RealTimeControls from "./RealTimeControls";

interface ITimeControllerProps {

    children?: any,
    style?: React.CSSProperties
}

let sliderContainer: any;

const TimeController = (props: ITimeControllerProps) => {

    let dispatch = useAppDispatch();

    let masterTime: IMasterTime = useAppSelector(selectMasterTime);
    let inPlaybackMode: boolean = useAppSelector(selectPlaybackMode);
    let playbackSpeed: number = useAppSelector(selectPlaybackSpeed);
    let dataSynchronizer: DataSynchronizer = useAppSelector(selectDataSynchronizer);

    useEffect(() => {

        let sliderContainer = document.getElementById('TimeController');

        let startTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition);
        let endTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.endPosition);

        noUiSlider.create(sliderContainer, {
            start: startTime,
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
        }).on('change', updatePlaybackStartTime);

    }, []);

    useEffect(() => {

        if (sliderContainer) {

            sliderContainer.noUiSlider.updateOptions(
                {
                    start: TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition)
                },
                true // Boolean 'fireSetEvent'
            );

            sliderContainer.noUiSlider.set(TimePeriod.getEpochTime(masterTime.playbackTimePeriod.beginPosition))
        }

    }, [masterTime]);

    useEffect(() => {

        if (!inPlaybackMode) {

            document.getElementById('TimeController').setAttribute('disabled', 'true');

        } else {

            document.getElementById('TimeController').removeAttribute('disabled');

            if (masterTime.playbackTimePeriod.isIndeterminateStart) {

                dispatch(updatePlaybackTimePeriod(masterTime.masterTimePeriod.beginPosition));

            } else {

                dispatch(updatePlaybackTimePeriod(masterTime.playbackTimePeriod.beginPosition));

            }
        }

    }, [inPlaybackMode]);

    const updatePlaybackStartTime = (values: string[]) => {

        dispatch(updatePlaybackTimePeriod(TimePeriod.getFormattedTime(Number(values[0]))));
    }

    const slowDown = () => {

        dispatch(updatePlaybackSpeed((playbackSpeed - 0.25) > 0.25 ? (playbackSpeed - 0.25) : 0.25));
    }

    const speedUp = () => {

        dispatch(updatePlaybackSpeed((playbackSpeed + 0.25) < 10 ? (playbackSpeed + 0.25) : 10));
    }

    const togglePlaybackMode = () => {

        dispatch(setPlaybackMode(!inPlaybackMode));
    }

    const pause = () => {

        dispatch(pausePlayback());
    }

    const start = () => {

        // Register a listener with the data synchronizer to get current playback time stamp
        dataSynchronizer.subscribe((message: { type: any; timestamp: any; }) => {

            if (message.type === EventType.TIME) {

                sliderContainer.noUiSlider.set(TimePeriod.getFormattedTime(message.timestamp))
            }

        }, [EventType.TIME]);

        dispatch(startPlayback());
    }

    const skip = (seconds: number) => {

        dispatch(updatePlaybackTimePeriod(
            TimePeriod.offsetTime(masterTime.playbackTimePeriod.beginPosition, seconds * 1000)));
    }

    return (
        <Box>
            <Box id="TimeController"
                 style={{
                     height: '1vh',
                     position: 'relative',
                     background: 'transparent',
                     margin: "0em 1em 0em 1em", ...props.style
                 }}/>
            <Box style={{height: '4vh', position: 'absolute', bottom: '2vh', margin: '.5em'}}>
                {inPlaybackMode ?
                    <PlaybackTimeControls switchToRealtime={togglePlaybackMode}
                                          start={start}
                                          pause={pause}
                                          skip={skip}
                                          speedUp={speedUp}
                                          slowDown={slowDown}
                                          updatePlaybackStartTime={updatePlaybackStartTime}/>
                    : <RealTimeControls switchToPlayback={togglePlaybackMode}/>
                }
            </Box>
        </Box>
    );
}

export default TimeController;