import {CssBaseline} from "@mui/material"
import Navbar from "./components/Navbar"
import Providers from "./providers"
import StoreProvider from "@/app/StoreProvider";
import DataSourceProvider from "@/app/contexts/DataSourceContext";

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body>
        <Providers>
            <CssBaseline/>
            <StoreProvider>
                <DataSourceProvider>
                    <Navbar>
                        {children}
                    </Navbar>
                </DataSourceProvider>
            </StoreProvider>
        </Providers>
        </body>
        </html>
    )
}
