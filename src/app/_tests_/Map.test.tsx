import {render, screen, fireEvent, waitFor, cleanup, queryByLabelText} from '@testing-library/react';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';
import {useRouter} from "next/navigation";
import MapViewPage from '../map/page';


jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;


describe('MapViewPage', () => {
    beforeEach( ()  => {
        render(<MapViewPage />)
    });

    it('renders map title', async() => {
        await waitFor(() => {
            expect(screen.getByText(/map/i)).toBeInTheDocument();
        })
    })

    it('renders dynamic import of map component', async() => {
        await waitFor(() => {
            expect(screen.getAllByTestId('map-component')).toBeInTheDocument();
        });
    });


});

describe('MapComponent', () => {

    it('renders map container', () => {

    })

    it('initializes location list', () => {

    })

    it('handles datasources correctly', () => {

    })
})