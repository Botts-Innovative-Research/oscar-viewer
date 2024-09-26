"use client";

import {Grid, Typography } from "@mui/material";
import { SelectedEvent } from "types/new-types";
import VideoGrid from "./VideoGrid";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectEventPreview, setEventPreview, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";


export default function Media(props: {
  event: SelectedEvent;
  laneName: string
}) {



    return (
      //chart gamma
      //chart neutron


      <Grid container direction="row" spacing={2}>
        <Grid item xs>
           <>
               <Typography>Chart1</Typography>
           </>
        </Grid>
        <Grid item xs>
          <>
              <Typography>Chart1</Typography>
          </>
        </Grid>
        <Grid item xs>
          <VideoGrid laneName={props.laneName}/>
        </Grid>
      </Grid>


  );
}
