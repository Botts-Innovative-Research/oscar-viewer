"use client";

import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useLanguage } from '@/app/contexts/LanguageContext';

type Locale = 'en' | 'es' | 'fr' | 'tk';

/** Native names, so a speaker can find their language without reading English. */
const LOCALES: { code: Locale, label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'tk', label: 'Türkmençe' },
];

/**
 * Language picker for the settings menu. A plain list rather than a Select —
 * nesting a Select's popover inside the settings Menu steals focus and closes
 * the parent menu.
 */
export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <List dense disablePadding>
      {LOCALES.map(({ code, label }) => (
        <ListItemButton
          key={code}
          selected={language === code}
          onClick={() => setLanguage(code)}
          sx={{ px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {language === code && <CheckRoundedIcon fontSize="small" color="primary" />}
          </ListItemIcon>
          <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
      ))}
    </List>
  );
}
