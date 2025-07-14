
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import AccountPage from '../(account)/page';
import { Provider } from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import OSCARClientReducer from '@/lib/state/OSCARClientSlice';
import React from "react";
import { useRouter } from 'next/navigation'



afterEach(cleanup);


jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;


const renderWithRedux = (component: React.ReactElement) => {
    const store = configureStore({
        reducer: {
            oscarClient: OSCARClientReducer
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


describe('AccountViewPage', () => {
    beforeEach(async () => {

        jest.clearAllMocks();

        mockUseRouter.mockReturnValue({
            push: mockPush,
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn()
        });

        renderWithRedux(<AccountPage/>)

    });

    it('renders account page', async() => {
        await waitFor(() => {
            expect(screen.getByText(/login/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
            expect(screen.getByRole("button", {name: /login/i})).toBeInTheDocument();
        });
    });


    it('updates state with user input', () => {
        const usernameInput = screen.getByPlaceholderText(/username/i) as HTMLInputElement;
        const passwordInput = screen.getByPlaceholderText(/password/i) as HTMLInputElement;

        fireEvent.change(usernameInput, { target: { value: 'testuser' }});
        fireEvent.change(passwordInput, { target: { value: 'testpw' }});

        expect(usernameInput.value).toBe("testuser")
        expect(passwordInput.value).toBe("testpw")
    });


    it('clicking login button shows snackbar and navigates to dashboard', async() => {
        const usernameInput = screen.getByPlaceholderText(/username/i)
        fireEvent.change(usernameInput, { target: { value: 'testuser' }});

        const loginBtn = screen.getByRole("button", { name: /login/i });
        fireEvent.click(loginBtn);


        await waitFor(() => {
            expect(screen.getByText(/Alarms will trigger audible sound/i)).toBeInTheDocument();

            expect(mockPush).toHaveBeenCalledWith('/dashboard') //this will verify that useRouter.push is called with the correct path
        })
    })
})
