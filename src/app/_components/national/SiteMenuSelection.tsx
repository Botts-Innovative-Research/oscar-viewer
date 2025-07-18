"use client"

import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import {FormControl, InputLabel, Select, SelectChangeEvent} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {INode} from "@/lib/data/osh/Node";


export default function SiteMenuSelection(props: {
    onSelect: (value: any) => void
    siteValue: string
}){

    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);

    const handleChange = (event: SelectChangeEvent) => {

        props.onSelect(event.target.value)
    }

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Site</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Site"
                value={props.siteValue}
                onChange={handleChange}
                MenuProps={{
                    MenuListProps: {
                        style: {
                            maxHeight: 300
                        }
                    }
                }}
                autoWidth
                style={{minWidth: "8em"}}
            >
                {nodes.map((item: INode) =>(
                    <MenuItem key={item.name} value={item.name}>
                        {item.name}
                    </MenuItem>
                ))
                }

            </Select>
        </FormControl>
    );
}