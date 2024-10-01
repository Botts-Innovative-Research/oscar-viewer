"use client";

import { FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import {useEffect, useState} from 'react';

export default function IsotopeSelect(props: {
  onSelect: (value: string) => void, // Return selected value
  value?: string, // Default selected value
}) {
  const [isotope, setIsotope] = useState(props.value || ''); // Adjudication selected value

  const handleChange = (event: SelectChangeEvent) => {
      setIsotope(event.target.value); // Set local isotope
      props.onSelect(event.target.value); // Return selected value to parent component

  };

    useEffect(() => {
        setIsotope(props.value || ''); // Reset local state to prop value
    }, [props.value]);

  return (
      <FormControl size="small" fullWidth>
        <InputLabel id="label" sx={{"&.MuiInputLabel-root":{color: "inherit"}}}>Isotope</InputLabel>
        <Select
            variant="outlined"
            id="label"
            label="Isotope"
            value={isotope}
            onChange={handleChange}
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
            <MenuItem value={"Neptunium"} >Neptunium (Np) 237</MenuItem>
            <MenuItem value={"Plutonium"} >Plutonium (Pu) 239</MenuItem>
            <MenuItem value={"Uranium233"} >Uranium (U) 233</MenuItem>
            <MenuItem value={"Uranium235"} >Uranium (U) 235</MenuItem>
            <MenuItem value={"Uranium238"}>Uranium (U) 238</MenuItem>
            <MenuItem value={"Americium"} >Americium (Am) 241</MenuItem>
            <MenuItem value={"Barium"} >Barium (Ba) 133</MenuItem>
            <MenuItem value={"Bismuth"} >Bismuth (Bi) 207</MenuItem>
            <MenuItem value={"Californium"} >Californium (Cf) 252*</MenuItem>
            <MenuItem value={"Cesium134"} >Cesium (Cs) 134</MenuItem>
            <MenuItem value={"Cesium137"}>Cesium (Cs) 137</MenuItem>
            <MenuItem value={"Cobalt57"}>Cobalt (Co) 57</MenuItem>
            <MenuItem value={"Cobalt60"}>Cobalt (Co) 60</MenuItem>
            <MenuItem value={"Europium152"}>Europium (Eu) 152</MenuItem>
            <MenuItem value={"Iridium"}>Iridium (Ir) 192</MenuItem>
            <MenuItem value={"Manganese"}>Manganese (Mn) 54</MenuItem>
            <MenuItem value={"Selenium"}>Selenium (Se) 75</MenuItem>
            <MenuItem value={"Sodium"}>Sodium (Na) 22</MenuItem>
            <MenuItem value={"Strontium"}>Strontium (Sr) 90*</MenuItem>
            <MenuItem value={"Fluorine"}>Fluorine (F) 18</MenuItem>
            <MenuItem value={"Gallium"}>Gallium (Ga) 67</MenuItem>
            <MenuItem value={"Iodine123"}>Iodine (I) 123</MenuItem>
            <MenuItem value={"Iodine131"}>Iodine (I) 131</MenuItem>
            <MenuItem value={"Indium"}>Indium (In) 111</MenuItem>
            <MenuItem value={"Palladium"}>Palladium (Pd) 103</MenuItem>
            <MenuItem value={"Technetium"}>Technetium (Tc) 99m</MenuItem>
            <MenuItem value={"Xenon"}>Xenon (Xe) 133</MenuItem>
            <MenuItem value={"Potassium"}>Potassium (K) 40</MenuItem>
            <MenuItem value={"Radium"}>Radium (Ra) 226</MenuItem>
            <MenuItem value={"Thorium"}>Thorium (Th) 232</MenuItem>

        </Select>
      </FormControl>
  );
}