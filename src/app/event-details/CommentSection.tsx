"use client";

import {Avatar, Box, Button, Icon, Paper, Stack, TextField, Tooltip, Typography} from "@mui/material";
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { Comment} from "types/new-types";
import React, {useState} from "react";


export default function CommentSection(props: {
  comments: Comment[];
}) {

    const adjCodeDescriptions:{[key: number] : string} = {
        1: "Code 1: Contraband Found",
        2: "Code 2: Other",
        3: "Code 3: Medical Isotope Found",
        4: "Code 4: NORM Found",
        5: "Code 5: Declared Shipment of Radioactive Material",
        6: "Code 6: Physical Inspection Negative",
        7: "Code 7: RIID/ASP Indicates Background Only",
        8: "Code 8: Other",
        9: "Code 9: Authorized Test, Maintenance, or Training Activity",
        10: "Code 10: Unauthorized Activity",
        11: "Code 11: Other"
    };
    const getAdjudicationStyle = (adjudication: number) => {
        if (adjudication < 3) {
            return { borderColor: "error.dark", color: "error.dark" };
        } else if (adjudication < 6) {
            return { borderColor: "primary.dark", color: "primary.dark" };
        } else if (adjudication < 9){
            return { borderColor: "success.dark", color: "success.dark" };
        } else{
            return { borderColor: "text.primary", color: "text.primary" };
        }
    };

    return (
      <Stack direction={"column"} p={2} spacing={2}>
        {props.comments.map((comment, index) => (
            <Paper variant="outlined" key={index} sx={{ p: 2, mb: 2 }}>
              <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
                <Avatar>{comment.user.charAt(0)}</Avatar>
                <Typography variant="h6">{comment.user}</Typography>
                <Box sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "auto",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid",
                    textAlign: "center",
                    ...getAdjudicationStyle(comment.adjudication)
                    }}>
                    {adjCodeDescriptions[comment.adjudication]}
                </Box>
                  <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "auto",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid",
                      borderColor: "inherit",
                      color: "inherit",
                      textAlign: "center"

                  }}>
                      {comment.isotope.join(', ')}
                  </Box>

                  {/*<Stack direction={"column"} spacing={2}>*/}
                  {/*    {comment.secondaryInspection && (*/}
                  {/*        <Tooltip title={'Secondary Inspection'} arrow placement="top">*/}
                  {/*            <CheckCircleIcon color="success"/>*/}
                  {/*        </Tooltip>*/}
                  {/*    )}*/}
                  {/*</Stack>*/}
              </Stack>

              <TextField
                  id="outlined-multiline-static"
                  label="Notes"
                  multiline
                  rows={4}
                  disabled
                  value={comment.notes}
                  sx={{ mt: 2, mb: 2 }}
                  fullWidth
              />
              {comment.files.length > 0 && (
                  <Paper variant='outlined' sx={{ width: "100%" }}>
                    <Stack
                        sx={{
                          maxHeight: '100px', // Adjust height based on item size
                          overflowY: 'auto',
                          p: 2,
                        }}
                        spacing={1}
                    >
                      {comment.files.map((file, fileIndex) => (
                          <Box display={"flex"} sx={{ wordSpacing: 2 }} key={fileIndex}>
                            <InsertDriveFileRoundedIcon />
                            <Typography variant="body1">{file.name}</Typography>
                          </Box>
                      ))}
                    </Stack>
                  </Paper>
              )}
            </Paper>
        ))}
      </Stack>
  );
}