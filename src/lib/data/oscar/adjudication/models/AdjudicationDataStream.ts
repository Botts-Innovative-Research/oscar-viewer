// import { Node } from "@/lib/data/osh/Node"
//
// interface DataStreamSMLJson {
//     name: string
//     outputName: string
//     validTime: string[] // ["start_time", "end_time"]
//     schema: DataStreamSchema
// }
//
// interface DataStreamSchema {
//     obsFormat: string
//     resultSchema: ResultSchema
// }
//
// interface ResultSchema {
//     type: string
//     fields: DataComponent[]
// }
//
// interface DataComponent {
//     type: string
//     name: string
//     definition: string
//     label: string
//     constraint?: Constraint
// }
//
// interface Constraint {
//     values: any[]
// }
//
// let defaultDataStream: DataStreamSMLJson = {
//     name: "Occupancy Adjudication",
//     outputName: "adjudication",
//     validTime: [],
//     schema: {
//         obsFormat: "application/om+json",
//         resultSchema: {
//             type: "DataRecord",
//             fields: [
//                 {
//                     type: "Text",
//                     name: "username",
//                     definition: "http://sensorml.com/ont/swe/property/Username",
//                     label: "Username"
//                   },
//                   {
//                     type: "Text",
//                     name: "feedback",
//                     definition: "http://sensorml.com/ont/swe/property/Feedback",
//                     label: "Feedback"
//                   },
//                   {
//                     type: "Category",
//                     name: "adjudicationCode",
//                     definition: "http://sensorml.com/ont/swe/property/AdjudicationCode",
//                     label: "Adjudication Code",
//                     constraint: {
//                       values: [
//                         "Code 1: Contraband Found",
//                         "Code 2: Other",
//                         "Code 3: Medical Isotope Found",
//                         "Code 4: NORM Found",
//                         "Code 5: Declared Shipment of Radioactive Material",
//                         "Code 6: Physical Inspection Negative",
//                         "Code 7: RIID/ASP Indicates Background Only",
//                         "Code 8: Other",
//                         "Code 9: Authorized Test, Maintenence, or Training Activity",
//                         "Code 10: Unauthorized Activity",
//                         "Code 11: Other",
//                         ""
//                       ]
//                     }
//                   },
//                   {
//                     type: "Text",
//                     name: "isotopes",
//                     definition: "http://sensorml.com/ont/swe/property/Username",
//                     label: "Isotopes"
//                   },
//                   {
//                     type: "Category",
//                     name: "secondaryInspectionStatus",
//                     definition: "http://sensorml.com/ont/swe/property/SecondaryInspectionStatus",
//                     label: "Secondary Inspection Status",
//                     constraint: {
//                       values: [
//                         "NONE",
//                         "REQUESTED",
//                         "COMPLETE"
//                       ]
//                     }
//                   },
//                   {
//                     type: "Text",
//                     name: "filePaths",
//                     definition: "http://sensorml.com/ont/swe/property/FilePaths",
//                     label: "Supplemental File Paths"
//                   },
//                   {
//                     type: "Text",
//                     name: "occupancyId",
//                     definition: "http://sensorml.com/ont/swe/property/OccupancyID",
//                     label: "Occupancy ID"
//                   },
//                   {
//                     type: "Text",
//                     name: "alarmingSystemUid",
//                     definition: "http://sensorml.com/ont/swe/property/SystemUID",
//                     label: "UID of Alarming System"
//                   }
//             ]
//         }
//     }
// }
//
// export default class AdjudicationDataStream {
//     datastream: DataStreamSMLJson = defaultDataStream;
//
//     constructor() {
//         const now = new Date().toISOString();
//         this.datastream.validTime = [now, "now"];
//     }
//
//     async postDataStream(node: Node, systemId: string): Promise<void> {
//         try {
//             const endpoint = `${node.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams`
//
//             const response = await fetch(endpoint, {
//                 method: "POST",
//                 headers: {
//                 "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify(this.datastream)
//             });
//
//             if (!response.ok) {
//                 throw new Error(`Error: ${response.statusText}`);
//             }
//
//             console.log("Adjudication posted successfully");
//             } catch (error) {
//             console.error("Failed to post adjudication", error);
//         }
//     }
// }
