import {EventTableData} from "@/lib/data/oscar/TableHelpers";

export type EventFilterLogic = "and" | "or";
export type EventFilterField =
    | "node"
    | "laneId"
    | "occupancyCount"
    | "startTime"
    | "endTime"
    | "maxGamma"
    | "maxNeutron"
    | "status"
    | "adjudicatedIds";
export type EventFilterOperator =
    | "equals"
    | "notEquals"
    | "contains"
    | "startsWith"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual"
    | "between"
    | "isAnyOf"
    | "isEmpty"
    | "isNotEmpty";

export interface EventFilterRule {
    kind: "rule";
    id: string;
    field: EventFilterField;
    operator: EventFilterOperator;
    value: string | string[];
    value2?: string;
}

export interface EventFilterGroup {
    kind: "group";
    id: string;
    logic: EventFilterLogic;
    children: EventFilterNode[];
}

export type EventFilterNode = EventFilterRule | EventFilterGroup;

export interface EventFilterMetadata {
    nodeId: string;
    nodeName: string;
    laneId: string;
}

type CompiledExpression =
    | {kind: "true"}
    | {kind: "false"}
    | {kind: "expression"; value: string};

const TRUE: CompiledExpression = {kind: "true"};
const FALSE: CompiledExpression = {kind: "false"};

export const createEventFilterId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        return crypto.randomUUID();
    return `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createEventFilterRule = (field: EventFilterField = "status"): EventFilterRule => ({
    kind: "rule",
    id: createEventFilterId(),
    field,
    operator: field === "status" || field === "adjudicatedIds"
        ? "isAnyOf"
        : eventFilterFieldType(field) === "number"
            ? "greaterThanOrEqual"
            : "equals",
    value: field === "status" || field === "adjudicatedIds" ? [] : "",
});

export const createEventFilterGroup = (logic: EventFilterLogic = "and"): EventFilterGroup => ({
    kind: "group",
    id: createEventFilterId(),
    logic,
    children: [],
});

export const cloneEventFilter = (filter: EventFilterGroup): EventFilterGroup =>
    JSON.parse(JSON.stringify(filter));

export const countEventFilterRules = (node: EventFilterNode): number => {
    if (node.kind === "rule")
        return isRuleComplete(node) ? 1 : 0;
    return node.children.reduce((count, child) => count + countEventFilterRules(child), 0);
};

export const isRuleComplete = (rule: EventFilterRule): boolean => {
    if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty")
        return true;
    if (Array.isArray(rule.value))
        return rule.value.length > 0;
    if (String(rule.value).trim() === "")
        return false;
    return rule.operator !== "between" || Boolean(rule.value2?.trim());
};

export const eventFilterFieldType = (field: EventFilterField): "metadata" | "string" | "number" | "date" | "enum" => {
    if (field === "node" || field === "laneId") return "metadata";
    if (field === "occupancyCount" || field === "maxGamma" || field === "maxNeutron") return "number";
    if (field === "startTime" || field === "endTime") return "date";
    if (field === "status" || field === "adjudicatedIds") return "enum";
    return "string";
};

export const operatorsForEventFilterField = (field: EventFilterField): EventFilterOperator[] => {
    const type = eventFilterFieldType(field);
    if (type === "metadata") return ["equals", "notEquals", "contains", "startsWith", "isAnyOf"];
    if (type === "number") return ["greaterThanOrEqual", "lessThanOrEqual", "between", "equals"];
    if (type === "date") return ["greaterThan", "lessThan", "between"];
    if (type === "enum") return ["equals", "notEquals", "isAnyOf"];
    return ["equals", "notEquals", "contains", "startsWith", "isEmpty", "isNotEmpty"];
};

const quote = (value: unknown): string => `'${String(value).split("'").join("''")}'`;

const combineExpressions = (logic: EventFilterLogic, expressions: CompiledExpression[]): CompiledExpression => {
    if (expressions.length === 0) return TRUE;
    if (logic === "and") {
        if (expressions.some(expression => expression.kind === "false")) return FALSE;
        const remaining = expressions.filter(expression => expression.kind !== "true") as Array<{kind: "expression"; value: string}>;
        if (remaining.length === 0) return TRUE;
        if (remaining.length === 1) return remaining[0];
        return {kind: "expression", value: remaining.map(expression => `(${expression.value})`).join(" AND ")};
    }

    if (expressions.some(expression => expression.kind === "true")) return TRUE;
    const remaining = expressions.filter(expression => expression.kind !== "false") as Array<{kind: "expression"; value: string}>;
    if (remaining.length === 0) return FALSE;
    if (remaining.length === 1) return remaining[0];
    return {kind: "expression", value: remaining.map(expression => `(${expression.value})`).join(" OR ")};
};

