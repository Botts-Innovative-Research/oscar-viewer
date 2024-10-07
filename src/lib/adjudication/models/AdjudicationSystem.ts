import { LaneMeta } from "@/lib/data/oscar/LaneCollection"

interface SystemSMLJson {
    type: string
    id: string
    uniqueId: string
    definition: string
    label: string
    description: string
    validTime: string[] // ["start_time", "end_time"]
    position: GeoPosePosition
}

interface GeoPosePosition {
    type: string
    position: GeoPoseCoordinates
}

interface GeoPoseCoordinates {
    lat: number
    lon: number
    h: number
}

let defaultSystem: SystemSMLJson = {
    type: "PhysicalSystem",
    id: "",
    uniqueId: "",
    definition: "http://www.w3.org/ns/sosa/Sensor",
    label: "",
    description: "",
    validTime: [],
    position: undefined
}

function createSystem(laneId: string, laneName: string, position: GeoPoseCoordinates) {
    let system = defaultSystem;
    system.id = getId(laneId);
    system.uniqueId = getUniqueId(laneId);
    system.label = getLabel(laneName);
    system.description = getDescription(laneName);
    const now = new Date().toISOString();
    this.system.validTime = [now, "now"];
    this.system.position = position;
}

function getId(laneId: string) {
    return `ADJUDICATION_${laneId.toUpperCase()}`;
}

function getUniqueId(laneId: string) {
    return `urn:osh:adjudication:${laneId}`;
}

function getLabel(laneName: string) {
    return `Occupancy Adjudication ${laneName}`;
}

function getDescription(laneName: string) {
    return `Adjudication records for occupancies from ${laneName}`;
}

export default class AdjudicationSystem {
    system: SystemSMLJson

    constructor(lane: LaneMeta) {
        const now = new Date().toISOString();
        this.system.validTime = [now, "now"];
        this.system.
    }

    async postDataStream(node: Node, systemId: string): Promise<void> {
        try {
            const endpoint = `${node.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams`

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                "Content-Type": "application/json"
                },
                body: JSON.stringify(this.datastream)
            });
        
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
        
            console.log("Adjudication posted successfully");
            } catch (error) {
            console.error("Failed to post adjudication", error);
        }
    }
}