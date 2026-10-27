"use client";

import {useEffect, useRef, useState} from "react";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {EventType} from "osh-js/source/core/event/EventType";
import {INode} from "@/lib/data/osh/Node";
import {AdjudicationCode} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {commonCustomCodes, findCustomCodesStream, parseCustomCodes} from "@/lib/data/oscar/adjudication/CustomAdjudicationCodes";

export function useCustomAdjudicationCodes(nodes: INode[]) {
    const [result, setResult] = useState({key: "", codes: [] as AdjudicationCode[], failed: false, loading: true, missing: false});
    const [revision, setRevision] = useState(0);
    const currentNodes = useRef(nodes);
    currentNodes.current = nodes;
    const key = JSON.stringify(nodes.map(node => [node.id, node.getConnectedSystemsEndpoint(false)]));

    useEffect(() => {
        let active = true;
        const cleanup: (() => void)[] = [];
        const uniqueNodes = [...new Map(currentNodes.current.map(node => [node.id, node])).values()];
        const choices = new Map<string, AdjudicationCode[]>();
        const settled = new Set<string>();
        const failed = new Set<string>();
        const missing = new Set<string>();
        const publish = () => {
            if (active) setResult({
                key,
                codes: commonCustomCodes(uniqueNodes.map(node => choices.get(node.id) ?? [])),
                loading: settled.size < uniqueNodes.length,
                failed: failed.size > 0,
                missing: missing.size > 0,
            });
        };
        publish();

        const subscribe = async (node: INode) => {
            let receivedLive = false;
            const update = (data: any) => {
                if (!active) return;
                const value = data?.codes;
                if (!Array.isArray(value)) return;
                choices.set(node.id, parseCustomCodes(value));
                settled.add(node.id);
                failed.delete(node.id);
                publish();
            };
            try {
                const stream = await findCustomCodesStream(node);
                if (!active) return;
                if (!stream) {
                    missing.add(node.id);
                    settled.add(node.id);
                    publish();
                    return;
                }
                const source = node.createRealtimeObservationSource(stream);
                source.subscribe((message: any) => {
                    for (const value of message?.values ?? []) {
                        const data = value?.data?.result ?? value?.data;
                        if (Array.isArray(data?.codes)) {
                            receivedLive = true;
                            update(data);
                        }
                    }
                }, [EventType.DATA]);
                const connection = Promise.resolve(source.connect());
                cleanup.push(() => {
                    // reset disconnects this datasource and removes its handler;
                    // terminate would stop a worker shared with other streams.
                    void connection.catch(() => {}).then(() => source.reset())
                        .catch(error => console.error("Unable to close disposition-code subscription", error));
                });
                // Subscribe before reading the snapshot so an update during the
                // request cannot be missed or overwritten by an older result.
                await connection;
                if (!active) return;
                const observations = await stream.searchObservations(new ObservationFilter({resultTime: "latest"}), 1);
                const results = await observations.nextPage();
                if (!active) return;
                if (!receivedLive) update(results[0]?.result);
                settled.add(node.id);
                publish();
            } catch (error) {
                if (!active) return;
                console.error("Unable to subscribe to custom disposition codes", error);
                if (!receivedLive) failed.add(node.id);
                settled.add(node.id);
                publish();
            }
        };
        uniqueNodes.forEach(node => { void subscribe(node); });
        return () => {
            active = false;
            cleanup.forEach(close => close());
        };
    }, [key, revision]);

    return {
        codes: result.key === key ? result.codes : [],
        loading: result.key !== key || result.loading,
        failed: result.key === key && result.failed,
        // Reopening a healthy selector keeps its existing MQTT subscription.
        refresh: () => { if (result.failed || result.missing) setRevision(value => value + 1); },
    };
}
