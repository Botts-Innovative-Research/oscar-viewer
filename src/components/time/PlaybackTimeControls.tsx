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

import {Chip, IconButton, Table, TableBody, TableCell, TableRow, Tooltip} from "@mui/material";
import {
    AddCircleOutline,
    FastForward,
    FastRewind,
    Pause,
    PlayArrow,
    RemoveCircleOutline,
    Schedule
} from "@mui/icons-material";
import React from "react";
import {PlaybackState} from "../../data/Constants";
import {selectMasterTime, selectPlaybackSpeed, selectPlaybackState} from "../../state/Slice";
import {IMasterTime, TimePeriod} from "../../data/Models";
import {useAppSelector} from "../../state/Hooks";

interface IPlaybackTimeControlsProps {

    startTime: number,
    currentTime: number,
    switchToRealtime: () => void,
    updatePlaybackStartTime: (values: string[]) => void,
    slowDown: () => void,
    speedUp: () => void,
    pause: () => void,
    start: () => void,
    skip: (seconds: number) => void
}

const PlaybackTimeControls = (props: IPlaybackTimeControlsProps) => {

    let masterTime: IMasterTime = useAppSelector(selectMasterTime);
    let playbackSpeed: number = useAppSelector(selectPlaybackSpeed);
    let playbackState: PlaybackState = useAppSelector(selectPlaybackState);

    return (
        <Table style={{alignContent: "center", margin: "0em 1em 0em 1em"}}>
            <TableBody>
                <TableRow>
                    <TableCell>
                        <Tooltip title={"Live"} placement={"top"}>
                            <IconButton disabled={playbackState == PlaybackState.PLAY} color={"primary"} onClick={props.switchToRealtime}>
                                <Schedule/>
                            </IconButton>
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                        <Tooltip title={"Slow Down"} placement={"top"}>
                            <IconButton disabled={playbackState == PlaybackState.PLAY} color={"primary"} onClick={props.slowDown}>
                                <RemoveCircleOutline/>
                            </IconButton>
                        </Tooltip>
                        <Chip style={{width: '5em'}} label={playbackSpeed + "x"}/>
                        <Tooltip title={"Speed Up"} placement={"top"}>
                            <IconButton disabled={playbackState == PlaybackState.PLAY} color={"primary"} onClick={props.speedUp}>
                                <AddCircleOutline/>
                            </IconButton>
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                        <Tooltip title={"Rewind 10s"} placement={"top"}>
                            <IconButton disabled={playbackState == PlaybackState.PLAY}color={"primary"} onClick={() => {
                                props.skip(-10);
                            }}>
                                <FastRewind/>
                            </IconButton>
                        </Tooltip>
                        {playbackState === PlaybackState.PAUSE ?
                            <Tooltip title={"Play"} placement={"top"}>
                                <IconButton color={"primary"} onClick={props.start}>
                                    <PlayArrow/>
                                </IconButton>
                            </Tooltip>
                            :
                            <Tooltip title={"Pause"} placement={"top"}>
                                <IconButton color={"primary"} onClick={props.pause}>
                                    <Pause/>
                                </IconButton>
                            </Tooltip>
                        }
                        <Tooltip title={"Forward 10s"} placement={"top"}>
                            <IconButton disabled={playbackState == PlaybackState.PLAY} color={"primary"} onClick={() => {
                                props.skip(10);
                            }}>
                                <FastForward/>
                            </IconButton>
                        </Tooltip>
                    </TableCell>
                    <TableCell>
                        Start Time:
                    </TableCell>
                    <TableCell>
                        {!props.startTime ? masterTime.masterTimePeriod.beginPosition : TimePeriod.getFormattedTime(props.startTime)}
                    </TableCell>
                    <TableCell>
                        Current Time:
                    </TableCell>
                    <TableCell>
                        {props.currentTime === 0 ? masterTime.masterTimePeriod.beginPosition : TimePeriod.getFormattedTime(props.currentTime)}
                    </TableCell>
                    <TableCell>
                        End Time:
                    </TableCell>
                    <TableCell>
                        {masterTime.masterTimePeriod.endPosition}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}

export default PlaybackTimeControls;