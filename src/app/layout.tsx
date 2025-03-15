import {CssBaseline} from "@mui/material"
import Navbar from "./_components/Navbar"
import Providers from "./providers"
import StoreProvider from "@/app/StoreProvider";
import DataSourceProvider from "@/app/contexts/DataSourceContext";


export default function RootLayout({children,}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body>
        <Providers>
            <StoreProvider>
                <CssBaseline/>
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
