import {render, screen, fireEvent, waitFor, cleanup, queryByLabelText} from '@testing-library/react';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';
import NationalViewPage from "@/app/national-view/page";
import {configureStore} from "@reduxjs/toolkit";
import OSCARClientReducer from "@/lib/state/OSCARClientSlice";
import {Provider} from "react-redux";
import NationalViewSlice from "@/lib/state/NationalViewSlice";



const renderWithRedux = (component: React.ReactElement) => {
    const store = configureStore({
        reducer: {
            nationalView: NationalViewSlice
        },
    })
    return {
        ...render(
            <Provider
                store={store}
            >
                {component}
            </Provider>
        ),
        store,
    };
};


// test it loading all nodes

describe('StatsTable', () => {
    beforeEach(() => {
        cleanup();
        jest.clearAllMocks();
    })

    it('renders datagrid with correct columns', () => {

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();

        // Check for column headers
        expect(screen.getByText('Site Name')).toBeInTheDocument();
        expect(screen.getByText('Occupancy')).toBeInTheDocument();
        expect(screen.getByText('Gamma Alarms')).toBeInTheDocument();
        expect(screen.getByText('Neutron Alarms')).toBeInTheDocument();
        expect(screen.getByText('Fault Alarms')).toBeInTheDocument();
        expect(screen.getByText('Tamper Alarms')).toBeInTheDocument();
    })

    it('inits alarm counts to 0', async() => {
        //check all alarm counts are initially 0
        await waitFor(() => {
            const cells = screen.getAllByText('0');
            expect(cells.length).toBeGreaterThan(0);
        })
    })

    it('initializes sites from list of nodes', async() => {
        await waitFor(() => {
            expect(screen.getByText('Site1')).toBeInTheDocument()
            expect(screen.getByText('Site2')).toBeInTheDocument()
        })
    })

    it('resets alarm counts when time range changes', () => {

    })

    it('handles empty nodes list', () => {
        // make sure that it handles empty list properly
    })
})

describe('StatsTable Date Fetching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    it('calls searchObservations with correct time range', () => {

    })
})

describe('StatsTable Implementation', () => {

    it('updates alarm counts when obs are fetched', () => {

    })
})