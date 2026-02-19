import {randomUUID} from "osh-js/source/core/utils/Utils";
import {INode, Node} from "@/lib/data/osh/Node";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

export interface IWebId {
    time: string,
    id: string;
    name: string,
    type: string,
    confidence: number,
    confidenceStr: string,
    countRate: number,
    occupancyObsId: string,
}

// TODO: probably should move to this format eventually if we want to display all the information from the webId analyis
export interface IWebIdAnalysis {
    time: string,
    id: string;
    occupancyObsId: string,
    analysisWarnings: string[],
    chiSquare: number,
    detectorResponseFunction: string,
    errorMessage: string,
    estimatedDose: number,
    isotopeString: string,
    isotopes: IWebIdIsotope[],
    numAnalysisWarnings: number,
    numIsotopes: number,
}
export interface IWebIdIsotope {
    name: string,
    type: string,
    confidence: number,
    confidenceStr: string,
    countRate: number,
}

export default class WebIdAnalysisResult implements IWebIdAnalysis {
    time: string;
    id: string;
    occupancyObsId: string;
    analysisWarnings: string[];
    chiSquare: number;
    detectorResponseFunction: string;
    errorMessage: string;
    estimatedDose: number;
    isotopeString: string;
    isotopes: IWebIdIsotope[];
    numAnalysisWarnings: number;
    numIsotopes: number;
    constructor(
        time: string,
        observation: any
        // occupancyObsId: string,
        // analysisWarnings: string[],
        // chiSquare: number,
        // detectorResponseFunction: string,
        // errorMessage: string,
        // estimatedDose: number,
        // isotopeString: string,
        // isotopes: IWebIdIsotope,
        // numAnalysisWarning: number,
        // numIsotopes: number,
        ) {
        console.log('observation', observation)
        this.time = time;
        this.id = randomUUID();
        this.occupancyObsId = observation?.occupancyObsId;
        this.analysisWarnings = observation?.analysisWarnings;
        this.chiSquare = observation?.chiSquare;
        this.errorMessage = observation?.errorMessage;
        this.detectorResponseFunction = observation?.detectorResponseFunction;
        this.estimatedDose = observation?.estimatedDose;
        this.isotopeString = observation?.isotopeString;
        this.numIsotopes = observation?.numIsotopes;
        this.numAnalysisWarnings = observation?.numAnalysisWarnings;

        this.isotopes = observation?.isotopes?.map((iso: any) => ({
            name: iso?.name,
            type: iso?.type,
            confidence: iso?.confidence,
            confidenceStr: iso?.confidenceString,
            countRate: iso?.countRate,
        })) || [];

    }
}

// export default class WebIdIsotopeData implements IWebId {
//     time: string;
//     id: string;
//     name: string;
//     type: string;
//     confidence: number;
//     confidenceStr: string;
//     countRate: number;
//     occupancyObsId: string // observation ID
//
//     constructor(time: string, name: string, type: string, confidence: number, confidenceStr: string, countRate: number, occObsId: string) {
//         this.time = time;
//         this.id = randomUUID();
//         this.name = name;
//         this.type = type;
//         this.confidence = confidence;
//         this.confidenceStr = confidenceStr;
//         this.countRate = countRate;
//         this.occupancyObsId = occObsId // observation ID
//     }
//
//
//     setName(name: string) {
//         this.name = name;
//     }
//
//     setTime(isoTime: string) {
//         this.time = isoTime;
//     }
//
//     setType(type: string) {
//         this.type = type;
//     }
//
//     setConfidence(confidence: number) {
//         this.confidence = confidence;
//     }
//
//     setConfidenceStr(confidenceStr: string) {
//         this.confidenceStr = confidenceStr;
//     }
//
//     setCountRate(count: number) {
//         this.countRate = count;
//     }
// }
