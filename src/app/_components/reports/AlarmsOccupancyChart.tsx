import React, {useCallback, useMemo, useRef} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventTableData} from "@/lib/state/EventDataSlice";
import {Box, Grid} from "@mui/material";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend, Chart
} from 'chart.js';
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";



ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type DailyCount = {[date: string]: { gamma: number , neutron: number, gammaNeutron: number, eml: number, none: number }}

export default function AlarmsOccupancyChart(){

    const idVal = useRef(0);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);
    const events = useSelector((state: RootState) => selectEventTableData(state)); //.filter((e: any) => e.laneId === currentLane));

    const chartID = "chart-view-alarm-occupancy";

    const chartViewRef = useRef(null);

    const {labels, totals, gamma, gammaNeutron, neutron, eml } = useMemo(() => {

        // calculate daily average based on the start date
        const dailyCount : DailyCount = {};

        for(const event of events){
            // split and group events by start time
            const [date, time] = event.startTime.split("T");
            const status = event.status; // gamma, neutron , gamma-neutron, none

            if(!dailyCount[date])
                dailyCount[date] = { gamma: 0, gammaNeutron: 0, neutron: 0, eml: 0, none: 0 } //creates a new date in our map

            //increment the count based off of the status
            if(status === 'Gamma'){
                dailyCount[date].gamma++;
            }else if(status === 'Gamma & Neutron') {
                dailyCount[date].gammaNeutron++;
            }else if(status === 'Neutron'){
                dailyCount[date].neutron++;
            }else if(status === 'EML Supressed'){
                dailyCount[date].eml++;
            }else{
                dailyCount[date].none++;
            }
        }

        const sortedDates = Object.keys(dailyCount).sort();
        const totalOccs = sortedDates.map((d: string) => dailyCount[d].gamma + dailyCount[d].neutron + dailyCount[d].gammaNeutron + dailyCount[d].eml + dailyCount[d].none);
        const gamma = sortedDates.map((d: string) => dailyCount[d].gamma)
        const neutron = sortedDates.map((d: string) => dailyCount[d].neutron)
        const gammaNeutron = sortedDates.map((d: string) => dailyCount[d].gammaNeutron)
        const eml = sortedDates.map((d: string)  => dailyCount[d].eml)

        return { labels: sortedDates, totals: totalOccs, neutron: neutron, gamma: gamma, gammaNeutron: gammaNeutron, eml: eml }
    }, [events]);


    const createChart = useCallback(() => {

        const ctx = document.getElementById(chartID) as HTMLCanvasElement;
        if(ctx){
            chartViewRef.current = new Chart(ctx, {
                type: 'bar',
                data:{
                    labels: labels,
                    datasets: [
                        {
                            label: 'Occupancies',
                            data: totals,
                            borderColor: 'rgb(33,149,242)',
                            backgroundColor: 'rgba(75,75,75, 0.4)',
                            fill: true,
                            type: 'line',
                            order: 1
                        },
                        {
                            label: 'Gamma',
                            data: gamma,
                            borderColor: 'rgb(147,146,146)',
                            backgroundColor: 'rgba(75,75,75, 0.4)',
                            order: 0
                        },
                        {
                            label: 'Neutron',
                            data: neutron,
                            borderColor: 'rgb(21,103,173)',
                            backgroundColor: 'rgba(75,75,75, 0.4)',
                            order: 0
                        },
                        {
                            label: 'Gamma-Neutron',
                            data: gamma,
                            borderColor: 'rgb(227,119,10)',
                            backgroundColor: 'rgba(75,75,75, 0.4)',
                            order: 0
                        },
                        {
                            label: 'EML Sup',
                            data: eml,
                            borderColor: 'rgb(243,205,84)',
                            backgroundColor: 'rgba(75,75,75, 0.4)',
                            order: 0
                        }
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Alarms & Occupancies'
                        }
                    },
                    scales : {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true
                        }

                    }
                }
            });
        }
        // const container = document.getElementById(chartID);
        // if(container){
        //     chartViewRef.current = new ChartJsView({
        //         container: chartID,
        //     })
        // }
        // const canvas = document.createElement("canvas");
        // document.getElementById(chartID).append(canvas);


        // const chart = new Chart(canvas.getContext('2d'), config);

    },[]);


    return (
        <Box display='flex' alignItems="center">
            <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                <Grid item xs>
                    <div id={chartID} style={{marginBottom: 50, height: '85%',}}></div>

                </Grid>
            </Grid>
        </Box>
    );

}