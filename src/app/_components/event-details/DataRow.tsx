"use client";

import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {styled} from "@mui/material/styles";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {getIntlLocale} from '@/app/utils/LocaleUtils';


const StatusTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'status',
})<{status: string}>(({theme, status}) => ({
    color: status === 'Gamma' ? theme.palette.error.contrastText : status === 'Neutron' ? theme.palette.info.contrastText : status === 'Gamma & Neutron' ? theme.palette.secondary.contrastText : 'inherit',
    backgroundColor: status === 'Gamma' ? theme.palette.error.main : status === 'Neutron' ? theme.palette.info.main : status === 'Gamma & Neutron' ? theme.palette.secondary.main : 'transparent',
}));

export default function DataRow({eventData}: {eventData: EventTableData}) {
    const {language, t} = useLanguage();
    const formatDate = (value?: string) => value ? new Date(value).toLocaleString(getIntlLocale(language)) : '';
    const formatStatus = (value?: string) => {
        if (value === 'Gamma & Neutron') return t('gammaAndNeutron');
        if (value === 'Gamma') return t('gamma');
        if (value === 'Neutron') return t('neutron');
        if (value === 'None') return t('none');
        return value || t('unknown');
    };
    const formatInspection = (value?: string) => value ? t(`secondaryInspection.${value.toLowerCase()}`) : '';
    return (
        <TableContainer>
            <Table sx={{minWidth: 650}} aria-label={t('eventDetails')}>
                <TableHead>
                    <TableRow
                        sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                        <TableCell>{t('secondaryInspection')}</TableCell>
                        <TableCell>{t('laneId')}</TableCell>
                        <TableCell>{t('occupancyId')}</TableCell>
                        <TableCell>{t('startTime')}</TableCell>
                        <TableCell>{t('endTime')}</TableCell>
                        <TableCell>{t('maxGamma')}</TableCell>
                        <TableCell>{t('maxNeutron')}</TableCell>
                        <TableCell>{t('status')}</TableCell>
                        <TableCell>{t('adjudicated')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {eventData ? (
                        <TableRow key={eventData.id}
                                  sx={{'&:last-child td, &:last-child th': {border: 0, textAlign: "center"}}}>
                            <TableCell>{formatInspection(eventData?.secondaryInspection)}</TableCell>
                            <TableCell>{eventData?.laneId}</TableCell>
                            <TableCell>{eventData?.occupancyCount}</TableCell>
                            <TableCell>{formatDate(eventData?.startTime)}</TableCell>
                            <TableCell>{formatDate(eventData?.endTime)}</TableCell>
                            <TableCell>{eventData?.maxGamma}</TableCell>
                            <TableCell>{eventData?.maxNeutron}</TableCell>
                            <StatusTableCell status={eventData?.status || 'Unknown'}>
                                {formatStatus(eventData?.status)}
                            </StatusTableCell>
                            <TableCell>{eventData?.adjudicatedIds.length > 0 ? t('yes') : t('no')}</TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} align="center">{t('noEventData')}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
