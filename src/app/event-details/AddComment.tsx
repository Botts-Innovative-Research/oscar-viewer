"use client";

import { Avatar, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { SelectedEvent } from "types/new-types";
import AdjudicationSelect from "../_components/AdjudicationSelect";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useState } from "react";

export default function AddComment(props: {
  event: SelectedEvent;
}) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = () => {
    // Dummy file upload logic, replace with actual file upload logic
    setUploadedFiles([...uploadedFiles, `File ${uploadedFiles.length + 1}`]);
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
        <Box
          sx={{
            maxHeight: '100px', // Adjust height based on item size
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '10px',
            p: 2,
          }}
        >
          {uploadedFiles.map((file, index) => (
            <Typography key={index}>{file}</Typography>
          ))}
        </Box>
      )}
      <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"} width={"100%"}>
        <Button 
          variant="outlined" 
          color="secondary" 
          startIcon={<UploadFileRoundedIcon />} 
          sx={{ minWidth: "auto" }}
          onClick={handleFileUpload} // Trigger file upload logic
        >
          Upload Files
        </Button>
        <Stack direction={"row"} spacing={2}>
          <AdjudicationSelect onSelect={handleAdjudicationSelect} />
          <Button disableElevation variant={"contained"} color={"success"}>Submit</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}