"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';

const selectChoices=[
    "Foreground",
    "Background",
    "Foreground/Background",
]
export default function inSpectrumTypeSelector(props: {
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
                sx={{
                    color: "text.primary",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "inherit",
                    },
                    "&.MuiOutlinedInput-notchedOutline": { border: 1 },
                    "&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                            borderRadius: "10px"
                        },
                    "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                        },
                }}
            >
                {selectChoices.map((item) =>(
                    <MenuItem key={item} value={item.toLowerCase()}>
                        {item}
                    </MenuItem>
                ))
                }

            </Select>
        </FormControl>
    );
}
