"use client";

import { CircularProgress, Container } from "@mui/material";

export default function SuspenseLoad() {

  return (
    <Container sx={{ display: 'flex' }}>
      <CircularProgress />
    </Container>
  );
}