import { Button } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import {useLanguage} from '@/app/contexts/LanguageContext';

export default function BackButton() {
  const {t} = useLanguage();

  return (
      <Button variant="text" size="small" color="primary" startIcon={<ArrowBackIosNewRoundedIcon />}
              onClick={() => {
                  window.history.back();
              }}
      >
        {t('back')}
      </Button>
  )
}
