"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';

const selectChoices=[
    "FOREGROUND",
    "BACKGROUND",
]
export default function SpectrumTypeSelector(props: {
    onSelect: (value: string) => void, // Return selected value
    selectVal: string
}) {

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Spectrum Type</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Spectrum Type"
                value={props.selectVal}
                onChange={handleChange}
                MenuProps={{
                    MenuListProps: {
                        style: {
                            maxHeight: 300
                        }
                    }
                }}
                autoWidth
                style={{minWidth: "12em"}}
            >
                {selectChoices.map((item) =>(
                    <MenuItem key={item} value={item}>
                        {item}
                    </MenuItem>
                ))
                }

            </Select>
        </FormControl>
    );
}
