// import { Node } from "@/lib/data/osh/Node"
//
// interface ObservationSMLJson {
//     phenomenonTime: string
//     resultTime: string
//     result: AdjudicationResult
// }
//
// interface AdjudicationResult {
//     username: string
//     feedback: string
//     adjudicationCode: string
//     isotopes: string
//     secondaryInspectionStatus: string
//     filePaths: string
//     occupancyId: string
//     alarmingSystemUid: string
// }
//
// export default class AdjudicationObservation {
//     observation: ObservationSMLJson
//
//     constructor(properties: AdjudicationResult) {
//         const now = new Date().toISOString();
//         this.observation = {
//             phenomenonTime: now,
//             resultTime: now,
//             result: properties
//         };
//     }
//
//     async postObservation(node: Node, datastreamId: string): Promise<void> {
//         try {
//             const endpoint = `${node.getConnectedSystemsEndpoint()}/datastreams/${datastreamId}/observations`
//
//             const response = await fetch(endpoint, {
//                 method: "POST",
//                 headers: {
//                 "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify(this.observation)
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
