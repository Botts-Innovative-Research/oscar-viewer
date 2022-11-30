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

import React, {useEffect, useState} from "react";
import {
    pausePlayback,
    selectDataSynchronizer,
    selectMasterTime,
    selectPlaybackMode,
    selectPlaybackSpeed,
    setPlaybackMode,
    startPlayback,
    updatePlaybackSpeed,
    updatePlaybackStartTime,
} from "../../state/Slice";
import {useAppDispatch, useAppSelector} from "../../state/Hooks";
import * as noUiSlider from 'nouislider';
import {API, PipsMode} from 'nouislider';
import 'nouislider/dist/nouislider.min.css';
import {IMasterTime, TimePeriod} from "../../data/Models";
import {Box} from "@mui/material";
import PlaybackTimeControls from "./PlaybackTimeControls";
import RealTimeControls from "./RealTimeControls";
// @ts-ignore
import * as wNumb from 'wnumb';
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer"
// @ts-ignore
import {EventType} from "osh-js/source/core/event/EventType";

interface ITimeControllerProps {

    children?: any,
    style?: React.CSSProperties
}

let sliderApi: API;

const TimeController = (props: ITimeControllerProps) => {

    let dispatch = useAppDispatch();

    let masterTime: IMasterTime = useAppSelector(selectMasterTime);
    let inPlaybackMode: boolean = useAppSelector(selectPlaybackMode);
    let playbackSpeed: number = useAppSelector(selectPlaybackSpeed);
    let dataSynchronizer: DataSynchronizer = useAppSelector(selectDataSynchronizer);

    let [currentTime, setCurrentTime] = useState<number>(0)

    useEffect(() => {

        let sliderContainer = document.getElementById('TimeController');

        let startTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition);

        if (masterTime.masterTimePeriod.isIndeterminateStart) {

            startTime = TimePeriod.getEpochTime(new Date().toISOString());
        }

        let endTime: number = TimePeriod.getEpochTime(masterTime.masterTimePeriod.endPosition);

        if (masterTime.masterTimePeriod.isIndeterminateStart) {

            endTime = startTime + 24 * 60 * 60 * 1000;
        }

        sliderApi = noUiSlider.create(sliderContainer, {
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
                // values: [10, 25, 50, 75, 90],
                values: [20, 50, 80],
                density: 1,
                format: wNumb({
                    edit: function (value: string) {
                        return new Date(parseInt(value)).toISOString().replace(".000Z", "Z")
                            .replace("T", " T ")
                    }
                })
            },
        });

        sliderApi.on('update', updateCurrentTime);

    }, []);

    useEffect(() => {

        if (!inPlaybackMode) {

            document.getElementById('TimeController').setAttribute('disabled', 'true');

        } else {

            if (sliderApi) {

                sliderApi.updateOptions(
                    {
                        start: TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition),
                        range: {
                            min: TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition),
                            max: TimePeriod.getEpochTime(masterTime.masterTimePeriod.endPosition)
                        }
                    },
                    false // Boolean 'fireSetEvent'
                );
            }

            setCurrentTime(TimePeriod.getEpochTime(masterTime.masterTimePeriod.beginPosition));
            document.getElementById('TimeController').removeAttribute('disabled');
        }

    }, [inPlaybackMode]);

    useEffect(() => {

        dataSynchronizer.subscribe((message: { type: any; timestamp: any; }) => {

            if (message.type === EventType.LAST_TIME) {

                if (sliderApi) {

                    sliderApi.updateOptions(
                        {
                            start: message.timestamp,
                        },
                        false // Boolean 'fireSetEvent'
                    );
                }

                setCurrentTime(message.timestamp);
            }

        }, [EventType.LAST_TIME])

    }, [dataSynchronizer]);

    const updateCurrentTime = (values: string[]) => {

        console.log(TimePeriod.getFormattedTime(Number(values[0])));
        setCurrentTime(Number(values[0]));
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

        // Ensure all data sources are using playback time period
        if (inPlaybackMode) {

            dispatch(updatePlaybackStartTime(TimePeriod.getFormattedTime(currentTime)));
        }

        dispatch(startPlayback());
    }

    const skip = (seconds: number) => {

        dispatch(updatePlaybackStartTime(
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
                    <PlaybackTimeControls currentTime={currentTime}
                                          switchToRealtime={togglePlaybackMode}
                                          start={start}
                                          pause={pause}
                                          skip={skip}
                                          speedUp={speedUp}
                                          slowDown={slowDown}/>
                    : <RealTimeControls switchToPlayback={togglePlaybackMode}/>
                }
            </Box>
        </Box>
    );
}

export default TimeController;