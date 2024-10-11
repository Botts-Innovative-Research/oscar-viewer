/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

export const AdjudicationDatastreamConstant: any = {
    "name": "Occupancy Adjudication",
    "outputName": "Adjudication",
    "schema": {
        "obsFormat": "application/swe+json",
        "recordSchema": {
            "type": "DataRecord",
            "label": "Occupancy Adjudication Record",
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
                    "type": "Text",
                    "name": "username",
                    "definition": "http://sensorml.com/ont/swe/property/Username",
                    "label": "Username"
                },
                {
                    "type": "Text",
                    "name": "feedback",
                    "definition": "http://sensorml.com/ont/swe/property/Feedback",
                    "label": "Feedback"
                },
                {
                    "type": "Category",
                    "name": "adjudicationCode",
                    "definition": "http://sensorml.com/ont/swe/property/AdjudicationCode",
                    "label": "Adjudication Code",
                    "constraint": {
                        "values": [
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
                    "type": "Text",
                    "name": "isotopes",
                    "definition": "http://sensorml.com/ont/swe/property/Istotopes",
                    "label": "Isotopes"
                },
                {
                    "type": "Category",
                    "name": "secondaryInspectionStatus",
                    "definition": "http://sensorml.com/ont/swe/property/SecondaryInspectionStatus",
                    "label": "Secondary Inspection Status",
                    "constraint": {
                        "values": [
                            "NONE",
                            "REQUESTED",
                            "COMPLETE"
                        ]
                    }
                },
                {
                    "type": "Text",
                    "name": "filePaths",
                    "definition": "http://sensorml.com/ont/swe/property/FilePaths",
                    "label": "Supplemental File Paths"
                },
                {
                    "type": "Text",
                    "name": "occupancyId",
                    "definition": "http://sensorml.com/ont/swe/property/OccupancyID",
                    "label": "Occupancy ID"
                },
                {
                    "type": "Text",
                    "name": "alarmingSystemUid",
                    "definition": "http://sensorml.com/ont/swe/property/SystemUID",
                    "label": "UID of Alarming System"
                }
            ]
        }
    }
}

export interface AdjudicationCode {
    code: number;
    label: string;
    group: string;
}

export class AdjudicationCodes {
    static codes: AdjudicationCode[] = [
        {code: 0, label: "", group: ""},
        {code: 1, label: "Code 1: Contraband Found", group: "Real Alarm"},
        {code: 2, label: "Code 2: Other", group: "Real Alarm"},
        {code: 3, label: "Code 3: Medical Isotope Found", group: "Innocent Alarm"},
        {code: 4, label: "Code 4: NORM Found", group: "Innocent Alarm"},
        {code: 5, label: "Code 5: Declared Shipment of Radioactive Material", group: "Innocent Alarm"},
        {code: 6, label: "Code 6: Physical Inspection Negative", group: "False Alarm"},
        {code: 7, label: "Code 7: RIID/ASP Indicates Background Only", group: "False Alarm"},
        {code: 8, label: "Code 8: Other", group: "False Alarm"},
        {code: 9, label: "Code 9: Authorized Test, Maintenance, or Training Activity", group: "Test/Maintenance"},
        {code: 10, label: "Code 10: Unauthorized Activity", group: "Tamper/Fault"},
        {code: 11, label: "Code 11: Other", group: "Other"}
    ]

    constructor() {
    }

    static getGroupCodes(group: string): AdjudicationCode[] {
        return this.codes.filter(code => code.group === group);
    }

    static getCodeObjByIndex(index: number): AdjudicationCode {
        return this.codes.find(code => code.code === index) || this.codes[0];
    }

    static getCodeObjByLabel(label: string): AdjudicationCode {
        return this.codes.find(code => code.label === label) || this.codes[0];
    }
}
