"use client";

import React, { useState } from "react";
import {
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    FormGroup,
    Popover,
    Stack,
    Typography
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { useLanguage } from "@/app/contexts/LanguageContext";

export type AlarmType = "None" | "Gamma" | "Neutron" | "Gamma & Neutron";
export type AdjudicationGroup =
    | "Not Adjudicated"
    | "Real Alarm"
    | "Innocent Alarm"
    | "False Alarm"
    | "Test/Maintenance"
    | "Tamper/Fault"
    | "Other";
export type SecondaryStatus = "NONE" | "REQUESTED" | "COMPLETED";

export interface AlarmFilterState {
    alarmTypes: Set<AlarmType>;
    adjudicationGroups: Set<AdjudicationGroup>;
    secondaryStatuses: Set<SecondaryStatus>;
}

export const ALL_ALARM_TYPES: AlarmType[] = ["None", "Gamma", "Neutron", "Gamma & Neutron"];
export const ALL_ADJUDICATION_GROUPS: AdjudicationGroup[] = [
    "Not Adjudicated",
    "Real Alarm",
    "Innocent Alarm",
    "False Alarm",
    "Test/Maintenance",
    "Tamper/Fault",
    "Other"
];
export const ALL_SECONDARY_STATUSES: SecondaryStatus[] = ["NONE", "REQUESTED", "COMPLETED"];

export const DEFAULT_ALARM_FILTER: AlarmFilterState = {
    alarmTypes: new Set<AlarmType>(["Gamma", "Neutron", "Gamma & Neutron"]),
    adjudicationGroups: new Set<AdjudicationGroup>(["Not Adjudicated"]),
    secondaryStatuses: new Set<SecondaryStatus>(["NONE", "REQUESTED", "COMPLETED"])
};

export function cloneAlarmFilter(state: AlarmFilterState): AlarmFilterState {
    return {
        alarmTypes: new Set(state.alarmTypes),
        adjudicationGroups: new Set(state.adjudicationGroups),
        secondaryStatuses: new Set(state.secondaryStatuses)
    };
}

function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
}

function countActiveSections(state: AlarmFilterState, defaults: AlarmFilterState): number {
    let count = 0;
    if (!sameSet(state.alarmTypes, defaults.alarmTypes)) count++;
    if (!sameSet(state.adjudicationGroups, defaults.adjudicationGroups)) count++;
    if (!sameSet(state.secondaryStatuses, defaults.secondaryStatuses)) count++;
    return count;
}

interface SectionProps<T extends string> {
    title: string;
    options: readonly T[];
    selected: Set<T>;
    labelFor: (value: T) => string;
    onToggle: (value: T) => void;
}

function FilterSection<T extends string>({ title, options, selected, labelFor, onToggle }: SectionProps<T>) {
    return (
        <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{title}</Typography>
            <FormGroup>
                {options.map((option) => (
                    <FormControlLabel
                        key={option}
                        control={
                            <Checkbox
                                size="small"
                                checked={selected.has(option)}
                                onChange={() => onToggle(option)}
                            />
                        }
                        label={<Typography variant="body2">{labelFor(option)}</Typography>}
                    />
                ))}
            </FormGroup>
        </Box>
    );
}

export default function AlarmFilterPopover(props: {
    value: AlarmFilterState;
    onChange: (next: AlarmFilterState) => void;
    defaultValue?: AlarmFilterState;
}) {
    const { t } = useLanguage();
    const defaults = props.defaultValue ?? DEFAULT_ALARM_FILTER;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [draft, setDraft] = useState<AlarmFilterState>(cloneAlarmFilter(props.value));

    const open = Boolean(anchorEl);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setDraft(cloneAlarmFilter(props.value));
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const toggle = <T extends string>(key: keyof AlarmFilterState, value: T) => {
        setDraft((prev) => {
            const next = cloneAlarmFilter(prev);
            const set = next[key] as unknown as Set<T>;
            if (set.has(value)) set.delete(value);
            else set.add(value);
            return next;
        });
    };

    const handleApply = () => {
        props.onChange(cloneAlarmFilter(draft));
        handleClose();
    };

    const handleReset = () => {
        const reset = cloneAlarmFilter(defaults);
        setDraft(reset);
        props.onChange(reset);
        handleClose();
    };

    const adjudicationLabels: Record<AdjudicationGroup, string> = {
        "Not Adjudicated": t("notAdjudicated"),
        "Real Alarm": t("realAlarm"),
        "Innocent Alarm": t("innocentAlarm"),
        "False Alarm": t("falseAlarm"),
        "Test/Maintenance": t("testMaintenance"),
        "Tamper/Fault": t("tamperFault"),
        Other: t("other")
    };

    const activeCount = countActiveSections(props.value, defaults);

    return (
        <>
            <Button
                size="small"
                startIcon={
                    <Badge color="primary" badgeContent={activeCount} overlap="circular">
                        <FilterAltIcon fontSize="small" />
                    </Badge>
                }
                onClick={handleOpen}
                sx={{ textTransform: "none" }}
            >
                {t("filters")}
            </Button>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{ paper: { sx: { p: 2, minWidth: 280 } } }}
            >
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                    <FilterSection<AlarmType>
                        title={t("alarmType")}
                        options={ALL_ALARM_TYPES}
                        selected={draft.alarmTypes}
                        labelFor={(v) => v}
                        onToggle={(v) => toggle("alarmTypes", v)}
                    />
                    <FilterSection<AdjudicationGroup>
                        title={t("adjudicationStatus")}
                        options={ALL_ADJUDICATION_GROUPS}
                        selected={draft.adjudicationGroups}
                        labelFor={(v) => adjudicationLabels[v]}
                        onToggle={(v) => toggle("adjudicationGroups", v)}
                    />
                    <FilterSection<SecondaryStatus>
                        title={t("secondaryInspection")}
                        options={ALL_SECONDARY_STATUSES}
                        selected={draft.secondaryStatuses}
                        labelFor={(v) => v}
                        onToggle={(v) => toggle("secondaryStatuses", v)}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={handleReset}>{t("resetToDefault")}</Button>
                        <Button size="small" variant="contained" onClick={handleApply}>{t("apply")}</Button>
                    </Stack>
                </Stack>
            </Popover>
        </>
    );
}
