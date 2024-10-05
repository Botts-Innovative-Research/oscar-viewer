"use client";

import {
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    ListSubheader,
    MenuItem,
    OutlinedInput,
    Select,
    SelectChangeEvent,
    Theme
} from '@mui/material';
import {useEffect, useState} from 'react';

const isotopeChoices=[
    "Neptunium",
    "Plutonium",
    "Uranium233",
    "Uranium235",
    "Uranium238",
    "Americium",
    "Barium",
    "Bismuth",
    "Californium",
    "Cesium134",
    "Cesium137",
    "Cobalt57",
    "Cobalt60",
    "Europium152",
    "Iridium",
    "Manganese",
    "Selenium",
    "Sodium",
    "Strontium",
    "Fluorine",
    "Gallium",
    "Iodine123",
    "Iodine131",
    "Indium",
    "Palladium",
    "Technetium",
    "Xenon",
    "Potassium",
    "Radium",
    "Thorium"
]

export default function IsotopeSelect(props: {
  onSelect: (value: string[]) => void, // Return selected value
  value?: string[], // Default selected value
}) {
  const [isotope, setIsotope] = useState<string[]>([]); // Adjudication selected value

  const handleChange = (event: SelectChangeEvent<typeof isotope>) => {
      const {
          target: {value},
      } = event;

      setIsotope(typeof value === 'string' ? value.split(', ') : value); // Set local isotope

      props.onSelect(typeof value === 'string' ? value.split(', ') : value); // Return selected value to parent component

  };

    useEffect(() => {
        setIsotope(props.value || []); // Reset local state to prop value
    }, [props.value]);


  return (
      <FormControl size="small" fullWidth>
        <InputLabel id="label" sx={{"&.MuiInputLabel-root":{color: "inherit"}}}>Isotope</InputLabel>
        <Select
            label="Isotope"
            id="label"
            multiple
            value={isotope}
            onChange={handleChange}
            // input={<OutlinedInput label="Isotope"/>}

            renderValue={(selected) => selected.join(', ')}
            MenuProps={{
              MenuListProps: {
                style: {
                  maxHeight: 300
                }
              }
            }}
            autoWidth
            style={{ minWidth: "8em" }}
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
            {isotopeChoices.map((item) =>(
                <MenuItem key={item} value={item}>
                    {item}
                    {/*<Checkbox checked={isotope.includes(item)}/>*/}
                    {/*<ListItemText primary={item}/>*/}
                </MenuItem>
                ))
            }
        </Select>
      </FormControl>
  );
}