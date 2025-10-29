/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {
    Box,
    Button,
    Paper,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {Comment} from "../../../../types/new-types";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import React, {ChangeEvent, useContext, useRef, useState} from "react";
import IsotopeSelect from "./IsotopeSelect";
import AdjudicationLog from "./AdjudicationLog"
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import SecondaryInspectionSelect from "@/app/_components/adjudication/SecondaryInspectionSelect";
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import IconButton from "@mui/material/IconButton";
import {generateAdjudicationCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import AdjudicationReportForm from "@/app/_components/adjudication/AdjudicationReportForm";

export default function AdjudicationDetail(props: { event: EventTableData }) {

    const [shouldFetchLogs, setShouldFetchLogs] = useState<boolean>(false);

    function onFetchComplete() {
        setShouldFetchLogs(false);
    }

    return (
        <Stack direction={"column"} p={2} spacing={2}>
            <Typography
                variant="h4"
            >
                Adjudication
            </Typography>

            <AdjudicationLog
                event={props.event}
                shouldFetch={shouldFetchLogs}
                onFetch={onFetchComplete}
            />

            <AdjudicationReportForm
                event={props.event}
            />
        </Stack>
    );
}