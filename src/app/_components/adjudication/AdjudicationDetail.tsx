/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {
    Stack,
    Typography
} from "@mui/material";
import React, {useState} from "react";
import AdjudicationLog from "./AdjudicationLog"
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
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