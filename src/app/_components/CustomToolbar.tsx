import { Button, CircularProgress, Stack } from "@mui/material";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    GridToolbarProps
} from "@mui/x-data-grid";
import AlarmFilterPopover, { AlarmFilterState } from "@/app/_components/event-table/AlarmFilterPopover";
import { useLanguage } from "@/app/contexts/LanguageContext";

declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        alarmFilter?: AlarmFilterState;
        onAlarmFilterChange?: (next: AlarmFilterState) => void;
        defaultAlarmFilter?: AlarmFilterState;
        onAdjudicateAll?: () => void;
        adjudicateAllBusy?: boolean;
    }
}

type CustomToolbarProps = GridToolbarProps & {
    alarmFilter?: AlarmFilterState;
    onAlarmFilterChange?: (next: AlarmFilterState) => void;
    defaultAlarmFilter?: AlarmFilterState;
    onAdjudicateAll?: () => void;
    adjudicateAllBusy?: boolean;
};

export default function CustomToolbar(props: CustomToolbarProps = {} as CustomToolbarProps) {
    const useCustomFilter = !!(props.alarmFilter && props.onAlarmFilterChange);
    const { t } = useLanguage();

    return (
        <GridToolbarContainer
            sx={{
                display: "flex",
                justifyContent: "space-between",
                paddingInline: "1em"
            }}
        >
            <Stack direction={"row"} alignItems="center">
                <GridToolbarColumnsButton />
                {useCustomFilter ? (
                    <AlarmFilterPopover
                        value={props.alarmFilter!}
                        onChange={props.onAlarmFilterChange!}
                        defaultValue={props.defaultAlarmFilter}
                    />
                ) : (
                    <GridToolbarFilterButton />
                )}
                <GridToolbarDensitySelector />
                {props.onAdjudicateAll && (
                    <Button
                        size="small"
                        startIcon={props.adjudicateAllBusy
                            ? <CircularProgress size={16} color="inherit" />
                            : <GavelRoundedIcon />}
                        onClick={props.onAdjudicateAll}
                        disabled={props.adjudicateAllBusy}
                    >
                        {t('adjudicateAll')}
                    </Button>
                )}
            </Stack>
        </GridToolbarContainer>
    );
}
