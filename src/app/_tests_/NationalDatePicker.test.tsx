import {render, screen, fireEvent, waitFor, cleanup, queryByLabelText} from '@testing-library/react';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';
import NationalViewPage from "@/app/national-view/page";
import {configureStore} from "@reduxjs/toolkit";
import OSCARClientReducer from "@/lib/state/OSCARClientSlice";
import {Provider} from "react-redux";
import NationalViewSlice from "@/lib/state/NationalViewSlice";
import NationalDatePicker from '../_components/national/NationalDatePicker';
import dayjs from "dayjs";



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

//create mock components for the table and datepicker, and custom toolbar

//test changing times

// test it loading all nodes

describe('NationalDatePicker', () => {

    beforeEach(() => {
        render(<NationalDatePicker />);
    })

    it('start and end times display values are updated with correctly selected dates', async() => {

        const startInput = screen.getByLabelText(/start date/i).querySelector('input');
        const endInput = screen.getByLabelText(/end date/i).querySelector('input');

        expect(startInput).toBeInTheDocument();
        expect(endInput).toBeInTheDocument();

        // simulate date change
        const newDate = dayjs().subtract(1, 'day').format(`MM/DD/YYYY hh:mm A`);
        fireEvent.change(startInput!, { target: { value: newDate } });

        await waitFor(() => {
            expect(startInput!.value).toContain(dayjs().subtract(1, 'day').format(`MM/DD/YYYY hh:mm A`));

        })
    })

    it('start date is always before or equal to end date', async() => {
        const startInput = screen.getByLabelText(/start date/i).querySelector('input');
        const endInput = screen.getByLabelText(/end date/i).querySelector('input');


        const futureDate = dayjs().add(2, `day`).format(`MM/DD/YYYY hh:mm A`);
        const pastDate = dayjs().subtract(2, `day`).format(`MM/DD/YYYY hh:mm A`);

        fireEvent.change(endInput!, { target: { value: futureDate } });
        fireEvent.change(startInput!, { target: { value: dayjs().add(3, `day`).format(`MM/DD/YYYY hh:mm A`) } });

        await waitFor(() => {
            const startVal = dayjs(startInput!.value);
            const endVal = dayjs(endInput!.value);

            expect(startVal.isBefore(endVal) || startVal.isSame(endVal)).toBe(true);
        })
    })
})
