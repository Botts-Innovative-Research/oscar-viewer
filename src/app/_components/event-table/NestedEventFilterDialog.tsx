"use client";

import React, {useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import {
    cloneEventFilter,
    countEventFilterRules,
    createEventFilterGroup,
    createEventFilterRule,
    EventFilterField,
    EventFilterGroup,
    EventFilterNode,
    EventFilterOperator,
    EventFilterRule,
    eventFilterFieldType,
    operatorsForEventFilterField,
} from "@/lib/data/oscar/EventFilter";

const MAX_DEPTH = 3;
const MAX_RULES = 20;

const countAllRules = (node: EventFilterNode): number =>
    node.kind === "rule" ? 1 : node.children.reduce((total, child) => total + countAllRules(child), 0);

interface Props {
    open: boolean;
    filter: EventFilterGroup;
    nodeOptions: string[];
    laneOptions: string[];
    t: (key: string, values?: Record<string, unknown>) => string;
    onClose: () => void;
    onApply: (filter: EventFilterGroup) => void;
}

const fieldKeys: Record<EventFilterField, string> = {
    node: "filterField.node",
    laneId: "laneId",
    occupancyCount: "occupancyId",
    startTime: "startTime",
    endTime: "endTime",
    maxGamma: "maxGamma",
    maxNeutron: "maxNeutron",
    status: "status",
    adjudicatedIds: "adjudicated",
};

const operatorKeys: Record<EventFilterOperator, string> = {
    equals: "filterOperator.equals",
    notEquals: "filterOperator.notEquals",
    contains: "filterOperator.contains",
    startsWith: "filterOperator.startsWith",
    greaterThan: "filterOperator.greaterThan",
    greaterThanOrEqual: "filterOperator.greaterThanOrEqual",
    lessThan: "filterOperator.lessThan",
    lessThanOrEqual: "filterOperator.lessThanOrEqual",
    between: "filterOperator.between",
    isAnyOf: "filterOperator.isAnyOf",
    isEmpty: "filterOperator.isEmpty",
    isNotEmpty: "filterOperator.isNotEmpty",
};

function replaceNode(root: EventFilterGroup, id: string, replacement: EventFilterNode): EventFilterGroup {
    const visit = (node: EventFilterNode): EventFilterNode => {
        if (node.id === id) return replacement;
        if (node.kind === "rule") return node;
        return {...node, children: node.children.map(visit)};
    };
    return visit(root) as EventFilterGroup;
}

function removeNode(root: EventFilterGroup, id: string): EventFilterGroup {
    const visit = (group: EventFilterGroup): EventFilterGroup => ({
        ...group,
        children: group.children
            .filter(child => child.id !== id)
            .map(child => child.kind === "group" ? visit(child) : child),
    });
    return visit(root);
}

function appendChild(root: EventFilterGroup, parentId: string, child: EventFilterNode): EventFilterGroup {
    const visit = (group: EventFilterGroup): EventFilterGroup => {
        if (group.id === parentId) return {...group, children: [...group.children, child]};
        return {...group, children: group.children.map(item => item.kind === "group" ? visit(item) : item)};
    };
    return visit(root);
}

export default function NestedEventFilterDialog({open, filter, nodeOptions, laneOptions, t, onClose, onApply}: Props) {
    const [draft, setDraft] = useState<EventFilterGroup>(() => cloneEventFilter(filter));

    useEffect(() => {
        if (open) setDraft(cloneEventFilter(filter));
    }, [open, filter]);

    const activeRuleCount = useMemo(() => countEventFilterRules(draft), [draft]);
    const totalRuleCount = useMemo(() => countAllRules(draft), [draft]);
    const canAdd = totalRuleCount < MAX_RULES;

    const updateRule = (rule: EventFilterRule, changes: Partial<EventFilterRule>) => {
        setDraft(previous => replaceNode(previous, rule.id, {...rule, ...changes}) as EventFilterGroup);
    };

    const renderValue = (rule: EventFilterRule) => {
        if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty") return null;
        const type = eventFilterFieldType(rule.field);
        const isMultiple = rule.operator === "isAnyOf";
        let options: Array<{value: string; label: string}> = [];
        if (rule.field === "node") options = nodeOptions.map(value => ({value, label: value}));
        if (rule.field === "laneId") options = laneOptions.map(value => ({value, label: value}));
        if (rule.field === "status") options = [
            {value: "None", label: t("none")},
            {value: "Gamma", label: t("gamma")},
            {value: "Neutron", label: t("neutron")},
            {value: "Gamma & Neutron", label: t("gammaAndNeutron")},
        ];
        if (rule.field === "adjudicatedIds") options = [
            {value: "Yes", label: t("yes")},
            {value: "No", label: t("no")},
        ];

        if (options.length > 0 && ["equals", "notEquals", "isAnyOf"].includes(rule.operator)) {
            const value = isMultiple ? (Array.isArray(rule.value) ? rule.value : [String(rule.value)].filter(Boolean)) : String(Array.isArray(rule.value) ? rule.value[0] ?? "" : rule.value);
            return (
                <FormControl size="small" sx={{minWidth: 180, flex: 1}}>
                    <InputLabel>{t("filterValue")}</InputLabel>
                    <Select
                        multiple={isMultiple}
                        label={t("filterValue")}
                        value={value}
                        onChange={event => updateRule(rule, {value: event.target.value as string | string[]})}
                    >
                        {options.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </Select>
                </FormControl>
            );
        }

        const inputType = type === "number" ? "number" : type === "date" ? "datetime-local" : "text";
        return (
            <>
                <TextField
                    size="small"
                    type={inputType}
                    label={rule.operator === "between" ? t("filterFrom") : t("filterValue")}
                    value={Array.isArray(rule.value) ? rule.value[0] ?? "" : rule.value}
                    onChange={event => updateRule(rule, {value: event.target.value})}
                    InputLabelProps={type === "date" ? {shrink: true} : undefined}
                    sx={{minWidth: 170, flex: 1}}
                />
                {rule.operator === "between" && (
                    <TextField
                        size="small"
                        type={inputType}
                        label={t("filterTo")}
                        value={rule.value2 ?? ""}
                        onChange={event => updateRule(rule, {value2: event.target.value})}
                        InputLabelProps={type === "date" ? {shrink: true} : undefined}
                        sx={{minWidth: 170, flex: 1}}
                    />
                )}
            </>
        );
    };

    const renderNode = (node: EventFilterNode, depth: number, isRoot = false): React.ReactNode => {
        if (node.kind === "rule") {
            return (
                <Stack key={node.id} direction={{xs: "column", md: "row"}} spacing={1} alignItems={{md: "center"}}>
                    <FormControl size="small" sx={{minWidth: 170}}>
                        <InputLabel>{t("filterField")}</InputLabel>
                        <Select
                            label={t("filterField")}
                            value={node.field}
                            onChange={event => {
                                const field = event.target.value as EventFilterField;
                                const operator = operatorsForEventFilterField(field)[0];
                                updateRule(node, {field, operator, value: operator === "isAnyOf" ? [] : "", value2: ""});
                            }}
                        >
                            {(Object.keys(fieldKeys) as EventFilterField[]).map(field =>
                                <MenuItem key={field} value={field}>{t(fieldKeys[field])}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{minWidth: 190}}>
                        <InputLabel>{t("filterOperator")}</InputLabel>
                        <Select
                            label={t("filterOperator")}
                            value={node.operator}
                            onChange={event => {
                                const operator = event.target.value as EventFilterOperator;
                                updateRule(node, {operator, value: operator === "isAnyOf" ? [] : "", value2: ""});
                            }}
                        >
                            {operatorsForEventFilterField(node.field).map(operator =>
                                <MenuItem key={operator} value={operator}>{t(operatorKeys[operator])}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {renderValue(node)}
                    <IconButton aria-label={t("removeFilter")} onClick={() => setDraft(previous => removeNode(previous, node.id))}>
                        <DeleteOutlineIcon />
                    </IconButton>
                </Stack>
            );
        }

        return (
            <Box key={node.id} sx={{border: 1, borderColor: "divider", borderRadius: 1, p: 1.5, ml: depth ? 2 : 0}}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <AccountTreeOutlinedIcon color="action" />
                    <Typography variant="subtitle2">{t("filterMatch")}</Typography>
                    <Select
                        size="small"
                        value={node.logic}
                        onChange={event => setDraft(previous => replaceNode(previous, node.id, {...node, logic: event.target.value as "and" | "or"}) as EventFilterGroup)}
                    >
                        <MenuItem value="and">{t("filterAllConditions")}</MenuItem>
                        <MenuItem value="or">{t("filterAnyCondition")}</MenuItem>
                    </Select>
                    <Box flex={1} />
                    {!isRoot && (
                        <IconButton aria-label={t("removeFilterGroup")} onClick={() => setDraft(previous => removeNode(previous, node.id))}>
                            <DeleteOutlineIcon />
                        </IconButton>
                    )}
                </Stack>
                <Stack spacing={1.25}>
                    {node.children.map(child => renderNode(child, depth + 1))}
                    {node.children.length === 0 && <Typography color="text.secondary">{t("filterNoConditions")}</Typography>}
                </Stack>
                <Stack direction="row" spacing={1} mt={1.5}>
                    <Button size="small" startIcon={<AddIcon />} disabled={!canAdd} onClick={() => setDraft(previous => appendChild(previous, node.id, createEventFilterRule()))}>
                        {t("filterAddCondition")}
                    </Button>
                    <Button size="small" startIcon={<AccountTreeOutlinedIcon />} disabled={!canAdd || depth >= MAX_DEPTH - 1} onClick={() => setDraft(previous => appendChild(previous, node.id, createEventFilterGroup()))}>
                        {t("filterAddGroup")}
                    </Button>
                </Stack>
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>{t("advancedFilters")}</DialogTitle>
            <DialogContent dividers>
                {renderNode(draft, 0, true)}
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {t("filterRuleLimit", {count: activeRuleCount, max: MAX_RULES})}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDraft(createEventFilterGroup())}>{t("clearAll")}</Button>
                <Button onClick={onClose}>{t("cancel")}</Button>
                <Button variant="contained" onClick={() => onApply(cloneEventFilter(draft))}>{t("applyFilters")}</Button>
            </DialogActions>
        </Dialog>
    );
}
