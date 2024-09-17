"use client";


import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {capitalize, Stack, Tooltip, Typography} from '@mui/material';
import OnlineIcon from '@mui/icons-material/Wifi';  // Online icon
import OfflineIcon from '@mui/icons-material/WifiOff';  // Offline icon
import AlarmIcon from '@mui/icons-material/Warning';  // Alarm icon
import TamperIcon from '@mui/icons-material/ReportProblem';  // Tamper icon
import FaultIcon from '@mui/icons-material/Error';  // Fault icon
import CheckCircleIcon from '@mui/icons-material/CheckCircle';  // No issues icon


// export default function LaneStatusItem(props: {
//   id: number;
//   name: string;
//   status: string;
// }) {
//   if (props.status == "none")
//     return (<></>)
//   return (
//       <Paper key={props.id} variant='outlined' sx={{ cursor: 'pointer', padding: 1,
//         backgroundColor: (
//             props.status == "Alarm" ? "errorHighlight"
//                 : props.status == 'Tamper' ? "secondaryHighlight"
//                     : props.status === ('Fault - Gamma Low') ? 'infoHighlight'
//                         : props.status === ('Fault - Neutron Low') ? 'infoHighlight'
//                             : props.status === ('Fault - Gamma High') ? 'infoHighlight'
//                                 : props.status === 'Online' ? 'successHighlight'
//                                     : 'unknown'
//         )
//       }}
//       >
//         <Stack direction={"row"}>
//           <CircleRoundedIcon
//               color={(
//                   props.status === "Alarm" ? "error"
//                       : props.status === 'Tamper' ? "secondary"
//                           : props.status ==='Fault - Gamma Low' ? 'info'
//                               : props.status === 'Fault - Gamma High' ? 'info'
//                                   : props.status === 'Fault - Neutron Low' ? 'info'
//                                       : props.status === 'Online' ? 'success'
//                                           : 'success'
//               )
//               }
//               sx={{ marginRight: 2 }} />
//           <Typography variant="body1">{props.name} - {capitalize(props.status)}</Typography>
//         </Stack>
//       </Paper>
//   );
// }

export default function LaneStatusItem(props: {
    id: number;
    name: string;
    isOnline: boolean;
    isAlarm: boolean;
    isTamper: boolean;
    isFault: boolean;

}) {
    if (!props.isOnline)
        return (<></>)
    return (
        <Paper key={props.id} variant='outlined' sx={{ cursor: 'pointer', padding: 1,

        }}
        >
            <Stack direction={"row"}>
                <Typography variant="body1">{props.name} - </Typography>

                {props.isAlarm &&
                    <Tooltip title={'Alarm'} arrow placement="top">
                        <AlarmIcon color="error"/>
                    </Tooltip>}
                {props.isFault &&
                    <Tooltip title={'Fault'} arrow placement="top">
                        <FaultIcon color="info"/>
                    </Tooltip>
                }

                {props.isTamper &&
                    <Tooltip title={'Tamper'} arrow placement="top">
                        <TamperIcon color="secondary"/>
                    </Tooltip>
                   }

                {!props.isAlarm && !props.isTamper && !props.isFault && (
                    <Tooltip title={'All Clear'} arrow placement="top">
                        <CheckCircleIcon color="success"/>
                    </Tooltip>
                )}

            </Stack>
        </Paper>
    );
}