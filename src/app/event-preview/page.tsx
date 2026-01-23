"use client";

import {Box, Grid, Paper, Typography} from "@mui/material";
import { EventPreview } from "@/app/_components/event-preview/EventPreview";
import { useSelector } from "react-redux";
import { selectEventPreview } from "@/lib/state/EventPreviewSlice";

export default function EventPreviewPage() {

    const eventPreview = useSelector(selectEventPreview);

    return (
      <>
          {eventPreview.isOpen && eventPreview.eventData ? (
              <EventPreview />
          ) : (
              <></>
          )}
      </>
    );
}



