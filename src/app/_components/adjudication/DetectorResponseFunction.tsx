"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useEffect, useState} from 'react';
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function DetectorResponseFunction(props: {
    onSelect: (value: string) => void, // Return selected value
    selectVal: string
}) {
    const {t} = useLanguage();

    const [drfChoices, setDrfChoices] = useState<string[]>([]);

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    useEffect(() => {
        fetchDrfValues();
    }, []);

    async function fetchDrfValues(){
        const url = "https://full-spectrum.sandia.gov/api/v1/info";

        try {
            const response = await fetch(url, { method: 'GET' });

            if (!response.ok) {
                console.error('Could not reach Sandia spectrum values.');
                return;
            }

            const results = await response.json();
            setDrfChoices(results?.Options[0].possibleValues ?? []);
        } catch (error) {
            console.error('Failed to fetch DRF values:', error);
        }
    }

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">{t('detectorResponseFunction')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('detectorResponseFunction')}
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
                { drfChoices.length > 0 ? (
                    drfChoices.map((item) =>(
                        <MenuItem key={item} value={item}>
                            {item}
                        </MenuItem>
                    ))
                    ) :
                    (
                        <span>No choices</span>
                    )
                }
            </Select>
        </FormControl>
    );
}
