/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";

export interface ITimeSynchronizerProps {
    startTime: string;
    endTime: string;
    replaySpeed: number;
    intervalRate: number;
    datasources: string[];
    mode: Mode;
}

export class TimeSynchronizerProps implements ITimeSynchronizerProps {
    startTime: string;
    endTime: string;
    replaySpeed: number;
    intervalRate: number;
    datasources: string[];
    mode: Mode;

    constructor(startTime: string, endTime: string, replaySpeed: number, intervalRate: number, datasources: string[], mode: Mode) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.replaySpeed = replaySpeed;
        this.intervalRate = intervalRate;
        this.datasources = datasources;
        this.mode = mode;
    }
}
