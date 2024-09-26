"use client";

import { Avatar, Box, Button, InputBase, Paper, Stack, TextField, Typography } from "@mui/material";
import { SelectedEvent } from "types/new-types";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { useState } from "react";
import AdjudicationSelect from "../_components/event-preview/AdjudicationSelect";

export default function AddComment(props: {
  event: SelectedEvent;
}) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = () => {
    // Dummy file upload logic, replace with actual file upload logic
    setUploadedFiles([...uploadedFiles, `File${uploadedFiles.length + 1}.pdf`]);
  };

  const handleAdjudicationSelect = (value: string) =>  {
    console.log(value);
  } 
  
  return (
    <Stack direction={"column"} p={2} spacing={2}>
      <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
        <Avatar>OP</Avatar>
        <Typography variant="h6">Add a comment</Typography>
      </Stack>
      <TextField
        id="outlined-multiline-static"
        label="Notes"
        multiline
        rows={4}
      />
      {uploadedFiles.length > 0 && (
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <Stack
            sx={{
              maxHeight: '100px', // Adjust height based on item size
              overflowY: 'auto',
              p: 2,
            }}
            spacing={1}
          >
            {uploadedFiles.map((file, index) => (
              <Box display={"flex"} sx={{wordSpacing: 2}}>
                <InsertDriveFileRoundedIcon />
                <Typography variant="body1">{file}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
      <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"} width={"100%"}>
        <Box
          onClick={handleFileUpload} // Trigger file upload logic
          sx={{
          display: "flex",
          alignItems: "center",
          width: "auto",
          padding: "8px",
          borderStyle: "solid",
          borderWidth: "1px",
          borderRadius: "10px",
          borderColor: "secondary.main",
          color: "secondary.main",
        }}>
          <UploadFileRoundedIcon />
          <Typography variant="body2">{("Upload Files").toUpperCase()}</Typography>
          <InputBase type="file" inputProps={{multiple: true}}  />
        </Box>
        <Stack direction={"row"} spacing={2}>
          <AdjudicationSelect onSelect={handleAdjudicationSelect} />
          <Button disableElevation variant={"contained"} color={"success"}>Submit</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}