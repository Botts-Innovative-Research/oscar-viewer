"use client";

import {FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent} from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {OperationalViewCatalog} from "@/lib/data/oscar/OperationalView";
import {ReportScope} from "@/lib/data/oscar/ReportScope";

export function ReportScopeSelect(props: {
    scope: ReportScope;
    onSelect: (scope: ReportScope) => void;
}) {
    const {t} = useLanguage();

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="report-scope-label">{t("reportScope")}</InputLabel>
            <Select
                labelId="report-scope-label"
                label={t("reportScope")}
                value={props.scope}
                onChange={(event: SelectChangeEvent) => props.onSelect(event.target.value as ReportScope)}
            >
                <MenuItem value="NODE">{t("reportScopeNode")}</MenuItem>
                <MenuItem value="OPERATIONAL_VIEW">{t("reportScopeOperationalView")}</MenuItem>
                <MenuItem value="LANES">{t("reportScopeLanes")}</MenuItem>
            </Select>
        </FormControl>
    );
}

export function OperationalViewSelect(props: {
    catalog: OperationalViewCatalog;
    value: string;
    loading: boolean;
    onSelect: (key: string) => void;
}) {
    const {t} = useLanguage();
    const entries = [...props.catalog.views.entries()];

    return (
        <FormControl size="small" fullWidth disabled={props.loading || entries.length === 0}>
            <InputLabel id="operational-view-selector-label">{t("operationalViewSelector")}</InputLabel>
            <Select
                labelId="operational-view-selector-label"
                label={t("operationalViewSelector")}
                value={props.value}
                onChange={(event: SelectChangeEvent) => props.onSelect(event.target.value)}
            >
                {entries.map(([key, lanes]) => (
                    <MenuItem key={key} value={key}>
                        <ListItemText
                            primary={key}
                            secondary={t("operationalViewLaneCount", {count: lanes.length})}
                        />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
