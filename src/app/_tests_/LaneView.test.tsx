import {render, screen, fireEvent, waitFor, cleanup, queryByLabelText} from '@testing-library/react';
import LaneViewPage from '@/app/lane-view/page';
import * as React from 'react';
import BackButton from '../_components/BackButton';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';


// unmount and cleanup DOM after the test is finished.
afterEach(cleanup);

// create mocks of all components and states
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
    }),
}));


jest.mock("../_components/BackButton", () => {

})

jest.mock("../_components/lane-view/LaneStatus", () => {

})

jest.mock("../_components/lane-view/StatusTable", () => {

})

jest.mock("../_components/event-table/EventTable", () => {

})

jest.mock("../_components/lane-view/Media", () => {

})


jest.mock("@/lib/state/OSCARLaneSlice", () => {

})

jest.mock("@/lib/state/LaneViewSlice", () => {

})


const mockCallback = jest.fn();


test('collectDataSources mock function', () => {

})




describe("LaneViewPage", () => {
    beforeEach(() => {
        render(<LaneViewPage />)
    })

    it('returns to previous screen when onClick handler button is clicked', () => {
        render(<BackButton />);
        const buttonElement = screen.getByText(/back/i);
        expect(buttonElement).toBeInTheDocument();
        fireEvent.click(buttonElement);

        // verify it returns to the previous page
    })


    it("returns to previous page when clicked", () => {
        render(<BackButton />);
        const buttonElement = screen.getByText(/back/i);
        expect(buttonElement).toBeInTheDocument();
    })


    it('displays the correct lane name', () => {
        const laneName = screen.getByText('Lane View: 1')
        expect(laneName).toBeInTheDocument();
    })


    it("toggles between occupancy and fault", () => {

        //initially shows occupancy event table
        expect(screen.getByTestId('event-table')).toBeVisible()
        expect(screen.getByTestId('status-table')).not.toBeVisible()

        // click the fault toggle button to show the fault table
        const faultButton = screen.getByText("Fault Table");
        expect(faultButton).toBeInTheDocument();
        fireEvent.click(faultButton);

        // verify the fault status table is visible
        expect(screen.getByTestId('status-table')).toBeVisible()
        expect(screen.getByTestId('event-table')).not.toBeVisible()
    })

    it('toggle buttons are visible and functional to switch between occupancy and fault tables', () => {
        const occupancyButton = screen.getByText('Occupancy Table');
        const faultButton = screen.getByText('Fault Table');

        expect(occupancyButton).toBeInTheDocument()
        expect(faultButton).toBeInTheDocument()

        //test by clicking occupancy togge
        fireEvent.click(occupancyButton)
        expect(screen.getByTestId('event-table')).toBeVisible()

        // test by clicking fault toggle
        fireEvent.click(faultButton)
        expect(screen.getByTestId('status-table')).toBeVisible()

    })


})


test('renders all components', () => {
    // render lane view page

    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Lane View: 1')).toBeInTheDocument()
    expect(screen.getByTestId('lane-status')).toBeInTheDocument()
    expect(screen.getByTestId('media')).toBeInTheDocument()
    expect(screen.getByTestId('event-table')).toBeInTheDocument()
})



