import {render, screen} from "@testing-library/react";
import NationalViewPage from "@/app/national-view/page";
import * as React from "react";
import {configureStore} from "@reduxjs/toolkit";
import NationalViewSlice from "@/lib/state/NationalViewSlice";
import {Provider} from "react-redux";


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


describe('NationalViewPage', () => {
    beforeEach(() => {
        render(<NationalViewPage />)
    })

    it('renders national page title', () => {
        expect(screen.getByText(/national view/i)).toBeInTheDocument();
    })

    it('renders date picker component', () => {

    })

    it('renders stats table component', () => {

    })
})