const compareString = (actual: string, operator: EventFilterOperator, rawExpected: string | string[]): boolean => {
    const normalizedActual = actual.toLocaleLowerCase();
    const expectedValues = (Array.isArray(rawExpected) ? rawExpected : [rawExpected])
        .map(value => String(value).toLocaleLowerCase());
    const expected = expectedValues[0] ?? "";
    switch (operator) {
        case "equals": return normalizedActual === expected;
        case "notEquals": return normalizedActual !== expected;
        case "contains": return normalizedActual.includes(expected);
        case "startsWith": return normalizedActual.startsWith(expected);
        case "isAnyOf": return expectedValues.includes(normalizedActual);
        case "isEmpty": return normalizedActual.length === 0;
        case "isNotEmpty": return normalizedActual.length > 0;
        default: return false;
    }
};

const metadataValue = (field: EventFilterField, metadata: EventFilterMetadata): string | null => {
    if (field === "node") return metadata.nodeName || metadata.nodeId;
    if (field === "laneId") return metadata.laneId;
    return null;
};

const statusExpression = (status: string): string => {
    switch (status) {
        case "Gamma": return "gammaAlarm=true AND neutronAlarm=false";
        case "Neutron": return "gammaAlarm=false AND neutronAlarm=true";
        case "Gamma & Neutron": return "gammaAlarm=true AND neutronAlarm=true";
        case "None": return "gammaAlarm=false AND neutronAlarm=false";
        default: return `alarmCategoryCode=${quote(status)}`;
    }
};

const compileRule = (rule: EventFilterRule, metadata: EventFilterMetadata): CompiledExpression => {
    if (!isRuleComplete(rule)) return TRUE;

    const meta = metadataValue(rule.field, metadata);
    if (meta !== null)
        return compareString(meta, rule.operator, rule.value) ? TRUE : FALSE;

    if (rule.field === "status") {
        const values = Array.isArray(rule.value) ? rule.value : [rule.value];
        const expression = values.map(statusExpression).map(value => `(${value})`).join(" OR ");
        if (rule.operator === "notEquals") {
            const excluded = String(values[0]);
            const alternatives = ["None", "Gamma", "Neutron", "Gamma & Neutron"]
                .filter(value => value !== excluded)
                .map(statusExpression)
                .map(value => `(${value})`)
                .join(" OR ");
            return {kind: "expression", value: alternatives};
        }
        return {kind: "expression", value: expression};
    }

    if (rule.field === "adjudicatedIds") {
        const values = Array.isArray(rule.value) ? rule.value : [rule.value];
        const parts = values.map(value => value === "Yes" ? "adjudicatedIdsCount>0" : "adjudicatedIdsCount=0");
        const expression = parts.map(value => `(${value})`).join(" OR ");
        if (rule.operator === "notEquals")
            return {kind: "expression", value: values[0] === "Yes" ? "adjudicatedIdsCount=0" : "adjudicatedIdsCount>0"};
        return {kind: "expression", value: expression};
    }

    const property = rule.field;
    const rawValue = Array.isArray(rule.value) ? rule.value[0] : rule.value;
    const fieldType = eventFilterFieldType(rule.field);
    const normalizeValue = (input: string): string => {
        if (fieldType === "number") return String(Number(input));
        if (fieldType === "date") {
            const timestamp = new Date(input);
            return quote(Number.isNaN(timestamp.getTime()) ? input : timestamp.toISOString());
        }
        return quote(input);
    };
    const value = normalizeValue(String(rawValue));
    const value2 = normalizeValue(String(rule.value2 ?? ""));

    switch (rule.operator) {
        case "equals": return {kind: "expression", value: `${property}=${value}`};
        case "notEquals": return {kind: "expression", value: `${property}!=${value}`};
        case "greaterThan": return {kind: "expression", value: `${property}>${value}`};
        case "greaterThanOrEqual": return {kind: "expression", value: `${property}>=${value}`};
        case "lessThan": return {kind: "expression", value: `${property}<${value}`};
        case "lessThanOrEqual": return {kind: "expression", value: `${property}<=${value}`};
        case "between": return {kind: "expression", value: `${property}>=${value} AND ${property}<=${value2}`};
        case "contains": return {kind: "expression", value: `${property} LIKE ${quote(`%${rawValue}%`)}`};
        case "startsWith": return {kind: "expression", value: `${property} LIKE ${quote(`${rawValue}%`)}`};
        case "isEmpty": return {kind: "expression", value: `(${property}='' OR ${property} IS NULL)`};
        case "isNotEmpty": return {kind: "expression", value: `${property}!=''`};
        case "isAnyOf": {
            const values = (Array.isArray(rule.value) ? rule.value : [rule.value]).map(item => `${property}=${quote(item)}`);
            return {kind: "expression", value: values.map(item => `(${item})`).join(" OR ")};
        }
        default: return TRUE;
    }
};

