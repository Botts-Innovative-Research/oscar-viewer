import {
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Stack,
    TextField,
    Typography
} from "@mui/material";


export default function SiteConfiguration() {


  return (
    <Stack spacing={2}>
      <Typography variant="h4">Site Configuration</Typography>
      <TextField required id="outlined-basic" label="Friendly Name" variant="outlined" type="string" />
      <TextField required id="outlined-basic" label="Server Address" variant="outlined" type="string" />
      <TextField required id="outlined-basic" label="Username" variant="outlined" type="string" />
      <TextField required id="outlined-basic" label="Password" variant="outlined" type="password" />
      <FormGroup>
        <FormControlLabel control={<Checkbox />} label="HTTPS?" />
      </FormGroup>
      <Button color="success" variant="contained">Submit</Button>
    </Stack>
  );
}