/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

export const AdjudicationDatastreamConstant: any = {
    name: "Occupancy Adjudication",
    outputName: "adjudication",
    validTime: [],
    schema: {
        obsFormat: "application/om+json",
        resultSchema: {
            type: "DataRecord",
            fields: [
                {
                    type: "Text",
                    name: "username",
                    definition: "http://sensorml.com/ont/swe/property/Username",
                    label: "Username"
                },
                {
                    type: "Text",
                    name: "feedback",
                    definition: "http://sensorml.com/ont/swe/property/Feedback",
                    label: "Feedback"
                },
                {
                    type: "Category",
                    name: "adjudicationCode",
                    definition: "http://sensorml.com/ont/swe/property/AdjudicationCode",
                    label: "Adjudication Code",
                    constraint: {
                        values: [
                            "Code 1: Contraband Found",
                            "Code 2: Other",
                            "Code 3: Medical Isotope Found",
                            "Code 4: NORM Found",
                            "Code 5: Declared Shipment of Radioactive Material",
                            "Code 6: Physical Inspection Negative",
                            "Code 7: RIID/ASP Indicates Background Only",
                            "Code 8: Other",
                            "Code 9: Authorized Test, Maintenence, or Training Activity",
                            "Code 10: Unauthorized Activity",
                            "Code 11: Other",
                            ""
                        ]
                    }
                },
                {
                    type: "Text",
                    name: "isotopes",
                    definition: "http://sensorml.com/ont/swe/property/Username",
                    label: "Isotopes"
                },
                {
                    type: "Category",
                    name: "secondaryInspectionStatus",
                    definition: "http://sensorml.com/ont/swe/property/SecondaryInspectionStatus",
                    label: "Secondary Inspection Status",
                    constraint: {
                        values: [
                            "NONE",
                            "REQUESTED",
                            "COMPLETE"
                        ]
                    }
                },
                {
                    type: "Text",
                    name: "filePaths",
                    definition: "http://sensorml.com/ont/swe/property/FilePaths",
                    label: "Supplemental File Paths"
                },
                {
                    type: "Text",
                    name: "occupancyId",
                    definition: "http://sensorml.com/ont/swe/property/OccupancyID",
                    label: "Occupancy ID"
                },
                {
                    type: "Text",
                    name: "alarmingSystemUid",
                    definition: "http://sensorml.com/ont/swe/property/SystemUID",
                    label: "UID of Alarming System"
                }
            ]
        }
    }
}
