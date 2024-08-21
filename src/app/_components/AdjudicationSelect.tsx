"use client";

import { FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useState } from 'react';

const colorCodes = {
  real: { color: "error.dark" },
  innocent: { color: "primary.dark" },
  false: { color: "success.dark" },
  other: { color: "text.primary" }
};

export default function AdjudicationSelect(props: {
  onSelect: (value: string) => void, // Return selected value
  defaultValue?: string, // Default selected value
}) {
  const [adjudicated, setAdjudicated] = useState(props.defaultValue || ''); // Adjudication selected value
  const [style, setStyle] = useState(colorCodes.other.color); // Adjudicated button style based on selected value

  const handleChange = (event: SelectChangeEvent) => {
    setAdjudicated(event.target.value); // Set local adjudicated state
    props.onSelect(event.target.value); // Return selected value to parent component

    // Handle component styling
    if (parseInt(event.target.value) < 3)
      setStyle(colorCodes.real.color);
    else if (parseInt(event.target.value) < 6)
      setStyle(colorCodes.innocent.color);
    else if (parseInt(event.target.value) < 9)
      setStyle(colorCodes.false.color);
    else
      setStyle(colorCodes.other.color);
  };

  return (
      <FormControl size="small" fullWidth>
        <InputLabel id="label" sx={{"&.MuiInputLabel-root":{color: style}}}>Adjudicate</InputLabel>
        <Select
            variant="outlined"
            id="label"
            label="Adjudicate"
            value={adjudicated}
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
              color: style,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: style,
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
          <ListSubheader>Real Alarm</ListSubheader>
          <MenuItem value={1} sx={colorCodes.real}>Code 1: Contraband Found</MenuItem>
          <MenuItem value={2} sx={colorCodes.real}>Code 2: Other</MenuItem>
          <ListSubheader>Innocent Alarm</ListSubheader>
          <MenuItem value={3} sx={colorCodes.innocent}>Code 3: Medical Isotope Found</MenuItem>
          <MenuItem value={4} sx={colorCodes.innocent}>Code 4: NORM Found</MenuItem>
          <MenuItem value={5} sx={colorCodes.innocent}>Code 5: Declared Shipment of Radioactive Material</MenuItem>
          <ListSubheader>False Alarm</ListSubheader>
          <MenuItem value={6} sx={colorCodes.false}>Code 6: Physical Inspection Negative</MenuItem>
          <MenuItem value={7} sx={colorCodes.false}>Code 7: RIID/ASP Indicates Background Only</MenuItem>
          <MenuItem value={8} sx={colorCodes.false}>Code 8: Other</MenuItem>
          <ListSubheader>Alarm/Tamper/Fault</ListSubheader>
          <MenuItem value={9} sx={colorCodes.other}>Code 9: Authorized Test, Maintenence, or Training Activity</MenuItem>
          <ListSubheader>Tamper/Fault</ListSubheader>
          <MenuItem value={10} sx={colorCodes.other}>Code 10: Unauthorized Activity</MenuItem>
          <ListSubheader>Other</ListSubheader>
          <MenuItem value={11} sx={colorCodes.other}>Code 11: Other</MenuItem>
        </Select>
      </FormControl>
  );
}