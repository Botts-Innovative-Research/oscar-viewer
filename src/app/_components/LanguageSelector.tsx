"use client";

import React, { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { useLanguage } from '@/app/contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as 'en' | 'es' | 'fr');
  };

  return (
    <FormControl size="small" variant="standard" sx={{ m: 1, minWidth: 120 }}>
      <Select
        id="language-select"
        value={language}
        onChange={handleChange}
        displayEmpty
        inputProps={{ 'aria-label': 'Without label' }}
        startAdornment={<LanguageIcon sx={{ mr: 1 }} />}
        renderValue={(selected) => {
            if (selected === 'en') return 'English';
            if (selected === 'es') return 'Español';
            if (selected === 'fr') return 'Français';
            return selected;
        }}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="es">Español</MenuItem>
        <MenuItem value="fr">Français</MenuItem>
      </Select>
    </FormControl>
  );
}
