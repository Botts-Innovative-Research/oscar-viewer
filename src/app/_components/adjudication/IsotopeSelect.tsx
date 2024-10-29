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
    "",
    "Unknown",
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
    "Thorium",
]

export default function IsotopeSelect(props: {
  onSelect: (value: string[]) => void, // Return selected value
  isotopeValue: string[]
}) {
  const [isotope, setIsotope] = useState<string[]>([""]);

  const handleChange = (event: SelectChangeEvent<typeof isotope>) => {
      // const isotopes = event.target.value;
      // console.log("[ISO] Isotope Selected: ", isotopes);
      const {target: {value},} = event;
      let isoValue = typeof value === 'string' ? value.split(', ') : value;

      //if isotope is not known then only can choose that value,
      if(isoValue.includes('Unknown')){
          props.onSelect(["Unknown"])
      }else{
          props.onSelect(isoValue);
      }
      console.log("[ISO] Isotope Selected: ", value);
      // setIsotope(isoValue); // Set local isotope

  };

  return (
      <FormControl size="small" fullWidth>
        <InputLabel id="label" sx={{"&.MuiInputLabel-root":{color: "inherit"}}}>Isotope</InputLabel>
        <Select
            label="Isotope"
            id="label"
            multiple
            value={props.isotopeValue}
            onChange={handleChange}
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
                </MenuItem>
                ))
            }
        </Select>
      </FormControl>
  );
}
