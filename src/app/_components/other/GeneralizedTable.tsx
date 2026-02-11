"use client";

import {TableBody, TableCell, TableContainer, TableRow, Table} from "@mui/material";
import Box from "@mui/material/Box";
import {useCallback, useContext} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

interface GeneralizedTableProps {

}

export default function GeneralizedTable({}: GeneralizedTableProps) {

    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const checkForStatus = useCallback(async () => {

    },[]);

    return (
        <Box>
            <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableBody>
                        <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Battery</TableCell>
                            <TableCell>Scan Mode</TableCell>
                            <TableCell>Scan Timeout</TableCell>
                            <TableCell>Analysis Enabled</TableCell>
                            <TableCell>Linear Calibration</TableCell>
                            <TableCell>Compressed Calibration</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}