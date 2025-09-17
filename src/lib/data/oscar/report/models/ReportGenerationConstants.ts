/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

export const ReportDatastreamConstant: any =
    {
    "name": "Report Generation",
    "outputName": "Report",
    "schema": {
        "obsFormat": "application/swe+json",
        "recordSchema": {
            "type": "DataRecord",
            "label": "Report Record",
            "fields": [
                {
                    "type": "Time",
                    "label": "Sampling Time",
                    "name": "time",
                    "definition": "http://www.opengis.net/def/property/OGC/0/SamplingTime",
                    "referenceFrame": "http://www.opengis.net/def/trs/BIPM/0/UTC",
                    "uom": {
                        "href": "http://www.opengis.net/d…uom/ISO-8601/0/Gregorian"
                    }
                },
                {
                    "type": "Category",
                    "name": "reportType",
                    "definition": "http://sensorml.com/ont/swe/property/ReportType",
                    "label": "Report Type",
                    "constraint": {
                        "values": [
                            "RDS Site Report",
                            "Event Report",
                            "Lane Report",
                            "Alarm Event Report",
                            "Operations Report"
                        ]
                    }
                },
                {
                    "type": "Category",
                    "name": "timeRange",
                    "definition": "http://sensorml.com/ont/swe/property/TimeRange",
                    "label": "Time Range",
                    "constraint": {
                        "values": [
                            "Day",
                            "Week",
                            "Month",
                            "Custom",
                            ""
                        ]
                    }
                },
                {
                    "type": "Text",
                    "name": "startTime",
                    "definition": "http://sensorml.com/ont/swe/property/StartTime",
                    "label": "Start Time"
                },
                {
                    "type": "Text",
                    "name": "endTime",
                    "definition": "http://sensorml.com/ont/swe/property/EndTime",
                    "label": "End Time"
                },
            ]
        }
    }
}
