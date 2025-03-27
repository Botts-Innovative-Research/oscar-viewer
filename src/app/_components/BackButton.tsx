import { Button } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';

export default function BackButton() {

  return (
      <Button variant="text" size="small" color="primary" startIcon={<ArrowBackIosNewRoundedIcon />}
              onClick={() => {
                  window.history.back();
              }}
      >
        Back
      </Button>
  )
}