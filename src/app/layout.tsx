import {CssBaseline} from "@mui/material"
import Navbar from "./_components/Navbar"
import Providers from "./providers"
import StoreProvider from "@/app/StoreProvider";
import DataSourceProvider from "@/app/contexts/DataSourceContext";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    title: "OSCAR Viewer",
    description: "OpenSensorHub OSCAR Viewer Application",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "OSCAR Viewer",
    },
    icons: {
        icon: {
            url: '/icons/icon-96x96.png',
            type: 'image/png'
        },
        shortcut: {
            url: '/icons/icon-96x96.png',
            type: 'image/png',
        },
        apple: {
            url: '/icons/icon-96x96.png',
            type: 'image/png',
        },
    }
};

export const viewport: Viewport = {
    themeColor: "#1976d2",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({children}: {
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
