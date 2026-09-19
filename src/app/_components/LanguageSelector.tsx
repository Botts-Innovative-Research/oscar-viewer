"use client";

import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { useLanguage } from '@/app/contexts/LanguageContext';
import type { Locale } from '@/app/contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as Locale);
  };

  return (
    <FormControl size="small" variant="standard" sx={{ m: 1, minWidth: 120 }}>
      <Select
        id="language-select"
        value={language}
        onChange={handleChange}
        displayEmpty
        inputProps={{ 'aria-label': t('languageSelector') }}
        startAdornment={<LanguageIcon sx={{ mr: 1 }} />}
        renderValue={(selected) => {
            if (selected === 'en') return 'English';
            if (selected === 'es') return 'Español';
            if (selected === 'fr') return 'Français';
            if (selected === 'el') return 'Ελληνικά';
            return selected;
        }}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="es">Español</MenuItem>
        <MenuItem value="fr">Français</MenuItem>
        <MenuItem value="el">Ελληνικά</MenuItem>
      </Select>
    </FormControl>
  );
}
