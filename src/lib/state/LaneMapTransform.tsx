
import { createTransform } from 'redux-persist';
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import System from "osh-js/source/core/consysapi/system/System";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {INode} from "@/lib/data/osh/Node";

const laneMapTransform = createTransform(
    (inboundState: Map<string, LaneMapEntry>) => {
        return Array.from(inboundState.entries());
    },
    (outboundState: [string, LaneMapEntry][]) => {
        return new Map(outboundState);
    },
    {
        whitelist: ['laneMap']
    }
);

export default laneMapTransform;
