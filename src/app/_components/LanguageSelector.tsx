"use client";

import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'العربية' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'ar-JO', name: 'العربية (الأردن)' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'et', name: 'Eesti' },
    { code: 'pt', name: 'Português' },
    { code: 'de', name: 'Deutsch' },
    { code: 'th', name: 'ไทย' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'pa-PK', name: 'پنجابی' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'yue', name: '粵語' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'ur', name: 'اردو' },
    { code: 'it', name: 'Italiano' }
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as any);
  };

  return (
    <FormControl size="small" variant="standard" sx={{ m: 1, minWidth: 120 }}>
      <Select
        id="language-select"
        value={language}
        onChange={handleChange}
        displayEmpty
        inputProps={{ 'aria-label': 'Language' }}
        startAdornment={<LanguageIcon sx={{ mr: 1, color: 'inherit' }} />}
        renderValue={(selected) => {
            const lang = languages.find(l => l.code === selected);
            return lang ? lang.name : selected;
        }}
        sx={{
            color: 'inherit',
            '& .MuiSelect-select': {
                paddingTop: '4px',
                paddingBottom: '4px',
            },
            '&:before': { borderBottomColor: 'rgba(255, 255, 255, 0.7)' },
            '&:after': { borderBottomColor: 'white' },
            '& .MuiSvgIcon-root': { color: 'inherit' }
        }}
      >
        {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
            </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
