import { Stack } from "@mui/material";
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    GridToolbarProps
} from "@mui/x-data-grid";
import AlarmFilterPopover, { AlarmFilterState } from "@/app/_components/event-table/AlarmFilterPopover";

declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        alarmFilter?: AlarmFilterState;
        onAlarmFilterChange?: (next: AlarmFilterState) => void;
        defaultAlarmFilter?: AlarmFilterState;
    }
}

type CustomToolbarProps = GridToolbarProps & {
    alarmFilter?: AlarmFilterState;
    onAlarmFilterChange?: (next: AlarmFilterState) => void;
    defaultAlarmFilter?: AlarmFilterState;
};

export default function CustomToolbar(props: CustomToolbarProps = {} as CustomToolbarProps) {
    const useCustomFilter = !!(props.alarmFilter && props.onAlarmFilterChange);

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
            </Stack>
        </GridToolbarContainer>
    );
}