const compileNode = (node: EventFilterNode, metadata: EventFilterMetadata): CompiledExpression => {
    if (node.kind === "rule") return compileRule(node, metadata);
    return combineExpressions(node.logic, node.children.map(child => compileNode(child, metadata)));
};

/**
 * Compiles a nested filter for a specific lane. Metadata predicates collapse
 * to true/false, leaving only result-component predicates for SensorHub.
 */
export const compileEventFilterForLane = (
    filter: EventFilterGroup,
    metadata: EventFilterMetadata,
): string | null | false => {
    const compiled = compileNode(filter, metadata);
    if (compiled.kind === "false") return false;
    if (compiled.kind === "true") return null;
    return compiled.value;
};

const numericCompare = (actual: number, operator: EventFilterOperator, value: string, value2?: string): boolean => {
    const expected = Number(value);
    const expected2 = Number(value2);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (operator) {
        case "equals": return actual === expected;
        case "notEquals": return actual !== expected;
        case "greaterThan": return actual > expected;
        case "greaterThanOrEqual": return actual >= expected;
        case "lessThan": return actual < expected;
        case "lessThanOrEqual": return actual <= expected;
        case "between": return Number.isFinite(expected2) && actual >= expected && actual <= expected2;
        default: return false;
    }
};

const evaluateRule = (rule: EventFilterRule, event: EventTableData, metadata: EventFilterMetadata): boolean => {
    if (!isRuleComplete(rule)) return true;
    const meta = metadataValue(rule.field, metadata);
    if (meta !== null) return compareString(meta, rule.operator, rule.value);

    if (rule.field === "status") return compareString(event.status ?? "", rule.operator, rule.value);
    if (rule.field === "adjudicatedIds") {
        const label = event.adjudicatedIds?.length > 0 ? "Yes" : "No";
        return compareString(label, rule.operator, rule.value);
    }
    if (rule.field === "startTime" || rule.field === "endTime") {
        const actual = new Date(event[rule.field]).getTime();
        const first = new Date(Array.isArray(rule.value) ? rule.value[0] : rule.value).getTime();
        const second = rule.value2 ? new Date(rule.value2).getTime() : undefined;
        return numericCompare(actual, rule.operator, String(first), second === undefined ? undefined : String(second));
    }
    if (rule.field === "occupancyCount" || rule.field === "maxGamma" || rule.field === "maxNeutron") {
        const rawActual = event[rule.field];
        if (rawActual === null || rawActual === undefined)
            return rule.operator === "notEquals";
        const actual = Number(rawActual);
        return numericCompare(actual, rule.operator, String(Array.isArray(rule.value) ? rule.value[0] : rule.value), rule.value2);
    }
    return true;
};

export const eventMatchesFilter = (
    filter: EventFilterGroup,
    event: EventTableData,
    metadata: EventFilterMetadata,
): boolean => {
    const visit = (node: EventFilterNode): boolean => {
        if (node.kind === "rule") return evaluateRule(node, event, metadata);
        if (node.children.length === 0) return true;
        const values = node.children.map(visit);
        return node.logic === "and" ? values.every(Boolean) : values.some(Boolean);
    };
    return visit(filter);
};

export const combineServerFilters = (...filters: Array<string | null | undefined>): string =>
    filters.filter(Boolean).map(filter => `(${filter})`).join(" AND ");

export const eventSelectionKey = (event: EventTableData): string =>
    `${event.parentNode}\u001f${event.occupancyObsId || `${event.laneId}\u001f${event.startTime}\u001f${event.endTime}`}`;
