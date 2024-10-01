"use client";

import {
  Avatar,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputBase,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {Comment, SelectedEvent} from "types/new-types";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import React, {ChangeEvent, useRef, useState} from "react";
import AdjudicationSelect from "../_components/event-preview/AdjudicationSelect";
import IsotopeSelect from "./IsotopeSelect";
import CommentSection from "./CommentSection"

export default function AddComment(props: {
  event: SelectedEvent;
}) {


  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [user, setUser] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [notes, setNotes] = useState("");
  const [adjudicated, setAdjudicated] = useState("");
  const [isotope, setIsotope] = useState("");
  const [secondaryInspection, setSecondaryInspection] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**handle the file uploade**/
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if(e.target.files === null){
      console.log('file is null')
      return;
    }
    const files = Array.from(e.target.files);
    setUploadedFiles([...uploadedFiles, ...files]);
    e.target.value ="";

  };

  const handleAdjudicationSelect = (value: string) =>  {
    console.log(value);
    setAdjudicated(value);
  }

  const handleIsotopeSelect = (value: string) =>  {
    console.log(value);
    setIsotope(value);
  }

  const handleSubmit = () =>{
    //require user before allowing submission
    const newComment: Comment ={
      user: user,
      vehicleId: vehicleId,
      notes: notes,
      files: uploadedFiles,
      secondaryInspection: secondaryInspection,
      adjudication: adjudicated,
      isotope: isotope
    }
    setComments([...comments, newComment]);
    console.log(newComment)

    setUser("");
    setVehicleId("");
    setNotes("");
    setUploadedFiles([]);
    setAdjudicated("");
    setIsotope("");
    setSecondaryInspection(false);
  }

  const handleChange =(e: React.ChangeEvent<HTMLInputElement>) =>{
    const {name, value, checked} = e.target;

    if(name === 'secondaryInspection'){
      setSecondaryInspection(checked);
    }else if(name === 'username'){
      setUser(value);
    }else if(name === 'vehicleId'){
      setVehicleId(value);
    } else if (name === 'notes'){
      setNotes(value)
    }
  }


  return (
      <Stack direction={"column"} p={2} spacing={2}>
        <Stack direction={"column"} spacing={2}>
          {comments.length > 0 && (
              <CommentSection comments={comments}/>
          )}
        </Stack>

        <Typography variant="h5">Add a comment</Typography>
        <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
          {/*<Avatar>OP</Avatar>*/}
          <Box>
            <Stack direction="row" spacing={1}>
              <TextField
                  required
                  label="Username"
                  name="username"
                  value={user}
                  onChange={handleChange}
              />
              <TextField
                  label="VehicleId"
                  name="vehicleId"
                  value={vehicleId}
                  onChange={handleChange}

              />
            </Stack>
          </Box>
        </Stack>

        <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
          <AdjudicationSelect defaultValue={adjudicated} onSelect={handleAdjudicationSelect} />
          <IsotopeSelect value={isotope} onSelect={handleIsotopeSelect} />
        </Stack>
        <TextField
            id="outlined-multiline-static"
            label="Notes"
            name="notes"
            multiline
            rows={4}
            value={notes}
            onChange={handleChange}
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
                      <Typography variant="body1">{file.name}</Typography>
                    </Box>
                ))}
              </Stack>
            </Paper>
        )}
        <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"} width={"100%"}>
          <Button
              component="label"
              startIcon={<UploadFileRoundedIcon/>}
              sx={{
                display: "flex",
                alignItems: "center",
                width: "auto",
                padding: "8px",
                borderStyle: "solid",
                borderWidth: "1px",
                borderRadius: "10px",
                borderColor: "secondary.main",
                backgroundColor: "inherit",
                color: "secondary.main"
              }}>
            Upload Files
            <InputBase
                type="file"
                inputProps={{multiple: true}}
                onChange={handleFileUpload}
                inputRef={fileInputRef}
                sx={{display: "none"}}
            />
          </Button>
          <Stack direction={"row"} spacing={2} >
            <FormControlLabel control={<Checkbox name="secondaryInspection" checked={secondaryInspection} onChange={handleChange}/>} label="Secondary Inspection"/>
            <Button disableElevation variant={"contained"} color={"success"} onClick={() => handleSubmit()}>Submit</Button>
          </Stack>

        </Stack>
      </Stack>
  );
}